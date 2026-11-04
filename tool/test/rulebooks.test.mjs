// Rulebooks (TXT-3, TXT-5, TXT-6): one per role, at most ten rules and about 4 KB, each rule and
// principle citing a Ledger line or Bob's word and naming what holds it or saying nudge; and each
// role's prompt names its own file, since a skill cannot be loaded by role without a hook (ENF-1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULEBOOKS, rulebook } from '../lib/job.mjs';
import { bobPrompt, rootPrompt, watcherPrompt } from '../lib/roles.mjs';
import { briefText } from '../lib/review.mjs';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (role) => readFileSync(join(repo, 'rulebooks', `${role}.md`), 'utf8');
const section = (t, name) => (t.split(`## ${name}`)[1] || '').split('\n## ')[0];
const items = (s) => s.split('\n').filter((l) => /^\d+\. /.test(l));
const CITE = /\((?:[A-Z]{2,3}-\d+|P\d+|Bob)[^)]*\)/;

test('each rulebook: ten rules at most, three principles at most, under 4 KB, every line cited and held or a nudge', () => {
  for (const role of RULEBOOKS) {
    const t = read(role);
    assert.ok(Buffer.byteLength(t) <= 4096, `${role}: ${Buffer.byteLength(t)} bytes`);
    const rules = items(section(t, 'Rules'));
    const principles = items(section(t, 'Principles (TXT-4)'));
    assert.ok(rules.length >= 1 && rules.length <= 10, `${role}: ${rules.length} rules`);
    assert.ok(principles.length >= 1 && principles.length <= 3, `${role}: ${principles.length} principles`);
    for (const l of [...rules, ...principles]) {
      assert.match(l, CITE, `${role}: no citation in "${l}"`);
      assert.match(l, /(Held by .+|Nudge)\.$/, `${role}: neither held nor a nudge in "${l}"`);
    }
    assert.doesNotMatch(t, /—/, `${role}: an em-dash`);
  }
});

test('each role prompt names its own rulebook, and only that one', () => {
  const a = 'a'.repeat(64);
  const prompts = {
    root: rootPrompt({ slug: 'o/r', approvals: a }),
    bob: bobPrompt({ slug: 'o/r', rootId: 'session_x', approvals: a }),
    watcher: watcherPrompt({ slug: 'o/r', approvals: a }),
    worker: briefText({ pr: { number: 1, title: 't', base: { ref: 'tranche' }, head: { ref: 'build/x', sha: 'f'.repeat(40) } }, files: [], job: null, owner: 'o', approvalsFile: 'CLAUDE.md' }),
  };
  for (const [role, p] of Object.entries(prompts)) {
    assert.ok(p.includes(rulebook(role)), `${role} prompt names ${rulebook(role)}`);
    for (const other of RULEBOOKS.filter((r) => r !== role)) assert.ok(!p.includes(rulebook(other)), `${role} prompt names ${other}'s rulebook`);
  }
});

// Measured 4 Nov 00:05: ROOT took a process3-fix-or-restart choice to Bob, saying it could not
// message the coordinator; its acts reached only BOB and Bob (P17).
test('ROOT and the watcher carry the act to the coordinator session, and their rulebooks the rule with rule 9\'s test once', () => {
  const a = 'a'.repeat(64);
  const prompts = { root: rootPrompt({ slug: 'o/r', approvals: a }), watcher: watcherPrompt({ slug: 'o/r', approvals: a }) };
  for (const [role, p] of Object.entries(prompts)) {
    const acts = section(p, 'Acts you may take');
    const act = acts.split('\n').find((l) => l.startsWith('- ') && l.includes('send_message') && l.includes('`coordinator` session'));
    assert.ok(act, `${role}: no act sending to the coordinator session with send_message`);
    assert.match(act, /technical question.*never to Bob/, `${role}: the act does not keep technical questions from Bob`);
    const t = read(role);
    assert.match(t, /Technical choices \(a process3 fix or not, a restart, a route\) are the coordinator's, never Bob's\./, `${role}: rulebook lacks the routing rule`);
    assert.equal(t.split("rule 9's test").length - 1, 1, `${role}: rule 9's test stated other than once`);
    assert.equal(t.split('his approvals or accounts, or an act only he can take').length - 1, 1, `${role}: the test's words other than once`);
  }
});

// The escalation chain (Bob, 4 Nov: urgency fully supported in the initial release): ROOT's and
// the watcher's half, in their prompts and rulebooks.
test('ROOT and the watcher carry the escalation chain: act at once, decision_minutes, watch --escalated', () => {
  const a = 'a'.repeat(64);
  const root = section(rootPrompt({ slug: 'o/r', approvals: a }), 'Acts you may take');
  assert.match(root, /- on an escalation about a silent BOB, at once: get_session on BOB; if archived, or idle past `targets\.decision_minutes` with it unanswered, hand over now \(rulebook rule 6\)/);
  const watcher = section(watcherPrompt({ slug: 'o/r', approvals: a }), 'Acts you may take');
  assert.match(watcher, /- on a message that ROOT left one unanswered past `targets\.decision_minutes`, at once, not at your daily wake: .*`--escalated <minutes unanswered>`/);
  assert.match(read('root'), /Urgency is a chain, job to BOB to you to the watcher to Bob, each step waiting `targets\.decision_minutes`.*never left for the sweep.*an irreversible one waits \(Bob, 4 Nov\)/);
  assert.match(read('watcher'), /Urgency is a chain, job to BOB to ROOT to you to Bob.*`watch --escalated <minutes>`.*Push to Bob only what passes rule 2's test, or that ROOT and BOB are both gone/);
});
