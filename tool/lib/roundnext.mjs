// round next (C46; Bob, 9 Nov: "Let's fix as many of them as we can", the causes of slow progress):
// a round opened, or carried on, by one command. On 8-9 Nov BOB opened round 2 by hand over many
// turns: each walk finding recorded (`found ... --from "internal walk ..." [--covers n]`, owed
// reopens per C44), status --role bob read for holds, `layer open <n>`, `layer jobs <n>`, then each
// `job start ... --reopen ...`; each step waited on a turn, and one hid a cycle (C44).
//
// From the latest round walk (rounds.mjs deployRowsOf), in one run: the walk's findings grouped by
// module, one entry per distinct flaw with its --covers count, the one-line text from the walk's
// own failure records (BOB may give a file of `<module>: <text>` lines instead); each recorded as
// `found` records it (an owed reopen on the state branch for a module whose test pins its
// requirement ids, else a found mark, all of a run's marks in one plain pull request merged by the
// merge tool); the PD-16 set-aside (findingsOf, round: true: the live arm's findings hold no round
// once its internal walk found flaws); the round's lowest layer opened (layer open); and the
// `job start` commands of its jobs printed (a start needs create_session: the tool prints them, it
// starts no session). The same command opens a round's next layer once one merges (the round's
// pass over the map), lists the open layer's jobs, names the round's walk when every layer merged,
// and names the release path after a clean walk. Idempotent: what is recorded is skipped, an open
// pull request of its marks is merged, an open layer's jobs are listed. A dry run by default;
// --apply does it.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { LEDGER_DIR } from './ledger.mjs';
import { addFound, found, foundFile, foundLine, foundMarks, moduleFiles, nextFound, pinnedIds, reopenKey } from './found.mjs';
import { directMode, layerOf, layerName, layersAt, roundLayerName } from './layerbase.mjs';
import { directJobs, directRoundsAt } from './direct.mjs';
import { flowRows, layerJobs, layerOpen, needLayerMode, nextRound } from './layerflow.mjs';
import { deployRowsOf, findingsOf, internalClean, owedReopens, releaseNext, roundState, runSource, unplaced, walkHold } from './rounds.mjs';
import { createPR, editPR, getPR, openPRs } from './github.mjs';
import { mergePlain } from './merge.mjs';
import { fetchState, readState } from './state.mjs';
import { fail, fetchBranch, git, loadConfig, repoSlug, withTemp } from './util.mjs';

const P3 = 'node .process/tool/p3.mjs';
const MODULE = /^[a-z0-9][a-z0-9-]*$/;
export const ROUND_NEXT = `${P3} round next`;
// The plain pull request's --no-review reason: found marks only, as `found` prints it.
const NO_REVIEW = 'work found elsewhere: found marks only, no code (round next)';

// One line of text, as a found mark can carry it: no control characters, no mark of its own (found.mjs clean).
export const oneLine = (s) => String(s ?? '').replace(/[\x00-\x1f\x7f]+/g, ' ').replace(/\s+/g, ' ').replace(/\*\*/g, '').replace(/not\s*yet\s*met/gi, 'not met').slice(0, 200).trim();

// Whether the run's findings are its internal walk's (PD-16, C43): a round walk is its internal walk
// alone; a deploy dev run's internal walk that found flaws sets its live arm aside.
export const internalRun = (row) => !!row && (row.row === 'round-walk' || (!!row.internal_walk && !internalClean(row)));
// The --from a run's findings take, as walkHold names it (its source names the run: findingsOf).
export const fromOf = (row) => `${internalRun(row) ? 'internal walk' : 'walk'} ${runSource(row)}`;

// The run's failure records, from its reports stored on the state branch (the internal walk's where
// its findings are the run's, else the walk's). { failures: [...], read: n reports read, unread: [...] }.
export function walkFailures(root, cfg, row) {
  const part = internalRun(row) ? row.internal_walk : row.walk;
  const reports = (part?.reports || []).filter((r) => typeof r?.stored === 'string' && /\.json$/.test(r.stored) && !/^not /.test(r.stored));
  const failures = [];
  const unread = [];
  let read = 0;
  for (const r of reports) {
    let j = null;
    try { j = JSON.parse(readState(root, cfg.state_branch, r.stored) || 'null'); } catch { j = null; }
    if (!j || typeof j !== 'object') { unread.push(r.stored); continue; }
    read++;
    if (Array.isArray(j.failures)) failures.push(...j.failures);
  }
  return { failures, read, unread };
}

// A failure's module, its distinct flaw and its one-line text, as the walker wrote them: `module`
// (or `owner`), `flaw` (else `kind`) and `finding` / `summary` / `message` / `title` (else its kind
// and detail).
const modOf = (f) => { const m = f && typeof f === 'object' ? (f.module ?? f.owner) : null; return typeof m === 'string' && MODULE.test(m) ? m : null; };
const textOf = (f) => {
  if (!f || typeof f !== 'object') return 'a walk failure';
  const said = f.finding ?? f.summary ?? f.message ?? f.title;
  const t = oneLine(said ?? [f.kind, f.detail].filter((x) => x !== undefined && x !== null && x !== '').join(': '));
  return t || 'a walk failure';
};
const flawOf = (f) => String((f && typeof f === 'object' && (f.flaw ?? f.kind)) ?? textOf(f));

// The walk's findings, one entry per distinct flaw: { module, text, covers }; a failure that names
// no module is an entry with module null (BOB names it, in the file).
export function walkEntries(failures) {
  const by = new Map();
  for (const f of failures) {
    const module = modOf(f);
    const k = `${module}\0${flawOf(f)}`;
    const e = by.get(k);
    if (e) e.covers++;
    else by.set(k, { module, text: textOf(f), covers: 1 });
  }
  return sameText([...by.values()]);
}
// Entries of one module with the same text are one finding (found keys an owe by module and text,
// and a second mark of the same words is the same mark): their counts summed.
export function sameText(entries) {
  const out = [];
  for (const e of entries) {
    const had = out.find((x) => x.module === e.module && x.text === e.text);
    if (had) had.covers += e.covers;
    else out.push({ ...e });
  }
  return out;
}

// BOB's file: one finding a line, `<module>: <text>`, optionally ending `, covers <n>`; blank lines
// and lines starting with # are skipped.
export function parseFindings(text) {
  const out = [];
  String(text).split('\n').forEach((l, i) => {
    const s = l.trim();
    if (!s || s.startsWith('#')) return;
    const m = s.match(/^([a-z0-9][a-z0-9-]*)\s*:\s*(.+)$/);
    if (!m) fail(`--findings line ${i + 1}: \`<module>: <text>\` (a module id, a colon, the finding), not ${JSON.stringify(s.slice(0, 80))}`);
    let t = m[2].trim();
    let covers = null;
    const c = t.match(/,\s*covers (\d+)\s*$/);
    if (c) { covers = Number(c[1]); t = t.slice(0, c.index).trim(); if (covers < 1) fail(`--findings line ${i + 1}: covers <n> is a whole number from 1`); }
    if (/\*\*[RF][\w.-]*\*\*|not yet met/i.test(t)) fail(`--findings line ${i + 1}: the finding must not hold a mark of its own (**R..**, **F..** or "not yet met")`);
    if (/[\x00-\x1f]/.test(t) || !t) fail(`--findings line ${i + 1}: the finding is one line of text`);
    out.push({ module: m[1], text: t.replace(/\s+/g, ' '), covers, line: i + 1 });
  });
  return out;
}

// The walk's entries with BOB's file over them: a module the file names takes its lines in place of
// the walk's entries for it, a line with no covers sharing what the walk counted for that module
// (the first such line takes the rest); a module the walk did not name counts 1 a line unless it
// says. With a file, the walk's entries that name no module are BOB's to place in it.
export function withFile(entries, lines) {
  if (!lines) return entries;
  const named = new Set(lines.map((l) => l.module));
  const counted = (id) => entries.filter((e) => e.module === id).reduce((a, e) => a + e.covers, 0);
  const out = entries.filter((e) => e.module && !named.has(e.module));
  for (const id of named) {
    const mine = lines.filter((l) => l.module === id);
    const said = mine.reduce((a, l) => a + (l.covers || 0), 0);
    const bare = mine.filter((l) => !l.covers);
    const rest = Math.max(bare.length, counted(id) - said);
    mine.forEach((l) => out.push({ module: id, text: l.text, covers: l.covers || (l === bare[0] ? rest - (bare.length - 1) : 1), file: true }));
  }
  return sameText(out);
}

// How each entry is recorded, and whether it is: an owed reopen (its module's test pins its
// requirement ids: found.mjs) keyed as found keys it, or a found mark on the tranche whose text and
// source match; `pending` when an open pull request of round next's carries the mark.
function routeOf(root, cfg, ref, e, from, { owed, prHeads }) {
  const m = moduleFiles(root, cfg, e.module, ref);
  if (!m.known) return { ...e, route: 'unknown' };
  let entry = null;
  try { entry = JSON.parse(m.read(`${LEDGER_DIR}/${e.module}.json`)); } catch { entry = null; }
  const pin = pinnedIds(root, { entry, req: m.req, reqText: m.reqText, ref });
  if (pin) return { ...e, route: 'owe', pin, recorded: owed.has(reopenKey(e.module, e.text, from)) };
  const file = m.reqText !== null ? m.req : m.found;
  const same = (t) => foundMarks(t).some((k) => k.finding === e.text && (k.source === from || k.source.startsWith(`${from}, covers `)));
  const at = (r) => { const x = git(['show', `${r}:${file}`], { cwd: root, allowFail: true }); return x.code === 0 ? x.stdout : ''; };
  return { ...e, route: 'mark', file, title: `Found work for ${e.module}`, recorded: same(m.reqText !== null ? m.reqText : m.foundText), pending: prHeads.some((h) => same(at(h))) };
}

// The round's plan at the tranche: where the rounds stand (roundState), the latest walk, its
// findings and how many are recorded (PD-16 applied), and its entries with their routes.
export function roundPlan(root, cfg, { findingsFile = null, io = {} } = {}) {
  const tr = `refs/remotes/origin/${cfg.tranche}`;
  const layers = layersAt(root, cfg, tr);
  const direct = directMode(cfg);
  if (!layers.length && !direct) fail(`no layer map (${cfg.layers_file}) on ${cfg.tranche}: rounds run over the map's layers (BD-R1)`);
  // PD-25: under the direct flow the rounds read the modules, not the layers.
  const rs = direct ? directRoundsAt(root, cfg, { io, slug: io.slug }) : nextRound(root, cfg, layers, tr);
  const last = deployRowsOf(root, cfg).at(-1) || null;
  const w = findingsOf(root, cfg, tr, last, { round: true });
  const plan = { rs, last, w, layers, tr, entries: [], hold: null, loose: unplaced(root, tr) };
  // The findings are a new round's (rounds.mjs: 'new' or 'clean' after the walk), and only then.
  if (!last || !['new', 'clean'].includes(rs.state)) return plan;
  plan.hold = walkHold(w);
  plan.from = fromOf(last);
  const read = walkFailures(root, cfg, last);
  plan.read = read;
  const lines = findingsFile ? parseFindings(readFileSync(findingsFile, 'utf8')) : null;
  const entries = withFile(walkEntries(read.failures), lines);
  const owed = new Set(owedReopens(root, cfg).map((x) => x.key));
  const prs = (io.openPRs || openPRs)(io.slug || repoSlug(root), cfg.tranche) || [];
  const prHeads = prs.filter((p) => String(p.head?.ref || '').startsWith(`found/round-`)).map((p) => {
    fetchBranch(root, p.head.ref, { allowFail: true });
    return `refs/remotes/origin/${p.head.ref}`;
  });
  // The round these findings open: the next after the one the walk ended.
  plan.opens = rs.state === 'new' ? rs.round : rs.round + 1;
  plan.branch = `found/round-${plan.opens}-${last.slug}`;
  plan.prs = prs.filter((p) => isMine(plan.branch, p.head?.ref));
  plan.entries = entries.map((e) => (e.module ? routeOf(root, cfg, tr, e, plan.from, { owed, prHeads }) : { ...e, route: 'no-module' }));
  return plan;
}

// The round's first layer, as it would open with the entries recorded: roundState over the flawed
// modules now and the modules of the entries not yet recorded.
function predicted(root, cfg, plan) {
  const { rs } = plan;
  if (rs.state === 'new') return rs.next;
  const flawed = new Map();
  for (const e of plan.entries.filter((x) => x.module && !x.recorded)) flawed.set(e.module, [...(flawed.get(e.module) || []), { id: '?', module: e.module, what: e.text }]);
  if (!flawed.size) return null;
  const s = roundState(root, cfg, plan.tr, { layers: plan.layers, flows: (k) => flowRows(root, cfg.state_branch, k), lastWalk: plan.last, flawed });
  return s.next || null;
}

// The marks' branch of this run: found/round-<n>-<slug>, or one of its -<k> successors (never
// another run's whose slug merely begins the same: internal-l3 is not internal-l30).
const isMine = (base, ref) => typeof ref === 'string' && (ref === base || (ref.startsWith(`${base}-`) && /^\d+$/.test(ref.slice(base.length + 1))));
const covered = (es) => es.reduce((a, e) => a + e.covers, 0);
const mapLayer = (plan, id) => layerOf(plan.layers.filter((L) => !L.completion && !L.round), id);

// round next [--apply] [--findings <file>]: see the head of this file.
export function roundNext(root, { apply = false, findingsFile = null, io = {}, log = console.log, by = 'bob' } = {}) {
  const cfg = loadConfig(root);
  if (!directMode(cfg)) needLayerMode(cfg, 'round next');
  if (!io.offline) {
    fetchBranch(root, cfg.tranche);
    fetchState(root, cfg.state_branch, { fresh: true });
  }
  let plan0 = cfg.plan;
  try { plan0 = loadConfig(root, `refs/remotes/origin/${cfg.tranche}`).plan; } catch { plan0 = cfg.plan; }
  if (plan0 === 'close') fail(`the plan is close on ${cfg.tranche}: the current round is the last, and no round opens (BD-R1); \`${P3} status --role bob\` names the close`);
  const slug = io.slug || repoSlug(root);
  const lio = { ...io, slug };
  let plan = roundPlan(root, cfg, { findingsFile, io: lio });
  const { rs } = plan;
  const dry = apply ? '' : ' (dry run: `round next --apply` does it)';
  // A layer of the round is open: its jobs.
  if (rs.state === 'layer') {
    log(`${layerName(rs.layer, rs.layer.n, cfg.tranche)} is open; its jobs, each started by BOB (create_session, then the command):`);
    const j = layerJobs(root, rs.layer.n, { io: lio, log });
    return { ok: true, state: 'layer', layer: rs.layer.n, startable: j.startable };
  }
  // PD-25: a round open under the direct flow: its ready jobs, all at once up to the slot cap.
  if (rs.state === 'open') {
    log(`round ${rs.round} is open under the direct flow; its ready jobs, each started by BOB (create_session, then the command):`);
    const j = directJobs(root, { io: lio, log });
    return { ok: true, state: 'open', round: rs.round, startable: j.startable };
  }
  if (rs.state === 'walk') {
    log(`every layer of round ${rs.round} has merged: its walk ends it, the round-close run (the act that closed it starts it; else \`${P3} walk round\` where an internal walk is configured, \`${P3} deploy dev\` where not); then \`${ROUND_NEXT}\``);
    return { ok: true, state: 'walk', round: rs.round };
  }
  // The round's next layer (a round layer merged and one past it is owed): opened, its jobs listed.
  if (rs.state === 'next') return openNext(root, rs.next, { apply, io: lio, log, by, dry, what: `round ${rs.round}'s next layer`, tranche: cfg.tranche });
  // After a walk: its findings, then the next round's first layer; a clean one, the release path.
  const { w, last } = plan;
  const internal = internalRun(last);
  const failing = w.failing;
  const aside = w.set_aside ? `; the live arm's ${w.set_aside} set aside: its internal walk found flaws, so they hold no round (PD-16)` : '';
  log(`round ${rs.state === 'new' ? rs.round - 1 : rs.round} ended at the ${internal ? 'internal walk' : 'walk'} ${runSource(last)}: ${failing} finding(s), ${w.recorded} recorded${aside}${dry}`);
  // Every finding recorded (by hand, or a known gap on Bob's word) and none a flaw: the release path.
  if (!plan.hold && rs.state === 'clean' && !plan.loose.length) return releasePath(root, cfg, plan, { log });
  if (plan.read?.unread?.length) log(`note: report(s) not read from ${cfg.state_branch}: ${plan.read.unread.join(', ')}`);
  printEntries(plan, { log });
  const need = Math.max(0, failing - w.recorded);
  // Nothing owed when every finding counts as recorded (some by hand, under other words): none again.
  const todo = need > 0 ? plan.entries.filter((e) => !e.recorded) : [];
  const loose = todo.filter((e) => e.route === 'no-module' || e.route === 'unknown');
  const short = need > 0 && covered(todo) < need;
  // Findings of this run recorded under other words (by hand, or from another --findings file):
  // which entries they stand for is not known, so none is recorded again until BOB says (cold review A).
  const others = w.recorded - covered(plan.entries.filter((e) => e.recorded));
  if (need > 0 && others > 0 && todo.length) {
    const why = `${others} finding(s) of this walk are recorded under other words (by hand, or from another findings file), and which of the entries below they stand for is not known: give the rest in a file of \`<module>: <text>[, covers <n>]\` lines, the ${need} not yet recorded (\`${ROUND_NEXT} --findings <file>\`), or record them with \`${P3} found\``;
    if (apply) fail(`${why}; nothing was recorded`);
    log(why);
    return { ok: true, state: 'findings', plan };
  }
  const nx = directMode(cfg) ? null : predicted(root, cfg, plan);
  if (nx) log(`then: ${roundLayerName(nx.round, nx.of, nx.n, cfg.tranche)} opens for ${nx.mods.join(', ')}, one layer for every flawed module (PD-24); ${apply ? 'its jobs follow' : 'its `job start` commands are printed once it opens'}`);
  if (loose.length) {
    const why = `${loose.length} finding(s) name no known module (${loose.map((e) => `${e.module ? `${e.module}: ` : ''}${e.text}`).slice(0, 5).join('; ')}): give their modules in a file of \`<module>: <text>\` lines (\`, covers <n>\` at a line's end for one flaw behind n failures), then \`${ROUND_NEXT} --findings <file>\``;
    if (apply) fail(`${why}; nothing was recorded`);
    log(why);
    return { ok: true, state: 'findings', plan };
  }
  if (short) {
    const why = `the entries cover ${covered(todo)} of the ${need} finding(s) not yet recorded: give the rest in a file of \`<module>: <text>[, covers <n>]\` lines (\`${ROUND_NEXT} --findings <file>\`), or record them with \`${P3} found\`, or a known gap on Bob's word`;
    if (apply) fail(`${why}; nothing was recorded`);
    log(why);
    return { ok: true, state: 'findings', plan };
  }
  if (!apply) return { ok: true, state: 'dry', plan, next: nx };
  // 1. The owed reopens, on the state branch (found writes each once, keyed).
  for (const e of todo.filter((x) => x.route === 'owe')) found(root, e.module, e.text, { from: plan.from, covers: e.covers > 1 ? e.covers : undefined, by, offline: !!io.offline, log: (l) => log(`  ${l}`) });
  // 2. The found marks, all in one plain pull request into the tranche, merged by the merge tool.
  const marks = todo.filter((x) => x.route === 'mark');
  if (marks.length) marksPR(root, cfg, plan, marks, { io: lio, log });
  // 3. Read again: the round opens once each finding is recorded.
  if (!io.offline) { fetchBranch(root, cfg.tranche); fetchState(root, cfg.state_branch, { fresh: true }); }
  plan = roundPlan(root, cfg, { findingsFile, io: lio });
  if (plan.hold) fail(`the walk's findings are not all recorded yet: ${plan.hold}; run \`${ROUND_NEXT} --apply\` again`);
  if (plan.loose.length) fail(`round ${plan.rs.round} cannot place ${plan.loose.map((f) => f.id).join(', ')} in the found file of no module: BOB names its module (\`${P3} found <module> "<finding>" --from "<source>"\`), then \`${ROUND_NEXT} --apply\``);
  if (plan.rs.state === 'clean') return releasePath(root, cfg, plan, { log });
  if (plan.rs.state !== 'new') fail(`after recording, the rounds stand at ${plan.rs.state}, not a new round: \`${P3} status --role bob\``);
  if (directMode(cfg)) {
    log(`round ${plan.rs.round} opens under the direct flow: every flawed module at once (${plan.rs.mods.join(', ')}); its ready jobs:`);
    const j = directJobs(root, { io: lio, log });
    return { ok: true, state: 'opened', round: plan.rs.round, startable: j.startable };
  }
  return openNext(root, plan.rs.next, { apply, io: lio, log, by, dry, what: `round ${plan.rs.round}'s first layer`, tranche: cfg.tranche });
}

function printEntries(plan, { log }) {
  if (!plan.entries.length) { log('the walk\'s reports name no failure (or were not stored): give its findings in a file of `<module>: <text>[, covers <n>]` lines, `round next --findings <file>`'); return; }
  const groups = new Map();
  for (const e of plan.entries) groups.set(e.module, [...(groups.get(e.module) || []), e]);
  log(`the findings by module, one entry per distinct flaw (--from "${plan.from}"):`);
  for (const [id, es] of [...groups].sort((a, b) => (mapLayer(plan, a[0]) ?? 1e9) - (mapLayer(plan, b[0]) ?? 1e9) || String(a[0]).localeCompare(String(b[0])))) {
    const k = id ? mapLayer(plan, id) : null;
    log(`  ${id || '(no module)'}${k !== null && k !== undefined ? ` (layer ${k})` : ''}:`);
    for (const e of es) {
      const how = e.route === 'owe' ? `owed reopen (${e.pin} pins its ids)` : e.route === 'mark' ? `found mark in ${e.file}` : e.route === 'unknown' ? 'not a module on the tranche' : 'no module';
      const state = e.recorded ? 'recorded' : e.pending ? 'in an open pull request' : 'to record';
      log(`    - ${state}, ${how}: ${e.text}${e.covers > 1 ? ` (covers ${e.covers})` : ''}`);
      if (!e.recorded && e.module && !e.pending) log(`      ${P3} found ${e.module} ${JSON.stringify(e.text)} --from ${JSON.stringify(plan.from)}${e.covers > 1 ? ` --covers ${e.covers}` : ''}`);
    }
  }
}

// The marks' plain pull request: one branch from the tranche tip, the marks appended (numbered past
// the module's, as found numbers them), pushed, opened ready, and merged by the merge tool (merge
// --plain: a change that only adds unmet found marks). An open one of this run's is merged as it is.
function marksPR(root, cfg, plan, marks, { io, log }) {
  const slug = io.slug;
  const base = plan.branch;
  let pr = plan.prs[0] || null;
  // An open one GitHub finds conflicted (the tranche moved under it) is closed, never merged as it
  // is, and the marks cut again from the tranche tip (cold review A: else every re-run fails on it).
  let dropped = null;
  if (pr) {
    let st = null;
    try { st = (io.getPR || getPR)(slug, pr.number); } catch { st = null; }
    if (st?.mergeable === false) {
      (io.closePR || ((sl, n) => editPR(sl, n, { state: 'closed' })))(slug, pr.number);
      log(`pull request ${pr.number} (${pr.head?.ref}) conflicts with ${cfg.tranche}: closed (its branch kept), and the marks cut again from the tranche tip`);
      dropped = pr.head?.ref || null;
      pr = null;
    }
  }
  const heads = git(['ls-remote', '--heads', 'origin', `refs/heads/${base}*`], { cwd: root, allowFail: true }).stdout.split('\n').map((l) => l.split(/\s+/)).filter(([sha, ref]) => sha && ref && isMine(base, ref.replace(/^refs\/heads\//, ''))).map(([sha, ref]) => ({ sha, branch: ref.replace(/^refs\/heads\//, '') }));
  // A branch of this run pushed with no pull request (its create failed): its marks, not yet on the
  // tranche, are opened as they are, not pushed again under another name.
  if (!pr && marks.length) {
    git(['fetch', '-q', 'origin', ...heads.map((h) => `+refs/heads/${h.branch}:refs/remotes/origin/${h.branch}`)], { cwd: root, allowFail: true });
    const left = heads.find((h) => h.branch !== dropped && git(['merge-base', '--is-ancestor', h.sha, plan.tr], { cwd: root, allowFail: true }).code !== 0 && git(['merge-base', '--is-ancestor', plan.tr, h.sha], { cwd: root, allowFail: true }).code === 0);
    if (left) {
      pr = (io.createPR || createPR)(slug, { head: left.branch, base: cfg.tranche, title: `found: round ${plan.opens}, mark(s) from the ${plan.from}`, body: `Found marks from the ${plan.from} (\`round next\`, C46). Only unmet found marks are added; no code.`, draft: false });
      log(`${left.branch} was pushed by an earlier run with no pull request: pull request ${pr.number} opened from it into ${cfg.tranche}`);
    }
  }
  if (!pr && marks.length) {
    const taken = new Set(heads.map((h) => h.branch));
    let branch = base;
    for (let k = 2; taken.has(branch); k++) branch = `${base}-${k}`;
    const lines = withTemp('p3-round-', (tmp) => {
      const wt = join(tmp, 'w');
      git(['worktree', 'add', '-q', '--detach', wt, plan.tr], { cwd: root });
      try {
        const out = [];
        const byFile = new Map();
        for (const e of marks) byFile.set(e.file, [...(byFile.get(e.file) || []), e]);
        for (const [file, es] of byFile) {
          const p = join(wt, file);
          const id = es[0].module;
          const read = (f) => { try { return readFileSync(join(wt, f), 'utf8'); } catch { return null; } };
          let text = read(file);
          for (const e of es) {
            const n = nextFound(text, read(foundFile(id)), pendingFound(root, id, plan.tr));
            const line = foundLine(n, e.text, e.covers > 1 ? `${plan.from}, covers ${e.covers}` : plan.from);
            text = addFound(text, line, e.title);
            out.push(`${id} F${n}: ${e.text}`);
          }
          writeFile(p, text);
          git(['add', '--', file], { cwd: wt });
        }
        git(['commit', '-q', '-m', `found: round ${plan.opens}, ${marks.length} mark(s) from the ${plan.from}`], { cwd: wt });
        const r = git(['push', '-q', 'origin', `HEAD:refs/heads/${branch}`], { cwd: wt, allowFail: true });
        if (r.code !== 0) fail(`the push of ${branch} failed (${r.stderr.trim()}); nothing was opened`);
        return out;
      } finally { git(['worktree', 'remove', '--force', wt], { cwd: root, allowFail: true }); }
    }, { root });
    log(`${branch} pushed: ${lines.join('; ')}`);
    pr = (io.createPR || createPR)(slug, { head: branch, base: cfg.tranche, title: `found: round ${plan.opens}, ${marks.length} mark(s) from the ${plan.from}`, body: `Found marks from the ${plan.from}, one a distinct flaw (\`round next\`, C46):\n\n${lines.map((l) => `- ${l}`).join('\n')}\n\nOnly unmet found marks are added; no code.`, draft: false });
    log(`pull request ${pr.number} opened into ${cfg.tranche}`);
  }
  if (!pr) return;
  log(`merging pull request ${pr.number} (found marks only) through the merge tool: merge ${pr.number} --plain --no-review "${NO_REVIEW}"`);
  (io.mergePlain || mergePlain)(root, pr.number, { noReview: NO_REVIEW, log, slug });
}
function writeFile(p, text) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); }

// The marks a printed `found` act holds on a found/<module>-f<n> branch, on origin or here, not yet
// on the tranche, as found.mjs numbers past them: two marks never share a number.
function pendingFound(root, id, tr) {
  const remote = git(['ls-remote', '--heads', 'origin', `refs/heads/found/${id}-f*`], { cwd: root, allowFail: true }).stdout || '';
  const local = git(['for-each-ref', '--format=%(objectname) %(refname)', `refs/heads/found/${id}-f*`], { cwd: root, allowFail: true }).stdout || '';
  const written = (sha) => git(['cat-file', '-e', `${sha}^{commit}`], { cwd: root, allowFail: true }).code !== 0 || git(['merge-base', '--is-ancestor', sha, tr], { cwd: root, allowFail: true }).code !== 0;
  return `${remote}\n${local}`.split('\n').map((l) => l.trim().split(/\s+/)).filter(([sha, name]) => sha && name && written(sha))
    .map(([, name]) => name.match(new RegExp(`^refs/heads/found/${id}-f(\\d+)$`))?.[1]).filter(Boolean).map((k) => `**F${k}**`).join(' ');
}

// The layer opened (apply) or named (dry run), and its jobs' `job start` commands printed.
function openNext(root, nx, { apply, io, log, by, dry, what, tranche = null }) {
  if (!apply) {
    log(`${what}: ${roundLayerName(nx.round, nx.of, nx.n, tranche)} for ${nx.mods.join(', ')}${dry}; then its \`job start\` commands`);
    return { ok: true, state: 'dry', next: nx };
  }
  const o = layerOpen(root, nx.n, { io, by, log });
  log(`next: BOB starts each job above (create_session for its session, then the \`job start\` command); \`${ROUND_NEXT}\` lists them again`);
  return { ok: true, state: 'opened', layer: nx.n, round: o.round, startable: o.startable };
}

// A clean walk: the release path (rounds.mjs releaseNext), or where it stands.
function releasePath(root, cfg, plan, { log }) {
  let next = null;
  try {
    let p = cfg.plan;
    try { p = loadConfig(root, plan.tr).plan; } catch { p = cfg.plan; }
    const w = findingsOf(root, cfg, plan.tr, plan.last);
    next = releaseNext(root, cfg, { rc: { closed: true, round: `round ${plan.rs.round}`, rounds: plan.rs }, w, plan: p, ref: plan.tr });
  } catch { next = null; }
  if (next) log(`the walk ${runSource(plan.last)} is clean: no round opens; the release path is next (${next.why}): ${next.act}`);
  else log(`the walk ${runSource(plan.last)} is clean: no round opens; the release path follows (BD-R1): \`${P3} release dev\` (the cut, signed release), then \`${P3} deploy release <version>\`; \`${P3} status --role bob\` names where it stands`);
  return { ok: true, state: 'clean', release: next };
}
