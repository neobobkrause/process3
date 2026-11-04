// The ledger (REC-9): process/ledger/<id>.json, one file per entry so each has one writer (REC-2).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fail, git } from './util.mjs';

export const LEDGER_DIR = 'process/ledger';
const SCHEMA = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'schema', 'ledger-entry.schema.json'), 'utf8'));

// A small validator for the subset of JSON Schema the ledger schema uses.
export function validate(value, schema = SCHEMA, path = '') {
  const errs = [];
  const at = path || '(entry)';
  if (schema.enum && !schema.enum.includes(value)) errs.push(`${at}: must be one of ${schema.enum.join(', ')}`);
  const t = schema.type;
  const typeOk = !t || (t === 'array' ? Array.isArray(value)
    : t === 'integer' ? Number.isInteger(value)
    : t === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
    : typeof value === t);
  if (!typeOk) return [...errs, `${at}: must be ${t}`];
  if (t === 'string') {
    if (schema.minLength && value.length < schema.minLength) errs.push(`${at}: must not be empty`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errs.push(`${at}: must match ${schema.pattern}`);
  }
  if (t === 'array') {
    if (schema.minItems && value.length < schema.minItems) errs.push(`${at}: needs at least ${schema.minItems} item(s)`);
    if (schema.items) value.forEach((v, i) => errs.push(...validate(v, schema.items, `${path}[${i}]`)));
  }
  if (t === 'object') {
    for (const k of schema.required || []) if (!(k in value)) errs.push(`${path ? path + '.' : ''}${k}: required`);
    for (const [k, v] of Object.entries(value)) {
      const sub = schema.properties && Object.hasOwn(schema.properties, k) ? schema.properties[k] : undefined;
      if (sub) errs.push(...validate(v, sub, path ? `${path}.${k}` : k));
      else if (schema.additionalProperties === false) errs.push(`${path ? path + '.' : ''}${k}: not a ledger field`);
    }
  }
  return errs;
}

export const entryFile = (id) => `${LEDGER_DIR}/${id}.json`;

// A job's branch is the one its latest start row names (`branch`; job/<id> when it names none).
// job start --fresh-branch cuts job/<id>-<n>, n the next free from 2, and writes that row there,
// so the latest start row is on the highest-numbered of job/<id>, job/<id>-<n> that origin
// holds: jobBranch reads it from origin's heads ('job/...'). A <id>-<n> that is itself a module
// (ids: the ledger's) is that module's branch, never <id>'s.
export const startBranch = (rows, id) => rows.filter((r) => r.row === 'attempt' && r.event === 'start').pop()?.branch || `job/${id}`;
const FRESH = /^(.+)-([1-9]\d*)$/;
export function jobBranch(id, heads, ids = new Set()) {
  let best = `job/${id}`;
  let n = 1;
  for (const h of heads || []) {
    const m = String(h).startsWith('job/') && !ids.has(h.slice(4)) ? FRESH.exec(h.slice(4)) : null;
    if (m && m[1] === id && Number(m[2]) > n) [best, n] = [h, Number(m[2])];
  }
  return best;
}
// The module of a job branch: <x> of job/<x> when <x> is a module (or no ids are given), else
// <id> of job/<id>-<n> when <id> is; null for a branch not job/*.
export function branchModule(ref, ids = null) {
  const x = /^job\/([a-z0-9-]+)$/.exec(ref || '')?.[1];
  if (!x || !ids || ids.has(x)) return x || null;
  const m = FRESH.exec(x);
  return m && ids.has(m[1]) ? m[1] : x;
}
export const ledgerIds = (root, ref) => new Set(git(['ls-tree', '--name-only', `${ref}:${LEDGER_DIR}`], { cwd: root, allowFail: true }).stdout.split('\n').filter((n) => n.endsWith('.json')).map((n) => n.slice(0, -5)));
// origin's job heads, as 'job/...' names; null when origin is unread.
export function originJobs(root) {
  const r = git(['ls-remote', '--heads', 'origin', 'refs/heads/job/*'], { cwd: root, allowFail: true });
  return r.code === 0 ? new Set(r.stdout.split('\n').map((l) => l.split('\t')[1]?.trim().replace(/^refs\/heads\//, '')).filter(Boolean)) : null;
}

// Entries as { file: text } from the worktree, or from a git ref when one is given.
export function readLedgerTexts(root, ref) {
  const out = {};
  if (ref) {
    const r = git(['ls-tree', '--name-only', `${ref}:${LEDGER_DIR}`], { cwd: root, allowFail: true });
    if (r.code !== 0) return out;
    for (const name of r.stdout.split('\n').filter((n) => n.endsWith('.json'))) {
      out[`${LEDGER_DIR}/${name}`] = git(['show', `${ref}:${LEDGER_DIR}/${name}`], { cwd: root });
    }
    return out;
  }
  const dir = join(root, LEDGER_DIR);
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    out[`${LEDGER_DIR}/${name}`] = readFileSync(join(dir, name), 'utf8');
  }
  return out;
}

export function readEntry(root, id) {
  const p = join(root, entryFile(id));
  if (!existsSync(p)) fail(`no ledger entry ${entryFile(id)}`);
  return JSON.parse(readFileSync(p, 'utf8'));
}

// Rewrites only the status field of an entry, the one field a job may change.
export function writeStatus(root, id, status) {
  const e = readEntry(root, id);
  e.status = status;
  const errs = validate(e);
  if (errs.length) fail(`status would break the schema: ${errs.join('; ')}`);
  writeFileSync(join(root, entryFile(id)), JSON.stringify(e, null, 2) + '\n');
  return e;
}

const finding = (file, message) => ({ check: 'ledger', file, line: 1, message });
const fixed = (e) => JSON.stringify({ ...e, status: undefined });

// Schema check of every entry; with base and a job/<id> branch, also that the job changed
// nothing in the ledger except the status of its own entry.
export function checkLedger(root, { base, branch, ref } = {}) {
  const findings = [];
  const head = readLedgerTexts(root, ref);
  const parsed = {};
  for (const [file, text] of Object.entries(head)) {
    let e;
    try { e = JSON.parse(text); } catch (err) { findings.push(finding(file, `not JSON: ${err.message}`)); continue; }
    parsed[file] = e;
    for (const m of validate(e)) findings.push(finding(file, m));
    if (e.id && file !== entryFile(e.id)) findings.push(finding(file, `id ${e.id} does not match its file name`));
    if (e.status?.state === 'BLOCKED' && !e.status.reason) findings.push(finding(file, 'BLOCKED needs a reason'));
  }
  const job = branch && branchModule(branch, ledgerIds(root, ref || 'HEAD'));
  if (base && job) {
    const own = entryFile(job);
    const before = readLedgerTexts(root, base);
    for (const file of new Set([...Object.keys(before), ...Object.keys(head)])) {
      if (before[file]?.trimEnd() === head[file]?.trimEnd()) continue;
      if (!(file in before)) { findings.push(finding(file, 'a job may not add a ledger entry')); continue; }
      if (!(file in head)) { findings.push(finding(file, 'a job may not remove a ledger entry')); continue; }
      if (file !== own) { findings.push(finding(file, `job ${job} may change only its own entry`)); continue; }
      let b;
      try { b = JSON.parse(before[file]); } catch { continue; }
      if (parsed[file] && fixed(b) !== fixed(parsed[file])) findings.push(finding(file, 'a job may change only the status field'));
    }
  }
  return findings;
}
