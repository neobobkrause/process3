// deploy dev (Build Plan Phase 2, the deploy and walk; Bob's word, 3 Nov: development
// deployments only, in the product's own Cloudflare account under his approvals). BOB runs it
// after a layer close, from the clean tranche tip: the `deploy` block's dry run, refused unless
// every dry-run step printed guard_line; then the deploy; then the walk; one row per run in
// deploys/dev.jsonl on the state branch. The shape is release dev's.
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { P3 } from './job.mjs';
import { fetchState, jsonl, readState, writeState } from './state.mjs';
import { closedRows } from './status.mjs';
import { NO_TOKENS, depth, fail, git, loadConfig, now, repoSlug, run } from './util.mjs';

export const DEPLOYS_FILE = 'deploys/dev.jsonl';
export const SLUG_PREFIX = 'p3dev-';
const MINUTE = 60000;
const KEYS = ['slug_prefix', 'dry_run', 'deploy', 'walk', 'guard_line', 'timeout_minutes'];
// A slug: lower case letters, digits and dashes, as Cloudflare names Workers and buckets.
const SLUG = /^[a-z0-9][a-z0-9-]{0,47}$/;

export function checkSlug(s) {
  if (typeof s !== 'string' || !SLUG.test(s) || s.endsWith('-')) fail(`the slug must be 1 to 48 lower case letters, digits or dashes, not ending in a dash, not ${JSON.stringify(s)}`);
  if (!s.startsWith(SLUG_PREFIX)) fail(`the slug ${s} does not begin with ${SLUG_PREFIX}: only development deployments are made`);
  return s;
}

// The `deploy` block of process/config.json, validated. dry_run, deploy and walk are each an
// argv, or a list of argvs run in order; {slug} in any argument is the slug.
export function deployConfig(cfg) {
  const d = cfg.deploy;
  if (d === undefined || d === null) fail('process/config.json has no "deploy" block: no development deployment is made');
  if (typeof d !== 'object' || Array.isArray(d)) fail('"deploy" in process/config.json must be an object');
  const bad = Object.keys(d).filter((k) => !KEYS.includes(k));
  if (bad.length) fail(`"deploy" has unknown keys: ${bad.join(', ')} (known: ${KEYS.join(', ')})`);
  if (typeof d.slug_prefix !== 'string' || !d.slug_prefix.startsWith(SLUG_PREFIX) || !/^[a-z0-9-]+$/.test(d.slug_prefix)) fail(`deploy.slug_prefix must begin with ${SLUG_PREFIX} (lower case letters, digits and dashes), not ${JSON.stringify(d.slug_prefix)}`);
  const isArgv = (a) => Array.isArray(a) && a.length && a.every((x) => typeof x === 'string' && x.length);
  const steps = (v, what) => {
    if (isArgv(v)) return [v];
    if (Array.isArray(v) && v.length && v.every(isArgv)) return v;
    return fail(`deploy.${what} must be an argv (a list of strings) or a non-empty list of argvs`);
  };
  if (typeof d.guard_line !== 'string' || !d.guard_line.trim()) fail('deploy.guard_line must be the text each dry-run step prints, for example "p3dev guard: passed"');
  const t = d.timeout_minutes;
  if (t !== undefined && !(Number.isInteger(t) && t > 0 && t <= 360)) fail('deploy.timeout_minutes must be whole minutes from 1 to 360');
  return { slug_prefix: d.slug_prefix, dry_run: steps(d.dry_run, 'dry_run'), deploy: steps(d.deploy, 'deploy'), walk: steps(d.walk, 'walk'), guard_line: d.guard_line.trim(), timeout_minutes: t || 30 };
}

// A step marks a value secret with a line `::add-mask::<value>`, as GitHub Actions does. The
// tool never prints that line, and prints *** wherever a marked value appears.
const MASK = /::add-mask::(.*)$/;
export function collectMasks(text, masks) {
  for (const line of String(text).split('\n')) { const m = line.match(MASK); if (m && m[1].trim()) masks.add(m[1].trim()); }
  return masks;
}
export function redact(text, masks) {
  collectMasks(text, masks);
  let s = String(text).split('\n').filter((l) => !MASK.test(l)).join('\n');
  for (const v of [...masks].sort((a, b) => b.length - a.length)) s = s.split(v).join('***');
  return s;
}

// The deploy rows of this tranche; the last closed layer; whether it is owed a deploy (a layer
// has closed with no successful deploy row for it). A failed run is recorded and can be run again.
export const deployRows = (root, cfg) => jsonl(readState(root, cfg.state_branch, DEPLOYS_FILE)).filter((r) => r.row === 'dev-deploy' && r.tranche === cfg.tranche);
export function deployOwed(root, cfg, closed) {
  if (!closed.length) return null;
  const layer = Math.max(...closed.map((r) => r.layer));
  return deployRows(root, cfg).some((r) => r.layer === layer && r.ok) ? null : layer;
}

const defaultIO = { exec: run };

export function deployDev(root, { slug, log = console.log, io: given = {}, repo = repoSlug(root) } = {}) {
  const io = { ...defaultIO, ...given };
  const cfg = loadConfig(root);
  const dep = deployConfig(cfg);
  const t = `origin/${cfg.tranche}`;
  git(['fetch', '-q', ...depth(root), 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/${t}`], { cwd: root });
  const tip = git(['rev-parse', t], { cwd: root });
  const head = git(['rev-parse', 'HEAD'], { cwd: root });
  if (head !== tip) fail(`the checkout is ${head.slice(0, 10)}, not the tranche tip ${tip.slice(0, 10)}: check out ${t} first`);
  const dirty = git(['status', '--porcelain', '--untracked-files=no'], { cwd: root });
  if (dirty) fail(`the checkout has uncommitted changes: ${dirty.split('\n').slice(0, 3).join('; ')}`);
  fetchState(root, cfg.state_branch, { fresh: true });
  const closed = closedRows(root, cfg, { slug: repo, ...(io.compare ? { read: io.compare } : {}) });
  if (!closed.length) fail('no development deployment now: no layer of this tranche has closed');
  const layer = deployOwed(root, cfg, closed);
  if (layer === null) fail(`no development deployment now: no layer has closed since the last recorded deploy (layer ${Math.max(...closed.map((r) => r.layer))} is deployed)`);
  const s = checkSlug(slug === undefined ? `${dep.slug_prefix}l${layer}` : String(slug));
  log(`development deployment ${s} of ${cfg.tranche} ${tip.slice(0, 10)}, layer ${layer} closed; development only`);
  const t0 = Date.now();
  const masks = new Set();
  const results = [];
  const go = (stage, argvs, { guard = false } = {}) => {
    for (const a of argvs) {
      const argv = a.map((x) => x.split('{slug}').join(s));
      const name = `${stage}: ${argv.join(' ')}`;
      log(`::group::${redact(name, masks)}`);
      const r = io.exec(argv[0], argv.slice(1), { cwd: root, timeout: dep.timeout_minutes * MINUTE, unset: [...NO_TOKENS, 'NODE_TEST_CONTEXT'] });
      collectMasks(r.stdout, masks);
      collectMasks(r.stderr, masks);
      const out = redact(r.stdout, masks);
      const err = redact(r.stderr, masks);
      if (out.trim()) log(out.slice(-20000).replace(/\n$/, ''));
      if (err.trim()) log(err.slice(-20000).replace(/\n$/, ''));
      log('::endgroup::');
      const res = { stage, name: redact(argv.join(' '), masks), exit: r.code, seconds: Math.round(r.seconds) };
      if (guard) res.guard = r.stdout.split('\n').some((l) => l.trim() === dep.guard_line);
      results.push(res);
      log(`${res.name}: exit ${r.code}, ${res.seconds} s${guard ? `, guard ${res.guard ? 'printed' : 'NOT printed'}` : ''}`);
      if (r.code !== 0 || (guard && !res.guard)) return false;
    }
    return true;
  };
  let ok = go('dry_run', dep.dry_run, { guard: true });
  let stopped = ok ? null : 'dry_run';
  if (ok) { ok = go('deploy', dep.deploy); if (!ok) stopped = 'deploy'; }
  if (ok) { ok = go('walk', dep.walk); if (!ok) stopped = 'walk'; }
  const minutes = Math.round((Date.now() - t0) / 6000) / 10;
  const row = { row: 'dev-deploy', tranche: cfg.tranche, slug: s, commit: tip, layer, ok, stopped, results, minutes, at: now() };
  writeState(root, cfg.state_branch, `development deployment ${s}, layer ${layer}: ${ok ? 'ok' : `stopped at ${stopped}`}`, (wt) => {
    mkdirSync(dirname(join(wt, DEPLOYS_FILE)), { recursive: true });
    appendFileSync(join(wt, DEPLOYS_FILE), JSON.stringify(row) + '\n');
  });
  if (stopped === 'dry_run') log(`refused: the dry run did not pass the guard (every dry-run step must exit 0 and print "${dep.guard_line}"); nothing was deployed`);
  log(`recorded development deployment ${s} at ${tip.slice(0, 10)}, layer ${layer}: ${ok ? 'deployed and walked' : `stopped at ${stopped}`}, ${minutes} min`);
  if (!ok && stopped !== 'dry_run') log(`a finding enters as an entry by the route for work found elsewhere; \`${P3} deploy dev\` may be run again`);
  return { ok, row };
}
