# Lossy handoff and full reload trial

This is a simulated lossy handoff, NOT a native compaction test. No compaction was invoked or observed. The same native worker first saw only the supplied handoff and questions, committed its first answers, then restored the permitted fixture. No answer key was read. Fictional fixture permissions were not exercised.

First phase: one shell read returned both handoff and questions (1469 source bytes), followed by one shell write of 16 answers. Twelve answers were UNKNOWN. JSON answers for the dated beta questions generalized the handoff's undated exports claim; this limitation is stated in their explanations. The handoff itself identifies itself as non-authority.

Restore: 9 source files, 175,633 bytes total: 00 through 07 total 2,509 bytes, and 09 annex 173,124 bytes. One whole-file concatenation read restored 00–07. Eight contiguous bounded byte chunks restored the entire annex: [0,24000), [24000,48000), [48000,72000), [72000,96000), [96000,120000), [120000,144000), [144000,168000), [168000,173124). No read output reported truncation. Each ordinary annex chunk produced about 6,001 tool-reported tokens; last 1,282. 00–07 produced 628. Total restore content therefore about 43,917 tool-reported output tokens, including added print newline effects; this is not billed model token usage.

Observed calls including this final write: 13 shell calls, wrapped in 11 functions.exec invocations. Of those, 9 shell calls read restore content, 1 read handoff/questions, 1 counted source bytes, and 2 wrote outputs. No network, API inference, CLI inference, or delegation used. Shell calls were all successful. Individual shell execution wall times for the restore reads were approximately 0.000019–0.000078 seconds as reported by exec_command; wrapper durations were 0.2–0.3 seconds per restore invocation. End-to-end model wall time was not instrumented and cannot be reconstructed from these shell timings. Filesystem size counts describe source bytes delivered, not API usage or billing.

Reload answers resolve the conflicting retention, worker merge and dated format claims by rank and expiry, recover generation, approval code, emergency addenda, and preserve UNKNOWN for absent license number. This is one deterministic fixture trial with no independent blinded score, repetitions, native compaction event, or population estimate.

Notes written at 2026-11-17T15:04:33.285879+00:00.
