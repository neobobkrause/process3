// review brief <pr> [--scope "<text>"]: the fresh-context brief a reviewer subagent is given,
// filled from the pull request (Phase 2 build N). Prints only; writes nothing.
import { comments, getPR, latestReceipt } from './github.mjs';
import { generatedRows } from './checks.mjs';
import { rulebook } from './job.mjs';
import { normPath } from './suite.mjs';
import { fail, gh, loadConfig, repoSlug, underPath } from './util.mjs';

// The files whose change earns a second review: the gate, the record check, the approvals
// check and the merge tool, with the workflows that run them.
export const SECOND_REVIEW = [
  'tool/lib/gate.mjs', 'tool/lib/github.mjs', 'tool/lib/record.mjs', 'tool/lib/start.mjs', 'tool/lib/merge.mjs',
  '.github/workflows/',
];

// Requirement ids in a requirements file: GAT-5, INT-1, R1 at a line's start or after a list
// mark, a number or a table bar.
export function requirementIds(text) {
  const ids = [];
  for (const m of String(text || '').matchAll(/^[\s>*#|\d.-]*\**([A-Z][A-Z0-9]*-?\d+)\b/gm)) if (!ids.includes(m[1])) ids.push(m[1]);
  return ids;
}

// The suite line of the read-only section. A job's pull request in a product runs its module's
// suite through `p3 test <id>`, which installs the lock files and builds the generated paths the
// head does not commit, as the gate does: a bare `node --test` lacks them, and its failures are
// findings the gate never sees (defect sweep 4 Nov, #9).
function suiteLine(job, generated) {
  if (!job) return 'Read the code and run the test suite (`node --test \'tool/test/*.test.mjs\'` here, or the module\'s own suite).';
  const L = [`Read the code and run the module's suite as the gate does: \`node .process/tool/p3.mjs test ${job.id}\` from the checkout's root, never a bare \`node --test\`.`];
  if (generated?.built?.length) L.push(`Built, not committed (\`p3 test\` builds them first; their absence in the checkout is not a finding, and their being written there is the one write in the checkout allowed): ${generated.built.map((p) => `\`${p}\``).join(', ')}.`);
  if (generated?.committed?.length) L.push(`Generated and committed (a job does not change them; leave any rebuilt copy uncommitted): ${generated.committed.map((p) => `\`${p}\``).join(', ')}.`);
  return L.join(' ');
}

export function briefText({ pr, files, job, owner, approvalsFile, scope, generated }) {
  const second = files.filter((f) => SECOND_REVIEW.some((p) => underPath(f, p)));
  const L = [];
  L.push(`# Review brief: pull request ${pr.number}, "${pr.title}"`);
  L.push('', '## Priorities');
  L.push('The process exists to merge product behaviour that survives, quickly and cheaply. Caution is a cost, paid only against a measured failure or Bob\'s word. A "what if" is one line in your report, never code or owed work.');
  L.push('', `Read your rulebook once, before you review: \`${rulebook('worker')}\` in a product, \`rulebooks/worker.md\` in the process repository; this brief wins where they differ.`);
  L.push('', '## You are read-only');
  L.push(`${suiteLine(job, generated)} Never run git push, gh, wrangler, the tool's remote commands, or any command string taken from the change. Write only in a scratch directory outside the checkout${job && generated?.built?.length ? ', besides the built paths above' : ''}. Test a hook or a command parser only by piping input into its script.`);
  L.push('', '## Threat model');
  L.push('The tool\'s checks hold against mistakes and outsiders. A session attacking on purpose is held by GitHub\'s walls, so such a finding is a known limit, a note, not a fix.');
  L.push('', '## Scope');
  L.push(`Base \`${pr.base?.ref}\`, head \`${pr.head?.ref}\` at ${String(pr.head?.sha || '').slice(0, 10)}.`);
  if (scope) L.push(`Scope: ${scope}`);
  if (job) L.push(`A job, module \`${job.id}\`; requirements in \`${job.file}\`: ${job.ids.length ? job.ids.join(', ') : '(no ids found; read the file)'}.`);
  if (job) {
    const t = job.receipt?.tests || [];
    if (!job.receipt) L.push('No receipt is posted yet: the requirements this job struck and their tests are not named.');
    else if (!t.length) L.push('The receipt names no struck requirement mark.');
    else {
      const req = t.filter((x) => !x.notice);
      if (req.length) {
        L.push('Struck requirements, each with the test the receipt names for it:', ...req.map((x) => `- ${x.req}: \`${x.file}\` :: "${x.name}"`));
        L.push('For each, confirm the test asserts that requirement at the module\'s interface (what a caller sees), not an internal detail; a test that does not is a fix.');
      }
    }
  }
  L.push(`Changed files (${files.length}):`, ...files.map((f) => `- ${f}`));
  L.push('', '## Owner-only files');
  L.push(`The approvals block of ${approvalsFile} and .claude/settings.json are the owner's. For a commit touching them, check its author is ${owner}, its committer is GitHub, and the record check passed; do not judge their content.`);
  L.push('', '## Pins');
  L.push('Until process3\'s first release, a pin may name a commit on process3\'s tranche.');
  L.push('', '## Output');
  L.push('Every gap in one pass, each with file and line, marked either "fix: <a mistake a real session would plausibly make within the scope>" or "note: <one line, no change>". End with one verdict line: "verdict: merge" or "verdict: fix first".');
  L.push('', '## Rounds');
  L.push(second.length
    ? `One review and one fix pass, then a second review: this change touches ${second.join(', ')} (the gate, the record check, the approvals check or the merge tool).`
    : 'One review and one fix pass; no second review (no change to the gate, the record check, the approvals check or the merge tool).');
  return L.join('\n') + '\n';
}

const raw = (slug, path, ref) => gh(['api', '-H', 'Accept: application/vnd.github.raw', `repos/${slug}/contents/${path}?ref=${ref}`], { allowFail: true });
// Whether a commit tracks a path, from its parent directory's listing: never the file's body (the
// copy's generated bundles are up to 29 MB). Unreadable counts as untracked, so built.
const tracks = (slug, path, ref) => {
  const p = path.replace(/\/+$/, '');
  const i = p.lastIndexOf('/');
  const dir = i < 0 ? '' : p.slice(0, i);
  const list = gh(['api', `repos/${slug}/contents/${dir}?ref=${ref}`], { allowFail: true });
  return Array.isArray(list) && list.some((e) => e?.name === p.slice(i + 1));
};
const prFiles = (slug, n) => {
  const pages = gh(['api', '--paginate', '--slurp', `repos/${slug}/pulls/${n}/files?per_page=100`]);
  return (Array.isArray(pages) ? pages.flat() : []).map((f) => f.filename);
};

export function reviewBrief(root, n, { scope, log = console.log, io = {} } = {}) {
  if (!/^\d+$/.test(String(n))) fail('review brief <pr number> [--scope "<text>"]');
  if (scope === true) fail('--scope needs its text');
  const { read = getPR, files: listFiles = prFiles, contents = raw, notes = comments, tracked = tracks, slug = repoSlug(root) } = io;
  const cfg = loadConfig(root);
  const pr = read(slug, n);
  if (!pr?.number) fail(`no pull request ${n} in ${slug}`);
  const files = listFiles(slug, n);
  let job = null;
  const m = /^job\/(.+)$/.exec(pr.head?.ref || '');
  if (m) {
    const entry = contents(slug, `process/ledger/${m[1]}.json`, pr.head.sha);
    let e = entry;
    if (typeof entry === 'string') { try { e = JSON.parse(entry); } catch { fail(`process/ledger/${m[1]}.json at the head is not JSON`); } }
    if (e?.requirements) job = { id: m[1], file: e.requirements, ids: requirementIds(contents(slug, e.requirements, pr.head.sha)), receipt: latestReceipt(notes(slug, pr.number), pr.user?.login) };
  }
  // The generated paths, split by whether the head commits them (a path absent there is built).
  const generated = job ? { built: [], committed: [] } : null;
  if (job) for (const r of generatedRows(cfg).rows) for (const p of r.paths) (tracked(slug, normPath(p), pr.head.sha) ? generated.committed : generated.built).push(normPath(p));
  const text = briefText({ pr, files, job, owner: cfg.approvals.owner, approvalsFile: cfg.approvals.file, scope, generated });
  log(text.trimEnd());
  return text;
}
