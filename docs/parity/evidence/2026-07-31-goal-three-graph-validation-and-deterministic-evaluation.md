# Goal Three Graph Validation And Deterministic Evaluation

Date: 2026-07-31

Status: verified checkpoint for graph connection integrity and continuous,
runtime-timed graph evaluation. Goal Three as a whole remains open.

## Product Contract

Graph data has one durable boundary and one deterministic execution model:

```text
file / action candidate -> portable document validation -> atomic session import
                                                    invalid -> visible error, no mutation

canonical graph + frame context + resolved inputs -> deterministic evaluator
live graph presentation                          -> narrow imperative subscriber
```

React Flow is the spatial authoring attachment. It does not define graph
meaning, validate persisted documents, advance runtime time, or carry live
signals through React renders.

## Import Integrity

The portable project validator now checks graph structure before a document can
enter a runtime or editor session:

- graph names, node/output arrays, graph-input maps, node ids and types
- literal, graph-input, and node-output binding shapes
- graph input source kinds and asset/artifact references
- upstream node references, output bindings, duplicate outputs, and cycles
- layer graph-output sources, including the named graph output

Malformed array entries are reported rather than silently discarded. Validation
is total over untrusted JSON for the covered graph structures: it returns typed
issues instead of allowing a property access or iteration error to escape.

The visible project-file journey imports a structurally valid envelope whose
graph references a missing upstream node. The editor displays the exact
creator-facing reference error and the complete canonical project snapshot
remains byte-for-byte equivalent to the snapshot from before the attempt.

The evaluator retains cycle detection as defense in depth. A unit test invokes
it directly with an unsaved cyclic graph and proves that it returns a
`graph-cycle` issue rather than recursing forever. Normal project/session import
rejects that graph earlier.

Registry-aware handle existence and value-type compatibility remain at the
canonical connection-action boundary, where the active node registry is
available. The portable document validator intentionally owns only
registry-independent structure, references, and acyclicity; this avoids making
saved-document validity depend on one editor attachment.

## Deterministic Live Evaluation

Focused evaluator tests now prove:

- two independent sessions produce deeply equal results at frame 72 when
  canonical project, seed, resolved inputs, and frame are equal, even when one
  session evaluated an earlier frame first
- temporal nodes replay from fixed `1 / fps` steps rather than elapsed UI or
  wall-clock time
- repeated temporal evaluation reuses deterministic checkpoints
- transient graph overlays change the visible evaluation without contaminating
  the canonical temporal checkpoint history
- direct cyclic input fails explicitly

The headed Chromium graph journey proves the complete presentation path while
the transport is playing: sampled live node/input text changes across time and
the graph drives non-zero visible output. The graph overlay uses one
overlay-scoped runtime subscription and imperative display scheduler, so these
updates do not require runtime-cadence React state.

## Performance Evidence

The fixed-device Signal Cathedral graph workload contains 18 canonical runtime
nodes, five named outputs, and 23 rendered editor nodes. After a 1.5 second
warmup, its three-second playing sample recorded:

| Cadence           |   Median |      p95 |      Max | Intervals over 25 ms |
| ----------------- | -------: | -------: | -------: | -------------------: |
| Display           |  8.60 ms | 20.00 ms | 28.50 ms |              2 / 276 |
| Canonical runtime | 15.40 ms | 23.30 ms | 27.70 ms |              4 / 180 |

The p95 runtime result is inside the checkpoint's 25 ms diagnostic budget. The
machine-readable sample is retained in
[the Signal Cathedral node-editor report](./artifacts/2026-07-31-goal-three-v2-signal-cathedral-node-editor-performance.json).

The earlier controlled pinned-V1 comparison exercises three active graphs in
the same simple-example fixture. V2 passed all 21 environment, frame-pacing,
and memory checks with 119.899 mean FPS and 9.900 ms frame-time p95, compared
with V1's 74.915 FPS and 17.600 ms p95. That comparison is recorded in
[V2 Runtime Performance And Video Certification](./2026-07-29-v2-performance-and-video-certification.md).

These measurements close the graph-heavy acceptance boundary. They do not
close broad playback smoothness, every editor interaction, or arbitrary
long-session stability; those remain separate partial parity rows.

## Parity Result

The following rows advance to `verified`:

- `nodes.connection-validation`
- `nodes.live-evaluation`

All acceptance criteria now have direct evidence:

- valid and invalid connection behavior, replacement, type feedback, and cycle
  prevention
- malformed persisted data rejected visibly and atomically
- equivalent canonical inputs/time producing equivalent outputs
- fixed runtime time independent of UI timing
- continuously changing browser-visible values
- a graph-heavy fixed-device sample within its approved p95 budget

The parity matrix now contains 38 verified and 4 partial capabilities, with
zero gaps and zero unaudited rows.

## Validation

Passed for this checkpoint:

- focused graph document, persistence, connection, and evaluator suites: 4
  files and 18 tests
- two headed Chromium journeys covering real graph authoring/live values and
  malformed-file rollback
- complete `pnpm check:foundation` gate:
  - 42 valid parity rows: 38 verified and 4 partial
  - clean dependency architecture, formatting, lint, and all type checks
  - 62 Vitest files and 283 deterministic tests
  - all 16 active headed Chromium journeys passed and the opt-in performance
    journey skipped in the ordinary gate
  - all 17 package builds, the studio production build, the packed-consumer
    smoke, and the creative-loop smoke

## Assumptions And Boundaries

- Equivalent output means the same V2 canonical graph, seed, resolved inputs,
  and frame produce the same result. Exact numeric equivalence to every V1
  implementation detail is neither possible nor desirable because V2 has a
  new canonical graph kernel.
- The 25 ms graph-runtime p95 budget is the existing strict diagnostic
  threshold for this fixed-device checkpoint. Tail intervals remain visible
  in the artifact and feed the broader performance work.
- Runtime registries still decide whether a node type and named handle exist.
  Portable project validation deliberately does not import a specific registry.
- This checkpoint does not claim broad playback smoothness, full editor
  responsiveness, live-rendering completeness, or long-session stability.
