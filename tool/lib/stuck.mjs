// A job pull request stuck in the merge train (review-trigger day-1 study, 5 Nov: copy PR 364 was
// reviewed at 7cac421, its head moved to d3af394, the train refused that head --no-review, and it
// sat about 13.5 h with nothing in status or the idle alarm saying why). Read-only: the train's
// rows and notes on the state branch, and the open pull requests as GitHub lists them.
//
// Stuck: an open pull request whose latest train row is a refusal (or a hand-off to BOB after its
// retries) on the head it has now, with no review note from BOB for that head since. Its reason is
// the row's; when BOB reviewed an earlier head, that head is named too. A head that moved since
// the refusal is not stuck: the train judges the new head on its next pass.
import { jsonl, readState } from './state.mjs';
import { P3 } from './job.mjs';

export const TRAIN_ROWS = 'metrics/train.jsonl'; // train.mjs TRAIN_FILE
export const TRAIN_NOTES = 'metrics/train-notes.jsonl'; // train.mjs NOTES_FILE

export function trainStuck(rows, notes, prs, bob = null, t = Date.now()) {
  const out = new Map();
  for (const p of prs || []) {
    const n = p?.number;
    const head = p?.head?.sha;
    if (!n || !head || p.draft) continue;
    const r = (rows || []).filter((x) => x.row === 'merge' && x.pr === n).sort((a, b) => String(a.at).localeCompare(String(b.at))).pop();
    if (!r || r.head !== head || !(r.result === 'refused' || r.to_bob)) continue;
    const mine = (notes || []).filter((x) => x.row === 'note' && x.pr === n && !x.merged && (!bob || x.by === bob) && (x.reviewed || x.no_review));
    if (mine.some((x) => x.sha === head && String(x.at) >= String(r.at))) continue;
    const earlier = mine.filter((x) => x.sha !== head && x.reviewed).pop();
    const h = Math.round((t - Date.parse(r.at)) / 36e5 * 10) / 10;
    out.set(n, { pr: n, head, since: r.at, hours: Number.isFinite(h) ? h : null, why: String(r.why || r.result), ...(earlier ? { reviewed_at: earlier.sha } : {}) });
  }
  return out;
}

// One line per stuck pull request, with BOB's act.
export function stuckLine(s, id) {
  const review = /review trigger/.test(s.why);
  const moved = s.reviewed_at ? `; BOB's review is of ${s.reviewed_at.slice(0, 10)}, not this head (the train carries a review to a moved head only when the job's change, records aside, is the same)` : '';
  const act = review ? `review the head ${s.head.slice(0, 10)} (${P3} review brief ${s.pr}), then ${P3} merge train note ${s.pr} --reviewed ...` : 'its refusal names the act';
  return `STUCK in the train: PR ${s.pr}${id ? ` (job ${id})` : ''} since ${s.since}${s.hours === null ? '' : ` (${s.hours}h)`}: ${s.why}${moved}; ${act}`;
}

// The stuck map from the state branch (fetched by the caller); null when it cannot be read.
export function readStuck(root, sb, prs, bob = null) {
  try { return trainStuck(jsonl(readState(root, sb, TRAIN_ROWS) || ''), jsonl(readState(root, sb, TRAIN_NOTES) || ''), prs, bob); } catch { return null; }
}
