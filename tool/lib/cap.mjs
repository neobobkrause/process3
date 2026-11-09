// job start <id> (not a restart, which replaces a session): the job cap, the account's job
// sessions working toward publish against the cap less the slots recorded holds keep (hold.mjs).
// A published job holds no slot unless its gate went red (PD-7, slots.mjs).
import { readHolds, slotsHeld } from './hold.mjs';
import { isArchived, liveJobIds, readSessions, sessionsCount } from './status.mjs';
import { fail, jobCap, loadConfig, repoSlug } from './util.mjs';
import { budgetGate } from './pace.mjs';
import { publishedJobs, slotNote, slotUse } from './slots.mjs';
import { flowRows, readOpenLayer } from './layerflow.mjs';

// The live count comes from evidence only (C28, the coordinator, 8 Nov: on the copy BOB's start
// script passed --live 20, a number it typed, and the check refused on the cap while 15 of 20
// slots were empty, 73 min of idle capacity on layer 11): the list_sessions result, counted by the
// sweep's rule (status.mjs jobCount), less the published jobs PD-7 frees. A bare --live is refused.
export const SESSIONS_NEEDED = 'job start <id> --sessions <file>: your list_sessions result saved as JSON (list_sessions, newest first, as status --role bob asks for it); the job cap is counted from it, never from a number typed (--live is not taken)';
export function capCheck(root, { live, sessions, io = {}, log = () => {} } = {}) {
  if (sessions === undefined || sessions === true) fail(live !== undefined ? `--live ${live === true ? '' : live} is not taken: ${SESSIONS_NEEDED}` : SESSIONS_NEEDED);
  const listed = readSessions(sessions, { root });
  if (live !== undefined) log(`--live ${live} ignored: the job sessions are counted from --sessions`);
  const n = sessionsCount(listed, undefined, () => {});
  const cfg = loadConfig(root);
  const { cap } = jobCap(cfg);
  let held = 0;
  // A slot just held counts (cold review of R17f): the holds read fresh.
  try { held = slotsHeld(readHolds(root, cfg.state_branch, { fresh: true })); } catch { held = 0; }
  // A new session is a GitHub-heavy act: none while GitHub's own count is at the target (PD-22, pace.mjs).
  const gate = budgetGate(root);
  if (gate) fail(`${gate}; nothing was started`);
  // The open layer's published jobs (PD-7): unread, every live session holds a slot, said.
  // Any error reading it is an unread layer, never a refused start (cold review of C26).
  let published = [];
  let view = null;
  try {
    view = io.view !== undefined ? io.view : (io.readView || readOpenLayer)(root, cfg, { io });
    published = publishedJobs(view, { slug: io.slug || repoSlug(root), ...(io.gate ? { gate: io.gate } : {}) });
  } catch (e) { log(`the open layer was not read (${String(e?.message || e).split('\n')[0]}): every live job session holds a slot`); published = []; }
  // Whose sessions are live: list_sessions's (a published job with no live session frees nothing),
  // and every job started since the list was read (cold review of C28: BOB lists once a wake and
  // runs each start line with the same file; without these, a burst of starts each saw the same
  // count and went past the cap). The list was read no earlier than its newest session's
  // created_at; a start row after that is a session it lacks. A start in a layer that is not open
  // (no view) is not seen: such starts take no layer flow.
  const jobIds = liveJobIds(listed);
  const since = startedSince(root, cfg.state_branch, view, listedAt(listed)).filter((id) => !jobIds.has(id));
  for (const id of since) jobIds.add(id);
  if (since.length) log(`${since.length} job(s) started since the list was read, counted: ${since.join(', ')}`);
  const u = slotUse(n + since.length, published, { jobIds });
  const note = slotNote(u);
  if (u.working >= cap - held) fail(`the job cap is full: ${u.working} job sessions working of the cap ${cap}${held ? ` less ${held} held` : ''} (${n + since.length} live${since.length ? `: ${n} listed, ${since.length} started since` : ''}${note ? `; ${note}` : ''}); nothing was started. Counted from --sessions${since.length ? ' and the start rows since' : ''}:\n${[...countedLines(listed, u), ...since.map((id) => `- (no session listed yet) job ${id}: started since the list was read, holds a slot`)].join('\n')}`);
  return { n: n + since.length, listed: n, since, working: u.working, free: u.free, resumed: u.resumed, cap, held };
}

// The job sessions a refusal counted, one line each, as the count read them: the session, its
// title and status, and whether it holds a slot (a published job with a gate not red holds none).
// One session per freed module is marked free, the newest (slotUse frees one slot per published
// job; cold review of C28: a job and its restart both live counted one free and two held). A
// session carried from an earlier read (readSessions' partial pages) says so.
export function countedLines(listed, u = { free: [], resumed: [] }) {
  const jobs = (listed || []).filter((x) => !isArchived(x)).map((x) => ({ x, id: String(x.title || '').trim().match(/^job (\S+)( \(restart\))?$/)?.[1] })).filter((j) => j.id);
  const t = (x) => Date.parse(x.updated_at || x.created_at) || 0;
  const freed = new Set(u.free.map((id) => jobs.filter((j) => j.id === id).sort((a, b) => t(b.x) - t(a.x))[0]?.x).filter(Boolean));
  return jobs.map(({ x, id }) => `- ${x.id || '?'} "${String(x.title).trim()}" ${x.session_status || x.status || '?'}${x.carried ? ' (carried from the last read: older than the pages read)' : ''}: ${freed.has(x) ? 'published, holds no slot (PD-7)' : u.resumed.includes(id) ? 'resumed on a red gate, holds a slot' : 'holds a slot'}`);
}
// The time a list_sessions result was read no earlier than: its newest session's created_at.
export const listedAt = (listed) => Math.max(0, ...(listed || []).map((x) => Date.parse(x.created_at) || 0));
// The modules whose job started after t: the start rows of the open layer and of the next (its
// early starts), a fresh-branch restart not (it replaces a session), as the idle check counts them.
export function startedSince(root, sb, view, t) {
  if (!view || !t) return [];
  const ids = (n) => (n !== undefined && n !== null ? flowRows(root, sb, n).starts.filter((r) => Date.parse(r.at) > t && !r.restart).map((r) => r.module) : []);
  return [...new Set([...ids(view.n), ...(view.early_next !== view.n ? ids(view.early_next) : [])])];
}
