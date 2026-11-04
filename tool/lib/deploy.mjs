// deploy dev (Build Plan Phase 2, the deploy and walk; Bob's word, 3 Nov: development
// deployments only, in the product's own Cloudflare account under his approvals). BOB runs it at
// the end of the tranche only, never between layers (Bob, 4 Nov), from the clean tranche tip: the
// `deploy` block's dry run, refused unless every dry-run step printed guard_line; then the deploy;
// then the walk; one row per run in deploys/dev.jsonl on the state branch. The shape is release dev's.
import { appendFileSync, closeSync, constants, fstatSync, mkdirSync, mkdtempSync, openSync, readSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, sep } from 'node:path';
import { buildGenerated, generatedRows } from './checks.mjs';
import { P3 } from './job.mjs';
import { fetchState, jsonl, readState, writeState } from './state.mjs';
import { completionItems, openItems } from './completion.mjs';
import { FOUND_DIR, foundMarks } from './found.mjs';
import { closedRows, layerState, onMainOf, status } from './status.mjs';
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
  const part = (x) => x && x !== '.' && x !== '..';
  if (!Array.isArray(wr) || !wr.every((p) => typeof p === 'string' && p.split('/').every(part) && !basename(p).startsWith('.git')) || new Set(wr.map((p) => basename(p))).size !== wr.length) fail('deploy.walk_reports must be a list of file paths in the checkout (no leading /, no empty, . or .. part, no file name starting .git), no two with the same file name');
  return { walk_reports: wr, slug_prefix: d.slug_prefix, dry_run: steps(d.dry_run, 'dry_run'), deploy: steps(d.deploy, 'deploy'), walk: steps(d.walk, 'walk'), guard_line: d.guard_line.trim(), timeout_minutes: t || 30 };
}

// A step marks a value secret with a line `::add-mask::<value>`, as GitHub Actions does. The
// tool never prints that line, and prints *** wherever a marked value appears.
const MASK = /::add-mask::(.*)$/;
// One walk report, read safely: the real path inside the product root, a regular file opened
// without following a last symlink or blocking on a FIFO, written since the walk began, and no
// bigger than max (checked on the open file before reading, and again on what was read).
export function readReport(root, p, since, max) {
  let real;
  try { real = realpathSync(join(root, p)); } catch { return { stored: 'not written by this walk' }; }
  if (!real.startsWith(realpathSync(root) + sep)) return { stored: 'not stored, outside the checkout' };
  let fd;
  try { fd = openSync(real, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); } catch { return { stored: 'not stored, not a readable file' }; }
  try {
    const st = fstatSync(fd);
    if (!st.isFile()) return { stored: 'not stored, not a regular file' };
    if (st.mtimeMs < since) return { stored: 'not written by this walk' };
    if (st.size > max) return { stored: `not stored, ${st.size} bytes` };
    const buf = Buffer.alloc(max + 1);
    let n = 0;
    for (let r; n < buf.length && (r = readSync(fd, buf, n, buf.length - n, null)) > 0;) n += r;
    if (n > max) return { stored: `not stored, over ${max} bytes` };
    return { raw: buf.subarray(0, n).toString('utf8') };
  } finally { closeSync(fd); }
}

// The walk's counts from its JSON report, whatever shape it has: arrays only, at most 50 kinds,
// each name printable and at most 80 characters.
export function walkSummary(text) {
  let j;
  try { j = JSON.parse(text); } catch { return {}; }
  if (!j || typeof j !== 'object') return {};
  const arr = (x) => (Array.isArray(x) ? x : []);
  const failures = arr(j.failures);
  const by_kind = new Map();
  for (const f of failures) {
    const k = String(f && typeof f === 'object' && f.kind != null ? f.kind : '(none)').replace(/[^\x20-\x7e]/g, ' ').replace(/::/g, ': :').slice(0, 80);
    if (by_kind.has(k) || by_kind.size < 50) by_kind.set(k, (by_kind.get(k) || 0) + 1);
    else by_kind.set('(other kinds)', (by_kind.get('(other kinds)') || 0) + 1);
  }
  const steps = arr(j.steps);
  return { steps: steps.length, steps_ok: steps.filter((x) => x && x.ok).length, failures: failures.length, by_kind: Object.fromEntries(by_kind) };
}

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
// already merged into main is stale, as closedRows has it). A failed run is recorded and can be run again.
export function deployRows(root, cfg, at = {}) {
  const onMain = onMainOf(root, at);
  return jsonl(readState(root, cfg.state_branch, DEPLOYS_FILE)).filter((r) => r.row === 'dev-deploy' && r.tranche === cfg.tranche && !onMain(String(r.commit)));
}

// The end of the tranche (Bob, 4 Nov): every layer of the plan closed, or the plan (as `ref`
// holds it, tranche close's reading) says close. Only then is a deploy and walk owed or allowed.
export function trancheEnd(cfg, ls, plan = cfg.plan, closed = []) {
  if (plan === 'close') return { end: true, layer: Math.max(0, ...closed.map((r) => r.layer)) || null };
  if (!ls) return { end: false, why: `there is no layer map (${cfg.layers_file}) and the plan is not close` };
  const open = ls.layers.filter((L) => !L.closed).map((L) => L.n);
  if (open.length) return { end: false, why: `layer${open.length > 1 ? 's' : ''} ${open.join(', ')} of the plan not closed` };
  return { end: true, layer: Math.max(0, ...ls.layers.map((L) => L.n)) || null };
}

// The latest deploy row's findings and how many are recorded: a failed run counts one at least,
// a walk its report's failures; recorded are the unmet found marks at `ref` whose source names its
// slug (\`found ... --from "walk <slug>"\`), and the completion items deferred naming it (known gaps).
export function walkFindings(root, cfg, ref, at = {}) {
  const last = deployRows(root, cfg, at).at(-1) || null;
  if (!last) return { last, failing: 0, marks: 0, recorded: 0 };
  const failing = Math.max(last.ok ? 0 : 1, Number(last.walk?.failures) || 0);
  const files = (d) => { const r = git(['ls-tree', '--name-only', `${ref}:${d}`], { cwd: root, allowFail: true }); return r.code === 0 ? r.stdout.split('\n').filter((n) => n.endsWith('.md')).map((n) => `${d}/${n}`) : []; };
  const naming = (t) => String(t).split(/[^a-z0-9-]+/).includes(last.slug);
  let marks = 0;
  for (const f of [...files(cfg.requirements_dir.replace(/\/$/, '')), ...files(FOUND_DIR)]) marks += foundMarks(git(['show', `${ref}:${f}`], { cwd: root })).filter((m) => naming(m.source)).length;
  const gaps = (completionItems(root, cfg, ref)?.items || []).filter((x) => x.deferred && naming(x.what)).length;
  return { last, failing, marks, recorded: marks + gaps };
}

// Owed at the end of the tranche: none yet, or the tranche moved past the latest one and its
// round is done (no completion item open, no found mark of its walk unmet). Null when not owed.
export function deployOwed(root, cfg, end, w, { ref, tip }) {
  if (!end.end) return null;
  if (!w.last) return 'the end of the tranche, not yet deployed';
  if (w.last.commit === tip || w.marks || openItems(completionItems(root, cfg, ref)).length) return null;
  return `the tranche moved past ${String(w.last.commit).slice(0, 10)}, its round merged`;
}
// The hold on tranche close: the latest run failed or its walk found failures, not all recorded.
export const walkHold = (w) => (w.last && w.recorded < w.failing ? `the latest deploy and walk (${w.last.slug} at ${String(w.last.commit).slice(0, 10)}) ${w.last.ok ? 'walked' : `stopped at ${w.last.stopped}`} with ${w.failing} finding(s), ${w.recorded} recorded: record each as a found mark (\`${P3} found <module> "<finding>" --from "walk ${w.last.slug}"\`) with its completion item, or a known gap (its completion item "deferred: <reason>" naming ${w.last.slug}), or deploy dev again after the round's merges` : null);

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
  // The end of the tranche, read as tranche close reads it: the plan as the tranche holds it.
  const closed = closedRows(root, cfg, at);
  let plan = null;
  try { plan = loadConfig(root, t).plan; } catch { plan = null; }
  const end = trancheEnd(cfg, plan === 'close' ? null : layerState(root, cfg, status(root, { log: () => {}, io: io.status }).rows, t, { closed }), plan, closed);
  if (!end.end) fail(`no development deployment now: the deploy and walk come at the end of the tranche, never between layers (${end.why}); it becomes due when every layer of the plan is closed, or the plan says close`);
  const w = walkFindings(root, cfg, t, at);
  if (w.last && w.last.ok && !w.failing && w.last.commit === tip) fail(`no development deployment now: ${tip.slice(0, 10)} is deployed and walked clean (${w.last.slug}); the next round's merges make the next one`);
  const layer = end.layer;
  const s = checkSlug(slug === undefined ? `${dep.slug_prefix}${layer === null ? 'end' : `l${layer}`}` : String(slug));
  log(`development deployment ${s} of ${cfg.tranche} ${tip.slice(0, 10)}, the end of the tranche; development only`);
  const t0 = Date.now();
  const masks = new Set();
  const results = [];
  // Kept on purpose, not withTemp: the step logs are the evidence this deploy's output names (util.mjs keepStep).
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
  const tWalk = Date.now();
  if (ok) { ok = go('walk', dep.walk); if (!ok) stopped = 'walk'; }
  const minutes = Math.round((Date.now() - t0) / 6000) / 10;
  const row = { row: 'dev-deploy', tranche: cfg.tranche, slug: s, commit: tip, layer, ok, stopped, results, minutes, at: now() };
  // The walk's reports, as the walker wrote them (masked values as ***), under deploys/<slug>/<UTC
  // time>/ on the state branch; one over max_file_bytes is recorded as not stored. report.json's
  // counts go in the row (copy, 4 Nov: 77 screens' findings were lost with the log's head).
  const dir = `deploys/${s}/${row.at.replace(/[:.]/g, '-')}`;
  const max = cfg.max_file_bytes;
  const read = results.some((x) => x.stage === 'walk') ? dep.walk_reports.map((p) => ({ from: p, ...readReport(root, p, tWalk, max) })) : [];
  // Every report's masks first, then each redacted, a JSON report's escaped form too.
  for (const k of read) if (k.raw !== undefined) collectMasks(k.raw, masks);
  for (const v of [...masks]) masks.add(JSON.stringify(v).slice(1, -1));
  const kept = read.map((k) => {
    if (k.raw === undefined) return k;
    const text = redact(k.raw, masks);
    const bytes = Buffer.byteLength(text);
    return bytes > max ? { from: k.from, stored: `not stored, ${bytes} bytes` } : { from: k.from, text, stored: `${dir}/${basename(k.from)}` };
  });
  if (kept.length) {
    const j = kept.find((k) => k.text !== undefined && k.from.endsWith('.json'));
    row.walk = { ...(j ? walkSummary(j.text) : {}), reports: kept.map((k) => ({ from: k.from, stored: k.stored })) };
    const w = row.walk;
    log(`walk: ${w.steps !== undefined ? `${w.steps} steps, ${w.steps_ok} ok, ${w.failures} failures ${JSON.stringify(w.by_kind)}; ` : ''}${kept.map((k) => `${k.from} ${k.stored}`).join('; ')}`);
  }
  // Kept beside the step files before the push, so a failed state-branch write loses nothing.
  const stored = kept.filter((x) => x.text !== undefined);
  for (const k of stored) writeFileSync(join(logs, `report-${basename(k.from)}`), k.text);
  writeFileSync(join(logs, 'row.json'), JSON.stringify(row) + '\n');
  try {
    writeState(root, cfg.state_branch, `development deployment ${s}, the end of the tranche: ${ok ? 'ok' : `stopped at ${stopped}`}`, (wt) => {
      for (const k of stored) { mkdirSync(join(wt, dir), { recursive: true }); writeFileSync(join(wt, k.stored), k.text); }
      mkdirSync(dirname(join(wt, DEPLOYS_FILE)), { recursive: true });
      appendFileSync(join(wt, DEPLOYS_FILE), JSON.stringify(row) + '\n');
    });
  } catch (e) {
    log(`the state branch was not written (${ok ? 'the deployment itself succeeded' : `stopped at ${stopped}`}); the row and the walk's reports are in ${logs} (row.json, report-*); \`${P3} deploy dev\` may be run again`);
    throw e;
  }
  if (stopped === 'dry_run') log(`refused: the dry run did not pass the guard (every dry-run step must exit 0 and print "${dep.guard_line}"); nothing was deployed`);
  log(`recorded development deployment ${s} at ${tip.slice(0, 10)}: ${ok ? 'deployed and walked' : `stopped at ${stopped}`}, ${minutes} min`);
  // Findings enter as found marks and become the completion round's jobs (PLN-4); tranche close
  // waits on them (walkHold); after the round's merges, deploy dev again.
  const round = `, each with its item in the completion round (${cfg.completion_file || 'completion_file'}); tranche close waits until each is recorded; after the round's merges, \`${P3} deploy dev\` again`;
  if (!ok && stopped !== 'dry_run') log(`each finding enters by the route for work found elsewhere: \`${P3} found <module> "<finding>" --from "${stopped} ${s}"\` (or found "<finding>" when it names no module)${round}`);
  // A walk can report findings and still exit 0: they enter by the same route.
  if (ok) log(`findings of the walk, if any, enter by the route for work found elsewhere: \`${P3} found <module> "<finding>" --from "walk ${s}"\`${round}`);
  return { ok, row };
}
