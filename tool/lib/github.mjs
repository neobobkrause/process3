// GitHub acts and reads, all through gh (platform rows 13, 14). Every remote act is recorded
// only from its result (REC-5): callers use the returned objects, never their own intent.
import { fail, gh } from './util.mjs';

export const RECEIPT = 'p3:receipt';
export const GATE = 'p3:gate';

// A machine-readable comment: an HTML marker and one fenced JSON block.
export const block = (marker, data, lead = '') =>
  `<!-- ${marker} -->\n${lead}${lead ? '\n\n' : ''}\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;

export function parseBlock(body, marker) {
  if (!body || !body.includes(`<!-- ${marker} -->`)) return null;
  const m = body.match(/```json\n([\s\S]*?)\n```/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

export function findPR(slug, head, { state = 'open' } = {}) {
  const owner = slug.split('/')[0];
  const prs = gh(['api', `repos/${slug}/pulls?state=${state}&head=${owner}:${encodeURIComponent(head)}&per_page=10`]) || [];
  return prs[0] || null;
}

export const getPR = (slug, n) => gh(['api', `repos/${slug}/pulls/${n}`]);

export function openPRs(slug, base) {
  return gh(['api', `repos/${slug}/pulls?state=open&base=${encodeURIComponent(base)}&per_page=100`], { allowFail: true });
}

export function createPR(slug, { head, base, title, body, draft = true }) {
  const pr = gh(['api', '-X', 'POST', `repos/${slug}/pulls`, '--input', '-'], {
    input: JSON.stringify({ head, base, title, body, draft }),
  });
  if (!pr?.number) fail('GitHub did not return a pull request');
  return pr;
}

export function comments(slug, n) {
  return gh(['api', '--paginate', `repos/${slug}/issues/${n}/comments?per_page=100`]) || [];
}

export function addComment(slug, n, body) {
  const c = gh(['api', '-X', 'POST', `repos/${slug}/issues/${n}/comments`, '--input', '-'], { input: JSON.stringify({ body }) });
  if (!c?.id) fail('GitHub did not return the comment');
  return c;
}

export function editComment(slug, id, body) {
  return gh(['api', '-X', 'PATCH', `repos/${slug}/issues/comments/${id}`, '--input', '-'], { input: JSON.stringify({ body }) });
}

// The newest comment carrying a marker, with its parsed block.
export function latestBlock(slug, n, marker, all = comments(slug, n)) {
  for (const c of [...all].reverse()) {
    const data = parseBlock(c.body, marker);
    if (data) return { comment: c, data };
  }
  return null;
}

export function markReady(slug, n) {
  gh(['pr', 'ready', String(n), '-R', slug]);
  const pr = getPR(slug, n);
  if (pr.draft) fail(`pull request ${n} is still a draft`);
  return pr;
}

// Conclusion of the newest check run named `name` on a commit, or null when none.
export function checkRun(slug, sha, name) {
  const r = gh(['api', `repos/${slug}/commits/${sha}/check-runs?check_name=${encodeURIComponent(name)}&per_page=20`], { allowFail: true });
  const runs = (r?.check_runs || []).sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)));
  return runs[0] || null;
}
