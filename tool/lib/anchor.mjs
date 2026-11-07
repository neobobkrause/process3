// The config's anchored keys (merge --plain, and the gate at the first close): where the process
// comes from (process_repo), which branch is the tranche, and the approvals (their file, heading
// and owner). A change to any of them needs the owner's word: either it is unchanged from the
// base, or it took its value at the owner's own commit through GitHub's website. The owner who
// judges is always the base's (or, at the first close, the tool's default), never the head's.
import { CONFIG_FILE, DEFAULTS, git, parseJSON } from './util.mjs';

export const ANCHORED = ['process_repo', 'tranche', 'approvals'];

export const blobAt = (root, rev, path) => {
  const r = git(['rev-parse', '-q', '--verify', `${rev}:${path}`], { cwd: root, allowFail: true });
  return r.code === 0 ? r.stdout.trim() : null;
};
export const pinAt = (root, rev) => git(['ls-tree', rev, '--', '.process'], { cwd: root }).match(/^160000 commit ([0-9a-f]{40})\t/)?.[1] || null;

// A config key at a commit: 'unreadable' when the file is not a JSON object. The tranche's name
// counts as its default when the config does not name it; the approvals as loadConfig reads them
// (the defaults with the file's keys over them), as text, so two equal blocks compare equal.
// A key twice in one object reads as unreadable (util.mjs duplicateKey). rev may be a tree.
export const keyAt = (root, rev, key) => {
  const r = git(['show', `${rev}:${CONFIG_FILE}`], { cwd: root, allowFail: true });
  let c = null;
  if (r.code === 0) { try { c = parseJSON(r.stdout); } catch { return 'unreadable'; } if (!c || typeof c !== 'object' || Array.isArray(c)) return 'unreadable'; }
  if (key === 'approvals') return JSON.stringify({ ...DEFAULTS.approvals, ...(c?.approvals || {}) });
  const v = c?.[key] ?? null;
  return key === 'tranche' && v === null ? DEFAULTS.tranche : v;
};

// The commit on rev's first-parent history at which a config key took the value it has at rev:
// the newest first-parent commit whose first parent holds another value (or that has none).
export function keySetAt(root, rev, key) {
  const value = keyAt(root, rev, key);
  // Only a commit that changes the file against its first parent can change the value.
  const touched = git(['log', '--first-parent', '--full-history', '--format=%H', rev, '--', CONFIG_FILE], { cwd: root }).split('\n').filter(Boolean);
  for (const c of touched) if (keyAt(root, `${c}^1`, key) !== value) return c;
  return null;
}

// The first anchored key whose value at sha is not its value at base (by base's last config,
// lastConfigAt, so a deleted config is still the one judged against) and did not take it at a
// commit ownerCommit(sha) -> { ok } calls the owner's website commit; null when every key holds.
// ownerCommit null: no change is accepted. tip: the base's tip; an owner's commit already in
// it was superseded there (its value is not the base's now), so it grants nothing: a session
// cannot restore a value the owner later replaced (review 1 of PR 97).
export function unanchored(root, base, sha, ownerCommit, tip = base) {
  const was = lastConfigAt(root, base) || base;
  for (const key of ANCHORED) {
    const value = keyAt(root, sha, key);
    if (value === keyAt(root, was, key)) continue;
    if (ownerCommit && typeof value === 'string' && value !== 'unreadable') {
      const c = keySetAt(root, sha, key);
      const inBase = c && git(['merge-base', '--is-ancestor', c, tip], { deepen: true, cwd: root, allowFail: true }).code === 0;
      if (c && !inBase && ownerCommit(c)?.ok === true) continue;
    }
    return key;
  }
  return null;
}

// The newest commit on rev's first-parent history that holds the config: rev itself, or, when a
// later commit deleted it, the last one that had it (a main that deleted its config is judged by
// its last one, never as a first close). First-parent only: in date order a session's side
// branch, dated ahead, would choose which config counts (confirming review of PR 97). null when
// no commit the clone holds ever had one.
export function lastConfigAt(root, rev) {
  if (blobAt(root, rev, CONFIG_FILE)) return rev;
  const touched = git(['log', '--first-parent', '--full-history', '--format=%H', rev, '--', CONFIG_FILE], { cwd: root, allowFail: true }).stdout?.split('\n').filter(Boolean) || [];
  return touched.find((c) => blobAt(root, c, CONFIG_FILE)) || null;
}

// The first close (bootstrap): a base that holds no pin and whose history never held the config.
export const isBootstrap = (root, baseRef) => !lastConfigAt(root, baseRef) && !pinAt(root, baseRef);

// The anchored keys as GitHub's merge would leave them: the base's tip merged with sha, as git
// merges it (merge-tree). Each pull request is judged head against merge base, but what lands is
// a line-by-line merge, and two changes judged alone can compose into a value neither holds, or
// undo the owner's later change on the base (second confirming review of PR 97). So each key in
// the merge must be the head's when the head changes it (judged by unanchored), else the base
// tip's. Returns why not, or null.
export function mergedUnanchored(root, tip, mb, sha) {
  const r = git(['merge-tree', '--write-tree', tip, sha], { cwd: root, allowFail: true });
  if (r.code !== 0) return `it does not merge cleanly with the base as it is`;
  const tree = r.stdout.split('\n')[0].trim();
  // The base's value is the base tip's own (a base that deleted its config blocks nothing that
  // leaves it deleted: third confirming review of PR 97).
  if (blobAt(root, tip, CONFIG_FILE) && !blobAt(root, tree, CONFIG_FILE)) return `merged with the base as it is, it would delete ${CONFIG_FILE}`;
  const from = lastConfigAt(root, mb) || mb;
  for (const key of ANCHORED) {
    const head = keyAt(root, sha, key);
    const want = head !== keyAt(root, from, key) ? head : keyAt(root, tip, key);
    if (keyAt(root, tree, key) !== want) return `merged with the base as it is, it would leave ${key} in ${CONFIG_FILE} at neither the base's value nor the head's judged one`;
  }
  return null;
}
