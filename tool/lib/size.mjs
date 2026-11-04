// p3 size (Foundations, Certification; Build Plan Phase 3: onboarding's size measurement against
// the certified ranges; MNT-10, SHM-3): the product as the process sees it, read from git at one
// commit, so it judges the same tree in a session, in setup check and in the release shim.
// ranges.json, at process3's root, holds the product sizes and platform rows each certified
// process3 release ran at; empty until the first certified release (Bob, 3 Nov: everything
// released so far is development only), so today every comparison reads "no certified range yet".
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { layerOf } from './metrics.mjs';
import { LEDGER_DIR } from './ledger.mjs';
import { git } from './util.mjs';

export const RANGES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'ranges.json');
export const NO_RANGE = 'no certified range yet';
// A gate row older than this does not give the suites' time.
export const GATE_ROW_DAYS = 14;
// The figures compared against a range, each a number (null when unmeasured).
export const FIGURES = ['modules', 'layers', 'requirement_files', 'requirement_median_bytes', 'requirement_largest_bytes', 'module_suites', 'suite_seconds', 'lock_files', 'generated_rows', 'tracked_files', 'tracked_bytes'];

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

// Every tracked file at ref with its size in bytes, from one ls-tree (submodules have none).
function tree(root, ref) {
  const r = git(['ls-tree', '-r', '-l', '-z', ref], { cwd: root, allowFail: true });
  if (r.code !== 0) return null;
  return r.stdout.split('\0').filter(Boolean).flatMap((l) => {
    const m = l.match(/^\d+ (\w+) [0-9a-f]+\s+(-|\d+)\t(.*)$/s);
    return m && m[1] === 'blob' ? [{ path: m[3], bytes: Number(m[2]) }] : [];
  });
}

// The measurement. cfg is the product's config (loadConfig); gateRow, optionally, the run row of
// a gate.json (gate --out), whose suite_seconds counts only when it is at most GATE_ROW_DAYS old.
export function measureSize(root, cfg, { ref = 'HEAD', gateRow = null, at = Date.now() } = {}) {
  const files = tree(root, ref);
  if (!files) throw new Error(`${ref} is not a commit here`);
  const bytes = new Map(files.map((f) => [f.path, f.bytes]));
  const show = (p) => (bytes.has(p) ? git(['show', `${ref}:${p}`], { cwd: root }) : null);
  const notes = [];

  let modules = null;
  if (!cfg.modules_file) notes.push('modules: no modules_file in process/config.json');
  else if (!bytes.has(cfg.modules_file)) notes.push(`modules: ${cfg.modules_file} is not at ${ref}`);
  else {
    try { const m = JSON.parse(show(cfg.modules_file)).modules; if (Array.isArray(m)) modules = m.length; } catch { /* below */ }
    if (modules === null) notes.push(`modules: ${cfg.modules_file} has no "modules" list`);
  }
  let layers = null;
  if (bytes.has(cfg.layers_file)) layers = new Set(layerOf(show(cfg.layers_file)).values()).size;
  else notes.push(`layers: ${cfg.layers_file} is not at ${ref}`);

  const dir = `${String(cfg.requirements_dir).replace(/\/$/, '')}/`;
  const req = files.filter((f) => f.path.startsWith(dir) && f.path.endsWith('.md')).map((f) => f.bytes);
  const cap = cfg.requirements_cap === null || cfg.requirements_cap === undefined ? null : Number(cfg.requirements_cap);
  const suites = files.filter((f) => f.path.startsWith(`${LEDGER_DIR}/`) && f.path.endsWith('.json')).length;

  let suiteSeconds = null;
  const row = gateRow?.run || gateRow;
  if (row && typeof row.suite_seconds === 'number') {
    const age = (at - Date.parse(row.at)) / 86400000;
    if (age >= 0 && age <= GATE_ROW_DAYS) suiteSeconds = row.suite_seconds;
    else notes.push(`suite_seconds: the gate row is ${!Number.isFinite(age) ? 'undated' : age < 0 ? 'dated in the future' : `${Math.round(age)} day(s) old, older than ${GATE_ROW_DAYS} days`}`);
  } else notes.push('suite_seconds: no recent gate row records it');

  const figures = {
    modules,
    layers,
    requirement_files: req.length,
    requirement_median_bytes: median(req),
    requirement_largest_bytes: req.length ? Math.max(...req) : null,
    module_suites: suites,
    suite_seconds: suiteSeconds,
    lock_files: (cfg.lockfiles || []).length,
    generated_rows: Array.isArray(cfg.generated) ? cfg.generated.length : 0,
    tracked_files: files.length,
    tracked_bytes: files.reduce((t, f) => t + f.bytes, 0),
  };
  const commit = git(['rev-parse', `${ref}^{commit}`], { cwd: root });
  return { commit, figures, requirements_cap: cap, over_cap: cap === null ? null : req.filter((b) => b > cap).length, notes };
}

export function sizeLines(s) {
  const f = s.figures;
  const v = (x) => (x === null ? 'unmeasured' : String(x));
  return [
    `size at ${s.commit.slice(0, 10)}:`,
    `- modules ${v(f.modules)}, layers ${v(f.layers)}`,
    `- requirement files ${f.requirement_files}${f.requirement_files ? `: median ${f.requirement_median_bytes} bytes, largest ${f.requirement_largest_bytes} bytes` : ''}${s.requirements_cap === null ? '' : `; ${s.over_cap} over requirements_cap ${s.requirements_cap}`}`,
    `- module suites ${f.module_suites}${f.suite_seconds === null ? '' : `, ${f.suite_seconds} s at the gate`}`,
    `- lock files ${f.lock_files}, generated rows ${f.generated_rows}`,
    `- repository: ${f.tracked_files} tracked files, ${f.tracked_bytes} bytes`,
    ...s.notes.map((n) => `- unmeasured: ${n}`),
  ];
}

// ranges.json: { "releases": [{ "release", "at", "product": {figure: n}, "platform_rows": [id] }] }.
// A missing or unreadable file reads as no release.
export function loadRanges(text = existsSync(RANGES) ? readFileSync(RANGES, 'utf8') : null) {
  try { const r = JSON.parse(text); return Array.isArray(r?.releases) ? r.releases.filter((x) => x && typeof x === 'object') : []; } catch { return []; }
}

// The size against the ranges: a figure is inside when it is at most the largest any certified
// release ran at (a smaller product than one certified needs nothing more), outside otherwise;
// a figure no release measured, or unmeasured here, is named as such. Informational only.
export function compareRanges(figures, releases) {
  if (!releases.length) return { state: NO_RANGE, outside: [], lines: [`certified range: ${NO_RANGE} (informational)`] };
  const outside = [];
  const unranged = [];
  for (const k of FIGURES) {
    const seen = releases.map((r) => r.product?.[k]).filter((x) => typeof x === 'number');
    if (figures[k] === null || figures[k] === undefined || !seen.length) { unranged.push(k); continue; }
    const max = Math.max(...seen);
    if (figures[k] > max) outside.push({ figure: k, value: figures[k], max });
  }
  const lines = [outside.length
    ? `certified range: outside on ${outside.map((o) => `${o.figure} ${o.value} > ${o.max}`).join(', ')} (informational)`
    : `certified range: inside, over ${releases.length} certified release(s) (informational)`];
  if (unranged.length) lines.push(`certified range: not compared: ${unranged.join(', ')}`);
  return { state: outside.length ? 'outside' : 'inside', outside, unranged, lines };
}

// The platform rows the pin names: those of its latest certified release; [] while none.
export const platformRows = (releases) => [...(releases.at(-1)?.platform_rows || [])];
