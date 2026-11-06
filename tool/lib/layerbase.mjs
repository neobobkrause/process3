// The shared layer branch and the job's base (design note "Shared Layer Branch", Bob, 5 Nov; the
// only flow since the merge train was removed, Bob, 6 Nov). A job of the open layer's module works
// on a branch cut from layer/<n>, publishes onto it, and the layer merges into the tranche once.
// process/config.json "merge_strategy" is "layer" or absent (util.mjs refuses any other value).
// This file has no imports from job.mjs, so job.mjs can read it.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { exists, fail, fetchBranch, git } from './util.mjs';

export const STRATEGIES = ['layer'];
export const layerMode = (cfg) => (cfg?.merge_strategy ?? 'layer') === 'layer';
export const LAYER_BRANCH = /^layer\/(\d+)$/;
export const layerBranch = (n) => `layer/${n}`;
export const layerOfBranch = (b) => { const m = String(b || '').match(LAYER_BRANCH); return m ? Number(m[1]) : null; };
// The state branch's files of the layer flow: one file per event, added and never edited, so two
// writers never conflict (as notices/).
export const FLOW_DIR = 'layerflow';
export const flowFile = (n, kind, name) => (name === undefined ? `${FLOW_DIR}/${n}/${kind}.json` : `${FLOW_DIR}/${n}/${kind}/${name}.json`);
export const safeName = (s) => String(s).replace(/[^A-Za-z0-9._-]+/g, '-');

// The layer map (layers_file): [{ n, mods }], the same table status.mjs layerState reads.
export function layerMap(text) {
  if (text === null || text === undefined) return [];
  return String(text).split('\n').map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
    .filter((c) => c.length > 1 && /^\d+$/.test(c[0]))
    .map((c) => ({ n: Number(c[0]), mods: c.at(-1).replace(/[`*]/g, '').split(',').map((m) => m.trim()).filter(Boolean) }))
    .sort((a, b) => a.n - b.n);
}
export function layersAt(root, cfg, ref) {
  let text = null;
  if (ref) text = exists(root, ref, cfg.layers_file) ? git(['show', `${ref}:${cfg.layers_file}`], { cwd: root }) : null;
  else if (existsSync(join(root, cfg.layers_file))) text = readFileSync(join(root, cfg.layers_file), 'utf8');
  return layerMap(text);
}
export const layerOf = (layers, id) => layers.find((L) => L.mods.includes(id))?.n ?? null;

const hasRef = (root, r) => git(['rev-parse', '-q', '--verify', r], { cwd: root, allowFail: true }).code === 0;

// The config a job's commands run with. For a module of no open layer branch, the config itself
// (with noLayers when the product has no layer map at all). With it on, for a module of a layer whose branch layer/<n> exists
// (on origin, or locally with push false) and has not merged (the state branch's merged row): the
// layer branch takes the tranche's place in the job's start, sync, complete and test, and
// `layer` names it ({ n, tranche: the real tranche }).
export function jobCfg(root, cfg, id, { push = true, merged = null } = {}) {
  if (!layerMode(cfg) || cfg.layer) return cfg;
  const tr = push ? `refs/remotes/origin/${cfg.tranche}` : `refs/heads/${cfg.tranche}`;
  const map = layersAt(root, cfg, hasRef(root, tr) ? tr : null);
  // A product with no layer map has no layer to branch from: its jobs keep the tranche (noLayers).
  if (!map.length) return { ...cfg, noLayers: true };
  // Its own layer first; else a layer it joined (layer join: a module whose layer is behind the open
  // one joins the next to open), each only while its branch exists and has not merged.
  const live = (n) => {
    const b = layerBranch(n);
    if (push) fetchBranch(root, b, { allowFail: true });
    if (!hasRef(root, push ? `refs/remotes/origin/${b}` : `refs/heads/${b}`)) return false;
    return !(merged ? merged(n) : push ? mergedOnState(root, cfg, n) : false);
  };
  const own = layerOf(map, id);
  const n = [own, ...joinedLayers(root, cfg, id)].find((x) => x !== null && live(x));
  if (n === undefined) return cfg;
  return { ...cfg, tranche: layerBranch(n), layer: { n, tranche: cfg.tranche, ...(n !== own ? { joined: true } : {}) } };
}
// The layers a module joined, from the state branch's layerflow/<n>/join/<id>.json rows, lowest first.
function joinedLayers(root, cfg, id) {
  const sb = `refs/remotes/origin/${cfg.state_branch}`;
  const r = git(['ls-tree', '-r', '--name-only', sb, '--', `${FLOW_DIR}/`], { cwd: root, allowFail: true });
  if (r.code !== 0) return [];
  const want = `/join/${safeName(id)}.json`;
  return r.stdout.split('\n').filter((f) => f.endsWith(want)).map((f) => Number(f.split('/')[1])).filter(Number.isInteger).sort((a, b) => a - b);
}
function mergedOnState(root, cfg, n) {
  const sb = cfg.state_branch;
  const f = git(['fetch', '-q', 'origin', `+refs/heads/${sb}:refs/remotes/origin/${sb}`], { cwd: root, allowFail: true });
  if (f.code !== 0) return false;
  return git(['cat-file', '-e', `refs/remotes/origin/${sb}:${flowFile(n, 'merged')}`], { cwd: root, allowFail: true }).code === 0;
}
export const refuseInLayer = (cfg, what) => { if (cfg.layer) fail(`${what} is not part of the layer flow (merge_strategy "layer", ${cfg.tranche}): start the job plainly, or ask BOB`); };
