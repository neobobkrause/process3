// A close's workflow changes (Bob, 4 Nov, about 07:04, on the copy's first close: "These are
// technical details, and I've already give sufficient approvals for you to do them yourself").
// The tranche into main (a normal close or the first, bootstrap, close) may carry a product
// workflow change without Bob, because what the old refusal protected is held here instead: the
// gate, and the tokens. A changed workflow file other than the process's own shims is accepted
// only when all of these hold, and a refusal names the rule that failed:
//  (1) every commit that changed it reached the tranche through a merged job or plain pull
//      request whose gate was green: each commit on the tranche's first-parent history whose diff
//      against its first parent touches the file is GitHub's merge of such a pull request, and
//      the merge carries the file exactly as that pull request's gated head had it. A direct
//      commit, a merge that is not shown to be a gated pull request's, or a merge that resolved
//      the file to anything but the head's copy is refused. A job merge is judged as the tranche
//      cover judges it (gate.mjs jobMerge, PR 92 and 94); a plain merge is bound by its merge
//      commit, its pull request and the newest gate row on its head, verified (verifyRow) and
//      bound to its branch (gate.mjs branchBound);
//  (2) it defines no job, by id or by name, equal to any of the base's required checks, nor to
//      gate, post, ci or record, and no job name it cannot read (an expression);
//  (3) it widens no permission beyond the base's copy of the file: for every scope, the most any
//      job's token holds (its own permissions, else the workflow's, else the repository default,
//      read as write-all) is no more than the base's copy grants. A new file may grant at most
//      contents: read. No changed file may add pull_request_target where the base's copy has none;
//  (4) a process shim (process-gate.yml above all) equals the pin's own shim, as before.
// Anything this reader cannot read is refused. Plain pull requests into the tranche stay
// shim-only (merge.mjs workflowChanges).
import { baseEverChanged, comments, gateRuns, getPR, prsFromBranch, verifyRow } from './github.mjs';
import { branchBound, jobMerge } from './gate.mjs';
import { recordSince } from './record.mjs';
import { keySetAt } from './anchor.mjs';
import { fail, git } from './util.mjs';

export const RESERVED_JOBS = ['gate', 'post', 'ci', 'record'];
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

// ---- a reader for the parts of a workflow file the rules need -------------------------------
// Not a YAML parser: block-style YAML as workflows are written, read by indentation, for the
// top-level keys, the workflow's permissions, and each job's id, name and permissions. Anything
// it is not sure of (tabs, anchors or aliases at those places, flow-style jobs, duplicate keys,
// several documents) throws, and the caller refuses the file.
class Unreadable extends Error {}
const no = (why) => { throw new Unreadable(why); };
// A key may not begin with a flow collection, tag, anchor, alias or other indicator: those hide
// a key or a whole mapping from this reader (confirming review of PR 98: "!!str jobs:", "{on: ...}").
const KEY = /^((?:"[^"]*"|'[^']*'|[^\s"'#:{}\[\]!&*?|>%@`,][^:#]*?)):(?:\s+(.*?))?\s*$/;
const unquote = (k) => { const t = k.trim(); const sq = t.match(/^'(.*)'$/); return sq ? sq[1].replace(/''/g, "'") : t.replace(/^"(.*)"$/, '$1'); };
// A value with its trailing comment removed (outside quotes).
const value = (v) => {
  if (v === undefined) return '';
  let q = null;
  for (let i = 0; i < v.length; i++) {
    const ch = v[i];
    if (q) { if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") q = ch;
    else if (ch === '#' && (i === 0 || /\s/.test(v[i - 1]))) return v.slice(0, i).trim();
  }
  return v.trim();
};
function lines(src) {
  if (/\t/.test(src.replace(/#.*$/gm, ''))) no('it holds a tab');
  const out = [];
  src.split('\n').forEach((raw, i) => {
    const t = raw.replace(/\r$/, '');
    if (!t.trim() || /^\s*#/.test(t)) return;
    if (/^(---|\.\.\.)(\s|$)/.test(t)) {
      if (out.length || t.startsWith('...')) no('it holds more than one document');
      if (t.replace(/^---/, '').replace(/\s#.*$/, '').trim()) no(`line ${i + 1} holds content after ---`);
      return;
    }
    const body = t.replace(/^ +/, '');
    if (/^\s/.test(body)) no(`line ${i + 1} is indented with something other than spaces`);
    // A double-quoted key with an escape ("j\x6fbs":) is a key this reader would misread: GitHub
    // decodes it (review 1 of PR 98).
    if (/^(?:-\s+)?"(?:[^"\\]|\\.)*\\(?:[^"\\]|\\.)*"\s*:/.test(body)) no(`line ${i + 1} has a key with an escape`);
    out.push({ n: i + 1, indent: t.length - body.length, body });
  });
  return out;
}
// The key lines directly under the block that starts after index `at` and is indented more than
// `indent`, as { key, value, i } (i: index into ls), with the block's end.
function children(ls, at, indent) {
  let i = at + 1;
  if (i >= ls.length || ls[i].indent <= indent) return { kids: [], end: i };
  const own = ls[i].indent;
  const kids = [];
  const seen = new Set();
  for (; i < ls.length && ls[i].indent > indent; i++) {
    if (ls[i].indent < own) no(`line ${ls[i].n} is indented less than its block`);
    if (ls[i].indent > own) continue;
    const item = ls[i].body === '-' || ls[i].body.startsWith('- ');
    // A sequence may sit at its key's own indent ("steps:" then "- uses: ..." beneath it).
    if (item && kids.length && kids.at(-1).value === '') continue;
    const m = ls[i].body.match(KEY);
    if (!m || item) no(`line ${ls[i].n} is not a key`);
    const key = unquote(m[1]);
    if (key === '<<' || /^[&*]/.test(key)) no(`line ${ls[i].n} uses a merge key or an alias`);
    if (seen.has(key)) no(`${key} appears twice in one block (line ${ls[i].n})`);
    seen.add(key);
    kids.push({ key, value: value(m[2]), i, deeper: i + 1 < ls.length && ls[i + 1].indent > own });
  }
  return { kids, end: i };
}
const top = (ls) => children([{ indent: -1 }, ...ls], 0, -1).kids.map((k) => ({ ...k, i: k.i - 1 }));

// Permissions as { scope: 0 | 1 | 2 } (none, read, write), or 'all-write' / 'all-read'. Unset
// (undefined) is the repository default.
const LEVEL = { none: 0, read: 1, write: 2 };
function permissions(ls, k) {
  if (!k) return undefined;
  const v = k.value;
  if (/\\/.test(v)) no(`permissions at line ${ls[k.i].n} holds an escape`);
  if (/^[&*!]/.test(v)) no(`permissions at line ${ls[k.i].n} uses an anchor, alias or tag`);
  const flat = (pairs) => {
    const p = {};
    for (const [s, l] of pairs) {
      const scope = unquote(s);
      const level = unquote(l);
      if (!(level in LEVEL)) no(`permission ${scope}: ${level} is not none, read or write`);
      if (scope in p) no(`permission ${scope} appears twice`);
      p[scope] = LEVEL[level];
    }
    return p;
  };
  if (v === '') {
    const { kids } = children(ls, k.i, ls[k.i].indent);
    if (!kids.length) no(`permissions at line ${ls[k.i].n} is empty`);
    if (kids.some((x) => x.deeper || /^[&*!|>]/.test(x.value))) no(`permissions at line ${ls[k.i].n} cannot be read`);
    return flat(kids.map((x) => [x.key, x.value]));
  }
  if (/^["']?read-all["']?$/.test(v)) return 'all-read';
  if (/^["']?write-all["']?$/.test(v)) return 'all-write';
  const f = v.match(/^\{(.*)\}$/);
  if (f) {
    const body = f[1].trim();
    if (!body) return {};
    return flat(body.split(',').map((x) => { const m = x.trim().match(/^([^:]+):\s*(\S+)$/); if (!m) no(`permissions at line ${ls[k.i].n} cannot be read`); return [m[1], m[2]]; }));
  }
  no(`permissions at line ${ls[k.i].n} cannot be read`);
}

// The events a workflow runs on: a scalar, a flow list, or a block of event keys; anything else
// throws. Read only when rule 3 needs it.
function events(ls, on) {
  if (!on) return [];
  const v = on.value;
  if (v === '') return children(ls, on.i, 0).kids.map((k) => k.key);
  const list = v.match(/^\[([^\[\]{}]*)\]$/);
  if (list) return list[1].split(',').map((x) => unquote(x)).filter(Boolean);
  if (/^[\w-]+$/.test(unquote(v))) return [unquote(v)];
  no(`its on: at line ${ls[on.i].n} cannot be read`);
}

// What the rules read of one workflow file.
export function readWorkflow(src) {
  const ls = lines(src);
  const keys = top(ls);
  const get = (name) => keys.find((k) => k.key === name);
  const jobsKey = get('jobs');
  const jobs = [];
  if (jobsKey && jobsKey.value !== '{}') {
    if (jobsKey.value !== '') no('its jobs are not a block of jobs');
    const { kids } = children(ls, jobsKey.i, 0);
    const raw = src.split('\n');
    for (const j of kids) {
      if (j.value !== '') no(`job ${j.key} is not a block`);
      const { kids: jk, end } = children(ls, j.i, ls[j.i].indent);
      // The job's own text, its id line to the line before the next key at its level or above.
      const text = raw.slice(ls[j.i].n - 1, end < ls.length ? ls[end].n - 1 : raw.length).join('\n').replace(/\s+$/, '');
      const name = jk.find((x) => x.key === 'name');
      // One line, plain or quoted, no tag, anchor, block scalar or escape (review 1 of PR 98).
      if (name && (name.deeper || !/^(?:"[^"\\]*"|'(?:[^']|'')*'|[^\s"'|>!&*%@`{\[-][^#]*)$/.test(name.value))) no(`job ${j.key}'s name at line ${ls[name.i].n} is not a one-line string this reader can read`);
      jobs.push({ id: j.key, name: name ? unquote(name.value) : null, permissions: permissions(ls, jk.find((x) => x.key === 'permissions')), expands: jk.some((x) => x.key === 'strategy' || x.key === 'uses'), text });
    }
  }
  // pull_request_target anywhere in the file, comments too: the reader does not judge where it
  // sits (review 1 of PR 98: a "#" inside quotes hid it from a comment strip).
  const prt = /pull_request_target/.test(src);
  const on = get('on') || get('true');
  // The `on` block may not hold an escape that could spell an event (review 1 of PR 98).
  if (on) { const end = children(ls, on.i, 0).end; for (let i = on.i; i < end; i++) if (/"[^"]*\\/.test(ls[i].body)) no(`its on block holds an escape at line ${ls[i].n}`); }
  return { permissions: permissions(ls, get('permissions')), jobs, pullRequestTarget: prt, events: () => events(ls, on) };
}

// The most each scope's token holds in any job: a job's own permissions, else the workflow's,
// else the repository default (write-all, the widest it can be). A workflow with no jobs holds none.
const SCOPES = ['actions', 'attestations', 'checks', 'contents', 'deployments', 'discussions', 'id-token', 'issues', 'models', 'packages', 'pages', 'pull-requests', 'repository-projects', 'security-events', 'statuses'];
function held(w) {
  const max = {};
  const add = (p) => {
    if (p === undefined || p === 'all-write') { for (const s of SCOPES) max[s] = 2; max['*'] = 2; return; }
    if (p === 'all-read') { for (const s of SCOPES) max[s] = Math.max(max[s] || 0, s === 'id-token' ? 0 : 1); max['*'] = Math.max(max['*'] || 0, 1); return; }
    for (const [s, l] of Object.entries(p)) max[s] = Math.max(max[s] || 0, l);
  };
  for (const j of w.jobs) add(j.permissions !== undefined ? j.permissions : w.permissions);
  return max;
}
const at = (m, s) => m[s] ?? m['*'] ?? 0;
const NAMES = ['none', 'read', 'write'];

// Rules 2 and 3 for one file, against the base's copy (null: a new file). Returns why it fails, or null.
// Only plain lines reach the reader (coordinator, 4 Nov 08:13; round 3 of PR 98: a lone \r,
// U+0085, U+2028 or U+2029 is a YAML line break the reader did not split on). A leading BOM is
// dropped; any line break but \n, or a BOM elsewhere, refuses the file; any other character
// outside printable ASCII, \n and \t is allowed only on a line the base's copy holds unchanged.
const BREAKS = /[\r\u0085\u2028\u2029\ufeff]/;
export function plainText(src, baseSrc) {
  const s = src.replace(/^\ufeff/, '');
  const m = s.match(BREAKS);
  if (m) return `rule 3: it holds ${m[0] === '\ufeff' ? 'a byte-order mark' : 'a line break other than \\n'} (U+${m[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}) at offset ${m.index}`;
  const base = new Set((baseSrc ?? '').replace(/^\ufeff/, '').split('\n'));
  const bad = s.split('\n').findIndex((l) => /[^\x20-\x7e\t]/.test(l) && !base.has(l));
  if (bad >= 0) return `rule 3: line ${bad + 1} holds a character outside printable ASCII that the base's copy does not hold on that line`;
  return null;
}

export function workflowRules(src, baseSrc, required) {
  const plain = plainText(src, baseSrc);
  if (plain) return plain;
  src = src.replace(/^\ufeff/, '');
  if (baseSrc !== null) {
    baseSrc = baseSrc.replace(/^\ufeff/, '');
    if (BREAKS.test(baseSrc)) return 'rule 3: the base\'s copy holds a line break other than \\n, which this reader does not read';
  }
  let w;
  let b = null;
  try { w = readWorkflow(src); } catch (e) { if (e instanceof Unreadable) return `rule 3: it cannot be read (${e.message})`; throw e; }
  if (baseSrc !== null) { try { b = readWorkflow(baseSrc); } catch (e) { if (e instanceof Unreadable) return `rule 3: the base's copy cannot be read (${e.message})`; throw e; } }
  const taken = new Set([...required, ...RESERVED_JOBS].map((x) => String(x).toLowerCase()));
  for (const j of w.jobs) {
    // A job the base's copy already defines, byte for byte, is exempt (coordinator, 4 Nov 08:13).
    if (b?.jobs.some((x) => x.id === j.id && x.text === j.text)) continue;
    if (taken.has(j.id.toLowerCase())) return `rule 2: it defines a job ${j.id}, the name of a required check or of a process job (${[...required, ...RESERVED_JOBS].join(', ')})`;
    if (j.name !== null && /\$\{\{/.test(j.name)) return `rule 2: job ${j.id}'s name ${j.name} is an expression, which could be a required check's name`;
    if (j.name !== null && taken.has(j.name.trim().toLowerCase())) return `rule 2: job ${j.id} is named ${j.name}, the name of a required check or of a process job`;
    // A matrix job reports as "<name> (<values>)", a reusable workflow's jobs as "<name> / <job>"
    // (review 1 of PR 98): no required check may begin so.
    for (const x of [j.id, j.name].filter((y) => y !== null).map((y) => y.trim().toLowerCase())) {
      const hit = [...taken].find((t) => t.startsWith(`${x} (`) || t.startsWith(`${x} /`));
      if (hit) return `rule 2: job ${j.id}${j.expands ? ', a matrix or reusable-workflow job,' : ''} could report as the required check ${hit}`;
    }
  }
  if (w.pullRequestTarget && !b?.pullRequestTarget) return `rule 3: it runs on pull_request_target${b ? ', which the base\'s copy does not' : ''}`;
  const now = held(w);
  const was = b ? held(b) : { contents: 1 };
  const scopes = new Set([...Object.keys(now), ...Object.keys(was), ...SCOPES]);
  scopes.delete('*');
  const wider = [...scopes].filter((s) => at(now, s) > at(was, s)).sort();
  if (!wider.length && b && [...scopes].some((s) => at(now, s) === 2)) {
    // A file that holds a write token may not run on an event its base's copy does not (review 1 of PR 98).
    let ev;
    let was2;
    try { ev = w.events(); was2 = b.events(); } catch (e) { if (e instanceof Unreadable) return `rule 3: its events cannot be read (${e.message})`; throw e; }
    const added = ev.filter((x) => !was2.includes(x));
    if (added.length) return `rule 3: it holds a write token and adds the event(s) ${added.join(', ')}, which the base's copy does not run on`;
  }
  if (wider.length) return `rule 3: it widens ${wider.map((s) => `${s} to ${NAMES[at(now, s)]}`).join(', ')} beyond ${b ? 'the base\'s copy' : 'contents: read, all a new workflow may hold'}${w.jobs.some((j) => j.permissions === undefined) && w.permissions === undefined ? ' (a job with no permissions holds the repository default, read as write-all)' : ''}`;
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
// at: { mb, base, baseRef, tranche, slug, io, required: () => [check names] | null }.
export function closeWorkflows(root, sha, files, at) {
  const close = { ...at, io: { getPR, comments, prsFromBranch, baseEverChanged, verify: (slug, r, ctx) => verifyRow(slug, r, ctx), ...(at.io || {}) } };
  const refuse = (f, why) => fail(`the tranche changes ${f}: ${why}. A close may carry a product workflow change only through gated pull requests, with no job named like a required or process check and no wider permissions`);
  const required = close.required();
  if (!Array.isArray(required) || !required.length) fail(`the checks ${close.base} requires could not be read, or are none, so the tranche's workflow changes cannot be judged (rule 2)`);
  const one = gatedChanges(root, sha, close.mb, files, close);
  if (one) refuse(one.f, one.why);
  for (const f of files) {
    const src = text(root, sha, f);
    if (src === null) continue; // removed: rule 1 held its removal; it defines and grants nothing
    if (!/\.ya?ml$/.test(f)) continue; // GitHub runs only .yml and .yaml files; rule 1 held it
    const why = workflowRules(src, text(root, close.baseRef, f), required);
    if (why) refuse(f, why);
  }
}
