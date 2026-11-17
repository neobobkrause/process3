# Full-read trial observations

Read only the ten numbered fixture documents and questions.json. The numbered state document is 07-state.json, not Markdown. No answer key or other fixture content was read. No fixture edits, delegated agents, external inference calls, or paid API/CLI inference were used.

Reading sequence: one metadata listing; one combined metadata/content call covering all short documents, state, handoff and questions; then nine sequential annex content calls with bounded ranges 1–200, 201–400, 401–600, 601–800, 801–1000, 1001–1200, 1201–1400, 1401–1600, 1601–1804. All outputs returned without truncation. The initial cat used cumulative numbering across files; citations in the result use each file's own line numbers. The state file has no trailing newline, so wc -l understates its logical line count by one.

Pre-answer tool calls: 11 functions.exec invocations, each containing one exec_command; ten content-bearing calls. Annex content tool outputs reported 43,282 original tokens in total. The short-document content call reported 1,355 original tokens, including its metadata. The initial metadata listing reported 237 original tokens. These are tool-reported token counts, not billed inference token counts.

Reported shell wall times for the eleven pre-answer calls, in order, seconds: 0.000032148, 0.000031506, 0.000044015, 0.000030815, 0.000021792, 0.000030445, 0.000042773, 0.00004714, 0.00002731, 0.000028262, 0.000030515. Outer functions tool responses displayed 0.1–0.2 seconds each. End-to-end reading elapsed time was not instrumented; shell times exclude model processing and round-trip overhead.

Full source coverage (unique bytes; logical lines):

| File | Bytes | Lines read |
|---|---:|---:|
| 00-authority.md | 488 | 1–5 |
| 01-principles.md | 429 | 1–7 |
| 02-owner-amendment.md | 265 | 1–3 |
| 03-area.md | 352 | 1–5 |
| 04-module.md | 293 | 1–4 |
| 05-history.md | 193 | 1–3 |
| 06-plan.md | 252 | 1–3 |
| 07-state.json | 237 | 1–13 |
| 08-lossy-handoff.md | 152 | 1–2 |
| 09-long-annex.md | 173124 | 1–1804 |
| questions.json | 1317 | 1–66 |

Total unique source bytes: 177,102. Total logical source lines: 1,915. All were exposed in the content-bearing tool outputs. The annex contains binding addenda at lines 2, 903 and 1804 among superseded inventory entries.
