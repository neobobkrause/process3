// Two measures on the copy, 4 Nov. Copy PR 148: BOB's refresh of the six stale dist/*.bundle.json
// manifests was refused by merge --plain as "module files, which go through a job"; a plain pull
// request may now change a module's committed generated files when that is all it changes of any
// module and the gate regenerated them from its commit byte-identical, the row recording it.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { gate as gateRun, gateComment } from '../lib/gate.mjs';
import { BOT, GATE, block, parseBlock } from '../lib/github.mjs';
import { mergePlain } from '../lib/merge.mjs';
import { git, loadConfig } from '../lib/util.mjs';
import { setupCheck } from '../lib/setup.mjs';
import { commit, entry, makeRepo } from './helpers.mjs';
// The gate never posts; job post writes its row as a comment after the run, as here.
const gate = (root, o) => { const r = gateRun(root, o); if (o.pr && o.post !== false) o.io.addComment(o.slug, o.pr, gateComment(r.run)); return r; };

const quiet = () => {};
const PASS = "import test from 'node:test';\ntest('ok', () => {});\n";
// gen.mjs writes the module's committed manifest from its source, as the copy's build does.
const GEN = "import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';\nmkdirSync('src/alpha/dist', { recursive: true });\nwriteFileSync('src/alpha/dist/alpha.bundle.json', JSON.stringify({ from: readFileSync('src/alpha/index.mjs', 'utf8') }) + '\\n');\n";
const BUNDLE = 'src/alpha/dist/alpha.bundle.json';
const fresh = (src) => JSON.stringify({ from: src }) + '\n';
const SRC = 'export const x = 1;\n';
const CONFIG = { generated: [{ paths: [BUNDLE], regenerate: ['node', 'gen.mjs'], verify: ['node', '-e', 'process.exit(0)'] }] };

// The gate's own io: rows it posts are the genuine ones (verifyRow's stand-in).
function gateIO(comments = []) {
  const state = { comments, genuine: new Set() };
  const key = (r) => `${r.at}|${r.sha}|${r.trigger}`;
  return {
    state,
    io: {
      comments: () => state.comments,
      getPR: () => ({ user: { login: 'acmewidget' } }),
      addComment: (s, n, body) => {
        state.comments.push({ id: state.comments.length + 1, body, user: { login: BOT } });
        for (const r of parseBlock(body, GATE)?.runs || []) state.genuine.add(key(r));
        return {};
      },
      verify: (s, r) => state.genuine.has(key(r)),
    },
  };
}

// A product whose module alpha commits a stale generated manifest, with origin, and BOB's
// refresh branch holding `files`.
function product(files, config = CONFIG) {
  const root = makeRepo({
    'process/config.json': config,
    'process/ledger/alpha.json': entry('alpha', { status: { state: 'COMPLETE' } }),
    'gen.mjs': GEN,
    'src/alpha/index.mjs': SRC,
    [BUNDLE]: '{"from":"stale"}\n',
    'test/alpha/x.test.mjs': PASS,
    '.github/workflows/process-gate.yml': 'on: pull_request\n',
  });
  git(['branch', 'tranche'], { cwd: root });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['checkout', '-q', '-b', 'bob/refresh', 'tranche'], { cwd: root });
  const sha = commit(root, files);
  git(['push', '-q', 'origin', 'main', 'tranche', 'bob/refresh'], { cwd: root });
  return { root, base, sha };
}
const gateOn = (p, g) => gate(p.root, { base: p.base, head: p.sha, branch: 'bob/refresh', pr: 148, slug: 'o/r', io: g.io, log: quiet });
const back = (p) => { git(['checkout', '-q', '-f', 'bob/refresh'], { cwd: p.root }); git(['clean', '-qfd'], { cwd: p.root }); git(['checkout', '-q', 'main'], { cwd: p.root }); };

function plainIO(p, comments, verify) {
  const calls = { merged: null };
  const pr = () => ({ state: 'open', draft: false, mergeable: true, base: { ref: 'tranche', repo: { full_name: 'o/r', default_branch: 'main' } }, head: { ref: 'bob/refresh', sha: p.sha, repo: { full_name: 'o/r' } } });
  const green = { id: 1, status: 'completed', conclusion: 'success', started_at: '2026-11-04T06:00:00Z' };
  return {
    calls,
    io: {
      getPR: pr, requiredChecks: () => ({ checks: [{ context: 'gate' }] }), checkRuns: () => [green], checkRun: () => green,
      comments: () => comments, verify, repo: { released: () => false, shim: () => null, descends: () => false },
      mergePR: (slug, n, sha, o) => { calls.merged = { sha, ...o }; return { merged: true, sha: 'm'.repeat(40) }; },
    },
  };
}
const q = { slug: 'o/r', log: quiet, reviewed: 'fresh reviewer', rounds: 1 };

test('a refresh-only plain pull request: the gate regenerates byte-identical, records it, and merge --plain merges it', () => {
  const p = product({ [BUNDLE]: fresh(SRC) });
  const g = gateIO();
  const r = gateOn(p, g);
  assert.deepEqual(r.findings, []);
  assert.equal(r.run.trigger, 'code');
  assert.deepEqual(r.run.refresh, { files: [BUNDLE], result: 'identical', differ: [] });
  back(p);
  const f = plainIO(p, g.state.comments, g.io.verify);
  const out = mergePlain(p.root, 148, { ...q, io: f.io });
  assert.equal(out.merged, true);
  assert.equal(f.calls.merged.sha, p.sha);
  // Without a verified row that recorded it (a forged comment, or none), it is refused.
  assert.throws(() => mergePlain(p.root, 148, { ...q, io: plainIO(p, g.state.comments, () => false).io }), /changes generated module files \(src\/alpha\/dist\/alpha\.bundle\.json\): no green process-gate run on .* regenerated them byte-identical/);
  assert.throws(() => mergePlain(p.root, 148, { ...q, io: plainIO(p, [], () => true).io }), /no green process-gate run/);
});

test('a refresh that also changes a module\'s source is refused: no other file of a module may change', () => {
  const src = 'export const x = 2;\n';
  const p = product({ [BUNDLE]: fresh(src), 'src/alpha/index.mjs': src });
  const g = gateIO();
  gateOn(p, g);
  back(p);
  const f = plainIO(p, g.state.comments, g.io.verify);
  assert.throws(() => mergePlain(p.root, 148, { ...q, io: f.io }), /changes module files, which go through a job: src\/alpha\/index\.mjs \(alpha\); a plain pull request may change a module's generated files only, and only to their regenerated bytes/);
  assert.equal(f.calls.merged, null);
});

test('a generated file that differs from a regenerate is a gate finding, and merge --plain refuses it', () => {
  const p = product({ [BUNDLE]: '{"from":"hand-edited"}\n' });
  const g = gateIO();
  const r = gateOn(p, g);
  assert.equal(r.run.ok, false);
  assert.deepEqual(r.run.refresh, { files: [BUNDLE], result: 'differs', differ: [BUNDLE] });
  assert.match(r.findings.find((x) => x.file === BUNDLE).message, /is not what its regenerate writes from this commit/);
  back(p);
  // Even were GitHub's check green, the row is red and says why.
  assert.throws(() => mergePlain(p.root, 148, { ...q, io: plainIO(p, g.state.comments, g.io.verify).io }), /no green process-gate run on .* regenerated them byte-identical \(its newest run: differs, src\/alpha\/dist\/alpha\.bundle\.json differ\)/);
});

test('records pushed after the green refresh run keep its comparison', () => {
  const p = product({ [BUNDLE]: fresh(SRC) });
  const g = gateIO();
  gateOn(p, g);
  git(['checkout', '-q', '-f', 'bob/refresh'], { cwd: p.root });
  const head2 = commit(p.root, { 'process/metrics/alpha.jsonl': '{}\n' });
  const r2 = gate(p.root, { base: p.base, head: head2, branch: 'bob/refresh', pr: 148, slug: 'o/r', io: g.io, log: quiet });
  assert.deepEqual([r2.run.trigger, r2.run.refresh?.result], ['record-since-green', 'identical']);
});

// Review 1 of PR 95.
test('a regenerate that writes nothing cannot pass a hand-edited file, and a changed generator is refused', () => {
  // The generator, unchanged, skips work when its output exists: the gate removes the file first.
  const lazy = "import { existsSync } from 'node:fs';\nif (!existsSync('src/alpha/dist/alpha.bundle.json')) await import('./gen-real.mjs');\n";
  const p = product({ [BUNDLE]: '{"from":"evil"}\n' });
  git(['checkout', '-q', '-f', 'tranche'], { cwd: p.root });
  const base2 = commit(p.root, { 'gen.mjs': lazy, 'gen-real.mjs': GEN });
  git(['checkout', '-q', 'bob/refresh'], { cwd: p.root });
  git(['merge', '-q', '--no-edit', 'tranche'], { cwd: p.root });
  const head = git(['rev-parse', 'HEAD'], { cwd: p.root });
  const r = gate(p.root, { base: base2, head, branch: 'bob/refresh', pr: 148, slug: 'o/r', io: gateIO().io, log: quiet });
  assert.equal(r.run.refresh.result, 'differs', JSON.stringify(r.run.refresh));
  assert.equal(r.run.ok, false);

  // A pull request that rewrites the generator to write nothing, with its "refreshed" file.
  const q2 = product({ [BUNDLE]: '{"from":"evil"}\n', 'gen.mjs': '// nothing\n' });
  const g = gateIO();
  const r2 = gateOn(q2, g);
  assert.equal(r2.run.refresh.result, 'other files changed');
  assert.match(r2.findings.find((f) => f.file === 'gen.mjs').message, /changes generated module files and gen\.mjs: a refresh may go beside only records, the modules file, the layers file and process\/config\.json; any other file could be what writes them/);
  back(q2);
  assert.throws(() => mergePlain(q2.root, 148, { ...q, io: plainIO(q2, g.state.comments, g.io.verify).io }), /changes generated module files and gen\.mjs: a refresh may go beside only records/);
  // Nor a file the generator imports, which no command names (review 2 of PR 95).
  const imp = product({ [BUNDLE]: '{"from":"evil"}\n', 'gen-lib.mjs': 'export default 1;\n' });
  const g3 = gateIO();
  assert.equal(gateOn(imp, g3).run.refresh.result, 'other files changed');
  back(imp);
  assert.throws(() => mergePlain(imp.root, 148, { ...q, io: plainIO(imp, g3.state.comments, g3.io.verify).io }), /and gen-lib\.mjs: a refresh may go beside only/);
});

// Build untrack-generated (copy PR 306, run 41905241074, 4 Nov): a committed generated file could
// never be untracked. A plain pull request may now remove it when the head's .gitignore ignores
// it: the gate builds it, runs its row's verify, and merge --plain takes the row; without the
// ignore line the removal is refused as before.
const untrack = (p, gitignore) => {
  git(['checkout', '-q', '-f', 'bob/refresh'], { cwd: p.root });
  if (gitignore !== undefined) commit(p.root, { '.gitignore': gitignore });
  git(['rm', '-q', '--cached', BUNDLE], { cwd: p.root });
  git(['commit', '-q', '-m', 'stop committing it'], { cwd: p.root });
  p.sha = git(['rev-parse', 'HEAD'], { cwd: p.root });
  git(['push', '-q', '-f', 'origin', 'bob/refresh'], { cwd: p.root });
  return p;
};
const VERIFIED = join(mkdtempSync(join(tmpdir(), 'p3-verified-')), 'count');
const COUNTING = { generated: [{ ...CONFIG.generated[0], verify: ['node', '-e', `require('fs').appendFileSync(${JSON.stringify(VERIFIED)}, 'v')`] }] };
const verified = () => { try { return readFileSync(VERIFIED, 'utf8').length; } catch { return 0; } };

test('untracking: base tracks the file and lists the row; head removes it and ignores it; the gate builds and verifies it, and merge --plain merges', () => {
  const p = untrack(product({ 'process/metrics/alpha.jsonl': '{}\n' }, COUNTING), `# built where it is needed\n${BUNDLE}\n`);
  const before = verified();
  const g = gateIO();
  const logs = [];
  const r = gate(p.root, { base: p.base, head: p.sha, branch: 'bob/refresh', pr: 148, slug: 'o/r', io: g.io, log: (l) => logs.push(l) });
  assert.deepEqual(r.findings, []);
  assert.deepEqual(r.run.built, [BUNDLE], 'built before the suite, as an untracked row is');
  assert.deepEqual(r.run.refresh, { files: [BUNDLE], result: 'identical', differ: [], untracked: [BUNDLE] });
  assert.equal(verified() - before, 1, "the row's verify ran once");
  assert.ok(logs.some((l) => /generated, untracked and built: src\/alpha\/dist\/alpha\.bundle\.json: .*exit 0/.test(l)), logs.join('\n'));
  assert.equal(readFileSync(join(p.root, BUNDLE), 'utf8'), fresh(SRC), 'the regenerate wrote it');
  back(p);
  const f = plainIO(p, g.state.comments, g.io.verify);
  assert.equal(mergePlain(p.root, 148, { ...q, io: f.io }).merged, true);
  // A row that does not name it untracked (an older gate's) is not taken.
  const old = gateIO();
  old.io.addComment('o/r', 148, gateComment({ ...r.run, refresh: { files: [BUNDLE], result: 'identical', differ: [] } }));
  assert.throws(() => mergePlain(p.root, 148, { ...q, io: plainIO(p, old.state.comments, old.io.verify).io }), /no green process-gate run/);
});

test('untracking: a path the base already ignores needs no .gitignore change', () => {
  const p = product({ 'process/metrics/alpha.jsonl': '{}\n' });
  git(['checkout', '-q', '-f', 'tranche'], { cwd: p.root });
  p.base = commit(p.root, { '.gitignore': `${BUNDLE}\n` });
  git(['checkout', '-q', 'bob/refresh'], { cwd: p.root });
  git(['merge', '-q', '--no-edit', 'tranche'], { cwd: p.root });
  untrack(p);
  const r = gateOn(p, gateIO());
  assert.deepEqual(r.findings, []);
  assert.deepEqual(r.run.refresh.untracked, [BUNDLE]);
});

test('untracking: the removal is refused without the ignore line, and when verify fails', () => {
  const p = untrack(product({ 'process/metrics/alpha.jsonl': '{}\n' }));
  const g = gateIO();
  const r = gateOn(p, g);
  assert.deepEqual([r.run.refresh.result, r.run.refresh.differ, r.run.refresh.untracked], ['differs', [BUNDLE], undefined]);
  // Copy PR 557's shape: only the removal, no ignore line; the finding names what is missing.
  assert.match(r.findings.find((f) => f.file === BUNDLE).message, /is removed, but no \.gitignore at this commit ignores it: to stop committing a generated file, add \/src\/alpha\/dist\/alpha\.bundle\.json to the root \.gitignore in the same pull request/);
  back(p);
  assert.throws(() => mergePlain(p.root, 148, { ...q, io: plainIO(p, g.state.comments, g.io.verify).io }), /no green process-gate run .*\(its newest run: differs/);
  // Another file's ignore line does not cover it.
  const o = untrack(product({ 'process/metrics/alpha.jsonl': '{}\n' }), 'other.json\n');
  const ro = gateOn(o, gateIO());
  assert.equal(ro.run.ok, false);
  assert.equal(ro.run.refresh.untracked, undefined);
  const bad = untrack(product({ 'process/metrics/alpha.jsonl': '{}\n' }, { generated: [{ ...CONFIG.generated[0], verify: ['node', '-e', 'process.exit(3)'] }] }), `${BUNDLE}\n`);
  const rb = gateOn(bad, gateIO());
  assert.equal(rb.run.refresh.result, 'generated failed');
  // PD-9: the built row's verify runs once, with the built rows; its finding names the file.
  assert.deepEqual(rb.findings.filter((f) => /failed \(exit 3\) after building/.test(f.message)).map((f) => f.file), [BUNDLE]);
});

test('untracking: copy PR 557 with its ignore line added, as the copy writes it (a comment and a leading slash), passes', () => {
  const p = untrack(product({ 'process/metrics/alpha.jsonl': '{}\n' }), `# built at layer close, deploy and release\n/${BUNDLE}\n`);
  const r = gateOn(p, gateIO());
  assert.deepEqual(r.findings, []);
  assert.deepEqual(r.run.refresh.untracked, [BUNDLE]);
});

test('untracking: a .gitignore line other than the untracked path, or a .gitignore elsewhere, is another file', () => {
  for (const [what, files] of [
    ['a wider pattern', { '.gitignore': `${BUNDLE}\n*.sql\n` }],
    ['a pattern covering it', { '.gitignore': 'src/alpha/dist/\n' }],
    ['another module\'s new .gitignore', { '.gitignore': `/${BUNDLE}\n`, 'src/beta/.gitignore': '*.sql\n' }],
    ['its bare name, which matches at every depth', { 'src/alpha/dist/.gitignore': 'alpha.bundle.json\n' }],
    ['a line git shows as +++', { '.gitignore': `${BUNDLE}\n++*\n` }],
  ]) {
    const p = product({ 'process/metrics/alpha.jsonl': '{}\n' });
    git(['checkout', '-q', '-f', 'bob/refresh'], { cwd: p.root });
    commit(p.root, files);
    untrack(p);
    const g = gateIO();
    const r = gateOn(p, g);
    assert.equal(r.run.ok, false, what);
    assert.equal(r.run.refresh.result, 'other files changed', what);
    back(p);
    assert.throws(() => mergePlain(p.root, 148, { ...q, io: plainIO(p, g.state.comments, g.io.verify).io }), /a refresh may go beside only|no green process-gate run|module files, which go through a job/, what);
  }
  // Its own path from a nested .gitignore, anchored, with a comment, is the untracking's.
  const n = product({ 'process/metrics/alpha.jsonl': '{}\n' });
  untrack(n);
  git(['checkout', '-q', '-f', 'bob/refresh'], { cwd: n.root });
  n.sha = commit(n.root, { 'src/alpha/.gitignore': '# built at deploy\n/dist/alpha.bundle.json\n' });
  git(['push', '-q', '-f', 'origin', 'bob/refresh'], { cwd: n.root });
  const rn = gateOn(n, gateIO());
  assert.deepEqual(rn.findings, []);
  assert.deepEqual(rn.run.refresh.untracked, [BUNDLE]);
});

test('untracking: a .gitignore change that drops or alters a line is another file', () => {
  const p = product({ 'process/metrics/alpha.jsonl': '{}\n' });
  git(['checkout', '-q', '-f', 'tranche'], { cwd: p.root });
  p.base = commit(p.root, { '.gitignore': 'keep-me\n' });
  git(['checkout', '-q', 'bob/refresh'], { cwd: p.root });
  git(['merge', '-q', '--no-edit', 'tranche'], { cwd: p.root });
  git(['push', '-q', 'origin', 'tranche'], { cwd: p.root });
  untrack(p, `${BUNDLE}\n`);
  const g = gateIO();
  const r = gateOn(p, g);
  assert.equal(r.run.refresh.result, 'other files changed');
  assert.match(r.findings.find((f) => /a refresh may go beside only/.test(f.message)).message, /and \.gitignore/);
  back(p);
  assert.throws(() => mergePlain(p.root, 148, { ...q, io: plainIO(p, g.state.comments, g.io.verify).io }), /and \.gitignore: a refresh may go beside only/);
});

test('a generated file no module owns is not the refresh check\'s: the gate stays green', () => {
  const root = makeRepo({ 'process/config.json': { generated: [{ paths: ['docs/x.json'], regenerate: ['node', '-e', '0'], verify: ['node', '-e', '0'] }] }, 'process/ledger/alpha.json': entry('alpha'), 'docs/x.json': '1\n' });
  git(['branch', 'tranche'], { cwd: root });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  git(['checkout', '-q', '-b', 'bob/docs'], { cwd: root });
  const head = commit(root, { 'docs/x.json': '2\n' });
  const r = gate(root, { base, head, branch: 'bob/docs', pr: 9, slug: 'o/r', io: gateIO().io, log: quiet });
  assert.deepEqual([r.run.ok, r.run.refresh], [true, undefined], JSON.stringify(r.findings));
});

test('merge --plain needs the refresh row on the base as it is now', () => {
  const p = product({ [BUNDLE]: fresh(SRC) });
  const g = gateIO();
  gateOn(p, g);
  back(p);
  git(['checkout', '-q', 'tranche'], { cwd: p.root });
  commit(p.root, { 'README.md': 'the tranche moved\n' });
  git(['push', '-q', 'origin', 'tranche'], { cwd: p.root });
  git(['checkout', '-q', 'main'], { cwd: p.root });
  assert.throws(() => mergePlain(p.root, 148, { ...q, io: plainIO(p, g.state.comments, g.io.verify).io }), /against tranche as it is regenerated them byte-identical \(its newest run: identical\); tranche moved since its newest run: give the gate a new event on the base as it is/);
});

test('a row that builds an uncommitted path and writes a refreshed one is regenerated after the removal (review 2 of PR 95)', () => {
  const both = "import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';\nmkdirSync('src/alpha/dist', { recursive: true });\nwriteFileSync('src/alpha/dist/alpha.bundle.json', JSON.stringify({ from: readFileSync('src/alpha/index.mjs', 'utf8') }) + '\\n');\nwriteFileSync('src/alpha/dist/rows.mjs', 'export default 1;\\n');\n";
  const p = product({ [BUNDLE]: fresh(SRC) });
  git(['checkout', '-q', '-f', 'tranche'], { cwd: p.root });
  const base2 = commit(p.root, { 'gen.mjs': both, '.gitignore': 'src/alpha/dist/rows.mjs\n', 'process/config.json': { generated: [{ ...CONFIG.generated[0], paths: [BUNDLE, 'src/alpha/dist/rows.mjs'] }] } });
  git(['checkout', '-q', 'bob/refresh'], { cwd: p.root });
  git(['merge', '-q', '--no-edit', 'tranche'], { cwd: p.root });
  const head = git(['rev-parse', 'HEAD'], { cwd: p.root });
  const r = gate(p.root, { base: base2, head, branch: 'bob/refresh', pr: 148, slug: 'o/r', io: gateIO().io, log: quiet });
  assert.deepEqual(r.run.built, ['src/alpha/dist/rows.mjs']);
  assert.equal(r.run.refresh.result, 'identical', JSON.stringify(r.findings));
});

test('a refresh compares every generated file it changes, those no module owns too (review 3 of PR 95)', () => {
  // Row B (the bundle) reads gen/schema.txt, written by row A, which no module owns; B runs first.
  const genB = "import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';\nmkdirSync('src/alpha/dist', { recursive: true });\nwriteFileSync('src/alpha/dist/alpha.bundle.json', JSON.stringify({ from: readFileSync('gen/schema.txt', 'utf8') }) + '\\n');\n";
  const genA = "import { mkdirSync, writeFileSync } from 'node:fs';\nmkdirSync('gen', { recursive: true });\nwriteFileSync('gen/schema.txt', 'real\\n');\n";
  const p = product({ 'gen/schema.txt': 'evil\n', [BUNDLE]: fresh('evil\n') });
  git(['checkout', '-q', '-f', 'tranche'], { cwd: p.root });
  const rows = [{ paths: [BUNDLE], regenerate: ['node', 'genB.mjs'], verify: ['node', '-e', '0'] }, { paths: ['gen/schema.txt'], regenerate: ['node', 'genA.mjs'], verify: ['node', '-e', '0'] }];
  const base2 = commit(p.root, { 'genA.mjs': genA, 'genB.mjs': genB, 'gen/schema.txt': 'real\n', 'process/config.json': { generated: rows } });
  git(['checkout', '-q', 'bob/refresh'], { cwd: p.root });
  git(['merge', '-q', '--no-edit', '-X', 'ours', 'tranche'], { cwd: p.root });
  const head = git(['rev-parse', 'HEAD'], { cwd: p.root });
  assert.equal(git(['show', `${head}:gen/schema.txt`], { cwd: p.root }), 'evil');
  const g = gateIO();
  const r = gate(p.root, { base: base2, head, branch: 'bob/refresh', pr: 148, slug: 'o/r', io: g.io, log: quiet });
  assert.deepEqual(r.run.refresh.files.sort(), [BUNDLE, 'gen/schema.txt'].sort());
  assert.ok(r.run.refresh.differ.includes('gen/schema.txt'), JSON.stringify(r.run.refresh));
  assert.equal(r.run.ok, false);
  git(['checkout', '-q', '-f', 'bob/refresh'], { cwd: p.root }); git(['clean', '-qfd'], { cwd: p.root }); git(['checkout', '-q', 'main'], { cwd: p.root });
  p.sha = head;
  git(['push', '-q', 'origin', 'tranche', 'bob/refresh'], { cwd: p.root });
  assert.throws(() => mergePlain(p.root, 148, { ...q, io: plainIO(p, g.state.comments, g.io.verify).io }), /changes generated module files \((gen\/schema\.txt, src\/alpha\/dist\/alpha\.bundle\.json|src\/alpha\/dist\/alpha\.bundle\.json, gen\/schema\.txt)\): no green process-gate run/);
  // A row naming only the bundle, forged green, does not cover the schema either.
  const forged = { sha: head, base: base2, ok: true, refresh: { files: [BUNDLE], result: 'identical', differ: [] } };
  assert.throws(() => mergePlain(p.root, 148, { ...q, io: plainIO(p, [{ id: 1, body: block(GATE, { runs: [forged] }), user: { login: BOT } }], () => true).io }), /no green process-gate run/);
});

test('a refresh\'s record files count as inert only outside every module and unnamed by a row\'s commands', () => {
  // records: process/ and src/alpha/notes/ (a module's path); the generator named under process/.
  const cfgRows = { records: ['process/', 'src/alpha/notes/'], generated: [{ paths: [BUNDLE], regenerate: ['node', 'process/gen.mjs'], verify: ['node', '-e', '0'] }] };
  const p = product({ [BUNDLE]: fresh(SRC), 'src/alpha/notes/n.md': 'x\n', 'process/gen.mjs': GEN, 'process/metrics/alpha.jsonl': '{}\n' });
  git(['checkout', '-q', '-f', 'tranche'], { cwd: p.root });
  const base2 = commit(p.root, { 'process/config.json': cfgRows, 'process/gen.mjs': '// the base generator\n' + GEN });
  git(['checkout', '-q', 'bob/refresh'], { cwd: p.root });
  git(['merge', '-q', '--no-edit', '-X', 'ours', 'tranche'], { cwd: p.root });
  const head = git(['rev-parse', 'HEAD'], { cwd: p.root });
  const r = gate(p.root, { base: base2, head, branch: 'bob/refresh', pr: 148, slug: 'o/r', io: gateIO().io, log: quiet });
  assert.equal(r.run.refresh.result, 'other files changed');
  const others = r.findings.find((f) => /a refresh may go beside only/.test(f.message)).message;
  assert.match(others, /src\/alpha\/notes\/n\.md/);
  assert.match(others, /process\/gen\.mjs/);
  assert.doesNotMatch(others, /process\/metrics/);
});

test('a generated path under a records path is refused by construction (review 4 of PR 95)', () => {
  for (const records of [['process/', 'src/alpha/dist/'], ['process/', 'src/alpha/dist/alpha.bundle.json'], ['process/', 'src/']]) {
    const root = makeRepo({ 'process/config.json': { ...CONFIG, records } });
    assert.throws(() => loadConfig(root), new RegExp(`the generated path src/alpha/dist/alpha\\.bundle\\.json and the records path ${records[1].replace(/[./]/g, (m) => `\\${m}`)} overlap`));
    assert.throws(() => loadConfig(root, 'HEAD'), /overlap; a generated file is never a record/);
    assert.throws(() => setupCheck(root, { slug: 'o/r', conditions: [], io: { api: () => null, openPRs: () => [], prFiles: () => [] }, log: quiet }), /overlap/);
  }
  // A records path inside a generated directory overlaps too.
  assert.throws(() => loadConfig(makeRepo({ 'process/config.json': { generated: [{ ...CONFIG.generated[0], paths: ['dist/'] }], records: ['process/', './dist/meta/'] } })), /generated path dist\/ and the records path \.\/dist\/meta\/ overlap/);
  assert.equal(loadConfig(makeRepo({ 'process/config.json': CONFIG })).generated.length, 1);
});

// c2b265a stays as a second line: a record-since-green run copies the green refresh row only when
// no generated file changed since it. With the guard no config reaches it through records; it is
// tested through gate's own reading of the diff.
test('a record-since-green run copies the refresh row only when no generated file changed since the green run', () => {
  const p = product({ [BUNDLE]: fresh(SRC) });
  const g = gateIO();
  assert.equal(gateOn(p, g).run.refresh.result, 'identical');
  git(['checkout', '-q', '-f', 'bob/refresh'], { cwd: p.root });
  const h2 = commit(p.root, { 'process/metrics/alpha.jsonl': '{}\n' });
  assert.equal(gate(p.root, { base: p.base, head: h2, branch: 'bob/refresh', pr: 148, slug: 'o/r', io: g.io, log: quiet }).run.refresh.result, 'identical');
});

// PD-9 (C31, the coordinator, 8 Nov): copy layer merge 11 failed on the words-reads verify, a fault
// screens-action T53 brought in on 7 Nov; every job gate since built the row (gitignored, never
// committed) and ran no verify (changed false, verify null). The gate verifies every built row after
// building it, as layer merge does, through the one helper both share (checks.mjs regenerate).
function builtProduct(verifyExit) {
  const WORDS = 'docs/words-reads.json';
  const gen = "import { mkdirSync, writeFileSync } from 'node:fs';\nmkdirSync('docs', { recursive: true });\nwriteFileSync('docs/words-reads.json', '{}\\n');\n";
  const config = { generated: [
    { paths: [WORDS], regenerate: ['node', 'words.mjs'], verify: ['node', '-e', `console.error('words-reads: parse error at line 3'); process.exit(${verifyExit})`] },
    // A committed row, unchanged: its verify is not run (it would fail if it were).
    { paths: [BUNDLE], regenerate: ['node', 'gen.mjs'], verify: ['node', '-e', 'process.exit(9)'] },
  ] };
  const root = makeRepo({
    'process/config.json': config, '.gitignore': `${WORDS}\n`, 'words.mjs': gen,
    'process/ledger/alpha.json': entry('alpha', { status: { state: 'COMPLETE' } }),
    'gen.mjs': GEN, 'src/alpha/index.mjs': SRC, [BUNDLE]: fresh(SRC), 'test/alpha/x.test.mjs': PASS,
    '.github/workflows/process-gate.yml': 'on: pull_request\n',
  });
  git(['branch', 'tranche'], { cwd: root });
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['checkout', '-q', '-b', 'bob/refresh', 'tranche'], { cwd: root });
  const sha = commit(root, { 'README.md': 'a plain change\n' });
  git(['push', '-q', 'origin', 'main', 'tranche', 'bob/refresh'], { cwd: root });
  return { root, base, sha };
}

test('PD-9: the gate verifies a built (gitignored) generated row after building it; a failing verify is a finding; a committed unchanged row is not verified', () => {
  const bad = builtProduct(1);
  const lines = [];
  const r = gate(bad.root, { base: bad.base, head: bad.sha, branch: 'bob/refresh', pr: 148, slug: 'o/r', io: gateIO().io, log: (l) => lines.push(String(l)) });
  const f = r.findings.filter((x) => x.check === 'generated');
  assert.equal(f.length, 1, JSON.stringify(r.findings));
  assert.equal(f[0].file, 'docs/words-reads.json');
  assert.match(f[0].message, /^node -e .* failed \(exit 1\) after building: .*words-reads: parse error at line 3/);
  assert.equal(r.run.ok, false);
  const row = (r.run.generated || []).find((x) => x.paths?.includes('docs/words-reads.json'));
  assert.deepEqual([row?.built, row?.verify], [true, 1], JSON.stringify(r.run.generated));
  // The committed, unchanged row: no verify (its exit 9 would be a finding).
  assert.ok(!lines.some((l) => /exit 9/.test(l)));
  // A passing verify: no finding.
  const good = builtProduct(0);
  const r2 = gate(good.root, { base: good.base, head: good.sha, branch: 'bob/refresh', pr: 148, slug: 'o/r', io: gateIO().io, log: quiet });
  assert.deepEqual(r2.findings.filter((x) => x.check === 'generated'), []);
});
