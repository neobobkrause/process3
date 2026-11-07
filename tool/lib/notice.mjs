// The provider-change route (Build Plan Phase 3, GAT-3): a merged job that changed its module's
// requirement file (marks struck, requirements added or reworded) leaves a provider notice on the
// state branch for each user module the modules file (`modules_file`, `uses`) names. The user's own
// next job answers it, with a test of its own: the notice is answered when that job merges.
// Only a job that changed the provider's own source leaves one (coordinator, 4 Nov: on the copy,
// membership PR 77 notified 108 users and credentials PR 74 39, for changes only to tests and
// requirement marks, which cannot alter any user's behaviour).
import { anyExportChange, exportChanges } from './exports.mjs';
import { entryFile } from './ledger.mjs';
import { metricsFile } from './metrics.mjs';
import { fetchState, readState, writeState } from './state.mjs';
import { compare } from './github.mjs';
import { diffNames } from './gate.mjs';
import { exists, fail, git, isRecordPath, isShallow, requirementBlocks, underPath } from './util.mjs';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';

export const noticeKey = (provider, pr) => `${provider}:${pr}`;

// A requirement is a line holding `**R<id>**` anywhere (the copy's ooxml writes `- \`fn\` — **R1** ...`);
// its text is the line, and for a requirement line with sub-lines, the line and its sub-lines (util's
// requirementBlocks, C24: a mark struck or retired on a sub-line, as record-core R92's Control line,
// is a change of that requirement). Changed: added, reworded, struck or removed.
const REQ = /\*\*(R[\w.-]+)\*\*/;
const reqLines = (text) => {
  const m = new Map(String(text || '').split('\n').map((l) => [l.match(REQ)?.[1], l.trim()]).filter(([id]) => id));
  for (const b of requirementBlocks(text)) if (/^R/.test(b.id)) m.set(b.id, b.text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join('\n'));
  return m;
};
export function changedIds(before, after) {
  const a = reqLines(before);
  const b = reqLines(after);
  return [...new Set([...a.keys(), ...b.keys()])].filter((id) => a.get(id) !== b.get(id)).sort();
}

// A requirement retired in a split: its line now carries a `*(retired: ...)*` mark it did not
// carry before. A retirement moves the requirement and changes no behaviour, so it notifies no
// user (coordinator, 4 Nov: instance-setup's split notified 17 modules of 28 retired ids).
const RETIRED = /\*\(retired\b[^)]*\)\*/i;
export function retiredIds(before, after, ids) {
  const a = reqLines(before);
  const b = reqLines(after);
  return ids.filter((id) => RETIRED.test(b.get(id) || '') && !RETIRED.test(a.get(id) || ''));
}

// The modules file (`modules_file`) at ref (or the working tree): its modules, [] when unread;
// null without a modules file configured or present.
export function readModules(root, cfg, ref = null) {
  const f = cfg.modules_file;
  if (!f) return null;
  let text = null;
  if (ref) text = exists(root, ref, f) ? git(['show', `${ref}:${f}`], { cwd: root }) : null;
  else if (existsSync(join(root, f))) text = readFileSync(join(root, f), 'utf8');
  if (text === null) return null;
  try { const m = JSON.parse(text || '{}').modules; return Array.isArray(m) ? m : []; } catch { return []; }
}

// The modules that name the provider in their `uses`, from the modules file at ref (or the
// working tree); none without a modules file.
export function usersOf(root, cfg, provider, ref = null) {
  const modules = readModules(root, cfg, ref) || [];
  return modules.filter((m) => m?.id && m.id !== provider && (m.uses || []).includes(provider)).map((m) => m.id).sort();
}

// The provider module's own source: a file under the entry's paths that is not under its tests,
// not its requirements file, entry or metrics, not a doc (Markdown, or under a docs/ directory)
// and not a record (`records`). A change to any other file cannot alter a user's behaviour.
const isDoc = (f) => /\.(md|markdown)$/i.test(f) || /(^|\/)docs\//.test(f);
export function isSource(cfg, e, f) {
  if (!(e.paths || []).some((p) => underPath(f, p))) return false;
  if ((e.tests || []).some((p) => underPath(f, p))) return false;
  if (f === e.requirements || f === entryFile(e.id) || f === metricsFile(e.id)) return false;
  return !isDoc(f) && !isRecordPath(cfg, f);
}
// The entry's source paths, as a line names them: its paths less tests, requirements, docs, records.
export const sourcePaths = (cfg, e) => (e.paths || []).filter((p) => !(e.tests || []).some((t) => underPath(p, t)) && p !== e.requirements && !isDoc(p) && !isRecordPath(cfg, p));
export const sourceChanges = (root, cfg, e, base, head) => diffNames(root, base, head).filter((f) => isSource(cfg, e, f));
const readEntry = (root, ref, id) => {
  const t = git(['show', `${ref}:${entryFile(id)}`], { cwd: root, allowFail: true });
  try { return t.code === 0 ? JSON.parse(t.stdout) : null; } catch { return null; }
};

// The notice a merged job leaves, or null, and why not. A job that changed a file of the provider's
// own source (the entry at base) leaves one whether or not its requirement file changed
// (coordinator, 4 Nov: ai-accounts' T53 rewrite changed its exported interface with no mark
// changed, and four users broke unwarned); it names the changed requirement ids and the export
// names added, removed or changed (exports.mjs). A job that changed only tests, requirements text,
// docs or records leaves none. With no entry readable, a requirement change still counts, so a
// notice is never lost to a bad read. The users are read at usersAt, the merged result (the
// tranche may have gained a user).
export function providerChange(root, cfg, { provider, requirements, base, head, pr, usersAt = head, entry }) {
  const at = (ref) => (requirements ? git(['show', `${ref}:${requirements}`], { cwd: root, allowFail: true }).stdout : '');
  const [was, now] = [at(base), at(head)];
  const changed = changedIds(was, now);
  const retired = retiredIds(was, now, changed);
  const ids = changed.filter((id) => !retired.includes(id));
  const left = retired.length ? `left out ${retired.length} retired id(s), which change no behaviour: ${retired.join(', ')}` : null;
  const e = entry || readEntry(root, base, provider);
  const src = e ? sourceChanges(root, cfg, e, base, head) : [];
  if (!ids.length && !src.length) return { notice: null, why: retired.length ? `PR ${pr} only retired requirements (${retired.join(', ')}), which change no behaviour` : null, retired };
  const users = usersOf(root, cfg, provider, usersAt);
  if (!users.length) return { notice: null, why: null, retired };
  if (e && !src.length) {
    return { notice: null, retired, why: `PR ${pr} changed ${ids.join(', ')} but no file of ${provider}'s source (${sourcePaths(cfg, e).join(', ') || 'no source paths'}): only tests, requirements text, docs or records, which cannot change a user's behaviour; no notice for its ${users.length} user(s)` };
  }
  const notice = { key: noticeKey(provider, pr), provider, ids, pr, users };
  if (src.length) {
    notice.source = src.length;
    try {
      const x = exportChanges(root, base, head, { isProviderSource: (f) => isSource(cfg, e, f), inProvider: (f) => [...(e.paths || []), ...(e.tests || [])].some((p) => underPath(f, p)), providerPaths: sourcePaths(cfg, e) });
      if (anyExportChange(x)) notice.exports = x;
    } catch (err) { notice.exports_unread = String(err.message || err).slice(0, 200); }
  }
  return { notice, why: null, retired, left };
}
export const providerNotice = (root, cfg, opts) => providerChange(root, cfg, opts).notice;

// One file per write, added and never edited (REC-2's one writer, as messages/<sender>.jsonl):
// two merges close together never conflict. notices/<provider>-<pr>.json, and
// notices/answered/<user>-<provider>-<pr>.json.
export const NOTICES_DIR = 'notices';
const fileOf = (key) => key.replace(':', '-');
export const noticeFile = (key) => `${NOTICES_DIR}/${fileOf(key)}.json`;
export const answerFile = (user, key) => `${NOTICES_DIR}/answered/${user}-${fileOf(key)}.json`;
const listJson = (root, sb, dir) => {
  const r = git(['ls-tree', '--name-only', '-z', `refs/remotes/origin/${sb}:${dir}`], { cwd: root, allowFail: true });
  if (r.code !== 0) return [];
  return r.stdout.split('\0').filter((f) => f.endsWith('.json')).flatMap((f) => { try { return [JSON.parse(readState(root, sb, `${dir}/${f}`))]; } catch { return []; } });
};

export const WITHDRAWN_DIR = `${NOTICES_DIR}/withdrawn`;
export const withdrawFile = (key) => `${WITHDRAWN_DIR}/${fileOf(key)}.json`;

// The keys of withdrawn notices, as the fetched state branch holds them.
export const withdrawnRows = (root, sb) => listJson(root, sb, WITHDRAWN_DIR).filter((r) => r.row === 'withdrawn' && typeof r.key === 'string');
export const withdrawnKeys = (root, sb) => new Set(withdrawnRows(root, sb).map((r) => r.key));
// Every notice the state branch holds, live or withdrawn, with its unanswered users: the one reader
// behind notices (the live ones), triage, status and report tranche's count (coordinator, 4 Nov: a
// count of notices/*.json read apart from the withdrawn rows called 136 withdrawn slots open on the
// copy, which triage then could not find). A withdrawn notice carries its withdrawal row: closed,
// owing nothing, its unanswered users counted as closed by the withdrawal.
export function noticeRecords(root, sb) {
  const answered = new Set(listJson(root, sb, `${NOTICES_DIR}/answered`).map((r) => `${r.key}\0${r.user}`));
  const withdrawn = new Map(withdrawnRows(root, sb).map((r) => [r.key, r]));
  return listJson(root, sb, NOTICES_DIR).filter((r) => r.row === 'notice' && typeof r.key === 'string' && Array.isArray(r.users)).sort((a, b) => a.pr - b.pr)
    .map((n) => ({ ...n, open: n.users.filter((u) => !answered.has(`${n.key}\0${u}`)), withdrawn: withdrawn.get(n.key) || null }));
}

// Every notice with the users that have not answered it, as the fetched state branch holds them;
// a withdrawn notice (notice withdraw) is no notice.
export const notices = (root, sb) => noticeRecords(root, sb).filter((n) => !n.withdrawn).map(({ withdrawn, ...n }) => n);
export const unanswered = (root, sb, user) => notices(root, sb).filter((n) => n.open.includes(user));
// What a notice says moved: its requirement ids (or its source, when none changed), and its export
// names removed, changed and added, at most `max` of each named.
const few = (xs, max) => (xs.length > max ? `${xs.slice(0, max).join(', ')} and ${xs.length - max} more` : xs.join(', '));
export function exportsText(x, max = 8) {
  if (!x) return '';
  return [['removed', x.removed], ['changed', (x.changed || []).map((c) => c.name)], ['added', x.added]]
    .filter(([, xs]) => xs?.length).map(([w, xs]) => `${w} ${few(xs, max)}`).join('; ');
}
export const movedText = (n, max = 8) => [n.ids?.length ? n.ids.join(', ') : 'its source, no requirement text', n.exports ? `exports ${exportsText(n.exports, max)}` : ''].filter(Boolean).join('; ');
export const noticeLine = (n) => `provider notice: ${n.provider} ${movedText(n)} (PR ${n.pr})`;

// At a job's merge: the notice it leaves, and the notices its START named, answered by it. One
// write; a file already there is kept, so a rerun adds nothing.
// The answers come from the job's own start row, which the job can edit: only a key of a notice
// the state branch holds for this user is answered (confirming review of PR 54), and no file
// lands outside notices/ (a key such as "a/../../x" would otherwise reach past the worktree).
export function recordAtMerge(root, cfg, { notice, answers = [], user, pr }) {
  const at = new Date().toISOString();
  const sb = cfg.state_branch;
  const have = fetchState(root, sb, { fresh: true });
  if (answers.length) {
    const known = new Set(have ? notices(root, sb).filter((n) => n.users.includes(user)).map((n) => n.key) : []);
    answers = [...new Set(answers)].filter((k) => typeof k === 'string' && known.has(k));
  }
  const want = [
    ...(notice ? [[noticeFile(notice.key), { row: 'notice', at, ...notice }]] : []),
    ...answers.map((key) => [answerFile(user, key), { row: 'answered', at, key, user, pr }]),
  ];
  if (!want.length) return { rows: [] };
  const missing = (has) => want.filter(([f]) => !has(f));
  if (have && !missing((f) => readState(root, sb, f) !== null).length) return { rows: [] };
  return writeState(root, sb, `provider notices at the merge of PR ${pr}`, (wt) => {
    const dir = resolve(wt, NOTICES_DIR) + sep;
    for (const [f] of want) if (!resolve(wt, f).startsWith(dir)) throw new Error(`refused: ${f} is outside ${NOTICES_DIR}/`);
    const add = missing((f) => existsSync(join(wt, f)));
    for (const [f, row] of add) {
      mkdirSync(dirname(join(wt, f)), { recursive: true });
      writeFileSync(join(wt, f), JSON.stringify(row) + '\n');
    }
    return { rows: add.map(([, row]) => row) };
  });
}

// A merged pull request's range as GitHub merged it: the merge commit m, the job's head m^2, and
// the merge base of m's two parents. A shallow clone fetched m at depth 50 and asked git for the
// base, which died once the base lay 50 or more commits back on either side (defect sweep 4 Nov,
// #8). Now a shallow clone fetches m and its parents (depth 2), takes the base from GitHub's
// compare (merge_base_commit) and fetches it at depth 1: only the trees at the base and m^2 are
// read. A full clone asks git. `what` ends the refusals ("what it changed cannot be read").
export function mergedRange(root, m, { slug, n, what = 'what it changed cannot be read', read = compare } = {}) {
  const has = (rev) => git(['rev-parse', '-q', '--verify', `${rev}^{commit}`], { cwd: root, allowFail: true }).code === 0;
  const shallow = isShallow(root);
  if (!has(`${m}^1`)) git(['fetch', '-q', ...(shallow ? ['--depth=2'] : []), 'origin', m], { cwd: root, allowFail: true });
  if (!has(m)) fail(`pull request ${n} merged at ${m.slice(0, 10)}, which could not be fetched; ${what}`);
  const head = git(['rev-parse', `${m}^2`], { cwd: root, allowFail: true });
  if (head.code !== 0) fail(`pull request ${n} merged at ${m.slice(0, 10)}, which is not a merge commit; ${what}`);
  const h = head.stdout.trim();
  const p1 = git(['rev-parse', `${m}^1`], { cwd: root });
  if (!shallow) {
    const mb = git(['merge-base', p1, h], { cwd: root, allowFail: true });
    if (mb.code !== 0) fail(`pull request ${n}: no merge base of ${p1.slice(0, 10)} and ${h.slice(0, 10)}; ${what}`);
    return { head: h, mb: mb.stdout.trim() };
  }
  const sha = slug ? read(slug, p1, h)?.merge_base_commit?.sha : null;
  if (!/^[0-9a-f]{40,64}$/.test(sha || '')) fail(`this clone is shallow and GitHub did not give the merge base of pull request ${n} (${p1.slice(0, 10)} and ${h.slice(0, 10)}); ${what}; run it again`);
  if (!has(sha)) git(['fetch', '-q', '--depth=1', 'origin', sha], { cwd: root, allowFail: true });
  if (!has(sha)) fail(`this clone is shallow and could not fetch the merge base ${sha.slice(0, 10)} of pull request ${n}; ${what}; run it again`);
  return { head: h, mb: sha };
}

// notice withdraw <provider>:<pr>: BOB's act, for a notice recorded before merge held the source
// rule. The tool reads the PR's merge commit (as merge run again on a merged pull request does)
// and refuses unless the PR changed no file of the provider's own source; then one file on the
// state branch, added and never edited, and status drops the notice.
export function withdrawNotice(root, cfg, key, { getPR, slug, as = 'bob', log = console.log, compare: compareRead = compare }) {
  const sb = cfg.state_branch;
  if (!fetchState(root, sb, { fresh: true })) fail(`no ${sb} on origin: no provider notice ${key}`);
  const n = notices(root, sb).find((x) => x.key === key);
  if (!n) fail(readState(root, sb, withdrawFile(key)) !== null ? `provider notice ${key} is already withdrawn` : `no provider notice ${key} on ${sb} (${noticeFile(key)})`);
  const pr = getPR(slug, n.pr);
  const m = pr?.merge_commit_sha;
  if (!pr?.merged || !m) fail(`pull request ${n.pr} is not merged: what it changed cannot be read`);
  const { head: h, mb } = mergedRange(root, m, { slug, n: n.pr, read: compareRead });
  const e = readEntry(root, mb, n.provider);
  if (!e) fail(`the tranche had no ledger entry for ${n.provider} at ${mb.slice(0, 10)}: its source paths cannot be read`);
  const src = sourceChanges(root, cfg, e, mb, h);
  if (src.length) fail(`refused: pull request ${n.pr} changed ${src.length} file(s) of ${n.provider}'s source (${src.slice(0, 5).join(', ')}); provider notice ${key} stands`);
  const row = { row: 'withdrawn', at: new Date().toISOString(), key, provider: n.provider, pr: n.pr, merge_commit: m, by: as,
    why: `PR ${n.pr} changed no file of ${n.provider}'s source (${sourcePaths(cfg, e).join(', ') || 'no source paths'})`, users: n.users.length };
  writeState(root, sb, `withdraw provider notice ${key}`, (wt) => {
    const f = join(wt, withdrawFile(key));
    if (!resolve(f).startsWith(resolve(wt, NOTICES_DIR) + sep)) throw new Error(`refused: ${withdrawFile(key)} is outside ${NOTICES_DIR}/`);
    mkdirSync(dirname(f), { recursive: true });
    if (!existsSync(f)) writeFileSync(f, JSON.stringify(row) + '\n');
    return {};
  });
  log(`provider notice ${key} withdrawn: ${row.why}; ${n.open.length} unanswered user(s) no longer owe it`);
  return row;
}
