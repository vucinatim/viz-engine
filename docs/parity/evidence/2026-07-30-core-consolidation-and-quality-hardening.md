# Core Consolidation And Quality Hardening Certification

Date: 2026-07-30

Baseline commit: `bda5b2a1f6bfdef0af5aa5e1521df1687815f953`

Branch: `codex/viz-engine-v2`

## Result

Goal One of the
[Core Consolidation And Behavior-Preserving Minimization Program](../../plans/v2/core-consolidation-and-minimization-program.md)
is complete.

VizEngine V2 now has one coherent project/session/runtime architecture, checked
package direction, direct canonical graph authoring, portable browser-owned
assets, deliberate renderer and artifact lifecycles, thin source and built CLI
paths, and repository-owned real-browser acceptance of the preserved editor.

This was consolidation, not a UI redesign. The established editor, node graph,
audio workflow, still/video export, Signal Cathedral production, and package
consumer surface remain in place.

## Architecture Outcomes

### Repository and package boundaries

- introduced the neutral `@viz-engine/project-bundle` package for bundle
  validation, content identity, execution-manifest composition, and Node
  filesystem I/O
- removed the `@viz-engine/editor-control -> @viz-engine/dev-cli` dependency
  inversion
- validated 17 workspace packages with no upward dependencies, cycles,
  undeclared workspace imports, or browser/Node entrypoint leaks
- retained `VizSession` as the only project, revision, history, transport, and
  runtime-session truth

### Editor session composition

- reduced `src/lib/viz-session/store.ts` from 1,979 lines to a roughly
  294-line assembly and selective-subscription boundary
- separated project commands, graph commands, preview inspection, persistence,
  browser audio, jobs, attachments, and notifications by responsibility
- kept browser media and DOM ownership outside the canonical mutation kernel
- avoided a new store synchronization network or second project model

### Canonical graph authoring

- made `VizNodeGraphDocument` the direct durable authoring model
- retained React Flow only for spatial presentation, measurement, selection,
  viewport, and gesture state
- moved presets and clipboard operations to canonical graph fragments
- preserved named multi-output graphs, virtual presentation-only outputs,
  live values, connection replacement, grouped history, and persistence
- removed full `NodeNetwork -> VizNodeGraphDocument` mutation reconstruction

### Portable assets

- made file selection write content-addressed `asset:` references into the
  canonical project
- gave the browser attachment explicit ownership of `File`, object URL,
  IndexedDB bytes, and hydration
- embedded referenced local bytes in exported project files and restored them
  on import/reopen
- eliminated browser-local `idb:` values from portable project data

### Renderer and resource ownership

- decomposed the retained Three renderer by object, material, texture, model,
  program, render-target, isolated-layer, and preview lifecycle
- added focused reconciliation and disposal coverage proving stable resources
  survive value-only changes and are released on replacement/removal
- retained the existing Three/WebGL architecture and production Stage path

### Artifact and execution identity

- composed execution manifests from registered package, capability, component,
  node, renderer, bake, asset, artifact, and project metadata
- replaced newly written standard audio JSON/base64 artifacts with the
  versioned `viz-audio-feature-timeline-v1` binary container
- retained exact analyzer semantics and legacy JSON reads
- measured the production artifact as 25.42% smaller and roughly 70–73% faster
  to decode across certification runs, with no seek regression and 2,949,120
  fewer retained packed-representation bytes

### Developer tooling and obsolete-code removal

- replaced obsolete Next.js ESLint configuration with flat
  Vite/React/TypeScript linting
- repaired Tailwind v4-aware formatting and added checked formatting
- separated lint, type, test, browser, build, consumer, and creative-loop
  gates without weakening the complete gate
- added machine-readable source metrics and checked workspace dependency rules
- split the CLI into shared parsing, command registration, local services, and
  live-control services while retaining source-mode and built-package paths
- removed the runtime benchmark's accidental studio-barrel dependency so the
  Node measurement cannot load browser FFmpeg/WASM assets
- deleted superseded bundle code, the obsolete dynamic-form implementation,
  stale V1 architecture snapshots, and dead documentation-generation scripts

## Real-Browser Acceptance

The Playwright suite owns seven Chromium journeys:

1. canonical layer editing, undo/redo, graph opening, seek, play, and pause
2. portable GLTF attachment through the preserved file UI and byte restoration
   after reload
3. direct graph node creation, canonical history, copy/paste, deletion, and
   clean reload
4. visible Save As, New, and Open project roundtrip
5. visible 1280 × 720 PNG export with signature, dimensions, and nonblank pixel
   checks
6. six bounded layer-edit cycles plus eight play/pause/seek cycles with stable
   project, attachment, renderer, resource, and canvas counts
7. visible short 1280 × 720, 30 fps MP4 export verified by system FFprobe as
   H.264/AAC and by decoded-frame hashes as nonblank and nonfrozen

Canonical graph connection validation, replacement, node positioning,
measurement, grouped movement history, presets, shared outputs, detach
semantics, and live values remain covered by the deterministic foundation
suite. Browser tests use stable presentation selectors and canonical debug
inspection; they do not duplicate engine semantics.

The suite accepts only two documented host diagnostics:

- Chromium's headless GPU `ReadPixels` stall message
- unavailable Wake Lock permission during headless video export

No unexplained page error, console error, or console warning passed.

## Browser-Discovered Corrections

The checked journeys found defects that unit-only validation did not expose:

- graph switching changed the header while React Flow retained the prior
  graph; the renderer now remounts by graph identity
- the add-node context menu remained over the canvas; its presentation
  generation now advances after a successful add
- clipboard shortcuts could remain disabled because a mutable React Flow ref
  was read during render; shortcut availability now follows feature state
- node-context Copy and Duplicate acted on selection rather than the clicked
  node; both now use direct canonical node operations
- paste selection fed a stale controlled node list back through React Flow and
  erased the new canonical node; selection is now UI-only and cannot rewrite
  the graph
- the default track could be selected before the audio element registered,
  silently dropping its URL; the audio attachment now retains and reapplies
  the element URL

## Measured Source Baseline

The reviewed Goal One baseline and the certified result use the same
TypeScript/TSX/MTS/MJS inclusion rules:

| Scope                       | Baseline files | Baseline lines | Certified files | Certified lines | Line delta |
| --------------------------- | -------------: | -------------: | --------------: | --------------: | ---------: |
| production app and packages |            347 |         75,670 |             371 |          75,524 |       -146 |
| repository developer tools  |             10 |          2,124 |              13 |           2,466 |       +342 |
| tests                       |             51 |         10,835 |              54 |          12,637 |     +1,802 |
| playground                  |             22 |          3,139 |              22 |           3,139 |          0 |
| all measured code           |            435 |         92,055 |             464 |          93,954 |     +1,899 |

The production surface is already smaller despite the new package and stronger
boundaries. Total measured code grew because Goal One deliberately added
regression tests and repository tooling. Goal Two must use this certified
state as its fresh baseline and may not improve its line metric by deleting
meaningful tests or checks.

## Certification

The uninterrupted final gate passes:

```sh
pnpm check:foundation
```

It proves:

- 42 valid parity capabilities and zero gaps
- dependency-direction validation across 17 packages
- formatting, lint, all package/app/tool type checks
- 52 Vitest files and 222 passing tests
- 7 passing real-browser journeys
- all 17 package builds and the production studio build
- packed external-consumer smoke
- built-package creative-loop project mutation, graph execution, bundle
  roundtrip, and inspection

Additional validated commands:

```sh
pnpm benchmark:artifact-container
pnpm benchmark:runtime-preview
pnpm viz:built --help
pnpm smoke:creative-loop:built
pnpm metrics:source
```

The final runtime-plan benchmark used 15 catalog components over 300 measured
frames at 1280 × 720 and 60 fps. Canonical session evaluation measured
0.284 ms mean and 0.431 ms p95 on the development host, versus 0.477 ms mean
for the former per-layer session shape.

## Deliberate Deferrals

These remain future product work rather than Goal One shortcomings:

- a native browser-free video executor
- generalized masks and effect graphs
- prepared GLB derivatives and a generic `Model3D` authoring surface
- speech, singing, facial, and retargeting semantics
- hosted Viz Cloud and authentication orchestration

Goal Two may now minimize and polish the certified implementation. It must
preserve every behavior, architecture boundary, diagnostic, performance
property, editor interaction, and production capability recorded here.
