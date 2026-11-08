// The product deny list (C40, BD-R2): process3 names no product, so the list holds only the
// sha256 of each lower-cased term, never the term (the coordinator, 8 Nov). A term is a word or a
// hyphen-joined phrase of words ([a-z0-9]+). The scan hashes every word and every hyphen-joined
// phrase of a file's text and matches the hashes, case-insensitively.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DENY_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'product-deny-list.json');
export const TERM = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_PARTS = 6;
export const hashTerm = (term) => createHash('sha256').update(String(term).toLowerCase()).digest('hex');

export function readDeny(file = DENY_FILE) {
  const j = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(j.sha256) || !j.sha256.every((h) => typeof h === 'string' && /^[0-9a-f]{64}$/.test(h))) throw new Error(`${file}: "sha256" must be a list of sha256 hex digests (add one with node tool/deny-add.mjs <term>)`);
  return j;
}

// Every word and hyphen-joined phrase (up to MAX_PARTS words) of a line, lower-cased.
export function* phrases(line) {
  for (const m of String(line).toLowerCase().matchAll(/[a-z0-9]+(?:-[a-z0-9]+)*/g)) {
    const parts = m[0].split('-');
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j <= Math.min(parts.length, i + MAX_PARTS); j++) yield parts.slice(i, j).join('-');
  }
}

// Adds a term's hash; returns { hash, added }. The term itself is never written.
export function addTerm(term, file = DENY_FILE) {
  const t = String(term || '').trim().toLowerCase();
  if (!TERM.test(t)) throw new Error(`deny-add: the term is one word or hyphen-joined words of letters and digits (as the scan reads them); got ${t ? 'something else' : 'nothing'}`);
  if (t.split('-').length > MAX_PARTS) throw new Error(`deny-add: at most ${MAX_PARTS} hyphen-joined words`);
  const j = readDeny(file);
  const hash = hashTerm(t);
  if (j.sha256.includes(hash)) return { hash, added: false };
  j.sha256.push(hash);
  writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  return { hash, added: true };
}
