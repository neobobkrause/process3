// Bob, 8 Nov: "run as many walks as is reasonable ... (But be careful that there aren't too many
// external walkers to cause the Cloudflare system to exceed limits of the account." (C43)
import assert from 'node:assert/strict';
import { availableParallelism } from 'node:os';
import { test } from 'node:test';
import { CLOUDFLARE_LIMITS, WALK_TARGET, walkConcurrency, walkEnv, walkLine } from '../lib/walkcfg.mjs';

test('walk concurrency: internal defaults to the runner\'s CPUs; live to 85% of the plan\'s concurrent browsers, never above it', () => {
  const d = walkConcurrency({});
  assert.equal(d.internal, Math.max(1, availableParallelism()));
  assert.deepEqual([d.plan, d.live, d.live_cap, d.starts_per_minute, d.clamped], ['free', 2, 2, 2, false], 'Free: 3 browsers, 3 starts a minute, at 85%');
  const p = walkConcurrency({ walk: { cloudflare_plan: 'paid' } });
  assert.deepEqual([p.live, p.live_cap, p.starts_per_minute], [170, 170, 153]);
  assert.equal(p.live_cap, Math.floor(CLOUDFLARE_LIMITS.paid.browsers * WALK_TARGET));
  // The config sets each; the live one is held to the cap whatever it says.
  const c = walkConcurrency({ walk: { internal_concurrency: 3, live_concurrency: 40, cloudflare_plan: 'paid' } });
  assert.deepEqual([c.internal, c.live, c.clamped], [3, 40, false]);
  const over = walkConcurrency({ walk: { live_concurrency: 50 } });
  assert.deepEqual([over.live, over.clamped], [2, true]);
  assert.match(walkLine(over, true), /live walk: 2 at once .* the cap is 2, 85% of Cloudflare's 3 concurrent browsers on Workers Free \(read 2026-11-09\); walk.live_concurrency asked for more and was held to the cap/);
  assert.deepEqual(walkEnv(c, true), { P3_WALK_CONCURRENCY: '40', P3_WALK_BROWSER_STARTS_PER_MINUTE: '153' });
  assert.deepEqual(walkEnv(c, false), { P3_WALK_CONCURRENCY: '3' });
  assert.equal(walkConcurrency({}, { cpus: 0 }).internal, 1);
  for (const [w, re] of [[{ live_concurrency: 0 }, /whole number/], [{ internal_concurrency: 1.5 }, /whole number/], [{ cloudflare_plan: 'pro' }, /"free" or "paid"/], [{ fast: true }, /unknown keys: fast/], [[], /must be an object/]]) assert.throws(() => walkConcurrency({ walk: w }), re, JSON.stringify(w));
  assert.ok(CLOUDFLARE_LIMITS.sources.every((u) => u.startsWith('https://developers.cloudflare.com/')));
});
