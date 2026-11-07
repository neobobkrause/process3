// The deploy block's pure readings, shared by deploy dev and setup check without importing deploy.mjs
// (which reaches status, layerflow and roles): a leaf, importing util alone.
import { basename } from 'node:path';
import { fail } from './util.mjs';

// Deploys configured: a deploy block with more than the internal walk (or its exemption). A product
// with no deployment that records Bob's exemption, or names only an internal walk, owes no deploy,
// no round-close run and no deploy at tranche close (cold review of C23).
export const deploys = (cfg) => !!cfg?.deploy && typeof cfg.deploy === 'object' && !Array.isArray(cfg.deploy) && Object.keys(cfg.deploy).some((k) => k !== 'internal_walk');

const isArgv = (a) => Array.isArray(a) && a.length && a.every((x) => typeof x === 'string' && x.length);
export const stepsOf = (v, what) => {
  if (isArgv(v)) return [v];
  if (Array.isArray(v) && v.length && v.every(isArgv)) return v;
  return fail(`deploy.${what} must be an argv (a list of strings) or a non-empty list of argvs`);
};
// walk_reports: the files the walk writes, relative to the checkout, kept on the state branch.
const part = (x) => x && x !== '.' && x !== '..';
export const reportPaths = (wr, what) => {
  if (!Array.isArray(wr) || !wr.every((p) => typeof p === 'string' && p.split('/').every(part) && !basename(p).startsWith('.git')) || new Set(wr.map((p) => basename(p))).size !== wr.length) fail(`deploy.${what} must be a list of file paths in the checkout (no leading /, no empty, . or .. part, no file name starting .git), no two with the same file name`);
  return wr;
};
// internal_walk (Bob, 4 Nov; K4111, K4162, K4781): the product's offline walk, run at the round
// close before the dry run, never a gate. {run: argv or argvs, timeout_minutes (whole run), reports}.
// Or the exemption Bob records instead ({none: "<reason>", by: "Bob, <date>"}; Bob, 7 Nov: the
// internal walk is required, its exemption his word). One reading for deploy dev and setup check:
// null when unset, {walk} or {exempt}, a refusal when malformed.
export function internalWalkOf(i) {
  if (i === undefined || i === null) return null;
  if (typeof i === 'object' && !Array.isArray(i) && 'none' in i) {
    if (Object.keys(i).some((k) => !['none', 'by'].includes(k)) || typeof i.none !== 'string' || !i.none.trim() || typeof i.by !== 'string' || !i.by.trim()) fail('deploy.internal_walk\'s exemption is {"none": "<reason>", "by": "Bob, <date>"}, Bob\'s word, and nothing else');
    return { exempt: { none: i.none.trim(), by: i.by.trim() } };
  }
  if (typeof i !== 'object' || Array.isArray(i) || Object.keys(i).some((k) => !['run', 'timeout_minutes', 'reports'].includes(k))) fail('deploy.internal_walk must be an object with run, timeout_minutes and reports');
  if (i.timeout_minutes !== undefined && !(Number.isInteger(i.timeout_minutes) && i.timeout_minutes > 0 && i.timeout_minutes <= 360)) fail('deploy.internal_walk.timeout_minutes must be whole minutes from 1 to 360');
  return { walk: { run: stepsOf(i.run, 'internal_walk.run'), timeout_minutes: i.timeout_minutes || 30, reports: reportPaths(i.reports ?? [], 'internal_walk.reports') } };
}

