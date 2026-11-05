// report tranche (Build Plan Phase 3, PLN-6, SES-11): one Markdown report of the tranche, from the
// record alone: the ledger and metrics rows the tranche holds, the state branch's sweep, handover,
// address and closed-layer rows, and the pull requests merged into the tranche. Every figure the
// record lacks prints "unmeasured", never a guess. Overhead is metrics report's (overhead()).
import { MERGER_FILE, TRAIN_FILE, trainLines, trainSummary } from './train.mjs';
import { compare as ghCompare, comments as ghComments, gateRuns } from './github.mjs';
import { ledgerIds, readLedgerTexts } from './ledger.mjs';
import { ATTEMPTS_RULE, attemptsStarted, fetchJobs, leadCell, leadInputs, leadSummaryCell, leadTimes, openedAt, trancheRows } from './lead.mjs';
import { FLOW_RULE as flowRule, QUICK_BLOCK_MIN, countCommits, flowFigures, quickBlocks, idleByDay, unmetAtRef, layerOf, overhead, refusalList, rowsAt, sessionRoles, stateRoles } from './metrics.mjs';
import { CLOSED_FILE } from './status.mjs';
import { HOLDS_FILE, holdHours, landedPRs } from './hold.mjs';
import { FOUND_DIR, NO_MODULE, foundFile } from './found.mjs';
import { triggerSummary } from './triggers.mjs';
import { depth, exists, gh, git, isFound, isRecordPath, requirementMarks, shallowCuts } from './util.mjs';

const U = 'unmeasured';
const usd = (x) => (typeof x === 'number' ? `$${(Math.round(x * 100) / 100).toFixed(2)}` : U);
const pct = (x) => (typeof x === 'number' ? `${Math.round(x * 1000) / 10}%` : U);
const cell = (x) => String(x ?? U).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`)];

export function mergedPRs(slug, base) {
  const pages = gh(['api', '--paginate', '--slurp', `repos/${slug}/pulls?state=closed&base=${encodeURIComponent(base)}&per_page=100`], { allowFail: true });
  return Array.isArray(pages) ? pages.flat().filter((p) => p.merged_at) : null;
}

const gitOut = (root, args) => { const r = git(args, { cwd: root, allowFail: true }); return r.code === 0 ? r.stdout.trim() : null; };

// The tranche's span: from its first commit main lacks to now, or, once the tranche is merged
// into main, to that merge. base is main before that first commit, when this clone holds it. In
// a shallow clone, deepen() first fetches the tranche's own commits and that base, and its
// result (deep) vouches for the base and names the commits merged in from main, which the
// server, not this clone's cut history, placed on main; a tranche merged into main there, or
// with no such commit, is unmeasured.
export function span(root, tranche, main, deep = null) {
  const shallow = gitOut(root, ['rev-parse', '--is-shallow-repository']) === 'true';
  if (gitOut(root, ['rev-parse', '--verify', '-q', tranche]) === null) return { open: U, close: null, base: null };
  const haveMain = gitOut(root, ['rev-parse', '--verify', '-q', main]) !== null;
  const ahead = haveMain ? gitOut(root, ['rev-list', '--reverse', tranche, `^${main}`, ...notOnMain(deep)]) : null;
  const first = (shas) => (shas || '').split('\n').filter(Boolean)[0] || null;
  if (ahead) {
    const f = first(ahead);
    const base = parentOf(root, f);
    // Shallow, the first commit counts only when its parent is main's (deepen vouches, or the
    // clone shows it): else it is only where the history was cut.
    if (shallow && !(base && (deep?.base === base || gitOut(root, ['merge-base', '--is-ancestor', base, main]) !== null))) return { open: U, close: null, base: null };
    return { open: gitOut(root, ['log', '-1', '--format=%cI', f]), close: null, base };
  }
  if (!haveMain || shallow) return { open: U, close: null, base: null };
  // Merged: the first main commit on the path from the tranche tip, and main before it.
  const c = first(gitOut(root, ['rev-list', '--reverse', '--ancestry-path', `${tranche}..${main}`]));
  const before = c && gitOut(root, ['rev-parse', `${c}^1`]);
  const f = before && first(gitOut(root, ['rev-list', '--reverse', `${before}..${tranche}`]));
  if (!f) return { open: U, close: null, base: null };
  return { open: gitOut(root, ['log', '-1', '--format=%cI', f]), close: gitOut(root, ['log', '-1', '--format=%cI', c]), base: before };
}

const notOnMain = (deep) => (deep?.onMain || []).map((q) => `^${q}`);

// A commit's parents, read from the commit itself (a shallow clone's boundary commit shows none).
const parents = (root, sha) => [...(gitOut(root, ['cat-file', '-p', sha]) || '').matchAll(/^parent ([0-9a-f]{40,64})$/gm)].map((m) => m[1]);

// A commit's first parent, only when this clone holds that parent; else null.
function parentOf(root, sha) {
  const p = parents(root, sha)[0];
  return p && gitOut(root, ['cat-file', '-e', `${p}^{commit}`]) !== null ? p : null;
}

// The commits this shallow clone's history is cut at.
const cuts = (root) => shallowCuts(root);

// In a shallow clone (every session's), fetch only what the span, marks met and record-only
// figures read: the tranche's commits main lacks and main before its first one, beside main's
// tip, which the command has fetched. --shallow-exclude=main (1 s measured 3 Nov for 165
// commits) cuts at every merge of main into the tranche, both parents dropped (measured 4 Nov;
// tranche close makes one): each such merge is fetched again --depth 2, then each of its parents
// --shallow-exclude=main, which brings a tranche-side line down to main and is refused ("no
// commits selected") for a parent on main. Returns { base, onMain } (main before the first
// commit, and the merges' parents on main), or null in a full clone or when a fetch fails.
export function deepen(root, tranche, main = 'main') {
  if (gitOut(root, ['rev-parse', '--is-shallow-repository']) !== 'true') return null;
  const T = `origin/${tranche}`, M = `origin/${main}`;
  if (gitOut(root, ['fetch', '-q', `--shallow-exclude=${main}`, 'origin', `+refs/heads/${tranche}:refs/remotes/${T}`]) === null) return null;
  if (gitOut(root, ['rev-parse', '--verify', '-q', M]) === null) return null;
  const onMain = new Set();
  const own = () => (gitOut(root, ['rev-list', T, `^${M}`, ...notOnMain({ onMain: [...onMain] })]) || '').split('\n').filter(Boolean);
  const done = new Set();
  for (let round = 0; round < 100; round++) {
    const cut = cuts(root);
    const merges = own().filter((c) => cut.has(c) && !done.has(c) && parents(root, c).length > 1);
    if (!merges.length) break;
    for (const m of merges) {
      done.add(m);
      if (gitOut(root, ['fetch', '-q', '--depth', '2', 'origin', m]) === null) return null;
      for (const q of parents(root, m)) {
        if (gitOut(root, ['merge-base', '--is-ancestor', q, M]) !== null) { onMain.add(q); continue; }
        const r = git(['fetch', '-q', `--shallow-exclude=${main}`, 'origin', q], { cwd: root, allowFail: true });
        if (r.code === 0) continue;
        if (/no commits selected/.test(r.stderr)) onMain.add(q); else return null;
      }
    }
  }
  const deep = { base: null, onMain: [...onMain] };
  const f = (gitOut(root, ['rev-list', '--reverse', T, `^${M}`, ...notOnMain(deep)]) || '').split('\n').filter(Boolean)[0];
  const ps = f ? parents(root, f) : [];
  // The first commit's one parent is main's when the server cut there (main excluded it) or the
  // clone holds it on main.
  if (ps.length === 1 && (cuts(root).has(f) || gitOut(root, ['merge-base', '--is-ancestor', ps[0], M]) !== null)) {
    if (gitOut(root, ['cat-file', '-e', `${ps[0]}^{commit}`]) === null && gitOut(root, ['fetch', '-q', '--depth', '1', 'origin', ps[0]]) === null) return deep;
    deep.base = ps[0];
  }
  return deep;
}

// What lead times read, fetched for metrics report and report tranche: the tranche and main,
// every job branch origin holds (fetchJobs: fresh, never a stale ref) with its own rows (a start
// or complete row lives there until the merge), then, in a shallow clone, deepen() for the
// tranche's history. Returns { jobRefs, jobRows, deepened }. A failed fetch refuses (copy, 4 Nov: a stale tip).
export function leadFetch(root, cfg) {
  git(['fetch', '-q', ...depth(root), 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`, '+refs/heads/main:refs/remotes/origin/main'], { cwd: root });
  const jobRefs = fetchJobs(root, null, 'main', ledgerIds(root, `origin/${cfg.tranche}`));
  const jobRows = [...(jobRefs || new Map())].flatMap(([m]) => jobRefs.branches(m).flatMap((r) => rowsAt(root, r).filter((x) => x.module === m)));
  return { jobRefs, jobRows, deepened: deepen(root, cfg.tranche) };
}

const hours = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 36e5 * 10) / 10;

// The mark ids of a requirement file: all, and those still "(not yet met" (util's one parser),
// requirement marks (R) and found marks (F) alike.
const marks = requirementMarks;

// The tranche's own commits (merges left out): in tip, not in base, nor on main (main itself
// while the tranche is open, else main before the tranche's merge, which is base; deep.onMain in
// a shallow clone), and those whose changed files are all record paths. Commits merged in from
// main are main's, not the tranche's.
function recordOnly(root, cfg, base, main, tip, deep) {
  if (!base) return U;
  const out = gitOut(root, ['log', '--no-merges', '--format=%x00%H', '--name-only', tip, `^${base}`, ...(main ? [`^${main}`] : []), ...notOnMain(deep)]);
  if (out === null) return U;
  const commits = out.split('\0').filter((s) => s.trim()).map((s) => s.trim().split('\n').slice(1).filter(Boolean));
  return { record: commits.filter((fs) => fs.length && fs.every((f) => isRecordPath(cfg, f))).length, total: commits.length };
}

// io: { state(path) -> text|null (the state branch, null when unread), merged() -> merged PRs into
// the tranche or null, comments(pr) -> the PR's comments }. stateRead: whether the branch was read.
// deepened: deepen()'s result in a shallow clone.
// The base-red tests on each merged PR's newest green gate run: [{ module, pr, test, base, since }],
// since the `at` of the PR's first gate row that tolerated it; null when a PR's comments could not
// be read. A smoke test red at the base too (rows written while the gate ran a smoke list) is owed as the suite's are.
const tolerated = (g) => [g?.base_red, g?.smoke?.base_red].flatMap((x) => (Array.isArray(x) ? x : []));
export function baseRedOwed(mergeRows, runsOf) {
  const out = [];
  for (const r of mergeRows) {
    let runs;
    try { runs = runsOf(r.pr); } catch { return null; }
    const green = runs.filter((g) => g.ok && g.trigger === 'code').pop();
    for (const b of tolerated(green)) {
      for (const t of Array.isArray(b?.tests) ? b.tests : []) {
        const since = runs.find((g) => tolerated(g).some((x) => x?.module === b.module && Array.isArray(x?.tests) && x.tests.includes(t)))?.at;
        out.push({ module: b.module ?? r.module, pr: r.pr, test: String(t), base: b.base, ...(since ? { since } : {}) });
      }
    }
  }
  return out;
}

export function trancheReport(root, cfg, { slug, now = new Date().toISOString(), stateRead = false, deepened = null, jobRefs, jobRows = [], notices: slots = null, io = {} } = {}) {
  const tranche = `origin/${cfg.tranche}`;
  const tip = gitOut(root, ['rev-parse', '--verify', '-q', tranche]) ? tranche : 'HEAD';
  const read = { state: () => null, merged: () => (slug ? mergedPRs(slug, cfg.tranche) : null), comments: (n) => ghComments(slug, n), compare: (sha) => (slug ? ghCompare(slug, 'main', sha) : null), ...io };
  const stateJsonl = (p) => { const t = stateRead ? read.state(p) : null; return t === null ? null : t.split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }); };
  const show = (ref, f) => (ref && exists(root, ref, f) ? git(['show', `${ref}:${f}`], { cwd: root }) : null);
  const rows = rowsAt(root, tip);
  const L = [];
  const s = span(root, tip, 'origin/main', deepened);
  const end = s.close || now;
  // The tranche's opening, one source for every figure here (lead times' rule): the first ok
  // grant row of its open on the state branch. Unread: unmeasured, everywhere.
  const leadIn = stateRead ? leadInputs(root, cfg.state_branch, read.state, cfg.tranche) : {};
  const opened = openedAt(leadIn.grants, cfg);
  const inT = (r) => !!opened && typeof r.at === 'string' && Date.parse(r.at) >= Date.parse(opened);
  L.push(`# Tranche report: ${cfg.tranche}`, '', `Written ${now} from the record alone, at ${tip} ${(gitOut(root, ['rev-parse', tip]) || '').slice(0, 10)}. Every figure the record lacks reads \`${U}\`.`, '');

  // Elapsed
  L.push('## Elapsed time', '');
  L.push(`- opened: ${opened || U}${opened ? ' (the first ok grant row of its open, as lead times reads it)' : ' (the state branch\'s grant rows not read)'}`, `- ${s.close ? `closed (merged into main): ${s.close}` : 'still open; measured to now'}`);
  L.push(`- elapsed: ${!opened ? U : `${hours(opened, end)} h (${Math.round(hours(opened, end) / 24 * 10) / 10} days)`}`, '');

  // Work per layer
  const map = show(tip, cfg.layers_file);
  const layers = layerOf(map);
  const dir = cfg.requirements_dir.replace(/\/$/, '');
  const ledger = Object.values(readLedgerTexts(root, tip)).flatMap((t) => { try { return [JSON.parse(t)]; } catch { return []; } });
  const mods = [...new Set([...layers.keys(), ...ledger.map((e) => e.id)])].sort();
  const reqFile = (m) => ledger.find((e) => e.id === m)?.requirements || `${dir}/${m}.md`;
  // Job merges: this tranche's merge rows (since the opening), each pull request once.
  const allMerges = rows.filter((r) => r.row === 'merge');
  const mergeRows = [...new Map(allMerges.filter(inT).sort((a, b) => String(a.at).localeCompare(String(b.at))).map((r) => [r.pr, r])).values()];
  const olderPRs = [...new Set(allMerges.filter((r) => !inT(r)).map((r) => r.pr))].filter((p) => !mergeRows.some((r) => r.pr === p)).sort((a, b) => a - b);
  const merged = read.merged();
  const closed = stateJsonl(CLOSED_FILE);
  const work = mods.map((m) => {
    const now_ = marks(show(tip, reqFile(m)));
    const before = s.base ? marks(show(s.base, reqFile(m))) : null;
    const met = before ? before.unmet.filter((id) => !now_.unmet.includes(id)) : U;
    return { m, layer: layers.get(m) ?? null, prs: opened ? [...new Set(mergeRows.filter((r) => r.module === m).map((r) => r.pr))] : U, met, unmet: now_.unmet, state: ledger.find((e) => e.id === m)?.status?.state ?? 'no ledger entry' };
  });
  L.push('## Work', '');
  const jobMerges = !opened ? `job merges since the opening ${U}` : `job merges recorded: ${mergeRows.length} distinct pull requests since the opening (${allMerges.filter(inT).length} merge rows)${olderPRs.length ? `; older than this tranche, left out: ${olderPRs.map((p) => `#${p}`).join(', ')}` : ''}`;
  L.push(`Pull requests merged into ${cfg.tranche}: ${merged === null ? `${U} (GitHub not read); ${jobMerges}` : `${opened ? merged.filter((p) => Date.parse(p.merged_at) >= Date.parse(opened)).length : `${merged.length} in all, since the tranche's opening ${U}`} (${jobMerges}; the rest plain)`}.`, '');
  // The review triggers' measure (Bob, 4 Nov): this tranche's job merges, each pull request once.
  L.push(`- ${opened ? triggerSummary(mergeRows, rows.filter((r) => r.row === 'triggers')).line : `review triggers: ${U} (the tranche's opening not read)`}`, '');
  const byLayer = new Map();
  for (const w of work) byLayer.set(w.layer, [...(byLayer.get(w.layer) || []), w]);
  const order = [...byLayer.keys()].sort((a, b) => (a ?? Infinity) - (b ?? Infinity));
  // layer close's rows (status.mjs closedRows' rule): this tranche's name, and a commit the tranche
  // holds that main lacked when the tranche opened (closedRows' "not on main", which a tranche
  // already merged into main can no longer use).
  // Where the clone cannot say (a shallow clone lacks the commit, or the opening is unknown), an
  // open tranche asks GitHub's compare as closedRows does; otherwise the close is unmeasured.
  const inSpan = (sha) => {
    if (s.base && gitOut(root, ['cat-file', '-e', `${sha}^{commit}`]) !== null) {
      return gitOut(root, ['merge-base', '--is-ancestor', sha, tip]) !== null && gitOut(root, ['merge-base', '--is-ancestor', sha, s.base]) === null;
    }
    if (s.close) return null;
    let c = null;
    try { c = read.compare(sha); } catch { c = null; }
    return Number.isInteger(c?.ahead_by) ? c.ahead_by > 0 : null;
  };
  const mine = (closed || []).filter((r) => r.row === 'closed' && r.tranche === cfg.tranche && Number.isInteger(r.layer)).map((r) => ({ r, in: inSpan(String(r.commit)) }));
  const closedBy = new Map(mine.filter((x) => x.in === true).map((x) => [x.r.layer, x.r]));
  const undecided = new Set(mine.filter((x) => x.in === null && !closedBy.has(x.r.layer)).map((x) => x.r.layer));
  for (const n of order) {
    const ws = byLayer.get(n);
    const c = n === null ? null : closedBy.get(n);
    const metCount = ws.every((w) => Array.isArray(w.met)) ? ws.reduce((t, w) => t + w.met.length, 0) : U;
    L.push(`### ${n === null ? 'Not in the layer map' : `Layer ${n}`}${n === null ? '' : closed === null ? ` (closed: ${U}, state branch not read)` : undecided.has(n) ? ` (closed: ${U}, its close row's commit cannot be placed here)` : c ? ` (closed ${c.at} at ${String(c.commit).slice(0, 10)})` : ' (not closed)'}`, '');
    L.push(`Modules ${ws.length}; merged job PRs ${opened ? ws.reduce((t, w) => t + w.prs.length, 0) : U}; marks met ${metCount}.`, '');
    L.push(...table(['module', 'ledger', 'merged PRs', 'marks met'], ws.map((w) => [w.m, w.state, Array.isArray(w.prs) ? w.prs.map((p) => `#${p}`).join(', ') || 'none' : U, Array.isArray(w.met) ? `${w.met.length}${w.met.length ? ` (${w.met.join(', ')})` : ''}` : U])), '');
  }

  // Deferrals: a closed layer's row names its deferred marks; otherwise the marks unmet at the tip.
  L.push('## Deferrals', '', 'Marks left unmet per module: from the closed-layer row where its layer is closed, otherwise from the requirement file at the tip.', '');
  const def = work.map((w) => {
    const c = w.layer === null ? null : closedBy.get(w.layer);
    const d = c?.deferred?.[w.m];
    // Found marks are never deferred: they are counted under Found work.
    const ids = c ? (Array.isArray(d) ? d : d?.marks || []) : w.unmet.filter((x) => !isFound(x));
    return [w.m, c ? `layer ${w.layer} close` : undecided.has(w.layer) ? `tip (layer ${w.layer} close ${U})` : 'tip', ids.length, ids.join(', ') || 'none'];
  }).filter((r) => r[2] > 0);
  L.push(...(def.length ? table(['module', 'from', 'unmet', 'marks'], def) : ['None.']), '');

  // Provider notices (coordinator, 4 Nov): the open slots as status's one reader (status.mjs
  // noticeSlots) classes them, each with the command that closes it, so the count here and
  // `notice triage` agree; a withdrawn notice is closed, its unanswered slots counted apart.
  L.push(...noticeSection(slots), '');

  // Found work (found <module>): the found marks in the record, per module, its requirement file
  // and its found-work entry together, and those that name no module. Met: struck since the
  // tranche opened; found in this tranche: absent at its opening.
  const fileIds = (ref, f) => marks(show(ref, f));
  const entries = [...new Set([...mods, ...(gitOut(root, ['ls-tree', '--name-only', `${tip}:${FOUND_DIR}`]) || '').split('\n').filter((n) => n.endsWith('.md') && `${FOUND_DIR}/${n}` !== NO_MODULE).map((n) => n.slice(0, -3))])].sort();
  const foundRows = [...entries.map((m) => [m, [reqFile(m), foundFile(m)]]), ['(no module)', [NO_MODULE]]].map(([m, fs]) => {
    const at = (ref) => (ref ? fs.reduce((o, f) => { const k = fileIds(ref, f); return { all: [...o.all, ...k.all.filter(isFound)], unmet: [...o.unmet, ...k.unmet.filter(isFound)] }; }, { all: [], unmet: [] }) : null);
    const tipIds = at(tip);
    const base = s.base ? at(s.base) : null;
    return { m, all: tipIds.all, unmet: tipIds.unmet, added: base ? tipIds.all.filter((x) => !base.all.includes(x)).length : U, met: base ? base.unmet.filter((x) => !tipIds.unmet.includes(x)).length : U };
  }).filter((r) => r.all.length);
  L.push('## Found work', '', 'Found marks (`found <module>`: walk, deploy and other findings) in the record at the tip, per module; "found here" are those absent when the tranche opened, "met" those struck since.', '');
  const sum = (k) => (foundRows.every((r) => typeof r[k] === 'number') ? foundRows.reduce((t, r) => t + r[k], 0) : U);
  L.push(`Found marks ${foundRows.reduce((t, r) => t + r.all.length, 0)}; unmet ${foundRows.reduce((t, r) => t + r.unmet.length, 0)}; found here ${sum('added')}; met here ${sum('met')}.`, '');
  L.push(...(foundRows.length ? table(['module', 'found marks', 'unmet', 'found here', 'met here'], foundRows.map((r) => [r.m, r.all.length, r.unmet.join(', ') || 'none', r.added, r.met])) : ['None.']), '');

  // Cost and overhead
  // This tranche's rows: at the tip and on the job branches, each once, since the opening.
  const here = trancheRows(rows, jobRows, opened);
  const o = opened ? overhead(rows, layers, { opened, jobRows }) : null;
  const allMeasured = rows.filter((r) => r.row === 'attempt' && r.event === 'measured');
  const measured = (here || []).filter((r) => r.row === 'attempt' && r.event === 'measured');
  L.push('## Cost and overhead share', '', `Overhead as \`metrics report\` reckons it: ${o ? o.rule : `${U} (the tranche's opening not read)`}`, '');
  if (o) L.push(...(o.jobs.length ? table(['job', 'layer', 'job cost', 'reviews', 'BOB', 'ROOT', 'gate', 'overhead', 'share', 'unmeasured parts'],
    o.jobs.map((j) => [j.module, j.layer ?? 'none', usd(j.job_usd), usd(j.reviews_usd), usd(j.bob_usd), usd(j.root_usd), usd(j.gate_usd), usd(j.overhead_usd), pct(j.share), j.unmeasured.join(', ') || 'none'])) : [`No job has a measured row: cost per job ${U}.`]), '');
  if (o?.layers.length) L.push(...table(['layer', 'jobs', 'overhead', 'share', 'unmeasured parts'], o.layers.map((l) => [l.layer, l.jobs.join(', '), usd(l.overhead_usd), pct(l.share), l.unmeasured.join(', ') || 'none'])), '');
  // A BOB or ROOT row's cost is its session's cost so far: each such session counts its last row.
  const proc = (r) => r.role === 'bob' || r.role === 'root';
  const last = new Map();
  for (const r of measured.filter(proc).sort((a, b) => String(a.at).localeCompare(String(b.at)))) last.set(r.session || `${r.module} ${r.at}`, r);
  // A job row unmeasured stands only while its attempt has no priced one (as overhead reads it):
  // job complete's stale figure followed by the merge's priced row is one priced attempt.
  const jobRole = (r) => (r.role || 'job') === 'job';
  const pricedJob = new Set(measured.filter((r) => jobRole(r) && Number(r.cost_usd) > 0).map((r) => `${r.module}\0${r.attempt}`));
  const counted = [...measured.filter((r) => !proc(r) && !(jobRole(r) && !(Number(r.cost_usd) > 0) && pricedJob.has(`${r.module}\0${r.attempt}`))), ...last.values()];
  const pricedC = counted.filter((r) => Number.isFinite(Number(r.cost_usd)));
  // A session that began before the opening: its cost since then, less its last priced row before.
  const priorOf = (r) => (proc(r) && r.session ? Number(allMeasured.filter((x) => !inT(x) && proc(x) && x.session === r.session && Number.isFinite(Number(x.cost_usd))).sort((a, b) => String(a.at).localeCompare(String(b.at))).at(-1)?.cost_usd ?? 0) : 0);
  const total = pricedC.reduce((t, r) => t + Math.max(0, Number(r.cost_usd) - priorOf(r)), 0);
  const before = allMeasured.filter((r) => !inT(r));
  L.push(`- total cost since the opening: ${!opened ? U : !counted.length ? `${U} (no measured row since the opening)` : pricedC.length === counted.length ? usd(total) : `${U} (${usd(total)} over ${pricedC.length} priced rows; ${counted.length - pricedC.length} without a cost)`}${opened && before.length ? `; ${before.length} measured rows older than this tranche (${[...new Set(before.map((r) => r.module))].sort().join(', ')}) left out` : ''}`);
  L.push(`- BOB and ROOT cost not attributed to a job: ${o ? usd(o.unattributed_usd) : U}`, '');

  // Refusals by role and act: every refusal the record holds, as metrics report lists them
  // (refusalList: the refusal rows and the measured rows' refusals); a session's role from its
  // rows, the measured rows that name it and the state branch's addresses and handovers; a row
  // with none reads "role unknown". Those dated before the opening are listed apart.
  const roles = new Map([...sessionRoles(rows), ...(stateRead ? stateRoles(read.state) : [])]);
  const refs = refusalList(rows, roles);
  const refTable = (rs) => { const tally = new Map(); for (const r of rs) { const k = `${r.role}\0${r.act ?? U}`; tally.set(k, (tally.get(k) || 0) + 1); } return [...tally].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, n]) => [...k.split('\0'), n]); };
  const refNow = refs.filter(inT);
  const refOld = refs.filter((r) => !inT(r));
  L.push('## Refusals by role and act', '');
  L.push(`Since the opening${opened ? '' : ` (${U}: the opening not read; all listed below)`}: ${refNow.length}.`, '');
  if (refNow.length) L.push(...table(['role', 'act', 'refusals'], refTable(refNow)), '');
  if (refOld.length) L.push(`${opened ? 'Before the opening' : 'Recorded'}: ${refOld.length}.`, '', ...table(['role', 'act', 'refusals'], refTable(refOld)), '');

  // BOB idle
  const sweeps = stateJsonl('metrics/sweep.jsonl');
  const idle = sweeps === null ? U : idleByDay(sweeps);
  L.push('## BOB idle occurrences', '', 'Per UTC day, the sweeps that found acts listed for BOB and the longest BOB had been quiet at one (`metrics report` `bob_idle_by_day`).', '');
  L.push(...(Array.isArray(idle) ? table(['day', 'occurrences', 'longest quiet (h)', 'unmeasured sweeps'], idle.map((d) => [d.day, d.occurrences, d.longest_quiet_h, d.unmeasured_sweeps])) : [U]), '');

  // Flow (audit of PR 139): cap use, a diagnostic, beside velocity, efficiency and quality, whole and by
  // concurrency bucket; and the hours each setter's holds held, by reason.
  const fl = sweeps === null ? null : flowFigures({ sweeps, rows: here || rows, unmetAt: unmetAtRef(root, cfg, tip), gates: (pr) => gateRuns(read.comments(pr) || []), syncs: countCommits(root, tip, opened, end, '^Bring job/'), reverts: countCommits(root, tip, opened, end, '^Revert'), quick: quickBlocks(root, jobRefs, { from: opened, to: end }), from: opened, to: end });
  const pc = (x) => (typeof x === 'number' ? `${Math.round(x * 100)}%` : U);
  const hh = stateJsonl(HOLDS_FILE);
  L.push('## Flow', '', `Since ${opened ? 'the opening' : 'the first sweep row (the opening not read)'}, from the sweep rows (\`metrics report\` \`flow\`): ${flowRule}`, '');
  const qb = fl && typeof fl.started_then_blocked === 'object' ? fl.started_then_blocked : null;
  if (!fl) L.push(`${U} (the state branch's sweep rows not read).`, '');
  else {
    L.push(`- cap use: ${pc(fl.cap_use)} over ${fl.hours} h; IDLE CAPACITY alarms (idle stretches) ${fl.idle_alarms}`, `- velocity: ${fl.velocity_per_h} marks per hour`, `- efficiency: ${fl.merges_per_job_session_h} merges per job session-hour; per merged PR, gate runs ${fl.gate_runs_per_pr}, syncs ${fl.syncs_per_pr}, cancels ${fl.cancels_per_pr}`, `- quality: false-done share ${pc(fl.false_done_share)}; reopened marks ${fl.reopened_marks}; reverts ${fl.reverts}`, `- started then blocked within ${qb?.minutes ?? QUICK_BLOCK_MIN} min: ${qb ? `${qb.blocked} of ${qb.starts} starts (${pc(qb.share)})${qb.by_module.length ? `; by module: ${qb.by_module.map((x) => `${x.module} ${x.blocked} of ${x.starts}`).join(', ')}` : ''}${qb.unread?.length ? `; unmeasured, branches not read: ${qb.unread.join(', ')}` : ''}` : U}`, '');
    if (fl.buckets.length) L.push(...table(['live', 'hours', 'cap use', 'marks per hour', 'merges per job session-hour', 'gate runs per PR', 'false-done', 'reopened marks'], fl.buckets.map((q) => [q.live, q.hours, pc(q.cap_use), q.velocity_per_h, q.merges_per_job_session_h, q.gate_runs_per_pr, pc(q.false_done_share), q.reopened_marks])), '');
  }
  const held = hh === null ? null : holdHours(hh, opened, end, landedPRs(root, tip));
  L.push(`Hold-hours by setter and reason${held === null ? `: ${U}` : held.length ? ':' : ': none.'}`, '');
  if (held?.length) L.push(...table(['set by', 'reason', 'holds', 'hours'], held.map((x) => [x.by, x.why, x.holds, x.hours])), '');

  // Lead times
  // A close whose commit cannot be placed is passed undecided: its figure reads unmeasured.
  const undecidedRows = mine.filter((x) => x.in === null && !closedBy.has(x.r.layer)).map((x) => ({ ...x.r, undecided: true }));
  const lt = leadTimes(root, cfg, { ref: tip, rows, jobRows, layers, now, jobRefs, sweeps, comments: (pr) => gateRuns(read.comments(pr) || []), ...(stateRead ? { ...leadIn, closed: [...closedBy.values(), ...undecidedRows] } : {}) });
  L.push('## Lead times', '', `Minutes, each beside its target (\`targets\` in process/config.json); "over" marks one past it. ${lt.rule}`, '');
  L.push(`- tranche opened: ${lt.opened}`, '');
  L.push(...(!Array.isArray(lt.jobs) ? [`Per job: ${U} (the tranche's opening not read).`] : lt.jobs.length ? table(['job', 'ready to start', 'start to PR ready', 'green to merge', 'blocked', 'replace', 'report wait'], lt.jobs.map((j) => [j.module, leadCell(j.ready_to_start), leadCell(j.start_to_pr_ready), leadCell(j.green_to_merge), leadCell(j.blocked), leadCell(j.replace), leadCell(j.report_wait)])) : ['No job has a start row since the opening.']), '');
  L.push(`- layer close to next job start: ${Array.isArray(lt.close_to_next_start) ? (lt.close_to_next_start.length ? lt.close_to_next_start.map((c) => `layer ${c.layer} ${leadCell(c)}`).join('; ') : 'no layer closed') : U}`);
  for (const [k, v] of Object.entries(lt.summary)) L.push(`- ${k.replace(/_/g, ' ')}: ${leadSummaryCell(v)}`);
  L.push('');

  // Phase 3 overhead comparisons
  // Attempts by the one definition lead times and metrics report use (ATTEMPTS_RULE).
  const started = attemptsStarted(here || []);
  const jobs = [...started.keys()].sort();
  const sess = (m) => { const ss = new Set(measured.filter((r) => r.module === m && (r.role || 'job') === 'job' && r.session).map((r) => r.session)); return ss.size || U; };
  const perJob = jobs.map((m) => [m, started.get(m), sess(m)]);
  const known = perJob.filter((r) => typeof r[2] === 'number');
  const gates = mergeRows.map((r) => { try { return gateRuns(read.comments(r.pr) || []).length; } catch { return U; } });
  const gatesOk = gates.length && gates.every((g) => typeof g === 'number');
  const rec = recordOnly(root, cfg, s.base, s.close ? null : 'origin/main', tip, deepened);
  L.push('## Phase 3 overhead comparisons', '');
  L.push(`- sessions per job: ${known.length === jobs.length && jobs.length ? Math.round(known.reduce((t, r) => t + r[2], 0) / jobs.length * 100) / 100 : U}${known.length && known.length < jobs.length ? ` (${known.length} of ${jobs.length} jobs measured: ${Math.round(known.reduce((t, r) => t + r[2], 0) / known.length * 100) / 100})` : ''}`);
  L.push(`- gate runs per merged job: ${gatesOk ? Math.round(gates.reduce((t, g) => t + g, 0) / gates.length * 100) / 100 : U}${gatesOk ? ` (${gates.reduce((t, g) => t + g, 0)} runs over ${gates.length} distinct pull requests merged since the opening)` : ''}`);
  L.push(`- record-only commits: ${typeof rec === 'object' ? `${rec.record} of ${rec.total} commits in the tranche` : U}`, '');
  L.push(`Attempts: ${ATTEMPTS_RULE}.`, '');
  if (perJob.length) L.push(...table(['job', 'attempts started', 'job sessions measured'], perJob), '');
  else if (!opened) L.push(`Per job: ${U} (the tranche's opening not read).`, '');

  // The merge train trial (train.mjs): its measures beside the baselines, each named.
  const trainRows = stateJsonl(TRAIN_FILE);
  L.push('## Merge train', '', ...(trainRows === null ? [U] : trainRows.length ? trainLines(trainSummary(trainRows, stateJsonl(MERGER_FILE) || [])) : ['No merge by the train.']), '');
  // Base-red (basered.mjs): failures a job's gate tolerated because the tranche had them too.
  // Merged green, they are still owed: the layer close and the tranche into main run them again.
  L.push('## Base-red tests owed', '', 'Failing tests a merged job\'s gate tolerated because they failed at the tranche tip it merged into too. The layer close and the tranche into main run them again with no tolerance.', '');
  const owed = baseRedOwed(mergeRows, (pr) => gateRuns(read.comments(pr) || []));
  L.push(...(owed === null ? [U] : owed.length ? table(['job', 'PR', 'test', 'base'], owed.map((o) => [o.module, `#${o.pr}`, o.test, String(o.base).slice(0, 10)])) : ['None.']), '');
  return L.join('\n');
}

// The report's provider-notice section from noticeSlots' result (null: the state branch unread).
const KIND = { triage: 'triage owed', affected: 'judged affected: notice work', job: 'named by its open job', rerun: 'merged job named it, answer not recorded' };
export function noticeSection(slots) {
  const L = ['## Provider notices', ''];
  if (!slots) return [...L, `Open notice slots: ${U} (the state branch's notices not read).`];
  const keys = [...new Set(slots.slots.map((x) => x.key))];
  const by = (k) => slots.slots.filter((x) => x.kind === k).length;
  const wSlots = slots.withdrawn.reduce((t, w) => t + w.closed, 0);
  L.push(`Open notice slots (one notice, one user module, unanswered): ${slots.slots.length} across ${keys.length} notices; ${Object.entries(KIND).map(([k, w]) => `${w} ${by(k)}`).join(', ')}.`);
  L.push(`Withdrawn (closed, owing nothing; never counted open): ${slots.withdrawn.length} notices${slots.withdrawn.length ? `, ${wSlots} unanswered slots closed by withdrawal (${slots.withdrawn.map((w) => `${w.key} ${w.closed}`).join(', ')})` : ''}.`, '');
  if (!slots.slots.length) return [...L, 'No open slot.'];
  // One row per notice and act: a notice's untriaged modules share one `notice triage`.
  const rows = new Map();
  for (const x of slots.slots) {
    const k = `${x.key}\0${x.kind}\0${x.act}`;
    const r = rows.get(k) || { key: x.key, kind: x.kind, act: x.act, users: [] };
    r.users.push(x.user);
    rows.set(k, r);
  }
  return [...L, ...table(['notice', 'open slots', 'state', 'modules', 'closed by'], [...rows.values()].map((r) => [r.key, r.users.length, KIND[r.kind], r.users.length > 6 ? `${r.users.slice(0, 6).join(', ')} and ${r.users.length - 6} more` : r.users.join(', '), `\`${r.act}\``]))];
}
