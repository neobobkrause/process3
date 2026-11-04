// The completion round (PLN-4): work runs in layers within rounds within tranches, and the
// completion round has its own file, completion_file in process/config.json. Each item is one
// list line: `- [ ] <id> · <module id or "whole product"> · <what>`; `[x]` is done; an open item
// whose line says `deferred: <reason>` is deferred. Once every layer is closed, status --role bob
// lists the open items as next work, and tranche close refuses while one is open and not deferred.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { exists, git } from './util.mjs';

export const WHOLE = 'whole product';
const ITEM = /^\s*[-*]\s+\[([ xX])\]\s+([A-Za-z][\w.-]*)\s*[·|]\s*([^·|]+?)\s*(?:[·|]\s*(.*))?$/;

export function parseCompletion(text) {
  return String(text || '').split('\n').flatMap((line, i) => {
    const m = ITEM.exec(line);
    if (!m) return [];
    const what = (m[4] || '').trim();
    const d = /deferred:\s*(.+)$/i.exec(what);
    const target = m[3].trim();
    return [{ id: m[2], target, whole: target.toLowerCase() === WHOLE, what, line: i + 1, done: m[1] !== ' ', deferred: d ? d[1].trim() : null }];
  });
}

// The file as `ref` holds it (the working tree without one); null without the key or the file.
export function completionItems(root, cfg, ref) {
  const f = cfg.completion_file;
  if (typeof f !== 'string' || !f.trim()) return null;
  const text = ref ? (exists(root, ref, f) ? git(['show', `${ref}:${f}`], { cwd: root }) : null) : existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8') : null;
  return text === null ? { file: f, missing: true, items: [] } : { file: f, missing: false, items: parseCompletion(text) };
}

export const openItems = (c) => (c?.items || []).filter((x) => !x.done && !x.deferred);
