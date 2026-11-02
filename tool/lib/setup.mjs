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
const noBypass = (rs) => !rs.current_user_can_bypass || rs.current_user_can_bypass === 'never';

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
      ...c.value.deny_matching.filter((m) => !deny.some((d) => new RegExp(m.pattern).test(d))).map((m) => `lacks a rule for ${m.rule} (such as ${m.example})`),
      ...c.value.not.filter((d) => deny.includes(d)).map((d) => `holds ${d}, which blocks every push`),
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

  coordinator: (c, x) => {
    const text = x.file('process/config.json');
    if (text === null) return missing(`no process/config.json on ${x.cfg.tranche}`);
    let coord;
    try { coord = JSON.parse(text).coordinator; } catch { return missing(`process/config.json on ${x.cfg.tranche} is not JSON`); }
    return typeof coord === 'string' && coord.trim() ? set(coord) : missing(`process/config.json on ${x.cfg.tranche} names no coordinator`);
  },
};
export const READERS = Object.keys(readers);

// Every condition, read or confirmed. ok is false when any condition is missing; unmeasured
// and confirmed conditions do not stop a start.
export function setupCheck(root, { slug, conditions = loadConditions(), io = {}, log = console.log } = {}) {
  const local = loadConfig(root);
  const x = { slug, api: io.api || api };
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
