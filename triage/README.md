# The process's triage lane

The process-triage lane's folder (tool/lib/register.mjs). BOB starts the lane. It studies each identified Process3 problem and brings Bob options with their context before a response is chosen (AUD-8). Product problems go to the product's own triage lane.

- `register.json`: the open entries. Each holds the problem, its evidence and its options with their context; once a response is chosen, the response word for word, the dated words that chose it and, for a short-term one, its end condition and the roles it reaches. Only a chosen short-term response is printed, verbatim with its end condition, into the starting prompts of the roles it names. Temporary measures live here, never as rulebook lines (AUD-9, TXT-3).
- `closed.jsonl`: each closed entry, with how its end condition was met.

Written only by `p3 triage add`, `p3 triage choose`, `p3 triage close` (with `--how`), read with `p3 triage list`.
