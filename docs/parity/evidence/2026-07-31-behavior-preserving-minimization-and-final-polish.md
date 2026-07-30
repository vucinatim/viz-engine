# Behavior-Preserving Minimization And Final Polish Certification

Date: 2026-07-31

Status: Goal Two complete.

Baseline: `6f4529b824d38a60cf3363b1cd646e55b4339227`

Certified code: `c2dc5ee6f69fb8cb7f1c47bfd74a7aa7d882366a`

Machine-readable result:
[2026-07-31 Goal Two Final](./artifacts/2026-07-31-goal-two-final.json).

## Outcome

VizEngine V2 is materially smaller and conceptually simpler while preserving
the certified editor, runtime, rendering, asset, model, graph, audio, export,
agent-control, and package-consumer contracts.

The architecture now reads directly as:

```text
VizProjectDocument
  -> VizSession
  -> deterministic frame evaluation
  -> renderer attachments

editor / CLI / live agent / headless tools
  -> shared actions, jobs, inspection, and project contracts
```

The work removed parallel editor truths, repeated authoring declarations,
duplicated graph construction, pass-through facades, and browser export
orchestration that restated canonical runtime behavior.

## Source Result

| Scope               | Baseline | Final  | Reduction |
| ------------------- | -------: | -----: | --------: |
| production files    |      371 |    349 |        22 |
| production lines    |   75,524 | 67,645 |     7,879 |
| tool lines          |    2,466 |  2,457 |         9 |
| test lines          |   12,637 | 12,893 |      -256 |
| maintained files    |      438 |    419 |        19 |
| maintained lines    |   90,627 | 82,995 |     7,632 |

The production diff contains 5,499 additions and 13,356 deletions. The
combined production/tool/test diff contains 6,020 additions and 13,633
deletions. Both hard net-negative requirements pass while the proof surface
grew from 54 to 57 test files and from 222 to 232 tests.

Production is 10.43% smaller than the immutable baseline.

## What Became Simpler

- Canonical `VizSession` bindings replaced editor-owned project, graph,
  preview, audio, and history facade stores.
- Component settings, presets, defaults, and default networks now originate
  in portable package-owned authoring contracts.
- Typed field constructors and explicit exceptional declarations replaced
  repeated metadata scaffolding without hiding ordinary authoring data.
- Composable graph fragments replaced repeated preset node/edge assembly
  while retaining all 26 presets.
- Browser still and video export now use the same render-job service as live
  agent and headless control.
- The legacy export orchestrator and IndexedDB frame-storage pipeline were
  deleted.
- One canonical browser executor owns stepping, compositing, image encoding,
  video frame scheduling, audio bake preparation, cancellation, and progress.
- Performance reporting shares typed breakdown projections and presentation
  primitives instead of recomputing the same aggregates.
- Editor-control and session surfaces lost pass-through methods and redundant
  result shaping.
- Dead adapters, UI primitives, accessors, duplicate live-value rendering, and
  accidental app-internal exports were removed.

## Honest Simplification Frontier

The 10,000-line serious target was not treated as permission to obscure the
system. The result stopped 2,121 production lines above that target because
the remaining large concentrations are predominantly real domain behavior:

- audio-analysis and node algorithms
- Stage, character, model, shader, and retained Three programs
- portable renderer lifecycle and resource ownership
- explicit action validation and mutation semantics
- bundle filesystem validation and materialization
- waveform interaction and canvas drawing
- profiler/report presentation and chart rasterization

Static duplicate analysis found less than one percent repeated production
code. Static unused-surface analysis was checked against package manifests,
CLI commands, tests, Vite entrypoints, worker entrypoints, and package
exports; the remaining reports are deliberate entrypoints or test seams.

Further pursuit of the numeric target would have required one or more
forbidden techniques: compressing readable algorithms, weakening explicit
types, erasing diagnostics, introducing speculative generic frameworks, or
removing protected UI and test behavior.

## Determinism And Production Identity

The normalized core catalog authoring identity remains:

`5365694304900adeef392f1916080d740ec56cf2bca2efdfe87ed25daad5df4c`

The Signal Cathedral authoring identity remains:

`7670009a037d0276ab42b5bda03ef83092c1ddd45d3ad4017da38b29b11419a9`

The 26-preset raw registry identity remains:

`3beb8d3838d9c6b11e96ce390dcbfd3ba073e1800c228a9a10486d3a73686866`

An isolated Signal Cathedral prepare, audio bake, finalize, validate, and
frame evaluation reproduced:

- project identity
  `sha256:c0085922cb268a69b8306898b167a1e2386675fdcf96778a832c258e75bf9223`
- audio identity
  `sha256:d13f1a0f9fe2af8cb088d08320f24822a8ecafddde4801143a52972fc4bc9dcd`
- bake execution identity
  `viz-bake.audio-feature-timeline.v1:c27288b9`
- 2,211,840 byte-for-byte identical packed semantic audio values

The new bundle stores that artifact in the versioned binary container, so its
container byte identity intentionally differs from the historical JSON file.
Decoded metadata, features, frequency values, and time-domain values are
identical.

The preserved final media remains:

- H.264/AAC, 1280×720, 60 fps, 12 seconds
- video SHA-256
  `a835883cafa005dc38851ea6cbb2e5adbf0abfd10137fa59bc6583383b2fcfb2`
- contact-sheet SHA-256
  `852419d591a4139b31f5e43071f3512d3b1dee028932b23701d389cb4c5ff372`

## Performance

The 15-component canonical runtime-plan benchmark improved on the same host:

| Measurement | Baseline | Final |
| ----------- | -------: | ----: |
| mean        | 0.302 ms | 0.285 ms |
| median      | 0.270 ms | 0.265 ms |
| p95         | 0.446 ms | 0.384 ms |

The canonical session remains 1.39× faster than constructing and evaluating
the former per-layer runtime shape.

The binary audio container remains 25.42% smaller than legacy JSON and decoded
in a median 0.708 ms versus 2.317 ms for JSON, while preserving every packed
value and direct-seek behavior.

## Product And Browser Proof

All seven checked Chromium journeys passed in 4.0 minutes:

1. canonical editing, history, graphs, and transport
2. portable model attachment and reload
3. graph authoring, history, clipboard, and reload
4. visible canonical project file roundtrip
5. visible nonblank still export
6. bounded canonical and renderer resource stability
7. visible probed nonblank and nonfrozen video export

This protects the established editor organization and interaction model,
node-graph workflows, Stage/model path, still/video export, transport,
persistence, diagnostics, and resource stability.

## Final Gate

`pnpm check:foundation` passed:

- 42 valid parity capabilities and zero recorded gaps
- 17 packages with no upward dependencies, cycles, undeclared workspace
  imports, or browser/Node entrypoint leaks
- formatting, ESLint, all package/app/tool type checks
- 55 Vitest files and 232 tests
- all seven browser journeys
- all package builds and the studio production build
- packed external-consumer smoke
- built-package agent creative-loop smoke

Goal Two is complete at the honest behavior-preserving minimization frontier.
