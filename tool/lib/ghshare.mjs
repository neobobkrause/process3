// The account-wide GitHub budget's shared store (R17, pace.mjs useShared): the state branch, the
// one place every session of the account already reads and writes, so no new service and no new
// credential. On it:
//   github/pause.json        the pause every session obeys (written at once, never coalesced: the
//                            other sessions must stop calling before their next call);
//   github/use/<session>.jsonl  each session's calls a minute ({ session, minute, calls, points,
//                            content, pushes }), appended with the command's one state push, and
//                            at least every pacing.share_s (300 s) while it makes gh calls.
// Read at most every READ_S per process; another session's use is up to one command or share_s
// late, which the target's margin (10 to 20% of each limit) covers. GitHub's own count stands in
// for the primary limit (pace.mjs primaryState), so only the secondary windows rest on this.
import { join } from 'node:path';
import { existsSync, readFileSync, rmSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { fetchState, readState, unbatched, writeState } from './state.mjs';
import { git } from './util.mjs';
import { pacing, sessionId, usageRows } from './pace.mjs';

export const PAUSE_FILE = 'github/pause.json';
export const USE_DIR = 'github/use';
export const READ_S = 30;
const MARK = 'p3-gh-shared-to';
const safe = (s) => String(s || 'no-session').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);

export function stateShare(root, cfg, { now = Date.now } = {}) {
  const sb = cfg.state_branch;
  let cache = null;
  const load = () => {
    try { fetchState(root, sb, { fresh: true }); } catch { /* read what the clone has */ }
    let pause = null;
    try { pause = JSON.parse(readState(root, sb, PAUSE_FILE) || 'null'); } catch { pause = null; }
    const files = git(['ls-tree', '--name-only', `refs/remotes/origin/${sb}`, `${USE_DIR}/`], { cwd: root, allowFail: true }).stdout.split('\n').filter(Boolean);
    const since = now() - 2 * 3600e3;
    const use = files.flatMap((f) => (readState(root, sb, f) || '').split('\n').filter(Boolean).flatMap((l) => { try { const r = JSON.parse(l); return Date.parse(r.minute) > since ? [r] : []; } catch { return []; } }));
    cache = { at: now(), pause, use };
    return cache;
  };
  return {
    read: () => (cache && now() - cache.at < READ_S * 1000 ? cache : load()),
    pause: (rec) => {
      unbatched(() => writeState(root, sb, `github: ${rec.stopped ? 'stopped' : 'paused'} until ${rec.until} (${rec.why})`, (wt) => {
        mkdirSync(join(wt, 'github'), { recursive: true });
        // A pause already there and later than this one stands.
        let was = null;
        try { was = JSON.parse(readFileSync(join(wt, PAUSE_FILE), 'utf8')); } catch { was = null; }
        const keep = was && Date.parse(was.until) > Date.parse(rec.until) ? { ...rec, until: was.until } : rec;
        writeFileSync(join(wt, PAUSE_FILE), JSON.stringify({ ...keep, stopped: !!(rec.stopped || was?.stopped) }, null, 2) + '\n');
        return {};
      }));
      cache = null;
    },
    resume: (by) => {
      unbatched(() => writeState(root, sb, `github: resumed by ${by}`, (wt) => {
        if (existsSync(join(wt, PAUSE_FILE))) rmSync(join(wt, PAUSE_FILE));
        mkdirSync(join(wt, 'github'), { recursive: true });
        appendFileSync(join(wt, 'github/resumed.jsonl'), JSON.stringify({ at: new Date(now()).toISOString(), by }) + '\n');
        return {};
      }));
      cache = null;
    },
  };
}

// This clone's usage since it last shared, appended to its session's file on the state branch, with
// the command's own push (writeState coalesces it): when the command writes state anyway, or the
// last share is pacing.share_s old. Rows older than two hours are dropped from the file.
export function shareUsage(root, cfg, { force = false, now = Date.now, pending = 0 } = {}) {
  const dir = git(['rev-parse', '--git-common-dir'], { cwd: root, allowFail: true }).stdout.trim();
  const mark = dir ? join(dir.startsWith('/') ? dir : join(root, dir), MARK) : null;
  let after = 0;
  try { after = Number(readFileSync(mark, 'utf8')) || 0; } catch { after = 0; }
  const rows = usageRows(root, { after });
  if (!rows.length) return 0;
  if (!force && !pending && now() - after < pacing().share_s * 1000) return 0;
  const sb = cfg.state_branch;
  const file = `${USE_DIR}/${safe(sessionId())}.jsonl`;
  writeState(root, sb, `github: ${rows.length} minute(s) of use`, (wt) => {
    mkdirSync(join(wt, USE_DIR), { recursive: true });
    const since = now() - 2 * 3600e3;
    let kept = [];
    try { kept = readFileSync(join(wt, file), 'utf8').split('\n').filter(Boolean).filter((l) => { try { return Date.parse(JSON.parse(l).minute) > since; } catch { return false; } }); } catch { kept = []; }
    writeFileSync(join(wt, file), [...kept, ...rows.map((r) => JSON.stringify(r))].join('\n') + '\n');
    return {};
  });
  try { writeFileSync(mark, String(now())); } catch { /* best effort */ }
  return rows.length;
}
