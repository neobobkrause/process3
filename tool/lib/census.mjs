// The consistency census and the preflight (R15; Bob, 6 Nov, about 18:15Z: "It seems to me that we
// keep hitting items when checks are refusing modules with no ledger entry. Can we anticipate those
// conditions arising so that we can handle them either preemptively or more efficiently when
// they're identified?"). On 6 Nov each of these surfaced only when a command refused: layer 8's
// case-carriage, publish-schedule, project-stage and case-account (entries only on the tranche),
// op-capabilities' requirements with no entry, lane modules with no entry, action-holds and
// action-replies, setup-words and translations.
//
// census: every module named by the modules file, the requirements directory, the layer map, the
// lanes config and the ledger has what the others need, at one ref (the tranche):
//   no-entry           a module that will need a job (its layer is open or still to come, or its
//                      requirements file has an unmet mark) has no ledger entry; where the entry
//                      needs no judgment (a modules row with paths and tests, a requirements file,
//                      a suite read from its neighbours) its file is printed ready;
//   no-requirements    a module with an entry, or of an open or later layer, has no requirements file;
//   no-modules-row     an entry, a requirements file, a layer-map module or a lane's module with no
//                      row in the modules file;
//   not-in-layer-map   a modules row no layer-map line names (no layer's jobs list it);
//   layer-mismatch     the modules row's layer is not the layer map's;
//   entry-requirements its entry names a requirements file the ref does not hold;
//   not-on-layer       an open layer's branch lacks a module's entry the tranche holds (job start
//                      carries it, and the layer's own reads do not see it until then).
// Each gap names exactly what BOB writes. preflight: for a layer's modules, what `job start` would
// refuse on (no entry, an invalid one, its state, a live hold, a lane seat, the plan) with the fix.
import { spawnSync } from 'node:child_process';
import { entryFile, validate } from './ledger.mjs';
import { readModules } from './notice.mjs';
import { layersAt } from './layerbase.mjs';
import { DEFAULTS, LEDGER_DIR, exists, git, unmetIds } from './util.mjs';

const ls = (root, ref, dir) => {
  const r = git(['ls-tree', '-r', '--name-only', ref, '--', dir], { cwd: root, allowFail: true });
  return r.code === 0 ? r.stdout.split('\n').filter(Boolean) : [];
};
const show = (root, ref, p) => { const r = git(['show', `${ref}:${p}`], { cwd: root, allowFail: true }); return r.code === 0 ? r.stdout : null; };

// Every file under dirs at ref, path to text, read in two git calls (cold review of R15: a census of
// a 220-module product took about 700 git spawns, once per file).
function blobs(root, ref, dirs) {
  const t = git(['ls-tree', '-r', ref, '--', ...dirs], { cwd: root, allowFail: true });
  if (t.code !== 0) return new Map();
  const list = t.stdout.split('\n').map((l) => l.match(/^\d+ blob ([0-9a-f]+)\t(.+)$/)).filter(Boolean).map((m) => [m[1], m[2]]);
  if (!list.length) return new Map();
  const r = spawnSync('git', ['cat-file', '--batch'], { cwd: root, input: list.map(([sha]) => sha).join('\n') + '\n', maxBuffer: 1 << 30 });
  const out = new Map();
  if (r.status !== 0) return out;
  const buf = r.stdout;
  let at = 0;
  for (const [, path] of list) {
    const nl = buf.indexOf(10, at);
    if (nl < 0) break;
    const head = buf.subarray(at, nl).toString('utf8').split(' ');
    const size = Number(head[2]);
    if (head[1] !== 'blob' || !Number.isFinite(size)) break;
    out.set(path, buf.subarray(nl + 1, nl + 1 + size).toString('utf8'));
    at = nl + 1 + size + 1;
  }
  return out;
}

// The suite of a module's neighbours: the one most entries use whose tests share its first test
// path's top directory; null when none (the suite is then BOB's to name).
function neighbourSuite(entries, tests) {
  const top = String(tests?.[0] || '').split('/')[0];
  if (!top) return null;
  const counts = new Map();
  for (const e of entries.values()) {
    if (!e?.suite || !(e.tests || []).some((t) => String(t).split('/')[0] === top)) continue;
    const k = JSON.stringify(e.suite);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const best = [...counts].sort((a, b) => b[1] - a[1])[0];
  return best ? JSON.parse(best[0]) : null;
}

// The census at ref. open: the open layers' numbers (their branches on origin, not merged); the
// lowest is "the open layer", and every layer at or after it is still to come. Returns
// { gaps: [{ id, kind, layer, fix, file?, content? }], skipped? }.
// The job situation every proposed entry reads (C41): situations_dir's job.md at ref, where the
// product keeps it (build/situations by default, process/situations once moved); null when absent.
export function situationFile(root, cfg, ref) {
  const f = `${String(cfg.situations_dir || DEFAULTS.situations_dir).replace(/\/+$/, '')}/job.md`;
  return exists(root, ref, f) ? f : null;
}

export function census(root, cfg, { ref, open = [], now = new Date().toISOString() } = {}) {
  const rows = readModules(root, cfg, ref);
  if (rows === null) return { gaps: [], skipped: `no ${cfg.modules_file || 'modules file'} at ${ref}` };
  const row = new Map(rows.filter((m) => m?.id).map((m) => [m.id, m]));
  const dir = String(cfg.requirements_dir || DEFAULTS.requirements_dir).replace(/\/$/, '');
  const files = blobs(root, ref, [LEDGER_DIR, dir]);
  // A file at ref: from the batch when it is under those directories, else one read.
  const text = (p) => (files.has(p) ? files.get(p) : p.startsWith(`${LEDGER_DIR}/`) || p.startsWith(`${dir}/`) ? null : show(root, ref, p));
  const entries = new Map();
  for (const f of [...files.keys()].filter((x) => /^process\/ledger\/[^/]+\.json$/.test(x))) {
    const id = f.replace(/^.*\//, '').replace(/\.json$/, '');
    let e = null;
    try { e = JSON.parse(files.get(f)); } catch { e = null; }
    entries.set(id, e);
  }
  const reqs = new Map([...files.keys()].filter((f) => f.endsWith('.md') && f.slice(dir.length + 1).indexOf('/') < 0 && !/^README\.md$/i.test(f.slice(dir.length + 1))).map((f) => [f.slice(dir.length + 1, -3), f]));
  const map = layersAt(root, cfg, ref);
  // The map's own layers: a completion layer reopens modules whose layer is the map's (C33).
  const mapLayer = new Map(map.filter((L) => !L.completion).flatMap((L) => L.mods.map((m) => [m, L.n])));
  const lanes = (Array.isArray(cfg.lanes) ? cfg.lanes : []).filter((l) => l?.module).map((l) => l.module);
  const first = open.length ? Math.min(...open) : null;
  const layerOf = (id) => mapLayer.get(id) ?? (Number.isInteger(row.get(id)?.layer) ? row.get(id).layer : null);
  const ahead = (id) => first !== null && layerOf(id) !== null && layerOf(id) >= first;
  // A module's requirements file: the one its entry names, else <dir>/<id>.md; null when the ref
  // holds neither.
  const reqPath = new Map();
  const reqOf = (id) => {
    if (!reqPath.has(id)) {
      const named = entries.get(id)?.requirements ? String(entries.get(id).requirements).replace(/^\.\//, '') : null;
      reqPath.set(id, named && text(named) !== null ? named : reqs.get(id) || null);
    }
    return reqPath.get(id);
  };
  const reqText = new Map();
  const unmet = (id) => {
    const f = reqOf(id);
    if (!f) return [];
    if (!reqText.has(id)) reqText.set(id, text(f) || '');
    return unmetIds(reqText.get(id));
  };
  const all = new Set([...row.keys(), ...entries.keys(), ...reqs.keys(), ...mapLayer.keys(), ...lanes]);
  const gaps = [];
  const gap = (id, kind, fix, extra = {}) => gaps.push({ id, kind, layer: layerOf(id), fix, ...extra });
  const readme = exists(root, ref, `${dir}/README.md`) ? `${dir}/README.md` : null;
  const situation = situationFile(root, cfg, ref);
  for (const id of [...all].sort()) {
    const r = row.get(id);
    const e = entries.get(id);
    const marks = unmet(id);
    const lane = lanes.includes(id);
    // Whether the module still needs a job: its entry OPEN, BLOCKED or WORKING, an unmet mark, or
    // no entry and its layer open or to come. A modules row off the layer map is a gap whatever
    // its state: a COMPLETE one's later found mark or --reopen would never show in layer jobs (the
    // copy, 6 Nov: BOB found 8 COMPLETE ones by hand). A lane's module never is: no layer lists it.
    const needs = (e && ['OPEN', 'BLOCKED', 'WORKING'].includes(e.status?.state)) || marks.length > 0 || (!e && ahead(id));
    if (!r) gap(id, 'no-modules-row', `add ${id}'s row to ${cfg.modules_file} (its paths, tests, uses and layer): it is named by ${[entries.has(id) && 'its ledger entry', reqs.has(id) && reqs.get(id), mapLayer.has(id) && cfg.layers_file, lane && 'the lanes config'].filter(Boolean).join(', ')}`);
    if (r && !mapLayer.has(id) && map.length && !lane) gap(id, 'not-in-layer-map', `name ${id} on its layer's line in ${cfg.layers_file}${Number.isInteger(r.layer) ? ` (its modules row says layer ${r.layer})` : ''}${needs ? '' : ' (a finding: nothing waits on it, PD-4)'}: no layer's jobs list it`, { needs: !!needs });
    if (r && mapLayer.has(id) && Number.isInteger(r.layer) && r.layer !== mapLayer.get(id) && needs) gap(id, 'layer-mismatch', `${cfg.modules_file} says layer ${r.layer}, ${cfg.layers_file} says ${mapLayer.get(id)}: make them one`);
    if (e && e.requirements && text(String(e.requirements).replace(/^\.\//, '')) === null) gap(id, 'entry-requirements', `its entry names ${e.requirements}, which ${ref} does not hold: write it, or name the right file in ${entryFile(id)}`);
    // A modules row with no entry, its layer past and nothing unmet: a module built before the
    // ledger (C16, the copy 7 Nov: 49 of them; layer jobs read every module that uses one as not
    // early, blocking early starts with no word why). Its entry records it COMPLETE.
    if (!entries.has(id) && r && !(ahead(id) || marks.length || lane)) {
      const n = layerOf(id);
      const req = reqOf(id);
      // Past only when a layer is open and this one is before it; with none open, which modules
      // were built is BOB's to say: flagged, never written ready.
      const past = first !== null && n !== null && n < first;
      // Ready only when what it claims is there: every path and test of its row on the ref (cold
      // review: a layer skipped, or a module dropped from a closed one, has a past layer number too).
      const missing = [...(r.paths || []), ...(r.tests || [])].filter((p) => !exists(root, ref, String(p).replace(/\/$/, '')));
      const why = !past ? 'no layer is open, so whether it was built is not known'
        : !(r.paths || []).length ? 'its modules row has no paths' : !(r.tests || []).length ? 'its modules row has no tests'
          : missing.length ? `${missing.slice(0, 2).join(', ')} not on ${ref}: whether it was built is BOB's to say`
            : !req ? `no requirements file ${dir}/${id}.md` : !neighbourSuite(entries, r.tests) ? `no neighbour's suite to copy (its tests: ${r.tests.join(', ')})` : null;
      const content = why ? null : {
        id, title: `${id}: built before the ledger`, ...(n !== null ? { layer: n } : {}),
        paths: [...new Set([...(r.paths || []), ...(req ? [req] : [])])], tests: r.tests, ...(req ? { requirements: req } : {}), uses: r.uses || [],
        ...(neighbourSuite(entries, r.tests) ? { suite: neighbourSuite(entries, r.tests) } : {}),
        reading: [req, readme, situation].filter(Boolean), status: { state: 'COMPLETE', at: now },
      };
      const bad = content ? validate(content) : [];
      gap(id, 'no-entry', `write ${entryFile(id)}${past ? ' recording it COMPLETE (built before the ledger;' : ', COMPLETE if it was built before the ledger, else OPEN (no entry;'} modules that use it wait for it as a provider until it has one)${why || bad.length ? ` (not ready: ${why || `the schema refuses it: ${bad.slice(0, 2).join('; ')}`}; that is BOB's to write)` : ' (ready below: no judgment in it)'}`, { done: true, ...(content && !bad.length ? { content, file: entryFile(id) } : {}) });
    }
    if (!entries.has(id) && (ahead(id) || marks.length || lane) && r) {
      // The entry, ready when nothing in it is a judgment.
      const suite = neighbourSuite(entries, r.tests);
      const why = !reqOf(id) ? `no requirements file ${dir}/${id}.md` : !(r.paths || []).length ? 'its modules row has no paths' : !(r.tests || []).length ? 'its modules row has no tests' : !suite ? `no neighbour's suite to copy (no entry's tests share ${String(r.tests[0]).split('/')[0]}/)` : null;
      const n = layerOf(id);
      const content = why ? null : {
        id, title: marks.length ? `${id}: meet its unmet requirement marks` : `${id}: confirm its requirements on layer ${n}`,
        ...(n !== null ? { layer: n } : {}),
        paths: [...new Set([...(r.paths || []), reqOf(id)])], tests: r.tests, requirements: reqOf(id), uses: r.uses || [], suite,
        reading: [reqOf(id), readme, situation].filter(Boolean), status: { state: 'OPEN', at: now },
      };
      // A row the schema refuses (an odd type, say) makes the entry BOB's, never a throw.
      const bad = content ? validate(content) : [];
      gap(id, 'no-entry', `write ${entryFile(id)}${why || bad.length ? ` (not ready: ${why || `its modules row gives an entry the schema refuses: ${bad.slice(0, 2).join('; ')}`}; that is BOB's to write)` : ' (ready below: no judgment in it)'}: ${lane ? 'a lane\'s module' : marks.length ? `${marks.length} unmet mark(s) in ${reqOf(id)}` : `layer ${n} is open or still to come`}`, content && !bad.length ? { file: entryFile(id), content } : {});
    }
    if (!reqOf(id) && r && !e?.requirements && (entries.has(id) || ahead(id))) gap(id, 'no-requirements', `write ${dir}/${id}.md, the module's requirements (BOB's: judgment)`);
  }
  // An open layer's branch holds the entries of its modules the tranche holds.
  for (const n of open) {
    const b = `refs/remotes/origin/layer/${n}`;
    if (git(['rev-parse', '-q', '--verify', b], { cwd: root, allowFail: true }).code !== 0) continue;
    const on = new Set(ls(root, b, LEDGER_DIR).map((f) => f.replace(/^.*\//, '').replace(/\.json$/, '')));
    for (const id of (map.find((L) => L.n === n)?.mods || []).filter((m) => entries.has(m) && !on.has(m))) gap(id, 'not-on-layer', `layer/${n} lacks ${entryFile(id)}, which ${ref} holds: job start ${id} carries it; until then the layer's own reads do not see it`);
  }
  return { gaps };
}

// The gaps of the given layers (each its line), the others counted; the ready entries as one batch.
export function censusLines(c, { layers = null, tranche = 'tranche', label = 'gaps' } = {}) {
  if (c.skipped) return [];
  const mine = layers ? c.gaps.filter((g) => layers.includes(g.layer)) : c.gaps;
  const rest = c.gaps.length - mine.length;
  if (!mine.length) return [`${label}: none${layers ? ` in layer${layers.length > 1 ? 's' : ''} ${layers.join(', ')}` : ''}${rest ? ` (${rest} elsewhere: census)` : ''}`];
  const ready = mine.filter((g) => g.content);
  return [`${label}: ${mine.length}${layers ? ` in layer${layers.length > 1 ? 's' : ''} ${layers.join(', ')}` : ''}${rest ? ` (${rest} elsewhere)` : ''}`,
    ...mine.map((g) => `- ${g.id}${g.layer !== null ? ` (layer ${g.layer})` : ''}, ${g.kind}: ${g.fix}`),
    ...(ready.length ? [`ready entries (${ready.length}), one plain pull request into ${tranche}, no judgment in them:`, ...ready.map((g) => `--- ${g.file}\n${JSON.stringify(g.content, null, 2)}`)] : [])];
}

// The layers open now: a layerflow open row and no merged row on the state branch.
export function openLayers(root, cfg, read) {
  const out = [];
  for (const L of layersAt(root, cfg, `origin/${cfg.tranche}`)) {
    let o = null;
    let m = null;
    try { o = read(`layerflow/${L.n}/open.json`); m = read(`layerflow/${L.n}/merged.json`); } catch { continue; }
    if (o !== null && m === null) out.push(L.n);
  }
  return out;
}

// The preflight: what `job start` would refuse on for each module of layer n, with the fix.
// holds: readHolds' list; heldBy(holds, id, layers); seat(id): laneSeatFor's answer, or null.
// [{ id, why, fix }].
export function preflight(root, cfg, n, { ref, census: c, holds = [], heldBy = () => null, seat = () => null, layers = new Map() } = {}) {
  const out = [];
  const mods = layersAt(root, cfg, ref).find((L) => L.n === n)?.mods || [];
  const gaps = new Map();
  for (const g of c?.gaps || []) if (['no-entry', 'entry-requirements', 'no-modules-row'].includes(g.kind)) gaps.set(g.id, g);
  if (cfg.plan === 'pause' || cfg.plan === 'stop') out.push({ id: '*', why: `the plan is ${cfg.plan}: job start refuses every start`, fix: 'the plan resumes (Bob\'s)' });
  for (const id of mods) {
    const g = gaps.get(id);
    if (g) { out.push({ id, why: `${g.kind}: no ledger entry or an entry that cannot be read`, fix: g.fix }); continue; }
    const t = show(root, ref, entryFile(id));
    if (t === null) continue; // no work needed for it, by the census
    let e = null;
    try { e = JSON.parse(t); } catch { out.push({ id, why: `${entryFile(id)} is not JSON`, fix: `fix ${entryFile(id)}` }); continue; }
    const errs = validate(e);
    if (errs.length) { out.push({ id, why: `its entry is invalid: ${errs.slice(0, 3).join('; ')}`, fix: `fix ${entryFile(id)}` }); continue; }
    const st = e.status?.state;
    if (st === 'COMPLETE') {
      const marks = unmetIds(show(root, ref, String(e.requirements || '').replace(/^\.\//, '')) || '');
      if (marks.length) out.push({ id, why: `its entry is COMPLETE with ${marks.length} unmet mark(s): a plain job start refuses it`, fix: `job start ${id} --sessions <file> --reopen "meet the unmet requirement marks ${marks.slice(0, 5).join(', ')}" (layer jobs prints it)` });
    } else if (!['OPEN', 'BLOCKED'].includes(st)) out.push({ id, why: `its entry is ${st} on ${ref}: job start refuses it`, fix: 'bring it to Bob (job start takes OPEN or BLOCKED)' });
    const h = heldBy(holds, id, layers);
    if (h) out.push({ id, why: `held by ${h.id} (${h.scope}): job start and layer jobs skip it`, fix: `the hold ends by its own condition (${h.when?.length ? h.when.map((x) => Object.entries(x)[0].join(':')).join(', ') : h.until ? `at ${h.until}` : 'its pull requests'})` });
    const s = seat(id);
    if (s) out.push({ id, why: s.why, fix: `lane end ${s.lane.name} before its layer opens, or send the work to its session` });
  }
  return out;
}
export const preflightLines = (n, xs) => (xs.length ? [`preflight, layer ${n}: ${xs.length} start(s) would be refused`, ...xs.map((x) => `- ${x.id}: ${x.why}; fix: ${x.fix}`)] : [`preflight, layer ${n}: no start would be refused`]);

// The census of a pull request's change (the gate): a requirements file or a modules row it adds
// with no ledger entry at its head, or an entry it adds with no row or requirements file. Returns
// [{ file, message }].
export function changeGaps(root, cfg, { base, head, changed }) {
  const out = [];
  const dir = String(cfg.requirements_dir || DEFAULTS.requirements_dir).replace(/\/$/, '');
  const rowsAt = (ref) => new Set((readModules(root, cfg, ref) || []).filter((m) => m?.id).map((m) => m.id));
  const before = cfg.modules_file && changed.includes(cfg.modules_file) ? rowsAt(base) : null;
  const after = rowsAt(head);
  const has = (ref, p) => show(root, ref, p) !== null;
  const added = (p) => changed.includes(p) && !has(base, p) && has(head, p);
  const newRows = before ? [...after].filter((id) => !before.has(id)) : [];
  const newReqs = changed.filter((f) => f.startsWith(`${dir}/`) && f.endsWith('.md') && f.slice(dir.length + 1).indexOf('/') < 0 && !/README\.md$/i.test(f) && added(f)).map((f) => f.slice(dir.length + 1, -3));
  const newEntries = changed.filter((f) => /^process\/ledger\/[^/]+\.json$/.test(f) && added(f)).map((f) => f.replace(/^.*\//, '').replace(/\.json$/, ''));
  for (const id of [...new Set([...newRows, ...newReqs])]) {
    if (!has(head, entryFile(id))) out.push({ file: newReqs.includes(id) ? `${dir}/${id}.md` : cfg.modules_file, message: `${id} gains a ${newReqs.includes(id) ? 'requirements file' : 'modules row'} with no ledger entry ${entryFile(id)}: add the entry in this pull request (census, R15)` });
  }
  for (const id of newEntries) {
    if (!after.has(id)) out.push({ file: entryFile(id), message: `${id}'s new ledger entry has no row in ${cfg.modules_file}: add it in this pull request (census, R15)` });
    let named = null;
    try { named = JSON.parse(show(root, head, entryFile(id)) || '{}').requirements || null; } catch { named = null; }
    if (!has(head, named ? String(named).replace(/^\.\//, '') : `${dir}/${id}.md`)) out.push({ file: entryFile(id), message: `${id}'s new ledger entry has no requirements file ${named || `${dir}/${id}.md`}: add it in this pull request (census, R15)` });
  }
  return out;
}
