// Review triggers (Bob, 4 Nov, about 19:05: "start with two triggers, changes to security lists and
// deleted or loosened tests, and review before merge. Measure for a day or 2."). An audit of 10
// job pull requests on the copy found three judgement errors no test catches: PR 253 loosened a
// requirement-pinning test to pass its own wrong change, PR 174 deleted panel.test.mjs while
// panel.mjs stayed live, PR 95 dropped acts from REAUTH_ACTS. Each trigger is computed from the
// job's diff against its merge base alone; a job pull request that fires one merges only
// --reviewed (merge.mjs), and every merge row records what fired and what the review found.
//
// security: a change to a path the product lists in review_triggers.security_paths (its config,
//   read at the tranche; globs: ** any depth, * within one name, ? one character; a path without
//   them names a file or a directory). The product names its own files; none by default.
//   A file of a language read here (JS: .js, .mjs, .cjs) changed only in comments or whitespace
//   does not fire (review-trigger day-1 study, 5 Nov: copy PR 364 fired on a one-line comment in
//   agent-worker/src/signin.mjs): its code, comments stripped and each line's whitespace
//   collapsed, is the same at the base and the head. A change with any code in it, a file added
//   or deleted, any other language, or a file the stripper cannot read safely still fires.
// test (sharpened by the coordinator, 4 Nov 19:16, from the first 6 hand reviews): a test file of the
//   module (under its entry's tests, with its suite's suffix) deleted; or, in one that existed at
//   the base, a skip added (SKIP: test|it|describe.skip|todo|only( added), or a hunk that removes an
//   assertion line (ASSERT) and adds none. A hunk that replaces assertions with others does not fire.
//   ASSERT, the fixed forms: assert(...), assert.<x>(...), expect(...), and t.<x>(...) for the
//   node:test and tap methods listed.
import { git, underPath } from './util.mjs';

export const ASSERT = /\b(?:assert|expect)(?:\.\w+)*\s*\(|\bt\.(?:assert|equal|notEqual|strictEqual|deepEqual|deepStrictEqual|same|notSame|ok|notOk|true|false|match|throws|doesNotThrow|rejects|is|not|truthy|falsy)\s*\(/;
export const SKIP = /\b(?:test|it|describe)\.(?:skip|todo|only)\s*\(/;
export const ASSERT_RULE = 'assertion lines are those matching assert(, assert.<x>(, expect(, or t.<assert|equal|notEqual|strictEqual|deepEqual|deepStrictEqual|same|notSame|ok|notOk|true|false|match|throws|doesNotThrow|rejects|is|not|truthy|falsy>(, comments aside; a test file existing at the base fires on a hunk that removes an assertion line and adds none, or on an added test.skip, test.todo, .only or it.skip';
// The hunks a review brief carries, at most this many lines; past it the brief names the command.
export const HUNK_LINES = 400;

export function globRe(g) {
  const s = String(g).replace(/^\.\//, '');
  if (!/[*?]/.test(s)) return null;
  let re = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '*' && s[i + 1] === '*') { i++; if (s[i + 1] === '/') { i++; re += '(?:.*/)?'; } else re += '.*'; }
    else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}
export const matchPath = (f, g) => { const re = globRe(g); return re ? re.test(f) : underPath(f, String(g).replace(/^\.\//, '')); };

// The product's security paths, from a config (loadConfig); a malformed value lists none and says so.
export function securityPaths(cfg) {
  const v = cfg?.review_triggers?.security_paths;
  if (v === undefined || v === null) return { paths: [], set: false };
  if (!Array.isArray(v) || v.some((p) => typeof p !== 'string' || !p)) return { paths: [], set: false, bad: 'review_triggers.security_paths is not a list of paths' };
  return { paths: v, set: true };
}

// JS code with its comments taken out, each line trimmed with inner whitespace runs collapsed and
// blank lines dropped; null when it cannot be read safely (an unclosed comment, string or
// template; a comment opener on a line after a bare '/', which could be a regular expression's
// body). Line breaks are kept: in JS a line break can change the code (automatic semicolons), so
// a comment that held one leaves one, and joining or splitting lines is a code change.
export const COMMENT_LANGS = /\.(?:js|mjs|cjs)$/;
export function jsCode(text) {
  const s = String(text);
  let out = '';
  let i = 0;
  let slash = false; // a bare '/' earlier on this line: a regular expression may be open
  const stack = []; // template literal nesting: 'tpl' inside a template's text, a number inside ${...}
  while (i < s.length) {
    const c = s[i];
    const top = stack.at(-1);
    if (top === 'tpl') {
      if (c === '\\') { out += s.slice(i, i + 2); i += 2; continue; }
      if (c === '`') { stack.pop(); out += c; i++; continue; }
      if (c === '$' && s[i + 1] === '{') { stack.push(0); out += '${'; i += 2; continue; }
      out += c; i++; continue;
    }
    if (c === '\n') { slash = false; out += c; i++; continue; }
    if (c === '/' && (s[i + 1] === '/' || s[i + 1] === '*')) {
      if (slash) return null;
      if (s[i + 1] === '/') { const e = s.indexOf('\n', i); i = e < 0 ? s.length : e; continue; }
      const e = s.indexOf('*/', i + 2);
      if (e < 0) return null;
      out += s.slice(i, e).includes('\n') ? '\n' : ' ';
      i = e + 2; continue;
    }
    if (c === '/') { slash = true; out += c; i++; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < s.length && s[j] !== c && s[j] !== '\n') j += s[j] === '\\' ? 2 : 1;
      if (s[j] !== c) return null;
      out += s.slice(i, j + 1); i = j + 1; continue;
    }
    if (c === '`') { stack.push('tpl'); out += c; i++; continue; }
    if (typeof top === 'number') {
      if (c === '{') stack[stack.length - 1]++;
      else if (c === '}') { if (top === 0) { stack.pop(); out += c; i++; continue; } stack[stack.length - 1]--; }
    }
    out += c; i++;
  }
  if (stack.length) return null;
  return out.split('\n').map((l) => l.trim().replace(/\s+/g, ' ')).filter(Boolean).join('\n');
}
// Whether a security file changed from base to head in comments or whitespace only (see security above).
export function commentsOnly(root, base, head, f) {
  if (!COMMENT_LANGS.test(f)) return false;
  const show = (ref) => git(['show', `${ref}:${f}`], { cwd: root, allowFail: true });
  const a = show(base);
  const b = show(head);
  if (a.code !== 0 || b.code !== 0) return false;
  const x = jsCode(a.stdout);
  const y = jsCode(b.stdout);
  return x !== null && y !== null && x === y;
}

const isTest = (entry, f) => (entry?.tests || []).some((t) => underPath(f, String(t).replace(/^\.\//, ''))) && f.endsWith(entry?.suite?.test_suffix || '.test.mjs');
const isComment = (l) => /^\s*(?:\/\/|\/?\*)/.test(l);

// One file's -U0 diff, per hunk: removed and added assertion lines, and skips added.
// Returns { removed, added, skips, bare: hunks that remove an assertion and add none }.
export function assertCounts(diff) {
  const c = { removed: 0, added: 0, skips: 0, bare: 0 };
  let h = null;
  const end = () => { if (h && h.removed && !h.added) c.bare++; };
  for (const l of String(diff).split('\n')) {
    if (l.startsWith('---') || l.startsWith('+++')) continue;
    if (l.startsWith('@@')) { end(); h = { removed: 0, added: 0 }; continue; }
    if (l[0] !== '-' && l[0] !== '+') continue;
    const body = l.slice(1);
    if (isComment(body)) continue;
    if (l[0] === '+' && SKIP.test(body)) c.skips++;
    if (!ASSERT.test(body)) continue;
    h ||= { removed: 0, added: 0 };
    if (l[0] === '-') { c.removed++; h.removed++; } else { c.added++; h.added++; }
  }
  end();
  return c;
}

// The triggers a job's change fires: { fired: ['security'?, 'test'?], security: [files],
// deleted: [test files], loosened: [{ file, removed, added }], why, hunks (the diff text that
// fired them, for the review brief) }. base and head are revisions in root.
export function reviewTriggers(root, { base, head, entry, cfg }) {
  const sec = securityPaths(cfg);
  // -z, as every diff in the tool: git quotes a path with non-ASCII bytes otherwise (review of PR 125).
  const z = git(['diff', '--no-renames', '--name-status', '-z', base, head], { cwd: root }).split('\0');
  const status = [];
  for (let i = 0; i + 1 < z.length; i += 2) if (z[i]) status.push({ s: z[i][0], f: z[i + 1] });
  const touched = status.filter((x) => sec.paths.some((g) => matchPath(x.f, g)));
  const quiet = touched.filter((x) => x.s === 'M' && commentsOnly(root, base, head, x.f)).map((x) => x.f);
  const security = touched.map((x) => x.f).filter((f) => !quiet.includes(f));
  const deleted = status.filter((x) => x.s === 'D' && isTest(entry, x.f)).map((x) => x.f);
  const loosened = [];
  const diffs = {};
  for (const x of status.filter((y) => y.s === 'M' && isTest(entry, y.f))) {
    const d = git(['diff', '--no-renames', '-U0', base, head, '--', x.f], { cwd: root });
    const c = assertCounts(d);
    if (c.bare || c.skips) { loosened.push({ file: x.f, ...c }); diffs[x.f] = d; }
  }
  const fired = [...(security.length ? ['security'] : []), ...(deleted.length || loosened.length ? ['test'] : [])];
  const why = [
    ...(security.length ? [`security paths changed: ${security.slice(0, 5).join(', ')}${security.length > 5 ? ` and ${security.length - 5} more` : ''}`] : []),
    ...(deleted.length ? [`test files deleted: ${deleted.slice(0, 5).join(', ')}`] : []),
    ...loosened.slice(0, 5).map((l) => `${l.file}: ${[l.bare ? `${l.bare} hunk${l.bare > 1 ? 's' : ''} removing assertions and adding none` : '', l.skips ? `${l.skips} skip${l.skips > 1 ? 's' : ''} added` : ''].filter(Boolean).join(', ')}`),
  ].join('; ');
  const parts = [];
  if (security.length) parts.push(git(['diff', '--no-renames', '-U3', base, head, '--', ...security], { cwd: root }));
  if (deleted.length) parts.push(git(['diff', '--no-renames', '-U0', base, head, '--', ...deleted], { cwd: root }));
  for (const l of loosened) parts.push(diffs[l.file]);
  const all = parts.join('\n').split('\n');
  const hunks = all.length > HUNK_LINES ? [...all.slice(0, HUNK_LINES), `... ${all.length - HUNK_LINES} more lines: git diff ${String(base).slice(0, 10)} ${head} -- ${[...security, ...deleted, ...loosened.map((l) => l.file)].join(' ')}`].join('\n') : all.join('\n');
  return { fired, security, deleted, loosened, why, hunks, ...(quiet.length ? { comments_only: quiet } : {}), ...(sec.bad ? { bad: sec.bad } : {}), security_set: sec.set };
}

const num = (x) => typeof x === 'number' && Number.isFinite(x);
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r2 = (x) => Math.round(x * 100) / 100;

// The one report line (metrics report, report tranche), from merge rows, each pull request once.
// rejudged: the triggers rows a land wrote beside a merge row prepared under an older pin, or one
// whose triggers changed by the land (merge.mjs); the latest for a pull request is read over its row.
export function triggerSummary(merges, rejudged = []) {
  const later = new Map([...rejudged].filter((r) => r?.row === 'triggers' && Array.isArray(r.triggers)).sort((a, b) => String(a.at).localeCompare(String(b.at))).map((r) => [String(r.pr), r]));
  const rows = [...new Map(merges.map((r) => [String(r.pr), r])).values()].map((r) => (later.has(String(r.pr)) ? { ...r, triggers: later.get(String(r.pr)).triggers } : r));
  const rec = rows.filter((r) => Array.isArray(r.triggers));
  const kind = (k) => rec.filter((r) => r.triggers.includes(k)).length;
  const fired = rec.filter((r) => r.triggers.length).length;
  const reviews = rec.filter((r) => r.reviewed === true);
  const counted = reviews.filter((r) => num(r.findings));
  const findings = counted.reduce((t, r) => t + r.findings, 0);
  const acted = counted.reduce((t, r) => t + (num(r.findings_acted) ? r.findings_acted : 0), 0);
  const mins = reviews.map((r) => r.review_minutes).filter(num);
  const costs = reviews.map((r) => r.review_usd).filter(num);
  const s = {
    merged: rows.length,
    recorded: rec.length,
    triggered: fired,
    security: kind('security'),
    test: kind('test'),
    share: rec.length ? r2(fired / rec.length) : null,
    reviews: reviews.length,
    findings_per_review: counted.length ? r2(findings / counted.length) : null,
    findings_acted: acted,
    added_minutes_median: mins.length ? median(mins) : null,
    added_minutes_worst: mins.length ? Math.max(...mins) : null,
    review_usd: costs.length ? r2(costs.reduce((t, x) => t + x, 0)) : null,
    review_usd_unmeasured: reviews.length - costs.length,
  };
  const U = 'unmeasured';
  s.line = `review triggers: ${s.merged} job PRs merged${rec.length < rows.length ? ` (${rows.length - rec.length} before triggers were recorded)` : ''}; triggered ${fired} of ${rec.length}${s.share === null ? '' : ` (${Math.round(s.share * 100)}%)`}: security ${s.security}, test ${s.test}; reviews run ${s.reviews}; findings per review ${s.findings_per_review ?? U}; findings acted on ${acted}; added minutes to merge median ${s.added_minutes_median ?? U}, worst ${s.added_minutes_worst ?? U}; review cost ${s.review_usd === null ? U : `$${s.review_usd.toFixed(2)}`}${s.review_usd_unmeasured && costs.length ? ` (${s.review_usd_unmeasured} unmeasured)` : ''}`;
  return s;
}
