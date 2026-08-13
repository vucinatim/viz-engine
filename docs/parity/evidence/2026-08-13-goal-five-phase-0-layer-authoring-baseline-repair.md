# Goal Five Phase 0 Layer-Authoring Baseline Repair

Date: 2026-08-13.

Implementation commit: `82c1cd7958fbb99f71b4f7f41519691f81db95bc`.

Planning baseline: `b2b23b577feda29ef7eca9dcbf35a4e8c1162781`.

Status: the bounded layer-authoring defect is repaired and independently
validated. This is not Goal Five completion and is not recorded as a green
uninterrupted Phase 0 repository gate.

## Finding

The Phase 0 baseline first failed the complete-authoring browser journey while
adding `Stage Scene`. That component owns thirteen default parameter graphs.
The editor previously committed the layer and then created each graph through
a separate canonical transaction. Every transaction published a new project,
invalidated the runtime preview, and created an independent revision even
though the user performed one add-layer action; the enclosing history group
then performed a final redundant project resynchronization.

The original failure trace recorded the Stage Scene selection click blocked
for approximately 35.5 seconds. The initial repository gate ended with 15
active browser journeys passing, 3 declared opt-in journeys skipped, and the
complete-authoring journey timing out.

This was both a performance defect and the wrong authoring semantic: one user
operation should be one canonical transaction, revision, and undo unit.

## Repair

The project action layer now:

- creates the canonical layer action first in memory
- derives every independent default graph and layer binding against that
  candidate document
- submits the layer and all default-graph actions as one transaction
- relies on that transaction's native single history entry rather than adding
  a redundant history group and final project resynchronization

The existing graph-document action builder is exported and reused, so the
repair does not introduce a second preset-to-canonical conversion path.

A foundation regression test proves that adding Stage Scene creates all
default graphs and bindings in one revision, one undo removes the complete
operation, and one redo restores it.

## Validation

Environment:

- Apple M1 Pro, macOS 26.5.2
- Node.js 22.22.0, pnpm 9.9.0
- Playwright 1.62.1, headless Chromium 151.0.7922.34
- 1440 × 900 viewport, one browser worker

Green results on the exact implementation tree:

- formatting, lint, all package/Studio/tool types
- 65 foundation files and 300 tests
- 42/42 parity rows and all 18 workspace architecture boundaries
- all 18 package builds and the Studio production build
- built package-consumer and creative-loop smokes
- focused complete-authoring browser journey: 1/1 passed
- standalone complete browser aggregate: 16/16 active journeys passed with 3
  declared opt-in journeys skipped

The final `pnpm check:foundation` wrapper was intentionally not described as
green. Immediately after its 300-test burst, on a machine whose observed load
average reached approximately 36 on eight logical cores due to unrelated
Swift compilation, Vitest workers, Spotlight indexing, and active desktop GPU
work, it reproduced two wall-clock-sensitive failures:

- the known audio-workflow 700 ms sampling window observed zero frames
- the complete-authoring journey exceeded its 90 second file budget while
  selecting Stage Scene

The same unchanged tree passed the entire standalone browser aggregate without
retries immediately before that wrapper run. No timeout or tolerance was
increased, no unrelated process was terminated, and the two contended wrapper
failures remain explicit Phase 0 environment/gate work rather than being
mislabelled as product success.

## Conclusion

The deterministic defect—thirteen separately published default-graph
transactions for one layer addition—is closed at the implementation commit.
Phase 0 still needs an explicitly uncontended full-gate run and the frozen
Goal Five criteria/environment matrix before broader flagship implementation
may be called active again.
