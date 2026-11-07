// PD-7 (coordinator, 7 Nov, DECISIONS.md): the job cap counts jobs still working toward publish.
// A job whose pull request into the layer is published (marked ready: waiting on its gate or its
// land) holds no slot; its session stays alive, so a red gate is fixed in that session without a
// restart. When the newest gate run on its head is red, the job resumes and holds a slot again; a
// resumed job is never refused (it starts nothing), so it goes ahead of new starts even when no slot
// is free. The account's live sessions stay printed beside the count, so a platform limit shows.
// One reading for job start's cap check, status's flow and cap lines, and the idle checks.
import { checkRuns } from './github.mjs';

// A gate run that leaves the job work to do: it finished and did not pass, or was cancelled or went
// stale with no newer run after it (nothing will finish it: the job re-runs it). Not yet run,
// queued, running or passed: the job waits on its gate or its land (cold review of C26).
const RED = new Set(['failure', 'timed_out', 'action_required', 'startup_failure', 'cancelled', 'stale']);
export const gateRed = (run) => run?.status === 'completed' && RED.has(run.conclusion);

// The newest gate run on a head: null when none ran, undefined when GitHub could not be read. A
// completed run on a sha never changes: kept for the command's life, so a burst reads each once.
const done = new Map();
export function newestGate(slug, head, { read = checkRuns } = {}) {
  const key = `${slug}@${head}`;
  if (done.has(key)) return done.get(key);
  const runs = read(slug, head, 'gate');
  if (runs === null || runs === undefined) return undefined;
  const run = runs[0] || null;
  if (run?.status === 'completed') done.set(key, run);
  return run;
}

// The open layer's published jobs, each with its newest gate run on its head (read by `gate(pr)`,
// default newestGate). A read that fails (undefined, or a throw) is unknown: the job holds a slot,
// the safe side for the cap.
export function publishedJobs(view, { slug, gate = (pr) => newestGate(slug, pr.head) } = {}) {
  if (view?.kind !== 'open') return [];
  return (view.states || []).filter((s) => s.state === 'published').map((s) => {
    const pr = (view.prs || []).find((p) => p.number === s.pr) || null;
    let run = null;
    let unread = false;
    try { run = pr?.head ? gate(pr) : undefined; } catch { run = undefined; }
    if (run === undefined) unread = true;
    return { id: s.id, pr: s.pr, red: gateRed(run), unread };
  });
}

// Of `live` job sessions, those holding a slot. `published` from publishedJobs; `jobIds`, when the
// sessions were listed, the modules with a live job session (a published job with none holds
// nothing to subtract). free: published, gate not red, holding no slot; resumed: gate red.
export function slotUse(live, published = [], { jobIds = null } = {}) {
  const live_ = live === undefined || live === null || live === 'unmeasured' ? null : Number(live);
  const mine = published.filter((p) => !jobIds || jobIds.has(p.id));
  const free = mine.filter((p) => !p.red && !p.unread).map((p) => p.id);
  const resumed = mine.filter((p) => p.red).map((p) => p.id);
  const unread = mine.filter((p) => p.unread).map((p) => p.id);
  return { live: live_, working: live_ === null ? null : Math.max(0, live_ - free.length), free, resumed, unread };
}

// The words beside a count: how many published jobs hold no slot, and which resumed on a red gate.
export const slotNote = (u) => [u.free.length ? `${u.free.length} published holding no slot (PD-7)` : '', u.resumed.length ? `resumed on a red gate: ${u.resumed.join(', ')}` : '', u.unread?.length ? `gate unread, holding a slot: ${u.unread.join(', ')}` : ''].filter(Boolean).join('; ');
