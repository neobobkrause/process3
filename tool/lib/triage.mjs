// Notice triage (the provider-change route, restated by the coordinator 4 Nov): a provider notice
// names every module whose `uses` names the provider (56 for one struck requirement, measured on
// the copy 4 Nov at jurisdictions PR 40), most of which never touch the changed behaviour. Before
// any notice-only job, one read-only worker (a subagent, not a session) judges each user module
// `affected` or `not affected` with file:line evidence. A `not affected` answers the notice for
// that module; an `affected` module stays next work (a job that adapts or confirms the code and
// adds a test); a module the worker did not judge stays unanswered and still owes triage.
// One file per write on the state branch, added and never edited, as notices/ is.
import { getPR } from './github.mjs';
import { P3, wakeLine } from './job.mjs';
import { NOTICES_DIR, answerFile, notices } from './notice.mjs';
import { fetchState, readState, writeState } from './state.mjs';
import { depth, exists, fail, git, isShallow, loadConfig, repoSlug } from './util.mjs';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';

export const TRIAGE_DIR = `${NOTICES_DIR}/triage`;
export const triageFile = (user, key) => `${TRIAGE_DIR}/${user}-${key.replace(':', '-')}.json`;

// Every triage row the fetched state branch holds, keyed `<key>\0<user>`.
export function triageRows(root, sb) {
  const r = git(['ls-tree', '--name-only', '-z', `refs/remotes/origin/${sb}:${TRIAGE_DIR}`], { cwd: root, allowFail: true });
  if (r.code !== 0) return new Map();
  const rows = r.stdout.split('\0').filter((f) => f.endsWith('.json')).flatMap((f) => { try { return [JSON.parse(readState(root, sb, `${TRIAGE_DIR}/${f}`))]; } catch { return []; } });
  return new Map(rows.filter((x) => x?.row === 'triage').map((x) => [`${x.key}\0${x.user}`, x]));
}

// One worker line: `<module>: affected: <evidence>` or `<module>: not affected: <evidence>`
// (a leading list marker or backticks allowed). Evidence must cite a file:line.
const LINE = /^\s*(?:[-*]\s+)?`?([a-z0-9][a-z0-9-]*)`?\s*:\s*(not affected|affected)\b\s*[:—–-]?\s*(.*)$/i;
const CITES = /[\w./-]+:\d+/;
export function parseTriage(text) {
  const out = new Map();
  const bad = [];
  for (const l of String(text || '').split('\n')) {
    const m = l.match(LINE);
    if (!m) continue;
    const [, user, v, evidence] = m;
    const verdict = v.toLowerCase().replace(/\s+/, ' ');
    if (!CITES.test(evidence)) { bad.push(`${user}: ${verdict} cites no file:line`); continue; }
    const had = out.get(user);
    if (had && had.verdict !== verdict) fail(`the worker judged ${user} both affected and not affected; record one line per module`);
    if (!had) out.set(user, { verdict, evidence: evidence.trim() });
  }
  return { lines: out, bad };
}

// The notice for a key, with the users that still owe triage (unanswered, no triage row).
function find(root, cfg, key) {
  if (!fetchState(root, cfg.state_branch, { fresh: true })) fail(`no ${cfg.state_branch} on origin: no provider notice ${key}`);
  const n = notices(root, cfg.state_branch).find((x) => x.key === key);
  if (!n) fail(`no provider notice ${key} on ${cfg.state_branch} (${NOTICES_DIR}/${key.replace(':', '-')}.json)`);
  const tri = triageRows(root, cfg.state_branch);
  return { n, tri, owed: n.open.filter((u) => !tri.has(`${key}\0${u}`)) };
}

// The provider's changed requirements, before and after, from the PR's merge commit (as merge
// run again on a merged pull request reads it).
function changes(root, cfg, n, { slug, read }) {
  const pr = read(slug, n.pr);
  const m = pr?.merge_commit_sha;
  if (!pr?.merged || !m) fail(`pull request ${n.pr} is not merged: the text of ${n.ids.join(', ')} before and after cannot be read`);
  git(['fetch', '-q', ...(isShallow(root) ? ['--depth=50'] : []), 'origin', m], { cwd: root, allowFail: true });
  const head = git(['rev-parse', `${m}^2`], { cwd: root, allowFail: true });
  if (head.code !== 0) fail(`pull request ${n.pr} merged at ${m.slice(0, 10)}, which is not a merge commit; the requirement text cannot be read`);
  const mb = git(['merge-base', `${m}^1`, head.stdout.trim()], { cwd: root });
  const entry = git(['show', `${mb}:process/ledger/${n.provider}.json`], { cwd: root, allowFail: true });
  let file = `${cfg.requirements_dir.replace(/\/$/, '')}/${n.provider}.md`;
  try { if (entry.code === 0) file = JSON.parse(entry.stdout).requirements || file; } catch { /* the default path */ }
  const at = (ref) => git(['show', `${ref}:${file}`], { cwd: root, allowFail: true }).stdout;
  const before = at(mb);
  const after = at(head.stdout.trim());
  const line = (text, id) => String(text).split('\n').find((l) => l.includes(`**${id}**`))?.trim() || '(none)';
  return { file, ids: n.ids.map((id) => ({ id, before: line(before, id), after: line(after, id) })) };
}

// Each user module's paths, and their files and bytes, at the tranche tip.
function sizes(root, cfg, users, ref) {
  let modules = [];
  try { modules = JSON.parse((exists(root, ref, cfg.modules_file) ? git(['show', `${ref}:${cfg.modules_file}`], { cwd: root }) : null) || '{}').modules || []; } catch { modules = []; }
  return users.map((u) => {
    const paths = modules.find((m) => m.id === u)?.paths || [];
    const ls = paths.length ? git(['ls-tree', '-r', '-l', ref, '--', ...paths], { cwd: root, allowFail: true }).stdout.split('\n').filter(Boolean) : [];
    const bytes = ls.reduce((s, l) => s + (Number(l.split(/\s+/)[3]) || 0), 0);
    return { id: u, paths, files: ls.length, bytes };
  });
}

export function briefText({ n, changed, mods, tranche, sha }) {
  return [
    `Read-only triage of provider notice ${n.key}. Change nothing, run nothing that writes, and send nothing but your answer.`,
    '',
    `Provider \`${n.provider}\` changed these requirements in PR ${n.pr} (${changed.file}):`,
    ...changed.ids.flatMap((c) => [`- ${c.id}`, `  before: ${c.before}`, `  after:  ${c.after}`]),
    '',
    `For each module below, read its code at ${tranche} ${sha.slice(0, 10)} and decide whether it uses the changed behaviour. Answer one line per module, exactly one of:`,
    '<module>: affected: <file>:<line> <what there uses the changed behaviour>',
    '<module>: not affected: <file>:<line> <the evidence that it does not: its use of the provider, or where it would be>',
    'Every line cites a file:line. Judge only what you read; leave out a module you did not judge. No other lines matter.',
    '',
    `Modules (${mods.length}; paths, files, bytes):`,
    ...mods.map((m) => `- ${m.id}: ${m.paths.join(', ') || '(no paths in the modules file)'} (${m.files} files, ${m.bytes} bytes)`),
  ].join('\n');
}

// notice triage <key>: prints BOB's act and the worker's brief; writes nothing.
export function noticeTriage(root, key, { log = console.log, io = {} } = {}) {
  const cfg = loadConfig(root);
  const { n, owed } = find(root, cfg, key);
  if (!owed.length) { log(`provider notice ${key}: no module owes triage (${n.open.length} unanswered, each triaged affected)`); return { owed }; }
  const tranche = `origin/${cfg.tranche}`;
  git(['fetch', '-q', ...depth(root), 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/${tranche}`], { cwd: root, allowFail: true });
  const sha = git(['rev-parse', tranche], { cwd: root });
  const changed = changes(root, cfg, n, { slug: io.slug || repoSlug(root), read: io.getPR || getPR });
  const brief = briefText({ n, changed, mods: sizes(root, cfg, owed, tranche), tranche, sha });
  log(`BOB's act: start one read-only worker, a subagent (the Agent tool, not a session), with the brief below; save its answer to a file, then: ${P3} notice triage ${key} --record <file> --worker <its id> --cost <its cost>`);
  log('');
  log(brief);
  return { owed, brief };
}

// notice triage <key> --record <file>: the worker's lines, to the state branch. A `not affected`
// with evidence answers the notice for its module; an `affected` is recorded and stays work; a
// module not judged stays owed. Only modules that still owe triage are recorded.
export function recordTriage(root, key, { file, worker, cost, as = 'bob', log = console.log }) {
  if (!file || file === true) fail('--record <file>: the worker\'s answer, one line per module');
  if (!worker || worker === true) fail('--worker <id>: the worker\'s id, as the Agent tool gave it');
  if (cost === undefined || cost === true || !String(cost).trim()) fail('--cost <cost>: the worker\'s cost, as the Agent tool reported it');
  if (!existsSync(file)) fail(`no file ${file}`);
  const cfg = loadConfig(root);
  const { n, owed } = find(root, cfg, key);
  const { lines, bad } = parseTriage(readFileSync(file, 'utf8'));
  for (const b of bad) log(`not recorded: ${b}`);
  const stranger = [...lines.keys()].filter((u) => !n.users.includes(u));
  if (stranger.length) log(`not recorded, not users of ${key}: ${stranger.join(', ')}`);
  const at = new Date().toISOString();
  const common = { at, key, worker: String(worker), cost: String(cost) };
  const want = owed.filter((u) => lines.has(u)).flatMap((u) => {
    const { verdict, evidence } = lines.get(u);
    return [[triageFile(u, key), { row: 'triage', user: u, verdict, evidence, ...common }],
      ...(verdict === 'not affected' ? [[answerFile(u, key), { row: 'answered', user: u, by: 'triage', evidence, ...common }]] : [])];
  });
  const left = owed.filter((u) => !lines.has(u));
  const rows = want.length ? writeState(root, cfg.state_branch, `notice triage ${key}: ${want.filter(([, r]) => r.row === 'triage').length} module(s)`, (wt) => {
    const dir = resolve(wt, NOTICES_DIR) + sep;
    const add = want.filter(([f]) => resolve(wt, f).startsWith(dir) && !existsSync(join(wt, f)));
    for (const [f, row] of add) {
      mkdirSync(dirname(join(wt, f)), { recursive: true });
      writeFileSync(join(wt, f), JSON.stringify(row) + '\n');
    }
    return { rows: add.map(([, row]) => row) };
  }).rows : [];
  const t = rows.filter((r) => r.row === 'triage');
  const not = t.filter((r) => r.verdict === 'not affected').length;
  log(`notice triage ${key} recorded: ${not} not affected (answered), ${t.length - not} affected (next work)${left.length ? `; not judged, still owe triage: ${left.join(', ')}` : ''}`);
  // The verdicts change BOB's next work (affected modules, answered notices): the wake is the last line.
  const wake = t.length ? wakeLine(`notice triage ${key} recorded`, as) : null;
  if (wake) log(wake);
  return { rows, left };
}
