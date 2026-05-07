# Runtime Package Consumption And Local Tarball Integration Plan

## Purpose

This document defines how VizEngine V2 should be proven inside Magnify before
Viz Cloud exists.

It exists to answer:

- whether Magnify can consume Viz as a local package before hosting exists
- what Viz packages should be published first
- how Magnify should mount the Viz runtime
- how we should test one existing Viz visual early
- what the staged integration path should be

This is a sequencing and packaging document.

It is important because the first real proof of the runtime should not be
blocked on:

- Viz Cloud
- auth
- workspaces
- deep-linking
- hosted storage

## Core Decision

Yes, VizEngine V2 should be testable inside Magnify as a local package before
any hosted Viz product exists.

The preferred first proof is:

- package-first
- local dependency consumption
- Magnify-hosted Remotion composition
- one real Viz runtime path
- one or more real Viz visuals/components

Viz Cloud comes later.

## Why This Is The Right First Move

This lets us prove the most important thing first:

- can the extracted Viz runtime actually run inside Magnify cleanly?

without mixing in unrelated concerns such as:

- hosted auth
- project databases
- workspace permissions
- linked-account UX
- cloud job orchestration

If this package-first proof is weak, cloud integration will only hide the
problem instead of solving it.

## Architectural Principle

The first external-facing integration target for V2 should be a package, not a
server.

That means:

- the runtime must be consumable as a normal package
- the Remotion adapter must be consumable as a normal package
- Magnify should be able to install and execute those packages locally

This is also the cleanest proof that Viz remains a real open-core system rather
than becoming a cloud-locked product.

## Decided Now

### Decision 1: Package-first proof comes before cloud-hosted proof

We are deciding now that the first real Magnify integration milestone should be
a local package consumption proof.

Hosted Viz integration is a later stage.

### Decision 2: Magnify should consume the extracted V2 runtime, not the Viz editor app

We are deciding now that Magnify should not try to embed the current Viz app
shell or future editor shell.

Magnify should consume:

- runtime contracts
- runtime package
- render adapter package

not:

- editor stores
- editor UI
- editor routing

### Decision 3: One real Viz visual should be proven early

We are deciding now that the first proof should use at least one real Viz
visual path, not a fake placeholder that only resembles Viz.

This matters because the whole point is to prove:

- authoring/runtime contract shape
- deterministic stepping
- baked feature usage
- Magnify render compatibility

### Decision 4: Local tarball consumption is a valid first distribution mode

We are deciding now that V2 should be structured so Magnify can consume Viz
packages through:

- local workspace path
- local tarball package
- future registry package

Tarball testing is not a hack here.

It is a legitimate pre-hosting integration mode.

## Target Package Shape

The current V2 package split already points in the right direction:

- `packages/viz-contracts`
- `packages/viz-runtime`
- `packages/viz-bake`
- `packages/viz-render-adapters`

For Magnify package consumption, the first externally consumable package set
should likely be:

1. `@viz-engine/contracts`
2. `@viz-engine/runtime`
3. `@viz-engine/remotion-adapter`

Optionally later:

4. `@viz-engine/bake`

## Package Responsibilities

## `@viz-engine/contracts`

Owns:

- `VizProjectDocument`
- asset refs
- baked artifact refs
- component metadata contracts
- node metadata contracts
- runtime request/result types

Magnify should be able to type against this package without importing editor
code.

## `@viz-engine/runtime`

Owns:

- deterministic runtime creation
- runtime stepping and seeking
- layer/component execution
- graph evaluation
- runtime validation

This is the real engine seam.

## `@viz-engine/remotion-adapter`

Owns:

- turning Viz runtime inputs into Remotion-friendly composition rendering
- frame-based runtime seeking/stepping
- adapter-specific bridge code

This package should be thin.

It should not redefine runtime semantics.

## `@viz-engine/bake`

Owns:

- offline audio feature extraction
- checkpoint baking
- other reusable deterministic precompute flows

This package is useful early if the chosen proof visual depends on baked
features.

## What Magnify Should Import

The clean early model is:

- Magnify imports the Viz adapter package
- Magnify passes a Viz scene input into that adapter
- the adapter mounts the Viz runtime in a Magnify Remotion composition

Magnify should not need to understand internal Viz editor behavior.

## Recommended Magnify-Side Shape

We do not need to freeze final code shape yet, but the conceptual boundary
should look like:

```ts
type MagnifyVizRuntimeInput = {
  project: VizProjectDocument;
  assets: ResolvedVizAssetMap;
  bakedArtifacts?: ResolvedVizBakedArtifactMap;
  render: {
    width: number;
    height: number;
    fps: number;
    durationFrames: number;
    seed: string;
  };
};
```

And Magnify’s Remotion layer would do something conceptually like:

```ts
<VizRemotionComposition input={vizRuntimeInput} />
```

The exact API can tighten later.

The important point is:

- one explicit input object
- no implicit editor state
- no cloud dependency

## Relationship To Magnify’s Existing Render Seam

Magnify already has a packaged Remotion rendering boundary.

That means V2 should target that seam rather than invent a second bespoke
integration path.

The likely practical posture is:

- Magnify keeps owning the surrounding render orchestration
- Viz provides the runtime and the Remotion-facing scene adapter
- Magnify passes resolved assets and scene data into Viz

This is a very clean split.

## First Proof Scope

The first proof should be intentionally narrow.

Recommended scope:

1. one real Viz runtime package
2. one real Viz visual/component path
3. one deterministic scene input
4. one baked feature timeline if required
5. one successful Magnify Remotion render

This is enough to prove the architecture without overcommitting to breadth too
early.

## What Counts As “One Real Viz Visual”

The proof should not be:

- a fake React-only animation that merely uses Viz naming
- a Magnify-native layer pretending to be Viz
- a rewritten demo effect unrelated to Viz component contracts

The proof should be:

- an actual Viz V2 component/visual path
- running through the V2 runtime
- rendered in Magnify via the V2 adapter

If needed, we can start with one simple component that is explicitly upgraded
into a V2-compliant deterministic component.

That still counts, as long as it is genuinely a Viz runtime component and not a
throwaway bypass.

## Recommended Stage Sequence

We should lock the integration stages now.

## Stage 1: Local Package Proof

Goal:

- prove that Magnify can consume Viz runtime packages locally

Inputs:

- local path dependency or local tarball
- one Viz scene input
- one or more local assets
- optional baked artifacts

Output:

- successful Magnify-hosted Remotion render using Viz runtime

No dependency on:

- Viz Cloud
- linked auth
- hosted project storage

## Stage 2: Portable Bundle Proof

Goal:

- prove that Magnify can consume a portable Viz bundle artifact

Inputs:

- `VizProjectBundle`
- bundled assets
- bundled baked artifacts

Output:

- successful render from bundle-derived runtime input

This proves the local/open-core interchange story.

## Stage 3: Hosted Reference Proof

Goal:

- prove that Magnify can resolve and render a cloud-hosted Viz project version

Inputs:

- `vizWorkspaceId`
- `vizProjectId`
- `vizProjectVersionId`

Output:

- successful render through the same runtime and adapter path

This proves the cloud product layer without changing the core seam.

## Local Dependency Modes

We should support three legitimate development/consumption modes.

## Mode A: Local Workspace Path

Useful during active local development.

Example shape:

- Magnify points to a local filesystem dependency

Pros:

- fastest iteration
- no pack/publish loop

Cons:

- less realistic packaging proof

## Mode B: Local Tarball Package

Useful for realistic pre-registry package testing.

Example shape:

- build Viz package
- produce local tarball
- install tarball into Magnify

Pros:

- realistic packaging test
- catches missing files and export problems
- still local and fast enough

Cons:

- slower than path linking

This is the strongest early proof mode.

## Mode C: Future Registry Package

Useful later once package surfaces stabilize.

This is not required for the initial Magnify proof.

## Why Tarball Testing Matters

Tarball testing is valuable because it proves:

- package exports are correct
- build outputs are complete
- runtime dependencies are declared properly
- Magnify can consume Viz like any external package

This catches problems that local workspace linking can accidentally hide.

## Required V2 Package Qualities

For local tarball testing to work well, the first Viz packages must be:

- buildable in isolation
- free of editor-only imports
- free of app-router or Next.js assumptions
- explicit about runtime dependencies
- explicit about browser-only versus Node-safe surfaces

This requirement is important.

If the runtime package drags editor concerns with it, the package proof will be
weak and noisy.

## Runtime Safety Boundary

We should decide this clearly now.

The runtime package should not depend on:

- Next.js app state
- editor Zustand stores
- browser routing
- editor panel logic

The Remotion adapter package should also stay clear of editor dependencies.

This is one of the cleanest tests of whether V2 boundaries are real.

## Asset And Artifact Resolution In The Proof

The first Magnify proof should use explicit resolved inputs.

That means Magnify should provide:

- resolved asset URLs or local file refs
- resolved baked artifact data or refs
- explicit render frame settings

The first proof should not depend on hidden asset fetching behavior from Viz
Cloud.

## Suggested Early Proof Inputs

A good first proof input could be:

- one audio asset
- one feature timeline asset
- one simple reactive Viz component
- one seed
- one output frame spec

This is enough to prove:

- deterministic timing
- baked feature use
- Magnify consumption
- Remotion adapter behavior

## Existing Viz Component Reuse Direction

Yes, the goal should be to reuse a real Viz visual path as early as possible.

But we should do it cleanly:

- choose one existing Viz visual/component that can be translated into the V2
  deterministic contract with reasonable effort
- extract or rewrite it into the new component contract
- do not try to drag the whole V1 editor/runtime with it

This is the right minimal proof posture.

## What We Should Not Do

We should not:

- embed the current Viz app inside Magnify
- couple Magnify to Viz editor stores
- wait for Viz Cloud before testing runtime integration
- fake the Viz proof with a Magnify-only approximation
- delay package design until after the editor rebuild

Those moves would create noise and architectural drift.

## Success Criteria

The local package proof is successful when all of these are true:

1. Viz runtime packages build independently
2. Magnify can install them through a local tarball or local path
3. Magnify can render one real Viz visual through Remotion
4. the rendered output is driven by Viz runtime semantics, not a fake bridge
5. no Viz Cloud service is required for the proof

## Follow-On Benefits

If we get this right early, it unlocks:

- stronger confidence in V2 boundaries
- easier future registry publishing
- easier non-Magnify external consumption
- cleaner cloud product layering later
- better open-core credibility

## Final Product Posture

The intended posture is:

- Viz runtime is a real consumable package
- Magnify can use it before Viz Cloud exists
- local tarball testing is a first-class integration mode
- cloud integration later reuses the same runtime seam

This is the right order of proof.

## Decisions Locked In Here

We are deciding all of this now:

1. the first Magnify proof should be package-first and local
2. Magnify should consume Viz runtime packages, not the Viz editor app
3. local tarball testing is a legitimate first integration mode
4. one real Viz visual path should be proven early
5. the same runtime seam should later support both portable bundles and cloud
   references

## Next Docs To Write

The strongest next follow-up docs are:

1. future MCP/tool surface inventory
2. specialized AI runner vision
3. asset resolver and storage abstraction spec
