// A node test runner reporter (base-red, basered.mjs): one JSON line per test that ends, failing
// or passing ("ok": true), from the runner's own structured events, written to a destination of
// its own, so nothing the tests print can pose as a failure or hide one. A test's file is where
// its test() was called, so a test a sibling module declares carries the sibling's path (copy PR
// 290: r9-seam-limits.mjs, imported by t51-round9-seam.test.mjs). test:start, test:pass and
// test:fail come in definition order, the files in the order run (node's guarantee), so the
// enclosing names are those last started at each lower nesting, whichever file declared them: a
// stack per file lost a describe of the test file around a sibling's tests. A result named for the
// file itself ("whole") is the runner's for a file that failed to load or exited early.
// Per test file run (build gate-speed, the revert check's one concurrent run): the runner's own
// test:complete for each file it ran, the file's verdict as its exit code would be run alone,
// written as a "done" line ({ file, done: true, ok }); and a "load" line once for a file whose
// output or failures show a module that could not load (LOAD, as the revert check reads a file's
// output run alone). Neither is a test's result: readResults keeps them apart.
import { resolve } from 'node:path';

export const LOAD = /ERR_MODULE_NOT_FOUND|Cannot find module|does not provide an export named/;
const errText = (err) => { const out = []; for (let x = err, i = 0; x && i < 5; x = x.cause, i++) out.push(String(x.code ?? ''), String(x.message ?? ''), String(x.stack ?? '')); return out.join('\n'); };

export default async function* failReporter(source) {
  const s = [];
  const load = new Set();
  const loaded = function* (f) { const file = typeof f === 'string' ? resolve(f) : null; if (file && !load.has(file)) { load.add(file); yield `${JSON.stringify({ file, path: ['(load)'], load: true })}\n`; } };
  for await (const e of source) {
    const d = e.data || {};
    if (e.type === 'test:stdout' || e.type === 'test:stderr') { if (LOAD.test(String(d.message ?? ''))) yield* loaded(d.file); continue; }
    if (e.type === 'test:complete') {
      if (!d.nesting && typeof d.file === 'string' && typeof d.name === 'string' && resolve(d.name) === d.file) yield `${JSON.stringify({ file: d.file, path: [d.name], done: true, ok: d.details?.passed === true })}\n`;
      continue;
    }
    if (e.type === 'test:fail' && LOAD.test(errText(d.details?.error))) yield* loaded(d.file);
    if (e.type !== 'test:start' && e.type !== 'test:fail' && e.type !== 'test:pass') continue;
    if (e.type === 'test:start') { s.length = d.nesting; s[d.nesting] = d.name; continue; }
    if (d.todo || d.skip) continue;
    yield `${JSON.stringify({ file: d.file ?? null, path: [...s.slice(0, d.nesting), d.name], type: d.details?.type ?? null, ...(e.type === 'test:pass' ? { ok: true } : {}), ...(!d.nesting && typeof d.file === 'string' && resolve(d.name) === d.file ? { whole: true } : {}) })}\n`;
  }
}
