// A close's workflow changes (Bob, 4 Nov, about 07:04, on the copy's first close: "These are
// technical details, and I've already give sufficient approvals for you to do them yourself").
// The tranche into main (a normal close or the first, bootstrap, close) may carry a product
// workflow change without Bob, because what the old refusal protected is held here instead: the
// gate, and the tokens. A changed workflow file other than the process's own shims is accepted
// only when all of these hold, and a refusal names the rule that failed:
//  (1) every commit that changed it reached the tranche through a merged job or plain pull
//      request whose gate was green, and was the process's own gate: each commit on the
//      tranche's first-parent history whose diff against its first parent touches the file is
//      GitHub's merge of such a pull request, carrying the file exactly as that pull request's
//      gated head had it, and the commits that gate ran on held the pin's own process-gate.yml.
//      A job merge is judged as the tranche cover judges it (gate.mjs jobMerge, PR 92 and 94); a
//      plain merge is bound by its merge commit, its pull request and the newest gate row on its
//      head, verified (verifyRow) and bound to its branch (gate.mjs branchBound). Commits in the
//      product's history before Process3 (the config's record_since, anchored at the owner's
//      website commit) are earlier work, judged whole by the rules below;
//  (2, 3) the change, base to head, is made only of allowed shapes (coordinator, 4 Nov 08:24:
//      a line reader of YAML failed four review rounds of PR 98, so no YAML is read). The base's
//      copy is trusted and is the only thing structure is read from; every hunk of the line diff
//      must be one of: S1, lines inside an existing `run: |` or `run: >` block scalar; S2, quoted
//      items added inside an existing multi-line `paths: [...]` flow list; S3, a matrix row
//      added beside an existing `- { ... }` row under `include:`, with that row's keys. No shape
//      can add a key, a job, a permission or an event, so none can name a job like a required
//      check or widen a token. The file must also be plain text (plainText). A new or removed
//      workflow, or any other change, is refused, naming the file and the hunk: the fix is a
//      process3 build that adds a shape, never a YAML reading;
//  (4) a process shim (process-gate.yml above all) equals the pin's own shim (merge.mjs).
// Plain pull requests into the tranche stay shim-only (merge.mjs workflowChanges).
import { baseEverChanged, comments, gateRuns, getPR, prsFromBranch, verifyRow } from './github.mjs';
import { branchBound, jobMerge } from './gate.mjs';
import { recordSince } from './record.mjs';
import { keySetAt } from './anchor.mjs';
import { fail, git } from './util.mjs';

const JOB_MERGE = /^Merge job PR (\d+)$/;
const PLAIN_MERGE = /^Merge PR (\d+): (\S+) into (\S+)$/;
const isJobRef = (ref) => /^job\//i.test(ref || '');

const blob = (root, rev, path) => {
  const r = git(['rev-parse', '-q', '--verify', `${rev}:${path}`], { cwd: root, allowFail: true });
  return r.code === 0 ? r.stdout.trim() : null;
};
const text = (root, rev, path) => {
  const r = git(['show', `${rev}:${path}`], { cwd: root, allowFail: true });
  return r.code === 0 ? r.stdout : null;
};
const parents = (root, c) => git(['rev-list', '--parents', '-n', '1', c], { cwd: root }).split(' ').slice(1);
const isAnc = (root, a, b) => typeof a === 'string' && /^[0-9a-f]{40}$/.test(a) && git(['merge-base', '--is-ancestor', a, b], { cwd: root, allowFail: true }).code === 0;

// ---- rules 2 and 3: plain text, and the allowed shapes ---------------------------------------
// Only plain lines (coordinator, 4 Nov 08:13; round 3 of PR 98: a lone \r, U+0085, U+2028 or
// U+2029 is a YAML line break). A leading BOM is dropped; any line break but \n, or a BOM
// elsewhere, refuses the file; any other character outside printable ASCII, \n and \t is
// allowed only on a line the base's copy holds unchanged.
const BREAKS = /[\r\u0085\u2028\u2029\ufeff]/;
export function plainText(src, baseSrc) {
  const s = src.replace(/^\ufeff/, '');
  const m = s.match(BREAKS);
  if (m) return `rule 3: it holds ${m[0] === '\ufeff' ? 'a byte-order mark' : 'a line break other than \\n'} (U+${m[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}) at offset ${m.index}`;
  const base = new Set((baseSrc ?? '').replace(/^\ufeff/, '').split('\n'));
  const bad = s.split('\n').findIndex((l) => /[^\x20-\x7e\t]/.test(l) && !base.has(l));
  if (bad >= 0) return `rule 3: line ${bad + 1} holds a character outside printable ASCII that the base's copy does not hold`;
  return null;
}

// The line diff of a and b as hunks { at, del, add }: base lines a[at .. at+del) replaced by add.
// Any edit script is sound here: each hunk is judged alone against the base, so head is the base
// with every hunk's allowed change made. Longest common subsequence, after the common ends.
export function hunks(a, b) {
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let q = 0;
  while (q < a.length - p && q < b.length - p && a[a.length - 1 - q] === b[b.length - 1 - q]) q++;
  const A = a.slice(p, a.length - q);
  const B = b.slice(p, b.length - q);
  const n = A.length;
  const m = B.length;
  if (n * m > 25e6) return null;
  const T = new Uint32Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) T[i * (m + 1) + j] = A[i] === B[j] ? T[(i + 1) * (m + 1) + j + 1] + 1 : Math.max(T[(i + 1) * (m + 1) + j], T[i * (m + 1) + j + 1]);
  const out = [];
  let cur = null;
  const flush = () => { if (cur) out.push(cur); cur = null; };
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && A[i] === B[j]) { flush(); i++; j++; continue; }
    cur ||= { at: p + i, del: 0, add: [] };
    if (j < m && (i >= n || T[i * (m + 1) + j + 1] >= T[(i + 1) * (m + 1) + j])) { cur.add.push(B[j]); j++; } else { cur.del++; i++; }
  }
  flush();
  return out;
}

const indentOf = (l) => l.match(/^ */)[0].length;
const blank = (l) => /^ *$/.test(l);
const ASCII = /^[\x20-\x7e]*$/;

// The base's structures, by line index (0-based).
// Run blocks: a key line `<indent>run: |` or `>` (an optional `- ` before it, an optional `-`
// chomping indicator, nothing else), and its content: the lines after it, from the first to the
// last non-blank line deeper than the `run` key, each line between blank or deeper. `first` is
// the first content line's indent: a line less indented would end the block.
function runBlocks(L) {
  const out = [];
  for (let k = 0; k < L.length; k++) {
    const m = L[k].match(/^( *)(- +)?run: [|>]-?$/);
    if (!m) continue;
    const col = m[1].length + (m[2] ? m[2].length : 0);
    let lo = -1;
    let hi = -1;
    for (let x = k + 1; x < L.length; x++) {
      if (blank(L[x])) continue;
      if (indentOf(L[x]) <= col) break;
      if (lo < 0) lo = x;
      hi = x;
    }
    if (lo >= 0) out.push({ key: k, lo, hi, first: indentOf(L[lo]) });
  }
  return out;
}
// Multi-line `paths: [` flow lists: from the opening line to the first line after it holding `]`.
function pathLists(L) {
  const out = [];
  for (let k = 0; k < L.length; k++) {
    if (!/^ *paths(-ignore)?: \[/.test(L[k]) || L[k].includes(']')) continue;
    let end = -1;
    for (let x = k + 1; x < L.length; x++) if (L[x].includes(']')) { end = x; break; }
    if (end > k) out.push({ lo: k, hi: end, indents: new Set(L.slice(k + 1, end + 1).filter((l) => !blank(l)).map(indentOf)) });
  }
  return out;
}
// Matrix rows: consecutive single-line `- { k: v, ... }` rows at one indent right after an
// `include:` line, each with its key set.
const ROW = /^( *)- \{ ((?:[A-Za-z0-9_-]+: [A-Za-z0-9_./-]+)(?:, [A-Za-z0-9_-]+: [A-Za-z0-9_./-]+)*) \}$/;
const rowKeys = (l) => { const m = l.match(ROW); return m ? m[2].split(', ').map((x) => x.split(': ')[0]) : null; };
const sameKeys = (a, b) => a.length === b.length && new Set(a).size === a.length && [...a].sort().join() === [...b].sort().join();
function rowGroups(L) {
  const out = [];
  for (let k = 0; k < L.length; k++) {
    if (!/^ *include:$/.test(L[k])) continue;
    const r0 = L[k + 1]?.match(/^( *)- \{/);
    if (!r0 || r0[1].length < indentOf(L[k])) continue;
    let x = k + 1;
    while (x < L.length && L[x].match(/^( *)- \{/)?.[1].length === r0[1].length) x++;
    out.push({ include: k, lo: k + 1, hi: x - 1, indent: r0[1].length });
  }
  return out;
}

// Which shape a hunk fits against the base lines L, or null.
function shapeOf(L, h, S) {
  const above = h.at - 1;
  const below = h.at + h.del;
  // S1: strictly between two content lines of one run block; removed lines are its content; each
  // added line plain ASCII, spaces only, at least as deep as the block's first content line, or blank.
  if (S.runs.some((r) => above >= r.lo && below <= r.hi && h.add.every((l) => ASCII.test(l) && (blank(l) || indentOf(l) >= r.first)))) return 'S1';
  if (h.del) return null;
  // S2: quoted path items, at a sibling item's indent, strictly between two lines of one list.
  const ITEM = /^( *)"[A-Za-z0-9_./*-]+"(?:, "[A-Za-z0-9_./*-]+")*,?$/;
  if (S.lists.some((x) => above >= x.lo && below <= x.hi && h.add.every((l) => ITEM.test(l) && x.indents.has(indentOf(l))))) return 'S2';
  // S3: rows at the group's indent, beside one of its rows, each with that row's keys.
  for (const g of S.rows) {
    if (above < g.include || below > g.hi + 1 || !(above >= g.lo || below <= g.hi)) continue;
    const sib = rowKeys(L[above >= g.lo ? above : below]);
    if (sib && h.add.every((l) => { const k = rowKeys(l); return k && indentOf(l) === g.indent && sameKeys(k, sib); })) return 'S3';
  }
  return null;
}

// Rules 2 and 3 for one file: plain text, and every hunk an allowed shape. Returns why not, or null.
export function workflowShapes(src, baseSrc) {
  if (baseSrc === null) return 'rule 3: it is a new workflow, and no allowed shape adds one';
  const plain = plainText(src, baseSrc);
  if (plain) return plain;
  const base = baseSrc.replace(/^\ufeff/, '');
  if (BREAKS.test(base)) return 'rule 3: the base\'s copy holds a line break other than \\n, so its lines cannot be trusted';
  const L = base.split('\n');
  const hs = hunks(L, src.replace(/^\ufeff/, '').split('\n'));
  if (!hs) return 'rule 3: it is too large to compare with the base\'s copy';
  const S = { runs: runBlocks(L), lists: pathLists(L), rows: rowGroups(L) };
  for (const h of hs) {
    if (shapeOf(L, h, S)) continue;
    const show = [...L.slice(h.at, h.at + h.del).map((l) => `-${l}`), ...h.add.map((l) => `+${l}`)].slice(0, 3).join(' | ');
    return `rule 3: the hunk at base line ${h.at + 1} (${h.del} removed, ${h.add.length} added: ${show.slice(0, 200)}) fits no allowed shape (S1 inside a run block, S2 a path in a paths list, S3 a matrix row)`;
  }
  return null;
}

// ---- rule 1 ---------------------------------------------------------------------------------
// GitHub's merge of a plain pull request into the tranche, as merge --plain writes it, whose head
// had a green gate: the newest gate row on the head is green, verified, and bound to the PR by
// its branch, its head and the tranche.
export function plainMerge(root, tranche, c, { slug, io }) {
  const bad = (why) => ({ ok: false, why });
  const n = Number(git(['log', '-1', '--format=%s', c], { cwd: root }).match(PLAIN_MERGE)?.[1]);
  if (!n) return bad('is not a merge of a pull request');
  const p = parents(root, c);
  if (p.length !== 2) return bad(`names PR ${n} but is not a merge of two parents`);
  const [p1, p2] = p;
  const pr = io.getPR(slug, n);
  if (!pr?.merged || pr.merge_commit_sha !== c || pr.base?.ref !== tranche || pr.head?.sha !== p2 || pr.head?.repo?.full_name !== slug || !pr.head?.ref || isJobRef(pr.head.ref)) return bad(`is not GitHub's merge of plain PR ${n} into ${tranche}`);
  const why = branchBound(slug, pr.head.ref, n, tranche, io);
  if (why) return bad(why);
  const row = gateRuns(io.comments(slug, n)).filter((r) => r.sha === p2).pop();
  const bound = row && row.ok && isAnc(root, row.base, p1) && io.verify(slug, row, { pr: n, baseRef: tranche, merged: { branch: pr.head.ref } });
  if (!bound) return bad(`is PR ${n}'s merge, but the newest gate run on its head ${p2.slice(0, 10)} is ${row ? (row.ok ? 'not bound to the PR or not verified' : 'red') : 'missing'}`);
  return { ok: true, pr: n, base: row.base };
}

// The gate that certified a pull request was the process's own only when the commits its run
// merged held the pin's own process-gate.yml: a pull request runs its own copy of the workflow,
// so a job or plain PR that changed process-gate.yml could certify itself (review 1 of PR 98).
const GATE_FILE = '.github/workflows/process-gate.yml';
const pinOf = (root, rev) => git(['ls-tree', rev, '--', '.process'], { cwd: root }).match(/^160000 commit ([0-9a-f]{40})\t/)?.[1] || null;
function realGate(root, rev, repo) {
  const pin = pinOf(root, rev);
  const b = blob(root, rev, GATE_FILE);
  return !!(pin && b && repo?.released(pin) && repo.shim(pin, 'process-gate.yml') === b);
}

// The product's history before Process3 (coordinator, 4 Nov, 08:02): earlier work, judged whole
// by rules 2 to 4, as the record check leaves it out. The boundaries: the head's record_since
// (recordSince: used only while the base has no config, and before every commit that adds it),
// counted only when it is the base's commit or an ancestor of it, or took its value at the base
// owner's website commit not already in the base (as record.mjs holds it). A commit is earlier
// work when it is that commit or an ancestor of it. Take-in tips do not count here (coordinator,
// 4 Nov 08:13; round 3 of PR 98: a job's start row could name a direct post-setup commit): a
// real take-in reaches the tranche through its job's merge, which rule 1 judges.
// Anything after them is judged by rule 1.
export function earlierWork(root, sha, { baseRef, ownerCommit } = {}) {
  const tips = [];
  const s = recordSince(root, { base: baseRef, head: sha });
  if (s.since) {
    const set = keySetAt(root, sha, 'record_since');
    const owned = set && !isAnc(root, set, baseRef) && ownerCommit?.(set)?.ok === true;
    if (isAnc(root, s.since, baseRef) || owned) tips.push(s.since);
  }
  return (c) => tips.some((t) => t === c || isAnc(root, c, t));
}

// Rule 1 for the files, on the tranche at sha over the merge base mb. Returns { f, why } for the
// first file that fails, or null.
// A merge that brought the base in (a parent on the base) and left the file as that parent has
// it introduces nothing the base does not already hold, so it passes.
export function gatedChanges(root, sha, mb, files, { tranche, slug, io, baseRef, ownerCommit }) {
  if (!io.repo) fail('rule 1 needs process3 to read the gate shim');
  const earlier = earlierWork(root, sha, { baseRef, ownerCommit });
  const chain = git(['rev-list', '--first-parent', sha, '--not', mb], { cwd: root }).split('\n').filter(Boolean);
  const judged = new Map();
  const judge = (c) => {
    if (!judged.has(c)) {
      const subject = git(['log', '-1', '--format=%s', c], { cwd: root });
      let v;
      try {
        v = JOB_MERGE.test(subject) ? jobMerge(root, { tranche }, c, { slug, io }) : plainMerge(root, tranche, c, { slug, io });
      } catch (e) { v = { ok: false, why: `could not be read (${String(e.message).slice(0, 200)})` }; }
      judged.set(c, v);
    }
    return judged.get(c);
  };
  for (const c of chain) {
    if (earlier(c)) continue;
    const p = parents(root, c);
    const touched = p.length
      ? git(['diff', '--no-renames', '--name-only', '-z', p[0], c, '--', ...files], { cwd: root }).split('\0').filter(Boolean)
      : files.filter((f) => blob(root, c, f));
    for (const f of touched) {
      const short = c.slice(0, 10);
      if (p.length >= 2 && baseRef && p.slice(1).some((q) => isAnc(root, q, baseRef) && blob(root, c, f) === blob(root, q, f))) continue;
      const r = (why) => ({ f, why: `rule 1: it was changed by ${short}, ${why}` });
      if (p.length < 2) return r(`a direct commit on ${tranche}, not a merged pull request whose gate was green`);
      const v = judge(c);
      if (!v.ok) return r(`which ${v.why}`);
      const ran = [p[1], ...(v.base ? [v.base] : [])].find((x) => !realGate(root, x, io.repo));
      if (ran) return r(`PR ${v.pr}'s merge, but ${ran.slice(0, 10)}, which its gate ran on, does not hold the pin's own process-gate.yml, so that gate could be the PR's own`);
      if (blob(root, c, f) !== blob(root, p[1], f)) return r(`PR ${v.pr}'s merge, but the merge does not carry the file as the PR's gated head had it`);
    }
  }
  return null;
}

// All rules for a close's product workflow files (the shims are held by the caller, rule 4).
// at: { mb, base, baseRef, tranche, slug, io, ownerCommit }.
export function closeWorkflows(root, sha, files, at) {
  const close = { ...at, io: { getPR, comments, prsFromBranch, baseEverChanged, verify: (slug, r, ctx) => verifyRow(slug, r, ctx), ...(at.io || {}) } };
  const refuse = (f, why) => fail(`the tranche changes ${f}: ${why}. A close may carry a product workflow change only through gated pull requests, and only in the allowed shapes`);
  const one = gatedChanges(root, sha, close.mb, files, close);
  if (one) refuse(one.f, one.why);
  for (const f of files) {
    if (!/\.ya?ml$/.test(f)) continue; // GitHub runs only .yml and .yaml files; rule 1 held it
    const src = text(root, sha, f);
    const why = src === null ? 'rule 3: it removes a workflow, and no allowed shape removes one' : workflowShapes(src, text(root, close.baseRef, f));
    if (why) refuse(f, why);
  }
}
