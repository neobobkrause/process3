// status (REC-3, minimal for Phase 1): every ledger entry with its state as the tranche and
// its job branch hold it, its pull request and gate, and the role's reading set with sizes.
import { checkRun, openPRs } from './github.mjs';
import { LEDGER_DIR, readEntry, readLedgerTexts } from './ledger.mjs';
import { readingSet } from './job.mjs';
import { readAddress } from './roles.mjs';
import { REFRESH_AT, refusalCounts, rowsAt, rowsHere } from './metrics.mjs';
import { fetchState, handoffFile, readState, undelivered } from './state.mjs';
import { fail, fileBytes, git, loadConfig, repoSlug } from './util.mjs';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// A pull request quiet this long is idle: the sweep's "silent for two hours" (Foundations).
export const IDLE_HOURS = 2;

export function status(root, { role, module, context, offline = false, log = console.log, io = { openPRs, checkRun } } = {}) {
  const cfg = loadConfig(root);
  const tranche = `origin/${cfg.tranche}`;
  if (!offline) git(['fetch', '-q', 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/origin/${cfg.tranche}`, '+refs/heads/job/*:refs/remotes/origin/job/*'], { cwd: root, allowFail: true });
  const haveTranche = git(['rev-parse', '--verify', '-q', tranche], { cwd: root, allowFail: true }).code === 0;
  const onTranche = haveTranche ? readLedgerTexts(root, tranche) : readLedgerTexts(root);
  let prs = null;
  let slug = null;
  if (!offline) { try { slug = repoSlug(root); prs = io.openPRs(slug, cfg.tranche); } catch { prs = null; } }
  const rows = [];
  for (const [file, text] of Object.entries(onTranche)) {
    let e;
    try { e = JSON.parse(text); } catch { rows.push({ id: file, state: 'UNREADABLE' }); continue; }
    const branch = `origin/job/${e.id}`;
    const row = { id: e.id, tranche: e.status?.state, req: e.requirements };
    if (git(['rev-parse', '--verify', '-q', branch], { cwd: root, allowFail: true }).code === 0) {
      const t = git(['show', `${branch}:${LEDGER_DIR}/${e.id}.json`], { cwd: root, allowFail: true });
      let s = {};
      try { s = t.code === 0 ? JSON.parse(t.stdout).status || {} : {}; } catch { s = {}; }
      row.branch = (s.state || 'no entry on its branch') + (s.reason ? ` (${s.reason})` : '');
      const ahead = haveTranche ? Number(git(['rev-list', '--count', `${tranche}..${branch}`], { cwd: root })) : null;
      row.ahead = ahead;
      // ENF-6, JOB-9: a WORKING job with nothing pushed beyond its start commit.
      if (s.state === 'WORKING' && ahead !== null && ahead <= 1) row.flag = 'WORKING, nothing pushed';
      if (s.state === 'BLOCKED') row.flag = 'BLOCKED';
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
    } else if (row.ahead > 0) {
      // Commits on the branch the tranche lacks, and no open PR: an attempt closed unmerged.
      row.flag = 'commits on its branch and no open PR; a closed attempt is restarted by a Phase 2 command';
    } else if (e.status?.state === 'COMPLETE') row.pr = 'merged';
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
    const out = { sessions, ...bobStatus(root, cfg, { rows, prs, offline, context, log }), tranche: haveTranche ? tranche : 'HEAD' };
    out.next = nextWork(root, cfg, rows, haveTranche ? tranche : null, log);
    return out;
  }
  return { rows, sessions };
}

// status --role bob: one screen. Open, idle, owed and blocked jobs with each pull request's last
// activity; merged as a count; other open pull requests into the tranche; undelivered messages;
// REFRESH from refusals and from context use; BOB's reading set with sizes.
export function bobStatus(root, cfg, { rows, prs, offline, context, log }) {
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
  const other = (prs || []).filter((p) => !jobs.has(p.head?.ref));
  if (other.length) L.push('other pull requests:', ...other.map((p) => `- #${p.number} ${p.head?.ref}${p.draft ? ' draft' : ''}, last activity ${age(p.updated_at)}`));
  let haveState = false;
  if (!offline) { try { haveState = fetchState(root, sb); } catch (e) { L.push(`${sb}: ${e.message}`); } }
  else haveState = git(['rev-parse', '--verify', '-q', `refs/remotes/origin/${sb}`], { cwd: root, allowFail: true }).code === 0;
  const owedMsgs = haveState ? undelivered(root, sb) : [];
  if (owedMsgs.length) L.push('undelivered messages:', ...owedMsgs.map((m) => `- ${m.from}-${m.n} to ${m.to}: ${m.outcome || 'not recorded delivered'}`));
  const pct = context === undefined ? null : Number(String(context).replace(/%$/, ''));
  if (pct !== null && !Number.isFinite(pct)) fail(`--context takes the percent of the window used, a number, not ${JSON.stringify(context)}`);
  if (pct !== null) L.push(`context ${pct}% of the window${pct >= cfg.refresh_context ? `: REFRESH (threshold ${cfg.refresh_context}%)` : ` (REFRESH at ${cfg.refresh_context}%)`}`);
  const files = cfg.reading_bob.map((f) => ({ f, b: fileBytes(join(root, f)) }));
  const h = haveState ? readState(root, sb, handoffFile('bob')) : null;
  if (h !== null) files.push({ f: `${sb}:${handoffFile('bob')}`, b: Buffer.byteLength(h) });
  L.push(`reading set for bob: ${files.reduce((s, x) => s + x.b, 0)} bytes; ${files.map((x) => `${x.f} ${x.b}`).join(', ')}`);
  for (const l of L) log(l);
  return { rows, undelivered: owedMsgs };
}

// Next work: while fewer jobs are open than live_cap, the requirement files with an unmet
// requirement and no open job, fewest unmet first (small, finishable modules first).
export function nextWork(root, cfg, rows, ref, log = console.log) {
  const open = rows.filter((r) => r.tranche !== 'COMPLETE');
  if (open.length >= cfg.live_cap) return [];
  const dir = cfg.requirements_dir.replace(/\/$/, '');
  const taken = new Set(open.map((r) => r.req));
  let names;
  if (ref) {
    const r = git(['ls-tree', '--name-only', `${ref}:${dir}`], { cwd: root, allowFail: true });
    names = r.code === 0 ? r.stdout.split('\n') : [];
  } else names = existsSync(join(root, dir)) ? readdirSync(join(root, dir)) : [];
  const list = [];
  for (const n of names.filter((x) => x.endsWith('.md') && x !== 'README.md')) {
    const f = `${dir}/${n}`;
    if (taken.has(f)) continue;
    const text = ref ? git(['show', `${ref}:${f}`], { cwd: root }) : readFileSync(join(root, f), 'utf8');
    const count = (text.match(/\*\*R[\w.-]+\*\*\s*\*\(not yet met/g) || []).length;
    if (count) list.push({ file: f, count });
  }
  list.sort((a, b) => a.count - b.count || a.file.localeCompare(b.file));
  if (list.length) {
    log(`next work (${open.length} jobs open, live_cap ${cfg.live_cap}; BOB chooses from these, unmet requirements each):`);
    for (const x of list.slice(0, 10)) log(`- ${x.file}: ${x.count}`);
    if (list.length > 10) log(`- and ${list.length - 10} more`);
  }
  return list;
}
