// start check (Foundations, "Every session checks its start"): approvals load only at a
// session's start, and a session can start on a stale checkout. The first command a session
// runs fetches the branch it was started from and compares HEAD, and the approvals block the
// session loaded from its checkout, with that branch's tip. It prints both SHAs and exits
// non-zero when either differs; the session then acts on nothing, reports both SHAs to its
// starter and ends. It records the hash of the approvals it loaded in a file under .git (not the
// tree); start check --wake, run by BOB, ROOT and the watcher at every later wake after they
// fetch and detach at the tip, compares the tip's approvals with that record: a session loads
// approvals only at its start, so one whose approvals changed is replaced. A fresh container has
// no such record (PR 38 note), so the starting prompts and task prompts carry the hash of the
// tip's block at prompt time (--approvals <hash>), and --wake compares the tip's with that.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { approvalsBlock } from './record.mjs';
import { exists, fail, git, loadConfig, run } from './util.mjs';

const hash = (t) => createHash('sha256').update(t).digest('hex');
const HASH = /^[0-9a-f]{64}$/;

// The hash of the approvals block at a commit (the commit's own config names the file), as
// --wake --approvals takes it.
export function approvalsHash(root, rev) {
  const { approvals: { file, heading } } = loadConfig(root, rev);
  return hash(exists(root, rev, file) ? approvalsBlock(git(['show', `${rev}:${file}`], { cwd: root }), heading) : '');
}
export const loadedFile = (root) => resolve(root, git(['rev-parse', '--git-path', 'p3-approvals-loaded'], { cwd: root }));

// Fetches the branch; HEAD, its tip, the approvals file and both blocks (the tip names the file).
function read(root, branch) {
  if (branch === true) fail('--branch needs the name of the branch the session started from');
  const name = branch || loadConfig(root).tranche;
  const ref = `refs/remotes/origin/${name}`;
  const f = git(['fetch', '-q', 'origin', `+refs/heads/${name}:${ref}`], { cwd: root, allowFail: true });
  if (f.code !== 0) fail(`could not fetch ${name} from origin (${f.stderr.trim()}); the start is not confirmed`);
  const head = git(['rev-parse', 'HEAD'], { cwd: root });
  const tip = git(['rev-parse', ref], { cwd: root });
  const { approvals: { file, heading } } = loadConfig(root, tip);
  const loaded = existsSync(join(root, file)) ? approvalsBlock(readFileSync(join(root, file), 'utf8'), heading) : '';
  const atTip = exists(root, tip, file) ? approvalsBlock(git(['show', `${tip}:${file}`], { cwd: root }), heading) : '';
  return { name, head, tip, file, loaded, atTip };
}

// SHM-5: the product's setup script, process/config.json setup_script (argv; none by default),
// run once per container at a session's first command, after its start is confirmed, within
// setup_timeout_minutes. A marker under .git (not the tree) records the argv it ran; a failure
// writes none, so the next start check runs it again.
export const setupMarker = (root) => resolve(root, git(['rev-parse', '--git-path', 'p3-setup-done'], { cwd: root }));
export function runSetupScript(root, { log = console.log, exec = run } = {}) {
  const cfg = loadConfig(root);
  const argv = cfg.setup_script;
  if (argv === undefined || argv === null) return { ok: true, ran: false };
  if (!Array.isArray(argv) || !argv.length || !argv.every((a) => typeof a === 'string') || !argv[0]) fail('process/config.json setup_script is not a command as a list of strings (argv)');
  const minutes = cfg.setup_timeout_minutes;
  if (!(Number.isFinite(minutes) && minutes > 0)) fail('process/config.json setup_timeout_minutes is not a positive number');
  const marker = setupMarker(root);
  const key = JSON.stringify(argv);
  if (existsSync(marker) && readFileSync(marker, 'utf8').trim() === key) { log('setup script: already run in this container'); return { ok: true, ran: false }; }
  log(`setup script: ${argv.join(' ')}`);
  const r = exec(argv[0], argv.slice(1), { cwd: root, timeout: minutes * 60000 });
  if (r.code !== 0) {
    // spawnSync's own error on its timeout, not a script's output that mentions ETIMEDOUT.
    const timedOut = /spawnSync \S+ ETIMEDOUT$/.test(r.stderr.trimEnd());
    const tail = `${r.stdout}${r.stderr}`.trimEnd().split('\n').slice(-20).join('\n');
    log(`setup script: FAILED (${timedOut ? `timed out after ${minutes} minutes` : `exit ${r.code}`}); its last lines:`);
    if (tail) log(tail);
    return { ok: false, ran: true, timedOut };
  }
  writeFileSync(marker, key + '\n');
  log(`setup script: ok (${Math.round(r.seconds)} s)`);
  return { ok: true, ran: true };
}

// anchor (job start, coordinator 5 Nov: a pass at a tranche merging every few minutes started
// nothing): a checkout behind the tip moves to it, detached, just before the comparison, when the
// approvals it holds are the tip's, its tracked files are clean, the pin is the tip's (the tool
// running is the tranche's), and HEAD was once the tip: an ancestor of it, or, in a shallow clone
// whose history is cut, a value of the fetched ref (its log) or the commit the clone began at.
const logOf = (root, ref) => { try { return readFileSync(resolve(root, git(['rev-parse', '--git-path', `logs/${ref}`], { cwd: root })), 'utf8').split('\n'); } catch { return []; } };
const wasTip = (root, head, name) => logOf(root, `refs/remotes/origin/${name}`).some((l) => l.split(' ', 2).includes(head))
  || logOf(root, 'HEAD').some((l) => /\tclone: /.test(l) && l.split(' ', 2)[1] === head);
const movable = (root, head, tip, name) => !git(['status', '--porcelain', '--untracked-files=no'], { cwd: root })
  && git(['ls-tree', head, '--', '.process'], { cwd: root }) === git(['ls-tree', tip, '--', '.process'], { cwd: root })
  && (git(['merge-base', '--is-ancestor', head, tip], { cwd: root, allowFail: true }).code === 0 || wasTip(root, head, name));

export function startCheck(root, { branch, setup = false, anchor = false, log = console.log } = {}) {
  let { name, head, tip, file, loaded, atTip } = read(root, branch);
  if (anchor && head !== tip && loaded === atTip && movable(root, head, tip, name)
    && git(['checkout', '-q', '--detach', tip], { cwd: root, allowFail: true }).code === 0) {
    log(`HEAD ${head} moved to the tip of ${name}`);
    head = tip;
  }
  writeFileSync(loadedFile(root), hash(loaded) + '\n');
  const sameHead = head === tip;
  const sameApprovals = loaded === atTip;
  log(`HEAD ${head}`);
  log(`${name} ${tip}`);
  log(`approvals in ${file}: ${sameApprovals ? 'the same as the tip' : 'DIFFERENT from the tip'}`);
  const ok = sameHead && sameApprovals;
  if (!ok) {
    log(`start check: FAILED (${[!sameHead && 'HEAD is not the tip', !sameApprovals && 'the approvals differ'].filter(Boolean).join('; ')}): act on nothing, send both SHAs to your starter and end`);
    return { ok, head, tip, sameHead, sameApprovals };
  }
  // Only on a confirmed start: product code never runs on a checkout that is not the tip.
  const script = setup ? runSetupScript(root, { log }) : { ok: true, ran: false };
  log(script.ok ? 'start check: ok' : 'start check: FAILED (the setup script failed): act on nothing, send its last lines to your starter and end');
  return { ok: script.ok, head, tip, sameHead, sameApprovals, setup: script };
}

// start check --wake: the tip's approvals against those this session recorded at its start, or,
// with --approvals <hash>, against the hash its starting or task prompt carries.
export function wakeCheck(root, { branch, approvals, log = console.log } = {}) {
  if (approvals !== undefined && !HASH.test(String(approvals))) fail('--approvals takes the 64-hex hash the starting or task prompt carries');
  const { name, tip, atTip } = read(root, branch);
  const rec = loadedFile(root);
  log(`${name} ${tip}`);
  if (approvals !== undefined) {
    const ok = approvals === hash(atTip);
    log(ok ? 'start check --wake: ok, the approvals are those this session started with' : 'approvals changed since this session started: it is replaced');
    return { ok, tip };
  }
  if (!existsSync(rec)) {
    writeFileSync(rec, hash(atTip) + '\n');
    log('start check --wake: no record of the approvals this session loaded; the tip\'s are recorded now');
    return { ok: true, recorded: true };
  }
  const ok = readFileSync(rec, 'utf8').trim() === hash(atTip);
  log(ok ? 'start check --wake: ok, the approvals are those this session started with' : 'approvals changed since this session started: it is replaced');
  return { ok, tip };
}

// C42 (BD-R2, one repository per session; PD-13: a session started with more than one repository
// loads no repository's .claude/settings.json, PLT-7): start check's warnings, never a refusal.
// - The project directory Claude Code names (CLAUDE_PROJECT_DIR, where it sets one) is not inside
//   this repository's root: the session was started somewhere else, as a container rooted above
//   its repositories is.
// - The root's parent holds more than one git checkout: the container layout of a session started
//   with several repositories (/home/user/<repo>, one per repository).
const inside = (dir, root) => { const d = resolve(dir); const r = resolve(root); return d === r || d.startsWith(r.endsWith(sep) ? r : r + sep); };
export function workdirLines(root, { env = process.env, real = (p) => { try { return realpathSync(p); } catch { return resolve(p); } } } = {}) {
  const L = [];
  const top = real(root);
  const project = env.CLAUDE_PROJECT_DIR;
  if (project && !inside(real(project), top)) L.push(`working directory: the session's project directory ${project} is not inside ${top}, the repository it works in: start each session with that one repository (BD-R2), or its .claude/settings.json does not load (PD-13)`);
  const parent = dirname(top);
  let repos = [];
  try { repos = readdirSync(parent, { withFileTypes: true }).filter((e) => e.isDirectory() && existsSync(join(parent, e.name, '.git'))).map((e) => e.name).sort(); } catch { repos = []; }
  if (repos.length > 1) L.push(`working directory: ${repos.length} repositories at ${parent} (${repos.join(', ')}): this session looks started with more than one, and such a session loads no repository's .claude/settings.json (PD-13). Work in ${basename(top)} only; the rest goes through a session started in its own repository (BD-R2)`);
  return L;
}
