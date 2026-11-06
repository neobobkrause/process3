// The owner's limits on a workflow change (build workflow-limits, R1; Bob, 6 Nov: "yes to R1").
// His standing approvals (CLAUDE.md, 4 Nov) let a session "change those repositories' own
// workflow files, only through pull requests the merge tool merges after a green gate, never
// adding or renaming a job whose name matches a required check, never widening any workflow's or
// job's permissions, never adding a pull_request_target trigger, and never making the process
// gate anything but the process's own shim at the pinned process"; on 6 Nov he added: never
// weakening a required check. One file's change, base to head, is judged by reading both as YAML
// (wfyaml.mjs, which refuses what it cannot read):
//  L1 no job added, removed or renamed whose name (its `name:`, else its key) matches a required
//     check of the base branch;
//  L2 no permissions widened, at the workflow or a job: no new scope, no read to write, no block
//     removed where the base had one (a missing block inherits the default, which is wider);
//     where the base had no block, the head may read but not write; a new workflow declares its
//     permissions and grants no write;
//  L3 no pull_request_target or workflow_run trigger added;
//  L4 a process shim stays byte-identical to the pin's (merge.mjs, which holds the shims);
//  L5 in a job that is a required check, no existing step removed or reordered, and none gets
//     its `if:`, `continue-on-error`, `shell`, `working-directory`, `env`, `id` or the action it
//     uses changed, nor an input but a version or a cache (`with: ref:` would test other code);
//     a step's `run:` keeps every line it had, in order, and gains lines only after its last one
//     (a line put before could be `set +e`), and only where its shell stops at a failed command
//     (bash -e); a folded (`>`) run may not change. The job itself keeps its `runs-on` (it picks
//     the shell), `if`, `needs`, `continue-on-error`, `strategy`, `env`, `defaults` and every
//     other key but `name` (L1), `permissions` (L2), `timeout-minutes`, `concurrency` and
//     `steps`; its workflow keeps its `env` and `defaults`. Adding steps, `timeout-minutes`,
//     action versions and node-version may change.
// A required check names a job when it equals the job's name or key, or begins with it and ` (`
// (a matrix) or ` / ` (a called workflow), or ends with ` / ` and it, in any case; a name
// holding an expression (`${{`) is taken to match any.
import { foldedAt, lineOf, readWorkflow } from './wfyaml.mjs';
import { hunks, plainText } from './workflows.mjs';

const isMap = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const isText = (x) => typeof x === 'string';
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const runLines = (t) => (isText(t) ? t.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim()) : null);

export const LIMITS = ['L1', 'L2', 'L3', 'L4', 'L5'];

// The check-run names a job can give, for matching against the required checks.
export function jobNames(key, job) {
  const n = isMap(job) ? job.name : null;
  return isText(n) ? [n] : [key];
}
export function matchesRequired(names, required) {
  const req = required.map((c) => String(c).toLowerCase());
  return names.map((n) => String(n).toLowerCase()).some((n) => (n.includes('${{') && req.length) || req.some((c) => c === n || c.startsWith(`${n} (`) || c.startsWith(`${n} / `) || c.endsWith(` / ${n}`)));
}

// The events of `on`: a name, a list of names, or a mapping's keys.
function events(on) {
  if (isText(on)) return [on];
  if (Array.isArray(on)) return on.filter(isText);
  if (isMap(on)) return Object.keys(on);
  return [];
}

// Permissions as { all: 'read'|'write'|null, scopes: {scope: level} }; undefined when absent;
// throws on a form it does not read.
const LEVEL = { none: 0, read: 1, write: 2 };
function perms(p, where) {
  if (p === undefined) return undefined;
  if (p === null) return { all: null, scopes: {} };
  if (isText(p)) {
    if (p === 'read-all') return { all: 'read', scopes: {} };
    if (p === 'write-all') return { all: 'write', scopes: {} };
    throw new Error(`${where}: permissions "${p}" is not read-all, write-all or a mapping`);
  }
  if (!isMap(p)) throw new Error(`${where}: permissions is not read-all, write-all or a mapping`);
  const scopes = {};
  for (const [k, v] of Object.entries(p)) {
    if (!isText(v) || !(v in LEVEL)) throw new Error(`${where}: permissions ${k}: "${v}" is not read, write or none`);
    scopes[k] = v;
  }
  return { all: null, scopes };
}
const level = (P, scope) => (P.all ? LEVEL[P.all] : LEVEL[P.scopes[scope] ?? 'none']);
// Why head's permissions are wider than base's, or null. undefined is the default. Removing a
// block is a widening (the default may write); where the base had none, the head is held to the
// read default that a repository is created with (cold review of R1: a base with no block let any
// head through), so it may add a block that reads but none that writes.
const READ_DEFAULT = { all: 'read', scopes: {} };
function wider(base, head) {
  if (head === undefined) return base === undefined ? null : 'its permissions block is removed, so it takes the default, which is wider';
  if (base === undefined) base = READ_DEFAULT;
  if (head.all) {
    if (base.all && LEVEL[base.all] >= LEVEL[head.all]) return null;
    return `permissions ${head.all}-all is wider than the base's`;
  }
  for (const [s, v] of Object.entries(head.scopes)) if (LEVEL[v] > level(base, s)) return `permissions ${s}: ${v} is wider than the base's ${base.all ? `${base.all}-all` : base.scopes[s] ?? 'none'}`;
  return null;
}
const grantsWrite = (P) => P.all === 'write' || Object.values(P.scopes).includes('write');

// A step's identity, to find it again in the head: its id, else its name, else the action it
// uses (without the version), else its run's first line.
const actionOf = (u) => (isText(u) ? u.replace(/@[^@]*$/, '') : null);
function stepKey(s) {
  if (!isMap(s)) return `?${JSON.stringify(s)}`;
  if (isText(s.id)) return `id:${s.id}`;
  if (isText(s.name)) return `name:${s.name}`;
  if (isText(s.uses)) return `uses:${actionOf(s.uses)}`;
  const r = runLines(s.run);
  return r ? `run:${r[0] ?? ''}` : `?${JSON.stringify(s)}`;
}
// runs-on is not free: it picks the default shell (pwsh on Windows does not stop at a failed
// command), and the run rule below stands on bash -e (cold review of R1).
const JOB_FREE = new Set(['name', 'permissions', 'timeout-minutes', 'concurrency', 'steps']);
const STEP_FREE = new Set(['name', 'timeout-minutes', 'uses', 'with', 'run']);
// The inputs of an existing step that may change, be added or be removed: a toolchain's version
// and its cache. Any other (checkout's ref, repository or path; a script) could change what is
// tested (cold review of R1).
const FREE_INPUT = /^([a-z0-9]+-)?version$|^cache(-dependency-path)?$/i;
// Whether a step's run stops at a failed command, so a line appended after its last cannot hide
// one: GitHub's default shell on Linux and macOS (bash -e), or shell bash or sh, which GitHub
// runs with -e; the job's and the workflow's defaults count, and runs-on must not be Windows.
const SHELL_E = new Set(['bash', 'sh']);
function stopsOnFailure(step, job, wf) {
  const sh = step.shell ?? job?.defaults?.run?.shell ?? wf?.defaults?.run?.shell;
  if (sh !== undefined) return SHELL_E.has(sh);
  const on = JSON.stringify(job?.['runs-on'] ?? '');
  return !/windows|\$\{\{/i.test(on);
}

// L5 for one required job present in both. Returns { why, line } or null.
function keepsChecks(bj, hj, key, hLine, wf) {
  if (!isMap(bj) || !isMap(hj)) return same(bj, hj) ? null : { why: `the required job ${key} changed shape`, line: hLine };
  for (const k of new Set([...Object.keys(bj), ...Object.keys(hj)])) {
    if (JOB_FREE.has(k) || same(bj[k], hj[k])) continue;
    return { why: `the required job ${key} has its ${k} ${k in hj ? (k in bj ? 'changed' : 'added') : 'removed'}`, line: lineOf(hj, k) ?? hLine };
  }
  const bs = Array.isArray(bj.steps) ? bj.steps : [];
  const hs = Array.isArray(hj.steps) ? hj.steps : null;
  if (!hs) return bs.length ? { why: `the required job ${key} has its steps removed`, line: hLine } : null;
  let j = 0;
  for (let i = 0; i < bs.length; i++) {
    const b = bs[i];
    const id = stepKey(b);
    let at = j;
    while (at < hs.length && stepKey(hs[at]) !== id) at++;
    const label = isMap(b) && isText(b.name) ? `"${b.name}"` : `step ${i + 1}`;
    if (at >= hs.length) return { why: `the required job ${key} loses its step ${label} (base line ${lineOf(bj.steps, i)}), or has it moved before another`, line: lineOf(hj, 'steps') ?? hLine };
    j = at + 1;
    const h = hs[at];
    const line = lineOf(hs, at);
    if (!isMap(b) || !isMap(h)) { if (!same(b, h)) return { why: `the required job ${key}'s step ${label} changed`, line }; continue; }
    for (const k of new Set([...Object.keys(b), ...Object.keys(h)])) {
      if (STEP_FREE.has(k) || same(b[k], h[k])) continue;
      return { why: `the required job ${key}'s step ${label} has its ${k} ${k in h ? (k in b ? 'changed' : 'added') : 'removed'}`, line: lineOf(h, k) ?? line };
    }
    if (actionOf(b.uses) !== actionOf(h.uses)) return { why: `the required job ${key}'s step ${label} uses ${h.uses ?? 'no action'} instead of ${actionOf(b.uses) ?? 'no action'}`, line: lineOf(h, 'uses') ?? line };
    const bw = isMap(b.with) ? b.with : {};
    const hw = isMap(h.with) ? h.with : {};
    if (b.with !== undefined && !isMap(b.with) && !same(b.with, h.with)) return { why: `the required job ${key}'s step ${label} has its with changed`, line };
    for (const k of new Set([...Object.keys(bw), ...Object.keys(hw)])) if (!FREE_INPUT.test(k) && !same(bw[k], hw[k])) return { why: `the required job ${key}'s step ${label} has its input ${k} ${k in hw ? (k in bw ? 'changed' : 'added') : 'removed'}; only a version or a cache may change`, line: lineOf(hw, k) ?? line };
    if ((b.run !== undefined || h.run !== undefined) && !same(b.run, h.run)) {
      // A folded run is joined into one line by GitHub: its lines cannot be judged one by one.
      if (foldedAt(b, 'run') || foldedAt(h, 'run')) return { why: `the required job ${key}'s step ${label} has a folded (>) run that changed`, line: lineOf(h, 'run') ?? line };
      if (!stopsOnFailure(h, hj, wf)) return { why: `the required job ${key}'s step ${label} has its run changed, and its shell does not stop at a failed command`, line: lineOf(h, 'run') ?? line };
      const br = runLines(b.run);
      const hr = runLines(h.run);
      if (!br || !hr) return { why: `the required job ${key}'s step ${label} has its run ${hr ? 'added' : 'removed'}`, line: lineOf(h, 'run') ?? line };
      const hs2 = hunks(br, hr);
      const lost = hs2?.find((x) => x.del > 0);
      if (!hs2 || lost) return { why: `the required job ${key}'s step ${label} drops the line "${(br[lost?.at] ?? '').trim().slice(0, 80)}" from its run`, line: lineOf(h, 'run') ?? line };
      const early = hs2.find((x) => x.at < br.length);
      if (early) return { why: `the required job ${key}'s step ${label} has a line put into its run before its last line ("${early.add[0].trim().slice(0, 80)}"); lines may be added only after it`, line: lineOf(h, 'run') ?? line };
    }
  }
  return null;
}

// Judges one workflow file's change. base and head are the file's text (null: absent).
// required: the base branch's required check names. Returns { ok: true, limits } or
// { ok: false, limit, line, why }. L4 (the shims) is the caller's.
export function judgeWorkflow(path, base, head, required = []) {
  const bad = (limit, line, why) => ({ ok: false, limit, line, why });
  if (head === null) return bad('removal', null, 'it deletes a workflow');
  const plain = plainText(head, base);
  if (plain) return bad('reading', null, plain.replace(/^rule 3: /, ''));
  const h = readWorkflow(head);
  if (h.why) return bad('reading', null, `it cannot be read as the plain YAML the limits judge (${h.why})`);
  let b = { doc: null };
  if (base !== null) {
    b = readWorkflow(base);
    if (b.why) return bad('reading', null, `the base's copy cannot be read as the plain YAML the limits judge (${b.why})`);
  }
  const H = h.doc;
  const B = b.doc || {};
  const hJobs = isMap(H.jobs) ? H.jobs : {};
  const bJobs = isMap(B.jobs) ? B.jobs : {};
  if (!isMap(H.jobs)) return bad('reading', lineOf(H, 'jobs'), 'it has no jobs mapping');
  if (B.jobs !== undefined && !isMap(B.jobs)) return bad('reading', null, 'the base\'s copy has no jobs mapping');

  // L1
  for (const k of new Set([...Object.keys(bJobs), ...Object.keys(hJobs)])) {
    const bn = k in bJobs ? jobNames(k, bJobs[k]) : null;
    const hn = k in hJobs ? jobNames(k, hJobs[k]) : null;
    const hit = (bn && matchesRequired(bn, required)) || (hn && matchesRequired(hn, required));
    if (!hit || (bn && hn && same(bn, hn))) continue;
    const what = !bn ? 'adds' : !hn ? 'removes' : 'renames';
    return bad('L1', lineOf(hJobs, k) ?? (hn ? lineOf(hJobs[k], 'name') : null), `it ${what} the job ${k}${hn && bn ? ` (${bn[0]} to ${hn[0]})` : ''}, whose name matches a required check (${required.join(', ')})`);
  }

  // L2
  try {
    const bTop = base === null ? { all: 'read', scopes: {} } : perms(B.permissions, 'the base');
    const hTop = perms(H.permissions, 'the workflow');
    if (base === null && (hTop === undefined || grantsWrite(hTop))) return bad('L2', lineOf(H, 'permissions'), hTop === undefined ? 'a new workflow must declare its permissions (without them it takes the default, which may write)' : 'a new workflow grants write permissions');
    const top = wider(bTop, hTop);
    if (top) return bad('L2', lineOf(H, 'permissions'), `the workflow's ${top}`);
    for (const [k, hj] of Object.entries(hJobs)) {
      const bj = bJobs[k];
      const hp = isMap(hj) && 'permissions' in hj ? perms(hj.permissions, `job ${k}`) : hTop;
      const bp = isMap(bj) && 'permissions' in bj ? perms(bj.permissions, `the base's job ${k}`) : bTop;
      const w = wider(bp, hp);
      if (w) return bad('L2', (isMap(hj) && lineOf(hj, 'permissions')) || lineOf(hJobs, k), `job ${k}: ${w}`);
      if (base === null && hp && grantsWrite(hp)) return bad('L2', lineOf(hJobs, k), `job ${k} of a new workflow grants write permissions`);
    }
  } catch (e) { return bad('L2', null, e.message); }

  // L3
  if (!isText(H.on) && !Array.isArray(H.on) && !isMap(H.on)) return bad('reading', lineOf(H, 'on'), 'it has no `on` this reader reads');
  const was = new Set(events(B.on));
  for (const e of ['pull_request_target', 'workflow_run']) if (events(H.on).includes(e) && !was.has(e)) return bad('L3', lineOf(H, 'on'), `it adds the ${e} trigger`);

  // L5
  const requiredJobs = Object.keys(bJobs).filter((k) => matchesRequired(jobNames(k, bJobs[k]), required));
  if (requiredJobs.length) {
    for (const k of ['env', 'defaults']) if (!same(B[k], H[k])) return bad('L5', lineOf(H, k), `it changes the workflow's ${k}, and the workflow holds the required job ${requiredJobs.join(', ')}`);
    for (const k of requiredJobs) {
      const r = keepsChecks(bJobs[k], hJobs[k], k, lineOf(hJobs, k), H);
      if (r) return bad('L5', r.line, r.why);
    }
  }
  return { ok: true, limits: ['L1', 'L2', 'L3', 'L5'], required: requiredJobs };
}

// The refusal's words: the limit, the line, why, and that the owner decides past them.
export const OUTSIDE = 'a workflow change outside the owner\'s limits needs the owner\'s word: bring it to Bob';
export const refusal = (path, r) => `${path}: ${r.limit}${r.line ? ` (line ${r.line})` : ''}: ${r.why}`;
