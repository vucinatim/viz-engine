# Foundation Implementation Progress

## Purpose

This document tracks the concrete V2 foundation work after the planning phase.

It exists to answer:

- what has become real already
- what has only been scaffolded
- what the next implementation slices are

## Current Status

The V2 foundation is now partially implemented.

The repo now has real package boundaries for:

- `@viz-engine/contracts`
- `@viz-engine/actions`
- `@viz-engine/runtime`
- `@viz-engine/editor-session`
- `@viz-engine/editor-control`
- `@viz-engine/bake`
- `@viz-engine/remotion-adapter`
- `@viz-engine/example-projects`
- `@viz-engine/app-viz-studio`

This is no longer just a doc-only posture.

## Completed Foundation Work

### Workspace and TypeScript

- introduced a package-safe shared TypeScript base config
- expanded the PNPM workspace to support `apps/*`
- added explicit foundation scripts for package typecheck/build, studio app,
  tests, and combined validation checks

### Canonical Contracts

- introduced the first real `VizProjectDocument` contract shape
- introduced first real asset and artifact reference contracts
- introduced audio feature timeline artifact types
- introduced component metadata and frame-plan snapshot contracts

### Runtime

- introduced project validation
- introduced deterministic frame context creation
- introduced runtime session creation and ordered-layer resolution
- introduced component registry support
- introduced first frame-plan resolution against baked artifact inputs

### Bake and Adapter Seams

- introduced first bake-plan generation from project assets
- introduced first Remotion composition/frame-state adapter seam

### Example and Validation Surface

- introduced a canonical example project package
- introduced deterministic example baked feature artifacts
- introduced the first root foundation test suite
- introduced a minimal Vite-based `viz-studio` app shell that consumes the
  packages directly
- introduced the first local-first CLI surface for validating and inspecting
  canonical example projects without going through the app shell

### Product Shell and Styling Foundation

- replaced the old Next shell with the preserved real editor mounted through
  `apps/viz-studio`
- removed the old Next-only API route glue in favor of bundled public-manifest
  inputs
- moved the active product styles into `src/styles/globals.css`
- upgraded the active product shell to the Vite-native Tailwind v4 styling
  path
- removed the old Tailwind v3/PostCSS config layer after the Vite cutover

## What This Proves

The current setup proves that V2 now has:

- a real monorepo package structure
- a canonical document model
- a deterministic runtime shell
- package-consumable example data
- a validatable and testable setup
- a first dedicated dev shell outside the old Next editor terrain

It now also proves the first actual visual runtime path:

- executable component implementations
- explicit render nodes
- render-plan generation
- SVG proof rendering shared across studio and Remotion
- local CLI inspection of frame and SVG output

It now also proves the first compositor path:

- `Three/WebGL` proof renderer from the same shared render plan
- studio primary preview through the `Three` path
- SVG retained as deterministic proof/debug renderer

It now also proves the first media-backed render path:

- asset-backed inputs resolved through the same frame-plan system
- first explicit `image` render node in the shared render contract
- SVG proof output for image-backed layers
- `Three` preview hydration of image textures on top of the same deterministic
  scene graph
- a canonical example project that now mixes procedural and asset-backed layers

It now also proves the first shared asset materialization layer:

- resolved assets are no longer treated as if they are already render-ready
- runtime session now builds an explicit materialized asset map from resolved
  assets
- asset-ref inputs resolve to materialized assets rather than raw storage-level
  refs
- render plans now carry materialized assets as shared host-consumable runtime
  inputs
- image render nodes now carry stable asset ids instead of raw source URIs
- SVG and `Three` renderers now consume the shared materialization seam instead
  of embedding asset-source assumptions into the render graph

It now also proves the first real `Three` semantics cleanup:

- inherited group opacity and blend are propagated through the `Three` render
  tree instead of being lost on non-material group objects
- stroke-only rects now render as explicit border meshes instead of incorrect
  filled quads
- the `Three` tests now assert semantic behavior instead of only scene-graph
  shape

It now also proves the first real local bundle-directory path:

- typed bundle-manifest contracts exist for a first portable local bundle
  posture
- the example-projects package now ships a real bundle fixture directory
- the local-first CLI can load project, asset, and baked-artifact inputs from a
  filesystem-backed bundle directory
- the runtime can validate, frame-plan, render-plan, and SVG-render from that
  bundle data without changing runtime ownership
- the local bundle loader now validates manifest kind/schema, required
  project-to-bundle reference coverage, and referenced file presence
- the package-consumer smoke now renders from the packaged bundle path as well
  as the in-memory example path

It now also proves the first real graph execution slice:

- embedded graph documents are now real project content instead of stub refs
- graph inputs can resolve project-scoped literal, asset, and artifact-feature
  sources
- graph nodes can bind literals, graph inputs, and upstream node outputs
- the runtime now evaluates graphs once per frame and resolves `graph-output`
  layer inputs through the shared frame-plan path
- the example project and portable bundle now use real graph outputs for
  reactivity shaping instead of only direct feature wiring
- a dedicated core-node package now exists for the first pure-node execution
  set
- direct graph tests now cover deterministic outputs and cycle detection

It now also proves the first real portable bundle roundtrip:

- the node-only local bundle layer can now write canonical bundle directories
  instead of only loading them
- portable bundle export now writes `project.json`, `bundle-manifest.json`,
  asset files, and artifact files from runtime-facing project inputs
- the export path now supports file-backed, data-URI-backed, and byte-backed
  resolved assets
- the export path now supports JSON-serializable resolved artifact payloads
- example-project export now works directly from in-memory runtime inputs
- bundle export and reload roundtrip now validates through the same loader and
  render path
- the packaged external consumer smoke now also proves bundle export/reload
  outside the monorepo

It now also proves the first explicit layer compositor step in the `Three`
preview path:

- preview composition is no longer only a flattened layer-object tree
- each visible layer now renders into its own isolated `Three` surface in the
  preview controller
- compositor surfaces now own layer opacity and layer blend mode explicitly
- inner group/style opacity remains inside the layer content scene instead of
  being forced into layer-level semantics
- the renderer tests now prove compositor-surface behavior directly

It now also proves the first real project action surface:

- canonical typed project actions now exist in the contracts package
- a dedicated `@viz-engine/actions` package now reduces explicit actions into
  new canonical project documents without touching editor/runtime state
- the first action set covers core project mutation paths for:
  - assets
  - artifacts
  - layers
  - embedded graphs
- action-driven graph and layer mutations now validate through the same runtime
  document, frame-plan, and render-plan path as hand-authored example projects
- the local-first CLI now exposes action-apply flows for both the canonical
  example project and portable bundle directories
- action-driven bundle mutation can now validate, optionally export, reload,
  and render through the same shared bundle/runtime path
- the external package-consumer smoke now proves that host code can install the
  actions package and mutate a Viz project document outside the monorepo

It now also proves the first intentional studio chunk split:

- the studio shell no longer eagerly imports the `Three/WebGL` preview path
- the heavy preview renderer now loads behind a lazy boundary in a secondary
  build chunk
- the initial studio application chunk is materially smaller, so the shell
  stays closer to a real inspector and does not eagerly bundle the whole
  preview stack on first paint

It now also proves the first hardened validation baseline:

- file-backed golden fixtures now pin canonical frame-plan outputs
- file-backed golden fixtures now pin canonical render-plan outputs
- file-backed golden fixtures now pin canonical SVG proof output
- file-backed golden fixtures now pin canonical exported bundle manifest output
- the repo now has a deliberate `pnpm fixtures:update` command for
  regenerating those goldens
- bundle corruption tests now cover invalid manifest metadata, missing files,
  orphan entries, and missing manifest entries
- the local bundle loader now degrades missing or invalid artifact payloads
  into explicit issues instead of crashing the operator surface

It now also proves the first real temporal graph baseline:

- node contracts now support explicit temporal stepping alongside pure
  evaluation
- the graph runtime now replays temporal graphs from frame zero to the
  requested frame under fixed timestep as the first deterministic baseline
- runtime sessions now keep explicit in-memory graph checkpoints so repeated
  temporal graph evaluation can resume from the nearest prior checkpoint instead
  of always replaying from frame zero
- `@viz-engine/nodes-core` now ships a real temporal `decay` node
- the canonical example graph now uses that temporal node for bloom shaping
- direct temporal graph tests now prove both stable fixed-step replay behavior
  and checkpoint reuse within one runtime session

It now also proves the first external package-consumer path:

- tarball smoke validation for the core V2 runtime/render packages
- package manifests trimmed to `dist`-first published contents
- Node-valid ESM package output with explicit relative `.js` specifiers
- an external temporary consumer that installs Viz tarballs and renders the
  canonical example project without workspace alias help
- `check:foundation` now validates both the internal workspace path and the external
  tarball-consumer path

The runtime direction is now explicitly portable-first:

- host projects should consume the portable Viz runtime contracts directly
- host-specific integration glue should stay out of the core package spine
- Remotion remains a host adapter, not a Magnify-specific architecture path
- the temporary Magnify-specific adapter/package path has been removed after
  proving the seam, so the workspace stays centered on generic runtime inputs
  and host adapters rather than app-specific glue

And it has a stronger internal package discipline:

- dist-first internal package exports
- source-first TypeScript and app/test aliases where appropriate
- explicit split between package lint/dev resolution and package build
  resolution

It now also proves the first real editor-session foundation seam:

- a dedicated `@viz-engine/editor-session` package now owns canonical
  working-head behavior instead of shell-specific ad-hoc state
- the new session layer keeps an explicit split between:
  - source project truth
  - mutable working head truth
  - editor-only UI state
  - preview-only state
- working-head mutation now routes through the canonical V2 action surface
- invalid action-driven mutations are rejected without corrupting the current
  working head
- the editor-session tests now prove that a mutated working head can export to
  a portable bundle and reload/render successfully
- the external package-consumer smoke now installs and exercises
  `@viz-engine/editor-session` outside the monorepo

It now also proves the first live-preview and audio-session foundation seam:

- `@viz-engine/editor-session` now exports a deterministic transport controller
  for play/pause/seek/frame-advance ownership
- the transport layer now owns explicit looping and end-of-duration behavior
  instead of leaving that implicit inside UI code
- `@viz-engine/editor-session` now exports an explicit audio-session controller
  with source attachment, analyzer status, and baked-artifact availability
- live-preview diagnostics now explicitly classify preview input posture as:
  - `none`
  - `baked-only`
  - `live-only`
  - `hybrid`
- the new tests prove that transport state can drive editor-session preview
  state without coupling that logic to a React shell or app-specific store

It now also proves the first local agent control surface:

- a dedicated `@viz-engine/editor-control` package now owns the reusable local
  operator contract on top of `@viz-engine/editor-session`
- the new control surface can open:
  - the canonical example project
  - portable bundle-backed projects
  - generic in-memory project/resources
- the control surface can mutate the working head through canonical actions and
  then inspect:
  - frame plans
  - render plans
  - SVG debug output
  - graph summaries
  - preview/audio state
- bundle export is now available directly from the same control surface
- the dedicated tests prove that a local operator can drive the working head
  and inspect runtime outputs without any browser scraping
- the external package-consumer smoke now installs and uses
  `@viz-engine/editor-control` outside the monorepo

It now also proves the first component-authoring foundation slice:

- `@viz-engine/components-core` now uses per-component modules instead of one
  growing catch-all file
- the runtime component registry now validates duplicate ids, duplicate input
  keys, and missing component metadata
- core component registration now runs in strict mode so invalid registries
  fail fast
- the local-first CLI now exposes a component scaffold helper for predictable
  component-module generation
- the repo now has the first V1-derived V2 component port:
  - `feature-channel-bars`
- dedicated tests now cover:
  - registry validation
  - the scaffold helper
  - rendering the V1-derived component through the canonical V2 runtime path

An important correction:

- an earlier attempt to mount a weaker V2 shell into the real Next editor
  terrain was rolled back
- the active product surface should remain the preserved V1 editor UX until V2
  foundations are wired underneath it without lowering that UX bar
- the package-level V2 editor/session/control work remains valuable foundation
  work, but it should not be mistaken for the product-shell migration itself

It now also proves the first agent-native creative-loop slice:

- the repo now has a scripted end-to-end local creative-loop scenario in
  `tools/foundation/agent-creative-loop-scenario.ts`
- that proof opens the canonical example project, mutates the working head,
  adds graph and layer content, inspects runtime output, exports a bundle, and
  reloads it successfully
- `@viz-engine/editor-control` now keeps a clean browser-vs-Node boundary:
  - the root package entry is browser-safe
  - bundle IO lives behind `@viz-engine/editor-control/node`
- `pnpm smoke:creative-loop` now validates that one truthful local
  human-plus-agent authoring path is operational
- the creative-loop proof is now part of the full V2 validation gate

The browser-facing V2 shell experiments around live transport/audio controls
and component-catalog inspection were also part of that rolled-back path.

- keep the underlying session/control concepts
- do not treat the discarded V2 shell UI as the target editor surface

## What Is Still Missing

The foundation is still not yet a real rendering/editor replacement.

Major missing layers are:

- durable bake/checkpoint artifacts beyond the first in-memory temporal replay
  and runtime-session checkpoint baseline
- richer asset resolver/materialization pipeline beyond the first explicit
  materialized-asset seam
- final renderer/compositor implementation
- video-texture, masking, and fuller non-primitive render-node coverage
- fuller pass-based layer compositing beyond the first explicit isolated-layer
  surface model
- richer editor mutation/action surface beyond the first canonical project
  action subset
- richer CLI/workspace lifecycle
- a more explicit portable resolved-input/materialization layer for non-example
  projects
- a fuller import/export system beyond the first bundle-directory proof
- archive-based bundle packaging beyond the current directory-backed roundtrip
- richer export strategies for non-JSON artifact payloads and larger media
  pipelines
- fuller golden coverage for more canonical scenes, frames, and later temporal
  behavior once the first temporal-node slice lands
- fuller preserved-V1 editor rebuilding beyond the first scene/preview/audio
  shell
- deeper live transport behavior and browser playback verification under the
  real editor surface
- richer live component pick-up and code-authoring iteration inside the real
  editor loop
- stronger editor-side layer creation and retargeting flows built on top of the
  new component-catalog truth
- deeper browser-visible verification of interactive transport controls once
  the next local operator/browser bridge layer is in place

## Recommended Next Slices

### Slice 7

- keep rebuilding the preserved V1 editor UX over the current
  runtime/session/control stack instead of growing alternate shell concepts
- deepen browser transport behavior so live play/pause/seek verification is as
  strong as the current deterministic runtime gate
- keep expanding rich scene inspection and debugging surfaces where the agent
  and user benefit from shared truth in the actual editor
- continue toward stronger live component iteration and layer creation inside
  the real editor loop, not only CLI-level scaffolding
- keep advancing the creative-loop proof toward repeated manual/browser-verified
  authoring runs without compromising the stable package/runtime boundaries

## Guardrails

Important rules while continuing:

- keep new V2 work out of the old `src/` terrain unless bridging is truly
  required
- keep old app compatibility stable while V2 grows next to it
- do not overbuild fake abstraction before the first real visual proof exists
- keep tests and example fixtures growing alongside runtime behavior

## Final Position

The current V2 implementation status is strong enough to move beyond proof-only
package validation into stronger portability, deeper graph semantics, better
compositor behavior, and more complete runtime inputs.

That should now become the focus.
