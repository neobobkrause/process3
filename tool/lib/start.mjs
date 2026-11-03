// start check (Foundations, "Every session checks its start"): approvals load only at a
// session's start, and a session can start on a stale checkout. The first command a session
// runs fetches the branch it was started from and compares HEAD, and the approvals block the
// session loaded from its checkout, with that branch's tip. It prints both SHAs and exits
// non-zero when either differs; the session then acts on nothing, reports both SHAs to its
// starter and ends. It records the hash of the approvals it loaded in a file under .git (not the
// tree); start check --wake, run by BOB, ROOT and the watcher at every later wake after they
// fetch and detach at the tip, compares the tip's approvals with that record: a session loads
// approvals only at its start, so one whose approvals changed is replaced.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { approvalsBlock } from './record.mjs';
import { exists, fail, git, loadConfig } from './util.mjs';

const hash = (t) => createHash('sha256').update(t).digest('hex');
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

export function startCheck(root, { branch, log = console.log } = {}) {
  const { name, head, tip, file, loaded, atTip } = read(root, branch);
  writeFileSync(loadedFile(root), hash(loaded) + '\n');
  const sameHead = head === tip;
  const sameApprovals = loaded === atTip;
  log(`HEAD ${head}`);
  log(`${name} ${tip}`);
  log(`approvals in ${file}: ${sameApprovals ? 'the same as the tip' : 'DIFFERENT from the tip'}`);
  const ok = sameHead && sameApprovals;
  log(ok ? 'start check: ok' : `start check: FAILED (${[!sameHead && 'HEAD is not the tip', !sameApprovals && 'the approvals differ'].filter(Boolean).join('; ')}): act on nothing, send both SHAs to your starter and end`);
  return { ok, head, tip, sameHead, sameApprovals };
}

// start check --wake: the tip's approvals against those this session recorded at its start.
export function wakeCheck(root, { branch, log = console.log } = {}) {
  const { name, tip, atTip } = read(root, branch);
  const rec = loadedFile(root);
  log(`${name} ${tip}`);
  if (!existsSync(rec)) {
    writeFileSync(rec, hash(atTip) + '\n');
    log('start check --wake: no record of the approvals this session loaded; the tip\'s are recorded now');
    return { ok: true, recorded: true };
  }
  const ok = readFileSync(rec, 'utf8').trim() === hash(atTip);
  log(ok ? 'start check --wake: ok, the approvals are those this session started with' : 'approvals changed since this session started: it is replaced');
  return { ok, tip };
}
