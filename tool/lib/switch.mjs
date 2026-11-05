// Account switch (coordinator, 5 Nov: a switch of Bob's Claude account cost 94 minutes at 0/20
// live jobs; notes/account-switch-review.md). What a Claude account holds (scheduled tasks, live
// job sessions, messages delivered to sessions that then stopped) is written to the state branch
// by switch out on the old account; switch in, the first act on the new one, checks the account
// before anything starts and prints the restart in order. rulebooks/account-switch.md is the runbook.
// The tool cannot call Claude's session or task tools: both commands read saved results and print acts.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { P3, routeFor } from './job.mjs';
import { readAddress, tipApprovals } from './roles.mjs';
import { accountCheck } from './setup.mjs';
import { fetchState, readState, toRoute, undelivered, writeState } from './state.mjs';
import { isArchived, jobSession, readSessions, refOf, releaseModules, sessionId, status } from './status.mjs';
import { fail, fetchBranch, gh, git, loadConfig, now, repoSlug } from './util.mjs';

export const MANIFEST_FILE = 'switch/manifest.json';
export const QUIET_MIN = 2;
const ROLES = ['root', 'bob', 'merger', 'watcher'];
const SESSION = /^session_[A-Za-z0-9]+$/;
const by_ = (by) => (SESSION.test(String(by)) ? String(by) : fail('--by <session>: the session running this (the coordinator or ROOT)'));

// list_triggers saved as JSON: a list, or one under "triggers" or "data"; every page.
export function readTasks(file) {
  let j;
  try { j = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { fail(`--tasks ${file}: not a readable JSON file (${e.message}); save your list_triggers result there`); }
  const list = [j, j?.triggers, j?.data].find(Array.isArray);
  if (!list) fail(`--tasks ${file}: no list of scheduled tasks in it (a JSON list, or one under "triggers" or "data")`);
  if (j?.next_cursor || j?.has_more === true) fail(`--tasks ${file}: list_triggers has more pages (next_cursor): call it with limit 100, and again with that cursor, and save every page's tasks as one list`);
  return list.filter((x) => x && typeof x === 'object');
}

// The role a session id holds: an addressed role, the coordinator (config's, or --by when it is
// no role), or unknown.
const roleOf = (id, addresses, coordinators) => ROLES.find((r) => addresses[r]?.session === id) || (id && coordinators.includes(id) ? 'coordinator' : 'unknown');

// Every unanswered message the record holds: sent and not recorded delivered, and job reports to
// BOB that no later BOB message names. One row per <from>-<n>.
function unanswered(root, sb) {
  const out = new Map();
  for (const m of [...undelivered(root, sb), ...toRoute(root, sb)]) out.set(`${m.from}-${m.n}`, { from: m.from, n: m.n, to: m.to, at: m.at, text: m.text });
  return [...out.values()];
}

// The manifest, from the saved list_triggers and list_sessions and the state branch and status.
export function manifest(root, { tasks, sessions, by, rows, cfg = loadConfig(root), at = now() }) {
  const sb = cfg.state_branch;
  fetchState(root, sb);
  const addresses = readAddress(root, { fetch: false });
  const coordinators = [cfg.coordinator, ...(ROLES.some((r) => addresses[r]?.session === by) ? [] : [by])].filter(Boolean);
  const out = { at, by, tranche: cfg.tranche, ...tipApprovals(root, cfg), coordinator: cfg.coordinator || null, addresses };
  out.tasks = tasks.filter((t) => t.enabled !== false && !t.ended_reason).map((t) => {
    const session = t.persistent_session_id || null;
    return { id: t.id, name: t.name || null, ...(t.cron_expression ? { cron_expression: t.cron_expression } : {}), ...(t.run_once_at ? { run_once_at: t.run_once_at } : {}), prompt: t.prompt || '', session, role: roleOf(session, addresses, coordinators) };
  });
  // The live job sessions: each unarchived session titled job <id>, the newest per module.
  const ids = [...new Set(sessions.filter((x) => !isArchived(x)).map((x) => String(x.title || '').trim().match(/^job (\S+)( \(restart\))?$/)?.[1]).filter(Boolean))];
  let release = new Set();
  try { release = releaseModules(root, cfg, `origin/${cfg.tranche}`, new Set(rows.filter((r) => String(r.pr || '').startsWith('#')).map((r) => r.id))); } catch { release = new Set(); }
  out.jobs = ids.map((id) => {
    const s = jobSession(sessions.filter((x) => !isArchived(x)), id);
    const r = rows.find((y) => y.id === id) || {};
    return { module: id, session: sessionId(s), branch: refOf({ id, ...r }), pr: r.pr || null, state: r.branch || r.tranche || 'not in the ledger', ahead: r.ahead ?? null, release: release.has(id) };
  }).sort((a, b) => (b.release - a.release) || a.module.localeCompare(b.module));
  out.messages = unanswered(root, sb);
  return out;
}

const stopActs = (m) => {
  const L = [];
  const merger = m.addresses.merger?.session;
  L.push(merger
    ? `1. MERGER ${merger}, send_message priority now: "STOP for the account switch: stop your train's background task, then run \`${P3} merge train release --session ${merger}\`, then end your turn." Wait for its reply.`
    : '1. No MERGER is addressed: no train to stop.');
  L.push(m.jobs.length ? `2. Each live job, send_message priority now: "STOP for the account switch: commit and push your work in progress to your branch, then end your turn."` : '2. No live job sessions.');
  for (const j of m.jobs) L.push(`   - job ${j.module}: ${j.session} (${j.branch}${j.pr ? `, PR ${j.pr}` : ''})`);
  L.push(m.tasks.length ? '3. Switch off each task with update_trigger enabled false (switched off, never deleted):' : '3. No enabled scheduled tasks.');
  for (const t of m.tasks) L.push(`   - ${t.id} ${t.name || ''} (${t.role})`);
  const roles = ['bob', 'root', 'watcher'].filter((r) => m.addresses[r]).map((r) => `${r.toUpperCase()} ${m.addresses[r].session}`);
  L.push(`4. ${roles.length ? `${roles.join(', ')}, send_message priority now: "STOP for the account switch: finish nothing new, end your turn."` : 'No role sessions are addressed.'}`);
  L.push('5. Bob: connect GitHub on the new account as the collaborator, install the Claude GitHub App, add the account to the approvals if needed; then the new account\'s first act is switch in (rulebooks/account-switch.md).');
  return L;
};

// switch out --tasks <list_triggers file> --sessions <list_sessions file> --by <session>
export function switchOut(root, { tasks, sessions, by, read = status, log = console.log } = {}) {
  by_(by);
  if (typeof tasks !== 'string') fail('--tasks <file>: your list_triggers result on this account, saved as JSON');
  if (typeof sessions !== 'string') fail('--sessions <file>: your list_sessions result on this account, saved as JSON');
  const cfg = loadConfig(root);
  const t = readTasks(tasks);
  const s = readSessions(sessions);
  const { rows } = read(root, { log: () => {} });
  const m = manifest(root, { tasks: t, sessions: s, by, rows, cfg });
  // A job whose pull request GitHub did not answer for would be restarted by the wrong route (review of PR 149).
  const unread = m.jobs.filter((j) => /^unknown/.test(String(j.pr)));
  if (unread.length) fail(`GitHub was not read for the pull requests of ${unread.map((j) => j.module).join(', ')}; nothing was written. Run switch out again once gh api user works on this account`);
  const w = writeState(root, cfg.state_branch, `switch out: manifest by ${by}`, (wt) => {
    mkdirSync(dirname(join(wt, MANIFEST_FILE)), { recursive: true });
    writeFileSync(join(wt, MANIFEST_FILE), JSON.stringify(m, null, 2) + '\n');
  });
  log(`switch out: ${cfg.state_branch}:${MANIFEST_FILE} at ${w.tip.slice(0, 10)}: ${m.tasks.length} task(s), ${m.jobs.length} live job(s), ${m.messages.length} unanswered message(s); addresses ${ROLES.filter((r) => m.addresses[r]).map((r) => `${r} ${m.addresses[r].session}`).join(', ') || 'none'}`);
  log('Stop acts, in order, each its own call:');
  for (const l of stopActs(m)) log(l);
  return { manifest: m, tip: w.tip };
}

// switch quiet [--minutes 2]: exit 0 only when the tranche's tip has not moved for that long
// (its commit time: a merge through GitHub is committed when it lands). Roles started while the
// coordinator's own merges moved the tranche failed their start checks four times (5 Nov).
export function switchQuiet(root, { minutes = QUIET_MIN, t = Date.now(), log = console.log } = {}) {
  const min = Number(minutes);
  if (!(min > 0)) fail(`--minutes <n>, a positive number, not ${JSON.stringify(minutes)}`);
  const cfg = loadConfig(root);
  fetchBranch(root, cfg.tranche);
  const [tip, ct] = git(['log', '-1', '--format=%H %ct', `refs/remotes/origin/${cfg.tranche}`], { cwd: root }).split(' ');
  const age = Math.max(0, Math.round(t / 1000 - Number(ct)));
  const ok = age >= min * 60;
  log(ok ? `switch quiet: ${cfg.tranche} ${tip.slice(0, 10)} unmoved for ${age} s: go on` : `switch quiet: NOT QUIET, ${cfg.tranche} ${tip.slice(0, 10)} moved ${age} s ago; run it again in ${min * 60 - age} s and start nothing until it exits 0`);
  return { ok, tip, age };
}

// The preflight: each check { ok, line, fix }; a failure names who fixes it.
export function preflight(root, m, { slug, approvals, api = (p) => gh(['api', p], { allowFail: true }), push = () => git(['push', '--dry-run', '-q', 'origin', 'HEAD:refs/heads/p3-switch-probe'], { cwd: root, allowFail: true }), cfg = loadConfig(root) } = {}) {
  const out = [];
  const me = api('user');
  out.push(me?.login
    ? { ok: true, line: `GitHub connected, acting as ${me.login}` }
    : { ok: false, line: 'GitHub is not connected on this Claude account (GET /user failed)', fix: 'Bob: connect GitHub on this Claude account (claude.ai, Settings, Connectors), signed in as the collaborator account, not the repositories\' owner' });
  const a = me?.login ? accountCheck(slug, { api }) : { state: 'missing', detail: 'unread: GitHub is not connected' };
  out.push(a.state === 'set'
    ? { ok: true, line: `account: ${a.detail}` }
    : { ok: false, line: `account: ${a.detail} (push true, admin false needed)`, fix: `Bob: Claude's GitHub connection must act as the non-admin collaborator on ${slug}; reconnect it as that account (setup/DEVELOPER.md step 3), never as the owner` });
  const p = push();
  out.push(p.code === 0
    ? { ok: true, line: `push reachable on origin (${slug}), dry run` }
    : { ok: false, line: `push not reachable on origin (${slug}): ${String(p.stderr || p.stdout || '').trim().split('\n').pop()}`, fix: `Bob: install the Claude GitHub App on ${slug} for the collaborator account and attach the repository to this session with push access` });
  const tip = tipApprovals(root, cfg).approvals;
  const want = approvals === undefined ? m.approvals : String(approvals);
  out.push(tip === want
    ? { ok: true, line: `approvals at ${cfg.tranche}'s tip are ${approvals === undefined ? 'those switch out recorded' : 'the hash given by --approvals'} (${tip.slice(0, 12)})` }
    : { ok: false, line: `approvals at ${cfg.tranche}'s tip (${tip.slice(0, 12)}) are not ${approvals === undefined ? `those switch out recorded (${String(m.approvals).slice(0, 12)})` : 'the hash given by --approvals'}`, fix: `Bob: if the change is his own for the new account, the coordinator runs switch in again with --approvals ${tip} on his word; else Bob restores the approvals block` });
  return out;
}

// The old prompt with the old role ids named as the new role's and the old approvals hash as the tip's.
const freshPrompt = (m, prompt, approvals) => {
  let p = String(prompt).split(m.approvals).join(approvals);
  for (const r of ROLES) if (m.addresses[r]?.session) p = p.split(m.addresses[r].session).join(`<the new ${r} id: ${P3} address ${r}>`);
  return p;
};

export function restartActs(m, { by, cfg, approvals, addresses = m.addresses, messages = [], t = Date.now() }) {
  const L = [];
  // The manifest's ids: a switch in run again after (c) must not name the new roles as the old (review of PR 149).
  const old = (r) => m.addresses[r]?.session;
  for (const r of ROLES) if (old(r) && addresses[r]?.session && addresses[r].session !== old(r)) L.push(`note: ${r} is now addressed to ${addresses[r].session}, not the manifest's ${old(r)}: skip its start in (c) if that session is the new one`);
  L.push(cfg.coordinator === by
    ? `(a) The coordinator id: ${by} is already \`coordinator\` in process/config.json on ${cfg.tranche}.`
    : `(a) The coordinator records its id: on a branch cut from origin/${cfg.tranche}, set "coordinator": "${by}" in process/config.json, push it, open a pull request into ${cfg.tranche}, and merge it: \`${P3} merge <pr> --plain --no-review "coordinator id after the account switch"\`. The same on each product this coordinator holds (the probe too).`);
  L.push(`(b) Wait for a quiet tranche: \`${P3} switch quiet\`, again until it exits 0 (the tip unmoved ${QUIET_MIN} min). Start nothing before.`);
  L.push(`(c) \`${P3} start root\`, then create_session with the call it prints; ROOT records its own address. Then send ROOT, each its own command for it:`);
  L.push(old('bob') ? `    - \`${P3} handover begin\` (old BOB ${old('bob')}), its create_session and \`handover confirm <new id>\`; skip the message to the old BOB and its archive: it is on the old account` : `    - \`${P3} start bob\`, its create_session and \`start record bob <new id>\``);
  if (old('merger')) L.push(`    - \`${P3} start merger --replace ${old('merger')}\`, its create_session and \`start record merger <new id>\`; its train takes the lease at once if the old MERGER ran \`merge train release\`, else within 15 min`);
  L.push(old('watcher') ? `    - \`${P3} start watcher --replace ${old('watcher')}\`, its create_session, \`start record watcher <new id>\` and the daily task it prints` : `    - \`${P3} start watcher\`, its create_session, \`start record watcher <new id>\` and the daily task it prints`);
  L.push(m.tasks.length ? '(d) The scheduled tasks, after the starts, each a create_trigger call (the new ids from `address <role>`):' : '(d) No scheduled tasks to recreate.');
  for (const k of m.tasks) {
    const when = k.cron_expression ? { cron_expression: k.cron_expression } : k.run_once_at ? { run_once_at: k.run_once_at } : {};
    if (k.role === 'root' || k.role === 'watcher') { L.push(`    - ${k.name || k.id} (${k.role}): made by ${k.role === 'root' ? 'ROOT from its own prompt (sweep task)' : 'start watcher\'s output'}, with the current approvals; nothing to do here`); continue; }
    if (k.run_once_at && Date.parse(k.run_once_at) <= t) { L.push(`    - ${k.name || k.id}: its one time (${k.run_once_at}) has passed; recreate it only if it is still wanted`); continue; }
    const bound = k.role === 'coordinator' ? {} : ROLES.includes(k.role) ? { persistent_session_id: `<the new ${k.role} id: ${P3} address ${k.role}>` } : { persistent_session_id: `<unknown: it was bound to ${k.session || 'no session'}; the coordinator decides>` };
    L.push(`    - ${k.name || k.id} (${k.role}${k.role === 'coordinator' ? ', created from the coordinator session itself' : ''}): ${JSON.stringify({ name: k.name, ...when, ...bound, prompt: freshPrompt(m, k.prompt, approvals) })}`);
  }
  // Each job by routeFor's route (job.mjs): an open pull request, or BLOCKED, is a --restart; a
  // WORKING start with one commit resumes; anything else is routeFor's words for BOB.
  const open = (j) => String(j.pr || '').startsWith('#');
  const state = (j) => String(j.state).split(' ')[0];
  const restart = m.jobs.filter((j) => open(j) || state(j) === 'BLOCKED');
  const resume = m.jobs.filter((j) => !restart.includes(j) && state(j) === 'WORKING' && j.ahead === 1);
  const other = m.jobs.filter((j) => !restart.includes(j) && !resume.includes(j));
  const rel = (j) => (j.release ? ' (release path)' : '');
  L.push(restart.length || resume.length ? '(e) BOB restarts every recorded job, release path first, each its own command, then the create_session it prints:' : '(e) No recorded job to restart.');
  for (const j of restart) L.push(`    - \`${P3} job start ${j.module} --restart "account switch: its session ${j.session} was on the old Claude account" --stop idle\`${rel(j)}`);
  for (const j of resume) L.push(`    - \`${P3} job start ${j.module} --sessions <list_sessions saved now>\` (an unfinished start resumes)${rel(j)}`);
  for (const j of other) L.push(`    - ${j.module}: ${j.state}${j.pr ? `, PR ${j.pr}` : ''}: ${['WORKING', 'COMPLETE'].includes(state(j)) ? routeFor(j.module, { state: state(j), ahead: j.ahead, open: open(j) }) : 'nothing to restart'}${rel(j)}`);
  L.push(`(f) BOB: \`${P3} job start --ready --sessions <list_sessions saved now>\`.`);
  L.push(messages.length ? `(g) The unanswered messages, re-addressed: deliver each with send_message to the new session (\`${P3} address <role>\`, or the new job <id> session), then \`${P3} send delivered <n> --from <sender>\`:` : '(g) No unanswered messages.');
  for (const x of messages) L.push(`    - ${x.from}-${x.n} to ${x.to}${ROLES.includes(x.to) ? '' : ' (the new job session)'}: "MSG ${x.from}-${x.n} to ${x.to}: ${x.text}"`);
  return L;
}

// switch in --sessions <list_sessions file> --by <session> [--approvals <hash>]: the first act on
// the new account. Refuses, starting nothing, unless every preflight check holds.
export function switchIn(root, { sessions, by, approvals, slug = repoSlug(root), io = {}, log = console.log } = {}) {
  by_(by);
  if (typeof sessions !== 'string') fail('--sessions <file>: your list_sessions result on this account, saved as JSON');
  if (approvals !== undefined && !/^[0-9a-f]{64}$/.test(String(approvals))) fail('--approvals <hash>: the 64-hex hash of the tranche tip\'s approvals switch in printed');
  readSessions(sessions);
  const cfg = loadConfig(root);
  if (!fetchState(root, cfg.state_branch)) fail(`no ${cfg.state_branch} on origin: nothing to switch in`);
  const text = readState(root, cfg.state_branch, MANIFEST_FILE);
  if (text === null) fail(`no ${MANIFEST_FILE} on ${cfg.state_branch}: the old account runs switch out first`);
  let m;
  try { m = JSON.parse(text); } catch { fail(`${MANIFEST_FILE} on ${cfg.state_branch} is not JSON`); }
  log(`switch in: the manifest by ${m.by} at ${m.at}: ${m.tasks.length} task(s), ${m.jobs.length} job(s), ${m.messages.length} message(s)`);
  log('Preflight:');
  const checks = preflight(root, m, { slug, approvals, cfg, ...io });
  for (const c of checks) log(`- ${c.ok ? 'ok' : 'FAILED'}: ${c.line}${c.ok ? '' : `. Fixes it: ${c.fix}`}`);
  const bad = checks.filter((c) => !c.ok);
  if (bad.length) fail(`switch in refused: ${bad.length} preflight check(s) failed; nothing was started. Each names who fixes it; run switch in again once fixed`);
  const tranche = loadConfig(root, `refs/remotes/origin/${cfg.tranche}`);
  const addresses = readAddress(root, { fetch: false });
  // The manifest's unanswered messages and any the record has gained since, once each.
  const seen = new Map([...m.messages, ...unanswered(root, cfg.state_branch)].map((x) => [`${x.from}-${x.n}`, x]));
  log('Restart, in order, each act its own command:');
  for (const l of restartActs(m, { by, cfg: { ...tranche, tranche: cfg.tranche }, approvals: tipApprovals(root, cfg).approvals, addresses, messages: [...seen.values()] })) log(l);
  return { ok: true, manifest: m };
}
