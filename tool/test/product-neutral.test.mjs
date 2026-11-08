// BD-R2 (Bob, 8 Nov): "Process3 is a develop process that is designed for use to develop any
// product, not just [the first product]." No product's name appears in the process's tool,
// rulebooks, governing documents, shims, setup or README. The names are a configurable deny list,
// held only as sha256 hashes of the lower-cased terms (product-deny-list.json at process3's root;
// add one with node tool/deny-add.mjs <term>): every word and hyphen-joined phrase of the scanned
// files is hashed and matched. notes/ and DECISIONS.md are history and are not scanned.
import './helpers.mjs'; // no machine git config (C2); removes its temporary directories
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addTerm, hashTerm, phrases, readDeny } from '../lib/denylist.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SCANNED = ['tool', 'rulebooks', 'governing', 'shims', 'setup', 'README.md'];

function* files(root, rel) {
  let ents;
  try { ents = readdirSync(join(root, rel), { withFileTypes: true }); } catch (e) { if (e.code === 'ENOTDIR') { yield rel; return; } if (e.code === 'ENOENT') return; throw e; }
  for (const e of ents) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const r = join(rel, e.name);
    if (e.isDirectory()) yield* files(root, r);
    else if (e.isFile()) yield r;
  }
}

// Every hit: { file, line, hash } (the hash only: the term is never printed either).
export function productNames(root = ROOT, hashes = readDeny(join(root, 'product-deny-list.json')).sha256) {
  const deny = new Set(hashes);
  const hits = [];
  for (const top of SCANNED) {
    for (const f of files(root, top)) {
      const buf = readFileSync(join(root, f));
      if (buf.includes(0)) continue; // binary
      buf.toString('utf8').split('\n').forEach((line, i) => {
        const seen = new Set();
        for (const p of phrases(line)) { const h = hashTerm(p); if (deny.has(h) && !seen.has(h)) { seen.add(h); hits.push({ file: f, line: i + 1, hash: h }); } }
      });
    }
  }
  return hits;
}

test('no product term from product-deny-list.json appears in tool/, rulebooks/, governing/, shims/, setup/ or README.md (BD-R2)', () => {
  const { sha256 } = readDeny(join(ROOT, 'product-deny-list.json'));
  assert.ok(sha256.length > 0, 'the deny list names at least one product');
  assert.equal(new Set(sha256).size, sha256.length, 'no hash listed twice');
  const hits = productNames();
  assert.deepEqual(hits.map((h) => `${h.file}:${h.line}: deny-listed term ${h.hash.slice(0, 12)}`), [], 'reword as "the first product" or "a product", read it from process/config.json, or use a neutral invented name in a fixture');
});

test('the list holds no term in plain text, only sha256 hashes', () => {
  const j = JSON.parse(readFileSync(join(ROOT, 'product-deny-list.json'), 'utf8'));
  assert.deepEqual(Object.keys(j).sort(), ['sha256', 'why']);
  assert.ok(j.sha256.every((h) => /^[0-9a-f]{64}$/.test(h)));
});

test('the scan finds a listed word or hyphen-joined phrase in each scanned place, in any case, and nothing outside them', () => {
  const root = mkdtempSync(join(tmpdir(), 'p3-neutral-'));
  writeFileSync(join(root, 'product-deny-list.json'), JSON.stringify({ why: 'x', sha256: [] }));
  const list = join(root, 'product-deny-list.json');
  assert.deepEqual(addTerm('Zorbex', list).added, true);
  assert.deepEqual(addTerm('zorbex', list).added, false, 'case-insensitive: one hash');
  addTerm('zorb-s1', list);
  assert.ok(!readFileSync(list, 'utf8').toLowerCase().includes('zorb'), 'no term is written');
  for (const d of ['tool/lib', 'tool/test/fixtures', 'rulebooks', 'governing', 'shims', 'setup', 'notes']) mkdirSync(join(root, d), { recursive: true });
  writeFileSync(join(root, 'README.md'), 'a\nfor ZORBEX\n');
  writeFileSync(join(root, 'tool/lib/x.mjs'), '// zorbex-copy and zorbex.dev\n');
  writeFileSync(join(root, 'tool/test/fixtures/w.yml'), 'image: docker.io/zorbex/a\nenv: ZORBEX_TEST_INSTANCE\n');
  writeFileSync(join(root, 'rulebooks/r.md'), 'clean, zorbexy and zorb alone\n');
  writeFileSync(join(root, 'governing/g.md'), 'worker agent-runner-zorb-s1\n');
  writeFileSync(join(root, 'shims/s.yml'), 'x Zorbex\n');
  writeFileSync(join(root, 'setup/c.json'), '{"s1": "zorb s1"}\n');
  writeFileSync(join(root, 'notes/n.md'), 'zorbex is history\n');
  writeFileSync(join(root, 'DECISIONS.md'), 'zorbex\n');
  const hits = productNames(root).map((h) => `${h.file}:${h.line}`).sort();
  assert.deepEqual(hits, ['README.md:2', 'governing/g.md:1', 'shims/s.yml:1', 'tool/lib/x.mjs:1', 'tool/test/fixtures/w.yml:1', 'tool/test/fixtures/w.yml:2']);
  assert.deepEqual([...phrases('a-b-c')].sort(), ['a', 'a-b', 'a-b-c', 'b', 'b-c', 'c']);
  writeFileSync(list, JSON.stringify({ why: 'x', sha256: ['zorbex'] }));
  assert.throws(() => readDeny(list), /sha256 hex digests/);
});

test('tool/deny-add.mjs appends a term\'s hash, prints only the hash, and refuses what the scan cannot read as a term', () => {
  const list = join(mkdtempSync(join(tmpdir(), 'p3-deny-')), 'deny.json');
  writeFileSync(list, JSON.stringify({ why: 'x', sha256: [] }));
  const run = (...a) => spawnSync(process.execPath, [join(ROOT, 'tool/deny-add.mjs'), ...a, '--file', list], { encoding: 'utf8' });
  const r = run('Qux-Ware');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), `added ${hashTerm('qux-ware')}`);
  assert.deepEqual(JSON.parse(readFileSync(list, 'utf8')).sha256, [hashTerm('qux-ware')]);
  assert.match(run('qux-ware').stdout, /already listed/);
  const bad = run('qux ware');
  assert.equal(bad.status, 1);
  assert.ok(!/qux/.test(bad.stderr), 'a refused term is not echoed');
  assert.equal(spawnSync(process.execPath, [join(ROOT, 'tool/deny-add.mjs')], { encoding: 'utf8' }).status, 2);
});
