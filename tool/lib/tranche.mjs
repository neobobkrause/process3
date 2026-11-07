// tranche open and tranche close (Build Plan Phase 3, Bob's words 1 and 3 Nov).
// Open: before any job starts, BOB and one short probe session, each at the depth it runs at,
// take a handful of approved acts. The tool prints them, one command or MCP call each; BOB records
// each outcome with --record, one row per act on the state branch (OPEN_FILE), a refusal also
// with metrics refusal's row, so it counts toward REFRESH. A refused or declined act the work needs
// stops the open and BOB brings it to Bob; a refused or declined archive or task deletion is
// counted and reported only. The act is never reworded or rerouted. The throwaway branches are
// kept, never deleted.
// Close: once every layer is closed (or the plan says close), and with a `deploy` block once the
// last round's deploy and walk ran and its findings are recorded (walkHold), main into the tranche and the
// tranche into main, each by a plain pull request through merge --plain; then --record writes the
// close on the state branch, as layer close does.
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { compare } from './github.mjs';
import { completionItems, openItems } from './completion.mjs';
import { walkFindings, walkHold } from './deploy.mjs';
import { P3, wakeLine } from './job.mjs';
import { recordRefusal } from './metrics.mjs';
import { tipApprovals } from './roles.mjs';
import { fetchState, jsonl, readState, writeState } from './state.mjs';
import { closedRows, layerState, status } from './status.mjs';
import { depth as fetchDepth, fail, git, isShallow, loadConfig, repoSlug } from './util.mjs';

export const OPEN_FILE = 'metrics/tranche-open.jsonl';
export const TRANCHE_CLOSED_FILE = 'tranches/closed.jsonl';
export const OUTCOMES = ['ok', 'refused', 'declined'];
// The acts, BOB's at its depth, the probe's one deeper. `needed: false`: counted and reported only.
export const BOB_ACTS = ['push', 'pr-open', 'pr-comment', 'pr-merge', 'session-start', 'session-archive', 'task-create', 'task-delete'];
export const PROBE_ACTS = ['push', 'pr-open', 'pr-comment', 'pr-merge'];
export const REPORT_ONLY = new Set(['session-archive', 'task-delete']);

const put = (wt, path, line) => { mkdirSync(dirname(join(wt, path)), { recursive: true }); appendFileSync(join(wt, path), line); };
const bobDepth = (d) => {
  const n = d === undefined ? 1 : Number(d);
  if (d === true || !Number.isInteger(n) || n < 0) fail(`--depth <n>, BOB's depth (1 when ROOT started it), not ${JSON.stringify(d)}`);
  return n;
};

// The tranche's closes, newest last.
export const trancheCloses = (root, cfg) => jsonl(readState(root, cfg.state_branch, TRANCHE_CLOSED_FILE)).filter((r) => r.row === 'tranche-closed' && r.tranche === cfg.tranche);

// Rows and closes carry milliseconds, so a row written after a close sorts after it.
const stamp = () => new Date().toISOString();
const currentRows = (root, cfg) => {
  const since = trancheCloses(root, cfg).at(-1)?.at || '';
  return jsonl(readState(root, cfg.state_branch, OPEN_FILE)).filter((r) => r.row === 'grant' && r.tranche === cfg.tranche && String(r.at) > since);
};
// BOB's depth: --depth when given, else the lowest depth recorded in this open (BOB's acts are
// always at the lower of the two), else 1. So status needs no flag for a BOB at depth 2.
const inferDepth = (rows, depth) => (depth !== undefined ? bobDepth(depth) : rows.length ? Math.min(...rows.map((r) => r.depth)) : 1);

// The open of this tranche: the rows after its last close, the latest per act and depth counting.
export function openState(root, cfg, { depth } = {}) {
  const rows = currentRows(root, cfg);
  const d = inferDepth(rows, depth);
  const want = [...BOB_ACTS.map((act) => ({ act, depth: d })), ...PROBE_ACTS.map((act) => ({ act, depth: d + 1 }))];
  const got = want.map((w) => ({ ...w, row: rows.filter((r) => r.act === w.act && r.depth === w.depth).at(-1) || null }));
  const recorded = got.filter((g) => g.row).length;
  const bad = got.filter((g) => g.row && g.row.outcome !== 'ok');
  const stop = bad.filter((g) => !REPORT_ONLY.has(g.act));
  const reported = bad.filter((g) => REPORT_ONLY.has(g.act));
  const state = stop.length ? 'stopped' : recorded === want.length ? 'open' : 'pending';
  return { state, recorded, of: want.length, stop, reported, missing: got.filter((g) => !g.row), depth: d };
}

const describe = (g) => `${g.act} at depth ${g.depth} ${g.row.outcome}${g.row.session ? ` (${g.row.session})` : ''}`;
export function openLine(o) {
  if (o.state === 'stopped') return `tranche open: STOPPED: ${o.stop.map(describe).join('; ')}; bring it to Bob; no act is reworded or rerouted, and no job starts`;
  const rep = o.reported.length ? `; reported, not stopping: ${o.reported.map(describe).join('; ')}` : '';
  if (o.state === 'open') return `tranche open: passed, ${o.recorded} of ${o.of} acts recorded${rep}`;
  return `tranche open: ${o.recorded} of ${o.of} acts recorded${rep}; no job starts until it passes (${P3} tranche open)`;
}

// tranche open: the steps, nothing written. The throwaway branch's number is one past those origin has.
export function trancheOpen(root, { depth, log = console.log, slug = repoSlug(root) } = {}) {
  const cfg = loadConfig(root);
  const { tip } = tipApprovals(root, cfg);
  fetchState(root, cfg.state_branch);
  const o = openState(root, cfg, { depth });
  const d = o.depth;
  log(openLine(o));
  if (o.state === 'stopped') return { ...o, steps: [] };
  const prefix = `p3/grants-${cfg.tranche}-`;
  const ls = git(['ls-remote', '--heads', 'origin', `refs/heads/${prefix}*`], { cwd: root });
  const taken = ls.split('\n').map((l) => l.split('\t')[1]?.slice(11 + prefix.length)).map((x) => Number(String(x).split('-')[0])).filter(Number.isInteger);
  const n = Math.max(0, ...taken) + 1;
  const base = `${prefix}${n}`;
  const [owner, repo] = slug.split('/');
  const rec = (act, dd) => `${P3} tranche open --record "${act}|${dd}|<ok, refused or declined>" --session <the session that took it>`;
  const gitActs = (who, dd) => [
    `\`git checkout -q -b ${base}-${who} ${tip}\`, then \`git commit -q --allow-empty -m "grants check ${n}: ${who}"\``,
    `push: \`${P3} github push origin ${base}-${who} --set-upstream\``,
    `pr-open: \`${P3} github note --content 1\`, then create_pull_request {"owner":"${owner}","repo":"${repo}","head":"${base}-${who}","base":"${base}","title":"grants check ${n}: ${who}","body":"A throwaway pull request of the tranche open's grants check. Kept, never deleted."}`,
    `pr-comment: \`${P3} github note --content 1\`, then add_issue_comment on that pull request: "grants check ${n}: ${who} comments"`,
    `pr-merge: \`${P3} merge <that pull request> --plain --no-review "grants check: an empty commit into a throwaway branch"\``,
  ];
  const probe = [
    `# Grants probe ${n} for ${slug}`, '',
    `You are a short probe of the tranche open's grants check, started by BOB at depth ${d + 1}. Bob's standing approvals in CLAUDE.md are your authority. Take each act below as its own command, once. If an act is refused or declined, never reword or reroute it: note its exact words and go on to the next.`, '',
    '1. `git submodule update --init .process`',
    ...gitActs('probe', d + 1).map((s, i) => `${i + 2}. ${s}`), '',
    `Then send BOB one message with send_message: one line per act, "<act>|${d + 1}|<ok, refused or declined>" (push, pr-open, pr-comment, pr-merge), and the exact words of any refusal. Then end.`,
  ].join('\n');
  const call = { title: `grants probe ${n}`, source_url: `https://github.com/${slug}`, source_revision: tip, clone_depth: 1, prompt: probe };
  const at = new Date(Date.now() + 864e5).toISOString().replace(/\.\d+Z$/, 'Z');
  const steps = [
    `\`${P3} github push origin ${tip}:refs/heads/${base}\` (the throwaway base; kept, never deleted)`,
    ...gitActs('bob', d).slice(0, 1),
    ...gitActs('bob', d).slice(1).map((s) => `${s}; then ${rec(s.split(':')[0], d)}`),
    `session-start: create_session with the call below; then ${rec('session-start', d)}`,
    `wait for its message; for each line it sends, ${rec('<act>', d + 1)} with its session id`,
    `session-archive: archive_session {"session_id":"<the probe's id>"}; then ${rec('session-archive', d)}`,
    `task-create: create_trigger {"name":"grants check ${n}","run_once_at":"${at}","prompt":"grants check ${n}: a throwaway task; delete it.","initiation":"own_followup"}; then ${rec('task-create', d)}`,
    `task-delete: delete_trigger {"trigger_id":"<its id>"}; then ${rec('task-delete', d)}`,
    `\`${P3} tranche open --check\``,
  ];
  log(`BOB's acts for the grants check ${n} (depth ${d}; the probe ${d + 1}), each its own command; a refused or declined act is recorded as it is, never reworded or rerouted:`);
  steps.forEach((s, i) => log(`${i + 1}. ${s}`));
  log(`the probe's create_session call:\n${JSON.stringify(call, null, 2)}`);
  return { ...o, n, base, steps, call };
}

// tranche open --record "<act>|<depth>|<outcome>"... --session <id>: one row per act on the state
// branch, in one push; a refusal also as metrics refusal's row in this checkout.
export function recordOpen(root, records, { session, depth, bob, as = 'bob', log = console.log } = {}) {
  const cfg = loadConfig(root);
  if (typeof session !== 'string' || !session.trim()) fail('--record needs --session <the session that took the act>');
  const rows = records.map((x) => {
    const [act, dd, outcome, ...rest] = String(x).split('|').map((p) => p.trim());
    if (rest.length || !BOB_ACTS.includes(act) || !OUTCOMES.includes(outcome)) fail(`--record "<act>|<depth>|<ok, refused or declined>", the act one of ${BOB_ACTS.join(', ')}; not ${JSON.stringify(x)}`);
    const depth = Number(dd);
    if (!/^\d+$/.test(dd)) fail(`the depth in ${JSON.stringify(x)} is not a whole number`);
    return { row: 'grant', at: stamp(), tranche: cfg.tranche, act, depth, outcome, session: session.trim() };
  });
  if (!rows.length) fail('--record "<act>|<depth>|<ok, refused or declined>"');
  // Only acts the check counts: BOB's at its depth, the probe's four one deeper.
  fetchState(root, cfg.state_branch, { fresh: true });
  const d = inferDepth([...currentRows(root, cfg), ...rows], depth);
  const off = rows.filter((r) => !(r.depth === d || (r.depth === d + 1 && PROBE_ACTS.includes(r.act))));
  // A stop is Bob's to lift: a later ok for an act that stopped the open needs his words.
  const before = openState(root, cfg, { depth: d });
  const lifts = rows.filter((r) => r.outcome === 'ok' && before.stop.some((g) => g.act === r.act && g.depth === r.depth));
  if (lifts.length && (typeof bob !== 'string' || !bob.trim())) fail(`${lifts.map((r) => `${r.act} at depth ${r.depth}`).join(', ')} stopped this open; an ok after it needs --bob "<Bob's words lifting the stop>"; nothing recorded`);
  if (lifts.length) for (const r of lifts) r.bob = bob.trim();
  if (off.length) fail(`not an act of this check (BOB at depth ${d}, the probe's ${PROBE_ACTS.join(', ')} at ${d + 1}): ${off.map((r) => `${r.act} at depth ${r.depth}`).join(', ')}; nothing recorded`);
  writeState(root, cfg.state_branch, `tranche open: ${rows.map((r) => `${r.act} ${r.depth} ${r.outcome}`).join(', ')}`, (wt) => put(wt, OPEN_FILE, rows.map((r) => JSON.stringify(r) + '\n').join('')));
  // The refusal row after the push, so a failed push rerun does not count one refusal twice.
  for (const r of rows.filter((x) => x.outcome === 'refused')) recordRefusal(root, { session: r.session, act: `tranche open: ${r.act}`, depth: r.depth });
  for (const r of rows) log(`recorded ${r.act} at depth ${r.depth}: ${r.outcome}${r.outcome === 'refused' ? ` (and in ${'process/metrics/refusals.bob.jsonl'}; commit it by BOB's plain pull request)` : ''}`);
  // The record that passes the open lets jobs start: the wake of BOB is the last line.
  const wake = before.state !== 'open' && openState(root, cfg, { depth: d }).state === 'open' ? wakeLine('tranche open passed', as) : null;
  if (wake) log(wake);
  return rows;
}

// tranche open --check: open, pending or stopped; exit 0 only when open.
export function checkOpen(root, { depth, as = 'bob', log = console.log } = {}) {
  const cfg = loadConfig(root);
  fetchState(root, cfg.state_branch, { fresh: true });
  const o = openState(root, cfg, { depth });
  log(openLine(o));
  if (o.state === 'pending') log(`not yet recorded: ${o.missing.map((g) => `${g.act} at depth ${g.depth}`).join(', ')}`);
  const wake = o.state === 'open' ? wakeLine('tranche open passed', as) : null;
  if (wake) log(wake);
  return o;
}

// Whether `sha` is on `base`: GitHub's compare when online, else local ancestry, which a shallow
// clone's cut history cannot answer: there an unread compare is a failure, not a guess.
const onBranch = (root, slug, base, sha, read) => {
  const c = slug ? read(slug, base, sha) : null;
  if (Number.isInteger(c?.ahead_by)) return c.ahead_by === 0;
  if (isShallow(root)) fail(`GitHub's compare of ${sha.slice(0, 10)} with ${base} could not be read, and this clone is shallow: run again`);
  return git(['merge-base', '--is-ancestor', sha, `refs/remotes/origin/${base}`], { cwd: root, allowFail: true }).code === 0;
};

// tranche close: refused unless every layer is closed or the plan says close; prints BOB's acts.
// tranche close --record: once the tranche is on main, the close on the state branch.
export function trancheClose(root, { record = false, report = false, log = console.log, io = {}, slug = repoSlug(root) } = {}) {
  const read = io.compare || compare;
  const cfg = loadConfig(root);
  const t = `origin/${cfg.tranche}`;
  git(['fetch', '-q', ...fetchDepth(root), 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/${t}`, '+refs/heads/main:refs/remotes/origin/main'], { cwd: root });
  fetchState(root, cfg.state_branch, { fresh: true });
  const tip = git(['rev-parse', t], { cwd: root });
  const main = git(['rev-parse', 'origin/main'], { cwd: root });
  if (record) {
    if (!onBranch(root, slug, 'main', tip, read)) fail(`${cfg.tranche} ${tip.slice(0, 10)} is not on main yet; merge the tranche's pull request first`);
    if (trancheCloses(root, cfg).some((r) => r.commit === tip)) fail(`the close of ${cfg.tranche} at ${tip.slice(0, 10)} is already recorded`);
    const row = { row: 'tranche-closed', tranche: cfg.tranche, commit: tip, main, at: stamp() };
    writeState(root, cfg.state_branch, `tranche ${cfg.tranche} closed at main ${main.slice(0, 10)}`, (wt) => put(wt, TRANCHE_CLOSED_FILE, JSON.stringify(row) + '\n'));
    log(`tranche ${cfg.tranche} closed: ${tip.slice(0, 10)} on main ${main.slice(0, 10)}`);
    if (report) log(`next: ${P3} report tranche`);
    return { ok: true, row };
  }
  // The plan as the tranche holds it, not this working tree.
  let plan = null;
  try { plan = loadConfig(root, t).plan; } catch { plan = null; }
  if (plan !== 'close') {
    const s = status(root, { log: () => {}, io: io.status });
    const ls = layerState(root, cfg, s.rows, t, { closed: closedRows(root, cfg, { slug, read }) });
    if (!ls) fail(`no layer map (${cfg.layers_file}) on ${t}, and the plan on ${t} is ${plan}, not close`);
    const open = ls.layers.filter((L) => !L.closed);
    if (open.length) fail(`layers not closed: ${open.map((L) => L.n).join(', ')}; the tranche closes when every layer is closed, or when the plan says close`);
    // The completion round (PLN-4): every item done, or deferred with a reason on its line.
    const c = completionItems(root, cfg, t);
    if (c?.missing) fail(`completion_file ${c.file} is not on ${t}; the tranche closes when its completion round is done`);
    const left = openItems(c);
    if (left.length) fail(`completion round not done: ${left.map((x) => (x.malformed ? `${x.id} (not an item line)` : `${x.id} (${x.target})`)).join(', ')} open in ${c.file}; tick each when done, or mark it "deferred: <reason>"`);
  }
  // The last round's deploy and walk (Bob, 4 Nov): one run at least, and the latest's findings
  // each recorded, as a found mark owed or a known gap, or a fresh run at the next round's close.
  if (cfg.deploy) {
    const w = walkFindings(root, cfg, t, { slug, read });
    if (!w.last) fail(`the last round's deploy and walk are owed before the tranche closes: ${P3} deploy dev`);
    const hold = walkHold(w);
    if (hold) fail(`tranche close waits: ${hold}`);
  }
  const [owner, repo] = slug.split('/');
  const steps = [];
  if (onBranch(root, slug, cfg.tranche, main, read)) log(`main ${main.slice(0, 10)} is already in ${cfg.tranche}: no merge of main into it`);
  else {
    steps.push(`\`${P3} github note --content 1\`, then create_pull_request {"owner":"${owner}","repo":"${repo}","head":"main","base":"${cfg.tranche}","title":"Merge main into ${cfg.tranche}","body":"Brings the tranche up to main before it closes."}`);
    steps.push(`\`${P3} merge <that pull request> --plain --no-review "main into the tranche before its close"\``);
  }
  steps.push(`\`${P3} github note --content 1\`, then create_pull_request {"owner":"${owner}","repo":"${repo}","head":"${cfg.tranche}","base":"main","title":"Close ${cfg.tranche}","body":"The tranche's work, merged through the gate and its reviews."}`);
  steps.push(`\`${P3} merge <that pull request> --plain --no-review "the tranche's work, merged through the gate and its reviews"\` (it waits for main's required checks)`);
  steps.push(`\`${P3} tranche close --record\``);
  log(`BOB's acts to close ${cfg.tranche} at ${tip.slice(0, 10)}, each its own command; a refused act is never reworded or rerouted:`);
  steps.forEach((s, i) => log(`${i + 1}. ${s}`));
  return { ok: true, steps };
}
