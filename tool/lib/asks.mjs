// What goes to Bob: the closed list of rulebooks/coordinator.md rule 1, and nothing else (Bob,
// 5 Nov 14:50: "You should know what I need to review - and nothing else."). Measured: a merge-train
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
// "BOB'S WORDS" and "BOB'S DECISIONS" headings (a line opening so) mixed his words with paraphrase (cause 3).
const MIXED = /^(?:[-*] )?(?:BOB'S (?:WORDS?|DECISIONS?)|Bob's (?:words?|decisions?))\b/;
const VERBATIM = /^(?:[-*] )?BOB \(verbatim\)/i;
// A verbatim line: an optional time, then only his words in quotation marks, parts joined by " ... ".
// A month or "UTC" may name the time; any other word before the quote is a paraphrase.
const QUOTED = /^(?:[-*] )?(?:[\d\s:,~.()-]|about|UTC|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b)*["“][^"“”]*["”](?: \.\.\. ["“][^"“”]*["”])*\.?$/;
const quoted = (line) => QUOTED.test(line.replace(VERBATIM, ''));

// Findings for a handoff or findings text (coordinator rule 2 and rule 1): each { line, n, why }.
// Under a "BOB (verbatim)" heading, each line that follows, to a blank line or the next heading, is his words in quotes.
export function askFindings(text) {
  const out = [];
  let under = false;
  String(text).split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line) { under = false; return; }
    if (VERBATIM.test(line)) {
      const rest = line.replace(VERBATIM, '').replace(/^[:\s]+$/, '');
      if (!rest) { under = true; return; }
      under = false;
      if (!quoted(line)) out.push({ n: i + 1, line, why: 'a BOB (verbatim) line holds only his words in quotation marks; a paraphrase or consequence is a separate line marked as the coordinator\'s (coordinator rule 2)' });
      return;
    }
    // Under the heading, every line to the next blank one is his quoted words; an upper-case
    // heading or a line marked as the coordinator's ends it (review 1: notes have no "- ").
    if (under && !/^(?:[A-Z0-9 '()&/-]+:?|Coordinator(?:'s)?\b.*)$/.test(line)) {
      if (!quoted(line)) out.push({ n: i + 1, line, why: 'under BOB (verbatim), only his words in quotation marks (coordinator rule 2)' });
      return;
    }
    under = false;
    if (MIXED.test(line)) out.push({ n: i + 1, line, why: 'his words go under BOB (verbatim), in quotation marks; the coordinator\'s reading is its own line (coordinator rule 2)' });
    // A phrase in quotation marks is cited, not routed (this sweep's own table quotes them).
    else if (routesToBob(line.replace(/["“][^"“”]*["”]/g, '""')) && !bobClass(line)) out.push({ n: i + 1, line, why: `${NOT_BOBS}; an item for Bob names "rule 1 (a)".."(d)"` });
  });
  return out;
}

// handoff --check <file>...: each finding as file:line, then a count; 0 when none (coordinator rule 2).
export function handoffCheck(files, { read = (f) => readFileSync(f, 'utf8'), log = console.log } = {}) {
  if (!files.length) fail('handoff --check needs a file');
  let n = 0;
  for (const f of files) for (const x of askFindings(read(f))) { n++; log(`${f}:${x.n}: ${x.why}: ${x.line.slice(0, 120)}`); }
  log(n ? `${n} line${n === 1 ? '' : 's'} to rewrite` : 'nothing routed to Bob off the list; his words verbatim');
  return n ? 1 : 0;
}
