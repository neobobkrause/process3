// layout move [--apply] [--also <path>]... (C41; Bob, 8 Nov: "There should be an process3-specific
// subtree in the civicsmith-copy repo that contains info related to civicsmith-copy's
// process3-driven development"). A product keeps its process-only content under process/, the
// directory that holds config.json (PROCESS_DIR). Each path the tool reads through a config key
// keeps working where it is, by that key's default, until the product moves it; this act moves it.
//
// The built-in moves (coordinator, 8 Nov) are only what the tool itself reads as process-only:
// layers_file and situations_dir. Anything else (a plan, job notes, the modules file) moves only by
// --also, once BOB has confirmed from the product that the product itself does not rely on it. The
// requirements (requirements_dir) are product content and never move here; nor do the paths the
// platform reads from fixed places (.process, .github, .claude, CLAUDE.md), nor a lane's folder.
//
// Without --apply it prints the plan and writes nothing. With --apply, on a clean checkout of a
// branch that is not the tranche, it moves each path with git mv, rewrites only the keys whose
// value moved in process/config.json, and makes one commit, so the move lands at one tranche
// commit through the merge tool: before it every reader resolves the old paths, after it the new.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { CONFIG_FILE, DEFAULTS, PROCESS_DIR, fail, git, laneDirs, list, loadConfig, parseJSON, underPath } from './util.mjs';

// The keys a move may rewrite: those naming a process-only path. requirements_dir is not one.
export const MOVABLE_KEYS = ['layers_file', 'situations_dir', 'modules_file', 'completion_file'];
// The keys the built-in plan moves (the tool reads them as process-only).
export const BUILT_IN = ['layers_file', 'situations_dir'];
// The platform reads these from fixed places; they never move.
const FIXED = ['.process', '.github', '.claude', 'CLAUDE.md', '.gitmodules'];

const norm = (p) => String(p).replace(/^\.\//, '').replace(/\/+$/, '');
const tracked = (root, p) => git(['ls-files', '--', p], { cwd: root, allowFail: true }).stdout.trim() !== '';

// The plan: [{ from, to, key|null, note|null }] and the paths skipped, each with why.
export function layoutPlan(root, { cfg = loadConfig(root), also = [] } = {}) {
  const moves = [];
  const skipped = [];
  const lanes = laneDirs(cfg).flatMap((l) => [l.dir, l.research]).filter(Boolean).map(norm);
  const req = norm(cfg.requirements_dir || DEFAULTS.requirements_dir);
  const add = (from, key) => {
    const p = norm(from);
    if (!p || p.startsWith('/') || p.split('/').includes('..')) fail(`layout move: ${JSON.stringify(from)} is not a path inside the repository`);
    if (underPath(p, PROCESS_DIR)) { skipped.push({ from: p, why: `already under ${PROCESS_DIR}/` }); return; }
    if (FIXED.some((f) => underPath(p, f) || underPath(f, p))) fail(`layout move: ${p} is read by the platform from a fixed place (.process, .github, .claude, CLAUDE.md); it stays where it is`);
    if (underPath(p, req) || underPath(req, p)) fail(`layout move: ${p} holds the requirements (requirements_dir ${req}), the product's own content; they stay where they are`);
    const lane = lanes.find((d) => underPath(p, d) || underPath(d, p));
    if (lane) fail(`layout move: ${p} overlaps the lane folder ${lane}/, which its lane owns; it stays where it is`);
    if (!existsSync(join(root, p)) || !tracked(root, p)) { skipped.push({ from: p, why: 'not in this checkout' }); return; }
    if (moves.some((m) => m.from === p)) return;
    const to = `${PROCESS_DIR}/${basename(p)}`;
    if (existsSync(join(root, to)) || moves.some((m) => m.to === to)) fail(`layout move: ${to} is taken; move ${p} by hand or rename one of them first`);
    const keyOf = key || MOVABLE_KEYS.find((k) => typeof cfg[k] === 'string' && norm(cfg[k]) === p) || null;
    // A modules file under process/ is a record: the gate judges a change to it alone as one, with
    // no suite run (gate.mjs recordOnly). Said, never refused: the coordinator moves it by --also.
    const note = keyOf === 'modules_file' ? `under ${PROCESS_DIR}/ the gate reads ${p} as a record: a pull request changing only it runs no suite` : null;
    moves.push({ from: p, to, key: keyOf, note });
  };
  for (const k of BUILT_IN) {
    const v = k === 'situations_dir' ? (cfg.situations_dir ?? DEFAULTS.situations_dir) : cfg[k];
    if (typeof v === 'string' && v) add(v, k);
  }
  for (const p of list(also)) {
    if (typeof p !== 'string') fail('layout move --also <path>: name the path');
    add(p, null);
  }
  return { moves, skipped };
}

export const planLines = ({ moves, skipped }) => [
  ...(moves.length ? moves.map((m) => `move ${m.from} -> ${m.to}${m.key ? ` (${CONFIG_FILE} ${m.key})` : ''}${m.note ? `; note: ${m.note}` : ''}`) : [`nothing to move: the process-only paths the tool reads are under ${PROCESS_DIR}/ or absent`]),
  ...skipped.map((s) => `skip ${s.from}: ${s.why}`),
];

// status --role bob's hint: the built-in paths still outside process/, never a refusal.
export function layoutHint(root, cfg) {
  try {
    const { moves } = layoutPlan(root, { cfg });
    return moves.length ? `layout: ${moves.length} process-only path(s) outside ${PROCESS_DIR}/ (${moves.map((m) => m.from).join(', ')}): \`layout move\` prints the plan` : null;
  } catch { return null; }
}

// The config text with only the moved keys rewritten, the rest of it byte for byte.
export function rewriteConfig(text, moves) {
  let out = text;
  const cfg = parseJSON(text);
  const keys = moves.filter((m) => m.key);
  for (const m of keys) {
    const pattern = new RegExp(`("${m.key}"\\s*:\\s*)"(?:[^"\\\\]|\\\\.)*"`);
    if (typeof cfg[m.key] === 'string' && pattern.test(out)) out = out.replace(pattern, `$1${JSON.stringify(m.to)}`);
    else {
      // A key at its default is added, so the moved path is named.
      const at = out.lastIndexOf('}');
      if (at < 0) fail(`${CONFIG_FILE} is not a JSON object`);
      const body = out.slice(0, at).trimEnd();
      const comma = body.endsWith('{') ? '' : ',';
      out = `${body}${comma}\n  ${JSON.stringify(m.key)}: ${JSON.stringify(m.to)}\n${out.slice(at)}`;
    }
  }
  const back = parseJSON(out);
  for (const m of keys) if (back[m.key] !== m.to) fail(`layout move: could not rewrite ${m.key} in ${CONFIG_FILE}`);
  return out;
}

export function layoutMove(root, { apply = false, also = [], log = console.log } = {}) {
  const cfg = loadConfig(root);
  const plan = layoutPlan(root, { cfg, also });
  for (const l of planLines(plan)) log(l);
  if (!apply) {
    if (plan.moves.length) log(`then, on a branch from ${cfg.tranche}: layout move --apply${list(also).map((p) => ` --also ${p}`).join('')}; open its pull request into ${cfg.tranche} and land it with the merge tool`);
    return { ...plan, applied: false };
  }
  if (!plan.moves.length) return { ...plan, applied: false };
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root });
  if (branch === 'HEAD' || branch === cfg.tranche || branch === 'main') fail(`layout move --apply runs on a working branch from ${cfg.tranche}, not ${branch === 'HEAD' ? 'a detached HEAD' : branch}`);
  if (git(['status', '--porcelain', '--untracked-files=no'], { cwd: root })) fail('layout move --apply needs a clean checkout: commit or set aside the changes first');
  mkdirSync(join(root, PROCESS_DIR), { recursive: true });
  for (const m of plan.moves) {
    const r = git(['mv', '--', m.from, m.to], { cwd: root, allowFail: true });
    if (r.code !== 0) { git(['reset', '-q', '--hard', 'HEAD'], { cwd: root, allowFail: true }); fail(`layout move: git mv ${m.from} ${m.to} failed (${r.stderr.trim()}); nothing was committed`); }
  }
  if (plan.moves.some((m) => m.key)) {
    const p = join(root, CONFIG_FILE);
    const text = existsSync(p) ? readFileSync(p, 'utf8') : '{\n}\n';
    writeFileSync(p, rewriteConfig(text, plan.moves));
    git(['add', '--', CONFIG_FILE], { cwd: root });
  }
  git(['commit', '-q', '-m', `layout move: process-only paths into ${PROCESS_DIR}/ (C41)\n\n${plan.moves.map((m) => `${m.from} -> ${m.to}`).join('\n')}`], { cwd: root });
  const sha = git(['rev-parse', 'HEAD'], { cwd: root });
  log(`committed ${sha} on ${branch}: push it, open its pull request into ${cfg.tranche}, and land it with the merge tool`);
  return { ...plan, applied: true, sha };
}
