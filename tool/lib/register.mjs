// Triage registers (Bob, 5 Nov: "there should be a lane whose job it is to study identified
// problems to load-bearingly understand the proper way to fix them"). One triage lane per
// repository: the process's in process3 (its folder `triage/`), each product's a lane of kind
// "triage" in its process/config.json. Each keeps its register in its folder, so it survives every
// session: `register.json` holds the open entries, `closed.jsonl` each closed one with how its end
// condition was met. A short-term entry carries its interim measure word for word, who decided it
// and its end condition; the pinned tool prints every open one, verbatim, into the initial prompt of
// each role it names, so a refreshed session gets the measure exactly and no one retypes it ("care
// must be taken that what gets conveyed to the refreshed session is the same as the original
// determination"). A long-term entry is judged against a requirement, principle or foundation and
// is printed into no prompt. Written only by `triage add` and `triage close`, as commits on the
// current branch that land by pull request like any lane change.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG_FILE, exists, fail, git, laneDirs, now } from './util.mjs';

export const PROCESS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// Tests' seam: under node --test, P3_PROCESS_ROOT names a fixture in place of this checkout's own
// register, so the live register's entries never decide a test.
const processRoot = () => (process.env.NODE_TEST_CONTEXT && process.env.P3_PROCESS_ROOT) || PROCESS_ROOT;
export const PROCESS_TRIAGE = { name: 'process-triage', dir: 'triage', module: null, kind: 'triage', repo: 'process' };
export const REGISTER = 'register.json';
export const CLOSED = 'closed.jsonl';
export const KINDS = ['short-term', 'long-term'];
// The roles whose initial prompts print a short-term entry (Bob's list: BOB, ROOT, the MERGER, the
// coordinator and job briefs).
export const AFFECTS = ['bob', 'root', 'merger', 'coordinator', 'job'];
// Who may be named as deciding: Bob (the person), the coordinator, a role, or a lane (lane <name>).
export const DECIDERS = ['Bob', 'the coordinator', 'BOB', 'ROOT', 'the MERGER'];
// The printed block's cap. Measured 5 Nov: each role prompt is at most one screen, 4096 bytes
// (prompt-caps.test.mjs; BOB's 3789, the MERGER's 4072, on the copy's slug), and the seed entry's
// block, its heading included, is 880 bytes. Half a screen holds the heading and about two and a
// half entries of the seed's size, so a prompt with its block stays within a screen and a half and
// is read whole. Over it the tool still prints every entry, and says the set is over its cap (in
// the block and at triage add and list), so the triage lanes close or combine entries rather than
// let the set grow until it is skimmed.
export const STANDING_CAP = 2048;

// The product's triage lane, or null; more than one is refused.
export function productTriageLane(cfg) {
  const ls = (Array.isArray(cfg?.lanes) ? cfg.lanes : []).filter((l) => l?.kind === 'triage');
  if (ls.length > 1) fail(`process/config.json names ${ls.length} triage lanes (${ls.map((l) => l.name).join(', ')}); one per repository`);
  const l = ls[0];
  if (!l) return null;
  if (typeof l.dir !== 'string' || !l.dir.trim() || !laneDirs({ lanes: [l] }).length) fail(`triage lane ${l.name} names no "dir" in process/config.json that can be a lane folder`);
  return { name: String(l.name).trim(), dir: l.dir.trim().replace(/^\.\//, '').replace(/\/+$/, ''), module: null, kind: 'triage', repo: 'product' };
}

const one = (s) => (typeof s === 'string' ? s.trim() : '');
// An entry's shape, checked wherever the register is read or written: a malformed one is refused, never skipped.
export function checkEntry(e, where = 'the register') {
  const at = `${where}, entry ${e?.id || '?'}`;
  if (!e || typeof e !== 'object' || !/^[A-Z]+\d+$/.test(String(e.id))) fail(`${at}: an entry needs an id such as P1`);
  for (const k of ['problem', 'evidence', 'owner', 'state']) if (!one(e[k])) fail(`${at}: no ${k}`);
  if (!KINDS.includes(e.kind)) fail(`${at}: kind is ${KINDS.join(' or ')}, not ${JSON.stringify(e.kind)}`);
  if (e.kind === 'short-term') {
    for (const k of ['interim', 'decided_by', 'decided_at', 'end_condition']) if (!one(e[k])) fail(`${at}: a short-term entry needs ${k}`);
    if (!Array.isArray(e.affects) || !e.affects.length || e.affects.some((r) => !AFFECTS.includes(r))) fail(`${at}: affects lists roles from ${AFFECTS.join(', ')}`);
    if (!DECIDERS.includes(e.decided_by) && !/^lane [a-z0-9][a-z0-9-]*$/.test(e.decided_by)) fail(`${at}: decided_by is one of ${DECIDERS.join(', ')} or lane <name>, exactly, not ${JSON.stringify(e.decided_by)}`);
    // Bob's words are printed as his only when the evidence carries them, word for word.
    if (e.decided_by === 'Bob' && !e.evidence.includes(e.interim)) fail(`${at}: an interim measure decided by Bob is Bob's words, quoted word for word in its evidence`);
  } else if (!one(e.judged_against)) fail(`${at}: a long-term entry needs judged_against (the requirement, principle or foundation)`);
  return e;
}

export function parseRegister(text, where = REGISTER) {
  if (text === null || text === undefined) return { open: [] };
  let r;
  try { r = JSON.parse(text); } catch (e) { fail(`${where} is not JSON: ${e.message}`); }
  if (!r || !Array.isArray(r.open)) fail(`${where} needs {"open": [entries]}`);
  r.open.forEach((e) => checkEntry(e, where));
  return r;
}

// Bob's words are quoted as his only when he decided; anyone else's ruling is named as theirs.
const attribution = (e) => (e.decided_by === 'Bob'
  ? `Decided by Bob, ${e.decided_at}, in Bob's own words: "${e.interim}"`
  : `Decided by ${e.decided_by}, ${e.decided_at} (that ruling, not Bob's words): ${e.interim}`);
export const entryLines = (repo, e) => [`- ${repo} ${e.id}. ${attribution(e)}`, `  Problem: ${e.problem}`, `  Ends when: ${e.end_condition}`];

// A prompt without its standing block: the one-screen cap is the prompt's, the block has its own.
export const STANDING_HEAD = '## Standing interim measures';
export const promptBody = (p) => p.split(`\n\n${STANDING_HEAD}\n`)[0].replace(/\n*$/, '\n');

// The block a role's initial prompt carries: every open short-term entry naming the role, from
// each register given ({ repo, register }), verbatim; '' when none. Over the cap, it says so.
export function standingBlock(registers, role) {
  const rows = registers.flatMap(({ repo, register }) => register.open.filter((e) => e.kind === 'short-term' && e.affects.includes(role)).map((e) => entryLines(repo, e)));
  if (!rows.length) return '';
  const L = [STANDING_HEAD, '', 'Printed verbatim from the triage registers; each holds until its end condition is met and its triage lane closes it. Act by each as written, within the limits above.', '', ...rows.flat()];
  const text = L.join('\n') + '\n';
  const b = Buffer.byteLength(text);
  return b > STANDING_CAP ? `${text}\nThis block is ${b} bytes, over its cap of ${STANDING_CAP}: tell the triage lanes, which close or combine entries.\n` : text;
}

// The process's register at the pin (the tool's own checkout), and the product's at the tranche's
// tip as last fetched (the working tree's when that ref is absent).
export const processRegister = (root = processRoot()) => {
  const f = join(root, PROCESS_TRIAGE.dir, REGISTER);
  return { repo: 'process', register: parseRegister(existsSync(f) ? readFileSync(f, 'utf8') : null, `process3 ${PROCESS_TRIAGE.dir}/${REGISTER}`) };
};
export function productRegister(root, cfg) {
  const l = productTriageLane(cfg);
  if (!l) return null;
  const path = `${l.dir}/${REGISTER}`;
  const ref = `refs/remotes/origin/${cfg.tranche}`;
  const atTip = git(['rev-parse', '--verify', '-q', ref], { cwd: root, allowFail: true }).code === 0;
  const text = atTip ? (exists(root, ref, path) ? git(['show', `${ref}:${path}`], { cwd: root }) : null) : (existsSync(join(root, path)) ? readFileSync(join(root, path), 'utf8') : null);
  return { repo: 'product', register: parseRegister(text, path) };
}
// Both registers' block for a role, as a role's prompt prints it. processRoot: tests' seam.
// A register that cannot be read stops no start: the block says so, for the triage lane to mend.
export function standingFor(root, cfg, role, { processRoot: pr = processRoot() } = {}) {
  const regs = [];
  const bad = [];
  for (const read of [() => processRegister(pr), () => (cfg ? productRegister(root, cfg) : null)]) {
    try { const r = read(); if (r) regs.push(r); } catch (e) { bad.push(e.message); }
  }
  const text = standingBlock(regs, role);
  return bad.length ? `${text || `${STANDING_HEAD}\n`}\nA triage register could not be read (${bad.join('; ')}): its interim measures are missing here; tell its triage lane.\n` : text;
}

// Which register a triage command writes: in a process3 checkout (the tool at its root, no product
// config), the process's; in a product, its triage lane's.
export function registerHere(root, cfg) {
  if (!existsSync(join(root, CONFIG_FILE)) && existsSync(join(root, 'tool', 'p3.mjs'))) return { repo: 'process', dir: PROCESS_TRIAGE.dir, prefix: 'P' };
  const l = productTriageLane(cfg) || fail('this product names no triage lane: add {"name": "triage", "dir": "<folder>", "kind": "triage"} to "lanes" in process/config.json');
  return { repo: 'product', dir: l.dir, prefix: 'T' };
}

const readHere = (root, where) => {
  const f = join(root, where.dir, REGISTER);
  return parseRegister(existsSync(f) ? readFileSync(f, 'utf8') : null, `${where.dir}/${REGISTER}`);
};
const closedRows = (root, where) => {
  const f = join(root, where.dir, CLOSED);
  return existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l, i) => { try { return JSON.parse(l); } catch { return fail(`${where.dir}/${CLOSED} line ${i + 1} is not JSON; nothing written`); } }) : [];
};
// The normal commit path: a commit of the register's files on the current branch, never the
// tranche or main; it lands by pull request (a product's triage folder takes the lane's path).
function branchFor(root, tranche) {
  const b = git(['symbolic-ref', '-q', '--short', 'HEAD'], { cwd: root, allowFail: true }).stdout.trim();
  if (!b) fail('check out the triage lane\'s working branch first (a detached HEAD holds no commit); nothing written');
  if (b === 'main' || b === tranche) fail(`the register lands by pull request, never by a commit on ${b}: work on the triage lane's branch; nothing written`);
  return b;
}

const write = (root, where, reg) => {
  mkdirSync(join(root, where.dir), { recursive: true });
  writeFileSync(join(root, where.dir, REGISTER), JSON.stringify(reg, null, 2) + '\n');
};
// The cap's report, over the registers as this checkout now holds them (the one written, as written).
const capLine = (root, cfg, where, log) => {
  const regs = [
    ...(where.repo === 'process' ? [{ repo: 'process', register: readHere(root, where) }] : (() => { try { return [processRegister()]; } catch { return []; } })()),
    ...(where.repo === 'product' ? [{ repo: 'product', register: readHere(root, where) }] : []),
  ];
  const over = AFFECTS.filter((role) => Buffer.byteLength(standingBlock(regs, role)) > STANDING_CAP);
  if (over.length) log(`over the cap: the standing block of ${over.join(', ')} is over ${STANDING_CAP} bytes; close or combine entries so it is read, not skimmed`);
  return over;
};

// triage add --kind short-term|long-term --problem ... --evidence ... [--interim ... --decided-by ... --end ... --affects <roles>] [--judged-against ...] [--owner ...] [--state ...]
export function triageAdd(root, cfg, o, { log = console.log, tranche = cfg?.tranche || 'tranche' } = {}) {
  const where = registerHere(root, cfg);
  const branch = branchFor(root, tranche);
  const reg = readHere(root, where);
  const ids = [...reg.open, ...closedRows(root, where)].map((e) => Number(String(e.id).slice(1))).filter(Number.isFinite);
  const id = `${where.prefix}${Math.max(0, ...ids) + 1}`;
  const e = { id, kind: o.kind, problem: one(o.problem), evidence: one(o.evidence) };
  if (o.kind === 'short-term') Object.assign(e, { interim: one(o.interim), decided_by: one(o['decided-by']), decided_at: one(o['decided-at']) || now().slice(0, 10), end_condition: one(o.end), affects: String(o.affects ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) });
  else e.judged_against = one(o['judged-against']);
  Object.assign(e, { owner: one(o.owner) || `the ${where.repo === 'process' ? PROCESS_TRIAGE.name : productTriageLane(cfg).name} lane`, state: one(o.state) || 'studying', opened_at: now() });
  checkEntry(e, 'triage add');
  reg.open.push(e);
  write(root, where, reg);
  git(['add', join(where.dir, REGISTER)], { cwd: root });
  git(['commit', '-q', '-m', `triage ${id}: ${e.kind} entry added`, '--', join(where.dir, REGISTER)], { cwd: root });
  log(`triage ${id} added to ${where.dir}/${REGISTER} on ${branch}; push it and land it by pull request into ${tranche}`);
  capLine(root, cfg, where, log);
  return e;
}

// triage close <id> --how "<how the end condition was met>": the entry leaves the register for closed.jsonl.
export function triageClose(root, cfg, id, { how, log = console.log, tranche = cfg?.tranche || 'tranche' } = {}) {
  if (!one(how)) fail(`triage close ${id ?? '<id>'} --how "<how the end condition was met, with its evidence>"`);
  const where = registerHere(root, cfg);
  const branch = branchFor(root, tranche);
  const reg = readHere(root, where);
  const e = reg.open.find((x) => x.id === id) || fail(`no open entry ${JSON.stringify(id)} in ${where.dir}/${REGISTER}; open: ${reg.open.map((x) => x.id).join(', ') || 'none'}`);
  reg.open = reg.open.filter((x) => x !== e);
  write(root, where, reg);
  appendFileSync(join(root, where.dir, CLOSED), JSON.stringify({ ...e, state: 'closed', closed_at: now(), how_met: one(how) }) + '\n');
  git(['add', join(where.dir, REGISTER), join(where.dir, CLOSED)], { cwd: root });
  git(['commit', '-q', '-m', `triage ${id}: closed`, '-m', one(how), '--', join(where.dir, REGISTER), join(where.dir, CLOSED)], { cwd: root });
  log(`triage ${id} closed on ${branch}; push it and land it by pull request into ${tranche}`);
  return e;
}

// triage list [--all]: the open entries, each whole; --all adds the closed ones.
export function triageList(root, cfg, { all = false, log = console.log } = {}) {
  const where = registerHere(root, cfg);
  const reg = readHere(root, where);
  log(`${where.repo} triage register, ${where.dir}/${REGISTER}: ${reg.open.length} open`);
  for (const e of reg.open) log(JSON.stringify(e, null, 2));
  if (all) for (const e of closedRows(root, where)) log(JSON.stringify(e));
  capLine(root, cfg, where, log);
  return reg.open;
}
