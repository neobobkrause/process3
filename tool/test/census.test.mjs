// The consistency census and the preflight (R15; Bob, 6 Nov, about 18:15Z: "It seems to me that we
// keep hitting items when checks are refusing modules with no ledger entry. Can we anticipate those
// conditions arising so that we can handle them either preemptively or more efficiently when
// they're identified?"). Each gap surfaces before the act that would refuse, naming what BOB writes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { commit, entry, makeRepo } from './helpers.mjs';
import { census, censusLines, changeGaps, openLayers, preflight, preflightLines } from '../lib/census.mjs';
import { validate } from '../lib/ledger.mjs';
import { configOf, git, loadConfig } from '../lib/util.mjs';
import { gapLines } from '../lib/status.mjs';
import { writeState } from '../lib/state.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const NOW = '2026-11-06T18:30:00Z';
const req = (id, unmet = true) => `# ${id}\n\n**R1** a requirement${unmet ? ' *(not yet met: T1)*' : ''}\n`;
const row = (id, layer, o = {}) => ({ id, layer, paths: [`bio-plane/src/${id}/`], tests: [`bio-plane/test/m/${id}/`], uses: [], ...o });
const SUITE = { cwd: 'bio-plane', command: ['node', '--test'] };
const ent = (id, layer, o = {}) => entry(id, { layer, paths: [`bio-plane/src/${id}/`, `build/requirements/${id}.md`], tests: [`bio-plane/test/m/${id}/`], requirements: `build/requirements/${id}.md`, suite: SUITE, reading: [`build/requirements/${id}.md`], ...o });

// A product shaped like the copy on 6 Nov: layers 1 to 4, layer 2 open.
//   done1       layer 1, entry, met: fine
//   old1        layer 1, no entry, all met: needs no job, no gap
//   owed1       layer 1, no entry, an unmet mark: no-entry, ready
//   a2, b2      layer 2 (open), entries
//   c3          layer 3, no entry, all met: no-entry, ready (lookahead: its layer is still to come)
//   d3          layer 3, no entry, a row with no paths: no-entry, not ready
//   e4          layer 4, a row and an entry naming a requirements file not there: entry-requirements
//   lost        a requirements file, no row: no-modules-row
//   loose       a row in no layer-map line: not-in-layer-map
//   skew        the row says layer 3, the map says 4: layer-mismatch
//   ux-design   the lane's module, a row, no entry: no-entry
//   bad         its entry names a requirements file that is not there: entry-requirements
function product() {
  const rows = [row('done1', 1), row('old1', 1), row('owed1', 1), row('a2', 2), row('b2', 2), row('c3', 3), row('d3', 3, { paths: [] }), row('e4', 4), row('loose', 2), row('skew', 3), row('ux-design', 4), row('bad', 4)];
  const files = {
    'process/config.json': { merge_strategy: 'layer', modules_file: 'build/modules.json', lanes: [{ name: 'ux', dir: 'docs/ux/', module: 'ux-design' }] },
    'build/modules.json': { modules: rows },
    'build/layers.md': '| layer | name | modules |\n| --- | --- | --- |\n| 1 | One | done1, old1, owed1 |\n| 2 | Two | a2, b2 |\n| 3 | Three | c3, d3 |\n| 4 | Four | e4, skew, ux-design, bad |\n',
    'build/requirements/README.md': '# requirements\n',
    'build/situations/job.md': '# a job\n',
    'docs/ux/README.md': 'ux\n',
  };
  for (const id of ['done1', 'old1', 'owed1', 'a2', 'b2', 'c3', 'd3', 'lost', 'loose', 'skew', 'ux-design', 'bad']) files[`build/requirements/${id}.md`] = req(id, !['done1', 'old1', 'c3'].includes(id));
  for (const [id, n] of [['done1', 1], ['a2', 2], ['b2', 2], ['e4', 4], ['loose', 2], ['skew', 4]]) files[`process/ledger/${id}.json`] = ent(id, n);
  files['process/ledger/bad.json'] = ent('bad', 4, { requirements: 'build/requirements/missing.md' });
  const root = makeRepo(files);
  git(['branch', 'tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  const bare = join(mkdtempSync(join(tmpdir(), 'p3-census-')), 'o.git');
  git(['init', '-q', '--bare', bare], { cwd: root });
  git(['remote', 'add', 'origin', bare], { cwd: root });
  git(['push', '-q', 'origin', 'main', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  return root;
}
const kinds = (c) => c.gaps.map((g) => `${g.id}:${g.kind}`).sort();

test('census: every gap kind, named with what BOB writes; a module that needs no job is no gap', () => {
  const root = product();
  const cfg = loadConfig(root);
  const c = census(root, cfg, { ref: 'origin/tranche', open: [2], now: NOW });
  assert.deepEqual(kinds(c), [
    'bad:entry-requirements', 'c3:no-entry', 'd3:no-entry', 'e4:entry-requirements', 'loose:not-in-layer-map', 'lost:no-modules-row',
    'owed1:no-entry', 'skew:layer-mismatch', 'ux-design:no-entry',
  ].sort());
  const g = (id, k) => c.gaps.find((x) => x.id === id && x.kind === k);
  assert.match(g('lost', 'no-modules-row').fix, /add lost's row to build\/modules\.json .*build\/requirements\/lost\.md/);
  assert.match(g('loose', 'not-in-layer-map').fix, /name loose on its layer's line in build\/layers\.md \(its modules row says layer 2\)/);
  assert.match(g('skew', 'layer-mismatch').fix, /build\/modules\.json says layer 3, build\/layers\.md says 4/);
  assert.match(g('bad', 'entry-requirements').fix, /names build\/requirements\/missing\.md/);
  assert.match(g('e4', 'entry-requirements').fix, /names build\/requirements\/e4\.md, which origin\/tranche does not hold: write it/);
  assert.match(g('owed1', 'no-entry').fix, /ready below.*1 unmet mark\(s\) in build\/requirements\/owed1\.md/);
  assert.match(g('c3', 'no-entry').fix, /ready below.*layer 3 is open or still to come/);
  assert.match(g('d3', 'no-entry').fix, /not ready: its modules row has no paths/);
  assert.match(g('ux-design', 'no-entry').fix, /a lane's module/);
  // The ready entry: valid, its suite its neighbours', OPEN, its reading the requirements, README and the job situation.
  const e = g('c3', 'no-entry').content;
  assert.deepEqual(validate(e), []);
  assert.deepEqual(e, {
    id: 'c3', title: 'c3: confirm its requirements on layer 3', layer: 3, paths: ['bio-plane/src/c3/', 'build/requirements/c3.md'], tests: ['bio-plane/test/m/c3/'],
    requirements: 'build/requirements/c3.md', uses: [], suite: SUITE, reading: ['build/requirements/c3.md', 'build/requirements/README.md', 'build/situations/job.md'], status: { state: 'OPEN', at: NOW },
  });
  assert.equal(g('d3', 'no-entry').content, undefined);
  // With no open layer, only marks and lanes ask for an entry.
  assert.deepEqual(census(root, cfg, { ref: 'origin/tranche' }).gaps.filter((x) => x.kind === 'no-entry').map((x) => x.id).sort(), ['d3', 'owed1', 'ux-design']);
  // No modules file: no census.
  assert.match(census(root, configOf({ modules_file: 'nope.json' }), { ref: 'origin/tranche' }).skipped, /no nope\.json/);
});

test('census (cold review): a lane\'s module and a COMPLETE module with no work are never refused for the layer map; an odd row is not ready, never a throw', () => {
  const root = product();
  const cfg = loadConfig(root);
  const rows = JSON.parse(git(['show', 'HEAD:build/modules.json'], { cwd: root })).modules;
  commit(root, {
    'build/layers.md': '| layer | name | modules |\n| --- | --- | --- |\n| 1 | One | done1, old1, owed1 |\n| 2 | Two | a2, b2 |\n| 3 | Three | c3, d3 |\n| 4 | Four | e4, skew, bad |\n',
    'build/modules.json': { modules: [...rows, row('finished', 2), row('odd', 3, { uses: 'not-a-list' })] },
    'process/ledger/ux-design.json': ent('ux-design', 4, { status: { state: 'COMPLETE' } }),
    'process/ledger/finished.json': ent('finished', 2, { status: { state: 'COMPLETE' } }),
    'build/requirements/finished.md': req('finished', false),
    'build/requirements/odd.md': req('odd'),
  });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const c = census(root, cfg, { ref: 'origin/tranche', open: [2] });
  assert.deepEqual(c.gaps.filter((g) => ['ux-design', 'finished'].includes(g.id)), [], 'the lane\'s module (off the map) and a COMPLETE module with no unmet mark (off the map) are no gap');
  assert.deepEqual(c.gaps.filter((g) => g.id === 'odd').map((g) => [g.kind, !!g.content]), [['not-in-layer-map', false], ['no-entry', false]]);
  assert.match(c.gaps.find((g) => g.id === 'odd' && g.kind === 'no-entry').fix, /not ready: its modules row gives an entry the schema refuses/);
});

test('census lines: the open layer and lookahead first, the rest counted, the ready entries as one batch', () => {
  const root = product();
  const c = census(root, loadConfig(root), { ref: 'origin/tranche', open: [2], now: NOW });
  const ls = censusLines(c, { layers: [2, 3, 4], tranche: 'tranche', label: 'gaps (layer 2 open; lookahead 3 and 4)' });
  assert.equal(ls[0], 'gaps (layer 2 open; lookahead 3 and 4): 7 in layers 2, 3, 4 (2 elsewhere)');
  assert.ok(ls.includes('ready entries (2), one plain pull request into tranche, no judgment in them:'));
  assert.ok(ls.some((l) => /^--- process\/ledger\/c3\.json\n\{\n  "id": "c3"/.test(l)));
  assert.deepEqual(censusLines({ gaps: [] }, { layers: [9] }), ['gaps: none in layer 9']);
});

test('census: an open layer\'s branch lacking an entry the tranche holds is named', () => {
  const root = product();
  git(['push', '-q', 'origin', 'tranche:refs/heads/layer/2'], { cwd: root });
  commit(root, { 'process/ledger/c3.json': ent('c3', 3), 'process/ledger/b2.json': ent('b2', 2, { title: 'b2, again' }) });
  git(['checkout', '-q', '-b', 'side', 'origin/tranche'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  // layer/2 cut before a2's entry: rebuild it without a2's.
  git(['checkout', '-q', '-b', 'l2', 'origin/layer/2'], { cwd: root });
  git(['rm', '-q', 'process/ledger/a2.json'], { cwd: root });
  git(['commit', '-q', '-m', 'cut early'], { cwd: root });
  git(['push', '-q', 'origin', 'l2:refs/heads/layer/2', '--force'], { cwd: root });
  git(['checkout', '-q', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const c = census(root, loadConfig(root), { ref: 'origin/tranche', open: [2] });
  assert.deepEqual(c.gaps.filter((g) => g.kind === 'not-on-layer').map((g) => g.id), ['a2']);
  assert.match(c.gaps.find((g) => g.kind === 'not-on-layer').fix, /layer\/2 lacks process\/ledger\/a2\.json.*job start a2 carries it/);
});

test('open layers: an open row with no merged row', () => {
  const root = product();
  const state = { 'layerflow/1/open.json': '{}', 'layerflow/1/merged.json': '{}', 'layerflow/2/open.json': '{}' };
  assert.deepEqual(openLayers(root, loadConfig(root), (p) => state[p] ?? null), [2]);
});

test('preflight: what job start would refuse for the next layer, each with its fix', () => {
  const root = product();
  const cfg = loadConfig(root);
  commit(root, { 'process/ledger/c3.json': ent('c3', 3, { status: { state: 'WORKING' } }), 'process/ledger/d3.json': { id: 'd3' }, 'process/ledger/e4.json': ent('e4', 4, { status: { state: 'COMPLETE' }, requirements: 'build/requirements/owed1.md' }) });
  git(['push', '-q', 'origin', 'tranche'], { cwd: root });
  git(['fetch', '-q', 'origin'], { cwd: root });
  const c = census(root, cfg, { ref: 'origin/tranche', open: [2] });
  const holds = [{ id: 'hold-9', live: true, kind: 'module', value: 'c3', scope: 'module:c3', when: [{ layer_closed: 2 }] }];
  const heldBy = (hs, id) => hs.find((h) => h.value === id) || null;
  const seat = (id) => (id === 'c3' ? { lane: { name: 'ux' }, why: 'job c3 is lane ux\'s module, and its session is live' } : null);
  const xs = preflight(root, cfg, 3, { ref: 'origin/tranche', census: c, holds, heldBy, seat });
  assert.deepEqual(xs.map((x) => `${x.id}: ${x.why.split(':')[0]}`), ['c3: its entry is WORKING on origin/tranche', 'c3: held by hold-9 (module', "c3: job c3 is lane ux's module, and its session is live", 'd3: its entry is invalid']);
  assert.match(xs[1].fix, /the hold ends by its own condition \(layer_closed:2\)/);
  assert.match(preflightLines(3, xs)[0], /^preflight, layer 3: 4 start\(s\) would be refused$/);
  assert.deepEqual(preflightLines(5, []), ['preflight, layer 5: no start would be refused']);
  // A paused plan refuses every start.
  assert.equal(preflight(root, { ...cfg, plan: 'pause' }, 2, { ref: 'origin/tranche', census: c })[0].id, '*');
  // A module of the layer with no entry is named with the census's fix.
  const gone = preflight(root, cfg, 4, { ref: 'origin/tranche', census: c });
  // A COMPLETE module with an unmet mark: a plain start refuses it; the fix is --reopen.
  assert.ok(gone.some((x) => x.id === 'e4' && /COMPLETE with 1 unmet mark\(s\): a plain job start refuses it/.test(x.why) && /--reopen/.test(x.fix)), JSON.stringify(gone));
  assert.ok(gone.some((x) => x.id === 'ux-design' && /no-entry/.test(x.why) && /write process\/ledger\/ux-design\.json/.test(x.fix)));
});

test('the gate: a requirements file or modules row added with no entry, or an entry with no row or requirements, is a finding', () => {
  const root = product();
  const cfg = loadConfig(root);
  const base = git(['rev-parse', 'HEAD'], { cwd: root });
  const rows = (extra) => ({ modules: [...JSON.parse(git(['show', `${base}:build/modules.json`], { cwd: root })).modules, ...extra] });
  const head = commit(root, { 'build/requirements/new1.md': req('new1'), 'build/modules.json': rows([row('new2', 4)]), 'process/ledger/new3.json': ent('new3', 4) });
  const changed = git(['diff', '--name-only', base, head], { cwd: root }).split('\n').filter(Boolean);
  const got = changeGaps(root, cfg, { base, head, changed });
  assert.deepEqual(got.map((x) => x.file).sort(), ['build/modules.json', 'build/requirements/new1.md', 'process/ledger/new3.json', 'process/ledger/new3.json'].sort());
  assert.ok(got.some((x) => /new1 gains a requirements file with no ledger entry process\/ledger\/new1\.json/.test(x.message)));
  assert.ok(got.some((x) => /new2 gains a modules row with no ledger entry/.test(x.message)));
  assert.ok(got.some((x) => /new3's new ledger entry has no row in build\/modules\.json/.test(x.message)));
  assert.ok(got.some((x) => /new3's new ledger entry has no requirements file build\/requirements\/new3\.md/.test(x.message)));
  // An entry whose requirements live where its requirements field says: no finding for them.
  const elsewhere = commit(root, { 'build/modules.json': rows([row('new2', 4), row('new5', 4)]), 'process/ledger/new5.json': ent('new5', 4, { requirements: 'docs/req/new5.md' }), 'docs/req/new5.md': req('new5') });
  assert.deepEqual(changeGaps(root, cfg, { base: head, head: elsewhere, changed: git(['diff', '--name-only', head, elsewhere], { cwd: root }).split('\n').filter(Boolean) }).filter((x) => /new5/.test(x.message)), []);
  // All three pieces together: nothing.
  const whole = commit(root, { 'build/requirements/new4.md': req('new4'), 'build/modules.json': rows([row('new2', 4), row('new5', 4), row('new4', 4)]), 'process/ledger/new4.json': ent('new4', 4) });
  const ch2 = git(['diff', '--name-only', elsewhere, whole], { cwd: root }).split('\n').filter(Boolean);
  assert.deepEqual(changeGaps(root, cfg, { base: elsewhere, head: whole, changed: ch2 }).filter((x) => /new4/.test(x.message)), []);
});

test('status --role bob: the gaps block for the open layer and its lookahead, then the next layer\'s preflight', () => {
  const root = product();
  const cfg = loadConfig(root);
  writeState(root, cfg.state_branch, 'seed', (dir) => { for (const p of ['layerflow/1/open.json', 'layerflow/1/merged.json', 'layerflow/2/open.json']) { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), '{}\n'); } return {}; });
  const ls = gapLines(root, cfg, { tranche: 'origin/tranche' });
  assert.equal(ls[0], 'gaps (layer 2 open; lookahead 3 and 4): 7 in layers 2, 3, 4 (2 elsewhere)');
  assert.ok(ls.some((l) => /^preflight, layer 3: 2 start\(s\) would be refused$/.test(l)), ls.join('\n'));
  assert.ok(ls.some((l) => /^- c3: no-entry: .*; fix: write process\/ledger\/c3\.json/.test(l)));
});
