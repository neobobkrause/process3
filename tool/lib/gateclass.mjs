// The gate's class (C45b; Bob, 9 Nov, on the slow rounds: "Let's fix as many of them as we can").
// A plain pull request that only edits a requirements file's found mark ran its module's whole
// suite (plane: 33.9 min, copy PR 1084), and a pin move ran a full gate for a one-line gitlink
// change. Each plain pull request's gate run is one of three classes, recorded in its row as
// `class` and `class_why`:
// - record-only: the change, records aside, is only modules' requirements .md files, each one
//   module's own and read only by tests that name it. The run installs, builds and regenerates as
//   any does, reads the readers again once the build is done, and runs only those tests (the id
//   tests); no base-red tree. A reader the build reveals sends the run to full, with why.
// - pin-only: the change, records aside, is only the `.process` gitlink, workflow files named like
//   the head pin's shims, and the approvals file where only the pin's process lines changed, and no
//   product file, ledger suite or generated row names `.process` (in the merged tree and the head).
//   No install, build or suite: findings when the pin is not a released, forward move, or a shim is
//   not the pin's own byte for byte.
// - full: everything else (a job's, the tranche, a pass, a layer, a refresh, bootstrap), as before.
// Fail-closed: anything this cannot read or does not recognise is full. A ledger entry edit, the
// config, a requirements file inside another module's paths or tests, a file that is not one
// module's requirements file: full.
import { basename, dirname } from 'node:path';
import { blobAt } from './anchor.mjs';
import { CONFIG_FILE, LEDGER_DIR, git, isRecordPath, laneOfPath, underPath } from './util.mjs';
import { normPath } from './suite.mjs';
import { SCRIPT } from './basered.mjs';

export const CLASSES = ['record-only', 'pin-only', 'full'];
export const LIGHT = ['record-only', 'pin-only'];
export const PIN = '.process';
const WORKFLOWS = '.github/workflows/';
const PROCESS_LINES = 'shims/CLAUDE.process.md';
const inModule = (e, f) => [...(e.paths || []), ...(e.tests || [])].some((p) => underPath(f, normPath(p)));
const full = (why) => ({ class: 'full', why });
// The mode of a path at a commit ('100644', '160000', ...), or null when absent.
const modeAt = (root, rev, f) => git(['ls-tree', rev, '--', f], { cwd: root, allowFail: true }).stdout?.match(/^(\d{6}) /)?.[1] || null;
const pinOf = (root, rev) => git(['ls-tree', rev, '--', PIN], { cwd: root, allowFail: true }).stdout?.match(/^160000 commit ([0-9a-f]{40,64})\t/)?.[1] || null;
const textAt = (root, rev, f) => { const r = git(['show', `${rev}:${f}`], { cwd: root, allowFail: true }); return r.code === 0 ? r.stdout : null; };

// The class before anything runs. ctx: { job, branch, changed, entries, rows (generated rows),
// refresh (a plain refresh of generated files), pass, layer, bootstrap, readers(e, req, log) (the
// gate's requirementsOnly) }. Returns { class, why, reqs?: [{ module, file, readers }], lanes }.
// Pin-only here is a candidate only: pinOnly decides it, with the process clone.
export function gateClass(root, cfg, ctx) {
  const { job, branch, changed = [], entries = [], refresh, pass, layer, bootstrap, readers } = ctx;
  const lanes = changed.some((f) => laneOfPath(cfg, f, entries));
  const out = (r) => ({ ...r, lanes });
  if (job) return out(full("a job's pull request"));
  if (branch && branch === cfg.tranche) return out(full('the tranche'));
  if (pass) return out(full('a pass'));
  if (layer) return out(full("a layer branch's pull request"));
  if (bootstrap) return out(full('bootstrap: the base has no Process3'));
  if (refresh) return out(full('a refresh of generated files'));
  if (changed.includes(CONFIG_FILE)) return out(full(`it changes ${CONFIG_FILE}`));
  const ledger = changed.find((f) => underPath(f, LEDGER_DIR));
  if (ledger) return out(full(`it changes a ledger entry (${ledger})`));
  const product = changed.filter((f) => !isRecordPath(cfg, f));
  if (!product.length) return out(full('records only'));
  const approvals = normPath(cfg.approvals?.file || 'CLAUDE.md');
  if (product.every((f) => f === PIN || f === approvals || (f.startsWith(WORKFLOWS) && dirname(f) === WORKFLOWS.slice(0, -1)))) {
    return out({ class: 'pin-only', why: 'candidate', candidate: true });
  }
  const reqs = [];
  for (const f of product) {
    const owners = entries.filter((e) => typeof e.requirements === 'string' && normPath(e.requirements) === f);
    if (!f.endsWith('.md') || owners.length !== 1) return out(full(`${f} is not one module's requirements .md file`));
    const [e] = owners;
    if (modeAt(root, 'HEAD', f) !== '100644') return out(full(`${f} is not a regular file in the merged tree`));
    const other = entries.find((o) => o.id !== e.id && inModule(o, f));
    if (other) return out(full(`${f}, ${e.id}'s requirements file, is inside ${other.id}'s paths or tests`));
    const why = [];
    const files = readers(e, f, (l) => why.push(String(l)));
    if (files === null) return out(full(`${f}: ${why.pop() || 'its readers could not be told'}`));
    reqs.push({ module: e.id, file: f, readers: files });
  }
  return out({ class: 'record-only', why: `only ${reqs.map((r) => r.file).join(', ')} changed, read by ${reqs.reduce((n, r) => n + r.readers.length, 0)} test file(s)`, reqs });
}

// What names the pin, a token a product file or row could read it by. `.process` as a path
// segment (not an identifier's tail, as globalThis.process), and the submodule machinery.
export const NAMES_PIN = /(^|[^A-Za-z0-9_$])\.process([^A-Za-z0-9_$-]|$)|gitmodules|submodule/;
const GREP = ['-e', '(^|[^A-Za-z0-9_$])\\.process([^A-Za-z0-9_$-]|$)', '-e', 'gitmodules', '-e', 'submodule'];
// Never product code: the gate's own governing files, which run in sessions or on GitHub, not in the suite.
const GOVERNING = (cfg, f) => f === '.gitmodules' || f === normPath(cfg.approvals?.file || 'CLAUDE.md') || underPath(f, '.github') || underPath(f, '.claude') || underPath(f, PIN) || isRecordPath(cfg, f);
// The files at rev that name the pin, governing files aside; null when the search fails.
function namingPin(root, cfg, rev) {
  const r = git(['grep', '-I', '-l', '-z', '-E', ...GREP, rev, '--', '.'], { cwd: root, allowFail: true });
  if (r.code === 1 && !r.stdout) return [];
  if (r.code !== 0) return null;
  return r.stdout.split('\0').filter(Boolean).map((x) => x.slice(rev.length + 1)).filter((f) => !GOVERNING(cfg, f) && !f.split('/').includes('node_modules'));
}
// A .md file naming the pin counts only when a script names it (as a requirements file is read):
// prose about the pin is no reader of it.
function readMd(root, rev, md) {
  const name = basename(md);
  const r = git(['grep', '-I', '-l', '-z', '-F', '-e', name, rev, '--', '.'], { cwd: root, allowFail: true });
  if (r.code === 1 && !r.stdout) return null;
  if (r.code !== 0) return md;
  return r.stdout.split('\0').filter(Boolean).map((x) => x.slice(rev.length + 1)).find((f) => SCRIPT.test(f) && !f.split('/').includes('node_modules')) || null;
}

// A pin-only candidate judged: { class, why, findings }. ctx: { mb, head, entries (at the head),
// merged (entries at the merged tree), rows, repo: { released, descends, shim, text } }. Never
// reads the process clone unless the change is one (no fetch on other runs).
export function pinOnly(root, cfg, ctx) {
  const { mb, head, changed, entries = [], merged = [], rows = [], repo } = ctx;
  const findings = [];
  const F = (file, message) => findings.push({ check: 'pin', file, line: 1, message });
  const now = pinOf(root, head);
  const was = pinOf(root, mb);
  if (!now) return full('the head has no process pin');
  if (modeAt(root, 'HEAD', PIN) !== '160000') return full(`${PIN} is not a gitlink in the merged tree`);
  // Nothing the suite or a build reads names the pin: the merged tree and the head, ledger
  // suites and checks, generated rows, lock files and lanes.
  for (const rev of ['HEAD', head]) {
    const hits = namingPin(root, cfg, rev);
    if (hits === null) return full(`the search for what names ${PIN} failed at ${rev === 'HEAD' ? 'the merged tree' : rev.slice(0, 10)}`);
    for (const f of hits) {
      if (!f.endsWith('.md')) return full(`${f} names ${PIN} (${rev === 'HEAD' ? 'the merged tree' : 'the head'})`);
      const by = readMd(root, rev, f);
      if (by) return full(`${f} names ${PIN}, and ${by} names ${f}`);
    }
  }
  for (const e of [...entries, ...merged]) {
    if (NAMES_PIN.test(JSON.stringify([e?.suite ?? null, e?.checks ?? null]))) return full(`${e?.id}'s ledger suite or checks name ${PIN}`);
  }
  if (NAMES_PIN.test(JSON.stringify([rows, cfg.lockfiles ?? null, cfg.lanes ?? null]))) return full(`a generated row, lock file or lane in ${CONFIG_FILE} names ${PIN}`);
  const approvals = normPath(cfg.approvals?.file || 'CLAUDE.md');
  const product = changed.filter((f) => !isRecordPath(cfg, f));
  // The approvals file: the base's text with the old pin's process lines replaced by the new pin's, exactly.
  if (product.includes(approvals)) {
    if (modeAt(root, head, approvals) !== '100644') return full(`${approvals} is not a regular file at the head`);
    const lines = (pin) => { const t = pin ? repo.text(pin, PROCESS_LINES) : null; return t === null || t === undefined ? null : t.replaceAll('{tranche}', cfg.tranche).replace(/\n+$/, ''); };
    const before = textAt(root, mb, approvals);
    const after = textAt(root, head, approvals);
    const oldL = lines(was);
    const newL = lines(now);
    if (before === null || after === null || !oldL || !newL || oldL === newL) return full(`${approvals} changes, and not only by the pin's process lines`);
    const at = before.indexOf(oldL);
    if (at < 0 || before.slice(0, at) + newL + before.slice(at + oldL.length) !== after) return full(`${approvals} changes more than the pin's process lines`);
  }
  // Workflows: each named like a shim the head's pin ships, its bytes the pin's.
  for (const f of product.filter((x) => x.startsWith(WORKFLOWS))) {
    const name = basename(f);
    const shim = repo.shim(now, name);
    if (!shim && name !== 'process-gate.yml') return full(`${f} is not named like a shim of the pin ${now.slice(0, 10)}`);
    const blob = blobAt(root, head, f);
    if (!shim || !blob || blob !== shim || modeAt(root, head, f) !== '100644') F(f, `${f} is not the pin ${now.slice(0, 10)}'s own shim, byte for byte (copy .process/shims/${name})`);
  }
  if (now !== was) {
    if (!repo.released(now)) F(PIN, `the process pin ${now.slice(0, 10)} is not a commit on process3's tranche or main`);
    else if (was && !repo.descends(was, now)) F(PIN, `the process pin ${now.slice(0, 10)} does not descend from the base's pin ${was.slice(0, 10)}: no downgrade`);
  }
  return { class: 'pin-only', why: now !== was ? `the pin ${was ? was.slice(0, 10) : 'none'} to ${now.slice(0, 10)}${product.length > 1 ? `, with ${product.filter((f) => f !== PIN).join(', ')}` : ''}` : `only ${product.join(', ')}, as the pin ${now.slice(0, 10)} has them`, findings };
}

// Whether the run needs the product's browser: not for a pin-only run, nor a record-only one
// whose requirements no test reads, unless it touches a lane's folder (its checks may use it).
export const browserNeeded = (c) => !!c.lanes || !(c.class === 'pin-only' || (c.class === 'record-only' && (c.reqs || []).every((r) => !r.readers.length)));

// The process clone as the gate reads it (merge.mjs processRepo), with a file's text at a pin.
export function gateRepo(processRepo, dir) {
  const r = processRepo(dir);
  return { ...r, text: (pin, path) => textAt(dir, pin, path) };
}
