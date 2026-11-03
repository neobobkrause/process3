// start check (Foundations, "Every session checks its start"): approvals load only at a
// session's start, and a session can start on a stale checkout. The first command a session
// runs fetches the branch it was started from and compares HEAD, and the approvals block the
// session loaded from its checkout, with that branch's tip. It prints both SHAs and exits
// non-zero when either differs; the session then acts on nothing, reports both SHAs to its
// starter and ends.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { approvalsBlock } from './record.mjs';
import { exists, fail, git, loadConfig } from './util.mjs';

export function startCheck(root, { branch, log = console.log } = {}) {
  if (branch === true) fail('--branch needs the name of the branch the session started from');
  const name = branch || loadConfig(root).tranche;
  const ref = `refs/remotes/origin/${name}`;
  const f = git(['fetch', '-q', 'origin', `+refs/heads/${name}:${ref}`], { cwd: root, allowFail: true });
  if (f.code !== 0) fail(`could not fetch ${name} from origin (${f.stderr.trim()}); the start is not confirmed`);
  const head = git(['rev-parse', 'HEAD'], { cwd: root });
  const tip = git(['rev-parse', ref], { cwd: root });
  // The approvals file and heading as the tip names them: the tip is the trusted side.
  const { approvals: { file, heading } } = loadConfig(root, tip);
  const loaded = existsSync(join(root, file)) ? approvalsBlock(readFileSync(join(root, file), 'utf8'), heading) : '';
  const atTip = exists(root, tip, file) ? approvalsBlock(git(['show', `${tip}:${file}`], { cwd: root }), heading) : '';
  const sameHead = head === tip;
  const sameApprovals = loaded === atTip;
  log(`HEAD ${head}`);
  log(`${name} ${tip}`);
  log(`approvals in ${file}: ${sameApprovals ? 'the same as the tip' : 'DIFFERENT from the tip'}`);
  const ok = sameHead && sameApprovals;
  log(ok ? 'start check: ok' : `start check: FAILED (${[!sameHead && 'HEAD is not the tip', !sameApprovals && 'the approvals differ'].filter(Boolean).join('; ')}): act on nothing, send both SHAs to your starter and end`);
  return { ok, head, tip, sameHead, sameApprovals };
}
