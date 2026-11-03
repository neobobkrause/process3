// The provider-change route (Build Plan Phase 3, GAT-3): a merged job that changed its module's
// requirement file (marks struck, requirements added or reworded) leaves a provider notice on the
// state branch for each user module the modules file (`modules_file`, `uses`) names. The user's own
// next job answers it, with a test of its own: the notice is answered when that job merges.
import { fetchState, jsonl, readState, writeState } from './state.mjs';
import { exists, git } from './util.mjs';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const NOTICES_FILE = 'notices/provider.jsonl';
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
export function providerNotice(root, cfg, { provider, requirements, base, head, pr }) {
  const at = (ref) => git(['show', `${ref}:${requirements}`], { cwd: root, allowFail: true }).stdout;
  const ids = changedIds(at(base), at(head));
  const users = ids.length ? usersOf(root, cfg, provider, head) : [];
  return users.length ? { key: noticeKey(provider, pr), provider, ids, pr, users } : null;
}

// Every notice with the users that have not answered it, as the fetched state branch holds them.
export function notices(root, sb) {
  const rows = jsonl(readState(root, sb, NOTICES_FILE));
  const answered = new Set(rows.filter((r) => r.row === 'answered').map((r) => `${r.key}\0${r.user}`));
  return rows.filter((r) => r.row === 'notice').map((n) => ({ ...n, open: n.users.filter((u) => !answered.has(`${n.key}\0${u}`)) }));
}
export const unanswered = (root, sb, user) => notices(root, sb).filter((n) => n.open.includes(user));
export const noticeLine = (n) => `provider notice: ${n.provider} ${n.ids.join(', ')} (PR ${n.pr})`;

// At a job's merge: the notice it leaves, and the notices its START named, answered by it. One
// write, rows already there skipped, so a rerun adds nothing.
export function recordAtMerge(root, cfg, { notice, answers = [], user, pr }) {
  if (!notice && !answers.length) return { rows: [] };
  const rowsFor = (have) => {
    const at = new Date().toISOString();
    return [
      ...(notice && !have.some((r) => r.row === 'notice' && r.key === notice.key) ? [{ row: 'notice', at, ...notice }] : []),
      ...answers.filter((key) => !have.some((r) => r.row === 'answered' && r.key === key && r.user === user)).map((key) => ({ row: 'answered', at, key, user, pr })),
    ];
  };
  const sb = cfg.state_branch;
  if (fetchState(root, sb, { fresh: true }) && !rowsFor(jsonl(readState(root, sb, NOTICES_FILE))).length) return { rows: [] };
  return writeState(root, sb, `provider notices at the merge of PR ${pr}`, (wt) => {
    const file = join(wt, NOTICES_FILE);
    const prev = existsSync(file) ? readFileSync(file, 'utf8') : '';
    const add = rowsFor(jsonl(prev));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, prev + add.map((r) => JSON.stringify(r) + '\n').join(''));
    return { rows: add };
  });
}
