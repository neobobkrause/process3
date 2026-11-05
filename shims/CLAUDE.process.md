## Process3

- The process is pinned: `.process` is a submodule at the commit this tree names (`git ls-tree HEAD .process`). Run it as `node .process/tool/p3.mjs <command>`; never edit `.process/` by hand.
- To stand on the tip: `git fetch origin {tranche} --depth 1 && git checkout --detach FETCH_HEAD && git submodule update --init .process`, then `node .process/tool/p3.mjs start check`.
- Your role prompt is the message that started this session, printed by the pinned tool (`start root`, `start bob`, `start watcher`, `job start`). Act only as it says; with none, act on nothing.
- Whoever starts a session archives it once its result is recorded (merged, reported or stopped). No session starts its own successor: ROOT starts a new BOB (the handover) and a new coordinator (`start coordinator`, at the coordinator's ask, after it pushed its handoff). A successor takes over its predecessor's unarchived children: it answers or archives each. ROOT's hourly sweep archives leftovers and passes on their questions.
