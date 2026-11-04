// Lanes (SES-14): a lane carries a design responsibility and a directory of design knowledge in
// the product. BOB passes a design question to the lane with context, waits for its decision and
// keeps the final say. A lane runs as a worker started with its directory (no long-lived session)
// until cost says otherwise, so each ask's cost is recorded when the session record gives it.
// lane ask <name> "<question>" --context <file>...: records the ask on the state branch (open until
// a decision is recorded) and prints BOB's act, the worker's brief.
// lane ask <name> "<question>" --record "<decision>" --worker <id> [--cost-usd <n>]: the decision.
import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { P3, rulebook } from './job.mjs';
import { fetchState, jsonl, readState, writeState } from './state.mjs';
import { fail, list, loadConfig, now } from './util.mjs';

export const LANES_FILE = 'lanes/asks.jsonl';

// The configured lanes, each with a name and a directory; a lane without either is refused.
export function lanes(cfg) {
  const ls = cfg.lanes;
  if (!Array.isArray(ls)) fail('"lanes" in process/config.json must be a list of {"name", "dir"}');
  return ls.map((l, i) => {
    if (!l || typeof l !== 'object' || typeof l.name !== 'string' || !l.name.trim()) fail(`lane ${i + 1} in process/config.json has no name`);
    return { name: l.name.trim(), dir: typeof l.dir === 'string' && l.dir.trim() ? l.dir.trim().replace(/\/$/, '') : null };
  });
}

export function lane(cfg, name) {
  const all = lanes(cfg);
  const l = all.find((x) => x.name === name);
  if (!l) fail(`no lane ${JSON.stringify(name)} in process/config.json; the lanes are ${all.map((x) => x.name).join(', ') || 'none'}`);
  if (!l.dir) fail(`lane ${l.name} names no directory: set its "dir" in process/config.json "lanes"`);
  return l;
}

const walk = (root, dir) => {
  const out = [];
  const go = (d) => {
    for (const n of readdirSync(join(root, d)).sort()) {
      const p = `${d}/${n}`;
      const s = statSync(join(root, p));
      if (s.isDirectory()) go(p);
      else out.push({ file: p, bytes: s.size });
    }
  };
  go(dir);
  return out;
};

// The asks of this tranche, each with its decision when one is recorded.
export function asks(root, cfg) {
  const rows = jsonl(readState(root, cfg.state_branch, LANES_FILE)).filter((r) => r.tranche === cfg.tranche);
  const key = (r) => `${r.lane}\0${r.question}`;
  const out = new Map();
  for (const r of rows) {
    // A new ask of a decided question opens it again.
    if (r.row === 'ask' && (!out.has(key(r)) || out.get(key(r)).decision)) out.set(key(r), { ...r, decision: null });
    else if (r.row === 'decision') out.set(key(r), { ...(out.get(key(r)) || { lane: r.lane, question: r.question }), decision: r });
  }
  return [...out.values()];
}
export const openAsks = (root, cfg) => asks(root, cfg).filter((a) => !a.decision);

export function briefText({ l, question, context, files }) {
  const bytes = (xs) => xs.reduce((s, x) => s + x.bytes, 0);
  return [
    `# Lane question: ${l.name}`, '',
    `You are a read-only worker for the ${l.name} lane, started by BOB. Read your rulebook once, before you start: \`${rulebook('worker')}\` in a product, \`rulebooks/worker.md\` in the process repository; this brief wins where they differ.`, '',
    '## Question', question, '',
    `## Reading set (${bytes(files) + bytes(context)} bytes)`,
    `The lane's directory \`${l.dir}/\`: ${files.length} files, ${bytes(files)} bytes. Read what the question needs, starting from its README or index if it has one.`,
    ...(context.length ? ['Context from BOB:', ...context.map((c) => `- \`${c.file}\` ${c.bytes}`)] : ['No context files.']), '',
    '## Boundaries',
    `Read only: write nothing in the checkout, push nothing, start nothing. Decide within the ${l.name} lane's design responsibility and what its directory already holds; where the directory and the context differ, say so. A question only Bob can answer (values, policies, mission, audiences, principles, doctrine, his approvals) is answered "decision: Bob's", with the options and your recommendation. BOB keeps the final say; you approve and merge nothing.`, '',
    '## Output',
    'Three parts, in this order, plain words:',
    '- decision: <one line>',
    '- why: <the lines of the directory or the context it rests on, each with file and line>',
    `- what changes in \`${l.dir}/\`: <each file and what changes in it, or "nothing">`,
  ].join('\n') + '\n';
}

const put = (wt, line) => { mkdirSync(dirname(join(wt, LANES_FILE)), { recursive: true }); appendFileSync(join(wt, LANES_FILE), line); };

export function laneAsk(root, name, question, { context = [], record, worker, cost, log = console.log } = {}) {
  if (typeof name !== 'string' || !name) fail('lane ask <name> "<question>" --context <file>...');
  if (typeof question !== 'string' || !question.trim()) fail('lane ask <name> "<question>": the question, in quotes');
  const cfg = loadConfig(root);
  const l = lane(cfg, name);
  const q = question.replace(/\s+/g, ' ').trim();
  fetchState(root, cfg.state_branch, { fresh: true });
  if (record !== undefined) {
    if (typeof record !== 'string' || !record.trim()) fail('--record "<the lane\'s decision>"');
    if (typeof worker !== 'string' || !worker.trim()) fail('--record needs --worker <the worker\'s session or agent id>');
    const mine = openAsks(root, cfg).filter((a) => a.lane === l.name);
    if (!mine.some((a) => a.question === q)) fail(`no open ${l.name} question reads ${JSON.stringify(q)}; nothing recorded. Open: ${mine.map((a) => JSON.stringify(a.question)).join('; ') || 'none'}`);
    const usd = cost === undefined ? null : Number(cost);
    if (cost !== undefined && (cost === true || !Number.isFinite(usd) || usd < 0)) fail(`--cost-usd <the worker's cost from its session record>, not ${JSON.stringify(cost)}`);
    const row = { row: 'decision', at: now(), tranche: cfg.tranche, lane: l.name, question: q, decision: record.trim(), worker: worker.trim(), cost_usd: usd };
    writeState(root, cfg.state_branch, `lane ${l.name}: decision recorded`, (wt) => put(wt, JSON.stringify(row) + '\n'));
    log(`recorded the ${l.name} lane's decision${usd === null ? '; cost unmeasured' : `; cost $${usd}`}`);
    return { row };
  }
  if (!existsSync(join(root, l.dir))) fail(`lane ${l.name}'s directory ${l.dir}/ is not in this checkout`);
  const ctx = list(context).filter((c) => c !== true).map((c) => {
    const p = relative(root, join(root, String(c)));
    if (!existsSync(join(root, p)) || !statSync(join(root, p)).isFile()) fail(`--context ${c}: no such file in this checkout`);
    return { file: p, bytes: statSync(join(root, p)).size };
  });
  const files = walk(root, l.dir);
  const brief = briefText({ l, question: q, context: ctx, files });
  const already = openAsks(root, cfg).some((a) => a.lane === l.name && a.question === q);
  if (!already) {
    const row = { row: 'ask', at: now(), tranche: cfg.tranche, lane: l.name, question: q, context: ctx.map((c) => c.file) };
    writeState(root, cfg.state_branch, `lane ${l.name}: question asked`, (wt) => put(wt, JSON.stringify(row) + '\n'));
  }
  log(`${already ? 'already open' : 'recorded open'} on ${cfg.state_branch}:${LANES_FILE}`);
  log(`BOB's act: start one read-only worker (a subagent; no long-lived session) with the brief below, and wait for its decision. Then, the final say yours: ${P3} lane ask ${l.name} "${q.replace(/"/g, '\\"')}" --record "<the decision, as you keep or change it>" --worker <its id> --cost-usd <its cost, when the session record gives it>`);
  log(brief.trimEnd());
  return { brief, already };
}
