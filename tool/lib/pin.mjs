// pin move <product slug> (measured 3-4 Nov: a process3 fix reached the product only after a
// separate pin-move session was briefed by hand): the pin move as one short session's
// create_session call, printed, nothing written. Run in process3; it is the last act a process3
// build prints when its fix unblocks a product. The session starts from the product's tranche,
// clone depth 1; it fetches the pin without --depth, so the merge tool's ancestry check (a forward
// move, not a downgrade) reads history; it runs setup check --at HEAD on its branch, since the
// default judges the tranche's old pin; and it merges by merge --plain, which prints BOB's wake.
import { P3 } from './job.mjs';
import { fail, git } from './util.mjs';

const SLUG = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const SESSION = /^session_[A-Za-z0-9]+$/;

export function pinMoveText({ slug, pin, tranche = 'tranche', report, why }) {
  const short = pin.slice(0, 10);
  const branch = `p3/pin-${short}`;
  const [owner, repo] = slug.split('/');
  const L = [`# Pin move: ${slug} to process3 ${short}`, ''];
  L.push(`You are a short session that moves ${slug}'s process pin (\`.process\`) to process3 commit \`${pin}\` and ends. Why: ${why}. Bob's standing approvals in CLAUDE.md on the tranche are your authority. Give each judged act (a push, a merge) its own shell command. If an act is refused, never reword or reroute it: send its exact words to \`${report}\` with send_message and end.`, '');
  L.push(`1. \`git fetch origin ${tranche} --depth 1\`, then \`git checkout -q -b ${branch} FETCH_HEAD\``);
  L.push('2. `git submodule update --init .process`');
  L.push(`3. \`git -C .process fetch origin ${pin}\` (no --depth: the merge tool reads the pin's ancestry), then \`git -C .process checkout -q --detach ${pin}\``);
  L.push(`4. \`git add .process\`, then \`git commit -q -m "process: pin ${short}"\``);
  // Review of PR 72: one rule for every gap would copy the process lines over CLAUDE.md and its approvals block.
  L.push(`5. \`${P3} setup check --at HEAD\`. For each gap, as it names: a workflow differing from or lacking the pin's shim, copy \`.process/shims/<f>\` to \`.github/workflows/<f>\`; CLAUDE.md lacking the process lines, replace the old process lines below the approvals block with those of \`.process/shims/CLAUDE.process.md\` ({tranche} as ${tranche}), changing nothing in the approvals block. Commit, and run it again. A gap in \`.claude/settings.json\` (the owner's file), or any other gap: send it to \`${report}\` and end.`);
  L.push(`6. \`git push -u origin ${branch}\``);
  L.push(`7. create_pull_request {"owner":"${owner}","repo":"${repo}","head":"${branch}","base":"${tranche}","title":"process: pin ${short}","body":"Moves the process pin to process3 ${pin}. ${why.replace(/["\\]/g, '')}"}`);
  L.push(`8. \`${P3} merge <that pull request> --plain --as pin --no-review "a process pin move; the fix was reviewed in process3"\``);
  L.push(`9. It prints the wake of BOB: run that send as printed, then send_message to the address it prints, then \`${P3} send delivered <n> --from pin\`.`);
  L.push(`10. Send \`${report}\` one message with send_message: the pull request, the merge commit, and the wake's number. Then end.`);
  return L.join('\n') + '\n';
}

// pin defaults to process3's tranche tip on origin, fetched.
export function pinMove(root, slug, { pin, tranche = 'tranche', report, why, log = console.log } = {}) {
  if (!SLUG.test(String(slug ?? ''))) fail(`pin move <owner/repo>, the product's slug, not ${JSON.stringify(slug ?? '')}`);
  if (!SESSION.test(String(report ?? ''))) fail('pin move needs --report <session id>: the session the pin move reports to (your own, from get_session)');
  if (typeof why !== 'string' || !why.trim()) fail('pin move needs --why "<what the fix unblocks>"');
  if (typeof tranche !== 'string' || !/^[\w./-]+$/.test(tranche)) fail(`--tranche <the product's tranche branch>, not ${JSON.stringify(tranche)}`);
  if (pin === undefined) {
    git(['fetch', '-q', 'origin', '+refs/heads/tranche:refs/remotes/origin/tranche'], { cwd: root });
    pin = git(['rev-parse', 'refs/remotes/origin/tranche'], { cwd: root });
  }
  if (!/^[0-9a-f]{40}$/.test(String(pin))) fail(`--pin <a process3 commit, 40 hex>, not ${JSON.stringify(pin)}`);
  const prompt = pinMoveText({ slug, pin, tranche, report, why: why.trim().replace(/\s+/g, ' ') });
  // From the product's tranche by name: the session's first command fetches the tip and checks it out.
  const call = { title: `pin move ${pin.slice(0, 10)}`, source_url: `https://github.com/${slug}`, source_revision: tranche, clone_depth: 1, prompt };
  log(prompt);
  log(`next act: start the pin move with create_session:\n${JSON.stringify(call, null, 2)}`);
  return { prompt, call, pin };
}
