// GitHub limit conformance (R17). The civicsmith account was suspended on 6 Nov at 19:19Z, most
// likely for automated bulk activity. Bob, 6 Nov ~21:10Z: "If github publishes limits, then we
// should introduce process3 tooling that conforms to those limits. But rather than limiting usage
// to a small fraction of github's stated limits, I'd suggest that the tooling limit usage to 80%
// or 90% of github's published limits. That feels like the proper balance."
//
// So the tool:
// - holds GitHub's published limits as data (GITHUB_LIMITS, pacing.github_limits);
// - uses at most pacing.target (default 0.85, 0.8 to 0.9) of each, account-wide:
//   - the primary limit is GitHub's own count: the rate_limit endpoint, which does not count
//     against it, read at most once a minute per clone;
//   - the secondary limits are counted per call (REST points; content-creating requests), from
//     every session's usage rows on the state branch plus this clone's own log;
// - obeys GitHub's refusals: on a 403 or 429 rate-limit response, every session pauses until the
//   reset (Retry-After, x-ratelimit-reset, else at least a minute) and never retries inside it; a
//   second refusal within an hour stops the tool until the coordinator runs `github resume`.
// PD-6 (coordinator, 7 Nov; Bob: "make sure that this baseless overcaution NEVER happens"): a brake
// acts only on (a) a limit GitHub publishes, at pacing.target, or (b) a refusal GitHub actually
// returns (a secondary rate limit, a 403 or 429 naming a rate limit, abuse detection). Everything
// else is counted and reported, never waited on or refused: pushes and fetches (GitHub publishes no
// limit on them), session counts. The per-clone spacing (gh_interval_ms) spaces REST writes only,
// as GitHub's guidance asks (at least a second between POST, PATCH, PUT and DELETE requests); reads,
// pushes and notes are never spaced. The shared store is an adapter
// (useShared): p3.mjs sets the state branch's (ghshare.mjs); with none, this clone's own log only.
// No import from util.mjs (util imports this).
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// GitHub's published limits, read 6 Nov 2026 from the source below.
export const GITHUB_LIMITS = {
  source: 'https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api',
  read: '2026-11-06',
  primary_per_hour: 5000, // per user token
  actions_token_per_hour: 1000, // GITHUB_TOKEN, per repository
  concurrent: 100,
  rest_points_per_minute: 900, // GET, HEAD, OPTIONS 1 point; POST, PATCH, PUT, DELETE 5
  content_per_minute: 80,
  content_per_hour: 500,
  cpu_seconds_per_minute: 90,
};
// ledger: the repository whose state branch holds the account's ledger (github/), "<owner>/<repo>";
// null is this product's own (ghshare.mjs). A poll of GitHub waits poll_first_s (30 s), fixed, never
// backing off on a number of the process's own (PD-6; GitHub's primary limit, governed at target,
// is what bounds reads); poll_most_s is retired.
export const PACING_DEFAULTS = { target: 0.85, gh_interval_ms: 1000, poll_first_s: 30, share_s: 900, ledger: null, github_limits: GITHUB_LIMITS };
// Keys retired by PD-6, each a brake on a number GitHub does not publish: accepted in an old config
// and ignored, with a note (github budget, the job cap's line).
export const RETIRED_PACING = {
  pushes_per_hour: 'the process\'s own push ceiling (PD-3); GitHub publishes no push limit',
  jobs: 'a job cap set as GitHub pacing; the job cap is the account\'s own (jobCap)',
  lanes: 'a lane cap set as GitHub pacing',
  poll_most_s: 'a poll back-off past poll_first_s; a poll waits poll_first_s, fixed',
};
export const retiredPacing = (p) => Object.keys(RETIRED_PACING).filter((k) => p && p[k] !== undefined && p[k] !== null);
export const retiredNote = (p) => { const r = retiredPacing(p); return r.length ? `pacing.${r.join(', pacing.')} ignored (PD-6: ${r.map((k) => RETIRED_PACING[k]).join('; ')})` : null; };
export const TARGET_RANGE = [0.8, 0.9];
export const POLL_FLOOR_S = 30;
export const GH_FLOOR_MS = 1000;
export const MAX_WAIT_MIN = 15;
export const GITHUB_LOG = 'p3-github.jsonl';
const STAMP = 'p3-gh-pace';
const PRIMARY = 'p3-gh-primary.json';

let current = { ...PACING_DEFAULTS };
// The pacing in force: the defaults, the config's "pacing" over them (configOf sets it).
export function setPacing(p) { const q = { ...(p || {}) }; for (const k of Object.keys(RETIRED_PACING)) delete q[k]; current = { ...PACING_DEFAULTS, ...q, github_limits: { ...GITHUB_LIMITS, ...(p?.github_limits || {}) }, retired: retiredPacing(p) }; }
// P3_GH_INTERVAL_MS (and P3_GITHUB_LOG) are read under the test runner only, never in a session.
export function pacing(env = process.env) {
  const ms = env.NODE_TEST_CONTEXT ? env.P3_GH_INTERVAL_MS : undefined;
  return { ...current, ...(ms !== undefined && ms !== '' && /^\d+$/.test(ms) ? { gh_interval_ms: Number(ms) } : {}) };
}
// pacing.jobs and pacing.lanes are retired (PD-6): no cap of GitHub pacing on sessions.
export const pacedJobs = () => null;
export const pacedLanes = () => null;
// Checks a config's "pacing" block; returns the problem or null.
export function pacingProblem(p) {
  if (p === undefined) return null;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return 'pacing is an object';
  for (const k of Object.keys(p)) if (!(k in PACING_DEFAULTS) && !(k in RETIRED_PACING)) return `pacing.${k} is not a pacing key (${Object.keys(PACING_DEFAULTS).join(', ')})`;
  if (p.target !== undefined && !(typeof p.target === 'number' && p.target >= TARGET_RANGE[0] && p.target <= TARGET_RANGE[1])) return `pacing.target is between ${TARGET_RANGE[0]} and ${TARGET_RANGE[1]}: the share of GitHub's published limits the tool uses (Bob, 6 Nov: "80% or 90%")`;
  if (p.ledger !== undefined && p.ledger !== null && !(typeof p.ledger === 'string' && /^[\w.-]+\/[\w.-]+$/.test(p.ledger))) return 'pacing.ledger is "<owner>/<repo>": the repository whose state branch holds the account\'s GitHub ledger';
  for (const k of ['gh_interval_ms', 'poll_first_s', 'share_s']) if (p[k] !== undefined && !(Number.isInteger(p[k]) && p[k] >= 0)) return `pacing.${k} is a whole number`;
  if (p.gh_interval_ms !== undefined && p.gh_interval_ms < GH_FLOOR_MS) return `pacing.gh_interval_ms is ${GH_FLOOR_MS} or more: at least a second between GitHub writes per clone, as GitHub's guidance asks`;
  if (p.poll_first_s !== undefined && p.poll_first_s < POLL_FLOOR_S) return `pacing.poll_first_s is ${POLL_FLOOR_S} or more: the poll cadence, no tighter than ${POLL_FLOOR_S} s`;
  if (p.github_limits !== undefined) {
    const g = p.github_limits;
    if (!g || typeof g !== 'object' || Array.isArray(g)) return 'pacing.github_limits is an object';
    for (const [k, v] of Object.entries(g)) {
      if (!(k in GITHUB_LIMITS)) return `pacing.github_limits.${k} is not one of GitHub's published limits held here (${Object.keys(GITHUB_LIMITS).join(', ')})`;
      if (k !== 'source' && k !== 'read' && !(Number.isInteger(v) && v > 0)) return `pacing.github_limits.${k} is a whole number above 0`;
    }
    // One write must fit each window at the target, or every write is refused (cold review of C30).
    const t = p.target ?? PACING_DEFAULTS.target;
    for (const [k, least] of [['rest_points_per_minute', 5], ['content_per_minute', 1], ['content_per_hour', 1]]) if (g[k] !== undefined && Math.floor(t * g[k]) < least) return `pacing.github_limits.${k} at the target leaves room for less than one write (${least}); GitHub's published value is ${GITHUB_LIMITS[k]}`;
    if (g.source === undefined || g.read === undefined) return 'pacing.github_limits names its source and the date it was read (source, read), as GitHub publishes them';
  }
  return null;
}

// The pause before the k-th poll in a row (k from 1): poll_first_s doubling to poll_most_s.
export function pollMs(k, p = pacing()) {
  return Math.max(POLL_FLOOR_S, p.poll_first_s) * 1000;
}

// The clone's git directory (shared by its worktrees), where the stamps and the log live; the
// temp directory when cwd is no clone.
// Asked of git once per directory and process (R17d: the hook's read path spawns as little as it can).
const dirs = new Map();
export function commonDir(cwd) {
  const at = cwd || process.cwd();
  if (dirs.has(at)) return dirs.get(at);
  const r = spawnSync('git', ['rev-parse', '--git-common-dir'], { cwd: at, encoding: 'utf8' });
  const d = r.status === 0 ? r.stdout.trim() : '';
  const out = !d ? tmpdir() : isAbsolute(d) ? d : resolve(at, d);
  if (d) dirs.set(at, out);
  return out;
}
// The tool's command as it is run in this clone (R17d: a refusal names the path that exists): a
// product runs the pinned process at .process/tool/p3.mjs, process3 its own tool/p3.mjs.
export const TOOL = basename(resolve(dirname(fileURLToPath(import.meta.url)), '../..')) === '.process' ? 'node .process/tool/p3.mjs' : 'node tool/p3.mjs';
export const githubLog = (cwd) => (process.env.NODE_TEST_CONTEXT && process.env.P3_GITHUB_LOG) || join(commonDir(cwd), GITHUB_LOG);
export const sessionId = () => process.env.CLAUDE_CODE_SESSION_ID || process.env.P3_SESSION || null;
// The session's claude.ai id (session_<id>), the one its pull requests and commits name (C34: the
// audit names the session behind a write by it). null outside a cloud session.
export const remoteSession = () => { const r = process.env.CLAUDE_CODE_REMOTE_SESSION_ID || ''; return r ? r.replace(/^cse_/, 'session_') : null; };
// This clone, as the ledger's rows name it: one session can act from two clones (process3 and a
// product), and only the clone's own rows are in its log (cold review of R17b).
// R17e (coordinator's C10): every cloud container is hostname "vm" with the same paths, so the
// name alone made every session's copy clone one clone; a random id kept in the git directory
// tells them apart. Labels only: what is counted no longer turns on it (usage).
const ids = new Map();
export function cloneId(cwd) {
  const dir = commonDir(cwd);
  if (ids.has(dir)) return ids.get(dir);
  const f = join(dir, 'p3-clone-id');
  let id = null;
  try { id = readFileSync(f, 'utf8').trim() || null; } catch { id = null; }
  if (!id) { try { writeFileSync(f, randomUUID().slice(0, 8), { flag: 'wx' }); } catch { /* another process made it */ } try { id = readFileSync(f, 'utf8').trim(); } catch { id = 'x'; } }
  const out = `${hostname()}:${dir}:${id}`;
  ids.set(dir, out);
  return out;
}
// This clone's shares (ghshare.mjs shareUsage): each { last: the last own row it carried, at: when
// it was pushed }; a number is the record from before R17e (a share made long ago).
export const SHARED_MARK = 'p3-gh-shared-to';
export function sharesOf(cwd) {
  let v = null;
  try { v = JSON.parse(readFileSync(join(commonDir(cwd), SHARED_MARK), 'utf8')); } catch { v = null; }
  if (typeof v === 'number') return [{ last: v, at: 0 }];
  return Array.isArray(v?.shares) ? v.shares : [];
}
export function noteShare(cwd, last, at, made = at) {
  try { writeFileSync(join(commonDir(cwd), SHARED_MARK), JSON.stringify({ shares: [...sharesOf(cwd), { last, at, made }].slice(-50) })); } catch { /* best effort */ }
}
// A share pushed with the command's coalesced push records its time once that push is made.
export const PENDING_AT = Number.MAX_SAFE_INTEGER;
export function settleShare(cwd, last, at) {
  try { writeFileSync(join(commonDir(cwd), SHARED_MARK), JSON.stringify({ shares: sharesOf(cwd).map((x) => (x.last === last && x.at === PENDING_AT ? { ...x, at } : x)) })); } catch { /* best effort */ }
}
export const lastShared = (cwd) => Math.max(0, ...sharesOf(cwd).map((x) => x.last || 0));
const readJSON = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };

// What a gh call costs against the secondary limits: its REST points (a read 1, a write 5) and
// whether it creates content. gh api's method is -X/--method, else POST when it sends fields; a
// GraphQL mutation is a write. gh's own commands by their verb. Approximate where gh hides the
// request (its pr and issue commands use GraphQL): a write verb is counted as a write.
const WRITE_VERBS = new Set(['create', 'edit', 'merge', 'comment', 'review', 'ready', 'close', 'reopen', 'delete', 'lock', 'unlock', 'transfer', 'rerun', 'cancel', 'run', 'enable', 'disable', 'set', 'add', 'remove', 'upload']);
export function classify(args) {
  const a = args.map(String);
  if (a[0] === 'api') {
    const mi = a.findIndex((x) => x === '-X' || x === '--method');
    const m = mi >= 0 ? String(a[mi + 1] || '').toUpperCase() : a.find((x) => /^--method=/.test(x))?.split('=')[1]?.toUpperCase();
    const fields = a.some((x) => /^(-f|-F|--field|--raw-field|--input)$/.test(x) || /^--(raw-)?field=/.test(x));
    const graphql = a[1] === 'graphql';
    const write = graphql ? a.some((x) => /^\s*(query=)?\s*mutation\b/.test(x)) : (m ? !['GET', 'HEAD', 'OPTIONS'].includes(m) : fields);
    const free = !graphql && /^\/?rate_limit$/.test(a[1] || '');
    return { points: write ? 5 : 1, content: write, actions: a.some((x) => /\/actions\/(workflows\/[^/]+\/dispatches|runs\/\d+\/rerun)/.test(x)), primary: !free, graphql };
  }
  const write = WRITE_VERBS.has(a[1]) && !(a[0] === 'run' && a[1] === 'run');
  const actions = (a[0] === 'workflow' && a[1] === 'run') || (a[0] === 'run' && (a[1] === 'rerun' || a[1] === 'cancel'));
  // gh's pr and issue commands are GraphQL requests: they draw on GraphQL's own primary budget.
  return { points: write ? 5 : 1, content: write, actions, primary: true, graphql: a[0] === 'pr' || a[0] === 'issue' };
}

// One event in this clone's log: a gh call (with its cost), a push, a refusal. Never fails the act.
export function logEvent(kind, what, cwd, extra = {}, at = Date.now()) {
  if (process.env.NODE_TEST_CONTEXT && process.env.P3_GITHUB_LOG === '0') return;
  const remote = remoteSession();
  try { appendFileSync(githubLog(cwd), JSON.stringify({ at: new Date(at).toISOString(), kind, session: sessionId(), ...(remote ? { remote } : {}), what: String(what).slice(0, 120), ...extra }) + '\n'); } catch { /* the log is a record, not a gate */ }
}
// A row's content-creating requests: a gh call's flag, or a note's count.
const contentOf = (r) => (r.content === true ? 1 : Number(r.content) || 0);
export function readLog(cwd) {
  if (process.env.NODE_TEST_CONTEXT && process.env.P3_GITHUB_LOG === '0') return [];
  try { return readFileSync(githubLog(cwd), 'utf8').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }); } catch { return []; }
}

// The shared store (useShared): read() → { pause, use } with use the other sessions' rows
// ({ session, minute, calls, points, content, pushes }); pause(rec) writes at once; resume(by).
const LOCAL = { read: () => ({ pause: null, use: [] }), pause: () => null, resume: () => {} };
let shared = LOCAL;
export function useShared(s) { shared = s || LOCAL; }

// Use in the window ending at t (R17e, coordinator's C10: every clone, the same number): the
// ledger's rows, every one, plus this clone's own rows the ledger read lacks: those no share
// carried, and those a share carried after the read (read.at). Never "the rows of my clone are in
// my log" by name (it dropped every other cloud session's rows: all their clones had one name).
// State-branch pushes of the ledger's repository are counted from the ledger branch itself (each
// push marks its commit, ghshare.mjs statePushes; a source that cannot drift), with this clone's
// own made since the read; the rows' count of them is not used. A shared row covers a minute,
// counted whole while its minute is in the window.
export function sharedIn(cwd, read) {
  const s = read || shared.read();
  const covered = s.at ? Math.max(0, ...sharesOf(cwd).filter((x) => (x.at || 0) <= s.at).map((x) => x.last || 0)) : -Infinity;
  return { s, covered };
}
function isLedgerState(r, st) { return !!(st && r.kind === 'push' && r.state && r.repo && r.repo === st.repo); }
export function usage(cwd, { t = Date.now(), seconds, rows = readLog(cwd), others, read } = {}) {
  const since = t - seconds * 1000;
  const { s, covered } = sharedIn(cwd, read || (others ? { use: others } : undefined));
  const st = s.state || null;
  // free: rate_limit reads (not counted by GitHub's primary limit); pushes_by: per repository,
  // '?' for pushes logged before R17c named theirs.
  // pushes_by keys: "<repo>", "<repo>#state" (its state branch), "?" (no repository logged);
  // content_by the same for content-creating requests.
  // connector_sessions: the claude.ai sessions whose hook counted a connector call (C34: the audit).
  const out = { calls: 0, points: 0, content: 0, pushes: 0, free: 0, fetches: 0, connector: 0, graphql: 0, pushes_by: {}, content_by: {}, fetches_by: {}, connector_sessions: new Set() };
  const add = (repo, n, into = out.pushes_by) => { if (n) into[repo || '?'] = (into[repo || '?'] || 0) + n; };
  for (const r of rows) {
    const at = Date.parse(r.at);
    if (!(at > since) || !(at > covered)) continue;
    if (r.kind === 'gh') { out.calls++; out.points += r.points ?? 1; out.content += contentOf(r); add(r.repo, contentOf(r), out.content_by); if (r.free) out.free++; if (r.connector) { out.connector++; if (r.remote) out.connector_sessions.add(r.remote); } if (r.graphql) out.graphql++; }
    if (r.kind === 'fetch') { out.fetches++; add(r.of || '?', 1, out.fetches_by); }
    if (r.kind === 'push' && !(isLedgerState(r, st) && at <= (s.at || 0))) { out.pushes++; add(r.repo ? `${r.repo}${r.state ? '#state' : ''}` : null, 1); }
  }
  for (const u of s.use || []) {
    if (!(Date.parse(u.minute) + 60e3 > since)) continue;
    const ledgerState = st ? (u.pushes_by || {})[`${st.repo}#state`] || 0 : 0;
    out.calls += u.calls || 0; out.points += u.points || 0; out.content += u.content || 0; out.pushes += (u.pushes || 0) - ledgerState; out.free += u.free || 0; out.fetches += u.fetches || 0; { const fb = Object.entries(u.fetches_by || {}); for (const [k, n] of fb) add(k, n, out.fetches_by); add('?', (u.fetches || 0) - fb.reduce((a, [, n]) => a + n, 0), out.fetches_by); } out.connector += u.connector || 0; if (u.connector && u.remote) out.connector_sessions.add(u.remote); out.graphql += u.graphql || 0;
    const cnamed = Object.entries(u.content_by || {});
    for (const [repo, n] of cnamed) add(repo, n, out.content_by);
    add('?', (u.content || 0) - cnamed.reduce((a, [, n]) => a + n, 0), out.content_by);
    const named = Object.entries(u.pushes_by || {}).filter(([repo]) => !(st && repo === `${st.repo}#state`));
    for (const [repo, n] of named) add(repo, n);
    add('?', (u.pushes || 0) - ledgerState - named.reduce((a, [, n]) => a + n, 0));
  }
  if (st) { const n = (st.pushes || []).filter(([x]) => x > since && x <= t).length; out.pushes += n; add(`${st.repo}#state`, n); }
  return out;
}
// When the oldest counted call leaves the window, so the next fits: the first moment after t at
// which the window's count drops by `need` (approximate for shared rows: their minute's end).
function freedAt(cwd, { t, seconds, field, need, rows, read }) {
  const { s, covered } = sharedIn(cwd, read);
  const st = s.state || null;
  const times = [];
  for (const r of rows) { const at = Date.parse(r.at); if (at > t - seconds * 1000 && at > covered && (field === 'pushes' ? r.kind === 'push' && !(isLedgerState(r, st) && at <= (s.at || 0)) : r.kind === 'gh')) times.push([at, field === 'points' ? (r.points ?? 1) : field === 'pushes' ? 1 : contentOf(r)]); }
  for (const u of s.use || []) if (Date.parse(u.minute) + 60e3 > t - seconds * 1000) times.push([Date.parse(u.minute) + 59e3, field === 'pushes' && st ? (u.pushes || 0) - ((u.pushes_by || {})[`${st.repo}#state`] || 0) : u[field] || 0]);
  if (st && field === 'pushes') for (const [x] of st.pushes || []) if (x > t - seconds * 1000) times.push([x, 1]);
  times.sort((a, b) => a[0] - b[0]);
  let freed = 0;
  for (const [at, n] of times) { freed += n; if (freed >= need) return at + seconds * 1000 + 1000; }
  return t + seconds * 1000;
}

// GitHub's own count of the primary limit (rate_limit: free against it), at most once a minute per
// clone; null when it cannot be read (the tests read none unless given).
// A read that fails is remembered too (read_at moves), so a failing rate_limit is not called again
// on every gh call (cold review of R17); it is logged as a call, since it counts against the
// secondary limits. graphql: GraphQL's own primary budget, when GitHub gives it.
export function primaryState(cwd, { t = Date.now(), read = defaultRateLimit } = {}) {
  const f = join(commonDir(cwd), PRIMARY);
  const was = readJSON(f);
  if (was && t - was.read_at < 60e3) return was.unread ? null : was;
  const r = read(cwd);
  if (r === undefined) return was && !was.unread ? was : null; // not read at all (the tests)
  const s = r ? { ...r, read_at: t } : { read_at: t, unread: true };
  try { writeFileSync(f, JSON.stringify(s)); } catch { /* best effort */ }
  return r ? s : null;
}
function defaultRateLimit(cwd) {
  if (process.env.NODE_TEST_CONTEXT) return undefined;
  logEvent('gh', 'api rate_limit', cwd, { points: 1, free: true });
  const r = spawnSync('gh', ['api', 'rate_limit'], { cwd, encoding: 'utf8' });
  if (r.status !== 0) return null;
  try {
    const { core: c, graphql: g } = JSON.parse(r.stdout).resources;
    return { limit: c.limit, remaining: c.remaining, reset: c.reset * 1000, ...(g ? { graphql: { limit: g.limit, remaining: g.remaining, reset: g.reset * 1000 } } : {}) };
  } catch { return null; }
}
// The bucket a call draws on: GraphQL's for gh's pr and issue commands and api graphql, else core.
const bucket = (pr, cost) => (pr && cost.graphql && pr.graphql ? pr.graphql : pr);

// This clone's own pause record: written first, before the shared one, so the session that was
// refused obeys it even when the state branch cannot be pushed.
const PAUSE_LOCAL = 'p3-gh-pause.json';
export const localPause = (cwd) => readJSON(join(commonDir(cwd), PAUSE_LOCAL));
export function clearLocalPause(cwd) { try { writeFileSync(join(commonDir(cwd), PAUSE_LOCAL), 'null'); } catch { /* none */ } }
// The pause in force: the later of the clone's and the account's; stopped when either is.
function pauseOf(cwd, s) {
  let l = localPause(cwd);
  // A clone's record from before the coordinator's last resume is spent.
  if (l && s.resumed && Date.parse(l.at) <= Date.parse(s.resumed)) l = null;
  const a = s.pause;
  if (!l) return a || null;
  if (!a) return l;
  const later = Date.parse(l.until) > Date.parse(a.until) ? l : a;
  return { ...later, stopped: !!(l.stopped || a.stopped) };
}
// The second-refusal rule (cold review of R17): a refusal is a second one only when it comes after
// an earlier pause had ended, within an hour of that earlier refusal. Refusals while a pause still
// runs (calls in flight across sessions) lengthen it, never stop the tool.
export function nextPause(prev, rec, t) {
  if (prev?.stopped) return { ...rec, stopped: true, first: prev.first || prev.at };
  if (!prev) return { ...rec, stopped: false };
  if (Date.parse(prev.until) > t) return { ...rec, at: prev.at, until: Date.parse(prev.until) > Date.parse(rec.until) ? prev.until : rec.until, stopped: false, also: (prev.also || 0) + 1 };
  const second = t - Date.parse(prev.at) < 3600e3;
  return { ...rec, stopped: second, ...(second ? { first: prev.at } : {}) };
}

export class Paced extends Error {}
const nap = (ms) => { if (ms > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); };
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
// Waits out a pause or a full window, or refuses when the wait is longer than MAX_WAIT_MIN.
// The command to run again after a refusal: this p3 command as it was given (R17c, item F: every
// refusal names the limit, when it frees and what to rerun).
export function rerunLine(argv = process.argv) {
  if (rerunText) return rerunText;
  const at = argv.findIndex((x) => /(^|\/)p3\.mjs$/.test(String(x)));
  if (at < 0) return 'the same command';
  const tool = /(^|\/)\.process\/tool\/p3\.mjs$/.test(argv[at]) ? 'node .process/tool/p3.mjs' : /(^|\/)tool\/p3\.mjs$/.test(argv[at]) ? 'node tool/p3.mjs' : `node ${argv[at]}`;
  const q = (x) => (/^[\w./:@=,+-]+$/.test(x) ? x : `'${String(x).replace(/'/g, `'\\''`)}'`);
  return `\`${[tool, ...argv.slice(at + 1).map(q)].join(' ')}\``;
}
function waitUntil(until, why, { now, sleep }) {
  const ms = until - now();
  if (ms <= 0) return;
  if (noWait) throw new Paced(`GitHub budget: ${why}: not now; tried again later`);
  if (waitCap && ms > waitCap) throw new Paced(`GitHub budget: ${why}: acts on GitHub wait until ${iso(until)} (${Math.ceil(ms / 60e3)} min); then retry ${rerunLine()}`);
  if (ms > MAX_WAIT_MIN * 60e3) throw new Paced(`GitHub budget: ${why}: acts on GitHub wait until ${iso(until)} (${Math.ceil(ms / 60e3)} min); then rerun ${rerunLine()}; what this command did before the refusal stands, and the rerun picks up from it`);
  sleep(ms);
}

// Before a gh call: the stop, the pause, the primary limit at target, each secondary window at
// target, then the per-clone floor; logs the call with its cost. Throws Paced to refuse.
// Paced acts (pushes, notes) run with no gate while exempt: only the ledger's own pause, stop and
// resume writes, which must go through while the account is paused or stopped
// (coordinator's ruling on PR 206). Every other push, state-branch pushes included, waits its turn.
let exempting = 0;
export function exempt(fn) { exempting++; try { return fn(); } finally { exempting--; } }
// Acts that must not wait (the usage share): refused at once where they would wait, and tried later.
let noWait = 0;
export function withoutWaiting(fn) { noWait++; try { return fn(); } finally { noWait--; } }
// The hook's waits: never past its own timeout (cold review of R17c: a hook killed by Claude Code's
// timeout lets the call through, uncounted). Longer, it refuses, and says to retry the tool call.
let waitCap = 0;
let rerunText = null;
export function hookPacing(fn, { longestMs = 120e3, rerun = 'the tool call (retry it)' } = {}) { const was = [waitCap, rerunText]; waitCap = longestMs; rerunText = rerun; try { return fn(); } finally { [waitCap, rerunText] = was; } }

// Before any act on GitHub: the stop and the pause (GitHub's refusals), the primary limit and each of
// GitHub's published windows at target, then the write spacing; logs the act. A push is logged, never
// held but by GitHub's own pause or stop (PD-6). Throws Paced to refuse. The ledger
// is read within READ_S (ls-remote past it, a fetch only when it moved), and again after each wait.
export function reserve(cost, label, cwd, { p = pacing(), now = Date.now, sleep = nap, rateLimit, kind = 'gh', extra = {} } = {}) {
  const content = cost.content === true ? 1 : Number(cost.content) || 0;
  const lim = p.github_limits || GITHUB_LIMITS;
  const target = p.target;
  const windows = [
    [60, 'points', lim.rest_points_per_minute, cost.points || 0, 'REST points a minute'],
    [60, 'content', lim.content_per_minute, content, 'content-creating requests a minute'],
    [3600, 'content', lim.content_per_hour, content, 'content-creating requests an hour'],
  ];
  // A request that alone is over a window's target can never fit, however empty the window: refused
  // at once, before any pause or other window's wait, and said so (C30, the coordinator, 8 Nov: BOB's
  // \`github note --content 987\`, the pull request's number taken as 987 writes, 4935 points, waited
  // four times on "0 of 900 used"; cold review: one busy window's wait came first).
  for (const [, field, cap, add, name] of windows) {
    const max = Math.floor(target * cap);
    if (!add || add <= max) continue;
    const hint = cost.note && (field === 'content' || cost.points === 5 * content)
      ? `. github note --content <n> counts the connector writes about to be made (a pull request created, edited or marked ready, a comment, a review: usually 1 to 3), never a pull request's number: \`github note --content 1 --what "PR <number> ready"\`` : '';
    throw new Paced(`GitHub budget: this request alone asks for ${add} ${name}, over GitHub's ${cap} at the target ${Math.round(target * 100)}% (${max}), so it can never fit; nothing waited${hint}`);
  }
  // Every check again after each wait (cold review of R17): a pause or stop another session wrote
  // while this one slept is obeyed. Four waits at most, then the call is refused.
  for (let round = 0; ; round++) {
    // Fresh after a wait (a pause another session wrote meanwhile); else within READ_S (C12).
    const s = shared.read({ fresh: round > 0 });
    const pause = pauseOf(cwd, s);
    if (pause?.stopped) throw new Paced(`GitHub budget: GitHub refused this account again within an hour of an earlier refusal (${pause.why}; at ${pause.at} by ${pause.session || 'a session'}): every GitHub call is stopped. Tell the coordinator; it runs \`${TOOL} github resume --by <its session>\` once the account is in good standing; then rerun ${rerunLine()}`);
    let wait = null;
    if (pause?.until && Date.parse(pause.until) > now()) wait = [Date.parse(pause.until), `GitHub rate-limited this account (${pause.why})`];
    if (!wait && cost.primary) {
      const pr = bucket(primaryState(cwd, { t: now(), ...(rateLimit ? { read: rateLimit } : {}) }), cost);
      if (pr && pr.limit > 0 && pr.limit - pr.remaining >= Math.floor(target * pr.limit) && pr.reset > now()) wait = [pr.reset, `${pr.limit - pr.remaining} of the ${cost.graphql ? 'GraphQL ' : ''}primary limit's ${pr.limit} an hour used, the target ${Math.round(target * 100)}%`];
    }
    if (!wait) {
      const rows = readLog(cwd);
      for (const [seconds, field, cap, add, name] of windows) {
        if (!add || wait) continue;
        const max = Math.floor(target * cap);
        const used = usage(cwd, { t: now(), seconds, rows, read: s })[field];
        if (used + add > max) wait = [freedAt(cwd, { t: now(), seconds, field, need: used + add - max, rows, read: s }), `${used} of GitHub's ${cap} ${name} used account-wide and ${add} for this request, over the target ${Math.round(target * 100)}% (${max})`];
      }
    }
    if (!wait) break;
    if (round >= 4) throw new Paced(`GitHub budget: still waiting after four waits (${wait[1]}); rerun ${rerunLine()} later`);
    shared.beforeWait?.();
    waitUntil(wait[0], wait[1], { now, sleep });
  }
  // GitHub's guidance: at least a second between mutative requests (POST, PATCH, PUT, DELETE). Reads,
  // pushes and notes (a record of connector writes the hook spaces itself) are never spaced (PD-6).
  const ms = kind === 'gh' && !cost.note && (cost.points || 0) >= 5 ? p.gh_interval_ms : 0;
  if (ms > 0) {
    const f = join(commonDir(cwd), STAMP);
    let last = 0;
    try { last = Number(readFileSync(f, 'utf8')) || 0; } catch { last = 0; }
    const wait = last + ms - now();
    if (wait > 0) sleep(Math.min(wait, ms));
    try { writeFileSync(f, String(now())); } catch { /* best effort */ }
  }
  logEvent(kind, label, cwd, kind === 'push' ? extra : { points: cost.points || 0, ...(content ? { content } : {}), ...(cost.actions ? { actions: true } : {}), ...(cost.note ? { note: true } : {}), ...(cost.graphql ? { graphql: true } : {}), ...(cost.primary === false && !cost.note ? { free: true } : {}), ...extra }, now());
  // This clone's use reaches the other sessions during a long command too (cold review of R17).
  try { shared.share?.(); } catch { /* the budget's record; never the call's failure */ }
  return cost;
}
export function ghTurn(args, cwd, opts = {}) {
  const a = args.map(String);
  const repo = ghRepo(a, cwd);
  return reserve(classify(args), a.filter((x) => !x.startsWith('-')).slice(0, 3).join(' '), cwd, { ...opts, extra: repo ? { repo } : {} });
}
// The repository a gh call acts on (the audit's per-repository write count): its api path's
// repos/<owner>/<repo>, its --repo or -R, else this clone's origin.
export function ghRepo(a, cwd) {
  const path = a[0] === 'api' ? a.find((x, i) => i > 0 && /^\/?repos\/[^/]+\/[^/?]+/.test(x)) : null;
  if (path) return path.replace(/^\//, '').split('/').slice(1, 3).join('/').split('?')[0].toLowerCase();
  const ri = a.findIndex((x) => x === '--repo' || x === '-R');
  if (ri >= 0 && a[ri + 1]) return slugOf(a[ri + 1]) || String(a[ri + 1]).toLowerCase();
  return pushRepo(['push', 'origin'], cwd);
}
// Before a git push (every one the tool makes, and \`p3 github push\`): GitHub's pause and stop only
// (PD-6: GitHub publishes no push limit); logged. A --dry-run is no push. While exempt, logged only.
export function pushTurn(args, cwd, opts = {}) {
  if (args[0] !== 'push' || args.includes('--dry-run') || args.includes('-n')) return null;
  const label = args.filter((x) => !String(x).startsWith('-')).slice(1).join(' ');
  const repo = pushRepo(args, cwd);
  // A push to the state branch is told apart (the audit: GitHub runs no workflow on it).
  const dsts = pushPositionals(args).slice(1).map((x) => String(x).split(':').pop().replace(/^refs\/heads\//, ''));
  const extra = { ...(repo ? { repo } : {}), ...(dsts.length && dsts.every((d) => d === 'process-state') ? { state: true } : {}) };
  if (exempting) { logEvent('push', label, cwd, extra); return null; }
  return reserve({ push: true, points: 0, content: 0, primary: false }, label, cwd, { ...opts, kind: 'push', extra });
}
// The "<owner>/<repo>" a push goes to (R17c, the audit's per-repository count): its remote's URL,
// or the URL or path given; null when it cannot be read.
// A GitHub URL's "<owner>/<repo>", lower case; null for anything else (a local path, another host).
export const slugOf = (url) => { const u = String(url || '').trim().replace(/\/+$/, '').replace(/\.git$/, ''); const m = u.match(/github\.com[/:]([^/:]+)\/([^/:]+)$/) || (/^\w[\w.-]*\/\w[\w.-]*$/.test(u) ? u.match(/^([^/]+)\/([^/]+)$/) : null); return m ? `${m[1]}/${m[2]}`.toLowerCase() : null; };
// git push options that take a value: their value is not the remote (cold review of R17c).
const PUSH_VALUED = new Set(['-o', '--push-option', '--repo', '--receive-pack', '--exec']);
const pushPositionals = (args) => { const out = []; for (let i = 1; i < args.length; i++) { const x = String(args[i]); if (PUSH_VALUED.has(x)) { i++; continue; } if (!x.startsWith('-')) out.push(x); } return out; };
export function pushRepo(args, cwd) {
  const remote = pushPositionals(args)[0];
  if (!remote) return null;
  if (/[/:]/.test(remote)) return slugOf(remote);
  const r = spawnSync('git', ['config', '--get', `remote.${remote}.url`], { cwd: cwd || process.cwd(), encoding: 'utf8' });
  return r.status === 0 ? slugOf(r.stdout) : null;
}
// p3 github note --content <n> [--points <n>]: a session's own connector writes, recorded and
// reserved before it makes them, as a gh call would be.
export function noteTurn(cwd, { content = 0, points, what = 'connector writes' } = {}, opts = {}) {
  const n = Number(content);
  const pts = points === undefined ? 5 * n : Number(points);
  if (!(Number.isInteger(n) && n >= 0) || !(Number.isInteger(pts) && pts >= 0) || n + pts === 0) throw new Paced('GitHub budget: github note --content <n> [--points <n>]: whole numbers, not both 0 (each connector write is content-creating and costs 5 points)');
  return reserve({ points: pts, content: n, primary: false, note: true }, `note: ${what}`, cwd, opts);
}

// A rate-limit refusal in a gh call's output: GitHub's words for the primary and secondary limits,
// HTTP 403 or 429, and its Retry-After or x-ratelimit-reset when gh shows them.
export function limitSignal(text) {
  const t = String(text || '');
  const secondary = /secondary rate limit|abuse detection/i.test(t);
  const primary = /API rate limit exceeded|rate limit exceeded for/i.test(t) && !secondary;
  const http = /HTTP (403|429)\b/.test(t) || /\b429 Too Many Requests\b/i.test(t);
  // GitHub's own refusal only (PD-6): its rate-limit or abuse words, a 403/429 that names a rate limit
  // or carries GitHub's Retry-After or x-ratelimit headers, or any other 429 (every gh call and git
  // push goes to GitHub; git prints "RPC failed; HTTP 429"), unless a proxy says it is its own (the
  // agent proxy's "too many concurrent transfers"). A 5xx, or a 403 that names no rate limit, is a
  // failed call, never a pause or a stop (cold review of R17g: a bare "gh: HTTP 429" was missed).
  const headers = /retry-after:\s*\d+|x-ratelimit-remaining:\s*0\b/i.test(t);
  const github429 = /\bHTTP 429\b|returned error: 429\b|\b429 Too Many Requests\b/i.test(t) && !/proxy|concurrent transfers/i.test(t);
  if (!secondary && !primary && !(http && (/rate limit/i.test(t) || headers)) && !github429) return null;
  const ra = t.match(/retry-after:\s*(\d+)/i);
  const reset = t.match(/x-ratelimit-reset:\s*(\d+)/i);
  return { kind: primary ? 'primary' : 'secondary', retryAfter: ra ? Number(ra[1]) : null, reset: reset ? Number(reset[1]) * 1000 : null };
}
// After a gh call: a --paginate call's further pages logged (one request a page, estimated from
// what came back); a refusal (read from stderr only) pauses every session until GitHub's reset
// (Retry-After, else x-ratelimit-reset, else for the primary limit rate_limit's reset, else one
// minute, as GitHub's docs say), this clone's own record first; a refusal after a pause had ended,
// within an hour of it, stops the tool (nextPause). Returns the pause in force, or null.
let inAfter = false;
export function ghAfter(args, result, cwd, opts = {}) {
  // The pause's own write is a push (the ledger): a refusal of it is never judged again inside this
  // one, so no loop (cold review of R17g: git pushes now come here too).
  if (inAfter) return null;
  inAfter = true;
  try { return ghAfterOnce(args, result, cwd, opts); } finally { inAfter = false; }
}
function ghAfterOnce(args, result, cwd, { now = Date.now, rateLimit } = {}) {
  const a = args.map(String);
  if (result?.code === 0) {
    // A merge (api PUT .../pulls/N/merge, pr merge) or a release's tag moves a ref on GitHub: a push
    // GitHub shows, logged as one (cold review of R17c: the audit called every merge unexplained).
    const merge = (a[0] === 'api' && a.some((x) => /\/pulls\/\d+\/merge$/.test(x))) || (a[0] === 'pr' && a[1] === 'merge');
    const release = a[0] === 'release' && a[1] === 'create';
    if (merge || release) { const repo = ghRepo(a, cwd); logEvent('push', `${merge ? 'merge' : 'release tag'} via gh`, cwd, { ...(repo ? { repo } : {}), via: merge ? 'merge' : 'release' }, now()); }
    if (a.includes('--paginate')) {
      const per = Number((a.join(' ').match(/per_page=(\d+)/) || [])[1]) || 30;
      let pages = 1;
      try { const j = JSON.parse(result.stdout); pages = a.includes('--slurp') && Array.isArray(j) ? j.length : Array.isArray(j) ? Math.ceil(j.length / per) : 1; } catch { pages = Math.ceil(String(result.stdout || '').split('\n').filter(Boolean).length / per); }
      if (pages > 1) logEvent('gh', `${a.filter((x) => !x.startsWith('-')).slice(0, 2).join(' ')} (${pages - 1} more page(s))`, cwd, { points: pages - 1, pages: pages - 1 }, now());
    }
    return null;
  }
  const sig = limitSignal(result?.stderr || '');
  if (!sig) return null;
  const t = now();
  let until = sig.retryAfter !== null ? t + sig.retryAfter * 1000 : sig.reset;
  if (!until && sig.kind === 'primary') { const pr = (rateLimit || defaultRateLimit)(cwd); until = pr?.reset || null; }
  if (!until || until <= t) until = t + 60e3;
  const rec = { at: iso(t), until: iso(until), why: `${sig.kind} rate limit on ${a[0] === 'push' ? 'git' : 'gh'} ${a.slice(0, 2).join(' ')}${sig.retryAfter !== null ? `, Retry-After ${sig.retryAfter} s` : ''}`, session: sessionId() };
  // This clone's own record first: obeyed here whatever happens to the shared one.
  const mine = nextPause(localPause(cwd), rec, t);
  const writeMine = (x) => { try { writeFileSync(join(commonDir(cwd), PAUSE_LOCAL), JSON.stringify(x)); } catch { /* best effort */ } };
  writeMine(mine);
  logEvent('refused', rec.why, cwd, { until: mine.until, stopped: mine.stopped }, t);
  let account = null;
  try { account = shared.pause(rec, t); } catch (e) { return { ...mine, unshared: e.message }; }
  if (!account) return mine;
  const both = { ...mine, until: Date.parse(account.until) > Date.parse(mine.until) ? account.until : mine.until, stopped: !!(account.stopped || mine.stopped) };
  writeMine(both);
  return both;
}

// Whether a new session may start (job start, lane start): not while GitHub is paused or the tool
// stopped (GitHub's refusals), nor while the last hour's content-creating requests or the primary
// limit are at target (GitHub's published limits; a new session adds both); never on pushes (PD-6).
// Returns the reason, or null.
export function budgetGate(cwd, { p = pacing(), now = Date.now(), rateLimit } = {}) {
  const lim = p.github_limits || GITHUB_LIMITS;
  const s = shared.read();
  const pause = pauseOf(cwd, s);
  if (pause?.stopped) return `GitHub refused this account again within an hour of an earlier refusal (${pause.why}): the tool is stopped until the coordinator runs github resume`;
  if (pause?.until && Date.parse(pause.until) > now) return `GitHub rate-limited this account until ${pause.until} (${pause.why})`;
  const h = usage(cwd, { t: now, seconds: 3600, read: s });
  if (h.content >= Math.floor(p.target * lim.content_per_hour)) return `${h.content} of GitHub's ${lim.content_per_hour} content-creating requests an hour used account-wide, the target ${Math.round(p.target * 100)}%: a new session waits for the window`;
  const pr = primaryState(cwd, { t: now, ...(rateLimit ? { read: rateLimit } : {}) });
  if (pr && pr.limit - pr.remaining >= Math.floor(p.target * pr.limit) && pr.reset > now) return `${pr.limit - pr.remaining} of the primary limit's ${pr.limit} an hour used, the target ${Math.round(p.target * 100)}%, until ${iso(pr.reset)}`;
  return null;
}

// git fetch, clone and ls-remote: logged (kind fetch), shown in the budget; GitHub publishes no
// limit on them and the process sets no ceiling (R17c, coordinator's item B).
// What a fetch is for (R17f, coordinator's C12 part 2: the shared rows could not say which fetches
// remained): ledger (the account's GitHub ledger, read from another repository), state (the
// product's state branch), other (branches, tags, clones). Kept on the row and in the shares.
export function fetchKind(args) {
  const all = args.map(String);
  const remote = all.slice(1).find((x) => !x.startsWith('-')) || '';
  const text = all.join(' ');
  if (/refs\/p3\/ledger\//.test(text) || (/^https?:|^git@/.test(remote) && /process-state/.test(text))) return 'ledger';
  if (/process-state/.test(text)) return 'state';
  return 'other';
}
export function fetchSeen(args, cwd) {
  if (!['fetch', 'clone', 'ls-remote'].includes(args[0])) return;
  const remote = args.slice(1).find((x) => !String(x).startsWith('-'));
  logEvent('fetch', `${args[0]} ${remote || ''}`.trim(), cwd, { of: fetchKind(args) });
}
// git push (not --dry-run): logged with no gate (the tests' record of a push made elsewhere).
export function pushSeen(args, cwd) {
  if (args[0] !== 'push' || args.includes('--dry-run') || args.includes('-n')) return;
  logEvent('push', args.filter((x) => !x.startsWith('-')).slice(1).join(' '), cwd);
}

// This clone's log rows since `after`, as shared usage rows: one per session and minute.
export function usageRows(cwd, { after = 0, rows = readLog(cwd) } = {}) {
  const by = new Map();
  for (const r of rows) {
    const at = Date.parse(r.at);
    if (!(at > after) || !['gh', 'push', 'fetch'].includes(r.kind)) continue;
    const minute = iso(Math.floor(at / 60e3) * 60e3);
    const k = `${r.session}\0${minute}`;
    const x = by.get(k) || { session: r.session || null, clone: cloneId(cwd), minute, calls: 0, points: 0, content: 0, pushes: 0, pushes_by: {} };
    if (r.remote) x.remote ||= r.remote;
    if (r.kind === 'fetch') { x.fetches = (x.fetches || 0) + 1; x.fetches_by = x.fetches_by || {}; x.fetches_by[r.of || '?'] = (x.fetches_by[r.of || '?'] || 0) + 1; by.set(k, x); continue; }
    if (r.kind === 'gh') { x.calls++; x.points += r.points ?? 1; x.content += contentOf(r); if (contentOf(r) && r.repo) { x.content_by = x.content_by || {}; x.content_by[r.repo] = (x.content_by[r.repo] || 0) + contentOf(r); } if (r.free) x.free = (x.free || 0) + 1; if (r.connector) x.connector = (x.connector || 0) + 1; if (r.graphql) x.graphql = (x.graphql || 0) + 1; } else { x.pushes++; if (r.repo) { const k2 = `${r.repo}${r.state ? '#state' : ''}`; x.pushes_by[k2] = (x.pushes_by[k2] || 0) + 1; } }
    by.set(k, x);
  }
  return [...by.values()];
}

// p3 github budget: use against each of GitHub's published limits, per window, account-wide
// (the shared rows and this clone's log), with the pause and the per-session counts.
export function githubBudget(cwd, { now = Date.now(), log = console.log, p = pacing(), rateLimit } = {}) {
  const lim = p.github_limits || GITHUB_LIMITS;
  const s = shared.read();
  const rows = readLog(cwd);
  const m = usage(cwd, { t: now, seconds: 60, rows, read: s });
  const h = usage(cwd, { t: now, seconds: 3600, rows, read: s });
  const pct = (n, cap) => `${n}/${cap} (${Math.round((100 * n) / cap)}%)`;
  const pr = primaryState(cwd, { t: now, ...(rateLimit ? { read: rateLimit } : {}) });
  log(`github budget: the target is ${Math.round(p.target * 100)}% of GitHub's published limits (${lim.source}, read ${lim.read})`);
  log(`- primary, an hour: ${pr ? `${pct(pr.limit - pr.remaining, pr.limit)}, resets ${iso(pr.reset)} (GitHub's own count, every session)` : 'unread (rate_limit not answered)'}`);
  log(`- REST points, the last minute: ${pct(m.points, lim.rest_points_per_minute)}`);
  log(`- content-creating requests, the last minute: ${pct(m.content, lim.content_per_minute)}`);
  log(`- content-creating requests, the last hour: ${pct(h.content, lim.content_per_hour)}`);
  log(`- pushes, the last hour: ${h.pushes}; GitHub publishes no limit, so none is applied (PD-6; each push starts its workflows, whose GITHUB_TOKEN has ${lim.actions_token_per_hour} requests an hour per repository)`);
  if (p.retired?.length) log(`- note: ${retiredNote(Object.fromEntries(p.retired.map((k) => [k, true])))}`);
  log(`- fetches, the last hour: ${h.fetches}${Object.keys(h.fetches_by).length ? ` (${Object.entries(h.fetches_by).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')})` : ''} (git fetch, clone and ls-remote by the tool; GitHub publishes no limit, and the process sets none)`);
  log(`- not counted here: ${lim.concurrent} concurrent requests (each session calls one at a time) and ${lim.cpu_seconds_per_minute} s of CPU a minute (GitHub's side)`);
  const pause = pauseOf(cwd, s);
  log(pause?.stopped ? `STOPPED: ${pause.why} at ${pause.at}, a refusal within an hour of an earlier one; the coordinator runs github resume` : pause && Date.parse(pause.until) > now ? `PAUSED until ${pause.until}: ${pause.why}` : 'no pause');
  const by = new Map();
  const since = now - 3600e3;
  // Per session, counted as usage counts (R17e): the ledger's rows, this clone's own the read lacks,
  // and the ledger branch's own pushes by the session each names.
  const { covered } = sharedIn(cwd, s);
  const st = s.state || null;
  const one = (k) => { k = k || '(no session id)'; const x = by.get(k) || { session: k, calls: 0, content: 0, pushes: 0 }; by.set(k, x); return x; };
  for (const r of rows) { const at = Date.parse(r.at); if (at > since && at > covered && ['gh', 'push'].includes(r.kind) && !(isLedgerState(r, st) && at <= (s.at || 0))) { const x = one(r.session); if (r.kind === 'gh') { x.calls++; x.content += contentOf(r); } else x.pushes++; } }
  for (const u of s.use || []) if (Date.parse(u.minute) + 60e3 > since) { const x = one(u.session); x.calls += u.calls || 0; x.content += u.content || 0; x.pushes += (u.pushes || 0) - (st ? (u.pushes_by || {})[`${st.repo}#state`] || 0 : 0); }
  if (st) for (const [at, who] of st.pushes || []) if (at > since && at <= now) one(who).pushes++;
  for (const x of [...by.values()].sort((a, b) => b.calls - a.calls)) log(`  ${x.session}: ${x.calls} gh call(s), ${x.content} content-creating, ${x.pushes} push(es) in the hour`);
  return { minute: m, hour: h, primary: pr, pause: pause || null };
}
