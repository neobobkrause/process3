// The merge train's order and its provider hold (coordinator, 5 Nov; notes/train-throughput-study.md,
// option B and the provider-first addendum). Serial still, one gate per pull request, the gate
// unchanged: this only chooses which green pull request goes next, and which waits.
//
// Order: a module named in process/config.json's release_path goes first of all (coordinator, 5 Nov
// 11:20: on the copy the derived release set was 50 modules, so release first ordered almost
// nothing). Among the named, and then among the rest, the order is as before: a pull request green
// (and not held) for over AGE_MIN goes first, oldest first, so a long gate is never starved within
// its tier (a stream of named pull requests can delay the rest). The rest: the release path first (status.mjs releaseModules), then a
// provider holding users ahead of shorter ones (most held first), then the shortest expected gate
// (its module's median full-gate minutes; unknown: the median over every module known), then the
// oldest green.
//
// Provider first, the precise edge (the addendum: a blanket hold on `uses` held 41 of 45): user
// PR U waits for open provider PR P only when (a) P is in U's direct `uses` and P does not reach
// U through `uses` (a cycle holds nothing); (b) P's diff changes P's export surface
// (exports.mjs exportChanges, the provider-notice test); (c) U's changed code files import from P
// (ARC-1's resolution, checks.mjs ownerOf); and (d) P is not red: a provider whose gate is red on
// its head holds nothing, so a red provider never holds its users for good (a user is green on its
// own and lands as its gate tested it); nor does one that cannot land on its head (its gate ended
// other than green, or the train refused it or is backing off it: train.mjs). A draft provider holds. Anything unread (a branch not
// fetched, a surface unreadable) holds nothing and says so: the train never stalls on a read.
// BOB's draft mark stays the manual hold.
import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import { anyExportChange, exportChanges, unreadCount } from './exports.mjs';
import { ownerOf, specifiers } from './checks.mjs';
import { isSource, sourcePaths } from './notice.mjs';
import { entryFile } from './ledger.mjs';
import { exists, git, underPath } from './util.mjs';

export const AGE_MIN = 45;
const CODE = /\.(m|c)?(j|t)sx?$/;
export const median = (xs) => { const s = xs.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };

// The modules' `uses` and whether one reaches another through them (status.mjs waitsOnUses' test).
export function usesGraph(modules) {
  const usesOf = new Map((modules || []).filter((x) => x?.id && Array.isArray(x.uses)).map((x) => [x.id, x.uses]));
  const reaches = (from, to, seen = new Set()) => from === to || (!seen.has(from) && (seen.add(from), (usesOf.get(from) || []).some((x) => reaches(x, to, seen))));
  return { usesOf, reaches };
}

// Holds: for each candidate (a green pull request { n, id, head }), the open provider pull requests
// it waits for. jobs: every open job pull request into the tranche ({ n, id, head, draft }), drafts
// and gates running included. The checks are given: red(P), exportsChanged(P), importsFrom(U, P),
// each true, false, or throwing (unread: no hold, noted).
export function providerHolds(cands, jobs, { usesOf, reaches, red, exportsChanged, importsFrom, note = () => {} }) {
  const byId = new Map();
  for (const j of jobs) byId.set(j.id, [...(byId.get(j.id) || []), j]);
  const out = new Map();
  for (const u of cands) {
    const why = [];
    for (const pid of usesOf.get(u.id) || []) for (const p of byId.get(pid) || []) {
      if (pid === u.id || p.n === u.n || reaches(pid, u.id)) continue;
      try {
        // The git reads first (cached by head), GitHub's gate read only for an edge that holds.
        if (!exportsChanged(p)) continue;
        if (!importsFrom(u, p)) continue;
        if (red(p)) continue;
      } catch (e) { note(`PR ${u.n} (${u.id}) is not held for provider ${pid} (PR ${p.n}): ${String(e.message || e).split('\n')[0].slice(0, 160)}`); continue; }
      why.push({ provider: pid, pr: p.n, draft: !!p.draft });
    }
    if (why.length) out.set(u.n, why);
  }
  return out;
}
export const holdLine = (u, why) => `PR ${u.n} (${u.id}) held: it imports ${why.map((w) => `${w.provider}, whose open PR ${w.pr}${w.draft ? ' (draft)' : ''} changes its exports`).join('; ')}; it goes once ${why.length === 1 ? 'that provider merges' : 'those providers merge'}`;

// Aged from max(green_at, the last time it was held: heldAt, by number): a held pull request's
// wait does not age it. An unread green time is NaN: never aged.
export const agedFromOf = (heldAt) => (u) => { const g = Date.parse(u.green_at); return Number.isFinite(g) ? Math.max(g, heldAt.get(u.n) || 0) : NaN; };

// The queue's order. c: { n, id, green_at, named (its module is in release_path), release (in the
// derived release set, status.mjs releaseModules), holds (users it holds), gate_min }. known: the
// expected gate for an unknown one, the median over every module known (the train gives it);
// without it, the median over this queue.
export function orderQueue(cands, { now = Date.now(), ageMin = AGE_MIN, agedFrom = (c) => Date.parse(c.green_at), known = median(cands.map((c) => c.gate_min)) } = {}) {
  const exp = (c) => (Number.isFinite(c.gate_min) ? c.gate_min : known ?? 0);
  const aged = (c) => { const t = agedFrom(c); return Number.isFinite(t) && now - t > ageMin * 60000; };
  const g = (c) => String(c.green_at);
  return [...cands].sort((a, b) => {
    if (!!a.named !== !!b.named) return a.named ? -1 : 1;
    const A = aged(a); const B = aged(b);
    if (A !== B) return A ? -1 : 1;
    if (A) return agedFrom(a) - agedFrom(b) || g(a).localeCompare(g(b));
    return (b.release ? 1 : 0) - (a.release ? 1 : 0) || (b.holds || 0) - (a.holds || 0) || exp(a) - exp(b) || g(a).localeCompare(g(b));
  });
}

// A module's full-gate minutes from a pull request's gate rows (github.mjs gateRuns): code runs
// whose suite ran.
export const fullGateMinutes = (runs) => (runs || []).filter((r) => r?.trigger === 'code' && r.suite && r.suite !== 'skipped' && Number.isFinite(r.minutes)).map((r) => r.minutes);

// The git reads behind (b) and (c), at `base` (the tranche as fetched) and a head this clone has.
const entryAt = (root, ref, id) => { const t = git(['show', `${ref}:${entryFile(id)}`], { cwd: root, allowFail: true }); if (t.code !== 0) throw new Error(`no ledger entry for ${id} on ${ref}`); return JSON.parse(t.stdout); };
const mergeBase = (root, a, b) => { const r = git(['merge-base', a, b], { cwd: root, allowFail: true }); if (r.code !== 0) throw new Error(`git merge-base ${a} ${b.slice(0, 10)} failed`); return r.stdout.trim(); };
// Each answer is kept for the process by what it reads: the merge base, the head, the ledger
// entry (or entries and modules) and the config, never the tranche's name. A new tranche tip
// whose merge base with a head is unchanged reads nothing again (5 Nov: every land moved the
// tip, and every provider's surfaces were read again before the next pick).
const ANSWERS = new Map();
const ANSWERS_MAX = 20000;
// The key is a hash of what was read (the modules file alone is ~100 KB on the copy).
const kept = (what, f) => {
  const key = createHash('sha256').update(JSON.stringify(what)).digest('hex');
  if (ANSWERS.has(key)) return ANSWERS.get(key);
  const was = unreadCount();
  const v = f();
  if (unreadCount() !== was) return v; // a file it needed was unread: read again next time
  ANSWERS.set(key, v);
  if (ANSWERS.size > ANSWERS_MAX) ANSWERS.delete(ANSWERS.keys().next().value);
  return v;
};
export const forgetAnswers = () => ANSWERS.clear();
export function exportsChangedAt(root, cfg, base, p) {
  const e = entryAt(root, base, p.id);
  const mb = mergeBase(root, base, p.head);
  return kept(['exp', root, mb, p.head, e, cfg], () => {
    const x = exportChanges(root, mb, p.head, { isProviderSource: (f) => isSource(cfg, e, f), inProvider: (f) => [...(e.paths || []), ...(e.tests || [])].some((q) => underPath(f, q)), providerPaths: sourcePaths(cfg, e) });
    return anyExportChange(x);
  });
}
export function importsFromAt(root, cfg, base, modules, u, p) {
  const e = entryAt(root, base, u.id);
  const mb = mergeBase(root, base, u.head);
  return kept(['imp', root, mb, u.head, e, p.id, cfg, modules], () => {
    const changed = git(['diff', '--name-only', '-z', mb, u.head], { cwd: root }).split('\0').filter(Boolean);
    for (const f of changed.filter((x) => CODE.test(x) && (e.paths || []).some((q) => underPath(x, q)) && exists(root, u.head, x))) {
      for (const { spec } of specifiers(git(['show', `${u.head}:${f}`], { cwd: root }))) {
        if (!spec.startsWith('./') && !spec.startsWith('../')) continue;
        if (ownerOf(modules, posix.normalize(posix.join(posix.dirname(f), spec)))?.id === p.id) return true;
      }
    }
    return false;
  });
}
