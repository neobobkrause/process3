# Draft: standing approvals for the whole build process (4 Nov)

Drafted by the coordinator at Bob's request on 4 Nov. Bob says that if the standing approvals don't let sessions run container-images.yml, they are not sufficient, and asked for text that includes that and every other approval the build process needs. It is a draft. Nothing changes until Bob puts it in CLAUDE.md, in process3, the copy and the probe, through the tranche's PR. No session grants itself approvals.

What changes from the current text (d1127cb), and why:

1. **Container images.** The process may run container-images and push the product's images to its own Docker Hub namespace (docker.io/civicsmith) and its own GHCR packages, by tag or digest, and never delete one. Why: a tranche close that changes image sources fires the workflow on its push to main. New members such as reader-container need their first image published before a deploy can name it by digest.
2. **Product workflow files.** The process may change the product's own workflows, through gated merges only. It may never add or rename a job that matches a required check, widen a workflow's permissions, add pull_request_target, or change the process gate other than to its pinned shim. Why: the copy's first close carries two such changes (K5646, ONB-6). Bob's word of about 07:35 on 4 Nov gives the process these.
3. **Development signing keys as GitHub secrets.** The process may create, in the process's repositories, Actions secrets whose values a session or its own workflow generated, for development signing only. It names them and never reads them. Why: development catalogue seeds (ai-catalogue R39/R51) and development releases sign with keys the process makes. Bob's offline keys stay his, for public releases.
4. **Generated files and generators in Bob's design stream.** The process may fix a generator under docs/development/ux-substrate and stop committing its oversized output. It may change a component's measured sizes when a recorded decision such as DEC-412 already fixes the value. It never changes wording or makes a design decision there. Why: words-reads.json (store-assembly R95) and .cs-btn (site R18). Bob's word of about 07:35 on 4 Nov gives the process these.
5. **Branches the process made.** No change: deleting stays forbidden. Nothing in the build needs it, and leftover branches cost nothing.

Still Bob's: public releases, promotion to installed sites, repository and permission settings, rulesets, the protected environment, email, and anything outside the named accounts.

## Proposed text (replaces the "Standing approvals from Bob" section)

## Standing approvals from Bob

Standing approvals from Bob, 1 Nov 2026, widened for development releases and for every step of the development process on 2 Nov 2026, made exact for Cloudflare on 2 Nov 2026, and widened on 4 Nov 2026 for development releases, container images, product workflows, development signing secrets and generated design-stream files. They cover every Claude session working on Process3 or on products under it, including sessions that other sessions started. Such sessions may, without asking me: start, message, interrupt and archive Claude sessions working on Process3 or those products on the Claude account the acting session itself runs under; subscribe to and unsubscribe from activity on the process's pull requests; create, switch off and delete the process's scheduled tasks on that account; notify me by push notification; and create and edit Process3 pages and documents on claude.ai under that account.

In the process's GitHub repositories only (the product's repository neobobkrause/civicsmith-copy, neobobkrause/process3 and neobobkrause/process3-probes), they may:
- push to their own working branches and to the process's state branch;
- create tranche branches from main;
- open, edit, comment on, review without approving, mark ready or draft, close and reopen pull requests;
- through the process's merge tool, merge pull requests into working and tranche branches once its gate and their required checks pass, without a person's review, and merge the tranche's pull request into main the same way;
- run builds and tests, fetching public packages and images for them;
- run, re-run and cancel those repositories' own workflows, including container-images, including when a merge's push fires it;
- cut, sign and publish development releases, as GitHub pre-releases with their tags, marked development, and install and upgrade them on development deployments;
- change those repositories' own workflow files, only through pull requests the merge tool merges after a green gate. No such change may add or rename a job whose name matches a required check, widen any workflow's or job's permissions, add a pull_request_target trigger, or make the process gate anything but the process's own shim at the pinned process;
- create Actions secrets in those repositories whose values the session or the repository's own workflow generated, for development signing only, naming them and never reading, printing, copying, overwriting or deleting any secret they did not create.

On Docker Hub and GHCR, they may push the product's own images, only through those repositories' workflows: to docker.io/civicsmith and to the product's GHCR packages under neobobkrause, by tag or by digest. They never delete or retag an image another run published, and never push any other name.

In the product's own Cloudflare account, the one named by cloudflare_account in process/config.json, and in no other (the rehearsal account named by CS_TEST_CF_ACCOUNT_ID stays governed only by its own rule), they may:
- read everything except secret values;
- create, deploy, configure, seed, reset and delete development deployments and all their data. A development deployment is any resource in that account except those this paragraph forbids changing below. Today those are the Workers biosmoke8, plat-s1, agent-runner, agent-runner-plat-s1, agent-worker, agent-worker-plat-s1, file-scanner, ocr-worker, pdf-worker, pdf-worker-plat-s1 and sheet-worker; the R2 buckets bio-captures, bio-published, bio-captures-plat-s1, bio-published-plat-s1 and bio-walks; and the Durable Objects and container applications those Workers define. Any new Worker, R2 bucket, container application or other resource whose name begins with p3dev- or contains -p3dev- is a development deployment, with the Durable Objects and container applications it defines;
- give development deployments workers.dev addresses and preview URLs;
- set their variables, scheduled triggers, limits, log settings, and secrets whose values the session or a p3dev- install it ran generated;
- bind them only to development deployments, themselves included, and to browser rendering;
- deploy to them container images the product has already published on Docker Hub, named by digest;
- use browser rendering from them;
- cause those deployments to sign development releases and development catalogue seeds with the signing secrets they hold. They name the secrets only, never reading, printing, copying, overwriting or deleting them, and never delete a secret that neither the session nor a p3dev- install it ran set, or a resource that holds one;
- run walkers and other tests against them;
- incur the usage charges this work causes in that account.
They send no email from that account until I name an address here. All data in that account is throwaway, but that widens nothing. Sessions may not change or delete anything else in that account, including the worker civicsmith-site and its website at civicsmith.org and www.civicsmith.org, the installer worker newgroup, DNS zones and records, email routing, custom domains and routes, and the account's plans, settings, members and API tokens.

In the product's design stream (docs/development/ux-substrate), which my rulings otherwise keep from process sessions, they may:
- fix a generator so that its output matches the product's code;
- stop committing a generated file that is over the process's size limit and have it built where it is needed;
- add a module's entries for words already in the stream;
- set a component's measured value when a recorded decision of mine already fixes it.
They never change wording there or make a design decision; those stay with my design stream.

They may never: force-push; delete a branch, tag or release, or choose the delete-branch option when merging; change permission, repository or ruleset settings, or the protected environment; push to main except through the tranche's pull request; publish a public release (one not marked as a development pre-release) or install any release on a site other than a development deployment without my approval, given through the protected GitHub environment that names me as required reviewer; sign anything with my own offline keys, which they never hold; reveal any secret value, including through code they deploy; or act on any account or service other than those named here. Reading public documentation, fetching public packages and images, and Cloudflare pulling the product's images from Docker Hub are not acts on another service.
