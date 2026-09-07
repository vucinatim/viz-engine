# VizEngine Compounding Vision

Status: canonical product north star.

Last reconciled: 2026-08-13.

This document consolidates the durable product, creative, architecture, agent,
quality, and ecosystem direction that accumulated across VizEngine's vision
documents, specifications, implementation plans, production evidence, and
human calibration.

It defines what VizEngine is trying to become and the invariants that should
survive individual implementation goals. It is not a current-state report, an
implementation plan, or a replacement for detailed technical specifications.

When a completed plan, historical note, or chat memory conflicts with this
document, use this document for product direction and raise the conflict
explicitly.

## The North Star

VizEngine is an open-core, web-native visual creation system centered on
music-driven scenes.

It combines:

- the immediacy of a live visual instrument
- the structure of a professional layer-and-node editor
- the extensibility of creative coding
- the reproducibility of a deterministic production runtime
- the leverage of an agent-native authoring system

A human or agent should be able to construct an expressive audio-reactive
scene from reusable visual and signal-processing capabilities, experience and
refine it immediately in a shared live editor, reproduce it deterministically
as final media, move it between environments as a portable project, and later
connect it to Viz Cloud and Magnify without changing its meaning.

VizEngine is not merely:

- a visual editor
- a Remotion component library
- a browser animation toy
- a collection of templates
- an AI wrapper around UI automation
- an internal Magnify subsystem

It is a visual scene language, execution engine, authoring environment,
capability-development platform, and production system.

## Product Identity

### Music-driven creation is the center

The product is organized around music and audio-reactive visual creation:

- live listening and visual feedback
- audio feature analysis
- graph-shaped musical intent
- layered composition
- time-based direction and transitions
- deterministic final video with audio

The runtime may naturally support non-audio scenes, but general-purpose scene
authoring should not dilute the product's identity or make the music workflow
secondary.

### The editor is a professional creative cockpit

The editor is not disposable scaffolding around the runtime. It is a core
product surface where creators can:

- see the composition, layer structure, modulation logic, waveform, and
  transport together
- play, pause, seek, loop, and inspect without losing creative flow
- change values continuously and see the exact visual result immediately
- combine direct parameter control with graph-driven behavior
- debug, profile, save, reopen, import, export, and refine serious projects
- understand and override work produced by an agent

The interface should remain dense, organized, responsive, and intuitive. V2
replaces the V1 brain without replacing its product-quality face.

### The agent is a first-class creator over the same system

The agent should not need to click through the editor to create.

It should be able to:

- inspect components, nodes, schemas, assets, artifacts, graphs, runtime
  values, issues, and execution identity
- create and mutate projects through revision-safe transactions
- control live sessions through explicit commands
- request bake and render jobs
- inspect stills, contact sheets, clips, media probes, and diagnostics
- compare, checkpoint, recover, and refine
- author a reusable capability when the existing vocabulary is insufficient

The human and agent may share one live session. Agent changes should appear in
the same editor and history the human is watching, without pointer synthesis,
focus theft, or a shadow project model.

Fully headless creation must produce the same canonical editable project.

### VizEngine remains an independent open-core product

The useful core includes the project language, runtime, editor, bake system,
local rendering, and portable project workflow. Local use must not require a
hosted backend.

Viz Cloud may later add accounts, workspaces, storage, versions,
collaboration, hosted jobs, agent execution, and product operations.

Magnify consumes Viz projects, versions, artifacts, previews, and render APIs.
It does not own Viz scene semantics or read Viz databases directly.

## The Compounding System

The strongest ideas in VizEngine reinforce one another. Every new capability
should strengthen this shared system instead of opening a parallel path.

### Portable truth compounds into every environment

One versioned `VizProjectDocument` enables:

- editor persistence
- headless authoring
- portable bundles
- deterministic rendering
- stable publication
- cloud storage
- Magnify consumption

The same scene should not need to be translated into an editor format, agent
format, render format, and integration format.

### One live authority compounds human-agent collaboration

One canonical `VizSession` lets the editor, agent, CLI, and programmatic hosts
operate the same working project, revision, history, transport, audio session,
and runtime inspection state.

This eliminates reconciliation between private clients and makes live
co-creation a property of the architecture rather than a UI trick.

### Typed contracts compound tooling

Typed metadata and operations power multiple surfaces at once:

- editor controls
- validation
- agent discovery
- CLI and future MCP tools
- dry runs and semantic diffs
- history and attribution
- compatibility checks
- documentation and examples

A new component or node should become understandable to both humans and agents
without bespoke integration in every client.

### Determinism compounds production confidence

Explicit time, seeded variation, replayable temporal state, resolved inputs,
and pinned implementation identity enable:

- direct seeking
- preview/render parity
- checkpoint replay
- repeatable QA
- distributed jobs
- reproducible published versions
- confident debugging of exact frames

Determinism does not make visuals static. It makes complex motion explainable
and repeatable.

### Baking compounds responsiveness and scale

Expensive audio analysis, simulation work, preparation, and reusable
performance data should become explicit artifacts when appropriate.

Baking allows live authoring to stay responsive and final rendering to stay
deterministic without forcing every expensive operation into every frame.

### Real productions compound the creative language

Flagship productions are architectural dogfood, not isolated demos.

Each ambitious production should expose missing reusable capabilities,
inspection gaps, performance costs, weak semantics, or awkward authoring
flows. Fixes should improve the shared engine, tools, or capability library so
the next production becomes easier and more expressive.

Production-specific composition remains in the project. Reusable visual
behavior belongs in capability packs. Only scene-independent infrastructure
belongs in engine core.

## Canonical System Model

```text
human editor ─────┐
agent and tools ──┼──> VizSession ──> deterministic runtime
programmatic host ┘          │                │
                              │                ├──> live preview
                              │                ├──> inspection
                              │                ├──> still/video jobs
                              │                └──> render adapters
                              │
                              └──> VizProjectDocument + explicit refs
```

### Durable scene truth

`VizProjectDocument` is the portable scene program. It owns durable,
serializable meaning such as:

- timeline and viewport
- ordered layers and compositor settings
- component identity and settings
- graphs, bindings, and outputs
- asset references
- baked artifact references
- project metadata

It does not contain UI state, GPU resources, runtime caches, browser URLs,
editor selections, or executable capability source.

### Live session truth

`VizSession` is the canonical mutable authority over one working document plus
operational session state. It owns:

- working project and revision
- transactions, history, and continuous gestures
- preview transport and audio-session state
- resolved assets and artifacts
- runtime inputs, checkpoints, and inspection

The document and session are not competing truths. The document is durable
scene meaning; the session is the live environment operating that meaning.

`VizSession` is one public authority, not one giant implementation module.
Project, graph, history, transport, audio, runtime, and attachment concerns
remain internally separable.

### Four operation classes

Do not collapse these into one vague action API:

1. Project transactions are atomic, durable, validated, attributable,
   revision-safe, dry-runnable, and undoable.
2. Session commands control live operational state such as play, pause, seek,
   and inspection without changing portable scene content.
3. Jobs perform asynchronous bake, preparation, derivation, render, encode,
   and publication work with progress, cancellation, identity, and results.
4. Inspection and events expose structured read-only state and changes.

### Deterministic runtime

The authoritative time coordinate is frame number with an explicit fixed
timestep.

The runtime consumes:

- the project document
- resolved assets and artifacts
- explicit mode and frame inputs
- explicit runtime state or checkpoints

Direct evaluation or checkpoint replay to frame `N` must match deterministic
sequential stepping to frame `N`.

Live, render, and bake may use different optimizations, but they may not assign
different meanings to the project, graph, component, or compositor.

Semantic and temporal determinism are strict goals. Exact cross-driver pixel
identity is not promised without a pinned renderer environment; supported
platforms should instead meet defined visual-equivalence tolerances.

## Creative Language

### Layers and compositor

Layers remain the primary visual composition model. The compositor owns final:

- ordering
- visibility and opacity
- transforms
- blend modes
- masks and clipping
- effect passes
- background and final output assembly

Individual components and renderers may not invent private final-composition
semantics.

### Components and capability packs

Components should expose small, typed, data-only authoring contracts with:

- stable identity and implementation version
- settings, defaults, presets, and inputs
- deterministic runtime behavior
- compatibility and performance metadata
- asset and artifact requirements
- renderer support

Executable behavior belongs in explicitly trusted capability packs. Portable
project bundles remain data-only and never silently execute arbitrary code.

Advanced shaders, particles, feedback systems, and 3D scenes may remain
backend-native. VizEngine should not weaken them through a fake universal
render abstraction.

### Graphs

Graphs are explicit project content and the primary way to shape musical and
temporal intent.

Nodes are classified as:

- pure
- temporal with explicit replayable state
- bake-oriented when expensive reusable computation is appropriate

Graph definitions are reusable capabilities; graph instances, connections,
and bindings are scene composition. Live values must remain inspectable without
turning React into the signal clock.

### Assets, derived assets, artifacts, and outputs

Keep these identities distinct:

1. Source assets are imported durable media or model inputs.
2. Derived managed assets are reusable displayable or runtime-friendly
   derivatives.
3. Baked artifacts are reusable computational support data.
4. Render outputs are preview or final media produced by jobs.

The runtime receives resolved inputs through environment-specific resolvers.
Local disk, portable bundles, Viz Cloud, and Magnify meet at that seam rather
than leaking storage semantics into project or runtime contracts.

Published execution identity should pin the project, runtime, capability pack,
component, node, renderer, asset, and artifact identities needed to reproduce
meaning.

### Native 3D models and performance

External 3D files and authored animation remain native VizEngine capabilities.
Procedural visuals expand the creative palette; they do not replace the visual
quality of model-backed DJs, dancers, crowds, or future characters.

The clean 3D layering is:

1. generic native model assets
2. renderer-owned model resources and instances
3. deterministic generic animation sampling
4. optional character and rig semantics
5. focused crowd, retargeting, facial, speech, and singing systems

A model is durable content. A model instance is scene configuration. A
character binding gives model data semantic roles. A performance is
time-varying input. These concepts must not collapse into one character-only
asset module or one universal 3D object.

## Realtime And Performance Doctrine

The live editor is part of the product contract.

The core rule is:

> React renders structure; the runtime drives frames.

React may own editor presentation such as selection, panels, focus, hover,
dialogs, and structural views. It must not become the frame clock, graph signal
bus, audio meter bus, or pointer-rate renderer input path.

Continuous interaction follows one semantic protocol:

```text
begin gesture
  -> capture canonical base and history context

publish transient value
  -> update control immediately
  -> update runtime input immediately
  -> show the result on the next available display frame

end gesture
  -> commit one validated project transaction
  -> create one history entry
  -> clear the transient value
```

The transient lane is explicit, inspectable, cancellable, and revision-bound.
It is never a second persisted project truth.

Performance strategy should favor:

- selective subscriptions
- imperative frame-rate presentation
- GPU-resident media and transforms
- shaders, batching, and instancing
- explicit renderer resource lifecycle
- minimal CPU pixel work and GPU readback
- baking and checkpoints for reused expensive work
- fixed-device empirical measurement on representative productions

Memoizing broad React trees, visibly throttling interaction, or lowering
creative quality are not acceptable substitutes for correct ownership.

## Product Parity And Quality Floor

The immutable pre-V2 product reference is
`e806fbc10980615588b52ff574bc923c6f00f35e`.

V1 architecture is disposable. Its proven product experience is not.

Preserve by default:

- recognizable shell, typography, control language, density, and panel layout
- layer and component workflows
- complete parameter authoring
- node graph authoring and live values
- waveform, audio, transport, and timeline posture
- project lifecycle, history, shortcuts, dialogs, and secondary tools
- diagnostics, profiler, Jobs, and Rhythm Lab
- still and video export
- Stage's model-backed characters, crowds, animation, and camera experience
- smooth playback, immediate editing, and long-session stability

Parity includes visual, interaction, functional, and performance dimensions.
An intentional parity regression or material product-identity change requires
explicit human approval and a recorded `approved-change`. Reversible improvements
inside the documented editor experience are delegated, with full parity proof.

The 42-row parity matrix is currently verified for its pinned reference and
certified Chromium/fixed-device evidence. That is a strong release floor, not
a universal claim about every browser, device, accessibility path, deployment,
or future flagship workload.

Types and unit tests do not certify product quality by themselves. Relevant
work must also use real browser workflows, deterministic outputs, diagnostics,
performance measurements, lifecycle checks, and independent visual judgment.

## Agentic Creative Quality

An agent-authored project is not finished merely because it validates,
renders, and avoids blank frames.

The loop is:

1. understand the brief, music, existing capabilities, and constraints
2. author through canonical contracts
3. inspect structure and evaluated runtime values
4. view representative stills, contact sheets, and motion
5. diagnose technical and aesthetic weaknesses
6. refine through reusable improvements
7. reopen the portable editable result
8. verify final media and project quality

Automated checks can detect blank, frozen, clipped, invalid, missing-resource,
unstable, silent, or nondeterministic results. They cannot fully define whether
a production is genuinely good.

The product owner's 2026-09-06 Human Signal decision establishes independent,
evidence-backed agent calibration for reversible local engine work. Gate 1
remains the exact human-approved treatment; Gates 2–5 require the
[delegated review contract](../parity/goal-five-delegated-review.md). This changes
review authority, not the creative quality bar or product identity.

## Product Forms And Boundaries

### Local and open core

Local authoring, baking, rendering, bundles, and capability development are
first-class. Cloud services may not become a hidden requirement for the core
product.

### Viz Cloud

Viz Cloud is an optional additive product layer for:

- accounts, workspaces, and memberships
- working-head persistence and stable versions
- assets, artifacts, and render outputs
- collaboration, reviews, and activity
- hosted bake, render, derivation, and agent jobs
- integration APIs

Provider choices remain replaceable strategy. Railway, R2, Postgres, Redis,
Inngest, Vite, or an auth provider must not leak into scene/runtime meaning.

### Magnify

Magnify owns workflow orchestration, approvals, publishing, scheduling, and
operational control. VizEngine owns visual scene meaning, audio-reactive logic,
baking semantics, and visual rendering.

The stable seam is versioned projects, execution identity, artifacts, preview
and render requests, and explicit APIs.

### Specialized agents

Future specialized runners may handle bounded scene generation, refinement,
timing, style exploration, performance optimization, or render QA.

The main agent coordinates and reviews. Runners remain scoped, inspectable
clients of the same Viz contracts and tools. They never gain private scene
truth or mutation powers.

## Sequencing Doctrine

Product growth should follow evidence, not optionality for its own sake.

The current foundation is strong: the canonical project/session/runtime path,
editor parity, deterministic rendering, agent control loop, real 3D Stage, two
certified productions, and exact Light Tunnel performance are proven.

The next strategic proof should be a substantially more ambitious flagship
dogfood production: longer, multi-act, multi-layer, multi-component, and
multi-graph. It should exercise the broad creative spectrum and leave behind
reusable engine capabilities, authoring tools, and quality feedback rather
than production-only exceptions.

Likely later directions include:

- generic `Model3D` product authoring and deterministic model preparation
- masks, compositor passes, and effect graphs
- broader reusable component and node libraries
- explicit phase authoring and denser temporal artifacts
- character retargeting, root motion, facial, speech, and singing semantics
- archive-grade bundle exchange and large-media policies
- broader browser, device, accessibility, and deployed performance proof
- native or GPU render executors when real deployment measurements require
  them
- Viz Cloud, Magnify integration, and specialized runners over the proven core

Their order remains a strategy decision informed by flagship-production
friction and real user priorities.

## Autonomous Decision Filter

Before introducing a meaningful capability or abstraction, ask:

1. Does it strengthen the shared scene language or production loop?
2. Does it preserve one project, session, runtime, and compositor meaning?
3. Will humans, agents, preview, and render use the same contract?
4. Is it reusable across at least two plausible productions or a clearly
   stable domain boundary?
5. Does it preserve or improve V1-level UX, responsiveness, and capability?
6. Can its correctness, performance, and product behavior be validated?
7. Does it remove more conceptual complexity than it adds?
8. Is this the smallest clean abstraction justified by current evidence?

If the answer is unclear, keep the idea in strategy or suggestions rather than
hardening it into engine core.

Autonomous work must stop for explicit human direction when it would:

- change this product vision
- materially change the editor product identity or weaken its experience
- accept a known quality, capability, or performance regression
- expand cloud, licensing, publication, or external-system authority
- intentionally reduce quality or performance to make a tradeoff

## Rejected Interpretations

This vision explicitly rejects:

- simplifying the editor into a thin inspector
- replacing asset-backed characters with procedural substitutes by default
- using React or Zustand as hidden runtime truth
- making browser automation the primary agent interface
- making Remotion, FFmpeg, Chromium, or a cloud provider the architecture
- inventing agent-only mutations, renderers, documents, or shortcuts
- embedding arbitrary executable code in portable project bundles
- promising universal renderer portability through a lowest-common-denominator
  abstraction
- building speculative cloud, plugin, or runner frameworks before the local
  creative need is proven
- preserving obsolete V1 ownership through permanent compatibility layers
- optimizing by degrading visible quality or live interaction
- treating one successful demo as broad product proof

## Explicit Assumptions

This synthesis currently assumes:

1. Music-reactive visual creation remains the product center of gravity.
2. The pinned V1 parity matrix remains the minimum preserved-product floor.
3. The V1 product floor is preserved. Reversible UX improvements inside that
   floor are delegated; material product-identity changes or intentional
   regressions require explicit human approval.
4. External model assets and authored animation remain legally and practically
   usable as first-class creative inputs.
5. Trusted local capability source is acceptable while portable bundles remain
   data-only.
6. Three/WebGL remains the primary near-term production renderer, without
   becoming a permanent only-renderer promise.
7. Semantic and temporal determinism matter more than cross-device pixel
   identity.
8. One editor/session owner is sufficient until real collaboration requires an
   external session host.
9. The current browser-backed video executor is acceptable behind the render
   job contract until deployment evidence requires another executor.
10. Independent evidence-backed creative calibration is mandatory. The
    2026-09-06 delegation assigns reversible engine-horizon judgment to agents;
    only the documented human boundary requires a new product-owner decision.
11. Cloud and provider choices may change without changing project, runtime,
    asset, artifact, or job semantics.
12. The current agent loop is real and useful, but not yet the effortless
    final experience of describing an ambitious production and watching it
    emerge live.

Changes to these assumptions require an explicit review of the affected
product or architecture boundary.

## Open Product Decisions

The following are intentionally not settled by this north star:

- exact open-core licensing and premium capability boundaries
- exact cloud, auth, collaboration, billing, and runner implementation
- exact cross-platform visual-equivalence tolerances
- exact trusted capability-package distribution and signing model
- when multi-user collaboration justifies an external session authority
- which flagship friction should prioritize `Model3D`, effects, temporal
  systems, or another capability family first
- when native or GPU rendering becomes operationally necessary
- the final vocabulary for rig, facial, speech, and singing performance

These decisions should be made from real product evidence, not silently
inferred by an implementation goal.

## Source And Authority Map

This synthesis preserves durable direction from:

- [VizEngine V2 Vision](./viz-engine-v2-vision.md)
- [V2 Product, Architecture, And Parity Alignment](./v2-product-architecture-and-parity-alignment.md)
- [Agent-Operated Live Editor Vision](./agent-operated-live-editor-vision.md)
- [Multi-Renderer And Backend Capability Vision](./multi-renderer-and-backend-capability-vision.md)
- [Rendering Performance And Deployment Strategy](./rendering-performance-and-deployment-strategy.md)
- [Viz Cloud And Integration Vision](./viz-cloud-and-integration-vision.md)
- [Specialized AI Runner Vision](./specialized-ai-runner-vision.md)
- [Working Agreements](../working-agreements.md)
- [Agent-Authored Production Loop Architecture](../specs/v2/agent-authored-production-loop-architecture.md)
- [Native 3D Model, Character, And Performance System](../specs/v2/native-3d-model-character-and-performance-system.md)
- [V1/V2 Product Parity](../parity/README.md)

Those documents remain valuable detailed rationale and specifications. This
document is the canonical product north star that connects them.
