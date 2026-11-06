// The merge train's window (notes/train-spec-plan.md, option C' as the coordinator ruled it, 5 Nov).
// Pure: no git, no GitHub; train.mjs reads both and drives these. Up to k green job pull requests
// gate at once, each on its predicted merged result R(i): the job's head merged onto R(i-1), with
// R(-1) the tranche tip. Each has a spec head `train/head/<pr>-<seq>` at R(i) and its own draft spec
// pull request from it into the tranche itself (the coordinator's ruling, 5 Nov 17:20: the run's
// judge is the tranche's). Names are fresh per build and never reused or deleted (a reused name
// would need a force-push). `base` stays R(i-1): the chain, not a branch.
//
// A position: { n, id, head (the job's head), ref, run, green_at, seq, spec_pr, base (R(i-1)),
// result (R(i)), state: building|gating|green|red, start? }. `start` is set on position 0 only
// after a land: the tranche tip the chain now starts from (the land's merge commit), whose tree
// is the landed R(0)'s; before any land the chain starts at position 0's base.
// Every close and build carries its cause, the window rows' `cause` (condition 4).

export const SPEC_REF = /^train\/head\/(\d+)-(\d+)$/;
export const specHead = (n, seq) => `train/head/${n}-${seq}`;
const s10 = (x) => String(x ?? '').slice(0, 10);

// The tranche tip the chain expects, and the commit the next admitted position builds onto.
export const chainStart = (w) => (w.length ? w[0].start ?? w[0].base : null);
export const chainEnd = (w, tip) => (w.length ? w.at(-1).result : tip);

// A spec gate's check run, as a position's state: green, red (any completed run not a success,
// cancelled too), or gating (none yet, queued, running).
export const specState = (run) => (run?.status === 'completed' ? (run.conclusion === 'success' ? 'green' : 'red') : 'gating');

// Admission (condition 3): the queue as the train orders it (ready(): green on its own job-PR gate,
// release path first, providers' users held), never one already in the window or held, up to k.
// causes: why a pull request was last closed, so its rebuild says what it was rebuilt for.
export function admit(window, queue, k, { held = new Set(), causes = new Map() } = {}) {
  const inWindow = new Set(window.map((p) => p.n));
  const out = [];
  const ahead = window.map((p) => p.n);
  for (const c of queue) {
    if (window.length + out.length >= k) break;
    if (inWindow.has(c.n) || held.has(c.n) || out.some((x) => x.n === c.n)) continue;
    const position = window.length + out.length;
    const was = causes.get(c.n);
    out.push({ ...c, position, state: 'building', cause: `admitted at position ${position}${ahead.length ? ` behind PR ${ahead.join(', ')}` : ' on the tranche tip'}${was ? `; rebuilt after: ${was}` : ''}` });
    ahead.push(c.n);
  }
  return out;
}

// The first red position whose every position ahead is green: only then is the red its own (a red
// behind a gate still running may be the red of one ahead, which R(i) holds). -1: none to act on.
export function firstRed(window) {
  for (let i = 0; i < window.length; i++) {
    if (window[i].state === 'red') return i;
    if (window[i].state !== 'green') return -1;
  }
  return -1;
}

// The positions behind those leaving the window (red, closed, refused, moved: `leaving`): each
// stands when its own change (filesOf: a position's files, records aside; null when not read) shares
// no file with any that leaves ahead of it, marked `dropped` (its tested tree holds their changes:
// it lands on its spec minus them, and nothing is admitted behind it until it has); the rest leave
// too, with cause(p) (coordinator, 5 Nov; copy: 468 red at position 0 of 8 closed 572 and 574,
// green and sharing no file with it). With no filesOf every one behind leaves, as before.
function behind(window, from, leaving, filesOf, cause) {
  const gone = new Set();
  let unread = false;
  const leave = (p) => { const f = filesOf(p); if (f) for (const x of f) gone.add(x); else unread = true; };
  leaving.forEach(leave);
  const keep = [];
  const close = [];
  for (const p of window.slice(from)) {
    const f = unread ? null : filesOf(p);
    if (f && ![...f].some((x) => gone.has(x))) keep.push({ ...p, dropped: true });
    else { close.push({ ...p, cause: cause(p) }); leave(p); }
  }
  return { keep, close };
}
const none = () => null;
// What stands ahead of i, then those kept behind it; a kept one that is now first keeps the
// chain's start (the tranche tip the chain was built on), not its base (the leaver's result).
const rejoin = (window, i, kept) => (i === 0 && kept.length ? [{ ...kept[0], start: chainStart(window) }, ...kept.slice(1)] : [...window.slice(0, i), ...kept]);

// Red at i: i goes back to its job (refused to BOB, as a red merged result is today); every spec
// behind holds R(i) and is closed, to be rebuilt on R(i-1), unless it shares no file with what
// leaves (behind); those ahead stand.
export function onRed(window, i, filesOf = none) {
  const red = window[i];
  const b = behind(window, i + 1, [red], filesOf, () => `red ahead: PR ${red.n}`);
  return { refuse: red, close: b.close, keep: rejoin(window, i, b.keep) };
}

// Position i leaves (its cause) and those behind it that share a file with it too (aheadCause);
// the rest stand (behind). Its close comes first.
export function onLeave(window, i, cause, aheadCause, filesOf = none) {
  const b = behind(window, i + 1, [window[i]], filesOf, () => aheadCause);
  return { close: [{ ...window[i], cause }, ...b.close], keep: rejoin(window, i, b.keep) };
}

// A job pull request whose head moved (or closed, merged elsewhere, made a draft, retargeted: `why`):
// its spec no longer tests its head, and every spec behind holds it, unless it shares no file with
// what leaves (behind). It re-enters at the back.
export function onHeadMoved(window, n, why = 'head moved', filesOf = none) {
  const i = window.findIndex((p) => p.n === n);
  if (i < 0) return { close: [], keep: window };
  const cause = `PR ${n} ${why}`;
  return onLeave(window, i, cause, `${cause} (ahead)`, filesOf);
}

// The tranche moved by anything but the window's own land (a plain pull request, a hand merge):
// every R(i) is built on a start that is no longer the tranche. Nothing closes while it matches.
// `from` (judged by the train; coordinator, 5 Nov): the first position whose own change shares a file with
// the move, records aside (0: all close, as before; the window's length: none). The positions
// ahead of it stand, each marked `moved` with the tip so judged: each lands merged onto the tranche
// as it is then, on the spec-tested path, which takes its tree plus a move that shares no file.
export function onTrancheMoved(window, tip, from = 0) {
  if (!window.length || chainStart(window) === tip || window[0].moved === tip) return { close: [], keep: window };
  const cause = `tranche moved to ${s10(tip)}${from ? `, in a file PR ${window[from]?.n} changes` : ''}`;
  return { close: window.slice(from).map((p) => ({ ...p, cause })), keep: window.slice(0, from).map((p) => ({ ...p, moved: tip })) };
}

// Position 0 landed as `landed` (the tranche's new tip): it leaves the window, and the chain now
// starts at that commit, whose tree is R(0)'s (the spec-tested land, or its full re-gate).
export function onLand(window, landed) {
  const [first, ...rest] = window;
  return { landed: first, keep: rest.map((p, i) => ({ ...p, ...(i === 0 ? { start: landed } : {}) })) };
}

// The next seq for a pull request's spec pair: one past the highest any row or `taken` shows.
export function nextSeq(rows, n, taken = []) {
  const seqs = [...rows.filter((r) => r?.row === 'spec' && r.pr === n).map((r) => Number(r.seq)), ...taken.map(Number)].filter(Number.isFinite);
  return (seqs.length ? Math.max(...seqs) : 0) + 1;
}

// A restarted train's window, from its rows (metrics/train-window.jsonl) and the spec pull requests
// still open (their numbers), at tranche tip `tip`. A build whose spec PR is open and whose pair
// has no close, land or fallback row is a candidate; the window is the chain of them from the tip:
// the first builds on the tip itself, or on the R(0) of a land whose merge commit the tip is; each
// next on the one before's R. The rest are closed with the cause (`closed: true` for one whose spec
// pull request is closed already: a row only).
export function restore(rows, open, tip) {
  const spec = (rows || []).filter((r) => r?.row === 'spec');
  const key = (r) => `${r.pr}-${r.seq}`;
  const ended = new Set(spec.filter((r) => r.event !== 'build').map(key));
  const isOpen = new Set((open || []).map((x) => Number(x?.number ?? x)));
  const builds = spec.filter((r) => r.event === 'build' && !ended.has(key(r)));
  const lands = spec.filter((r) => (r.event === 'land' || r.event === 'fallback') && r.landed);
  const cand = builds.filter((r) => isOpen.has(Number(r.spec_pr))).sort((a, b) => (a.position - b.position) || String(a.at).localeCompare(String(b.at)));
  const close = builds.filter((r) => !isOpen.has(Number(r.spec_pr))).map((r) => ({ ...pos(r), closed: true, cause: `train restarted: spec PR ${r.spec_pr} is not open` }));
  const window = [];
  let expected = tip;
  for (;;) {
    const at = window.length === 0
      ? cand.find((r) => r.base === tip) || cand.find((r) => lands.some((l) => l.head === r.base && l.landed === tip))
      : cand.find((r) => r.base === expected && !window.some((p) => p.n === r.pr));
    if (!at) break;
    window.push({ ...pos(at), state: 'gating', ...(window.length === 0 && at.base !== tip ? { start: tip } : {}) });
    expected = at.head;
    cand.splice(cand.indexOf(at), 1);
  }
  for (const r of cand) close.push({ ...pos(r), cause: `train restarted: its base ${s10(r.base)} is not the end of the window's chain (${s10(expected)})` });
  return { window, close };
}
const pos = (r) => ({ n: r.pr, id: r.module ?? null, head: r.job_head ?? null, ref: r.ref ?? null, run: r.run ?? null, green_at: r.green_at ?? null, seq: r.seq, spec_pr: r.spec_pr, base: r.base, result: r.head, position: r.position });
