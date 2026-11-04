// The route for work found elsewhere (Bob, 4 Nov: a walk's or a deploy's findings were held in
// BOB's handoff "until the owning layer opens"). `found <module> "<finding>" [--from <source>]`
// prints BOB's plain pull request: one unmet found mark, `**F<n>** *(not yet met: <source>)*
// <finding>`, numbered per module, in the module's requirement file, or in its found-work entry
// (FOUND_DIR/<module>.md) where the module has no requirement file. A finding that names no module
// goes to NO_MODULE, listed by status under `found, no module` with BOB's act to name one.
// The marks are in the record, so `report tranche` counts found work; status --role bob lists a
// module with found marks as next work as soon as it is ready by open_by, whatever its layer.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { LEDGER_DIR } from './ledger.mjs';
import { readModules } from './notice.mjs';
import { FOUND_MARK, depth, exists, fail, git, loadConfig } from './util.mjs';

export const FOUND_DIR = 'process/found';
export const NO_MODULE = `${FOUND_DIR}/no-module.md`;
export const FOUND_HEADING = '## Found work';
export const foundFile = (id) => `${FOUND_DIR}/${id}.md`;
export const DEFAULT_SOURCE = 'found';

// The next found mark's number in the texts (a module's requirement file and its found-work
// entry): one past the highest F<n>, met or not, so a struck mark's number is never reused.
export function nextFound(...texts) {
  let n = 0;
  for (const t of texts) for (const m of String(t || '').matchAll(FOUND_MARK)) n = Math.max(n, Number(m[1]));
  return n + 1;
}

// The unmet found marks of a text: [{ id, source, finding }].
export function foundMarks(text) {
  return String(text || '').split('\n').flatMap((l) => {
    const m = l.match(/\*\*(F\d+)\*\*\s*\*\(not yet met(?::\s*([^)]*))?\)\*\s*(.*)$/);
    return m ? [{ id: m[1], source: (m[2] || '').trim() || DEFAULT_SOURCE, finding: m[3].trim() }] : [];
  });
}

export const foundLine = (n, finding, source) => `- **F${n}** *(not yet met: ${source})* ${finding}`;

// The text with the line added under FOUND_HEADING (the heading added at the end when absent).
export function addFound(text, line, title) {
  const t = text === null || text === undefined ? `# ${title}\n` : String(text);
  const lines = t.replace(/\n+$/, '').split('\n');
  const h = lines.findIndex((l) => l.trim() === FOUND_HEADING);
  if (h < 0) return [...lines, '', FOUND_HEADING, '', line].join('\n') + '\n';
  let j = h + 1;
  while (j < lines.length && !/^#{1,2}\s/.test(lines[j])) j++;
  while (j > h + 1 && !lines[j - 1].trim()) j--;
  return [...lines.slice(0, j), ...(j === h + 1 ? [''] : []), line, ...lines.slice(j)].join('\n') + '\n';
}

const clean = (v, what) => {
  if (typeof v !== 'string' || !v.trim()) fail(`${what} must be text in quotes`);
  const s = v.replace(/\s+/g, ' ').trim();
  if (/\*\*[RF][\w.-]*\*\*|not yet met/i.test(s)) fail(`${what} must not hold a mark of its own (**R..**, **F..** or "not yet met")`);
  return s;
};

// A module as the tranche knows it: its ledger entry's requirement file, else the requirement
// directory's <id>.md; known when it has a ledger entry, a requirement file, a row in the layer
// map or an entry in the modules file. file: the requirement file when it exists, else null.
export function moduleFiles(root, cfg, id, ref) {
  const read = (f) => (ref ? (exists(root, ref, f) ? git(['show', `${ref}:${f}`], { cwd: root }) : null) : existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8') : null);
  let req = `${cfg.requirements_dir.replace(/\/$/, '')}/${id}.md`;
  let entry = false;
  const e = read(`${LEDGER_DIR}/${id}.json`);
  if (e !== null) { entry = true; try { req = JSON.parse(e).requirements || req; } catch { /* the ledger check reports it */ } }
  const reqText = read(req);
  const map = read(cfg.layers_file) || '';
  const inMap = map.split('\n').some((l) => { const c = l.trim().replace(/^\||\|$/g, '').split('|').map((x) => x.trim()); return c.length > 1 && /^\d+$/.test(c[0]) && c.at(-1).replace(/[`*]/g, '').split(',').map((x) => x.trim()).includes(id); });
  const inModules = (readModules(root, cfg, ref) || []).some((m) => m?.id === id);
  const foundText = read(foundFile(id));
  return { known: entry || reqText !== null || inMap || inModules || foundText !== null, req, reqText, found: foundFile(id), foundText, read };
}

// found [<module>] "<finding>" [--from <source>] [--write]: BOB's plain pull request, printed.
// --write also adds the line to the checkout's file, for BOB to commit on the branch it names.
export function found(root, module, finding, { from, write = false, offline = false, log = console.log } = {}) {
  const cfg = loadConfig(root);
  const t = `origin/${cfg.tranche}`;
  if (!offline) git(['fetch', '-q', ...depth(root), 'origin', `+refs/heads/${cfg.tranche}:refs/remotes/${t}`], { cwd: root, allowFail: true });
  const ref = git(['rev-parse', '-q', '--verify', t], { cwd: root, allowFail: true }).code === 0 ? t : null;
  const what = clean(finding, 'the finding');
  const source = from === undefined ? DEFAULT_SOURCE : clean(from, '--from');
  if (/[()]/.test(source)) fail('--from must not hold parentheses: the mark ends at the first ")"');
  let file;
  let texts;
  let current;
  let title;
  let where;
  if (module === null || module === undefined) {
    const read = (f) => (ref ? (exists(root, ref, f) ? git(['show', `${ref}:${f}`], { cwd: root }) : null) : existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8') : null);
    file = NO_MODULE;
    texts = [read(NO_MODULE)];
    current = texts[0];
    title = 'Found work that names no module';
    where = 'the found-work entry for findings that name no module; status lists it under `found, no module` until BOB names its module';
  } else {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(String(module))) fail(`the module must be a module id (lower case letters, digits and -), not ${JSON.stringify(module)}`);
    const m = moduleFiles(root, cfg, module, ref);
    if (!m.known) fail(`${module} is not a module on ${ref || 'the working tree'} (no ledger entry, requirement file, row in ${cfg.layers_file} or entry in ${cfg.modules_file || 'the modules file'}); name its module, or record the finding with no module: found "<finding>" --from <source>`);
    file = m.reqText !== null ? m.req : m.found;
    texts = [m.reqText, m.foundText];
    current = m.reqText !== null ? m.reqText : m.foundText;
    title = `Found work for ${module}`;
    where = m.reqText !== null ? "the module's requirement file" : `its found-work entry, since the module has no requirement file (${m.req}); its job starts once BOB gives it a requirement file and ledger entry, moving these marks there`;
  }
  const n = nextFound(...texts);
  const line = foundLine(n, what, source);
  const branch = `found/${module || 'no-module'}-f${n}`;
  const P = 'node .process/tool/p3.mjs';
  log(`found work${module ? ` for ${module}` : ', no module'}: F${n} in ${file}, ${where}`);
  log(`BOB's act, a plain pull request into ${cfg.tranche}:`);
  log(`1. git switch -c ${branch} ${ref || cfg.tranche}`);
  log(`2. in ${file}, under the heading "${FOUND_HEADING}" (added at the end when absent), add the line${write ? ' (written in this checkout now)' : ` (or run this command again with --write)`}:`);
  log(`   ${line}`);
  log(`3. commit it ("found: ${module || 'no module'} F${n}"), git push -u origin ${branch}, and open the pull request into ${cfg.tranche}`);
  log(`4. \`${P} merge <that pull request> --plain --no-review "work found elsewhere: one found mark, no code"\``);
  log(module
    ? `status --role bob then lists ${module} as found work as soon as it is ready by open_by, whatever its layer`
    : 'status --role bob then lists it under `found, no module`, with BOB\'s act to name its module');
  if (write) {
    const p = join(root, file);
    mkdirSync(dirname(p), { recursive: true });
    // The checkout's copy when it has one (BOB's branch from the tranche tip), else the tranche's.
    writeFileSync(p, addFound(existsSync(p) ? readFileSync(p, 'utf8') : current, line, title));
  }
  return { module: module || null, file, mark: `F${n}`, line, branch };
}

// The findings that name no module, as the ref holds them: status's `found, no module`.
export function noModuleFound(root, ref) {
  const text = ref ? (exists(root, ref, NO_MODULE) ? git(['show', `${ref}:${NO_MODULE}`], { cwd: root }) : null) : existsSync(join(root, NO_MODULE)) ? readFileSync(join(root, NO_MODULE), 'utf8') : null;
  return foundMarks(text);
}

// The modules with a found-work entry (FOUND_DIR/<id>.md, no-module.md aside) at the ref.
export function foundEntries(root, ref) {
  let names;
  if (ref) {
    const r = git(['ls-tree', '--name-only', `${ref}:${FOUND_DIR}`], { cwd: root, allowFail: true });
    names = r.code === 0 ? r.stdout.split('\n') : [];
  } else {
    const d = join(root, FOUND_DIR);
    names = existsSync(d) ? readdirSync(d) : [];
  }
  return names.filter((n) => n.endsWith('.md') && `${FOUND_DIR}/${n}` !== NO_MODULE).map((n) => n.slice(0, -3)).sort();
}
