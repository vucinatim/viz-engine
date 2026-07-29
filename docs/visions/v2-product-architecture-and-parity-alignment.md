# V2 Product, Architecture, And Parity Alignment

## Status

This is an active alignment record for VizEngine V2.

It captures:

- the product outcome we are trying to achieve
- the architectural paradigm that best supports that outcome
- the existing documented decisions that should remain
- the decisions that need to become sharper before the rewrite hardens
- the UI, UX, capability, and performance parity contract for the preserved
  editor
- the assumptions behind this assessment

Open assumptions and unresolved decisions are named explicitly rather than
being treated as settled architecture.

## One-Sentence Product Direction

VizEngine should become the canonical system for creating music-driven visual
scenes:

- equally operable by humans and agents
- enjoyable and responsive during live authoring
- deterministic and reproducible during production rendering
- portable outside the editor
- independently valuable as an open-core product
- cleanly consumable by Magnify

VizEngine is not merely:

- a visual editor
- a Remotion component library
- a browser animation toy
- an AI wrapper around creative coding

It is a visual scene language, execution engine, authoring environment, and
rendering system.

## Core Product Principle

V2 replaces the V1 brain without replacing its product-quality face.

The rewrite should be:

- aggressive about scene, state, runtime, action, bake, and render ownership
- conservative about discarding proven product workflows

The visible editor remains a core product asset.

The hidden V1 ownership model is replaceable.

## UI, UX, Capability, And Performance Parity Contract

Parity with the established V1 editor experience is the minimum acceptable
product floor for V2.

Parity does not mean only:

- similar colors
- a familiar panel arrangement
- a screenshot that resembles the old editor

Parity means the preserved editor continues to work and feel like the
established product.

That includes:

- smooth interaction
- fast response to edits
- stable live playback
- responsive transport controls
- low-friction audio loading and playback
- intuitive layer authoring
- complete parameter editing
- complete node-graph authoring and execution
- predictable undo and redo
- practical save, load, import, and export
- useful debugging and profiling surfaces
- the dense, organized, serious-tool character of the existing editor

V2 should not silently lose established capabilities during architectural
replacement.

The default rule is:

- preserve an existing capability
- replace its implementation underneath
- validate that the real user workflow still works
- only remove or materially redesign it through an explicit product decision

Additions and deliberate improvements are welcome.

Accidental simplification is not.

### Parity Baseline Must Be Pinned

Before long-range autonomous implementation proceeds, the exact parity
baseline should be recorded.

The user described the reference as the previous editor on `master`.

The repository currently uses `main`, and this V2 branch also contains several
pre-rewrite editor improvements after the current `main` merge base.

Therefore, the parity program must explicitly decide whether the baseline is:

1. the current `main` commit
2. the final pre-V2 editor state on this branch
3. a curated reference combining both

Until that is pinned, this document assumes:

- the strongest proven pre-V2 editor experience is the intended reference
- later accepted V1 UX improvements should not be discarded merely because
  they are not present on the current `main` head

### Parity Must Be Measured

The parity requirement should become an executable matrix rather than a vague
promise.

For each established workflow, record:

- reference behavior
- expected V2 behavior
- visual acceptance evidence
- interaction acceptance evidence
- performance acceptance evidence
- automated coverage where practical
- manual or browser verification where automation is insufficient

The matrix should cover at least:

- editor shell and panel layout
- layer creation, deletion, duplication, ordering, visibility, and expansion
- component selection and configuration
- nested and dynamic parameter controls
- presets
- node-graph creation and editing
- node connections, values, presets, temporal behavior, and output binding
- audio file loading
- bundled-track loading
- captured/live audio where supported
- waveform navigation
- play, pause, seek, loop, and track navigation
- preview rendering
- layer blending and opacity
- debug overlays
- profiler behavior
- image export
- video export
- project save, load, reset, drag-and-drop import, and sample projects
- history and undo/redo across layer and node contexts
- keyboard shortcuts and other established high-value interactions

### Performance Parity

Architectural correctness is not enough if the editor becomes slower.

The V2 editor should preserve the existing selective-update performance model:

- narrow subscriptions
- no whole-editor rerender at frame cadence
- imperative preview and audio sampling
- stable interaction latency while playback is active
- controlled renderer and attachment lifecycle
- no unnecessary component recreation on routine edits

Performance acceptance should include:

- playback smoothness under representative scenes
- parameter-drag responsiveness
- node-editor responsiveness
- layer-list responsiveness
- seek latency
- preview recovery after edits
- memory behavior during longer sessions
- absence of progressive listener, canvas, renderer, or object leaks

## Architectural Mental Model

The desired architecture can be understood as the following mapping.

| Concept | Responsibility |
| --- | --- |
| `VizProjectDocument` | Durable and portable scene description |
| `VizSession` | Mutable working environment for editing and preview |
| Project actions | Stable language for changing scene content |
| Session commands | Live operational control that does not change scene content |
| Runtime | Deterministic evaluator of scene meaning |
| Bake system | Precomputation stage for expensive reusable work |
| Render plan | Evaluated frame representation passed toward rendering |
| Renderer backends | Concrete drawing implementations |
| Scene compositor | Owner of final layer combination semantics |
| Editor | Professional human cockpit over the session |
| Agent and tools | Machine clients of the same session contracts |
| Remotion | Production render host |
| Viz Cloud | Optional hosted storage, collaboration, jobs, and operations |
| Magnify | Workflow consumer of versioned Viz scenes and artifacts |

The clean relationship is:

```text
Human editor ─┐
Agent/tools ───┼──> VizSession ──> runtime evaluation ──> compositor/renderers
Programmatic ──┘
```

The editor and agent are peers over the same underlying system.

They have different interaction surfaces, but they must not have different
scene semantics.

## Durable Scene Truth And Live Session Truth

Two different forms of truth must be distinguished clearly.

### Durable scene truth

`VizProjectDocument` is the canonical portable description of:

- layers
- components
- configuration
- graphs
- assets
- baked artifact references
- timeline and viewport

### Live session truth

`VizSession` is the canonical in-memory owner of:

- working project
- graph working state
- preview transport
- audio session
- history
- runtime inspection
- derived preview state

These are not competing sources of truth.

The project document is the durable scene program.

The session is the live working environment containing and operating that
program.

## Decisions That Should Remain

The following documented decisions are strong and should remain unless new
evidence materially changes them.

### Product and editor

- Viz remains its own product.
- The real V1 editor experience is the UX reference.
- React hosts the editor but does not define scene semantics.
- The editor edits and inspects; the runtime evaluates.
- The agent operates stable contracts rather than imitating UI interaction.

### Scene and runtime

- one canonical versioned project format
- frame-based authoritative render time
- fixed-step deterministic temporal behavior
- explicit seeded randomness
- explicit runtime state and checkpoints
- embedded graphs as scene content
- explicit component and node metadata
- live, render, and bake as first-class modes

### Rendering

- Viz owns scene and compositor semantics.
- Three/WebGL is the first serious baseline backend.
- SVG remains useful for deterministic proof and debugging.
- Canvas 2D may remain a deliberate secondary path.
- broader backend support is capability-driven rather than falsely universal
- Remotion is an adapter host, not the runtime architecture.
- FFmpeg owns encoding and muxing rather than scene semantics.

### Assets and baking

- scene documents store stable references
- resolvers turn references into runtime inputs
- storage backends remain environment-specific
- the runtime consumes resolved inputs
- expensive reusable work becomes explicit baked artifacts
- baked artifacts are typed, versioned, and inspectable

### Local, cloud, and Magnify

- local OSS usage is a first-class mode
- local, cloud, and bundles share one scene contract
- import and export are first-class product surfaces
- Viz Cloud is optional and additive
- Magnify integrates through APIs, identifiers, versions, and artifacts
- Magnify does not read Viz databases or own Viz scene semantics
- Viz owns Viz-specific render and bake jobs
- published versions are the default stable integration target

### Rewrite posture

- no long-lived legacy compatibility architecture by default
- temporary bridges must be explicit and short-lived
- superseded ownership should be deleted after cutover
- architectural replacement must not cause accidental UX or feature loss

## Architectural Clarifications To Make Explicit

### 1. Published Execution Identity

A project document by itself is not sufficient for reproducible rendering.

A published scene also depends on:

- runtime contract version
- component implementation versions
- node implementation versions
- renderer implementation version
- exact assets
- exact baked artifacts

The preferred direction is a small published execution manifest containing:

- project document identity
- runtime version
- component and node registry lock
- package versions or implementation hashes
- asset content identities
- baked artifact content identities
- renderer profile where required

This should remain separate from ordinary per-layer configuration.

The purpose is to ensure that a stable project version does not silently change
meaning after capability implementations evolve.

### 2. Operation Categories

The broad action concept should be divided into three semantic categories.

#### Project actions

Pure, durable, undoable changes to scene content.

Examples:

- add layer
- remove layer
- set layer input
- change configuration
- add graph node
- connect graph nodes

#### Session commands

Live operational controls that do not change portable scene content.

Examples:

- play
- pause
- seek
- attach local audio input
- open a graph
- inspect preview state

#### Job requests

Operations with asynchronous lifecycle and artifact output.

Examples:

- bake
- render
- publish
- export

These categories may share envelope, actor, authorization, and result
conventions.

They should not be treated as having identical undo, persistence, retry, or
execution semantics.

### 3. VizSession Must Not Become A God Object

One canonical session owner is the correct public architecture.

It does not require:

- one enormous implementation file
- one inseparable state blob
- one module that imports every editor and browser subsystem

The preferred shape is:

- one public `VizSession` facade
- one transaction and command boundary
- one read and subscription surface
- internally separated project, graph, transport, audio, history, and runtime
  preview modules

UI state and browser attachment state remain outside.

The existing `VizRuntimeSession` name should also be reconsidered once the
public `VizSession` shape stabilizes.

Possible clearer names include:

- `VizRuntimeInstance`
- `VizEvaluationSession`

### 4. Determinism Levels

The system should distinguish several useful guarantees.

#### Semantic determinism

Pinned inputs and implementations produce the same frame plan and state
transitions.

#### Temporal determinism

Checkpoint restore plus replay produces the same state as sequential stepping.

#### Backend determinism

A pinned renderer environment produces repeatable pixels.

#### Cross-platform visual equivalence

Different supported environments remain visually equivalent within defined
tolerances.

The first two should be strict guarantees.

Exact cross-driver WebGL pixel identity should not be promised without
evidence.

Production render environments can still be pinned strongly enough for
reproducible outputs.

### 5. Custom Code And Portable Bundle Security

Agent-authored component code is compatible with safe portable projects only
if the extension boundary is explicit.

Preferred posture:

- portable project bundles are data-only by default
- components and nodes reference versioned capability packages
- trusted local development may load source packages with HMR
- cloud rendering loads only approved, pinned, signed, sandboxed, or explicitly
  trusted capability packages
- importing a scene bundle never silently executes arbitrary code

This preserves:

- live code authoring
- safe project portability
- reproducible cloud rendering

without confusing project data with executable capability distribution.

### 6. Portable And Backend-Native Components

The shared render-node representation is valuable for portable components.

It should not become a fake universal abstraction that makes advanced shaders,
particles, feedback systems, or real 3D scenes awkward.

The preferred model is:

#### Portable component

Emits shared render nodes or another backend-neutral representation.

#### Backend-native component

Declares a required renderer capability and executes through that backend.

Both converge on the compositor-owned layer output contract.

This preserves portability where it is real and renderer-native power where it
is necessary.

### 7. Content Identity For Assets And Baked Artifacts

Stable ids should be paired with content identity for published execution.

A baked artifact derivation identity should include:

- source content hash
- bake algorithm and version
- bake parameters
- timeline and frame configuration where relevant

This enables:

- reproducibility
- safe caching
- deduplication
- debugging
- reliable invalidation

Mutable external URLs should generally be materialized or content-pinned before
stable publication.

### 8. Transactional Agent Mutation

The machine-facing mutation surface should eventually support:

- atomic action batches
- base-revision preconditions
- idempotency keys
- validation before commit
- dry-run or proposal mode
- structured diffs and results
- rollback or candidate snapshots

One primary working head remains a good initial product decision.

Agents still need a safe way to explore variants without repeatedly
destabilizing the user's active scene.

This does not require full branching as an early feature.

### 9. Rendering Environment Proof

Three/WebGL in headless Chromium without dedicated GPU infrastructure must be
validated empirically.

Representative scenes should be benchmarked for:

- frame throughput
- software WebGL compatibility
- memory use
- worker concurrency
- preview and render parity
- driver-specific behavior

If heavy scenes later require GPU workers, the runtime, project, artifact, and
job contracts should remain unchanged.

### 10. Execution Sequence Discipline

The near-term sequence should remain:

1. canonical `VizSession`
2. runtime-driven preserved editor
3. complete component and node authoring path
4. UI, UX, capability, and performance parity
5. deterministic preview and render parity
6. agent-operated local creative loop
7. package-first Magnify proof
8. hosted Viz Cloud capabilities
9. specialized runner sophistication

Cloud, SSO, collaboration, and runner work must not distract from completing
the local product/runtime baseline.

## Quality And Validation Doctrine

Every meaningful V2 slice should prove all relevant layers.

### Contract validation

- project schema remains valid
- action and command inputs are validated
- assets and artifacts resolve explicitly
- compatibility problems are reported structurally

### Runtime validation

- deterministic frame/state tests
- temporal replay and checkpoint tests
- render-plan golden tests
- component and graph semantic tests

### Renderer validation

- compositor semantic tests
- visual fixture comparison where appropriate
- preview-versus-render parity checks
- representative performance measurements

### Editor validation

- real browser workflow verification
- parity-matrix updates
- no accidental UI drift
- no capability regression
- no interaction or subscription performance regression

### Agent validation

- inspect real state
- apply real transactional mutations
- observe the real editor update
- inspect runtime output
- produce and verify artifacts through canonical paths

Passing typecheck and unit tests alone is not sufficient evidence of product
parity.

## Assumptions Behind This Alignment

This assessment currently assumes:

1. The immediate priority is the local editor/runtime rewrite, not launching
   Viz Cloud.
2. The visible pre-V2 editor remains the UX baseline unless a deliberately
   better replacement is approved.
3. Agent-authored component code is a core product capability.
4. Magnify integration should first be proven through local package and
   artifact consumption.
5. Reproducible final output matters more than promising bit-identical pixels
   across every possible GPU.
6. The open-source core includes a genuinely useful editor, runtime, bake
   system, and local render path.
7. Preview and final render share scene semantics even where execution
   optimizations differ.
8. Third-party or separately versioned component and node packages are a
   plausible future capability.
9. The strongest accepted pre-V2 editor state, not merely a convenient
   screenshot or incomplete branch reference, is the intended parity target.

If these assumptions change, affected architecture should be reviewed
explicitly.

## Alignment Summary

The direction is strong and coherent.

The product we want is:

- document-driven
- session-operated
- runtime-first
- deterministic
- live-capable
- composited explicitly
- agent-native
- locally trustworthy
- cloud-extensible
- Magnify-compatible
- faithful to the established editor experience

The immediate architecture task is to compress the vision into a few strong
executable boundaries:

- canonical published execution identity
- clear project-action, session-command, and job-request categories
- a small modular `VizSession`
- explicit extension security
- content-addressed assets and bake derivations
- measurable UI, UX, feature, and performance parity

The rewrite is successful only when the cleaner architecture produces a
product that is at least as capable, responsive, intuitive, and enjoyable as
the established editor—and provides a stronger foundation for everything that
comes next.
