// The merge train's window (notes/train-spec-plan.md, C'): the pure functions train.mjs drives.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SPEC_REF, admit, chainEnd, chainStart, firstRed, nextSeq, onHeadMoved, onLand, onRed, onTrancheMoved, restore, specBase, specHead, specState,
} from '../lib/window.mjs';

const P = (n, over = {}) => ({ n, id: `m${n}`, base: `b${n}`, result: `r${n}`, state: 'gating', ...over });

test('spec names: specBase and specHead match SPEC_REF with the same pr and seq', () => {
  assert.equal(specBase(12, 3), 'train/spec/12-3');
  assert.equal(specHead(12, 3), 'train/head/12-3');
  assert.deepEqual([...SPEC_REF.exec(specBase(12, 3))].slice(1), ['spec', '12', '3']);
  assert.deepEqual([...SPEC_REF.exec(specHead(12, 3))].slice(1), ['head', '12', '3']);
  assert.equal(SPEC_REF.test('train/spec-1'), false);
});

test('admit: queue order up to k, positions after the window, causes name those ahead', () => {
  const window = [P(1)];
  const out = admit(window, [{ n: 5 }, { n: 3 }, { n: 4 }], 3);
  assert.deepEqual(out.map((c) => [c.n, c.position, c.state]), [[5, 1, 'building'], [3, 2, 'building']]);
  assert.equal(out[0].cause, 'admitted at position 1 behind PR 1');
  assert.equal(out[1].cause, 'admitted at position 2 behind PR 1, 5');
});

test('admit: an empty window admits on the tranche tip', () => {
  const out = admit([], [{ n: 7 }], 4);
  assert.equal(out.length, 1);
  assert.equal(out[0].position, 0);
  assert.equal(out[0].cause, 'admitted at position 0 on the tranche tip');
});

test('admit: skips in-window, held and duplicate PRs; full window admits none', () => {
  const window = [P(1)];
  const out = admit(window, [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 3 }, { n: 4 }], 4, { held: new Set([2]) });
  assert.deepEqual(out.map((c) => c.n), [3, 4]);
  assert.deepEqual(out.map((c) => c.position), [1, 2]);
  assert.deepEqual(admit([P(1), P(2)], [{ n: 3 }], 2), []);
});

test('admit: carries the cause of the last close', () => {
  const out = admit([], [{ n: 3 }, { n: 4 }], 4, { causes: new Map([[3, 'red ahead: PR 1']]) });
  assert.equal(out[0].cause, 'admitted at position 0 on the tranche tip; rebuilt after: red ahead: PR 1');
  assert.equal(out[1].cause, 'admitted at position 1 behind PR 3');
});

test('firstRed: only a red whose every position ahead is green', () => {
  assert.equal(firstRed([]), -1);
  assert.equal(firstRed([P(1, { state: 'red' })]), 0);
  assert.equal(firstRed([P(1, { state: 'green' }), P(2, { state: 'green' }), P(3, { state: 'red' }), P(4, { state: 'red' })]), 2);
  assert.equal(firstRed([P(1, { state: 'gating' }), P(2, { state: 'red' })]), -1);
  assert.equal(firstRed([P(1, { state: 'green' }), P(2, { state: 'building' }), P(3, { state: 'red' })]), -1);
  assert.equal(firstRed([P(1, { state: 'green' }), P(2, { state: 'green' })]), -1);
});

test('onRed: refuses i, closes those behind naming the red PR, keeps those ahead', () => {
  const w = [P(1), P(2), P(3), P(4)];
  const { refuse, close, keep } = onRed(w, 1);
  assert.equal(refuse.n, 2);
  assert.deepEqual(close.map((p) => p.n), [3, 4]);
  assert.ok(close.every((p) => p.cause === 'red ahead: PR 2'));
  assert.deepEqual(keep.map((p) => p.n), [1]);
  assert.equal(w[2].cause, undefined, 'the input window is not mutated');
  const last = onRed(w, 3);
  assert.deepEqual(last.close, []);
  assert.deepEqual(last.keep.map((p) => p.n), [1, 2, 3]);
});

test('onHeadMoved: closes that position and all behind, keeps those ahead', () => {
  const w = [P(1), P(2), P(3)];
  const { close, keep } = onHeadMoved(w, 2);
  assert.deepEqual(close.map((p) => [p.n, p.cause]), [[2, 'PR 2 head moved'], [3, 'PR 2 head moved (ahead)']]);
  assert.deepEqual(keep.map((p) => p.n), [1]);
  assert.deepEqual(onHeadMoved(w, 1, 'closed').close.map((p) => p.cause), ['PR 1 closed', 'PR 1 closed (ahead)', 'PR 1 closed (ahead)']);
  const none = onHeadMoved(w, 9);
  assert.deepEqual(none.close, []);
  assert.equal(none.keep, w);
});

test('onTrancheMoved: closes all when the chain start is not the tip, nothing when it is', () => {
  const w = [P(1, { base: 'tip0' }), P(2, { base: 'r1' })];
  assert.deepEqual(onTrancheMoved(w, 'tip0'), { close: [], keep: w });
  const moved = onTrancheMoved(w, 'abcdef0123456789');
  assert.deepEqual(moved.keep, []);
  assert.deepEqual(moved.close.map((p) => [p.n, p.cause]), [[1, 'tranche moved to abcdef0123'], [2, 'tranche moved to abcdef0123']]);
  // After a land, the start (not position 0's base) is what the tip must match.
  const landed = [P(2, { base: 'r1', start: 'merge1' })];
  assert.deepEqual(onTrancheMoved(landed, 'merge1').close, []);
  assert.equal(onTrancheMoved(landed, 'r1').close.length, 1);
  assert.deepEqual(onTrancheMoved([], 'x'), { close: [], keep: [] });
});

test('onLand: drops position 0 and sets start on the new first only', () => {
  const w = [P(1), P(2), P(3)];
  const { landed, keep } = onLand(w, 'merge1');
  assert.equal(landed.n, 1);
  assert.deepEqual(keep.map((p) => p.n), [2, 3]);
  assert.equal(keep[0].start, 'merge1');
  assert.equal('start' in keep[1], false);
  assert.equal(chainStart(keep), 'merge1');
  assert.equal(w[1].start, undefined, 'the input window is not mutated');
});

test('chainStart and chainEnd', () => {
  assert.equal(chainStart([]), null);
  assert.equal(chainEnd([], 'tip'), 'tip');
  const w = [P(1, { base: 'tip' }), P(2, { base: 'r1' })];
  assert.equal(chainStart(w), 'tip');
  assert.equal(chainEnd(w, 'tip'), 'r2');
  assert.equal(chainStart([P(2, { start: 's' })]), 's');
});

test('specState: completed success green, failure and cancelled red, running and none gating', () => {
  assert.equal(specState({ status: 'completed', conclusion: 'success' }), 'green');
  assert.equal(specState({ status: 'completed', conclusion: 'failure' }), 'red');
  assert.equal(specState({ status: 'completed', conclusion: 'cancelled' }), 'red');
  assert.equal(specState({ status: 'in_progress', conclusion: null }), 'gating');
  assert.equal(specState({ status: 'queued' }), 'gating');
  assert.equal(specState(null), 'gating');
  assert.equal(specState(undefined), 'gating');
});

test('nextSeq: one past the highest seq in rows for that PR or taken', () => {
  const rows = [
    { row: 'spec', pr: 5, seq: 1 }, { row: 'spec', pr: 5, seq: '3' }, { row: 'spec', pr: 6, seq: 9 },
    { row: 'other', pr: 5, seq: 20 }, null,
  ];
  assert.equal(nextSeq(rows, 5), 4);
  assert.equal(nextSeq(rows, 5, [7]), 8);
  assert.equal(nextSeq(rows, 5, ['2']), 4);
  assert.equal(nextSeq(rows, 7), 1);
  assert.equal(nextSeq([], 7, [2]), 3);
});

const build = (pr, seq, position, base, head, spec_pr, at = `2026-11-05T00:0${position}:00Z`) => ({
  at, row: 'spec', event: 'build', pr, seq, position, spec_pr, base, head, module: `m${pr}`, job_head: `j${pr}`, cause: 'admitted',
});

test('restore: rebuilds the chain from the tip through open spec PRs', () => {
  const rows = [build(1, 1, 0, 'tip', 'r1', 101), build(2, 1, 1, 'r1', 'r2', 102), build(3, 1, 2, 'r2', 'r3', 103)];
  const { window, close } = restore(rows, [101, { number: 102 }, 103], 'tip');
  assert.deepEqual(window.map((p) => [p.n, p.seq, p.spec_pr, p.base, p.result, p.state]), [
    [1, 1, 101, 'tip', 'r1', 'gating'], [2, 1, 102, 'r1', 'r2', 'gating'], [3, 1, 103, 'r2', 'r3', 'gating'],
  ]);
  assert.equal(window[0].id, 'm1');
  assert.equal(window[0].head, 'j1');
  assert.equal('start' in window[0], false);
  assert.deepEqual(close, []);
});

test('restore: starts from a land row whose landed commit is the tip', () => {
  const rows = [
    build(1, 1, 0, 'tip0', 'r1', 101),
    build(2, 1, 1, 'r1', 'r2', 102),
    { at: 'z', row: 'spec', event: 'land', pr: 1, seq: 1, position: 0, spec_pr: 101, base: 'tip0', head: 'r1', landed: 'merge1' },
  ];
  const { window, close } = restore(rows, [101, 102], 'merge1');
  assert.deepEqual(window.map((p) => p.n), [2]);
  assert.equal(window[0].start, 'merge1');
  assert.equal(chainStart(window), 'merge1');
  assert.deepEqual(close, []);
  // A land whose merge commit is not the tip does not start the chain.
  const other = restore(rows, [102], 'elsewhere');
  assert.deepEqual(other.window, []);
  assert.equal(other.close.length, 1);
  assert.match(other.close[0].cause, /not the end of the window's chain/);
});

test('restore: a build whose spec PR is not open is closed as a row only', () => {
  const rows = [build(1, 1, 0, 'tip', 'r1', 101), build(2, 1, 1, 'r1', 'r2', 102), build(3, 1, 2, 'r2', 'r3', 103)];
  const { window, close } = restore(rows, [101, 103], 'tip');
  assert.deepEqual(window.map((p) => p.n), [1]);
  const byN = new Map(close.map((c) => [c.n, c]));
  assert.equal(byN.get(2).closed, true);
  assert.equal(byN.get(2).cause, 'train restarted: spec PR 102 is not open');
  assert.equal(byN.get(3).closed, undefined, 'its spec PR is open, so it is to be closed');
  assert.equal(byN.get(3).cause, "train restarted: its base r2 is not the end of the window's chain (r1)");
});

test('restore: a build whose base is off the chain is closed with that cause', () => {
  const rows = [build(1, 1, 0, 'tip', 'r1', 101), build(2, 1, 1, 'stale', 'r2', 102)];
  const { window, close } = restore(rows, [101, 102], 'tip');
  assert.deepEqual(window.map((p) => p.n), [1]);
  assert.deepEqual(close.map((c) => [c.n, c.closed, c.cause]), [[2, undefined, "train restarted: its base stale is not the end of the window's chain (r1)"]]);
  // Nothing on the tip: all open builds are closed.
  const none = restore(rows, [101, 102], 'newtip');
  assert.deepEqual(none.window, []);
  assert.deepEqual(none.close.map((c) => c.n).sort(), [1, 2]);
});

test('restore: ignores pairs ended by a close, land or fallback row', () => {
  const rows = [
    build(1, 1, 0, 'tip', 'r1old', 100),
    { at: 'x', row: 'spec', event: 'close', pr: 1, seq: 1, cause: 'red ahead: PR 9' },
    build(1, 2, 0, 'tip', 'r1', 101),
    build(2, 1, 1, 'r1', 'r2', 102),
    { at: 'y', row: 'spec', event: 'fallback', pr: 2, seq: 1 },
    { at: 'z', row: 'other', event: 'build', pr: 4, seq: 1, base: 'tip', head: 'r4', spec_pr: 104 },
  ];
  const { window, close } = restore(rows, [100, 101, 102, 104], 'tip');
  assert.deepEqual(window.map((p) => [p.n, p.seq]), [[1, 2]]);
  assert.deepEqual(close, []);
  assert.deepEqual(restore(null, null, 'tip'), { window: [], close: [] });
});
