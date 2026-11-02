// setup check (setup audit, 2 Nov): the product's setup, read and reported, one line per
// condition of setup/conditions.json. Read-only. job start runs it first and stops on a gap.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { approvalsBlock, webCommitByOwner } from './record.mjs';
import { DEFAULTS, exists, fail, gh, git, loadConfig, run } from './util.mjs';

export const CONDITIONS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'setup', 'conditions.json');
export const loadConditions = (file = CONDITIONS) => JSON.parse(readFileSync(file, 'utf8')).conditions;
export const CONFIRMED = 'confirmed once on the onboarding page';
const ACTIONS_APP = 15368; // GitHub Actions: a required check from any other source could be posted by a session
const DAY = 86400000;

const api = (path) => gh(['api', path], { allowFail: true });

// The tranche's files, through git, so no session reads them through the contents API.
function tranche(root, name, fetch = true) {
  if (fetch) git(['fetch', '-q', 'origin', `+refs/heads/${name}:refs/remotes/origin/${name}`], { cwd: root, allowFail: true });
  const ref = `origin/${name}`;
  return (file) => {
    if (git(['rev-parse', '-q', '--verify', ref], { cwd: root, allowFail: true }).code !== 0 || !exists(root, ref, file)) return null;
    return git(['show', `${ref}:${file}`], { cwd: root });
  };
}

// The tranche's last commit that changed the approvals block, read through git by ancestry
// (reviews of PR 24): from the tranche's tip, follow a parent whose block is the same; the commit
// none of whose parents has its block is the one that set it. A shallow clone is deepened first;
// a walk that still reaches its edge returns { shallow }, never a wrong commit.
const MAX_WALK = 20000;
export function lastApprovalsChange(root, name, file, heading) {
  const ref = `origin/${name}`;
  const g = (args) => git(args, { cwd: root, allowFail: true });
  const isShallow = () => g(['rev-parse', '--is-shallow-repository']).stdout.trim() === 'true';
  if (isShallow()) g(['fetch', '-q', '--unshallow', 'origin', `+refs/heads/${name}:refs/remotes/origin/${name}`]);
  const edge = new Set();
  if (isShallow()) {
    const f = g(['rev-parse', '--git-path', 'shallow']).stdout.trim();
    try { for (const l of readFileSync(f.startsWith('/') ? f : join(root, f), 'utf8').split('\n')) if (l.trim()) edge.add(l.trim()); } catch { /* none */ }
  }
  const tip = g(['rev-parse', '-q', '--verify', `${ref}^{commit}`]);
  if (tip.code !== 0) return null;
  const memo = new Map();
  const blockAt = (rev) => {
    if (!memo.has(rev)) memo.set(rev, exists(root, rev, file) ? approvalsBlock(git(['show', `${rev}:${file}`], { cwd: root }), heading) : '');
    return memo.get(rev);
  };
  let cur = tip.stdout.trim();
  for (let i = 0; i < MAX_WALK; i++) {
    if (edge.has(cur)) return { shallow: cur };
    const now = blockAt(cur);
    if (!now) return null;
    const parents = g(['rev-list', '--parents', '-n', '1', cur]).stdout.trim().split(' ').slice(1);
    const same = parents.find((p) => blockAt(p) === now);
    if (!same) return cur;
    cur = same;
  }
  return null;
}

// Is this session's own checkout the tranche? Set when HEAD descends from the tranche's tip, or
// when it holds nothing main has that the tranche lacks (main's own merge commits, say) and
// carries the tranche's current approvals block: a session started from the tranche, which has
// moved on since, even past a merge into main. A checkout of main is not: it holds main's own
// commits, or no approvals block (reviews of PR 24). fix says what to do when it is not.
export function sessionOnTranche(root, name, { main = 'main', file = DEFAULTS.approvals.file, heading = DEFAULTS.approvals.heading } = {}) {
  const ref = `origin/${name}`;
  const g = (args) => git(args, { cwd: root, allowFail: true });
  const restart = `Start the session from the ${name} branch`;
  g(['fetch', '-q', 'origin', `+refs/heads/${main}:refs/remotes/origin/${main}`]);
  if (g(['rev-parse', '-q', '--verify', `${ref}^{commit}`]).code !== 0) return { ok: false, why: `${ref} is not here`, fix: restart };
  if (g(['rev-parse', '-q', '--verify', 'HEAD^{commit}']).code !== 0) return { ok: false, why: 'this checkout has no commit', fix: restart };
  const anc = (a, b) => g(['merge-base', '--is-ancestor', a, b]).code === 0;
  const abbrev = g(['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
  const here = abbrev === 'HEAD' ? `this checkout (detached at ${g(['rev-parse', '--short', 'HEAD']).stdout.trim()})` : abbrev;
  // main is never the tranche, checked before anything else (third re-review): by name; at
  // main's tip under any name, unless the tranche's tip is that same commit; or holding a
  // commit of main's that the tranche lacks, such as main's merge of the tranche at a release.
  const head = g(['rev-parse', 'HEAD']).stdout.trim();
  const mainTip = g(['rev-parse', '-q', '--verify', `origin/${main}^{commit}`]).stdout.trim();
  const trancheTip = g(['rev-parse', ref]).stdout.trim();
  if (abbrev === main || (mainTip && head === mainTip && head !== trancheTip)) return { ok: false, why: `${here} is on ${main}, not ${name}`, fix: restart };
  if (mainTip) {
    const bases = g(['merge-base', '--all', 'HEAD', `origin/${main}`]).stdout.split('\n').filter(Boolean);
    const mainOnly = bases.length ? g(['rev-list', '-n', '1', ...bases, '--not', ref]).stdout.trim() : '';
    if (mainOnly) return { ok: false, why: `${here} holds ${main}'s commit ${mainOnly.slice(0, 10)}, which ${name} does not, so it is not from ${name}`, fix: restart };
  }
  if (anc(ref, 'HEAD')) return { ok: true, why: `${here} descends from the tip of ${name}` };
  // No shared history with the tranche: not from it, whatever its files say.
  if (!g(['merge-base', 'HEAD', ref]).stdout.trim()) return { ok: false, why: `${here} shares no history with ${name}`, fix: restart };
  const blockAt = (rev) => (exists(root, rev, file) ? approvalsBlock(git(['show', `${rev}:${file}`], { cwd: root }), heading) : '');
  const now = blockAt('HEAD');
  if (!now) return { ok: false, why: `${here} holds no approvals block, so it is not from ${name}`, fix: restart };
  if (now !== blockAt(ref)) return { ok: false, why: `${here} holds older approvals than ${ref}`, fix: `Bring it up to date with ${name} (git pull origin ${name}), or start the session from the ${name} branch` };
  return { ok: true, why: `${here} is from ${name}'s history and holds its current approvals` };
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
    if (text === null) return missing(`no .claude/settings.json on ${x.cfg.tranche}`);
    let deny;
    try { deny = JSON.parse(text).permissions?.deny || []; } catch { return missing(`.claude/settings.json on ${x.cfg.tranche} is not JSON`); }
    const gaps = [
      ...c.value.deny.filter((d) => !deny.includes(d)).map((d) => `lacks ${d}`),
      ...deny.filter((d) => c.value.push_commands.some((cmd) => bashRuleMatches(d, cmd))).map((d) => `holds ${d}, which blocks a session's push of its own branch`),
    ];
    return gaps.length ? missing(gaps.join('; ')) : set(`${deny.length} deny rules on ${x.cfg.tranche}`);
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
    if (names === undefined) return { state: 'not configured', detail: 'process/config.json lists no environment' };
    if (!Array.isArray(names) || !names.every((n) => typeof n === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(n))) return missing('process/config.json "environment" is not a list of variable names');
    const absent = names.filter((n) => !x.env[n]);
    return absent.length ? missing(`not in this session's environment: ${absent.join(', ')}`) : set(`present: ${names.join(', ')}`);
  },

  'deploy-account': (c, x) => {
    const want = x.cfg.cloudflare_account;
    if (want === undefined) return { state: 'not configured', detail: 'process/config.json names no cloudflare_account' };
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

  // The approvals (Bob, 2 Nov): one block in CLAUDE.md on the tranche, last changed by the
  // owner's own commit through GitHub's website, judged as the record check judges it.
  approvals: (c, x) => {
    const { file, heading, owner } = x.cfg.approvals;
    const text = x.file(file);
    if (text === null) return missing(`no ${file} on ${x.cfg.tranche}`);
    // Counted as the record check counts them, which flags a second approvals heading.
    const count = text.split('\n').filter((l) => /^#{1,6}\s.*approv/i.test(l.trim())).length;
    if (!approvalsBlock(text, heading)) return missing(`${file} on ${x.cfg.tranche} has no "${heading}" block`);
    if (count > 1) return missing(`${file} on ${x.cfg.tranche} has ${count} approvals headings; only one block may exist`);
    const sha = x.lastChange(file, heading);
    if (sha?.shallow) return missing(`the history of ${file} on ${x.cfg.tranche} is shallow at ${sha.shallow.slice(0, 10)} and could not be deepened, so its last change cannot be found`);
    if (!sha) return missing(`could not find the commit that last changed the approvals on ${x.cfg.tranche}`);
    const v = x.ownerCommit(sha, owner);
    return v.ok ? set(`one block, last changed by ${owner}'s website commit ${sha.slice(0, 10)}`)
      : missing(`the approvals were last changed by ${sha.slice(0, 10)}, which is not ${owner}'s own commit through GitHub's website (${v.why})`);
  },

  // The session's own checkout (Bob, 2 Nov): a session acts on the approvals only when CLAUDE.md
  // is on the branch it started from, so every session starts from the tranche.
  'session-branch': (c, x) => {
    const r = x.onTranche();
    return r.ok ? set(r.why) : missing(`${r.why}. ${r.fix || `Start the session from the ${x.cfg.tranche} branch`}`);
  },

  // The deploy token's scopes, by harmless reads in the configured account; never the token.
  'deploy-token': (c, x) => {
    const acct = x.cfg.cloudflare_account;
    if (acct === undefined) return { state: 'not configured', detail: 'process/config.json names no cloudflare_account' };
    if (!x.env.CLOUDFLARE_API_TOKEN) return missing("CLOUDFLARE_API_TOKEN is not in this session's environment");
    const res = c.value.map((s) => {
      const r = x.cf(s.read.replace('{account}', encodeURIComponent(String(acct))));
      return { s, ok: r.status === 200 && r.success, status: r.status };
    });
    const line = res.map(({ s, ok, status }) => `${s.scope}: ${ok ? 'present' : `missing (${status || 'no answer'})`}`).join('; ');
    return res.every((r) => r.ok) ? set(line) : missing(line);
  },

  coordinator: (c, x) => {
    const text = x.file('process/config.json');
    if (text === null) return missing(`no process/config.json on ${x.cfg.tranche}`);
    let coord;
    try { coord = JSON.parse(text).coordinator; } catch { return missing(`process/config.json on ${x.cfg.tranche} is not JSON`); }
    return typeof coord === 'string' && coord.trim() ? set(coord) : missing(`process/config.json on ${x.cfg.tranche} names no coordinator`);
  },
};
export const READERS = Object.keys(readers);

// Every condition, read or confirmed. ok is false when any condition is missing; unmeasured,
// not configured and confirmed conditions do not stop a start.
export function setupCheck(root, { slug, conditions = loadConditions(), io = {}, log = console.log } = {}) {
  const local = loadConfig(root);
  const x = { slug, main: 'main', api: io.api || api, env: io.env || process.env };
  x.file = io.file || tranche(root, local.tranche);
  // The tranche's own config, when it has one, names the tranche and the required check.
  let cfg = local;
  try { const t = x.file('process/config.json'); if (t) cfg = { ...local, ...JSON.parse(t) }; } catch { /* the coordinator reader reports it */ }
  // The approvals' file, heading and owner come from the tranche's config, never the session's
  // own checkout (review of PR 24).
  let tcfg = {};
  try { tcfg = JSON.parse(x.file('process/config.json') || '{}') || {}; } catch { /* the coordinator reader reports it */ }
  x.cfg = { ...cfg, approvals: { ...DEFAULTS.approvals, ...(tcfg.approvals || {}) } };
  // When the tranche's own config names another tranche, every git reader reads that one.
  // Its config is read again from there, so the approvals' file, heading and owner are that
  // tranche's own (third re-review); one hop only.
  if (!io.file && x.cfg.tranche !== local.tranche) {
    const name = x.cfg.tranche;
    x.file = tranche(root, name);
    let t2 = {};
    try { t2 = JSON.parse(x.file('process/config.json') || '{}') || {}; } catch { /* the coordinator reader reports it */ }
    // A second tranche with no config of its own keeps the first tranche's (fourth re-review).
    const has = Object.keys(t2).length > 0;
    x.cfg = has ? { ...local, ...t2, tranche: name, approvals: { ...DEFAULTS.approvals, ...(t2.approvals || {}) } } : { ...x.cfg, tranche: name };
  }
  x.branchExists = io.branchExists || ((b) => {
    const r = git(['ls-remote', '--heads', 'origin', `refs/heads/${b}`], { cwd: root, allowFail: true });
    return r.code !== 0 || r.stdout.trim() !== '';
  });
  x.lastChange = io.lastChange || ((file, heading) => lastApprovalsChange(root, x.cfg.tranche, file, heading));
  x.ownerCommit = io.ownerCommit || ((sha, owner) => webCommitByOwner(root, sha, owner, (args) => x.api(args[1]), slug));
  x.onTranche = io.onTranche || (() => sessionOnTranche(root, x.cfg.tranche, { main: x.main, ...x.cfg.approvals }));
  x.cf = io.cf || ((path) => cloudflareRead(path, x.env));
  x.required = [].concat(x.cfg.required_check || 'gate');
  let repo;
  x.repo = () => (repo === undefined ? (repo = x.api(`repos/${slug}`)) : repo);
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
  log(`setup check for ${slug}, tranche ${x.cfg.tranche}:`);
  for (const r of results) log(`- ${r.state}: ${r.id}: ${r.detail}`);
  log(gaps.length ? `${gaps.length} condition(s) missing: ${gaps.map((r) => r.id).join(', ')}` : 'every condition that can be read is set');
  return { ok: !gaps.length, results, missing: gaps.map((r) => r.id), tranche: x.cfg.tranche };
}

// The developer's steps (setup/DEVELOPER.md) against this list: each step complete, naming only
// conditions that are the developer's; every developer condition with a step; the deny lines
// the page prints equal to the deny-list condition's. Returns the problems.
export const DEVELOPER = join(dirname(CONDITIONS), 'DEVELOPER.md');
export const isDeveloper = (c) => /^the developer\b/.test(c.who);
export function developerSteps(text) {
  return text.split(/^## /m).slice(1).filter((s) => /^Step \d+\./.test(s)).map((s) => ({
    title: s.split('\n')[0],
    body: s,
    parts: ['Why:', 'Clicks:', 'How BOB confirms:', 'Sets:'].filter((p) => new RegExp(`^${p}`, 'm').test(s)),
    // A "Sets: none" line names no condition, whatever its reason mentions (review of PR 24).
    sets: /^Sets: none\b/m.test(s) ? [] : [...(s.match(/^Sets:(.*)$/m)?.[1] || '').matchAll(/`([^`]+)`/g)].map((m) => m[1]),
  }));
}
export function checkDeveloperSteps(text, conditions = loadConditions()) {
  const problems = [];
  const steps = developerSteps(text);
  const byId = new Map(conditions.map((c) => [c.id, c]));
  if (!steps.length) problems.push('no steps');
  for (const s of steps) {
    const lack = ['Why:', 'Clicks:', 'How BOB confirms:', 'Sets:'].filter((p) => !s.parts.includes(p));
    if (lack.length) problems.push(`${s.title}: lacks ${lack.join(', ')}`);
    // A step that names no condition says why (Bob, 2 Nov): "Sets: none, because ..." or "none; ...".
    if (s.parts.includes('Sets:') && !s.sets.length && !/^Sets: none(,? because|;)\s+\S+(\s+\S+){3,}/m.test(s.body)) problems.push(`${s.title}: names no condition and does not say why`);
    // Every website edit that may become a pull request says to set its base to the tranche.
    const commits = (s.body.match(/\*\*Commit changes\.\.\.\*\*/g) || []).length;
    if (commits && (s.body.match(/set \*\*base\*\* to the tranche, not `main`/g) || []).length < commits) problems.push(`${s.title}: a website commit that does not say to set base to the tranche, not main`);
    for (const id of s.sets) {
      if (!byId.has(id)) problems.push(`${s.title}: names ${id}, which is not in the list`);
      else if (!isDeveloper(byId.get(id))) problems.push(`${s.title}: names ${id}, which is not the developer's`);
    }
  }
  const named = new Set(steps.flatMap((s) => s.sets));
  for (const c of conditions.filter(isDeveloper)) if (!named.has(c.id)) problems.push(`${c.id} is the developer's and has no step`);
  // The deny step shows the whole .claude/settings.json, as valid JSON, its deny list the list's.
  const deny = byId.get('deny-list')?.value?.deny;
  const step = steps.find((s) => s.sets.includes('deny-list'));
  if (deny && step) {
    let shown;
    try { shown = JSON.parse(step.body.match(/```json\n([\s\S]*?)```/)?.[1] ?? ''); } catch { shown = undefined; }
    if (!shown || typeof shown !== 'object') problems.push('the deny step does not show the whole .claude/settings.json as valid JSON');
    else if (JSON.stringify(shown.permissions?.deny) !== JSON.stringify(deny)) problems.push('the deny lines on the page differ from the deny-list condition');
  }
  // The number of steps stated at the top is the number of steps.
  const stated = text.match(/^There are (\d+) steps\b/m)?.[1];
  if (Number(stated) !== steps.length) problems.push(`the page says ${stated ?? 'no number of'} steps, and has ${steps.length}`);
  steps.forEach((s, i) => { if (!s.title.startsWith(`Step ${i + 1}.`)) problems.push(`${s.title}: out of order, expected Step ${i + 1}`); });
  if (/[\u2014\u2013]/.test(text)) problems.push('an em-dash');
  return problems;
}
