// State-branch pushes retry with backoff on GitHub's transient refusals, and a write they give up on
// is kept with the command that replays it (coordinator, 6 Nov: copy PR 678's layer publish lost its
// starts owed to "remote: fatal error in commit_refs").
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { readState, stateIO, stateReplay, writeState } from '../lib/state.mjs';
import { git } from '../lib/util.mjs';
import { makeRepo } from './helpers.mjs';

const SB = 'process-state';
function withOrigin() {
  const root = makeRepo({ 'README.md': 'x\n' });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-origin-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main'], { cwd: root });
  return { root, bare };
}
const refused = { code: 1, stdout: '', stderr: 'remote: fatal error in commit_refs\nTo origin\n ! [remote rejected] HEAD -> process-state (failure)' };
const realPush = (wt, sb) => git(['push', '-q', 'origin', `HEAD:refs/heads/${sb}`], { cwd: wt, allowFail: true });

test('a state write refused by "fatal error in commit_refs" is retried and lands; given up, it is kept and replayed by the command it names', () => {
  const { root } = withOrigin();
  const logs = [];
  const orig = console.log;
  stateIO.wait = 1;
  try {
    // Two refusals, then the push goes through.
    let n = 0;
    stateIO.push = (wt, sb) => (++n <= 2 ? refused : realPush(wt, sb));
    console.log = (l) => logs.push(String(l));
    writeState(root, SB, 'starts owed: layer publish x', (wt) => { writeFileSync(join(wt, 'a.txt'), 'one\n'); return {}; });
    assert.equal(n, 3);
    assert.equal(readState(root, SB, 'a.txt'), 'one\n');
    assert.ok(logs.some((l) => /the push hit a server error; fetching and trying again \(2 of 5\)/.test(l)), logs.join('\n'));
    // Refused every time: kept, and the refusal names the replay.
    stateIO.push = () => refused;
    let msg = '';
    try { writeState(root, SB, 'starts owed: layer publish y', (wt) => { writeFileSync(join(wt, 'b.txt'), 'two\n'); return {}; }); } catch (e) { msg = e.message; }
    const ref = msg.match(/state replay (refs\/p3\/unpushed\/\S+)`/)?.[1];
    assert.ok(ref, msg);
    assert.match(msg, /the push of process-state was refused 5 times \(the server kept failing\)[\s\S]*The write is kept: replay it with `node \.process\/tool\/p3\.mjs state replay refs\/p3\/unpushed\//);
    assert.equal(readState(root, SB, 'b.txt'), null, 'not written');
    // The state branch moves meanwhile; the replay picks the kept write onto its fresh tip.
    stateIO.push = null;
    writeState(root, SB, 'another writer', (wt) => { writeFileSync(join(wt, 'c.txt'), 'three\n'); return {}; });
    assert.deepEqual(stateReplay(root, SB, [], { log: () => {} }), [ref]);
    assert.equal(readState(root, SB, 'b.txt'), 'two\n');
    assert.equal(readState(root, SB, 'c.txt'), 'three\n');
    assert.equal(git(['for-each-ref', 'refs/p3/unpushed/'], { cwd: root }), '', 'its ref dropped');
  } finally { console.log = orig; stateIO.push = null; stateIO.wait = null; }
});
