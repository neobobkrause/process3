// The base-red tree prepared in a process of its own (basered.mjs startBase): node base-prep.mjs
// <args.json>. Writes prepareTree's verdict to args.out, through a rename so a reader never sees
// half of it; a throw is a verdict too ({ ok: false, why }), as baseRed refuses with it inline.
// Its priority is lowered first, so the head's install, build and suite, which run beside it,
// come first on the runner; its install and build inherit the priority.
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { setPriority } from 'node:os';
import { prepareTree } from './basered.mjs';

const a = JSON.parse(readFileSync(process.argv[2], 'utf8'));
try { setPriority(10); } catch { /* the default priority, then */ }
let r;
try {
  r = prepareTree(a.root, a.base, a.wt, { lockfiles: a.lockfiles, rows: a.rows, timeout: a.timeout, log: (l) => console.log(l) });
} catch (e) {
  r = { ok: false, why: `the base's tree could not be prepared: ${String(e.message).slice(0, 300)}` };
}
writeFileSync(`${a.out}.tmp`, JSON.stringify(r));
renameSync(`${a.out}.tmp`, a.out);
