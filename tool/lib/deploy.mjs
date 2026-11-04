// deploy dev (Build Plan Phase 2, the deploy and walk; Bob's word, 3 Nov: development
// deployments only, in the product's own Cloudflare account under his approvals). BOB runs it
// after a layer close, from the clean tranche tip: the `deploy` block's dry run, refused unless
// every dry-run step printed guard_line; then the deploy; then the walk; one row per run in
// deploys/dev.jsonl on the state branch. The shape is release dev's.
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { buildGenerated, generatedRows } from './checks.mjs';
import { P3 } from './job.mjs';
import { fetchState, jsonl, readState, writeState } from './state.mjs';
import { closedRows, onMainOf } from './status.mjs';
import { install } from './suite.mjs';
import { NO_TOKENS, depth, fail, git, keepStep, loadConfig, now, repoSlug, run } from './util.mjs';

export const DEPLOYS_FILE = 'deploys/dev.jsonl';
export const SLUG_PREFIX = 'p3dev-';
const MINUTE = 60000;
const KEYS = ['slug_prefix', 'dry_run', 'deploy', 'walk', 'guard_line', 'timeout_minutes', 'walk_reports'];
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
  // walk_reports: the files the walk writes, relative to the checkout, kept on the state branch.
  const wr = d.walk_reports ?? [];
  if (!Array.isArray(wr) || !wr.every((p) => typeof p === 'string' && p && !p.startsWith('/') && !p.split('/').includes('..')) || new Set(wr.map((p) => basename(p))).size !== wr.length) fail('deploy.walk_reports must be a list of paths in the checkout, no two with the same file name');
  return { walk_reports: wr, slug_prefix: d.slug_prefix, dry_run: steps(d.dry_run, 'dry_run'), deploy: steps(d.deploy, 'deploy'), walk: steps(d.walk, 'walk'), guard_line: d.guard_line.trim(), timeout_minutes: t || 30 };
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

// The deploy rows of this tranche: its name, and its commit not yet on main (a row from a tranche
// already merged into main is stale, as closedRows has it); the last closed layer; whether it is
// owed a deploy (a layer has closed with no successful deploy row for it). A failed run is
// recorded and can be run again.
export function deployRows(root, cfg, at = {}) {
  const onMain = onMainOf(root, at);
  return jsonl(readState(root, cfg.state_branch, DEPLOYS_FILE)).filter((r) => r.row === 'dev-deploy' && r.tranche === cfg.tranche && !onMain(String(r.commit)));
}
export function deployOwed(root, cfg, closed, at = {}) {
  if (!closed.length) return null;
  const layer = Math.max(...closed.map((r) => r.layer));
  return deployRows(root, cfg, at).some((r) => r.layer === layer && r.ok) ? null : layer;
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
  const at = { slug: repo, ...(io.compare ? { read: io.compare } : {}) };
  const closed = closedRows(root, cfg, at);
  if (!closed.length) fail('no development deployment now: no layer of this tranche has closed');
  const layer = deployOwed(root, cfg, closed, at);
  if (layer === null) fail(`no development deployment now: no layer has closed since the last recorded deploy (layer ${Math.max(...closed.map((r) => r.layer))} is deployed)`);
  const s = checkSlug(slug === undefined ? `${dep.slug_prefix}l${layer}` : String(slug));
  log(`development deployment ${s} of ${cfg.tranche} ${tip.slice(0, 10)}, layer ${layer} closed; development only`);
  const t0 = Date.now();
  const masks = new Set();
  const results = [];
  const logs = io.logDir || mkdtempSync(join(tmpdir(), `p3-deploy-${s}-`));
  log(`each step's whole output is kept under ${logs}`);
  const put = { out: (t) => log(t.replace(/\n$/, '')), err: (t) => log(t.replace(/\n$/, '')), note: log };
  const go = (stage, argvs, { guard = false } = {}) => {
    for (const a of argvs) {
      const argv = a.map((x) => x.split('{slug}').join(s));
      const name = `${stage}: ${argv.join(' ')}`;
      log(`::group::${redact(name, masks)}`);
      const r = io.exec(argv[0], argv.slice(1), { cwd: root, timeout: dep.timeout_minutes * MINUTE, unset: [...NO_TOKENS, 'NODE_TEST_CONTEXT'] });
      collectMasks(r.stdout, masks);
      collectMasks(r.stderr, masks);
      keepStep(logs, results.length + 1, stage, redact(r.stdout, masks), redact(r.stderr, masks), put);
      log('::endgroup::');
      const res = { stage, name: redact(argv.join(' '), masks), exit: r.code, seconds: Math.round(r.seconds) };
      if (guard) res.guard = r.stdout.split('\n').some((l) => l.trim() === dep.guard_line);
      results.push(res);
      log(`${res.name}: exit ${r.code}, ${res.seconds} s${guard ? `, guard ${res.guard ? 'printed' : 'NOT printed'}` : ''}`);
      if (r.code !== 0 || (guard && !res.guard)) return false;
    }
    return true;
  };
  // The lock files are installed, then the generated files the tranche does not commit (over
  // max_file_bytes, say) are built, as release run does (copy, 4 Nov: a fresh checkout's build
  // failed on esbuild, the npm ci being only in the dry run that came after it).
  const exec = (c, args, o) => io.exec(c, args, { timeout: dep.timeout_minutes * MINUTE, ...o, unset: [...NO_TOKENS, 'NODE_TEST_CONTEXT'] });
  const inst = install(root, cfg.lockfiles || [], { exec });
  const gen = generatedRows(cfg);
  const b = inst.findings.length ? { built: [], findings: inst.findings } : buildGenerated(root, gen.rows, { ref: tip, timeout: dep.timeout_minutes * MINUTE, log, exec });
  if (b.built.length || b.findings.length) results.push({ stage: 'build', name: `${inst.findings.length ? 'install' : 'generated'}: ${[...b.built, ...b.findings.map((f) => f.file)].join(', ')}`, exit: b.findings.length ? 1 : 0, seconds: 0 });
  for (const f of b.findings) log(`${f.check}: ${f.file}: ${f.message}`);
  let ok = !b.findings.length && go('dry_run', dep.dry_run, { guard: true });
  let stopped = b.findings.length ? 'build' : ok ? null : 'dry_run';
  if (ok) { ok = go('deploy', dep.deploy); if (!ok) stopped = 'deploy'; }
  if (ok) { ok = go('walk', dep.walk); if (!ok) stopped = 'walk'; }
  const minutes = Math.round((Date.now() - t0) / 6000) / 10;
  const row = { row: 'dev-deploy', tranche: cfg.tranche, slug: s, commit: tip, layer, ok, stopped, results, minutes, at: now() };
  // The walk's reports, as the walker wrote them (masked values as ***), under deploys/<slug>/<UTC
  // time>/ on the state branch; one over max_file_bytes is recorded as not stored. report.json's
  // counts go in the row (copy, 4 Nov: 77 screens' findings were lost with the log's head).
  const dir = `deploys/${s}/${row.at.replace(/[:.]/g, '-')}`;
  const kept = results.some((x) => x.stage === 'walk') ? dep.walk_reports.map((p) => {
    if (!existsSync(join(root, p)) || statSync(join(root, p)).mtimeMs < t0) return { from: p, stored: 'not written by this walk' };
    const text = redact(readFileSync(join(root, p), 'utf8'), masks);
    const bytes = Buffer.byteLength(text);
    return { from: p, text, stored: bytes > cfg.max_file_bytes ? `not stored, ${bytes} bytes` : `${dir}/${basename(p)}` };
  }) : [];
  if (kept.length) {
    let j = null;
    try { j = JSON.parse(kept.find((k) => k.text && k.from.endsWith('.json'))?.text); } catch {}
    const by_kind = {};
    for (const f of j?.failures || []) by_kind[f.kind] = (by_kind[f.kind] || 0) + 1;
    row.walk = { ...(j ? { steps: (j.steps || []).length, steps_ok: (j.steps || []).filter((x) => x.ok).length, failures: (j.failures || []).length, by_kind } : {}), reports: kept.map((k) => ({ from: k.from, stored: k.stored })) };
    log(`walk: ${j ? `${row.walk.steps} steps, ${row.walk.steps_ok} ok, ${row.walk.failures} failures ${JSON.stringify(by_kind)}; ` : ''}${kept.map((k) => `${k.from} ${k.stored}`).join('; ')}`);
  }
  writeState(root, cfg.state_branch, `development deployment ${s}, layer ${layer}: ${ok ? 'ok' : `stopped at ${stopped}`}`, (wt) => {
    for (const k of kept.filter((x) => x.stored.startsWith(dir))) { mkdirSync(join(wt, dir), { recursive: true }); writeFileSync(join(wt, k.stored), k.text); }
    mkdirSync(dirname(join(wt, DEPLOYS_FILE)), { recursive: true });
    appendFileSync(join(wt, DEPLOYS_FILE), JSON.stringify(row) + '\n');
  });
  if (stopped === 'dry_run') log(`refused: the dry run did not pass the guard (every dry-run step must exit 0 and print "${dep.guard_line}"); nothing was deployed`);
  log(`recorded development deployment ${s} at ${tip.slice(0, 10)}, layer ${layer}: ${ok ? 'deployed and walked' : `stopped at ${stopped}`}, ${minutes} min`);
  if (!ok && stopped !== 'dry_run') log(`each finding enters by the route for work found elsewhere: \`${P3} found <module> "<finding>" --from "${stopped} ${s}"\` (or found "<finding>" when it names no module); \`${P3} deploy dev\` may be run again`);
  // A walk can report findings and still exit 0: they enter by the same route.
  if (ok) log(`findings of the walk, if any, enter by the route for work found elsewhere: \`${P3} found <module> "<finding>" --from "walk ${s}"\``);
  return { ok, row };
}
