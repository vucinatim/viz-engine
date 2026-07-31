# Goal Three Node Editor And Live Graph

Date: 2026-07-31

Status: verified checkpoint for the graph editor shell, node authoring,
clipboard and presets, typed connections, continuous graph presentation, and
fixed-device graph interaction latency. Goal Three as a whole remains open.

## Product Contract

The node editor keeps the spatial behavior of the established product while
obeying V2 ownership:

```text
pointer-rate node movement -> React Flow local canvas state -> visible node
drag release              -> one canonical graph commit -> one history entry

runtime graph publish -> one overlay-scoped display scheduler -> live DOM text

pan / zoom / selection -> editor UI state only
create / connect / delete / preset / paste -> canonical graph actions
```

React renders the graph structure. It is not the runtime signal bus or the
frame clock. Canonical project documents remain the only durable graph truth.

## Repairs And Architecture Decisions

### One live presentation scheduler

The graph previously mounted many independent perpetual animation loops: live
input values, the toolbar output, and custom node bodies each scheduled their
own `requestAnimationFrame` callback. Those loops continued even when the
selected graph remained mounted behind the visible preview.

`GraphLiveUpdateProvider` now owns one runtime-inspection subscription and one
coalesced display callback for the whole overlay. Consumers register
imperative DOM/canvas updates with that provider. When the overlay is hidden,
the subscription and pending frame are removed. This preserves live values
without producing React state updates at runtime cadence.

### Local spatial interaction, canonical release

React Flow owns pointer-rate node position, selection, edges, pan, and zoom.
Node dragging keeps the canonical document unchanged until release, then
commits one final position through the existing graph gesture transaction.
Pan, zoom, and selection do not enter project history.

Edge selection is also presentation-only. Canonical edge projection preserves
that local selection while external graph changes are applied.

### Canonical graph commands

- Multi-node delete is one grouped canonical action and automatically clears
  dependent bindings and graph outputs.
- Context deletion no longer selects a node, waits on a timer, and asks React
  Flow to infer the durable edit.
- Toolbar deletion derives its enabled state from explicit selection rather
  than a mutable React Flow reference.
- Graph JSON copy emits the canonical `VizNodeGraphDocument`, not a projected
  editor-only network shape.
- Graph node and edge identities use UUIDs instead of timestamps and random
  decimal suffixes.
- Preset output type is derived from explicit graph-output metadata rather
  than parsing an output-node ID.

### Connections

Connection validation now returns structured failure codes and creator-facing
messages for missing nodes, missing handles, incompatible types, and cycles.
Replacement semantics remove the prior binding for a target input before
testing the proposed graph path. Valid connections update React Flow
immediately and commit once canonically.

The visual handle is pointer-transparent inside a larger real React Flow hit
target. A headed pointer journey caught this detail: allowing the decorative
dot to receive the pointer prevented React Flow from beginning a drag.

### Stable React Flow presentation

The node type registry is stable for the lifetime of the graph renderer and
reads current commands through a ref. This avoids React Flow rebuilding node
types when history capability changes. `onlyRenderVisibleElements` bounds DOM
work for spatially large graphs.

## Headed Browser Proof

The expanded canonical graph journey uses real Chromium interactions and
proves:

- graph open, focus, close posture, fit view, pan, zoom, and selection
- pan and zoom leave the project revision unchanged
- real pointer node movement changes visible position continuously and commits
  one durable position
- search and visible Math-node creation
- valid handle-to-handle connection replacement with one revision
- cycle prevention with the visible message `That connection would create a
  graph cycle.` and no project mutation
- undo and redo of graph creation
- copy and context-menu paste with new stable identity and preserved internal
  semantics
- selection-aware grouped toolbar deletion and context deletion
- reload persistence of the authored graph
- visible color-preset search/application and exact undo restoration
- playback-driven live input values and toolbar output changes
- no unexpected console warning, console error, or page error

The deterministic connection tests separately cover compatible and
incompatible port types, self-cycles, longer cycles, and replacement-aware
cycle analysis. Graph-authoring tests prove grouped multi-node delete and exact
undo restoration. The preset registry test instantiates all 26 built-in
presets as canonical graphs, and graph-fragment tests prove stable remapping of
internal and boundary connections.

## Fixed-Device Performance Evidence

The dedicated `pnpm benchmark:node-editor` command runs headed Chromium at
1600 × 1000, DPR 1, with video and trace disabled. It measures 20 real pointer
iterations and records the machine-readable result in
[the Signal Cathedral node-editor report](./artifacts/2026-07-31-goal-three-v2-signal-cathedral-node-editor-performance.json).

The continuous parameter workload is the three-layer simple project. The graph
workload is Signal Cathedral: 18 canonical runtime nodes, five named outputs,
and 23 rendered editor nodes.

| Interaction | Median | p95 | Max |
| --- | ---: | ---: | ---: |
| Slider pointer to transient value | 0.20 ms | 0.30 ms | 0.50 ms |
| Slider pointer to runtime | 1.20 ms | 1.40 ms | 2.40 ms |
| Slider pointer to visible pixels | 7.90 ms | 8.90 ms | 9.00 ms |
| Slider release to canonical mutation | 0.30 ms | 0.40 ms | 0.50 ms |
| Signal Cathedral node pointer to visible movement | 9.70 ms | 11.60 ms | 34.00 ms |
| Node release to canonical mutation | 0.70 ms | 0.80 ms | 1.20 ms |
| Signal Cathedral pan pointer to visible transform | 1.10 ms | 2.00 ms | 3.30 ms |
| Signal Cathedral zoom pointer to visible transform | 10.90 ms | 12.30 ms | 12.60 ms |

Every slider release and node release produced exactly one revision. Twenty
pan and twenty zoom interactions produced zero revisions.

During the graph-open Signal Cathedral playback sample, display cadence had a
20.00 ms p95 and 28.50 ms maximum; canonical runtime cadence had a 23.30 ms
p95 and 27.70 ms maximum. There were two display and four runtime intervals
above the deliberately strict 25 ms diagnostic threshold. These tails remain
recorded rather than hidden and belong to the broader playback/long-session
performance work.

## Parity Result

The following rows advance to `verified`:

- `nodes.editor-overlay`
- `nodes.create-delete-search`
- `nodes.presets-clipboard`

`nodes.connection-validation` remains partial because real authoring and
runtime rejection are proven, but a visible malformed-file load that preserves
the active project is still required by its final acceptance criterion.

`nodes.live-evaluation` and `performance.editor-responsiveness` also remain
partial. Continuous evaluation, visible values, the heavy graph workload, and
strong fixed-device input latency are proven. A controlled pinned-V1 comparison
and the broader representative-project performance certification are still
required before those rows can honestly become verified.

## Validation

Passed during this checkpoint:

- focused graph connection, live scheduler, and authoring tests: 3 files, 14
  tests
- expanded headed canonical graph journey
- fixed-device 20-iteration Signal Cathedral node-editor benchmark
- studio typecheck
- complete `pnpm check:foundation` gate:
  - 42 valid parity rows: 21 verified and 21 partial
  - clean dependency architecture, formatting, lint, and all type checks
  - 59 Vitest files and 268 deterministic tests
  - 13 active headed Chromium journeys passed and the opt-in performance
    journey skipped in the ordinary gate
  - all 17 package builds, the studio production build, the packed-consumer
    smoke, and the creative-loop smoke

## Assumptions And Boundaries

- The established preview-first hover overlay remains intentional V1 product
  posture. The graph stays mounted to avoid reopen/flicker costs, but live graph
  presentation work stops while it is hidden.
- UUID authoring identity is intentionally nondeterministic. Saved canonical
  documents remain deterministic render inputs.
- React Flow remains a replaceable spatial-editor attachment. Canonical graph
  meaning does not depend on its node, edge, or selection state.
- This checkpoint does not claim the broader playback-smoothness or
  long-session-stability rows. The recorded tail intervals make that boundary
  explicit.
