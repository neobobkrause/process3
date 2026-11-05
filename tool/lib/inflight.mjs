// The merge train's in-flight hold (build train-inflight, item 8; the coordinator's ruling, 5 Nov:
// copy PR 290's merged result 3660ddc was gating 38 min when one GitHub 503 ended its merge; the
// train landed plain PRs 505 and 506 meanwhile, and 290 needed a new merged result and a new gate).
// Once the train has a merged result gating, it records a hold on the state branch: one 'inflight'
// row { pr, module, tip, session, at, until }; and, when that gate's merge ends, one 'end' row with
// its cause. While a hold is open nothing else lands on the tranche: the train goes back to that
// pull request first, and merge and merge --plain run outside the train refuse. A hold never
// blocks past its `until` (the gate's own cap and the queue allowance), whether or not an end row
// was written (a dead train).
import { fail } from './util.mjs';
import { fetchState, jsonl, readState, writeState } from './state.mjs';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const INFLIGHT_FILE = 'merger/inflight.jsonl';
export const INFLIGHT_QUEUE_MIN = 15; // the gate's wait for a runner, past its own cap
const MIN = 60000;
const same = (a, b) => a.pr === b.pr && a.tip === b.tip;

// The open hold in these rows at time t, or null: the latest 'inflight' row with no 'end' row for
// the same pull request and tip, and its until not passed.
export function openHold(rows, t = Date.now()) {
  const ended = rows.filter((r) => r.row === 'end');
  const open = rows.filter((r) => r.row === 'inflight' && !ended.some((e) => same(e, r)));
  const h = open.at(-1) || null;
  return h && Date.parse(h.until) > t ? h : null;
}
// The latest 'inflight' row with no end row, its until passed or not (a restarted train ends it).
export function unendedHold(rows) {
  const ended = rows.filter((r) => r.row === 'end');
  return rows.filter((r) => r.row === 'inflight' && !ended.some((e) => same(e, r))).at(-1) || null;
}
export const readHolds = (root, sb) => jsonl(readState(root, sb, INFLIGHT_FILE));

const add = (wt, row) => { mkdirSync(dirname(join(wt, INFLIGHT_FILE)), { recursive: true }); appendFileSync(join(wt, INFLIGHT_FILE), JSON.stringify(row) + '\n'); };
const rowsIn = (wt) => { const f = join(wt, INFLIGHT_FILE); return jsonl(existsSync(f) ? readFileSync(f, 'utf8') : ''); };

// Opens the hold for this merged result, once (a row for the same PR and tip already unended: none).
export function startHold(root, sb, { pr, module, tip, session, minutes }) {
  const at = new Date();
  const row = { at: at.toISOString(), row: 'inflight', pr, module, tip, session, until: new Date(at.getTime() + minutes * MIN).toISOString() };
  writeState(root, sb, `merge train: PR ${pr} in flight at ${String(tip).slice(0, 10)}`, (wt) => {
    const rows = rowsIn(wt);
    if (rows.some((r) => r.row === 'inflight' && same(r, row)) && !rows.some((r) => r.row === 'end' && same(r, row))) return;
    add(wt, row);
  });
  return row;
}
// Ends the hold with its cause, once.
export function endHold(root, sb, { pr, tip, cause, session }) {
  writeState(root, sb, `merge train: PR ${pr} in flight ended: ${cause}`.slice(0, 120), (wt) => {
    const rows = rowsIn(wt);
    if (!rows.some((r) => r.row === 'inflight' && same(r, { pr, tip })) || rows.some((r) => r.row === 'end' && same(r, { pr, tip }))) return;
    add(wt, { at: new Date().toISOString(), row: 'end', pr, tip, cause, session });
  });
}

// Outside the train (merge, merge --plain into the tranche): refused while another pull request's
// merged result is gating under an open hold. A gate already ended does not refuse (the train ends
// the hold at its next pass); a state branch or gate that cannot be read refuses nothing.
export function refuseUnderHold(root, cfg, n, { slug, io }) {
  let h = null;
  try { if (fetchState(root, cfg.state_branch, { fresh: true })) h = openHold(readHolds(root, cfg.state_branch)); } catch { return; }
  if (!h || h.pr === Number(n)) return;
  let run = null;
  try { run = io.checkRun(slug, h.tip, 'gate'); } catch { run = null; }
  if (run?.status === 'completed') return;
  fail(`pull request ${h.pr}'s merged result ${String(h.tip).slice(0, 10)} is gating on ${cfg.tranche} (${run?.html_url || 'its gate run'}), held by the merge train until it ends or ${h.until}: nothing else lands on ${cfg.tranche} meanwhile; nothing was merged; run this again then`);
}
