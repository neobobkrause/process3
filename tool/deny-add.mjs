#!/usr/bin/env node
// node tool/deny-add.mjs <term> [--file <deny list>]: appends the sha256 of the lower-cased term to
// product-deny-list.json (C40), so no product name is ever written into process3. Prints the hash only.
import { addTerm, DENY_FILE } from './lib/denylist.mjs';

const args = process.argv.slice(2);
const at = args.indexOf('--file');
const file = at >= 0 ? args.splice(at, 2)[1] : DENY_FILE;
if (args.length !== 1 || !file) { console.error('usage: node tool/deny-add.mjs <term> [--file <deny list>]'); process.exit(2); }
try {
  const { hash, added } = addTerm(args[0], file);
  console.log(added ? `added ${hash}` : `already listed: ${hash}`);
} catch (e) { console.error(e.message); process.exit(1); }
