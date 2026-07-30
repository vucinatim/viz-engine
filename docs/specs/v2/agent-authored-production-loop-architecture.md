# Agent-Authored Production Loop Architecture

## Status

This is the canonical architecture and execution-direction document for the
first complete agent-authored VizEngine production loop.

It refines the existing V2 vision, session, runtime, editor-control, bake,
render, asset, and parity documents into one implementable system boundary.

It does not replace the product or parity vision. It defines how the engine,
editor, reusable visual capabilities, agent tooling, and production feedback
loop should fit together to realize that vision.

## Product Proof

The first serious proof is not merely that an agent can edit a project JSON
file or make a demo frame.

The proof is that an agent can:

1. start from a track and a creative brief
2. inspect available engine capabilities
3. analyze the music into reusable deterministic artifacts
4. author a new visual capability when the catalog is insufficient
5. compose a complete scene through canonical project operations
6. preview and revise it against truthful runtime feedback
7. render a polished short music-reactive video
8. validate the produced media and runtime behavior
9. deliver an editable, portable project that opens in the full editor
10. leave behind reusable capabilities instead of project-specific engine
    hacks

The human must be able to open the editor during this process, see the same
scene the agent is operating, make edits, steer the work, and retain the
established V1-quality editor experience.

The final proof therefore has two equally important outputs:

- a high-quality playable video
- a canonical editable project with reproducible assets, artifacts, and
  execution identity

## Core Decision

Agent tooling operates VizEngine. It does not become part of VizEngine and
does not reimplement VizEngine semantics.

The engine exposes stable contracts for:

- project transactions
- runtime and session commands
- asynchronous jobs
- inspection and events

The editor, CLI, local agent bridge, tests, future MCP tools, and future hosted
systems are clients of those same contracts.

The agent should not normally operate the editor by synthesizing mouse and
keyboard events. Browser automation remains valuable for visual and interaction
verification, but it is not the authoring architecture.

## The Five Layers

| Layer              | Owns                                                                                                                 | Must not own                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Engine core        | Portable contracts, canonical actions, session semantics, deterministic runtime, bake contracts, renderer interfaces | UI presentation, agent strategy, filesystem assumptions, product-specific visual catalogs |
| Capability packs   | Reusable components, nodes, presets, shaders, renderer extensions, authoring metadata                                | Project composition, session ownership, transport protocols                               |
| Project            | Scene composition, layers, graphs, timing, settings, asset references, artifact references                           | Executable code, browser objects, renderer resources                                      |
| Hosts and adapters | Editor UI, browser audio, filesystem access, WebGL attachment, FFmpeg, Remotion, persistence transports              | Canonical scene meaning, duplicate project mutation rules                                 |
| Agent tooling      | Inspection, orchestration, transactions, capability scaffolding, bake/render requests, feedback analysis             | A second runtime, a second project model, hidden UI-only mutations                        |

The dependency direction should remain simple:

```text
agent tools ─┐
editor UI ───┼──> control contracts ──> one VizSession ──> runtime
CLI/tests ───┘                              │
                                           ├──> bake services
                                           └──> render services

capability packs ──> registries injected into runtime/render hosts
project document ──> data consumed by the session and runtime
```

Hosts compose capabilities and adapters. The engine core knows interfaces and
portable data, not concrete UI, transport, or product catalog implementations.

## Headless Agent With An Optional Live Editor

### The Model

This is possible and is the recommended product model.

“Headless agent” means the agent uses typed VizEngine operations instead of
driving UI controls. It does **not** require the canonical session to live in a
background daemon.

When the editor is open, the editor and agent must operate one session
instance. The editor subscribes to that session and renders its state. Agent
transactions appear live because they are applied to the same source of truth,
not because two stores copy JSON between each other.

This makes the editor a visible collaborative client, rather than the only
place where authoring semantics exist.

### Topology A: Live Collaborative Session

This is the recommended first topology.

```text
                         ┌── editor UI subscriptions
agent ── local bridge ──>│
                         │  one in-process VizSession
human editor actions ───>│
                         └── runtime preview / jobs / inspection
```

The studio/browser host owns the active `VizSession`.

- editor controls call the canonical control interface
- the editor subscribes to session state and events
- a thin local typed transport routes agent calls to that same session
- mutations carry actor and revision information
- the user sees agent edits, playback changes, graph changes, and job progress
  live
- browser automation verifies appearance, responsiveness, and interaction
  quality when required

The bridge is a transport only. It does not own or mirror project state.

This topology gives the desired “watch the agent work” experience with the
least architectural machinery and no distributed-state problem.

### Topology B: Fully Headless Session

The same session and service interfaces must also be constructible without the
editor:

```text
agent / CLI ── direct control ──> VizSession
                                      ├── bake host
                                      ├── render host
                                      └── project/bundle persistence
```

This mode is appropriate for:

- unattended production
- deterministic tests
- CI validation
- batch rendering
- project generation before the editor is opened

The result is a canonical project or portable bundle. The editor can later
open it without conversion.

Headless does not promise that every renderer is pure Node code. A headless
host may launch a browser/WebGL worker behind the renderer interface. What
matters is that the workflow does not depend on UI manipulation or UI-owned
scene meaning.

### Topology C: External Session Host

A later system may place `VizSession` in a local daemon or hosted service, with
both editor and agent connected as clients.

That is useful only when requirements such as these become real:

- several processes must share one live session
- remote collaboration is required
- cloud workers need durable session coordination
- sessions must outlive any editor process

It should not be the first implementation. A daemon introduces session
discovery, authentication, reconnect behavior, distributed event ordering,
latency, conflict policy, lifecycle management, and failure recovery.

The contracts should permit this future topology, but V2 should not pay its
complexity before it is needed.

### Session Host And Control Boundary

The minimal abstraction is:

```ts
interface VizSessionHost {
  session: VizSession;
  control: VizControl;
  services: VizSessionServices;
  dispose(): Promise<void>;
}
```

`VizControl` operates an injected session and services. It must not construct a
hidden second session.

Transports adapt that interface:

- direct in-process calls for tests and headless CLI workflows
- a local studio bridge for the live collaborative workflow
- future MCP, process, or network transports

No transport owns canonical state.

### Concurrency And Human Trust

Every durable mutation should support:

- a base project revision
- actor identity (`human`, `agent`, or `system`)
- an atomic transaction boundary
- a structured applied diff
- a structured conflict or validation result
- optional idempotency for retried tool calls

Human and agent edits therefore share history and can be attributed, inspected,
undone, or rejected predictably.

The editor should visually communicate agent activity without inventing a
separate agent state model. Useful presentation includes:

- current actor and operation
- proposed or applied diff
- validation issues
- job progress
- rendered feedback artifacts

Agent edits should be visible, but they should not steal focus, move panels, or
simulate pointer activity.

### Failure Modes To Avoid

Do not build:

- one session in the agent and another in the editor with file polling between
  them
- a UI event protocol disguised as an agent API
- a bridge with private mutation semantics
- a network daemon before the single-process session boundary is clean
- agent-only project mutations that bypass history or validation
- editor-only project fields that the headless runtime cannot represent

The dangerous idea is not headless authoring. The dangerous idea is dual truth.

## Canonical Operation Model

Project mutation, ephemeral control, and long-running work have different
semantics and must remain distinct.

### Project Transactions

Project transactions change durable canonical project state.

Examples:

- add, remove, reorder, or update a layer
- update component settings
- create or connect graph nodes
- assign an asset
- attach a completed bake artifact
- change project render settings

Preferred envelope:

```ts
type VizProjectTransaction = {
  id: string;
  baseRevision: number;
  actor: VizActor;
  actions: VizProjectAction[];
  idempotencyKey?: string;
  mode?: "apply" | "dry-run";
};
```

The result should include:

- accepted revision
- normalized actions
- structured diff
- validation warnings and errors
- conflict information when the base revision is stale

A transaction is atomic. A failed action must not leave a partially mutated
project.

### Session Commands

Session commands change live, non-portable operating state.

Examples:

- play
- pause
- seek
- set preview quality
- request a frame
- select an inspection target

UI layout preferences remain editor state unless they are deliberately exposed
as non-durable collaboration commands. They do not belong in the project.

### Jobs

Jobs are asynchronous, cancellable, artifact-producing work.

Examples:

- analyze audio
- bake a feature timeline
- prepare a 3D model
- render frames
- encode a video
- build a capability pack
- produce a contact sheet

A job request must have an explicit input identity. Its status and result must
be inspectable. Successful outputs become referenced artifacts; they do not
silently mutate unrelated project state.

### Inspection And Events

Inspection is read-only and structured.

It should expose:

- project summary and revision
- layer and graph structure
- resolved component inputs and provenance
- runtime plans and issues
- asset readiness and warnings
- artifact identities
- renderer capability and performance information
- job status and logs

Events allow the editor and agent to observe transaction results, session
changes, runtime warnings, registry changes, and job progress without polling
opaque UI state.

## Reusable Capability Packs

### Why They Exist

An agent must be able to create a genuinely new visual without putting every
experiment into engine core.

A capability pack is the modular unit for executable creative behavior. It can
provide:

- component definitions and runtime implementations
- portable authoring schemas and presets
- graph-node definitions and kernels
- shaders
- renderer-specific program factories
- templates and examples
- compatibility and cost metadata

The engine supplies stable interfaces. A host injects an explicit set of
capability packs into the runtime and renderer registries.

### Portable Component Definition

A component should have one data-only canonical authoring definition shared by
runtime, editor, CLI, and agent tooling.

It should include:

- stable component id and version
- display metadata and category
- typed portable settings schema
- defaults
- presets
- asset and artifact input declarations
- render compatibility classification
- deterministic runtime implementation identity
- optional performance or resource hints

React controls, browser objects, Three objects, and callbacks do not belong in
this definition.

The editor generates or specializes controls from the portable schema. A
single schema must not be manually duplicated across runtime and editor
catalogs.

### Renderer Extensions

Renderer-specific programs are valid when a portable primitive representation
would be unnatural or inefficient.

They must enter through injected renderer extensions rather than module-global
registries. An advanced visual can then live in a capability pack without
requiring an edit to renderer core.

Renderer extensions must declare:

- stable program id and implementation version
- supported renderer/backend
- input schema
- resource lifecycle
- deterministic update contract
- readiness behavior
- compatibility and performance metadata where useful

### Trust Boundary

The first local production loop assumes agent-authored capability source is
trusted workspace code reviewed under the same policy as other repository
code.

Portable project bundles remain data-only. They may reference required
capability identities, but they do not contain or execute arbitrary source
code.

Remote untrusted capability installation and sandboxing are separate future
security problems and are not prerequisites for the first proof.

### Promotion Rule

Use the narrowest reusable home:

- scene composition, timing, and graph wiring stay in the project
- a new parameterized visual starts in a project-local trusted capability pack
- a visual proven across projects may move into a first-party pack
- only scene-independent primitives and infrastructure move into engine core
- agent orchestration and aesthetic heuristics remain agent tooling

This prevents both one-off project code in the engine and premature generic
frameworks.

## Audio And Bake Architecture

Audio analysis must become deterministic input rather than a browser-only side
effect.

The intended flow is:

```text
audio asset
  └──> bake request
        └──> rhythm-core DSP
              └──> versioned feature artifact
                    └──> explicit project artifact reference
                          └──> runtime sampling at canonical time
```

Responsibilities:

- `rhythm-core` owns pure signal-analysis algorithms
- the bake layer owns orchestration, provenance, caching, and artifact output
- the runtime owns deterministic sampling of completed artifacts
- a browser live-analyzer adapter may provide low-latency preview values
- live and baked inputs use explicit mapping and diagnostics

The standard feature vocabulary must be canonical. Names must not drift between
documentation, live analysis, baked output, graph nodes, and components.

Scalar feature timelines are necessary but not sufficient. Components that
need waveform or spectrum frames require a versioned vector or packed spectral
artifact/cache rather than ad hoc browser FFT access.

Every artifact must record enough derivation identity to answer:

- which source asset was analyzed
- which algorithm and version produced it
- which parameters were used
- which timebase and sampling layout it uses
- whether it is compatible with the current runtime

## Render, Export, And Quality Feedback

Rendering and export are services behind explicit job boundaries.

Remotion, browser capture, WebGL, FFmpeg, and future native renderers are host
adapters. They must not define project architecture.

A render request should identify:

- project revision or immutable project identity
- execution manifest
- frame range and timebase
- resolution and quality
- renderer/backend
- output format
- required assets and baked artifacts

A render result should provide:

- output artifact identity and path
- media probe information
- frame and encode diagnostics
- renderer warnings
- timing and performance metrics
- reproducibility metadata

The agent feedback loop should be able to request:

- deterministic still frames
- a contact sheet across meaningful timestamps
- a short preview clip
- a final video
- runtime inspection snapshots
- performance measurements
- media probes for duration, dimensions, codec, and stream validity

Automated checks should detect at least:

- blank or near-black output
- frozen or identical frames
- missing audio or video streams
- wrong duration, resolution, or frame rate
- runtime errors and unresolved assets
- excessive frame time, resource growth, or encode failure

These checks support judgment; they do not replace visual review. The agent
must inspect representative frames and clips, and the human must be able to
review the same output.

## Asset, Artifact, And Execution Identity

A reproducible project needs more than a project document.

The portable bundle should retain:

- canonical project document
- content-addressed or otherwise immutable asset identities
- completed bake and preparation artifacts
- artifact provenance
- an execution manifest

The execution manifest should lock the minimum identities that affect output:

- project schema/runtime version
- capability pack ids and versions or hashes
- component and node implementation identities
- renderer/backend identity
- relevant bake algorithm identities
- asset and artifact content hashes

The initial target is semantic determinism with a pinned execution environment.
Cross-GPU pixel identity is not assumed.

## Agent Tooling And Transport

Agent tools are thin, composable clients over canonical control contracts.

The first useful surface should cover:

- inspect project, catalog, graph, runtime, assets, artifacts, and jobs
- apply or dry-run a revision-safe transaction
- play, pause, seek, and request preview frames
- import or assign an asset
- request and inspect a bake
- request and inspect a render
- export and reopen a portable bundle
- validate a project and execution manifest
- scaffold, build, and reload a trusted local capability pack

CLI, local bridge, and future MCP commands should translate transport input
into the same typed operations. They must not independently implement
validation or mutation semantics.

The CLI needs discoverable help, machine-readable results, stable exit codes,
and structured errors. JSON support alone is not a sufficient operator
experience if its accepted schemas are not discoverable.

## The Agent Production Loop

The intended loop is:

```text
inspect
  └──> propose
        └──> dry-run / validate
              └──> transact
                    └──> preview
                          └──> inspect + render feedback
                                └──> revise
                                      └──> certify + package
```

At each cycle the agent should know:

- what changed
- which revision it changed
- whether the runtime accepted it
- what the scene produced
- whether performance remained within budget
- whether the change improved the creative goal

The agent should prefer small coherent transactions and explicit checkpoints
over a long sequence of uninspectable mutations.

## Current Implementation Assessment

The current V2 branch has a strong base:

- one portable `VizProjectDocument`
- typed pure project actions
- package runtime evaluation
- retained renderer resources
- explicit asset and artifact references
- a preserved editor using the runtime-preview path
- structured project, graph, runtime, asset, warning, and provenance inspection
- browser attachments kept outside the deterministic core
- materially converged project/session/runtime ownership

The next architecture work should resolve these seams before the production
proof expands them:

1. **Component authoring truth is resolved.** Runtime, catalog, editor
   projection, CLI scaffold, and inspection now consume one portable
   data-only authoring schema. The fifteen editor-local definition files are
   gone.
2. **Capability and Three renderer composition is resolved.** Component
   registries retain capability-pack origin, editor control accepts injected
   registries, and Three programs enter through injected renderer extensions
   rather than a mutable module-global extension map.
3. **Live control convergence is resolved.** The preserved studio and external
   operator use one stable `VizSessionHost` and injected `VizControl`; the
   local bridge owns transport only.
4. **Canonical audio bake execution is resolved.** Browser and Node decoder
   adapters feed one pure PCM analysis path in `rhythm-core`, one versioned
   artifact, and one observable bake job lifecycle.
5. **Audio artifact representation is resolved for the standard profile.**
   Scalar descriptors and full analyzer-compatible packed waveform/spectrum
   frames feed the same runtime-input contract in preview, direct render,
   graphs, and Remotion.
6. **Keep operation categories honest.** Project actions mutate documents;
   preview is a session command; bake and render are jobs. Earlier conceptual
   action-family wording must not collapse these into one mutation schema.
7. **Authoritative decoding is resolved for current transactions and audio
   jobs.** Render request/result boundaries must retain the same posture rather
   than casting arbitrary JSON.
8. **Publish execution identity.** Current bundle manifests need capability,
   node, renderer, and bake implementation locks for reproducible output.
9. **Session extraction is resolved for the current host boundary.** Continue
   splitting internals only as focused modules beneath one canonical host.
10. **The operator surface now covers live inspection, transactions, transport,
    history, and audio jobs.** Render and feedback jobs remain the next
    deliberate expansion.
11. **Wrap browser export as a render service.** Existing FFmpeg and capture
    code can remain a browser implementation, but should implement the same
    render job contract used by headless workflows.
12. **Automate production feedback.** Still, contact-sheet, clip, media-probe,
    performance, blank-frame, and frozen-frame checks need a repeatable
    operator path.

These are convergence tasks, not reasons to introduce a second engine.

## Execution Plan

### Phase 1: Canonical Authoring And Capability Composition

Status: implemented and validated.

- define the portable component authoring/settings schema
- make runtime, editor, CLI, and tools consume one component catalog
- define injectable capability packs and renderer extensions
- add compatibility and implementation identity metadata
- preserve the full editor control experience through schema-generated
  presentation

Gate:

- one new component is defined once, appears in the editor catalog, validates
  through tools, and executes through the runtime without a second schema or
  core renderer edit

Evidence:

- [component-contract.md](./component-contract.md)
- [canonical-component-authoring-and-capability-composition.md](../../plans/v2/canonical-component-authoring-and-capability-composition.md)

### Phase 2: One Live Control Target

Status: implemented and validated.

- extract `VizSessionHost` and injected `VizControl`
- point the preserved editor at that session host
- implement the local live bridge as a transport over the same control object
- add revision-safe transactions, actor attribution, dry-run, and structured
  results
- add CLI help and machine-readable discovery

Gate:

- an agent applies a transaction without UI automation and the open editor
  immediately reflects it
- a human edit and agent edit share revision, history, inspection, and undo
- no mirrored project store or second live session exists

Evidence:

- [live-session-host-and-control-target.md](../../plans/v2/live-session-host-and-control-target.md)
- [2026-07-30 live session host and control target](../../parity/evidence/2026-07-30-live-session-host-and-control-target.md)

### Phase 3: Canonical Audio Bake

Status: implemented and validated.

- converge DSP on `rhythm-core`
- implement bake execution and versioned artifacts
- settle the standard scalar feature vocabulary
- add deterministic waveform/spectrum artifact support
- expose live-versus-baked provenance and compatibility

Gate:

- the same track and bake request produce a reusable artifact
- preview and render sample the same canonical data at the same time
- audio-reactive components no longer require hidden browser FFT truth

Evidence:

- [canonical-audio-bake-and-runtime-inputs.md](../../plans/v2/canonical-audio-bake-and-runtime-inputs.md)
- [2026-07-30 canonical audio bake and runtime inputs](../../parity/evidence/2026-07-30-canonical-audio-bake-and-runtime-inputs.md)

### Phase 4: Render And Feedback Jobs

- define render request, status, cancellation, result, and artifact contracts
- adapt current browser capture/FFmpeg export behind them
- add deterministic stills, contact sheets, short clips, and final video
- add media probing, visual sanity checks, runtime diagnostics, and performance
  reporting

Gate:

- the agent can request, await, inspect, and validate outputs without driving
  export UI
- the editor can display the same job progress and artifacts

### Phase 5: Agent-Authored Visual

- create the new visual in a trusted project-local capability pack
- expose a complete authoring schema and useful presets
- compose it with existing reusable engine capabilities
- iterate through the canonical inspection/render feedback loop
- promote only proven generic pieces

Gate:

- the visual loads live in the preserved editor
- all relevant settings remain editable
- playback, seeking, graphs, undo/redo, persistence, and export remain intact
- the visual meets explicit frame-time and resource budgets

### Phase 6: Production Certification

- render the chosen short track segment
- visually review representative stills and the encoded clip
- validate media structure and performance
- export the portable project, assets, artifacts, and execution manifest
- close and reopen the result
- rerender representative frames and compare semantic output
- record parity, quality, and reusable-capability evidence

Gate:

- playable polished video
- fully editable portable project
- reproducible execution manifest
- no unapproved V1 UI, UX, feature, or performance regression

## Acceptance Criteria

The first production-loop goal is complete only when:

- the agent can author through contracts with no UI event dependency
- the editor can attach to and display the same live session
- fully headless operation can produce the same canonical project form
- new executable visuals live in capability packs, not project data or engine
  hacks
- music analysis is versioned, portable, and deterministic
- preview and final render use the same scene and runtime semantics
- output quality is judged from real rendered media, not only unit tests
- the produced video passes media and visual sanity validation
- the project reopens with its layers, graphs, settings, assets, artifacts, and
  history-safe editability intact
- the full preserved editor remains smooth, responsive, intuitive, organized,
  and fully featured, including node graphs
- reusable work is promoted deliberately and project-specific work remains
  local
- implementation identities required for reproduction are recorded

## Non-Goals For The First Proof

- arbitrary remote or untrusted capability execution
- a general plugin marketplace
- multi-user realtime collaboration
- a network session daemon
- cloud orchestration
- cross-GPU pixel-identical rendering
- replacing the preserved editor UI
- making MCP the architecture
- automatically promoting every authored visual into engine core

## Assumptions

The plan currently assumes:

- agent-authored local source is trusted workspace code
- portable bundles remain data-only
- the existing Chromium/WebGL/FFmpeg host can be reused behind service
  boundaries for the first production proof
- one open editor process is sufficient for the first live collaborative mode
- browser automation is available for product verification
- a backend-native Three component is acceptable when explicitly declared
- determinism means canonical time, seeded behavior, pinned inputs, and a
  recorded execution environment, not universal pixel identity
- the first proof may use a short track segment and one project-local
  capability pack

If any of these assumptions change, the affected boundary should be revisited
explicitly rather than silently expanded.

## Locked Decisions

- One canonical project document.
- One canonical live session per authoring context.
- The editor and agent use the same mutation and runtime contracts.
- The agent does not need to control the UI to create.
- The editor can display agent work live by subscribing to the same session.
- Project transactions, session commands, jobs, and inspections are distinct.
- Capability packs are the reusable executable visual boundary.
- Project bundles are data-only.
- Renderer-specific extensions are injectable, not global engine edits.
- Bake outputs are explicit versioned artifacts.
- Render/export implementations are adapters behind job contracts.
- UI/UX/capability/performance parity with the established editor remains a
  release floor.
- A daemon is deferred until a real distributed-session requirement exists.

## Open Decisions

These should be resolved by implementation evidence:

- the exact local bridge transport used by the studio
- the packed spectrum/waveform artifact layout
- the first render host used by fully headless mode
- the exact semantic image comparison used for reproduction checks
- where project-local trusted capability source lives in a portable development
  workspace, distinct from the exported data-only bundle
