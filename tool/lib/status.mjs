// status (REC-3, minimal for Phase 1): every ledger entry with its state as the tranche and
// its job branch hold it, its pull request and gate, and the role's reading set with sizes.
import { prFiles, takeInLine, toTakeIn } from './carry.mjs';
import { aheadBy, checkRun, compare, openPRs } from './github.mjs';
import { LEDGER_DIR, readEntry, readLedgerTexts } from './ledger.mjs';
import { P3, readingSet } from './job.mjs';
import { readAddress } from './roles.mjs';
import { REFRESH_AT, metricsFile, refusalCounts, rowsAt, rowsHere } from './metrics.mjs';
import { noticeLine, notices } from './notice.mjs';
import { fetchState, handoffFile, jsonl, readState, toRoute, undelivered } from './state.mjs';
import { openLine, openState } from './tranche.mjs';
import { deployOwed } from './deploy.mjs';
import { completionItems, openItems } from './completion.mjs';
import { openAsks } from './lane.mjs';
import { UNMET, depth, exists, fail, fileBytes, git, loadConfig, overCap, repoSlug } from './util.mjs';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// A pull request quiet this long is idle: the sweep's "silent for two hours" (Foundations).
export const IDLE_HOURS = 2;
// A WORKING job whose branch tip is older than this is stalled (the sweep wakes BOB for it).
export const SILENT_HOURS = 2;

// status --role bob --sessions <file>: BOB's own list_sessions result, saved as JSON. Measured 3-4
// Nov: a stopped job was flagged only after two hours with nothing pushed. A job's session is
// matched by its title (\`job <id>\`, or \`job <id> (restart)\`) or by a field naming its branch;
// the latest one counts. Archived: gone. Idle, with no push for targets.replace_minutes: idle.
// No match: the two-hour rule stands. The shape is read loosely: a list, or one under sessions or data.
export function readSessions(file) {
  let j;
  try { j = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { fail(`--sessions ${file}: not a readable JSON file (${e.message}); save your list_sessions result there`); }
  const list = Array.isArray(j) ? j : Array.isArray(j?.sessions) ? j.sessions : Array.isArray(j?.data) ? j.data : null;
  if (!list) fail(`--sessions ${file}: no list of sessions in it (a JSON list, or one under "sessions" or "data")`);
  return list.filter((x) => x && typeof x === 'object');
}
const sessionId = (x) => x.id || x.session_id || x.uuid || '?';
const sessionTime = (x) => Math.max(...['updated_at', 'created_at', 'last_activity_at'].map((k) => Date.parse(x[k] || '')).filter(Number.isFinite), 0);
const names = (x, branch, depth = 0) => (typeof x === 'string' ? x === branch || x === `refs/heads/${branch}`
  : x && typeof x === 'object' && depth < 4 && Object.values(x).some((v) => names(v, branch, depth + 1)));
export function jobSession(sessions, id) {
  const title = new RegExp(`^job ${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( \\(restart\\))?$`);
  const mine = sessions.filter((x) => title.test(String(x.title || '').trim()) || names(x, `job/${id}`));
  return mine.sort((a, b) => sessionTime(b) - sessionTime(a))[0] || null;
}
const lower = (v) => String(v || '').toLowerCase();
export const isArchived = (x) => x.archived === true || !!x.archived_at || ['archived'].includes(lower(x.status)) || lower(x.lifecycle) === 'archived' || lower(x.state) === 'archived';
export const isIdle = (x) => ['idle', 'completed', 'failed', 'stopped'].includes(lower(x.status)) || ['completed', 'failed', 'review_ready'].includes(lower(x.status_bucket));

export function status(root, { role, module, context, live, sessions: sessionsFile, offline = false, log = console.log, io: given } = {}) {
  const io = { openPRs, checkRun, compare, prFiles, ...given };
  const cfg = loadConfig(root);
  if (sessionsFile === true) fail('--sessions <file>: your list_sessions result, saved as JSON');
  const listed = sessionsFile === undefined ? null : readSessions(sessionsFile);
  const replaceMs = Number(cfg.targets?.replace_minutes ?? 30) * 6e4;
  const tranche = `origin/${cfg.tranche}`;
  const halt = role === 'bob' && (cfg.plan === 'pause' || cfg.plan === 'stop');
  if (halt) log(`plan ${cfg.plan}: take no new step`);
  if (live !== undefined && !(Number.isInteger(Number(live)) && Number(live) >= 0 && live !== true)) fail(`--live <n>, the live sessions list_sessions shows, not ${JSON.stringify(live)}`);
  const haveRef = () => git(['rev-parse', '--verify', '-q', tranche], { cwd: root, allowFail: true }).code === 0;
  let prs = null;
  let slug = null;
  if (!offline) {
    try { slug = repoSlug(root); prs = io.openPRs(slug, cfg.tranche); } catch { prs = null; }
    // The tranche and the branches job/<id> of the ledger's entries that are not COMPLETE, or
    // that have an open pull request (a reopen) or an unanswered notice: no other job/* ref is fetched (110 s measured
    // 3 Nov in a fresh depth-1 clone, carrying refs such as job/T11/agent-worker of no entry).
    // One ls-remote, then one fetch of only the refs that moved, --depth 1 in a shallow clone:
    // there a branch fetched in full pulls its whole history (90 s measured 3 Nov), and a --depth
    // fetch never finds "nothing to do" by itself (11 to 37 s for an up-to-date tranche, against 3 to 5).
    const known = haveRef() ? readLedgerTexts(root, tranche) : readLedgerTexts(root);
    const heads = new Set((prs || []).map((p) => p.head?.ref));
    // And, for BOB, job/<id> of each user module with an unanswered provider notice: a COMPLETE
    // user whose auto-reopened start was pushed before its pull request opened names the notice
    // on that branch only (the state branch is fetched here once; bobStatus reuses the fetch).
    const noticed = new Set();
    if (role === 'bob') { try { if (fetchState(root, cfg.state_branch)) for (const n of notices(root, cfg.state_branch)) for (const u of n.open) noticed.add(u); } catch { /* bobStatus reports it */ } }
    const wanted = new Set([`refs/heads/${cfg.tranche}`, ...Object.values(known).flatMap((t) => { try { const e = JSON.parse(t); return e.id && (e.status?.state !== 'COMPLETE' || heads.has(`job/${e.id}`) || noticed.has(e.id)) ? [`refs/heads/job/${e.id}`] : []; } catch { return []; } })]);
    const ls = git(['ls-remote', '--heads', 'origin'], { cwd: root, allowFail: true });
    const local = new Map(git(['for-each-ref', '--format=%(objectname) %(refname)', 'refs/remotes/origin/'], { cwd: root }).split('\n').filter(Boolean).map((l) => l.split(' ').reverse()));
    const moved = (ls.code === 0 ? ls.stdout.split('\n') : []).map((l) => l.trim().split('\t')).filter(([sha, r]) => r && wanted.has(r)
      && local.get(`refs/remotes/origin/${r.slice(11)}`) !== sha);
    if (moved.length) git(['fetch', '-q', ...depth(root), 'origin', ...moved.map(([, r]) => `+${r}:refs/remotes/origin/${r.slice(11)}`)], { cwd: root, allowFail: true });
  }
  const haveTranche = haveRef();
  const onTranche = haveTranche ? readLedgerTexts(root, tranche) : readLedgerTexts(root);
  const rows = [];
  for (const [file, text] of Object.entries(onTranche)) {
    let e;
    try { e = JSON.parse(text); } catch { rows.push({ id: file, state: 'UNREADABLE' }); continue; }
    const branch = `origin/job/${e.id}`;
    const row = { id: e.id, tranche: e.status?.state, req: e.requirements };
    // BLOCKED with a recorded reason, on the tranche or its branch: the layer can close past it.
    if (e.status?.state === 'BLOCKED' && e.status.reason) row.blocked = e.status.reason;
    if (git(['rev-parse', '--verify', '-q', branch], { cwd: root, allowFail: true }).code === 0) {
      const t = git(['show', `${branch}:${LEDGER_DIR}/${e.id}.json`], { cwd: root, allowFail: true });
      let s = {};
      try { s = t.code === 0 ? JSON.parse(t.stdout).status || {} : {}; } catch { s = {}; }
      row.branch = (s.state || 'no entry on its branch') + (s.reason ? ` (${s.reason})` : '');
      const ahead = haveTranche ? aheadBy(root, { slug, base: cfg.tranche, head: `job/${e.id}`, local: [tranche, branch], read: io.compare }) : null;
      row.ahead = ahead;
      // ENF-6, JOB-9: a WORKING job with nothing pushed beyond its start commit.
      if (s.state === 'WORKING' && ahead !== null && ahead <= 1) row.flag = 'WORKING, nothing pushed';
      if (s.state === 'BLOCKED') row.flag = 'BLOCKED';
      if (s.state) row.blocked = s.state === 'BLOCKED' && s.reason ? s.reason : undefined;
    }
    const pr = prs?.find((p) => p.head?.ref === `job/${e.id}`);
    if (pr) {
      row.pr = `#${pr.number}${pr.draft ? ' draft' : ' ready'}`;
      row.updated = pr.updated_at || null;
      row.ready = !pr.draft;
      const run = io.checkRun(slug, pr.head.sha, 'gate');
      row.gate = run ? (run.conclusion || run.status) : 'none';
    } else if (prs === null) {
      if (row.branch) row.pr = 'unknown (GitHub not read)';
      else if (e.status?.state === 'COMPLETE') row.pr = 'merged';
    } else if (row.ahead === 1 && row.branch?.startsWith('WORKING')) {
      row.flag = 'an unfinished start (pushed, no pull request): run job start again and it resumes';
    } else if (row.ahead > 0 && !row.blocked) {
      // Commits on the branch the tranche lacks, and no open PR: an attempt closed unmerged.
      row.flag = 'commits on its branch and no open PR; a closed attempt is restarted by a Phase 2 command';
    } else if (e.status?.state === 'COMPLETE') row.pr = 'merged';
    // With BOB's list_sessions (--sessions): a WORKING job with its draft open whose session is
    // archived, or idle with no push for targets.replace_minutes. BOB restarts its session.
    const restart = `BOB's act: ${P3} job start ${e.id} --restart "<why>"`;
    const tipAge = () => Date.now() - (Number(git(['log', '-1', '--format=%ct', branch], { cwd: root, allowFail: true }).stdout.trim()) * 1000 || Date.now());
    const js = listed && row.branch?.startsWith('WORKING') && !row.ready && row.pr?.startsWith('#') && (!row.flag || row.flag === 'WORKING, nothing pushed') ? jobSession(listed, e.id) : null;
    if (js && isArchived(js)) row.flag = `job session gone (${sessionId(js)} archived); ${restart}`;
    else if (js && isIdle(js) && tipAge() > replaceMs) row.flag = `job idle ${Math.round(replaceMs / 6e4)}m (${sessionId(js)} ${lower(js.status || js.status_bucket)}, no push for ${Math.round(tipAge() / 6e4)}m); ${restart}`;
    // A WORKING job that pushed and then stopped (interrupted, or stopped by refusals): its pull
    // request not ready and its branch tip older than SILENT_HOURS. BOB restarts its session.
    // The fallback when BOB's sessions are not given, or none matches the job.
    if (!row.flag && !row.ready && row.ahead > 1 && row.branch?.startsWith('WORKING')) {
      const age = Date.now() - (Number(git(['log', '-1', '--format=%ct', branch], { cwd: root, allowFail: true }).stdout.trim()) * 1000 || Date.now());
      if (age > SILENT_HOURS * 36e5) row.flag = `WORKING, no push for ${Math.round(age / 36e5 * 10) / 10}h; BOB's act: ${P3} job start ${e.id} --restart "<why>"`;
    }
    // A deferred module's pull request, GitHub unread: unknown, so the layer is held.
    if (prs === null && row.blocked && !row.pr) row.pr = 'unknown (GitHub not read)';
    rows.push(row);
  }
  log(`ledger on ${haveTranche ? tranche : 'the working tree'}: ${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}${prs === null ? (offline ? '; offline, pull requests not read' : '; GitHub unreadable') : ''}`);
  for (const r of role === 'bob' ? [] : rows) {
    log(`- ${r.id}: ${r.tranche ?? r.state}${r.branch ? `; on its branch ${r.branch}, ${r.ahead} commit(s) ahead` : ''}${r.pr ? `; PR ${r.pr}` : ''}${r.gate ? `; gate ${r.gate}` : ''}${r.flag ? `; FLAG ${r.flag}` : ''}`);
  }
  let addr = {};
  try { addr = readAddress(root, { fetch: !offline }); } catch { addr = {}; }
  log(`addresses: ROOT ${addr.root ? `${addr.root.session} (${addr.root.at})` : 'none'}; BOB ${addr.bob ? `${addr.bob.session} (${addr.bob.at})` : 'none'}`);
  // Refusals per session, from the tranche's rows and this checkout's (a row BOB recorded but has
  // not merged yet counts at once); the same row in both counts once (each carries its own id).
  const seen = new Set();
  const metricRows = [...(haveTranche ? rowsAt(root, tranche) : []), ...rowsHere(root)].filter((r) => {
    const k = JSON.stringify(r);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const sessions = refusalCounts(metricRows);
  if (sessions.length) {
    log(`refusals by session (REFRESH at ${REFRESH_AT}; auto mode asks a person at 20):`);
    for (const s of sessions) log(`- ${s.session}: ${s.refusals}${s.refresh ? '; REFRESH: start a fresh session to replace it' : ''}`);
  }
  if (role === 'job' && module) {
    const set = readingSet(root, readEntry(root, module));
    log(`reading set for job ${module}: ${set.bytes} bytes`);
    for (const f of set.files) log(`  ${f.bytes}\t${f.file}`);
  }
  if (role === 'bob') {
    const out = { sessions, ...bobStatus(root, cfg, { rows, prs, offline, context, log, slug, tranche: haveTranche ? tranche : 'HEAD', files: io.prFiles }), tranche: haveTranche ? tranche : 'HEAD' };
    const ref = haveTranche ? tranche : null;
    const closed = closedRows(root, cfg, { slug: offline ? null : slug, read: io.compare });
    out.layer = layerState(root, cfg, rows, ref, { closed });
    // No job work until the tranche open's grants check has passed (Build Plan Phase 3).
    out.open = openState(root, cfg);
    if (out.open.state !== 'open') log(openLine(out.open));
    out.notices = owedNotices(root, cfg, rows, log);
    // After a layer close, the deploy and walk (deploy dev), until a deploy row for that layer exists.
    out.deploy = cfg.deploy && !halt ? deployOwed(root, cfg, closed, { slug: offline ? null : slug, read: io.compare }) : null;
    if (out.deploy !== null) log(`deploy and walk: ${P3} deploy dev (layer ${out.deploy} closed, not yet deployed)`);
    out.next = halt || out.open.state !== 'open' ? [] : nextWork(root, cfg, rows, ref, { live: live === undefined ? undefined : Number(live), log, state: out.layer, notices: out.notices });
    return out;
  }
  return { rows, sessions, prs };
}

// status --role bob: one screen. Open, idle, owed and blocked jobs with each pull request's last
// activity; merged as a count; other open pull requests into the tranche; undelivered messages;
// REFRESH from refusals and from context use; BOB's reading set with sizes.
export function bobStatus(root, cfg, { rows, prs, offline, context, log, slug = null, tranche = `origin/${cfg.tranche}`, files: prList }) {
  const sb = cfg.state_branch;
  const L = [];
  const age = (t) => (t ? `${Math.round((Date.now() - Date.parse(t)) / 36e5 * 10) / 10}h ago` : 'unknown');
  const idle = (r) => r.flag?.startsWith('WORKING') || (r.updated && Date.now() - Date.parse(r.updated) > IDLE_HOURS * 36e5);
  const groups = { blocked: [], owed: [], idle: [], open: [] };
  let merged = 0;
  for (const r of rows) {
    const line = `${r.id}: ${r.branch || r.tranche || r.state}${r.pr ? `; PR ${r.pr}, last activity ${age(r.updated)}` : ''}${r.gate ? `; gate ${r.gate}` : ''}${r.flag ? `; ${r.flag}` : ''}`;
    if (r.tranche === 'BLOCKED' || r.flag === 'BLOCKED') groups.blocked.push(line);
    else if (r.ready && r.gate === 'success') groups.owed.push(`${line}; merge owed`);
    else if (r.flag && !r.flag.startsWith('WORKING')) groups.owed.push(line);
    else if (r.pr === 'merged') merged++;
    else if (idle(r)) groups.idle.push(line);
    else if (r.pr || r.branch) groups.open.push(line);
    else merged += r.tranche === 'COMPLETE' ? 1 : 0;
  }
  for (const [k, v] of Object.entries(groups)) if (v.length) L.push(`${k}:`, ...v.map((x) => `- ${x}`));
  L.push(`merged: ${merged}`);
  const jobs = new Set(rows.map((r) => `job/${r.id}`));
  // Tranche carry (SHM-4): an open pull request no ledger entry owns stays under "to take in"
  // until a job takes it in or it is closed; one already taken in is listed as other.
  const carry = prs ? toTakeIn(root, { slug, ref: tranche, prs, files: prList }) : [];
  if (carry.length) L.push('to take in:', ...carry.map((t) => `- ${takeInLine(t, P3)}, last activity ${age(t.updated)}`));
  const listed = new Set(carry.map((t) => t.number));
  const other = (prs || []).filter((p) => !jobs.has(p.head?.ref) && !listed.has(p.number));
  if (other.length) L.push('other pull requests:', ...other.map((p) => `- #${p.number} ${p.head?.ref}${p.draft ? ' draft' : ''}, last activity ${age(p.updated_at)}`));
  let haveState = false;
  if (!offline) { try { haveState = fetchState(root, sb); } catch (e) { L.push(`${sb}: ${e.message}`); } }
  else haveState = git(['rev-parse', '--verify', '-q', `refs/remotes/origin/${sb}`], { cwd: root, allowFail: true }).code === 0;
  const owedMsgs = haveState ? undelivered(root, sb) : [];
  if (owedMsgs.length) L.push('undelivered messages:', ...owedMsgs.map((m) => `- ${m.from}-${m.n} to ${m.to}: ${m.outcome || 'not recorded delivered'}`));
  const reports = haveState ? toRoute(root, sb) : [];
  if (reports.length) L.push('reports to route (until a later message from bob names its id):', ...reports.map((m) => `- ${m.from}-${m.n}: ${m.text.slice(0, 100)}`));
  const pct = context === undefined ? null : Number(String(context).replace(/%$/, ''));
  if (pct !== null && !Number.isFinite(pct)) fail(`--context takes the percent of the window used, a number, not ${JSON.stringify(context)}`);
  if (pct !== null) L.push(`context ${pct}% of the window${pct >= cfg.refresh_context ? `: REFRESH (threshold ${cfg.refresh_context}%)` : ` (REFRESH at ${cfg.refresh_context}%)`}`);
  const files = cfg.reading_bob.map((f) => ({ f, b: fileBytes(join(root, f)) }));
  const h = haveState ? readState(root, sb, handoffFile('bob')) : null;
  if (h !== null) files.push({ f: `${sb}:${handoffFile('bob')}`, b: Buffer.byteLength(h) });
  // Lane questions BOB passed and has not recorded a decision for (SES-14).
  const asked = haveState && Array.isArray(cfg.lanes) ? openAsks(root, cfg) : [];
  if (asked.length) L.push('open lane questions (record each decision with lane ask ... --record):', ...asked.map((a) => `- ${a.lane}: "${a.question.slice(0, 100)}", asked ${age(a.at)}`));
  L.push(`reading set for bob: ${files.reduce((s, x) => s + x.b, 0)} bytes; ${files.map((x) => `${x.f} ${x.b}`).join(', ')}`);
  for (const l of L) log(l);
  return { rows, undelivered: owedMsgs };
}

// A layer closed by `layer close` (INT-4): one row per close in layers/closed.jsonl on the state
// branch, BOB the one writer. A row counts for this tranche only: its tranche name, and its commit
// not yet on main (a row from a tranche already merged into main is stale). On main is GitHub's
// compare when online (a shallow clone's history, and a stale origin/main, cannot say; review of
// PR 48), else the local ancestry.
export const CLOSED_FILE = 'layers/closed.jsonl';
// Whether a commit is on main: GitHub's compare when online, else the local ancestry.
export function onMainOf(root, { slug = null, read = compare } = {}) {
  return (sha) => {
    const c = slug ? read(slug, 'main', sha) : null;
    if (Number.isInteger(c?.ahead_by)) return c.ahead_by === 0;
    return git(['merge-base', '--is-ancestor', sha, 'refs/remotes/origin/main'], { cwd: root, allowFail: true }).code === 0;
  };
}
export function closedRows(root, cfg, { slug = null, read = compare } = {}) {
  const onMain = onMainOf(root, { slug, read });
  return (readState(root, cfg.state_branch, CLOSED_FILE) || '').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } })
    .filter((r) => r.row === 'closed' && r.tranche === cfg.tranche && Number.isInteger(r.layer) && !onMain(String(r.commit)));
}

const MARK = UNMET;

// The layers (Build Plan, Phase 3, INT-4): the layer map (layers_file), a table row whose first
// cell is a number is a layer, its last cell its modules. A layer is closed when recorded closed,
// or when none of its modules has unmet marks or an open job. The open layer is the lowest not
// closed. It is ready to close when no module of it has an open job and each has its job merged
// in this tranche (its entry COMPLETE, no open pull request, no flag) or no unmet marks, or is
// BLOCKED with a recorded reason and its pull request closed (deferred: a BLOCKED module with no
// reason holds the layer); the marks left then are deferred, never listed again as its next work.
// owed: the deferred modules whose pull request is still open, BOB's to close unmerged before the
// close (pending, when nothing else holds the layer). Null without a layer map.
export function layerState(root, cfg, rows, ref, { closed = closedRows(root, cfg) } = {}) {
  const dir = cfg.requirements_dir.replace(/\/$/, '');
  const read = (f) => (ref ? (exists(root, ref, f) ? git(['show', `${ref}:${f}`], { cwd: root }) : null) : existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8') : null);
  const map = read(cfg.layers_file);
  if (map === null) return null;
  const marks = (f) => [...(read(f) || '').matchAll(MARK)].map((m) => m[1]);
  const recorded = new Set(closed.map((r) => r.layer));
  const layers = map.split('\n').map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
    .filter((c) => c.length > 1 && /^\d+$/.test(c[0]))
    .map((c) => ({ n: Number(c[0]), mods: c.at(-1).replace(/[`*]/g, '').split(',').map((m) => m.trim()).filter(Boolean).map((id) => {
      const file = `${dir}/${id}.md`;
      const row = rows.find((r) => r.id === id || r.req === file);
      const open = !!row && (row.tranche !== 'COMPLETE' || !!row.pr?.startsWith('#'));
      const merged = !!row && row.tranche === 'COMPLETE' && !open && !row.flag;
      const pr = row?.pr?.match(/^#(\d+)/)?.[1] ?? null;
      return { id, file, open, merged, blocked: row?.blocked || null, pr: pr && Number(pr), marks: marks(file), row };
    }) }))
    .sort((a, b) => a.n - b.n);
  for (const L of layers) L.closed = recorded.has(L.n) || L.mods.every((m) => !m.open && !m.marks.length);
  const cur = layers.find((L) => !L.closed) || null;
  // A deferred module's pull request unread (offline) holds the layer as an open one does.
  const ok = (m) => (m.blocked ? !m.pr && !m.row.pr?.startsWith('unknown') : !m.open && (m.merged || !m.marks.length));
  const owed = (cur?.mods || []).filter((m) => m.blocked && m.pr);
  const ready = !!cur && cur.mods.every(ok);
  const pending = !!cur && !!owed.length && cur.mods.every((m) => ok(m) || owed.includes(m));
  const deferred = layers.filter((L) => recorded.has(L.n)).flatMap((L) => L.mods.filter((m) => m.marks.length).map((m) => ({ layer: L.n, id: m.id, count: m.marks.length })));
  return { layers, cur, ready, pending, owed, deferred };
}

// Provider notices (the provider-change route): per user module, each notice it has not answered,
// as the state branch holds them (bobStatus fetched it). Listed until the user has an open job
// whose START names the notice (its start row, on its job branch); answered when that job merges.
export function owedNotices(root, cfg, rows, log = console.log) {
  let all = [];
  try { all = notices(root, cfg.state_branch); } catch { all = []; }
  const unrecorded = {};
  const named = (u) => {
    // The job branch decides, while its attempt is open: not COMPLETE on the tranche, an open pull
    // request, or commits the tranche lacks. A merged attempt's start row names a notice only when
    // its answer was not written (the merge stands if that write fails): the notice is still owed,
    // and merge <n> run again records it (confirming review of PR 54).
    const row = rows.find((x) => x.id === u);
    if (!row?.branch) return [];
    const t = git(['show', `origin/job/${u}:${metricsFile(u)}`], { cwd: root, allowFail: true });
    const keys = t.code === 0 ? jsonl(t.stdout).filter((x) => x.event === 'start').pop()?.notices || [] : [];
    const open = row.tranche !== 'COMPLETE' || !!row.pr?.startsWith('#') || row.ahead > 0;
    if (!open) { unrecorded[u] = keys; return []; }
    return keys;
  };
  const owed = {};
  for (const n of all) for (const u of n.open) if (!named(u).includes(n.key)) (owed[u] ||= []).push(n);
  const users = Object.keys(owed).sort();
  if (users.length) log('provider notices (the user module\'s next job answers each):');
  for (const u of users) for (const n of owed[u]) log(`- ${u}: ${noticeLine(n)}${unrecorded[u]?.includes(n.key) ? `; its merged job named it, answer not recorded: run merge <that job's PR> again` : ''}`);
  return owed;
}

// Next work (Build Plan, Phase 2): the modules of the open layer whose requirement file has unmet
// marks and that have no open job, fewest unmet first; none once the layer is ready to close (BOB's
// act is then `layer close <n>`). The deferred marks of closed layers are listed, not as work.
// Without a layer map, every requirement file with unmet marks. With live (the live sessions BOB
// counts), at most live_cap less them are listed; the list returned is all of them.
export function nextWork(root, cfg, rows, ref, { live, log = console.log, state, notices: owed = {} } = {}) {
  const open = rows.filter((r) => r.tranche !== 'COMPLETE');
  const dir = cfg.requirements_dir.replace(/\/$/, '');
  const taken = new Set(open.flatMap((r) => [r.req, `${dir}/${r.id}.md`]));
  const read = (f) => (ref ? (exists(root, ref, f) ? git(['show', `${ref}:${f}`], { cwd: root }) : null) : existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8') : null);
  const ls = state === undefined ? layerState(root, cfg, rows, ref) : state;
  let files;
  let layer = null;
  if (ls) {
    layer = ls.cur?.n ?? null;
    files = ls.ready || ls.pending ? [] : (ls.cur?.mods || []).map((m) => m.file);
    if (ls.deferred.length) {
      log('deferred at layer close (not work):');
      for (const d of ls.deferred) log(`- ${d.id} (layer ${d.layer}): ${d.count}`);
    }
    if (ls.ready) log(`layer ${layer} ready to close: ${P3} layer close ${layer}`);
    if (ls.pending) {
      log(`layer ${layer} ready to close once BOB closes these unmerged (never deleting the branch):`);
      for (const m of ls.owed) log(`- close PR #${m.pr} unmerged: ${m.blocked}`);
      log(`then: ${P3} layer close ${layer}`);
    }
  } else if (ref) {
    const r = git(['ls-tree', '--name-only', `${ref}:${dir}`], { cwd: root, allowFail: true });
    files = (r.code === 0 ? r.stdout.split('\n') : []).filter((x) => x.endsWith('.md') && x !== 'README.md').map((n) => `${dir}/${n}`);
  } else files = (existsSync(join(root, dir)) ? readdirSync(join(root, dir)) : []).filter((x) => x.endsWith('.md') && x !== 'README.md').map((n) => `${dir}/${n}`);
  // Read whole (git show without allowFail drops the last newline): the cap counts every byte.
  const whole = (f) => (ref ? (exists(root, ref, f) ? git(['show', `${ref}:${f}`], { cwd: root, allowFail: true }).stdout : null) : read(f));
  // A user module with an unanswered provider notice is next work, whatever its layer or marks.
  const byFile = new Map(Object.entries(owed).map(([u, ns]) => [rows.find((r) => r.id === u)?.req || `${dir}/${u}.md`, ns]));
  const all = [...new Set([...files, ...byFile.keys()])].filter((f) => !taken.has(f)).map((file) => {
    const text = whole(file);
    return { file, count: ((text || '').match(MARK) || []).length, over: overCap(cfg, file, text), ...(byFile.has(file) ? { notices: byFile.get(file).map((n) => n.key) } : {}) };
  }).filter((x) => x.count || x.notices);
  all.sort((a, b) => a.count - b.count || a.file.localeCompare(b.file));
  // Over the cap: BOB's act is the split or consolidation, listed apart, never as startable work.
  const big = all.filter((x) => x.over);
  for (const x of big) log(x.over);
  const list = all.filter((x) => !x.over);
  if (list.length) {
    const n = live === undefined ? list.length : Math.max(0, cfg.live_cap - live);
    const shown = list.slice(0, n);
    log(`next work${layer === null ? '' : `, layer ${layer}`} (${open.length} jobs open; BOB chooses from these, unmet requirements each): ${live === undefined ? `all ${list.length} listed; pass --live <the live sessions list_sessions shows> to list at most live_cap (${cfg.live_cap}) less them` : `${shown.length} listed (live ${live} of ${cfg.live_cap}), ${list.length - shown.length} wait`}`);
    for (const x of shown) log(`- ${x.file}: ${x.count}${x.notices ? `; provider notice ${x.notices.join(', ')}` : ''}`);
  }
  // The completion round (PLN-4): once every layer is closed, the completion file's open items.
  const round = ls && !ls.cur ? completionWork(root, cfg, rows, ref, log) : [];
  // The returned list holds all three: a split owed is still work for BOB (sweep counts it).
  return [...list, ...big, ...round];
}

// The completion file's open items, not deferred: a module item through job start as usual (its
// requirement lines written first), unless its job is open; a whole-product item is BOB's act.
export function completionWork(root, cfg, rows, ref, log = console.log) {
  const c = completionItems(root, cfg, ref);
  if (!c) return [];
  if (c.missing) { log(`completion round: ${c.file} is not on ${ref || 'the working tree'}`); return [{ file: c.file, missing: true }]; }
  const open = openItems(c);
  if (!open.length) { log(`completion round: every item of ${c.file} done or deferred; the tranche can close: ${P3} tranche close`); return []; }
  const job = (id) => rows.find((r) => r.id === id && (r.tranche !== 'COMPLETE' || r.pr?.startsWith('#')));
  log(`next work, the completion round (${c.file}, ${open.length} open; done: tick its line; deferred: "deferred: <reason>" on its line):`);
  for (const x of open) log(x.malformed ? `- ${c.file}:${x.line}: not an item line (\`- [ ] <id> · <module or whole product> · <what>\`); fix it: ${x.what.slice(0, 100)}` : `- ${x.id} · ${x.target}: ${x.whole ? "BOB's act" : job(x.target) ? 'its job is open' : `${P3} job start ${x.target}`}${x.what ? ` · ${x.what.slice(0, 100)}` : ''}`);
  return open.map((x) => ({ file: c.file, item: x.id, target: x.target }));
}
