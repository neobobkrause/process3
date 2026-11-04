// A node test runner reporter (base-red, basered.mjs): one JSON line per failing test, from the
// runner's own structured events, written to a destination of its own, so nothing the tests print
// can pose as a failure or hide one. test:start and test:fail come in definition order, so the
// enclosing names are those last started at each lower nesting, per file.
export default async function* failReporter(source) {
  const stacks = new Map();
  for await (const e of source) {
    if (e.type !== 'test:start' && e.type !== 'test:fail') continue;
    const d = e.data || {};
    const s = stacks.get(d.file) || [];
    stacks.set(d.file, s);
    if (e.type === 'test:start') { s.length = d.nesting; s[d.nesting] = d.name; continue; }
    if (d.todo || d.skip) continue;
    yield `${JSON.stringify({ file: d.file ?? null, path: [...s.slice(0, d.nesting), d.name], type: d.details?.type ?? null })}\n`;
  }
}
