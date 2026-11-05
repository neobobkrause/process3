// The state branch (REC-1, transient): BOB's one-screen handoff (SES-3) and numbered messages
// (MSG-1, MSG-3, MSG-6). Each file has one writer (REC-2): handoff/<role>.md by that role,
// messages/<sender>.jsonl by that sender. The address file is build K's; send only reads it.
// The tool cannot call send_message: send records and prints, the session delivers.
import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fail, git, now, pushRetry, quietly, withTemp } from './util.mjs';

export const handoffFile = (role) => `handoff/${role}.md`;
export const messagesFile = (from) => `messages/${from}.jsonl`;
export const addressFile = (role) => `addresses/${role}.json`; // build K's; read only here
export const HANDOFF_MAX = { lines: 40, bytes: 4096, notes: 5 };
const NAME = /^[a-z][a-z0-9-]{0,39}$/;
export const roleName = (v, what) => (typeof v === 'string' && NAME.test(v) ? v : fail(`${what} must be a role name (lower case letters, digits and -), not ${JSON.stringify(v)}`));

const ref = (sb) => `refs/remotes/origin/${sb}`;

// Fetches the state branch; false when origin has none. A failed read is a failure, not "none".
// One fetch, no ls-remote (each round trip cost up to 26 s measured 3 Nov), and at most once per
// command: readAddress, bobStatus and sweep in one run share it. writeState asks fresh, since it
// must build on the latest tip.
const fetched = new Map();
export function fetchState(root, sb, { fresh = false } = {}) {
  const key = `${root}\0${sb}`;
  if (!fresh && fetched.has(key)) return fetched.get(key);
  const r = git(['fetch', '-q', 'origin', `+refs/heads/${sb}:${ref(sb)}`], { cwd: root, allowFail: true });
  if (r.code !== 0 && !/couldn't find remote ref/i.test(r.stderr)) fail(`cannot read origin's ${sb}: ${r.stderr.trim()}`);
  fetched.set(key, r.code === 0);
  return r.code === 0;
}

// A file as the fetched state branch holds it, or null.
export function readState(root, sb, path) {
  const r = git(['show', `${ref(sb)}:${path}`], { cwd: root, allowFail: true });
  return r.code === 0 ? r.stdout : null;
}

export const jsonl = (text) => (text || '').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });

// Changes the state branch in a worktree of its own (the caller's checkout never moves), commits
// and pushes with pushRetry: never forced. A branch origin lacks starts as an orphan commit.
// When the push is rejected because another writer moved the branch, the change is made again on
// the fresh tip, never merged (defect sweep 4 Nov, #12): so `change` must be a function of the
// worktree it is given and its own arguments only, and every caller's is. The writers, and what
// each one's change writes: send and send delivered|failed (messages/<from>.jsonl, appended, its
// number counted from the file), handoff (handoff/<role>.md), start record, handover confirm and
// the prompt refresh (addresses/<role>.json, each re-reading the address it may replace;
// handover confirm also appends metrics/handover.jsonl), job start --restart (metrics/restart.jsonl),
// sweep (heartbeat, and metrics/sweep.jsonl appended), lane ask (lanes/asks.jsonl, appended), notice
// recording, withdraw and triage (one file per row, added only when absent), layer close
// (layers/closed.jsonl), release record (releases/dev.jsonl), deploy dev (deploys/dev.jsonl) and
// tranche open and close (metrics/tranche-open.jsonl, tranches/closed.jsonl, appended). A failure inside `change` pushes nothing.
export function writeState(root, sb, msg, change) {
  return quietly(() => writeStateNow(root, sb, msg, change));
}
function writeStateNow(root, sb, msg, change) {
  const have = fetchState(root, sb, { fresh: true });
  const start = have ? ref(sb) : git(['commit-tree', git(['hash-object', '-t', 'tree', '/dev/null'], { cwd: root }), '-m', `${sb}: the state branch`], { cwd: root });
  return withTemp('p3-state-', (tmp) => {
    const wt = join(tmp, 's');
    git(['worktree', 'add', '-q', '--detach', wt, start], { cwd: root });
    let out;
    const make = () => {
      out = change(wt);
      git(['add', '-A'], { cwd: wt });
      git(['commit', '-q', '--allow-empty', '-m', msg], { cwd: wt });
    };
    make();
    const tip = pushRetry(wt, sb, { redo: make });
    try { fetchState(root, sb, { fresh: true }); } catch { fetched.delete(`${root}\0${sb}`); } // pushed: a failed read-back is not a failed write
    return { ...out, tip };
  }, { root });
}

const put = (wt, path, text, append = false) => {
  mkdirSync(dirname(join(wt, path)), { recursive: true });
  (append ? appendFileSync : writeFileSync)(join(wt, path), text);
};

// The one-screen handoff: pointers from git and the given status lines, and at most a few prose
// lines. The size test measures the notes: refused, nothing written, only when the header and the
// notes, with one status line, are over one screen. The status lines are capped by the screen
// rule: those that fit, then one line pointing at status --role bob for the rest (a 140-line
// status refused every handoff, at any note length, on the copy, 4 Nov).
export const morePointer = (k) => `(${k} more status line${k === 1 ? '' : 's'}: status --role bob lists them all)`;
export function handoff(root, sb, { role = 'bob', tranche, lines, notes = [], log = console.log }) {
  roleName(role, 'the role');
  const tip = git(['log', '-1', '--format=%H %s', tranche], { cwd: root });
  if (notes.length > HANDOFF_MAX.notes) fail(`at most ${HANDOFF_MAX.notes} notes`);
  const head = [`# Handoff for ${role}, ${now()}`, `tranche ${tip}`, ''];
  const tail = notes.length ? ['', 'notes:', ...notes.map((n) => `- ${String(n).replace(/\s+/g, ' ').trim()}`)] : [];
  const join_ = (body) => [...head, ...body, ...tail].join('\n') + '\n';
  const size = (t) => ({ count: t.split('\n').length - 1, bytes: Buffer.byteLength(t) });
  const fits = (t) => { const z = size(t); return z.count <= HANDOFF_MAX.lines && z.bytes <= HANDOFF_MAX.bytes; };
  if (!fits(join_(lines.length ? [morePointer(lines.length)] : []))) {
    const n = size(tail.join('\n') + (tail.length ? '\n' : ''));
    fail(`the notes are ${n.count} lines, ${n.bytes} bytes; with the handoff's header and one status line they are over one screen (${HANDOFF_MAX.lines} lines and ${HANDOFF_MAX.bytes} bytes): shorten the notes`);
  }
  let k = lines.length;
  const body = (j) => (j < lines.length ? [...lines.slice(0, j), morePointer(lines.length - j)] : lines);
  while (k > 0 && !fits(join_(body(k)))) k--;
  const text = join_(body(k));
  const w = writeState(root, sb, `handoff for ${role}`, (wt) => put(wt, handoffFile(role), text));
  log(text);
  if (k < lines.length) log(`status capped by the screen rule: ${k} of ${lines.length} status lines in the handoff, the rest named by its pointer line`);
  log(`handoff written to ${sb}:${handoffFile(role)} at ${w.tip.slice(0, 10)}`);
  return { text, tip: w.tip, shown: k, of: lines.length };
}

// Messages, per sender: sent rows { n, to, text } and outcome rows { n, outcome }.
export function messages(text) {
  const sent = new Map();
  for (const r of jsonl(text)) {
    if (r.row === 'sent') sent.set(r.n, { ...r, outcome: null });
    else if (r.row === 'outcome' && sent.has(r.n)) sent.get(r.n).outcome = r.outcome;
  }
  return [...sent.values()];
}

// Every sent message not recorded delivered, from every sender, as the fetched branch holds them.
export function undelivered(root, sb) {
  const r = git(['ls-tree', '--name-only', '-z', `${ref(sb)}:messages`], { cwd: root, allowFail: true });
  if (r.code !== 0) return [];
  return r.stdout.split('\0').filter((f) => f.endsWith('.jsonl')).flatMap((f) =>
    messages(readState(root, sb, `messages/${f}`)).filter((m) => m.outcome !== 'delivered').map((m) => ({ from: f.slice(0, -6), ...m })));
}

// Reports to route (P9, PLN-3): messages to bob from a job sender (any sender but root, bob and
// the watcher) until a later message from bob names its id (<from>-<n>) in its text.
export function toRoute(root, sb) {
  const r = git(['ls-tree', '--name-only', '-z', `${ref(sb)}:messages`], { cwd: root, allowFail: true });
  if (r.code !== 0) return [];
  const all = r.stdout.split('\0').filter((f) => f.endsWith('.jsonl')).flatMap((f) => messages(readState(root, sb, `messages/${f}`)).map((m) => ({ from: f.slice(0, -6), ...m })));
  const bob = all.filter((m) => m.from === 'bob');
  // A wake (its text ends ": run status" or, the pin move's, ", then status", as job.mjs's bobWake writes it) asks BOB to run status: nothing to route.
  return all.filter((m) => m.to === 'bob' && !['root', 'bob', 'watcher'].includes(m.from) && !/(: run|, then) status$/.test(String(m.text))).filter((m) => {
    const id = new RegExp(`(^|[^\\w-])${m.from}-${m.n}(?!\\d)`);
    return !bob.some((b) => b.at >= m.at && id.test(b.text));
  });
}

// The address read from git at this moment: the session id, or null.
export function address(root, sb, role) {
  const t = readState(root, sb, addressFile(role));
  if (t === null) return null;
  try { const a = JSON.parse(t); return (typeof a === 'string' ? a : a?.session || a?.id) || null; } catch { return t.trim() || null; }
}

// The record first: no uncommitted change to a tracked file, and no commit the branch's upstream
// (or, without one, origin's branch of the same name) lacks. A detached HEAD has no record of its own.
// .process is left out: after a merge of the tranche that moved the pin it reads as changed until
// the submodule is updated, and a job never commits it (defect sweep 4 Nov, #2; the gate catches
// a committed pin change), so a BLOCKED job can still wake BOB.
function unpushed(root) {
  if (git(['status', '--porcelain', '--untracked-files=no', '--ignore-submodules=all'], { cwd: root })) fail('this checkout has uncommitted changes; commit and push the record first, then send');
  const name = git(['symbolic-ref', '-q', '--short', 'HEAD'], { cwd: root, allowFail: true }).stdout.trim();
  if (!name) return;
  git(['fetch', '-q', 'origin', `+refs/heads/${name}:refs/remotes/origin/${name}`], { cwd: root, allowFail: true });
  let up = git(['rev-list', '--count', '@{upstream}..HEAD'], { cwd: root, allowFail: true });
  if (up.code !== 0) up = git(['rev-list', '--count', `refs/remotes/origin/${name}..HEAD`], { cwd: root, allowFail: true });
  if (up.code !== 0) fail(`${name} is not on origin; push the record first, then send`);
  if (Number(up.stdout) > 0) fail(`${name} has ${Number(up.stdout)} commit(s) not pushed; push the record first, then send`);
}

// send: the record first (the caller's work pushed, then the numbered message pushed), then the
// message and the address, read from git after that push, for the session to deliver.
// ready, for a message to BOB: the count of startable jobs. When any, the text leads with their
// start, so BOB starts them on whatever wake comes first (coordinator, 4 Nov). A count that cannot
// be read leaves the text as it is: the wake is never held back for it.
export const READY_LEAD = (n) => `first: node .process/tool/p3.mjs job start --ready --live <n> (${n} job${n === 1 ? '' : 's'} ready). Then: `;
export function send(root, sb, { from, to, text, ready, log = console.log }) {
  roleName(from, '--from');
  roleName(to, 'the role sent to');
  if (typeof text !== 'string' || !text.trim()) fail('send <to-role> "<text>"');
  unpushed(root);
  if (typeof ready === 'function' && !/^first: \S+ \S+ job start --ready/.test(text.trim())) {
    let k = 0;
    try { k = Number(ready()) || 0; } catch { k = 0; }
    if (k > 0) text = READY_LEAD(k) + text.trim();
  }
  const { n } = writeState(root, sb, `message from ${from} to ${to}`, (wt) => {
    const file = join(wt, messagesFile(from));
    const k = messages(existsSync(file) ? readFileSync(file, 'utf8') : '').reduce((m, x) => Math.max(m, x.n), 0) + 1;
    put(wt, messagesFile(from), JSON.stringify({ at: now(), row: 'sent', n: k, to, text: text.trim() }) + '\n', true);
    return { n: k };
  });
  const at = address(root, sb, to);
  const body = `MSG ${from}-${n} to ${to}: ${text.trim()}\n(numbered; a number already seen is a duplicate, ignore it)`;
  log(body);
  log(at ? `address of ${to}: ${at}` : `no address for ${to} on ${sb}`);
  log(`deliver it with send_message, then: send delivered ${n} --from ${from} (or send failed ${n} --from ${from})`);
  return { n, body, address: at };
}

// send delivered <n> | send failed <n>: the outcome, recorded only for a message that was sent.
export function outcome(root, sb, { from, n, result, reason, log = console.log }) {
  roleName(from, '--from');
  if (!Number.isInteger(n) || n < 1) fail(`send ${result} <n>: the message's number`);
  writeState(root, sb, `message ${from}-${n} ${result}`, (wt) => {
    const file = join(wt, messagesFile(from));
    if (!messages(existsSync(file) ? readFileSync(file, 'utf8') : '').some((m) => m.n === n)) fail(`${from} sent no message ${n}`);
    put(wt, messagesFile(from), JSON.stringify({ at: now(), row: 'outcome', n, outcome: result, ...(reason ? { reason } : {}) }) + '\n', true);
  });
  log(`message ${from}-${n} recorded ${result}`);
}
