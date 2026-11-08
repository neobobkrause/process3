# Draft: CLAUDE.md approvals amendment for biosmoke (for Bob to commit), 8 Nov

Bob in session, 8 Nov: "The biosmoke8 install (indeed, any biosmokeN release) is for development testing purposes only. The deployment and any data captured or generated during testing with by deleting when testing is completed."
Answer the same day: releases are walked on biosmokeN; Bob amends CLAUDE.md.

The same approvals block is in three repositories (process3, civicsmith-copy, process3-probes). Make both edits in each.

## Edit 1: the protected list

Replace:
> except those this paragraph forbids changing below (today the Workers biosmoke8, plat-s1, agent-runner, agent-runner-plat-s1, agent-worker, agent-worker-plat-s1, file-scanner, ocr-worker, pdf-worker, pdf-worker-plat-s1 and sheet-worker, the R2 buckets bio-captures, bio-published, bio-captures-plat-s1, bio-published-plat-s1 and bio-walks, and the Durable Objects and container applications those Workers define)

with:
> except those this paragraph forbids changing below (today the Workers plat-s1, agent-runner-plat-s1, agent-worker-plat-s1 and pdf-worker-plat-s1, the R2 buckets bio-captures-plat-s1, bio-published-plat-s1 and bio-walks, and the Durable Objects and container applications those Workers define). Any Worker named biosmoke followed by a number is a development deployment, for testing releases only, together with the Workers it binds (today agent-runner, agent-worker, file-scanner, ocr-worker, pdf-worker and sheet-worker) and the R2 buckets bio-captures and bio-published; sessions may install and upgrade a release in it, walk it, and delete it and all data captured or generated in testing once testing is complete

Checked 8 Nov: plat-s1 binds only its own -plat-s1 Workers and buckets, and agent-worker's PLANE binding is biosmoke8. So the generic fleet serves biosmoke alone. bio-walks stays protected; say if it should move.

## Edit 2: deleting a test deployment that holds secrets

Replace:
> never deleting a secret that neither the session nor a p3dev- install it ran set, or a resource that holds one

with:
> never deleting a secret that neither the session nor a p3dev- install a process session ran set, or a resource that holds one, except that a development deployment named p3dev- or biosmoke followed by a number may be deleted whole, its secrets with it, once its testing is complete

Why: round 1's stacks p3dev-l1, p3dev-l3 and p3dev-t1 each hold an ADMIN_TOKEN that an earlier session's walk setup generated. Read literally, the current text forbids any later session from deleting them, and the rest of each stack is bound to those Workers. biosmoke8 holds secrets set by the installer (ACCOUNT_SEAL_SECRET, ADMIN_TOKEN, DAEMON_TOKEN, PROBE_TOKEN, CIVICSMITH_TEST_INSTANCE).

Unchanged: newgroup, civicsmith-site, DNS, domains and routes, the account's settings, the no-reveal rule, never reading or printing a secret's value, and plat-s1's set.

After you commit it: the coordinator deletes p3dev-l1, p3dev-l3 and p3dev-t1, and a builder wires `deploy release` to install each cut release into biosmokeN and walk it.
