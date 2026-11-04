// Notice triage (the provider-change route, restated by the coordinator 4 Nov): a provider notice
// names every module whose `uses` names the provider (56 for one struck requirement, measured on
// the copy 4 Nov at jurisdictions PR 40), most of which never touch the changed behaviour. Before
// any notice-only job, one read-only worker (a subagent, not a session) judges each user module
// `affected` or `not affected` with file:line evidence. A `not affected` answers the notice for
// that module; an `affected` module stays next work (a job that adapts or confirms the code and
// adds a test). A list over one worker's share is split into briefs run in parallel, and the
// notice is recorded whole, only once every user module has a line (coordinator, 4 Nov).
// One file per write on the state branch, added and never edited, as notices/ is.
import { specifiers, ownerOf } from './checks.mjs';
import { resolveSpec } from './exports.mjs';
import { getPR } from './github.mjs';
import { P3, wakeLine } from './job.mjs';
import { NOTICES_DIR, answerFile, mergedRange, notices } from './notice.mjs';
import { fetchState, readState, writeState } from './state.mjs';
import { depth, exists, fail, git, list, loadConfig, repoSlug } from './util.mjs';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, resolve, sep } from 'node:path';

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
function changes(root, cfg, n, { slug, read, compare }) {
  const pr = read(slug, n.pr);
  const m = pr?.merge_commit_sha;
  if (!pr?.merged || !m) fail(`pull request ${n.pr} is not merged: what it changed cannot be read`);
  const { head: h, mb } = mergedRange(root, m, { slug, n: n.pr, ...(compare ? { read: compare } : {}) });
  const entry = git(['show', `${mb}:process/ledger/${n.provider}.json`], { cwd: root, allowFail: true });
  let file = `${cfg.requirements_dir.replace(/\/$/, '')}/${n.provider}.md`;
  try { if (entry.code === 0) file = JSON.parse(entry.stdout).requirements || file; } catch { /* the default path */ }
  const at = (ref) => git(['show', `${ref}:${file}`], { cwd: root, allowFail: true }).stdout;
  const before = at(mb);
  const after = at(h);
  const line = (text, id) => String(text).split('\n').find((l) => l.includes(`**${id}**`))?.trim() || '(none)';
  return { file, ids: n.ids.map((id) => ({ id, before: line(before, id), after: line(after, id) })) };
}

// Each user module's paths, and their files and bytes, at the tranche tip.
// What a worker reads per user module: its files that import the provider, found as the gate's
// imports check finds an import (checks.mjs specifiers, a relative specifier resolved from the
// importing file, the file's module the most specific path owning it), each with its import lines;
// bytes are those files' only. Whole module code made one notice about 74 workers on the copy (4 Nov,
// coordinator); the judgement needs only where a module reaches the provider. git grep for the
// provider's directory names narrows the read, as exports.mjs entryFiles does.
const CODE_FILE = /\.(m|c)?(j|t)sx?$/;
function sizes(root, cfg, users, ref, provider) {
  let modules = [];
  try { modules = JSON.parse((exists(root, ref, cfg.modules_file) ? git(['show', `${ref}:${cfg.modules_file}`], { cwd: root }) : null) || '{}').modules || []; } catch { modules = []; }
  if (!Array.isArray(modules)) modules = [];
  const prov = modules.find((m) => m?.id === provider);
  const provPaths = [...(prov?.paths || [])];
  const inProvider = (f) => !!prov && ownerOf(modules, f)?.id === provider;
  const pathsOf = (u) => modules.find((m) => m?.id === u)?.paths || [];
  const userPaths = [...new Set(users.flatMap(pathsOf))];
  const words = [...new Set(provPaths.map((p) => String(p).replace(/\/$/, '').split('/').pop()).filter((w) => w && w !== '.'))];
  const hits = new Map(users.map((u) => [u, []]));
  if (words.length && userPaths.length) {
    const all = new Set(git(['ls-tree', '-r', '--name-only', '-z', ref], { cwd: root }).split('\0').filter(Boolean));
    const g = git(['grep', '-l', '-z', '-F', ...words.flatMap((w) => ['-e', w]), ref, '--', ...userPaths], { cwd: root, allowFail: true });
    const files = g.code === 0 ? g.stdout.split('\0').filter(Boolean).map((f) => f.slice(ref.length + 1)) : [];
    for (const f of files) {
      if (!CODE_FILE.test(f) || inProvider(f)) continue;
      const own = ownerOf(modules, f)?.id;
      if (!hits.has(own)) continue;
      const text = git(['show', `${ref}:${f}`], { cwd: root, allowFail: true }).stdout;
      const lines = specifiers(text).filter(({ spec }) => { const to = resolveSpec(f, spec, (x) => all.has(x)); return to && inProvider(to); });
      if (lines.length) hits.get(own).push({ file: f, lines: lines.map((x) => x.line), bytes: Buffer.byteLength(text) });
    }
  }
  return users.map((u) => {
    const imports = hits.get(u).sort((a, b) => a.file.localeCompare(b.file));
    return { id: u, paths: pathsOf(u), imports, files: imports.length, bytes: imports.reduce((t, x) => t + x.bytes, 0) };
  });
}

// The owed modules in shares one worker's brief can hold: in order, a share closed when the next
// module would take it past cfg.triage_share_bytes of its importing files or cfg.triage_share_modules modules
// (a module over the cap alone is a share of its own).
export function shares(mods, { bytes, modules }) {
  const out = [];
  for (const m of mods) {
    const s = out.at(-1);
    if (s && s.length < modules && s.reduce((t, x) => t + x.bytes, 0) + m.bytes <= bytes) s.push(m);
    else out.push([m]);
  }
  return out;
}

export function briefText({ n, changed, mods, tranche, sha, share = null }) {
  return [
    `Read-only triage of provider notice ${n.key}${share ? `, share ${share.k} of ${share.of}` : ''}. Change nothing, run nothing that writes, and send nothing but your answer.`,
    '',
    ...(changed.ids.length ? [`Provider \`${n.provider}\` changed these requirements in PR ${n.pr} (${changed.file}):`,
      ...changed.ids.flatMap((c) => [`- ${c.id}`, `  before: ${c.before}`, `  after:  ${c.after}`])]
      : [`Provider \`${n.provider}\` changed its source in PR ${n.pr}, with no requirement text changed (${changed.file}); read the PR's change to the provider's source.`]),
    ...(n.exports ? ['', `Its exported interface, as its users import it, changed in PR ${n.pr}:`,
      ...(n.exports.removed.length ? [`- removed: ${n.exports.removed.join(', ')}`] : []),
      ...n.exports.changed.map((c) => `- changed: ${c.name} ${c.before} -> ${c.after}`),
      ...(n.exports.added.length ? [`- added: ${n.exports.added.join(', ')}`] : [])] : []),
    ...(n.exports_unread ? ['', `Its exports could not be read (${n.exports_unread}); read the provider's change.`] : []),
    '',
    `For each module below, read at ${tranche} ${sha.slice(0, 10)} the files listed for it, which import \`${n.provider}\` (each import's line given), and what they do with what they import; decide whether the module uses the changed behaviour${n.exports ? ' or any export removed or changed' : ''}. Read further only where those files lead. A module listed with no file importing \`${n.provider}\` is judged from that: cite its paths and the modules file. Answer one line per module, exactly one of:`,
    '<module>: affected: <file>:<line> <what there uses the changed behaviour>',
    '<module>: not affected: <file>:<line> <the evidence that it does not: its use of the provider, or where it would be>',
    'Every line cites a file:line. Judge every module below, each from what you read; nothing is recorded until every module of the notice has a line. No other lines matter.',
    '',
    `Modules (${mods.length}; paths; the files that import ${n.provider}, with their import lines):`,
    ...mods.map((m) => `- ${m.id}: ${m.paths.join(', ') || '(no paths in the modules file)'}; ${m.imports?.length ? m.imports.map((x) => `${x.file}:${x.lines.join(',')}`).join(', ') : `no file imports ${n.provider}`}`),
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
  const changed = changes(root, cfg, n, { slug: io.slug || repoSlug(root), read: io.getPR || getPR, compare: io.compare });
  const mods = sizes(root, cfg, owed, tranche, n.provider);
  const parts = shares(mods, { bytes: cfg.triage_share_bytes, modules: cfg.triage_share_modules });
  if (parts.length === 1) {
    const brief = briefText({ n, changed, mods, tranche, sha });
    log(`BOB's act: start one read-only worker, a subagent (the Agent tool, not a session), with the brief below; save its answer to a file, then: ${P3} notice triage ${key} --record <file> --worker <its id> --cost <its cost>`);
    log('');
    log(brief);
    return { owed, brief, briefs: [brief] };
  }
  const N = parts.length;
  const briefs = parts.map((p, i) => briefText({ n, changed, mods: p, tranche, sha, share: { k: i + 1, of: N } }));
  const rec = parts.map((_, i) => `--record <file ${i + 1}> --worker <id ${i + 1}> --cost <cost ${i + 1}>`).join(' ');
  log(`BOB's acts: ${owed.length} modules, over one worker's share (${cfg.triage_share_modules} modules or ${cfg.triage_share_bytes} bytes of the files that import ${n.provider}): start ${N} read-only workers in parallel, subagents (the Agent tool, not sessions), worker k with brief k below; save each answer to its own file, then record them together, once every worker has answered: ${P3} notice triage ${key} ${rec}`);
  parts.forEach((p, i) => log(`- worker ${i + 1} of ${N}: brief ${i + 1} (${p.length} modules, ${p.reduce((t, m) => t + m.bytes, 0)} bytes)`));
  briefs.forEach((b, i) => { log(''); log(`=== brief ${i + 1} of ${N} ===`); log(b); });
  return { owed, briefs, shares: parts.map((p) => p.map((m) => m.id)) };
}

// notice triage <key> --record <file>...: the workers' lines, to the state branch, one --record,
// --worker and --cost per worker (a split notice has several). A notice is triaged whole: nothing
// is recorded until every module that owes triage has a line from some worker. A `not affected`
// with evidence answers the notice for its module; an `affected` is recorded and stays work.
export function recordTriage(root, key, { file, worker, cost, as = 'bob', log = console.log }) {
  const files = list(file);
  const workers = list(worker);
  const costs = list(cost);
  if (!files.length || files.some((f) => !f || f === true)) fail('--record <file>: the worker\'s answer, one line per module');
  if (!workers.length || workers.some((w) => !w || w === true)) fail('--worker <id>: the worker\'s id, as the Agent tool gave it');
  if (!costs.length || costs.some((c) => c === true || !String(c).trim())) fail('--cost <cost>: the worker\'s cost, as the Agent tool reported it');
  if (workers.length !== files.length || costs.length !== files.length) fail(`give one --worker and one --cost per --record, in the same order: ${files.length} --record, ${workers.length} --worker, ${costs.length} --cost`);
  for (const f of files) if (!existsSync(f)) fail(`no file ${f}`);
  const cfg = loadConfig(root);
  const { n, owed } = find(root, cfg, key);
  const lines = new Map();
  files.forEach((f, i) => {
    const got = parseTriage(readFileSync(f, 'utf8'));
    for (const b of got.bad) log(`not recorded: ${b}`);
    for (const [u, v] of got.lines) {
      const had = lines.get(u);
      if (had && had.verdict !== v.verdict) fail(`the workers judged ${u} both affected and not affected; record one verdict per module`);
      if (!had) lines.set(u, { ...v, worker: String(workers[i]), cost: String(costs[i]) });
    }
  });
  const stranger = [...lines.keys()].filter((u) => !n.users.includes(u));
  if (stranger.length) log(`not recorded, not users of ${key}: ${stranger.join(', ')}`);
  const left = owed.filter((u) => !lines.has(u));
  if (left.length) fail(`refused: notice triage ${key} records only when every module has a line; ${left.length} of ${owed.length} not judged: ${left.join(', ')}. Run a worker for them, then record every file again, nothing was written`);
  const at = new Date().toISOString();
  const want = owed.flatMap((u) => {
    const { verdict, evidence, worker: w, cost: c } = lines.get(u);
    const common = { at, key, worker: w, cost: c };
    return [[triageFile(u, key), { row: 'triage', user: u, verdict, evidence, ...common }],
      ...(verdict === 'not affected' ? [[answerFile(u, key), { row: 'answered', user: u, by: 'triage', evidence, ...common }]] : [])];
  });
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
  log(`notice triage ${key} recorded: ${not} not affected (answered), ${t.length - not} affected (next work)`);
  // The verdicts change BOB's next work (affected modules, answered notices): the wake is the last line.
  const wake = t.length ? wakeLine(`notice triage ${key} recorded`, as) : null;
  if (wake) log(wake);
  return { rows, left };
}

// Triage at the merge (coordinator, 4 Nov: every real ready-to-start wait on the copy since 06:00
// was a notice waiting 33 to 57 minutes for BOB's batch triage). The merge that raises a notice
// triages it in the same command by the rule the briefs already use (PR 89): a user module whose
// paths hold no file importing the provider, as the gate's imports check finds an import, is
// recorded not affected, its notice answered, with the modules file's line for it and the commit
// read as its evidence. A module that imports the provider needs a worker's judgment: it stays
// owed, and the merge names that one notice's `notice triage` as BOB's next act at once. A module
// with no paths in the modules file is never judged here.
export function triageAtMerge(root, cfg, notice, { ref, as = 'bob', log = console.log } = {}) {
  if (!notice?.key || !Array.isArray(notice.users) || !notice.users.length) return { rows: [], owed: [] };
  const key = notice.key;
  const sb = cfg.state_branch;
  fetchState(root, sb, { fresh: true });
  const tri = triageRows(root, sb);
  const owed = notice.users.filter((u) => !tri.has(`${key}\0${u}`));
  if (!owed.length) return { rows: [], owed: [] };
  const sha = git(['rev-parse', ref], { cwd: root });
  const clear = importFree(root, cfg, owed, sha, notice.provider);
  const left = owed.filter((u) => !clear.some((m) => m.id === u));
  const at = new Date().toISOString();
  const common = { at, key, worker: 'merge: imports check', cost: '0' };
  const want = clear.flatMap((m) => {
    const evidence = `${cfg.modules_file}:${m.line} ${m.id} (${m.paths.join(', ')}) holds no file that imports ${notice.provider}, every code file under its paths read at ${sha.slice(0, 10)}`;
    return [[triageFile(m.id, key), { row: 'triage', user: m.id, verdict: 'not affected', evidence, ...common }],
      [answerFile(m.id, key), { row: 'answered', user: m.id, by: 'triage', evidence, ...common }]];
  });
  let rows = [];
  if (want.length) {
    rows = writeState(root, sb, `notice triage ${key} at its merge: ${clear.length} module(s) not affected by imports`, (wt) => {
      const dir = resolve(wt, NOTICES_DIR) + sep;
      const add = want.filter(([f]) => resolve(wt, f).startsWith(dir) && !existsSync(join(wt, f)));
      for (const [f, row] of add) {
        mkdirSync(dirname(join(wt, f)), { recursive: true });
        writeFileSync(join(wt, f), JSON.stringify(row) + '\n');
      }
      return { rows: add.map(([, row]) => row) };
    }).rows;
  }
  log(`notice triage ${key} at the merge: ${clear.length} of ${owed.length} not affected (no file imports ${notice.provider}), answered${left.length ? `; ${left.length} import it and owe a worker's judgment: ${left.join(', ')}` : ''}`);
  const next = left.length ? `next act: ${P3} notice triage ${key} (${left.length} module${left.length === 1 ? '' : 's'}: a read-only worker judges them now, not in a later batch)` : null;
  const wake = next && as !== 'bob' ? wakeLine(`notice ${key} owes triage of ${left.length}: ${P3} notice triage ${key}, then status`, as) : null;
  if (next) log(wake || next);
  return { rows, owed: left, next: wake || next };
}

// The users that provably import nothing of the provider at sha (confirming review of PR 100: the
// brief's grep pre-filter may miss an import, which is harmless in a brief, not in a verdict).
// Every code file under each user's paths that mentions import, require or from is read, and an
// import counts as the gate's imports check counts it (the joined path's owner) or as the brief's
// resolution does. Nothing is cleared when the provider has no modules-file entry or a path of
// `.`, when git grep fails, for a user with no entry, no paths or no id line, or for a user whose
// job branch on origin holds commits sha lacks (an open attempt may be adding the import).
export function importFree(root, cfg, users, sha, provider) {
  let modules = [];
  try { modules = JSON.parse((exists(root, sha, cfg.modules_file) ? git(['show', `${sha}:${cfg.modules_file}`], { cwd: root }) : null) || '{}').modules || []; } catch { return []; }
  if (!Array.isArray(modules)) return [];
  const prov = modules.find((m) => m?.id === provider);
  const provPaths = (prov?.paths || []).map((p) => String(p).replace(/\/$/, ''));
  if (!provPaths.length || provPaths.some((p) => p === '.' || p === '')) return [];
  const text = git(['show', `${sha}:${cfg.modules_file}`], { cwd: root, allowFail: true }).stdout.split('\n');
  const all = new Set(git(['ls-tree', '-r', '--name-only', '-z', sha], { cwd: root }).split('\0').filter(Boolean));
  const inProvider = (f) => !!f && ownerOf(modules, f)?.id === provider;
  const heads = new Map(git(['ls-remote', '--heads', 'origin', 'refs/heads/job/*'], { cwd: root, allowFail: true }).stdout.split('\n').filter(Boolean).map((l) => { const [h, r] = l.split('\t'); return [r.replace(/^refs\/heads\//, ''), h]; }));
  const settled = (u) => {
    const h = heads.get(`job/${u}`);
    if (!h) return true;
    return git(['merge-base', '--is-ancestor', h, sha], { cwd: root, allowFail: true }).code === 0;
  };
  const out = [];
  for (const u of users) {
    const m = modules.find((x) => x?.id === u);
    const paths = m?.paths || [];
    const i = text.findIndex((l) => new RegExp(`"id"\\s*:\\s*"${u.replace(/[-]/g, '\\-')}"`).test(l));
    if (!paths.length || i < 0 || !settled(u)) continue;
    const g = git(['grep', '-l', '-z', '-E', '-e', 'import|require|from', sha, '--', ...paths], { cwd: root, allowFail: true });
    if (g.code !== 0 && g.code !== 1) continue;
    const files = (g.code === 0 ? g.stdout.split('\0').filter(Boolean) : []).map((f) => f.slice(sha.length + 1)).filter((f) => CODE_FILE.test(f) && !inProvider(f) && ownerOf(modules, f)?.id === u);
    let hit = false;
    for (const f of files) {
      const t = git(['show', `${sha}:${f}`], { cwd: root, allowFail: true });
      if (t.code !== 0) { hit = true; break; }
      if (specifiers(t.stdout).some(({ spec }) => inProvider(resolveSpec(f, spec, (x) => all.has(x))) || (spec.startsWith('.') && inProvider(normalize(join(dirname(f), spec)))))) { hit = true; break; }
    }
    if (!hit) out.push({ id: u, paths, line: i + 1 });
  }
  return out;
}
