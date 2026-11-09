// A product at the copy's scale (C50, Bob, 9 Nov: "Let's fix as many of them as we can"; the copy's
// `setup check --at HEAD` took about 15 minutes): about 60 modules with their ledger entries, rows,
// requirements and layer lines, about 1000 commits on the tranche, a state branch of thousands of
// rows, an open layer with its branch, and a --depth 1 clone of it, as a pin session clones. Built
// with one git fast-import, so it costs a test about a second. Not a test file: setup-speed.test
// and the pin-move rehearsal build it.
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { git } from '../lib/util.mjs';
import './helpers.mjs';

const SHIMS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'shims');
const shim = (f) => readFileSync(join(SHIMS, f), 'utf8');
export const OWNER = 'neobobkrause';

// The files of a complete setup, as the setup tests' world holds them.
function setupFiles(cfg) {
  const lines = shim('CLAUDE.process.md').replaceAll('{tranche}', 'tranche');
  return {
    'CLAUDE.md': `## Standing approvals from Bob\n\nThe owner's words.\n\n${lines}`,
    '.claude/settings.json': JSON.stringify({ permissions: { deny: ['Bash(git push --force *)'] }, hooks: JSON.parse(shim('settings.hooks.json')).hooks }, null, 2) + '\n',
    ...Object.fromEntries(readdirSync(SHIMS).filter((f) => /\.ya?ml$/.test(f) && f !== 'process-dev-release.yml').map((f) => [`.github/workflows/${f}`, shim(f)])),
    'process/config.json': JSON.stringify(cfg, null, 2) + '\n',
  };
}

// opts: modules (60), commits (1000), stateRows (3000), open (the open layer, 9), pin (the
// .process gitlink's commit: the tool's own HEAD by default, so the pin is read from this clone).
export function scaleFixture({ modules = 60, commits = 1000, stateRows = 3000, layers = 10, open = 9, pin = null, toolRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..') } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'p3-scale-'));
  const origin = join(dir, 'origin.git');
  git(['init', '-q', '--bare', '-b', 'main', origin], { cwd: dir });
  const pinSha = pin || git(['rev-parse', 'HEAD'], { cwd: toolRoot });
  const ids = Array.from({ length: modules }, (_, i) => `mod-${String(i).padStart(2, '0')}`);
  const per = Math.ceil(modules / layers);
  const layerOf = (i) => Math.floor(i / per) + 1;
  // Of the modules: most with an entry; every tenth built before the ledger (no entry, a past
  // layer); the open layer's last two with no entry yet (census: no-entry, ready).
  const noEntry = (i) => i % 10 === 7 || (layerOf(i) >= open && i % per >= per - 2);
  const cfg = {
    tranche: 'tranche', coordinator: 'session_bob', modules_file: 'build/modules.json', layers_file: 'build/layers.md',
    requirements_dir: 'build/requirements', lanes: [{ name: 'ux', dir: 'design/ux' }],
    deploy: { internal_walk: { run: ['npm', 'run', 'walk:internal'] } },
    generated: [{ paths: ['dist/'], regenerate: ['npm', 'run', 'build'], verify: ['npm', 'run', 'verify'] }],
  };
  const files = { ...setupFiles(cfg) };
  files['build/modules.json'] = JSON.stringify({ modules: ids.map((id, i) => ({ id, layer: layerOf(i), paths: [`src/${id}/`], tests: [`test/${id}/`], uses: i ? [ids[i - 1]] : [] })) }, null, 2) + '\n';
  files['build/layers.md'] = ['| Layer | Modules |', '|---|---|', ...Array.from({ length: layers }, (_, k) => `| ${k + 1} | ${ids.filter((_, i) => layerOf(i) === k + 1).join(', ')} |`)].join('\n') + '\n';
  files['build/requirements/README.md'] = '# Requirements\n';
  files['build/situations/job.md'] = '# The job\n';
  files['design/ux/README.md'] = '# UX\n';
  files['dist/bundle.js'] = 'x'.repeat(2048) + '\n';
  ids.forEach((id, i) => {
    files[`build/requirements/${id}.md`] = `# ${id}\n\n${'- [x] REQ-1 done\n'.repeat(40)}${i % 13 === 0 ? '- [ ] REQ-9 not yet\n' : ''}`;
    if (!noEntry(i)) {
      files[`process/ledger/${id}.json`] = JSON.stringify({
        id, title: `Module ${id}`, layer: layerOf(i), paths: [`src/${id}/`], tests: [`test/${id}/`], requirements: `build/requirements/${id}.md`, uses: i ? [ids[i - 1]] : [],
        suite: { cwd: '.', command: ['node', '--test', `test/${id}/`] }, reading: [`build/requirements/${id}.md`],
        status: { state: layerOf(i) < open ? 'COMPLETE' : 'OPEN', at: '2026-11-01T00:00:00Z' },
      }, null, 2) + '\n';
    }
    for (let k = 0; k < 20; k++) files[`src/${id}/f${k}.js`] = `export const v${k} = ${k};\n`;
    for (let k = 0; k < 5; k++) files[`test/${id}/t${k}.test.mjs`] = `// ${id} ${k}\n`;
  });
  for (let k = 0; k < 800; k++) files[`site/page${k}.html`] = `<p>${k}</p>\n`;

  // One fast-import stream: commit 1 holds the files and the .process gitlink; each later commit
  // changes one source file, GitHub's committer on every one (so the approvals history is read).
  const out = [];
  const data = (s) => { const b = Buffer.from(s); out.push(`data ${b.length}\n`); out.push(b); out.push('\n'); };
  const who = (n) => `${OWNER} <noreply@github.com> ${1762000000 + n * 60} +0000`;
  let mark = 0;
  const marks = {};
  for (const [p, t] of Object.entries(files)) { out.push(`blob\nmark :${++mark}\n`); data(t); marks[p] = mark; }
  // A first commit before the setup, as a product converting to the process has.
  out.push(`commit refs/heads/tranche\nmark :${++mark}\ncommitter ${who(0)}\n`); data('first');
  out.push('M 100644 inline README.md\n'); data('# The product\n');
  out.push(`commit refs/heads/tranche\nmark :${++mark}\ncommitter ${who(0)}\n`); data('setup');
  out.push(`from :${mark - 1}\n`);
  for (const [p, m] of Object.entries(marks)) out.push(`M 100644 :${m} ${p}\n`);
  out.push(`M 160000 ${pinSha} .process\n`);
  for (let n = 1; n < commits; n++) {
    const id = ids[n % ids.length];
    out.push(`commit refs/heads/tranche\nmark :${++mark}\ncommitter ${who(n)}\n`); data(`change ${n}`);
    out.push(`M 100644 inline src/${id}/f${n % 20}.js\n`); data(`export const v = ${n};\n`);
    // A pin move every 20 commits rewrites CLAUDE.md's process lines below the block, never the
    // block (the copy's approvals history: the block set once, the file changed many times since).
    if (n % 20 === 0) { out.push('M 100644 inline CLAUDE.md\n'); data(`${files['CLAUDE.md']}\n<!-- pin move ${n} -->\n`); }
    // main: the last release, early in the tranche's history (the copy's tranche is unreleased).
    if (n === Math.floor(commits * 0.1)) out.push(`reset refs/heads/main\nfrom :${mark}\n\n`);
  }
  const stream = Buffer.concat(out.map((x) => (Buffer.isBuffer(x) ? x : Buffer.from(x))));
  const r = git(['fast-import', '--quiet'], { cwd: origin, input: stream, allowFail: true });
  if (r.code !== 0) throw new Error(`fast-import: ${r.stderr}`);
  const tip = git(['rev-parse', 'tranche'], { cwd: origin });
  git(['branch', `layer/${open}`, `tranche~${Math.floor(commits * 0.05)}`], { cwd: origin });
  // The state branch, in a second import: its rows name the tranche's real commits (each layer's
  // close, each land's head and merge, each reschedule's provider land), most of them past a
  // --depth 1 clone's cut, as the copy's are.
  const shas = git(['rev-list', '--first-parent', 'tranche'], { cwd: origin }).split('\n');
  const at = (k) => shas[Math.min(shas.length - 1, Math.max(0, k))];
  const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
  const now = Date.now();
  const rows = [];
  rows.push(['addresses/bob.json', { session: 'session_bob', at: '2026-11-01T00:00:00Z' }]);
  for (let k = 1; k <= open; k++) rows.push([`layerflow/${k}/open.json`, { row: 'open', layer: k, tranche: 'tranche', at: iso(now - (open - k + 1) * 36e5) }]);
  // Each closed layer's merge and close: its commit long past the cut.
  const closed = [];
  for (let k = 1; k < open; k++) {
    const c = at(Math.floor(commits * (1 - k / open)));
    rows.push([`layerflow/${k}/merged.json`, { row: 'merged', layer: k, merge: c, at: iso(now - (open - k) * 36e5) }]);
    closed.push({ row: 'closed', layer: k, tranche: 'tranche', commit: c, at: iso(now - (open - k) * 36e5), deferred: {}, suites: [], generated_changed: [], by: 'layer merge', strategy: 'layer' });
  }
  rows.push(['layers/closed.jsonl', closed.map((r) => JSON.stringify(r)).join('\n') + '\n']);
  // The open layer's runs, lands and reschedules: per module, a run and a land; each land
  // reschedules the module's users (here its next module).
  const mods = ids.filter((_, i) => layerOf(i) === open);
  mods.forEach((id, j) => {
    const head = at(10 + j * 3);
    const merge = at(9 + j * 3);
    rows.push([`layerflow/${open}/run/${id}-1.json`, { row: 'run', layer: open, module: id, round: 1, started: iso(now - 5e6), ended: iso(now - 4e6), tested_on: head }]);
    rows.push([`layerflow/${open}/land/${id}-1.json`, { row: 'land', layer: open, module: id, pr: 900 + j, branch: `job/${id}`, head, before: at(11 + j * 3), merge, at: iso(now - 3e6) }]);
    for (let r = 0; r < 8; r++) {
      const u = ids[(ids.indexOf(id) + 1 + r) % ids.length];
      rows.push([`layerflow/${open}/reschedule/${u}-${id}-${merge.slice(0, 10)}-${r}.json`, { row: 'reschedule', layer: open, user: u, provider: id, provider_pr: 900 + j, provider_land: at(40 + j * 7 + r), at: iso(now - 3e6), key: `${u}<-${id}@${merge.slice(0, 10)}` }]);
    }
  });
  // The tranche open's grants check passed (helpers.mjs openPassed).
  const acts = ['push', 'pr-open', 'pr-comment', 'pr-merge', 'session-start', 'session-archive', 'task-create', 'task-delete'];
  rows.push(['metrics/tranche-open.jsonl', [...acts.map((act) => [act, 1]), ...acts.slice(0, 4).map((act) => [act, 2])]
    .map(([act, depth]) => JSON.stringify({ row: 'grant', at: iso(now - 864e5), tranche: 'tranche', act, depth, outcome: 'ok', session: depth === 1 ? 'bob' : 'probe' })).join('\n') + '\n']);
  // The hourly sweep 20 minutes ago measured 4 live job sessions; no check since.
  rows.push(['metrics/sweep.jsonl', JSON.stringify({ at: iso(now - 20 * 6e4), row: 'sweep', live: 4 }) + '\n']);
  // Bulk: the rows of a long-running product (notices, messages, metrics, gate rows).
  const kinds = ['notices', 'messages', 'gate', 'metrics/jobs', 'layerflow/1/run'];
  for (let n = 0; n < stateRows; n++) rows.push([`${kinds[n % kinds.length]}/${Math.floor(n / 50)}/row-${n}.json`, { row: n % 5 === 4 ? 'run' : 'row', n, at: '2026-11-01T00:00:00Z' }]);
  const sout = [];
  const sdata = (t) => { const b = Buffer.from(t); sout.push(Buffer.from(`data ${b.length}\n`), b, Buffer.from('\n')); };
  const perCommit = 50;
  for (let c = 0; c * perCommit < rows.length; c++) {
    sout.push(Buffer.from(`commit refs/heads/process-state\ncommitter ${who(c)}\n`)); sdata(`state ${c}`);
    for (const [p, v] of rows.slice(c * perCommit, (c + 1) * perCommit)) { sout.push(Buffer.from(`M 100644 inline ${p}\n`)); sdata(typeof v === 'string' ? v : JSON.stringify(v, null, 2) + '\n'); }
  }
  const s2 = git(['fast-import', '--quiet'], { cwd: origin, input: Buffer.concat(sout), allowFail: true });
  if (s2.code !== 0) throw new Error(`fast-import (state): ${s2.stderr}`);

  // The pin session's clone: --depth 1 of the tranche, as create_session clones it.
  const work = join(dir, 'work');
  git(['clone', '-q', '--depth', '1', '--branch', 'tranche', `file://${origin}`, work], { cwd: dir });
  git(['config', 'user.email', 'noreply@github.com'], { cwd: work });
  git(['config', 'user.name', 'Pin session'], { cwd: work });
  git(['config', 'commit.gpgsign', 'false'], { cwd: work });
  // No automatic gc or maintenance: after many small fetches git starts one detached, and its prune
  // rewrites the shallow file under the next fetch ("shallow file has changed since we read it"; CI's
  // git 2.56 on this fixture). A session's clone can meet that too; a test must not depend on it.
  git(['config', 'gc.auto', '0'], { cwd: work });
  git(['config', 'maintenance.auto', 'false'], { cwd: work });
  return { dir, origin, work, tip, ids, cfg, pin: pinSha, open, noEntry: ids.filter((_, i) => noEntry(i)) };
}

// GitHub's answers for a complete setup (the setup tests' world), and the approvals file's log from
// origin's own history, as GET /repos/.../commits?path= gives it.
export function stubGitHub(fx, slug = 'o/r') {
  const asked = [];
  const ok = (id) => [{ type: 'deletion', ruleset_id: 1 }, { type: 'non_fast_forward', ruleset_id: 1 },
    { type: 'pull_request', parameters: { allowed_merge_methods: ['merge'], required_approving_review_count: 0, require_code_owner_review: false }, ruleset_id: id },
    { type: 'required_status_checks', parameters: { required_status_checks: [{ context: 'gate', integration_id: 15368 }] }, ruleset_id: id }];
  const sets = {
    1: { id: 1, name: 'every-branch', target: 'branch', enforcement: 'active', current_user_can_bypass: 'never', conditions: { ref_name: { include: ['~ALL'], exclude: [] } }, rules: [{ type: 'deletion' }, { type: 'non_fast_forward' }] },
    2: { id: 2, name: 'process3', target: 'branch', enforcement: 'active', current_user_can_bypass: 'never', conditions: { ref_name: { include: ['refs/heads/main', 'refs/heads/tranche'], exclude: [] } }, rules: [] },
  };
  const api = (p) => {
    asked.push(p);
    let m;
    if (p === 'user') return { login: 'acmewidget' };
    if (p === `repos/${slug}`) return { permissions: { admin: false, push: true }, allow_merge_commit: true, allow_auto_merge: false, delete_branch_on_merge: false };
    if (p.startsWith(`repos/${slug}/rulesets?`)) return [{ id: 1 }, { id: 2 }];
    if ((m = p.match(/\/rulesets\/(\d+)\?/))) return sets[m[1]] || null;
    if (p.includes('/rules/branches/')) return ok(2);
    if (p.includes('/actions/artifacts')) return { artifacts: [{ created_at: '2026-11-02T14:34:28Z', expires_at: '2027-01-31T14:33:29Z' }] };
    if (/\/branches\/[^/]+\/protection$/.test(p)) return null;
    if (/\/branches\/[^/]+$/.test(p)) return { protected: true, protection: { enabled: false } };
    if ((m = p.match(/\/commits\?sha=([0-9a-f]+)&path=([^&]+)/))) {
      const log = git(['--literal-pathspecs', 'log', '--format=%H %cI %P', '-n', '100', m[1], '--', decodeURIComponent(m[2])], { cwd: fx.origin, allowFail: true });
      return log.stdout.split('\n').filter(Boolean).map((l) => { const [sha, date, ...ps] = l.split(' '); return { sha, commit: { committer: { date, email: 'noreply@github.com' } }, parents: ps.map((s) => ({ sha: s })) }; });
    }
    if (/\/commits\/[0-9a-f]+$/.test(p)) return { committer: { login: 'web-flow' }, author: { login: OWNER }, commit: { verification: { verified: true } } };
    if (p.includes('/pulls?')) return [];
    return null;
  };
  return { api, asked };
}

// A fake `gh` on PATH for the CLI rehearsal: answers `gh api <path>` from stubGitHub, run in a child.
export function fakeGh(fx, slug) {
  const bin = join(fx.dir, 'bin');
  mkdirSync(bin, { recursive: true });
  const me = fileURLToPath(import.meta.url);
  writeFileSync(join(bin, 'gh'), `#!/usr/bin/env node\nconst { stubGitHub } = await import(${JSON.stringify(me)});\nconst a = process.argv.slice(2);\nif (a[0] !== 'api') process.exit(1);\nconst path = a.slice(1).find((x) => !x.startsWith('-'));\nconst v = stubGitHub(${JSON.stringify({ origin: fx.origin })}, ${JSON.stringify(slug)}).api(path);\nif (v === null) { process.stderr.write('HTTP 404'); process.exit(1); }\nprocess.stdout.write(JSON.stringify(a.includes('--slurp') ? [v] : v));\n`, { mode: 0o755 });
  return bin;
}
export const fixtureExists = (p) => existsSync(p);
