// Shared helpers: running programs, git, GitHub through gh, config, arguments.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export class Fail extends Error {}
export const fail = (msg) => { throw new Fail(msg); };

// Run a program. Never throws on a non-zero exit; returns code, stdout, stderr, seconds.
export function run(cmd, args = [], opts = {}) {
  const t0 = Date.now();
  const env = { ...process.env, ...(opts.env || {}) };
  for (const k of opts.unset || []) delete env[k];
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd, env, encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024, input: opts.input, timeout: opts.timeout,
  });
  return {
    code: r.status === null ? (r.error ? 127 : 1) : r.status,
    stdout: r.stdout || '', stderr: (r.stderr || '') + (r.error ? String(r.error) : ''),
    seconds: (Date.now() - t0) / 1000,
  };
}

// The tool's git never carries a GitHub token, and never runs a hook or file monitor that
// product code may have written into .git/config while the gate ran it (review of build G).
export const NO_TOKENS = ['GH_TOKEN', 'GITHUB_TOKEN', 'ACTIONS_RUNTIME_TOKEN', 'ACTIONS_ID_TOKEN_REQUEST_TOKEN'];
export function git(args, opts = {}) {
  const r = run('git', ['-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=/dev/null', ...args], { ...opts, unset: [...NO_TOKENS, ...(opts.unset || [])] });
  if (r.code !== 0 && !opts.allowFail) fail(`git ${args.join(' ')} failed: ${r.stderr.trim()}`);
  return opts.allowFail ? r : r.stdout.replace(/\n$/, '');
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

// A shallow clone (clone_depth on create_session): its history is cut, so a full fetch of a
// branch pulls that branch's whole history (90 s measured 3 Nov), and a local merge base or
// count of commits between two branches can be wrong. Fetches there take --depth 1.
export const isShallow = (root) => git(['rev-parse', '--is-shallow-repository'], { cwd: root, allowFail: true }).stdout.trim() === 'true';
export const depth = (root) => (isShallow(root) ? ['--depth', '1'] : []);
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
  // sweep: the live-session cap (PLT, measured 1 Nov), and the plan (run, pause or stop).
  live_cap: 24,
  plan: 'run',
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
  // Added to every create_session call the tool prints: the shallow clone (measured 3 Nov, a
  // full clone stalled a ROOT for over 15 minutes). No blob_limit_kb: it left a 5.2 MB source
  // file out of the checkout and nothing fetched it when node read it. null leaves it out.
  clone: { clone_depth: 1 },
  // start check (SHM-5): the product's setup script, argv, run once per container; none by default.
  setup_script: null,
  // Lanes (SES-14): each a name and the product's directory of its design knowledge. The UX lane
  // is always there; the product names its directory. completion_file (PLN-4): none by default.
  lanes: [{ name: 'ux', dir: null }],
  completion_file: null,
  setup_timeout_minutes: 15,
  // Targets in minutes. decision_minutes: the escalation chain (Bob, 4 Nov): job to BOB to ROOT to
  // watcher to Bob, each step waiting this long for an answer before the next is asked. All four
  // are also the lead times' proposed targets (metrics report, report tranche), each figure beside its own.
  targets: { start_minutes: 10, merge_minutes: 15, decision_minutes: 30, replace_minutes: 30 },
};

// open_by values (status --role bob): "uses" the default, "layer" the old behaviour.
export const OPEN_BY = ['uses', 'layer'];

// An unmet requirement mark in a requirement file: **R<id>** *(not yet met ...), or a found
// mark, **F<n>** *(not yet met: <source>)*, the route for work found elsewhere (found <module>).
export const UNMET = /\*\*([RF][\w.-]+)\*\*\s*\*\(not yet met/g;
// A mark id, met or not, as the struck-mark --test and the report read it.
export const MARK_ID = /^[RF][\w.-]+$/;
// A found mark, met or not: its number, and whether it is still unmet.
export const FOUND_MARK = /\*\*F(\d+)\*\*(\s*\*\(not yet met)?/g;
export const isFound = (id) => /^F\d+$/.test(String(id));

// The requirements cap (REQ-6): the line that names a requirement file over requirements_cap
// bytes, or over requirements_cap_marks unmet marks, as BOB's to split or consolidate before its
// job; null when it is under both. A trigger, never a refusal: job start takes --over-cap.
export function overCap(cfg, file, text) {
  if (text === null || text === undefined) return null;
  const bytes = Buffer.byteLength(text);
  const marks = (text.match(UNMET) || []).length;
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

// process/config.json in the product; every field optional. With a ref, read from that commit:
// a check reads its config from the trusted base, never from the change it judges.
export function loadConfig(root, ref) {
  let text = null;
  if (ref) {
    if (exists(root, ref, CONFIG_FILE)) text = git(['show', `${ref}:${CONFIG_FILE}`], { cwd: root });
  } else if (existsSync(join(root, CONFIG_FILE))) text = readFileSync(join(root, CONFIG_FILE), 'utf8');
  let c = {};
  try { c = text ? JSON.parse(text) : {}; } catch (e) { fail(`${CONFIG_FILE}${ref ? ` at ${ref}` : ''} is not JSON: ${e.message}`); }
  if (c === null || typeof c !== 'object' || Array.isArray(c)) fail(`${CONFIG_FILE}${ref ? ` at ${ref}` : ''} is not a JSON object`);
  return {
    ...DEFAULTS, ...c,
    approvals: { ...DEFAULTS.approvals, ...(c.approvals || {}) },
    targets: { ...DEFAULTS.targets, ...(c.targets || {}) },
  };
}

// A path entry ending in / is a directory; any other names a file or a directory.
export const underPath = (file, p) => file === p || file.startsWith(p.endsWith('/') ? p : `${p}/`);

export const isRecordPath = (cfg, f) => cfg.records.some((r) => underPath(f, r));

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

// Pushes HEAD to a branch (the state branch's push): on a fetch-first rejection it fetches the
// branch, merges it into HEAD (a merge commit, never a rebase or a force; a conflict stops it)
// and pushes again. Returns the tip pushed.
export function pushRetry(cwd, branch, { tries = RETRIES, wait = 2000, log = console.log } = {}) {
  for (let t = 1; ; t++) {
    const r = git(['push', '-q', 'origin', `HEAD:refs/heads/${branch}`], { cwd, allowFail: true });
    if (r.code === 0) return git(['rev-parse', 'HEAD'], { cwd });
    const why = r.stderr.trim();
    if (!FETCH_FIRST.test(why)) fail(`the push of ${branch} failed: ${why}`);
    if (t >= tries) fail(`the push of ${branch} was rejected ${tries} times because ${branch} moved; run it again later`);
    log(`${branch} moved on origin; fetching and trying again (${t + 1} of ${tries})`);
    pause(wait * t);
    git(['fetch', '-q', 'origin', `+refs/heads/${branch}:refs/remotes/origin/${branch}`], { cwd });
    const m = git(['merge', '-q', '--no-edit', `refs/remotes/origin/${branch}`], { cwd, allowFail: true });
    if (m.code !== 0) {
      git(['merge', '--abort'], { cwd, allowFail: true });
      fail(`${branch} moved on origin and does not merge cleanly; nothing was pushed`);
    }
  }
}
