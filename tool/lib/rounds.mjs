// Rounds (BD-R1, Bob, 8 Nov): "Once a walk completes, that ends the current round, and a new round
// (of the same tranche) is started to work (layer by layer) to fix to those modules that have been
// identified as having flaws. This successive set of rounds continues until an internal walk
// doesn't find flaws, the release deployment happens, and the walk of the release also doesn't
// identify flaws."
//
// Round 1 is the map's layers (and the completion layer the copy opened under PD-12: "Finish, then
// switch"). A walk's findings enter as found marks against named modules (PLN-3, found.mjs). A later
// round runs over the map's layers in order, each as a round layer past the map (layerbase.mjs): its
// modules the flawed ones whose map layer it is, read at its open, so a mark found mid-round in a
// later map layer joins this round and one in an earlier map layer waits for the next (coordinator,
// 8 Nov). A map layer with no flawed module is skipped. A round ends at its walk: every layer it
// opened merged, no flawed module in a map layer after its last one, and a walk recorded after its
// last merge. That walk is the internal walk alone where the product configures one (C43; Bob, 8 Nov:
// "the internal walk would be the last step of a round, but the live walk would only run once a
// round completed without any flaws identified in the internal walk"), deploy dev's deploy and walk
// where it does not. A new round opens from that walk once its findings are recorded; a clean one
// leads to the release path (releaseNext): the cut, signed release, its deployment and its live walk.
import { NO_MODULE, foundFile, foundMarks, FOUND_DIR } from './found.mjs';
import { completionItems } from './completion.mjs';
import { entryFile, ledgerIds, readLedgerTexts } from './ledger.mjs';
import { layerOf, roundOf } from './layerbase.mjs';
import { internalWalkOf } from './deploycfg.mjs';
import { jsonl, readState } from './state.mjs';
import { exists, git } from './util.mjs';

export const DEPLOYS_FILE = 'deploys/dev.jsonl';
// A release walk's rows: the walk of a cut development release installed on a p3dev- deployment.
// No path writes them yet (C39 gap: no install of the cut, signed release onto a p3dev- deployment
// exists); tranche close reads them, and names `deploy release <version>` until one is recorded.
export const RELEASE_WALKS_FILE = 'deploys/release.jsonl';
// The development releases cut (release dev --record's rows; release.mjs re-exports it).
export const RELEASES_FILE = 'releases/dev.jsonl';
// The rows a round's walk writes in DEPLOYS_FILE (C43, BD-R1): `round-walk`, the internal walk only,
// where the product configures one; `dev-deploy`, deploy dev's deploy and its walk, where it does not
// (Bob's exemption, or none set). Either ends a round; each has its start marker.
export const WALK_ROWS = ['round-walk', 'dev-deploy'];
export const START_ROWS = ['round-walk-start', 'dev-deploy-start'];
// The release path's gap (deploy.mjs deployRelease names it; status and tranche close print it).
export const RELEASE_PATH_GAP = 'no path yet installs the cut, signed release artifact onto a p3dev- deployment through the release\'s own installer path (process-dev-release cuts the draft release only; the product has no release-tier install-from-scratch or upgrade fixture; the installer installs only by an interactive sign-in)';
const P3 = 'node .process/tool/p3.mjs';

const textAt = (root, ref, f) => (exists(root, ref, f) ? git(['show', `${ref}:${f}`], { cwd: root }) : null);
const hasCommit = (root, c) => git(['cat-file', '-e', `${c}^{commit}`], { cwd: root, allowFail: true }).code === 0;
const onMain = (root, c) => !!c && hasCommit(root, c) && git(['rev-parse', '-q', '--verify', 'refs/remotes/origin/main'], { cwd: root, allowFail: true }).code === 0
  && git(['merge-base', '--is-ancestor', c, 'refs/remotes/origin/main'], { cwd: root, allowFail: true }).code === 0;

// The modules identified as having flaws at `ref`: each ledger module, not BLOCKED, with an unmet
// found mark in its requirement file or its found-work entry. id -> [{ id: 'F<n>', module, what }].
export function flawedModules(root, cfg, ref) {
  const dir = cfg.requirements_dir.replace(/\/$/, '');
  const out = new Map();
  for (const id of [...ledgerIds(root, ref)].sort()) {
    let e = null;
    try { e = JSON.parse(textAt(root, ref, entryFile(id)) || 'null'); } catch { e = null; }
    // A BLOCKED module is deferred in any layer: it would hold every round open (layerflow DONE).
    if (e?.status?.state === 'BLOCKED') continue;
    const req = typeof e?.requirements === 'string' ? e.requirements : `${dir}/${id}.md`;
    const marks = [...foundMarks(textAt(root, ref, req)), ...foundMarks(textAt(root, ref, foundFile(id)))];
    if (marks.length) out.set(id, marks.map((m) => ({ id: m.id, module: id, what: `${m.finding} (${m.source})` })));
  }
  return out;
}
// Findings no module owns yet: a round cannot place them until BOB names one.
export const unplaced = (root, ref) => foundMarks(textAt(root, ref, NO_MODULE));

// This tranche's round walks (WALK_ROWS: the round-close run's internal walk, or deploy dev's deploy
// and walk), not an earlier tranche's of the same name (its commit on main).
export function deployRowsOf(root, cfg) {
  return jsonl(readState(root, cfg.state_branch, DEPLOYS_FILE)).filter((r) => WALK_ROWS.includes(r.row) && r.tranche === cfg.tranche && !onMain(root, String(r.commit)));
}

// A run's findings and how many are recorded at `ref` (deploy.mjs walkFindings reads it): a failed
// run counts one at least, a walk its report's failures, the internal walk's the same; recorded are
// the unmet found marks whose source names the run (its slug and commit) and the completion items
// deferred naming it (known gaps).
export const runSource = (row) => `${row.slug} ${String(row.commit).slice(0, 10)}`;
export function findingsOf(root, cfg, ref, last) {
  if (!last) return { last, failing: 0, marks: 0, recorded: 0 };
  const iw = last.internal_walk;
  const failing = Math.max(last.ok ? 0 : 1, Number(last.walk?.failures) || 0) + (iw ? Math.max(iw.ok ? 0 : 1, Number(iw.failures) || 0) : 0);
  const tree = (d) => git(['ls-tree', '-r', '--name-only', ref, '--', d], { cwd: root, allowFail: true }).stdout.split('\n').filter((n) => n.endsWith('.md'));
  const reqs = Object.values(readLedgerTexts(root, ref)).flatMap((t) => { try { const r = JSON.parse(t).requirements; return typeof r === 'string' ? [r] : []; } catch { return []; } });
  const words = (t) => String(t).split(/[^a-z0-9-]+/);
  const naming = (t) => { const w = words(t); return w.includes(last.slug) && w.includes(String(last.commit).slice(0, 10)); };
  let marks = 0;
  for (const f of new Set([...tree(cfg.requirements_dir.replace(/\/$/, '')), ...tree(FOUND_DIR), ...reqs])) {
    const r = git(['show', `${ref}:${f}`], { cwd: root, allowFail: true });
    if (r.code === 0) marks += foundMarks(r.stdout).filter((m) => naming(m.source)).length;
  }
  const gaps = (completionItems(root, cfg, ref)?.items || []).filter((x) => x.deferred && naming(x.what)).length;
  return { last, failing, marks, recorded: marks + gaps };
}
// The hold while a run's findings are not all recorded (tranche close, release dev, a new round's open).
const runName = (row) => (row.row === 'round-walk' ? 'internal walk' : 'deploy and walk');
export const walkHold = (w) => (w.last && w.recorded < w.failing ? `the latest ${runName(w.last)} (${runSource(w.last)}) ${w.last.ok ? 'walked' : `stopped at ${w.last.stopped}`} with ${w.failing} finding(s), ${w.recorded} recorded: record each as a found mark (\`${P3} found <module> "<finding>" --from "walk ${runSource(w.last)}"\`, or "internal walk ..." for the internal walk's), or a known gap (a completion item "deferred: <reason>" naming ${runSource(w.last)}); the next round opens from them (BD-R1)` : null);

// Where the rounds stand at `ref` (the tranche), read from the layers (layersAt: the map's and those
// past it), each layer's flow rows (flows(n), layerflow.mjs flowRows), the flawed modules and the
// latest walk (deploy row). One of:
//   { state: 'layer', round, layer }          a layer of the round is open (not merged);
//   { state: 'next', round, next }            the round's next layer is owed (next: { n, round, of, mods, items });
//   { state: 'walk', round }                  every layer of the round merged: its walk ends it;
//   { state: 'new', round, next, walk }       the walk ended the round, and flawed modules open the next;
//   { state: 'clean', round, walk }           the walk ended the round, and no module is flawed.
export function roundState(root, cfg, ref, { layers, flows, lastWalk = null, flawed = flawedModules(root, cfg, ref) }) {
  const map = layers.filter((L) => !L.completion && !L.round);
  const extra = layers.filter((L) => L.completion || L.round);
  const lastMap = map.at(-1)?.n ?? 0;
  const nextN = (layers.at(-1)?.n ?? 0) + 1;
  const open = layers.find((L) => flows(L.n).open && !flows(L.n).merged);
  const round = Math.max(1, ...extra.map(roundOf));
  if (open) return { state: 'layer', round: roundOf(open), layer: open };
  // A module on no line of the map runs with the map's last layer.
  const place = (id) => layerOf(map, id) ?? lastMap;
  const plan = (after, r, walk) => {
    const ahead = [...flawed.keys()].filter((id) => place(id) > after);
    if (!ahead.length) return null;
    const of = Math.min(...ahead.map(place));
    const mods = ahead.filter((id) => place(id) === of);
    // In the map's order within the layer; then those on no line.
    const line = map.find((L) => L.n === of)?.mods || [];
    mods.sort((a, b) => ((line.indexOf(a) + 1 || 1e9) - (line.indexOf(b) + 1 || 1e9)) || a.localeCompare(b));
    return { n: nextN, round: r, of, mods, items: mods.flatMap((id) => flawed.get(id)), ...(walk ? { walk } : {}) };
  };
  const mine = extra.filter((L) => roundOf(L) === round && L.round);
  // Round 1 ran every map layer; a later round, the map layers up to its last round layer's.
  const lastOf = round === 1 ? lastMap : Math.max(0, ...mine.map((L) => L.round.of));
  const more = round === 1 ? null : plan(lastOf, round);
  if (more) return { state: 'next', round, next: more };
  // The round's last merge; a walk after it ended the round.
  const merges = layers.map((L) => flows(L.n).merged?.at).filter(Boolean).sort();
  const lastMerge = merges.at(-1) || null;
  const walked = !!lastWalk && (!lastMerge || String(lastWalk.at) > String(lastMerge));
  if (!walked) return { state: 'walk', round };
  const walk = runSource(lastWalk);
  const next = plan(0, round + 1, walk);
  return next ? { state: 'new', round: round + 1, next, walk } : { state: 'clean', round, walk };
}
export const roundLine = (rs) => ({
  layer: () => `round ${rs.round} is open: ${rs.layer.round ? `layer ${rs.layer.n} (round ${rs.round}, map layer ${rs.layer.round.of})` : `layer ${rs.layer.n}`} has not merged`,
  next: () => `round ${rs.round} is open: layer ${rs.next.n} (round ${rs.round}, map layer ${rs.next.of}) is next, for ${rs.next.mods.join(', ')}: \`${P3} layer open ${rs.next.n}\``,
  walk: () => `every layer of round ${rs.round} has merged: its walk ends it (the round-close run)`,
  new: () => `the walk ${rs.walk} ended round ${rs.round - 1}; round ${rs.round} opens from its findings: layer ${rs.next.n} (round ${rs.round}, map layer ${rs.next.of}) for ${rs.next.mods.join(', ')}: \`${P3} layer open ${rs.next.n}\``,
  clean: () => `the walk ${rs.walk} ended round ${rs.round}, and no module is flawed: the release path follows a clean internal walk (BD-R1)`,
}[rs.state]());

// The walk is clean (BD-R1: "doesn't find flaws"): the run's internal walk ran ok with no failure.
export const internalClean = (row) => !!row?.internal_walk && row.internal_walk.ok === true && !(Number(row.internal_walk.failures) > 0);
export const walkClean = (row) => !!row && row.ok === true && !(Number(row.walk?.failures) > 0);
// The round-close run is clean, as release dev and tranche close both read it: its internal walk
// where the run has one or the config requires one (a required walk that did not run is not
// clean); else, exempt by Bob's word or unconfigured, the run's own walk.
export const internalRequired = (cfg, row) => !!row?.internal_walk || (() => { try { return !!internalWalkOf(cfg.deploy?.internal_walk)?.walk; } catch { return true; } })();
export const runClean = (cfg, row) => (internalRequired(cfg, row) ? internalClean(row) : walkClean(row));
// The run passes (release dev, tranche close): clean, or every finding of it a known gap (a completion
// item deferred naming it, by Bob's word) and none a found mark, so no flaw is left for a round.
export const runPassed = (cfg, w) => !!w?.last && (runClean(cfg, w.last) || (w.failing > 0 && w.marks === 0 && w.recorded >= w.failing));
// The release path, once a round's internal walk is clean (BD-R1, C43): the one next act, or null.
// Owed when the round closed at a walk after its last merge ('clean'), that walk's findings are all
// recorded and none is a flaw (runPassed: known gaps deferred on Bob's word pass), and the product
// cuts releases: first the cut, signed release (release dev) after that walk, then its release
// deployment and live walk (deploy release, a named gap today). A release walk recorded, clean or
// not, owes nothing here: tranche close reads it, and its findings open the next round. Under plan
// close the tranche ends where it stands, and no release is owed (tranche.mjs trancheEnd).
export function releaseNext(root, cfg, { rc, w, plan }) {
  if (plan === 'close' || !cfg.release || !rc?.closed || rc.rounds?.state !== 'clean' || !w?.last || walkHold(w) || !runPassed(cfg, w)) return null;
  const rel = releasesCut(root, cfg, w.last.at);
  if (!rel) return { why: `${rc.round}'s ${internalRequired(cfg, w.last) ? 'internal walk' : 'walk'} ${runSource(w.last)} is clean, and no release is cut since`, act: `${P3} release dev, from a clean checkout of the tranche tip (the cut, signed release), then ${P3} deploy release <version>, its release deployment and live walk (BD-R1)` };
  if (releaseWalks(root, cfg).some((r) => r.version === rel.version)) return null;
  return { why: `release ${rel.version} is cut since the clean ${internalRequired(cfg, w.last) ? 'internal walk' : 'walk'} ${runSource(w.last)}`, act: `${P3} deploy release ${rel.version}, its release deployment and live walk (BD-R1); GAP: ${RELEASE_PATH_GAP}, brought to Bob through the coordinator`, gap: true };
}
// The latest successful development release of this tranche cut after `since`.
export const releasesCut = (root, cfg, since) => jsonl(readState(root, cfg.state_branch, RELEASES_FILE)).filter((r) => r.row === 'dev-release' && r.tranche === cfg.tranche && r.conclusion === 'success' && String(r.at) > String(since)).at(-1) || null;
export const releaseWalks = (root, cfg) => jsonl(readState(root, cfg.state_branch, RELEASE_WALKS_FILE)).filter((r) => r.row === 'release-walk' && r.tranche === cfg.tranche && !onMain(root, String(r.commit)));
