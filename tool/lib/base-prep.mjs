// The base-red tree prepared in a process of its own (basered.mjs startBase): node base-prep.mjs
// <args.json>. Writes prepareTree's verdict to args.out, through a rename so a reader never sees
// half of it; a throw is a verdict too ({ ok: false, why }), as baseRed refuses with it inline.
// Its priority is lowered first, so the head's install, build and suite, which run beside it,
// come first on the runner; its install and build inherit the priority.
import { readFileSync, renameSync, writeFileSync, writeSync } from 'node:fs';
import { setPriority } from 'node:os';
import { prepareTree, setWritable, treeDigest } from './basered.mjs';

const a = JSON.parse(readFileSync(process.argv[2], 'utf8'));
try { setPriority(10); } catch { /* the default priority, then */ }
let r;
try {
  r = prepareTree(a.root, a.base, a.wt, { lockfiles: a.lockfiles, rows: a.rows, timeout: a.timeout, log: (l) => console.log(l) });
} catch (e) {
  r = { ok: false, why: `the base's tree could not be prepared: ${String(e.message).slice(0, 300)}` };
}
// A tree ready to run is made read-only and its content hash sent on fd 3, the pipe the gate holds
// (startBase): the gate checks it again right before the base runs there.
if (r.ok) {
  try {
    const t0 = Date.now();
    setWritable(a.wt, false);
    const d = treeDigest(a.wt);
    console.log(`base-red: the base's tree made read-only and hashed, ${d.files} files, ${Math.round(d.bytes / 1048576)} MB, in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    writeSync(3, `${JSON.stringify(d)}\n`);
  } catch (e) { console.log(`base-red: the tree could not be hashed: ${String(e.message).slice(0, 200)}`); }
}
writeFileSync(`${a.out}.tmp`, JSON.stringify(r));
renameSync(`${a.out}.tmp`, a.out);
