// BD-R2 (Bob, 8 Nov): "Process3 is a develop process that is designed for use to develop any
// product, not just [the first product]." No product's name appears in the process's tool, rulebooks,
// governing documents, shims, setup or README. The names are a configurable deny list (product-deny-list.json at
// process3's root); notes/ and DECISIONS.md are history and are not scanned.
import './helpers.mjs'; // no machine git config (C2); removes its temporary directories
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SCANNED = ['tool', 'rulebooks', 'governing', 'shims', 'setup', 'README.md'];

export function denyList(root = ROOT) {
  const j = JSON.parse(readFileSync(join(root, 'product-deny-list.json'), 'utf8'));
  if (!Array.isArray(j.names) || !j.names.every((n) => typeof n === 'string' && n.trim())) throw new Error('product-deny-list.json: "names" must be a list of non-empty strings');
  return j.names.map((n) => n.trim().toLowerCase());
}

function* files(root, rel) {
  const p = join(root, rel);
  let ents;
  try { ents = readdirSync(p, { withFileTypes: true }); } catch (e) { if (e.code === 'ENOTDIR') { yield rel; return; } if (e.code === 'ENOENT') return; throw e; }
  for (const e of ents) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const r = join(rel, e.name);
    if (e.isDirectory()) yield* files(root, r);
    else if (e.isFile()) yield r;
  }
}

// Every hit: { file, line, name }.
export function productNames(root = ROOT, names = denyList(root)) {
  const hits = [];
  for (const top of SCANNED) {
    for (const f of files(root, top)) {
      const buf = readFileSync(join(root, f));
      if (buf.includes(0)) continue; // binary
      buf.toString('utf8').split('\n').forEach((line, i) => {
        const l = line.toLowerCase();
        for (const n of names) if (l.includes(n)) hits.push({ file: relative(root, join(root, f)), line: i + 1, name: n });
      });
    }
  }
  return hits;
}

test('no product name from product-deny-list.json appears in tool/, rulebooks/, governing/, shims/, setup/ or README.md (BD-R2)', () => {
  const names = denyList();
  assert.ok(names.length > 0, 'the deny list names at least one product');
  const hits = productNames();
  assert.deepEqual(hits.map((h) => `${h.file}:${h.line}: ${h.name}`), [], 'reword as "the first product" or "a product", read it from process/config.json, or use a neutral invented name in a fixture');
});

test('the scan finds a deny-listed name in each scanned place, in any case, and nothing outside them', () => {
  const root = mkdtempSync(join(tmpdir(), 'p3-neutral-'));
  writeFileSync(join(root, 'product-deny-list.json'), JSON.stringify({ names: ['Zorbex'] }));
  for (const d of ['tool/lib', 'tool/test/fixtures', 'rulebooks', 'governing', 'notes']) mkdirSync(join(root, d), { recursive: true });
  writeFileSync(join(root, 'README.md'), 'a\nfor ZORBEX\n');
  writeFileSync(join(root, 'tool/lib/x.mjs'), '// zorbex-copy\n');
  writeFileSync(join(root, 'tool/test/fixtures/w.yml'), 'image: docker.io/zorbex/a\n');
  writeFileSync(join(root, 'rulebooks/r.md'), 'clean\n');
  writeFileSync(join(root, 'governing/g.md'), 'x Zorbex\n');
  writeFileSync(join(root, 'notes/n.md'), 'zorbex is history\n');
  writeFileSync(join(root, 'DECISIONS.md'), 'zorbex\n');
  const hits = productNames(root).map((h) => `${h.file}:${h.line}`).sort();
  assert.deepEqual(hits, ['README.md:2', 'governing/g.md:1', 'tool/lib/x.mjs:1', 'tool/test/fixtures/w.yml:1']);
  writeFileSync(join(root, 'product-deny-list.json'), JSON.stringify({ names: ['ok', ''] }));
  assert.throws(() => denyList(root), /non-empty strings/);
});
