// How many walkers run at once (Bob, 8 Nov: "try to configure both walks to run as many walks as is
// reasonable to speed up the walking process. (But be careful that there aren't too many external
// walkers to cause the Cloudflare system to exceed limits of the account."). The process runs the
// product's walkers (deploy.internal_walk.run, deploy.walk) as argvs; how they parallelise is the
// product's. The tool hands each walk stage its concurrency as `{concurrency}` in its argv and as
// P3_WALK_CONCURRENCY in its environment; the live walk also gets P3_WALK_BROWSER_STARTS_PER_MINUTE.
// walk.ai (BD-R5) reaches both walks as P3_WALK_AI, and an argv element `{assistant}` becomes
// `--assistant` when it is on and is dropped when it is off (the product's journey-check takes it).
// A leaf: imports node and util only.
import { availableParallelism } from 'node:os';
import { fail } from './util.mjs';

// Cloudflare's published account limits on what a live walker uses, read 9 Nov 2026 from the pages
// below (public docs only; no Cloudflare call). Browser Rendering (page updated 14 Oct 2026):
// concurrent browsers per account, Free 3, Paid 200; new browser instances, Free 1 every 20 seconds,
// Paid 3 per second; over a limit it answers 429. Workers (page updated 29 Oct 2026): "There is no
// general limit on requests per second"; Free has 100,000 requests a day per account; 6 simultaneous
// outgoing connections per request. Durable Objects (page updated 7 Nov 2026): a soft limit of 1,000
// requests per second per object. The product's live walker runs its own local Chromium against the
// deployment (journey-check run.mjs), not Browser Rendering, so the runner's CPUs bound how many it can
// run: that is the live walk's default. Browser Rendering's concurrent browsers stay the cap, at TARGET,
// and its new-browser rate the starts' pace, because the product's own Workers may use Browser
// Rendering for each request a walker makes (its pdf-worker and browser bindings). Workers and Durable
// Objects publish no limit a walker count can reach first (at most a few requests a second each).
export const CLOUDFLARE_LIMITS = {
  read: '2026-11-09',
  pages: [
    'https://developers.cloudflare.com/browser-rendering/platform/limits/',
    'https://developers.cloudflare.com/workers/platform/limits/',
    'https://developers.cloudflare.com/durable-objects/platform/limits/',
  ],
  free: { browsers: 3, browser_starts_per_minute: 3 },
  paid: { browsers: 200, browser_starts_per_minute: 180 },
};
// As pacing.target (pace.mjs, PD-22): 85% of the published limit, never above it.
export const WALK_TARGET = 0.85;
const KEYS = ['internal_concurrency', 'live_concurrency', 'cloudflare_plan', 'ai'];
const count = (v, what) => (v === undefined || v === null ? null : Number.isInteger(v) && v >= 1 && v <= 1024 ? v : fail(`walk.${what} must be a whole number from 1 to 1024, not ${JSON.stringify(v)}`));

// The `walk` block of process/config.json, read: { internal, live, live_max, starts_per_minute, plan,
// clamped }. internal: walk.internal_concurrency, else the runner's CPUs (os.availableParallelism).
// live: walk.live_concurrency, else the smaller of the cap and the runner's CPUs (each walker is a local
// Chromium); never above the cap whatever the config says; the cap is WALK_TARGET of the plan's
// concurrent browsers (at least 1). The plan is walk.cloudflare_plan, "free"
// by default: the tighter, until the product's account is known to be on Workers Paid.
export function walkConcurrency(cfg, { cpus = availableParallelism() } = {}) {
  const w = cfg?.walk ?? {};
  if (typeof w !== 'object' || Array.isArray(w)) fail('"walk" in process/config.json must be an object');
  const bad = Object.keys(w).filter((k) => !KEYS.includes(k));
  if (bad.length) fail(`"walk" has unknown keys: ${bad.join(', ')} (known: ${KEYS.join(', ')})`);
  const plan = w.cloudflare_plan ?? 'free';
  if (!['free', 'paid'].includes(plan)) fail(`walk.cloudflare_plan must be "free" or "paid" (Workers Free or Workers Paid), not ${JSON.stringify(plan)}`);
  const lim = CLOUDFLARE_LIMITS[plan];
  const cap = Math.max(1, Math.floor(lim.browsers * WALK_TARGET));
  const asked = count(w.live_concurrency, 'live_concurrency');
  const internal = count(w.internal_concurrency, 'internal_concurrency') ?? Math.max(1, cpus);
  // BD-R5 (Bob, 9 Nov): "The first run or two of the external system will run without an AI account
  // connected"; walk.ai is true once Bob has one configured. Off, the AI-assisted journeys are not walked.
  if (w.ai !== undefined && typeof w.ai !== 'boolean') fail(`walk.ai must be true or false (an AI account configured for the live walk), not ${JSON.stringify(w.ai)}`);
  return { ai: w.ai === true, internal, live: Math.min(asked ?? Math.min(cap, Math.max(1, cpus)), cap), live_max: cap, starts_per_minute: Math.max(1, Math.floor(lim.browser_starts_per_minute * WALK_TARGET)), plan, clamped: asked !== null && asked > cap };
}
// The environment and the argv substitution a walk stage gets.
export const walkEnv = (c, live) => (live ? { P3_WALK_CONCURRENCY: String(c.live), P3_WALK_BROWSER_STARTS_PER_MINUTE: String(c.starts_per_minute), P3_WALK_AI: c.ai ? '1' : '0' } : { P3_WALK_CONCURRENCY: String(c.internal), P3_WALK_AI: c.ai ? '1' : '0' });
export const walkLine = (c, live) => (live
  ? `live walk: ${c.live} at once (P3_WALK_CONCURRENCY, {concurrency}), ${c.starts_per_minute} browser starts a minute; the cap is ${c.live_max}, ${WALK_TARGET * 100}% of Cloudflare's ${CLOUDFLARE_LIMITS[c.plan].browsers} concurrent browsers on Workers ${c.plan === 'paid' ? 'Paid' : 'Free'} (read ${CLOUDFLARE_LIMITS.read}); AI ${c.ai ? 'on' : 'off: the AI-assisted journeys are not walked (BD-R5)'}${c.clamped ? '; walk.live_concurrency asked for more and was held to the cap' : ''}`
  : `internal walk: ${c.internal} at once (P3_WALK_CONCURRENCY, {concurrency})`);
