// job start <id> (not a restart, which replaces a session): the job cap, the account's job
// sessions against the cap less the slots recorded holds keep (hold.mjs).
import { readHolds, slotsHeld } from './hold.mjs';
import { readSessions, sessionsCount } from './status.mjs';
import { fail, jobCap, loadConfig } from './util.mjs';
import { budgetGate } from './pace.mjs';

export function capCheck(root, { live, sessions } = {}) {
  if (sessions === true) fail('--sessions <file>: your list_sessions result, saved as JSON');
  const listed = sessions === undefined ? null : readSessions(sessions, { root });
  const n = listed ? sessionsCount(listed, live, () => {}) : Number(live);
  if ((live === undefined && !listed) || live === true || !Number.isInteger(n) || n < 0) fail('job start <id> --live <n> (or --sessions <file>): the account\'s job sessions, so the job cap holds');
  const cfg = loadConfig(root);
  const { cap } = jobCap(cfg);
  let held = 0;
  try { held = slotsHeld(readHolds(root, cfg.state_branch)); } catch { held = 0; }
  // The budget throttles new sessions (R17, pace.mjs).
  const gate = budgetGate(root);
  if (gate) fail(`${gate}; nothing was started`);
  if (n >= cap - held) fail(`the job cap is full: ${n} job sessions live of the cap ${cap}${held ? ` less ${held} held` : ''}; nothing was started`);
  return { n, cap, held };
}
