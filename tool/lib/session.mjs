// The session record (build I, 3 Nov): what the tool can read about the Claude Code session it
// runs in, from Claude Code's own transcript (~/.claude/projects/<dir>/<session id>.jsonl) and
// `claude --version`. Every figure it cannot read is 'unmeasured', never a guess.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { run } from './util.mjs';

export const UNMEASURED = 'unmeasured';

// The transcript file of the session named by CLAUDE_CODE_SESSION_ID, or null.
export function sessionFile({ env = process.env, home = homedir() } = {}) {
  const id = env.CLAUDE_CODE_SESSION_ID;
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
  const dir = join(home, '.claude', 'projects');
  let subs = [];
  try { subs = readdirSync(dir); } catch { return null; }
  for (const s of subs) {
    const f = join(dir, s, `${id}.jsonl`);
    if (existsSync(f)) return f;
  }
  return null;
}

// The session's figures from its transcript: { session, version, started, last, minutes, tokens,
// cost_usd }, each 'unmeasured' when the record does not hold it; null when there is no record.
// A message's usage is counted once, however many lines carry it. Cost counts only when the
// record states it (costUSD); the transcript of a cloud session states none today.
export function sessionRecord({ env = process.env, home = homedir(), file = sessionFile({ env, home }) } = {}) {
  if (!file) return null;
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { return null; }
  let first = null;
  let last = null;
  let version = null;
  let tokens = 0;
  let counted = false;
  let cost = 0;
  let costed = false;
  const seen = new Set();
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    if (!r || typeof r !== 'object') continue;
    const t = Date.parse(r.timestamp);
    if (Number.isFinite(t)) { if (first === null || t < first) first = t; if (last === null || t > last) last = t; }
    if (typeof r.version === 'string' && r.version) version = r.version;
    if (typeof r.costUSD === 'number' && Number.isFinite(r.costUSD)) { cost += r.costUSD; costed = true; }
    const u = r.message?.usage;
    const key = r.message?.id || r.uuid;
    if (u && typeof u === 'object' && !(key && seen.has(key))) {
      if (key) seen.add(key);
      for (const k of ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens']) {
        if (typeof u[k] === 'number') { tokens += u[k]; counted = true; }
      }
    }
  }
  return {
    session: env.CLAUDE_CODE_SESSION_ID || UNMEASURED,
    version: version || UNMEASURED,
    started: first === null ? UNMEASURED : new Date(first).toISOString(),
    last: last === null ? UNMEASURED : new Date(last).toISOString(),
    minutes: first === null ? UNMEASURED : Math.round((last - first) / 60000),
    tokens: counted ? tokens : UNMEASURED,
    cost_usd: costed ? Math.round(cost * 10000) / 10000 : UNMEASURED,
  };
}

// The Claude Code version: `claude --version` ("2.1.316 (Claude Code)"), else the session
// record's, else 'unmeasured'.
export function claudeVersion({ exec = (c, a) => run(c, a, { timeout: 15000 }), record = () => sessionRecord() } = {}) {
  const r = exec('claude', ['--version']);
  const m = r?.code === 0 ? String(r.stdout).match(/\d+\.\d+\.\d+[\w.-]*/) : null;
  if (m) return m[0];
  const v = record()?.version;
  return v && v !== UNMEASURED ? v : UNMEASURED;
}
