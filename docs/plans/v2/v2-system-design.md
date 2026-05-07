# VizEngine V2 System Design

## Purpose

This document turns the V2 vision into a more concrete system design.

It is the first deeper architecture pass for deciding:

- what the runtime actually owns
- how deterministic execution should work
- how live mode and render mode relate
- how AI should control the system
- how Magnify should consume VizEngine

This document intentionally makes several decisions now instead of leaving
everything open.

## Design Goals

VizEngine V2 should satisfy all of these at once:

- preserve a good visual authoring experience
- support deterministic rendering
- support fast live preview
- support first-class bake workflows
- be operable by AI through explicit contracts
- fit cleanly into Magnify Core

## System Model

VizEngine V2 should be understood as five cooperating systems:

1. contracts
2. runtime
3. bake
4. editor
5. render adapters

The most important rule is:

- the editor is a client of the runtime
- the runtime is a client of the contracts
- render adapters are clients of the runtime

Nothing except the contracts should define the scene truth.

## Decided Now

These are the first decisions this design locks in.

### Decision 1: The project document is the only canonical scene truth

We are deciding now that:

- the project document is canonical
- editor state is not canonical
- runtime state is not canonical
- Remotion composition props are not canonical

Consequence:

- all scene content must be representable in the project document or explicit
  baked artifacts

### Decision 2: Graphs are embedded in the project document at first

We are deciding now that V2 should start with embedded graphs, not a separate
reusable graph library abstraction.

Reason:

- simpler scene truth
- simpler AI mutations
- fewer indirections
- easier early implementation

We can add reusable graphs later if there is real demand.

### Decision 3: Authoritative render time is frame-based

We are deciding now that render mode time is derived from:

- `frame`
- `fps`
- `dtFixed = 1 / fps`

This is the authoritative deterministic time model.

Consequence:

- no wall-clock time in render mode
- no variable timestep simulation in render mode
- all deterministic stepping is based on fixed timestep

### Decision 4: Runtime advances state sequentially, not by recomputing every frame from zero

We are deciding now that the runtime should support sequential stepping as the
primary execution model.

Reason:

- better performance
- cleaner support for temporal nodes and physics
- better live-preview parity

Consequence:

- random access rendering needs checkpoint support
- Remotion integration should use either sequential render stepping or baked
  checkpoints for heavy scenes

### Decision 5: Physics is allowed, but only through explicit deterministic stepping

We are deciding now that V2 fully supports stateful and physics-like systems.

But:

- state transitions must be explicit
- time stepping must be fixed-step in render mode
- randomness must be seeded
- checkpoint baking must exist for expensive systems

### Decision 6: AI controls the system through document actions, not UI imitation

We are deciding now that the primary machine-facing control surface is an
explicit mutation/action API over the project document and related artifacts.

Consequence:

- the AI should not be expected to click around the app
- the UI should call the same core actions wherever practical

This deeper future control direction now lives here:

- [AI-Native Command And Control Surface](../../specs/v2/ai-native-command-and-control-surface.md)

Important:

- the heavier MCP/tooling/specialized-runner layer is a later phase after the
  stable baseline and proven Magnify use

### Decision 7: Remotion is an adapter, not the source runtime

We are deciding now that Viz runtime semantics stay in VizEngine.

Remotion should:

- mount the Viz runtime
- pass project and baked artifact inputs
- request deterministic frame output

Remotion should not:

- redefine scene semantics
- own component semantics
- become the main authoring contract

### Decision 8: Magnify should consume Viz scene artifacts directly

We are deciding now that Magnify integration should happen through explicit
artifacts:

- a Viz project artifact
- baked feature/simulation artifacts
- render adapter configuration

Magnify should not need to understand:

- editor layout state
- internal UI behavior
- ad hoc V1 persistence formats

## Runtime Execution Model

## Scene Inputs

At execution time, the runtime should consume:

- `VizProjectDocument`
- resolved assets
- resolved baked artifacts
- runtime mode
- execution config

Preferred conceptual input:

```ts
type VizRuntimeSceneInput = {
  project: VizProjectDocument;
  assets: ResolvedVizAssetMap;
  bakedArtifacts: ResolvedVizBakedArtifactMap;
  mode: "live" | "render" | "bake";
  execution: VizExecutionConfig;
};
```

## Runtime Modes

### Live Mode

Live mode is optimized for:

- responsiveness
- interaction
- scrubbing
- quick iteration

Live mode may use runtime shortcuts as long as they do not change scene
semantics.

Examples of allowed live-mode differences:

- lower preview resolution
- reduced simulation fidelity if declared
- adaptive visual debug overlays

Examples of forbidden live-mode differences:

- different scene semantics
- different graph logic
- hidden side paths that make preview lie about final output

### Render Mode

Render mode is optimized for:

- determinism
- reproducibility
- high fidelity
- stable artifact generation

Render mode should use:

- fixed timestep
- seeded randomness
- explicit asset resolution
- explicit baked artifact use

### Bake Mode

Bake mode is optimized for:

- expensive analysis
- timeline generation
- checkpoint generation
- preparing data for render parity and speed

Bake mode does not produce the final scene image output. It produces data that
other modes consume.

## Runtime State Model

The runtime should distinguish:

- scene document state
- runtime instance state
- layer/component state
- node state
- baked state

Preferred conceptual split:

```ts
type VizRuntimeInstance = {
  scene: VizRuntimeSceneInput;
  globalState: VizRuntimeGlobalState;
  layerStates: Map<string, VizLayerRuntimeState>;
  nodeStates: Map<string, VizNodeRuntimeState>;
};
```

Key rule:

- runtime state is ephemeral execution state
- baked state is durable reusable state

## Frame Evaluation Model

The runtime should expose two main evaluation styles:

1. sequential stepping
2. random access from checkpoint

Preferred conceptual interface:

```ts
interface VizRuntime {
  reset(): void;
  stepToFrame(frame: number): VizFrameResult;
  renderCurrentFrame(target: VizRenderTarget): void;
  createCheckpoint(): VizRuntimeCheckpoint;
  restoreCheckpoint(checkpoint: VizRuntimeCheckpoint): void;
}
```

This design supports:

- live preview
- offline sequential export
- Remotion-style render usage
- checkpoint-based scrubbing for heavy scenes

## Determinism Rules

The runtime should enforce these rules in render mode:

1. all time comes from fixed frame-derived time
2. all randomness comes from seeded generators
3. all temporal state is stepped explicitly
4. all asset inputs are resolved explicitly
5. all baked artifact inputs are resolved explicitly

## Audio Model

Audio is one of the biggest architecture decisions, so we should make it
explicit now.

### Decided Audio Direction

We are deciding now that the runtime should not depend directly on browser
audio APIs such as:

- `HTMLAudioElement`
- `AnalyserNode`
- `MediaElementAudioSourceNode`

Those belong in adapters.

The runtime should consume normalized audio/feature inputs through explicit
contracts.

### Two Audio Input Families

The runtime should support:

1. raw-ish frame audio snapshots
2. baked feature timelines

The first is more useful for live mode.

The second is more useful for render mode and Magnify integration.

### Preferred Direction

Most serious reactive behavior should move toward baked feature timelines over
time.

Reason:

- more deterministic
- more inspectable
- more AI-friendly
- easier to share with Magnify

Raw frame audio snapshots should still exist for:

- live responsiveness
- experimentation
- simple low-level visuals

## Component Model

## Chosen Direction

Components should become explicit scene executors with optional simulation and
optional bake hooks.

They should not read app stores directly.

### Desired mental model

A component should feel like:

- declarative config schema
- optional initialization
- optional deterministic simulation step
- one render implementation
- optional bake helper

### Render responsibility

The runtime should own the main execution orchestration.

The component should own:

- how it interprets config
- how it evolves its own local state
- how it draws itself

The component should not own:

- project loading
- global editor state
- app-level mutation flow

## Node Model

## Chosen Direction

Nodes remain important and should become cleaner, not weaker.

We are deciding now that node graphs are still first-class scene semantics in
V2.

They are not being removed in favor of code-only components.

### Graph execution responsibility

The runtime should execute graphs headlessly and deterministically.

The editor should visualize and mutate those graphs.

### Node output caching

Node output caching should be a runtime optimization, not scene truth.

Do not leak cached values into the project document.

## AI Action Surface

This is one of the most important V2 decisions.

## Chosen Direction

The primary AI control surface should be a stable action API over scene
documents and related artifacts.

### Core action families

The first action families should include:

- project actions
- asset actions
- layer actions
- graph actions
- bake actions
- preview actions
- render actions

### Project actions

Examples:

- create project
- update project settings
- rename project

### Asset actions

Examples:

- attach asset
- replace asset
- remove asset reference

### Layer actions

Examples:

- create layer
- remove layer
- reorder layer
- set layer timing
- set layer config value
- switch component

### Graph actions

Examples:

- create graph for parameter
- remove graph from parameter
- add node
- remove node
- connect nodes
- update node input

### Bake actions

Examples:

- bake audio features
- bake simulation checkpoints
- inspect baked artifacts
- attach baked artifact to project

### Preview actions

Examples:

- render preview frame
- play preview
- pause preview
- jump to frame

### Render actions

Examples:

- render image
- render clip
- export scene artifact bundle

## Why this matters

This gives:

- a stable AI contract
- a testable system boundary
- a UI-independent operation model
- a future MCP-friendly surface

## Magnify Integration Design

## Chosen Direction

Magnify should treat VizEngine as a producer-facing scene/runtime attachment,
not as a special one-off visual hack.

### Artifact boundary

The first integration boundary should be:

- one Viz project artifact
- zero or more baked artifact refs
- zero or more source assets
- one render request

### Worker render flow

Preferred render flow:

1. Magnify resolves artifacts
2. Magnify invokes the Viz Remotion adapter
3. Remotion adapter loads Viz runtime
4. Viz runtime steps scene deterministically
5. Remotion writes final media output

### Preview flow

Preferred preview flow:

1. Viz editor previews locally through Viz runtime
2. Magnify preview surfaces may also mount Viz runtime or the same adapter path
3. preview and final render consume the same scene semantics

## Package Split Decision

We are deciding now that the package split should move toward:

- `packages/viz-contracts`
- `packages/viz-runtime`
- `packages/viz-bake`
- `apps/viz-editor`
- `packages/viz-render-adapters`

This should be treated as the target shape unless implementation teaches us a
clearer variant.

## Purge Strategy

The user asked for a hard replacement posture, so this needs to be explicit at
the system-design level too.

## Chosen Direction

We should not let the rewrite settle into a half-migrated dual architecture.

Preferred purge sequence:

1. establish V2 contracts
2. establish V2 runtime
3. establish V2 editor path
4. establish V2 render adapters
5. remove obsolete V1 runtime/editor architecture aggressively

This means:

- no permanent `legacy` folders
- no indefinite dual stores
- no dead adapter tails
- no old serialization formats carried as first-class paths

## What we are not deciding yet

These are still intentionally open:

- exact package names in the filesystem
- whether editor remains in Next.js or changes app shell later
- whether reusable graph libraries are needed after V2 initial launch
- whether some components should compile to lower-level render ops later

Those can wait until after the first runtime extraction work teaches us more.

## Immediate Next Docs To Write

The next high-value docs after this should be:

1. runtime API spec
2. render adapter API spec
3. audio feature timeline spec
4. AI action schema spec
5. checkpoint format spec
