// One settings policy, judged by one rule set (C17, the coordinator, 7 Nov): Bob applied R17c's
// settings to the copy (deny raw git push and gh, allow the tool's push and Artifact, the pacing
// hooks), and setup check refused every job start: its deny-list condition still took a raw git push
// as the session's route, and its shim drift check knew only the SessionStart hook, while admit
// (C3, C15) already held the R17c lists. The settings Bob applies (notes/r17c-settings.md) are read
// here, once, by every rule that judges them: setup check's deny-list and shim-drift conditions and
// admit's told commands and tools.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import './helpers.mjs';
import { admitCheck, admitTools, toldCommands, toldTools } from '../lib/admit.mjs';
import { HOOKS_SHIM, readers } from '../lib/setup.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
// The settings files as the note gives them, per repository.
export function r17cFiles(root = ROOT) {
  const md = readFileSync(join(root, 'notes/r17c-settings.md'), 'utf8');
  return Object.fromEntries([...md.matchAll(/## (\S+)\n\n```json\n([\s\S]*?)```/g)].map((m) => [m[1], JSON.parse(m[2])]));
}
// The note's product repository: the one that is neither process3 nor its probes (named by the
// note, never here: process3 is product-neutral, BD-R2).
export const productOf = (files) => Object.keys(files).find((k) => !/\/process3(-probes)?$/.test(k));
const PRODUCT = productOf(r17cFiles());
const conds = JSON.parse(readFileSync(join(ROOT, 'setup/conditions.json'), 'utf8'));
const cond = (id) => (Array.isArray(conds) ? conds : conds.conditions || Object.values(conds)).find((c) => c.id === id);
const pin = { sha: 'p'.repeat(40), list: () => [], file: (f) => { try { return readFileSync(join(ROOT, f), 'utf8'); } catch { return null; } } };
const judge = (settings) => {
  const x = { where: 'origin/tranche', file: (f) => (f === '.claude/settings.json' ? JSON.stringify(settings) : null), pin: () => pin, cfg: { tranche: 'tranche' } };
  return Object.fromEntries(['deny-list', 'shim-drift'].map((id) => [id, readers[id](cond(id), x)]));
};

test('the R17c settings of each product (copy, probes) pass setup check\'s deny-list and shim-drift conditions and admit', () => {
  const files = r17cFiles();
  const told = toldCommands(ROOT);
  const tools = toldTools(ROOT);
  for (const repo of [PRODUCT, 'neobobkrause/process3-probes']) {
    const s = files[repo];
    assert.ok(s, `${repo} in the note`);
    const r = judge(s);
    assert.equal(r['deny-list'].state, 'set', `${repo}: ${r['deny-list'].detail}`);
    assert.equal(r['shim-drift'].state, 'set', `${repo}: ${r['shim-drift'].detail}`);
    assert.deepEqual(admitCheck(s, told), [], repo);
    assert.deepEqual(admitTools(s, tools), [], repo);
  }
  // process3 is no product (no .process pin, no setup check): its file is held to admit's told commands.
  assert.deepEqual(admitCheck(files['neobobkrause/process3'], told), []);
});

// PD-22: the pacing hooks are retired; a product carries its SessionStart hook at most.
test('the hooks a product may carry (the shim) are exactly the R17c files\' hooks: no PreToolUse', () => {
  const allowed = JSON.parse(readFileSync(join(ROOT, HOOKS_SHIM), 'utf8')).hooks;
  assert.equal(allowed.PreToolUse, undefined);
  for (const repo of [PRODUCT, 'neobobkrause/process3-probes']) {
    const h = r17cFiles()[repo].hooks || {};
    assert.equal(h.PreToolUse, undefined, `${repo}: PreToolUse`);
    if (h.SessionStart) assert.deepEqual(h.SessionStart, allowed.SessionStart, `${repo}: SessionStart`);
  }
});

test('setup check still refuses settings that block the tool\'s push, refuse a told command, or carry a hook the shim does not', () => {
  const s = structuredClone(r17cFiles()[PRODUCT]);
  s.permissions.deny.push('Bash(node *)');
  assert.match(judge(s)['deny-list'].detail, /holds Bash\(node \*\), which blocks a session's push of its own branch/);
  const t = structuredClone(r17cFiles()[PRODUCT]);
  t.hooks = { ...(t.hooks || {}), PreToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: 'echo hi' }] }] };
  assert.match(judge(t)['shim-drift'].detail, /carries a PreToolUse hook the pin does not allow \(echo hi\)/);
});

// One matcher (cold review of C17): setup's Bash rules are admit's.
test('setup check and admit match a Bash rule the same way', async () => {
  const { bashRuleMatches } = await import('../lib/setup.mjs');
  const { ruleMatches } = await import('../lib/admit.mjs');
  assert.equal(bashRuleMatches, ruleMatches);
  assert.equal(ruleMatches('Bash', 'git fetch origin x'), true, 'a bare Bash rule');
  assert.equal(ruleMatches('Bash(no:*)', 'node .process/tool/p3.mjs github push origin job/x'), false, ':* at a word');
});
