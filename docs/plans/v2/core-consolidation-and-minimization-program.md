# Core Consolidation And Behavior-Preserving Minimization Program

Status: Goal One complete and certified; Goal Two active from immutable commit
`6f4529b`.

Baseline reviewed: `bda5b2a` on `codex/viz-engine-v2`, 2026-07-30.

Goal One certification:
[2026-07-30 Core Consolidation And Quality Hardening](../../parity/evidence/2026-07-30-core-consolidation-and-quality-hardening.md).

Goal Two execution contract:
[Behavior-Preserving Minimization And Final Polish](./behavior-preserving-minimization-and-final-polish.md).

## Purpose

VizEngine V2 has crossed an important threshold:

- the canonical project, session, action, runtime, bake, render, capability,
  and execution-identity systems are real
- the preserved editor operates on those systems
- a genuinely new production has completed the live, headless-authoring,
  render, feedback, reopen, and editing loop

The next move should not be another broad feature expansion.

The next move should be to consolidate the architecture we have now, remove
the remaining transition seams, strengthen the validation system, and make the
codebase easier to understand before more product capability is built on top
of it.

This program intentionally defines two separate long-horizon goals:

1. **Goal One: Core Consolidation And Quality Hardening**
2. **Goal Two: Behavior-Preserving Minimization And Final Polish**

They must remain separate.

Goal One may add code where stronger contracts, automation, or regression
coverage are required to remove architectural risk safely. Goal Two begins
only after Goal One is certified and then deliberately finishes with less
maintained code than it started with.

## Why This Is The Right Sequence

Trying to minimize before correcting ownership can make the wrong structure
smaller and harder to replace.

Trying to combine cleanup and minimization into one success metric can also
reward unsafe behavior:

- deleting tests to improve line counts
- compressing complex logic instead of simplifying it
- keeping an incorrect dependency because extracting the right boundary adds
  a small amount of code
- avoiding browser automation because it increases the diff

The intended sequence is:

```text
freeze behavior
  -> correct ownership and dependency direction
  -> automate the proof
  -> delete superseded paths
  -> record a fresh baseline
  -> minimize the proven system
```

The result should be a smaller system because it has fewer concepts,
translations, wrappers, and duplicate paths, not because its code has been
made denser or less explicit.

## Non-Negotiable Product Invariants

Both goals preserve all of the following:

1. `VizProjectDocument` remains the only portable scene document.
2. `VizSession` remains the only canonical live project/session engine.
3. The deterministic runtime remains independent from React, Zustand, DOM
   state, browser media elements, and editor interaction state.
4. Human editor actions and agent actions continue to use the same canonical
   mutation and history semantics.
5. Live preview, deterministic rendering, and baking continue to share the
   same project meaning.
6. Capability packs remain the extension boundary for reusable creative
   behavior.
7. Remotion remains an adapter.
8. The established editor UX remains the product reference. Cleanup does not
   authorize a visual redesign, reduced interaction density, or feature loss.
9. The node graph remains a first-class, spatial, editable authoring surface.
10. Signal Cathedral remains a portable, editable, deterministic production,
    not a one-off fixture that only works through a special path.
11. No currently working capability may disappear to make the code smaller.
12. No parity row may regress or be promoted without evidence.

## Evidence Baseline

The following are observed facts at the reviewed baseline. They are not
permanent targets and must be measured again when each goal starts.

### Certified behavior

- 16 workspace packages type-check and build.
- `pnpm check:foundation` passes.
- 50 foundation test files and 208 tests pass.
- the parity matrix contains 42 capabilities, zero known gaps, 37 partial
  rows, two not-audited rows, and three verified rows.
- Signal Cathedral reopens in a clean browser context and produces an
  identical representative frame in the tested environment.
- live playback, canonical graph evaluation, undo/redo, jobs, export, and
  project reopening have production evidence.

### Current source size

Tracked TypeScript/TSX/MTS/MJS at the reviewed baseline:

| Scope                               | Files | Physical lines |
| ----------------------------------- | ----: | -------------: |
| production app and package source   |   347 |         75,670 |
| repository developer tools          |    10 |          2,124 |
| tests                               |    51 |         10,835 |
| playground                          |    22 |          3,139 |
| all tracked code in those languages |   435 |         92,055 |

These are coarse physical-line measurements. They are useful for measuring
direction, not for judging individual modules.

### Concentrated implementation areas

The largest maintained implementation files include:

- `src/components/node-network/presets.ts`: 2,499 lines
- `src/lib/viz-session/store.ts`: 1,979 lines
- `packages/viz-nodes-core/src/editor-nodes.ts`: 1,916 lines
- `packages/viz-renderer-three/src/programs/stage-scene.ts`: 1,697 lines
- `packages/viz-renderer-three/src/index.ts`: 1,619 lines
- `src/components/editor/performance-stats-dialog.tsx`: 1,542 lines
- `src/lib/utils/chart-export.ts`: 1,343 lines
- `packages/viz-dev-cli/src/index.ts`: 913 lines
- `packages/viz-dev-cli/src/local-project-bundle.ts`: 862 lines
- `packages/viz-editor-control/src/protocol.ts`: 839 lines
- `packages/viz-editor-control/src/index.ts`: 804 lines
- `packages/viz-editor-session/src/index.ts`: 797 lines
- `src/lib/viz-session/project-adapters.ts`: 735 lines

A large file is not automatically bad. This inventory only identifies places
where several responsibilities or repeated definitions may have accumulated.
Every proposed change still needs an ownership or duplication argument.

### Confirmed tooling gaps

- Prettier fails on TSX because `.prettierrc` references the deleted Tailwind
  v3 `tailwind.config.ts`.
- ESLint still extends `next/core-web-vitals` even though the active studio is
  Vite and that config is no longer installed.
- the root `lint` command currently means TypeScript checking rather than
  actual linting.
- the foundation gate repeats expensive work:
  - studio type-checking is invoked more than once
  - the studio build is invoked more than once
  - package builds are repeated by later smoke commands
- important browser acceptance is still a manually orchestrated procedure
  rather than a checked repository workflow.

### Confirmed architecture seams

- `src/lib/viz-session/store.ts` currently composes browser render jobs, audio
  bake jobs, project/session projection, graph commands, preview execution,
  browser audio attachment, persistence, UI-store synchronization, and toast
  feedback in one module.
- the node editor still edits a React Flow-era `NodeNetwork` projection that is
  converted back into a canonical `VizNodeGraphDocument`.
- graph projection therefore remains bidirectional and carries compatibility
  metadata, virtual output nodes, fallback positions, translation logic, and
  broad `any` types.
- `@viz-engine/editor-control` depends on `@viz-engine/dev-cli` for local
  bundle I/O. A reusable control layer should not depend upward on a command
  line application.
- package/runtime implementation identities are still manually repeated in
  production materialization and registry composition.
- the canonical standard audio bake is semantically correct but the current
  JSON/base64 representation makes the Signal Cathedral artifact roughly
  three megabytes and previously amplified validation costs.
- browser-local `idb:` file values still exist at part of the preserved
  `FileInput` boundary, so the complete editor-side asset selection path is not
  yet canonical and portable.
- the Three renderer has correct retained-program behavior, but its root module
  still combines portable-node materialization, asset hydration, resource
  reconciliation, isolated-layer compositing, and preview-controller
  lifecycle.
- mutable text and some mixed primitive groups can still recreate renderer
  resources more often than the retained architecture intends.
- CLI command parsing and dispatch are concentrated in one large module and
  require more repository-wide rebuilding than an ordinary local operator
  command should.
- `docs/current-state.md`, `docs/suggestions.md`, and parts of `README.md`
  contain completed or obsolete frontier statements alongside current ones.

## What Is And Is Not A Current Shortcoming

This distinction prevents the cleanup goal from turning into an unbounded
feature program.

### Must be corrected now

- broken formatting and linting posture
- repeated validation work in the main repository gate
- the `editor-control -> dev-cli` dependency inversion
- mixed responsibilities in the app-local session composition module
- bidirectional canonical-graph / `NodeNetwork` mutation translation
- remaining ambiguous adapter ownership
- manually repeated execution identities
- non-portable editor file-selection values
- stale documentation and obsolete cleanup instructions
- lack of checked browser regression coverage for the critical preserved
  editor journey

### Must be measured and hardened now

- renderer resource reconciliation for currently supported primitives
- live parameter and graph editing responsiveness
- long-session attachment/resource stability
- audio artifact storage and decode behavior
- CLI startup/build overhead and machine-readable failure ergonomics
- package dependency direction and public entrypoint shape
- strictness lost through broad `any` types at canonical/editor boundaries

### Deliberately deferred unless evidence changes the decision

- a native Node-side WebGL video renderer
- a distributed session daemon
- arbitrary third-party capability-pack loading
- a new compositor pass/effect feature graph
- new character, facial, speech, or retargeting capability
- broad new editor features
- a visual redesign of the preserved editor

The browser-backed Three/video executor is a host limitation, not currently a
second architecture. It should only be replaced when a real browser-free
production requirement justifies the operational and dependency cost.

Prepared GLB derivatives and model-preparation tooling remain valuable, but
they should enter this goal only if loader warnings or asset weight interfere
with the cleanup acceptance baseline. They are not a reason to widen the core
consolidation goal into a new 3D feature milestone.

## Goal One: Core Consolidation And Quality Hardening

### Goal statement

Make the current V2 architecture internally coherent, mechanically guarded,
browser-regression-tested, and ready for aggressive behavior-preserving
minimization without reducing product capability or changing the established
editor UX.

### Completion principle

Goal One is complete when every remaining transitional boundary either:

- has been deleted,
- has one explicit and narrow responsibility,
- or is documented as a deliberate host boundary with a concrete reason to
  remain.

File splitting by itself is not completion. Renaming an adapter is not
completion. The old and new paths must not continue to coexist behind cleaner
filenames.

### Workstream 0: Freeze And Record The Behavioral Baseline

Before structural edits:

1. run the complete foundation gate
2. record exact package, test, source-size, and dependency baselines
3. record production bundle identities
4. capture representative Signal Cathedral frames and media probe results
5. capture the preserved editor critical journey:
   - open a project
   - create, duplicate, reorder, hide, and remove a layer
   - edit parameters
   - apply and reset a preset
   - create, edit, connect, copy, paste, and delete graph nodes
   - observe live graph values
   - play, pause, seek, loop, and change tracks
   - undo and redo both isolated edits and grouped gestures
   - save, reload, import, and reopen
   - start, inspect, and cancel a job
   - configure still and video export
6. record representative interaction latency, playback pacing, and resource
   counts on the existing fixed-device baseline

This creates the protection needed for later deletion.

### Workstream 1: Repair The Repository Quality Gate

Establish one honest and efficient quality system:

- replace the deleted Tailwind v3 Prettier configuration with the correct
  Tailwind v4-aware posture
- replace the obsolete Next.js ESLint configuration with a Vite/React/TypeScript
  configuration appropriate to the active codebase
- make `lint` run linting and keep type-checking as a separate named operation
- add `format:check`
- add a workspace dependency-direction check
- add a source-size report with stable inclusion/exclusion rules
- make the main gate run each expensive type-check/build step once
- make smoke tests consume the build already produced by the gate
- keep focused developer commands fast without weakening the final gate

The final gate should distinguish:

- fast static/focused checks
- package and app build checks
- deterministic/runtime tests
- real-browser acceptance
- full production certification

The distinction is for iteration speed and diagnosis. It must not create
different truth standards.

### Workstream 2: Add Checked Browser Acceptance

Convert the repeatable manual browser checks into a repository-owned suite.

The recommended implementation is Playwright because it provides a real
browser, deterministic selectors, trace/screenshots, downloads, and CI-ready
interaction without inventing a custom browser protocol.

Adding Playwright is a dependency decision and should be explicitly approved
when Goal One starts. If it is not approved, Goal One must not substitute a
fragile home-grown browser driver merely to avoid the dependency.

The checked suite must cover at least:

- the critical preserved-editor journey from Workstream 0
- React Flow node measurement and connection behavior
- no unexpected console errors or warnings
- Signal Cathedral load and representative frame rendering
- audio/transport behavior under repeated play, pause, and seek
- one full undo/redo transaction
- persistence and clean reopen
- one still output and one short encoded video output with media probing and
  nonblank/nonfrozen frame checks
- a bounded edit-churn and playback soak

Stable `data-*` selectors may be added at presentation boundaries. The tests
must not locate behavior through brittle styling-class internals.

### Workstream 3: Correct Package Dependency Direction

Define and enforce a simple workspace layering rule:

```text
contracts
  -> pure domain/runtime/action/node/component/renderer packages
  -> session and control packages
  -> host adapters and project-bundle I/O
  -> CLI and studio applications
```

The immediate correction is to remove the
`@viz-engine/editor-control -> @viz-engine/dev-cli` dependency.

Recommended shape:

- move reusable project-bundle validation and filesystem I/O out of the CLI
  application into one neutral, narrow project-bundle boundary
- let the CLI and Node control composition depend on that boundary
- keep browser control free from Node filesystem imports
- keep CLI parsing, process exit, and terminal presentation in the CLI package

Creating one package is justified here only because project-bundle I/O is
already a real shared domain capability. Do not create packages merely to make
the dependency diagram look symmetrical.

Add a checked rule that rejects upward imports, browser/Node entrypoint leaks,
and cycles.

### Workstream 4: Reduce The App-Local Session Module To Composition

`src/lib/viz-session/store.ts` should stop being the place where every editor,
browser, session, graph, job, and persistence behavior meets.

The target is not several new sources of truth. The target is:

- one `VizSessionHost`
- one canonical session/action/history kernel
- thin selective React/Zustand subscriptions
- explicit browser attachments
- explicit UI-only state
- small composition code connecting them

Separate responsibilities by behavior:

- studio session composition
- project commands and projections
- graph authoring commands
- preview controller and inspection
- browser audio attachment
- browser bake/render job attachment
- persistence bootstrap
- UI notifications

Then remove duplicated facades where callers can use the canonical host or a
focused command surface directly.

Specific expectations:

- toast presentation must not live in the canonical mutation/history path
- browser encoders, DOM queries, and audio elements must not appear in the
  session composition kernel
- project actions must not be reimplemented in Zustand
- selectors must remain selective and frame-driven work imperative
- one user gesture must still produce one canonical transaction and undo step
- there must be no new store-to-store synchronization network

The old 1,979-line module should become a small assembly/export boundary or be
deleted. A numerical file limit is not the goal, but leaving most behavior
inside the same module under extracted helper names does not satisfy the
workstream.

### Workstream 5: Make Canonical Graphs The Direct Authoring Model

The node editor should preserve React Flow as its spatial UI, but stop treating
`NodeNetwork` as a second durable graph format.

Target model:

- `VizNodeGraphDocument` is read directly from `VizSession`
- a one-way view projection supplies React Flow nodes, edges, handles, and
  virtual output endpoints
- React Flow measurements, transient selection, drag state, and viewport stay
  UI-local
- edits emit canonical graph actions directly
- graph presets and clipboard use canonical graph fragments
- named multi-output graphs remain fully editable
- virtual graph-output nodes remain presentation-only and cannot leak into the
  project document

Delete from the mutation path:

- full `NodeNetwork -> VizNodeGraphDocument` reconstruction
- compatibility metadata needed only for roundtripping
- legacy output-node inference
- adapter-owned graph identity
- broad untyped node and edge mutation payloads

Acceptance must explicitly cover:

- every existing built-in node
- connection validation and replacement
- presets
- copy/paste
- node movement and measurement
- shared multi-output graphs
- parameter detach without graph destruction
- live runtime values
- grouped drag history
- persistence and clean reopen

### Workstream 6: Finish Browser Attachment And Asset Ownership

Keep browser-specific facilities explicit and narrow:

- media elements
- Web Audio analyzers
- capture streams
- canvases and WebGL contexts
- object URLs
- IndexedDB byte storage
- FFmpeg browser workers

Correct the remaining portable asset seam:

- editor `FileInput` must write canonical asset references into the project
- host materialization owns `File`, object URL, IndexedDB, and byte resolution
- portable project data must not depend on a browser-local `idb:` URI
- project export/import must carry or deliberately externalize the referenced
  bytes through one documented policy

The same asset reference must work for live preview, deterministic render,
bundle export, fresh reopen, and future non-browser hosts.

### Workstream 7: Harden Renderer Ownership And Resource Reconciliation

Refactor the current Three renderer by real responsibility:

- portable-node object creation and update
- image/text/material resource hydration
- object disposal and resource ownership
- isolated layer compositing
- retained Three-program lifecycle
- preview controller lifecycle

This is an internal decomposition, not a new rendering architecture.

Then measure and correct currently supported resource churn:

- text texture recreation
- mixed primitive group recreation
- image hydration and replacement
- render-target resizing
- program disposal
- project/layer removal
- repeated seek and loop behavior

Add resource lifecycle instrumentation or focused tests that prove stable
objects remain stable when only values change.

Do not add masks, blur, a generalized effect graph, or another renderer backend
inside this workstream.

### Workstream 8: Make Artifact And Execution Identity Deliberate

Replace repeated magic version strings with one explicit identity composition
path.

Execution manifests should derive identities from registered build/capability
metadata rather than a production script manually reconstructing package
versions.

For standard audio artifacts:

- retain the complete analyzer-compatible semantic payload
- define a versioned encoded-container boundary
- prefer a binary or explicitly compressed sidecar over JSON/base64 when it
  materially reduces storage and decode cost
- preserve exact feature values, frame coverage, content identity, and
  deterministic sampling
- cache decoded immutable data at the resource boundary
- measure bundle size, decode time, seek time, and memory before and after

Do not reduce FFT bins, waveform samples, features, or timeline resolution to
claim an optimization.

### Workstream 9: Make Devtools A Thin Client Of Real Semantics

Keep the CLI valuable for autonomous work while reducing application-level
concentration:

- separate command registration/parsing from command implementation
- reuse bundle, action, bake, render, and live-control services
- make help and structured errors consistent
- avoid rebuilding unrelated packages for ordinary source-mode commands
- keep a distinct built-package smoke path
- keep browser and Node dependency surfaces explicit

The CLI must remain a client of the canonical system. It must not grow its own
project mutation, graph, render, or bundle semantics.

### Workstream 10: Purge Obsolete Code And Documentation

After callers have moved:

- delete superseded adapters, aliases, helpers, and compatibility metadata
- delete dead V1 architecture that no longer supports the preserved UX
- remove obsolete Next.js configuration and references
- remove stale completed suggestions
- reconcile `README.md`, `docs/current-state.md`, active plans, parity evidence,
  and package documentation
- make `docs/current-state.md` state one current frontier rather than retaining
  historical frontier paragraphs as if they are still active

History belongs in the work ledger and evidence documents. Current-state
documentation should stay short enough to recover direction quickly.

## Goal One Validation Gates

Goal One is complete only when all of these are true.

### Architecture

- the package dependency-direction check passes with no exceptions for the
  old `editor-control -> dev-cli` inversion
- canonical graph edits no longer roundtrip through a second durable graph
  shape
- `VizSession` remains the only project/session/history truth
- app-local session code is a composition and selective-subscription boundary,
  not a second implementation
- browser and Node entrypoints do not leak into one another
- execution identity is composed once from registered metadata
- editor file selection produces portable canonical asset references

### Tooling

- formatting works on TSX and is checked
- ESLint is real, current, and checked
- type-checking remains separately checked
- the full gate performs no known duplicate build/type-check work
- focused developer commands do not require an unnecessary full workspace
  rebuild
- workspace dependency rules and source-size reporting are checked

### Behavior

- all existing foundation tests pass
- all package consumer smoke tests pass
- the agent creative loop passes
- the checked browser critical journey passes
- Signal Cathedral validates, reopens, edits, plays, and renders
- representative deterministic outputs remain equal unless an intentional
  serialization-only identity change is documented
- no existing parity capability regresses
- no new browser console errors or warnings remain unexplained

### Performance

- no measured regression in representative live frame pacing
- no measured regression in parameter, graph, transport, or panel interaction
  latency
- bounded edit/playback soak shows no resource accumulation
- artifact storage/decode changes improve or preserve bundle size, decode time,
  seek time, and memory
- renderer reconciliation proves stable resources survive value-only updates

### Documentation

- the active plan, current state, suggestions, parity evidence, and work ledger
  agree
- every remaining adapter has a named responsibility and reason to exist
- every deferred item is clearly distinguished from a completion requirement

## Goal One Non-Goals

Goal One does not authorize:

- UI redesign
- removal of advanced UI surfaces because they are difficult to test
- replacement of React Flow
- replacement of Three.js
- a new scene/project model
- a new state-management architecture
- new hosted/cloud infrastructure
- a plugin marketplace
- a native headless WebGL stack
- new creative components merely to exercise the architecture
- generalized abstraction created only to reduce file size

## Goal Two: Behavior-Preserving Minimization And Final Polish

### Activation rule

Goal Two begins only after Goal One is certified and committed.

At activation, create a fresh machine-readable baseline containing:

- baseline commit
- source file and line counts by scope
- package dependency graph
- public exports
- tests and browser journeys
- parity state
- representative deterministic output identities
- Signal Cathedral bundle and media identities
- live and render performance measurements

The minimization target must be based on that new baseline, not the historical
numbers in this document.

### Goal statement

Reduce the amount of maintained VizEngine code while preserving all behavior,
capability, robustness, type safety, diagnostic quality, performance, editor
UX, and agent operability proven at the Goal One baseline.

### Primary success metric

The final Goal Two implementation diff must delete more code lines than it
adds.

The repository should report both:

1. additions versus deletions from the Goal Two baseline
2. final physical maintained-code lines versus the Goal Two baseline

At minimum:

- production source LOC must be lower
- production-source deletions must exceed additions
- combined maintained code across production source, tools, and tests must be
  net negative
- no meaningful test, assertion, diagnostic, or public capability may be
  deleted merely to satisfy the metric

Docs, generated fixtures, media, build output, lockfiles, and vendored assets
must be reported separately so they cannot hide the implementation result.

The exact aspirational percentage target should be chosen only after the Goal
One baseline audit identifies real duplication. A forced percentage is less
important than a truthful net-negative result with a demonstrably simpler
conceptual model.

### What To Minimize

Prioritize reduction of concepts and translations:

- redundant facades over the same session/control methods
- repeated clone, validation, identity, and result-shaping logic
- duplicate browser/Node orchestration
- repeated action/request dispatch branches
- repeated component authoring declarations that can use a smaller typed
  vocabulary
- repeated node definitions and presets that can use transparent typed
  factories or data tables
- repeated renderer create/update/dispose branches
- repeated form and node-body presentation patterns
- redundant package barrels and re-export aliases
- duplicate test setup and fixtures, while retaining assertions
- obsolete compatibility names and transitional metadata
- dead exports, dependencies, files, and feature flags

### Preferred minimization techniques

- delete wrappers after callers converge on a stable lower-level contract
- replace repeated switch/branch scaffolding with typed registries where the
  data is genuinely uniform
- replace repeated literal schemas with small composable typed constructors
- use table-driven tests when the same behavior is asserted across variants
- make lifecycle ownership generic only when several implementations already
  prove the same pattern
- collapse one-use abstractions back into their owner
- remove exports that are not part of a deliberate public surface
- remove dependencies made unnecessary by the consolidated architecture

### Forbidden ways to win the line-count metric

Do not:

- minify or write compressed one-line code
- reduce names, comments, or whitespace to manipulate counts
- replace clear types with `any`
- remove validation, errors, cancellation, progress, or diagnostics
- delete tests, assertions, browser journeys, fixtures, or evidence without an
  equal or stronger replacement
- hide source in generated blobs
- introduce opaque metaprogramming or code generation for small savings
- combine unrelated modules into larger files
- create a “god helper” or generic framework that makes local code shorter but
  the system harder to understand
- weaken public contracts
- drop rare UI behavior
- reduce audio data, render quality, or visual fidelity
- trade runtime performance for fewer source lines

### Goal Two working loop

For each minimization slice:

1. name the duplicated concept or unnecessary layer
2. record the protected behavior and affected parity rows
3. measure current code and dependency surface
4. implement the smallest consolidation
5. delete the superseded path immediately
6. run focused tests and browser checks
7. compare source size, public exports, deterministic output, and performance
8. keep the slice only if it is genuinely simpler

If a refactor adds more code and does not unlock a larger immediate deletion,
it belongs in Goal One or should not be performed.

### Goal Two validation gates

Goal Two is complete only when:

- the strict net-negative code metrics pass
- no package, public export, adapter, or dependency was added without a larger
  and documented simplification
- all Goal One static, build, package, deterministic, browser, soak, and
  production gates pass
- all parity statuses are preserved or improved with evidence
- representative deterministic frames remain equivalent
- Signal Cathedral remains editable, portable, playable, and renderable
- interaction and playback performance remain within the accepted baseline
- no resource-lifecycle regression appears
- a final architecture review can explain the system with fewer concepts than
  at the start

## Assumptions And Decision Gates

### Assumptions supported by current evidence

- the major V2 architecture direction is correct; the current debt is
  concentration and transition debt, not a reason to replace the canonical
  project/session/runtime model
- the preserved editor is worth protecting as product behavior
- Signal Cathedral is demanding enough to serve as one regression fixture,
  though it does not cover the full editor parity matrix
- the packages are still private `0.0.1` workspace packages, so internal
  cleanup may change undeclared internals while deliberate consumer entrypoints
  remain validated
- source line count is useful as a Goal Two constraint when paired with
  behavior, type, performance, and architecture gates

### Decisions requiring explicit confirmation or evidence

- adding Playwright for checked real-browser acceptance
- creating a neutral project-bundle package instead of injecting bundle I/O at
  an application composition root
- choosing a binary/compressed audio-artifact container and compatibility
  policy
- changing any declared external/public package API
- accepting any deterministic output identity change beyond serialization or
  execution-metadata changes
- moving broad root `src` terrain into `apps/viz-studio` purely for layout

The recommended posture for the last item is conservative: do not create a
massive file-move diff unless the ownership audit proves it removes real
cross-boundary coupling. Folder aesthetics alone are not worth the risk.

## Recommended Autonomous Goal Text

When Goal One is activated, use:

> Complete and certify VizEngine V2 Goal One from
> `docs/plans/v2/core-consolidation-and-minimization-program.md`: freeze the
> current behavior, repair and streamline the quality gate, automate critical
> preserved-editor browser acceptance, correct package dependency direction,
> reduce the app-local session module to clean composition, make canonical
> graphs the direct node-authoring model, finish portable browser asset
> ownership, harden renderer resource reconciliation, centralize artifact and
> execution identity, clean the CLI/devtools boundary, purge obsolete
> adapters/configuration/docs, and validate full UI/UX, node graph,
> determinism, performance, portability, and Signal Cathedral behavior without
> feature loss or product redesign. Continue autonomously through coherent
> milestones until every Goal One acceptance gate is satisfied.

Goal Two should receive its own goal text only after Goal One records the fresh
baseline and an evidence-backed minimization target.

## Final Principle

This program is intentionally strict because VizEngine is about to become much
easier to extend.

The best time to remove accidental complexity is before new capabilities learn
to depend on it.

The desired outcome is not merely clean-looking code. It is a codebase where:

- one concept has one owner
- one operation has one canonical path
- host-specific behavior is visibly attached
- the editor and agent share the same truth
- regression proof is executable
- new creative capability can be added without reopening old architecture
  questions
- the smallest implementation is also the most obvious implementation
