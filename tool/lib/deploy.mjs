// The round's walk (BD-R1, Bob, 8 Nov: "Once a walk completes, that ends the current round ...
// until an internal walk doesn't find flaws, the release deployment happens, and the walk of the
// release also doesn't identify flaws"; Bob, 8 Nov: "the internal walk would be the last step of a
// round, but the live walk would only run once a round completed without any flaws identified in
// the internal walk"). Where the product configures an internal walk, the round-close run is that
// walk alone (walk round): no deploy and no live walk; a clean one makes the release path the next
// act (release dev, then deploy release). Where it does not (Bob's exemption, or none set), the run
// is deploy dev, as before (Build Plan Phase 2; Bob's word, 3 Nov: development deployments only, in
// the product's own Cloudflare account under his approvals): the `deploy` block's dry run, refused
// unless every dry-run step printed guard_line; then the deploy; then the walk. Either runs at a
// round's close only, never between layers (Bob, 4 Nov), from the clean tranche tip, one row per run
// in deploys/dev.jsonl on the state branch.
import { appendFileSync, closeSync, constants, fstatSync, mkdirSync, mkdtempSync, openSync, readSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, sep } from 'node:path';
import { buildGenerated, generatedRows } from './checks.mjs';
import { deploys, internalWalkOf, reportPaths, stepsOf } from './deploycfg.mjs';
import { P3 } from './job.mjs';
import { fetchState, flushState, jsonl, pendingWrites, readState, unbatched, writeState } from './state.mjs';
import { completionItems, openItems } from './completion.mjs';
import { DEPLOYS_FILE, RELEASE_PATH_GAP, START_ROWS, WALK_ROWS, findingsOf, flawedModules, releaseNext, roundLine, roundState, runSource, walkHold } from './rounds.mjs';
import { flowRows } from './layerflow.mjs';
import { directMode, layerMode, layersAt } from './layerbase.mjs';
import { directRoundsAt } from './direct.mjs';
import { closedRows, layerState, onMainOf, status } from './status.mjs';
import { install } from './suite.mjs';
import { walkConcurrency, walkEnv, walkLine } from './walkcfg.mjs';
import { Fail, NO_TOKENS, depth, fail, git, keepStep, loadConfig, now, repoSlug, run, withTemp } from './util.mjs';

export { DEPLOYS_FILE, RELEASE_PATH_GAP };
export const SLUG_PREFIX = 'p3dev-';
const MINUTE = 60000;
const KEYS = ['slug_prefix', 'dry_run', 'deploy', 'walk', 'guard_line', 'timeout_minutes', 'walk_reports', 'internal_walk'];
// A slug: lower case letters, digits and dashes, as Cloudflare names Workers and buckets.
const SLUG = /^[a-z0-9][a-z0-9-]{0,47}$/;

export function checkSlug(s) {
  if (typeof s !== 'string' || !SLUG.test(s) || s.endsWith('-')) fail(`the slug must be 1 to 48 lower case letters, digits or dashes, not ending in a dash, not ${JSON.stringify(s)}`);
  if (!s.startsWith(SLUG_PREFIX)) fail(`the slug ${s} does not begin with ${SLUG_PREFIX}: only development deployments are made`);
  return s;
}

// The `deploy` block of process/config.json, validated. dry_run, deploy and walk are each an
// argv, or a list of argvs run in order; {slug} in any argument is the slug.
export { deploys, internalWalkOf };
export function deployConfig(cfg) {
  const d = cfg.deploy;
  if (d === undefined || d === null) fail('process/config.json has no "deploy" block: no development deployment is made');
  if (typeof d !== 'object' || Array.isArray(d)) fail('"deploy" in process/config.json must be an object');
  const bad = Object.keys(d).filter((k) => !KEYS.includes(k));
  if (bad.length) fail(`"deploy" has unknown keys: ${bad.join(', ')} (known: ${KEYS.join(', ')})`);
  if (typeof d.slug_prefix !== 'string' || !d.slug_prefix.startsWith(SLUG_PREFIX) || !/^[a-z0-9-]+$/.test(d.slug_prefix)) fail(`deploy.slug_prefix must begin with ${SLUG_PREFIX} (lower case letters, digits and dashes), not ${JSON.stringify(d.slug_prefix)}`);
  if (typeof d.guard_line !== 'string' || !d.guard_line.trim()) fail('deploy.guard_line must be the text each dry-run step prints, for example "p3dev guard: passed"');
  const t = d.timeout_minutes;
  if (t !== undefined && !(Number.isInteger(t) && t > 0 && t <= 360)) fail('deploy.timeout_minutes must be whole minutes from 1 to 360');
  const wr = reportPaths(d.walk_reports ?? [], 'walk_reports');
  const iw = internalWalkOf(d.internal_walk)?.walk || null;
  return { concurrency: walkConcurrency(cfg), internal_walk: iw, walk_reports: wr, slug_prefix: d.slug_prefix, dry_run: stepsOf(d.dry_run, 'dry_run'), deploy: stepsOf(d.deploy, 'deploy'), walk: stepsOf(d.walk, 'walk'), guard_line: d.guard_line.trim(), timeout_minutes: t || 30 };
}

// A step marks a value secret with a line `::add-mask::<value>`, as GitHub Actions does. The
// tool never prints that line, and prints *** wherever a marked value appears.
const MASK = /::add-mask::(.*)$/;
// One walk report, read safely: the real path inside the product root, a regular file opened
// without following a last symlink or blocking on a FIFO, written since the walk began, and no
// bigger than max (checked on the open file before reading, and again on what was read).
export function readReport(root, p, since, max) {
  let real;
  try { real = realpathSync(join(root, p)); } catch { return { stored: 'not written by this walk' }; }
  if (!real.startsWith(realpathSync(root) + sep)) return { stored: 'not stored, outside the checkout' };
  let fd;
  try { fd = openSync(real, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); } catch { return { stored: 'not stored, not a readable file' }; }
  try {
    const st = fstatSync(fd);
    if (!st.isFile()) return { stored: 'not stored, not a regular file' };
    if (st.mtimeMs < since) return { stored: 'not written by this walk' };
    if (st.size > max) return { stored: `not stored, ${st.size} bytes` };
    const buf = Buffer.alloc(max + 1);
    let n = 0;
    for (let r; n < buf.length && (r = readSync(fd, buf, n, buf.length - n, null)) > 0;) n += r;
    if (n > max) return { stored: `not stored, over ${max} bytes` };
    return { raw: buf.subarray(0, n).toString('utf8') };
  } finally { closeSync(fd); }
}

// The walk's counts from its JSON report, whatever shape it has: arrays only, at most 50 kinds,
// each name printable and at most 80 characters.
export function walkSummary(text) {
  let j;
  try { j = JSON.parse(text); } catch { return {}; }
  if (!j || typeof j !== 'object') return {};
  const arr = (x) => (Array.isArray(x) ? x : []);
  const failures = arr(j.failures);
  const by_kind = new Map();
  for (const f of failures) {
    const k = String(f && typeof f === 'object' && f.kind != null ? f.kind : '(none)').replace(/[^\x20-\x7e]/g, ' ').replace(/::/g, ': :').slice(0, 80);
    if (by_kind.has(k) || by_kind.size < 50) by_kind.set(k, (by_kind.get(k) || 0) + 1);
    else by_kind.set('(other kinds)', (by_kind.get('(other kinds)') || 0) + 1);
  }
  const steps = arr(j.steps);
  // BD-R5: the journeys the walker marks AI-assisted (a step's or a journey's `ai: true`), by name.
  const name = (x) => String(x.journey ?? x.name ?? '').replace(/[^\x20-\x7e]/g, ' ').slice(0, 80);
  const ai = [...new Set([...steps, ...arr(j.journeys)].filter((x) => x && typeof x === 'object' && x.ai === true).map(name).filter(Boolean))].sort().slice(0, 50);
  // journey-check's own record (walker.mjs, K3717): each assistant step it did not walk is a note
  // '<name>: not walked, ...' in notes (top level or under walk), never a pass or a fail.
  const notes = [...arr(j.notes), ...arr(j.walk?.notes)];
  const skipped = [...new Set(notes.map((n) => String(n).match(/^(.{1,80}?): not walked\b/)?.[1]).filter(Boolean).map((x) => x.replace(/[^\x20-\x7e]/g, ' ')))].sort().slice(0, 50);
  return { steps: steps.length, steps_ok: steps.filter((x) => x && x.ok).length, failures: failures.length, by_kind: Object.fromEntries(by_kind), ...(ai.length ? { ai_journeys: ai } : {}), ...(skipped.length ? { not_walked: skipped } : {}) };
}

export function collectMasks(text, masks) {
  for (const line of String(text).split('\n')) { const m = line.match(MASK); if (m && m[1].trim()) masks.add(m[1].trim()); }
  return masks;
}
export function redact(text, masks) {
  collectMasks(text, masks);
  let s = String(text).split('\n').filter((l) => !MASK.test(l)).join('\n');
  for (const v of [...masks].sort((a, b) => b.length - a.length)) s = s.split(v).join('***');
  return s;
}

// The round-walk rows of this tranche (WALK_ROWS: walk round's, or deploy dev's): its name, and its commit not yet on main (a row from a tranche
// already merged into main is stale, as closedRows has it). A failed run is recorded and can be run again.
export function deployRows(root, cfg, at = {}) {
  const onMain = onMainOf(root, at);
  return jsonl(readState(root, cfg.state_branch, DEPLOYS_FILE)).filter((r) => WALK_ROWS.includes(r.row) && r.tranche === cfg.tranche && !onMain(String(r.commit)));
}

// The round close (Bob, 4 Nov; BD-R1, Bob, 8 Nov): work runs in layers within rounds within
// tranches (PLN-1), and a round's walk belongs to its close, never between layers.
// The first round closes when every layer of the plan is closed (with the completion layer the copy
// opened under PD-12, its last use). A later round (rounds.mjs) closes when every layer it opened
// has merged and no flawed module waits in a map layer after its last; its walk ends it, and the
// walk's findings, recorded as found marks, open the next round. `plan` `close` (as the tranche
// holds it) makes the current round the last, closed now. Only at a round close is the round's walk
// owed or allowed; the tranche's end is its last round's close, then the release path (BD-R1).
export function roundClose(root, cfg, { ls, plan = cfg.plan, closed = [], ref, w }) {
  const top = Math.max(0, ...closed.map((r) => r.layer)) || null;
  // Under plan close the round after a walk is open while its items or the walk's found marks
  // are, so recording the findings starts no fresh run (cold review of C23: the tool-started run
  // would otherwise deploy again at the merge that records them).
  if (plan === 'close') {
    const items = w?.last ? openItems(completionItems(root, cfg, ref)).map((x) => x.id) : [];
    if (items.length || (w?.last && w.marks)) return { closed: false, why: `the last round (plan close) is open: ${[items.length ? `${items.join(', ')} open in ${cfg.completion_file}` : '', w.marks ? `${w.marks} found mark(s) of ${w.last.slug} unmet` : ''].filter(Boolean).join('; ')}` };
    return { closed: true, round: 'the last round (plan close)', layer: top };
  }
  // PD-25: under the direct flow a round closes once every module is settled (direct.mjs).
  if (directMode(cfg)) {
    let rs;
    try { rs = directRoundsAt(root, cfg); } catch (e) { return { closed: false, why: `the direct flow could not be read (${String(e.message || e).slice(0, 160)})` }; }
    if (rs.state === 'open' || rs.state === 'new') return { closed: false, why: `round ${rs.round} is open (the direct flow): ${rs.mods.length} module(s) not settled: ${rs.mods.slice(0, 8).join(', ')}${rs.mods.length > 8 ? ', ...' : ''}`, rounds: rs };
    return { closed: true, round: rs.round === 1 ? 'the first round' : `round ${rs.round}`, layer: null, rounds: rs };
  }
  if (!ls) return { closed: false, why: `there is no layer map (${cfg.layers_file}) and the plan is not close` };
  const open = ls.layers.filter((L) => !L.closed).map((L) => L.n);
  if (open.length) return { closed: false, why: `the first round is open: layer${open.length > 1 ? 's' : ''} ${open.join(', ')} not closed` };
  const rs = roundsAt(root, cfg, ref, w);
  const layer = Math.max(0, ...ls.layers.map((L) => L.n), ...rs.layers.map((L) => L.n)) || null;
  const name = (k) => (k === 1 ? 'the first round' : `round ${k}`);
  if (rs.state === 'layer' || rs.state === 'next' || rs.state === 'new') return { closed: false, why: roundLine(rs), rounds: rs };
  return { closed: true, round: name(rs.round), layer, rounds: rs };
}
// The rounds at `ref` (rounds.mjs roundState), the walk the latest deploy row's.
export function roundsAt(root, cfg, ref, w) {
  const layers = layersAt(root, cfg, ref);
  const rs = roundState(root, cfg, ref, { layers, flows: (n) => flowRows(root, cfg.state_branch, n), lastWalk: w?.last || null, flawed: flawedModules(root, cfg, ref) });
  return { ...rs, layers };
}

// The round at the tranche tip `t` (origin/<tranche>), as deploy dev and release dev read it, and as
// tranche close does: the plan as the tranche holds it, the layers from status's rows and layer
// close's rows, the latest deploy row's findings. `s` is status's result (null under plan close,
// which reads no layers); its prs null means GitHub was unreadable.
export function roundAt(root, cfg, t, { io = {}, slug = null } = {}) {
  const at = { slug, ...(io.compare ? { read: io.compare } : {}) };
  const closed = closedRows(root, cfg, at);
  let plan = null;
  try { plan = loadConfig(root, t).plan; } catch { plan = null; }
  const w = walkFindings(root, cfg, t, at);
  const s = plan === 'close' ? null : status(root, { log: () => {}, io: io.status });
  const rc = roundClose(root, cfg, { ls: s ? layerState(root, cfg, s.rows, t, { closed }) : null, plan, closed, ref: t, w });
  return { rc, w, s, plan };
}

// The latest deploy row's findings and how many are recorded: a failed run counts one at least,
// a walk its report's failures; recorded are the unmet found marks at `ref` whose source names
// this run, its slug and its commit (\`found ... --from "walk <slug> <commit>"\`, as deploy dev
// prints it: the slug alone repeats across runs), in any requirement file (requirements_dir, the
// ledger's) or found-work entry, and the completion items deferred naming it (known gaps).
export { runSource, walkHold };
export function walkFindings(root, cfg, ref, at = {}) {
  return findingsOf(root, cfg, ref, deployRows(root, cfg, at).at(-1) || null);
}

// The round's walk is the internal walk alone where the product configures one (C43, BD-R1); deploy
// dev's deploy and walk where it does not (Bob's exemption, or none set), as before.
// A malformed internal_walk reads as one configured, as rounds.mjs internalRequired reads it: walk round
// then refuses it with deployConfig's own words (cold review of C43).
export const walkOnly = (cfg) => { try { return !!internalWalkOf(cfg?.deploy?.internal_walk)?.walk; } catch { return true; } };
// Owed at a round close: none yet; or, under the rounds, the round's layers merged after the latest
// walk (BD-R1: a round ends at its walk; a walk with flaws opens the next round, which owes nothing
// until its own layers merge, and a clean one owes the release path, not another walk); or, under
// plan close (no rounds read), the latest run had findings and the tranche has moved past it. A
// clean walk owes none however the tip moves after it (review: a plain pull request, main into the
// tranche at its close, would owe a walk mid-close).
export const deployOwed = (rc, w, tip, done = 'deployed') => {
  if (!rc.closed) return null;
  if (!w.last) return `${rc.round} closed, not yet ${done}`;
  const since = `${rc.round} closed since ${String(w.last.commit).slice(0, 10)} was ${done}`;
  // A run that did not complete (stopped at its build, dry run, deploy) is owed again once the tip moves,
  // whatever its findings' record says: a deferred gap is no clean walk (cold review of C43).
  if (rc.rounds) return rc.rounds.state === 'walk' || (!w.last.ok && w.last.commit !== tip) ? since : null;
  return w.failing && w.last.commit !== tip ? since : null;
};
// What is owed at `ref` (the tranche as status and ROOT's sweep read it): the round-close run's
// reason, or null, and its act; a run started and not yet recorded (`running`), which owes nothing
// more while it may still be going; and, with nothing owed, the release path once a round's walk is
// clean (`release`: {why, act}, rounds.mjs releaseNext). The plan as the tranche holds it.
export function owedAt(root, cfg, { ls, ref, closed = [], at = {} }) {
  const w = walkFindings(root, cfg, ref, at);
  let plan = cfg.plan;
  try { plan = loadConfig(root, ref).plan; } catch { plan = cfg.plan; }
  const tip = git(['rev-parse', ref], { cwd: root });
  const running = runningAt(root, cfg, tip);
  const rc = roundClose(root, cfg, { ls, plan, closed, ref, w });
  const owed = running ? null : deployOwed(rc, w, tip, walkOnly(cfg) ? 'walked' : 'deployed');
  const release = running || owed ? null : releaseNext(root, cfg, { rc, w, plan, ref });
  return { owed, act: owed ? roundAct(cfg) : null, what: roundWhat(cfg), w, running, release };
}
// A round's walk started at `tip` and not recorded, within the longest it can run (each step's
// timeout, the internal walk's, and the install and build): it is running, or was cut short.
export function runningAt(root, cfg, tip) {
  const rows = jsonl(readState(root, cfg.state_branch, DEPLOYS_FILE)).filter((r) => r.tranche === cfg.tranche);
  const start = rows.filter((r) => START_ROWS.includes(r.row) && r.commit === tip).at(-1);
  if (!start || rows.some((r) => WALK_ROWS.includes(r.row) && r.commit === tip && r.at >= start.at)) return null;
  let minutes = 180;
  try { const d = deployConfig(cfg); minutes = d.timeout_minutes * (d.dry_run.length + d.deploy.length + d.walk.length + 2) + (d.internal_walk?.timeout_minutes || 0); } catch { minutes = 180; }
  return Date.now() - Date.parse(start.at) < minutes * MINUTE ? { ...start, until: new Date(Date.parse(start.at) + minutes * MINUTE).toISOString() } : null;
}
// The one next act when the round-close run is owed and has not run: walk round where the product
// configures an internal walk, deploy dev where it does not.
export const ROUND_ACT = `${P3} deploy dev, from a clean checkout of the tranche tip`;
export const ROUND_WALK_ACT = `${P3} walk round, from a clean checkout of the tranche tip`;
export const roundAct = (cfg) => (walkOnly(cfg) ? ROUND_WALK_ACT : ROUND_ACT);
export const roundWhat = (cfg) => (walkOnly(cfg) ? 'the internal walk only; no deploy and no live walk until a round\'s internal walk is clean, then the release deployment and its walk (BD-R1)' : 'the deploy and its walk');

// The round-close run, tool-started (Bob, 7 Nov: the internal walk is "Required, tool-started",
// and it runs at "Round close only"; his 4 Nov rule stands, no walk between layers). The act that
// closes a round starts it, so BOB need not remember it: layer merge of the round's last layer, and
// the merge of a plain pull request into the tranche that closes it (plan close, or the completion
// round's last item done). Where the product configures an internal walk, it is walk round: that
// walk alone, recorded as the round's walk, its findings the next round's found marks (BD-R1, Bob,
// 8 Nov: "the live walk would only run once a round completed without any flaws identified in the
// internal walk"); a clean one makes the release path the next act. Where it does not, deploy dev:
// the dry run, the deploy and its walk. Inline in the merging session, from a scratch worktree at the
// tranche tip, not a dispatched workflow: the session holds the product's access (never a secret a
// workflow could read under Bob's rules), and the run's row and reports go on the state branch. The
// merge is recorded before the run begins, so a run cut short loses nothing: with no row the run
// stays owed. When it cannot run here, it is the one next act: printed now, first in status, and
// ROOT's sweep wakes BOB for it. A round still open runs nothing.
export function roundCloseRun(root, { log = console.log, io = {}, by = 'the merge' } = {}) {
  let owed = null;
  let act = ROUND_ACT;
  try {
    let cfg = loadConfig(root);
    const t = `origin/${cfg.tranche}`;
    git(['fetch', '-q', ...depth(root), 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/${t}`], { cwd: root });
    // The tranche's config, as merged, not this checkout's (cold review of C23).
    try { cfg = loadConfig(root, t); } catch { /* the checkout's */ }
    if (!deploys(cfg)) return { ran: false, owed: null };
    act = roundAct(cfg);
    // The command's held state writes (the merge's close row) go first: the run reads the round
    // from origin, and its own writes are pushed as made, while its worktree exists (cold review
    // of C23: held, they were read back stale, and pushed from a removed worktree).
    if (pendingWrites()) flushState({ log });
    fetchState(root, cfg.state_branch, { fresh: true });
    const tip = git(['rev-parse', t], { cwd: root });
    const { rc, w, plan } = roundAt(root, cfg, t, { io, slug: io.repo || repoSlug(root) });
    const run = runningAt(root, cfg, tip);
    if (run) { log(`the round-close run at ${tip.slice(0, 10)} was started by ${run.session || 'a session'} at ${run.at} and is not recorded: running, or cut short; owed again after ${run.until}`); return { ran: false, owed: null, running: run }; }
    const only = walkOnly(cfg);
    owed = deployOwed(rc, w, tip, only ? 'walked' : 'deployed');
    if (!owed) {
      if (!rc.closed) log(`no ${only ? 'internal walk' : 'deploy and walk'} now: the round is open (${rc.why}); ${only ? 'it runs' : 'they run'} at its close, started by the act that closes it (Bob, 4 and 7 Nov)`);
      const next = releaseNext(root, cfg, { rc, w, plan, ref: t });
      if (next) log(`the round's walk is done; the one next act is the release path (${next.why}): ${next.act}`);
      return { ran: false, owed: null, ...(next ? { release: next } : {}) };
    }
    log(`${owed}: ${by} starts the round-close run now (Bob, 7 Nov: required, tool-started): ${roundWhat(cfg)}; if it is cut short, the run stays owed: ${act}`);
    const r = unbatched(() => withTemp('p3-round-', (tmp) => {
      const wt = join(tmp, 'w');
      git(['worktree', 'add', '-q', '--detach', wt, tip], { cwd: root });
      try {
        if (git(['ls-tree', tip, '--', '.gitmodules'], { cwd: root })) git(['submodule', 'update', '--init', '-q'], { cwd: wt, allowFail: true });
        return (only ? io.walkRound || walkRound : io.deployDev || deployDev)(wt, { log, io: io.deploy || {}, repo: io.repo || repoSlug(root) });
      } finally { git(['worktree', 'remove', '--force', wt], { cwd: root, allowFail: true }); }
    }, { root }));
    return { ran: true, ok: r.ok, owed };
  } catch (e) {
    const why = String(e?.message || e).split('\n')[0].slice(0, 200);
    if (!(e instanceof Fail)) log(`the round-close run stopped on an error: ${why}`);
    log(`the round-close run did not run here (${why}); ${owed ? `it is owed (${owed})` : 'if the round closed, it is owed'}: the one next act is ${act}; status puts it first and ROOT's sweep wakes BOB for it`);
    return { ran: false, owed, act, why };
  }
}
const defaultIO = { exec: run };

// The checks both round walks share: the checkout the clean tranche tip, the round closed at it and
// not already walked clean there, no run of it going; then the start marker, pushed at once so status
// and ROOT's sweep owe nothing while it runs (cold review of C23). `what` names the run in refusals.
function roundRunAt(root, cfg, { io, repo, what, slugOf, startRow, log }) {
  const t = `origin/${cfg.tranche}`;
  git(['fetch', '-q', ...depth(root), 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/${t}`], { cwd: root });
  const tip = git(['rev-parse', t], { cwd: root });
  const head = git(['rev-parse', 'HEAD'], { cwd: root });
  if (head !== tip) fail(`the checkout is ${head.slice(0, 10)}, not the tranche tip ${tip.slice(0, 10)}: check out ${t} first`);
  const dirty = git(['status', '--porcelain', '--untracked-files=no'], { cwd: root });
  if (dirty) fail(`the checkout has uncommitted changes: ${dirty.split('\n').slice(0, 3).join('; ')}`);
  fetchState(root, cfg.state_branch, { fresh: true });
  const { rc, w } = roundAt(root, cfg, t, { io, slug: repo });
  if (!rc.closed) fail(`no ${what} now: a round's walk belongs to its close, never between layers (${rc.why}); it becomes due when the round closes`);
  if (w.last && w.last.ok && !w.failing && w.last.commit === tip) fail(`no ${what} now: ${tip.slice(0, 10)} is ${w.last.row === 'round-walk' ? 'walked' : 'deployed and walked'} clean (${w.last.slug}); the next round's close makes the next one`);
  const s = slugOf(rc.layer);
  const going = runningAt(root, cfg, tip);
  if (going) fail(`no ${what} now: ${going.session || 'a session'} started one at ${tip.slice(0, 10)} (${going.slug}) at ${going.at}, not yet recorded: it is running, or was cut short; run it again after ${going.until}`);
  const session = (process.env.CLAUDE_CODE_REMOTE_SESSION_ID || '').replace(/^cse_/, 'session_') || null;
  // Best effort: the marker only holds off a second run; a state branch that refuses it refuses the
  // run's row too, and that failure is reported where the row is kept.
  try {
    unbatched(() => writeState(root, cfg.state_branch, `${what} ${s} started`, (wt) => {
      mkdirSync(dirname(join(wt, DEPLOYS_FILE)), { recursive: true });
      appendFileSync(join(wt, DEPLOYS_FILE), JSON.stringify({ row: startRow, tranche: cfg.tranche, slug: s, commit: tip, session, at: now() }) + '\n');
    }));
  } catch (e) {
    if (!(e instanceof Fail)) throw e;
    log(`the start was not recorded on the state branch (${String(e.message).split('\n')[0].slice(0, 160)}): a second run is not held off`);
  }
  return { tip, rc, w, slug: s };
}
// The row and its stored reports on the state branch; on a failed write, where they were kept.
function keepRow(root, cfg, { row, stored, logs, message, again, outcome, log }) {
  writeFileSync(join(logs, 'row.json'), JSON.stringify(row) + '\n');
  try {
    writeState(root, cfg.state_branch, message, (wt) => {
      for (const k of stored) { mkdirSync(dirname(join(wt, k.stored)), { recursive: true }); writeFileSync(join(wt, k.stored), k.text); }
      mkdirSync(dirname(join(wt, DEPLOYS_FILE)), { recursive: true });
      appendFileSync(join(wt, DEPLOYS_FILE), JSON.stringify(row) + '\n');
    });
  } catch (e) {
    log(`the state branch was not written (${outcome}); the row and the walk's reports are in ${logs} (row.json, report-*); \`${again}\` may be run again`);
    throw e;
  }
}

// deploy dev [--slug <s>]: the round's walk where the product configures no internal walk (Bob's
// exemption, or none set): the dry run, the deploy and its walk. Where it configures one, refused:
// the round's walk is the internal walk (walk round), and a live walk comes only with the release,
// once a round's internal walk is clean (BD-R1, C43).
export function deployDev(root, { slug, log = console.log, io: given = {}, repo = repoSlug(root) } = {}) {
  const io = { ...defaultIO, ...given };
  const cfg = loadConfig(root);
  const dep = deployConfig(cfg);
  if (dep.internal_walk) fail(`no development deployment now: with an internal walk configured, a round ends at its internal walk alone (\`${P3} walk round\`, started by the act that closes the round), and the deploy and its live walk come only once a round's internal walk is clean, as the release deployment: \`${P3} release dev\`, then \`${P3} deploy release <version>\` (BD-R1, Bob, 8 Nov)`);
  const { tip, rc, slug: s } = roundRunAt(root, cfg, { io, repo, log, what: 'development deployment', startRow: 'dev-deploy-start', slugOf: (layer) => checkSlug(slug === undefined ? `${dep.slug_prefix}${layer === null ? 'end' : `l${layer}`}` : String(slug)) });
  const layer = rc.layer;
  log(`development deployment ${s} of ${cfg.tranche} ${tip.slice(0, 10)}, ${rc.round} closed; development only`);
  const t0 = Date.now();
  const masks = new Set();
  const results = [];
  // Kept on purpose, not withTemp: the step logs are the evidence this deploy's output names (util.mjs keepStep).
  const logs = io.logDir || mkdtempSync(join(tmpdir(), `p3-deploy-${s}-`));
  log(`each step's whole output is kept under ${logs}`);
  const go = stepRunner(root, { io, log, logs, masks, results, dep, slug: s });
  const b = prepare(root, cfg, dep, { io, log, ref: tip, results });
  let ok = !b.findings.length && go('dry_run', dep.dry_run, { guard: true });
  let stopped = b.findings.length ? 'build' : ok ? null : 'dry_run';
  if (ok) { ok = go('deploy', dep.deploy); if (!ok) stopped = 'deploy'; }
  const tWalk = Date.now();
  if (ok) { log(walkLine(dep.concurrency, true)); ok = go('walk', dep.walk, { env: walkEnv(dep.concurrency, true) }); if (!ok) stopped = 'walk'; }
  const minutes = Math.round((Date.now() - t0) / 6000) / 10;
  const row = { row: 'dev-deploy', tranche: cfg.tranche, slug: s, commit: tip, layer, ok, stopped, results, minutes, at: now() };
  // The walk's reports, as the walker wrote them (masked values as ***), under deploys/<slug>/<UTC
  // time>/ on the state branch; one over max_file_bytes is recorded as not stored. report.json's
  // counts go in the row (copy, 4 Nov: 77 screens' findings were lost with the log's head).
  const dir = `deploys/${s}/${row.at.replace(/[:.]/g, '-')}`;
  const max = cfg.max_file_bytes;
  const read = results.some((x) => x.stage === 'walk') ? dep.walk_reports.map((p) => ({ from: p, ...readReport(root, p, tWalk, max) })) : [];
  const [kept] = keepReports([{ dir, read }], masks, max);
  // BD-R5: whether an AI account was configured; with it off, the AI-assisted journeys are recorded as not walked.
  if (results.some((x) => x.stage === 'walk')) row.ai = dep.concurrency.ai;
  if (kept.length) {
    const w = row.walk = summarize(kept);
    if (!row.ai && w.ai_journeys && !w.not_walked) w.not_walked = w.ai_journeys;
    log(`walk: ${w.steps !== undefined ? `${w.steps} steps, ${w.steps_ok} ok, ${w.failures} failures ${JSON.stringify(w.by_kind)}; ` : ''}${kept.map((k) => `${k.from} ${k.stored}`).join('; ')}`);
  }
  // Kept beside the step files before the push, so a failed state-branch write loses nothing.
  const stored = kept.filter((x) => x.text !== undefined);
  for (const k of stored) writeFileSync(join(logs, `report-${basename(k.from)}`), k.text);
  keepRow(root, cfg, { row, stored, logs, log, message: `development deployment ${s}, ${rc.round}: ${ok ? 'ok' : `stopped at ${stopped}`}`, again: `${P3} deploy dev`, outcome: ok ? 'the deployment itself succeeded' : `stopped at ${stopped}` });
  if (stopped === 'dry_run') log(`refused: the dry run did not pass the guard (every dry-run step must exit 0 and print "${dep.guard_line}"); nothing was deployed`);
  log(`recorded development deployment ${s} at ${tip.slice(0, 10)}: ${ok ? 'deployed and walked' : `stopped at ${stopped}`}, ${minutes} min`);
  // Findings enter as found marks against named modules and open the next round (BD-R1); tranche
  // close waits on them (walkHold); at that round's close, deploy dev again.
  const round = '; the next round opens from them (BD-R1); tranche close waits until each is recorded';
  if (!ok && stopped !== 'dry_run') log(`each finding enters by the route for work found elsewhere: \`${P3} found <module> "<finding>" --from "${stopped} ${runSource(row)}"\` (or found "<finding>" when it names no module)${round}`);
  if (!ok && stopped === 'walk' && layerMode(cfg)) log(`the one next act: \`${P3} round next\`, then \`${P3} round next --apply\` (C46)`);
  // A walk can report findings and still exit 0: they enter by the same route.
  if (ok) log(`findings of the walk, if any, enter by the route for work found elsewhere: \`${P3} found <module> "<finding>" --from "walk ${runSource(row)}"\`${round}`);
  return { ok, row };
}

// walk round: the round's walk where the product configures an internal walk (C43, BD-R1, Bob, 8 Nov:
// "the internal walk would be the last step of a round, but the live walk would only run once a
// round completed without any flaws identified in the internal walk"). The internal walk alone, from
// the built tranche tip at a round's close, within its timeout, without the GitHub tokens or any
// deploy secret: no dry run, no deploy, no live walk. One `round-walk` row in deploys/dev.jsonl, its
// reports under walks/round/<slug>/<UTC time>/ on the state branch; its findings enter as found marks
// and open the next round; a clean one makes the release path the next act.
export function walkRound(root, { slug, log = console.log, io: given = {}, repo = repoSlug(root) } = {}) {
  const io = { ...defaultIO, ...given };
  const cfg = loadConfig(root);
  const dep = deployConfig(cfg);
  if (!dep.internal_walk) fail(`deploy.internal_walk is not set in process/config.json: the round's walk is \`${P3} deploy dev\` (the deploy and its walk)`);
  const { tip, rc, slug: s } = roundRunAt(root, cfg, { io, repo, log, what: 'round walk', startRow: 'round-walk-start', slugOf: (layer) => { const x = slug === undefined ? `internal-${layer === null ? 'end' : `l${layer}`}` : String(slug); if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(x)) fail(`the walk's name must be lower case letters, digits and dashes, not ${JSON.stringify(x)}`); return x; } });
  log(`the internal walk of ${cfg.tranche} ${tip.slice(0, 10)} (${s}), ${rc.round} closed: the round's walk; no deploy and no live walk (BD-R1)`);
  const t0 = Date.now();
  const masks = new Set();
  const results = [];
  // Kept on purpose, not withTemp: the step logs are the evidence the walk's output names (util.mjs keepStep).
  const logs = io.logDir || mkdtempSync(join(tmpdir(), `p3-walk-${s}-`));
  log(`each step's whole output is kept under ${logs}`);
  const go = stepRunner(root, { io, log, logs, masks, results, dep, slug: s });
  const b = prepare(root, cfg, dep, { io, log, ref: tip, results });
  const inner = b.findings.length ? null : internalWalk(root, cfg, dep, go, log);
  const minutes = Math.round((Date.now() - t0) / 6000) / 10;
  // ok: the walk ran (its findings are counted in internal_walk, as deploy dev's walk's in walk).
  const row = { row: 'round-walk', tranche: cfg.tranche, slug: s, commit: tip, layer: rc.layer, ok: !!inner, stopped: inner ? null : 'build', results, minutes, at: now() };
  const dir = `walks/round/${s}/${row.at.replace(/[:.]/g, '-')}`;
  const [kept] = keepReports([{ dir, read: inner?.read || [] }], masks, cfg.max_file_bytes);
  if (inner) row.internal_walk = innerRow(inner, kept, log);
  const stored = kept.filter((x) => x.text !== undefined);
  for (const k of stored) writeFileSync(join(logs, `report-${basename(k.from)}`), k.text);
  const clean = !!inner && row.internal_walk.ok;
  keepRow(root, cfg, { row, stored, logs, log, message: `round walk ${s}, ${rc.round}: ${!inner ? 'stopped at build' : clean ? 'clean' : 'findings'}`, again: `${P3} walk round`, outcome: inner ? 'the internal walk ran' : 'stopped at build' });
  log(`recorded the round walk ${s} at ${tip.slice(0, 10)}: ${!inner ? 'stopped at build, the internal walk did not run' : clean ? 'clean' : 'findings'}, ${minutes} min`);
  if (!clean) log(`each finding enters as a found mark against its module: \`${P3} found <module> "<finding>" --from "internal walk ${runSource(row)}"\` (or found "<finding>" when it names no module), or a known gap on Bob's word; the next round opens from them (BD-R1); no deploy and no live walk until a round's internal walk is clean`);
  // The walk ran and found flaws (a build stopped short is run again, not recorded): round next (C46).
  if (!clean && inner && layerMode(cfg)) log(`the one next act: \`${P3} round next\` (a dry run: the findings by module, the round's first layer), then \`${P3} round next --apply\`: each finding recorded, that layer opened, its \`job start\` commands printed (C46)`);
  if (clean) log(`the internal walk is clean: the release path is next: \`${P3} release dev\` (the cut, signed release), then \`${P3} deploy release <version>\`, its release deployment and live walk (BD-R1)`);
  return { ok: clean, row };
}

// A runner of steps, each in the product root, {slug} substituted, without the GitHub tokens (and
// without `unset`), within its timeout (or what is left of `deadline`); each step's output kept
// whole in its file, masked; returns false at the first failure.
function stepRunner(root, { io, log, logs, masks, results, dep, slug }) {
  const put = { out: (t) => log(t.replace(/\n$/, '')), err: (t) => log(t.replace(/\n$/, '')), note: log };
  // env: the walk stages' concurrency (walkcfg.mjs), also substituted for {concurrency}.
  const go = (stage, argvs, { guard = false, deadline = null, unset = [], env = null } = {}) => {
    for (const a of argvs) {
      // `{assistant}`: --assistant with walk.ai on (BD-R5), else no argument at all.
      const argv = a.flatMap((x) => (x === '{assistant}' ? (env?.P3_WALK_AI === '1' ? ['--assistant'] : []) : [x.split('{slug}').join(slug).split('{concurrency}').join(env?.P3_WALK_CONCURRENCY ?? '1')]));
      if (deadline && Date.now() >= deadline) { results.push({ stage, name: redact(argv.join(' '), masks), exit: 1, seconds: 0, timed_out: true }); log(`${stage}: out of time, not run: ${redact(argv.join(' '), masks)}`); return false; }
      log(`::group::${redact(`${stage}: ${argv.join(' ')}`, masks)}`);
      const timeout = deadline ? Math.max(1, deadline - Date.now()) : dep.timeout_minutes * MINUTE;
      const r = io.exec(argv[0], argv.slice(1), { cwd: root, timeout, unset: [...NO_TOKENS, 'NODE_TEST_CONTEXT', ...unset], ...(env ? { env } : {}) });
      collectMasks(r.stdout, masks);
      collectMasks(r.stderr, masks);
      keepStep(logs, results.length + 1, stage, redact(r.stdout, masks), redact(r.stderr, masks), put);
      log('::endgroup::');
      const res = { stage, name: redact(argv.join(' '), masks), exit: r.code, seconds: Math.round(r.seconds) };
      if (r.timedOut) res.timed_out = true;
      if (guard) res.guard = r.stdout.split('\n').some((l) => l.trim() === dep.guard_line);
      results.push(res);
      log(`${res.name}: exit ${r.code}, ${res.seconds} s${r.timedOut ? ', timed out' : ''}${guard ? `, guard ${res.guard ? 'printed' : 'NOT printed'}` : ''}`);
      if (r.code !== 0 || (guard && !res.guard)) return false;
    }
    return true;
  };
  go.results = results;
  return go;
}

// The lock files are installed, then the generated files the tranche does not commit (over
// max_file_bytes, say) are built, as release run does (copy, 4 Nov: a fresh checkout's build
// failed on esbuild, the npm ci being only in the dry run that came after it).
function prepare(root, cfg, dep, { io, log, ref, results }) {
  const exec = (c, args, o) => io.exec(c, args, { timeout: dep.timeout_minutes * MINUTE, ...o, unset: [...NO_TOKENS, 'NODE_TEST_CONTEXT'] });
  const inst = install(root, cfg.lockfiles || [], { exec });
  const b = inst.findings.length ? { built: [], findings: inst.findings } : buildGenerated(root, generatedRows(cfg).rows, { ref, timeout: dep.timeout_minutes * MINUTE, log, exec });
  if (b.built.length || b.findings.length) results.push({ stage: 'build', name: `${inst.findings.length ? 'install' : 'generated'}: ${[...b.built, ...b.findings.map((f) => f.file)].join(', ')}`, exit: b.findings.length ? 1 : 0, seconds: 0 });
  for (const f of b.findings) log(`${f.check}: ${f.file}: ${f.message}`);
  return b;
}

// The internal walk (K4781: offline, Miniflare on loopback): its steps within its one timeout,
// without the deploy's secrets (the config's "environment" names, any CLOUDFLARE_ or CF_ variable);
// its reports read raw as soon as it ends.
function internalWalk(root, cfg, dep, go, log) {
  const iw = dep.internal_walk;
  const t0 = Date.now();
  log(walkLine(dep.concurrency, false));
  const unset = [...(Array.isArray(cfg.environment) ? cfg.environment : []), ...Object.keys(process.env).filter((k) => /^(CLOUDFLARE|CF)_/.test(k))];
  const from = go.results.length;
  go('internal_walk', iw.run, { deadline: t0 + iw.timeout_minutes * MINUTE, unset, env: walkEnv(dep.concurrency, false) });
  const ran = go.results.slice(from);
  const last = ran.at(-1);
  return { exit: last.exit, timed_out: ran.some((x) => x.timed_out), seconds: Math.round((Date.now() - t0) / 1000), read: iw.reports.map((p) => ({ from: p, ...readReport(root, p, t0, cfg.max_file_bytes) })) };
}

// Every group's reports masked with every mask any of them declares (a JSON report's escaped form
// too), each to be stored under its group's dir, or recorded as not stored over max.
function keepReports(groups, masks, max) {
  for (const g of groups) for (const k of g.read) if (k.raw !== undefined) collectMasks(k.raw, masks);
  for (const v of [...masks]) masks.add(JSON.stringify(v).slice(1, -1));
  return groups.map((g) => g.read.map((k) => {
    if (k.raw === undefined) return k;
    const text = redact(k.raw, masks);
    const bytes = Buffer.byteLength(text);
    return bytes > max ? { from: k.from, stored: `not stored, ${bytes} bytes` } : { from: k.from, text, stored: `${g.dir}/${basename(k.from)}` };
  }));
}
const summarize = (kept) => {
  const j = kept.find((k) => k.text !== undefined && k.from.endsWith('.json'));
  return { ...(j ? walkSummary(j.text) : {}), reports: kept.map((k) => ({ from: k.from, stored: k.stored })) };
};
// The internal walk's part of a row: its counts, ok (exit 0, in time, no failures), exit, seconds.
function innerRow(inner, kept, log) {
  const sum = summarize(kept);
  const r = { ...sum, ok: inner.exit === 0 && !inner.timed_out && !sum.failures, exit: inner.exit, ...(inner.timed_out ? { timed_out: true } : {}), seconds: inner.seconds };
  log(`internal walk: ${r.timed_out ? 'timed out; ' : ''}exit ${r.exit}, ${r.seconds} s; ${r.steps !== undefined ? `${r.steps} steps, ${r.steps_ok} ok, ${r.failures} failures ${JSON.stringify(r.by_kind)}; ` : ''}${kept.map((k) => `${k.from} ${k.stored}`).join('; ') || 'no reports'}`);
  return r;
}

// walk internal: the internal walk alone, any time, at the clean checkout's commit, no deploy and
// no deploy row; its reports under walks/internal/<commit>-<UTC time>/ on the state branch.
export function walkInternal(root, { log = console.log, io: given = {} } = {}) {
  const io = { ...defaultIO, ...given };
  const cfg = loadConfig(root);
  const dep = deployConfig(cfg);
  if (!dep.internal_walk) fail('deploy.internal_walk is not set in process/config.json: there is no internal walk to run');
  const dirty = git(['status', '--porcelain', '--untracked-files=no'], { cwd: root });
  if (dirty) fail(`the checkout has uncommitted changes: ${dirty.split('\n').slice(0, 3).join('; ')}`);
  const head = git(['rev-parse', 'HEAD'], { cwd: root });
  const logs = io.logDir || mkdtempSync(join(tmpdir(), 'p3-deploy-internal-walk-'));
  log(`internal walk at ${head.slice(0, 10)}; each step's whole output is kept under ${logs}`);
  const masks = new Set();
  const go = stepRunner(root, { io, log, logs, masks, results: [], dep, slug: '' });
  if (prepare(root, cfg, dep, { io, log, ref: head, results: go.results }).findings.length) { log('the build failed: no internal walk ran, nothing recorded'); return { ok: false }; }
  const inner = internalWalk(root, cfg, dep, go, log);
  const dir = `walks/internal/${head.slice(0, 10)}-${now().replace(/[:.]/g, '-')}`;
  const [kept] = keepReports([{ dir, read: inner.read }], masks, cfg.max_file_bytes);
  const r = innerRow(inner, kept, log);
  const stored = kept.filter((k) => k.text !== undefined);
  for (const k of stored) writeFileSync(join(logs, `report-${basename(k.from)}`), k.text);
  if (stored.length) writeState(root, cfg.state_branch, `internal walk at ${head.slice(0, 10)}: ${r.ok ? 'ok' : 'findings'}`, (wt) => { for (const k of stored) { mkdirSync(join(wt, dir), { recursive: true }); writeFileSync(join(wt, k.stored), k.text); } });
  if (!r.ok) log(`its findings enter as found marks: \`${P3} found <module> "<finding>" --from "internal walk ${head.slice(0, 10)}"\``);
  return { ok: r.ok, internal_walk: r };
}

// deploy release <version> (BD-R1, Bob, 8 Nov: "the release deployment happens, and the walk of the
// release also doesn't identify flaws"; coordinator, 8 Nov: an install of the cut, signed release
// artifact onto a p3dev- deployment, through the release's own installer path, and its walk). No
// path does that install yet: not process-dev-release (it cuts and publishes the draft only), not a
// release-tier install-from-scratch or upgrade fixture (none in the product's workflows), not the
// installer module (an interactive sign-in, its Worker pasted by hand). The act is named, with the
// gap, and nothing is deployed or recorded: no deploy step is invented. Exit 1.
export function deployRelease(root, version, { log = console.log } = {}) {
  if (typeof version !== 'string' || !version.trim()) fail('deploy release <version>, the development release to install on a p3dev- deployment and walk');
  log(`deploy release ${version}: the release deployment and its walk (BD-R1): the cut, signed release ${version} installed onto a p3dev- deployment, then walked; a clean walk lets the tranche close, and its findings open the next round`);
  log(`GAP: ${RELEASE_PATH_GAP}; nothing deployed, nothing recorded; brought to Bob through the coordinator`);
  return { ok: false, gap: RELEASE_PATH_GAP };
}
