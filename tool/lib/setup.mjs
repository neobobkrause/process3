// setup check (setup audit, 2 Nov): the product's setup, read and reported, one line per
// condition of setup/conditions.json. Read-only. job start runs it first and stops on a gap.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exists, fail, gh, git, loadConfig } from './util.mjs';

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
      else if (!methods.some((m) => Array.isArray(m) && m.length === c.value.merge_methods.length && c.value.merge_methods.every((v) => m.includes(v)))) gaps.push(`${b}: merge methods are not ${c.value.merge_methods.join(', ')} only`);
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
  // a prefix. Cloudflare's API is never called.
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
  const x = { slug, api: io.api || api, env: io.env || process.env };
  x.file = io.file || tranche(root, local.tranche);
  // The tranche's own config, when it has one, names the tranche and the required check.
  let cfg = local;
  try { const t = x.file('process/config.json'); if (t) cfg = { ...local, ...JSON.parse(t) }; } catch { /* the coordinator reader reports it */ }
  x.cfg = cfg;
  x.required = [].concat(cfg.required_check || 'gate');
  let repo;
  x.repo = () => (repo === undefined ? (repo = x.api(`repos/${slug}`)) : repo);
  x.main = 'main';
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
  log(`setup check for ${slug}, tranche ${cfg.tranche}:`);
  for (const r of results) log(`- ${r.state}: ${r.id}: ${r.detail}`);
  log(gaps.length ? `${gaps.length} condition(s) missing: ${gaps.map((r) => r.id).join(', ')}` : 'every condition that can be read is set');
  return { ok: !gaps.length, results, missing: gaps.map((r) => r.id) };
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
    sets: [...(s.match(/^Sets:(.*)$/m)?.[1] || '').matchAll(/`([^`]+)`/g)].map((m) => m[1]),
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
    for (const id of s.sets) {
      if (!byId.has(id)) problems.push(`${s.title}: names ${id}, which is not in the list`);
      else if (!isDeveloper(byId.get(id))) problems.push(`${s.title}: names ${id}, which is not the developer's`);
    }
  }
  const named = new Set(steps.flatMap((s) => s.sets));
  for (const c of conditions.filter(isDeveloper)) if (!named.has(c.id)) problems.push(`${c.id} is the developer's and has no step`);
  const deny = byId.get('deny-list')?.value?.deny;
  const step = steps.find((s) => s.sets.includes('deny-list'));
  if (deny && step) {
    const shown = (step.body.match(/```\n([\s\S]*?)```/)?.[1] || '').split('\n').map((l) => l.trim().replace(/,$/, '')).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return l; } });
    if (JSON.stringify(shown) !== JSON.stringify(deny)) problems.push('the deny lines on the page differ from the deny-list condition');
  }
  if (/\u2014/.test(text)) problems.push('an em-dash');
  return problems;
}
