// job start <id> (not a restart, which replaces a session): the job cap, the account's job
// sessions working toward publish against the cap less the slots recorded holds keep (hold.mjs).
// A published job holds no slot unless its gate went red (PD-7, slots.mjs).
import { readHolds, slotsHeld } from './hold.mjs';
import { liveJobIds, readSessions, sessionsCount } from './status.mjs';
import { Fail, fail, jobCap, loadConfig, repoSlug } from './util.mjs';
import { budgetGate } from './pace.mjs';
import { publishedJobs, slotNote, slotUse } from './slots.mjs';
import { readOpenLayer } from './layerflow.mjs';

export function capCheck(root, { live, sessions, io = {}, log = () => {} } = {}) {
  if (sessions === true) fail('--sessions <file>: your list_sessions result, saved as JSON');
  const listed = sessions === undefined ? null : readSessions(sessions, { root });
  const n = listed ? sessionsCount(listed, live, () => {}) : Number(live);
  if ((live === undefined && !listed) || live === true || !Number.isInteger(n) || n < 0) fail('job start <id> --live <n> (or --sessions <file>): the account\'s job sessions, so the job cap holds');
  const cfg = loadConfig(root);
  const { cap } = jobCap(cfg);
  let held = 0;
  // A slot just held counts (cold review of R17f): the holds read fresh.
  try { held = slotsHeld(readHolds(root, cfg.state_branch, { fresh: true })); } catch { held = 0; }
  // The budget throttles new sessions (R17, pace.mjs).
  const gate = budgetGate(root);
  if (gate) fail(`${gate}; nothing was started`);
  // The open layer's published jobs (PD-7): unread, every live session holds a slot, said.
  let published = [];
  try {
    const view = io.view !== undefined ? io.view : (io.readView || readOpenLayer)(root, cfg, { io });
    published = publishedJobs(view, { slug: io.slug || repoSlug(root), ...(io.gate ? { gate: io.gate } : {}) });
  } catch (e) { if (!(e instanceof Fail)) throw e; log(`the open layer was not read (${e.message}): every live job session holds a slot`); }
  const u = slotUse(n, published, { jobIds: listed ? liveJobIds(listed) : null });
  const note = slotNote(u);
  if (u.working >= cap - held) fail(`the job cap is full: ${u.working} job sessions working of the cap ${cap}${held ? ` less ${held} held` : ''} (${n} live${note ? `; ${note}` : ''}); nothing was started`);
  return { n, working: u.working, free: u.free, resumed: u.resumed, cap, held };
}
