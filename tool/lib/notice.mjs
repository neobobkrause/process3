// The provider-change route (Build Plan Phase 3, GAT-3): a merged job that changed its module's
// requirement file (marks struck, requirements added or reworded) leaves a provider notice on the
// state branch for each user module the modules file (`modules_file`, `uses`) names. The user's own
// next job answers it, with a test of its own: the notice is answered when that job merges.
import { fetchState, readState, writeState } from './state.mjs';
import { exists, git } from './util.mjs';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const noticeKey = (provider, pr) => `${provider}:${pr}`;

// A requirement is a line holding `**R<id>**`; its text is the line. Changed: added, reworded,
// struck (striking rewrites the line) or removed.
const REQ = /\*\*(R[\w.-]+)\*\*/;
const reqLines = (text) => new Map(String(text || '').split('\n').map((l) => [l.match(REQ)?.[1], l.trim()]).filter(([id]) => id));
export function changedIds(before, after) {
  const a = reqLines(before);
  const b = reqLines(after);
  return [...new Set([...a.keys(), ...b.keys()])].filter((id) => a.get(id) !== b.get(id)).sort();
}

// The modules that name the provider in their `uses`, from the modules file at ref (or the
// working tree); none without a modules file.
export function usersOf(root, cfg, provider, ref = null) {
  const f = cfg.modules_file;
  if (!f) return [];
  let text = null;
  if (ref) text = exists(root, ref, f) ? git(['show', `${ref}:${f}`], { cwd: root }) : null;
  else if (existsSync(join(root, f))) text = readFileSync(join(root, f), 'utf8');
  let modules = [];
  try { modules = JSON.parse(text || '{}').modules || []; } catch { modules = []; }
  return modules.filter((m) => m?.id && m.id !== provider && (m.uses || []).includes(provider)).map((m) => m.id).sort();
}

// The notice a merged job leaves, or null: its requirement file between base and head.
// The users are read at usersAt, the merged result (the tranche may have gained a user).
export function providerNotice(root, cfg, { provider, requirements, base, head, pr, usersAt = head }) {
  const at = (ref) => git(['show', `${ref}:${requirements}`], { cwd: root, allowFail: true }).stdout;
  const ids = changedIds(at(base), at(head));
  const users = ids.length ? usersOf(root, cfg, provider, usersAt) : [];
  return users.length ? { key: noticeKey(provider, pr), provider, ids, pr, users } : null;
}

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

// Every notice with the users that have not answered it, as the fetched state branch holds them.
export function notices(root, sb) {
  const answered = new Set(listJson(root, sb, `${NOTICES_DIR}/answered`).map((r) => `${r.key}\0${r.user}`));
  return listJson(root, sb, NOTICES_DIR).filter((r) => r.row === 'notice').sort((a, b) => a.pr - b.pr)
    .map((n) => ({ ...n, open: n.users.filter((u) => !answered.has(`${n.key}\0${u}`)) }));
}
export const unanswered = (root, sb, user) => notices(root, sb).filter((n) => n.open.includes(user));
export const noticeLine = (n) => `provider notice: ${n.provider} ${n.ids.join(', ')} (PR ${n.pr})`;

// At a job's merge: the notice it leaves, and the notices its START named, answered by it. One
// write; a file already there is kept, so a rerun adds nothing.
export function recordAtMerge(root, cfg, { notice, answers = [], user, pr }) {
  const at = new Date().toISOString();
  const want = [
    ...(notice ? [[noticeFile(notice.key), { row: 'notice', at, ...notice }]] : []),
    ...answers.map((key) => [answerFile(user, key), { row: 'answered', at, key, user, pr }]),
  ];
  if (!want.length) return { rows: [] };
  const sb = cfg.state_branch;
  const missing = (has) => want.filter(([f]) => !has(f));
  if (fetchState(root, sb, { fresh: true }) && !missing((f) => readState(root, sb, f) !== null).length) return { rows: [] };
  return writeState(root, sb, `provider notices at the merge of PR ${pr}`, (wt) => {
    const add = missing((f) => existsSync(join(wt, f)));
    for (const [f, row] of add) {
      mkdirSync(dirname(join(wt, f)), { recursive: true });
      writeFileSync(join(wt, f), JSON.stringify(row) + '\n');
    }
    return { rows: add.map(([, row]) => row) };
  });
}
