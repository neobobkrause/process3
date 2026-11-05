// job start --ready (coordinator, 4 Nov: ready to start, median 49.5 min against a target of 10):
// readiness starts the job without waiting for BOB to choose it. One command starts every job
// status --role bob lists as startable, up to the job cap (jobCap) less the account's job sessions, in the order next
// work lists them, after closing the open layer when it is ready (INT-4); BOB runs it on every
// wake and after every merge, then delivers
// each launch it prints with create_session and subscribes to each pull request.
// Startable: a module with a ledger entry on the tranche and no job branch on origin, its
// requirement file not over the cap: an OPEN entry never started; a COMPLETE one listed for a
// provider notice (job start reopens it itself) or for unmet or found marks (reopened to meet them).
// A file with no ledger entry is named, not started: its entry is BOB's to write.
import { P3, READY_NEXT, jobStart } from './job.mjs';
import { layerClose } from './layer.mjs';
import { heldBy, layersAt, slotsHeld } from './hold.mjs';
import { capLine, isArchived, isIdle, jobDone, jobSession, readSessions, sessionId, sessionsCount, status } from './status.mjs';
import { Fail, fail, git, loadConfig } from './util.mjs';

const LAUNCH = /^start the job session with create_session:/;

export function startable(next, { onOrigin = () => false } = {}) {
  const go = [];
  const skip = [];
  const seen = new Set();
  for (const x of next || []) {
    if (!x?.file || x.over || x.triage || x.missing || x.found_no_module) continue;
    if (x.module && seen.has(x.module)) continue;
    if (x.module) seen.add(x.module);
    // A module with an attempt open (a pull request, commits the tranche lacks, a flag) is never
    // started again here: status names its act (review of PR 100: a second notice relaunched it).
    if (x.attempt_open) { skip.push({ file: x.file, id: x.module, why: 'its attempt is open: status says what it needs' }); continue; }
    if (!x.module) { skip.push({ file: x.file, why: 'no ledger entry: BOB writes it, then job start --ready starts it' }); continue; }
    // An OPEN entry with its branch on origin is a start already pushed (status lists its state);
    // a COMPLETE module keeps its merged branch, which job start's reopen moves on.
    if (x.entry_state === 'OPEN' && onOrigin(x.module)) { skip.push({ file: x.file, id: x.module, why: `job/${x.module} is on origin: status says what it needs` }); continue; }
    if (x.entry_state === 'OPEN') go.push({ id: x.module, file: x.file });
    else if (x.entry_state === 'COMPLETE' && x.notices) go.push({ id: x.module, file: x.file });
    // Unmet requirement marks on a COMPLETE entry: reopened as found marks are, or the layer could
    // never close (copy, 5 Nov: inquiry, basis-versions and four more sat as BOB's judgment).
    else if (x.entry_state === 'COMPLETE' && (x.found || x.marks)) go.push({ id: x.module, file: x.file, reopen: `meet ${[x.marks && `the unmet requirement marks ${x.marks.join(', ')}`, x.found && `the found marks ${x.found.join(', ')}`].filter(Boolean).join(' and ')}` });
    else skip.push({ file: x.file, id: x.module, why: x.after ? `unmet after its job: ${x.after.join(', ')}` : `entry ${x.entry_state}: BOB's judgment` });
  }
  return { go, skip };
}

// The sessions BOB can archive to free a slot when the cap holds a ready job back (coordinator,
// 4 Nov: 23 of 24 live at 09:16): each job's latest session whose job is COMPLETE (on its branch
// or merged), not archived and idle. With list_sessions saved (--sessions), the ids; without,
// the jobs, so BOB knows whose sessions to look for.
export function archivable(rows, listed) {
  // Not a reopened job (COMPLETE on the tranche, WORKING or BLOCKED on its branch, its draft open)
  // nor one whose pull request GitHub did not read: its session may be working (review of PR 104).
  const done = (rows || []).filter(jobDone)
    .map((r) => ({ id: r.id, why: r.pr && r.pr !== 'merged' ? `COMPLETE, PR ${r.pr}` : 'merged' }));
  if (!listed) return { jobs: done, sessions: null };
  const sessions = [];
  for (const d of done) {
    const js = jobSession(listed, d.id);
    if (js && !isArchived(js) && isIdle(js)) sessions.push({ session: sessionId(js), job: d.id, why: d.why });
  }
  return { jobs: done, sessions };
}

// Whether status lists startable jobs: the wake BOB receives leads with the start when so.
export function readyCount(root, { read = status } = {}) {
  // Offline: the wake is not held for GitHub or for fetches into the sender's clone (review of
  // PR 104); the refs this clone has and one ls-remote give the count.
  // The one ls-remote also marks an OPEN entry with no job branch unstarted (offline status read
  // none, so a wake counted no entry BOB wrote: copy, 4 Nov, "1 job ready" at 11:58).
  const r = git(['ls-remote', '--heads', 'origin', 'refs/heads/job/*'], { cwd: root, allowFail: true });
  const heads = new Set(r.stdout.split('\n').map((l) => l.split('\t')[1]?.replace(/^refs\/heads\/job\//, '')).filter(Boolean));
  const out = read(root, { role: 'bob', offline: true, ...(r.code === 0 ? { heads } : {}), log: () => {} });
  return startable(out?.next, { onOrigin: (id) => heads.has(id) }).go.length;
}

export function startReady(root, { live, coordinator, model, sessions, log = console.log, read = status, start = jobStart, close = layerClose, remote } = {}) {
  if (sessions === true) fail('--sessions <file>: your list_sessions result, saved as JSON');
  const listed = sessions === undefined ? null : readSessions(sessions);
  // The cap counts the account's job sessions only (Bob, 4 Nov): counted from --sessions when given (it wins over --live), else --live.
  const n = listed ? sessionsCount(listed, live, log) : Number(live);
  if ((live === undefined && !listed) || live === true || !Number.isInteger(n) || n < 0) fail('job start --ready --live <n>: n, the account\'s job sessions list_sessions shows (titled job <id>, every product; roles, builds and others not counted), or --sessions <file>, so the cap holds');
  const quiet = [];
  let out = read(root, { role: 'bob', live: n, log: (l) => quiet.push(l) });
  const cfg = loadConfig(root);
  // INT-4, the next layer starts at once after a close (copy, 4 Nov: layer 4 sat ready to close
  // over an hour, 0 startable): an open layer ready to close is closed here first, by layer close
  // itself (its checks, its row); a refused close is printed and nothing starts.
  const L = out.layer;
  let closed = null;
  if (L?.ready && L.cur && out.open?.state === 'open' && cfg.plan !== 'pause' && cfg.plan !== 'stop') {
    log(`--- layer close ${L.cur.n} (ready to close; its checks first, then the next layer's jobs)`);
    const held = [];
    let r;
    try { r = close(root, String(L.cur.n), { log: (l) => held.push(l) }); } catch (e) {
      for (const l of held) log(l);
      log(`refused: layer close ${L.cur.n}: ${e.message}`);
      log(`nothing started; ${P3} status --role bob --live ${n} lists BOB's other acts`);
      return { ok: false, closed: null, refused: e.message, started: [], failed: [], skipped: [], waiting: [] };
    }
    for (const l of held.filter((x) => x !== r?.wake && x !== READY_NEXT)) log(l);
    closed = L.cur.n;
    out = read(root, { role: 'bob', live: n, log: () => {} });
  }
  const heads = remote || new Set(git(['ls-remote', '--heads', 'origin', 'refs/heads/job/*'], { cwd: root, allowFail: true }).stdout.split('\n').map((l) => l.split('\t')[1]?.replace(/^refs\/heads\/job\//, '')).filter(Boolean));
  const s = startable(out.next, { onOrigin: (id) => heads.has(id) });
  const skip = s.skip;
  // The cap less the live holds only (Bob, 5 Nov): a held module is not started; slots held are not filled.
  const holds = out.holds || [];
  const layers = holds.some((h) => h.live && h.kind === 'layer') ? layersAt(root, cfg) : new Map();
  const go = s.go.filter((j) => { const h = heldBy(holds, j.id, layers); if (h) skip.push({ file: j.file, id: j.id, why: `held by ${h.id} (${h.scope}, by ${h.by}, until ${h.until}): ${h.why}` }); return !h; });
  const c = capLine(cfg, n, listed);
  if (c.note) log(c.note);
  const held = slotsHeld(holds);
  if (held) log(`${held} slot${held === 1 ? '' : 's'} held by recorded holds (status lists them)`);
  const now = go.slice(0, Math.max(0, c.cap - held - n));
  const wait = go.slice(now.length);
  log(`ready: ${go.length} startable (${c.line}); starting ${now.length}${wait.length ? `, ${wait.length} wait for the cap: ${wait.map((x) => x.id).join(', ')}` : ''}`);
  if (wait.length) {
    // The cap holds jobs back: the idle sessions of COMPLETE or merged jobs BOB can archive.
    const a = archivable(out.rows, listed);
    if (a.sessions) log(a.sessions.length ? `the cap holds ${wait.length} back; archive these idle sessions of COMPLETE or merged jobs to free slots, then run this again: ${a.sessions.map((x) => `${x.session} (job ${x.job}, ${x.why})`).join('; ')}` : `the cap holds ${wait.length} back; no idle session of a COMPLETE or merged job is in --sessions to archive`);
    else {
      // The PR-ready ones first (their sessions surely still stand); at most 10 named.
      const jobs = [...a.jobs.filter((x) => x.why !== 'merged'), ...a.jobs.filter((x) => x.why === 'merged')];
      log(`the cap holds ${wait.length} back; these jobs are COMPLETE or merged, so their sessions, when idle, can be archived to free slots: ${jobs.slice(0, 10).map((x) => `job ${x.id} (${x.why})`).join('; ') || 'none'}${jobs.length > 10 ? ` and ${jobs.length - 10} more` : ''}. Save list_sessions as JSON and pass --sessions <file> for the session ids`);
    }
  }
  for (const s of skip) log(`not started: ${s.id || s.file}: ${s.why}`);
  const started = [];
  const failed = [];
  for (const j of now) {
    log(`--- job start ${j.id}${j.reopen ? ` --reopen "${j.reopen}"` : ''}`);
    // Each start's lines are held until it ends: a start that fails after printing its launch
    // shows no launch, so BOB delivers only those of jobs that started (review of PR 100).
    const held = [];
    try {
      const r = start(root, j.id, { coordinator, model, ...(j.reopen ? { reopen: j.reopen } : {}), log: (l) => held.push(l) });
      // A resumed start whose pull request was already open may have its session running.
      if (r?.resumed && r.pr && !r.created) {
        for (const l of held.filter((x) => !LAUNCH.test(x))) log(l);
        failed.push({ id: j.id, why: 'a resumed start with its pull request open: check sessions; job start <id> prints its launch' });
        log(`not started: ${j.id}: its pull request was already open; a session may be running. Check your sessions; \`${P3} job start ${j.id}\` prints its launch when none is`);
        continue;
      }
      for (const l of held) log(l);
      started.push({ id: j.id, launch: r?.launch, subscribe: r?.subscribe });
    } catch (e) {
      for (const l of held.filter((x) => !LAUNCH.test(x))) log(l);
      failed.push({ id: j.id, why: e.message });
      log(`not started: ${j.id}: ${e.message}${e instanceof Fail ? '' : ' (an unexpected error; the other starts went on)'}`);
    }
  }
  if (started.length) log(`next acts: create_session with each launch printed above (${started.map((x) => x.id).join(', ')}), then subscribe_pr_activity to each pull request as printed`);
  else log(`nothing started; ${P3} status --role bob --live ${n} lists BOB's other acts`);
  return { ok: !failed.length, closed, started, failed, skipped: skip, waiting: wait.map((x) => x.id) };
}
