// pin move <product slug> (measured 3-4 Nov: a process3 fix reached the product only after a
// separate pin-move session was briefed by hand): the pin move as one short session's
// create_session call, printed. Run in process3; it is the last act a process3 build prints when
// its fix unblocks a product. The session starts from the product's tranche, clone depth 1; it
// fetches the pin without --depth, so the merge tool's ancestry check (a forward move, not a
// downgrade) reads history; it runs setup check --at HEAD on its branch, since the default judges
// the tranche's old pin; it merges by merge --plain, which prints BOB's wake; then it syncs each
// open layer to the new pin (layer sync --open, PD-23).
// Pin moves are serialized (measured 4 Nov on the copy: two ran at once twice in 20 minutes, and
// copy PR 108, cut before PR 106 merged, conflicted on the .process gitlink): pin move refuses
// while a pull request from a p3/pin-* head is open on the product, unless --supersedes names it,
// which closes it with a comment (its branch kept); the session checks again right before it
// pushes, and branches from the tranche tip it fetches then. Nothing else is written.
import { P3, TOOL_ROOT } from './job.mjs';
import { addComment, comments, editPR } from './github.mjs';
import { processRepo } from './merge.mjs';
import { fail, sessionCall, gh, git } from './util.mjs';

const SLUG = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const SESSION = /^session_[A-Za-z0-9]+$/;

export function pinMoveText({ slug, pin, tranche = 'tranche', report, why }) {
  const short = pin.slice(0, 10);
  const branch = `p3/pin-${short}`;
  const [owner, repo] = slug.split('/');
  const L = [`# Pin move: ${slug} to process3 ${short}`, ''];
  L.push(`You are a short session that moves ${slug}'s process pin (\`.process\`) to process3 commit \`${pin}\` and ends. Why: ${why}. Bob's standing approvals in CLAUDE.md on the tranche are your authority. Give each judged act (a push, a merge) its own shell command. If an act is refused, never reword or reroute it: send its exact words to \`${report}\` with send_message and end.`, '');
  L.push(`1. \`git fetch origin ${tranche} --depth 1\`, then \`git checkout -q -b p3-pin-work FETCH_HEAD\`, then \`git update-ref refs/p3/pin-base HEAD\``);
  L.push('2. `git submodule update --init .process`');
  L.push(`3. \`git -C .process fetch origin ${pin}\` (no --depth: the merge tool reads the pin's ancestry), then \`git -C .process checkout -q --detach ${pin}\``);
  L.push(`4. \`git add .process\`, then \`git commit -q -m "process: pin ${short}"\``);
  // Review of PR 72: one rule for every gap would copy the process lines over CLAUDE.md and its approvals block.
  L.push(`5. \`${P3} setup check --at HEAD\`. For each gap, as it names: a workflow differing from or lacking the pin's shim, copy \`.process/shims/<f>\` to \`.github/workflows/<f>\`; CLAUDE.md lacking the process lines, replace the old process lines below the approvals block with those of \`.process/shims/CLAUDE.process.md\` ({tranche} as ${tranche}), changing nothing in the approvals block. Commit, and run it again. A gap in \`.claude/settings.json\` (the owner's file), or any other gap: send it to \`${report}\` and end.`);
  // 4 Nov: a pin move cut from an older tranche tip conflicted on the gitlink; branch from the tip as it is now.
  L.push(`6. \`git fetch origin ${tranche} --depth 1\`, then \`git checkout -q -b ${branch} FETCH_HEAD\`, then \`git cherry-pick refs/p3/pin-base..p3-pin-work\`. If the cherry-pick stops (a conflict, or nothing left to pick: the tip already carries the pin), \`git cherry-pick --abort\`, send \`${report}\` what it said and end.`);
  L.push(`7. \`${P3} setup check --at HEAD\` again: a gap, as in step 5.`);
  L.push(`8. \`${P3} pin check ${slug}\` (a pin move must not run beside another): if it refuses, send its exact words to \`${report}\` and end.`);
  L.push(`9. \`${P3} github push origin ${branch} --set-upstream\``);
  L.push(`10. create_pull_request {"owner":"${owner}","repo":"${repo}","head":"${branch}","base":"${tranche}","title":"process: pin ${short}","body":"Moves the process pin to process3 ${pin}. ${why.replace(/["\\]/g, '')}"}`);
  L.push(`11. \`${P3} merge <that pull request> --plain --as pin --no-review "a process pin move; the fix was reviewed in process3"\` (a pull request that conflicts with ${tranche} is refused at once: send the refusal and end)`);
  // PD-23 (Bob, 9 Nov: "Pin moves should be lightweight fixes that improve velocity, not ruin it"): the pin move reaches every open layer itself.
  L.push(`12. \`${P3} layer sync --open\` (PD-23): each open layer's branch takes the new pin by its sync, a pin-only pull request the merge tool lands on a green gate; with no layer open it says so. If it refuses, send its exact words to \`${report}\` and end.`);
  L.push(`13. The merge printed the wake of BOB: run that send as printed, then send_message to the address it prints, then \`${P3} send delivered <n> --from pin\`. If it says no BOB is addressed, there is no wake: send nothing.`);
  L.push(`14. Send \`${report}\` one message with send_message: the pull request, the merge commit, each layer synced (its sync pull request), and the wake's number (or "no BOB"). Then end.`);
  return L.join('\n') + '\n';
}

// The product's open pin moves: its open pull requests from p3/pin-* heads, into any base.
export const PIN_HEAD = /^p3\/pin-/;
const listOpen = (slug) => {
  const pages = gh(['api', '--paginate', '--slurp', `repos/${slug}/pulls?state=open&per_page=100`], { allowFail: true });
  return Array.isArray(pages) ? pages.flat() : null;
};
export const PIN_IO = { list: listOpen, comments, comment: addComment, close: (slug, n) => editPR(slug, n, { state: 'closed' }) };
export const UNLISTED = (slug) => `could not list ${slug}'s open pull requests, so whether a pin move is open is unknown`;
// null: unread, when `unread` allows it (pin move); pin check, the guard, always refuses then.
export function openPinMoves(slug, { list = PIN_IO.list } = {}, { unread = false } = {}) {
  const prs = list(slug);
  if (!Array.isArray(prs)) { if (unread) return null; fail(UNLISTED(slug)); }
  return prs.filter((p) => PIN_HEAD.test(p.head?.ref || ''));
}
const named = (open) => open.map((p) => `PR ${p.number} (${p.head.ref})`).join(', ');
const refuseOpen = (open) => { if (open.length) fail(`a pin move is open: ${named(open)}; wait for it or close it`); };

// pin check <slug>: the printed session's check right before it pushes.
export function pinCheck(slug, { io = PIN_IO, log = console.log } = {}) {
  if (!SLUG.test(String(slug ?? ''))) fail(`pin check <owner/repo>, the product's slug, not ${JSON.stringify(slug ?? '')}`);
  refuseOpen(openPinMoves(slug, io));
  log(`no pin move is open on ${slug}`);
  return { open: [] };
}

// pin: required, a commit on process3's tranche or main, read from the repo this tool runs from (copy, 4 Nov: with no --pin it
// took the product's own tranche tip, and a positional sha was ignored). supersedes: the number of
// the one open pin move this one replaces, closed (comment, then close; the branch kept) first.
export function pinMove(root, slug, { pin, rest = [], tranche = 'tranche', report, why, supersedes, processRoot = TOOL_ROOT, io = PIN_IO, log = console.log } = {}) {
  if (!SLUG.test(String(slug ?? ''))) fail(`pin move <owner/repo>, the product's slug, not ${JSON.stringify(slug ?? '')}`);
  if (rest.length) fail(`pin move takes only the slug; ${/^[0-9a-f]{7,40}$/.test(String(rest[0])) ? `give the commit as --pin ${rest[0]}` : `not ${JSON.stringify(rest[0])}`}`);
  if (!SESSION.test(String(report ?? ''))) fail('pin move needs --report <session id>: the session the pin move reports to (your own, from get_session)');
  if (typeof why !== 'string' || !why.trim()) fail('pin move needs --why "<what the fix unblocks>"');
  if (typeof tranche !== 'string' || !/^[\w./-]+$/.test(tranche)) fail(`--tranche <the product's tranche branch>, not ${JSON.stringify(tranche)}`);
  if (!/^[0-9a-f]{40}$/.test(String(pin))) fail(`pin move needs --pin <a process3 commit, 40 hex>${pin === undefined ? '' : `, not ${JSON.stringify(pin)}`}`);
  // The merge tool's own test (merge.mjs pinChange), before --supersedes closes anything; a tag's id is not a commit's.
  if (!processRepo(processRoot).released(pin) || git(['cat-file', '-t', pin], { cwd: processRoot, allowFail: true }).stdout?.trim() !== 'commit') fail(`--pin ${pin} is not a commit on process3's tranche or main`);
  // From a session that cannot list the product's pull requests (a process3-only one, 5 Nov), the
  // call is printed all the same: the printed session runs pin check, which refuses then, before it pushes.
  const open = openPinMoves(slug, io, { unread: supersedes === undefined });
  if (open === null) log(`note: ${UNLISTED(slug)} from here; the pin-move session's own \`${P3} pin check ${slug}\` (step 8, before it pushes) guards it`);
  else if (supersedes !== undefined) {
    const n = Number(supersedes);
    if (typeof supersedes === 'boolean' || Array.isArray(supersedes) || !Number.isInteger(n) || n < 1) fail(`--supersedes <the open pin move's pull request number>, once; not ${JSON.stringify(supersedes)}`);
    const old = open.find((p) => p.number === n);
    if (!old) fail(`--supersedes ${n}: pull request ${n} is not an open pin move on ${slug}${open.length ? ` (open: ${named(open)})` : ''}`);
    if (old.head.ref === `p3/pin-${pin.slice(0, 10)}`) fail(`pull request ${n} already moves the pin to ${pin.slice(0, 10)}; wait for it`);
    refuseOpen(open.filter((p) => p !== old));
    // A rerun after a refused close (R17d) finds its comment there already: it is not posted twice.
    const note = `Superseded by a newer pin move, to process3 ${pin}. Closed by \`pin move --supersedes ${n}\`; the branch ${old.head.ref} is kept.`;
    if (!(io.comments?.(slug, n) || []).some((c) => c?.body === note)) io.comment(slug, n, note);
    io.close(slug, n);
    log(`closed pull request ${n} (${old.head.ref}) as superseded; its branch is kept`);
  } else refuseOpen(open);
  const prompt = pinMoveText({ slug, pin, tranche, report, why: why.trim().replace(/\s+/g, ' ') });
  // From the product's tranche by name: the session's first command fetches the tip and checks it out.
  const call = sessionCall({ slug, revision: tranche, title: `pin move ${pin.slice(0, 10)}`, prompt, clone: { clone_depth: 1 } });
  log(prompt);
  log(`next act: start the pin move with create_session:\n${JSON.stringify(call, null, 2)}`);
  return { prompt, call, pin };
}
