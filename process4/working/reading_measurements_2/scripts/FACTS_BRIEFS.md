# Briefs for the two workers that make a trial's fact questions

## Writer (one worker per trial, or one worker for a short list of trials)

You write fact questions about parts of a real document. Read every file in /home/user/r2/facts/<TRIAL>/ whose name ends in .txt, each whole. For each file write exactly two questions (for a set of four files, two each).

Each question must:
- ask for one short fact stated in that file once and nowhere else in it: a number, a name, a date, a file name, a threshold;
- not be answerable by general knowledge or by guessing from the question's own words;
- be worded so that a search for any single word of the question would not land on the answer's sentence: use your own words, not the text's;
- have an answer of at most six words.

Write /home/user/r2/facts/<TRIAL>/questions.json: a JSON list of objects `{"zone": "<file name without .txt>", "question": "...", "answer": "...", "accept": ["<the shortest string, copied exactly from the text, that a right answer must contain>"], "evidence": "<the sentence of the text, copied exactly>"}`.

Reply with one line: the trial, the number of questions, and the number of lines you read in each file.

## Checker (a different worker; it must not be the writer)

You check fact questions that another worker wrote. Read /home/user/r2/facts/<TRIAL>/questions.json and every .txt file beside it, each whole. The full text is at the paths in <FILES>; you may search it but need not read it.

For each question report three checks:
- one home: the answer is stated in exactly one place in the full text (search for the accept string and for other ways of writing the same fact);
- not guessable: a careful person without the text could not get it from the question;
- not findable by a single search: no single word of the question, searched for in the full text, lands on the answer's sentence within its first three hits.

Write /home/user/r2/facts/<TRIAL>/check.json: a JSON list `{"n": <position in the list, from 1>, "one_home": true|false, "not_guessable": true|false, "not_single_search": true|false, "note": "..."}`.

Reply with one line: the trial, how many questions passed all three, and the number of lines you read in each file. A question that fails any check is replaced by the writer and checked again.
