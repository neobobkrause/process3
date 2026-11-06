// Shared helpers: running programs, git, GitHub through gh, config, arguments.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

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
export const fail = (msg) => { throw new Fail(msg); };

// Run a program. Never throws on a non-zero exit; returns code, stdout, stderr, seconds.
// A heartbeat (coordinator, 5 Nov 07:56: the MERGER's lease lapsed while its train was alive
// and gating mail-door, so ROOT's sweep replaced it): the train renews its lease only when it
// prints a line or turns its loop, and its long silent stretches (the queue's order and provider
// holds, a merge's notice and triage, waits whose lines are not printed) printed nothing for
// 15 minutes. A beat set here runs before each command this process starts (git, gh), never
// inside itself or a quiet section (a state-branch write), so whatever runs, the train renews.
let beat = null;
let still = 0;
export function heartbeat(fn) { const was = beat; beat = fn; return () => { beat = was; }; }
export function quietly(fn) { still++; try { return fn(); } finally { still--; } }
const pulse = () => { if (beat && !still) quietly(beat); };

export function run(cmd, args = [], opts = {}) {
  pulse();
  const t0 = Date.now();
  const env = { ...process.env, ...(opts.env || {}) };
  for (const k of opts.unset || []) delete env[k];
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd, env, encoding: opts.encoding === 'buffer' ? undefined : 'utf8', // 'buffer': stdout as bytes (git cat-file --batch)
    maxBuffer: 256 * 1024 * 1024, input: opts.input, timeout: opts.timeout,
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
export function git(args, opts = {}) {
  const r = run('git', ['-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=/dev/null', ...args], { ...opts, unset: [...NO_TOKENS, ...(opts.unset || [])] });
  if (r.code !== 0 && !opts.allowFail) fail(`git ${args.join(' ')} failed: ${r.stderr.trim()}${lockNote(r.stderr, opts.cwd)}`);
  return opts.allowFail ? r : r.stdout.replace(/\n$/, '');
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

// GitHub through the gh CLI (measured route, platform row 14). Returns parsed JSON or text.
export function gh(args, opts = {}) {
  const r = run('gh', args, { input: opts.input, cwd: opts.cwd });
  if (r.code !== 0 && !opts.allowFail) fail(`gh ${args.slice(0, 3).join(' ')} failed: ${(r.stderr || r.stdout).trim()}`);
  if (opts.allowFail && r.code !== 0) return null;
  const s = r.stdout.trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch { return s; }
}

// Several gh calls at once (merge train cold start, 5 Nov: 53 serial reads before the first
// pick): run side by side, at most `concurrency` at a time, in one child node process, and
// returned in order, each as gh() returns it (null when it failed and allowFail is set).
const MANY = `const { execFile } = require('node:child_process');
const jobs = JSON.parse(require('node:fs').readFileSync(0, 'utf8'));
const out = new Array(jobs.list.length);
let next = 0;
const one = () => { const i = next++; if (i >= jobs.list.length) return Promise.resolve();
  return new Promise((ok) => execFile('gh', jobs.list[i], { maxBuffer: 256 * 1024 * 1024, encoding: 'utf8' }, (e, stdout, stderr) => { out[i] = { code: e ? (typeof e.code === 'number' ? e.code : 1) : 0, stdout: stdout || '', stderr: stderr || '' }; ok(); })).then(one); };
Promise.all(Array.from({ length: Math.min(jobs.concurrency, jobs.list.length) }, one)).then(() => process.stdout.write(JSON.stringify(out)));`;
export const GH_CONCURRENCY = 16;
export function ghMany(list, { allowFail = true, concurrency = GH_CONCURRENCY } = {}) {
  if (!list.length) return [];
  if (list.length === 1) return [gh(list[0], { allowFail })];
  const r = run(process.execPath, ['-e', MANY], { input: JSON.stringify({ list, concurrency }) });
  let res = null;
  try { res = JSON.parse(r.stdout); } catch { res = null; }
  if (r.code !== 0 || !Array.isArray(res)) return list.map((a) => gh(a, { allowFail })); // the batch itself failed: one by one, as before
  return res.map((x, i) => {
    if (x.code !== 0) { if (!allowFail) fail(`gh ${list[i].slice(0, 3).join(' ')} failed: ${(x.stderr || x.stdout).trim()}`); return null; }
    const s = x.stdout.trim();
    if (!s) return null;
    try { return JSON.parse(s); } catch { return s; }
  });
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
export const fetchBranch = (root, branch, opts = {}) => git(['fetch', '-q', ...depth(root), 'origin', `+refs/heads/${branch}:refs/remotes/origin/${branch}`], { cwd: root, ...opts });

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
  // The merge train (train.mjs, Bob's trial, 5 Nov): true, ROOT's sweep keeps a MERGER running.
  merge_train: false,
  // The merge train's window (train.mjs, window.mjs; notes/train-spec-plan.md, option C'): how many
  // green pull requests gate at once, each on its predicted merged result behind those ahead. 1 is
  // the serial train, unchanged; a whole number up to MERGE_TRAIN_WINDOW_MAX.
  merge_train_window: 1,
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
  setup_timeout_minutes: 15,
  // Targets in minutes. decision_minutes: the escalation chain (coordinator, 4 Nov, for Bob's "urgency is fully supported"): job to BOB to ROOT to
  // watcher to Bob, each step waiting this long for an answer before the next is asked.
  // replace_minutes: status --role bob --sessions flags a job whose session is idle with no push
  // this long (measured 3-4 Nov: a stopped job was flagged only after two hours). All four are
  // also the lead times' proposed targets (metrics report, report tranche), each figure beside its own.
  targets: { start_minutes: 10, merge_minutes: 15, decision_minutes: 30, replace_minutes: 30 },
};

// The widest window: k spec gates and one confirm gate share the runners (the plan: k = 4 keeps the
// peak about 15 of 20), so 8 is already past the cap.
export const MERGE_TRAIN_WINDOW_MAX = 8;

// open_by values (status --role bob): "uses" the default, "layer" the old behaviour.
export const OPEN_BY = ['uses', 'layer'];

// A requirement mark (P7), the one parser every count and check uses (job complete's struck
// marks, status and its layers, layer close, the report, the requirements cap). A requirement
// line starts with `**R<id>**` (or a found mark `**F<n>**`, the route for work found elsewhere) (after any indent and one list marker: `- `, `* `, `1. `); it is
// unmet when it holds the exact mark `*(not yet met` anywhere on that line: right after the id
// (`**R36** *(not yet met: T40)*`), after a parenthetical (`**R23** (T53; DEC-151 (2)) *(not
// yet met: T53)*`, PR 74), or at its end after the bold title (`**R127** (T53) **A piece is
// read in bounds.** ... *(not yet met: T53)*`, 332 more marks on the copy's tranche, 4 Nov; the coordinator's
// ruling under P17). Prose is never read: a line not starting with an id, a mark on another
// line, or the words outside that italic form. A line ends at \n or \r (review of PR 77).
const REQ_LINE = String.raw`^[ \t]*(?:[-*+][ \t]+|\d+\.[ \t]+)?\*\*([RF][\w.-]+)\*\*`;
const MARK_TEXT = '*(not yet met';
export const UNMET = new RegExp(String.raw`${REQ_LINE}[^\r\n]*?\*\(not yet met`, 'gm');
// Every requirement line's id, and those still unmet, in file order.
export function requirementMarks(text) {
  const lines = [...String(text || '').matchAll(new RegExp(String.raw`${REQ_LINE}([^\r\n]*)`, 'gm'))];
  return { all: lines.map((m) => m[1]), unmet: lines.filter((m) => m[2].includes(MARK_TEXT)).map((m) => m[1]) };
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

export const CONFIG_FILE = 'process/config.json';

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
  // A window the train cannot run is refused where the config is read, never mid-train.
  const k = c.merge_train_window ?? DEFAULTS.merge_train_window;
  if (!Number.isInteger(k) || k < 1 || k > MERGE_TRAIN_WINDOW_MAX) fail(`${where}: merge_train_window ${JSON.stringify(c.merge_train_window)} is not a whole number from 1 to ${MERGE_TRAIN_WINDOW_MAX} (1: the serial train)`);
  return {
    ...DEFAULTS, ...c,
    merge_train_window: k,
    // A null tranche is the default one, as the anchor reads it (second confirming review of PR 97).
    tranche: c.tranche ?? DEFAULTS.tranche,
    approvals: { ...DEFAULTS.approvals, ...(c.approvals || {}) },
    targets: { ...DEFAULTS.targets, ...(c.targets || {}) },
  };
}

// The job cap (Bob, 4 Nov): the job sessions running at once across the whole account, every
// product (list_sessions is account-scoped); roles, builds and other sessions are not counted. One
// value per account, P3_JOB_CAP in the account's cloud environment, default 20. The one place the
// cap is read: job start --ready, status, the sweep and lead times call this and nothing else.
// A product config's old live_cap (or job_cap) is ignored, with a note saying so. Empty is unset.
export const JOB_CAP_VAR = 'P3_JOB_CAP';
const JOB_CAP_DEFAULT = 20;
export function jobCap(cfg = {}, env = process.env) {
  const raw = env[JOB_CAP_VAR];
  const set = raw !== undefined && raw !== '';
  const cap = set ? (/^\d+$/.test(String(raw).trim()) ? Number(raw) : NaN) : JOB_CAP_DEFAULT;
  if (!Number.isInteger(cap) || cap < 1) fail(`${JOB_CAP_VAR}=${JSON.stringify(raw)}: the job cap is a whole number of job sessions, 1 or more; the account owner sets it in the environment's variables, or leaves it unset for ${JOB_CAP_DEFAULT}`);
  const old = ['live_cap', 'job_cap'].filter((k) => cfg[k] !== undefined);
  return {
    cap, from: set ? JOB_CAP_VAR : 'default', line: `job cap ${cap} (${set ? JOB_CAP_VAR : 'default'})`,
    note: old.length ? `${CONFIG_FILE}: ${old.join(', ')} ignored; the job cap now comes from ${JOB_CAP_VAR} (default ${JOB_CAP_DEFAULT})` : null,
  };
}
// The cap a sweep row recorded (job_cap; live_cap in rows written before 4 Nov).
export const rowCap = (r) => r.job_cap ?? r.live_cap;

// A path entry ending in / is a directory; any other names a file or a directory.
export const underPath = (file, p) => file === p || file.startsWith(p.endsWith('/') ? p : `${p}/`);

export const isRecordPath = (cfg, f) => cfg.records.some((r) => underPath(f, r));

// Lanes' folders (lane.mjs; Bob, 5 Nov 17:45: "I don't believe that lanes' file changes need to be tested the way jobs do").
// A lane's folder is its config "dir"; one at the root, or holding the process's own files, the
// workflows or the session settings, is no lane folder here, so nothing outside a lane rides it.
const NOT_LANE = ['process', '.process', '.github', '.claude', 'CLAUDE.md'];
export function laneDirs(cfg) {
  const ls = Array.isArray(cfg?.lanes) ? cfg.lanes : [];
  return ls.filter((l) => l && typeof l.name === 'string' && l.name.trim() && typeof l.dir === 'string')
    .map((l) => ({ name: l.name.trim(), dir: l.dir.trim().replace(/^\.\//, '').replace(/\/+$/, ''), module: typeof l.module === 'string' ? l.module.trim() : null }))
    .filter((l) => l.dir && l.dir !== '.' && !l.dir.startsWith('/') && !l.dir.split('/').includes('..') && !NOT_LANE.some((n) => underPath(l.dir, n)));
}
// The lane whose folder holds f, or null; a file a ledger module other than the lane's own owns
// (its paths or tests: entries, the ledger's) is that module's, judged as today.
// Never a lane path: any module's tests; a file of the job being gated (self), so a job's own
// code is always tested; CLAUDE.md, .claude/, .github/ or .process/ anywhere in the folder.
const GOVERNS = /(^|\/)(CLAUDE\.md$|\.claude\/|\.github\/|\.process\/)/;
export function laneOfPath(cfg, f, entries = [], { self = null } = {}) {
  const l = laneDirs(cfg).find((x) => underPath(f, x.dir));
  if (!l || GOVERNS.test(f)) return null;
  const owns = (e, ps) => (ps || []).some((p) => underPath(f, p));
  const other = entries.some((e) => owns(e, e.tests) || ((e.id !== l.module || e.id === self) && owns(e, e.paths)));
  return other ? null : l.name;
}
export const isRecordOrLane = (cfg, f, entries = [], opts = {}) => isRecordPath(cfg, f) || !!laneOfPath(cfg, f, entries, opts);
// The one lane a change is all inside, records aside, or null: no file of a lane's folder, a file
// outside every lane's folder, or files of two lanes' folders.
export function laneOnly(cfg, files, entries = []) {
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
export const SERVER_ERROR = /(?:error|HTTP(?:\/[\d.]+)?(?: code)?)[: ]+5\d\d\b|Internal Server Error|Bad Gateway|Service Unavailable|Gateway Time-?out/i;
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
export const TEMP_PREFIXES = ['p3-train-', 'p3-merge-', 'p3-state-', 'p3-layer-', 'p3-row-', 'p3-failing-', 'p3-base-red-'];
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
