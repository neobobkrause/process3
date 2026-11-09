// The shared layer branch (design note "Shared Layer Branch", Bob, 5 Nov), the only flow since the
// merge train was removed (Bob, 6 Nov): process/config.json "merge_strategy" "layer" or absent.
//
// One layer's life:
//   layer open <n>     cuts layer/<n> from the tranche tip and lists the jobs that can start; ROOT
//                      starts them (job start cuts each job branch from layer/<n>, its draft PR into it).
//   layer publish <id> the job's: brings its branch up to the layer tip, refuses any file outside
//                      the module, runs the module's fast checks (job complete; the
//                      suite runs in CI's gate: AUD-7, PLT-4),
//                      and marks its PR into layer/<n> ready, so the gate runs on its tip. While the
//                      run goes it watches the state branch: a reschedule for the module halts the
//                      run at once, and it starts again on the new layer tip.
//   layer land <pr>    the merge tool's: a publish PR whose gate is green on its head merges into
//                      layer/<n>, with no combined re-test. Refused when the run behind it started
//                      before a provider's newest interface change. At the land the provider's
//                      interface (its exports, exports.mjs, and the Public / Provides section of its
//                      requirements file) is compared before and after: a change reschedules its
//                      users in the layer and leaves a provider notice for its users in later layers.
//   layer status <n>   each module's state: not started, working, published, rescheduled, complete, deferred.
//   layer merge <n>    when every module is complete or deferred, no reschedule outstanding and no
//                      publish open: layer/<n> into the tranche as one PR, with no further test run
//                      (the gate's layer trigger checks each module's evidence and runs no suite).
//   layer report <n>   the trial's measures.
// State: one file per event under layerflow/<n>/ on the state branch (layerbase.mjs flowFile).
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, posix } from 'node:path';
import { anyExportChange, exportChanges } from './exports.mjs';
import { deploys } from './deploycfg.mjs';
import { classifyTestChange } from './testdiff.mjs';
import { checkRun, comments as ghComments, createPR, findPR, gateRuns, getPR, markReady, openPRs, prsFromBranch, runArtifactRow, runState } from './github.mjs';
import { diffNames, ownPaths } from './gate.mjs';
import { generatedRows, isGenerated, specifiers } from './checks.mjs';
import { branchModule, entryFile, ledgerIds, originJobs, startBranch } from './ledger.mjs';
import { completionItems, openItems, parseCompletion } from './completion.mjs';
import { appendRow, metricsFile, rowsAt } from './metrics.mjs';
import { census, censusLines, openLayers } from './census.mjs';
import { landedFrom } from './landed.mjs';
import { FLOW_DIR, directKey, directMode, flowBase, flowFile, jobCfg, layerBranch, layerMode, layerName, layerOf, layerOfBranch, layersAt, roundLayerName, roundOf, safeName } from './layerbase.mjs';
import { deployRowsOf, findingsOf, flawedModules, roundLine, roundState, unplaced, walkHold } from './rounds.mjs';
import { answerFile, isSource, noticeFile, noticeKey, noticeRecords, readExports, readModules, sourcePaths, usersOf } from './notice.mjs';
import { fetchState, flushState, pendingWrites, readState, writeState } from './state.mjs';
import { pollMs } from './pace.mjs';
import { directAct, directLand, directLines, directRoundsAt, directView, readDirect } from './direct.mjs';
import { endLayerHolds, paidFor, readHolds } from './hold.mjs';
import { Fail, LEDGER_DIR, exists, fail, fetchBranch, git, isFound, isRecordOrLane, isRecordPath, jobCap, loadConfig, now, repoSlug, treeBlobs, underPath, unmetIds, withTemp } from './util.mjs';

const MINUTE = 60000;
export const LAND_TITLE = /^Merge layer PR (\d+)$/;
export const landTitle = (n) => `Merge layer PR ${n}`;
export const P3 = 'node .process/tool/p3.mjs';
// status.mjs's CLOSED_FILE, named here: status.mjs reads job.mjs, which reads the gate, which reads this file.
const CLOSED_FILE = 'layers/closed.jsonl';
const short = (s) => String(s || '').slice(0, 10);
const isAnc = (root, a, b) => !!a && !!b && git(['merge-base', '--is-ancestor', a, b], { cwd: root, allowFail: true }).code === 0; // exact in a shallow clone: util.git deepens until its no is the history's, or refuses
const rev = (root, r) => git(['rev-parse', r], { cwd: root });
const hasCommit = (root, c) => git(['cat-file', '-e', `${c}^{commit}`], { cwd: root, allowFail: true }).code === 0;
const minutes = (a, b) => Math.round(((Date.parse(b) - Date.parse(a)) / MINUTE) * 10) / 10;

export function needLayerMode(cfg, what) {
  if (!layerMode(cfg)) fail(`${what}: process/config.json's merge_strategy is ${JSON.stringify(cfg.merge_strategy)}; the shared layer branch is the only flow ("layer", or the key left out)`);
}
const layerNum = (n) => (/^\d+$/.test(String(n)) ? Number(n) : fail(`the layer's number, not ${JSON.stringify(n)}`));

// ---- the interface signal -------------------------------------------------------------------

// The Public / Provides section of a requirements file: the lines under `### Provides` inside
// `## Public`, up to the next heading of level 3 or less; whitespace collapsed, blank lines and
// unmet marks `*(not yet met ...)*` left out (striking a mark records that a requirement is met; it
// is the job's progress, not a change of what the module offers). null: no such section.
const MARK = /\s*\*\(not yet met[^)]*\)\*/gi;
export function providesText(md) {
  const raw = providesRaw(md, true);
  return raw;
}
function providesRaw(md, norm = false) {
  if (md === null || md === undefined) return null;
  let pub = false;
  let prov = false;
  let found = false;
  const out = [];
  for (const l of String(md).split('\n')) {
    const h = l.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (h && h[1].length <= 3) {
      const t = h[2].toLowerCase();
      if (h[1].length <= 2) { pub = /^public\b/.test(t); prov = false; } else { prov = pub && /^provides\b/.test(t); if (prov) found = true; }
      continue;
    }
    if (prov) { const x = norm ? l.replace(MARK, '').replace(/\s+/g, ' ').trim() : l; if (x) out.push(x); }
  }
  return found ? out.join('\n') : null;
}

const entryAt = (root, ref, id) => { const t = git(['show', `${ref}:${entryFile(id)}`], { cwd: root, allowFail: true }); try { return t.code === 0 ? JSON.parse(t.stdout) : null; } catch { return null; } };
const textAt = (root, ref, f) => (f && exists(root, ref, f) ? git(['show', `${ref}:${f}`], { cwd: root }) : null);

// Whether a module's interface changed from `before` to `after` (Bob, 6 Nov, R8 and "c": only real
// interface changes reschedule; publication's land in layer 8 rescheduled 12 users, most COMPLETE).
// triggers:
//   exports         an exported name added, removed or renamed, or an export's kind changed; a
//                   changed parameter list alone is recorded, not a trigger;
//   provides-test   a test naming a Public / Provides requirement (or a fixture one names) changed
//                   (testdiff.mjs);
//   exports-unread  the exports could not be read: the land refuses it before the merge (layerLand);
//                   a land already merged counts it as breaking.
// class: breaking (an export removed, renamed or of another kind, a test's existing expectation
// changed, unread) reschedules each user for a job; additive (only new exports, tests that only add
// keys) retests each user by its gate alone. provides (a changed Public / Provides text) is a notice
// to the users, never a trigger. triggers_old: what the rule before R8 fired (exports with any
// signature change, provides-text, a provides test that names an id, exports-unread), kept so the
// trial counts the re-tests avoided. Nothing of its own source and not its requirements file
// changed: unchanged, read no further.
export function interfaceChange(root, cfg, id, before, after) {
  const e = entryAt(root, after, id) || entryAt(root, before, id);
  if (!e) return { changed: false, exports: null, provides: null, triggers: [], triggers_old: [], why: `no ledger entry for ${id}` };
  const files = diffNames(root, before, after);
  const src = files.filter((f) => isSource(cfg, e, f));
  const req = !!e.requirements && files.includes(e.requirements);
  const out = { changed: false, exports: null, provides: null };
  if (req) {
    const [a, b] = [providesText(textAt(root, before, e.requirements)), providesText(textAt(root, after, e.requirements))];
    if (a !== b) out.provides = { before: a, after: b };
  }
  let anyExport = false;
  if (src.length) {
    try {
      const x = exportChanges(root, before, after, { isProviderSource: (f) => isSource(cfg, e, f), inProvider: (f) => [...(e.paths || []), ...(e.tests || [])].some((p) => underPath(f, p)), providerPaths: sourcePaths(cfg, e) });
      anyExport = anyExportChange(x);
      if (anyExport) out.exports = { ...x, kinds: x.changed.filter((c) => kindOf(c.before) !== kindOf(c.after)).map((c) => c.name), signatures: x.changed.filter((c) => kindOf(c.before) === kindOf(c.after)).map((c) => c.name) };
    } catch (err) { out.unread = String(err.message || err).slice(0, 300); }
  }
  // A return shape is not in the exports (BOB's finding, bob-249, 6 Nov: a provider answered
  // {materials: [...]} for a list, its exports unchanged, and screens-publish read it wrongly): a
  // changed test of the provider that names one of its Public / Provides requirements (read at
  // after, else before) counts when what it asserts changed.
  const tests = files.filter((f) => (e.tests || []).some((p) => underPath(f, p)));
  if (tests.length) {
    // The ids of both sides: a test of a Provides requirement renamed or dropped is examined too
    // (cold review of R8: R2 renamed R4 with r2.test.mjs deleted read as additive).
    const idsBefore = providesIds(textAt(root, before, e.requirements)) || [];
    const ids = [...new Set([...(providesIds(textAt(root, after, e.requirements)) || []), ...idsBefore])];
    const names = (t) => ids.some((r) => new RegExp(`(^|[^\\w.])${r.replace(/\./g, '\\.')}(?![\\w]|\\.\\w)`).test(t));
    const hit = ids.length ? tests.filter((f) => names(`${textAt(root, before, f) || ''}\n${textAt(root, after, f) || ''}`)) : [];
    // A fixture (a file under its tests that is not itself a test: rows, JSON, a snapshot) that a test
    // naming a Provides requirement refers to by name counts as that test (cold review of PR 193).
    const naming = ids.length ? git(['ls-tree', '-r', '--name-only', after, '--', ...(e.tests || [])], { cwd: root, allowFail: true }).stdout.split('\n').filter((f) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(f)).map((f) => textAt(root, after, f) || '').filter(names) : [];
    const fixtures = tests.filter((f) => !hit.includes(f) && !/\.(test|spec)\.[cm]?[jt]sx?$/.test(f) && naming.some((t) => t.includes(f.split('/').pop())));
    const examined = [...hit, ...fixtures].sort();
    if (hit.length) out.provides_tests_old = hit.sort();
    if (examined.length) {
      out.provides_tests_named = examined;
      // A new file that replaces a deleted one naming a Provides requirement they share is compared
      // with that file, as a rename would be; a new file replacing none only adds assertions.
      const gone = examined.filter((f) => textAt(root, after, f) === null && textAt(root, before, f) !== null);
      const nameRe = (r) => new RegExp(`(^|[^\\w.])${r.replace(/\./g, '\\.')}(?![\\w]|\\.\\w)`);
      const shared = (x, y) => ids.some((r) => nameRe(r).test(x || '') && nameRe(r).test(y || ''));
      const replaced = new Map(); // added file -> the deleted one it replaces
      for (const f of examined) {
        const a0 = textAt(root, after, f);
        if (textAt(root, before, f) !== null || a0 === null) continue;
        const was = gone.find((g) => ![...replaced.values()].includes(g) && shared(textAt(root, before, g), a0));
        if (was) replaced.set(f, was);
      }
      const asserted = examined.map((f) => {
        if ([...replaced.values()].includes(f)) return { file: f, class: 'none', why: `replaced by ${[...replaced].find(([, g]) => g === f)[0]}` };
        if (replaced.has(f)) { const c = classifyTestChange(textAt(root, before, replaced.get(f)), textAt(root, after, f), ids); return { file: f, ...c, why: `replaces ${replaced.get(f)}: ${c.why}` }; }
        const c = classifyTestChange(textAt(root, before, f), textAt(root, after, f), ids);
        // A new file is additive only when every requirement it names is new, or the provider's
        // own source did not change in this land (the coordinator's ruling, 6 Nov, under Bob's "c":
        // additive means nothing an existing user relies on changed). One naming an existing
        // Provides requirement while its implementation changed may assert a changed answer.
        if (textAt(root, before, f) === null && c.class === 'additive' && src.length) {
          const old = idsBefore.filter((r) => nameRe(r).test(textAt(root, after, f) || ''));
          if (old.length) return { file: f, class: 'breaking', why: `added, naming ${old.join(', ')} (Provides before this land) while ${id}'s source changed: it may assert a changed answer` };
        }
        return { file: f, ...c };
      });
      out.provides_test_changes = asserted;
      const real = asserted.filter((x) => x.class !== 'none').map((x) => x.file);
      if (real.length) out.provides_tests = real;
    }
  }
  // Bob's refinement "c" (6 Nov): breaking (an export removed, renamed or of another kind; a
  // Provides test whose existing expected values or keys changed) reschedules each user for a job;
  // additive (only new exports, or Provides tests that only add keys or fields) retests each user
  // through the gate alone (layer retest), a red retest falling back to a job.
  const ex = out.exports;
  const exportsBreaking = !!ex && (ex.removed.length || ex.kinds.length) > 0;
  const exportsAdditive = !!ex && ex.added.length > 0;
  const testsBreaking = (out.provides_test_changes || []).some((x) => x.class === 'breaking');
  const testsAdditive = (out.provides_test_changes || []).some((x) => x.class === 'additive');
  out.triggers = [...(exportsBreaking || exportsAdditive ? ['exports'] : []), ...(out.provides_tests ? ['provides-test'] : []), ...(out.unread ? ['exports-unread'] : [])];
  out.triggers_old = [...(anyExport ? ['exports'] : []), ...(out.provides ? ['provides-text'] : []), ...(out.provides_tests_old ? ['provides-test'] : []), ...(out.unread ? ['exports-unread'] : [])];
  out.class = exportsBreaking || testsBreaking || out.unread ? 'breaking' : exportsAdditive || testsAdditive ? 'additive' : 'none';
  // A change confined to the provider's own test files (its source, requirements and exports
  // unchanged) is no interface change for its users (the coordinator, 7 Nov, C11: copy PR 727 changed
  // only a provider module's test/m/filings/fixture.mjs and rescheduled action-plans and escalation). Only a
  // user whose code or tests import a changed test file is touched, and that one as breaking: the
  // land reads which (testImporters). The verdict the tests alone would give is kept (by_tests).
  const own = files.filter((f) => f !== entryFile(id) && f !== metricsFile(id) && !isRecordPath(cfg, f));
  const testFiles = own.filter((f) => (e.tests || []).some((p) => underPath(f, p)));
  if (!src.length && !out.exports && !out.unread && testFiles.length && testFiles.length === own.length) {
    out.test_only = { files: testFiles, by_tests: out.class };
    out.class = 'none';
  }
  out.source_changed = src.length > 0;
  out.changed = out.class !== 'none';
  return out;
}
// The users whose own code or tests import one of files (the provider's changed test files), at ref:
// a relative import resolved from the importing file, or the path written out whole.
// provTests: the provider's test roots; a file there that imports a changed one (a shared helper
// re-exporting a fixture) counts as changed too, followed until nothing new (cold review of C11).
const CODE_EXT = ['', '.mjs', '.js', '.cjs', '.ts', '.mts', '.cts', '.tsx', '.jsx', '/index.mjs', '/index.js', '/index.ts'];
const codeFiles = (root, ref, roots) => (roots.length ? git(['ls-tree', '-r', '--name-only', '-z', ref, '--', ...roots], { cwd: root, allowFail: true }).stdout.split('\0').filter((f) => /\.(m|c)?(j|t)sx?$/.test(f)) : []);
function importsAny(f, t, want) {
  const noExt = (x) => x.replace(/\.(m|c)?(j|t)sx?$/, '');
  if ([...want].some((x) => t.includes(x) || t.includes(noExt(x)))) return true;
  return specifiers(t).some(({ spec }) => {
    if (!spec.startsWith('.')) return false;
    const base = posix.normalize(posix.join(posix.dirname(f), spec));
    // A TypeScript import names the .js it compiles to: the .ts beside it is meant.
    return [base, base.replace(/\.js$/, '.ts'), base.replace(/\.mjs$/, '.mts')].some((b) => CODE_EXT.some((x) => want.has(b + x)));
  });
}
export function testImporters(root, cfg, ref, users, files, { provTests = [] } = {}) {
  if (!files.length || !users.length) return [];
  const want = new Set(files);
  const helpers = codeFiles(root, ref, provTests);
  for (let grew = true; grew;) {
    grew = false;
    for (const f of helpers) if (!want.has(f) && importsAny(f, textAt(root, ref, f) || '', want)) { want.add(f); grew = true; }
  }
  return users.filter((u) => {
    const e = entryAt(root, ref, u);
    return codeFiles(root, ref, [...(e?.paths || []), ...(e?.tests || [])]).some((f) => importsAny(f, textAt(root, ref, f) || '', want));
  });
}
// An export's kind from its signature (exports.mjs): function, class, value, external, method, getter...
export const kindOf = (sig) => { const t = String(sig ?? ''); return /^function\b/.test(t) ? 'function' : /^static \(/.test(t) ? 'static method' : /^\(/.test(t) ? 'method' : t; };
// The requirement ids the Public / Provides section names (**R<id>**), or null without a section.
export function providesIds(md) {
  const t = providesRaw(md);
  return t === null ? null : [...new Set([...t.matchAll(/\*\*(R[\w.-]+?)\*\*/g)].map((m) => m[1]))];
}
export function interfaceText(ic) {
  const parts = [];
  if (ic.exports) {
    const x = ic.exports;
    const kinds = new Set(x.kinds || x.changed.map((c) => c.name));
    if (x.removed.length) parts.push(`removed ${x.removed.join(', ')}`);
    if (x.changed.some((c) => kinds.has(c.name))) parts.push(`changed the kind of ${x.changed.filter((c) => kinds.has(c.name)).map((c) => `${c.name} ${c.before} -> ${c.after}`).join(', ')}`);
    if (x.added.length) parts.push(`added ${x.added.join(', ')}`);
    if (x.changed.some((c) => !kinds.has(c.name))) parts.push(`changed the parameters of ${x.changed.filter((c) => !kinds.has(c.name)).map((c) => `${c.name} ${c.before} -> ${c.after}`).join(', ')} (not a trigger)`);
  }
  if (ic.provides) parts.push('its Public / Provides text changed (a notice, not a trigger)');
  if (ic.test_only) {
    const imp = ic.test_only.importers || [];
    const forImp = imp.length ? `${imp.join(', ')} import${imp.length === 1 ? 's' : ''} a changed test file: breaking for ${imp.length === 1 ? 'it' : 'them'}` : '';
    // After an earlier source land in the layer (PD-15): the tests' verdict, at most additive.
    if (ic.test_only.earlier_source) {
      const v = ic.test_only.capped ? `its tests alone read ${ic.test_only.by_tests}, capped at additive since this land changed neither source nor exports (PD-15): each user is retested by its gate alone` : ic.test_only.by_tests === 'additive' ? 'additive: each user is retested by its gate alone' : ic.test_only.by_tests === 'breaking' ? 'breaking by its tests alone: each user re-runs in a job' : 'no interface change for its users';
      parts.push(`only its own tests changed (${ic.test_only.files.join(', ')}) after an earlier land changed its source: ${v}${forImp ? `; but ${forImp}` : ''}`);
      return parts.join('; ');
    }
    parts.push(`only its own tests changed (${ic.test_only.files.join(', ')}): no interface change for its users${forImp ? `, but ${forImp} only` : ''}`);
    return parts.join('; ');
  }
  if (ic.provides_tests) parts.push(`its tests of Public / Provides requirements changed what they assert (${(ic.provides_test_changes || []).filter((x) => x.class !== 'none').map((x) => `${x.file}: ${x.class}, ${x.why}`).join(', ') || ic.provides_tests.join(', ')}), which may mean a changed answer shape`);
  if (ic.class && ic.class !== 'none') parts.push(ic.class === 'additive' ? 'additive: each user is retested by its gate alone' : 'breaking: each user re-runs in a job');
  if (ic.unread) parts.push(`its exports could not be read (${ic.unread})`);
  return parts.join('; ') || 'no change';
}

// ---- the state branch's rows ----------------------------------------------------------------

// Every row under layerflow/<n>/ as the fetched state branch holds it.
export function flowRows(root, sb, n) {
  // One ls-tree and one cat-file --batch (C50: the copy's idle check read every row with a git show
  // of its own, thousands a command); one git show each only when the batch fails.
  const ref = `refs/remotes/origin/${sb}`;
  const got = treeBlobs(root, ref, [`${FLOW_DIR}/${n}/`]);
  const r = got ? null : git(['ls-tree', '-r', '--name-only', '-z', ref, '--', `${FLOW_DIR}/${n}/`], { cwd: root, allowFail: true });
  const files = got ? [...got.keys()].filter((f) => f.endsWith('.json')) : r.code === 0 ? r.stdout.split('\0').filter((f) => f.endsWith('.json')) : [];
  const rows = files.flatMap((f) => { try { return [JSON.parse(got ? got.get(f) : readState(root, sb, f))]; } catch { return []; } });
  const by = (k) => rows.filter((x) => x.row === k).sort((a, b) => String(a.at).localeCompare(String(b.at)));
  // A reschedule cleared for its user by a recorded ruling (layer clear) is outstanding no more.
  const clears = by('clear');
  const cleared = (r) => clears.some((c) => c.user === r.user && c.provider === r.provider && c.provider_land === r.provider_land);
  return { open: by('open')[0] || null, merged: by('merged')[0] || null, runs: by('run'), lands: by('land'), reschedules: by('reschedule').filter((r) => !cleared(r)), reschedules_all: by('reschedule'), clears, retests: by('retest'), retest_refusals: by('retest-refused'), starts: by('start'), syncs: by('sync'), tests: by('test'), gates: by('gate'), joins: by('join'), companions: by('companion'), items: by('items'), earlies: by('early') };
}
// One file per event, added and never edited: an existing file is the same event, kept.
function addFiles(w, files) {
  for (const [path, row] of files) {
    const p = join(w, path);
    if (existsSync(p)) continue;
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(row, null, 2) + '\n');
  }
}
export const writeRows = (root, sb, msg, files) => writeState(root, sb, msg, (w) => (addFiles(w, files), {}));

// A reschedule is outstanding until a land of its user holds the provider's land.
export const outstanding = (reschedules, lands, user, anc) => reschedules.filter((r) => r.user === user && !lands.some((l) => l.module === user && anc(r.provider_land, l.head)));

// ---- module states --------------------------------------------------------------------------

// Each module of the layer: { id, state, why, pr, lands, outstanding, marks }. state:
//   deferred     BLOCKED at the layer tip: it does not hold the merge (PLN-4);
//   rescheduled  a provider's interface changed since its last green run: it re-runs;
//   published    its PR into the layer is ready (its gate on its tip decides the land);
//   working      its job is open (a draft PR into the layer);
//   complete     its last publish landed, no reschedule outstanding, nothing open; or nothing to
//                do (COMPLETE before the layer opened, no unmet requirement mark);
//   not started  no job yet: one can start; a module that joined the layer from a layer behind it
//                (layer join: the coordinator's ruling, 6 Nov) is not started until it lands here.
export function moduleStates({ mods, entries, marks, prs, lands, reschedules, anc, joins = new Map(), earlies = new Map(), items = new Map(), itemIds = new Map(), owed = new Set(), itemWord = 'completion item(s)' }) {
  // A module's item ids, from the items themselves: their words may hold '; ' and ': ' (copy, 8 Nov:
  // interface-assets read "CR2-3, CR2-21, today mk-updband is drawn ..."); split only without them.
  const idsOf = (id) => (itemIds.get(id) || items.get(id).split('; ').map((x) => x.split(': ')[0])).join(', ');
  return mods.map((id) => {
    const e = entries.get(id);
    const pr = (prs || []).find((p) => p.module === id) || null;
    const mine = lands.filter((l) => l.module === id);
    const out = outstanding(reschedules, lands, id, anc);
    const m = marks.get(id) || [];
    const j = joins.get(id) || null;
    const base = { id, pr: pr?.number ?? null, lands: mine.length, outstanding: out, marks: m, entry_state: e?.status?.state ?? null, ...(j ? { join: j } : {}) };
    if (e?.status?.state === 'BLOCKED') return { ...base, state: 'deferred', why: `BLOCKED: ${e.status.reason || 'no reason'}` };
    // An item joined after its job started (PD-14 (i)): it runs again with the item's words, ahead
    // of a reschedule (a re-test's job has no item words, and its land would tick the item: cold
    // review of (i)); its job starts on the layer tip, so it holds the provider's land too.
    if (owed.has(id) && items.has(id) && !pr) return { ...base, state: 'not started', item: items.get(id), why: `completion item(s) joined after its last job started: ${idsOf(id)}${out.length ? `; it re-runs against ${[...new Set(out.map((r) => r.provider))].join(', ')}'s new interface too` : ''}` };
    if (out.length) return { ...base, state: 'rescheduled', why: `re-runs against ${[...new Set(out.map((r) => r.provider))].join(', ')}'s new interface` };
    if (pr && !pr.draft) return { ...base, state: 'published', why: `PR ${pr.number} ready into the layer` };
    if (pr) return { ...base, state: 'working', why: `PR ${pr.number}, a draft` };
    if (mine.length) return { ...base, state: 'complete', why: `landed ${mine.length} time(s), last PR ${mine.at(-1).pr}` };
    // Started early (R14) and no pull request into the layer: its start did not finish, or its PR
    // closed; job start resumes it as any unfinished start (cold review of R14).
    if (earlies.has(id) && !j) return { ...base, state: 'not started', early: earlies.get(id).from, why: `started early while layer ${earlies.get(id).from} was open; no pull request into the layer: job start resumes it` };
    // A completion layer's module, its own or joined (C33, PD-14), or a round layer's (BD-R1): its
    // open items, or its found marks, are its work.
    if (items.has(id)) return { ...base, state: 'not started', item: items.get(id), why: `${itemWord} ${idsOf(id)}${j ? `, joined from ${j.from === null ? 'no layer' : `layer ${j.from}`}` : ''}` };
    if (j) return { ...base, state: 'not started', why: `joined from ${j.from === null ? 'no layer' : `layer ${j.from}`}: ${j.why}` };
    if (e?.status?.state === 'COMPLETE' && !m.length) return { ...base, state: 'complete', why: 'COMPLETE before the layer opened, no unmet mark' };
    return { ...base, state: 'not started', why: e ? `${e.status?.state}${m.length ? `, unmet ${m.join(', ')}` : ''}` : 'no ledger entry' };
  });
}
export const DONE = ['complete', 'deferred'];

// ---- the order within a layer (R10) ---------------------------------------------------------

// Bob, 6 Nov ~15:35: start a layer's jobs earliest in the total (dependency) order first, so an
// interface change is found before its users start or test. providers: each module's providers in
// the layer, from the modules file (its uses), else its entry's.
export function layerProviders(mods, modules, entries) {
  const named = new Map((modules || []).filter((m) => m?.id).map((m) => [m.id, m.uses || []]));
  const inLayer = new Set(mods);
  return new Map(mods.map((id) => [id, [...new Set(named.get(id) || entries.get(id)?.uses || [])].filter((u) => u !== id && inLayer.has(u))]));
}
// The layer's modules, each after its providers in the layer, the layer map's order kept otherwise;
// a cycle's modules follow in the map's order.
export function totalOrder(mods, providers) {
  const out = [];
  const done = new Set();
  let moved = true;
  while (moved) {
    moved = false;
    for (const id of mods) if (!done.has(id) && (providers.get(id) || []).every((p) => done.has(p))) { out.push(id); done.add(id); moved = true; }
  }
  return [...out, ...mods.filter((id) => !done.has(id))];
}
// A provider has landed when its land is on the layer (a land row), or it was BLOCKED (deferred: it
// lands nothing here), or COMPLETE with no unmet mark at the layer tip (its interface already there;
// one with marks is about to be reopened: cold review of PR 196).
export const landedProvider = (p, lands, entries, marks = new Map()) => lands.some((l) => l.module === p) || entries.get(p)?.status?.state === 'BLOCKED' || (entries.get(p)?.status?.state === 'COMPLETE' && !(marks.get(p) || []).length);
// The in-layer providers of id not yet landed on layer/<n>, read from origin (job start's early mark).
export function earlyProviders(root, cfg, n, id, ref) {
  const L = layersAt(root, cfg, ref).find((x) => x.n === n);
  if (!L) return [];
  const fr = flowRows(root, cfg.state_branch, n);
  // Joined modules count, as readLayer counts them (R12; cold review of PR 191).
  const mods = [...new Set([...L.mods, ...fr.joins.map((j) => j.module)])];
  const entries = new Map(mods.map((m) => [m, entryAt(root, ref, m) || entryAt(root, `refs/remotes/origin/${cfg.tranche}`, m)]));
  const prov = layerProviders(mods, readModules(root, cfg, ref), entries);
  const lands = fr.lands;
  const dir = cfg.requirements_dir.replace(/\/$/, '');
  const marksOf = (p) => unmetIds(textAt(root, ref, entries.get(p)?.requirements || `${dir}/${p}.md`) || '').filter((x) => !isFound(x));
  // As layer jobs reads it: a provider BLOCKED at its job branch's head is deferred (readLayer's PR-head read).
  const blockedOnBranch = (p) => {
    const r = git(['ls-remote', '--heads', 'origin', `refs/heads/job/${p}`, `refs/heads/job/${p}-*`], { cwd: root, allowFail: true });
    return r.code === 0 && r.stdout.split('\n').filter(Boolean).some((l) => { const [sha, h] = l.split('\t'); const name = h.replace('refs/heads/', ''); if (!hasCommit(root, sha)) fetchBranch(root, name, { allowFail: true }); return hasCommit(root, sha) && entryAt(root, sha, p)?.status?.state === 'BLOCKED'; });
  };
  const marks = new Map((prov.get(id) || []).map((p) => [p, marksOf(p)]));
  return (prov.get(id) || []).filter((p) => !landedProvider(p, lands, entries, marks) && !blockedOnBranch(p));
}
export const mergeReady = (states) => states.every((s) => DONE.includes(s.state));

// What BOB may start (the tool lists, BOB starts; Bob, 5 Nov): each module not started, and each
// complete one a reschedule reopened (its PR landed, so a new attempt).
// A listed job whose in-layer provider has not landed: listed after the rest, and startable now as an
// early start (R10, Bob 6 Nov). Worded so it is not read as a wait (C25: on the copy's layer 11 BOB
// held such jobs 20-108 min, "waiting on providers still in flight", with slots empty).
// Whether a listed act takes a job session (a slot under the cap): every job start does; an additive
// change's `layer retest` runs in CI with none (C25: the idle check counted it as a slot's work).
export const needsSlot = (j) => !j?.additive;
// A layer's starts, and for a completion layer the joins its open items owe (C35).
// A module with items to join is listed by its join alone: its job starts after, with their words
// (PD-14 (i): a job started first would run without them, and again after the join).
export const startableOf = (x) => { const j = new Set((x.joinable || []).map((y) => y.id)); return [...startable(x.states).filter((y) => !j.has(y.id)), ...(x.joinable || [])]; };
// The open items of completion_file whose module the layer does not hold, one join act per module.
export function joinableItems(root, cfg, tr, mods, n, known = new Set()) {
  let c = null;
  try { c = completionItems(root, cfg, tr); } catch { c = null; }
  const have = new Set(mods);
  // A module with no ledger entry has nothing to join: the item is BOB's to fix (cold review of C35).
  const ids = ledgerIds(root, tr);
  // Not yet in the layer: its module is not (C35), or its module is and the item came after (PD-14 (i)).
  const due = openItems(c).filter((x) => !x.whole && !x.malformed && (!have.has(x.target) || !known.has(x.id)) && ids.has(x.target));
  return [...new Set(due.map((x) => x.target))].map((id) => {
    const its = due.filter((x) => x.target === id);
    const why = its.map((x) => `${x.id}: ${x.what}`).join('; ');
    return { id, join: true, ...(have.has(id) ? { more: true } : {}), items: its.map((x) => x.id), cmd: `${P3} layer join ${id} --why ${JSON.stringify(why.length > 200 ? `${its.map((x) => x.id).join(', ')} (${c.file})` : why)}, then ${P3} layer jobs ${n} and its job start` };
  });
}
export const afterNote = (after) => `   (${after.join(', ')} not landed yet: start it now on a free slot, this plain job start, no --early (R10); only a recorded hold waits)`;
export function startable(states) {
  const list = states.flatMap((s) => {
    if (s.state === 'not started' && s.item) return [{ id: s.id, cmd: `${P3} job start ${s.id} --sessions <file>${s.entry_state === 'COMPLETE' ? ` --reopen ${JSON.stringify(s.item)}` : ''}` }];
    if (s.state === 'not started' && s.join) return [{ id: s.id, cmd: `${P3} job start ${s.id} --sessions <file>${s.entry_state === 'COMPLETE' ? ` --reopen ${JSON.stringify(s.join.why)}` : ''}` }];
    if (s.state === 'not started') return [{ id: s.id, cmd: `${P3} job start ${s.id} --sessions <file>${s.marks.length && s.why.startsWith('COMPLETE') ? ` --reopen "meet the unmet requirement marks ${s.marks.join(', ')}"` : ''}` }];
    if (s.state === 'rescheduled' && s.pr === null) {
      const why = [...new Set(s.outstanding.map((r) => `${r.provider} (land ${short(r.provider_land)})`))].join(', ');
      // A module that never ran (OPEN, never COMPLETE) starts plainly: --reopen is for a COMPLETE one
      // (coordinator, 6 Nov 16:03: publish-schedule, project-stage and case-account were refused).
      if (s.entry_state && s.entry_state !== 'COMPLETE') return [{ id: s.id, cmd: `${P3} job start ${s.id} --sessions <file>` }];
      const job = `${P3} job start ${s.id} --sessions <file> --reopen "re-test against the new interface of ${why}"`;
      // With no unmet mark, CI can re-test it with no job session (layer retest): the way for an
      // additive change (Bob's "c"), offered beside the job for a breaking one.
      if (s.marks.length) return [{ id: s.id, cmd: job }];
      const additive = !s.retest_refused && s.outstanding.every((r) => r.class === 'additive');
      return [{ id: s.id, cmd: additive ? `${P3} layer retest ${s.id}` : job, ...(additive ? { job, additive: true } : {}) }];
    }
    return [];
  });
  // R10: in the layer's total order (the states' own), those with an in-layer provider not yet
  // landed after the rest, each marked "after <provider>".
  const mark = (x) => { const after = states.find((s) => s.id === x.id)?.after || []; return after.length ? { ...x, after } : x; };
  const all = list.map(mark);
  return [...all.filter((x) => !x.after), ...all.filter((x) => x.after)];
}

// ---- reading a layer ------------------------------------------------------------------------

// The reads of status, layer jobs and the idle check: a clone's copy this recent serves (C18).
const READ_MS = 30e3;
function fetchLayer(root, cfg, n) {
  fetchBranch(root, cfg.tranche, { allowFail: true });
  fetchBranch(root, layerBranch(n), { allowFail: true });
  fetchState(root, cfg.state_branch, { fresh: true });
}
const layerRef = (n) => `refs/remotes/origin/${layerBranch(n)}`;

export function readLayer(root, cfg, n, { io = {}, slug = null } = {}) {
  const ref = layerRef(n);
  if (git(['rev-parse', '-q', '--verify', ref], { cwd: root, allowFail: true }).code !== 0) fail(`no ${layerBranch(n)} on origin: open it first (${P3} layer open ${n})`);
  const layers = layersAt(root, cfg, ref);
  const L = layers.find((x) => x.n === n) || fail(`layer ${n} is not in ${cfg.layers_file} on ${layerBranch(n)}`);
  const rows = flowRows(root, cfg.state_branch, n);
  // The layer's modules and those that joined it from a layer behind (layer join).
  const joins = new Map(rows.joins.map((j) => [j.module, j]));
  const mods = [...L.mods, ...[...joins.keys()].filter((id) => !L.mods.includes(id))];
  const dir = cfg.requirements_dir.replace(/\/$/, '');
  // An entry the layer branch lacks is read from the tranche, the ledger's home (copy, 6 Nov: layer/8
  // was cut before PR 638 added four entries): its job starts from it (job start) and carries it on.
  const home = `refs/remotes/origin/${cfg.tranche}`;
  const entries = new Map(mods.map((id) => [id, entryAt(root, ref, id) || entryAt(root, home, id)]));
  const reqOf = (id) => entries.get(id)?.requirements || `${dir}/${id}.md`;
  const marks = new Map(mods.map((id) => [id, unmetIds(textAt(root, ref, reqOf(id)) ?? textAt(root, home, reqOf(id)) ?? '').filter((x) => !isFound(x))]));
  const list = (io.openPRs || openPRs)(slug, layerBranch(n));
  if (list === null) fail(`GitHub unreadable: the open pull requests into ${layerBranch(n)} are not known`);
  // The tranche's ids too: a module whose entry only the tranche holds has its job PR named by it.
  const ids = new Set([...ledgerIds(root, ref), ...ledgerIds(root, home)]);
  const prs = list.map((p) => ({ number: p.number, draft: !!p.draft, head: p.head?.sha, ref: p.head?.ref, module: branchModule(p.head?.ref, ids) }));
  // A job that blocks commits BLOCKED on its own branch, not on the layer (copy, 6 Nov: corpus-export,
  // BLOCKED on rows owed to layer 11, showed as working and its draft PR held the layer merge): the
  // entry at its open PR's head counts when it reads BLOCKED, and that PR holds the merge no longer.
  const blockedOn = new Map();
  for (const p of prs.filter((x) => x.module && mods.includes(x.module) && x.head)) {
    if (git(['cat-file', '-e', `${p.head}^{commit}`], { cwd: root, allowFail: true }).code !== 0 && p.ref) fetchBranch(root, p.ref, { allowFail: true });
    const e = entryAt(root, p.head, p.module);
    if (e?.status?.state === 'BLOCKED') { entries.set(p.module, e); blockedOn.set(p.module, p.number); }
  }
  // A module deferred by its PR head's BLOCKED whose newest gate run on that head passed its suite has
  // its work done, BLOCKED only on a process finding (copy, 6 Nov: layer 8's 658-661 on the old tool's
  // ledger finding): a merge then would drop finished work (layerMerge refuses; layer status says so).
  // Any run on that head of the module's whole suite that passed (stricter than layerCover, which takes
  // base-red as the land does; this only holds a merge, the safe side): a later
  // row never turns it off; a read that fails is unknown, which holds the merge too (cold review of
  // PR 201).
  const doneWork = new Map();
  const whole = (r, id) => r?.suite === 'pass' && r.trigger === 'code' && Array.isArray(r.scope) && r.scope.includes(id) && !(Array.isArray(r.requirements_only) && r.requirements_only.some((x) => x?.module === id));
  for (const [id, k] of blockedOn) {
    const pr = prs.find((q) => q.number === k);
    let runs = null;
    try { const c = (io.comments || ghComments)(slug, k); runs = Array.isArray(c) ? gateRuns(c).filter((r) => r.sha === pr.head) : null; } catch { runs = null; }
    if (runs === null) doneWork.set(id, { pr: k, unknown: true });
    else if (runs.some((r) => whole(r, id))) doneWork.set(id, { pr: k });
  }
  const anc = (a, b) => isAnc(root, a, b);
  // A completion layer's items, or a round layer's found marks (BD-R1): its modules' reopen words.
  const work = L.completion || L.round;
  let states = moduleStates({ mods, joins, items: itemReopen(work, rows.joins, rows.items), itemIds: itemIdMap(work, rows.joins, rows.items), itemWord: L.round ? 'found mark(s)' : 'completion item(s)', owed: new Set(mods.filter((id) => itemsOwed(rows, id).length)), earlies: new Map(rows.earlies.map((r) => [r.module, r])), entries, marks, prs, lands: rows.lands, reschedules: rows.reschedules, anc })
    .map((x) => (x.state === 'deferred' && blockedOn.has(x.id) ? { ...x, why: `${x.why} (on PR ${blockedOn.get(x.id)}'s head)`, ...(doneWork.has(x.id) ? { done_work: doneWork.get(x.id).pr, ...(doneWork.get(x.id).unknown ? { done_unknown: true } : {}) } : {}) } : x))
    // A retest refused since its newest outstanding reschedule: a job re-tests it.
    .map((x) => (x.outstanding?.length && (rows.retest_refusals || []).some((r) => r.module === x.id && String(r.at) >= String(x.outstanding.map((o) => o.at).sort().at(-1))) ? { ...x, retest_refused: true } : x));
  // R10: the states in the layer's total order, each with the in-layer providers not yet landed.
  const providers = layerProviders(mods, readModules(root, cfg, ref), entries);
  const order = totalOrder(mods, providers);
  const byId = new Map(states.map((x) => [x.id, x]));
  states.splice(0, states.length, ...order.map((id) => ({ ...byId.get(id), after: (providers.get(id) || []).filter((p) => !landedProvider(p, rows.lands, entries, marks)) })));
  // PD-19: a companion is named by its dependent jobs and their why (its reopen words, its brief).
  // PD-19b: no land order between them; they land in the same layer, in any order.
  states.splice(0, states.length, ...states.map((x) => companionState(root, rows, x)));
  // The open PRs that hold the merge: all but those of a module deferred by its PR head's BLOCKED.
  const holding = prs.filter((p) => !(blockedOn.has(p.module) && blockedOn.get(p.module) === p.number));
  // An open item of completion_file the completion layer does not hold (added after its open): its
  // act is the join (PD-14), then its job; listed beside the layer's starts (C35). A module already
  // in the layer joins its new items the same way (PD-14 (i)).
  const joinable = L.completion ? joinableItems(root, cfg, `refs/remotes/origin/${cfg.tranche}`, mods, n, new Set(layerItems(L.completion, rows.joins, rows.items).map((x) => x.id))) : [];
  return { n, ref, mods, layers, rows, entries, prs, holding, states, order, providers, ...(L.completion ? { completion: L.completion } : {}), ...(L.round ? { round: L.round } : {}), ...(joinable.length ? { joinable } : {}) };
}

// Whether a layer is behind us when the flow starts mid-tranche (the copy switches after layer 6,
// closed by the train: cold review 3): closed (layers/closed.jsonl, layer close's or layer merge's
// row), merged by the flow, or with nothing left in it (every module COMPLETE or BLOCKED at the
// tranche tip, no unmet requirement mark), as status's layerState counts an implicit close.
// Only this tranche's close rows, as status's closedRows keeps them: its name, a commit not on main
// (an earlier tranche of the same name closed its layers before it reached main: confirming review N4).
export function closedLayers(root, sb, cfg) {
  fetchBranch(root, 'main', { allowFail: true, within: READ_MS });
  const main = git(['rev-parse', '-q', '--verify', 'refs/remotes/origin/main'], { cwd: root, allowFail: true }).code === 0 ? 'refs/remotes/origin/main' : null;
  return new Set((readState(root, sb, CLOSED_FILE) || '').split('\n').filter(Boolean).flatMap((l) => {
    try { const r = JSON.parse(l); return r.row === 'closed' && (!cfg || r.tranche === cfg.tranche) && !(main && r.commit && hasCommit(root, r.commit) && isAnc(root, r.commit, main)) ? [r.layer] : []; } catch { return []; }
  }));
}
// This tranche's merge of the layer: a merged row whose merge has not reached main.
const mergedHere = (root, rows) => !!rows.merged && !staleFlow(root, rows);
// A layer whose flow rows are an earlier tranche's: its merge reached main. The flow's rows and
// branch for a second tranche are not built (the trial is one layer); refused, never reused.
// main fetched at most once a minute per clone (status reads layerPlace per user and per PR row:
// cold review of PR 191).
const mainFetched = new Map();
function staleFlow(root, rows) {
  const c = rows.merged?.commit;
  if (!c || !hasCommit(root, c)) return false;
  if (Date.now() - (mainFetched.get(root) || 0) > 60000) { fetchBranch(root, 'main', { allowFail: true, within: 60e3 }); mainFetched.set(root, Date.now()); }
  return git(['rev-parse', '-q', '--verify', 'refs/remotes/origin/main'], { cwd: root, allowFail: true }).code === 0 && isAnc(root, c, 'refs/remotes/origin/main');
}
function layerBehind(root, cfg, L, closed, ref) {
  const rows = flowRows(root, cfg.state_branch, L.n);
  if (closed.has(L.n) || mergedHere(root, rows)) return true;
  // A module joined it (R12): the layer has work, whatever its own modules' states (cold review of PR 191).
  if (rows.joins.length) return false;
  const dir = cfg.requirements_dir.replace(/\/$/, '');
  return L.mods.every((id) => {
    const e = entryAt(root, ref, id);
    if (!e || !['COMPLETE', 'BLOCKED'].includes(e.status?.state)) return false;
    return !unmetIds(textAt(root, ref, e.requirements || `${dir}/${id}.md`) || '').filter((x) => !isFound(x)).length;
  });
}

// The open layer as the flow reads it (one read, shared by status, send's lead to BOB and the
// sweep): { kind: 'open', n, states, prs, startable, ready } (ready: every module complete or
// deferred, no PR open into the layer), { kind: 'next', n } (the next layer, not open),
// { kind: 'stale', n } (its rows an earlier tranche's), { kind: 'done' } (every layer merged) or
// { kind: 'none' } (no layer map: jobs keep the tranche, next work is the flow's).
// The rounds at the tranche (rounds.mjs roundState), read as the flow reads it.
export function nextRound(root, cfg, layers, tr) {
  if (directMode(cfg)) return directRoundsAt(root, cfg);
  return roundState(root, cfg, tr, { layers, flows: (k) => flowRows(root, cfg.state_branch, k), lastWalk: deployRowsOf(root, cfg).at(-1) || null, flawed: flawedModules(root, cfg, tr, { layers }) });
}
export function openLayer(root, cfg, { slug, io = {} } = {}) {
  // PD-25: under the direct flow no layer opens; its view (direct.mjs) has the same shape.
  if (directMode(cfg)) return directView(root, cfg, { slug, io });
  const tr = `refs/remotes/origin/${cfg.tranche}`;
  const layers = layersAt(root, cfg, tr);
  if (!layers.length) return { kind: 'none' };
  const closed = closedLayers(root, cfg.state_branch, cfg);
  for (const layer of layers) {
    const { n } = layer;
    const r = flowRows(root, cfg.state_branch, n);
    // A layer behind us (closed, or with nothing left) is passed over first, stale rows or not,
    // as layer open passes it (third confirming review, minor 1).
    if ((!r.open || staleFlow(root, r)) && layerBehind(root, cfg, layer, closed, tr)) continue;
    if (staleFlow(root, r)) return { kind: 'stale', n };
    if (r.merged) continue;
    if (!r.open) return { kind: 'next', n };
    fetchBranch(root, layerBranch(n), { allowFail: true, within: READ_MS });
    const x = readLayer(root, cfg, n, { io, slug });
    let early = { next: null, list: [], skipped: [] };
    try { early = earlyNext(root, cfg, n, x); } catch (e) { if (!(e instanceof Error)) throw e; early = { next: null, list: [], skipped: [], unread: e.message }; }
    return { kind: 'open', n, ...(layer.round ? { round: layer.round.n, of: layer.round.of } : {}), states: x.states, prs: x.prs, companions: companionLines(x.rows, x.states), startable: startableOf(x), ready: mergeReady(x.states) && !x.holding.length && !x.joinable?.length, early: early.list, early_next: early.next };
  }
  // Every layer merged (BD-R1, rounds.mjs): the round's next layer for its flawed modules, or the
  // next round's first once a walk ended this one; else the round waits on its walk, or is clean.
  // No completion layer opens any more: the copy's layer 12 was the last (Bob, 8 Nov).
  let rs = null;
  try { rs = nextRound(root, cfg, layers, tr); } catch { rs = null; }
  // A new round waits on its walk's findings, each recorded and none without a module, as layer
  // open refuses before them: status names that wait, never an open that refuses (cold review of C39).
  if (rs?.state === 'new' || rs?.state === 'clean') {
    const hold = walkHold(findingsOf(root, cfg, tr, deployRowsOf(root, cfg).at(-1) || null, { round: true }));
    const loose = unplaced(root, tr);
    if (hold || loose.length) return { kind: 'done', round: rs.state === 'new' ? rs.round : rs.round + 1, rounds: 'held', ...(hold ? { findings: true } : {}), why: hold || `${loose.map((f) => f.id).join(', ')} in the found file of no module: BOB names its module` };
  }
  if (rs?.next) return { kind: 'next', n: rs.next.n, round: rs.next.round, of: rs.next.of, mods: rs.next.mods, ...(rs.state === 'new' ? { walk: rs.walk } : {}) };
  if (rs) return { kind: 'done', round: rs.round, rounds: rs.state };
  return { kind: 'done' };
}
// ---- early starts into the next layer (R14) ----------------------------------------------

// Bob, 6 Nov ~18:55: "Why didn't the early starts launch before layer 8 closed?" While layer n is
// open, a module of the next layer to open whose providers have all landed or are COMPLETE (none
// in layer n still working, rescheduled or deferred) can start early, on idle capacity only, after
// layer n's own starts (Bob, 15:36), each logged and its rework counted.
// The mechanism: layer/<next> is cut ahead from layer/<n>'s tip by the first early start (and moved
// forward to that tip by each later one, a fast-forward: nothing lands on it before its open). The
// job's branch and draft pull request are on it, as any job of that layer's, so job sync, job test
// and the gate need nothing new; its publish waits for layer open <next>, which brings the branch
// up to the tranche tip (a fast-forward: layer n's merge holds every tip it was cut from). One
// layer stays open at a time; nothing lands out of order. Join rows (R12) were not used: they move
// a module into another layer, and an early start stays in its own.
// A layer branch cut ahead for early starts and not open: no open row for n, and an earlier layer
// open and not merged (whether or not its early row was written: cold review of R14).
// The users (of a land in layer n) that started early into a later layer not yet open: user -> that layer.
export function earlyUsers(root, sb, n, users, home) {
  const out = new Map();
  for (const u of users) {
    const k = home(u);
    if (k === null || k <= n) continue;
    const r = flowRows(root, sb, k);
    if (!r.open && !r.merged && r.earlies.some((e) => e.module === u)) out.set(u, k);
  }
  return out;
}
// Layer n cut ahead and not open: early rows and neither an open nor a merged row, from layer n-1's
// merge to n's open too (cold review of R14: the guards stopped at n-1's merge, and a plain start
// then took the cut-ahead tip). Returns the layer it was cut from (the newest early row's), else null.
export function cutAhead(root, sb, n) {
  const r = flowRows(root, sb, n);
  if (r.open || r.merged || !r.earlies.length) return null;
  return r.earlies.at(-1).from ?? n - 1;
}
const notOpen = (n, k) => `layer ${n} is not open: ${layerBranch(n)} was cut ahead from layer ${k} for early starts (${P3} layer jobs ${k} lists them while layer ${k} is open); it opens with ${P3} layer open ${n} once layer ${k} has merged`;
export const earlyHead = (n, next) => `early starts into layer ${next}, on idle capacity only, after layer ${n}'s own (Bob, 6 Nov; each logged, its rework counted): each provider landed or COMPLETE; cut from ${layerBranch(n)}'s tip, published once layer ${next} opens:`;
export function earlyNext(root, cfg, n, L) {
  const tr = `refs/remotes/origin/${cfg.tranche}`;
  const ref = layerRef(n);
  const layers = layersAt(root, cfg, ref);
  const closed = closedLayers(root, cfg.state_branch, cfg);
  const nx = layers.find((x) => x.n > n && !closed.has(x.n) && !flowRows(root, cfg.state_branch, x.n).merged && !layerBehind(root, cfg, x, closed, tr));
  if (!nx) return { next: null, list: [], skipped: [] };
  const rows = flowRows(root, cfg.state_branch, nx.n);
  if (rows.open) return { next: nx.n, list: [], skipped: [] };
  const dir = cfg.requirements_dir.replace(/\/$/, '');
  const entryOf = (id) => entryAt(root, ref, id) || entryAt(root, tr, id);
  const marksOf = (id, e) => { const f = e?.requirements || `${dir}/${id}.md`; return unmetIds(textAt(root, ref, f) ?? textAt(root, tr, f) ?? '').filter((x) => !isFound(x)); };
  const modules = readModules(root, cfg, ref);
  const named = new Map((modules || []).filter((m) => m?.id).map((m) => [m.id, m.uses || []]));
  const here = new Map(L.states.map((x) => [x.id, x]));
  // Started: a start row in the next layer, or an early row whose job branch reached origin (a start
  // that failed before its push is listed again: cold review of R14).
  const onOrigin = (id) => git(['ls-remote', '--heads', 'origin', `refs/heads/job/${id}`, `refs/heads/job/${id}-*`], { cwd: root, allowFail: true }).stdout.trim() !== '';
  const started = new Set([...rows.starts.map((r) => r.module), ...rows.earlies.map((r) => r.module).filter(onOrigin)]);
  // Work joined into the next layer (R12) is pending: its users wait for it; joined modules
  // themselves start from that layer's list once it opens, never early.
  const joined = new Set(rows.joins.map((j) => j.module));
  // A provider is settled when it is complete in layer n (landed, no reschedule outstanding), or,
  // outside layer n, COMPLETE with no unmet mark; a provider with a breaking change owed is
  // rescheduled in layer n, so never settled.
  const unsettled = (p) => {
    const st = here.get(p);
    if (st) return st.state === 'complete' ? null : `${p} is ${st.state} in layer ${n}`;
    if (joined.has(p)) return `${p} joined layer ${nx.n}: its work is pending`;
    const e = entryOf(p);
    // No entry at all (C16, the copy 7 Nov: 49 modules built before the ledger): named with its act.
    if (!e) return `${p} has no ledger entry (${entryFile(p)}): it is settled once BOB lands one (the census in \`${P3} status --role bob\` lists the module and its fix)`;
    if (e.status?.state !== 'COMPLETE') return `${p} is ${e.status?.state}`;
    return marksOf(p, e).length ? `${p} has unmet marks` : null;
  };
  const entries = new Map(nx.mods.map((id) => [id, entryOf(id)]));
  const list = [];
  const skipped = [];
  for (const id of totalOrder(nx.mods, layerProviders(nx.mods, modules, entries))) {
    const e = entries.get(id);
    if (started.has(id) || joined.has(id)) continue;
    if (!e) { skipped.push({ id, why: 'no ledger entry' }); continue; }
    if (e.status?.state === 'BLOCKED') { skipped.push({ id, why: 'BLOCKED' }); continue; }
    const m = marksOf(id, e);
    if (e.status?.state === 'COMPLETE' && !m.length) continue;
    const uses = [...new Set(named.get(id) || e.uses || [])].filter((u) => u !== id);
    const why = uses.map(unsettled).filter(Boolean);
    if (why.length) { skipped.push({ id, why: why.join('; ') }); continue; }
    list.push({ id, providers: uses, cmd: `${P3} job start ${id} --sessions <file> --early${e.status?.state === 'COMPLETE' ? ` --reopen ${JSON.stringify(`meet the unmet requirement marks ${m.join(', ')}`)}` : ''}` });
  }
  return { next: nx.n, list, skipped };
}
// job start <id> --early: the module listed early by the open layer's read, layer/<next> cut ahead
// (or moved forward to layer/<n>'s tip), and an early row (layerflow/<next>/early/) recorded.
export function earlyCut(root, cfg, id, { io = {}, by = 'bob', log = console.log } = {}) {
  needLayerMode(cfg, 'job start --early');
  fetchBranch(root, cfg.tranche, { allowFail: true });
  fetchState(root, cfg.state_branch, { fresh: true });
  const v = openLayer(root, cfg, { slug: io.slug || repoSlug(root), io });
  if (v.kind !== 'open') fail(`--early starts a job of the layer after the open one, and no layer is open${v.kind === 'next' ? ` (layer ${v.n} is next: ${P3} layer open ${v.n})` : ''}; nothing was started`);
  fetchBranch(root, layerBranch(v.n));
  const e = earlyNext(root, cfg, v.n, readLayer(root, cfg, v.n, { io, slug: io.slug || repoSlug(root) }));
  const x = e.list.find((q) => q.id === id);
  const startedEarly = e.next !== null && flowRows(root, cfg.state_branch, e.next).earlies.some((q) => q.module === id);
  if (!x) fail(`${id} cannot start early${e.next !== null ? ` into layer ${e.next}` : ' (no layer follows the open one)'}: ${startedEarly ? `it started early already; an early start that did not finish resumes with ${P3} job start ${id} once layer ${e.next} opens` : e.skipped.find((q) => q.id === id)?.why || 'it is not listed (started already, nothing to do, or not in the next layer)'}; ${P3} layer jobs ${v.n} lists the early starts; nothing was started`);
  const t = e.next;
  const b = layerBranch(t);
  const from = rev(root, layerRef(v.n));
  fetchBranch(root, b, { allowFail: true });
  const have = git(['rev-parse', '-q', '--verify', layerRef(t)], { cwd: root, allowFail: true }).code === 0;
  if (have && !isAnc(root, rev(root, layerRef(t)), from)) fail(`${b} is on origin and ${layerBranch(v.n)} does not hold it (something was pushed or merged into it before its open): ask the coordinator; nothing was started`);
  if (!have || rev(root, layerRef(t)) !== from) {
    const p = git(['push', '-q', 'origin', `${from}:refs/heads/${b}`], { cwd: root, allowFail: true });
    if (p.code !== 0) fail(`the push of ${b} failed (${p.stderr.trim()}); nothing was started`);
    fetchBranch(root, b);
    log(`${b} ${have ? 'moved forward' : 'cut ahead'} to ${layerBranch(v.n)} ${short(from)} for early starts (layer ${t} is not open)`);
  }
  writeRows(root, cfg.state_branch, `layer ${t}: ${id} starts early (layer ${v.n} open)`, [[flowFile(t, 'early', `${safeName(id)}-${Date.now()}`), { row: 'early', layer: t, module: id, from: v.n, base: from, providers: x.providers, at: now(), by }]]);
  fetchState(root, cfg.state_branch, { fresh: true });
  return { layer: t, from: v.n, base: from };
}
// Each early start's rework (R7 retest, R8 reschedule, or a provider notice after it started),
// and the rate, from the layer's rows and the notices.
export function earlyRework(rows, notices = []) {
  const last = new Map(rows.earlies.map((r) => [r.module, r]));
  const live = notices.filter((k) => !k.withdrawn);
  const each = [...last.values()].map((r) => {
    // Rework after the early start, cleared reschedules included (a cleared one was still rework).
    const resched = (rows.reschedules_all || rows.reschedules).some((x) => x.user === r.module && String(x.at) > String(r.at));
    const retest = rows.retests.some((x) => x.module === r.module && String(x.at) > String(r.at));
    const noticed = live.some((k) => (k.users || []).includes(r.module) && String(k.at) > String(r.at));
    return { module: r.module, from: r.from, at: r.at, rework: resched ? 'reschedule' : retest ? 'retest' : noticed ? 'notice' : null };
  });
  const rw = each.filter((x) => x.rework).length;
  return { early: each.length, rework: rw, rate: each.length ? Math.round((rw / each.length) * 1000) / 10 : null, each };
}

// openLayer after fetching the tranche and the state branch (the sweep, the idle check).
// fetch false: the refs this clone has.
export function readOpenLayer(root, cfg, { slug = null, io = {}, fetch = true } = {}) {
  // A read: the clone's copies within READ_MS serve (C18); every act re-reads what it acts on.
  if (fetch) {
    fetchBranch(root, cfg.tranche, { allowFail: true, within: READ_MS });
    fetchState(root, cfg.state_branch);
  }
  return openLayer(root, cfg, { slug: slug || io.slug || repoSlug(root), io });
}
const STATE_ORDER = ['complete', 'deferred', 'published', 'working', 'rescheduled', 'not started'];
export const stateCounts = (states) => STATE_ORDER.map((k) => `${k} ${states.filter((s) => s.state === k).length}`).join(', ');
// The open layer's merge line, only when it holds (every module complete or deferred, no PR open
// into the layer); else null. status prints it in next work.
export const layerMergeLine = (v) => (v?.kind === 'open' && v.ready ? `layer ${v.n}: ${stateCounts(v.states)}; merge when every module is complete or deferred (${P3} layer merge ${v.n})` : null);
// BOB's act to start work: the open layer's jobs, its merge, or the next layer's open.
// The act owed: start the listed jobs, merge the layer, or open the next; unread, status says.
export const layerStartAct = (v) => (v?.direct ? directAct(v) : v?.kind === 'open' && v.startable.length ? `${P3} layer jobs ${v.n}, then each job start it lists`
  : v?.kind === 'open' && v.ready ? `${P3} layer merge ${v.n}`
    : v?.kind === 'open' && v.early?.length ? `${P3} layer jobs ${v.n}, then each early start it lists (layer ${v.early_next})`
    : v?.kind === 'next' && v.round ? `${P3} round next --apply (opens layer ${v.n}, round ${v.round}, and prints its job starts)`
    : v?.kind === 'next' ? `${P3} layer open ${v.n}`
    : v?.kind === 'done' && v.rounds === 'held' && v.findings ? `${P3} round next, then ${P3} round next --apply (records the walk's findings, opens round ${v.round})`
      : `${P3} status --role bob (the layer flow's next act)`);

// The lines status --role bob prints in the layer flow: the open layer's modules by state and the
// jobs BOB starts (Bob, 5 Nov: BOB starts jobs; no other session creates one), or the layer to open.
// view: openLayer's read, when the caller has it.
// merge false: the merge line is next work's (status prints it there, once).
export function layerLines(root, cfg, { slug, io = {}, view, merge = true } = {}) {
  const v = view || openLayer(root, cfg, { slug, io });
  if (v.direct) return directLines(v, cfg);
  const { n } = v;
  if (v.kind === 'stale') return [`layer flow: layer ${n}'s flow rows are an earlier tranche's (merged to main): a second tranche under the flow is not built; ask the coordinator`];
  if (v.kind === 'next') return [`layer flow: ${v.round ? `${roundLayerName(v.round, v.of, n)} (${v.walk ? `from the walk ${v.walk}; ` : ''}${v.mods.join(', ')})` : `layer ${n}${v.completion ? ` (the completion round, ${cfg.completion_file})` : ''}`} is next and not open: \`${P3} layer open ${n}\`${v.round ? `, or \`${P3} round next --apply\`, which opens it and prints its \`job start\` commands (C46)` : ''}`];
  if (v.kind === 'none') return [`layer flow: no layer map (${cfg.layers_file}): jobs start on the tranche from next work`];
  if (v.kind === 'done' && v.rounds === 'held') return [`layer flow: round ${v.round} opens from the walk's findings once each is recorded: ${v.why}`, ...(v.findings ? [`the one next act: \`${P3} round next\` (a dry run), then \`${P3} round next --apply\`: each finding recorded, the round's first layer opened, its \`job start\` commands printed (C46)`] : [])];
  if (v.kind === 'done') return [v.rounds === 'walk' ? `layer flow: every layer of round ${v.round} has merged; its walk ends it (the round-close run, BD-R1)` : v.rounds === 'clean' ? `layer flow: every layer has merged; the walk ended round ${v.round}, and no module is flawed; once that walk's findings are recorded and none is a flaw, the release path follows it (BD-R1)` : 'layer flow: every layer has merged'];
  const L = [`layer flow: ${v.round ? roundLayerName(v.round, v.of, n) : `layer ${n}`} open on ${layerBranch(n)}; ${stateCounts(v.states)}`];
  for (const s of v.states.filter((q) => q.state === 'rescheduled')) L.push(`- ${s.id} rescheduled: ${s.why}`);
  for (const c of v.companions || []) L.push(`- ${c}`);
  if (v.startable.length) L.push(`jobs to start (yours to start, BOB; the job cap counts), from \`${P3} layer jobs ${n}\`:`, ...v.startable.map((q) => `- ${q.cmd}${q.after ? afterNote(q.after) : ''}`));
  if (v.early?.length) L.push(earlyHead(n, v.early_next), ...v.early.map((q) => `- ${q.cmd}`));
  if (v.ready && merge) L.push(`${v.round ? roundLayerName(v.round, v.of, n) : `layer ${n}`} can merge: \`${P3} layer merge ${n}\``);
  return L;
}

// ---- companions (PD-19) ---------------------------------------------------------------------

// The coordinator's decision PD-19 (9 Nov): a module whose change a job in the open layer needs (a
// registry or assembly module) joins that open layer as the job's companion. It lands in the same
// layer as the job, in any order (PD-19b: the layer's merge gate checks the layer whole). Each pairing is a companion row on the state branch
// (layerflow/<n>/companion/<module>-<job>.json); the companion's first pairing also writes its join
// row, so it is a member of the layer as any joined module is (its job's base, its merge hold).
export const companionsOf = (rows, job) => (rows.companions || []).filter((c) => c.job === job);
export const dependentsOf = (rows, mod) => (rows.companions || []).filter((c) => c.module === mod);
export const companionWords = (deps) => `companion of ${[...new Set(deps.map((c) => c.job))].join(', ')} (PD-19): ${deps.map((c) => (deps.length > 1 ? `${c.job} needs ${c.why}` : c.why)).join('; ')}`;
function companionState(root, rows, x) {
  const deps = dependentsOf(rows, x.id);
  let y = x;
  if (deps.length) {
    const words = companionWords(deps);
    y = { ...y, companion: { jobs: [...new Set(deps.map((c) => c.job))], why: words }, ...(y.join ? { join: { ...y.join, why: words } } : {}), ...(y.state === 'not started' && !y.item ? { why: `joined as ${words}` } : {}) };
  }
  return y;
}
// The lines layer status, layer jobs (round next) and status print for a layer's companions.
export const companionLines = (rows, states) => [...new Set((rows.companions || []).map((c) => c.module))].map((m) => {
  const deps = dependentsOf(rows, m);
  const s = states.find((q) => q.id === m);
  const jobs = [...new Set(deps.map((c) => c.job))].join(', ');
  return `companion: ${m} (${s ? s.state : 'unread'}) joined for ${deps.map((c) => `${c.job} (${c.why})`).join(', ')} (PD-19); it and ${jobs} land in the same layer`;
});

// layer join <companion> --companion-of <job> --layer <n> --why "<what it needs>" (PD-19).
// Refused when: layer n is not open; the job is not a module of layer n (its own or joined), or is a
// companion itself; the companion is the job; it is a member of layer n already (other than as a
// companion not yet started); its own map layer is after n; it has an open job anywhere (an open
// pull request from its job branch, an unfinished start, or a start or land in layer n); or it is
// held, BLOCKED or deferred there.
export function layerCompanion(root, id, { layer, job, why, by = 'bob', io = {}, log = console.log } = {}) {
  const cfg = loadConfig(root);
  needLayerMode(cfg, 'layer join --companion-of');
  const usage = `layer join <companion> --companion-of <job> --layer <n> --why "<what the job needs of it>"`;
  if (typeof job !== 'string' || !job.trim()) fail(usage);
  if (layer === undefined || layer === null || layer === true) fail(`${usage}: name the open layer`);
  if (typeof why !== 'string' || !why.trim()) fail(usage);
  const n = layerNum(layer);
  if (id === job) fail(`${id} cannot be its own companion; nothing recorded`);
  const slug = io.slug || repoSlug(root);
  fetchBranch(root, cfg.tranche, { allowFail: true });
  fetchBranch(root, layerBranch(n), { allowFail: true });
  fetchState(root, cfg.state_branch, { fresh: true });
  const tr = `refs/remotes/origin/${cfg.tranche}`;
  const rows = flowRows(root, cfg.state_branch, n);
  const closed = closedLayers(root, cfg.state_branch, cfg);
  const ref = layerRef(n);
  const cut = git(['rev-parse', '-q', '--verify', ref], { cwd: root, allowFail: true }).code === 0;
  if (!rows.open || rows.merged || closed.has(n) || !cut || staleFlow(root, rows)) fail(`layer ${n} is not open${rows.merged ? ` (it merged into ${cfg.tranche})` : closed.has(n) ? ' (it is closed)' : ''}: a companion joins only the open layer of the job that needs it (PD-19); nothing recorded`);
  const ids = new Set([...ledgerIds(root, tr), ...ledgerIds(root, ref)]);
  if (!ids.has(id)) fail(`${id} has no ledger entry on ${cfg.tranche}; nothing recorded`);
  const L = layersAt(root, cfg, ref).find((x) => x.n === n) || fail(`layer ${n} is not in ${cfg.layers_file} on ${layerBranch(n)}; nothing recorded`);
  const joined = new Set(rows.joins.map((j) => j.module));
  const members = new Set([...L.mods, ...joined]);
  if (!members.has(job)) fail(`${job} is not a job of layer ${n} (its modules: ${[...members].join(', ')}): a companion joins only the layer of the job that needs it (PD-19); nothing recorded`);
  if (dependentsOf(rows, job).length) fail(`${job} is a companion in layer ${n} itself: a companion's companion is not built; ask the coordinator; nothing recorded`);
  if (companionsOf(rows, id).length) fail(`${id} has its own companion(s) in layer ${n}: it cannot be one; ask the coordinator; nothing recorded`);
  // The job must still have work to land here: not landed in the layer, not complete, not deferred
  // (cold review of C51: a join for a landed or BLOCKED job let any module into the layer).
  const st = readLayer(root, cfg, n, { io: { openPRs: io.openPRs || openPRs, comments: io.comments || ghComments }, slug }).states.find((x) => x.id === job);
  const jobBlocked = [entryAt(root, ref, job), entryAt(root, tr, job)].some((e) => e?.status?.state === 'BLOCKED');
  if (!st || DONE.includes(st.state) || jobBlocked || (rows.lands.some((l) => l.module === job) && st.state !== 'rescheduled')) fail(`${job} has no work left to land in layer ${n} (${jobBlocked ? 'deferred: BLOCKED' : st ? `${st.state}: ${st.why}` : 'unread'}): a companion joins only for a job with work left to land (PD-19); nothing recorded`);
  const had = rows.companions.find((c) => c.module === id && c.job === job);
  if (had) { log(`${id} is ${job}'s companion in layer ${n} already (${had.why}); nothing recorded`); return { ok: true, layer: n, recorded: false, companion: true }; }
  const asCompanion = dependentsOf(rows, id).length > 0;
  if (members.has(id) && !asCompanion) fail(`${id} is a module of layer ${n} already (${L.mods.includes(id) ? 'its own' : 'joined'}): it lands there as any member; nothing recorded`);
  const layers = layersAt(root, cfg, ref);
  const own = layerOf(layers, id);
  if (own !== null && own > n) fail(`${id}'s own layer ${own} is after layer ${n}: its work is planned there; ask the coordinator; nothing recorded`);
  // Held, BLOCKED or deferred there.
  // BLOCKED on the layer branch or on the tranche, the ledger's home (either defers it).
  const entry = [entryAt(root, ref, id), entryAt(root, tr, id)].find((e) => e?.status?.state === 'BLOCKED');
  if (entry) fail(`${id} is BLOCKED (${entry.status.reason || 'no reason'}): a deferred module joins no layer as a companion; nothing recorded`);
  const holds = readHolds(root, cfg.state_branch, { offline: true, facts: null });
  const h = holds.find((x) => x.live && ((x.kind === 'module' && x.value === id) || (x.kind === 'layer' && Number(x.value) === n)));
  if (h) fail(`${id} is held (${h.id} ${h.scope}: ${h.why}); nothing recorded`);
  // An open job anywhere: started or landed in this layer, an open pull request from its job branch,
  // or an unfinished start (its branch's entry WORKING or BLOCKED and not in the tranche or the layer).
  if (rows.starts.some((s) => s.module === id) || rows.lands.some((l) => l.module === id)) fail(`${id}'s job ${rows.lands.some((l) => l.module === id) ? 'landed' : 'started'} in layer ${n} already: ${job}'s need is not in its brief; ask the coordinator; nothing recorded`);
  const heads = (io.originJobs || originJobs)(root);
  if (heads === null) fail(`origin's job branches could not be read: whether ${id} has an open job is not known; nothing recorded`);
  for (const b of [...heads].filter((x) => branchModule(x, ids) === id)) {
    const prs = (io.prsFromBranch || prsFromBranch)(slug, b);
    if (prs === null) fail(`GitHub unreadable: the pull requests from ${b} are not known; nothing recorded`);
    const op = prs.find((p) => p.state === 'open');
    if (op) fail(`${id} has an open job: pull request #${op.number} from ${b} into ${op.base?.ref}; it finishes first; nothing recorded`);
    fetchBranch(root, b, { allowFail: true });
    const tip = git(['rev-parse', '-q', '--verify', `refs/remotes/origin/${b}`], { cwd: root, allowFail: true }).stdout.trim();
    const st = tip ? entryAt(root, tip, id)?.status?.state : null;
    if (tip && (st === 'WORKING' || st === 'BLOCKED') && !isAnc(root, tip, tr) && !isAnc(root, tip, ref)) fail(`${id} has an open job: ${b} is ${st} and not landed; it finishes first; nothing recorded`);
  }
  const at = now();
  const files = [[flowFile(n, 'companion', `${safeName(id)}-${safeName(job)}`), { row: 'companion', layer: n, module: id, job, why: why.trim(), at, by }]];
  if (!joined.has(id)) files.push([flowFile(n, 'join', safeName(id)), { row: 'join', layer: n, module: id, from: own, why: why.trim(), companion_of: job, at, by }]);
  writeRows(root, cfg.state_branch, `layer join: ${id} joins layer ${n} as ${job}'s companion (PD-19)`, files);
  log(`${id} joins layer ${n} as ${job}'s companion (PD-19): ${why.trim()}; it starts from ${P3} layer jobs ${n}, and it lands in the same layer as ${job}`);
  return { ok: true, layer: n, recorded: true, companion: true };
}

// ---- layer join ----------------------------------------------------------------------------

// Where a module stands against the flow, read offline (the state branch and the tranche as
// fetched): own (its layer in the map, or null), cur (the open layer, else the next to open), and
// target (the layer it joins: the next after the open one, else the next to open). behind: its
// own layer is behind cur, or it has none. null when the product has no layer map.
// The coordinator's ruling (6 Nov): work on a module outside the open layer (a notice-affected user
// in a merged layer, a found-mark reopen of a COMPLETE module whose layer merged) joins the NEXT
// layer to open, in order, never the tranche directly.
export function layerPlace(root, cfg, id) {
  const trRef = `refs/remotes/origin/${cfg.tranche}`;
  const tr = git(['rev-parse', '-q', '--verify', trRef], { cwd: root, allowFail: true }).code === 0 ? trRef : null;
  const layers = layersAt(root, cfg, tr);
  if (!layers.length) return null;
  const own = layerOf(layers, id);
  const closed = closedLayers(root, cfg.state_branch, cfg);
  let open = null;
  let next = null;
  // As openLayer reads the flow: a layer behind us (closed, merged, or with nothing left) is passed.
  for (const L of layers) {
    const r = flowRows(root, cfg.state_branch, L.n);
    if (r.open && !r.merged) { open = L.n; break; }
    if (r.merged || closed.has(L.n) || (tr && layerBehind(root, cfg, L, closed, tr))) continue;
    next = L.n;
    break;
  }
  const cur = open ?? next;
  // Joined already (a join row on a layer not merged, from the open one on): it starts there, and
  // is not behind (cold review of PR 191: status kept printing the join, then pointed past it).
  const joined = layers.find((L) => L.n !== own && (cur === null || L.n >= cur) && (() => { const r = flowRows(root, cfg.state_branch, L.n); return !r.merged && r.joins.some((j) => j.module === id); })())?.n ?? null;
  // PD-14 (coordinator, 8 Nov; C35): while a completion layer is open, a module with an open item
  // in completion_file that is not one of its modules joins THAT layer, never one after it.
  const openL = open !== null ? layers.find((L) => L.n === open) : null;
  // PD-14 (i): a module already in the open completion layer (its own, or joined) whose open items
  // the layer does not hold yet (added after its open, or after its join) joins them the same way.
  const more = () => {
    const r = flowRows(root, cfg.state_branch, open);
    const known = new Set(layerItems(openL.completion, r.joins, r.items).map((x) => x.id));
    return completionJoinItems(root, cfg, tr, id).filter((x) => !known.has(x.id));
  };
  if (joined !== null) {
    const m = joined === open && openL?.completion ? more() : [];
    return { own, open, cur, target: joined, behind: false, joined, ...(m.length ? { more: m } : {}) };
  }
  // One of the open completion layer's own modules is in the open layer, not behind it.
  if (openL?.completion && openL.mods.includes(id)) { const m = more(); return { own: open, open, cur, target: open, behind: false, joined: null, ...(m.length ? { more: m } : {}) }; }
  const items = openL?.completion && !openL.mods.includes(id) ? completionJoinItems(root, cfg, tr, id) : [];
  if (items.length) return { own, open, cur, target: open, behind: true, joined: null, completion: items };
  const target = open !== null ? (layers.find((L) => L.n > open && !closed.has(L.n) && !flowRows(root, cfg.state_branch, L.n).merged)?.n ?? null) : next;
  const behind = own === null || (cur !== null && own < cur) || (cur === null);
  return { own, open, cur, target, behind, joined: null };
}
// A module's open, non-whole items in completion_file on the tranche, as a completion layer holds them.
export function completionJoinItems(root, cfg, tr, id) {
  let c = null;
  try { c = completionItems(root, cfg, tr); } catch { c = null; }
  return openItems(c).filter((x) => !x.whole && !x.malformed && x.target === id).map((x) => ({ id: x.id, module: id, what: x.what }));
}
export const joinAct = (id, why, t) => `${P3} layer join ${id} --why ${JSON.stringify(why)} (it joins layer ${t}, and starts from ${P3} layer jobs ${t} once that layer is open)`;

// layer join <id> --why "<why>": the module, its layer behind the open one, joins the next layer
// to open: one row on the state branch (layerflow/<n>/join/<id>.json); layer open lists it in that
// layer's jobs, its job's base is that layer's branch, and the layer merges only once it lands.
export function layerJoin(root, id, { why, by = 'bob', log = console.log, companionOf, layer, io = {} } = {}) {
  if (companionOf !== undefined) return layerCompanion(root, id, { layer, job: companionOf === true ? '' : String(companionOf), why, by, io, log });
  if (layer !== undefined) fail('layer join --layer goes with --companion-of <job> (PD-19); a plain join takes the next layer to open');
  const cfg = loadConfig(root);
  needLayerMode(cfg, 'layer join');
  if (typeof why !== 'string' || !why.trim()) fail('layer join <id> --why "<the work it joins for>"');
  fetchBranch(root, cfg.tranche, { allowFail: true });
  fetchState(root, cfg.state_branch, { fresh: true });
  const tr = `refs/remotes/origin/${cfg.tranche}`;
  if (!ledgerIds(root, tr).has(id)) fail(`${id} has no ledger entry on ${cfg.tranche}`);
  const at = layerPlace(root, cfg, id) || fail(`no layer map (${cfg.layers_file}): jobs start on the tranche; there is no layer to join`);
  // PD-14 (i): new items for a module already in the open completion layer: one item row, its
  // reopen words and ticks; its job runs again if it started before the row.
  if (at.more?.length) {
    const t = at.open;
    const ids = at.more.map((x) => x.id);
    writeRows(root, cfg.state_branch, `layer join: ${id} joins ${ids.join(', ')} into layer ${t} (the completion round)`, [[flowFile(t, 'items', `${safeName(id)}-${Date.now()}`), { row: 'items', layer: t, module: id, items: at.more, why: why.trim(), at: now(), by }]]);
    log(`${id} joins ${ids.join(', ')} into layer ${t}, where it is already: ${why.trim()}; it starts (again, if its job started before) from ${P3} layer jobs ${t}`);
    return { ok: true, layer: t, recorded: true, items: ids };
  }
  if (at.joined !== null) { log(`${id} joined layer ${at.joined} already; it starts from ${P3} layer jobs ${at.joined}${at.joined === at.open ? '' : ` once layer ${at.joined} opens (${P3} layer open ${at.joined})`}; nothing recorded`); return { ok: true, layer: at.joined, recorded: false }; }
  if (!at.behind) fail(`${id} is in layer ${at.own}, ${at.own === at.open ? 'the open layer' : 'not yet open'}: it starts from ${P3} layer jobs ${at.own}; nothing recorded`);
  if (at.target === null) fail(at.open === null ? `every layer in ${cfg.layers_file} has merged or closed: ${id} has no layer to join; ask the coordinator` : `no layer follows layer ${at.open} in ${cfg.layers_file}: ${id} has no next layer to join; ask the coordinator`);
  const t = at.target;
  const f = flowFile(t, 'join', safeName(id));
  const had = flowRows(root, cfg.state_branch, t).joins.find((j) => j.module === id);
  // Into an open completion layer (PD-14): its items go in the row, its reopen words and its ticks.
  if (!had) writeRows(root, cfg.state_branch, `layer join: ${id} joins layer ${t}${at.completion ? ' (the completion round)' : ''}`, [[f, { row: 'join', layer: t, module: id, from: at.own, why: why.trim(), at: now(), by, ...(at.completion ? { items: at.completion } : {}) }]]);
  log(`${id} ${had ? 'joined' : 'joins'} layer ${t}${had ? ` already (${had.why})` : `: ${why.trim()}`}${at.completion ? ` with ${at.completion.map((x) => x.id).join(', ')}` : ''}; it starts from ${P3} layer jobs ${t}${t === at.open ? '' : ` once layer ${t} opens (${P3} layer open ${t})`}`);
  return { ok: true, layer: t, recorded: !had };
}

// ---- layer open -----------------------------------------------------------------------------

// A completion layer (PLN-4; PD-12; C33) was opened past the map from completion_file's open items;
// BD-R1 retires the path (roundLayer opens a round's layers instead). One already open, the copy's
// layer 12, keeps its items, joins and ticks below until it merges.
// A completion layer's reopen words per module: its items, each with its id.
export const itemReopen = (completion, joins = [], more = []) => {
  const all = layerItems(completion, joins, more);
  return new Map([...new Set(all.map((x) => x.module))].map((id) => [id, all.filter((x) => x.module === id).map((x) => `${x.id}: ${x.what}`).join('; ')]));
};
// A completion layer's item ids per module, in the order itemReopen words them.
export const itemIdMap = (completion, joins = [], more = []) => {
  const all = layerItems(completion, joins, more);
  return new Map([...new Set(all.map((x) => x.module))].map((id) => [id, all.filter((x) => x.module === id).map((x) => x.id)]));
};
// A completion layer's items: those of its open row, those its joined modules brought (PD-14), and
// those added later for a module already in it (item rows, PD-14 (i)).
export const layerItems = (completion, joins = [], more = []) => (completion ? [...(completion.items || []), ...[...joins, ...more].flatMap((j) => (Array.isArray(j.items) ? j.items : []))] : []);
// PD-14 (i): an item row is owed until its module lands after it from a job not started before it:
// a land whose job started before the row did not do the item's work (the job never had its words),
// so the module runs again and the item is not ticked off that land. A land's job is its module's
// newest start row before the land, a restart row not counted (the same job, its old task: cold
// review of (i)); with none (job start writes it best-effort) the land counts.
// One owed row puts the module back to not started.
export const itemsOwed = (rows, id) => {
  // Times compared parsed (rows are second-resolution, now()): a start in the same second as the row
  // is not after it (the safe side: one more run); a land in the same second as its start follows it.
  const t = (x) => Date.parse(x?.at) || 0;
  const starts = (rows.starts || []).filter((s) => s.module === id && !s.restart);
  const did = (l, r) => { const s = starts.filter((x) => t(x) <= t(l)).at(-1); return !s || t(s) > t(r); };
  return (rows.items || []).filter((r) => r.module === id && !(rows.lands || []).some((l) => l.module === id && t(l) > t(r) && did(l, r)));
};

// A round's layer (BD-R1, rounds.mjs): layer n, one past every layer the map and those past it
// hold, is the round's next: the next map layer, after the round's last, that holds a flawed module
// (one with an unmet found mark), skipping those with none; or, once a walk ended the round, the
// next round's first. Its modules are the flawed ones there, each reopened with its found marks.
// A new round opens only once the walk's findings are recorded, and none is left without a module.
export function roundLayer(root, cfg, layers, n, tr, log = () => {}) {
  const last = layers.at(-1)?.n ?? 0;
  if (n !== last + 1) fail(`layer ${n} is not in ${cfg.layers_file} on ${cfg.tranche}${last ? `; the next past it is ${last + 1}` : ''}`);
  // Every layer before it closed first, as layer open checks them: a round's layer follows them all.
  const closed = closedLayers(root, cfg.state_branch, cfg);
  for (const L of layers) {
    const r = flowRows(root, cfg.state_branch, L.n);
    if (r.open && !r.merged) fail(`layer ${L.n} is open on ${layerBranch(L.n)} and has not merged; layer ${n} opens after it (${P3} layer merge ${L.n})`);
    if (!r.merged && !layerBehind(root, cfg, L, closed, tr)) fail(`layer ${L.n} is not closed: close it first (${P3} layer open ${L.n}, then layer merge ${L.n})`);
  }
  const rs = nextRound(root, cfg, layers, tr);
  if (rs.state === 'layer') fail(`${roundLine(rs)}: layer ${n} opens after it (${P3} layer merge ${rs.layer.n})`);
  if (rs.state === 'walk') fail(`layer ${n} is not in ${cfg.layers_file} on ${cfg.tranche}, and ${roundLine(rs)}: no round layer opens before that walk (BD-R1); nothing was opened`);
  // A walk with findings not yet recorded is not clean, though no module is flawed yet (C44): the
  // next round waits on them.
  if (rs.state === 'new' || rs.state === 'clean') {
    const hold = walkHold(findingsOf(root, cfg, tr, deployRowsOf(root, cfg).at(-1) || null, { round: true }));
    if (hold) fail(`round ${rs.state === 'new' ? rs.round : rs.round + 1} opens from its walk's findings once each is recorded: ${hold}; nothing was opened`);
  }
  if (rs.state === 'clean') fail(`layer ${n} is not in ${cfg.layers_file} on ${cfg.tranche}, and ${roundLine(rs)}: no round to open (BD-R1); nothing was opened`);
  if (rs.state === 'new') {
    const loose = unplaced(root, tr);
    if (loose.length) fail(`round ${rs.round} cannot place ${loose.map((f) => f.id).join(', ')} in the found file of no module: BOB names its module (\`${P3} found <module> "<finding>" --from "<source>"\`), then the round opens; nothing was opened`);
  }
  const x = rs.next;
  // PD-24: one layer for the round's flawed modules, whatever their plan layers; all start at once.
  log(`${roundLayerName(x.round, x.of, n, cfg.tranche)} is round ${x.round}'s one layer over every flawed module (PD-24)${rs.state === 'new' ? ` (round ${x.round} opens from the walk ${rs.walk})` : ''}: ${x.mods.length} flawed module(s) (${x.mods.map((id) => `${id} ${x.items.filter((i) => i.module === id).map((i) => i.id).join(', ')}`).join('; ')}); every job starts at once up to the cap, listed in dependency order`);
  return { n, mods: x.mods, round: { n: x.round, of: x.of, mods: x.mods, items: x.items, ...(x.walk ? { walk: x.walk } : {}) } };
}
export function layerOpen(root, n, { io = {}, log = console.log, by = 'bob' } = {}) {
  n = layerNum(n);
  const cfg = loadConfig(root);
  needLayerMode(cfg, 'layer open');
  const slug = io.slug || repoSlug(root);
  fetchBranch(root, cfg.tranche);
  fetchState(root, cfg.state_branch, { fresh: true });
  const tr = `refs/remotes/origin/${cfg.tranche}`;
  const layers = layersAt(root, cfg, tr);
  // Past the map: a round's layer (BD-R1), its modules the flawed ones of its map layer, else
  // refused. A completion layer is opened no more (layer 12 on the copy was the last: Bob, 8 Nov).
  const comp = layers.some((L) => L.n === n) ? null : roundLayer(root, cfg, layers, n, tr, log);
  if (comp) layers.push(comp);
  // One layer at a time: every earlier layer closed, merged, or with nothing left in it; this one
  // not closed already; and no job of its modules still open into the tranche (the train's).
  const closed = closedLayers(root, cfg.state_branch, cfg);
  if (closed.has(n)) fail(`layer ${n} is closed already (${CLOSED_FILE}); open the next one`);
  for (const L of layers.filter((x) => x.n < n)) {
    const r = flowRows(root, cfg.state_branch, L.n);
    if (r.open && !r.merged) fail(`layer ${L.n} is open on ${layerBranch(L.n)} and has not merged; layer ${n} opens after it (${P3} layer merge ${L.n})`);
    if (!layerBehind(root, cfg, L, closed, tr)) fail(`layer ${L.n} is not closed: close it first (${P3} layer open ${L.n}, then layer merge ${L.n})`);
  }
  const into = (io.openPRs || openPRs)(slug, cfg.tranche);
  if (into === null) fail(`GitHub unreadable: the open pull requests into ${cfg.tranche} are not known; nothing was opened`);
  // The layer's own modules and those joined to it (R12): their train PRs, ledger entries and holds.
  const mine = new Set([...layers.find((L) => L.n === n).mods, ...flowRows(root, cfg.state_branch, n).joins.map((j) => j.module)]);
  const ids = ledgerIds(root, tr);
  const held = into.filter((p) => mine.has(branchModule(p.head?.ref, ids)));
  if (held.length) fail(`layer ${n}'s module(s) have job PRs open into ${cfg.tranche}: ${held.map((p) => `#${p.number} (${p.head.ref})`).join(', ')}; those finish (merged by merge, or closed) before the layer opens`);
  // Every module of the layer has its ledger entry on the tranche before the branch is cut (copy,
  // 6 Nov: layer/8 was cut before four of its entries landed, and their jobs could not start).
  const bare = [...mine].filter((id) => !ids.has(id));
  // A branch cut ahead for early starts (R14) is not the layer's cut: the checks of an open apply.
  const cut = git(['ls-remote', '--heads', 'origin', layerBranch(n)], { cwd: root, allowFail: true }).stdout.trim() !== '' && !!flowRows(root, cfg.state_branch, n).open;
  if (bare.length && cut) log(`warning: layer ${n}'s module(s) have no ledger entry on ${cfg.tranche}: ${bare.map((id) => entryFile(id)).join(', ')}; ${layerBranch(n)} is cut already, so their jobs cannot start until the entries land`);
  if (bare.length && !cut) fail(`layer ${n}'s module(s) have no ledger entry on ${cfg.tranche}: ${bare.map((id) => entryFile(id)).join(', ')}; land their entries first, then open the layer; nothing was opened`);
  // The census of the layer (R15, census.mjs): a layer opens with no gap in it, each named with
  // what BOB writes (the entries that need no judgment printed ready).
  if (!cut) {
    const c = census(root, cfg, { ref: tr, open: [n] });
    // A module off the layer map that needs no job (COMPLETE, no unmet mark) is a finding, printed;
    // it stops nothing (PD-4). One that still needs a job refuses, as before: its job would never start.
    const finding = (g) => g.kind === 'not-in-layer-map' && !g.needs;
    const found = c.gaps.filter((g) => g.layer === n && finding(g));
    if (found.length) log(`finding: layer ${n}'s module(s) ${found.map((g) => g.id).join(', ')} are on no line of ${cfg.layers_file}; BOB names them there (PD-4: this stops nothing)`);
    const mineGaps = c.gaps.filter((g) => g.layer === n && g.kind !== 'not-on-layer' && !finding(g));
    if (mineGaps.length) fail(`layer ${n} has ${mineGaps.length} gap(s) on ${cfg.tranche}; land the fixes first, then open the layer; nothing was opened:\n${censusLines({ gaps: mineGaps }, { tranche: cfg.tranche }).slice(1).join('\n')}`);
  }
  const rows = flowRows(root, cfg.state_branch, n);
  if (staleFlow(root, rows)) fail(`layer ${n}'s flow rows and ${layerBranch(n)} are an earlier tranche's (its merge ${short(rows.merged.commit)} is on main): a second tranche under the flow is not built; ask the coordinator`);
  if (rows.merged) fail(`layer ${n} already merged into ${cfg.tranche} (${short(rows.merged.commit)})`);
  const b = layerBranch(n);
  fetchBranch(root, b, { allowFail: true });
  let have = git(['rev-parse', '-q', '--verify', layerRef(n)], { cwd: root, allowFail: true }).code === 0;
  // Cut ahead for early starts (R14) and never opened: brought up to the tranche tip, a fast-forward
  // (nothing lands on it before the open, and the layer it was cut from merged into the tranche).
  if (have && !rows.open) {
    const was = rev(root, layerRef(n));
    if (!isAnc(root, was, tr)) fail(`${b} was cut ahead for early starts at ${short(was)}, and the tranche ${cfg.tranche} does not hold it: the layer it was cut from has not merged, or something was pushed or merged into the branch before its open: ask the coordinator; nothing was opened`);
    if (was !== rev(root, tr)) {
      const p = git(['push', '-q', 'origin', `${rev(root, tr)}:refs/heads/${b}`], { cwd: root, allowFail: true });
      if (p.code !== 0) fail(`the fast-forward of ${b} to ${cfg.tranche} failed (${p.stderr.trim()}); nothing recorded`);
      fetchBranch(root, b);
      log(`${b}, cut ahead for early starts at ${short(was)}, brought up to ${cfg.tranche} ${short(rev(root, tr))}`);
    }
    have = true;
  }
  const at = have ? rev(root, layerRef(n)) : rev(root, tr);
  if (!have) {
    const p = git(['push', '-q', 'origin', `${at}:refs/heads/${b}`], { cwd: root, allowFail: true });
    if (p.code !== 0) fail(`the push of ${b} failed (${p.stderr.trim()}); nothing recorded`);
    fetchBranch(root, b);
    log(`${b} cut from ${cfg.tranche} ${short(at)}`);
  } else log(`${b} is on origin at ${short(at)}`);
  if (!rows.open) writeRows(root, cfg.state_branch, `${comp ? roundLayerName(comp.round.n, comp.round.of, n, cfg.tranche) : `layer ${n}`} open on ${b}`, [[flowFile(n, 'open'), { row: 'open', layer: n, branch: b, tranche: cfg.tranche, from: at, at: now(), by, ...(comp ? { round: comp.round } : {}) }]]);
  // Holds on this layer's modules end at its open, recorded as hold --end records them.
  const ended = endLayerHolds(root, cfg.state_branch, n, [...mine], { by, log });
  const L = readLayer(root, cfg, n, { io, slug });
  const s = startableOf(L);
  log(`${layerName(layers.find((x) => x.n === n), n, cfg.tranche)}: ${L.mods.length} module(s); ${s.length} job(s) can start (the ${jobCap(cfg).line} across the account). BOB starts them; no other session creates a job:`);
  for (const x of s) log(`  ${x.cmd}${x.after ? afterNote(x.after) : ''}${x.retest ? `\n    or, with no job session (CI's gate re-tests it on a ready PR): ${x.retest}` : ''}${x.job ? `\n    (additive change: a red retest falls back to ${x.job})` : ''}`);
  return { ok: true, branch: b, from: at, startable: s, ended, round: roundOf(layers.find((x) => x.n === n)) };
}

export function layerJobs(root, n, { io = {}, log = console.log } = {}) {
  n = layerNum(n);
  const cfg = loadConfig(root);
  needLayerMode(cfg, 'layer jobs');
  fetchLayer(root, cfg, n);
  const ahead = cutAhead(root, cfg.state_branch, n);
  if (ahead !== null) fail(notOpen(n, ahead));
  const L = readLayer(root, cfg, n, { io, slug: io.slug || repoSlug(root) });
  const s = startableOf(L);
  const name = layerName(L.layers.find((x) => x.n === n), n, cfg.tranche);
  for (const c of companionLines(L.rows, L.states)) log(c);
  log(s.length ? `${name}: ${s.length} job(s) can start; BOB starts them (job start counts the cap):` : `${name}: no job can start`);
  for (const x of s) log(`  ${x.cmd}${x.after ? afterNote(x.after) : ''}${x.retest ? `\n    or, with no job session (CI's gate re-tests it on a ready PR): ${x.retest}` : ''}${x.job ? `\n    (additive change: a red retest falls back to ${x.job})` : ''}`);
  // The early list is a suggestion: unread, layer jobs still lists the layer's own (cold review of R14).
  let e;
  try { e = earlyNext(root, cfg, n, L); } catch (err) { if (!(err instanceof Error)) throw err; e = { next: null, list: [], skipped: [] }; log(`note: the early starts were not read (${err.message})`); }
  if (e.list.length) { log(earlyHead(n, e.next)); for (const x of e.list) log(`  ${x.cmd}`); }
  if (e.skipped.length) log(`not early (layer ${e.next}): ${e.skipped.map((x) => `${x.id} (${x.why})`).join('; ')}`);
  return { ok: true, startable: s, states: L.states, early: e.list, early_next: e.next, round: roundOf(L.layers.find((x) => x.n === n)) };
}

export function layerStatus(root, n, { io = {}, log = console.log } = {}) {
  n = layerNum(n);
  const cfg = loadConfig(root);
  needLayerMode(cfg, 'layer status');
  fetchLayer(root, cfg, n);
  const ahead = cutAhead(root, cfg.state_branch, n);
  if (ahead !== null) fail(notOpen(n, ahead));
  const L = readLayer(root, cfg, n, { io, slug: io.slug || repoSlug(root) });
  log(`${layerName(L.layers.find((x) => x.n === n), n, cfg.tranche)}, round ${roundOf(L.layers.find((x) => x.n === n))}:`);
  for (const s of L.states) log(`${s.id}: ${s.state} (${s.why})`);
  for (const c of companionLines(L.rows, L.states)) log(c);
  const ready = mergeReady(L.states) && !L.holding.length && !L.joinable?.length;
  const done = L.states.filter((s) => s.done_work);
  if (done.length) {
    log(`${done.length} deferred with work done (suite green, BLOCKED only on a process finding): restart to publish; layer merge ${n} refuses until then, or takes --defer-done "<why>":`);
    for (const s of done) log(`  ${P3} job start ${s.id} --restart "its work is done and green; BLOCKED only on a process finding: publish it"   (PR ${s.done_work}${s.done_unknown ? '; its gate runs could not be read, so counted as done until they are' : ''})`);
  }
  log(L.rows.merged ? `layer ${n} merged into ${cfg.tranche} at ${short(L.rows.merged.commit)}` : ready ? `layer ${n} can merge: ${P3} layer merge ${n}` : `layer ${n} cannot merge yet: ${L.states.filter((s) => !DONE.includes(s.state)).length} module(s) not complete${L.holding.length ? `, ${L.holding.length} PR(s) open into ${layerBranch(n)}` : ''}${L.joinable?.length ? `, completion item(s) to join: ${L.joinable.map((x) => `${x.id} (${x.items.join(', ')})`).join(', ')}` : ''}`);
  return { ok: true, states: L.states, ready, deferred_done: done.map((s) => s.id) };
}

// ---- layer publish --------------------------------------------------------------------------

// The files a job's branch changes against the layer, outside its module (ARC-2): none may be.
export function outsideFiles(root, entry, base, head) {
  const own = ownPaths(entry);
  return diffNames(root, base, head).filter((f) => !own.some((p) => underPath(f, p)));
}

// The publish's run, as a child process: `job complete` (the module's fast checks, never a suite: AUD-7;
// the ready PR) in this checkout. { done: Promise<{ code }>, kill() }.
export function spawnComplete(root, id, args = []) {
  const tool = join(new URL('.', import.meta.url).pathname, '..', 'p3.mjs');
  const c = spawn(process.execPath, [tool, 'job', 'complete', id, ...args], { cwd: root, stdio: 'inherit', detached: true, env: { ...process.env, NODE_TEST_CONTEXT: '' } });
  const kill = () => { try { process.kill(-c.pid, 'SIGTERM'); } catch { try { c.kill('SIGTERM'); } catch { /* gone */ } } };
  // Its own process group, so a halt stops the suite's children too; and stopped with publish, so
  // an interrupted publish never leaves a job complete pushing beside the next one (cold review 6).
  const stop = () => kill();
  const sig = () => { kill(); process.exit(130); };
  process.once('exit', stop);
  process.once('SIGINT', sig);
  process.once('SIGTERM', sig);
  const off = () => { process.off('exit', stop); process.off('SIGINT', sig); process.off('SIGTERM', sig); process.off('SIGHUP', sig); };
  process.once('SIGHUP', sig);
  const done = new Promise((res) => { c.on('exit', (code, s2) => { off(); res({ code: code ?? (s2 ? 143 : 1) }); }); c.on('error', () => { off(); res({ code: 1 }); }); });
  return { done, kill };
}

// The reschedules that make a run on `testedOn` void: those for the module whose provider's land
// it does not hold.
export function voiding(root, sb, n, id, testedOn, { fetch = true, branch = layerBranch(n) } = {}) {
  if (fetch) { try { fetchState(root, sb, { fresh: true }); } catch { return []; } fetchBranch(root, branch, { allowFail: true }); }
  return flowRows(root, sb, n).reschedules.filter((r) => r.user === id && hasCommit(root, r.provider_land) && !isAnc(root, r.provider_land, testedOn));
}

// The job's publish. Refused outside an open layer, with tracked changes, or with any file outside
// the module. Each round: job sync (the layer tip merged in), the ownership check, then the run.
// A reschedule arriving mid-run halts it (the child killed, a halt run row with the minutes lost)
// and the next round starts on the new tip; a run that ends while a reschedule is outstanding
// does not count either. At most `rounds` rounds.
export async function layerPublish(root, id, { push = true, every = null, rounds = 4, sync, complete, log = console.log, args = [], session = null } = {}) {
  const cfg0 = loadConfig(root);
  if (!directMode(cfg0)) needLayerMode(cfg0, 'layer publish');
  const cfg = jobCfg(root, cfg0, id, { push });
  if (!cfg.layer) fail(`${id} is in no open layer (its layer's branch is not on origin, or the layer merged): publish needs an open layer/<n>`);
  const { n } = cfg.layer;
  const sb = cfg.state_branch;
  // An early start (R14) works on the branch cut ahead; it publishes once its layer opens.
  if (push) { try { fetchState(root, sb, { fresh: true }); } catch { /* read below as fetched */ } }
  const ahead = cutAhead(root, sb, n);
  if (ahead !== null) fail(`${id}: ${notOpen(n, ahead)}; an early start publishes once it opens; keep working and testing (${P3} job test ${id}); nothing was published`);
  // The branch it publishes onto: layer/<n>, or the tranche under the direct flow (PD-25).
  const lb = flowBase(cfg);
  const lref = push ? `refs/remotes/origin/${lb}` : `refs/heads/${lb}`;
  const doSync = sync || (async () => { const { jobSync } = await import('./job.mjs'); return jobSync(root, id, { push, pushBranch: false, log }); });
  const doComplete = complete || (() => spawnComplete(root, id, args));
  for (let round = 1; round <= rounds; round++) {
    const s = await doSync();
    if (s && s.ok === false) fail('job sync did not finish; nothing was published');
    const testedOn = rev(root, lref);
    const entry = entryAt(root, 'HEAD', id) || fail(`no ledger entry for ${id} at HEAD`);
    const out = outsideFiles(root, entry, git(['merge-base', 'HEAD', lref], { deepen: true, cwd: root }), 'HEAD');
    if (out.length) fail(`refused: the publish touches files outside ${id} (ARC-2): ${out.slice(0, 10).join(', ')}${out.length > 10 ? ` and ${out.length - 10} more` : ''}; nothing was published`);
    const started = now();
    const pre = voiding(root, sb, n, id, testedOn, { fetch: push, branch: lb });
    if (pre.length) fail(`${lb} at ${short(testedOn)} lacks ${pre.map((r) => `${r.provider}'s land ${short(r.provider_land)}`).join(', ')}: run publish again once origin's ${lb} holds it`);
    log(`${cfg.layer.direct ? lb : `layer ${n}`}, round ${round}: ${id} runs on ${lb} ${short(testedOn)}`);
    // The run's own job complete reads the state this command wrote (R17: writes are coalesced).
    if (pendingWrites()) flushState();
    const c = doComplete();
    let halted = null;
    // The layer branch read again while the run goes: every pacing.poll_first_s (30 s), fixed (PD-6);
    // every, a fixed pause, for the tests.
    let k = 0;
    let timer = null;
    const check = () => {
      if (halted) return;
      const v = voiding(root, sb, n, id, testedOn, { fetch: push, branch: lb });
      if (v.length) { halted = v; c.kill(); return; }
      timer = setTimeout(check, every ?? pollMs(++k));
    };
    timer = setTimeout(check, every ?? pollMs(++k));
    let code;
    try { ({ code } = await c.done); } finally { clearTimeout(timer); }
    if (!halted) { const v = voiding(root, sb, n, id, testedOn, { fetch: push, branch: lb }); if (v.length) halted = v; }
    const ended = now();
    // One file per run, never two runs under one name (two in one second, the same round).
    const runName = `${safeName(id)}-${Date.parse(started)}-${round}-${randomUUID().slice(0, 8)}`;
    const base = { row: 'run', layer: n, module: id, round, started, ended, minutes: minutes(started, ended), tested_on: testedOn, ...(session ? { session } : {}) };
    if (halted) {
      // A killed run may leave the entry and metrics half written, and generated files built (its
      // own restore never ran): the tree was clean when the round began (job sync refuses a dirty
      // one), so every tracked file is put back to HEAD for the next round (cold review 6).
      git(['checkout', '-q', 'HEAD', '--', '.'], { cwd: root, allowFail: true });
      const keys = halted.map((r) => r.key);
      writeRows(root, sb, `layer ${n}: ${id}'s run halted by a reschedule`, [[flowFile(n, 'run', runName), { ...base, result: 'halted', exit: code, by: keys, minutes_lost: minutes(started, ended), at: ended }]]);
      log(`halted: ${halted.map((r) => `${r.provider} changed its interface (land ${short(r.provider_land)})`).join('; ')}; this run never counts; ${round < rounds ? 'starting again on the new layer tip' : 'no rounds left'}`);
      continue;
    }
    writeRows(root, sb, `layer ${n}: ${id}'s run ${code === 0 ? 'passed' : 'failed'}`, [[flowFile(n, 'run', runName), { ...base, result: code === 0 ? 'pass' : 'fail', exit: code, at: ended }]]);
    if (code !== 0) { log(`not published: the run failed (exit ${code}); fix it and run ${P3} layer publish ${id} again`); return { ok: false, round, code }; }
    log(`published: ${id}'s PR into ${lb} is ready; the gate on its tip decides the land (${P3} layer land <pr>, the merge tool's)`);
    return { ok: true, round, testedOn };
  }
  return { ok: false, halted: true, round: rounds };
}

// ---- layer retest ---------------------------------------------------------------------------

// layer retest <id> (coordinator, 6 Nov: a provider's land rescheduled 12 users, most COMPLETE before
// the layer opened with no code on it, each re-test a whole job session): for a rescheduled module
// with no commit of its own on the layer since the open, its job branch (the one its last start row
// names, already in the layer) moves to the layer tip with one records-only retest row, and a ready
// pull request into the layer is opened. CI's gate runs its whole suite on the
// layer tip, against its providers' current versions, as on any ready layer job PR; green, the merge
// tool lands it (layer land), and that land clears the reschedule. The gate's trust stays with a CI
// run, never a state row (coordinator, 6 Nov). Red: a job starts (job start --reopen). No session.
// layer clear <user> --provider <id> --why "<the ruling>" (C11 c, the coordinator, 7 Nov: a false
// reschedule had no scoped clear, only notice withdraw, for every user, or a retest): the user's
// outstanding reschedules from that provider, in the open layer, cleared by one row each
// (layerflow/<n>/clear/), the ruling and who gave it recorded; the user owes them no more.
export function layerClear(root, user, { provider, land, why, by = 'bob', log = console.log } = {}) {
  const cfg = loadConfig(root);
  needLayerMode(cfg, 'layer clear');
  if (typeof provider !== 'string' || !provider.trim()) fail('layer clear <user> --provider <id> --why "<the ruling>"');
  if (typeof why !== 'string' || !why.trim()) fail('layer clear needs --why: the ruling that the reschedule is false, and whose');
  fetchState(root, cfg.state_branch, { fresh: true });
  // The open layer from the state rows alone (no GitHub read: a record of a ruling).
  const v = { n: layersAt(root, cfg, `refs/remotes/origin/${cfg.tranche}`).map((L) => L.n).find((k) => { const r = flowRows(root, cfg.state_branch, k); return r.open && !r.merged; }) ?? null };
  if (v.n === null) fail(`no layer is open: nothing to clear`);
  const rows = flowRows(root, cfg.state_branch, v.n);
  const anc = (a, b) => isAnc(root, a, b);
  const all = outstanding(rows.reschedules, rows.lands, user, anc).filter((r) => r.provider === provider);
  if (!all.length) fail(`${user} owes no reschedule from ${provider} in layer ${v.n}; nothing recorded`);
  // One land at a time when the provider landed more than once (cold review of C11: a false first
  // change and a real second one are not cleared together).
  const lands = [...new Set(all.map((r) => r.provider_land))];
  if (lands.length > 1 && !land) fail(`${user} owes reschedules from ${provider}'s ${lands.length} lands (${lands.map((x) => short(x)).join(', ')}): name the one the ruling is for with --land <sha>; nothing recorded`);
  const owed = land ? all.filter((r) => String(r.provider_land).startsWith(String(land))) : all;
  if (!owed.length) fail(`${user} owes no reschedule from ${provider}'s land ${land} in layer ${v.n}; nothing recorded`);
  const at = now();
  writeRows(root, cfg.state_branch, `layer ${v.n}: ${user}'s reschedule from ${provider} cleared`, owed.map((r) => [flowFile(v.n, 'clear', `${safeName(user)}-${safeName(provider)}-${short(r.provider_land)}`), { row: 'clear', layer: v.n, user, provider, provider_land: r.provider_land, key: r.key, why: why.trim(), at, by }]));
  log(`${user}: ${owed.length} reschedule(s) from ${provider} cleared in layer ${v.n} (${why.trim()}); its other providers' stand`);
  return { ok: true, cleared: owed.map((r) => r.key) };
}

export function layerRetest(root, id, { io = {}, log = console.log, by = 'bob', cause = null } = {}) {
  const cfg0 = loadConfig(root);
  const direct = directMode(cfg0);
  if (!direct) needLayerMode(cfg0, 'layer retest');
  const slug = io.slug || repoSlug(root);
  const x = { openPRs, createPR, markReady, prsFromBranch, comments: ghComments, jobHeads: originJobs, ...io };
  const cfg = jobCfg(root, cfg0, id);
  if (!cfg.layer) fail(`${id} is in no open layer (its layer's branch is not on origin, or the layer merged)`);
  const { n } = cfg.layer;
  // Its base: layer/<n>, or the tranche under the direct flow (PD-25).
  const b0 = flowBase(cfg);
  if (direct) { fetchBranch(root, cfg0.tranche, { allowFail: true }); fetchState(root, cfg0.state_branch, { fresh: true }); } else fetchLayer(root, cfg0, n);
  const L = direct ? readDirect(root, cfg0, { io: { openPRs: x.openPRs }, slug }) : readLayer(root, cfg0, n, { io: { openPRs: x.openPRs }, slug });
  const s = L.states.find((m) => m.id === id) || fail(`${id} is not a module of layer ${n}`);
  const reopen = `${P3} job start ${id} --sessions <file> --reopen "re-test against the new interface of ${[...new Set(s.outstanding.map((r) => r.provider))].join(', ') || 'its providers'}"`;
  if (s.state !== 'rescheduled' || s.pr !== null) fail(`${id} is ${s.state}${s.pr !== null ? ` with PR ${s.pr} open` : ''}: layer retest is for a rescheduled module with no pull request open`);
  // Unmet requirement marks are a job's to meet: a retest would land it with them still unmet.
  // A breaking change is a job's (Bob's "c"); the retest's land would clear it too (cold review of PR 193).
  const breaking = s.outstanding.filter((r) => r.class !== 'additive');
  if (breaking.length) fail(`${id} owes a job for ${[...new Set(breaking.map((r) => r.provider))].join(', ')}'s breaking change: ${reopen}`);
  if (s.marks.length) fail(`${id} has unmet requirement marks (${s.marks.join(', ')}): a job meets them: ${P3} job start ${id} --sessions <file> --reopen "meet the unmet requirement marks ${s.marks.join(', ')} and re-test against the new interface"`);
  const tip = rev(root, L.ref);
  const e = L.entries.get(id) || fail(`no ledger entry for ${id}`);
  if (e.status?.state !== 'COMPLETE') fail(`${id} is ${e.status?.state} on ${b0}: a retest re-runs a COMPLETE module; ${reopen}`);
  // Its own work may be on the layer (landed): the retest re-runs it there. Work the layer lacks
  // (below) is a job's.
  // Its job branch, as its last start row names it. It holds nothing the layer lacks but earlier
  // retests (a red one, or one a later provider land overtook), and no other job branch of it holds
  // work the layer lacks (a fresh start whose pull request never opened: cold review of PR 193).
  const branch = startBranch(rowsAt(root, tip, id), id);
  const ids = new Set([...ledgerIds(root, L.ref), ...ledgerIds(root, `refs/remotes/origin/${cfg0.tranche}`)]);
  const heads = x.jobHeads(root);
  if (heads === null) fail('origin\'s job branches could not be read; nothing was done');
  let at = '';
  for (const h of [...heads].filter((q) => branchModule(q, ids) === id)) {
    fetchBranch(root, h, { allowFail: true });
    const t = rev(root, `refs/remotes/origin/${h}`);
    if (h === branch) at = t;
    const extra = isAnc(root, t, tip) ? [] : git(['rev-list', '--no-merges', '--format=%s', t, `^${tip}`], { cwd: root }).split('\n').filter((l) => l && !l.startsWith('commit '));
    if (extra.length && (extra.some((l) => !l.startsWith(`layer retest ${id} `)) || diffNames(root, git(['merge-base', t, tip], { deepen: true, cwd: root }), t).some((f) => f !== metricsFile(id)))) {
      fail(`origin's ${h} at ${short(t)} has work ${b0} lacks: a job re-tests it: ${reopen}`);
    }
  }
  // GitHub's list, with each land the state branch recorded that GitHub no longer lists (hidden).
  // The branch may be gone (the cleanup deletes a landed job branch): the layer tip holds its lands.
  const prs = landedFrom(root, cfg0.state_branch, id, branch, at || tip, x.prsFromBranch(slug, branch));
  if (prs === null) fail(`GitHub unreadable: the pull requests from ${branch} are not known; nothing was done`);
  const open = prs.find((p) => p.state === 'open');
  if (open) fail(`${branch} has pull request ${open.number} open: land or close it first`);
  const providers = [...new Set(s.outstanding.map((r) => r.provider))];
  const sha = withTemp('p3-layer-', (tmp) => {
    const w = join(tmp, 'w');
    // On the layer tip; a branch holding an earlier retest takes the layer in by a merge (no rewrite).
    const from = at && !isAnc(root, at, tip) ? at : tip;
    git(['worktree', 'add', '-q', '--detach', w, from], { cwd: root });
    try {
      if (from !== tip) git(['merge', '-q', '--no-edit', '-m', `Merge ${b0} into ${branch}`, tip], { cwd: w });
      appendRow(w, id, { row: 'retest', event: 'retest', layer: n, tested_on: tip, against: providers, by });
      git(['add', '--', metricsFile(id)], { cwd: w });
      git(['commit', '-q', '-m', `layer retest ${id} on ${b0} ${short(tip)}`, '--', metricsFile(id)], { cwd: w });
      const h = git(['rev-parse', 'HEAD'], { cwd: w });
      const p = git(['push', '-q', 'origin', `${h}:refs/heads/${branch}`], { cwd: w, allowFail: true });
      if (p.code !== 0) fail(`the push of ${branch} failed (${p.stderr.trim()}); nothing was opened`);
      return h;
    } finally { git(['worktree', 'remove', '--force', w], { cwd: root, allowFail: true }); }
  }, { root });
  const body = [`layer retest of ${id} on ${b0} ${short(tip)}, against ${providers.join(', ')}'s new interface: one records-only commit, no job session.`, '', `CI's gate runs ${id}'s whole suite on this head; green, the merge tool lands it (${P3} layer land <this PR>). Red: ${reopen}.`].join('\n');
  const pr = x.createPR(slug, { head: branch, base: b0, title: `layer retest: ${id}`, body, draft: true });
  writeRows(root, cfg0.state_branch, `layer ${n}: ${id} retest PR ${pr.number}`, [[flowFile(n, 'retest', `${safeName(id)}-${pr.number}`), { row: 'retest', layer: n, module: id, pr: pr.number, head: sha, tested_on: tip, against: providers, ...(cause !== null ? { cause } : {}), at: now(), by }]]);
  x.markReady(slug, pr.number);
  log(`layer retest: ${id} on ${b0} ${short(tip)}: PR ${pr.number} from ${branch}, ready; the gate runs its whole suite. Green: ${P3} layer land ${pr.number}. Red: close it and run ${P3} layer retest ${id} again, or ${reopen}`);
  return { ok: true, pr, branch, head: sha, tested_on: tip };
}

// ---- layer land -----------------------------------------------------------------------------

export function mergeVia(slug, n, sha, title) {
  return import('./merge.mjs').then((m) => m.mergePR(slug, n, sha, { title }));
}

// A land's interface change and whom it reaches (layer land; direct land, PD-25): the provider's
// interface before and after, its declared users, and for a change confined to its own tests (C11,
// PD-15) the importers it reaches and each user's class and triggers. rows: the flow's rows (its
// earlier lands of this provider).
export function landReach(root, cfg, id, before, after, rows) {
  const ic = interfaceChange(root, cfg, id, before, after);
  const users = usersOf(root, cfg, id, after);
  // A change confined to its own tests (C11) reaches only the users importing a changed test file,
  // as breaking for them; for the rest it is no change.
  let reach = null;
  // An earlier land of this provider in the layer that changed its source (or one recorded before
  // that was read) leaves its tests' verdict standing: this test change may be the only sign of it.
  const earlier = rows.lands.some((l) => l.module === id && !l.interface?.test_only && l.interface?.source_changed !== false);
  // The users importing a changed test file: breaking for each of them, whatever the land's class.
  let breakingFor = new Set();
  if (ic.test_only) {
    // Any module may import a provider's test file, a declared user or not.
    const others = (readModules(root, cfg, after) || []).map((m) => m?.id).filter((m) => m && m !== id);
    const pe = entryAt(root, after, id);
    ic.test_only.importers = testImporters(root, cfg, after, [...new Set([...users, ...others])], ic.test_only.files, { provTests: pe?.tests || [] });
    breakingFor = new Set(ic.test_only.importers);
  }
  if (ic.test_only && earlier) {
    ic.test_only.earlier_source = true;
    // PD-15 (8 Nov): this land changed neither source nor exports, so its tests' verdict is at most
    // additive: each user is retested by its gate (a red retest falls back to a job), never a job each
    // (copy layer 12: hypotheses' c2e2567196 started four). by_tests keeps the tests' own verdict.
    let cls = ic.test_only.by_tests;
    if (cls === 'breaking') { cls = 'additive'; ic.test_only.capped = 'PD-15'; }
    // With the tests reading no change, only the importers are reached, as under C11.
    if (cls === 'none' && breakingFor.size) { cls = 'breaking'; reach = new Set(breakingFor); }
    ic.class = cls;
    ic.changed = cls !== 'none';
    if (breakingFor.size) ic.triggers = [...new Set([...(ic.triggers || []), 'test-import'])];
    for (const u of ic.test_only.importers) if (!users.includes(u)) users.push(u);
  } else if (ic.test_only) {
    reach = new Set(ic.test_only.importers);
    ic.triggers = reach.size ? ['test-import'] : [];
    if (reach.size) { ic.class = 'breaking'; ic.changed = true; }
    for (const u of ic.test_only.importers) if (!users.includes(u)) users.push(u);
  }
  const classFor = (u) => (breakingFor.has(u) ? 'breaking' : ic.class);
  // test-import names an importer's own row only, never a user's whose class the tests set (cold review of C38).
  const triggersFor = (u) => (breakingFor.has(u) ? ic.triggers : (ic.triggers || []).filter((t) => t !== 'test-import'));
  return { ic, users, reach, classFor, triggersFor };
}

// The merge tool's land of a publish PR into its layer branch.
export async function layerLand(root, prn, { io = {}, log = console.log, by = 'bob' } = {}) {
  const cfg = loadConfig(root);
  // PD-25: under the direct flow a job PR lands into the tranche (direct.mjs).
  if (directMode(cfg)) return directLand(root, prn, { io, log, by });
  needLayerMode(cfg, 'layer land');
  const slug = io.slug || repoSlug(root);
  const x = { getPR, checkRun, comments: ghComments, merge: (s, k, sha, title) => mergeVia(s, k, sha, title), ...io };
  const n0 = Number(prn);
  if (!Number.isInteger(n0) || n0 <= 0) fail(`layer land <pr>, a pull request number, not ${JSON.stringify(prn)}`);
  const pr = x.getPR(slug, n0) || fail(`pull request ${n0} not found`);
  const n = layerOfBranch(pr.base?.ref);
  if (n === null) fail(`pull request ${n0} is into ${pr.base?.ref}, not a layer branch: a job's pull request goes into its layer's branch`);
  // A land GitHub merged but never recorded (its state write failed after the merge: cold review 7)
  // is recorded on a second run, from the merge commit: its reschedules are never lost.
  const recover = pr.merged === true && !!pr.merge_commit_sha;
  if (pr.state !== 'open' && !recover) fail(`pull request ${n0} is ${pr.merged ? 'merged' : pr.state}`);
  if (pr.draft && !recover) fail(`pull request ${n0} is a draft: the job publishes it (${P3} layer publish <id>)`);
  if (pr.head?.repo?.full_name && pr.head.repo.full_name !== slug) fail(`pull request ${n0} is not from a branch of ${slug}`);
  fetchLayer(root, cfg, n);
  const lref = layerRef(n);
  const rows = flowRows(root, cfg.state_branch, n);
  if (!rows.open) fail(`layer ${n} was not opened by ${P3} layer open ${n}`);
  if (rows.merged) fail(`layer ${n} already merged into ${cfg.tranche}`);
  const id = branchModule(pr.head?.ref, new Set([...ledgerIds(root, lref), ...ledgerIds(root, `refs/remotes/origin/${cfg.tranche}`)])) || fail(`pull request ${n0} is from ${pr.head?.ref}, not a job branch`);
  if (!(layersAt(root, cfg, lref).find((L) => L.n === n)?.mods || []).includes(id) && !rows.joins.some((j) => j.module === id)) fail(`${id} is not a module of layer ${n}, nor joined it (${P3} layer join)`);
  fetchBranch(root, pr.head.ref, { allowFail: true });
  const head = pr.head.sha;
  if (!hasCommit(root, head)) fail(`this clone does not hold ${short(head)}, the head of pull request ${n0}`);
  let before;
  let after;
  if (recover) {
    if (rows.lands.some((l) => l.pr === n0)) fail(`pull request ${n0} is merged and its land is recorded`);
    after = pr.merge_commit_sha;
    if (!hasCommit(root, after)) fail(`this clone does not hold ${short(after)}, pull request ${n0}'s merge`);
    before = git(['rev-parse', `${after}^1`], { cwd: root });
    log(`pull request ${n0} merged at ${short(after)} with no land recorded: recording it now`);
  } else {
  // The gate on the PR's tip, green: the publish's CI evidence (JOB-12's revert check included).
  const g = x.checkRun(slug, head, 'gate');
  if (g?.status !== 'completed' || g.conclusion !== 'success') fail(`the gate on ${short(head)} is ${g ? `${g.status}${g.conclusion ? ` ${g.conclusion}` : ''}` : 'not run'}: a publish lands only on a green gate on its tip`);
  const e = entryAt(root, head, id) || fail(`no ledger entry for ${id} at ${short(head)}`);
  before = rev(root, lref);
  const out = outsideFiles(root, e, git(['merge-base', before, head], { deepen: true, cwd: root }), head);
  if (out.length) fail(`refused: pull request ${n0} changes files outside ${id} (ARC-2): ${out.slice(0, 10).join(', ')}`);
  // A run that started before a provider's newest interface change never counts (Bob, 5 Nov).
  const late = outstanding(rows.reschedules, [], id, () => false).filter((r) => !isAnc(root, r.provider_land, head));
  if (late.length) fail(`refused: ${id}'s run on ${short(head)} started before ${late.map((r) => `${r.provider}'s interface change (land ${short(r.provider_land)})`).join(', ')}: it never counts; the job runs ${P3} layer publish ${id} again`);
  // Exports that cannot be read refuse the land (Bob, 6 Nov, R8): never a reschedule of every user.
  const pre = (x.interfaceChange || interfaceChange)(root, cfg, id, before, head);
  if (pre.unread) fail(`refused: ${id}'s exports could not be read at ${short(head)} (${pre.unread}); the job fixes what cannot be read and publishes again; nothing was merged`);
  const r = await x.merge(slug, n0, head, landTitle(n0));
  if (!r?.merged && !r?.sha) fail(`GitHub did not merge pull request ${n0}: ${JSON.stringify(r).slice(0, 200)}`);
  fetchBranch(root, layerBranch(n));
  after = r.sha && hasCommit(root, r.sha) ? r.sha : rev(root, lref);
  }
  const { ic, users, reach, classFor, triggersFor } = landReach(root, cfg, id, before, after, rows);
  const layers = layersAt(root, cfg, after);
  // Where each user's work is (R12; cold review of PR 191): joined to this layer, or to a later one
  // not merged, else its map layer. A joined provider's users from its own map layer on are noticed
  // (those in layers merged since come back through the notice and a join).
  const joinedTo = new Map();
  for (const L of layers) if (L.n > n) { const r = flowRows(root, cfg.state_branch, L.n); if (!r.merged) for (const j of r.joins) joinedTo.set(j.module, L.n); }
  for (const j of rows.joins) joinedTo.set(j.module, n);
  const home = (u) => joinedTo.get(u) ?? layerOf(layers, u);
  // A joined module, or one a completion layer reopens (C33), notices its users from its map layer
  // on: those in merged layers come back through the notice (cold review of C33).
  const floor = joinedTo.get(id) === n || layers.find((L) => L.n === n)?.completion || layers.find((L) => L.n === n)?.round ? (layerOf(layers, id) ?? n) : n;
  const same = users.filter((u) => home(u) === n && (!reach || reach.has(u)));
  // The old rule's count reads every declared user in the layer, whatever reach filtered (cold review).
  const sameAll = usersOf(root, cfg, id, after).filter((u) => home(u) === n);
  const later = users.filter((u) => { const k = home(u); return k !== n && (k === null || k > floor) && (!reach || reach.has(u)); });
  const runs = gateRuns(x.comments(slug, n0)).filter((q) => q?.sha);
  const at = now();
  // A changed Public / Provides text alone is a notice to every user, in this layer and later ones.
  const noticed = ic.changed ? later : ic.provides ? users.filter((u) => same.includes(u) || later.includes(u)) : [];
  if (ic.unread) log(`warning: ${id}'s exports could not be read on the land ${short(after)} (${ic.unread}): counted as breaking, each user in the layer rescheduled`);
  const land = { row: 'land', layer: n, module: id, pr: n0, branch: pr.head.ref, head, before, merge: after, at, by, ...(rows.retests.some((r) => r.pr === n0) ? { retest: true } : {}), gate_runs: runs.length, interface: ic, users_rescheduled: ic.changed ? same : [], users_rescheduled_old_rule: ic.triggers_old?.length ? sameAll : [], users_noticed: noticed };
  const files = [[flowFile(n, 'land', `${safeName(id)}-${n0}-${short(head)}`), land], ...gateFiles(n, id, n0, runs)];
  // A user that started early into a later layer not yet open (R14) is working against this provider
  // now: an interface change reschedules it there, as one in this layer, never a notice its own land
  // would answer unseen (cold review of R14). Its layer's states hold it until its land holds this one.
  const earlyAt = ic.changed ? earlyUsers(root, cfg.state_branch, n, later, home) : new Map();
  const early = [...earlyAt.keys()];
  if (early.length) land.users_rescheduled_early = early;
  for (const u of early) {
    const k = earlyAt.get(u);
    files.push([flowFile(k, 'reschedule', `${safeName(u)}-${safeName(id)}-${short(after)}`), { row: 'reschedule', layer: k, user: u, provider: id, provider_pr: n0, provider_land: after, at, key: `${u}<-${id}@${short(after)}`, why: interfaceText(ic), triggers: triggersFor(u), class: classFor(u), early_from: n }]);
    log(`${u} started early into layer ${k}: rescheduled there by ${id}'s interface change; its job brings ${layerBranch(k)} up once layer ${k} opens, and its run counts only on a head that holds ${short(after)}`);
  }
  if (ic.changed) {
    for (const u of same) files.push([flowFile(n, 'reschedule', `${safeName(u)}-${safeName(id)}-${short(after)}`), { row: 'reschedule', layer: n, user: u, provider: id, provider_pr: n0, provider_land: after, at, key: `${u}<-${id}@${short(after)}`, why: interfaceText(ic), triggers: triggersFor(u), class: classFor(u) }]);
  }
  let raised = null;
  if (noticed.length) {
    const key = noticeKey(id, n0);
    // The exports read over the land (PD-20: triage trusts "exports unchanged" only with the read);
    // a read that disagrees with the land's interface check is recorded unread.
    const rx = readExports(root, cfg, entryAt(root, after, id) || {}, before, after);
    const read = rx.exports_unread ? { exports_unread: rx.exports_unread } : !!rx.exports === !!ic.exports ? { exports_read: rx.exports_read } : { exports_unread: "the land's export read and its interface check disagree" };
    const exp = rx.exports || ic.exports;
    raised = { row: 'notice', at, key, provider: id, ids: [], pr: n0, users: noticed, source: 1, ...(exp ? { exports: exp } : {}), ...read, layer_flow: { layer: n, provides: !!ic.provides, rescheduled: ic.changed } };
    files.push([noticeFile(key), raised]);
  }
  // The notices this module owed (from earlier layers' providers) are answered by its land.
  try { for (const k of noticeRecords(root, cfg.state_branch).filter((q) => !q.withdrawn && q.open.includes(id))) files.push([answerFile(id, k.key), { row: 'answered', at, key: k.key, user: id, pr: n0, by: 'layer land' }]); } catch { /* none read: none answered */ }
  writeRows(root, cfg.state_branch, `layer ${n}: land PR ${n0} (${id})${ic.changed ? `, interface changed (${ic.class}): ${same.length} ${ic.class === 'additive' ? 'to retest' : 'rescheduled'}` : ''}`, files);
  log(`landed PR ${n0} (${id}) into ${layerBranch(n)} at ${short(after)}; interface: ${interfaceText(ic)}`);
  // Its starts owed are paid by its land (a job's or a retest's): job start --ready never runs here.
  try { writeState(root, cfg.state_branch, `starts owed: ${id} landed (PR ${n0})`, (dir) => { paidFor(dir, [id]); return {}; }); } catch (e) { log(`note: the starts owed were not updated (${e.message})`); }
  const msgs = [];
  const retests = [];
  if (ic.changed) {
    const open = (x.openPRs || openPRs)(slug, layerBranch(n)) || [];
    const ids = new Set([...ledgerIds(root, lref), ...ledgerIds(root, `refs/remotes/origin/${cfg.tranche}`)]);
    for (const u of same) {
      const p = open.find((q) => branchModule(q.head?.ref, ids) === u);
      const text = `layer ${n}: ${id} changed its interface (${classFor(u)}; land ${short(after)}: ${interfaceText(ic)}). Halt any test run now; run \`${P3} layer publish ${u}\` again: it brings job/${u} up to ${layerBranch(n)} and its gate re-runs your suite against ${id}'s new version. A run started before this never counts.`;
      if (p) { msgs.push({ user: u, pr: p.number, text }); log(`BOB delivers to job ${u}'s session (PR ${p.number}), with send_message priority now: ${text}`); continue; }
      if (classFor(u) !== 'additive') { log(`${u}: no job open; it re-runs when it starts (${P3} layer jobs ${n} lists it)`); continue; }
      // Additive: the gate alone re-tests it (layer retest), no job session; refused, a job does.
      try {
        const r = (x.retest || layerRetest)(root, u, { io: x, log, by, cause: n0 });
        retests.push({ user: u, pr: r.pr?.number ?? null });
      } catch (err) {
        const why = String(err.message || err).replace(/^p3 [\w ]+: /, '').slice(0, 300);
        retests.push({ user: u, pr: null, refused: why });
        // Kept, so layer jobs lists its job and not the retest again (cold review of PR 193).
        try { writeRows(root, cfg.state_branch, `layer ${n}: ${u}'s retest refused`, [[flowFile(n, 'retest-refused', `${safeName(u)}-${n0}`), { row: 'retest-refused', layer: n, module: u, cause: n0, why, at: now(), by }]]); } catch { /* the log below still says it */ }
        log(`${u}: no retest opened (${why}); a job re-tests it: ${P3} layer jobs ${n} lists it`);
      }
    }
  }
  if (noticed.length) log(`provider notice ${noticeKey(id, n0)} for ${noticed.length} user(s)${ic.changed ? ' in later layers' : ', its Public / Provides text changed (no reschedule)'}: ${noticed.join(', ')}`);
  // The notice triaged at the land, as the tranche merge triages its own (triageAtMerge, PD-20 rules;
  // coordinator, 9 Nov: no layer land had cleared a user since 7 Nov). The land stands if it fails.
  let triage = null;
  if (raised) {
    try { const { triageAtMerge } = await import('./triage.mjs'); triage = triageAtMerge(root, cfg, raised, { ref: after, log }); } catch (e) {
      triage = { rows: [], owed: raised.users, key: raised.key, error: e.message };
      log(`the land stands; notice triage ${raised.key} at the land failed (${e.message}); next act: ${P3} notice triage ${raised.key}`);
    }
  }
  return { ok: true, land, messages: msgs, retests, triage };
}

// ---- layer sync (R11) -----------------------------------------------------------------------

// PD-23 (coordinator, 9 Nov, Bob's revision of SLB-12): a pin move reaches every open layer itself,
// by layer pin --open after its merge (pin.mjs): in place when the pin diff judges nothing, else at
// the coordinator's choice (apply, hold, or reset: this layer sync). No BOB act, and a pin difference
// holds no land and no merge. SLB-12's case (copy, 6 Nov: layer/8 at 4a85f26 refused R4's carried
// entries after the tranche moved to 0635b64) is one the pin move applies or resets.
const pinOf = (root, rev) => git(['ls-tree', rev, '--', '.process'], { cwd: root, allowFail: true }).stdout.match(/^160000 commit ([0-9a-f]{40,64})\t/)?.[1] || null;
const SHIMS = (() => { try { return new Set(readdirSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'shims'))); } catch { return new Set(); } })();
// The conflicts layer sync resolves: .process and the process's shims as the tranche has them, a
// ledger entry as the layer has it (its jobs' states; R4's carried entries). Any other refuses.
// A ledger entry, process/ledger/<id>.json, directly in the ledger directory.
const ENTRY_FILE = new RegExp(`^${LEDGER_DIR.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}/[^/]+\\.json$`);
const isEntryFile = (f) => ENTRY_FILE.test(f);
const syncSide = (f, cfg = null) => (f === '.process' || (cfg && f === cfg.completion_file) || (SHIMS.has(f.split('/').pop()) && (f.startsWith('.github/') || f.startsWith('.claude/') || !f.includes('/'))) ? 'theirs' : isEntryFile(f) ? 'ours' : null);

export const SYNC_TITLE = /^Merge layer sync PR (\d+)$/;
// The completion layer's tick (C33): one tool commit on layer/<n> at its merge, flipping `[ ]` to
// `[x]` on the open items whose module landed on the layer; the layer gate checks exactly that.
export const TICK_TITLE = /^Tick completion items of layer (\d+): (.+)$/;
// Two texts of the completion file the same but for boxes `b` ticks that `a` has open.
export function onlyTicks(a, b) {
  const x = String(a).split('\n');
  const y = String(b).split('\n');
  return x.length === y.length && x.every((l, i) => l === y[i] || (/^\s*[-*]\s+\[ \]/.test(l) && l.replace('[ ]', '[x]') === y[i]));
}
// The lines of `file` a tick flips, as [line, item] pairs, or a reason it is not a tick: the commit
// changes that file alone, only `[ ]` to `[x]`, each on an item of a module in `landed`.
export function tickCheck(root, file, before, after, landed, ids = null) {
  const files = git(['diff', '--no-renames', '--name-only', before, after], { cwd: root }).split('\n').filter(Boolean);
  if (files.length !== 1 || files[0] !== file) return { why: `changes ${files.join(', ') || 'nothing'}, not ${file} alone` };
  const a = (git(['show', `${before}:${file}`], { cwd: root, allowFail: true }).stdout || '').split('\n');
  const b = (git(['show', `${after}:${file}`], { cwd: root, allowFail: true }).stdout || '').split('\n');
  if (a.length !== b.length) return { why: `adds or removes lines of ${file}` };
  const was = new Map(parseCompletion(a.join('\n')).map((x) => [x.line, x]));
  const flipped = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    const x = was.get(i + 1);
    if (!x || x.done || x.deferred || a[i].replace('[ ]', '[x]') !== b[i]) return { why: `line ${i + 1} of ${file} is not an open item ticked` };
    if (ids && !ids.has(x.id)) return { why: `ticks ${x.id}, which is not an item of this completion layer` };
    if (!landed.has(x.target)) return { why: `ticks ${x.id}, whose module ${x.target} has no verified land on the layer` };
    flipped.push(x.id);
  }
  return flipped.length ? { ids: flipped } : { why: 'ticks nothing' };
}
// The tool's merge of the tranche tip into a layer commit, in a worktree: { tree, resolved, conflictsOutside }.
function syncMerge(root, cfg, n, base, ttip, w) {
  git(['worktree', 'add', '-q', '--detach', w, base], { cwd: root });
  const m = git(['merge', '-q', '--no-ff', '--no-commit', ttip], { cwd: w, allowFail: true });
  const conflicted = m.code === 0 ? [] : git(['diff', '--name-only', '--diff-filter=U'], { cwd: w }).split('\n').filter(Boolean);
  if (m.code !== 0 && !conflicted.length) fail(`merging ${cfg.tranche} into ${layerBranch(n)} failed (${(m.stderr || m.stdout).trim().split('\n').pop()}); nothing was opened`);
  const bad = conflicted.filter((f) => !syncSide(f, cfg));
  if (bad.length) { git(['merge', '--abort'], { cwd: w, allowFail: true }); fail(`layer sync ${n} refused: ${layerBranch(n)} and ${cfg.tranche} conflict in ${bad.join(', ')}; only .process, the process's shims and ledger entries are resolved by the tool; nothing was opened`); }
  for (const f of conflicted) {
    const side = syncSide(f, cfg);
    // The side's version, or its deletion (a modify/delete conflict).
    const stage = side === 'ours' ? 2 : 3;
    const has = git(['ls-files', '-u', '--', f], { cwd: w }).split('\n').some((l) => l.split(/\s+/)[2] === String(stage));
    if (f === '.process') {
      const pin = pinOf(root, ttip);
      if (pin) git(['update-index', '--cacheinfo', `160000,${pin},.process`], { cwd: w });
      else git(['rm', '-q', '--cached', '--', '.process'], { cwd: w });
    } else if (!has) git(['rm', '-q', '--', f], { cwd: w });
    else { git(['checkout', '-q', `--${side}`, '--', f], { cwd: w }); git(['add', '--', f], { cwd: w }); }
  }
  git(['commit', '-q', '--no-edit', '-m', `Merge ${cfg.tranche} ${short(ttip)} into ${layerBranch(n)} (layer sync)${conflicted.length ? `: ${conflicted.map((f) => `${f} ${syncSide(f) === 'ours' ? 'the layer\'s' : `${cfg.tranche}'s`}`).join(', ')}` : ''}`], { cwd: w });
  return { head: git(['rev-parse', 'HEAD'], { cwd: w }), tree: git(['rev-parse', 'HEAD^{tree}'], { cwd: w }), resolved: conflicted };
}

// After the layer syncs, each open job PR's branch takes the synced layer tip by a merge commit, so its
// gate runs with the new tool (coordinator, 6 Nov: layer 8's job PRs 658-661 were red only on the old
// tool's ledger finding, their sessions archived). Only when the merge is clean but for .process, the
// shims and the job's own ledger entry (kept as the job wrote it), and brings nothing but those and
// records (no code): then the
// job's tested code stands. A BLOCKED job, a conflict, or any other change is listed and left alone.
export function syncJobs(root, cfg, n, prs, ids, log = console.log, slug = null) {
  const b0 = layerBranch(n);
  const tip = rev(root, layerRef(n));
  const out = { merged: [], left: [] };
  // Records (other modules' metrics rows and the like) are no code: the tested code stands over them.
  const allowed = (f) => f === '.process' || syncSide(f, cfg) === 'theirs' || isEntryFile(f) || isRecordPath(cfg, f);
  for (const p of prs) {
    const id = branchModule(p.head?.ref, ids);
    if (!id || !String(p.head.ref).startsWith('job/')) continue;
    // A fork's PR names a branch that is not origin's: never pushed to (cold review of PR 198).
    if (slug && p.head?.repo?.full_name && p.head.repo.full_name !== slug) continue;
    const branch = p.head.ref;
    const leave = (why) => { out.left.push({ id, pr: p.number, branch, why }); log(`  ${branch} (PR ${p.number}) left as it is: ${why}`); };
    fetchBranch(root, branch, { allowFail: true });
    const head = git(['rev-parse', '-q', '--verify', `refs/remotes/origin/${branch}`], { cwd: root, allowFail: true }).stdout.trim();
    if (!head) { leave('its branch is not on origin'); continue; }
    if (isAnc(root, tip, head)) continue;
    const be = entryAt(root, head, id);
    if (be?.status?.state === 'BLOCKED') {
      // BLOCKED only on the ledger-carry finding this sync cleared: its entry was carried (absent where
      // the branch left the layer) and the layer holds it now (coordinator, 6 Nov: layer 8's 658-661).
      const mb = git(['merge-base', head, tip], { deepen: true, cwd: root, allowFail: true }).stdout.trim();
      const carried = !!mb && !entryAt(root, mb, id) && !!entryAt(root, tip, id);
      // Both the carry and a reason naming the ledger say so; the carry alone only suggests it
      // (cold review of PR 201: a job BLOCKED for a real reason may have carried its entry too).
      const restart = `${P3} job start ${id} --restart "the ledger-carry finding is cleared by layer sync ${n}: publish"`;
      if (carried && /ledger|carr/i.test(String(be.status.reason || ''))) leave(`BLOCKED only on the ledger-carry finding this sync cleared (${entryFile(id)} is on ${b0} now): restart it to publish: ${restart}`);
      else if (carried) leave(`BLOCKED (${be.status.reason || 'no reason'}); its carried entry ${entryFile(id)} is on ${b0} now: if only the ledger-carry finding blocked it, restart it to publish: ${restart}`);
      else leave('BLOCKED');
      continue;
    }
    const r = withTemp('p3-layer-', (tmp) => {
      const w = join(tmp, 'w');
      git(['worktree', 'add', '-q', '--detach', w, head], { cwd: root });
      try {
        const m = git(['merge', '-q', '--no-ff', '--no-commit', tip], { cwd: w, allowFail: true });
        const conflicted = m.code === 0 ? [] : git(['diff', '--name-only', '--diff-filter=U'], { cwd: w }).split('\n').filter(Boolean);
        if (m.code !== 0 && !conflicted.length) { git(['merge', '--abort'], { cwd: w, allowFail: true }); return { why: `the merge failed (${(m.stderr || m.stdout).trim().split('\n').pop()})` }; }
        const bad = conflicted.filter((f) => f !== entryFile(id) && syncSide(f) !== 'theirs');
        if (bad.length) { git(['merge', '--abort'], { cwd: w, allowFail: true }); return { why: `a conflict in ${bad.join(', ')}` }; }
        for (const f of conflicted) {
          if (f === '.process') { const pin = pinOf(root, tip); if (pin) git(['update-index', '--cacheinfo', `160000,${pin},.process`], { cwd: w }); else git(['rm', '-q', '--cached', '--', '.process'], { cwd: w }); continue; }
          if (f === entryFile(id)) {
            // Its own entry: the layer's, with the job's status laid over it, so the gate's ledger
            // rule (only the status may differ from the base) holds (cold review of PR 198).
            const stage = (k) => { const r = git(['show', `:${k}:${f}`], { cwd: w, allowFail: true }); try { return r.code === 0 ? JSON.parse(r.stdout) : null; } catch { return undefined; } };
            const [mine, theirs] = [stage(2), stage(3)];
            if (!mine || !theirs) { git(['merge', '--abort'], { cwd: w, allowFail: true }); return { why: `its entry ${f} cannot be joined (${!mine ? 'the job\'s' : 'the layer\'s'} is missing or unreadable)` }; }
            writeFileSync(join(w, f), JSON.stringify({ ...theirs, status: mine.status }, null, 2) + '\n');
            git(['add', '--', f], { cwd: w });
            continue;
          }
          const side = 'theirs';
          const has = git(['ls-files', '-u', '--', f], { cwd: w }).split('\n').some((l) => l.split(/\s+/)[2] === '3');
          if (!has) git(['rm', '-q', '--', f], { cwd: w });
          else { git(['checkout', '-q', `--${side}`, '--', f], { cwd: w }); git(['add', '--', f], { cwd: w }); }
        }
        // What the merge changes on the job's branch: the pointer, shims and ledger entries only.
        // No rename detection: a rename lists the path it removes too (as diffNames reads it).
        const changed = git(['diff', '--cached', '--no-renames', '-z', '--name-only', head], { cwd: w }).split('\0').filter(Boolean);
        const other = changed.filter((f) => !allowed(f));
        if (other.length) { git(['merge', '--abort'], { cwd: w, allowFail: true }); return { why: `the layer brings other changes (${other.slice(0, 3).join(', ')}${other.length > 3 ? ` and ${other.length - 3} more` : ''}): its tested code would not stand; its job syncs it` }; }
        git(['commit', '-q', '--no-edit', '-m', `Merge ${b0} ${short(tip)} into ${branch} (layer sync: ${changed.join(', ') || 'no file'})`], { cwd: w });
        const h = git(['rev-parse', 'HEAD'], { cwd: w });
        const push = git(['push', '-q', 'origin', `${h}:refs/heads/${branch}`], { cwd: w, allowFail: true });
        if (push.code !== 0) return { why: `the push was refused (${push.stderr.trim().split('\n').pop()})` };
        return { head: h, changed };
      } finally { git(['worktree', 'remove', '--force', w], { cwd: root, allowFail: true }); }
    }, { root });
    if (r.why) { leave(r.why); continue; }
    out.merged.push({ id, pr: p.number, branch, head: r.head, changed: r.changed });
    log(`  ${branch} (PR ${p.number}) took ${b0} ${short(tip)}: ${r.changed.join(', ') || 'no file'}; its gate re-runs with the new tool`);
  }
  return out;
}

// p3 layer sync <n> [--no-wait] (BOB): the tranche into layer/<n> by a tool-made merge PR, landed by
// the merge tool on a green gate (the gate runs layer/<n>'s own tool, which takes a plain PR's
// ledger entries, pointer and shims). Nothing when layer/<n> already holds the tranche tip.
// A commit's parents as its object names them: a shallow clone's boundary (a depth-1 fetch of the
// merge) hides them from rev-list, never from the object (cold review of R17d).
const parentsOf = (root, sha) => git(['cat-file', '-p', sha], { cwd: root }).split('\n\n')[0].split('\n').filter((l) => l.startsWith('parent ')).map((l) => l.slice(7));
export async function layerSync(root, n, { io = {}, log = console.log, wait = true, by = 'bob' } = {}) {
  n = layerNum(n);
  const cfg = loadConfig(root);
  needLayerMode(cfg, 'layer sync');
  const slug = io.slug || repoSlug(root);
  const x = { findPR, createPR, checkRun, getPR, openPRs, prsFromBranch, merge: (s, k, sha, title) => mergeVia(s, k, sha, title), ...io };
  fetchLayer(root, cfg, n);
  const rows = flowRows(root, cfg.state_branch, n);
  if (!rows.open) fail(`layer ${n} was not opened by ${P3} layer open ${n}`);
  if (rows.merged) fail(`layer ${n} already merged into ${cfg.tranche}`);
  const b0 = layerBranch(n);
  const tr = `refs/remotes/origin/${cfg.tranche}`;
  const [tip, ttip] = [rev(root, layerRef(n)), rev(root, tr)];
  // A sync merged whose row was never written (the run stopped after GitHub's merge) is recorded now.
  const known = new Set((rows.syncs || []).map((r) => r.pr));
  const lost = git(['log', '--first-parent', '--format=%H %s', layerRef(n), '--not', rows.open.from], { cwd: root, allowFail: true }).stdout.split('\n').map((l) => [l.slice(0, l.indexOf(' ')), l.slice(l.indexOf(' ') + 1).match(SYNC_TITLE)?.[1]]).filter(([, k]) => k && !known.has(Number(k)));
  if (lost.length) writeRows(root, cfg.state_branch, `layer ${n}: sync rows recorded late`, lost.map(([c, k]) => [flowFile(n, 'sync', k), { row: 'sync', layer: n, pr: Number(k), merge: c, recovered: true, at: now(), by }]));
  const jobsOf = () => {
    const open = x.openPRs(slug, b0);
    if (open === null) { log(`GitHub unreadable: the job PRs into ${b0} were not brought up to it; run ${P3} layer sync ${n} again`); return null; }
    fetchBranch(root, b0, { allowFail: true });
    const ids = new Set([...ledgerIds(root, layerRef(n)), ...ledgerIds(root, tr)]);
    const r = syncJobs(root, cfg, n, open, ids, log, slug);
    if (r.merged.length || r.left.length) log(`layer sync ${n}: ${r.merged.length} job branch(es) took the layer, ${r.left.length} left as they are`);
    return r;
  };
  if (isAnc(root, ttip, tip)) { log(`${b0} holds ${cfg.tranche} ${short(ttip)}: in sync`); return { ok: true, synced: false, jobs: jobsOf() }; }
  // Another sync PR open into the layer (the tranche moved since it opened) is closed first: two
  // would each hold the layer's merge (cold review of PR 198).
  const into = x.openPRs(slug, b0);
  if (into === null) fail(`GitHub unreadable: the open pull requests into ${b0} are not known; nothing was opened`);
  const stem = `layer-sync/${n}-${short(ttip)}`;
  const other = into.filter((p) => String(p.head?.ref || '').startsWith(`layer-sync/${n}-`) && !String(p.head.ref).startsWith(stem));
  if (other.length) fail(`an older sync PR is open into ${b0}: ${other.map((p) => `#${p.number} (${p.head.ref})`).join(', ')}; BOB closes it, then runs ${P3} layer sync ${n} again; nothing was opened`);
  let pr = into.find((p) => String(p.head?.ref || '').startsWith(stem)) || null;
  let head = pr?.head?.sha || null;
  let resolved = [];
  // Whether origin's `branch` at `at` is the tool's merge of the tranche tip into the layer tip,
  // tree for tree, with no pull request ever opened from it: { head, resolved }, else null (an
  // unreadable list counts as one opened: the next name is taken, as before).
  const unopened = (branch, at) => {
    fetchBranch(root, branch, { allowFail: true });
    if (!hasCommit(root, at)) return null;
    const ps = parentsOf(root, at);
    if (ps.length !== 2 || ps[0] !== tip || ps[1] !== ttip) return null;
    const same = withTemp('p3-layer-', (tmp) => {
      const w = join(tmp, 'w');
      try { const r = syncMerge(root, cfg, n, tip, ttip, w); return r.tree === git(['rev-parse', `${at}^{tree}`], { cwd: root }) ? r.resolved : null; } finally { git(['worktree', 'remove', '--force', w], { cwd: root, allowFail: true }); }
    }, { root });
    if (!same) return null;
    const prs = x.prsFromBranch(slug, branch);
    return Array.isArray(prs) && !prs.length ? { head: at, resolved: same } : null;
  };
  if (pr) {
    // Its head must be the tool's own merge, tree for tree: a push to the branch is never landed.
    fetchBranch(root, pr.head.ref, { allowFail: true });
    const ps = hasCommit(root, head) ? parentsOf(root, head) : [];
    const ok = ps.length === 2 && isAnc(root, ps[0], tip) && ps[1] === ttip && withTemp('p3-layer-', (tmp) => {
      const w = join(tmp, 'w');
      try { const r = syncMerge(root, cfg, n, ps[0], ttip, w); resolved = r.resolved; return r.tree === git(['rev-parse', `${head}^{tree}`], { cwd: root }); } finally { git(['worktree', 'remove', '--force', w], { cwd: root, allowFail: true }); }
    }, { root });
    if (!ok) fail(`sync PR ${pr.number}'s head ${short(head)} is not the tool's merge of ${cfg.tranche} ${short(ttip)} into ${b0}: BOB closes it, then runs ${P3} layer sync ${n} again; nothing was landed`);
    log(`layer sync ${n}: PR ${pr.number} from ${pr.head.ref} is open already, its head the tool's merge`);
  } else {
    // A closed or red attempt keeps its branch (no session deletes one): the next takes a new name.
    // A branch an earlier run pushed and opened no pull request from (its create refused, R17d) is
    // taken up again when its head is the tool's merge of these two tips: not a second branch.
    let branch = stem;
    let again = null;
    for (let k = 2; ; k++) {
      const at = git(['ls-remote', '--heads', 'origin', `refs/heads/${branch}`], { cwd: root, allowFail: true }).stdout.trim().split('\t')[0];
      if (!at) break;
      again = unopened(branch, at);
      if (again) break;
      branch = `${stem}-${k}`;
    }
    if (again) {
      ({ head, resolved } = again);
      log(`layer sync ${n}: ${branch} holds the tool's merge already, with no pull request from it; it is opened, not pushed again`);
    } else ({ head, resolved } = withTemp('p3-layer-', (tmp) => {
      const w = join(tmp, 'w');
      try {
        const r = syncMerge(root, cfg, n, tip, ttip, w);
        const p = git(['push', '-q', 'origin', `${r.head}:refs/heads/${branch}`], { cwd: w, allowFail: true });
        if (p.code !== 0) fail(`the push of ${branch} failed (${p.stderr.trim()}); nothing was opened`);
        return r;
      } finally { git(['worktree', 'remove', '--force', w], { cwd: root, allowFail: true }); }
    }, { root }));
    const body = [`layer sync ${n}: ${cfg.tranche} ${short(ttip)} into ${b0} ${short(tip)}, made by the tool (a reset: PD-23's --layers reset, or by hand).`, '', `Process pin: ${short(pinOf(root, tip) || 'none')} -> ${short(pinOf(root, ttip) || 'none')}.`, resolved.length ? `Conflicts resolved by the tool: ${resolved.join(', ')}.` : 'No conflicts.', '', `The merge tool lands it on a green gate (${P3} layer sync ${n} again, if this run stopped).`].join('\n');
    pr = x.createPR(slug, { head: branch, base: b0, title: `layer sync ${n}: ${cfg.tranche} ${short(ttip)}`, body, draft: false });
    log(`layer sync ${n}: PR ${pr.number} from ${branch} into ${b0}${resolved.length ? `, resolved ${resolved.join(', ')}` : ''}`);
  }
  if (!wait) { log(`the gate decides; run ${P3} layer sync ${n} again to land it`); return { ok: true, synced: false, pr }; }
  const g = await waitGate(x, slug, pr.number, head);
  if (g?.status !== 'completed' || g.conclusion !== 'success') fail(`the gate on sync PR ${pr.number} ${short(head)} is ${g ? `${g.status} ${g.conclusion || ''}`.trim() : 'not run'}; layer sync lands on a green gate`);
  const r = await x.merge(slug, pr.number, head, `Merge layer sync PR ${pr.number}`);
  if (!r?.merged && !r?.sha) fail(`GitHub did not merge pull request ${pr.number}: ${JSON.stringify(r).slice(0, 200)}`);
  fetchBranch(root, b0);
  const row = { row: 'sync', layer: n, pr: pr.number, head, merge: r.sha || null, tranche_tip: ttip, pin_before: pinOf(root, tip), pin_after: pinOf(root, ttip), resolved, at: now(), by };
  writeRows(root, cfg.state_branch, `layer ${n}: sync PR ${pr.number}`, [[flowFile(n, 'sync', `${pr.number}`), row]]);
  log(`layer sync ${n}: ${cfg.tranche} ${short(ttip)} landed into ${b0}${r.sha ? ` at ${short(r.sha)}` : ''}`);
  return { ok: true, synced: true, pr, row, jobs: jobsOf() };
}

// ---- the pin moved into open layers (PD-23) -----------------------------------------------------

// Bob, 9 Nov: "An open layer may need to keep the old process version - if the process update would
// affect the proper completion of the layer. If it wouldn't then ... we should change the process
// without resetting the layer. If a change would affect the layer, then ... look at whether it's more
// efficient to hold the process change until after the layer [closes] or put the change in and
// reset. We need to be smart." The process files whose change alters how a layer's jobs or its
// merge are judged; a pin diff touching none of them moves into the layer in place by itself.
export const JUDGING = /^(tool\/lib\/(gate|gateclass|checks|record|merge|layerflow|layerbase)\.mjs|shims\/.+)$/;
export const PIN_CHOICES = ['apply', 'hold', 'reset'];
// The judging files the pin diff old..new changes, read in the product's process clone (.process);
// null when the diff cannot be read (fail-closed: judged as touching them).
export function judgingChange(root, from, to) {
  const proc = join(root, '.process');
  if (!existsSync(join(proc, '.git'))) return null;
  for (const c of [from, to]) if (git(['cat-file', '-e', `${c}^{commit}`], { cwd: proc, allowFail: true }).code !== 0) git(['fetch', '-q', 'origin', c], { cwd: proc, allowFail: true });
  const d = git(['diff', '--no-renames', '--name-only', from, to], { cwd: proc, allowFail: true });
  if (d.code !== 0) return null;
  return d.stdout.split('\n').filter((f) => f && JUDGING.test(f));
}
// The pin commit on the layer: the tranche's .process gitlink, and each workflow file the tranche
// differs in (the pin's shims), on the layer tip; one commit, not a merge (gateclass pinLike).
function pinCommit(root, cfg, n, tip, ttip, pin, w) {
  git(['worktree', 'add', '-q', '--detach', w, tip], { cwd: root });
  git(['update-index', '--cacheinfo', `160000,${pin},.process`], { cwd: w });
  const wf = git(['diff', '--no-renames', '--name-only', tip, ttip, '--', '.github/workflows/'], { cwd: root }).split('\n').filter((f) => f && dirname(f) === '.github/workflows');
  for (const f of wf) {
    if (exists(root, ttip, f)) { git(['checkout', '-q', ttip, '--', f], { cwd: w }); git(['add', '--', f], { cwd: w }); } else git(['rm', '-q', '--', f], { cwd: w });
  }
  git(['commit', '-q', '-m', `process: pin ${short(pin)} into ${layerBranch(n)} in place (PD-23)`], { cwd: w });
  return git(['rev-parse', 'HEAD'], { cwd: w });
}
// p3 layer pin <n> [--layers apply|hold|reset] [--no-wait]: the tranche's pin into open layer n.
// A pin diff that changes no judging file moves in place (apply): one pin-only pull request the
// merge tool lands on a green gate; lands made are not re-gated, open job PRs are not reset, nothing
// is held. One that does is printed, and waits for the coordinator's choice: apply (in place), hold
// (the layer keeps its pin until it merges; the tranche's wins at the merge), or reset (layer sync).
export async function layerPin(root, n, { choice, io = {}, log = console.log, wait = true, by = 'pin' } = {}) {
  n = layerNum(n);
  if (choice !== undefined && !PIN_CHOICES.includes(choice)) fail(`--layers ${PIN_CHOICES.join('|')}, not ${JSON.stringify(choice)}`);
  const cfg = loadConfig(root);
  needLayerMode(cfg, 'layer pin');
  const slug = io.slug || repoSlug(root);
  const x = { findPR, createPR, checkRun, getPR, openPRs, merge: (s, k, sha, title) => mergeVia(s, k, sha, title), ...io };
  fetchLayer(root, cfg, n);
  const rows = flowRows(root, cfg.state_branch, n);
  if (!rows.open) fail(`layer ${n} was not opened by ${P3} layer open ${n}`);
  if (rows.merged) fail(`layer ${n} already merged into ${cfg.tranche}`);
  const b0 = layerBranch(n);
  const tr = `refs/remotes/origin/${cfg.tranche}`;
  const [tip, ttip] = [rev(root, layerRef(n)), rev(root, tr)];
  const [from, to] = [pinOf(root, tip), pinOf(root, ttip)];
  if (!to) fail(`${cfg.tranche} has no process pin`);
  if (from === to) { log(`${b0}: its pin is ${cfg.tranche}'s ${short(to)}: nothing to move`); return { ok: true, n, action: 'none' }; }
  const touched = from ? (x.judging || judgingChange)(root, from, to) : null;
  const judging = touched === null || touched.length > 0;
  const what = touched === null ? `the pin diff ${short(from || 'none')}..${short(to)} could not be read` : touched.length ? `the pin diff ${short(from)}..${short(to)} changes how its jobs or merge are judged: ${touched.slice(0, 6).join(', ')}${touched.length > 6 ? ` and ${touched.length - 6} more` : ''}` : `the pin diff ${short(from)}..${short(to)} changes nothing that judges its jobs or merge`;
  const act = choice || (judging ? null : 'apply');
  if (!act) {
    log(`${b0}: ${what}. The coordinator chooses: ${P3} layer pin ${n} --layers apply (in place: lands kept, job PRs not reset), --layers hold (the layer keeps ${short(from || 'its pin')} until it merges; ${cfg.tranche}'s pin wins at the merge), or --layers reset (layer sync ${n})`);
    return { ok: false, n, action: 'choose', touched, from, to };
  }
  log(`${b0}: ${what}; ${act}${choice ? ' (the coordinator\'s choice)' : ''}`);
  const record = (extra) => writeRows(root, cfg.state_branch, `layer ${n}: pin ${act}`, [[flowFile(n, 'pin', `${short(to)}-${act}`), { row: 'pin', layer: n, action: act, pin_before: from, pin_after: to, touched, at: now(), by, ...extra }]]);
  if (act === 'hold') { record({}); log(`${b0} keeps its pin ${short(from)} until it merges (PD-23); ${cfg.tranche}'s ${short(to)} wins at the merge`); return { ok: true, n, action: 'hold' }; }
  if (act === 'reset') { const r = await layerSync(root, n, { io, log, wait, by }); record({ pr: r.pr?.number ?? null }); return { ...r, n, action: 'reset' }; }
  // apply: an open pull request for this pin is taken up; else a new branch.
  const into = x.openPRs(slug, b0);
  if (into === null) fail(`GitHub unreadable: the open pull requests into ${b0} are not known; nothing was opened`);
  const stem = `layer-pin/${n}-${short(to)}`;
  let pr = into.find((p) => String(p.head?.ref || '').startsWith(stem)) || null;
  let head = pr?.head?.sha || null;
  if (!pr) {
    let branch = stem;
    for (let k = 2; git(['ls-remote', '--heads', 'origin', `refs/heads/${branch}`], { cwd: root, allowFail: true }).stdout.trim(); k++) branch = `${stem}-${k}`;
    head = withTemp('p3-layer-', (tmp) => {
      const w = join(tmp, 'w');
      try {
        const h = pinCommit(root, cfg, n, tip, ttip, to, w);
        const p = git(['push', '-q', 'origin', `${h}:refs/heads/${branch}`], { cwd: w, allowFail: true });
        if (p.code !== 0) fail(`the push of ${branch} failed (${p.stderr.trim()}); nothing was opened`);
        return h;
      } finally { git(['worktree', 'remove', '--force', w], { cwd: root, allowFail: true }); }
    }, { root });
    const body = [`layer pin ${n}: ${cfg.tranche}'s process pin ${short(to)} into ${b0} in place (PD-23), one commit on ${short(tip)}: the pin and the workflow files it carries, nothing else.`, '', `Process pin: ${short(from || 'none')} -> ${short(to)}. ${what}.`, 'Lands already made are not re-gated; open job pull requests are not reset.', '', `The merge tool lands it on a green gate (${P3} layer pin ${n} --layers apply again, if this run stopped).`].join('\n');
    pr = x.createPR(slug, { head: branch, base: b0, title: `layer pin ${n}: process ${short(to)}`, body, draft: false });
    log(`layer pin ${n}: PR ${pr.number} from ${branch} into ${b0}`);
  } else log(`layer pin ${n}: PR ${pr.number} from ${pr.head.ref} is open already`);
  if (!wait) { log(`the gate decides; run ${P3} layer pin ${n} --layers apply again to land it`); return { ok: true, n, action: 'apply', landed: false, pr }; }
  const g = await waitGate(x, slug, pr.number, head);
  if (g?.status !== 'completed' || g.conclusion !== 'success') fail(`the gate on pin PR ${pr.number} ${short(head)} is ${g ? `${g.status} ${g.conclusion || ''}`.trim() : 'not run'}; layer pin lands on a green gate`);
  const r = await x.merge(slug, pr.number, head, `Merge layer pin PR ${pr.number}`);
  if (!r?.merged && !r?.sha) fail(`GitHub did not merge pull request ${pr.number}: ${JSON.stringify(r).slice(0, 200)}`);
  fetchBranch(root, b0);
  record({ pr: pr.number, head, merge: r.sha || null });
  log(`layer pin ${n}: ${short(to)} landed into ${b0} in place${r.sha ? ` at ${short(r.sha)}` : ''}`);
  return { ok: true, n, action: 'apply', landed: true, pr };
}
// p3 layer pin --open [--layers apply|hold|reset]: each open layer, the pin-move session's step after
// its merge. Outside the layer flow, or with no layer open, nothing.
export async function layerPinOpen(root, { choice, io = {}, log = console.log, wait = true, by = 'pin' } = {}) {
  const cfg = loadConfig(root);
  if (!layerMode(cfg)) { log('not the layer flow: no layer to move'); return { ok: true, layers: [] }; }
  fetchBranch(root, cfg.tranche, { allowFail: true });
  fetchState(root, cfg.state_branch, { fresh: true });
  const open = openLayers(root, cfg, (p) => readState(root, cfg.state_branch, p));
  if (!open.length) { log('no layer is open: nothing to move'); return { ok: true, layers: [] }; }
  const out = [];
  for (const n of open) out.push(await layerPin(root, n, { choice, io, log, wait, by }));
  return { ok: out.every((r) => r.ok), layers: out };
}

// ---- layer merge ----------------------------------------------------------------------------

export async function layerMerge(root, n, { io = {}, log = console.log, wait = true, by = 'bob', deferDone } = {}) {
  n = layerNum(n);
  const cfg = loadConfig(root);
  needLayerMode(cfg, 'layer merge');
  const slug = io.slug || repoSlug(root);
  fetchLayer(root, cfg, n);
  const L = readLayer(root, cfg, n, { io, slug });
  if (!L.rows.open) fail(`layer ${n} was not opened by ${P3} layer open ${n}`);
  if (L.rows.merged) fail(`layer ${n} already merged (${short(L.rows.merged.commit)})`);
  const not = L.states.filter((s) => !DONE.includes(s.state));
  if (not.length) fail(`layer ${n} cannot merge: ${not.map((s) => `${s.id} is ${s.state} (${s.why})`).join('; ')}`);
  // An open completion item whose module has not joined holds the merge as an unfinished module
  // does (PD-14; cold review of C35): else it would drift to a later round.
  if (L.joinable?.length) fail(`layer ${n} cannot merge: ${L.joinable.map((x) => `${x.id} has open completion item(s) ${x.items.join(', ')} ${x.more ? 'not yet joined into the layer' : 'and has not joined'}: ${x.cmd}`).join('; ')}`);
  if (L.holding.length) fail(`layer ${n} cannot merge: PR(s) ${L.holding.map((p) => p.number).join(', ')} still open into ${layerBranch(n)}`);
  // Finished work, deferred only on a process finding, is not dropped silently (coordinator, 6 Nov).
  const done = L.states.filter((s) => s.done_work);
  if (deferDone === true || (deferDone !== undefined && !String(deferDone).trim())) fail('--defer-done needs why: the reason the finished work waits for a later layer');
  if (done.length && deferDone === undefined) fail(`layer ${n} cannot merge: ${done.map((s) => `${s.id} (PR ${s.done_work})`).join(', ')} ${done.length > 1 ? 'are' : 'is'} deferred with work done (suite green, BLOCKED only on a process finding): restart ${done.length > 1 ? 'them' : 'it'} to publish (${P3} layer status ${n} lists the lines), or merge with --defer-done "<why>"`);
  if (done.length) log(`deferring work done, by --defer-done: ${done.map((s) => s.id).join(', ')}: ${String(deferDone).trim()}`);
  const x = { findPR, createPR, checkRun, getPR, merge: (s, k, sha, title) => mergeVia(s, k, sha, title), ...io };
  const b = layerBranch(n);
  carriedSync(root, cfg, n, L, log);
  tickLanded(root, cfg, n, L, log);
  const head = rev(root, L.ref);
  // The layer's checks (INT-4; Bob, 5 Nov): what layer close runs, less the module suites (no test
  // run at close): each entry's checks, the generated rows built, and every committed generated
  // path regenerated, a finding when one differs. Red: nothing opened, nothing merged.
  const { layerChecks } = await import('./layer.mjs');
  const mods = L.states.map((s) => ({ id: s.id, blocked: s.state === 'deferred' ? s.why : null }));
  const lc = layerChecks(root, cfg, head, mods, { timeout: (cfg.suite_timeout_minutes || 20) * MINUTE, log, ...(x.exec ? { exec: x.exec } : {}) });
  // A committed generated file stale on the layer refuses the merge, named with its regenerate (the
  // coordinator, 6 Nov: the last gate before the tranche; order.mjs drifted this way).
  const staleAt = new Set((lc.stale || []).map((x) => x.file));
  const all = [...lc.findings, ...(lc.stale || []).map((x) => ({ check: 'generated', file: x.file, message: `${x.file} is stale on ${b} ${short(head)}: run ${x.regenerate} and commit it (a plain pull request into ${b}), then ${P3} layer merge ${n} again` })), ...lc.changed.filter((f) => !staleAt.has(f) && ![...staleAt].some((x) => underPath(x, f))).map((f) => ({ check: 'generated', file: f, message: `${f} differs when regenerated on ${b} ${short(head)}` }))];
  // SLB-7 (Bob): at close only the layer's own checks hold it. A generated row's verify failure
  // blocks only when its paths, or a module it names, are the closing layer's; any other is
  // printed for the module it names, for BOB's found mark there, and the merge goes on.
  const judged = all.map((f) => ({ f, ...verifyOwner(f, { mods: L.mods, entries: [...L.entries.values()].filter(Boolean), ids: [...ledgerIds(root, L.ref)] }) }));
  for (const j of judged.filter((x) => !x.blocks)) log(`not this layer's: ${j.f.file}: ${j.f.message}; record it as a found mark${j.names.length ? ` on ${j.names.join(', ')}` : ''}: ${P3} found ${j.names[0] || '<module>'} "<the finding>" --from "layer ${n} merge"`);
  const red = judged.filter((x) => x.blocks).map((x) => x.f);
  if (red.length) {
    for (const f of red) log(`${f.check}: ${f.file}: ${f.message}`);
    fail(`layer ${n} cannot merge: the layer checks found ${red.length} finding(s) on ${b} ${short(head)}; no module suite ran`);
  }
  log(`layer ${n}: the layer checks passed on ${short(head)} (no module suite runs at the merge)`);
  let pr = x.findPR(slug, b);
  if (pr && pr.base?.ref !== cfg.tranche) fail(`the open pull request from ${b} (#${pr.number}) is into ${pr.base?.ref}, not ${cfg.tranche}`);
  if (!pr) pr = x.createPR(slug, { head: b, base: cfg.tranche, title: `layer ${n}`, body: layerBody(n, L), draft: false });
  log(`layer ${n}: PR ${pr.number} ${b} into ${cfg.tranche}`);
  // No suite runs at the close (Bob, 5 Nov); the required gate check is the layer trigger, which
  // reads each module's evidence and runs nothing.
  const g = wait ? await waitGate(x, slug, pr.number, head) : x.checkRun(slug, head, 'gate');
  if (g?.status !== 'completed' || g.conclusion !== 'success') fail(`the gate on ${b} ${short(head)} is ${g ? `${g.status} ${g.conclusion || ''}`.trim() : 'not run'}; the layer merges on a green layer gate`);
  const r = await x.merge(slug, pr.number, head, `Merge layer ${n} into ${cfg.tranche}`);
  if (!r?.merged && !r?.sha) fail(`GitHub did not merge pull request ${pr.number}: ${JSON.stringify(r).slice(0, 200)}`);
  const at = now();
  const deferred = Object.fromEntries(L.states.filter((s) => s.state === 'deferred' || s.marks.length).map((s) => [s.id, s.state === 'deferred' ? { reason: s.why, marks: s.marks } : s.marks]));
  const merged = { row: 'merged', layer: n, pr: pr.number, head, commit: r.sha || null, tranche: cfg.tranche, at, by, ...(done.length ? { deferred_done: { modules: done.map((s) => s.id), why: String(deferDone).trim() } } : {}), opened: L.rows.open.at, hours: Math.round(((Date.parse(at) - Date.parse(L.rows.open.at)) / 3600000) * 100) / 100 };
  // The close row status reads (layers/closed.jsonl), so the next layer opens: no layer checks ran.
  const closed = { row: 'closed', layer: n, tranche: cfg.tranche, commit: r.sha || head, at, deferred, suites: [], generated_changed: [], by: 'layer merge', strategy: 'layer' };
  writeState(root, cfg.state_branch, `layer ${n} merged into ${cfg.tranche}`, (w) => {
    addFiles(w, [[flowFile(n, 'merged'), merged]]);
    const p = join(w, CLOSED_FILE);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, (existsSync(p) ? readFileSyncSafe(p) : '') + JSON.stringify(closed) + '\n');
    return {};
  });
  const mName = layerName(L.layers?.find((q) => q.n === n), n, cfg.tranche);
  log(`${mName} merged into ${cfg.tranche}${r.sha ? ` at ${short(r.sha)}` : ''}, ${merged.hours} h after it opened; the next layer opens from the new tranche: ${roundOf(L.layers?.find((q) => q.n === n)) > 1 || n >= (L.layers?.filter((q) => !q.round && !q.completion).at(-1)?.n ?? Infinity) ? `\`${P3} round next --apply\` (the round's next layer, with its job starts, or its walk)` : `${P3} layer open ${n + 1}`}`);
  // The round's last layer closes the round: the merge starts the round-close run itself (Bob,
  // 7 Nov: required, tool-started); any other layer's merge runs no walk (Bob, 4 Nov). Its outcome
  // never undoes the merge, which is recorded.
  // deploy.mjs is imported here, not at the top: it reaches back into this module through status.mjs.
  const round = deploys(cfg) ? (io.roundClose || (await import('./deploy.mjs')).roundCloseRun)(root, { log, io: io.round || {}, by: `layer merge ${n}` }) : null;
  return { ok: true, merged, closed, round };
}
// A module's entry (and requirements) carried from the tranche (job start, R4) is added on both
// sides after the layer was cut: OPEN on the tranche, the job's state on the layer, an add/add
// conflict GitHub cannot merge (cold review of PR 190). When merging the tranche into the layer
// conflicts only there, the tool merges it into the layer, taking the layer's version of each, and
// pushes that merge; any other conflict refuses with the files named. A clean merge writes nothing.
// A completion layer's merge ticks each open item whose module landed on it (C33): one commit on
// layer/<n>, `[ ]` to `[x]` and nothing else, which the layer PR carries into the tranche and the
// layer gate checks (tickCheck). Items of modules that did not land, and deferred ones, stay as they are.
export function tickLanded(root, cfg, n, L, log = console.log) {
  if (!L.completion) return null;
  const file = L.completion.file;
  // Ticked only for a module complete on the layer (its last publish landed, nothing outstanding);
  // a module deferred after a land keeps its item open (cold review of C33).
  const landed = new Set(L.states.filter((x) => x.state === 'complete' && L.rows.lands.some((l) => l.module === x.id)).map((x) => x.id));
  const head = rev(root, L.ref);
  // The tranche's file and the layer's must agree but for ticks, else the layer PR would conflict
  // on the file (BOB ticks a whole-product item on the tranche): layer sync brings it in first.
  const tt = git(['show', `refs/remotes/origin/${cfg.tranche}:${file}`], { cwd: root, allowFail: true }).stdout || '';
  const lt = git(['show', `${head}:${file}`], { cwd: root, allowFail: true }).stdout || '';
  if (!onlyTicks(tt, lt)) fail(`${file} changed on ${cfg.tranche} since ${layerBranch(n)} was cut: run ${P3} layer sync ${n} first (it takes ${cfg.tranche}'s ${file}), then layer merge ${n}; nothing was opened`);
  const c = completionItems(root, { ...cfg, completion_file: file }, head);
  if (!c || c.missing) return null;
  const mine = new Set(layerItems(L.completion, L.rows.joins, L.rows.items).map((x) => x.id));
  const due = openItems(c).filter((x) => mine.has(x.id) && landed.has(x.target));
  if (!due.length) { log(`layer ${n}: no completion item to tick (none of their modules landed)`); return null; }
  // Read whole (git() trims its output): the tick changes no byte but the boxes.
  const lines = git(['show', `${head}:${file}`], { cwd: root, allowFail: true }).stdout.split('\n');
  for (const x of due) lines[x.line - 1] = lines[x.line - 1].replace('[ ]', '[x]');
  return withTemp('p3-layer-', (tmp) => {
    const w = join(tmp, 'w');
    git(['worktree', 'add', '-q', '--detach', w, head], { cwd: root });
    try {
      writeFileSync(join(w, file), lines.join('\n'));
      git(['add', '--', file], { cwd: w });
      git(['commit', '-q', '-m', `Tick completion items of layer ${n}: ${due.map((x) => x.id).join(', ')}`], { cwd: w });
      const sha = git(['rev-parse', 'HEAD'], { cwd: w });
      const p = git(['push', '-q', 'origin', `${sha}:refs/heads/${layerBranch(n)}`], { cwd: w, allowFail: true });
      if (p.code !== 0) fail(`the push of ${layerBranch(n)} with the completion items ticked failed (${p.stderr.trim()}); nothing was opened; run layer merge ${n} again`);
      fetchBranch(root, layerBranch(n));
      log(`${file}: ticked ${due.map((x) => `${x.id} (${x.target})`).join(', ')} on ${layerBranch(n)} at ${short(sha)}`);
      return { sha, ids: due.map((x) => x.id) };
    } finally { git(['worktree', 'remove', '--force', w], { cwd: root, allowFail: true }); }
  }, { root });
}
export function carriedSync(root, cfg, n, L, log = console.log) {
  const tr = `refs/remotes/origin/${cfg.tranche}`;
  const head = rev(root, L.ref);
  if (isAnc(root, tr, head)) return null;
  return withTemp('p3-layer-', (tmp) => {
    const w = join(tmp, 'w');
    git(['worktree', 'add', '-q', '--detach', w, head], { cwd: root });
    try {
      const m = git(['merge', '-q', '--no-ff', '--no-commit', tr], { cwd: w, allowFail: true });
      const conflicted = git(['diff', '--name-only', '--diff-filter=U'], { cwd: w }).split('\n').filter(Boolean);
      if (m.code === 0 || !conflicted.length) return null;
      const mb = git(['merge-base', head, tr], { deepen: true, cwd: root });
      const own = new Set(L.mods.flatMap((id) => [entryFile(id), ...(L.entries.get(id)?.requirements ? [L.entries.get(id).requirements] : [])]));
      // PD-23: a layer whose pin moved in place, or was held, merges with the tranche's pin and shims.
      const pinSide = conflicted.filter((f) => syncSide(f) === 'theirs' && f !== cfg.completion_file);
      const bad = conflicted.filter((f) => !pinSide.includes(f) && (!own.has(f) || exists(root, mb, f)));
      if (bad.length) {
        git(['merge', '--abort'], { cwd: w, allowFail: true });
        fail(`layer ${n} cannot merge: ${layerBranch(n)} and ${cfg.tranche} conflict in ${bad.join(', ')}; only a module's entry or requirements carried from ${cfg.tranche} is resolved by the tool; nothing was opened`);
      }
      const kept = conflicted.filter((f) => !pinSide.includes(f));
      if (kept.length) { git(['checkout', '-q', '--ours', '--', ...kept], { cwd: w }); git(['add', '--', ...kept], { cwd: w }); }
      for (const f of pinSide) {
        if (f === '.process') { const pin = pinOf(root, tr); if (pin) git(['update-index', '--cacheinfo', `160000,${pin},.process`], { cwd: w }); else git(['rm', '-q', '--cached', '--', '.process'], { cwd: w }); continue; }
        if (exists(root, tr, f)) { git(['checkout', '-q', '--theirs', '--', f], { cwd: w }); git(['add', '--', f], { cwd: w }); } else git(['rm', '-q', '--', f], { cwd: w });
      }
      git(['commit', '-q', '--no-edit', '-m', `Merge ${cfg.tranche} into ${layerBranch(n)}: ${[kept.length ? `the layer's ${kept.join(', ')} kept (carried from ${cfg.tranche})` : '', pinSide.length ? `${cfg.tranche}'s ${pinSide.join(', ')} taken (PD-23: the tranche's pin wins)` : ''].filter(Boolean).join('; ')}`], { cwd: w });
      const sha = git(['rev-parse', 'HEAD'], { cwd: w });
      const p = git(['push', '-q', 'origin', `${sha}:refs/heads/${layerBranch(n)}`], { cwd: w, allowFail: true });
      if (p.code !== 0) fail(`the push of ${layerBranch(n)} with ${cfg.tranche} merged in failed (${p.stderr.trim()}); nothing was opened; run layer merge ${n} again`);
      fetchBranch(root, layerBranch(n));
      log(`${layerBranch(n)}: ${cfg.tranche} merged in at ${short(sha)}${kept.length ? `, the layer's version kept of ${kept.join(', ')} (added on both after the layer was cut)` : ''}${pinSide.length ? `, ${cfg.tranche}'s ${pinSide.join(', ')} taken (the tranche's pin wins, PD-23)` : ''}`);
      return sha;
    } finally {
      git(['worktree', 'remove', '--force', w], { cwd: root, allowFail: true });
    }
  }, { root });
}
const readFileSyncSafe = (p) => { try { return readFileSync(p, 'utf8'); } catch { return ''; } };
// Whether a layer-check finding is the closing layer's: every finding is, except a generated
// row's verify failure whose paths no layer module owns and whose message names no layer module.
// names: the other modules its message names (whole ids).
export function verifyOwner(f, { mods, entries, ids }) {
  const named = (id) => new RegExp(`(^|[^\\w-])${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\w-]|$)`).test(String(f.message || ''));
  const names = ids.filter((id) => !mods.includes(id) && named(id)).sort();
  if (f.check !== 'generated' || !/ failed \(exit [^)]*\) after (regenerating|building)/.test(String(f.message || ''))) return { blocks: true, names };
  const owned = entries.filter((e) => mods.includes(e.id)).some((e) => ownPaths(e).some((p) => underPath(f.file, p)));
  return { blocks: owned || mods.some(named), names };
}
async function waitGate(x, slug, prn, head) {
  if (x.waitForGate) return x.waitForGate(slug, head, { pr: () => x.getPR(slug, prn) });
  const { waitForGate } = await import('./merge.mjs');
  return waitForGate(slug, head, { pr: () => x.getPR(slug, prn) });
}
const layerBody = (n, L) => [`Layer ${n} of the shared layer branch: every module complete or deferred, no reschedule outstanding.`, '', ...L.states.map((s) => `- ${s.id}: ${s.state} (${s.why})`), '', 'No suite runs here (Bob, 5 Nov): each module passed its own gate on its publish against its providers\' current versions; the layer gate checks that evidence.'].join('\n');

// The judge of a land (a "Merge layer PR <n>" commit) into `branch`: { pr, id, head, parent } when it is
// GitHub's merge of a job PR whose newest gate run on its head is a verified green run of its whole
// suite (a hidden PR from its land row under layerflow/<key>/ and the run's artifact, C13), else { why }.
// layerCover reads it for a layer's lands; gate.mjs jobMerge for the direct flow's lands on the
// tranche (PD-25), with base-red not green there (the tranche into main tolerates none).
export function landJudge(root, cfg, { branch, ids, key, slug, io, green = ['pass', 'base-red'] }) {
  const parents = (c) => git(['rev-list', '--parents', '-n', '1', c], { cwd: root }).split(' ').slice(1);
  const landOf = new Map(); // commit -> { pr, id, head } | { why }
  // Green as the land reads it (gate.mjs: a suite that passed, or failed only on base-red tests): the copy's
  // PR 715 landed on a base-red run its layer gate then refused (the coordinator, 7 Nov). A base-red
  // test is still owed: no suite runs at the layer close, and the tranche's PR into main runs its
  // suite with base-red off (gate.mjs), so it is collected there.
  const GREEN = green;
  const whole = (r, id) => r?.ok && r.trigger === 'code' && GREEN.includes(r.suite) && Array.isArray(r.scope) && r.scope.includes(id) && !(Array.isArray(r.requirements_only) && r.requirements_only.some((x) => x?.module === id));
  let stateRows = null;
  const hidden = (c, k, p, why) => {
    const no = (w) => { const v = { why: w }; landOf.set(c, v); return v; };
      // The state branch as fetched, or as the checkout already holds it (CI's checkout has the whole
    // history and no credentials to fetch again: cold review of C13).
    if (stateRows === null) {
      try { fetchState(root, cfg.state_branch); } catch { /* read what the checkout holds */ }
      try { stateRows = git(['rev-parse', '-q', '--verify', `refs/remotes/origin/${cfg.state_branch}`], { cwd: root, allowFail: true }).code === 0 ? flowRows(root, cfg.state_branch, key) : false; } catch { stateRows = false; }
    }
    // The land row for this very merge: its PR, the merge, and both its parents (the layer before, the head).
    const land = stateRows ? stateRows.lands.find((l) => l.pr === k && l.merge === c && l.head === p[1] && l.before === p[0] && l.at) : null;
    if (!land || !ids.has(land.module)) return no(`is PR ${k}'s merge, but GitHub does not serve PR ${k} (${why}) and ${cfg.state_branch} holds no land row for this merge`);
    const id = land.module;
    const art = io.runArtifactRow || runArtifactRow;
    // The run is bound to the module's own job branch by name (job/<id> or job/<id>-<n>), as the process
    // recorded it: the state branch's newest start row of the module at or before the land, else the
    // ledger's on the layer before the land; never the PR's own head (cold review of C13). The ledger
    // alone named job/actions for the copy's PR 715, whose attempt 3 ran on job/actions-2 (7 Nov).
    const st = stateRows.starts.filter((r) => r.module === id && r.branch && String(r.at) <= String(land.at)).at(-1);
    const jb = st?.branch || startBranch(rowsAt(root, p[0], id), id);
    if (!new RegExp(`^job/${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(-\\d+)?$`).test(jb)) return no(`is PR ${k}'s land (from ${cfg.state_branch}), but ${jb} is not ${id}'s job branch`);
    const ctx = { pr: k, baseRef: branch, merged: { branch: jb } };
    // Its newest run on the head by GitHub's own run id (and attempt), never a session-written time.
    const rows = stateRows.gates.filter((g) => g.pr === k && g.module === id && g.sha === p[1] && g.run_id).sort((a, b) => (Number(a.run_id) - Number(b.run_id)) || ((a.run_attempt ?? 1) - (b.run_attempt ?? 1)));
    const last = rows.at(-1);
    if (!last) return no(`is PR ${k}'s land (from ${cfg.state_branch}: GitHub does not serve the PR), but no gate run on ${short(p[1])} is recorded`);
    // A run GitHub serves is verified, its artifact and its record. One GitHub hides with the PR (the
    // suspended account's run, copy PR 696, 7 Nov) stands on the process's own record: the land row
    // for this very merge and its head, and the gate row the land recorded for that run, green on
    // the head's code. Any other read failure is no answer: refused.
    const seen = (io.runState || runState)(slug, last.run_id);
    if (seen === null) return no(`is PR ${k}'s land (from ${cfg.state_branch}: GitHub does not serve the PR), but its gate run ${last.run_id} could not be read`);
    let run_unreadable = null;
    if (seen === 'gone') {
      // A row from before rows said `whole` (the copy's PR 696, run of 6 Nov 19:12) cannot say whether its
      // run was narrowed to a requirements file's tests: taken as written, a gap named and closed to every
      // row written since (LEGACY_GATE_ROWS), which says `whole`.
      const wholeRow = last.whole === true || (last.whole === undefined && String(last.at) < LEGACY_GATE_ROWS);
      if (!(last.ok === true && last.trigger === 'code' && GREEN.includes(last.suite) && wholeRow)) return no(`is PR ${k}'s land (from ${cfg.state_branch}), but its gate run ${last.run_id} on ${short(p[1])}, which GitHub does not serve, is recorded ${last.suite || 'without a suite'}${last.ok ? '' : ', not ok'}${last.trigger === 'code' ? '' : ` (${last.trigger})`}${wholeRow ? '' : ', not its whole suite'}`);
      run_unreadable = `run ${last.run_id}: GitHub does not serve it; the land's gate row, ${last.suite}`;
    } else {
      let row = null;
      try { row = art(slug, last.run_id); } catch { row = null; }
      if (!row || Number(row.run_id) !== Number(last.run_id) || row.sha !== p[1] || !whole(row, id) || !io.verify(slug, row, ctx)) return no(`is PR ${k}'s land (from ${cfg.state_branch}: GitHub does not serve the PR), but its gate run on ${short(p[1])} is not a verified green run of the whole suite`);
    }
    const v = { pr: k, id, head: p[1], parent: p[0], pr_unreadable: why.slice(0, 200), ...(run_unreadable ? { run_unreadable } : {}) };
    landOf.set(c, v);
    return v;
  };
  const judge = (c) => {
    if (landOf.has(c)) return landOf.get(c);
    const no = (why) => { const v = { why }; landOf.set(c, v); return v; };
    const k = Number(git(['log', '-1', '--format=%s', c], { cwd: root }).match(LAND_TITLE)?.[1]);
    if (!k) return no('is not a land of a publish PR');
    const p = parents(c);
    if (p.length !== 2) return no(`names PR ${k} but is not a merge of two parents`);
    // A landed PR GitHub no longer serves (C13, the coordinator, 7 Nov: PR 696, opened by the suspended
    // account, read 404 and failed layer 9's merge gate): its facts from the state branch's land row
    // for this very merge and the gate's own run artifact, recorded pr_unreadable. Any other read
    // failure, or a PR with no land row, fails closed.
    let pr;
    try { pr = io.getPR(slug, k); } catch (e) {
      if (!(e instanceof Fail) || !/HTTP 404|Not Found/i.test(e.message)) throw e;
      return hidden(c, k, p, e.message);
    }
    const id = branchModule(pr?.head?.ref, ids);
    if (!pr?.merged || pr.merge_commit_sha !== c || pr.base?.ref !== branch || !id || pr.head.sha !== p[1]) return no(`is not GitHub's merge of job PR ${k} into ${branch}`);
    const runs = gateRuns(io.comments(slug, k));
    const ctx = { pr: k, baseRef: branch, merged: { branch: pr.head.ref } };
    // The newest run on the head, as jobMerge reads it: green, verified, the module's whole suite
    // (not a run narrowed to the tests that read a requirements file).
    const row = runs.filter((r) => r.sha === p[1]).pop();
    const wholeOf = (r) => whole(r, id);
    // A records-since-green row (the PR edited, the layer tip unchanged) stands on the run it names,
    // as jobMerge follows it (confirming review N3).
    const tested = !row?.ok || !io.verify(slug, row, ctx) ? null
      : row.trigger === 'record-since-green' ? runs.filter((r) => r.sha === row.after).reverse().find((r) => wholeOf(r) && isAnc(root, r.sha, p[1]) && io.verify(slug, r, ctx)) || null
        : wholeOf(row) ? row : null;
    if (!tested) return no(`is PR ${k}'s land, but the newest gate run on its head ${short(p[1])} is ${row ? 'not a verified green run of the whole suite' : 'missing'}`);
    const v = { pr: k, id, head: p[1], parent: p[0] };
    landOf.set(c, v);
    return v;
  };
  return judge;
}

// ---- the gate's layer trigger ---------------------------------------------------------------

// For a pull request from layer/<n> into the tranche: each module whose files it changes is
// covered by its last land on the layer branch, a merge of its job's PR into layer/<n> whose head
// had a verified green gate run of that module's suite, and that head held every interface-changing
// land of each provider it uses in the layer. Anything else is a finding: nothing is re-run.
// Gate rows written before they said `whole` (this change, 7 Nov): taken as written (see layerCover).
export const LEGACY_GATE_ROWS = '2026-11-07T12:00:00Z';
export function layerCover(root, cfg, { head, mb, base, branch, changed: all, entries, slug, io }) {
  const findings = [];
  // A path whose content at the layer tip is the tranche tip's (the PR's base) is no change the layer
  // brings and needs no cover: a pin moved in place (PD-23, C56: .process and the workflow shims), or
  // anything else the layer already shares with the tranche (C61, copy PR 1111).
  const differs = base ? new Set(diffNames(root, base, head)) : null;
  const changed = differs ? all.filter((f) => differs.has(f)) : all;
  const covered = [];
  const inMod = (e, f) => ownPaths(e).some((p) => underPath(f, p));
  // Generated paths are the layer checks' at the merge (regenerated there), not a module's land's.
  const gen = generatedRows(cfg).rows;
  const need = changed.filter((f) => !isRecordOrLane(cfg, f, entries) && !isGenerated(gen, f));
  const chain = git(['rev-list', '--first-parent', head, '--not', mb], { cwd: root }).split('\n').filter(Boolean);
  const parents = (c) => git(['rev-list', '--parents', '-n', '1', c], { cwd: root }).split(' ').slice(1);
  const judge = landJudge(root, cfg, { branch, ids: new Set(entries.map((e) => e.id)), key: Number(String(branch).match(/(\d+)$/)?.[1]), slug, io });
  const byId = new Map(entries.map((e) => [e.id, e]));
  // A layer sync's merge brings the tranche's own changes (tool-made, its tree checked): not a stray.
  const synced = (c) => SYNC_TITLE.test(git(['log', '-1', '--format=%s', c], { cwd: root }));
  // Each changed file is credited per commit (C32, copy layer 11, 8 Nov: op-grades's land changed
  // files its ledger widening (PR 865) gave it, which the ledger at the head credits to
  // op-grades-folds; store-assembly's and instance-setup's lands changed files other modules own at
  // the head): covered when every commit on the chain that changed it is a layer sync or a verified
  // land of a module whose paths held it in the ledger at that land's parent, whoever owns it now.
  const needSet = new Set(need);
  const touched = new Map();
  for (const c of chain) {
    if (synced(c)) continue;
    for (const f of diffNames(root, parents(c)[0], c)) if (needSet.has(f)) touched.set(f, [...(touched.get(f) || []), c]);
  }
  // The landing module's own entry at the land's parent (the layer before it, never the job's head),
  // read once per parent and module.
  const entryAt = new Map();
  const ownedAt = (ref, id, f) => {
    const key = `${ref}:${id}`;
    if (!entryAt.has(key)) {
      const r = git(['show', `${ref}:${entryFile(id)}`], { cwd: root, allowFail: true });
      let e = null;
      try { e = r.code === 0 ? JSON.parse(r.stdout) : null; } catch { e = null; }
      entryAt.set(key, e);
    }
    const e = entryAt.get(key);
    return !!e && inMod(e, f);
  };
  // The first commit that does not cover f, with why, or null.
  const uncovered = (f) => {
    for (const c of touched.get(f) || []) {
      const v = judge(c);
      if (!v.id) return { c, why: v.why };
      if (!ownedAt(v.parent, v.id, f)) return { c, v, why: `is ${v.id}'s land (PR ${v.pr}), whose paths at ${short(v.parent)} did not hold ${f}` };
    }
    return null;
  };
  // Its providers as the modules file names them (notice.mjs usersOf's source), else the entry's own.
  const named = new Map((readModules(root, cfg, head) || []).filter((m) => m?.id).map((m) => [m.id, m.uses || []]));
  const usesOf = (e) => named.get(e.id) || e.uses || [];
  const lands = chain.map((c) => ({ c, v: judge(c) })).filter((x) => x.v.id);
  // Every module of the layer, and any other whose files changed: a user with no file of its own
  // changed still owes a green run against each provider's interface change (cold review 1).
  const n = Number(String(branch).match(/(\d+)$/)?.[1]);
  const inLayer = new Set(layersAt(root, cfg, head).find((L) => L.n === n)?.mods || []);
  for (const e of entries) {
    const fs = need.filter((f) => inMod(e, f));
    // A module with a land on the chain is judged against its providers whatever it owns now: its
    // landed files may have moved to another module since (cold review of C32).
    const landed = lands.some((x) => x.v.id === e.id);
    if (!fs.length && !inLayer.has(e.id) && !landed) continue;
    // A BLOCKED module that changed nothing on the layer is deferred, as layer status counts it,
    // and holds nothing (confirming review N2); one whose code is on the layer is judged as any.
    if (!fs.length && e.status?.state === 'BLOCKED' && !landed) continue;
    const last = lands.find((x) => x.v.id === e.id) || null; // newest first
    // Each of its files covered commit by commit (above); a file no commit covers is named with the
    // commit that does not, and why.
    const bad = fs.map((f) => ({ f, u: uncovered(f) })).filter((x) => x.u);
    if (bad.length) {
      // The words BOB knows (no land of its publish; after its last land), with the commit and why.
      const after = (c) => last && chain.indexOf(c) < chain.indexOf(last.c);
      for (const { f, u } of bad) {
        const which = `${short(u.c)}, which ${u.v ? u.why : `${u.why}: not a layer sync or a verified land`}`;
        findings.push({ check: 'layer', file: f, line: 1, message: !last ? `${e.id} changed with no land of its publish on ${branch}: ${f} by ${which}` : after(u.c) ? `${f} changed on ${branch} after ${e.id}'s last land (PR ${last.v.pr}) by a commit that is not its land: ${which}` : `${f} (${e.id}'s at the head) changed on ${branch} by ${which}` });
      }
      continue;
    }
    // Its files all came by other modules' verified lands (paths moved to it since): those lands
    // carry the provider checks; with no land of its own and no layer place, nothing more is owed.
    if (!last && fs.length && !inLayer.has(e.id)) continue;
    // Each provider in the layer: its interface-changing lands are held by this module's last green head.
    const late = [];
    for (const p of usesOf(e).filter((u) => byId.has(u) && u !== e.id)) {
      for (const pl of lands.filter((x) => x.v.id === p && !(last && isAnc(root, x.c, last.v.head)))) {
        if (interfaceChange(root, cfg, p, pl.v.parent, pl.c).changed) late.push(`${p} (PR ${pl.v.pr}, ${short(pl.c)})`);
      }
    }
    if (late.length) findings.push({ check: 'layer', file: entryFile(e.id), line: 1, message: `${e.id}'s ${last ? `last green run (PR ${last.v.pr}, ${short(last.v.head)})` : 'work (no land on the layer)'} did not hold the interface change of ${late.join(', ')}: it never counts; ${e.id} re-runs and publishes again` });
    else if (last) covered.push({ id: e.id, pr: last.v.pr, merge: last.c, ...(last.v.pr_unreadable ? { pr_unreadable: last.v.pr_unreadable } : {}), ...(last.v.run_unreadable ? { run_unreadable: last.v.run_unreadable } : {}) });
  }
  const own = new Set(entries.flatMap((e) => need.filter((f) => inMod(e, f))));
  // The completion file (C33): changed on the layer only by the tool's tick at a completion layer's
  // merge, each flipping open items of modules with a verified land on this chain; anything else is a finding.
  const cf = cfg.completion_file;
  if (typeof cf === 'string' && needSet.has(cf) && !own.has(cf)) {
    own.add(cf);
    const comp = layersAt(root, cfg, head).find((L) => L.n === n)?.completion;
    const compItems = comp ? (() => { const fr = flowRows(root, cfg.state_branch, n); return new Set(layerItems(comp, fr.joins, fr.items).map((x) => x.id)); })() : null;
    const landedIds = new Set(lands.map((x) => x.v.id));
    for (const c of touched.get(cf) || []) {
      const subj = git(['log', '-1', '--format=%s', c], { cwd: root });
      // Only a completion layer's own tick, numbered as this layer, on its own items (cold review of C33).
      const m = subj.match(TICK_TITLE);
      const t = !m || Number(m[1]) !== n || !compItems ? { why: 'is not the tool\'s tick of this completion layer' } : tickCheck(root, cf, parents(c)[0], c, landedIds, compItems);
      if (t.why) findings.push({ check: 'layer', file: cf, line: 1, message: `${cf} changed on ${branch} by ${short(c)}, which ${t.why}` });
    }
  }
  for (const f of need.filter((x) => !own.has(x))) findings.push({ check: 'layer', file: f, line: 1, message: `${f} is in no module: a plain change goes to ${cfg.tranche} between layers, not onto ${branch}` });
  return { findings, covered };
}

// The gate's minutes as state rows (R9, Bob, 6 Nov: the time budget). The gate's own token can
// only read (shims/process-gate.yml: job gate reads, job post writes only the PR's comment), and
// the owner's limits forbid widening it, so the land, which reads the PR's gate rows and writes
// the state branch, records them: one row per gate run, its whole minutes, its suite minutes
// (this module's suite, or the run's when it ran this module alone; null when none of this
// module's ran), and whether it was a record-only run (trigger record or record-since-green).
// Only a pull request that lands is recorded: a closed or replaced one's gate runs are not.
// Keyed by the run and its attempt (a GitHub re-run keeps the run id), else its head and time,
// so a run is one file however often it is seen.
export const RECORD_ONLY = (r) => r.trigger === 'record' || r.trigger === 'record-since-green';
export function gateRow(n, id, pr, r) {
  const ran = ['pass', 'fail', 'base-red'].includes(r.suite) && !(r.requirements_only || []).some((x) => x?.module === id && !x.files?.length);
  const sec = !ran ? null : Number.isFinite(r.suite_by_module?.[id]) ? r.suite_by_module[id]
    : !r.suite_by_module && Array.isArray(r.scope) && r.scope.length === 1 && r.scope[0] === id && Number.isFinite(r.suite_seconds) ? r.suite_seconds : null;
  return {
    row: 'gate', layer: n, module: id, pr, sha: r.sha, run_id: r.run_id ?? null, run_attempt: r.run_attempt ?? null, at: r.at ?? null, trigger: r.trigger ?? null, suite: r.suite ?? null, ok: r.ok ?? null,
    minutes: Number.isFinite(r.minutes) ? r.minutes : null,
    suite_minutes: sec === null ? null : Math.round((sec / 60) * 100) / 100,
    record_only: RECORD_ONLY(r),
    // The module's whole suite (its scope, not narrowed to the tests that read a requirements file):
    // a land whose PR and run GitHub later hides stands on this row alone (cold review of PR 735's fix).
    whole: Array.isArray(r.scope) && r.scope.includes(id) && !(Array.isArray(r.requirements_only) && r.requirements_only.some((x) => x?.module === id)),
  };
}
const gateKey = (r) => (r.run_id ? `${r.run_id}-${r.run_attempt ?? 1}` : `${short(r.sha)}-${Date.parse(r.at) || 0}`);
export const gateFiles = (n, id, pr, runs) => runs.map((r) => [flowFile(n, 'gate', `${safeName(id)}-${pr}-${gateKey(r)}`), gateRow(n, id, pr, r)]);

// ---- layer report (the trial's measures) ----------------------------------------------------

// How often a reschedule changed its user's result: the user's last finished run (pass or fail)
// before the reschedule against its first finished run after it, on a tip holding the provider's land.
export function resultChanges(reschedules, runs, anc = () => true) {
  const out = { changed: 0, unchanged: 0, unknown: 0, rows: [] };
  for (const r of reschedules) {
    const mine = runs.filter((x) => x.module === r.user && (x.result === 'pass' || x.result === 'fail'));
    const prev = mine.filter((x) => x.ended <= r.at).at(-1);
    const next = mine.find((x) => x.started >= r.at && anc(r.provider_land, x.tested_on));
    const v = !prev || !next ? 'unknown' : prev.result === next.result ? 'unchanged' : 'changed';
    out[v]++;
    out.rows.push({ key: r.key, user: r.user, provider: r.provider, before: prev?.result ?? null, after: next?.result ?? null, verdict: v });
  }
  return out;
}

const TRIGGERS = ['exports', 'provides-text', 'provides-test', 'exports-unread'];
const countTriggers = (lands, k) => Object.fromEntries(TRIGGERS.map((t) => [t, lands.filter((l) => (l.interface?.[k] || (k === 'triggers_old' ? l.interface?.triggers : null) || []).includes(t)).length]));
export function trialMeasures(rows, { anc = () => true } = {}) {
  // The trial counts every reschedule made, a cleared one included (cold review of C11): a false
  // reschedule is what it measures. The cleared are counted apart.
  if (rows.reschedules_all) rows = { ...rows, reschedules: rows.reschedules_all, cleared: (rows.clears || []).length };
  const mods = new Set([...rows.runs.map((r) => r.module), ...rows.lands.map((l) => l.module), ...rows.reschedules.map((r) => r.user)]);
  const per = [...mods].sort().map((id) => {
    const runs = rows.runs.filter((r) => r.module === id);
    return {
      id, runs: runs.length, pass: runs.filter((r) => r.result === 'pass').length, fail: runs.filter((r) => r.result === 'fail').length,
      halted: runs.filter((r) => r.result === 'halted').length, lands: rows.lands.filter((l) => l.module === id).length,
      gate_runs: rows.lands.filter((l) => l.module === id).reduce((s, l) => s + (l.gate_runs || 0), 0),
      reschedules: rows.reschedules.filter((r) => r.user === id).length,
      retests: (rows.retests || []).filter((r) => r.module === id).length,
    };
  });
  const halted = rows.runs.filter((r) => r.result === 'halted');
  const hours = rows.open && rows.merged ? Math.round(((Date.parse(rows.merged.at) - Date.parse(rows.open.at)) / 3600000) * 100) / 100 : null;
  return {
    modules: per.length, hours_open_to_merged: hours ?? 'not merged',
    gate_runs: per.reduce((s, x) => s + x.gate_runs, 0), lands: rows.lands.length,
    interface_changes: rows.lands.filter((l) => l.interface?.changed).length,
    // Bob's "c": reschedules (breaking: a job each) apart from retests owed (additive: the gate alone).
    reschedules: rows.reschedules.filter((r) => r.class !== 'additive').length,
    retests_owed: rows.reschedules.filter((r) => r.class === 'additive').length,
    lands_breaking: rows.lands.filter((l) => l.interface?.class === 'breaking' || (l.interface?.changed && !l.interface?.class)).length,
    lands_additive: rows.lands.filter((l) => l.interface?.class === 'additive').length,
    // R8 (Bob, 6 Nov): the triggers each land fired under the rule before R8 and under R8's, and the
    // reschedules the old rule would have made; the difference is the false re-tests avoided.
    triggers_old_rule: countTriggers(rows.lands, 'triggers_old'), triggers_new_rule: countTriggers(rows.lands, 'triggers'),
    reschedules_old_rule: rows.lands.reduce((t, l) => t + (l.users_rescheduled_old_rule || l.users_rescheduled || []).length, 0),
    // Job sessions the old rule would have started that the new one does not (an additive change's users are retested, not rescheduled).
    reschedules_avoided: rows.lands.reduce((t, l) => {
      const retested = l.interface?.class === 'additive' ? new Set((rows.retests || []).filter((r) => r.cause === l.pr).map((r) => r.module)) : new Set();
      const jobs = (l.users_rescheduled || []).filter((u) => !retested.has(u)).length;
      return t + Math.max(0, (l.users_rescheduled_old_rule || l.users_rescheduled || []).length - jobs);
    }, 0),
    // R10: job starts in the layer, and the early ones (an in-layer provider not yet landed).
    starts: (rows.starts || []).length, early_starts: (rows.starts || []).filter((r) => Array.isArray(r.early) && r.early.length).length, early_unknown: (rows.starts || []).filter((r) => !Array.isArray(r.early)).length,
    // Retests (layer retest): opened, and those landed (no job session; a CI suite run each).
    retests: (rows.retests || []).length, retest_lands: rows.lands.filter((l) => l.retest).length,
    // Which trigger fired, per reschedule (Bob, 5 Nov, as relayed in the coordinator's handoff: "the
    // interface signal is exports + Provides text + tests of Provides requirements"); exports-unread
    // is the tool's own addition.
    reschedule_triggers: Object.fromEntries(['exports', 'provides-text', 'provides-test', 'exports-unread'].map((k) => [k, rows.reschedules.filter((r) => (r.triggers || []).includes(k)).length])),
    reschedule_changed_result: resultChanges(rows.reschedules, rows.runs, anc),
    halted_runs: halted.length, minutes_lost_to_halts: Math.round(halted.reduce((s, r) => s + (r.minutes_lost || 0), 0) * 10) / 10,
    per_module: per,
  };
}

// The time budget (R9, Bob, 6 Nov: "how much time goes to tests versus real work"), per module of
// the layer, from rows since the layer opened:
//   starts               its job's start rows (metrics, on the layer branch);
//   wall_minutes         each start to its complete (by attempt), summed; null when no attempt has
//                        both (open_attempts counts those still without a complete);
//   local_test_minutes   its `p3 test` rows (all of them);
//   publish_minutes      its layer publish runs (job complete: checks and the push; it runs no
//                        suite, the gate does), apart from the tests;
//   gate_minutes         its gate runs' whole minutes (the land's gate rows: landed PRs only),
//                        with suite and record-only minutes apart; a run of unknown length is
//                        counted in gate_unknown_runs, not as 0;
//   work_minutes         wall minus the local tests that ran inside a start-to-complete window
//                        (a test outside every window took no wall time here); null when wall
//                        is null.
// The layer total sums each; test_share is local test over wall, test_per_work local test over
// work, both over the modules whose wall is known (null when none).
const r2 = (x) => Math.round(x * 100) / 100;
export function timeBudget(mods, { attempts = {}, tests = [], runs = [], gates = [], since = null } = {}) {
  const after = (r) => !since || String(r.at ?? r.ended ?? '') >= String(since);
  const sum = (xs) => r2(xs.reduce((t, x) => t + (Number.isFinite(x) ? x : 0), 0));
  const per = [...mods].sort().map((id) => {
    const rows = (attempts[id] || []).filter((r) => r.row === 'attempt' && after(r));
    const starts = rows.filter((r) => r.event === 'start');
    let wall = null;
    let open = 0;
    const windows = [];
    for (const st of starts) {
      const c = rows.find((r) => r.event === 'complete' && (st.attempt === undefined || r.attempt === st.attempt) && String(r.at) >= String(st.at));
      if (!c || !Number.isFinite(Date.parse(c.at)) || !Number.isFinite(Date.parse(st.at))) { open++; continue; }
      windows.push([Date.parse(st.at), Date.parse(c.at)]);
      wall = (wall ?? 0) + (Date.parse(c.at) - Date.parse(st.at)) / 60000;
    }
    const mine = tests.filter((t) => t.module === id && after(t));
    const inside = (t) => { const a = Date.parse(t.started); const b = Date.parse(t.ended ?? t.at); return windows.some(([s, e]) => a >= s && b <= e); };
    const local = sum(mine.map((t) => t.minutes));
    const g = gates.filter((x) => x.module === id);
    return {
      id, starts: starts.length, open_attempts: open, wall_minutes: wall === null ? null : r2(wall),
      test_runs: mine.length, local_test_minutes: local,
      publish_runs: runs.filter((t) => t.module === id && after(t)).length, publish_minutes: sum(runs.filter((t) => t.module === id && after(t)).map((t) => t.minutes)),
      gate_runs: g.length, gate_unknown_runs: g.filter((x) => !Number.isFinite(x.minutes)).length, gate_minutes: sum(g.map((x) => x.minutes)), gate_suite_minutes: sum(g.map((x) => x.suite_minutes)), gate_record_only_minutes: sum(g.filter((x) => x.record_only).map((x) => x.minutes)),
      work_minutes: wall === null ? null : r2(wall - sum(mine.filter(inside).map((t) => t.minutes))),
      tests_in_wall_minutes: sum(mine.filter(inside).map((t) => t.minutes)),
    };
  });
  const known = per.filter((x) => x.wall_minutes !== null);
  const wall = sum(known.map((x) => x.wall_minutes));
  const localKnown = sum(known.map((x) => x.tests_in_wall_minutes));
  const work = sum(known.map((x) => x.work_minutes));
  const total = {
    starts: per.reduce((t, x) => t + x.starts, 0), wall_minutes: known.length ? wall : null, wall_unknown_modules: per.length - known.length,
    local_test_minutes: sum(per.map((x) => x.local_test_minutes)), publish_minutes: sum(per.map((x) => x.publish_minutes)), gate_minutes: sum(per.map((x) => x.gate_minutes)), gate_unknown_runs: per.reduce((t, x) => t + x.gate_unknown_runs, 0),
    gate_suite_minutes: sum(per.map((x) => x.gate_suite_minutes)), gate_record_only_minutes: sum(per.map((x) => x.gate_record_only_minutes)),
    work_minutes: known.length ? work : null,
    test_share: known.length && wall > 0 ? r2(localKnown / wall) : null,
    test_per_work: known.length && work > 0 ? r2(localKnown / work) : null,
  };
  return { per_module: per, total };
}
export const budgetLine = (b) => `time budget: ${b.total.starts} start(s); wall ${b.total.wall_minutes ?? 'unknown'} min${b.total.wall_unknown_modules ? ` (${b.total.wall_unknown_modules} module(s) unknown)` : ''}; local tests ${b.total.local_test_minutes} min; publish runs ${b.total.publish_minutes} min; gate ${b.total.gate_minutes} min on landed PRs (suites ${b.total.gate_suite_minutes}, record-only ${b.total.gate_record_only_minutes}${b.total.gate_unknown_runs ? `, ${b.total.gate_unknown_runs} run(s) of unknown length` : ''}); work ${b.total.work_minutes ?? 'unknown'} min; tests ${b.total.test_share === null ? 'unknown' : `${Math.round(b.total.test_share * 100)}%`} of wall, ${b.total.test_per_work ?? 'unknown'} per minute of work`;

export function layerReport(root, n, { log = console.log, toolFrom = null, toolTo = 'HEAD', toolRoot = null } = {}) {
  n = layerNum(n);
  const cfg = loadConfig(root);
  fetchState(root, cfg.state_branch, { fresh: true });
  fetchBranch(root, layerBranch(n), { allowFail: true });
  const rows = flowRows(root, cfg.state_branch, n);
  const m = trialMeasures(rows, { anc: (a, b) => isAnc(root, a, b) });
  // The time budget: the layer's modules (its map, and every module its rows name), their start
  // and complete rows as the layer branch holds them.
  const lref = layerRef(n);
  const at = layersAt(root, cfg, git(['rev-parse', '--verify', '-q', lref], { cwd: root, allowFail: true }).code === 0 ? lref : null).find((l) => l.n === n);
  const mapped = at?.mods || [];
  // The round it ran in (BD-R1): a round layer's own, else 1; the map layer a round layer passed over.
  m.round = roundOf(at);
  if (at?.round) m.of = at.round.of;
  const mods = new Set([...mapped, ...rows.runs.map((r) => r.module), ...rows.lands.map((l) => l.module), ...rows.tests.map((t) => t.module), ...rows.gates.map((g) => g.module)]);
  const attempts = Object.fromEntries([...mods].map((id) => [id, rowsAt(root, lref, id)]));
  m.time_budget = timeBudget(mods, { attempts, tests: rows.tests, runs: rows.runs, gates: rows.gates, since: rows.open?.at ?? null });
  if (toolFrom) {
    const st = git(['diff', '--shortstat', toolFrom, toolTo, '--', 'tool/'], { cwd: toolRoot || root, allowFail: true }).stdout.trim();
    const ins = Number(st.match(/(\d+) insertion/)?.[1] || 0);
    const del = Number(st.match(/(\d+) deletion/)?.[1] || 0);
    m.tool_lines = { from: toolFrom, to: toolTo, added: ins, removed: del };
  }
  const c = m.reschedule_changed_result;
  log(`${layerName(at, n)}${at?.round ? '' : `, round ${m.round}`}: ${m.modules} module(s); open to merged ${m.hours_open_to_merged}${typeof m.hours_open_to_merged === 'number' ? ' h' : ''}; ${m.gate_runs} gate run(s) over ${m.lands} land(s); ${m.reschedules} reschedule(s) from ${m.interface_changes} interface change(s); a reschedule changed its user's result ${c.changed} time(s) (unchanged ${c.unchanged}, unknown ${c.unknown}); ${m.lands_breaking} breaking and ${m.lands_additive} additive land(s); ${m.reschedules_old_rule} reschedule(s) under the old trigger rule, ${m.reschedules_avoided} avoided; ${m.retests_owed} retest(s) owed by additive changes, ${m.retests} retest(s), ${m.retest_lands} landed; ${m.starts} job start(s), ${m.early_starts} early; ${m.halted_runs} run(s) halted, ${m.minutes_lost_to_halts} min lost${m.tool_lines ? `; tool lines +${m.tool_lines.added} -${m.tool_lines.removed}` : ''}`);
  log(budgetLine(m.time_budget));
  let notices = [];
  try { notices = noticeRecords(root, cfg.state_branch); } catch { notices = []; }
  m.next_layer_early = earlyRework(rows, notices);
  if (m.next_layer_early.early) log(`early starts into layer ${n}: ${m.next_layer_early.early}; rework ${m.next_layer_early.rework} (${m.next_layer_early.rate}%): ${m.next_layer_early.each.map((x) => `${x.module} ${x.rework || 'none'}`).join(', ')}`);
  log('the baseline: the same layer\'s history under the serial train (the merge rows on the state branch)');
  log(JSON.stringify(m, null, 2));
  return { ok: true, measures: m };
}
