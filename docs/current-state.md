# Current State

Last reconciled: 2026-07-31

## Product Direction

VizEngine V2 is a full replacement architecture beneath the preserved editor
experience.

The destination is:

- one deterministic visual runtime
- one browser editor for that runtime
- one AI-native project and action model
- reusable render, audio, bake, asset, and control packages
- clean host integration without editor-owned runtime semantics

The original editor remains the UX and capability parity reference. Its hidden
store, render-loop, and compatibility architecture is not a preservation
target.

## Canonical Architecture

`VizProjectDocument` is the portable scene truth.

`VizSession` is the only live project/session/history truth. It owns:

- working project and revision
- typed project and graph actions
- undo/redo and continuous gestures
- preview transport
- audio-session state
- resolved assets and artifacts
- runtime inspection

The React editor owns presentation state and browser attachments. It subscribes
to the session; it does not redefine scene or runtime meaning.

Frame evaluation is deterministic and shared by live preview, inspection,
Remotion, still jobs, and video jobs. Remotion remains an adapter.

## Implemented V2 Substrate

- package contracts for projects, components, nodes, assets, artifacts, jobs,
  execution manifests, and control
- strict component, capability-pack, node, and Three-program registries
- direct canonical graph authoring and runtime graph evaluation
- typed action transactions with revision conflicts and dry runs
- browser and Node audio decode/bake paths
- deterministic audio-feature artifacts and runtime sampling
- versioned binary audio-artifact containers with legacy JSON reads
- portable local/external asset references and browser byte ownership
- SVG rendering and a retained, isolated-layer Three compositor
- explicit Three object, texture, model, program, render-target, and preview
  lifecycles
- generic model assets, deterministic clip sampling, real Stage characters,
  and scalable crowds
- observable bake and render jobs with progress, cancellation, output identity,
  media probing, and feedback
- local project bundles with exact content and execution identity
- preserved Vite/React studio wired to canonical session truth
- live HTTP/SSE control mounted over the same session as the editor
- source-mode and built-package CLI paths

## Certified Production

[Signal Cathedral](./plans/v2/first-agent-authored-production-signal-cathedral.md)
proves the complete loop:

- project-local component capability and Three program
- canonical editable graph
- portable audio and baked analysis
- live editor control and history
- deterministic preview and render
- stills, contact sheet, H.264/AAC clip, media probes, and performance evidence
- portable reopen with pinned execution identity

See
[Signal Cathedral Production Certification](./parity/evidence/2026-07-30-signal-cathedral-production-certification.md).

## Certified Consolidation Baseline

Goal One of the
[Core Consolidation And Behavior-Preserving Minimization Program](./plans/v2/core-consolidation-and-minimization-program.md)
is complete.

- baseline and source/dependency tooling
- real formatting, ESLint, type, and streamlined gate configuration
- seven checked real-browser editor journeys
- neutral `@viz-engine/project-bundle` dependency direction
- app-local session decomposition into focused composition modules
- direct canonical graph authoring, presets, and clipboard
- portable asset attachment, persistence, and restoration
- retained Three renderer decomposition and resource hardening
- registry-composed execution identity
- compact versioned audio-artifact storage
- thin CLI entrypoint, command registry, shared argument parsing, and
  source-mode execution

The certification passes 42 parity capabilities, 222 deterministic tests,
seven browser journeys, 17 package builds, the studio build, packed-consumer
smoke, and the built creative loop. Production source is 146 physical lines
smaller than the reviewed Goal One baseline while tests and mechanical
guardrails are stronger.

See
[Core Consolidation And Quality Hardening Certification](./parity/evidence/2026-07-30-core-consolidation-and-quality-hardening.md).

## Completed Minimization

Goal Two is complete:
[Behavior-Preserving Minimization And Final Polish](./plans/v2/behavior-preserving-minimization-and-final-polish.md).

Its immutable baseline is commit `6f4529b`, which is committed and pushed to
`origin/codex/viz-engine-v2`.

Production now contains 349 files and 67,645 physical lines: 22 fewer files
and 7,879 fewer lines than the immutable baseline. Combined maintained code is
7,632 lines smaller while deterministic tests increased from 222 to 232.

The result stopped at the honest simplification frontier rather than
compressing domain algorithms or weakening types, diagnostics, visual
behavior, tests, or performance to force the 10,000-line serious target.

Every certified editor interaction, graph capability, deterministic output,
portable asset workflow, Signal Cathedral result, model/character path,
renderer lifecycle, diagnostic, test, type, parity row, and performance budget
remains protected. See the
[Goal Two certification](./parity/evidence/2026-07-31-behavior-preserving-minimization-and-final-polish.md).

## Known Deliberate Deferrals

- a native browser-free video executor, until a real deployment requires it
- generalized masks/effect graphs
- prepared GLB derivatives and generic `Model3D` product authoring
- speech/singing/facial performance semantics
- hosted Viz Cloud and auth orchestration

These are future product work, not excuses to add parallel architecture during
consolidation.

## Recovery Pointers

- [Docs index](./docs-index.md)
- [Working agreements](./working-agreements.md)
- [V2 vision](./visions/viz-engine-v2-vision.md)
- [Product architecture and parity alignment](./visions/v2-product-architecture-and-parity-alignment.md)
- [Active consolidation plan](./plans/v2/core-consolidation-and-minimization-program.md)
- [Active minimization plan](./plans/v2/behavior-preserving-minimization-and-final-polish.md)
- [Autonomous development contract](./plans/v2/autonomous-development-operating-contract.md)
- [Parity matrix](./parity/README.md)
- [Suggestions](./suggestions.md)
- [Work ledger](./work-ledger.md)
