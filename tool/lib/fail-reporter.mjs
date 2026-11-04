// A node test runner reporter (base-red, basered.mjs): one JSON line per test that ends, failing
// or passing ("ok": true), from the runner's own structured events, written to a destination of
// its own, so nothing the tests print can pose as a failure or hide one. A test's file is where
// its test() was called, so a test a sibling module declares carries the sibling's path (copy PR
// 290: r9-seam-limits.mjs, imported by t51-round9-seam.test.mjs). test:start, test:pass and
// test:fail come in definition order, the files in the order run (node's guarantee), so the
// enclosing names are those last started at each lower nesting, whichever file declared them: a
// stack per file lost a describe of the test file around a sibling's tests. A result named for the
// file itself ("whole") is the runner's for a file that failed to load or exited early.
import { resolve } from 'node:path';

export default async function* failReporter(source) {
  const s = [];
  for await (const e of source) {
    if (e.type !== 'test:start' && e.type !== 'test:fail' && e.type !== 'test:pass') continue;
    const d = e.data || {};
    if (e.type === 'test:start') { s.length = d.nesting; s[d.nesting] = d.name; continue; }
    if (d.todo || d.skip) continue;
    yield `${JSON.stringify({ file: d.file ?? null, path: [...s.slice(0, d.nesting), d.name], type: d.details?.type ?? null, ...(e.type === 'test:pass' ? { ok: true } : {}), ...(!d.nesting && typeof d.file === 'string' && resolve(d.name) === d.file ? { whole: true } : {}) })}\n`;
  }
}
