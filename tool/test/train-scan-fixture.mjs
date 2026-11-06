// A merge train cold start on a fixture shaped like the copy on 5 Nov (~20 open job pull requests
// into the tranche, providers changing their exports, users importing them, drafts, a red gate,
// gate rows with minutes): GitHub is a fake `gh` on PATH that answers from a file after `latency`
// ms, and origin is a bare repository whose upload-pack and receive-pack wait `gitLatency` ms, so
// the train runs every read it runs on the copy, through github.mjs and git, at a network's pace.
import { appendFileSync, chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { train } from '../lib/train.mjs';
import { git } from '../lib/util.mjs';
import { BOT, GATE, block } from '../lib/github.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';

const FAKE_GH = `#!/usr/bin/env node
const fs = require('node:fs');
const dir = process.env.P3_FAKE_GH;
const t0 = Date.now();
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Number(process.env.P3_FAKE_GH_MS || 0));
const a = process.argv.slice(2);
const url = a.find((x) => x.startsWith('repos/')) || '';
const [path, q = ''] = url.split('?');
const name = new URLSearchParams(q).get('check_name');
const key = name ? path + '#' + name : path;
const db = JSON.parse(fs.readFileSync(dir + '/db.json', 'utf8'));
let out = db[key];
if (out === undefined) out = name ? { check_runs: [] } : (path.endsWith('/comments') ? [] : null);
if (a.includes('--slurp')) out = [out];
fs.appendFileSync(dir + '/log', JSON.stringify({ t0, t1: Date.now(), key }) + '\\n');
if (out === null) { process.stderr.write('Not Found'); process.exit(1); }
process.stdout.write(JSON.stringify(out));
`;

const N = 20;
const iso = (minAgo) => new Date(Date.now() - minAgo * 60000).toISOString();

export function scanFixture({ latency = 800, gitLatency = 500 } = {}) {
  const ids = Array.from({ length: N }, (_, i) => `m${i}`);
  const modules = ids.map((id, i) => ({ id, paths: [`src/${id}/`], tests: [`test/${id}/`], uses: ids.slice(Math.max(0, i - 2), i) }));
  const providers = new Set(['m2', 'm7', 'm12']); // change their exports
  const importers = { m3: 'm2', m9: 'm7', m13: 'm12', m14: 'm12' }; // import a changing provider
  const root0 = makeRepo({
    'process/config.json': { tranche: 'tranche', modules_file: 'build/modules.json', release_path: ['m16'] },
    'build/modules.json': { modules },
    ...Object.fromEntries(ids.map((id) => [`process/ledger/${id}.json`, entry(id)])),
    ...Object.fromEntries(ids.map((id) => [`src/${id}/index.mjs`, `export function f${id}(a) { return a; }\n`])),
  });
  git(['branch', 'tranche'], { cwd: root0 });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root0 });
  git(['remote', 'add', 'origin', bare], { cwd: root0 });
  const heads = {};
  for (const [i, id] of ids.entries()) {
    git(['checkout', '-q', '-b', `job/${id}`, 'tranche'], { cwd: root0 });
    const files = { [`src/${id}/index.mjs`]: providers.has(id) ? `export function f${id}(a, b) { return a + b; }\n` : `export function f${id}(a) { return a + ${i}; }\n` };
    if (importers[id]) files[`src/${id}/use.mjs`] = `import { f${importers[id]} } from '../${importers[id]}/index.mjs';\nexport const g = () => f${importers[id]}(1, 2);\n`;
    // A wide diff too, as a real job's: files the import read walks.
    for (let k = 0; k < 6; k++) files[`src/${id}/part${k}.mjs`] = `import { f${id} } from './index.mjs';\nexport const p${k} = () => f${id}(${k});\n`;
    heads[id] = commit(root0, files, `job ${id}`);
  }
  git(['checkout', '-q', 'tranche'], { cwd: root0 });
  commit(root0, { 'other.txt': 'the tranche moved on' });
  git(['push', '-q', 'origin', 'tranche', 'main', ...ids.map((id) => `job/${id}`)], { cwd: root0 });

  // GitHub as the fake gh reads it.
  const gh = mkdtempSync(join(tmpdir(), 'p3-fake-gh-'));
  const bin = join(gh, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'gh'), FAKE_GH);
  chmodSync(join(bin, 'gh'), 0o755);
  const db = {};
  const prs = ids.map((id, i) => ({ number: 100 + i, state: 'open', draft: id === 'm5' || id === 'm11', base: { ref: 'tranche', repo: { default_branch: 'main' } }, head: { ref: `job/${id}`, sha: heads[id], repo: { full_name: 'o/r' } }, user: { login: 'civicsmith' } }));
  db['repos/o/r/pulls'] = prs;
  for (const [i, id] of ids.entries()) {
    const sha = heads[id];
    const red = id === 'm10';
    const green = iso(id === 'm0' ? 70 : id === 'm1' ? 50 : 3 + i);
    const gate = { id: 1000 + i, status: 'completed', conclusion: red ? 'failure' : 'success', started_at: iso(30 + i), completed_at: green };
    db[`repos/o/r/commits/${sha}/check-runs#gate`] = { check_runs: [gate] };
    db[`repos/o/r/commits/${sha}/check-runs#post`] = { check_runs: [{ id: 2000 + i, status: 'completed', conclusion: 'success', started_at: new Date(Date.parse(green) + 1000).toISOString() }] };
    const runs = [1, 2, 3].map((k) => ({ sha: `old${k}${id}`, at: iso(200 + k), trigger: 'code', suite: 'pass', minutes: ((i * 7 + k * 3) % 23) + 2, run_id: k }));
    // One time for both: two calls a millisecond apart made the comment read as edited, so
    // gateRuns dropped its rows and that PR's gate minutes went unread (the order moved, 6 Nov).
    const posted = iso(200);
    db[`repos/o/r/issues/${100 + i}/comments`] = [{ id: 1, body: block(GATE, { runs }), user: { login: BOT }, created_at: posted, updated_at: posted }];
  }
  writeFileSync(join(gh, 'db.json'), JSON.stringify(db));
  const slow = (cmd) => `sleep ${gitLatency / 1000}; ${cmd}`;
  // The train's clone: a fresh, full clone of the default branch, as a session's after unshallow.
  const fresh = () => {
    const root = mkdtempSync(join(tmpdir(), 'p3-train-clone-'));
    git(['clone', '-q', '--no-local', '--single-branch', '-b', 'main', '-u', slow('git-upload-pack'), bare, root], { cwd: tmpdir() });
    for (const [k, v] of [['user.email', 'noreply@github.com'], ['user.name', 'Test'], ['commit.gpgsign', 'false'], ['remote.origin.uploadpack', slow('git-upload-pack')], ['remote.origin.receivepack', slow('git-receive-pack')]]) git(['config', k, v], { cwd: root });
    return root;
  };
  return { ids, heads, prs, gh, bin, fresh, root0, bare, providers, importers, latency };
}

// One train started on root, until its first pick: { ms, pr, queue, calls (gh calls), maxPar }.
export function firstPick(fx, root, { env = {}, io } = {}) {
  const was = { PATH: process.env.PATH, P3_FAKE_GH: process.env.P3_FAKE_GH, P3_FAKE_GH_MS: process.env.P3_FAKE_GH_MS };
  writeFileSync(join(fx.gh, 'log'), '');
  Object.assign(process.env, { PATH: `${fx.bin}:${process.env.PATH}`, P3_FAKE_GH: fx.gh, P3_FAKE_GH_MS: String(fx.latency) }, env);
  let queue = null;
  const t0 = Date.now();
  let ms = null;
  let pr = null;
  try {
    train(root, { session: 'session_bench1', slug: 'o/r', log: () => {}, ...(io ? { io } : {}), onQueue: (l) => { queue = l.map((c) => c.n); }, diskFree: () => { ms = Date.now() - t0; return 0; }, diskMinMb: 1 });
  } catch (e) {
    const m = /nothing was started for PR (\d+)/.exec(e.message);
    if (!m) throw e;
    pr = Number(m[1]);
  } finally {
    for (const [k, v] of Object.entries(was)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
  const calls = readFileSync(join(fx.gh, 'log'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  let maxPar = 0;
  for (const c of calls) maxPar = Math.max(maxPar, calls.filter((d) => d.t0 < c.t1 && d.t1 > c.t0).length);
  return { ms, pr, queue, calls: calls.length, maxPar };
}
export const appendLog = (fx, l) => appendFileSync(join(fx.gh, 'bench.txt'), l + '\n');
