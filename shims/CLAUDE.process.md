## Process3

- The process is pinned: `.process` is a submodule at the commit this tree names (`git ls-tree HEAD .process`). Run it as `node .process/tool/p3.mjs <command>`; never edit `.process/` by hand.
- To stand on the tip: `git fetch origin {tranche} --depth 1 && git checkout --detach FETCH_HEAD && git submodule update --init .process`, then `node .process/tool/p3.mjs start check`.
- Your role prompt is the message that started this session, printed by the pinned tool (`start root`, `start bob`, `start watcher`, `job start`). Act only as it says; with none, act on nothing.
