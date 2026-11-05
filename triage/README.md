# The process's triage lane

The process-triage lane's folder (tool/lib/register.mjs). It studies identified Process3 problems until the proper fix is understood, routes the fix to a builder or job, and closes each problem once its end condition holds. Product problems go to the product's own triage lane.

- `register.json`: the open entries. Each short-term entry's interim measure, its decider and its end condition are printed verbatim into the initial prompts of the roles it names; long-term entries are judged against the requirement, principle or foundation they name and printed nowhere.
- `closed.jsonl`: each closed entry, with how its end condition was met.

Written only by `p3 triage add`, `p3 triage close` (with `--how`), read with `p3 triage list`.
