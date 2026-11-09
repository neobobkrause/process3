// Shared helpers: running programs, git, GitHub through gh, config, arguments.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { backoff, commonDir, limitSignal, MAX_WAIT_MIN, PACING_DEFAULTS, pacingProblem, setPacing } from './pace.mjs';

// A step's whole output, kept: written to <dir>/<n>-<name>.log, its tail (the last max
// characters of stdout and of stderr) given to put, and, when cut, how many lines were left out
// and where the whole is (copy, 4 Nov: a 1,564-line walk report showed only its last 138 lines).
// These step-log directories (deploy's p3-deploy-*, release's p3-release-*) are kept on purpose,
// outside withTemp: they are the evidence the output names. Kept small: a log over STEP_LOG_MAX
// bytes keeps its tail and says how much went.
export const STEP_LOG_MAX = 4 * 1024 * 1024;
export function keepStep(dir, n, name, out, err, put, max = 20000) {
  const file = join(dir, `${String(n).padStart(2, '0')}-${name.replace(/[^\w.-]+/g, '-').slice(0, 60)}.log`);
  const whole = `${out}${err ? `\n--- stderr ---\n${err}` : ''}`;
  writeFileSync(file, whole.length > STEP_LOG_MAX ? `[${whole.length - STEP_LOG_MAX} characters left out before this tail]\n${whole.slice(-STEP_LOG_MAX)}` : whole);
  for (const [text, write] of [[out, put.out], [err, put.err]]) {
    if (!text.trim()) continue;
    if (text.length > max) put.note(`[${(text.slice(0, -max).match(/\n/g) || []).length} line(s) left out before this tail; the whole output is in ${file}]`);
    write(text.slice(-max));
  }
  if (out.trim() || err.trim()) put.note(`full output: ${file}`);
  return file;
}

export class Fail extends Error {}
// A refusal that means the write is no longer wanted on the state branch as it stands (another
// writer did its work: the idle check's "another check landed first"). Only these are dropped when
// met on a newer tip; any other refusal there is reported (state.mjs applyOne; cold review of C5).
export class Superseded extends Fail {}
export const fail = (msg) => { throw new Fail(msg); };

// Run a program. Never throws on a non-zero exit; returns code, stdout, stderr, seconds.
// Every process the tool starts, counted by command (C50: setup-speed.test bounds the setup check's
// git spawns, so a read per module, per commit or per row cannot creep back); `trace`, when set,
// is called with each (cmd, args).
export const SPAWNS = { counts: {}, trace: null };
export function run(cmd, args = [], opts = {}) {
  const t0 = Date.now();
  SPAWNS.counts[cmd] = (SPAWNS.counts[cmd] || 0) + 1;
  if (SPAWNS.trace) SPAWNS.trace(cmd, args);
  const env = { ...process.env, ...(opts.env || {}) };
  for (const k of opts.unset || []) delete env[k];
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd, env, encoding: opts.encoding === 'buffer' ? undefined : 'utf8', // 'buffer': stdout as bytes (git cat-file --batch)
    maxBuffer: opts.maxBuffer || 256 * 1024 * 1024, input: opts.input, timeout: opts.timeout,
  });
  return {
    code: r.status === null ? (r.error ? 127 : 1) : r.status,
    stdout: r.stdout || '', stderr: String(r.stderr || '') + (r.error ? String(r.error) : ''),
    seconds: (Date.now() - t0) / 1000, timedOut: r.error?.code === 'ETIMEDOUT',
  };
}

// The tool's git never carries a GitHub token, and never runs a hook or file monitor that
// product code may have written into .git/config while the gate ran it (review of build G).
export const NO_TOKENS = ['GH_TOKEN', 'GITHUB_TOKEN', 'ACTIONS_RUNTIME_TOKEN', 'ACTIONS_ID_TOKEN_REQUEST_TOKEN'];
const ANCESTRY = new Map();
export function git(args, opts = {}) {
  // A merge base read on history that holds it (C8, the coordinator, 7 Nov: BOB's layer lands failed
  // in a shallow checkout; the train deepened, the layer flow did not): `deepen: true` deepens a
  // shallow clone first. Asked by the layer flow's writes (publish, land, retest, sync, merge), whose
  // answer must be right; never by a read (cold review: a merge base of a commit long merged pulled
  // thousands of commits). shallow-mergebase.test holds every merge-base to asking or to a named
  // reason. An is-ancestor is settled below instead, for every caller.
  const ancQ = args[0] === 'merge-base' && args[1] === '--is-ancestor' && args.length === 4 && opts.cwd;
  if (args[0] === 'merge-base' && opts.deepen && opts.cwd && !ancQ) deepenForBase(args, opts.cwd);
  const once = () => run('git', ['-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=/dev/null', ...args], { ...opts, unset: [...NO_TOKENS, ...(opts.unset || [])] });
  // An exact answer to an is-ancestor of two commits by id never changes (C50: the copy's setup check
  // asked each closed layer's commit against main two or three times, each a shallow clone's settle).
  // Kept per process, keyed by the clone and both ids; a name (a ref) is never kept, since it moves.
  const memoKey = ancQ && SHA.test(String(args[2])) && SHA.test(String(args[3])) ? `${resolve(opts.cwd)}\0${args[2]}\0${args[3]}` : null;
  // A kept no answers only a caller that takes failures (allowFail) and does not read the cut itself;
  // any other caller asks git again, as before (cold review of C50).
  if (memoKey && ANCESTRY.has(memoKey) && (ANCESTRY.get(memoKey).code === 0 || (opts.allowFail && !opts.cut))) return opts.allowFail ? ANCESTRY.get(memoKey) : ANCESTRY.get(memoKey).stdout.replace(/\n$/, '');
  let r = once();
  // An is-ancestor that answers no in a shallow clone is the cut's answer, not the history's (C8, the
  // coordinator, 7 Nov: in a --depth 1 copy clone `layer status 9` read 8 modules as rescheduled,
  // the provider's land hidden behind the cut). Its no stands only when it is exact; else the clone
  // deepens until it is, and a deepen that fails refuses the command (allowFail or not), never
  // answering no. Every ancestry check in the tool asks here.
  // `cut: true`: a caller that judges a shallow clone itself and reads the cut's no as "not vouched"
  // (report tranche: unmeasured); shallow-mergebase.test holds each such caller to a named reason.
  if (ancQ && r.code !== 0 && !opts.cut && settleAncestry(args.slice(2), opts.cwd)) r = once();
  if (ancQ && memoKey && (r.code === 0 || (r.code === 1 && !opts.cut))) ANCESTRY.set(memoKey, r);
  if (r.code !== 0 && !opts.allowFail) fail(`git ${args.join(' ')} failed: ${r.stderr.trim()}${lockNote(r.stderr, opts.cwd)}`);
  return opts.allowFail ? r : r.stdout.replace(/\n$/, '');
}
// In a shallow clone, a merge base asked of commits whose common history the cut hides: the clone
// deepened (doubling, from 64, then whole) until the commits meet or it is shallow no more, then
// marked deep (DEEP_MARK) so the next fetch does not cut it back to one commit (cold review). Commits
// the clone does not hold at all are left to git's own answer. A fetch that fails is said, with the
// lock note when a git lock caused it, never left to a merge base failing with no reason.
const runGit = (args, cwd) => run('git', ['-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=/dev/null', ...args], { cwd, unset: NO_TOKENS });
export function deepenForBase(args, cwd) {
  const revs = args.slice(1).filter((x) => !String(x).startsWith('-'));
  if (revs.length < 2) return;
  if (runGit(['rev-parse', '--is-shallow-repository'], cwd).stdout.trim() !== 'true') return;
  if (revs.some((r) => runGit(['cat-file', '-e', `${r}^{commit}`], cwd).code !== 0)) return;
  const meet = () => runGit(['merge-base', ...revs], cwd).code === 0;
  let deepened = false;
  for (let n = 64; !meet(); n *= 2) {
    if (!isShallowAt(cwd)) break;
    const moved = deepenOnce(cwd, n > 4096 ? ['--unshallow'] : [`--deepen=${n}`], `this clone is shallow and its history for a merge base of ${revs.join(' ')} lies past its cut`);
    deepened = true;
    if (n > 4096 || !moved) break; // whole, or origin holds no more (a shallow origin): git answers on what there is
  }
  if (deepened) runGit(['config', DEEP_MARK, 'true'], cwd);
}
// One deepening fetch of a shallow clone; true when it changed
// the cut. A fetch that fails refuses with `why`. (Cold review of the C8 ancestry fix: an origin itself
// shallow left --unshallow changing nothing, and a loop asking again never ended.)
const cutOf = (cwd) => { const f = runGit(['rev-parse', '--git-path', 'shallow'], cwd).stdout.trim(); try { return readFileSync(resolve(cwd, f), 'utf8'); } catch { return ''; } };
function deepenOnce(cwd, how, why) {
  const before = cutOf(cwd);
  const args = ['fetch', '-q', ...how, 'origin'];
  let f = runGit(args, cwd);
  // A deepen refused on a cut another fetch made (--shallow-exclude: "error in object: unshallow"):
  // the whole history once, before refusing.
  if (f.code !== 0 && how[0] !== '--unshallow' && /error in object: unshallow/.test(f.stderr)) {
    f = runGit(['fetch', '-q', '--unshallow', 'origin'], cwd);
  }
  if (f.code !== 0) fail(`${why}; that history could not be fetched (git fetch: ${f.stderr.trim().split('\n').pop()})${lockNote(f.stderr, cwd)}; nothing was answered: run it again, or deepen the clone (git fetch --unshallow origin)`);
  return cutOf(cwd) !== before;
}
// Whether is-ancestor's no for a b is the history's: the clone is not shallow; or a or b is not a commit
// the clone holds and origin does not serve it either (a name the clone cannot resolve, or a full sha
// a fetch of it by name does not bring: an unmerged PR's merge, a force-pushed commit); or no commit
// b reaches past a is a shallow one, the only places a could hide behind the cut (a path from b down
// to a meets its first shallow commit before a, and a commit on that path is not reachable from a).
const SHA = /^[0-9a-f]{40}$/;
const isShallowAt = (cwd) => runGit(['rev-parse', '--is-shallow-repository'], cwd).stdout.trim() === 'true';
const holds = (x, cwd) => runGit(['cat-file', '-e', `${x}^{commit}`], cwd).code === 0;
// A full sha the shallow clone lacks, fetched by itself (one commit, not the whole history): true when
// the clone then holds it. A sha origin will not serve is left to git's own answer.
function fetchSha(x, cwd) {
  if (holds(x, cwd)) return true;
  if (!SHA.test(String(x))) return false;
  const args = ['fetch', '-q', '--depth=1', 'origin', x];
  const f = runGit(args, cwd);
  if (f.code === 0) return holds(x, cwd);
  // Origin answered that it does not serve the sha: absent there too, so git's answer stands. Any
  // other failure (origin unreachable, a lock) is no answer at all: refused.
  if (/not our ref|couldn't find remote ref|no such remote ref|not a valid object|unadvertised object/i.test(f.stderr)) return false;
  fail(`this clone is shallow and lacks ${x}, which could not be fetched (git fetch: ${f.stderr.trim().split('\n').pop()})${lockNote(f.stderr, cwd)}; nothing was answered: run it again, or deepen the clone (git fetch --unshallow origin)`);
}
function ancestryExact([a, b], cwd) {
  if (!isShallowAt(cwd)) return true;
  if (!holds(b, cwd) || !holds(a, cwd)) return true;
  const cut = new Set(cutOf(cwd).split('\n').filter(Boolean));
  const past = runGit(['rev-list', b, '--not', a], cwd);
  return past.code === 0 && !past.stdout.split('\n').some((c) => cut.has(c));
}
// Deepens a shallow clone (doubling from 64, then whole) until is-ancestor a b is exact; marks it deep
// (DEEP_MARK). A failed fetch refuses, and so does a deepen that leaves the answer unexact and the cut
// unchanged (origin itself shallow). True when it fetched, so the caller asks again.
export function settleAncestry(revs, cwd) {
  if (!isShallowAt(cwd)) return false;
  const lacked = revs.filter((x) => !holds(x, cwd));
  const got = lacked.filter((x) => fetchSha(x, cwd));
  let deepened = false;
  const why = `this clone is shallow and cannot tell whether ${revs[1]} holds ${revs[0]} without more history`;
  for (let n = 64; !ancestryExact(revs, cwd); n *= 2) {
    const whole = n > 4096;
    const moved = deepenOnce(cwd, whole ? ['--unshallow'] : [`--deepen=${n}`], why);
    deepened = true;
    if ((!moved || whole) && !ancestryExact(revs, cwd)) fail(`${why}: origin holds no more of it (a shallow origin); nothing was answered`);
  }
  if (deepened) runGit(['config', DEEP_MARK, 'true'], cwd);
  return deepened || got.length > 0;
}
// A git lock left in a clone (copy, 5 Nov: BOB's review worker deepened, notice triage and a job
// start ran git at once in one shallow clone: "shallow file has changed", a stale shallow.lock,
// no job started). Said plainly: whether a git process still runs in this clone, and if none,
// that the lock is stale and which file to remove. procs: the git processes' working directories.
export function lockNote(stderr, cwd, { procs = gitCwds } = {}) {
  const lock = /Unable to create '([^']+\.lock)': File exists/.exec(String(stderr || ''))?.[1];
  const raced = /shallow file has changed since we read it/.test(String(stderr || ''));
  if (!lock && !raced) return '';
  let top = null;
  try { top = realpathSync(execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()); } catch { top = null; }
  const seen = top ? procs() : null;
  const live = seen ? seen.filter((d) => d === top || d.startsWith(`${top}/`)).length : null;
  const one = 'one git user per clone at a time: review and triage workers run git in clones of their own';
  if (!lock) return `. Another git command changed this clone's shallow file while this one ran (${one}); run this again once it ends`;
  if (live) return `. ${live} other git process${live === 1 ? '' : 'es'} still run${live === 1 ? 's' : ''} in this clone and hold${live === 1 ? 's' : ''} ${lock} (${one}); run this again once ${live === 1 ? 'it ends' : 'they end'}`;
  if (live === 0) return `. No git process runs in this clone, so ${lock} is stale, left by a git command that was killed: remove it (rm '${lock}') and run this again (${one})`;
  return `. ${lock} is held by another git command in this clone or left by a killed one (${one}); if none runs, remove it and run this again`;
}
// The working directories of the git processes running now (Linux /proc; null where unread).
function gitCwds() {
  const out = [];
  let pids = [];
  try { pids = readdirSync('/proc').filter((n) => /^\d+$/.test(n) && Number(n) !== process.pid); } catch { return null; }
  for (const pid of pids) {
    try { if (readFileSync(`/proc/${pid}/comm`, 'utf8').trim() === 'git') out.push(realpathSync(`/proc/${pid}/cwd`)); } catch { /* gone, or not ours */ }
  }
  return out;
}

// Whether a path exists at a commit, read from the tree alone: in a partial clone this fetches
// nothing, so "absent" is never confused with "could not fetch".
export const exists = (root, rev, path) => git(['rev-parse', '-q', '--verify', `${rev}:${path}`], { cwd: root, allowFail: true }).code === 0;

// Many objects in one git cat-file --batch (C50: the copy's setup check read the state branch's
// layer rows, the ledger and the approvals history one git show each, thousands of spawns). specs:
// object names git cat-file takes ("<rev>:<path>" or an id), none with a newline. A Map spec to its
// bytes as a utf8 string, exactly as git show prints a blob; a spec git cannot find, or that names no
// blob, is absent from the Map. null when the batch itself fails.
export function catBatch(root, specs) {
  const out = new Map();
  const list = [...new Set(specs)].filter((x) => x && !/[\n\r]/.test(x));
  if (!list.length) return out;
  const r = run('git', ['-c', 'core.fsmonitor=false', 'cat-file', '--batch'], { cwd: root, input: list.join('\n') + '\n', encoding: 'buffer', unset: NO_TOKENS });
  if (r.code !== 0) return null;
  const buf = Buffer.isBuffer(r.stdout) ? r.stdout : Buffer.from(r.stdout);
  let at = 0;
  for (const spec of list) {
    const nl = buf.indexOf(10, at);
    if (nl < 0) return null;
    const head = buf.subarray(at, nl).toString('utf8');
    // "<id> <type> <size>", or "<spec> missing" / "<spec> ambiguous" (no body).
    const m = head.match(/^[0-9a-f]{40,64} (\w+) (\d+)$/);
    if (!m) { at = nl + 1; continue; }
    const size = Number(m[2]);
    if (m[1] === 'blob') out.set(spec, buf.subarray(nl + 1, nl + 1 + size).toString('utf8'));
    at = nl + 1 + size + 1;
  }
  return out;
}
// Which of revs name a commit this clone holds, in one cat-file --batch-check: a Set of revs.
export function haveCommits(root, revs) {
  const list = [...new Set(revs)].filter((x) => x && !/[\n\r]/.test(x));
  if (!list.length) return new Set();
  const r = run('git', ['-c', 'core.fsmonitor=false', 'cat-file', '--batch-check'], { cwd: root, input: list.map((x) => `${x}^{commit}`).join('\n') + '\n', unset: NO_TOKENS });
  if (r.code !== 0) return new Set();
  const lines = r.stdout.split('\n');
  return new Set(list.filter((x, i) => / commit \d+$/.test(lines[i] || '')));
}
// Every blob under dirs at ref, path to text, in two git calls: one ls-tree -r, one cat-file --batch.
// An empty Map when ref or the dirs are not there (as ls-tree failing read before); null when the
// batch fails (the caller reads one by one).
export function treeBlobs(root, ref, dirs) {
  const t = git(['ls-tree', '-r', '-z', ref, '--', ...dirs], { cwd: root, allowFail: true });
  if (t.code !== 0) return new Map();
  const list = t.stdout.split('\0').map((l) => l.match(/^\d+ blob ([0-9a-f]+)\t([\s\S]+)$/)).filter(Boolean).map((m) => [m[1], m[2]]);
  const got = catBatch(root, list.map(([sha]) => sha));
  if (got === null) return null;
  return new Map(list.filter(([sha]) => got.has(sha)).map(([sha, path]) => [path, got.get(sha)]));
}

// GitHub through the gh CLI (measured route, platform row 14). Returns parsed JSON or text.
// A call GitHub refuses for a rate limit, or answers with a 5xx while a limit is at the target, backs
// off (pace.mjs backoff, PD-22): waited out and made again when GitHub did not act on it (a refusal),
// up to MAX_WAIT_MIN; longer, or after a 5xx (a write may have landed), it refuses, naming when to rerun.
export function ghRun(args, opts = {}, { read, now = Date.now, sleep = pause, log = (m) => console.error(m) } = {}) {
  for (let t = 1; ; t++) {
    const r = run('gh', args, opts);
    if (r.code === 0) return r;
    const b = backoff(r.stderr, opts.cwd, { ...(read ? { read } : {}), now: now() });
    if (!b) return r;
    const ms = b.until - now();
    const when = new Date(b.until).toISOString().replace(/\.\d+Z$/, 'Z');
    if (!b.retry || t >= 3 || ms > MAX_WAIT_MIN * 60e3) fail(`gh ${args.slice(0, 2).join(' ')}: ${b.why}; run this again after ${when}, never before (P27)`);
    log(`gh ${args.slice(0, 2).join(' ')}: ${b.why}; waiting ${Math.ceil(ms / 1000)} s, then once more`);
    sleep(ms);
  }
}
export function gh(args, opts = {}) {
  const r = ghRun(args, { input: opts.input, cwd: opts.cwd });
  if (r.code !== 0 && !opts.allowFail) fail(`gh ${args.slice(0, 3).join(' ')} failed: ${(r.stderr || r.stdout).trim()}`);
  if (opts.allowFail && r.code !== 0) return null;
  const s = r.stdout.trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch { return s; }
}

// A shallow clone (clone_depth on create_session): its history is cut, so a full fetch of a
// branch pulls that branch's whole history (90 s measured 3 Nov), and a local merge base or
// count of commits between two branches can be wrong. Fetches there take --depth 1.
export const isShallow = (root) => git(['rev-parse', '--is-shallow-repository'], { cwd: root, allowFail: true }).stdout.trim() === 'true';
// A shallow clone whose history was fetched deeper on purpose (the merge train's: the tranche past
// main) carries this mark; a --depth 1 fetch there would cut that history back to one commit, so
// its fetches take no depth (build/starter-fixes, 5 Nov).
export const DEEP_MARK = 'p3.deep';
export const markedDeep = (root) => git(['config', '--get', DEEP_MARK], { cwd: root, allowFail: true }).stdout.trim() === 'true';
export const depth = (root) => (isShallow(root) && !markedDeep(root) ? ['--depth', '1'] : []);
// The commits a shallow clone's history is cut at (empty in a full clone).
export function shallowCuts(root) {
  const f = git(['rev-parse', '--git-path', 'shallow'], { cwd: root, allowFail: true }).stdout.trim();
  try { return new Set(readFileSync(resolve(root, f), 'utf8').split('\n').map((x) => x.trim()).filter(Boolean)); } catch { return new Set(); }
}
// Job heads fetched. In a shallow clone, only their commits main lacks: a plain fetch of a head cut
// from a commit the clone lacks pulls main's whole history (1.2 GB on the copy). A head main holds
// whole (git selects no commit) is fetched at its tip alone: main's commits are not on the
// tranche's history past main, so that cut cuts nothing read there. Any other failure fetches
// nothing more (never a depth after a network error). True when every ref was fetched.
export function fetchJobRefs(root, refs, main = 'main') {
  const spec = (ref) => `+refs/heads/${ref}:refs/remotes/origin/${ref}`;
  const run = (args, rs) => git(['fetch', '-q', ...args, 'origin', ...rs.map(spec)], { cwd: root, allowFail: true });
  if (!refs.length) return true;
  if (!isShallow(root)) return run([], refs).code === 0;
  const all = run([`--shallow-exclude=${main}`], refs);
  if (all.code === 0) return true;
  if (!/no commits selected/.test(all.stderr) && refs.length === 1) return false;
  let ok = true;
  for (const ref of refs) {
    const one = refs.length === 1 ? all : run([`--shallow-exclude=${main}`], [ref]);
    if (one.code === 0) continue;
    if (/no commits selected/.test(one.stderr)) ok = run(['--depth=1'], [ref]).code === 0 && ok;
    else ok = false;
  }
  return ok;
}
// within (ms, a read's choice: C18, 7 Nov, branch fetches the biggest kind of an hour's 912): the
// clone's copy serves when any p3 process of the clone fetched the branch that recently and the
// ref is still what that fetch left. Without it, a fetch, as ever.
export function fetchBranch(root, branch, { within = 0, ...opts } = {}) {
  const stamp = join(commonDir(root), 'p3-gh-cache', `branch-${String(branch).replace(/[^\w.-]/g, '_')}.json`);
  const tip = () => git(['rev-parse', '-q', '--verify', `refs/remotes/origin/${branch}^{commit}`], { cwd: root, allowFail: true }).stdout.trim() || null;
  if (within > 0) { try { const s = JSON.parse(readFileSync(stamp, 'utf8')); if (s.at <= Date.now() && Date.now() - s.at < within && s.tip && s.tip === tip()) return opts.allowFail ? { code: 0, stdout: '', stderr: '', seconds: 0, timedOut: false, kept: true } : ''; } catch { /* fetch */ } }
  const r = git(['fetch', '-q', ...depth(root), 'origin', `+refs/heads/${branch}:refs/remotes/origin/${branch}`], { cwd: root, ...opts });
  if (!opts.allowFail || r.code === 0) { try { mkdirSync(dirname(stamp), { recursive: true }); writeFileSync(stamp, JSON.stringify({ at: Date.now(), tip: tip() })); } catch { /* a saving */ } }
  return r;
}

export function repoRoot(cwd = process.cwd()) {
  return git(['rev-parse', '--show-toplevel'], { cwd });
}

// owner/name of the repository: GITHUB_REPOSITORY in CI, else parsed from origin.
export function repoSlug(root) {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const url = git(['remote', 'get-url', 'origin'], { cwd: root });
  const m = url.replace(/\.git$/, '').match(/([^/:]+)\/([^/]+)$/);
  if (!m) fail(`cannot read owner/name from origin ${url}`);
  return `${m[1]}/${m[2]}`;
}

export const DEFAULTS = {
  // GitHub's published limits (P27, PD-22; pace.mjs): the share of them used, and the poll cadence.
  pacing: { ...PACING_DEFAULTS },
  tranche: 'tranche',
  records: ['process/'],
  transient: [],
  max_file_bytes: 1048576,
  approvals: { file: 'CLAUDE.md', heading: '## Standing approvals from Bob', owner: 'neobobkrause' },
  lockfiles: [],
  node: null,
  coordinator: null,
  state_branch: 'process-state',
  // status --role bob --context <percent>: REFRESH at this share of the window (SES-4).
  refresh_context: 60,
  reading_bob: ['CLAUDE.md'],
  // The plan: run, pause or stop. The job cap is not a config key: jobCap reads it.
  plan: 'run',
  // The merge strategy (design note "Shared Layer Branch", Bob, 5 Nov; the merge train removed, Bob,
  // 6 Nov): "layer", the only flow: a job publishes onto its layer's branch layer/<n>, which merges
  // into the tranche once (layerflow.mjs). Absent reads as "layer"; any other value is refused.
  merge_strategy: 'layer',
  // status --role bob: where the requirement files that give BOB its next work live, and the
  // layer map that says which of them are open (its lowest layer not yet closed).
  requirements_dir: 'build/requirements',
  layers_file: 'build/layers.md',
  // status --role bob: how next work opens past the open layer. "uses": also every module whose
  // providers (its `uses` in modules_file) are all done; "layer": the open layer's modules only.
  open_by: 'uses',
  // The requirements cap (Build Plan, Phase 3; REQ-6, P6): a module's requirement file over this
  // many bytes is BOB's to split or consolidate before its job opens, a trigger, never a refusal.
  // Provisional, from layers 1 to 6 of the product's tranche (3 Nov: 109 files, median 32,829,
  // 90th percentile 71,128, max 137,301); the real number is set at the gate.
  // requirements_cap_marks: optionally, the same for the count of unmet marks; null, none.
  requirements_cap: 70000,
  requirements_cap_marks: null,
  // notice triage: one worker's share of the user modules, by the bytes of their code at the
  // tranche tip and by count; a list over either is split into briefs run in parallel (the copy,
  // 4 Nov: one worker given 108 modules judged only part of them).
  triage_share_bytes: 250000,
  triage_share_modules: 25,
  // Added to every create_session call the tool prints: the shallow clone (measured 3 Nov, a
  // full clone stalled a ROOT for over 15 minutes). No blob_limit_kb: it left a 5.2 MB source
  // file out of the checkout and nothing fetched it when node read it. null leaves it out.
  clone: { clone_depth: 1 },
  // start check (SHM-5): the product's setup script, argv, run once per container; none by default.
  setup_script: null,
  // Lanes (SES-14): each a name and the product's directory of its design knowledge, and
  // optionally its ledger "module", whose job is then the lane's one session (lane.mjs). The UX
  // lane is always there; the product names its directory. completion_file (PLN-4): none by default.
  lanes: [{ name: 'ux', dir: null }],
  completion_file: null,
  // census: the job situation file (C41), build/situations/job.md until the product moves it
  // (layout move) to process/situations.
  situations_dir: 'build/situations',
  setup_timeout_minutes: 15,
  // Targets in minutes. decision_minutes: the escalation chain (coordinator, 4 Nov, for Bob's "urgency is fully supported"): job to BOB to ROOT to
  // watcher to Bob, each step waiting this long for an answer before the next is asked.
  // replace_minutes: status --role bob --sessions flags a job whose session is idle with no push
  // this long (measured 3-4 Nov: a stopped job was flagged only after two hours). All four are
  // also the lead times' proposed targets (metrics report, report tranche), each figure beside its own.
  targets: { start_minutes: 10, merge_minutes: 15, decision_minutes: 30, replace_minutes: 30 },
};


// open_by values (status --role bob): "uses" the default, "layer" the old behaviour.
export const OPEN_BY = ['uses', 'layer'];

// A requirement mark (P7), the one parser every count and check uses (job complete's struck
// marks, status and its layers, layer close, the report, the requirements cap). A requirement
// line starts with `**R<id>**` (or a found mark `**F<n>**`, the route for work found elsewhere) (after any indent and one list marker: `- `, `* `, `1. `); it is
// unmet when it holds the exact mark `*(not yet met` anywhere on that line: right after the id
// (`**R36** *(not yet met: T40)*`), after a parenthetical (`**R23** (T53; DEC-151 (2)) *(not
// yet met: T53)*`, PR 74), or at its end after the bold title (`**R127** (T53) **A piece is
// read in bounds.** ... *(not yet met: T53)*`, 332 more marks on the copy's tranche, 4 Nov; the coordinator's
// ruling under P17). A mark on one of the requirement's sub-lines is its too (C24, the coordinator,
// 7 Nov: record-core's R92, layer 11, carries its mark on its indented `Control:` line, so
// `layer publish --test R92` was refused as no mark struck): a sub-line is a non-blank line right
// under it, indented, that is not itself a requirement line (`  1. ...`, `  Test: ...`,
// `  Control: ...`), blank lines between them included (a loose list item's next paragraph: the
// copy's journey-check R13 and installer R48, cold review of C24). An unindented line or another
// requirement line ends it. So an indented note under a requirement is that requirement's, mark and
// all, even one naming another id. Prose is never read: a line not starting with an id and under
// none, or the words outside that italic form. A line ends at \n or \r (review of PR 77).
const REQ_LINE = new RegExp(String.raw`^[ \t]*(?:[-*+][ \t]+|\d+\.[ \t]+)?\*\*([RF][\w.-]+)\*\*`);
const MARK_TEXT = '*(not yet met';
// Every requirement, its id and its text (its line and sub-lines), in file order.
export function requirementBlocks(text) {
  const blocks = [];
  let cur = null;
  for (const l of String(text || '').split(/\r\n|\r|\n/)) {
    const m = REQ_LINE.exec(l);
    if (m) { cur = { id: m[1], text: l }; blocks.push(cur); continue; }
    if (cur && /^[ \t]+\S/.test(l)) { cur.text += `\n${l}`; continue; }
    if (cur && /^[ \t]*$/.test(l)) continue;
    cur = null;
  }
  return blocks;
}
// Every requirement's id, and those still unmet, in file order.
export function requirementMarks(text) {
  const blocks = requirementBlocks(text);
  return { all: blocks.map((b) => b.id), unmet: blocks.filter((b) => b.text.includes(MARK_TEXT)).map((b) => b.id) };
}
export const unmetIds = (text) => requirementMarks(text).unmet;
// A mark id, met or not, as the struck-mark --test and the report read it.
export const MARK_ID = /^[RF][\w.-]+$/;
// A found mark, met or not, by number (found's numbering).
export const FOUND_MARK = /\*\*F(\d+)\*\*/g;
export const isFound = (id) => /^F\d+$/.test(String(id));

// The requirements cap (REQ-6): the line that names a requirement file over requirements_cap
// bytes, or over requirements_cap_marks unmet marks, as BOB's to split or consolidate before its
// job; null when it is under both. A trigger, never a refusal: job start takes --over-cap.
export function overCap(cfg, file, text) {
  if (text === null || text === undefined) return null;
  const bytes = Buffer.byteLength(text);
  const marks = unmetIds(text).length;
  // A number written as a string ("70000") is the same cap; null or empty sets none.
  const num = (v) => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : fail(`requirements cap ${JSON.stringify(v)} in process/config.json is not a number`));
  const cap = num(cfg.requirements_cap);
  const capMarks = num(cfg.requirements_cap_marks);
  const why = [];
  if (typeof cap === 'number' && bytes > cap) why.push(`${bytes} over ${cap}`);
  if (typeof capMarks === 'number' && marks > capMarks) why.push(`${marks} unmet marks over ${capMarks}`);
  return why.length ? `split or consolidate before its job: ${file} ${why.join(', ')}` : null;
}

// A product's process subtree (C41, Bob 8 Nov: "a process3-specific subtree"): process/, the
// directory that holds config.json. Not a config key: the config is found by it, and the shims read
// it there. Process-only content the tool reads lives under it, or at the path a config key names
// until the product moves it (layout move).
export const PROCESS_DIR = 'process';
export const CONFIG_FILE = `${PROCESS_DIR}/config.json`;
export const LEDGER_DIR = `${PROCESS_DIR}/ledger`;
export const METRICS_DIR = `${PROCESS_DIR}/metrics`;
export const FOUND_DIR = `${PROCESS_DIR}/found`;

// One repository per session (BD-R2, C42; PD-13 measured that a session started with more than one
// repository loads no repository's .claude/settings.json, PLT-7). Every create_session call the
// tool prints is built here and checked here: exactly one source repository, by source_url, and
// no key that carries another. A start that bypassed this would print a call checkCall refuses;
// tool/test/session-call.test.mjs fails on any source_url written outside this file.
// A key that could carry a second repository: sources, repos, repositories, or any url but
// source_url itself (anchored, cold review: report_url-like words are not refused by accident).
const REPO_KEY = /^(sources?|repos?|repositor(y|ies)|urls?|.*_urls?)$/i;
const ONE_REPO = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
export function checkCall(call) {
  const why = 'one repository per session (BD-R2; PD-13: a session started with more than one loads no repository\'s .claude/settings.json)';
  if (call === null || typeof call !== 'object' || Array.isArray(call)) fail(`a create_session call is an object; ${why}`);
  const extra = Object.keys(call).filter((k) => k !== 'source_url' && k !== 'source_revision' && REPO_KEY.test(k));
  if (extra.length) fail(`a create_session call with ${extra.join(', ')} was not printed: ${why}; it names its one repository by source_url only`);
  if (typeof call.source_url !== 'string' || !ONE_REPO.test(call.source_url)) fail(`a create_session call names exactly one repository as https://github.com/<owner>/<repo>, not ${JSON.stringify(call.source_url)}: ${why}`);
  return call;
}
// The create_session call for one repository, its keys in the order the tool has always printed them.
export function sessionCall({ slug, revision, title, prompt, model = null, clone = null }) {
  if (typeof slug !== 'string' || slug.split('/').length !== 2) fail(`a create_session call names one repository as <owner>/<repo>, not ${JSON.stringify(slug)}`);
  // The product's clone settings never replace the call's own keys (cold review: a clone row with a
  // source_url or source_revision would have swapped the repository or the revision).
  const own = new Set(['title', 'source_url', 'source_revision', 'model', 'prompt']);
  const opts = Object.fromEntries(Object.entries(clone || {}).filter(([k]) => !own.has(k)));
  return checkCall({ title, source_url: `https://github.com/${slug}`, source_revision: revision, ...opts, ...(model ? { model } : {}), prompt });
}

// The first key that appears twice in one object of a JSON text already known to parse; null
// when none. JSON.parse keeps the last, so a diff that adds a duplicate above a key changes
// nothing alone and changes the value once another diff, merged line by line, removes the key
// below it (second confirming review of PR 97): the config is never read with one.
export function duplicateKey(text) {
  const stack = [];
  let key = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      let j = i + 1;
      while (text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      const top = stack.at(-1);
      if (key && top instanceof Set) {
        const k = JSON.parse(text.slice(i, j + 1));
        if (top.has(k)) return k;
        top.add(k);
        key = false;
      }
      i = j;
    } else if (ch === '{') { stack.push(new Set()); key = true; }
    else if (ch === '[') { stack.push(null); key = false; }
    else if (ch === '}' || ch === ']') stack.pop();
    else if (ch === ',') key = stack.at(-1) instanceof Set;
  }
  return null;
}
// JSON.parse, refusing a key that appears twice in one object.
export function parseJSON(text) {
  const v = JSON.parse(text);
  const d = duplicateKey(text);
  if (d !== null) throw new SyntaxError(`the key ${JSON.stringify(d)} appears twice in one object`);
  return v;
}

// process/config.json in the product; every field optional. With a ref, read from that commit:
// a check reads its config from the trusted base, never from the change it judges.
export function loadConfig(root, ref) {
  let text = null;
  if (ref) {
    if (exists(root, ref, CONFIG_FILE)) text = git(['show', `${ref}:${CONFIG_FILE}`], { cwd: root });
  } else if (existsSync(join(root, CONFIG_FILE))) text = readFileSync(join(root, CONFIG_FILE), 'utf8');
  let c = {};
  try { c = text ? parseJSON(text) : {}; } catch (e) { fail(`${CONFIG_FILE}${ref ? ` at ${ref}` : ''} is not JSON: ${e.message}`); }
  if (c === null || typeof c !== 'object' || Array.isArray(c)) fail(`${CONFIG_FILE}${ref ? ` at ${ref}` : ''} is not a JSON object`);
  return configOf(c, `${CONFIG_FILE}${ref ? ` at ${ref}` : ''}`);
}

// A config object as the tool reads it: the defaults with its keys over them, checked.
export function configOf(c, where = CONFIG_FILE) {
  // A generated path and a records path never overlap: a record is trusted as inert, so a
  // generated file under one would escape the gate's regenerate (review 4 of PR 95).
  const recs = Array.isArray(c.records) ? c.records : DEFAULTS.records;
  const strip = (p) => String(p).replace(/^\.\//, '');
  for (const row of Array.isArray(c.generated) ? c.generated : []) for (const g of Array.isArray(row?.paths) ? row.paths : []) {
    const r = recs.find((x) => typeof x === 'string' && (underPath(strip(g), strip(x)) || underPath(strip(x), strip(g))));
    if (r !== undefined) fail(`${where}: the generated path ${g} and the records path ${r} overlap; a generated file is never a record`);
  }
  const pp = pacingProblem(c.pacing);
  if (pp) fail(`${where}: ${pp}`);
  setPacing(c.pacing);
  const ms = c.merge_strategy ?? DEFAULTS.merge_strategy;
  if (ms !== 'layer') fail(`${where}: merge_strategy ${JSON.stringify(c.merge_strategy)}: the merge train was removed (Bob, 6 Nov); the shared layer branch is the only flow, so set "merge_strategy": "layer" or leave the key out`);
  return {
    ...DEFAULTS, ...c,
    // A null tranche is the default one, as the anchor reads it (second confirming review of PR 97).
    tranche: c.tranche ?? DEFAULTS.tranche,
    approvals: { ...DEFAULTS.approvals, ...(c.approvals || {}) },
    targets: { ...DEFAULTS.targets, ...(c.targets || {}) },
    pacing: { ...DEFAULTS.pacing, ...(c.pacing || {}) },
  };
}

// The job cap (Bob, 4 Nov): the job sessions running at once across the whole account, every
// product (list_sessions is account-scoped); roles, builds and other sessions are not counted. One
// value per account, P3_JOB_CAP in the account's cloud environment, default 20. The one place the
// cap is read: job start, status, the sweep and lead times call this and nothing else.
// A product config's old live_cap (or job_cap) is ignored, with a note saying so. Empty is unset.
export const JOB_CAP_VAR = 'P3_JOB_CAP';
const JOB_CAP_DEFAULT = 20;
export function jobCap(cfg = {}, env = process.env) {
  const raw = env[JOB_CAP_VAR];
  const set = raw !== undefined && raw !== '';
  const cap = set ? (/^\d+$/.test(String(raw).trim()) ? Number(raw) : NaN) : JOB_CAP_DEFAULT;
  if (!Number.isInteger(cap) || cap < 1) fail(`${JOB_CAP_VAR}=${JSON.stringify(raw)}: the job cap is a whole number of job sessions, 1 or more; the account owner sets it in the environment's variables, or leaves it unset for ${JOB_CAP_DEFAULT}`);
  const old = ['live_cap', 'job_cap'].filter((k) => cfg[k] !== undefined);
  // pacing.jobs (an R17 cap set as GitHub pacing) is retired by PD-6: ignored, with a note; the
  // budget of GitHub's published limits throttles (pace.mjs).
  if (cfg.pacing?.jobs !== undefined && cfg.pacing?.jobs !== null) old.push('pacing.jobs (PD-6: no session cap set as GitHub pacing)');
  const from = set ? JOB_CAP_VAR : 'default';
  return {
    cap, from, line: `job cap ${cap} (${from})`,
    note: old.length ? `${CONFIG_FILE}: ${old.join(', ')} ignored; the job cap now comes from ${JOB_CAP_VAR} (default ${JOB_CAP_DEFAULT})` : null,
  };
}
// The cap a sweep row recorded (job_cap; live_cap in rows written before 4 Nov).
export const rowCap = (r) => r.job_cap ?? r.live_cap;

// A path entry ending in / is a directory; any other names a file or a directory.
export const underPath = (file, p) => file === p || file.startsWith(p.endsWith('/') ? p : `${p}/`);

export const isRecordPath = (cfg, f) => cfg.records.some((r) => underPath(f, r));

// A lane's checks (coordinator, 6 Nov: a broken words build landed green, ux lane Q7): the commands
// its lanes row declares, each a string (split on spaces) or an argv list, run by the gate on a
// lane-only pull request in place of the suite. [] when none; null for a row that is not lists of words.
// A command line's words, with "..." and '...' kept whole (no shell runs them); null when a quote is open.
function words(line) {
  const out = [];
  let cur = null;
  let q = null;
  for (const ch of String(line)) {
    if (q) { if (ch === q) q = null; else cur += ch; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur ??= ''; continue; }
    if (/\s/.test(ch)) { if (cur !== null) out.push(cur); cur = null; continue; }
    cur = (cur ?? '') + ch;
  }
  if (q) return null;
  if (cur !== null) out.push(cur);
  return out;
}
export function laneChecks(cfg, name) {
  const l = (Array.isArray(cfg?.lanes) ? cfg.lanes : []).find((x) => typeof x?.name === 'string' && x.name.trim() === name);
  if (!l || l.checks === undefined) return [];
  if (!Array.isArray(l.checks)) return null;
  const out = l.checks.map((c) => (typeof c === 'string' ? words(c) : Array.isArray(c) && c.every((w) => typeof w === 'string') ? c : null));
  return out.some((c) => !c || !c.length) ? null : out;
}
// Lanes' folders (lane.mjs; Bob, 5 Nov 17:45: "I don't believe that lanes' file changes need to be tested the way jobs do").
// A lane's folder is its config "dir"; one at the root, or holding the process's own files, the
// workflows or the session settings, is no lane folder here, so nothing outside a lane rides it.
const NOT_LANE = ['process', '.process', '.github', '.claude', 'CLAUDE.md'];
export function laneDirs(cfg) {
  const ls = Array.isArray(cfg?.lanes) ? cfg.lanes : [];
  const norm = (d) => d.trim().replace(/^\.\//, '').replace(/\/+$/, '');
  const ok = (d) => d && d !== '.' && !d.startsWith('/') && !d.split('/').includes('..') && !NOT_LANE.some((n) => underPath(d, n));
  return ls.filter((l) => l && typeof l.name === 'string' && l.name.trim() && typeof l.dir === 'string')
    .map((l) => ({ name: l.name.trim(), dir: norm(l.dir), module: typeof l.module === 'string' ? l.module.trim() : null, research: researchOf(l, norm) }))
    .filter((l) => ok(l.dir))
    .map((l, _, all) => {
      // Dropped, never widened, where it could take a folder that is not research: outside the
      // lane rules, inside or around dir, or overlapping another lane's dir or research.
      const r = l.research;
      const clash = (x) => underPath(r, x) || underPath(x, r);
      const good = r && ok(r) && RESEARCH_NAME.test(r) && !clash(l.dir) && !all.some((o) => o !== l && (clash(o.dir) || (o.research && clash(o.research))));
      return { ...l, research: good ? r : null };
    });
}
// A research area's last segment is "research" or ends in "-research", so no source folder or root
// build file (src, package.json) is ever taken for one (review of build/lane-qualification).
export const RESEARCH_NAME = /(^|\/)([^/]+-)?research$/;
// A design lane's research area (Bob, 6 Nov: "This initial and ongoing research should be
// recording in a lane-specific area of the product repo for subsequent sessions to draw from and
// evolve"): its "research" in process/config.json, else the sibling <dir>-research. A sibling, not
// a folder inside dir: dir holds only what the product's build reads (sources and generators), and
// research is never a build input, so it stays out of every glob of dir. It counts as the lane's
// own folder (laneOfPath): a pull request changing only it and dir lands without a suite run.
// A triage lane keeps its register instead: no research area.
export function researchOf(l, norm = (d) => d.trim().replace(/^\.\//, '').replace(/\/+$/, '')) {
  if (!l || (l.kind !== undefined && l.kind !== 'design') || typeof l.dir !== 'string' || !l.dir.trim()) return null;
  if (l.research !== undefined && typeof l.research !== 'string') return null;
  if (typeof l.research === 'string' && l.research.trim()) return norm(l.research);
  return `${norm(l.dir)}-research`;
}
// The lane whose folder holds f, or null; a file a ledger module other than the lane's own owns
// (its paths or tests: entries, the ledger's) is that module's, judged as today.
// Never a lane path: any module's tests; a file of the job being gated (self), so a job's own
// code is always tested; CLAUDE.md, .claude/, .github/ or .process/ anywhere in the folder.
const GOVERNS = /(^|\/)(CLAUDE\.md$|\.claude\/|\.github\/|\.process\/)/;
export function laneOfPath(cfg, f, entries = [], { self = null } = {}) {
  const l = laneDirs(cfg).find((x) => underPath(f, x.dir) || (x.research && underPath(f, x.research)));
  if (!l || GOVERNS.test(f)) return null;
  const owns = (e, ps) => (ps || []).some((p) => underPath(f, p));
  const other = entries.some((e) => owns(e, e.tests) || ((e.id !== l.module || e.id === self) && owns(e, e.paths)));
  return other ? null : l.name;
}
export const isRecordOrLane = (cfg, f, entries = [], opts = {}) => isRecordPath(cfg, f) || !!laneOfPath(cfg, f, entries, opts);
// The one lane a change is all inside, records aside, or null: no file of a lane's folder, a file
// outside every lane's folder, or files of two lanes' folders.
export function laneOnly(cfg, files, entries = []) {
  // The config is a record, but a change to it (a lane's checks, its dir) is never a lane's own: a
  // lane-only pull request could otherwise drop its own checks (cold review of PR 203).
  if (files.includes(CONFIG_FILE)) return null;
  const names = new Set();
  for (const f of files) {
    if (isRecordPath(cfg, f)) continue;
    const n = laneOfPath(cfg, f, entries);
    if (!n) return null;
    names.add(n);
  }
  return names.size === 1 ? [...names][0] : null;
}

// --key value, --key=value (for a value that starts with --) and --flag; repeated keys become arrays; the rest are positional.
export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const eq = a.indexOf('=');
    const k = eq > 0 ? a.slice(2, eq) : a.slice(2);
    const v = eq > 0 ? a.slice(eq + 1) : i + 1 < argv.length && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    if (k in out) out[k] = [].concat(out[k], v); else out[k] = v;
  }
  return out;
}

export const list = (v) => (v === undefined ? [] : [].concat(v));
export const fileBytes = (p) => (existsSync(p) ? statSync(p).size : 0);
export const now = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');

// A moved base is retried, never forced (Foundations, "Refusals, the start and the platform's
// limits"). GitHub's "Base branch was modified" on a merge, and git's fetch-first rejection of a
// push, mean another writer got there first; both fetch and try again, at most `tries` times.
export const RETRIES = 3;
export const BASE_MOVED = /Base branch was modified/i;
export const FETCH_FIRST = /\(fetch first\)|fetch first/i;
const pause = (ms) => { if (ms > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); };

// A push the remote turned away because another writer moved the ref under it: git's fetch-first
// or non-fast-forward (the latter when the new tip is already local, e.g. two writers in one clone),
// and the remote's "cannot lock ref ... is at X but expected Y" / "failed to update ref" / "stale
// info" when the move lands between its check and its update (p3 sweep twice, and send delivered,
// on the copy, 4 Nov). A 5xx from GitHub (500s on pushes 09:49-10:26, 4 Nov) is retried the same
// way: the push may or may not have landed, so the fetched tip is checked first.
export const PUSH_TRIES = 5;
export const REF_MOVED = /fetch first|non-fast-forward|cannot lock ref|but expected|failed to update ref|stale info/i;
// GitHub's own transient push failures too (copy PR 678, 6 Nov: "remote: fatal error in commit_refs").
export const SERVER_ERROR = /(?:error|HTTP(?:\/[\d.]+)?(?: code)?)[: ]+5\d\d\b|Internal Server Error|Bad Gateway|Service Unavailable|Gateway Time-?out|fatal error in commit_refs|RPC failed|unexpected disconnect|remote end hung up/i;
const jitter = (ms) => Math.round(ms * (0.75 + Math.random() * 0.5));

// Pushes HEAD to a branch (the state branch's push). On a moved-ref rejection or a server error it
// waits (1, 2, 4, 8 s with jitter, by default), fetches the branch and, if HEAD is already in the
// fetched tip (a 5xx push that landed), returns that tip. Otherwise, with `redo`, it resets the
// checkout to the fetched tip and calls redo() to make the change again there (so two appends to
// one jsonl file, or a number counted from it, are redone on the other writer's rows instead of
// conflicting: defect sweep 4 Nov, #12); without `redo`, it merges the fetched tip into HEAD (a
// merge commit, never a rebase or a force; a conflict stops it). Then it pushes again, at most
// `tries` times in all; the last refusal is reported in the remote's words. Returns the tip pushed.
// `push` is for the tests: it stands in for one push and returns git's { code, stderr }.
export function pushRetry(cwd, branch, { tries = PUSH_TRIES, wait = 1000, log = console.log, redo, push } = {}) {
  const once = push || (() => git(['push', '-q', 'origin', `HEAD:refs/heads/${branch}`], { cwd, allowFail: true }));
  for (let t = 1; ; t++) {
    const r = once();
    if (r.code === 0) return git(['rev-parse', 'HEAD'], { cwd });
    const why = r.stderr.trim();
    // GitHub's own refusal (a 429, a secondary rate limit): obeyed, never retried inside it (cold review
    // of R17g: git's "RPC failed; HTTP 429" matched SERVER_ERROR and was pushed again at 1, 2, 4, 8 s).
    if (limitSignal(why)) fail(`the push of ${branch} was refused by GitHub's rate limit; run it again after the limit resets (\`p3 github budget\` reads it). The refusal: ${why}`);
    const moved = REF_MOVED.test(why);
    if (!moved && !SERVER_ERROR.test(why)) fail(`the push of ${branch} failed: ${why}`);
    if (t >= tries) {
      // A 5xx push may have landed: look before saying it did not, so a re-run does not write twice.
      if (!moved && fetchRetry(['fetch', '-q', 'origin', `+refs/heads/${branch}:refs/remotes/origin/${branch}`], { cwd }).code === 0
        && git(['merge-base', '--is-ancestor', 'HEAD', `refs/remotes/origin/${branch}`], { cwd, allowFail: true }).code === 0) return git(['rev-parse', 'HEAD'], { cwd });
      fail(`the push of ${branch} was refused ${tries} times (${moved ? `${branch} kept moving` : 'the server kept failing'}); run it again later. The last refusal: ${why}`);
    }
    log(`${moved ? `${branch} moved on origin` : 'the push hit a server error'}; fetching and trying again (${t + 1} of ${tries})`);
    pause(jitter(wait * 2 ** (t - 1)));
    const f = fetchRetry(['fetch', '-q', 'origin', `+refs/heads/${branch}:refs/remotes/origin/${branch}`], { cwd });
    if (f.code !== 0) { log(`the fetch of ${branch} failed (${f.stderr.trim()}); pushing again as it was`); continue; }
    const theirs = `refs/remotes/origin/${branch}`;
    if (git(['merge-base', '--is-ancestor', 'HEAD', theirs], { cwd, allowFail: true }).code === 0) return git(['rev-parse', 'HEAD'], { cwd }); // ours landed (another writer may be on top)
    if (git(['merge-base', '--is-ancestor', theirs, 'HEAD'], { cwd, allowFail: true }).code === 0) continue; // origin did not move: push the same commit again
    if (redo) {
      git(['reset', '-q', '--hard', theirs], { cwd });
      git(['clean', '-q', '-fdx'], { cwd });
      redo();
      continue;
    }
    const m = git(['merge', '-q', '--no-edit', theirs], { cwd, allowFail: true });
    if (m.code !== 0) {
      git(['merge', '--abort'], { cwd, allowFail: true });
      fail(`${branch} moved on origin and does not merge cleanly; nothing was pushed`);
    }
  }
}

// Ref-lock clashes in one clone (copy, 5 Nov 12:21 and 12:36: the MERGER's send ran while its
// train read the state branch): two git processes updating one remote-tracking ref at once, the
// loser failing "cannot lock ref ... is at X but expected Y" or "unable to update local ref". It
// is transient: the fetch runs again, up to FETCH_TRIES times in all (0.5, 1, 2, 4 s, jittered),
// and any other failure, or the last one, is returned as git gave it. `run` is for the tests.
export const LOCAL_REF_LOCK = /cannot lock ref|unable to update local ref|is at [0-9a-f]+ but expected|Unable to create '[^']*\.lock': File exists/i;
export const FETCH_TRIES = 5;
export function fetchRetry(args, opts = {}, { tries = FETCH_TRIES, wait = 500, run: once } = {}) {
  const go = once || (() => git(args, { ...opts, allowFail: true }));
  for (let t = 1; ; t++) {
    const r = go();
    if (r.code === 0 || t >= tries || !LOCAL_REF_LOCK.test(String(r.stderr || ''))) return r;
    pause(jitter(wait * 2 ** (t - 1)));
  }
}

// The per-clone state lock (build train-robust, option 3A; the coordinator's ruling, 5 Nov). Every
// state-branch fetch and write the tool makes (state.mjs fetchState, writeState with its push)
// holds it for that one fetch or write only, never across a gate wait or any other network call,
// so two p3 processes in one clone (the MERGER's train and its send) take turns instead of
// colliding on refs/remotes/origin/<state branch>. A lock file in the clone's common git dir,
// created exclusively, naming its process, host and time. A lock whose process is gone on this
// host is broken and taken; a live holder (or one on another host, or unread) is waited on up to
// STATE_LOCK.wait seconds and then reported, never skipped. Re-entrant within one process.
// alive and host are for the tests.
export const STATE_LOCK = { file: 'p3-state.lock', wait: 90, poll: 200, unread: 10 };
const lockDepth = new Map(); // lock path -> depth held by this process
const lockMine = new Map(); // lock path -> the content this process wrote
const lockPaths = new Map(); // root -> lock path
let lockExit = false;
export function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return null;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'ESRCH' ? false : e.code === 'EPERM' ? true : null; }
}
export function stateLockPath(root) {
  if (!lockPaths.has(root)) {
    const r = run('git', ['rev-parse', '--git-common-dir'], { cwd: root });
    if (r.code !== 0) fail(`git rev-parse --git-common-dir failed in ${root}: ${r.stderr.trim()}`);
    lockPaths.set(root, join(resolve(root, r.stdout.trim()), STATE_LOCK.file));
  }
  return lockPaths.get(root);
}
const readLock = (p) => { try { return readFileSync(p, 'utf8'); } catch { return null; } };
const dropLock = (p) => { const mine = lockMine.get(p); if (mine !== undefined && readLock(p) === mine) { try { unlinkSync(p); } catch { /* gone */ } } lockMine.delete(p); };
// Breaks a stale lock under a breaker lock of its own (review of build train-robust: a rename and
// put-back could restore a live lock its owner had already released): while the stale lock file
// exists no process can create a new one, so it is removed only if it still reads as the stale
// lock read. A breaker lock older than STATE_LOCK.unread seconds is itself left over and removed.
function breakStale(p, text) {
  const b = `${p}.break`;
  try { writeFileSync(b, String(process.pid), { flag: 'wx' }); } catch {
    try { if (Date.now() - statSync(b).mtimeMs > STATE_LOCK.unread * 1000) unlinkSync(b); } catch { /* gone */ }
    return false;
  }
  try { if (readLock(p) === text) unlinkSync(p); return true; } catch { return false; } finally { try { unlinkSync(b); } catch { /* gone */ } }
}
export function withStateLock(root, fn, { wait = STATE_LOCK.wait, poll = STATE_LOCK.poll, alive = pidAlive, host = hostname() } = {}) {
  const p = stateLockPath(root);
  const d = lockDepth.get(p) || 0;
  if (d > 0) { lockDepth.set(p, d + 1); try { return fn(); } finally { lockDepth.set(p, lockDepth.get(p) - 1); } }
  if (!lockExit) { lockExit = true; process.once('exit', () => { for (const q of [...lockMine.keys()]) dropLock(q); }); }
  const me = JSON.stringify({ pid: process.pid, host, at: new Date().toISOString(), token: Math.random().toString(36).slice(2) });
  const until = Date.now() + wait * 1000;
  for (;;) {
    try { writeFileSync(p, me, { flag: 'wx' }); break; } catch (e) { if (e.code !== 'EEXIST') throw e; }
    const text = readLock(p);
    if (text === null) continue; // released between the two calls: try again at once
    let cur = null;
    try { cur = JSON.parse(text); } catch { cur = null; }
    let age = 0;
    try { age = Date.now() - statSync(p).mtimeMs; } catch { continue; }
    // Stale: its process is gone on this host; or never written whole (a process killed between
    // creating and writing it) and older than STATE_LOCK.unread seconds.
    // A lock naming this process that it does not hold is left over (it cannot be waiting on itself).
    const stale = cur ? cur.host === host && (alive(cur.pid) === false || (cur.pid === process.pid && lockMine.get(p) !== text)) : age > STATE_LOCK.unread * 1000;
    if (stale && breakStale(p, text)) continue;
    if (Date.now() >= until) fail(`the state lock ${p} is held by ${cur ? `process ${cur.pid} on ${cur.host} since ${cur.at}` : 'a process that has not written it'} (another p3 command in this clone): waited ${wait} s; nothing was read or written; run this again once that command ends, or, if no p3 runs here, remove ${p}`);
    pause(jitter(poll));
  }
  lockMine.set(p, me);
  lockDepth.set(p, 1);
  try { return fn(); } finally { lockDepth.set(p, 0); dropLock(p); }
}

// Scratch directories (copy, 4 Nov: merge left a 690 MB p3-merge-* tree on every run, 110 of them
// filled BOB's disk). Every scratch directory in tool/lib comes from withTemp, which removes it
// on every way out of fn: success, refusal or throw. With root, a worktree added under it is
// removed and pruned from root's .git/worktrees too. A process killed mid-way (a timeout's
// SIGTERM or SIGKILL runs no finally, and merge sleeps in Atomics.wait) is cleaned by the next
// withTemp: a scratch directory whose owner process is gone, or one an older tool left (no owner
// file) over TEMP_STALE_HOURS old, is removed. Kept on purpose, outside withTemp: the
// development deploy's and release's step-log directories, the evidence their output names.
export const TEMP_PREFIXES = ['p3-train-', 'p3-merge-', 'p3-state-', 'p3-layer-', 'p3-row-', 'p3-failing-', 'p3-base-red-', 'p3-round-', 'p3-merged-'];
export const TEMP_OWNER = '.p3-owner';
export const TEMP_STALE_HOURS = 3;
const temps = new Map();
let exitHook = false;
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
function dropTemp(dir, root) {
  if (root) {
    // git lists a worktree by its real path (a symlinked TMPDIR, macOS's /var, is resolved).
    let real = dir;
    try { real = realpathSync(dir); } catch {}
    const listed = git(['worktree', 'list', '--porcelain'], { cwd: root, allowFail: true }).stdout || '';
    for (const l of listed.split('\n')) {
      const p = l.startsWith('worktree ') ? l.slice(9) : null;
      if (p && [dir, real].some((d) => p === d || p.startsWith(`${d}/`))) git(['worktree', 'remove', '--force', '--force', p], { cwd: root, allowFail: true });
    }
  }
  rmSync(dir, { recursive: true, force: true });
  if (root) git(['worktree', 'prune'], { cwd: root, allowFail: true });
  temps.delete(dir);
}
// Removes the scratch directories of processes no longer running; with root, prunes its worktrees.
export function sweepTemp(root, { base = tmpdir(), now = Date.now() } = {}) {
  const gone = [];
  let names = [];
  try { names = readdirSync(base); } catch { return gone; }
  for (const n of names) {
    if (!TEMP_PREFIXES.some((p) => n.startsWith(p))) continue;
    const d = join(base, n);
    try {
      let owner = null;
      try { owner = Number(readFileSync(join(d, TEMP_OWNER), 'utf8')); } catch {}
      const stale = owner ? owner !== process.pid && !alive(owner) : now - statSync(d).mtimeMs > TEMP_STALE_HOURS * 3600000;
      if (!stale) continue;
      rmSync(d, { recursive: true, force: true });
      gone.push(d);
    } catch {}
  }
  if (root && gone.length) git(['worktree', 'prune'], { cwd: root, allowFail: true });
  return gone;
}
export function withTemp(prefix, fn, { root } = {}) {
  const { dir, drop } = holdTemp(prefix, { root });
  try { return fn(dir); } finally { drop(); }
}
// A scratch directory held past one call (the base-red tree prepared beside the head's install,
// basered.mjs startBase): removed by drop(), or at exit, or by the next withTemp once its owner
// process is gone, as withTemp's are.
export function holdTemp(prefix, { root } = {}) {
  if (!TEMP_PREFIXES.includes(prefix)) fail(`withTemp: ${prefix} is not a scratch prefix (TEMP_PREFIXES)`);
  sweepTemp(root);
  const dir = mkdtempSync(join(tmpdir(), prefix));
  writeFileSync(join(dir, TEMP_OWNER), String(process.pid));
  // process.exit inside fn runs no finally: what is still held goes at exit.
  if (!exitHook) { exitHook = true; process.once('exit', () => { for (const [d, r] of temps) dropTemp(d, r); }); }
  temps.set(dir, root);
  return { dir, drop: () => { if (temps.has(dir)) dropTemp(dir, root); } };
}
