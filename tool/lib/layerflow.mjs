// The shared layer branch (design note "Shared Layer Branch", Bob, 5 Nov; trial first, then adopt),
// behind process/config.json "merge_strategy": "layer" (default "train", today's flow, unchanged).
//
// One layer's life:
//   layer open <n>     cuts layer/<n> from the tranche tip and lists the jobs that can start; ROOT
//                      starts them (job start cuts each job branch from layer/<n>, its draft PR into it).
//   layer publish <id> the job's: brings its branch up to the layer tip, refuses any file outside
//                      the module, runs the module's fast checks (job complete, its receipt; the
//                      suite runs in CI's gate: AUD-7, PLT-4),
//                      and marks its PR into layer/<n> ready, so the gate runs on its tip. While the
//                      run goes it watches the state branch: a reschedule for the module halts the
//                      run at once, and it starts again on the new layer tip.
//   layer land <pr>    the merge tool's: a publish PR whose gate is green on its head merges into
//                      layer/<n>, with no combined re-test. Refused when the run behind it started
//                      before a provider's newest interface change. At the land the provider's
//                      interface (its exports, exports.mjs, and the Public / Provides section of its
//                      requirements file) is compared before and after: a change reschedules its
//                      users in the layer and leaves a provider notice for its users in later layers.
//   layer status <n>   each module's state: not started, working, published, rescheduled, complete, deferred.
//   layer merge <n>    when every module is complete or deferred, no reschedule outstanding and no
//                      publish open: layer/<n> into the tranche as one PR, with no further test run
//                      (the gate's layer trigger checks each module's evidence and runs no suite).
//   layer report <n>   the trial's measures.
// State: one file per event under layerflow/<n>/ on the state branch (layerbase.mjs flowFile).
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { anyExportChange, exportChanges } from './exports.mjs';
import { checkRun, comments as ghComments, createPR, findPR, gateRuns, getPR, openPRs } from './github.mjs';
import { diffNames, ownPaths } from './gate.mjs';
import { generatedRows, isGenerated } from './checks.mjs';
import { branchModule, entryFile, ledgerIds } from './ledger.mjs';
import { FLOW_DIR, flowFile, jobCfg, layerBranch, layerMode, layerOf, layerOfBranch, layersAt, safeName } from './layerbase.mjs';
import { answerFile, isSource, noticeFile, noticeKey, noticeRecords, readModules, sourcePaths, usersOf } from './notice.mjs';
import { fetchState, readState, writeState } from './state.mjs';
import { exists, fail, fetchBranch, git, isFound, isRecordOrLane, jobCap, loadConfig, now, repoSlug, underPath, unmetIds } from './util.mjs';

const MINUTE = 60000;
export const LAND_TITLE = /^Merge layer PR (\d+)$/;
export const landTitle = (n) => `Merge layer PR ${n}`;
export const P3 = 'node .process/tool/p3.mjs';
// status.mjs's CLOSED_FILE, named here: status.mjs reads job.mjs, which reads the gate, which reads this file.
const CLOSED_FILE = 'layers/closed.jsonl';
const short = (s) => String(s || '').slice(0, 10);
const isAnc = (root, a, b) => !!a && !!b && git(['merge-base', '--is-ancestor', a, b], { cwd: root, allowFail: true }).code === 0;
const rev = (root, r) => git(['rev-parse', r], { cwd: root });
const hasCommit = (root, c) => git(['cat-file', '-e', `${c}^{commit}`], { cwd: root, allowFail: true }).code === 0;
const minutes = (a, b) => Math.round(((Date.parse(b) - Date.parse(a)) / MINUTE) * 10) / 10;

export function needLayerMode(cfg, what) {
  if (!layerMode(cfg)) fail(`${what} is the shared layer branch's, and process/config.json's merge_strategy is ${JSON.stringify(cfg.merge_strategy ?? 'train')}: the train's flow runs; set "merge_strategy": "layer" (Bob's word) to use it`);
}
const layerNum = (n) => (/^\d+$/.test(String(n)) ? Number(n) : fail(`the layer's number, not ${JSON.stringify(n)}`));

// ---- the interface signal -------------------------------------------------------------------

// The Public / Provides section of a requirements file: the lines under `### Provides` inside
// `## Public`, up to the next heading of level 3 or less; whitespace collapsed, blank lines and
// unmet marks `*(not yet met ...)*` left out (striking a mark records that a requirement is met; it
// is the job's progress, not a change of what the module offers). null: no such section.
const MARK = /\s*\*\(not yet met[^)]*\)\*/gi;
export function providesText(md) {
  const raw = providesRaw(md, true);
  return raw;
}
function providesRaw(md, norm = false) {
  if (md === null || md === undefined) return null;
  let pub = false;
  let prov = false;
  let found = false;
  const out = [];
  for (const l of String(md).split('\n')) {
    const h = l.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (h && h[1].length <= 3) {
      const t = h[2].toLowerCase();
      if (h[1].length <= 2) { pub = /^public\b/.test(t); prov = false; } else { prov = pub && /^provides\b/.test(t); if (prov) found = true; }
      continue;
    }
    if (prov) { const x = norm ? l.replace(MARK, '').replace(/\s+/g, ' ').trim() : l; if (x) out.push(x); }
  }
  return found ? out.join('\n') : null;
}

const entryAt = (root, ref, id) => { const t = git(['show', `${ref}:${entryFile(id)}`], { cwd: root, allowFail: true }); try { return t.code === 0 ? JSON.parse(t.stdout) : null; } catch { return null; } };
const textAt = (root, ref, f) => (f && exists(root, ref, f) ? git(['show', `${ref}:${f}`], { cwd: root }) : null);

// Whether a module's interface changed from `before` to `after`: its exports as its users import
// them (exports.mjs exportChanges) and its Public / Provides. Nothing of its own source and not its
// requirements file changed: unchanged, read no further. An export surface that cannot be read
// counts as changed, so a user is never left unwarned by a bad read (unread says why).
export function interfaceChange(root, cfg, id, before, after) {
  const e = entryAt(root, after, id) || entryAt(root, before, id);
  if (!e) return { changed: false, exports: null, provides: null, triggers: [], why: `no ledger entry for ${id}` };
  const files = diffNames(root, before, after);
  const src = files.filter((f) => isSource(cfg, e, f));
  const req = !!e.requirements && files.includes(e.requirements);
  const out = { changed: false, exports: null, provides: null };
  if (req) {
    const [a, b] = [providesText(textAt(root, before, e.requirements)), providesText(textAt(root, after, e.requirements))];
    if (a !== b) out.provides = { before: a, after: b };
  }
  if (src.length) {
    try {
      const x = exportChanges(root, before, after, { isProviderSource: (f) => isSource(cfg, e, f), inProvider: (f) => [...(e.paths || []), ...(e.tests || [])].some((p) => underPath(f, p)), providerPaths: sourcePaths(cfg, e) });
      if (anyExportChange(x)) out.exports = x;
    } catch (err) { out.unread = String(err.message || err).slice(0, 200); }
  }
  // A return shape is not in the exports (Bob, 5 Nov: a provider answered {materials: [...]} for a
  // list, its exports unchanged, and screens-publish read it wrongly). A changed test of the
  // provider that names one of its Public / Provides requirements (a word R<id> the section holds,
  // read at after, else before) counts too: it reschedules, it refuses nothing.
  const tests = files.filter((f) => (e.tests || []).some((p) => underPath(f, p)));
  if (tests.length) {
    const ids = providesIds(textAt(root, after, e.requirements)) || providesIds(textAt(root, before, e.requirements)) || [];
    const hit = ids.length ? tests.filter((f) => { const t = `${textAt(root, before, f) || ''}\n${textAt(root, after, f) || ''}`; return ids.some((r) => new RegExp(`(^|[^\\w.])${r.replace(/\./g, '\\.')}(?![\\w]|\\.\\w)`).test(t)); }) : [];
    if (hit.length) out.provides_tests = hit.sort();
  }
  out.triggers = [...(out.exports ? ['exports'] : []), ...(out.provides ? ['provides-text'] : []), ...(out.provides_tests ? ['provides-test'] : []), ...(out.unread ? ['exports-unread'] : [])];
  out.changed = out.triggers.length > 0;
  return out;
}
// The requirement ids the Public / Provides section names (**R<id>**), or null without a section.
export function providesIds(md) {
  const t = providesRaw(md);
  return t === null ? null : [...new Set([...t.matchAll(/\*\*(R[\w.-]+?)\*\*/g)].map((m) => m[1]))];
}
export function interfaceText(ic) {
  const parts = [];
  if (ic.exports) {
    const x = ic.exports;
    if (x.removed.length) parts.push(`removed ${x.removed.join(', ')}`);
    if (x.changed.length) parts.push(`changed ${x.changed.map((c) => `${c.name} ${c.before} -> ${c.after}`).join(', ')}`);
    if (x.added.length) parts.push(`added ${x.added.join(', ')}`);
  }
  if (ic.provides) parts.push('its Public / Provides section changed');
  if (ic.provides_tests) parts.push(`its tests of Public / Provides requirements changed (${ic.provides_tests.join(', ')}), which may mean a changed answer shape`);
  if (ic.unread) parts.push(`its exports could not be read (${ic.unread}), counted as changed`);
  return parts.join('; ') || 'no change';
}

// ---- the state branch's rows ----------------------------------------------------------------

// Every row under layerflow/<n>/ as the fetched state branch holds it.
export function flowRows(root, sb, n) {
  const r = git(['ls-tree', '-r', '--name-only', '-z', `refs/remotes/origin/${sb}`, '--', `${FLOW_DIR}/${n}/`], { cwd: root, allowFail: true });
  const files = r.code === 0 ? r.stdout.split('\0').filter((f) => f.endsWith('.json')) : [];
  const rows = files.flatMap((f) => { try { return [JSON.parse(readState(root, sb, f))]; } catch { return []; } });
  const by = (k) => rows.filter((x) => x.row === k).sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return { open: by('open')[0] || null, merged: by('merged')[0] || null, runs: by('run'), lands: by('land'), reschedules: by('reschedule') };
}
// One file per event, added and never edited: an existing file is the same event, kept.
function addFiles(w, files) {
  for (const [path, row] of files) {
    const p = join(w, path);
    if (existsSync(p)) continue;
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(row, null, 2) + '\n');
  }
}
export const writeRows = (root, sb, msg, files) => writeState(root, sb, msg, (w) => (addFiles(w, files), {}));

// A reschedule is outstanding until a land of its user holds the provider's land.
export const outstanding = (reschedules, lands, user, anc) => reschedules.filter((r) => r.user === user && !lands.some((l) => l.module === user && anc(r.provider_land, l.head)));

// ---- module states --------------------------------------------------------------------------

// Each module of the layer: { id, state, why, pr, lands, outstanding, marks }. state:
//   deferred     BLOCKED at the layer tip: it does not hold the merge (PLN-4);
//   rescheduled  a provider's interface changed since its last green run: it re-runs;
//   published    its PR into the layer is ready (its gate on its tip decides the land);
//   working      its job is open (a draft PR into the layer);
//   complete     its last publish landed, no reschedule outstanding, nothing open; or nothing to
//                do (COMPLETE before the layer opened, no unmet requirement mark);
//   not started  no job yet: one can start.
export function moduleStates({ mods, entries, marks, prs, lands, reschedules, anc }) {
  return mods.map((id) => {
    const e = entries.get(id);
    const pr = (prs || []).find((p) => p.module === id) || null;
    const mine = lands.filter((l) => l.module === id);
    const out = outstanding(reschedules, lands, id, anc);
    const m = marks.get(id) || [];
    const base = { id, pr: pr?.number ?? null, lands: mine.length, outstanding: out, marks: m };
    if (e?.status?.state === 'BLOCKED') return { ...base, state: 'deferred', why: `BLOCKED: ${e.status.reason || 'no reason'}` };
    if (out.length) return { ...base, state: 'rescheduled', why: `re-runs against ${[...new Set(out.map((r) => r.provider))].join(', ')}'s new interface` };
    if (pr && !pr.draft) return { ...base, state: 'published', why: `PR ${pr.number} ready into the layer` };
    if (pr) return { ...base, state: 'working', why: `PR ${pr.number}, a draft` };
    if (mine.length) return { ...base, state: 'complete', why: `landed ${mine.length} time(s), last PR ${mine.at(-1).pr}` };
    if (e?.status?.state === 'COMPLETE' && !m.length) return { ...base, state: 'complete', why: 'COMPLETE before the layer opened, no unmet mark' };
    return { ...base, state: 'not started', why: e ? `${e.status?.state}${m.length ? `, unmet ${m.join(', ')}` : ''}` : 'no ledger entry' };
  });
}
export const DONE = ['complete', 'deferred'];
export const mergeReady = (states) => states.every((s) => DONE.includes(s.state));

// What BOB may start (the tool lists, BOB starts; Bob, 5 Nov): each module not started, and each
// complete one a reschedule reopened (its PR landed, so a new attempt).
export function startable(states) {
  return states.flatMap((s) => {
    if (s.state === 'not started') return [{ id: s.id, cmd: `${P3} job start ${s.id} --live <n>${s.marks.length && s.why.startsWith('COMPLETE') ? ` --reopen "meet the unmet requirement marks ${s.marks.join(', ')}"` : ''}` }];
    if (s.state === 'rescheduled' && s.pr === null) {
      const why = [...new Set(s.outstanding.map((r) => `${r.provider} (land ${short(r.provider_land)})`))].join(', ');
      return [{ id: s.id, cmd: `${P3} job start ${s.id} --live <n> --reopen "re-test against the new interface of ${why}"` }];
    }
    return [];
  });
}

// ---- reading a layer ------------------------------------------------------------------------

function fetchLayer(root, cfg, n) {
  fetchBranch(root, cfg.tranche, { allowFail: true });
  fetchBranch(root, layerBranch(n), { allowFail: true });
  fetchState(root, cfg.state_branch, { fresh: true });
}
const layerRef = (n) => `refs/remotes/origin/${layerBranch(n)}`;

export function readLayer(root, cfg, n, { io = {}, slug = null } = {}) {
  const ref = layerRef(n);
  if (git(['rev-parse', '-q', '--verify', ref], { cwd: root, allowFail: true }).code !== 0) fail(`no ${layerBranch(n)} on origin: open it first (${P3} layer open ${n})`);
  const layers = layersAt(root, cfg, ref);
  const L = layers.find((x) => x.n === n) || fail(`layer ${n} is not in ${cfg.layers_file} on ${layerBranch(n)}`);
  const rows = flowRows(root, cfg.state_branch, n);
  const dir = cfg.requirements_dir.replace(/\/$/, '');
  const entries = new Map(L.mods.map((id) => [id, entryAt(root, ref, id)]));
  const marks = new Map(L.mods.map((id) => [id, unmetIds(textAt(root, ref, entries.get(id)?.requirements || `${dir}/${id}.md`) || '').filter((x) => !isFound(x))]));
  const list = (io.openPRs || openPRs)(slug, layerBranch(n));
  if (list === null) fail(`GitHub unreadable: the open pull requests into ${layerBranch(n)} are not known`);
  const ids = ledgerIds(root, ref);
  const prs = list.map((p) => ({ number: p.number, draft: !!p.draft, head: p.head?.sha, ref: p.head?.ref, module: branchModule(p.head?.ref, ids) }));
  const anc = (a, b) => isAnc(root, a, b);
  const states = moduleStates({ mods: L.mods, entries, marks, prs, lands: rows.lands, reschedules: rows.reschedules, anc });
  return { n, ref, mods: L.mods, layers, rows, entries, prs, states };
}

// Whether a layer is behind us when the flow starts mid-tranche (the copy switches after layer 6,
// closed by the train: cold review 3): closed (layers/closed.jsonl, layer close's or layer merge's
// row), merged by the flow, or with nothing left in it (every module COMPLETE or BLOCKED at the
// tranche tip, no unmet requirement mark), as status's layerState counts an implicit close.
// Only this tranche's close rows, as status's closedRows keeps them: its name, a commit not on main
// (an earlier tranche of the same name closed its layers before it reached main: confirming review N4).
export function closedLayers(root, sb, cfg) {
  fetchBranch(root, 'main', { allowFail: true });
  const main = git(['rev-parse', '-q', '--verify', 'refs/remotes/origin/main'], { cwd: root, allowFail: true }).code === 0 ? 'refs/remotes/origin/main' : null;
  return new Set((readState(root, sb, CLOSED_FILE) || '').split('\n').filter(Boolean).flatMap((l) => {
    try { const r = JSON.parse(l); return r.row === 'closed' && (!cfg || r.tranche === cfg.tranche) && !(main && r.commit && hasCommit(root, r.commit) && isAnc(root, r.commit, main)) ? [r.layer] : []; } catch { return []; }
  }));
}
// This tranche's merge of the layer: a merged row whose merge has not reached main.
const mergedHere = (root, rows) => !!rows.merged && !staleFlow(root, rows);
// A layer whose flow rows are an earlier tranche's: its merge reached main. The flow's rows and
// branch for a second tranche are not built (the trial is one layer); refused, never reused.
function staleFlow(root, rows) {
  const c = rows.merged?.commit;
  if (!c || !hasCommit(root, c)) return false;
  fetchBranch(root, 'main', { allowFail: true });
  return git(['rev-parse', '-q', '--verify', 'refs/remotes/origin/main'], { cwd: root, allowFail: true }).code === 0 && isAnc(root, c, 'refs/remotes/origin/main');
}
function layerBehind(root, cfg, L, closed, ref) {
  if (closed.has(L.n) || mergedHere(root, flowRows(root, cfg.state_branch, L.n))) return true;
  const dir = cfg.requirements_dir.replace(/\/$/, '');
  return L.mods.every((id) => {
    const e = entryAt(root, ref, id);
    if (!e || !['COMPLETE', 'BLOCKED'].includes(e.status?.state)) return false;
    return !unmetIds(textAt(root, ref, e.requirements || `${dir}/${id}.md`) || '').filter((x) => !isFound(x)).length;
  });
}

// The open layer as the flow reads it (one read, shared by status, send's lead to BOB and the
// sweep): { kind: 'open', n, states, prs, startable, ready } (ready: every module complete or
// deferred, no PR open into the layer), { kind: 'next', n } (the next layer, not open),
// { kind: 'stale', n } (its rows an earlier tranche's) or { kind: 'done' } (every layer merged).
export function openLayer(root, cfg, { slug, io = {} } = {}) {
  const tr = `refs/remotes/origin/${cfg.tranche}`;
  const layers = layersAt(root, cfg, tr);
  const closed = closedLayers(root, cfg.state_branch, cfg);
  for (const layer of layers) {
    const { n } = layer;
    const r = flowRows(root, cfg.state_branch, n);
    // A layer behind us (closed, or with nothing left) is passed over first, stale rows or not,
    // as layer open passes it (third confirming review, minor 1).
    if ((!r.open || staleFlow(root, r)) && layerBehind(root, cfg, layer, closed, tr)) continue;
    if (staleFlow(root, r)) return { kind: 'stale', n };
    if (r.merged) continue;
    if (!r.open) return { kind: 'next', n };
    fetchBranch(root, layerBranch(n), { allowFail: true });
    const x = readLayer(root, cfg, n, { io, slug });
    return { kind: 'open', n, states: x.states, prs: x.prs, startable: startable(x.states), ready: mergeReady(x.states) && !x.prs.length };
  }
  return { kind: 'done' };
}
// openLayer after fetching the tranche and the state branch (send, the sweep, the idle check).
// fetch false: the refs this clone has (send's lead: a wake is not held for fetches).
export function readOpenLayer(root, cfg, { slug = null, io = {}, fetch = true } = {}) {
  if (fetch) {
    fetchBranch(root, cfg.tranche, { allowFail: true });
    fetchState(root, cfg.state_branch, { fresh: true });
  }
  return openLayer(root, cfg, { slug: slug || io.slug || repoSlug(root), io });
}
const STATE_ORDER = ['complete', 'deferred', 'published', 'working', 'rescheduled', 'not started'];
export const stateCounts = (states) => STATE_ORDER.map((k) => `${k} ${states.filter((s) => s.state === k).length}`).join(', ');
// The open layer's merge line, only when it holds (every module complete or deferred, no PR open
// into the layer); else null. status prints it where the train's "ready to close" stood.
export const layerMergeLine = (v) => (v?.kind === 'open' && v.ready ? `layer ${v.n}: ${stateCounts(v.states)}; merge when every module is complete or deferred (${P3} layer merge ${v.n})` : null);
// The lead of a message to BOB in the layer flow: the open layer's jobs to start, from
// `layer jobs <n>`; '' when there are none (the train's lead is `job start --ready`).
export const layerLead = (v) => (v?.kind === 'open' && v.startable.length ? `first: start layer ${v.n}'s jobs (${P3} layer jobs ${v.n}): ${v.startable.map((q) => q.cmd).join('; ')}. Then: ` : '');
// BOB's act to start work in the layer flow, where the train's says `job start --ready`.
// The act owed: start the listed jobs, merge the layer, or open the next; unread, status says.
export const layerStartAct = (v) => (v?.kind === 'open' && v.startable.length ? `${P3} layer jobs ${v.n}, then each job start it lists`
  : v?.kind === 'open' && v.ready ? `${P3} layer merge ${v.n}`
    : v?.kind === 'next' ? `${P3} layer open ${v.n}`
      : `${P3} status --role bob (the layer flow's next act)`);

// The lines status --role bob prints in the layer flow: the open layer's modules by state and the
// jobs BOB starts (Bob, 5 Nov: BOB starts jobs; no other session creates one), or the layer to open.
// view: openLayer's read, when the caller has it.
// merge false: the merge line is next work's (status prints it there, once).
export function layerLines(root, cfg, { slug, io = {}, view, merge = true } = {}) {
  const v = view || openLayer(root, cfg, { slug, io });
  const { n } = v;
  if (v.kind === 'stale') return [`layer flow: layer ${n}'s flow rows are an earlier tranche's (merged to main): a second tranche under the flow is not built; ask the coordinator`];
  if (v.kind === 'next') return [`layer flow: layer ${n} is next and not open: \`${P3} layer open ${n}\``];
  if (v.kind === 'done') return ['layer flow: every layer has merged'];
  const L = [`layer flow: layer ${n} open on ${layerBranch(n)}; ${stateCounts(v.states)}`];
  for (const s of v.states.filter((q) => q.state === 'rescheduled')) L.push(`- ${s.id} rescheduled: ${s.why}`);
  if (v.startable.length) L.push(`jobs to start (yours to start, BOB; the job cap counts), from \`${P3} layer jobs ${n}\`:`, ...v.startable.map((q) => `- ${q.cmd}`));
  if (v.ready && merge) L.push(`layer ${n} can merge: \`${P3} layer merge ${n}\``);
  return L;
}

// ---- layer open -----------------------------------------------------------------------------

export function layerOpen(root, n, { io = {}, log = console.log, by = 'bob' } = {}) {
  n = layerNum(n);
  const cfg = loadConfig(root);
  needLayerMode(cfg, 'layer open');
  const slug = io.slug || repoSlug(root);
  fetchBranch(root, cfg.tranche);
  fetchState(root, cfg.state_branch, { fresh: true });
  const tr = `refs/remotes/origin/${cfg.tranche}`;
  const layers = layersAt(root, cfg, tr);
  if (!layers.some((L) => L.n === n)) fail(`layer ${n} is not in ${cfg.layers_file} on ${cfg.tranche}`);
  // One layer at a time: every earlier layer closed, merged, or with nothing left in it; this one
  // not closed already; and no job of its modules still open into the tranche (the train's).
  const closed = closedLayers(root, cfg.state_branch, cfg);
  if (closed.has(n)) fail(`layer ${n} is closed already (${CLOSED_FILE}); open the next one`);
  for (const L of layers.filter((x) => x.n < n)) {
    const r = flowRows(root, cfg.state_branch, L.n);
    if (r.open && !r.merged) fail(`layer ${L.n} is open on ${layerBranch(L.n)} and has not merged; layer ${n} opens after it (${P3} layer merge ${L.n})`);
    if (!layerBehind(root, cfg, L, closed, tr)) fail(`layer ${L.n} is not closed: close it first (the train's layer close, or ${P3} layer open ${L.n})`);
  }
  const into = (io.openPRs || openPRs)(slug, cfg.tranche);
  if (into === null) fail(`GitHub unreadable: the open pull requests into ${cfg.tranche} are not known; nothing was opened`);
  const mine = new Set(layers.find((L) => L.n === n).mods);
  const ids = ledgerIds(root, tr);
  const held = into.filter((p) => mine.has(branchModule(p.head?.ref, ids)));
  if (held.length) fail(`layer ${n}'s module(s) have job PRs open into ${cfg.tranche}: ${held.map((p) => `#${p.number} (${p.head.ref})`).join(', ')}; those finish (or close) under the train before the layer opens`);
  const rows = flowRows(root, cfg.state_branch, n);
  if (staleFlow(root, rows)) fail(`layer ${n}'s flow rows and ${layerBranch(n)} are an earlier tranche's (its merge ${short(rows.merged.commit)} is on main): a second tranche under the flow is not built; ask the coordinator`);
  if (rows.merged) fail(`layer ${n} already merged into ${cfg.tranche} (${short(rows.merged.commit)})`);
  const b = layerBranch(n);
  fetchBranch(root, b, { allowFail: true });
  const have = git(['rev-parse', '-q', '--verify', layerRef(n)], { cwd: root, allowFail: true }).code === 0;
  const at = have ? rev(root, layerRef(n)) : rev(root, tr);
  if (!have) {
    const p = git(['push', '-q', 'origin', `${at}:refs/heads/${b}`], { cwd: root, allowFail: true });
    if (p.code !== 0) fail(`the push of ${b} failed (${p.stderr.trim()}); nothing recorded`);
    fetchBranch(root, b);
    log(`${b} cut from ${cfg.tranche} ${short(at)}`);
  } else log(`${b} is on origin at ${short(at)}`);
  if (!rows.open) writeRows(root, cfg.state_branch, `layer ${n} open on ${b}`, [[flowFile(n, 'open'), { row: 'open', layer: n, branch: b, tranche: cfg.tranche, from: at, at: now(), by }]]);
  const L = readLayer(root, cfg, n, { io, slug });
  const s = startable(L.states);
  log(`layer ${n}: ${L.mods.length} module(s); ${s.length} job(s) can start (the job cap: ${jobCap(cfg)} across the account). BOB starts them; no other session creates a job:`);
  for (const x of s) log(`  ${x.cmd}`);
  return { ok: true, branch: b, from: at, startable: s };
}

export function layerJobs(root, n, { io = {}, log = console.log } = {}) {
  n = layerNum(n);
  const cfg = loadConfig(root);
  needLayerMode(cfg, 'layer jobs');
  fetchLayer(root, cfg, n);
  const L = readLayer(root, cfg, n, { io, slug: io.slug || repoSlug(root) });
  const s = startable(L.states);
  log(s.length ? `layer ${n}: ${s.length} job(s) can start; BOB starts them (job start counts the cap):` : `layer ${n}: no job can start`);
  for (const x of s) log(`  ${x.cmd}`);
  return { ok: true, startable: s, states: L.states };
}

export function layerStatus(root, n, { io = {}, log = console.log } = {}) {
  n = layerNum(n);
  const cfg = loadConfig(root);
  needLayerMode(cfg, 'layer status');
  fetchLayer(root, cfg, n);
  const L = readLayer(root, cfg, n, { io, slug: io.slug || repoSlug(root) });
  for (const s of L.states) log(`${s.id}: ${s.state} (${s.why})`);
  const ready = mergeReady(L.states) && !L.prs.length;
  log(L.rows.merged ? `layer ${n} merged into ${cfg.tranche} at ${short(L.rows.merged.commit)}` : ready ? `layer ${n} can merge: ${P3} layer merge ${n}` : `layer ${n} cannot merge yet: ${L.states.filter((s) => !DONE.includes(s.state)).length} module(s) not complete${L.prs.length ? `, ${L.prs.length} PR(s) open into ${layerBranch(n)}` : ''}`);
  return { ok: true, states: L.states, ready };
}

// ---- layer publish --------------------------------------------------------------------------

// The files a job's branch changes against the layer, outside its module (ARC-2): none may be.
export function outsideFiles(root, entry, base, head) {
  const own = ownPaths(entry);
  return diffNames(root, base, head).filter((f) => !own.some((p) => underPath(f, p)));
}

// The publish's run, as a child process: `job complete` (the module's fast checks, never a suite: AUD-7; the receipt,
// the ready PR) in this checkout. { done: Promise<{ code }>, kill() }.
export function spawnComplete(root, id, args = []) {
  const tool = join(new URL('.', import.meta.url).pathname, '..', 'p3.mjs');
  const c = spawn(process.execPath, [tool, 'job', 'complete', id, ...args], { cwd: root, stdio: 'inherit', detached: true, env: { ...process.env, NODE_TEST_CONTEXT: '' } });
  const kill = () => { try { process.kill(-c.pid, 'SIGTERM'); } catch { try { c.kill('SIGTERM'); } catch { /* gone */ } } };
  // Its own process group, so a halt stops the suite's children too; and stopped with publish, so
  // an interrupted publish never leaves a job complete pushing beside the next one (cold review 6).
  const stop = () => kill();
  const sig = () => { kill(); process.exit(130); };
  process.once('exit', stop);
  process.once('SIGINT', sig);
  process.once('SIGTERM', sig);
  const off = () => { process.off('exit', stop); process.off('SIGINT', sig); process.off('SIGTERM', sig); process.off('SIGHUP', sig); };
  process.once('SIGHUP', sig);
  const done = new Promise((res) => { c.on('exit', (code, s2) => { off(); res({ code: code ?? (s2 ? 143 : 1) }); }); c.on('error', () => { off(); res({ code: 1 }); }); });
  return { done, kill };
}

// The reschedules that make a run on `testedOn` void: those for the module whose provider's land
// it does not hold.
export function voiding(root, sb, n, id, testedOn, { fetch = true } = {}) {
  if (fetch) { try { fetchState(root, sb, { fresh: true }); } catch { return []; } fetchBranch(root, layerBranch(n), { allowFail: true }); }
  return flowRows(root, sb, n).reschedules.filter((r) => r.user === id && hasCommit(root, r.provider_land) && !isAnc(root, r.provider_land, testedOn));
}

// The job's publish. Refused outside an open layer, with tracked changes, or with any file outside
// the module. Each round: job sync (the layer tip merged in), the ownership check, then the run.
// A reschedule arriving mid-run halts it (the child killed, a halt run row with the minutes lost)
// and the next round starts on the new tip; a run that ends while a reschedule is outstanding
// does not count either. At most `rounds` rounds.
export async function layerPublish(root, id, { push = true, every = 30000, rounds = 4, sync, complete, log = console.log, args = [], session = null } = {}) {
  const cfg0 = loadConfig(root);
  needLayerMode(cfg0, 'layer publish');
  const cfg = jobCfg(root, cfg0, id, { push });
  if (!cfg.layer) fail(`${id} is in no open layer (its layer's branch is not on origin, or the layer merged): publish needs an open layer/<n>`);
  const { n } = cfg.layer;
  const sb = cfg.state_branch;
  const lref = push ? layerRef(n) : `refs/heads/${layerBranch(n)}`;
  const doSync = sync || (async () => { const { jobSync } = await import('./job.mjs'); return jobSync(root, id, { push, log }); });
  const doComplete = complete || (() => spawnComplete(root, id, args));
  for (let round = 1; round <= rounds; round++) {
    const s = await doSync();
    if (s && s.ok === false) fail('job sync did not finish; nothing was published');
    const testedOn = rev(root, lref);
    const entry = entryAt(root, 'HEAD', id) || fail(`no ledger entry for ${id} at HEAD`);
    const out = outsideFiles(root, entry, git(['merge-base', 'HEAD', lref], { cwd: root }), 'HEAD');
    if (out.length) fail(`refused: the publish touches files outside ${id} (ARC-2): ${out.slice(0, 10).join(', ')}${out.length > 10 ? ` and ${out.length - 10} more` : ''}; nothing was published`);
    const started = now();
    const pre = voiding(root, sb, n, id, testedOn, { fetch: push });
    if (pre.length) fail(`${layerBranch(n)} at ${short(testedOn)} lacks ${pre.map((r) => `${r.provider}'s land ${short(r.provider_land)}`).join(', ')}: run publish again once origin's ${layerBranch(n)} holds it`);
    log(`layer ${n}, round ${round}: ${id} runs on ${layerBranch(n)} ${short(testedOn)}`);
    const c = doComplete();
    let halted = null;
    const timer = setInterval(() => {
      if (halted) return;
      const v = voiding(root, sb, n, id, testedOn, { fetch: push });
      if (v.length) { halted = v; c.kill(); }
    }, every);
    let code;
    try { ({ code } = await c.done); } finally { clearInterval(timer); }
    if (!halted) { const v = voiding(root, sb, n, id, testedOn, { fetch: push }); if (v.length) halted = v; }
    const ended = now();
    // One file per run, never two runs under one name (two in one second, the same round).
    const runName = `${safeName(id)}-${Date.parse(started)}-${round}-${randomUUID().slice(0, 8)}`;
    const base = { row: 'run', layer: n, module: id, round, started, ended, minutes: minutes(started, ended), tested_on: testedOn, ...(session ? { session } : {}) };
    if (halted) {
      // A killed run may leave the entry and metrics half written, and generated files built (its
      // own restore never ran): the tree was clean when the round began (job sync refuses a dirty
      // one), so every tracked file is put back to HEAD for the next round (cold review 6).
      git(['checkout', '-q', 'HEAD', '--', '.'], { cwd: root, allowFail: true });
      const keys = halted.map((r) => r.key);
      writeRows(root, sb, `layer ${n}: ${id}'s run halted by a reschedule`, [[flowFile(n, 'run', runName), { ...base, result: 'halted', exit: code, by: keys, minutes_lost: minutes(started, ended), at: ended }]]);
      log(`halted: ${halted.map((r) => `${r.provider} changed its interface (land ${short(r.provider_land)})`).join('; ')}; this run never counts; ${round < rounds ? 'starting again on the new layer tip' : 'no rounds left'}`);
      continue;
    }
    writeRows(root, sb, `layer ${n}: ${id}'s run ${code === 0 ? 'passed' : 'failed'}`, [[flowFile(n, 'run', runName), { ...base, result: code === 0 ? 'pass' : 'fail', exit: code, at: ended }]]);
    if (code !== 0) { log(`not published: the run failed (exit ${code}); fix it and run ${P3} layer publish ${id} again`); return { ok: false, round, code }; }
    log(`published: ${id}'s PR into ${layerBranch(n)} is ready; the gate on its tip decides the land (${P3} layer land <pr>, the merge tool's)`);
    return { ok: true, round, testedOn };
  }
  return { ok: false, halted: true, round: rounds };
}

// ---- layer land -----------------------------------------------------------------------------

export function mergeVia(slug, n, sha, title) {
  return import('./merge.mjs').then((m) => m.mergePR(slug, n, sha, { title }));
}

// The merge tool's land of a publish PR into its layer branch.
export async function layerLand(root, prn, { io = {}, log = console.log, by = 'bob' } = {}) {
  const cfg = loadConfig(root);
  needLayerMode(cfg, 'layer land');
  const slug = io.slug || repoSlug(root);
  const x = { getPR, checkRun, comments: ghComments, merge: (s, k, sha, title) => mergeVia(s, k, sha, title), ...io };
  const n0 = Number(prn);
  if (!Number.isInteger(n0) || n0 <= 0) fail(`layer land <pr>, a pull request number, not ${JSON.stringify(prn)}`);
  const pr = x.getPR(slug, n0) || fail(`pull request ${n0} not found`);
  const n = layerOfBranch(pr.base?.ref);
  if (n === null) fail(`pull request ${n0} is into ${pr.base?.ref}, not a layer branch: the train's merge lands it`);
  // A land GitHub merged but never recorded (its state write failed after the merge: cold review 7)
  // is recorded on a second run, from the merge commit: its reschedules are never lost.
  const recover = pr.merged === true && !!pr.merge_commit_sha;
  if (pr.state !== 'open' && !recover) fail(`pull request ${n0} is ${pr.merged ? 'merged' : pr.state}`);
  if (pr.draft && !recover) fail(`pull request ${n0} is a draft: the job publishes it (${P3} layer publish <id>)`);
  if (pr.head?.repo?.full_name && pr.head.repo.full_name !== slug) fail(`pull request ${n0} is not from a branch of ${slug}`);
  fetchLayer(root, cfg, n);
  const lref = layerRef(n);
  const rows = flowRows(root, cfg.state_branch, n);
  if (!rows.open) fail(`layer ${n} was not opened by ${P3} layer open ${n}`);
  if (rows.merged) fail(`layer ${n} already merged into ${cfg.tranche}`);
  const id = branchModule(pr.head?.ref, ledgerIds(root, lref)) || fail(`pull request ${n0} is from ${pr.head?.ref}, not a job branch`);
  if (layerOf(layersAt(root, cfg, lref), id) !== n) fail(`${id} is not a module of layer ${n}`);
  fetchBranch(root, pr.head.ref, { allowFail: true });
  const head = pr.head.sha;
  if (!hasCommit(root, head)) fail(`this clone does not hold ${short(head)}, the head of pull request ${n0}`);
  let before;
  let after;
  if (recover) {
    if (rows.lands.some((l) => l.pr === n0)) fail(`pull request ${n0} is merged and its land is recorded`);
    after = pr.merge_commit_sha;
    if (!hasCommit(root, after)) fail(`this clone does not hold ${short(after)}, pull request ${n0}'s merge`);
    before = git(['rev-parse', `${after}^1`], { cwd: root });
    log(`pull request ${n0} merged at ${short(after)} with no land recorded: recording it now`);
  } else {
  // The gate on the PR's tip, green: the publish's CI evidence (JOB-12's revert check included).
  const g = x.checkRun(slug, head, 'gate');
  if (g?.status !== 'completed' || g.conclusion !== 'success') fail(`the gate on ${short(head)} is ${g ? `${g.status}${g.conclusion ? ` ${g.conclusion}` : ''}` : 'not run'}: a publish lands only on a green gate on its tip`);
  const e = entryAt(root, head, id) || fail(`no ledger entry for ${id} at ${short(head)}`);
  before = rev(root, lref);
  const out = outsideFiles(root, e, git(['merge-base', before, head], { cwd: root }), head);
  if (out.length) fail(`refused: pull request ${n0} changes files outside ${id} (ARC-2): ${out.slice(0, 10).join(', ')}`);
  // A run that started before a provider's newest interface change never counts (Bob, 5 Nov).
  const late = outstanding(rows.reschedules, [], id, () => false).filter((r) => !isAnc(root, r.provider_land, head));
  if (late.length) fail(`refused: ${id}'s run on ${short(head)} started before ${late.map((r) => `${r.provider}'s interface change (land ${short(r.provider_land)})`).join(', ')}: it never counts; the job runs ${P3} layer publish ${id} again`);
  const r = await x.merge(slug, n0, head, landTitle(n0));
  if (!r?.merged && !r?.sha) fail(`GitHub did not merge pull request ${n0}: ${JSON.stringify(r).slice(0, 200)}`);
  fetchBranch(root, layerBranch(n));
  after = r.sha && hasCommit(root, r.sha) ? r.sha : rev(root, lref);
  }
  const ic = interfaceChange(root, cfg, id, before, after);
  const users = usersOf(root, cfg, id, after);
  const layers = layersAt(root, cfg, after);
  const same = users.filter((u) => layerOf(layers, u) === n);
  const later = users.filter((u) => { const k = layerOf(layers, u); return k === null || k > n; });
  const runs = gateRuns(x.comments(slug, n0)).filter((q) => q?.sha);
  const at = now();
  const land = { row: 'land', layer: n, module: id, pr: n0, head, before, merge: after, at, by, gate_runs: runs.length, interface: ic, users_rescheduled: ic.changed ? same : [], users_noticed: ic.changed ? later : [] };
  const files = [[flowFile(n, 'land', `${safeName(id)}-${n0}-${short(head)}`), land]];
  if (ic.changed) {
    for (const u of same) files.push([flowFile(n, 'reschedule', `${safeName(u)}-${safeName(id)}-${short(after)}`), { row: 'reschedule', layer: n, user: u, provider: id, provider_pr: n0, provider_land: after, at, key: `${u}<-${id}@${short(after)}`, why: interfaceText(ic), triggers: ic.triggers }]);
    if (later.length) {
      const key = noticeKey(id, n0);
      files.push([noticeFile(key), { row: 'notice', at, key, provider: id, ids: [], pr: n0, users: later, source: 1, ...(ic.exports ? { exports: ic.exports } : {}), layer_flow: { layer: n, provides: !!ic.provides } }]);
    }
  }
  // The notices this module owed (from earlier layers' providers) are answered by its land.
  try { for (const k of noticeRecords(root, cfg.state_branch).filter((q) => !q.withdrawn && q.open.includes(id))) files.push([answerFile(id, k.key), { row: 'answered', at, key: k.key, user: id, pr: n0, by: 'layer land' }]); } catch { /* none read: none answered */ }
  writeRows(root, cfg.state_branch, `layer ${n}: land PR ${n0} (${id})${ic.changed ? `, interface changed: ${same.length} rescheduled` : ''}`, files);
  log(`landed PR ${n0} (${id}) into ${layerBranch(n)} at ${short(after)}; interface: ${interfaceText(ic)}`);
  const msgs = [];
  if (ic.changed) {
    const open = (x.openPRs || openPRs)(slug, layerBranch(n)) || [];
    const ids = ledgerIds(root, lref);
    for (const u of same) {
      const p = open.find((q) => branchModule(q.head?.ref, ids) === u);
      const text = `layer ${n}: ${id} changed its interface (land ${short(after)}: ${interfaceText(ic)}). Halt any test run now; run \`${P3} layer publish ${u}\` again: it brings job/${u} up to ${layerBranch(n)} and its gate re-runs your suite against ${id}'s new version. A run started before this never counts.`;
      if (p) { msgs.push({ user: u, pr: p.number, text }); log(`BOB delivers to job ${u}'s session (PR ${p.number}), with send_message priority now: ${text}`); } else log(`${u}: no job open; it re-runs when it starts (${P3} layer jobs ${n} lists it)`);
    }
    if (later.length) log(`provider notice ${noticeKey(id, n0)} for ${later.length} user(s) in later layers: ${later.join(', ')}`);
  }
  return { ok: true, land, messages: msgs };
}

// ---- layer merge ----------------------------------------------------------------------------

export async function layerMerge(root, n, { io = {}, log = console.log, wait = true, by = 'bob' } = {}) {
  n = layerNum(n);
  const cfg = loadConfig(root);
  needLayerMode(cfg, 'layer merge');
  const slug = io.slug || repoSlug(root);
  fetchLayer(root, cfg, n);
  const L = readLayer(root, cfg, n, { io, slug });
  if (!L.rows.open) fail(`layer ${n} was not opened by ${P3} layer open ${n}`);
  if (L.rows.merged) fail(`layer ${n} already merged (${short(L.rows.merged.commit)})`);
  const not = L.states.filter((s) => !DONE.includes(s.state));
  if (not.length) fail(`layer ${n} cannot merge: ${not.map((s) => `${s.id} is ${s.state} (${s.why})`).join('; ')}`);
  if (L.prs.length) fail(`layer ${n} cannot merge: PR(s) ${L.prs.map((p) => p.number).join(', ')} still open into ${layerBranch(n)}`);
  const x = { findPR, createPR, checkRun, getPR, merge: (s, k, sha, title) => mergeVia(s, k, sha, title), ...io };
  const b = layerBranch(n);
  const head = rev(root, L.ref);
  // The layer's checks (INT-4; Bob, 5 Nov): what layer close runs, less the module suites (no test
  // run at close): each entry's checks, the generated rows built, and every committed generated
  // path regenerated, a finding when one differs. Red: nothing opened, nothing merged.
  const { layerChecks } = await import('./layer.mjs');
  const mods = L.states.map((s) => ({ id: s.id, blocked: s.state === 'deferred' ? s.why : null }));
  const lc = layerChecks(root, cfg, head, mods, { timeout: (cfg.suite_timeout_minutes || 20) * MINUTE, withSuites: false, log, ...(x.exec ? { exec: x.exec } : {}) });
  const all = [...lc.findings, ...lc.changed.map((f) => ({ check: 'generated', file: f, message: `${f} differs when regenerated on ${b} ${short(head)}` }))];
  // SLB-7 (Bob): at close only the layer's own checks hold it. A generated row's verify failure
  // blocks only when its paths, or a module it names, are the closing layer's; any other is
  // printed for the module it names, for BOB's found mark there, and the merge goes on.
  const judged = all.map((f) => ({ f, ...verifyOwner(f, { mods: L.mods, entries: [...L.entries.values()].filter(Boolean), ids: [...ledgerIds(root, L.ref)] }) }));
  for (const j of judged.filter((x) => !x.blocks)) log(`not this layer's: ${j.f.file}: ${j.f.message}; record it as a found mark${j.names.length ? ` on ${j.names.join(', ')}` : ''}: ${P3} found ${j.names[0] || '<module>'} "<the finding>" --from "layer ${n} merge"`);
  const red = judged.filter((x) => x.blocks).map((x) => x.f);
  if (red.length) {
    for (const f of red) log(`${f.check}: ${f.file}: ${f.message}`);
    fail(`layer ${n} cannot merge: the layer checks found ${red.length} finding(s) on ${b} ${short(head)}; no module suite ran`);
  }
  log(`layer ${n}: the layer checks passed on ${short(head)} (no module suite runs at the merge)`);
  let pr = x.findPR(slug, b);
  if (pr && pr.base?.ref !== cfg.tranche) fail(`the open pull request from ${b} (#${pr.number}) is into ${pr.base?.ref}, not ${cfg.tranche}`);
  if (!pr) pr = x.createPR(slug, { head: b, base: cfg.tranche, title: `layer ${n}`, body: layerBody(n, L), draft: false });
  log(`layer ${n}: PR ${pr.number} ${b} into ${cfg.tranche}`);
  // No suite runs at the close (Bob, 5 Nov); the required gate check is the layer trigger, which
  // reads each module's evidence and runs nothing.
  const g = wait ? await waitGate(x, slug, pr.number, head) : x.checkRun(slug, head, 'gate');
  if (g?.status !== 'completed' || g.conclusion !== 'success') fail(`the gate on ${b} ${short(head)} is ${g ? `${g.status} ${g.conclusion || ''}`.trim() : 'not run'}; the layer merges on a green layer gate`);
  const r = await x.merge(slug, pr.number, head, `Merge layer ${n} into ${cfg.tranche}`);
  if (!r?.merged && !r?.sha) fail(`GitHub did not merge pull request ${pr.number}: ${JSON.stringify(r).slice(0, 200)}`);
  const at = now();
  const deferred = Object.fromEntries(L.states.filter((s) => s.state === 'deferred' || s.marks.length).map((s) => [s.id, s.state === 'deferred' ? { reason: s.why, marks: s.marks } : s.marks]));
  const merged = { row: 'merged', layer: n, pr: pr.number, head, commit: r.sha || null, tranche: cfg.tranche, at, by, opened: L.rows.open.at, hours: Math.round(((Date.parse(at) - Date.parse(L.rows.open.at)) / 3600000) * 100) / 100 };
  // The close row status reads (layers/closed.jsonl), so the next layer opens: no layer checks ran.
  const closed = { row: 'closed', layer: n, tranche: cfg.tranche, commit: r.sha || head, at, deferred, suites: [], generated_changed: [], by: 'layer merge', strategy: 'layer' };
  writeState(root, cfg.state_branch, `layer ${n} merged into ${cfg.tranche}`, (w) => {
    addFiles(w, [[flowFile(n, 'merged'), merged]]);
    const p = join(w, CLOSED_FILE);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, (existsSync(p) ? readFileSyncSafe(p) : '') + JSON.stringify(closed) + '\n');
    return {};
  });
  log(`layer ${n} merged into ${cfg.tranche}${r.sha ? ` at ${short(r.sha)}` : ''}, ${merged.hours} h after it opened; the next layer opens from the new tranche: ${P3} layer open ${n + 1}`);
  return { ok: true, merged, closed };
}
const readFileSyncSafe = (p) => { try { return readFileSync(p, 'utf8'); } catch { return ''; } };
// Whether a layer-check finding is the closing layer's: every finding is, except a generated
// row's verify failure whose paths no layer module owns and whose message names no layer module.
// names: the other modules its message names (whole ids).
export function verifyOwner(f, { mods, entries, ids }) {
  const named = (id) => new RegExp(`(^|[^\\w-])${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\w-]|$)`).test(String(f.message || ''));
  const names = ids.filter((id) => !mods.includes(id) && named(id)).sort();
  if (f.check !== 'generated' || !/ failed \(exit [^)]*\) after (regenerating|building)/.test(String(f.message || ''))) return { blocks: true, names };
  const owned = entries.filter((e) => mods.includes(e.id)).some((e) => ownPaths(e).some((p) => underPath(f.file, p)));
  return { blocks: owned || mods.some(named), names };
}
async function waitGate(x, slug, prn, head) {
  if (x.waitForGate) return x.waitForGate(slug, head, { pr: () => x.getPR(slug, prn) });
  const { waitForGate } = await import('./merge.mjs');
  return waitForGate(slug, head, { pr: () => x.getPR(slug, prn) });
}
const layerBody = (n, L) => [`Layer ${n} of the shared layer branch: every module complete or deferred, no reschedule outstanding.`, '', ...L.states.map((s) => `- ${s.id}: ${s.state} (${s.why})`), '', 'No suite runs here (Bob, 5 Nov): each module passed its own gate on its publish against its providers\' current versions; the layer gate checks that evidence.'].join('\n');

// ---- the gate's layer trigger ---------------------------------------------------------------

// For a pull request from layer/<n> into the tranche: each module whose files it changes is
// covered by its last land on the layer branch, a merge of its job's PR into layer/<n> whose head
// had a verified green gate run of that module's suite, and that head held every interface-changing
// land of each provider it uses in the layer. Anything else is a finding: nothing is re-run.
export function layerCover(root, cfg, { head, mb, branch, changed, entries, slug, io }) {
  const findings = [];
  const covered = [];
  const inMod = (e, f) => ownPaths(e).some((p) => underPath(f, p));
  // Generated paths are the layer checks' at the merge (regenerated there), not a module's land's.
  const gen = generatedRows(cfg).rows;
  const need = changed.filter((f) => !isRecordOrLane(cfg, f, entries) && !isGenerated(gen, f));
  const chain = git(['rev-list', '--first-parent', head, '--not', mb], { cwd: root }).split('\n').filter(Boolean);
  const parents = (c) => git(['rev-list', '--parents', '-n', '1', c], { cwd: root }).split(' ').slice(1);
  const landOf = new Map(); // commit -> { pr, id, head } | { why }
  const judge = (c) => {
    if (landOf.has(c)) return landOf.get(c);
    const no = (why) => { const v = { why }; landOf.set(c, v); return v; };
    const k = Number(git(['log', '-1', '--format=%s', c], { cwd: root }).match(LAND_TITLE)?.[1]);
    if (!k) return no('is not a land of a publish PR');
    const p = parents(c);
    if (p.length !== 2) return no(`names PR ${k} but is not a merge of two parents`);
    const pr = io.getPR(slug, k);
    const id = branchModule(pr?.head?.ref, new Set(entries.map((e) => e.id)));
    if (!pr?.merged || pr.merge_commit_sha !== c || pr.base?.ref !== branch || !id || pr.head.sha !== p[1]) return no(`is not GitHub's merge of job PR ${k} into ${branch}`);
    const runs = gateRuns(io.comments(slug, k));
    const ctx = { pr: k, baseRef: branch, merged: { branch: pr.head.ref } };
    // The newest run on the head, as jobMerge reads it: green, verified, the module's whole suite
    // (not a run narrowed to the tests that read a requirements file).
    const row = runs.filter((r) => r.sha === p[1]).pop();
    const whole = (r) => r?.ok && r.trigger === 'code' && r.suite === 'pass' && Array.isArray(r.scope) && r.scope.includes(id) && !(Array.isArray(r.requirements_only) && r.requirements_only.some((x) => x?.module === id));
    // A records-since-green row (the PR edited, the layer tip unchanged) stands on the run it names,
    // as jobMerge follows it (confirming review N3).
    const tested = !row?.ok || !io.verify(slug, row, ctx) ? null
      : row.trigger === 'record-since-green' ? runs.filter((r) => r.sha === row.after).reverse().find((r) => whole(r) && isAnc(root, r.sha, p[1]) && io.verify(slug, r, ctx)) || null
        : whole(row) ? row : null;
    if (!tested) return no(`is PR ${k}'s land, but the newest gate run on its head ${short(p[1])} is ${row ? 'not a verified green run of the whole suite' : 'missing'}`);
    const v = { pr: k, id, head: p[1], parent: p[0] };
    landOf.set(c, v);
    return v;
  };
  const byId = new Map(entries.map((e) => [e.id, e]));
  // Its providers as the modules file names them (notice.mjs usersOf's source), else the entry's own.
  const named = new Map((readModules(root, cfg, head) || []).filter((m) => m?.id).map((m) => [m.id, m.uses || []]));
  const usesOf = (e) => named.get(e.id) || e.uses || [];
  const lands = chain.map((c) => ({ c, v: judge(c) })).filter((x) => x.v.id);
  // Every module of the layer, and any other whose files changed: a user with no file of its own
  // changed still owes a green run against each provider's interface change (cold review 1).
  const n = Number(String(branch).match(/(\d+)$/)?.[1]);
  const inLayer = new Set(layersAt(root, cfg, head).find((L) => L.n === n)?.mods || []);
  for (const e of entries) {
    const fs = need.filter((f) => inMod(e, f));
    if (!fs.length && !inLayer.has(e.id)) continue;
    // A BLOCKED module that changed nothing on the layer is deferred, as layer status counts it,
    // and holds nothing (confirming review N2); one whose code is on the layer is judged as any.
    if (!fs.length && e.status?.state === 'BLOCKED') continue;
    const last = lands.find((x) => x.v.id === e.id) || null; // newest first
    if (fs.length && !last) { for (const f of fs) findings.push({ check: 'layer', file: f, line: 1, message: `${e.id} changed with no land of its publish on ${branch}` }); continue; }
    const stray = last ? fs.filter((f) => chain.slice(0, chain.indexOf(last.c)).some((c) => diffNames(root, parents(c)[0], c).includes(f))) : [];
    if (stray.length) { for (const f of stray) findings.push({ check: 'layer', file: f, line: 1, message: `${f} changed on ${branch} after ${e.id}'s last land (PR ${last.v.pr}) by a commit that is not its land` }); continue; }
    // Each provider in the layer: its interface-changing lands are held by this module's last green head.
    const late = [];
    for (const p of usesOf(e).filter((u) => byId.has(u) && u !== e.id)) {
      for (const pl of lands.filter((x) => x.v.id === p && !(last && isAnc(root, x.c, last.v.head)))) {
        if (interfaceChange(root, cfg, p, pl.v.parent, pl.c).changed) late.push(`${p} (PR ${pl.v.pr}, ${short(pl.c)})`);
      }
    }
    if (late.length) findings.push({ check: 'layer', file: entryFile(e.id), line: 1, message: `${e.id}'s ${last ? `last green run (PR ${last.v.pr}, ${short(last.v.head)})` : 'work (no land on the layer)'} did not hold the interface change of ${late.join(', ')}: it never counts; ${e.id} re-runs and publishes again` });
    else if (last) covered.push({ id: e.id, pr: last.v.pr, merge: last.c });
  }
  const own = new Set(entries.flatMap((e) => need.filter((f) => inMod(e, f))));
  for (const f of need.filter((x) => !own.has(x))) findings.push({ check: 'layer', file: f, line: 1, message: `${f} is in no module: a plain change goes to ${cfg.tranche} between layers, not onto ${branch}` });
  return { findings, covered };
}

// ---- layer report (the trial's measures) ----------------------------------------------------

// How often a reschedule changed its user's result: the user's last finished run (pass or fail)
// before the reschedule against its first finished run after it, on a tip holding the provider's land.
export function resultChanges(reschedules, runs, anc = () => true) {
  const out = { changed: 0, unchanged: 0, unknown: 0, rows: [] };
  for (const r of reschedules) {
    const mine = runs.filter((x) => x.module === r.user && (x.result === 'pass' || x.result === 'fail'));
    const prev = mine.filter((x) => x.ended <= r.at).at(-1);
    const next = mine.find((x) => x.started >= r.at && anc(r.provider_land, x.tested_on));
    const v = !prev || !next ? 'unknown' : prev.result === next.result ? 'unchanged' : 'changed';
    out[v]++;
    out.rows.push({ key: r.key, user: r.user, provider: r.provider, before: prev?.result ?? null, after: next?.result ?? null, verdict: v });
  }
  return out;
}

export function trialMeasures(rows, { anc = () => true } = {}) {
  const mods = new Set([...rows.runs.map((r) => r.module), ...rows.lands.map((l) => l.module), ...rows.reschedules.map((r) => r.user)]);
  const per = [...mods].sort().map((id) => {
    const runs = rows.runs.filter((r) => r.module === id);
    return {
      id, runs: runs.length, pass: runs.filter((r) => r.result === 'pass').length, fail: runs.filter((r) => r.result === 'fail').length,
      halted: runs.filter((r) => r.result === 'halted').length, lands: rows.lands.filter((l) => l.module === id).length,
      gate_runs: rows.lands.filter((l) => l.module === id).reduce((s, l) => s + (l.gate_runs || 0), 0),
      reschedules: rows.reschedules.filter((r) => r.user === id).length,
    };
  });
  const halted = rows.runs.filter((r) => r.result === 'halted');
  const hours = rows.open && rows.merged ? Math.round(((Date.parse(rows.merged.at) - Date.parse(rows.open.at)) / 3600000) * 100) / 100 : null;
  return {
    modules: per.length, hours_open_to_merged: hours ?? 'not merged',
    gate_runs: per.reduce((s, x) => s + x.gate_runs, 0), lands: rows.lands.length,
    interface_changes: rows.lands.filter((l) => l.interface?.changed).length,
    reschedules: rows.reschedules.length,
    // Which trigger fired, per reschedule (Bob, 5 Nov): exports, Provides text, or a Provides test.
    reschedule_triggers: Object.fromEntries(['exports', 'provides-text', 'provides-test', 'exports-unread'].map((k) => [k, rows.reschedules.filter((r) => (r.triggers || []).includes(k)).length])),
    reschedule_changed_result: resultChanges(rows.reschedules, rows.runs, anc),
    halted_runs: halted.length, minutes_lost_to_halts: Math.round(halted.reduce((s, r) => s + (r.minutes_lost || 0), 0) * 10) / 10,
    per_module: per,
  };
}

export function layerReport(root, n, { log = console.log, toolFrom = null, toolTo = 'HEAD', toolRoot = null } = {}) {
  n = layerNum(n);
  const cfg = loadConfig(root);
  fetchState(root, cfg.state_branch, { fresh: true });
  fetchBranch(root, layerBranch(n), { allowFail: true });
  const rows = flowRows(root, cfg.state_branch, n);
  const m = trialMeasures(rows, { anc: (a, b) => isAnc(root, a, b) });
  if (toolFrom) {
    const st = git(['diff', '--shortstat', toolFrom, toolTo, '--', 'tool/'], { cwd: toolRoot || root, allowFail: true }).stdout.trim();
    const ins = Number(st.match(/(\d+) insertion/)?.[1] || 0);
    const del = Number(st.match(/(\d+) deletion/)?.[1] || 0);
    m.tool_lines = { from: toolFrom, to: toolTo, added: ins, removed: del };
  }
  const c = m.reschedule_changed_result;
  log(`layer ${n}: ${m.modules} module(s); open to merged ${m.hours_open_to_merged}${typeof m.hours_open_to_merged === 'number' ? ' h' : ''}; ${m.gate_runs} gate run(s) over ${m.lands} land(s); ${m.reschedules} reschedule(s) from ${m.interface_changes} interface change(s); a reschedule changed its user's result ${c.changed} time(s) (unchanged ${c.unchanged}, unknown ${c.unknown}); ${m.halted_runs} run(s) halted, ${m.minutes_lost_to_halts} min lost${m.tool_lines ? `; tool lines +${m.tool_lines.added} -${m.tool_lines.removed}` : ''}`);
  log('the baseline: the same layer\'s history under the serial train (merge train report, and the merge rows on the state branch)');
  log(JSON.stringify(m, null, 2));
  return { ok: true, measures: m };
}
