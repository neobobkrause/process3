// release dev (Build Plan Phase 3, the release row; Bob's word, 3 Nov: development only, there is
// no public release). BOB cuts a development release from the tranche tip at a round's close only,
// never between layers (Bob, 5 Nov), once that round's walk is clean (BD-R1: the internal walk, C43): the tool
// prints the dispatch of the product's shim process-dev-release.yml on the tranche (checks and
// assemble on read-only tokens, then publish, in the environment p3dev-release, which runs no
// product code: the tag p3dev-<version> and a draft release, never published, never latest).
// --record then writes one row for the run to the state branch.
// The shim calls `release run` (each check or the assemble, as the gate runs a suite), `release
// version` (the dispatched version, checked) and `release sign` (only when sign_secret is set).
import { createHash, createPrivateKey, sign } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { block, getRun, parseBlock } from './github.mjs';
import { P3 } from './job.mjs';
import { fetchState, jsonl, readState, writeState } from './state.mjs';
import { loadRanges, platformRows } from './size.mjs';
import { collectMasks, redact, roundAt, runSource, walkHold } from './deploy.mjs';
import { RELEASES_FILE, internalRequired, runPassed, unplaced } from './rounds.mjs';
import { install } from './suite.mjs';
import { buildGenerated, generatedRows } from './checks.mjs';
import { NO_TOKENS, depth, fail, gh, git, keepStep, loadConfig, now, repoSlug, run } from './util.mjs';

export const SHIM = '.github/workflows/process-dev-release.yml';
export const RUN_PREFIX = 'p3dev-release ';
export const TAG_PREFIX = 'p3dev-';
export { RELEASES_FILE };
export const MARKER = 'p3:dev-release';
const MINUTE = 60000;
const KEYS = ['checks', 'assemble', 'out', 'full_history', 'sign_secret', 'timeout_minutes'];

// A version: letters, digits, dot, dash and underscore, starting with a letter or digit, no "..".
export const VERSION = /^[0-9A-Za-z][0-9A-Za-z._-]{0,63}$/;
export function checkVersion(v) {
  if (typeof v !== 'string' || !VERSION.test(v) || v.includes('..') || v.endsWith('.') || v.endsWith('.lock')) fail(`the version must be 1 to 64 letters, digits, dots, dashes or underscores, starting with a letter or digit, not ${JSON.stringify(v)}`);
  return v;
}
export const tagOf = (v) => `${TAG_PREFIX}${checkVersion(v)}`;
// The default: the tranche tip's date (UTC) and short hash, e.g. 20261103-1a2b3c4.
export const defaultVersion = (sha, date = new Date()) => `${date.toISOString().slice(0, 10).replace(/-/g, '')}-${String(sha).slice(0, 7)}`;

// The `release` block of process/config.json, validated. Each check is an argv, or
// {"name", "argv", "timeout_minutes"}; the assemble is an argv; out is a relative directory.
export function releaseConfig(cfg) {
  const r = cfg.release;
  if (r === undefined || r === null) fail('process/config.json has no "release" block: no development release is cut');
  if (typeof r !== 'object' || Array.isArray(r)) fail('"release" in process/config.json must be an object');
  const bad = Object.keys(r).filter((k) => !KEYS.includes(k));
  if (bad.length) fail(`"release" has unknown keys: ${bad.join(', ')} (known: ${KEYS.join(', ')})`);
  const argv = (a, what) => (Array.isArray(a) && a.length && a.every((x) => typeof x === 'string' && x.length) ? a : fail(`${what} must be a non-empty argv, a list of strings`));
  const mins = (m, what) => (m === undefined ? undefined : Number.isInteger(m) && m > 0 && m <= 360 ? m : fail(`${what} must be whole minutes from 1 to 360`));
  const deflt = mins(r.timeout_minutes, 'release.timeout_minutes') || cfg.suite_timeout_minutes || 20;
  if (!Array.isArray(r.checks) || !r.checks.length) fail('release.checks must be a non-empty list of checks');
  const checks = r.checks.map((c, i) => {
    const o = Array.isArray(c) ? { argv: c } : c && typeof c === 'object' ? c : fail(`release.checks[${i}] must be an argv or {"name","argv","timeout_minutes"}`);
    const extra = Object.keys(o).filter((k) => !['name', 'argv', 'timeout_minutes'].includes(k));
    if (extra.length) fail(`release.checks[${i}] has unknown keys: ${extra.join(', ')}`);
    const a = argv(o.argv, `release.checks[${i}].argv`);
    if (o.name !== undefined && (typeof o.name !== 'string' || !o.name)) fail(`release.checks[${i}].name must be a string`);
    return { name: o.name || a.join(' '), argv: a, timeout_minutes: mins(o.timeout_minutes, `release.checks[${i}].timeout_minutes`) || deflt };
  });
  const assemble = argv(r.assemble, 'release.assemble');
  const out = r.out;
  if (typeof out !== 'string' || !out || out.startsWith('/') || out.split(/[\\/]/).some((p) => p === '..') || /^\.?\/*$/.test(out.replace(/^\.\//, '')) || /[^0-9A-Za-z._/-]/.test(out)) fail(`release.out must be a relative directory inside the repository (letters, digits, . _ / -), not ${JSON.stringify(out)}`);
  if (r.full_history !== undefined && typeof r.full_history !== 'boolean') fail('release.full_history must be true or false');
  const s = r.sign_secret;
  if (s !== undefined && s !== null && (typeof s !== 'string' || !/^[A-Z_][A-Z0-9_]*$/.test(s) || s.startsWith('GITHUB_'))) fail(`release.sign_secret must name a repository secret (upper case letters, digits and _, not GITHUB_), not ${JSON.stringify(s)}`);
  return { checks, assemble, out: out.replace(/\/+$/, ''), full_history: !!r.full_history, sign_secret: s || null, assemble_timeout_minutes: deflt };
}

// The release's round rule (Bob, 5 Nov; BD-R1, Bob, 8 Nov; C43): a release only when a round of
// the tranche closes, never between layers, as the round-close run reads the round (roundAt). A
// round ends at its walk: the internal walk only, where the product configures one (deploy dev's
// deploy and walk where it does not). The release follows a clean one: "until an internal walk
// doesn't find flaws, the release deployment happens". So the round needs its walk row, recorded
// after its last merge, its findings all recorded (tranche close's hold, walkHold), and none of them
// a flaw (runPassed: known gaps deferred on Bob's word pass). Not the tip: recording a finding moves
// it (review, 5 Nov). The release deployment and its live walk come after the cut (deploy release).
export function releaseReady({ rc, w }, cfg = null) {
  if (!rc.closed) return { ok: false, why: `a release belongs to a round close, never between layers (${rc.why}); it becomes due when the round closes` };
  if (!w.last) return { ok: false, why: `${rc.round} is closed but not yet walked: its round-close run first (the internal walk, or deploy dev where none is configured), then its findings, then the release` };
  const hold = walkHold(w);
  if (hold) return { ok: false, why: hold };
  if (rc.rounds?.state === 'walk') return { ok: false, why: `${rc.round}'s layers merged after the latest walk (${runSource(w.last)}): its walk is owed first (the round-close run)` };
  if (cfg && !runPassed(cfg, w)) return { ok: false, why: `the ${internalRequired(cfg, w.last) ? 'internal walk' : 'walk'} of ${runSource(w.last)} is not clean: its findings open the next round, and the release comes once an internal walk is clean (BD-R1)` };
  return { ok: true, why: `${rc.round} closed, its walk clean (${runSource(w.last)}${w.failing ? `, ${w.failing} finding(s) recorded` : ''}); the release deployment and its live walk follow the cut: \`${P3} deploy release <version>\`` };
}

const runId = (url) => {
  const m = String(url || '').match(/\/actions\/runs\/(\d+)/) || String(url || '').match(/^(\d+)$/);
  return m ? Number(m[1]) : fail(`--record <run url>, the run's https://github.com/<owner>/<repo>/actions/runs/<id>, not ${JSON.stringify(url)}`);
};

const defaultIO = {
  getRun,
  jobs: (slug, id) => gh(['api', `repos/${slug}/actions/runs/${id}/jobs?per_page=50`], { allowFail: true })?.jobs || null,
  releases: (slug) => { const p = gh(['api', '--paginate', '--slurp', `repos/${slug}/releases?per_page=100`], { allowFail: true }); return Array.isArray(p) ? p.flat() : null; },
  remoteRefs: (root, refs) => git(['ls-remote', 'origin', ...refs], { cwd: root }),
};

// release dev [--version <v>]: refused until the current round has closed at a clean walk (the internal
// walk where one is configured), its findings recorded; and refused unless the checkout is the tranche tip with a clean
// tree and the config has a valid release block. Prints BOB's acts.
// release dev --record <run url>: one row for the run on the state branch.
export function releaseDev(root, { version, record, log = console.log, io: given = {}, slug = repoSlug(root) } = {}) {
  const io = { ...defaultIO, ...given };
  const cfg = loadConfig(root);
  const rel = releaseConfig(cfg);
  if (record !== undefined) return recordRelease(root, cfg, slug, record, { io, log });
  const t = `origin/${cfg.tranche}`;
  git(['fetch', '-q', ...depth(root), 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/${t}`], { cwd: root });
  const tip = git(['rev-parse', t], { cwd: root });
  const head = git(['rev-parse', 'HEAD'], { cwd: root });
  if (head !== tip) fail(`the checkout is ${head.slice(0, 10)}, not the tranche tip ${tip.slice(0, 10)}: check out ${t} first`);
  const dirty = git(['status', '--porcelain', '--untracked-files=no'], { cwd: root });
  if (dirty) fail(`the checkout has uncommitted changes: ${dirty.split('\n').slice(0, 3).join('; ')}`);
  fetchState(root, cfg.state_branch, { fresh: true });
  const round = roundAt(root, cfg, t, { io, slug });
  if (round.s && round.s.prs === null) fail('GitHub unreadable: open pull requests not known, so the round cannot be judged');
  const ready = releaseReady(round, cfg);
  if (!ready.ok) fail(`no development release now: ${ready.why}`);
  const loose = unplaced(root, t);
  if (loose.length) fail(`no development release now: ${loose.map((f) => f.id).join(', ')} in the found file of no module: BOB names its module (\`${P3} found <module> "<finding>" --from "<source>"\`), and the next round fixes it`);
  const v = checkVersion(version === undefined ? defaultVersion(tip, new Date(git(['log', '-1', '--format=%cI', tip], { cwd: root }))) : String(version));
  const taken = io.remoteRefs(root, [`refs/tags/${tagOf(v)}`]).trim();
  if (taken) fail(`version ${v} is taken on origin (${taken.split('\n').map((l) => l.split('\t')[1]).join(', ')}); pass another --version`);
  log(`development release ${v} of ${cfg.tranche} ${tip.slice(0, 10)} (${ready.why}); development only, never published`);
  const steps = [
    `The GitHub connector's actions_run_trigger: run_workflow, workflow_id process-dev-release.yml, owner and repo ${slug}, ref ${cfg.tranche}, inputs {"version":"${v}","commit":"${tip}"} (${SHIM} on the tranche: checks, assemble, then the tag ${tagOf(v)} and a draft release)`,
    `watch the run: https://github.com/${slug}/actions/workflows/process-dev-release.yml?query=branch%3A${encodeURIComponent(cfg.tranche)}`,
    `\`${P3} release dev --record <that run's url>\` once it has finished, green or not`,
  ];
  log("BOB's acts, each its own command; a refused act is never reworded or rerouted:");
  steps.forEach((x, i) => log(`${i + 1}. ${x}`));
  return { ok: true, version: v, commit: tip, steps, release: rel };
}

function recordRelease(root, cfg, slug, url, { io, log }) {
  const id = runId(url);
  const r = io.getRun(slug, id);
  if (!r) fail(`run ${id} could not be read`);
  if (r.path !== SHIM) fail(`run ${id} is ${r.path}, not ${SHIM}`);
  if (r.status !== 'completed') fail(`run ${id} has not finished (${r.status}); record it once it has`);
  if (r.event !== 'workflow_dispatch' || r.head_branch !== cfg.tranche) fail(`run ${id} is a ${r.event} on ${r.head_branch}, not a dispatch on ${cfg.tranche}`);
  const v = String(r.display_title || '').startsWith(RUN_PREFIX) ? checkVersion(r.display_title.slice(RUN_PREFIX.length)) : fail(`run ${id} is titled ${JSON.stringify(r.display_title)}, not ${RUN_PREFIX}<version>`);
  fetchState(root, cfg.state_branch, { fresh: true });
  const have = jsonl(readState(root, cfg.state_branch, RELEASES_FILE));
  if (have.some((x) => x.run === id)) fail(`run ${id} is already recorded`);
  const jobs = io.jobs(slug, id);
  if (!jobs) fail(`the jobs of run ${id} could not be read`);
  let release = null;
  let checks = null;
  if (r.conclusion === 'success') {
    const all = io.releases(slug);
    if (!all) fail('the releases could not be read');
    const found = all.find((x) => x.tag_name === tagOf(v));
    if (!found) fail(`run ${id} succeeded but no release has the tag ${tagOf(v)}`);
    if (!found.draft) log(`warning: the release ${tagOf(v)} is not a draft`);
    release = { url: found.html_url, draft: !!found.draft, assets: (found.assets || []).map((a) => a.name) };
    checks = parseBlock(found.body, MARKER)?.checks || null;
  }
  const row = {
    row: 'dev-release', tranche: cfg.tranche, version: v, commit: r.head_sha, run: id, run_url: r.html_url || url,
    conclusion: r.conclusion, jobs: jobs.map((j) => ({ name: j.name, conclusion: j.conclusion })), checks, release, at: now(),
  };
  writeState(root, cfg.state_branch, `development release ${v}: ${r.conclusion}`, (wt) => {
    mkdirSync(dirname(join(wt, RELEASES_FILE)), { recursive: true });
    appendFileSync(join(wt, RELEASES_FILE), JSON.stringify(row) + '\n');
  });
  log(`recorded development release ${v} at ${String(r.head_sha).slice(0, 10)}: ${r.conclusion}${release ? `; draft release ${release.url}` : ''}`);
  return { ok: true, row };
}

// release run checks|assemble --out <results.json>: run by the shim's read-only jobs. Installs
// the lock files as the gate does, then each check (or the assemble) within its timeout and
// without the GitHub tokens. The results go to --out; exit 1 when any failed.
export function releaseRun(root, step, { out, log = console.log, exec = run, logDir } = {}) {
  const cfg = loadConfig(root);
  const rel = releaseConfig(cfg);
  if (!['checks', 'assemble'].includes(step)) fail('release run checks | release run assemble');
  const results = [];
  const inst = install(root, cfg.lockfiles || [], { exec });
  for (const f of inst.findings) results.push({ name: `install ${f.file}`, exit: 1, seconds: 0, message: f.message });
  // Generated files the commit does not track (over max_file_bytes, say) are built before the
  // checks and the assemble, each job on its own checkout.
  const gen = generatedRows(cfg);
  const b = inst.findings.length ? { built: [], findings: [] } : buildGenerated(root, gen.rows, { timeout: rel.assemble_timeout_minutes * MINUTE, log, exec: (c, args, o) => exec(c, args, { ...o, unset: [...NO_TOKENS, 'NODE_TEST_CONTEXT'] }) });
  if (b.built.length) results.push({ name: `build generated ${b.built.join(', ')}`, exit: 0, seconds: 0 });
  for (const f of b.findings) results.push({ name: `build generated ${f.file}`, exit: 1, seconds: 0, message: f.message });
  const list = inst.findings.length || b.findings.length ? [] : step === 'checks' ? rel.checks : [{ name: 'assemble', argv: rel.assemble, timeout_minutes: rel.assemble_timeout_minutes }];
  // Kept on purpose, not withTemp: the step logs are the evidence the release's output names (util.mjs keepStep).
  const logs = !list.length ? null : logDir ? (mkdirSync(logDir, { recursive: true }), logDir) : mkdtempSync(join(tmpdir(), `p3-release-${step}-`));
  const put = { out: (t) => process.stdout.write(t), err: (t) => process.stderr.write(t), note: log };
  const masks = new Set();
  for (const c of list) {
    log(`::group::${c.name}`);
    const r = exec(c.argv[0], c.argv.slice(1), { cwd: root, timeout: c.timeout_minutes * MINUTE, unset: [...NO_TOKENS, 'NODE_TEST_CONTEXT'] });
    collectMasks(r.stderr, collectMasks(r.stdout, masks));
    keepStep(logs, results.length + 1, c.name, redact(r.stdout, masks), redact(r.stderr, masks), put);
    log('::endgroup::');
    const timedOut = r.seconds * 1000 >= c.timeout_minutes * MINUTE;
    results.push({ name: c.name, exit: r.code, seconds: Math.round(r.seconds), ...(timedOut && r.code !== 0 ? { message: `timed out after ${c.timeout_minutes} min` } : {}) });
    log(`${c.name}: exit ${r.code}, ${Math.round(r.seconds)} s`);
  }
  if (step === 'assemble' && results.every((x) => x.exit === 0)) {
    const dir = join(root, rel.out);
    const files = existsSync(dir) && statSync(dir).isDirectory() ? walk(dir) : [];
    if (!files.length) results.push({ name: 'release.out', exit: 1, seconds: 0, message: `the assemble wrote no files to ${rel.out}` });
    else log(`${rel.out}: ${files.length} file(s)`);
  }
  if (out) writeFileSync(out, JSON.stringify({ step, checks: results }, null, 2) + '\n');
  const failed = results.filter((x) => x.exit !== 0);
  log(failed.length ? `${failed.length} of ${results.length} failed: ${failed.map((x) => x.name).join(', ')}` : `all ${results.length} passed`);
  return { ok: !failed.length, results };
}

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]));

// release sign <dir>: SHA256SUMS over every file in dir, and SHA256SUMS.sig, its Ed25519
// signature in base64, with the PEM key in P3_SIGN_KEY. The key is never printed or written.
export function releaseSign(dir, { key = process.env.P3_SIGN_KEY, log = console.log } = {}) {
  if (!key) fail('P3_SIGN_KEY is empty: the secret release.sign_secret names is not set');
  const files = walk(dir).map((f) => relative(dir, f)).filter((f) => !['SHA256SUMS', 'SHA256SUMS.sig'].includes(f)).sort();
  if (!files.length) fail(`${dir} holds no files to sign`);
  const sums = files.map((f) => `${createHash('sha256').update(readFileSync(join(dir, f))).digest('hex')}  ${f}`).join('\n') + '\n';
  let k;
  try { k = createPrivateKey(key); } catch { fail('P3_SIGN_KEY is not a PEM private key'); }
  if (k.asymmetricKeyType !== 'ed25519') fail(`P3_SIGN_KEY is a ${k.asymmetricKeyType} key, not Ed25519`);
  writeFileSync(join(dir, 'SHA256SUMS'), sums);
  writeFileSync(join(dir, 'SHA256SUMS.sig'), sign(null, Buffer.from(sums), k).toString('base64') + '\n');
  log(`signed ${files.length} file(s): SHA256SUMS, SHA256SUMS.sig`);
  return { files };
}

// release body <checks.json> --version <v> --commit <sha> [--pin <sha>] [--size <size.json>]:
// the draft release's body, with the release note's fields in a block that --record reads back:
// the checks' results, the process pin, the product sizes (p3 size --out, from the checks job)
// and the platform rows the pin's ranges.json names. Development only: the body claims no
// certification, and an empty ranges.json names no platform row.
export function releaseBody(checksFile, { version, commit, pin = null, sizeFile = null, ranges = loadRanges() }) {
  let checks = null;
  try { checks = JSON.parse(readFileSync(checksFile, 'utf8')).checks; } catch { checks = null; }
  let size = null;
  if (sizeFile) { try { const s = JSON.parse(readFileSync(sizeFile, 'utf8')); if (s?.figures && typeof s.figures === 'object') size = { commit: s.commit, figures: s.figures, requirements_cap: s.requirements_cap, over_cap: s.over_cap }; } catch { size = null; } }
  const rows = platformRows(ranges);
  const lead = [
    `Development release ${checkVersion(version)} at ${commit}. Development only: never published, never promoted to installed sites.`,
    '',
    `- process pin: ${pin || 'unread'}`,
    `- product sizes: ${size ? Object.entries(size.figures).map(([k, v]) => `${k} ${v === null ? 'unmeasured' : v}`).join(', ') : 'unread'}`,
    `- checks: ${Array.isArray(checks) ? `${checks.filter((c) => c.exit === 0).length} of ${checks.length} passed` : 'unread'}`,
    `- platform rows the pin names: ${rows.length ? rows.join(', ') : 'none yet'}`,
  ].join('\n');
  return block(MARKER, { version, commit, checks, pin, size, platform_rows: rows }, lead);
}
