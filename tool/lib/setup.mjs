// setup check (setup audit, 2 Nov): the product's setup, read and reported, one line per
// condition of setup/conditions.json. Read-only. job start runs it first and stops on a gap.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prFiles, takeInLine, toTakeIn } from './carry.mjs';
import { generatedRows, oversizeGenerated } from './checks.mjs';
import { approvalsBlock, ownerBlock, webCommitByOwner } from './record.mjs';
import { compareRanges, loadRanges, measureSize, sizeLines } from './size.mjs';
import { startCheck } from './start.mjs';
import { DEFAULTS, OPEN_BY, exists, fail, fetchBranch, gh, git, isShallow, loadConfig, run } from './util.mjs';

export const CONDITIONS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'setup', 'conditions.json');
export const loadConditions = (file = CONDITIONS) => JSON.parse(readFileSync(file, 'utf8')).conditions;
export const CONFIRMED = 'confirmed once on the onboarding page';
const ACTIONS_APP = 15368; // GitHub Actions: a required check from any other source could be posted by a session
const DAY = 86400000;

const api = (path) => gh(['api', path], { allowFail: true });

// The pinned clone's own repository: the tool runs from it (.process in a product).
const TOOL = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PROCESS_LINES = 'shims/CLAUDE.process.md';
export const HOOKS_SHIM = 'shims/settings.hooks.json';
export const MAX_LINES = 30;

// The tranche's process pin and its files, read from the tool's own repository: the pin commit
// is fetched by its id, --depth 1, when the clone lacks it. null when the tranche has no pin.
// With ref, the pin of that commit instead (setup check --at HEAD).
export function pinOf(root, name, toolRoot = TOOL, ref = `origin/${name}`) {
  const tree = git(['ls-tree', ref, '--', '.process'], { cwd: root, allowFail: true });
  const sha = tree.code === 0 ? tree.stdout.match(/^160000 commit ([0-9a-f]{40})\t/)?.[1] : null;
  if (!sha) return null;
  if (git(['cat-file', '-e', `${sha}^{commit}`], { cwd: toolRoot, allowFail: true }).code !== 0) {
    git(['fetch', '-q', '--depth=1', 'origin', sha], { cwd: toolRoot, allowFail: true });
    if (git(['cat-file', '-e', `${sha}^{commit}`], { cwd: toolRoot, allowFail: true }).code !== 0) throw new Error(`could not fetch the pin ${sha.slice(0, 10)} into the process clone (run git submodule update --init .process first)`);
  }
  return {
    sha,
    file: (f) => (exists(toolRoot, sha, f) ? git(['show', `${sha}:${f}`], { cwd: toolRoot }) : null),
    list: (dir) => git(['ls-tree', '-z', '--name-only', `${sha}:${dir}`], { cwd: toolRoot, allowFail: true }).stdout.split('\0').filter(Boolean),
  };
}

// Every hook of a settings file, one key per command, so order and grouping do not matter.
const hookKeys = (hooks) => Object.entries(hooks && typeof hooks === 'object' ? hooks : {}).flatMap(([event, groups]) =>
  [].concat(groups || []).flatMap((g) => [].concat(g?.hooks || []).map((h) => JSON.stringify([event, g?.matcher ?? '', h?.type ?? '', h?.command ?? '', h?.timeout ?? null]))));

// The tranche's files, through git, so no session reads them through the contents API. With
// at, a commit's files instead; the tranche is fetched either way, since the approvals and the
// take-in still read it (review of PR 60).
function tranche(root, name, at = null) {
  fetchBranch(root, name, { allowFail: true });
  const ref = at || `origin/${name}`;
  return (file) => {
    if (git(['rev-parse', '-q', '--verify', ref], { cwd: root, allowFail: true }).code !== 0 || !exists(root, ref, file)) return null;
    return git(['show', `${ref}:${file}`], { cwd: root });
  };
}

// A harmless Cloudflare read with the session's token: the token goes to curl on stdin, never on
// a command line, in a log or in a message. Returns the HTTP status and Cloudflare's success.
export function cloudflareRead(path, env) {
  const r = run('curl', ['-sS', '--max-time', '20', '-H', '@-', '-w', '\n%{http_code}', `https://api.cloudflare.com/client/v4/${path}`], { input: `Authorization: Bearer ${env.CLOUDFLARE_API_TOKEN}\n` });
  const lines = r.stdout.split('\n');
  const status = Number(lines.pop());
  let success = false;
  // Cloudflare's v4 envelope says success; a bare JSON answer (some newer APIs) counts on a 200.
  try { const j = JSON.parse(lines.join('\n')); success = j?.success === true || (j !== null && typeof j === 'object' && j.success === undefined); } catch { /* not JSON */ }
  return { status: r.code === 0 ? status : 0, success };
}

// No account named: absent, null, or blank (reviews of PR 24). Anything else must be an ID,
// a string or a number.
const noAccount = (a) => a === undefined || a === null || (typeof a === 'string' && !a.trim());
const set = (detail) => ({ state: 'set', detail });
const missing = (detail) => ({ state: 'missing', detail });
const unread = (what) => missing(`could not read ${what}`);
// Fails closed: a ruleset counts only when GitHub says the session account can never bypass it
// (confirming review of PR 15).
const noBypass = (rs) => rs.current_user_can_bypass === 'never';

// A deny rule as Claude Code matches a Bash command: a bare Bash denies every command; a
// trailing ":*" is a prefix match; otherwise "*" is a wildcard over the whole command, and a
// trailing " *" also matches the command without arguments.
export function bashRuleMatches(rule, cmd) {
  if (rule === 'Bash') return true;
  const m = String(rule).match(/^Bash\((.*)\)$/s);
  if (!m) return false;
  const pat = m[1];
  if (pat.endsWith(':*')) return cmd.startsWith(pat.slice(0, -2));
  const re = new RegExp(`^${pat.split('*').map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`, 's');
  return re.test(cmd) || (pat.endsWith(' *') && cmd === pat.slice(0, -2));
}

// One reader per condition that can be read; each returns { state, detail }.
const readers = {
  account: (c, x) => {
    const me = x.api('user');
    if (!me?.login) return unread('the account (GET /user)');
    const p = x.repo()?.permissions;
    if (!p) return unread(`the repository ${x.slug}`);
    const ok = p.push === c.value.push && p.admin === c.value.admin;
    return (ok ? set : missing)(`${me.login}: push ${p.push}, admin ${p.admin}`);
  },

  'ruleset-all-branches': (c, x) => {
    const sets = x.rulesets();
    if (!sets) return unread('the rulesets');
    const want = c.value.rules;
    const fit = sets.find((rs) => rs.enforcement === 'active' && rs.target === 'branch'
      && (rs.conditions?.ref_name?.include || []).includes(c.value.include) && !(rs.conditions?.ref_name?.exclude || []).length
      && want.every((t) => (rs.rules || []).some((r) => r.type === t)) && noBypass(rs));
    return fit ? set(`ruleset "${fit.name}"`) : missing(`no active ruleset on ${c.value.include}, nothing excluded, with ${want.join(' and ')}, that the session account cannot bypass`);
  },

  'ruleset-main-tranche': (c, x) => {
    const gaps = [];
    for (const b of [x.main, x.cfg.tranche]) {
      const rules = x.api(`repos/${x.slug}/rules/branches/${b.split('/').map(encodeURIComponent).join('/')}`);
      if (!Array.isArray(rules)) { gaps.push(`${b}: could not read its rules`); continue; }
      const pr = rules.filter((r) => r.type === 'pull_request');
      const methods = pr.map((r) => r.parameters?.allowed_merge_methods);
      if (!pr.length) gaps.push(`${b}: no pull request rule`);
      // Every pull request rule, not just one, allows only these methods (fifth re-review).
      else if (!methods.every((m) => Array.isArray(m) && m.length === c.value.merge_methods.length && c.value.merge_methods.every((v) => m.includes(v)))) gaps.push(`${b}: merge methods are not ${c.value.merge_methods.join(', ')} only`);
      // The tool merges without a person's review: no rule may require one (fourth re-review).
      for (const r of pr) {
        const n = r.parameters?.required_approving_review_count;
        if (n !== c.value.required_approving_review_count) gaps.push(`${b}: a pull request rule requires ${n ?? 'an unknown number of'} approving review(s), not ${c.value.required_approving_review_count}`);
        if (r.parameters?.require_code_owner_review === true) gaps.push(`${b}: a pull request rule requires a code owner's review`);
        if ((r.parameters?.required_reviewers || []).length) gaps.push(`${b}: a pull request rule names required reviewers`);
      }
      const checks = rules.filter((r) => r.type === 'required_status_checks').flatMap((r) => r.parameters?.required_status_checks || []);
      for (const name of x.required) {
        const hit = checks.filter((k) => k.context === name);
        if (!hit.length) gaps.push(`${b}: check ${name} is not required`);
        else if (!hit.some((k) => k.integration_id === ACTIONS_APP)) gaps.push(`${b}: check ${name} is not tied to GitHub Actions`);
      }
      for (const id of new Set([...pr, ...rules.filter((r) => r.type === 'required_status_checks')].map((r) => r.ruleset_id).filter(Boolean))) {
        const rs = x.ruleset(id);
        if (!rs) gaps.push(`${b}: could not read ruleset ${id}`);
        else if (!noBypass(rs)) gaps.push(`${b}: the session account can bypass ruleset "${rs.name}"`);
      }
    }
    return gaps.length ? missing(gaps.join('; ')) : set(`${x.main} and ${x.cfg.tranche}: pull request, ${c.value.merge_methods.join(', ')} only, ${x.required.join(', ')} required`);
  },

  'merge-settings': (c, x) => {
    const r = x.repo();
    if (!r) return unread(`the repository ${x.slug}`);
    const wrong = Object.entries(c.value).filter(([k, v]) => r[k] !== v).map(([k, v]) => `${k} is ${r[k]}, not ${v}`);
    return wrong.length ? missing(wrong.join('; ')) : set(Object.entries(c.value).map(([k, v]) => `${k} ${v}`).join(', '));
  },

  'deny-list': (c, x) => {
    const text = x.file('.claude/settings.json');
    if (text === null) return missing(`no .claude/settings.json on ${x.where}`);
    let deny;
    try { deny = JSON.parse(text).permissions?.deny || []; } catch { return missing(`.claude/settings.json on ${x.where} is not JSON`); }
    const gaps = [
      ...c.value.deny.filter((d) => !deny.includes(d)).map((d) => `lacks ${d}`),
      ...deny.filter((d) => c.value.push_commands.some((cmd) => bashRuleMatches(d, cmd))).map((d) => `holds ${d}, which blocks a session's push of its own branch`),
    ];
    return gaps.length ? missing(gaps.join('; ')) : set(`${deny.length} deny rules on ${x.where}`);
  },

  'artifact-retention': (c, x) => {
    const r = x.api(`repos/${x.slug}/actions/artifacts?name=gate-row&per_page=20`);
    if (!r || !Array.isArray(r.artifacts)) return unread('the gate artifacts');
    const newest = [...r.artifacts].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
    if (!newest) return { state: 'unmeasured', detail: 'no gate-row artifact yet' };
    // Whole days: GitHub counts the expiry from the run's start, a little before the upload.
    const days = Math.round((Date.parse(newest.expires_at) - Date.parse(newest.created_at)) / DAY);
    return (days >= c.value.min_days ? set : missing)(`the newest gate-row artifact (${newest.created_at}) is kept ${days} days`);
  },

  // Deploy tokens are a standard condition (Bob, 2 Nov). Names only: never a value, a length or
  // a prefix. This reader never calls Cloudflare's API; only deploy-token does, with harmless reads.
  environment: (c, x) => {
    const names = x.cfg.environment;
    if (names === undefined || names === null || (Array.isArray(names) && !names.length)) return { state: 'not configured', detail: 'process/config.json lists no environment' };
    if (!Array.isArray(names) || !names.every((n) => typeof n === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(n))) return missing('process/config.json "environment" is not a list of variable names');
    const absent = names.filter((n) => !x.env[n]);
    return absent.length ? missing(`not in this session's environment: ${absent.join(', ')}`) : set(`present: ${names.join(', ')}`);
  },

  'deploy-account': (c, x) => {
    const want = x.cfg.cloudflare_account;
    if (noAccount(want)) return { state: 'not configured', detail: 'process/config.json names no cloudflare_account' };
    if (typeof want !== 'string' && typeof want !== 'number') return missing('process/config.json cloudflare_account is not an account ID');
    if (!x.env.CLOUDFLARE_ACCOUNT_ID) return missing(`CLOUDFLARE_ACCOUNT_ID is not in this session's environment (configured: ${want})`);
    return x.env.CLOUDFLARE_ACCOUNT_ID === String(want) ? set(`CLOUDFLARE_ACCOUNT_ID matches ${want}: yes`) : missing(`CLOUDFLARE_ACCOUNT_ID matches ${want}: no`);
  },

  // Classic branch protection on main or the tranche (Bob, 2 Nov: an older rule was missed). A
  // branch's "protected" is true for rulesets too; its protection.enabled, and the protection
  // endpoint where it can be read, tell a classic rule. Any classic rule is to be removed.
  'classic-protection': (c, x) => {
    const found = [];
    const absent = [];
    for (const b of [x.main, x.cfg.tranche]) {
      const enc = b.split('/').map(encodeURIComponent).join('/');
      const br = x.api(`repos/${x.slug}/branches/${enc}`);
      if (!br || typeof br !== 'object' || typeof br.protected !== 'boolean') {
        // A branch not pushed yet has nothing to measure; any other failure to read is missing.
        if (!x.branchExists(b)) absent.push(b); else found.push(`${b}: could not read the branch`);
        continue;
      }
      if (!br.protected) continue;
      const p = x.api(`repos/${x.slug}/branches/${enc}/protection`);
      if (p && typeof p === 'object' && p.url) found.push(`${b}: a classic branch protection rule, to remove`);
      else if (br.protection?.enabled === true) found.push(`${b}: a classic branch protection rule, to remove`);
      else if (br.protection?.enabled !== false) found.push(`${b}: protected, and whether by a classic rule could not be read`);
    }
    if (found.length) return missing(found.join('; '));
    if (absent.length) return { state: 'unmeasured', detail: `${absent.join(' and ')} not pushed yet` };
    return set(`no classic branch protection rule on ${x.main} or ${x.cfg.tranche}`);
  },

  // The approvals (Bob, 2 Nov; build J): one block in CLAUDE.md on the tranche, the block the
  // owner last set by a website commit on the tranche or main, as the record check judges it.
  approvals: (c, x) => {
    const { file, heading, owner } = x.cfg.approvals;
    const text = x.file(file);
    if (text === null) return missing(`no ${file} on ${x.where}`);
    // Counted as the record check counts them, which flags a second approvals heading.
    const count = text.split('\n').filter((l) => /^#{1,6}\s.*approv/i.test(l.trim())).length;
    if (!approvalsBlock(text, heading)) return missing(`${file} on ${x.where} has no "${heading}" block`);
    if (count > 1) return missing(`${file} on ${x.where} has ${count} approvals headings; only one block may exist`);
    const top = x.ownerBlock(file, heading, owner);
    if (!top) return missing(`no approvals block on ${x.cfg.tranche} or ${x.main} was last set by ${owner}'s own commit through GitHub's website`);
    if (top.block !== approvalsBlock(text, heading)) return missing(`the approvals on ${x.where} are not the block ${owner} last set through GitHub's website: that is commit ${top.sha.slice(0, 10)}'s, on ${top.ref}. ${owner} sets it again on the website, or a merge carries it to ${x.cfg.tranche}`);
    return set(`one block, the one ${owner}'s website commit ${top.sha.slice(0, 10)} set`);
  },

  // The session's own checkout (Bob, 2 Nov): start check's own test, against the tranche.
  'session-branch': (c, x) => {
    if (x.at) return { state: 'skipped', detail: `--at ${x.at} judges that commit, not the session's checkout` };
    const r = x.onTranche();
    return r.ok ? set(`HEAD is the tip of ${x.cfg.tranche}, with its approvals`) : missing(`HEAD ${String(r.head).slice(0, 10)} is not the tip of ${x.cfg.tranche} (${String(r.tip).slice(0, 10)}) with its approvals. Start the session from the ${x.cfg.tranche} branch, or bring it up to date (git pull origin ${x.cfg.tranche})`);
  },

  // The deploy token's scopes, by harmless reads in the configured account; never the token.
  'deploy-token': (c, x) => {
    const acct = x.cfg.cloudflare_account;
    if (noAccount(acct)) return { state: 'not configured', detail: 'process/config.json names no cloudflare_account' };
    if (typeof acct !== 'string' && typeof acct !== 'number') return missing('process/config.json cloudflare_account is not an account ID');
    if (!x.env.CLOUDFLARE_API_TOKEN) return missing("CLOUDFLARE_API_TOKEN is not in this session's environment");
    const res = c.value.map((s) => {
      const r = x.cf(s.read.replace('{account}', encodeURIComponent(String(acct))));
      return { s, ok: r.status === 200 && r.success, status: r.status };
    });
    const line = res.map(({ s, ok, status }) => `${s.scope}: ${ok ? 'present' : `missing (${status || 'no answer'})`}`).join('; ');
    return res.every((r) => r.ok) ? set(line) : missing(line);
  },

  // TXT-1: the product's CLAUDE.md carries the pin's process lines exactly, below the owner's
  // approvals (never written by the tool), and is under thirty lines without them.
  'process-lines': (c, x) => {
    const pin = x.pin();
    if (!pin) return missing(`no .process pin on ${x.where}`);
    const shim = pin.file(PROCESS_LINES);
    if (shim === null) return { state: 'not configured', detail: `the pin ${pin.sha.slice(0, 10)} has no ${PROCESS_LINES}` };
    const { file, heading } = x.cfg.approvals;
    const text = x.file(file);
    if (text === null) return missing(`no ${file} on ${x.where}`);
    const want = shim.replaceAll('{tranche}', x.cfg.tranche).replace(/\n+$/, '').split('\n');
    const block = approvalsBlock(text, heading);
    const all = text.replace(/\n+$/, '').split('\n');
    const at = block ? all.findIndex((l) => l.trim() === heading.trim()) : -1;
    const rest = at < 0 ? all : [...all.slice(0, at), ...all.slice(at + block.split('\n').length)];
    const pr = `BOB opens a plain pull request into ${x.cfg.tranche} that`;
    const keep = 'and changes nothing in the approvals block';
    const gaps = [];
    const has = rest.some((_, i) => want.every((w, k) => rest[i + k] === w));
    if (!has) gaps.push(`${file} on ${x.where} lacks the process lines of the pin ${pin.sha.slice(0, 10)} exactly: ${pr} puts the lines of .process/${PROCESS_LINES} (with {tranche} as ${x.cfg.tranche}) in ${file} below the approvals block, ${keep}`);
    if (rest.length >= MAX_LINES) gaps.push(`${file} on ${x.where} is ${rest.length} lines without the approvals block, not under ${MAX_LINES}: ${pr} moves what else it holds to another file, ${keep}`);
    return gaps.length ? missing(gaps.join('; ')) : set(`the process lines of the pin ${pin.sha.slice(0, 10)}, ${rest.length} lines besides the approvals`);
  },

  // SHM-1: the drift check. Each workflow named like a shim equals the pin's shim, and the
  // settings file carries only the hooks the pin allows (ENF-1).
  'shim-drift': (c, x) => {
    const pin = x.pin();
    if (!pin) return missing(`no .process pin on ${x.where}`);
    const gaps = [];
    // The development release shim is needed only by a product whose config has "release", or that carries it.
    const shims = pin.list('shims').filter((f) => /\.ya?ml$/.test(f))
      .filter((f) => f !== 'process-dev-release.yml' || x.cfg.release || x.file(`.github/workflows/${f}`) !== null);
    for (const f of shims) {
      const mine = x.file(`.github/workflows/${f}`);
      if (mine !== pin.file(`shims/${f}`)) gaps.push(`.github/workflows/${f} ${mine === null ? 'is absent' : 'differs from the pin\'s shim'}: BOB opens a plain pull request into ${x.cfg.tranche} that copies .process/shims/${f} to it`);
    }
    const allowText = pin.file(HOOKS_SHIM);
    let allowed = [];
    try { allowed = allowText === null ? [] : hookKeys(JSON.parse(allowText).hooks); } catch { gaps.push(`the pin's ${HOOKS_SHIM} is not JSON`); }
    const text = x.file('.claude/settings.json');
    let hooks = {};
    try { hooks = text === null ? {} : JSON.parse(text).hooks; } catch { gaps.push(`.claude/settings.json on ${x.where} is not JSON`); }
    const extra = hookKeys(hooks).filter((k) => !allowed.includes(k));
    for (const k of extra) {
      const [event, , , command] = JSON.parse(k);
      gaps.push(`.claude/settings.json carries a ${event} hook the pin does not allow (${command}): the file is the owner's, so Bob removes it through GitHub's website, or BOB opens a plain pull request into ${x.cfg.tranche} that adds it to ${HOOKS_SHIM} in the process`);
    }
    return gaps.length ? missing(gaps.join('; ')) : set(`${shims.join(', ')} equal the pin ${pin.sha.slice(0, 10)}'s shims; ${hookKeys(hooks).length} hook(s), each allowed`);
  },

  coordinator: (c, x) => {
    const text = x.file('process/config.json');
    if (text === null) return missing(`no process/config.json on ${x.where}`);
    let coord;
    try { coord = JSON.parse(text).coordinator; } catch { return missing(`process/config.json on ${x.where} is not JSON`); }
    return typeof coord === 'string' && coord.trim() ? set(coord) : missing(`process/config.json on ${x.where} names no coordinator`);
  },
};
export const READERS = Object.keys(readers);

// The approvals file's log at a ref's tip, from GitHub's list of commits by path, as git log's
// "%H %ct %ce %P" lines: a shallow clone's own log stops at its cut. Unreadable is a throw, which
// the reader reports as missing.
export function fileLog(x, ref, file, root) {
  const sha = git(['rev-parse', ref], { cwd: root, allowFail: true });
  if (sha.code !== 0) return { code: 1, stdout: '' };
  const list = x.api(`repos/${x.slug}/commits?sha=${sha.stdout.trim()}&path=${encodeURIComponent(file)}&per_page=100`);
  if (!Array.isArray(list)) throw new Error(`could not read the history of ${file} at ${ref} from GitHub`);
  const lines = list.map((c) => [c.sha, Math.floor(Date.parse(c.commit?.committer?.date) / 1000), c.commit?.committer?.email, ...(c.parents || []).map((p) => p.sha)].join(' '));
  return { code: 0, stdout: lines.join('\n') };
}

// Every condition, read or confirmed. ok is false when any condition is missing; unmeasured,
// not configured, skipped and confirmed conditions do not stop a start. With at (setup check
// --at HEAD, before a pin-move pull request merges), that commit's pin and files are judged
// instead of the tranche tip's, and session-branch is skipped.
export function setupCheck(root, { slug, at = null, anchor = false, conditions = loadConditions(), io = {}, log = console.log } = {}) {
  const local = loadConfig(root);
  let sha = null;
  if (at) {
    const r = git(['rev-parse', '-q', '--verify', `${at}^{commit}`], { cwd: root, allowFail: true });
    if (r.code !== 0) fail(`setup check --at ${at}: not a commit here`);
    sha = r.stdout.trim();
  }
  const x = { slug, main: 'main', at, api: io.api || api, env: io.env || process.env };
  x.where = at ? `${at} (${sha.slice(0, 10)})` : local.tranche;
  x.file = io.file || tranche(root, local.tranche, sha);
  // The tranche's own config, when it has one, names the required check and the approvals'
  // file, heading and owner, never the session's own checkout (review of PR 24).
  let tcfg = {};
  try { tcfg = JSON.parse(x.file('process/config.json') || '{}') || {}; } catch { /* the coordinator reader reports it */ }
  x.cfg = { ...local, ...tcfg, tranche: local.tranche, approvals: { ...DEFAULTS.approvals, ...(tcfg.approvals || {}) } };
  let repo;
  x.repo = () => (repo === undefined ? (repo = x.api(`repos/${slug}`)) : repo);
  x.branchExists = io.branchExists || ((b) => {
    const r = git(['ls-remote', '--heads', 'origin', `refs/heads/${b}`], { cwd: root, allowFail: true });
    return r.code !== 0 || r.stdout.trim() !== '';
  });
  x.ownerCommit = io.ownerCommit || ((sha, owner) => webCommitByOwner(root, sha, owner, (args) => x.api(args[1]), slug));
  // Over the tranche and main, through git. A shallow clone is never deepened (a one-commit
  // clone of the product paid its whole 1.2 GB history, 3 Nov): the file's log comes from
  // GitHub, and each commit the check reads is fetched by its id, --depth 1.
  x.ownerBlock = io.ownerBlock || ((file, heading, owner) => {
    fetchBranch(root, x.main, { allowFail: true });
    const shallow = isShallow(root);
    const history = shallow ? (ref) => fileLog(x, ref, file, root) : undefined;
    const need = shallow ? (rev) => { if (git(['cat-file', '-e', `${rev}^{commit}`], { cwd: root, allowFail: true }).code !== 0) git(['fetch', '-q', '--depth=1', 'origin', rev], { cwd: root }); } : undefined;
    return ownerBlock(root, [`origin/${x.cfg.tranche}`, `origin/${x.main}`], file, heading, (sha) => x.ownerCommit(sha, owner), { history, need });
  });
  x.onTranche = io.onTranche || (() => startCheck(root, { branch: x.cfg.tranche, anchor, log: () => {} }));
  let pinned;
  x.pin = 'pin' in io ? () => io.pin : () => (pinned === undefined ? (pinned = pinOf(root, x.cfg.tranche, io.toolRoot || TOOL, sha || `origin/${x.cfg.tranche}`)) : pinned);
  x.cf = io.cf || ((path) => cloudflareRead(path, x.env));
  x.required = [].concat(x.cfg.required_check || 'gate');
  const cache = new Map();
  x.ruleset = (id) => { if (!cache.has(id)) cache.set(id, x.api(`repos/${slug}/rulesets/${id}?includes_parents=true`)); return cache.get(id); };
  x.rulesets = () => {
    const list = x.api(`repos/${slug}/rulesets?includes_parents=true&per_page=100`);
    return Array.isArray(list) ? list.map((r) => x.ruleset(r.id)).filter(Boolean) : null;
  };
  const results = conditions.map((c) => {
    if (c.read === CONFIRMED) return { id: c.id, what: c.what, state: 'confirmed', detail: CONFIRMED };
    if (!readers[c.id]) fail(`setup/conditions.json: no reader for ${c.id}, and it is not ${CONFIRMED}`);
    let r;
    try { r = readers[c.id](c, x); } catch (e) { r = missing(`could not be read: ${e.message}`); }
    return { id: c.id, what: c.what, ...r };
  });
  const gaps = results.filter((r) => r.state === 'missing');
  log(`setup check for ${slug}, tranche ${x.cfg.tranche}${at ? `, at ${x.where}` : ''}:`);
  for (const r of results) log(`- ${r.state}: ${r.id}: ${r.detail}`);
  log(gaps.length ? `${gaps.length} condition(s) missing: ${gaps.map((r) => r.id).join(', ')}` : 'every condition that can be read is set');
  const openByLine = openByCheck(x.cfg);
  log(openByLine);
  const size = sizeCheck(root, x, sha, { io, log });
  const carry = takeInCheck(root, x, { io, log });
  const generated = generatedCheck(root, x, sha, { log });
  return { ok: !gaps.length, results, missing: gaps.map((r) => r.id), tranche: x.cfg.tranche, at: sha, size, carry, open_by: openByLine, generated };
}

// Which opening of next work is in force (open_by in process/config.json; status --role bob).
// Informational, never a missing condition: status itself refuses a value it does not know.
function openByCheck(cfg) {
  const v = cfg.open_by ?? 'uses';
  if (!OPEN_BY.includes(v)) return `next work opens by: ${JSON.stringify(v)} is not one of ${OPEN_BY.map((o) => `"${o}"`).join(', ')}; status --role bob refuses it`;
  return v === 'uses'
    ? `next work opens by: uses (open_by); past the open layer, each module whose providers (\`uses\` in ${cfg.modules_file || 'modules_file, not set: none'}) are done`
    : 'next work opens by: layer (open_by); the open layer\'s modules only';
}

// The product's size (p3 size) at the judged commit against the ranges.json of its pin (the
// running clone's when the pin is unread): inside, outside per figure, or no certified range
// yet. Informational: never a missing condition, so it stops no start.
function sizeCheck(root, x, sha, { io, log }) {
  const ref = sha || `origin/${x.cfg.tranche}`;
  let s;
  try { s = measureSize(root, x.cfg, { ref }); } catch (e) { log(`size: unmeasured, ${e.message}`); return null; }
  let pin = null;
  try { pin = x.pin(); } catch { pin = null; }
  const releases = io.ranges || loadRanges(pin ? pin.file('ranges.json') : undefined);
  const c = compareRanges(s.figures, releases);
  for (const l of [...sizeLines(s), ...c.lines]) log(l);
  return { ...s, range: { state: c.state, outside: c.outside } };
}

// Generated files over max_file_bytes (the copy, 4 Nov: rows.mjs 5.2 MB, two bundles 8.9 and
// 29 MB): no pull request can refresh one, since the record check refuses any commit that writes
// it, so layer close's "regenerated files differ" never clears. Product work, informational: BOB
// stops committing it (a job or plain pull request that removes it from the index and ignores
// it) and builds it in release.assemble and the deploy; deploy dev and release run build every
// generated path the commit does not track, and layer close no longer compares it.
function generatedCheck(root, x, sha, { log }) {
  const ref = sha || `origin/${x.cfg.tranche}`;
  const max = Number(x.cfg.max_file_bytes ?? DEFAULTS.max_file_bytes);
  const gen = generatedRows(x.cfg);
  let over;
  try { over = oversizeGenerated(root, gen.rows, ref, max); } catch (e) { log(`generated files: unmeasured, ${e.message}`); return null; }
  if (!over.length) return { over: [] };
  log(`product work: ${over.length} committed generated file${over.length === 1 ? '' : 's'} over max_file_bytes (${max}); no pull request can refresh one:`);
  for (const o of over) log(`- ${o.file}: ${o.bytes} bytes; BOB's act: stop committing it (remove it from the index, ignore it) and build it in release.assemble and the deploy; deploy dev and release run build it from its \`generated\` row`);
  return { over };
}

// Tranche carry (SHM-4): a product converting mid-tranche lists its open pull requests into the
// tranche (into main while no tranche exists) that no ledger entry owns, each with the module
// whose paths own its files or "no single module". Informational: it stops no start, and it
// closes or rewrites nothing.
function takeInCheck(root, x, { io, log }) {
  const onTranche = git(['rev-parse', '-q', '--verify', `origin/${x.cfg.tranche}`], { cwd: root, allowFail: true }).code === 0;
  const base = onTranche ? x.cfg.tranche : x.main;
  if (!onTranche) fetchBranch(root, base, { allowFail: true });
  let prs = null;
  try {
    prs = io.openPRs ? io.openPRs(x.slug, base) : x.api(`repos/${x.slug}/pulls?state=open&base=${encodeURIComponent(base)}&per_page=100`);
  } catch { prs = null; }
  if (!Array.isArray(prs)) { log(`to take in: unmeasured, the open pull requests into ${base} were not read`); return null; }
  const files = io.prFiles || prFiles; // paged: a partial list would misjudge the module
  const list = toTakeIn(root, { slug: x.slug, ref: `origin/${base}`, prs, files });
  if (list.length) log(`to take in (open pull requests into ${base} no ledger entry owns):`);
  for (const t of list) log(`- ${takeInLine(t, 'node .process/tool/p3.mjs')}`);
  return { base, list };
}
