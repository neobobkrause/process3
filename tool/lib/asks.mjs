// What goes to Bob: the closed list of rulebooks/coordinator.md rule 1, and nothing else (Bob,
// 5 Nov: he named what he reviews and nothing else). Measured: a merge-train
// fix carried ~9 h as "Bob's, asked, no answer" because a proposal of his was recorded as a
// reservation, and lists headed "STILL BOB'S" were copied forward through four handoffs.
//
// An item goes to Bob only when it names its class: "(a)".."(d)" opening a block reason, or
// "rule 1 (a)".."rule 1 (d)" in a prose line. Anything else is the coordinator's to decide.
import { readFileSync } from 'node:fs';
import { fail } from './util.mjs';

export const BOB_LIST = {
  a: 'an act his approvals reserve to him or forbid to sessions',
  b: 'his credentials or keys',
  c: 'a missing or contradictory product requirement',
  d: 'his account or subscription',
};
export const NOT_BOBS = "decide it: not Bob's (coordinator rule 1)";
const LIST_TEXT = Object.entries(BOB_LIST).map(([k, v]) => `(${k}) ${v}`).join(', ');

// The class an item names, with a reason after it, or null.
export function bobClass(text) {
  const s = String(text || '');
  // Also "Bob: (c) ...", as status prints a ruling owed by Bob (review 1).
  const m = s.match(/^\(([a-d])\)\s*(\S.*)?$/s) || s.match(/\brule 1 \(([a-d])\)\s*:?\s*(\S.*)?$/s) || s.match(/\bBob: \(([a-d])\)\s*(\S.*)?$/s);
  return m && m[2] && m[2].trim() ? m[1] : null;
}
export const listHelp = () => `${NOT_BOBS}: Bob's only with a reason opening (a), (b), (c) or (d): ${LIST_TEXT}`;

// A line that routes an item to Bob (person, "Bob"; the session role is "BOB"), as the
// handoffs of 4-5 Nov wrote them; the upper-case headings are those handoffs' own.
const ROUTES = /(?<!\b(?:[Nn]ever|[Nn]ot|[Nn]o|don't) )\b(?:(?:study|question|decision|item|items|ruleset|list|answer) for Bob\b|[Ss]till Bob's|STILL BOB'S|BOB ASKED|[Aa]sk(?:ed|ing)? Bob\b|[Ww]ait(?:s|ing)? (?:on|for) Bob\b|[Aa]waits? Bob\b|[Uu]ntil Bob\b|[Oo]wed by Bob\b|(?:[Rr]evisit|[Cc]heck|[Cc]onfirm|[Rr]aise) (?:it )?with Bob\b|Bob's (?:queue|call|list|item|question|to (?:decide|answer|rule|read|review)))/;
// "FOR BOB" only as a line's heading; a report line "for Bob" is what the rules ask (review 1).
const ROUTES_HEAD = /^(?:[-*] )?FOR BOB\b/;
export const routesToBob = (line) => ROUTES.test(String(line)) || ROUTES_HEAD.test(String(line).trim());
// His words are folded into the principle they belong to, rewritten in place and cited by date,
// never carried as quotes or a log of rulings (coordinator rule 2; Bob, 5 Nov: a refresh rewrites
// what the retiring session was told, and a growing file of his words is skimmed). Refused: a
// "BOB'S WORDS" or "BOB (verbatim)" heading, and a quotation attributed to him.
const MIXED = /^(?:[-*] )?(?:BOB'S (?:WORDS?|DECISIONS?)|Bob's (?:words?|decisions?)\b|BOB \(verbatim\))/i;
// Attributed: "Bob", "Bob's word(s)" or "Bob said", then only a time, then the quotation.
const QUOTES_BOB = /\bBob(?:'s (?:words?|decisions?)| said| wrote)?[,:]?(?: (?:~|about )?\d{1,2}(?::\d{2})?(?: [A-Z][a-z]{2})?)*(?:[,:] ?| )["“]/;
const RESTATED = 'his words are not carried as quotes: fold the point into the rulebook principle it belongs to, rewritten in place, and cite it by date, as (Bob, 5 Nov) (coordinator rule 2)';
// A handoff carries no rules: they live in rulebooks (coordinator rule 3; Bob, 5 Nov).
const RULE = /^(?:[-*] |\d+\. )?(?:[Nn]ever|[Aa]lways|[Dd]o not|[Dd]on't)\b|\bRULES?\b|\bHOW TO WORK\b/;
const NO_RULES = 'a handoff carries no rules: they live in rulebooks/coordinator.md and the role rulebooks (coordinator rule 3)';

// Findings for a handoff's text (coordinator rules 1 to 3): each { line, n, why }.
export function askFindings(text) {
  const out = [];
  String(text).split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    // A phrase in quotation marks is cited, not routed (the sweep's own table quotes them).
    const bare = line.replace(/["“][^"“”]*["”]/g, '""');
    const why = MIXED.test(line) || QUOTES_BOB.test(line) ? RESTATED
      : RULE.test(bare) ? NO_RULES
        : routesToBob(bare) && !bobClass(line) ? `${NOT_BOBS}; an item for Bob names "rule 1 (a)".."(d)"` : null;
    if (why) out.push({ n: i + 1, line, why });
  });
  return out;
}

// handoff --check <file>...: each finding as file:line, then a count; 0 when none (coordinator rules 1 to 3).
export function handoffCheck(files, { read = (f) => readFileSync(f, 'utf8'), log = console.log } = {}) {
  if (!files.length) fail('handoff --check needs a file');
  let n = 0;
  for (const f of files) for (const x of askFindings(read(f))) { n++; log(`${f}:${x.n}: ${x.why}: ${x.line.slice(0, 120)}`); }
  log(n ? `${n} line${n === 1 ? '' : 's'} to rewrite` : 'no rules, no restated words, nothing routed to Bob off the list');
  return n ? 1 : 0;
}

// The coordinator's handoff page (coordinator rule 3; Bob, 5 Nov: handoffs drift like the
// game of telegraph): generated from the record, never written by hand. It carries pointers, the
// open sessions and scheduled tasks from list_sessions and list_triggers saved as JSON, and at most
// ten in-flight acts, each held to askFindings; no rules, no paraphrase, none of his words.
export const MAX_ACTS = 10;
const listOf = (j, keys) => (Array.isArray(j) ? j : keys.map((k) => k.split('.').reduce((o, x) => o?.[x], j)).find(Array.isArray)) || null;
function readList(file, what, keys, read) {
  let j;
  try { j = JSON.parse(read(file)); } catch (e) { fail(`--${what} ${file}: not a readable JSON file (${e.message})`); }
  const l = listOf(j, keys);
  if (!l) fail(`--${what} ${file}: no list in it (a JSON list, or one under ${keys.join(', ')})`);
  return l;
}
const one = (x) => String(x ?? '').replace(/\s+/g, ' ').trim();
export function coordinatorPage({ from, tranche, sessions, tasks, acts = [], at = new Date().toISOString(), read = (f) => readFileSync(f, 'utf8') }) {
  if (acts.length > MAX_ACTS) fail(`at most ${MAX_ACTS} in-flight acts`);
  const bad = askFindings(acts.map(one).join('\n'));
  if (bad.length) fail(`an act is refused: ${bad.map((x) => `"${x.line.slice(0, 80)}": ${x.why}`).join('; ')}`);
  const L = [`# Coordinator handoff, ${at}${from ? `, from ${from}` : ''}`,
    'Generated by `p3 handoff --role coordinator`; it carries no rules, no paraphrase and none of his words.',
    'Rules: rulebooks/coordinator.md first, then the role rulebooks; what Bob has said lives there, cited by date.',
    `process3 tranche: ${tranche || 'unread'}`];
  if (sessions) {
    const open = readList(sessions, 'sessions', ['data', 'ccr.data', 'sessions'], read).filter((x) => one(x.session_status || x.status).toLowerCase() !== 'archived');
    L.push('', `open sessions (${open.length}):`, ...open.map((x) => `- ${x.id} ${one(x.title) || '(untitled)'}: ${one(x.session_status || x.status) || 'unknown'}${x.status_bucket ? `, ${x.status_bucket}` : ''}`));
  } else L.push('', 'open sessions: not given (save list_sessions as JSON and pass --sessions)');
  if (tasks) {
    const on = readList(tasks, 'tasks', ['triggers', 'data'], read).filter((x) => x.enabled !== false);
    L.push('', `scheduled tasks (${on.length}):`, ...on.map((x) => `- ${x.id} ${one(x.name)}: ${x.cron_expression ? `cron ${x.cron_expression}` : x.run_once_at ? `once ${x.run_once_at}` : 'no schedule'}${x.next_run_at ? `, next ${x.next_run_at}` : ''}`));
  } else L.push('', 'scheduled tasks: not given (save list_triggers as JSON and pass --tasks)');
  L.push('', `in flight (${acts.length}):`, ...acts.map((a) => `- ${one(a)}`));
  return L.join('\n') + '\n';
}
