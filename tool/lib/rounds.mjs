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
// last merge. A new round opens from that walk once its findings are recorded.
import { NO_MODULE, REOPENS_DIR, coversOf, foundFile, foundMarks, FOUND_DIR } from './found.mjs';
import { completionItems } from './completion.mjs';
import { entryFile, ledgerIds, readLedgerTexts } from './ledger.mjs';
import { layerOf, layersAt, roundOf } from './layerbase.mjs';
import { internalWalkOf } from './deploycfg.mjs';
import { jsonl, readState } from './state.mjs';
import { exists, git } from './util.mjs';

export const DEPLOYS_FILE = 'deploys/dev.jsonl';
// A release walk's rows: the walk of a cut development release installed on a p3dev- deployment.
// No path writes them yet (C39 gap: no install of the cut, signed release onto a p3dev- deployment
// exists); tranche close reads them, and names `deploy release <version>` until one is recorded.
export const RELEASE_WALKS_FILE = 'deploys/release.jsonl';
const P3 = 'node .process/tool/p3.mjs';

const textAt = (root, ref, f) => (exists(root, ref, f) ? git(['show', `${ref}:${f}`], { cwd: root }) : null);
const hasCommit = (root, c) => git(['cat-file', '-e', `${c}^{commit}`], { cwd: root, allowFail: true }).code === 0;
const onMain = (root, c) => !!c && hasCommit(root, c) && git(['rev-parse', '-q', '--verify', 'refs/remotes/origin/main'], { cwd: root, allowFail: true }).code === 0
  && git(['merge-base', '--is-ancestor', c, 'refs/remotes/origin/main'], { cwd: root, allowFail: true }).code === 0;

// This tranche's owed reopens (found.mjs REOPENS_DIR, C44): the findings recorded on the state
// branch for a module whose test pins its requirement ids, each until a round layer holds it.
export function owedReopens(root, cfg) {
  if (!root || !cfg?.state_branch) return [];
  const r = git(['ls-tree', '-r', '--name-only', '-z', `refs/remotes/origin/${cfg.state_branch}`, '--', `${REOPENS_DIR}/`], { cwd: root, allowFail: true });
  const files = r.code === 0 ? r.stdout.split('\0').filter((f) => f.endsWith('.json')) : [];
  return files.flatMap((f) => { try { const x = JSON.parse(readState(root, cfg.state_branch, f)); return x?.row === 'reopen' && x.module && x.key && (!x.tranche || !cfg.tranche || x.tranche === cfg.tranche) ? [x] : []; } catch { return []; } })
    .sort((a, b) => String(a.at).localeCompare(String(b.at)) || String(a.key).localeCompare(String(b.key)));
}
// The keys of the owed reopens a round layer holds already (its open row's items): its job's task.
export const heldReopens = (layers) => new Set((layers || []).flatMap((L) => (L.round?.items || []).map((x) => x.owe).filter(Boolean)));

// The modules identified as having flaws at `ref`: each ledger module, not BLOCKED, with an unmet
// found mark in its requirement file or its found-work entry, or an owed reopen no round layer
// holds yet (C44). id -> [{ id: 'F<n>' | 'O<n>', module, what, owe? }].
export function flawedModules(root, cfg, ref, { layers = null } = {}) {
  const dir = cfg.requirements_dir.replace(/\/$/, '');
  const out = new Map();
  const reopens = owedReopens(root, cfg);
  const owedOf = (id) => reopens.filter((x) => x.module === id);
  let heldSet = null;
  const held = () => (heldSet ||= heldReopens(layers || (reopens.length ? layersAt(root, cfg, ref) : [])));
  for (const id of [...ledgerIds(root, ref)].sort()) {
    let e = null;
    try { e = JSON.parse(textAt(root, ref, entryFile(id)) || 'null'); } catch { e = null; }
    // A BLOCKED module is deferred in any layer: it would hold every round open (layerflow DONE).
    if (e?.status?.state === 'BLOCKED') continue;
    const req = typeof e?.requirements === 'string' ? e.requirements : `${dir}/${id}.md`;
    const marks = [...foundMarks(textAt(root, ref, req)), ...foundMarks(textAt(root, ref, foundFile(id)))];
    const items = marks.map((m) => ({ id: m.id, module: id, what: `${m.finding} (${m.source})` }));
    // Owed reopens, numbered O1.. per module in the order recorded (its held ones counted, so a
    // number is never reused within the tranche); one a round layer holds is that layer's job's.
    const owed = owedOf(id);
    owed.forEach((x, k) => { if (!held().has(x.key)) items.push({ id: `O${k + 1}`, module: id, what: `${x.finding} (${x.source}; owed reopen: add it as your own F mark and admit it in ${x.pin})`, owe: x.key }); });
    if (items.length) out.set(id, items);
  }
  return out;
}
// Findings no module owns yet: a round cannot place them until BOB names one.
export const unplaced = (root, ref) => foundMarks(textAt(root, ref, NO_MODULE));

// This tranche's latest deploy row (deploy dev: the internal walk, the deploy and its walk), not
// an earlier tranche's of the same name (its commit on main).
export function deployRowsOf(root, cfg) {
  return jsonl(readState(root, cfg.state_branch, DEPLOYS_FILE)).filter((r) => r.row === 'dev-deploy' && r.tranche === cfg.tranche && !onMain(root, String(r.commit)));
}

// A run's findings and how many are recorded at `ref` (deploy.mjs walkFindings reads it): a failed
// run counts one at least, a walk its report's failures, the internal walk's the same; recorded are
// the unmet found marks whose source names the run (its slug and commit) and the completion items
// deferred naming it (known gaps).
export const runSource = (row) => `${row.slug} ${String(row.commit).slice(0, 10)}`;
// PD-16 (Bob, 8 Nov: "the live walk only runs once a round closes with no flaws found from the
// internal walk"): once the run's internal walk found flaws, its live arm's findings (a live arm run
// anyway, or stopped, as round 1's on p3dev-l12 was) hold no round; only the internal walk's count
// toward "each recorded" (set_aside: the live arm's, named in walkHold's message). A found mark or an
// owed reopen whose source says "covers <n>" counts as n findings (one flaw, many failures).
export function findingsOf(root, cfg, ref, last) {
  if (!last) return { last, failing: 0, marks: 0, recorded: 0, set_aside: 0 };
  const iw = last.internal_walk;
  const inner = iw ? Math.max(iw.ok ? 0 : 1, Number(iw.failures) || 0) : 0;
  const live = Math.max(last.ok ? 0 : 1, Number(last.walk?.failures) || 0);
  const setAside = inner > 0 ? live : 0;
  const failing = inner + live - setAside;
  const tree = (d) => git(['ls-tree', '-r', '--name-only', ref, '--', d], { cwd: root, allowFail: true }).stdout.split('\n').filter((n) => n.endsWith('.md'));
  const reqs = Object.values(readLedgerTexts(root, ref)).flatMap((t) => { try { const r = JSON.parse(t).requirements; return typeof r === 'string' ? [r] : []; } catch { return []; } });
  const words = (t) => String(t).split(/[^a-z0-9-]+/);
  const naming = (t) => { const w = words(t); return w.includes(last.slug) && w.includes(String(last.commit).slice(0, 10)); };
  let marks = 0;
  for (const f of new Set([...tree(cfg.requirements_dir.replace(/\/$/, '')), ...tree(FOUND_DIR), ...reqs])) {
    const r = git(['show', `${ref}:${f}`], { cwd: root, allowFail: true });
    if (r.code === 0) marks += foundMarks(r.stdout).filter((m) => naming(m.source)).reduce((a, m) => a + coversOf(m.source), 0);
  }
  // Owed reopens naming the run are recorded found work as marks are, held by a round layer or not.
  marks += owedReopens(root, cfg).filter((x) => naming(x.source)).reduce((a, x) => a + coversOf(x.source), 0);
  const gaps = (completionItems(root, cfg, ref)?.items || []).filter((x) => x.deferred && naming(x.what)).length;
  return { last, failing, marks, recorded: marks + gaps, set_aside: setAside };
}
// The hold while a run's findings are not all recorded (tranche close, release dev, a new round's open).
export const walkHold = (w) => {
  if (!w.last || w.recorded >= w.failing) return null;
  const src = runSource(w.last);
  const aside = w.set_aside ? ` (the internal walk's; the live arm's ${w.set_aside} hold no round: its internal walk found flaws, PD-16)` : '';
  const from = w.set_aside || (w.last.internal_walk && !(w.last.internal_walk.ok === true && !(Number(w.last.internal_walk.failures) > 0))) ? `internal walk ${src}` : `walk ${src}`;
  return `the latest deploy and walk (${src}) ${w.last.ok ? 'walked' : `stopped at ${w.last.stopped}`} with ${w.failing} finding(s)${aside}, ${w.recorded} recorded: record each as a found mark (\`${P3} found <module> "<finding>" --from "${from}"\`, adding --covers <n> for one flaw behind n of them; a module whose test pins its requirement ids takes it as an owed reopen, recorded on the state branch by the same command), or a known gap (a completion item "deferred: <reason>" naming ${src}); the next round opens from them (BD-R1)`;
};

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
  clean: () => `the walk ${rs.walk} ended round ${rs.round}, and no module is flawed`,
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
export const releaseWalks = (root, cfg) => jsonl(readState(root, cfg.state_branch, RELEASE_WALKS_FILE)).filter((r) => r.row === 'release-walk' && r.tranche === cfg.tranche && !onMain(root, String(r.commit)));
