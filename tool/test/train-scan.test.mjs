// The merge train's cold start (coordinator, 5 Nov: 10-17 min from each restart to its first
// pick on the copy, ~20 job PRs queued). On a fixture of 20 open job PRs, with GitHub a fake gh at
// a fixed latency (train-scan-fixture.mjs): its reads go out side by side, a cold clone holds the
// same users as a warm one, a restart reads none of the hold's git reads again, and the order and
// holds are those of the scan read one by one.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { checkRun, checkRuns, comments } from '../lib/github.mjs';
import { git } from '../lib/util.mjs';
import { firstPick, scanFixture } from './train-scan-fixture.mjs';

// The order the scan gave, read one by one on a clone holding every head (5 Nov, before the change):
// 4 users held (103 for 102; 109 for 107; 113 and 114 for 112), drafts 105 and 111 and red 110 out.
// Since 5 Nov 11:20 a module named in release_path goes before all (order.mjs): m16 (116) first.
const ORDER = [116, 100, 101, 112, 107, 102, 119, 106, 117, 104, 108, 118, 115];

test('train scan: on a cold clone of 20 job PRs the first pick reads GitHub side by side, holds every user, and keeps the order', () => {
  const fx = scanFixture({ latency: 150, gitLatency: 0 });
  const root = fx.fresh();
  const cold = firstPick(fx, root);
  assert.equal(cold.pr, 116, 'the release_path PR goes first, ahead of the aged');
  assert.deepEqual(cold.queue, ORDER, 'every user held on a cold clone as on a warm one (before: no user head was fetched, none was held)');
  assert.ok(cold.maxPar >= 8, `GitHub reads side by side (at most ${cold.maxPar} at once; before, one at a time)`);
  // A restart in the same clone: the same order, and the hold's git reads come from the clone's cache.
  const cache = join(git(['rev-parse', '--absolute-git-dir'], { cwd: root }), 'p3-train-order.json');
  assert.ok(existsSync(cache));
  const kept = JSON.parse(readFileSync(cache, 'utf8'));
  assert.equal(kept.exp[fx.heads.m2], true, 'm2 changes its exports');
  assert.equal(kept.imp[`${fx.heads.m3}>m2`], true, 'm3 imports m2');
  const warm = firstPick(fx, root);
  assert.deepEqual(warm.queue, ORDER);
});

test('train scan: the order and holds read one by one (a caller\'s own single reads) are those read side by side', () => {
  const fx = scanFixture({ latency: 0, gitLatency: 0 });
  const root = fx.fresh();
  // The single reads given: train runs them in turn (train.mjs io), through the same fake gh.
  const one = firstPick(fx, root, { io: { checkRun, checkRuns, comments } });
  assert.equal(one.maxPar, 1);
  assert.deepEqual(one.queue, ORDER);
  const many = firstPick(fx, fx.fresh());
  assert.deepEqual(many.queue, one.queue);
});
