// The caps on every prompt the tool prints (Build Plan, "Text to write, with caps"): the role
// prompts and a job's START are one screen, 4096 bytes; the review brief has no byte cap there,
// only its parts (objective, reading set, output format, boundaries, every gap in one pass).
// Measured 4 Nov: ROOT's prompt was 4248 bytes, over the cap, and only BOB's had a test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { entry, makeRepo } from './helpers.mjs';
import { handoverBegin, recordStart, startRole } from '../lib/roles.mjs';
import { jobStart, startText } from '../lib/job.mjs';
import { briefText } from '../lib/review.mjs';
import { git } from '../lib/util.mjs';

const quiet = () => {};
const SCREEN = 4096;
const SLUG = 'neobobkrause/civicsmith-copy';
const ID = 'session_01RAN5ek9qx8mduYhfE77Ldc';
const bytes = (t) => Buffer.byteLength(t);

function withOrigin() {
  const root = makeRepo({ 'README.md': 'x', 'process/config.json': { tranche: 'tranche' } });
  git(['branch', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  return root;
}

test('start root, start bob (fresh and by handover) and start watcher each print one screen at most', () => {
  const root = withOrigin();
  const addr = { root: { session: ID } };
  const prompts = {
    root: startRole(root, 'root', { slug: SLUG, address: {}, log: quiet }).prompt,
    bob: startRole(root, 'bob', { slug: SLUG, address: addr, log: quiet }).prompt,
    watcher: startRole(root, 'watcher', { slug: SLUG, address: {}, log: quiet }).prompt,
  };
  recordStart(root, 'root', ID, { log: quiet });
  recordStart(root, 'bob', 'session_oldbob1', { log: quiet });
  prompts['bob by handover'] = handoverBegin(root, { slug: SLUG, log: quiet }).prompt;
  assert.ok(prompts['bob by handover'].includes('You replace BOB `session_oldbob1`'));
  for (const [role, p] of Object.entries(prompts)) {
    assert.match(p, /--approvals [0-9a-f]{64}/, `${role}: measured with a real approvals hash`);
    assert.ok(bytes(p) <= SCREEN, `${role}: ${bytes(p)} bytes, over ${SCREEN}`);
  }
});

test('a job START with a typical entry is one screen at most', () => {
  const e = entry('alpha', {
    title: 'Member sign-in and session handling',
    paths: ['src/alpha/', 'src/shared/alpha-client.mjs', 'worker/alpha/'],
    tests: ['test/alpha/', 'test/e2e/alpha.spec.mjs'],
    reading: ['req/alpha.md', 'docs/alpha.md'],
    prior_work: 'an earlier attempt left a half-written handler in src/alpha/index.mjs; keep what passes its tests.',
  });
  const root = makeRepo({
    'process/ledger/alpha.json': e,
    'req/alpha.md': '# alpha\n\n- [ ] R1 signs a member in.\n- [ ] R2 ends a session.\n',
    'docs/alpha.md': '# alpha\n\nNotes.\n',
    'test/alpha/a.test.mjs': "import test from 'node:test'; test('ok', () => {});\n",
  });
  git(['branch', 'tranche'], { cwd: root });
  const { start } = jobStart(root, 'alpha', { coordinator: ID, push: false, log: quiet });
  assert.ok(bytes(start) <= SCREEN, `START: ${bytes(start)} bytes, over ${SCREEN}`);
});

test('the review brief carries its parts: objective, reading set, boundaries, output with every gap in one pass', () => {
  const t = briefText({ pr: { number: 60, title: 'Prompt caps', base: { ref: 'tranche' }, head: { ref: 'build/prompt-caps', sha: 'f'.repeat(40) } }, files: ['tool/lib/roles.mjs'], job: null, owner: 'neobobkrause', approvalsFile: 'CLAUDE.md' });
  for (const part of ['# Review brief: pull request 60', 'Read your rulebook', 'Changed files (1):', '## You are read-only', '## Output', 'Every gap in one pass']) assert.ok(t.includes(part), part);
});

// Second review of PR 72: the escalation and the wake pushed a replacement session's START, the one
// the urgency work starts more often, over the screen. Restart with a provider notice, real ids.
test('a replacement or taken-in job START with two provider notices and the escalation to ROOT and the watcher is one screen at most', () => {
  const e = entry('alpha', { title: 'Member sign-in and session handling', paths: ['src/alpha/', 'src/shared/alpha-client.mjs', 'worker/alpha/'], tests: ['test/alpha/', 'test/e2e/alpha.spec.mjs'], reading: ['req/alpha.md', 'docs/alpha.md'], requirements: 'req/alpha.md' });
  const notices = [{ key: 'beta:41', provider: 'beta', ids: ['R2', 'R5'], pr: 41 }, { key: 'gamma:52', provider: 'gamma', ids: ['R1'], pr: 52 }];
  const base = { entry: e, slug: SLUG, branch: 'job/alpha', tranche: 'tranche', coordinator: ID, bob: true, attempt: 1, reading: { files: [{ file: 'req/alpha.md', bytes: 61 }, { file: 'docs/alpha.md', bytes: 16 }], bytes: 77 }, notices, rootId: ID, decisionMinutes: 30 };
  const cases = {
    restart: { restart: { why: 'its session was archived', pr: `https://github.com/${SLUG}/pull/123`, last: 'abc1234 work in progress', receipt: 'none posted (WORKING)' } },
    'take-in': { takeIn: { pr: 88, branch: 'feature/alpha', commits: ['a'.repeat(40), 'b'.repeat(40)] } },
  };
  for (const [name, c] of Object.entries(cases)) {
    const t = startText({ ...base, ...c });
    assert.ok(t.includes('then the watcher'));
    assert.ok(t.includes('`gamma:52`') && !t.includes('--test notice:'));
    assert.ok(bytes(t) <= SCREEN, `${name} START: ${bytes(t)} bytes, over ${SCREEN}`);
  }
});
