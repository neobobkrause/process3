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
// A pull request into a layer branch (C49; copy PR 1092, a 54-minute full gate on a sync that
// carried only the pin) is light only as that layer's sync (layerflow.mjs layerSync): its
// layer-sync/<n>-<hex> branch, its head a merge whose first parent is on the layer, and its diff
// against the layer only the `.process` gitlink, workflow files and the approvals file, the pin
// moved; then pinOnly judges it as it judges a tranche pin move. Every other pull request into a
// layer, a sync carrying anything else (records too), and one whose base is not known: full.
// Fail-closed: anything this cannot read or does not recognise is full. A ledger entry edit, the
// config, a requirements file inside another module's paths or tests, a file that is not one
// module's requirements file: full.
import { basename, dirname } from 'node:path';
import { blobAt } from './anchor.mjs';
import { layerOfBranch, syncOfBranch } from './layerbase.mjs';
import { CONFIG_FILE, LEDGER_DIR, git, isRecordPath, laneOfPath, underPath } from './util.mjs';
import { normPath } from './suite.mjs';

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

// The class before anything runs. ctx: { job, branch, into (the pull request's base branch), base,
// head, changed, entries, rows (generated rows), refresh (a plain refresh of generated files), pass,
// layer, bootstrap, readers(e, req, log) (the gate's requirementsOnly) }. Returns { class, why, reqs?: [{ module, file, readers }], lanes }.
// Pin-only here is a candidate only: pinOnly decides it, with the process clone.
export function gateClass(root, cfg, ctx) {
  const { job, branch, into, base, head, changed = [], entries = [], rows = [], refresh, pass, layer, bootstrap, readers } = ctx;
  const lanes = changed.some((f) => laneOfPath(cfg, f, entries));
  const out = (r) => ({ ...r, lanes });
  if (job) return out(full("a job's pull request"));
  if (branch && branch === cfg.tranche) return out(full('the tranche'));
  if (pass) return out(full('a pass'));
  if (layer) return out(full("a layer branch's pull request"));
  if (bootstrap) return out(full('bootstrap: the base has no Process3'));
  if (refresh) return out(full('a refresh of generated files'));
  // Light only where the base is known (fail-closed): a pull request into a layer is light only as its sync.
  if (typeof into !== 'string' || !into) return out(full("the pull request's base branch is not known"));
  if (changed.includes(CONFIG_FILE)) return out(full(`it changes ${CONFIG_FILE}`));
  const ledger = changed.find((f) => underPath(f, LEDGER_DIR));
  if (ledger) return out(full(`it changes a ledger entry (${ledger})`));
  const approvals = normPath(cfg.approvals?.file || 'CLAUDE.md');
  const pinFile = (f) => f === PIN || f === approvals || (f.startsWith(WORKFLOWS) && dirname(f) === WORKFLOWS.slice(0, -1));
  const into_ = layerOfBranch(into);
  if (into_ !== null) {
    const sync = syncLike(root, { n: into_, branch, base, head });
    if (sync) return out(full(sync));
    const other = changed.find((f) => !pinFile(f));
    if (other) return out(full(`layer sync ${into_} carries ${other}, not only the pin`));
    if (!changed.includes(PIN)) return out(full(`layer sync ${into_} does not move the pin`));
    return out({ class: 'pin-only', why: 'candidate', candidate: true, sync: into_ });
  }
  const product = changed.filter((f) => !isRecordPath(cfg, f));
  if (!product.length) return out(full('records only'));
  if (product.every(pinFile)) return out({ class: 'pin-only', why: 'candidate', candidate: true });
  const reqs = [];
  for (const f of product) {
    const owners = entries.filter((e) => typeof e.requirements === 'string' && normPath(e.requirements) === f);
    if (!f.endsWith('.md') || owners.length !== 1) return out(full(`${f} is not one module's requirements .md file`));
    const [e] = owners;
    if (modeAt(root, 'HEAD', f) !== '100644') return out(full(`${f} is not a regular file in the merged tree`));
    const other = entries.find((o) => o.id !== e.id && inModule(o, f));
    if (other) return out(full(`${f}, ${e.id}'s requirements file, is inside ${other.id}'s paths or tests`));
    // Read by another name, or by anything outside its own module's tests: a symlink to it or its
    // folder, any file (of any kind) naming it, or a file naming its folder as a path (cold review A3).
    const links = linksTo(root, 'HEAD', f);
    if (links === null) return out(full(`the symlinks of the merged tree could not be read`));
    if (links.length) return out(full(`${links[0]} is a symlink to ${f} or its folder`));
    const own = (g) => (e.tests || []).some((t) => underPath(g, normPath(t)));
    const reqFile = (g) => entries.some((x) => typeof x.requirements === 'string' && normPath(x.requirements) === g);
    const notMine = (g) => g !== f && !own(g) && !GOVERNING(cfg, g) && !reqFile(g);
    const byName = grep(root, 'HEAD', ['-F', '-e', basename(f)]);
    if (byName === null) return out(full(`the search for what reads ${f} failed`));
    const reader = byName.find(notMine);
    if (reader) return out(full(`${reader}, outside ${e.id}'s tests, names ${basename(f)}`));
    const dir = dirname(f);
    if (dir !== '.') {
      // The folder as a whole ('req', 'req/' + f, `req/${f}`), not a path to one file in it.
      const byDir = grep(root, 'HEAD', ['-E', '-e', `(^|['"\`/(\\s])${esc(dir)}/?(['"\`)\\s$]|$)`]);
      if (byDir === null) return out(full(`the search for what reads ${dir} failed`));
      const dr = byDir.find(notMine);
      if (dr) return out(full(`${dr}, outside ${e.id}'s tests, names the folder ${dir}`));
    }
    const why = [];
    const files = readers(e, f, (l) => why.push(String(l)));
    if (files === null) return out(full(`${f}: ${why.pop() || 'its readers could not be told'}`));
    reqs.push({ module: e.id, file: f, readers: files });
  }
  return out({ class: 'record-only', builds: rows.length > 0, why: `only ${reqs.map((r) => r.file).join(', ')} changed, read by ${reqs.reduce((n, r) => n + r.readers.length, 0)} test file(s)`, reqs });
}

// Why a pull request into layer/<n> is not that layer's sync, or null when it is one: its branch is
// layer-sync/<n>-<hex>, and its head is a merge (the tool's: layerflow.mjs syncMerge) whose first
// parent is on the base, so its diff against the layer is what the second parent brought.
function syncLike(root, { n, branch, base, head }) {
  const not = `a pull request into layer/${n} that is not its layer sync`;
  if (syncOfBranch(branch) !== n) return `${not} (from ${branch || 'no branch'})`;
  if (!head || !base) return `${not}: its head or base is not known`;
  const obj = git(['cat-file', '-p', head], { cwd: root, allowFail: true });
  if (obj.code !== 0) return `${not}: its head ${String(head).slice(0, 10)} could not be read`;
  const ps = obj.stdout.split('\n\n')[0].split('\n').filter((l) => l.startsWith('parent ')).map((l) => l.slice(7));
  if (ps.length !== 2) return `${not}: its head ${String(head).slice(0, 10)} is not a merge`;
  if (git(['merge-base', '--is-ancestor', ps[0], base], { cwd: root, allowFail: true }).code !== 0) return `${not}: its head's first parent ${ps[0].slice(0, 10)} is not on layer/${n}`;
  return null;
}

// The files at rev that match, every blob read as text (no file is exempt by .gitattributes or
// as binary: cold review A1); null when the search fails.
function grep(root, rev, args) {
  const r = git(['grep', '-a', '--no-textconv', '-l', '-z', ...args, rev, '--', '.'], { cwd: root, allowFail: true });
  if (r.code === 1 && !r.stdout) return [];
  if (r.code !== 0) return null;
  return r.stdout.split('\0').filter(Boolean).map((x) => x.slice(rev.length + 1)).filter((f) => !f.split('/').includes('node_modules'));
}
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// The tracked symlinks at rev whose target is under p (a requirements file read by another name: cold review A3).
function linksTo(root, rev, p) {
  const r = git(['ls-tree', '-r', '-z', rev], { cwd: root, allowFail: true });
  if (r.code !== 0) return null;
  const out = [];
  for (const l of r.stdout.split('\0').filter(Boolean)) {
    const m = l.match(/^120000 blob ([0-9a-f]+)\t(.*)$/);
    if (!m) continue;
    const to = normPath(`${dirname(m[2])}/${git(['cat-file', 'blob', m[1]], { cwd: root })}`);
    if (underPath(to, p) || underPath(p, to)) out.push(m[2]);
  }
  return out;
}

// What names the pin, a token a product file or row could read it by. `.process` as a path
// segment (not an identifier's tail, as globalThis.process), and the submodule machinery.
export const NAMES_PIN = /(^|[^A-Za-z0-9_$])\.process([^A-Za-z0-9_$-]|$)|gitmodules|submodule/;
const GREP = ['-e', '(^|[^A-Za-z0-9_$])\\.process([^A-Za-z0-9_$-]|$)', '-e', 'gitmodules', '-e', 'submodule'];
// Never product code: the gate's own governing files, which run in sessions or on GitHub, not in the suite.
const GOVERNING = (cfg, f) => f === '.gitmodules' || f === normPath(cfg.approvals?.file || 'CLAUDE.md') || underPath(f, '.github') || underPath(f, '.claude') || underPath(f, PIN) || isRecordPath(cfg, f);
// The files at rev that name the pin, governing files aside; null when the search fails.
function namingPin(root, cfg, rev, args = ['-E', ...GREP]) {
  const hits = grep(root, rev, args);
  return hits === null ? null : hits.filter((f) => !GOVERNING(cfg, f));
}
// A .md file naming the pin counts only when another file, governing files aside, names it (as a
// requirements file is read): prose about the pin is no reader of it. Any file, not only a script
// (cold review A5: a package.json script, a doctest runner's config).
function readMd(root, cfg, rev, md) {
  const hits = grep(root, rev, ['-F', '-e', basename(md)]);
  if (hits === null) return md;
  return hits.find((f) => f !== md && !GOVERNING(cfg, f)) || null;
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
      const by = readMd(root, cfg, rev, f);
      if (by) return full(`${f} names ${PIN}, and ${by} names ${f}`);
    }
    // The other files the change touches (the approvals file, the shims) are read by nothing that
    // runs: no file names them or their folder, and no module holds them (cold review A2).
    for (const f of changed.filter((x) => x !== PIN && !isRecordPath(cfg, x))) {
      const holder = entries.find((e) => inModule(e, f));
      if (holder) return full(`${f} is inside ${holder.id}'s paths or tests`);
      const tokens = [basename(f), ...(f.startsWith(WORKFLOWS) ? ['.github/workflows', '.github'] : [])];
      const named = namingPin(root, cfg, rev, ['-F', ...tokens.flatMap((t) => ['-e', t])]);
      if (named === null) return full(`the search for what reads ${f} failed`);
      for (const g of named) {
        if (!g.endsWith('.md')) return full(`${g} names ${f} or its folder`);
        const by = readMd(root, cfg, rev, g);
        if (by) return full(`${g} names ${f} or its folder, and ${by} names ${g}`);
      }
    }
  }
  for (const e of [...entries, ...merged]) {
    if (NAMES_PIN.test(JSON.stringify([e?.suite ?? null, e?.checks ?? null]))) return full(`${e?.id}'s ledger suite or checks name ${PIN}`);
  }
  if (NAMES_PIN.test(JSON.stringify([rows, cfg.lockfiles ?? null, cfg.lanes ?? null]))) return full(`a generated row, lock file or lane in ${CONFIG_FILE} names ${PIN}`);
  const approvals = normPath(cfg.approvals?.file || 'CLAUDE.md');
  const product = changed.filter((f) => !isRecordPath(cfg, f));
  // The pin itself first: an unreleased or backward pin is red here whatever else the change holds
  // (cold review B4), and nothing is read at it.
  const pinWhy = now !== was ? `the pin ${was ? was.slice(0, 10) : 'none'} to ${now.slice(0, 10)}${product.length > 1 ? `, with ${product.filter((f) => f !== PIN).join(', ')}` : ''}` : null;
  if (now !== was) {
    if (!repo.released(now)) F(PIN, `the process pin ${now.slice(0, 10)} is not a commit on process3's tranche or main`);
    else if (was && !repo.descends(was, now)) F(PIN, `the process pin ${now.slice(0, 10)} does not descend from the base's pin ${was.slice(0, 10)}: no downgrade`);
    if (findings.length) return { class: 'pin-only', why: pinWhy, findings };
  }
  // A shim-named workflow deleted is no pin move's: full (cold review B5).
  const gone = product.find((f) => f.startsWith(WORKFLOWS) && !blobAt(root, head, f));
  if (gone) return full(`it deletes ${gone}`);
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
  return { class: 'pin-only', why: pinWhy || `only ${product.join(', ')}, as the pin ${now.slice(0, 10)} has them`, findings };
}

// Whether the run needs the product's browser: not for a pin-only run, nor a record-only one
// whose requirements no test reads and that builds nothing (a generator may drive the browser:
// cold review A4), unless it touches a lane's folder (its checks may use it).
export const browserNeeded = (c) => !!c.lanes || !(c.class === 'pin-only' || (c.class === 'record-only' && !c.builds && (c.reqs || []).every((r) => !r.readers.length)));

// The process clone as the gate reads it (merge.mjs processRepo), with a file's text at a pin.
export function gateRepo(processRepo, dir) {
  const r = processRepo(dir);
  return { ...r, text: (pin, path) => textAt(dir, pin, path) };
}
