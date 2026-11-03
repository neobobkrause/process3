// report tranche (Build Plan Phase 3, PLN-6, SES-11): one Markdown report of the tranche, from the
// record alone: the ledger and metrics rows the tranche holds, the state branch's sweep, handover,
// address and closed-layer rows, and the pull requests merged into the tranche. Every figure the
// record lacks prints "unmeasured", never a guess. Overhead is metrics report's (overhead()).
import { comments as ghComments, gateRuns } from './github.mjs';
import { readLedgerTexts } from './ledger.mjs';
import { idleByDay, layerOf, overhead, rowsAt } from './metrics.mjs';
import { CLOSED_FILE } from './status.mjs';
import { exists, gh, git, isRecordPath } from './util.mjs';

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
// into main, to that merge. In a shallow clone, or with no such commit, unmeasured.
export function span(root, tranche, main) {
  const shallow = gitOut(root, ['rev-parse', '--is-shallow-repository']) === 'true';
  if (shallow || gitOut(root, ['rev-parse', '--verify', '-q', tranche]) === null) return { open: U, close: null, base: null };
  const haveMain = gitOut(root, ['rev-parse', '--verify', '-q', main]) !== null;
  const ahead = haveMain ? gitOut(root, ['rev-list', '--reverse', `${main}..${tranche}`]) : null;
  const first = (shas) => (shas || '').split('\n').filter(Boolean)[0] || null;
  if (ahead) {
    const f = first(ahead);
    return { open: gitOut(root, ['log', '-1', '--format=%cI', f]), close: null, base: gitOut(root, ['rev-parse', `${f}^`]) };
  }
  if (!haveMain) return { open: U, close: null, base: null };
  // Merged: the first main commit on the path from the tranche tip, and main before it.
  const c = first(gitOut(root, ['rev-list', '--reverse', '--ancestry-path', `${tranche}..${main}`]));
  const before = c && gitOut(root, ['rev-parse', `${c}^1`]);
  const f = before && first(gitOut(root, ['rev-list', '--reverse', `${before}..${tranche}`]));
  if (!f) return { open: U, close: null, base: null };
  return { open: gitOut(root, ['log', '-1', '--format=%cI', f]), close: gitOut(root, ['log', '-1', '--format=%cI', c]), base: before };
}

const hours = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 36e5 * 10) / 10;

// The mark ids of a requirement file: all, and those still "(not yet met".
function marks(text) {
  const all = [...(text || '').matchAll(/\*\*(R[\w.-]+)\*\*(\s*\*\(not yet met)?/g)];
  return { all: all.map((m) => m[1]), unmet: all.filter((m) => m[2]).map((m) => m[1]) };
}

// Commits in base..tip (merges left out) whose changed files are all record paths.
function recordOnly(root, cfg, base, tip) {
  if (!base) return U;
  const out = gitOut(root, ['log', '--no-merges', '--format=%x00%H', '--name-only', `${base}..${tip}`]);
  if (out === null) return U;
  const commits = out.split('\0').filter((s) => s.trim()).map((s) => s.trim().split('\n').slice(1).filter(Boolean));
  return { record: commits.filter((fs) => fs.length && fs.every((f) => isRecordPath(cfg, f))).length, total: commits.length };
}

// io: { state(path) -> text|null (the state branch, null when unread), merged() -> merged PRs into
// the tranche or null, comments(pr) -> the PR's comments }. stateRead: whether the branch was read.
export function trancheReport(root, cfg, { slug, now = new Date().toISOString(), stateRead = false, io = {} } = {}) {
  const tranche = `origin/${cfg.tranche}`;
  const tip = gitOut(root, ['rev-parse', '--verify', '-q', tranche]) ? tranche : 'HEAD';
  const read = { state: () => null, merged: () => (slug ? mergedPRs(slug, cfg.tranche) : null), comments: (n) => ghComments(slug, n), ...io };
  const stateJsonl = (p) => { const t = stateRead ? read.state(p) : null; return t === null ? null : t.split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }); };
  const show = (ref, f) => (ref && exists(root, ref, f) ? git(['show', `${ref}:${f}`], { cwd: root }) : null);
  const rows = rowsAt(root, tip);
  const L = [];
  const s = span(root, tip, 'origin/main');
  const end = s.close || now;
  L.push(`# Tranche report: ${cfg.tranche}`, '', `Written ${now} from the record alone, at ${tip} ${(gitOut(root, ['rev-parse', tip]) || '').slice(0, 10)}. Every figure the record lacks reads \`${U}\`.`, '');

  // Elapsed
  L.push('## Elapsed time', '');
  L.push(`- opened: ${s.open}`, `- ${s.close ? `closed (merged into main): ${s.close}` : 'still open; measured to now'}`);
  L.push(`- elapsed: ${s.open === U || !s.open ? U : `${hours(s.open, end)} h (${Math.round(hours(s.open, end) / 24 * 10) / 10} days)`}`, '');

  // Work per layer
  const map = show(tip, cfg.layers_file);
  const layers = layerOf(map);
  const dir = cfg.requirements_dir.replace(/\/$/, '');
  const ledger = Object.values(readLedgerTexts(root, tip)).flatMap((t) => { try { return [JSON.parse(t)]; } catch { return []; } });
  const mods = [...new Set([...layers.keys(), ...ledger.map((e) => e.id)])].sort();
  const reqFile = (m) => ledger.find((e) => e.id === m)?.requirements || `${dir}/${m}.md`;
  const mergeRows = rows.filter((r) => r.row === 'merge');
  const merged = read.merged();
  const closed = stateJsonl(CLOSED_FILE);
  const work = mods.map((m) => {
    const now_ = marks(show(tip, reqFile(m)));
    const before = s.base ? marks(show(s.base, reqFile(m))) : null;
    const met = before ? before.unmet.filter((id) => !now_.unmet.includes(id)) : U;
    return { m, layer: layers.get(m) ?? null, prs: [...new Set(mergeRows.filter((r) => r.module === m).map((r) => r.pr))], met, unmet: now_.unmet, state: ledger.find((e) => e.id === m)?.status?.state ?? 'no ledger entry' };
  });
  L.push('## Work', '');
  L.push(`Pull requests merged into ${cfg.tranche}: ${merged === null ? `${U} (GitHub not read); job merges recorded: ${mergeRows.length}` : `${s.open && s.open !== U ? merged.filter((p) => p.merged_at >= s.open).length : `${merged.length} in all, since the tranche's opening ${U}`} (${mergeRows.length} job merges recorded; the rest plain)`}.`, '');
  const byLayer = new Map();
  for (const w of work) byLayer.set(w.layer, [...(byLayer.get(w.layer) || []), w]);
  const order = [...byLayer.keys()].sort((a, b) => (a ?? Infinity) - (b ?? Infinity));
  // layer close's rows (status.mjs closedRows' rule): this tranche's name, and a commit the tranche
  // holds that main lacked when the tranche opened (closedRows' "not on main", which a tranche
  // already merged into main can no longer use).
  const inSpan = (sha) => gitOut(root, ['merge-base', '--is-ancestor', sha, tip]) !== null && (!s.base || gitOut(root, ['merge-base', '--is-ancestor', sha, s.base]) === null);
  const closedBy = new Map((closed || []).filter((r) => r.row === 'closed' && r.tranche === cfg.tranche && Number.isInteger(r.layer) && inSpan(String(r.commit))).map((r) => [r.layer, r]));
  for (const n of order) {
    const ws = byLayer.get(n);
    const c = n === null ? null : closedBy.get(n);
    const metCount = ws.every((w) => Array.isArray(w.met)) ? ws.reduce((t, w) => t + w.met.length, 0) : U;
    L.push(`### ${n === null ? 'Not in the layer map' : `Layer ${n}`}${n === null ? '' : closed === null ? ` (closed: ${U}, state branch not read)` : c ? ` (closed ${c.at} at ${String(c.commit).slice(0, 10)})` : ' (not closed)'}`, '');
    L.push(`Modules ${ws.length}; merged job PRs ${ws.reduce((t, w) => t + w.prs.length, 0)}; marks met ${metCount}.`, '');
    L.push(...table(['module', 'ledger', 'merged PRs', 'marks met'], ws.map((w) => [w.m, w.state, w.prs.map((p) => `#${p}`).join(', ') || 'none', Array.isArray(w.met) ? `${w.met.length}${w.met.length ? ` (${w.met.join(', ')})` : ''}` : U])), '');
  }

  // Deferrals: a closed layer's row names its deferred marks; otherwise the marks unmet at the tip.
  L.push('## Deferrals', '', 'Marks left unmet per module: from the closed-layer row where its layer is closed, otherwise from the requirement file at the tip.', '');
  const def = work.map((w) => {
    const c = w.layer === null ? null : closedBy.get(w.layer);
    const ids = c ? (c.deferred?.[w.m] || []) : w.unmet;
    return [w.m, c ? `layer ${w.layer} close` : 'tip', ids.length, ids.join(', ') || 'none'];
  }).filter((r) => r[2] > 0);
  L.push(...(def.length ? table(['module', 'from', 'unmet', 'marks'], def) : ['None.']), '');

  // Cost and overhead
  const o = overhead(rows, layers);
  const measured = rows.filter((r) => r.row === 'attempt' && r.event === 'measured');
  const priced = measured.filter((r) => Number.isFinite(Number(r.cost_usd)));
  L.push('## Cost and overhead share', '', `Overhead as \`metrics report\` reckons it: ${o.rule}`, '');
  L.push(...(o.jobs.length ? table(['job', 'layer', 'job cost', 'reviews', 'BOB', 'ROOT', 'gate', 'overhead', 'share', 'unmeasured parts'],
    o.jobs.map((j) => [j.module, j.layer ?? 'none', usd(j.job_usd), usd(j.reviews_usd), usd(j.bob_usd), usd(j.root_usd), usd(j.gate_usd), usd(j.overhead_usd), pct(j.share), j.unmeasured.join(', ') || 'none'])) : [`No job has a measured row: cost per job ${U}.`]), '');
  if (o.layers.length) L.push(...table(['layer', 'jobs', 'overhead', 'share', 'unmeasured parts'], o.layers.map((l) => [l.layer, l.jobs.join(', '), usd(l.overhead_usd), pct(l.share), l.unmeasured.join(', ') || 'none'])), '');
  const total = priced.reduce((t, r) => t + Number(r.cost_usd), 0);
  L.push(`- total cost: ${!measured.length ? U : priced.length === measured.length ? usd(total) : `${U} (${usd(total)} over ${priced.length} priced rows; ${measured.length - priced.length} rows without a cost)`}`);
  L.push(`- BOB and ROOT cost not attributed to a job: ${usd(o.unattributed_usd)}`, '');

  // Refusals by role and act: the refusal rows (as status counts them); a session's role from the
  // measured rows that name it and the addresses and handovers on the state branch.
  const roleOf = new Map(measured.filter((r) => r.session).map((r) => [r.session, r.role || 'job']));
  for (const r of stateJsonl('metrics/handover.jsonl') || []) { if (r.old) roleOf.set(r.old, 'bob'); if (r.new) roleOf.set(r.new, 'bob'); }
  for (const who of ['root', 'bob', 'watcher']) { const t = stateRead ? read.state(`addresses/${who}.json`) : null; try { const a = t && JSON.parse(t); if (a?.session) roleOf.set(a.session, who); } catch { /* unreadable address */ } }
  const ref = rows.filter((r) => r.row === 'refusal' && r.session);
  const tally = new Map();
  for (const r of ref) { const k = `${roleOf.get(r.session) || U}\0${r.act}`; tally.set(k, (tally.get(k) || 0) + 1); }
  L.push('## Refusals by role and act', '');
  L.push(...(tally.size ? table(['role', 'act', 'refusals'], [...tally].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, n]) => [...k.split('\0'), n])) : ['None recorded.']), '');

  // BOB idle
  const sweeps = stateJsonl('metrics/sweep.jsonl');
  const idle = sweeps === null ? U : idleByDay(sweeps);
  L.push('## BOB idle occurrences', '', 'Per UTC day, the sweeps that found acts listed for BOB and the longest BOB had been quiet at one (`metrics report` `bob_idle_by_day`).', '');
  L.push(...(Array.isArray(idle) ? table(['day', 'occurrences', 'longest quiet (h)', 'unmeasured sweeps'], idle.map((d) => [d.day, d.occurrences, d.longest_quiet_h, d.unmeasured_sweeps])) : [U]), '');

  // Phase 3 overhead comparisons
  const jobs = [...new Set(rows.filter((r) => r.row === 'attempt' && r.event === 'start' && r.module).map((r) => r.module))].sort();
  const sess = (m) => { const ss = new Set(measured.filter((r) => r.module === m && (r.role || 'job') === 'job' && r.session).map((r) => r.session)); return ss.size || U; };
  const perJob = jobs.map((m) => [m, rows.filter((r) => r.module === m && r.row === 'attempt' && r.event === 'start').length, sess(m)]);
  const known = perJob.filter((r) => typeof r[2] === 'number');
  const gates = mergeRows.map((r) => { try { return gateRuns(read.comments(r.pr) || []).length; } catch { return U; } });
  const gatesOk = gates.length && gates.every((g) => typeof g === 'number');
  const rec = recordOnly(root, cfg, s.base, tip);
  L.push('## Phase 3 overhead comparisons', '');
  L.push(`- sessions per job: ${known.length === jobs.length && jobs.length ? Math.round(known.reduce((t, r) => t + r[2], 0) / jobs.length * 100) / 100 : U}${known.length && known.length < jobs.length ? ` (${known.length} of ${jobs.length} jobs measured: ${Math.round(known.reduce((t, r) => t + r[2], 0) / known.length * 100) / 100})` : ''}`);
  L.push(`- gate runs per merged job: ${gatesOk ? Math.round(gates.reduce((t, g) => t + g, 0) / gates.length * 100) / 100 : U}${gatesOk ? ` (${gates.reduce((t, g) => t + g, 0)} runs over ${gates.length} merges)` : ''}`);
  L.push(`- record-only commits: ${typeof rec === 'object' ? `${rec.record} of ${rec.total} commits in the tranche` : U}`, '');
  if (perJob.length) L.push(...table(['job', 'attempts started', 'job sessions measured'], perJob), '');
  return L.join('\n');
}
