// Stale records found and cleared by the process (R13; Bob, 6 Nov: "fix process3 to anticipate and
// address these kinds of situations"). staleRecords lists every recorded state whose end
// condition holds or whose referent is gone (ends.mjs keeps the inventory); expireRecords ends,
// with a row naming the condition, each one the tool can end on its own: a hold whose condition
// is met, a lane seat whose session is gone. The rest are reported, each with what ends it.
// Nothing here prints a command for a person to type: the tool's next write ends what it can.
import { BY_TOOL, expireHolds, readHolds } from './hold.mjs';
import { LANE_SESSIONS_FILE, lanes, openAsks, readSeats, seatsOf } from './lane.mjs';
import { readFacts } from './ends.mjs';
import { addressFile, jsonl, readState, writeState } from './state.mjs';
import { now } from './util.mjs';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROLES = ['root', 'bob', 'watcher', 'merger', 'coordinator'];

// [{ kind, id, why, auto }]: auto, the tool ends it at its next write; else reported only.
// listed: list_sessions' result, or null (session conditions unknown, nothing said of them).
export function staleRecords(root, cfg, { listed = null, t = Date.now(), facts, holds: given } = {}) {
  const f = facts ?? readFacts(root, cfg, { listed, t });
  const out = [];
  const sb = cfg.state_branch;
  // Holds: a condition met (auto); a live one whose words give no checkable end (reported once:
  // it holds until its --until time or its pull requests).
  let holds = [];
  try { holds = given ?? readHolds(root, sb, { offline: true, t, facts: f }); } catch { holds = []; }
  for (const h of holds) {
    if (h.met && !h.ended && h.left > 0) out.push({ kind: 'hold', id: h.id, why: `${h.scope}: ${h.met.why}${h.conds_from === 'words' ? ' (read from its words)' : ''}`, auto: true });
    else if (h.live && !h.conds.length && !(h.prs || []).length && /\buntil\b|\bwhen\b|\bonce\b|\bafter\b/i.test(h.why)) out.push({ kind: 'hold', id: h.id, why: `${h.scope}: its words name an end the tool cannot check (${h.unparsed}); it holds until ${h.until || 'ended'}`, auto: false });
  }
  // Lane seats whose session is gone (auto), and asks of a lane no longer configured (reported).
  let seats = new Map();
  try { seats = readSeats(root, cfg); } catch { seats = new Map(); }
  for (const s of seats.values()) {
    if (s.session && f.sessionGone(s.session) === true) out.push({ kind: 'lane seat', id: s.lane, why: `its session ${s.session} is archived`, auto: true, seat: s });
  }
  let names = null;
  try { names = new Set(lanes(cfg).map((l) => l.name)); } catch { names = null; }
  if (names) {
    let asks = [];
    try { asks = openAsks(root, cfg); } catch { asks = []; }
    for (const a of asks) if (!names.has(a.lane)) out.push({ kind: 'lane ask', id: `${a.lane}: ${String(a.question).slice(0, 60)}`, why: `lane ${a.lane} is no longer in the config; a recorded decision (lane ask --record) or the lane's return ends it`, auto: false });
  }
  // Role addresses and the config's coordinator whose session is gone (reported: a role's next
  // session is named by handover or address, the config by a pull request).
  for (const role of ROLES) {
    let a = null;
    try { a = JSON.parse(readState(root, sb, addressFile(role)) || 'null'); } catch { a = null; }
    if (a?.session && f.sessionGone(a.session) === true) out.push({ kind: 'address', id: role, why: `${role}'s address names ${a.session}, which is archived`, auto: false });
  }
  if (typeof cfg.coordinator === 'string' && f.sessionGone(cfg.coordinator) === true) out.push({ kind: 'config', id: 'coordinator', why: `process/config.json names the coordinator ${cfg.coordinator}, which is archived`, auto: false });
  return out;
}

export const staleLines = (xs) => (xs.length ? [`stale records: ${xs.length} (${xs.filter((x) => x.auto).length} the tool ends at its next write)`, ...xs.map((x) => `- ${x.kind} ${x.id}: ${x.why}${x.auto ? '; the tool ends it' : ''}`)] : []);

// Ends what the tool can: holds whose condition is met (hold.mjs expireHolds) and lane seats whose
// session is gone (an end row by process3, naming why). Returns { holds, seats }; a write that
// fails is said, never a refusal of the act that ran it.
export function expireRecords(root, cfg, { listed = null, log = console.log, t = Date.now() } = {}) {
  const sb = cfg.state_branch;
  const out = { holds: [], seats: [] };
  let f = null;
  try { f = readFacts(root, cfg, { listed, t }); } catch { f = null; }
  if (!f) return out;
  try { out.holds = expireHolds(root, sb, { facts: f, log, t }); } catch (e) { log(`holds whose condition is met were not ended (${String(e.message).split('\n')[0].slice(0, 160)}); the next write tries again`); }
  if (listed) {
    let seats = [];
    try { seats = [...readSeats(root, cfg).values()].filter((s) => s.session && f.sessionGone(s.session) === true); } catch { seats = []; }
    if (seats.length) {
      try {
        writeState(root, sb, `lane seats ended: ${seats.map((s) => s.lane).join(', ')} (session gone)`, (wt) => {
          const live = seatsNow(wt);
          for (const s of seats) {
            const now0 = live.get(s.lane);
            if ((now0?.session || null) !== s.session || (now0?.at || null) !== (s.at || null)) continue;
            const p = join(wt, LANE_SESSIONS_FILE);
            mkdirSync(dirname(p), { recursive: true });
            appendFileSync(p, JSON.stringify({ row: 'end', at: now(), lane: s.lane, session: s.session, by: BY_TOOL, why: `session_gone:${s.session} met (archived)` }) + '\n');
          }
          return {};
        });
        for (const s of seats) log(`lane ${s.lane}: its seat ended by the tool (session ${s.session} is archived); lane start ${s.lane} starts the next when there is work`);
        out.seats = seats.map((s) => s.lane);
      } catch (e) { log(`lane seats whose session is gone were not ended (${String(e.message).split('\n')[0].slice(0, 160)})`); }
    }
  }
  return out;
}
// The seats as the state worktree holds them now (a concurrent write is not undone).
const seatsNow = (wt) => seatsOf(existsSync(join(wt, LANE_SESSIONS_FILE)) ? jsonl(readFileSync(join(wt, LANE_SESSIONS_FILE), 'utf8')) : []);
