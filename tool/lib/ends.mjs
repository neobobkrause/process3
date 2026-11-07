// Self-ending records (R13; Bob, 6 Nov, about 17:00Z: "Go with option 2, fix it in the tool, not
// just for this case, but fix process3 to anticipate and address these kinds of situations").
// The case: holds hold-19 to hold-22, set "until layer 6 closes … ends when the coordinator says",
// went on holding after layer 6 closed, and ending them by hand (`p3 hold --end`) was refused by
// the session permission judge as weakening security. The rule (Foundations, Bob's, 6 Nov):
// recorded state carries a checkable end condition, the tool ends it when the condition holds,
// and stale state is found and cleared by the process, not by hand.
//
// A condition is one of (the string form, as --when takes it, and the row's object form):
//   layer_closed:<n>      layer n is closed (layers/closed.jsonl on the state branch, this
//                         tranche) or merged (layerflow/<n>/merged.json);
//   layer_open:<n>        layer n is open (layerflow/<n>/open.json) or already closed;
//   pr_merged:<n>         pull request n landed on the tranche (its first-parent merges);
//   module_complete:<id>  the module's ledger entry on the tranche is COMPLETE;
//   session_gone:<id>     the session is archived in list_sessions' result (only where the
//                         caller passes the list; an id the list does not hold is unknown);
//   at:<ISO time>         the time has passed.
// A record holds a list of them, any of which ends it. Each check answers met (true), not met
// (false) or unknown (null: its fact could not be read); only met ends a record.
//
// The inventory of recorded state that carries a condition or can go stale (state branch unless
// said), and how each ends (notes/records-inventory.md keeps the table):
//   holds (holds/holds.jsonl)            --prs, --until, --when: ENDED BY THE TOOL here; old
//                                        free-text rows read through fromText;
//   starts owed (flow/owed.json)         paid by the module's land on its layer (layer land),
//                                        by the tool already;
//   reschedules (layerflow/<n>)          answered by the user's land holding the provider's land,
//                                        by the tool already (layerflow outstanding);
//   layer events (layerflow/<n>)         open ends at merged, by the tool already;
//   lane seats (lanes/sessions.jsonl)    session_gone: ENDED BY THE TOOL at the sweep, which
//                                        reads list_sessions;
//   lane asks (lanes/asks.jsonl)         a recorded decision ends it (lane ask --record); STALE
//                                        when its lane is no longer configured: reported;
//   triage owed (notices/triage/owed)    triage recorded ends it, by the tool already;
//   role addresses (addresses/*.json)    session_gone: REPORTED (a role's address changes only
//                                        by handover or address, which name the next session);
//   config ids (coordinator)             session_gone: REPORTED (config changes by pull request);
//   BLOCKED marks (ledger)               a person's ruling: no condition the tool can check;
//                                        reported with their age by status already;
//   merger lease, in flight, plain queue the train's (being removed): time-limited already.
import { jsonl, readState } from './state.mjs';
import { git } from './util.mjs';

export const KINDS = ['layer_closed', 'layer_open', 'pr_merged', 'module_complete', 'session_gone', 'at'];
const SHAPE = {
  layer_closed: /^\d+$/, layer_open: /^\d+$/, pr_merged: /^[1-9]\d*$/,
  module_complete: /^[A-Za-z0-9._-]+$/, session_gone: /^session_[A-Za-z0-9]+$/, at: /^\d{4}-\d\d-\d\dT[\d:.]+Z$/,
};

// "layer_closed:6" -> { layer_closed: 6 }; throws a plain Error naming the form when it is not one.
export function parseCondition(s) {
  const m = String(s ?? '').trim().match(/^([a-z_]+):(.+)$/);
  if (!m || !KINDS.includes(m[1]) || !SHAPE[m[1]].test(m[2]) || (m[1] === 'at' && !Number.isFinite(Date.parse(m[2])))) {
    throw new Error(`${JSON.stringify(s)} is not a condition: ${KINDS.map((k) => `${k}:<${k === 'at' ? 'ISO time' : k.endsWith('gone') ? 'session id' : k === 'module_complete' ? 'module' : 'n'}>`).join(', ')}`);
  }
  return { [m[1]]: /^(layer_|pr_)/.test(m[1]) ? Number(m[2]) : m[2] };
}
export const parseConditions = (s) => String(s ?? '').split(',').map((x) => x.trim()).filter(Boolean).map(parseCondition);
export const condText = (c) => Object.entries(c).map(([k, v]) => `${k}:${v}`).join('');

// An old row's free-text end (the migration), read only where the words are the plain phrase and
// nothing else bears on the end: each ';'-clause is "until layer <n> closes" (or "opens"),
// optionally "start only layer <n> work" after it, optionally one parenthesis, and optionally a
// "<who> <date> <time>:" prefix; the only other clause allowed is "ends when the coordinator
// says", which the owner set aside for these holds (Bob, 6 Nov: the tool ends them). Anything
// else ("and", "unless", "after", a second condition, another sentence) is refused, with why.
// { conds } or { unparsed }.
const PREFIX = String.raw`(?:[A-Za-z][\w ,()-]*? \d{1,2} [A-Z][a-z]{2} \d{1,2}:\d{2}: )?`;
const PLAIN = new RegExp(String.raw`^${PREFIX}until layer (\d+) (closes|opens)(?: start only layer \1 work)?(?: \([^()]*\))?$`, 'i');
const SET_ASIDE = /^ends when the coordinator says$/i;
export function fromText(text) {
  const clauses = String(text ?? '').split(';').map((c) => c.trim()).filter(Boolean);
  const hits = clauses.map((c) => c.match(PLAIN));
  const conds = hits.filter(Boolean).map((m) => (m[2].toLowerCase() === 'closes' ? { layer_closed: Number(m[1]) } : { layer_open: Number(m[1]) }));
  if (!/\buntil layer \d+ (?:closes|opens)\b/i.test(String(text ?? ''))) return { unparsed: 'no "until layer <n> closes" or "opens" in its words' };
  if (conds.length !== 1) return { unparsed: conds.length ? 'more than one condition in its words' : 'its "until layer <n>" clause says more than the plain phrase' };
  const other = clauses.filter((c, i) => !hits[i] && !SET_ASIDE.test(c));
  if (other.length) return { unparsed: `its words say more than the condition ("${other[0].slice(0, 60)}")` };
  return { conds };
}

// The tranche's first-parent merges by pull request number (merge, merge --plain and GitHub's
// titles), shared with hold.mjs.
export const LANDED = /^Merge (?:job PR |PR |pull request #)(\d+)\b/;

// The facts the checks read, from this clone: the state branch (as fetched), the tranche, main and
// the ledger, each read once. A layer row counts for this tranche only when it names this
// tranche and its commit is not on main (the tranche branch keeps its name from tranche to
// tranche; status.mjs closedRows reads closes the same way); a row whose commit this clone cannot
// place is unknown, never met. listed: list_sessions' result (an array), or null (unknown).
export function readFacts(root, cfg, { listed = null, t = Date.now(), landed } = {}) {
  const sb = cfg.state_branch;
  const tr = `origin/${cfg.tranche}`;
  const hasMain = git(['rev-parse', '-q', '--verify', 'refs/remotes/origin/main'], { cwd: root, allowFail: true }).code === 0;
  const onMain = (c) => {
    if (!c || !/^[0-9a-f]{7,64}$/.test(String(c))) return null;
    if (!hasMain) return null;
    const r = git(['merge-base', '--is-ancestor', c, 'refs/remotes/origin/main'], { cwd: root, allowFail: true });
    return r.code === 0 ? true : r.code === 1 ? false : null;
  };
  // This tranche's row: true, false (another tranche's), or null (cannot tell).
  const ours = (row, commit) => {
    if (!row || (row.tranche && row.tranche !== cfg.tranche)) return false;
    const m = onMain(commit);
    return m === null ? null : !m;
  };
  let closedRows = null;
  try { closedRows = jsonl(readState(root, sb, 'layers/closed.jsonl')).filter((r) => r.row === 'closed'); } catch { closedRows = null; }
  const flowCache = new Map();
  const flow = (n, kind) => {
    const k = `${n}/${kind}`;
    if (!flowCache.has(k)) {
      let v;
      try { const x = readState(root, sb, `layerflow/${n}/${kind}.json`); v = x === null ? undefined : JSON.parse(x); } catch { v = null; }
      flowCache.set(k, v);
    }
    return flowCache.get(k);
  };
  // Any of the rows for layer n met (true), else unknown if any could not be told (null), else false.
  const anyOurs = (pairs) => { let unk = false; for (const [row, c] of pairs) { const o = ours(row, c); if (o === true) return true; if (o === null) unk = true; } return unk ? null : false; };
  const layerClosed = (n) => {
    if (closedRows === null) return null;
    const m = flow(n, 'merged');
    if (m === null) return null;
    return anyOurs([...closedRows.filter((r) => Number(r.layer) === n).map((r) => [r, r.commit]), ...(m ? [[m, m.commit]] : [])]);
  };
  const layerOpen = (n) => {
    const o = flow(n, 'open');
    if (o === null) return null;
    const open = o ? ours(o, o.from) : false;
    if (open === true) return true;
    const c = layerClosed(n);
    return c === true ? true : open === null || c === null ? null : false;
  };
  let entries = null;
  const entry = (id) => {
    if (entries === null) entries = new Map();
    if (!entries.has(id)) {
      const r = git(['show', `${tr}:process/ledger/${id}.json`], { cwd: root, allowFail: true });
      let v = null;
      try { v = r.code === 0 ? JSON.parse(r.stdout) : undefined; } catch { v = null; }
      entries.set(id, v);
    }
    return entries.get(id);
  };
  let land = landed;
  const lands = () => {
    if (land === undefined) {
      const r = git(['log', '--first-parent', '--format=%s', tr], { cwd: root, allowFail: true });
      land = r.code === 0 ? new Set(r.stdout.split('\n').map((x) => x.match(LANDED)?.[1]).filter(Boolean).map(Number)) : null;
    }
    return land;
  };
  const sessions = Array.isArray(listed) ? new Map(listed.map((x) => [x.id, x])) : null;
  // The old account's sessions an account switch retired (switch.mjs RETIRED_FILE): gone, list or
  // no list, since the new account's list_sessions never holds them (R16).
  let retired = new Set();
  try { retired = new Set(JSON.parse(readState(root, sb, 'switch/retired.json') || '{}').sessions || []); } catch { retired = new Set(); }
  const archived = (x) => String(x.session_status || x.status || '').toLowerCase().replace(/^session_status_/, '') === 'archived';
  return {
    t,
    layerClosed,
    layerOpen,
    prMerged: (n) => { const l = lands(); return l === null ? null : l.has(n); },
    moduleComplete: (id) => { const e = entry(id); return e === null ? null : e === undefined ? false : e.status?.state === 'COMPLETE'; },
    // Archived in the list. A session the list does not hold is unknown, not gone: list_sessions
    // pages, and a short list is no proof an id is gone.
    sessionGone: (id) => { if (retired.has(id)) return true; if (!sessions) return null; const x = sessions.get(id); return x ? archived(x) : null; },
  };
}

// One condition against the facts: { met: true | false | null, why }.
export function checkCondition(c, f) {
  const [k, v] = Object.entries(c)[0] || [];
  const r = (met, why) => ({ met, why: `${k}:${v} ${met === true ? 'met' : met === false ? 'not met' : 'unknown'}${why ? ` (${why})` : ''}` });
  switch (k) {
    case 'layer_closed': return r(f.layerClosed(v));
    case 'layer_open': return r(f.layerOpen(v));
    case 'pr_merged': return r(f.prMerged(v));
    case 'module_complete': return r(f.moduleComplete(v));
    case 'session_gone': return r(f.sessionGone(v), f.sessionGone(v) === null ? 'no session list read' : '');
    case 'at': return r(f.t >= Date.parse(v));
    default: return { met: null, why: `${JSON.stringify(c)} is not a condition` };
  }
}
// The first met condition of a list, or null.
export const firstMet = (conds, f) => (conds || []).map((c) => ({ c, ...checkCondition(c, f) })).find((x) => x.met === true) || null;
