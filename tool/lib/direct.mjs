// The direct flow (PD-25; Bob, 9 Nov: "Because modules are in a total order, perhaps holding jobs in
// upper layers until an earlier layer closes isn't necessary"; "All jobs of a layer should open at
// once up to the maximum slot cap"). process/config.json "merge_strategy": "direct".
//
// No layer branch: every job is cut from the tranche and publishes onto it. Its rows sit under one
// key per tranche, layerflow/direct-<tranche>/ (layerbase.mjs directKey), so the layer flow's start,
// run, test, land, reschedule, retest and gate rows serve it unchanged.
//   ready jobs   a module is ready when it has work (an unmet mark, an owed reopen, or an outstanding
//                reschedule), no open job, and every module upstream of it in the uses graph is
//                settled (no open job, no unmet mark, no outstanding reschedule; BLOCKED counts as
//                settled: it lands nothing). All ready jobs start at once, up to the slot cap.
//   publish      layer publish <id>, onto the tranche; a reschedule halts the run (layerflow.mjs).
//   land         layer land <pr> (the merge tool's): a ready job PR into the tranche whose gate is
//                green, every module it uses settled and their interface-changing lands held by its
//                head. An interface change reschedules every open user (an open job, or work not yet
//                landed) and notifies the rest, the notice triaged at once by rule (PD-20).
//   rounds       a round is every flawed module at once; its walk is owed once nothing is unsettled.
//   cycles       modules that use each other land in map order; the later one's land reschedules
//                the earlier ones.
import { P3, flowRows, gateFiles, interfaceChange, interfaceText, landReach, landTitle, mergeVia, outsideFiles, startable, totalOrder, writeRows } from './layerflow.mjs';
import { directKey, directMode, layersAt, safeName } from './layerbase.mjs';
import { checkRun, comments as ghComments, gateRuns, getPR, openPRs } from './github.mjs';
import { branchModule, entryFile, ledgerIds } from './ledger.mjs';
import { answerFile, noticeFile, noticeKey, noticeRecords, readModules, usersOf } from './notice.mjs';
import { deployRowsOf, findingsOf, owedReopens, walkHold } from './rounds.mjs';
import { foundFile, foundMarks } from './found.mjs';
import { fetchState, writeState } from './state.mjs';
import { paidFor } from './hold.mjs';
import { exists, fail, fetchBranch, git, loadConfig, now, repoSlug, unmetIds } from './util.mjs';

const short = (s) => String(s || '').slice(0, 10);
const isAnc = (root, a, b) => !!a && !!b && git(['merge-base', '--is-ancestor', a, b], { cwd: root, allowFail: true }).code === 0;
const hasCommit = (root, c) => git(['cat-file', '-e', `${c}^{commit}`], { cwd: root, allowFail: true }).code === 0;
const textAt = (root, ref, f) => (f && exists(root, ref, f) ? git(['show', `${ref}:${f}`], { cwd: root }) : null);
const entryAt = (root, ref, id) => { const t = git(['show', `${ref}:${entryFile(id)}`], { cwd: root, allowFail: true }); try { return t.code === 0 ? JSON.parse(t.stdout) : null; } catch { return null; } };

export const needDirect = (cfg, what) => { if (!directMode(cfg)) fail(`${what}: the direct flow's (process/config.json "merge_strategy": "direct", PD-25); this tranche runs ${JSON.stringify(cfg.merge_strategy ?? 'layer')}`); };

// The modules in their total order (the layer map's order, each after its providers; a cycle's
// modules in map order) and each one's upstream: every module it reaches through its uses, less a
// cycle peer that comes after it in that order (the cycle lands in map order).
export function usesGraph(ids, uses, mapOrder = []) {
  const known = new Set(ids);
  const pos = new Map();
  [...mapOrder.filter((id) => known.has(id)), ...[...ids].filter((id) => !mapOrder.includes(id)).sort()].forEach((id, k) => { if (!pos.has(id)) pos.set(id, k); });
  const mods = [...pos.keys()];
  const direct = new Map(mods.map((id) => [id, [...new Set(uses.get(id) || [])].filter((u) => u !== id && known.has(u))]));
  const reach = new Map();
  const reachOf = (id) => {
    if (reach.has(id)) return reach.get(id);
    const seen = new Set();
    const stack = [...direct.get(id)];
    while (stack.length) { const u = stack.pop(); if (seen.has(u)) continue; seen.add(u); stack.push(...direct.get(u)); }
    seen.delete(id);
    reach.set(id, seen);
    return seen;
  };
  const peer = (a, b) => reachOf(a).has(b) && reachOf(b).has(a);
  const before = (a, b) => pos.get(a) < pos.get(b);
  const upstream = new Map(mods.map((id) => [id, [...reachOf(id)].filter((u) => !peer(id, u) || before(u, id))]));
  // The uses a land waits on: its direct providers, a later cycle peer aside.
  const providers = new Map(mods.map((id) => [id, direct.get(id).filter((u) => !peer(id, u) || before(u, id))]));
  const order = totalOrder(mods, new Map(mods.map((id) => [id, providers.get(id)])));
  // The cycle peers before it: the modules its land reschedules (a cycle lands in map order).
  const earlierPeers = new Map(mods.map((id) => [id, mods.filter((u) => u !== id && peer(id, u) && before(u, id))]));
  return { order, upstream, providers, earlierPeers };
}

// The direct flow's read of the tranche: each module's state and the ready jobs.
// states: complete (nothing owed), deferred (BLOCKED), published / working (its job PR into the
// tranche ready / a draft), rescheduled (a provider's interface change since its last land), not
// started (an unmet mark or an owed reopen and no job open).
export function readDirect(root, cfg, { io = {}, slug = null } = {}) {
  const key = directKey(cfg.tranche);
  const ref = `refs/remotes/origin/${cfg.tranche}`;
  if (git(['rev-parse', '-q', '--verify', ref], { cwd: root, allowFail: true }).code !== 0) fail(`no ${cfg.tranche} on origin`);
  const rows = flowRows(root, cfg.state_branch, key);
  const ids = [...ledgerIds(root, ref)];
  const entries = new Map(ids.map((id) => [id, entryAt(root, ref, id)]));
  const dir = cfg.requirements_dir.replace(/\/$/, '');
  const reopens = owedReopens(root, cfg);
  // Its work: every unmet mark (a found mark too: a round is every flawed module at once) and each
  // owed reopen (C44) no land of it since answers.
  const marks = new Map(ids.map((id) => {
    const req = entries.get(id)?.requirements || `${dir}/${id}.md`;
    const m = [...unmetIds(textAt(root, ref, req) || ''), ...foundMarks(textAt(root, ref, foundFile(id))).map((f) => f.id)];
    reopens.filter((x) => x.module === id && !rows.lands.some((l) => l.module === id && String(l.at) > String(x.at))).forEach((x, k) => m.push(`O${k + 1}`));
    return [id, [...new Set(m)]];
  }));
  const list = (io.openPRs || openPRs)(slug, cfg.tranche);
  if (list === null) fail(`GitHub unreadable: the open pull requests into ${cfg.tranche} are not known`);
  const known = new Set(ids);
  const prs = list.map((p) => ({ number: p.number, draft: !!p.draft, head: p.head?.sha, ref: p.head?.ref, module: branchModule(p.head?.ref, known) })).filter((p) => p.module);
  const anc = (a, b) => isAnc(root, a, b);
  const outstandingOf = (id) => rows.reschedules.filter((r) => r.user === id && !rows.lands.some((l) => l.module === id && anc(r.provider_land, l.head)));
  const named = new Map((readModules(root, cfg, ref) || []).filter((m) => m?.id).map((m) => [m.id, m.uses || []]));
  const uses = new Map(ids.map((id) => [id, named.get(id) || entries.get(id)?.uses || []]));
  const mapOrder = layersAt(root, cfg, ref).flatMap((L) => L.mods);
  const g = usesGraph(ids, uses, mapOrder);
  const refused = (id, out) => out.length && (rows.retest_refusals || []).some((r) => r.module === id && String(r.at) >= String(out.map((o) => o.at).sort().at(-1)));
  let states = g.order.map((id) => {
    const e = entries.get(id);
    const pr = prs.find((p) => p.module === id) || null;
    const out = outstandingOf(id);
    const m = marks.get(id) || [];
    const st = e?.status?.state ?? null;
    const base = { id, pr: pr?.number ?? null, marks: m, outstanding: out, entry_state: st, lands: rows.lands.filter((l) => l.module === id).length, ...(refused(id, out) ? { retest_refused: true } : {}) };
    if (st === 'BLOCKED') return { ...base, state: 'deferred', why: `BLOCKED: ${e.status.reason || 'no reason'}` };
    if (out.length) return { ...base, state: 'rescheduled', why: `re-runs against ${[...new Set(out.map((r) => r.provider))].join(', ')}'s new interface${pr ? ` (PR ${pr.number} open)` : ''}` };
    if (pr && !pr.draft) return { ...base, state: 'published', why: `PR ${pr.number} ready into ${cfg.tranche}` };
    if (pr) return { ...base, state: 'working', why: `PR ${pr.number}, a draft` };
    if (m.length) return { ...base, state: 'not started', why: `${st || 'no ledger entry'}, unmet ${m.join(', ')}` };
    return { ...base, state: 'complete', why: base.lands ? `landed ${base.lands} time(s)` : `${st || 'no ledger entry'}, nothing owed` };
  });
  const settled = new Set(states.filter((s) => s.state === 'complete' || s.state === 'deferred').map((s) => s.id));
  states = states.map((s) => ({ ...s, waits: (g.upstream.get(s.id) || []).filter((u) => !settled.has(u)) }));
  return { key, ref, ids, rows, entries, prs, states, settled, ...g };
}

// The ready jobs: work and no job open, every upstream module settled; a recorded found mark starts
// its job at once. Each as layer jobs prints it (job start, or an additive change's layer retest: no slot).
export function readyJobs(x) {
  const ready = x.states.filter((s) => (s.state === 'not started' || (s.state === 'rescheduled' && s.pr === null)) && !s.waits.length);
  return startable(ready.map((s) => (s.entry_state === 'COMPLETE' && s.marks.length && s.state === 'not started' ? { ...s, why: `COMPLETE, unmet ${s.marks.join(', ')}` } : s)));
}

// Where the rounds stand under the direct flow (BD-R1 with PD-25): open while any module is not
// settled; walk once every one is and no walk came after the last land; after a walk, new when its
// recorded findings left flawed modules no land has answered yet, else clean. round: 1 + the walks
// before the work now open.
export function directRounds(root, cfg, x) {
  const walks = deployRowsOf(root, cfg);
  const last = walks.at(-1) || null;
  const open = x.states.filter((s) => !x.settled.has(s.id));
  const since = (at) => !last || String(at) > String(last.at);
  const moved = x.rows.lands.some((l) => since(l.at)) || x.rows.starts.some((r) => since(r.at));
  if (open.length && last && !moved) return { state: 'new', round: walks.length + 1, mods: open.map((s) => s.id), last };
  if (open.length) return { state: 'open', round: walks.length + 1, mods: open.map((s) => s.id), last };
  if (!last || x.rows.lands.some((l) => since(l.at))) return { state: 'walk', round: walks.length + 1, last };
  return { state: 'clean', round: walks.length, last };
}

// The rounds read for round next and the round close (rounds.mjs roundState's states: open in place
// of a layer; new carries the round's modules, all at once).
export function directRoundsAt(root, cfg, { io = {}, slug = null } = {}) {
  const rs = directRounds(root, cfg, readDirect(root, cfg, { io, slug: slug || io.slug || repoSlug(root) }));
  return rs.state === 'new' ? { ...rs, next: { round: rs.round, mods: rs.mods } } : rs;
}

// The view status, the sweep and the idle check read (layerflow.mjs openLayer's shape): kind open
// while any job is ready or open, else done with the rounds' state.
export function directView(root, cfg, { slug = null, io = {} } = {}) {
  const x = readDirect(root, cfg, { io, slug });
  const rs = directRounds(root, cfg, x);
  let hold = null;
  try { hold = rs.last ? walkHold(findingsOf(root, cfg, x.ref, rs.last, { round: true })) : null; } catch { hold = null; }
  const ready = readyJobs(x);
  const v = { direct: true, n: x.key, round: rs.round, rounds: rs.state, states: x.states, prs: x.prs, companions: [], startable: ready, ready: false, sync: null, early: [], early_next: null, ...(hold ? { hold } : {}) };
  if (rs.state === 'open' || rs.state === 'new') return { kind: 'open', ...v };
  if (hold) return { ...v, kind: 'done', rounds: 'held', findings: true, round: rs.round + 1, why: hold };
  return { ...v, kind: 'done' };
}

const COUNT = ['complete', 'deferred', 'published', 'working', 'rescheduled', 'not started'];
const counts = (states) => COUNT.map((k) => `${k} ${states.filter((s) => s.state === k).length}`).join(', ');
export const directAct = (v) => (v?.kind === 'open' && v.startable.length ? `${P3} direct jobs, then each job start it lists`
  : v?.kind === 'done' && v.rounds === 'held' ? `${P3} round next, then ${P3} round next --apply (records the walk's findings; round ${v.round}'s jobs are then ready)`
    : v?.kind === 'done' && v.rounds === 'walk' ? `the round-close walk (round ${v.round}): every module has landed`
      : `${P3} status --role bob (the direct flow's next act)`);
export function directLines(v, cfg) {
  if (v.kind === 'done' && v.rounds === 'held') return [`direct flow: round ${v.round}'s jobs are ready once the walk's findings are recorded: ${v.why}`, `the one next act: \`${P3} round next\` (a dry run), then \`${P3} round next --apply\``];
  if (v.kind === 'done') return [v.rounds === 'walk' ? `direct flow: every module of round ${v.round} has landed on ${cfg.tranche}; its walk ends it (the round-close run, BD-R1)` : `direct flow: every module has landed and the walk ended round ${v.round}; no module is flawed: the release path follows (BD-R1)`];
  const L = [`direct flow (PD-25): round ${v.round} on ${cfg.tranche}; ${counts(v.states)}`];
  for (const s of v.states.filter((q) => q.state === 'rescheduled')) L.push(`- ${s.id} rescheduled: ${s.why}`);
  if (v.startable.length) L.push(`jobs to start, all at once up to the slot cap (yours to start, BOB; the job cap counts), from \`${P3} direct jobs\`:`, ...v.startable.map((q) => `- ${q.cmd}`));
  else L.push('no job is ready: each module with work waits on an upstream module not yet settled, or is open');
  return L;
}

// direct jobs: the ready jobs, and each waiting module with what it waits on.
export function directJobs(root, { io = {}, log = console.log } = {}) {
  const cfg = loadConfig(root);
  needDirect(cfg, 'direct jobs');
  fetchBranch(root, cfg.tranche, { allowFail: true });
  fetchState(root, cfg.state_branch, { fresh: true });
  const v = directView(root, cfg, { slug: io.slug || repoSlug(root), io });
  for (const l of directLines(v, cfg)) log(l);
  for (const s of v.states.filter((q) => q.waits?.length && !['complete', 'deferred'].includes(q.state))) log(`waits: ${s.id} (${s.state}) on ${s.waits.join(', ')}`);
  return { ok: true, startable: v.startable, states: v.states, view: v };
}

// ---- the land ----------------------------------------------------------------------------------

// The merge tool's land of a direct job PR into the tranche (layer land <pr> dispatches here).
export async function directLand(root, prn, { io = {}, log = console.log, by = 'bob' } = {}) {
  const cfg = loadConfig(root);
  needDirect(cfg, 'layer land');
  const slug = io.slug || repoSlug(root);
  const x = { getPR, checkRun, comments: ghComments, openPRs, merge: (s, k, sha, title) => mergeVia(s, k, sha, title), triage: null, ...io };
  const n0 = Number(prn);
  const pr = x.getPR(slug, n0) || fail(`pull request ${n0} not found`);
  if (pr.base?.ref !== cfg.tranche) fail(`pull request ${n0} is into ${pr.base?.ref}, not the tranche ${cfg.tranche}: under the direct flow a job's pull request goes into the tranche`);
  const recover = pr.merged === true && !!pr.merge_commit_sha;
  if (pr.state !== 'open' && !recover) fail(`pull request ${n0} is ${pr.merged ? 'merged' : pr.state}`);
  if (pr.draft && !recover) fail(`pull request ${n0} is a draft: the job publishes it (${P3} layer publish <id>)`);
  if (pr.head?.repo?.full_name && pr.head.repo.full_name !== slug) fail(`pull request ${n0} is not from a branch of ${slug}`);
  fetchBranch(root, cfg.tranche);
  fetchState(root, cfg.state_branch, { fresh: true });
  const key = directKey(cfg.tranche);
  const tref = `refs/remotes/origin/${cfg.tranche}`;
  const id = branchModule(pr.head?.ref, ledgerIds(root, tref)) || fail(`pull request ${n0} is from ${pr.head?.ref}, not a job branch`);
  fetchBranch(root, pr.head.ref, { allowFail: true });
  const head = pr.head.sha;
  if (!hasCommit(root, head)) fail(`this clone does not hold ${short(head)}, the head of pull request ${n0}`);
  const d = readDirect(root, cfg, { io: x, slug });
  const rows = d.rows;
  let before;
  let after;
  if (recover) {
    if (rows.lands.some((l) => l.pr === n0)) fail(`pull request ${n0} is merged and its land is recorded`);
    after = pr.merge_commit_sha;
    if (!hasCommit(root, after)) fail(`this clone does not hold ${short(after)}, pull request ${n0}'s merge`);
    before = git(['rev-parse', `${after}^1`], { cwd: root });
    log(`pull request ${n0} merged at ${short(after)} with no land recorded: recording it now`);
  } else {
    const g = x.checkRun(slug, head, 'gate');
    if (g?.status !== 'completed' || g.conclusion !== 'success') fail(`the gate on ${short(head)} is ${g ? `${g.status}${g.conclusion ? ` ${g.conclusion}` : ''}` : 'not run'}: a publish lands only on a green gate on its tip`);
    const e = entryAt(root, head, id) || fail(`no ledger entry for ${id} at ${short(head)}`);
    before = git(['rev-parse', tref], { cwd: root });
    const out = outsideFiles(root, e, git(['merge-base', before, head], { deepen: true, cwd: root }), head);
    if (out.length) fail(`refused: pull request ${n0} changes files outside ${id} (ARC-2): ${out.slice(0, 10).join(', ')}`);
    // Every module it uses settled (a later cycle peer aside: a cycle lands in map order).
    const unsettled = (d.providers.get(id) || []).filter((p) => !d.settled.has(p));
    if (unsettled.length) fail(`refused: ${id} uses ${unsettled.map((p) => `${p} (${d.states.find((s) => s.id === p)?.state})`).join(', ')}, not settled: it lands once each has landed or has nothing owed; nothing was merged`);
    // Their interface-changing lands held by its head; and every reschedule of it (Bob, 5 Nov: a run
    // that started before a provider's newest interface change never counts).
    const late = [...new Set([
      ...(d.providers.get(id) || []).flatMap((p) => rows.lands.filter((l) => l.module === p && l.interface?.changed && !isAnc(root, l.merge, head)).map((l) => `${p}'s interface change (land ${short(l.merge)})`)),
      ...rows.reschedules.filter((r) => r.user === id && !isAnc(root, r.provider_land, head)).map((r) => `${r.provider}'s interface change (land ${short(r.provider_land)})`),
    ])];
    if (late.length) fail(`refused: ${id}'s run on ${short(head)} started before ${late.join(', ')}: it never counts; the job runs ${P3} layer publish ${id} again`);
    const pre = (x.interfaceChange || interfaceChange)(root, cfg, id, before, head);
    if (pre.unread) fail(`refused: ${id}'s exports could not be read at ${short(head)} (${pre.unread}); the job fixes what cannot be read and publishes again; nothing was merged`);
    const r = await x.merge(slug, n0, head, landTitle(n0));
    if (!r?.merged && !r?.sha) fail(`GitHub did not merge pull request ${n0}: ${JSON.stringify(r).slice(0, 200)}`);
    fetchBranch(root, cfg.tranche);
    after = r.sha && hasCommit(root, r.sha) ? r.sha : git(['rev-parse', tref], { cwd: root });
  }
  const { ic, users, reach, classFor, triggersFor } = landReach(root, cfg, id, before, after, rows);
  // Open users (a job PR open, or work not yet landed) are rescheduled; so is a cycle peer before it
  // in map order, which landed first; the rest (COMPLETE, BLOCKED) are noticed.
  const st = new Map(d.states.map((s) => [s.id, s]));
  const openUser = (u) => !!st.get(u) && !['complete', 'deferred'].includes(st.get(u).state);
  const peers = new Set(d.earlierPeers.get(id) || []);
  const reached = users.filter((u) => u !== id && (!reach || reach.has(u)));
  const resched = ic.changed ? reached.filter((u) => openUser(u) || peers.has(u)) : [];
  const noticed = ic.changed ? reached.filter((u) => !resched.includes(u)) : ic.provides ? users.filter((u) => u !== id) : [];
  const runs = gateRuns(x.comments(slug, n0) || []).filter((q) => q?.sha);
  const at = now();
  if (ic.unread) log(`warning: ${id}'s exports could not be read on the land ${short(after)} (${ic.unread}): counted as breaking`);
  const land = { row: 'land', layer: key, direct: true, module: id, pr: n0, branch: pr.head.ref, head, before, merge: after, at, by, gate_runs: runs.length, interface: ic, users_rescheduled: resched, users_noticed: noticed };
  const files = [[`layerflow/${key}/land/${safeName(id)}-${n0}-${short(head)}.json`, land], ...gateFiles(key, id, n0, runs)];
  for (const u of resched) files.push([`layerflow/${key}/reschedule/${safeName(u)}-${safeName(id)}-${short(after)}.json`, { row: 'reschedule', layer: key, user: u, provider: id, provider_pr: n0, provider_land: after, at, key: `${u}<-${id}@${short(after)}`, why: interfaceText(ic), triggers: triggersFor(u), class: classFor(u), ...(peers.has(u) ? { cycle: true } : {}) }]);
  let notice = null;
  if (noticed.length) {
    const k = noticeKey(id, n0);
    notice = { row: 'notice', at, key: k, provider: id, ids: [], pr: n0, users: noticed, source: 1, ...(ic.exports ? { exports: ic.exports } : {}), layer_flow: { layer: key, provides: !!ic.provides, rescheduled: ic.changed } };
    files.push([noticeFile(k), notice]);
  }
  try { for (const q of noticeRecords(root, cfg.state_branch).filter((r) => !r.withdrawn && r.open.includes(id))) files.push([answerFile(id, q.key), { row: 'answered', at, key: q.key, user: id, pr: n0, by: 'layer land' }]); } catch { /* none read: none answered */ }
  writeRows(root, cfg.state_branch, `direct ${cfg.tranche}: land PR ${n0} (${id})${ic.changed ? `, interface changed (${ic.class}): ${resched.length} rescheduled, ${noticed.length} noticed` : ''}`, files);
  log(`landed PR ${n0} (${id}) into ${cfg.tranche} at ${short(after)}; interface: ${interfaceText(ic)}`);
  try { writeState(root, cfg.state_branch, `starts owed: ${id} landed (PR ${n0})`, (dir) => { paidFor(dir, [id]); return {}; }); } catch (e) { log(`note: the starts owed were not updated (${e.message})`); }
  const msgs = [];
  for (const u of resched) {
    const p = d.prs.find((q) => q.module === u);
    const text = `${cfg.tranche}: ${id} changed its interface (${classFor(u)}; land ${short(after)}: ${interfaceText(ic)}). Halt any test run now; run \`${P3} layer publish ${u}\` again: it brings job/${u} up to ${cfg.tranche} and its gate re-runs your suite against ${id}'s new version. A run started before this never counts.`;
    if (p) { msgs.push({ user: u, pr: p.number, text }); log(`BOB delivers to job ${u}'s session (PR ${p.number}), with send_message priority now: ${text}`); } else log(`${u}: rescheduled; no job open: it re-runs when it starts (${P3} direct jobs lists it once its upstream is settled)`);
  }
  // The notice triaged at once by rule (PD-20): users not affected answered, the rest owed by name.
  let triage = null;
  if (notice) {
    log(`provider notice ${notice.key} for ${noticed.length} user(s): ${noticed.join(', ')}`);
    try { const { triageAtMerge } = await import('./triage.mjs'); triage = (x.triage || triageAtMerge)(root, cfg, notice, { ref: after, log }); } catch (e) { triage = { error: String(e.message || e) }; log(`notice triage ${notice.key} at the land FAILED (${String(e.message || e).split('\n')[0].slice(0, 160)}); next act: ${P3} notice triage ${notice.key}`); }
  }
  return { ok: true, land, messages: msgs, triage };
}
