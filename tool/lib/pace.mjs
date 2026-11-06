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
// The per-clone spacing (gh_interval_ms) is only a floor against bursts. Session caps are off by
// default (pacing.jobs, pacing.lanes): the budget throttles. The shared store is an adapter
// (useShared): p3.mjs sets the state branch's (ghshare.mjs); with none, this clone's own log only.
// No import from util.mjs (util imports this).
import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

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
// pushes_per_hour: the process's own account-wide push ceiling (decision PD-3, coordinator, 6 Nov):
// GitHub publishes none, and push volume is the likely cause of the suspension (1,387 in 19 h).
// ledger: the repository whose state branch holds the account's ledger (github/), "<owner>/<repo>";
// null is this product's own (ghshare.mjs).
export const PACING_DEFAULTS = { target: 0.85, jobs: null, lanes: null, gh_interval_ms: 1000, poll_first_s: 30, poll_most_s: 300, share_s: 300, pushes_per_hour: 120, ledger: null, github_limits: GITHUB_LIMITS };
export const TARGET_RANGE = [0.8, 0.9];
export const POLL_FLOOR_S = 30;
export const GH_FLOOR_MS = 1000;
export const MAX_WAIT_MIN = 15;
export const GITHUB_LOG = 'p3-github.jsonl';
const STAMP = 'p3-gh-pace';
const PRIMARY = 'p3-gh-primary.json';

let current = { ...PACING_DEFAULTS };
// The pacing in force: the defaults, the config's "pacing" over them (configOf sets it).
export function setPacing(p) { current = { ...PACING_DEFAULTS, ...(p || {}), github_limits: { ...GITHUB_LIMITS, ...(p?.github_limits || {}) } }; }
// P3_GH_INTERVAL_MS (and P3_GITHUB_LOG) are read under the test runner only, never in a session.
export function pacing(env = process.env) {
  const ms = env.NODE_TEST_CONTEXT ? env.P3_GH_INTERVAL_MS : undefined;
  return { ...current, ...(ms !== undefined && ms !== '' && /^\d+$/.test(ms) ? { gh_interval_ms: Number(ms) } : {}) };
}
// Optional hard caps (off by default): pacing.jobs on the job cap, pacing.lanes on lane seats.
export const pacedJobs = (cfg = {}) => cfg.pacing?.jobs ?? null;
export const pacedLanes = (cfg = {}) => cfg.pacing?.lanes ?? null;
// Checks a config's "pacing" block; returns the problem or null.
export function pacingProblem(p) {
  if (p === undefined) return null;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return 'pacing is an object';
  for (const k of Object.keys(p)) if (!(k in PACING_DEFAULTS)) return `pacing.${k} is not a pacing key (${Object.keys(PACING_DEFAULTS).join(', ')})`;
  if (p.target !== undefined && !(typeof p.target === 'number' && p.target >= TARGET_RANGE[0] && p.target <= TARGET_RANGE[1])) return `pacing.target is between ${TARGET_RANGE[0]} and ${TARGET_RANGE[1]}: the share of GitHub's published limits the tool uses (Bob, 6 Nov: "80% or 90%")`;
  for (const k of ['jobs', 'lanes']) if (p[k] !== undefined && p[k] !== null && !(Number.isInteger(p[k]) && p[k] >= 1)) return `pacing.${k} is a whole number, 1 or more, or null (no cap)`;
  if (p.ledger !== undefined && p.ledger !== null && !(typeof p.ledger === 'string' && /^[\w.-]+\/[\w.-]+$/.test(p.ledger))) return 'pacing.ledger is "<owner>/<repo>": the repository whose state branch holds the account\'s GitHub ledger';
  if (p.pushes_per_hour !== undefined && !(Number.isInteger(p.pushes_per_hour) && p.pushes_per_hour >= 1)) return 'pacing.pushes_per_hour is a whole number, 1 or more';
  for (const k of ['gh_interval_ms', 'poll_first_s', 'poll_most_s', 'share_s']) if (p[k] !== undefined && !(Number.isInteger(p[k]) && p[k] >= 0)) return `pacing.${k} is a whole number`;
  if (p.gh_interval_ms !== undefined && p.gh_interval_ms < GH_FLOOR_MS) return `pacing.gh_interval_ms is ${GH_FLOOR_MS} or more: no more than one gh call a second per clone`;
  if (p.poll_first_s !== undefined && p.poll_first_s < POLL_FLOOR_S) return `pacing.poll_first_s is ${POLL_FLOOR_S} or more: no wait on GitHub polls tighter than ${POLL_FLOOR_S} s`;
  const first = p.poll_first_s ?? PACING_DEFAULTS.poll_first_s;
  if (p.poll_most_s !== undefined && p.poll_most_s < first) return 'pacing.poll_most_s is at least pacing.poll_first_s';
  if (p.github_limits !== undefined) {
    const g = p.github_limits;
    if (!g || typeof g !== 'object' || Array.isArray(g)) return 'pacing.github_limits is an object';
    for (const [k, v] of Object.entries(g)) {
      if (!(k in GITHUB_LIMITS)) return `pacing.github_limits.${k} is not one of GitHub's published limits held here (${Object.keys(GITHUB_LIMITS).join(', ')})`;
      if (k !== 'source' && k !== 'read' && !(Number.isInteger(v) && v > 0)) return `pacing.github_limits.${k} is a whole number above 0`;
    }
    if (g.source === undefined || g.read === undefined) return 'pacing.github_limits names its source and the date it was read (source, read), as GitHub publishes them';
  }
  return null;
}

// The pause before the k-th poll in a row (k from 1): poll_first_s doubling to poll_most_s.
export function pollMs(k, p = pacing()) {
  const first = Math.max(POLL_FLOOR_S, p.poll_first_s) * 1000;
  return Math.min(Math.max(first, p.poll_most_s * 1000), first * 2 ** Math.max(0, k - 1));
}

// The clone's git directory (shared by its worktrees), where the stamps and the log live; the
// temp directory when cwd is no clone.
function commonDir(cwd) {
  const r = spawnSync('git', ['rev-parse', '--git-common-dir'], { cwd: cwd || process.cwd(), encoding: 'utf8' });
  const d = r.status === 0 ? r.stdout.trim() : '';
  if (!d) return tmpdir();
  return isAbsolute(d) ? d : resolve(cwd || process.cwd(), d);
}
export const githubLog = (cwd) => (process.env.NODE_TEST_CONTEXT && process.env.P3_GITHUB_LOG) || join(commonDir(cwd), GITHUB_LOG);
export const sessionId = () => process.env.CLAUDE_CODE_SESSION_ID || process.env.P3_SESSION || null;
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
  try { appendFileSync(githubLog(cwd), JSON.stringify({ at: new Date(at).toISOString(), kind, session: sessionId(), what: String(what).slice(0, 120), ...extra }) + '\n'); } catch { /* the log is a record, not a gate */ }
}
// A row's content-creating requests: a gh call's flag, or a note's count.
const contentOf = (r) => (r.content === true ? 1 : Number(r.content) || 0);
export function readLog(cwd) {
  try { return readFileSync(githubLog(cwd), 'utf8').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }); } catch { return []; }
}

// The shared store (useShared): read() → { pause, use } with use the other sessions' rows
// ({ session, minute, calls, points, content, pushes }); pause(rec) writes at once; resume(by).
const LOCAL = { read: () => ({ pause: null, use: [] }), pause: () => null, resume: () => {} };
let shared = LOCAL;
export function useShared(s) { shared = s || LOCAL; }

// Use in the window ending at t: the other sessions' shared rows plus this clone's own log. A
// shared row covers a minute, counted whole while its minute is in the window.
export function usage(cwd, { t = Date.now(), seconds, rows = readLog(cwd), others = shared.read().use || [] } = {}) {
  const since = t - seconds * 1000;
  const me = sessionId();
  const out = { calls: 0, points: 0, content: 0, pushes: 0 };
  for (const r of rows) {
    if (!(Date.parse(r.at) > since)) continue;
    if (r.kind === 'gh') { out.calls++; out.points += r.points ?? 1; out.content += contentOf(r); }
    if (r.kind === 'push') out.pushes++;
  }
  for (const u of others) {
    if (u.session && u.session === me) continue; // this clone's own are in its log
    if (!(Date.parse(u.minute) + 60e3 > since)) continue;
    out.calls += u.calls || 0; out.points += u.points || 0; out.content += u.content || 0; out.pushes += u.pushes || 0;
  }
  return out;
}
// When the oldest counted call leaves the window, so the next fits: the first moment after t at
// which the window's count drops by `need` (approximate for shared rows: their minute's end).
function freedAt(cwd, { t, seconds, field, need, rows, others }) {
  const me = sessionId();
  const times = [];
  for (const r of rows) if (Date.parse(r.at) > t - seconds * 1000 && (field === 'pushes' ? r.kind === 'push' : r.kind === 'gh')) times.push([Date.parse(r.at), field === 'points' ? (r.points ?? 1) : field === 'pushes' ? 1 : contentOf(r)]);
  for (const u of others) if (!(u.session && u.session === me) && Date.parse(u.minute) + 60e3 > t - seconds * 1000) times.push([Date.parse(u.minute) + 59e3, u[field] || 0]);
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
function waitUntil(until, why, { now, sleep }) {
  const ms = until - now();
  if (ms <= 0) return;
  if (ms > MAX_WAIT_MIN * 60e3) throw new Paced(`GitHub budget: ${why}: acts on GitHub wait until ${iso(until)} (${Math.ceil(ms / 60e3)} min); run this again then`);
  sleep(ms);
}

// Before a gh call: the stop, the pause, the primary limit at target, each secondary window at
// target, then the per-clone floor; logs the call with its cost. Throws Paced to refuse.
// Paced acts (pushes, notes) run with no gate while exempt: the ledger's own pause and resume
// writes, which must go through even while the account is paused or stopped.
let exempting = 0;
export function exempt(fn) { exempting++; try { return fn(); } finally { exempting--; } }

// Before any act on GitHub: the stop, the pause, the primary limit, each window at target (and the
// push ceiling for a push), then the per-clone floor; logs the act. Throws Paced to refuse. The pause
// is read fresh before a write (content-creating or a push), within READ_S otherwise.
export function reserve(cost, label, cwd, { p = pacing(), now = Date.now, sleep = nap, rateLimit, kind = 'gh' } = {}) {
  const content = cost.content === true ? 1 : Number(cost.content) || 0;
  const lim = p.github_limits || GITHUB_LIMITS;
  const target = p.target;
  // Every check again after each wait (cold review of R17): a pause or stop another session wrote
  // while this one slept is obeyed. Four waits at most, then the call is refused.
  for (let round = 0; ; round++) {
    const s = shared.read({ fresh: round > 0 || content > 0 || !!cost.push });
    const pause = pauseOf(cwd, s);
    if (pause?.stopped) throw new Paced(`GitHub budget: GitHub refused this account again within an hour of an earlier refusal (${pause.why}; at ${pause.at} by ${pause.session || 'a session'}): every GitHub call is stopped. Tell the coordinator; it runs \`node .process/tool/p3.mjs github resume --by <its session>\` once the account is in good standing`);
    let wait = null;
    if (pause?.until && Date.parse(pause.until) > now()) wait = [Date.parse(pause.until), `GitHub rate-limited this account (${pause.why})`];
    if (!wait && cost.primary) {
      const pr = bucket(primaryState(cwd, { t: now(), ...(rateLimit ? { read: rateLimit } : {}) }), cost);
      if (pr && pr.limit > 0 && pr.limit - pr.remaining >= Math.floor(target * pr.limit) && pr.reset > now()) wait = [pr.reset, `${pr.limit - pr.remaining} of the ${cost.graphql ? 'GraphQL ' : ''}primary limit's ${pr.limit} an hour used, the target ${Math.round(target * 100)}%`];
    }
    if (!wait) {
      const rows = readLog(cwd);
      const others = s.use || [];
      for (const [seconds, field, cap, add, name] of [
        [60, 'points', lim.rest_points_per_minute, cost.points || 0, 'REST points a minute'],
        [60, 'content', lim.content_per_minute, content, 'content-creating requests a minute'],
        [3600, 'content', lim.content_per_hour, content, 'content-creating requests an hour'],
        [3600, 'pushes', p.pushes_per_hour, cost.push ? 1 : 0, 'pushes an hour (the process\'s own ceiling, PD-3: GitHub publishes none)'],
      ]) {
        if (!add || wait) continue;
        const max = field === 'pushes' ? cap : Math.floor(target * cap);
        const used = usage(cwd, { t: now(), seconds, rows, others })[field];
        if (used + add > max) wait = [freedAt(cwd, { t: now(), seconds, field, need: used + add - max, rows, others }), `${used} of the ${cap} ${name} used account-wide, ${field === 'pushes' ? 'the ceiling' : `the target ${Math.round(target * 100)}%`} (${max})`];
      }
    }
    if (!wait) break;
    if (round >= 4) throw new Paced(`GitHub budget: still waiting after four waits (${wait[1]}); run this again later`);
    shared.beforeWait?.();
    waitUntil(wait[0], wait[1], { now, sleep });
  }
  const ms = p.gh_interval_ms;
  if (ms > 0) {
    const f = join(commonDir(cwd), STAMP);
    let last = 0;
    try { last = Number(readFileSync(f, 'utf8')) || 0; } catch { last = 0; }
    const wait = last + ms - now();
    if (wait > 0) sleep(Math.min(wait, ms));
    try { writeFileSync(f, String(now())); } catch { /* best effort */ }
  }
  logEvent(kind, label, cwd, kind === 'push' ? {} : { points: cost.points || 0, ...(content ? { content } : {}), ...(cost.actions ? { actions: true } : {}), ...(cost.note ? { note: true } : {}) }, now());
  // This clone's use reaches the other sessions during a long command too (cold review of R17).
  try { shared.share?.(); } catch { /* the budget's record; never the call's failure */ }
  return cost;
}
export function ghTurn(args, cwd, opts = {}) {
  const a = args.map(String);
  return reserve(classify(args), a.filter((x) => !x.startsWith('-')).slice(0, 3).join(' '), cwd, opts);
}
// Before a git push (every one the tool makes, and \`p3 github push\`): the pause, the stop and the
// push ceiling; logged. A --dry-run is no push. While exempt, logged only.
export function pushTurn(args, cwd, opts = {}) {
  if (args[0] !== 'push' || args.includes('--dry-run') || args.includes('-n')) return null;
  const label = args.filter((x) => !String(x).startsWith('-')).slice(1).join(' ');
  if (exempting) { logEvent('push', label, cwd); return null; }
  return reserve({ push: true, points: 0, content: 0, primary: false }, label, cwd, { ...opts, kind: 'push' });
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
  if (!secondary && !primary && !(http && /rate limit/i.test(t)) && !/\bHTTP 429\b/.test(t)) return null;
  const ra = t.match(/retry-after:\s*(\d+)/i);
  const reset = t.match(/x-ratelimit-reset:\s*(\d+)/i);
  return { kind: primary ? 'primary' : 'secondary', retryAfter: ra ? Number(ra[1]) : null, reset: reset ? Number(reset[1]) * 1000 : null };
}
// After a gh call: a --paginate call's further pages logged (one request a page, estimated from
// what came back); a refusal (read from stderr only) pauses every session until GitHub's reset
// (Retry-After, else x-ratelimit-reset, else for the primary limit rate_limit's reset, else one
// minute, as GitHub's docs say), this clone's own record first; a refusal after a pause had ended,
// within an hour of it, stops the tool (nextPause). Returns the pause in force, or null.
export function ghAfter(args, result, cwd, { now = Date.now, rateLimit } = {}) {
  const a = args.map(String);
  if (result?.code === 0) {
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
  const rec = { at: iso(t), until: iso(until), why: `${sig.kind} rate limit on gh ${a.slice(0, 2).join(' ')}${sig.retryAfter !== null ? `, Retry-After ${sig.retryAfter} s` : ''}`, session: sessionId() };
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
// stopped, nor while the last hour's content-creating requests or the primary limit are at target
// (a new session adds both). Returns the reason, or null.
export function budgetGate(cwd, { p = pacing(), now = Date.now(), rateLimit } = {}) {
  const lim = p.github_limits || GITHUB_LIMITS;
  const s = shared.read();
  const pause = pauseOf(cwd, s);
  if (pause?.stopped) return `GitHub refused this account again within an hour of an earlier refusal (${pause.why}): the tool is stopped until the coordinator runs github resume`;
  if (pause?.until && Date.parse(pause.until) > now) return `GitHub rate-limited this account until ${pause.until} (${pause.why})`;
  const h = usage(cwd, { t: now, seconds: 3600, others: s.use || [] });
  if (h.pushes >= p.pushes_per_hour) return `${h.pushes} pushes in the last hour account-wide, the process's own ceiling ${p.pushes_per_hour} (PD-3): a new session waits for the window`;
  if (h.content >= Math.floor(p.target * lim.content_per_hour)) return `${h.content} of GitHub's ${lim.content_per_hour} content-creating requests an hour used account-wide, the target ${Math.round(p.target * 100)}%: a new session waits for the window`;
  const pr = primaryState(cwd, { t: now, ...(rateLimit ? { read: rateLimit } : {}) });
  if (pr && pr.limit - pr.remaining >= Math.floor(p.target * pr.limit) && pr.reset > now) return `${pr.limit - pr.remaining} of the primary limit's ${pr.limit} an hour used, the target ${Math.round(p.target * 100)}%, until ${iso(pr.reset)}`;
  return null;
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
    if (!(at > after) || !['gh', 'push'].includes(r.kind)) continue;
    const minute = iso(Math.floor(at / 60e3) * 60e3);
    const k = `${r.session}\0${minute}`;
    const x = by.get(k) || { session: r.session || null, minute, calls: 0, points: 0, content: 0, pushes: 0 };
    if (r.kind === 'gh') { x.calls++; x.points += r.points ?? 1; x.content += contentOf(r); } else x.pushes++;
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
  const m = usage(cwd, { t: now, seconds: 60, rows, others: s.use || [] });
  const h = usage(cwd, { t: now, seconds: 3600, rows, others: s.use || [] });
  const pct = (n, cap) => `${n}/${cap} (${Math.round((100 * n) / cap)}%)`;
  const pr = primaryState(cwd, { t: now, ...(rateLimit ? { read: rateLimit } : {}) });
  log(`github budget: the target is ${Math.round(p.target * 100)}% of GitHub's published limits (${lim.source}, read ${lim.read})`);
  log(`- primary, an hour: ${pr ? `${pct(pr.limit - pr.remaining, pr.limit)}, resets ${iso(pr.reset)} (GitHub's own count, every session)` : 'unread (rate_limit not answered)'}`);
  log(`- REST points, the last minute: ${pct(m.points, lim.rest_points_per_minute)}`);
  log(`- content-creating requests, the last minute: ${pct(m.content, lim.content_per_minute)}`);
  log(`- content-creating requests, the last hour: ${pct(h.content, lim.content_per_hour)}`);
  log(`- pushes, the last hour: ${pct(h.pushes, p.pushes_per_hour)} of the process's own ceiling (PD-3; GitHub publishes none; each push starts its workflows, whose GITHUB_TOKEN has ${lim.actions_token_per_hour} requests an hour per repository)`);
  log(`- not counted here: ${lim.concurrent} concurrent requests (each session calls one at a time) and ${lim.cpu_seconds_per_minute} s of CPU a minute (GitHub's side)`);
  const pause = pauseOf(cwd, s);
  log(pause?.stopped ? `STOPPED: ${pause.why} at ${pause.at}, a refusal within an hour of an earlier one; the coordinator runs github resume` : pause && Date.parse(pause.until) > now ? `PAUSED until ${pause.until}: ${pause.why}` : 'no pause');
  const by = new Map();
  const since = now - 3600e3;
  for (const r of rows) if (Date.parse(r.at) > since && ['gh', 'push'].includes(r.kind)) { const k = r.session || '(no session id)'; const x = by.get(k) || { session: k, calls: 0, content: 0, pushes: 0 }; if (r.kind === 'gh') { x.calls++; x.content += contentOf(r); } else x.pushes++; by.set(k, x); }
  for (const u of s.use || []) if (Date.parse(u.minute) + 60e3 > since && u.session !== sessionId()) { const k = u.session || '(no session id)'; const x = by.get(k) || { session: k, calls: 0, content: 0, pushes: 0 }; x.calls += u.calls || 0; x.content += u.content || 0; x.pushes += u.pushes || 0; by.set(k, x); }
  for (const x of [...by.values()].sort((a, b) => b.calls - a.calls)) log(`  ${x.session}: ${x.calls} gh call(s), ${x.content} content-creating, ${x.pushes} push(es) in the hour`);
  return { minute: m, hour: h, primary: pr, pause: pause || null };
}
