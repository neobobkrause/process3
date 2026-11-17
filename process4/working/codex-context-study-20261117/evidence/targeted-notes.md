# Targeted reader trial notes
Read only the nine assigned source files and questions.json. No fixture edits, grading, confidence claims, inference API/CLI calls or delegation.
Short sources and questions were emitted with exact line numbers in one read. Annex 1–300 emitted verbatim; 301–1804 processed sequentially in bounded chunks 301–550, 551–800, 801–1050, 1051–1300, 1301–1550, 1551–1800, 1801–1804. Each line was inspected by exact-template matching. Matching historical lines were emitted as lossless template runs with endpoints; all nonmatching lines emitted verbatim. This initial attempt was preprocessing, not whole-document model reading. It did not satisfy the requested verbatim reading comparison.
No needed question-specific information omitted due to packet cap. Packet uses shared authority rules and grouped questions to fit.
Counts use splitlines (last unterminated lines included), not wc -l newline counts.

- 00-authority.md: 5 lines, 488 bytes
- 01-principles.md: 7 lines, 429 bytes
- 02-owner-amendment.md: 3 lines, 265 bytes
- 03-area.md: 5 lines, 352 bytes
- 04-module.md: 4 lines, 293 bytes
- 05-history.md: 3 lines, 193 bytes
- 06-plan.md: 3 lines, 252 bytes
- 07-state.json: 13 lines, 237 bytes
- 09-long-annex.md: 1804 lines, 173124 bytes
- questions.json: 66 lines, 1317 bytes
Total: 1913 lines, 176950 bytes; questions: 16. Packet: 3288 UTF-8 bytes.
Read tool shell wall times reported: 0.000018657s count; 0.000028732s short-source/questions read; 0.000019078s first annex chunk; 0.000030495s compressed annex remainder. These exclude tool/model latency and are not end-to-end duration. Start timestamp not recorded. Notes written UTC 2026-11-17T15:04:21.185944+00:00.

Correction after parent instruction: annex lines 301–1804 were then read verbatim, line-numbered, in six sequential tool calls: 301–550, 551–800, 801–1050, 1051–1300, 1301–1550, 1551–1804. Each call requested 7500 output tokens. Returned original_token_count values: 6438, 6438, 6437, 6438, 6438, 6540 (sum 38729). No output truncation markers appeared. Thus all assigned documents and questions received complete verbatim model-visible line coverage after correction. The earlier preprocessing remains a methodological contamination; the trial is a corrected run rather than a clean first-pass full-reading trial. Packet was written before correction; verbatim rereading required no factual packet changes.
Correction shell wall times: 0.000034691s, 0.000035042s, 0.00012875s, 0.000037165s, 0.000023424s, 0.000029273s. End-to-end duration not measured.
