# First Real Implementation Slicing Plan

## Purpose

This document defines the first concrete implementation slicing plan for
VizEngine V2.

It exists to answer:

- whether we should scaffold and reorg the repo now
- what the first real V2 folders/packages should be
- what each new package should own immediately
- what old code should remain temporarily untouched
- how we avoid a noisy repo-wide reshuffle

This is the bridge from planning into real implementation.

## Core Position

Yes, we should start with a proper V2 scaffold and reorg now.

But:

- it should be an implementation scaffold
- not a cosmetic repo reshuffle

That means the new structure should be created because it immediately supports
the first V2 implementation slices, not because new folders feel satisfying.

## Why This Should Happen Now

The docs are now strong enough that continuing to plan without making the repo
structure physically true will create drift.

We have already decided:

- the package split
- the runtime/bake/editor boundaries
- the package-first Magnify proof
- the local-first CLI direction
- the resolver/storage seam

The repo should now begin reflecting those decisions concretely.

## Most Important Rule

The reorg must reduce ambiguity, not increase it.

That means:

- new V2 work goes only into the new V2 structure
- old V1 code is not mass-moved without immediate ownership gain
- temporary coexistence is acceptable if boundaries are explicit
- V1 is purged later when real V2 replacements exist

## What We Are Not Doing

We are not doing:

- a repo-wide mass move of everything now
- a “rename all folders first, decide ownership later” exercise
- a hybrid structure where new V2 code keeps landing back into `src/`
- a fake scaffold with empty packages that nobody uses

Those are the lazy failure modes.

## Implementation Strategy

The right sequence is:

1. create the real V2 scaffold
2. wire the workspace/build/typecheck basics
3. implement the first real V2 packages immediately
4. keep V1 app structure temporarily intact while replacements are built
5. purge once V2 ownership is real

## Immediate Top-Level Direction

The repo should move toward a real monorepo shape with:

- `apps/`
- `packages/`
- `services/` later if needed

This should become the V2 source of truth.

## Recommended First Scaffold

The first real scaffold should likely be:

- `apps/viz-studio`
- `packages/viz-contracts`
- `packages/viz-runtime`
- `packages/viz-bake`
- `packages/viz-remotion-adapter`

Optional but probably not in the very first slice:

- `packages/viz-dev-cli`
- `apps/viz-cloud-web`
- `services/viz-api`
- `services/viz-workers`

## Why This First Set

This set directly supports the first critical V2 path:

- canonical contracts
- headless runtime
- bake
- Remotion adapter
- future editor client over those packages

That is the minimum real V2 backbone.

## Immediate Ownership Per Package

## `packages/viz-contracts`

Immediate ownership:

- `VizProjectDocument`
- asset ref types
- baked artifact ref types
- component metadata contracts
- node metadata contracts
- audio feature timeline artifact types
- shared validation/reporting types

Why first:

- everything else depends on it

## `packages/viz-runtime`

Immediate ownership:

- runtime create/input types
- minimal scene validation
- deterministic stepping skeleton
- graph evaluation skeleton
- component execution interfaces

Why second:

- this is the real engine seam

## `packages/viz-bake`

Immediate ownership:

- standard audio feature bake pipeline shape
- bake request/result contracts
- artifact generation helpers

Why third:

- render-safe audio-reactive workflows depend on it

## `packages/viz-remotion-adapter`

Immediate ownership:

- Remotion-facing composition wrapper
- runtime mounting glue
- frame-driven render path

Why fourth:

- this is required for the package-first Magnify proof

## `apps/viz-studio`

Immediate ownership:

- eventually the rebuilt editor/studio shell

But in the very first slice:

- it may exist only as the designated future home
- it does not need to become a fully working replacement immediately

This is important.

The studio app should not block contracts/runtime extraction.

## What Should Stay Untouched For Now

The current V1 app structure can remain temporarily in place:

- `src/app`
- `src/components`
- `src/lib`
- `src/remotion`

and the current root app wiring can continue existing while V2 packages are
born.

Important rule:

- do not keep adding new V2 logic there

That code remains temporary legacy terrain until its concerns are replaced.

## What We Should Stop Doing Immediately

As soon as the new scaffold exists, we should stop:

- putting new canonical contracts into old app folders
- putting new runtime logic into editor/store folders
- expanding old V1 render paths with new architectural commitments

That discipline matters more than moving every old file right away.

## Workspace/Wiring Slice

The scaffold should not be added as dead folders.

The first scaffold pass should also include:

- updated workspace config to include new `apps/*` and `packages/*`
- base package manifests
- base tsconfig posture for packages
- build/typecheck entrypoints for the first packages

This makes the new structure real.

## Existing `packages/` Relationship

The repo already has `packages/rhythm-core`.

We should not force it into a premature decision immediately.

Instead:

- treat it explicitly as existing prior package terrain
- decide case-by-case whether it becomes:
  - absorbed into `viz-bake`
  - retained as a narrower internal package
  - or replaced later

Do not let it silently define the V2 package boundary story by inertia.

## Proposed Phases

## Slice 1: Scaffold And Wiring

Deliver:

- `apps/` and V2 `packages/` directories created
- package manifests created
- workspace config updated
- base tsconfig/build plumbing created

Exit condition:

- the V2 package skeleton exists and can typecheck/build at a minimal level

## Slice 2: Contracts Package Baseline

Deliver:

- `viz-contracts` real initial exports
- document, asset, artifact, metadata contracts
- initial public export map shape

Exit condition:

- other packages can import real V2 contracts from one place

## Slice 3: Runtime Package Baseline

Deliver:

- `viz-runtime` minimal create/runtime interfaces
- validation baseline
- minimal deterministic frame/scene scaffolding

Exit condition:

- a consumer can instantiate the runtime contractually, even if features are
  still sparse

## Slice 4: Bake Package Baseline

Deliver:

- standard audio feature artifact types
- first bake pipeline shape
- initial standard profile generation path

Exit condition:

- baked audio feature artifacts can be produced through the new V2 package path

## Slice 5: Remotion Adapter Baseline

Deliver:

- `viz-remotion-adapter` minimal composition glue
- runtime input handoff
- one path to render a minimal Viz scene by frame

Exit condition:

- the package-first Magnify proof seam exists in principle

## Slice 6: First Real Visual Proof

Deliver:

- one real V2 visual/component path
- one scene input
- one audio feature input path if needed
- one deterministic render path

Exit condition:

- the V2 runtime seam has proven real behavior rather than just type surfaces

## Why The Editor Should Not Be First

It is very tempting to start with the editor because it is visible.

That would be the wrong order.

If we rebuild the editor before contracts/runtime/bake are real, we will just
rebuild another app-shaped architecture.

The editor must become a client of the new core, not the new owner of it.

## Why The Reorg Should Happen Before Deep Runtime Work

Because if we start implementing V2 runtime work inside the current `src/`
layout, the old ambiguity returns immediately.

The scaffold creates the right ownership pressure.

That is worth doing now.

## Migration Rule

During coexistence:

- V1 remains operational where needed
- V2 becomes the only place for new core architecture work
- migration bridges, if any, must be explicit and temporary

This keeps the rewrite honest.

## Purge Rule

Once a concern is clearly owned by the new V2 package path, the old V1 path for
that concern should be removed rather than maintained indefinitely.

The scaffold is not an excuse for permanent duplication.

## Recommended Immediate Package Naming

I recommend using the final intended names now rather than temporary names.

Examples:

- `@viz-engine/contracts`
- `@viz-engine/runtime`
- `@viz-engine/bake`
- `@viz-engine/remotion-adapter`

This reduces renaming churn later.

## Recommended Immediate App Naming

For the first app scaffold:

- `apps/viz-studio`

is the cleanest future-facing name.

It is better than keeping the root Next app as the conceptual source of truth.

## Recommended First Deliverable After This Plan

Immediately after this plan, the next real implementation move should be:

1. scaffold the new `apps/` and `packages/` structure
2. update workspace config
3. add `viz-contracts`
4. add `viz-runtime`
5. make them minimally build/typecheck

That is the correct non-lazy next step.

## Non-Goals

We are not deciding all of this yet:

- final `services/` introduction timing
- exact tsconfig layering details
- exact test runner layout per package
- whether the root current Next app is deleted immediately

Those can be decided in the implementation pass once the scaffold exists.

## Final Position

Yes, we should start with a proper V2 scaffold and reorg now.

But only as a real implementation scaffold:

- new structure first
- immediate ownership next
- first packages built right away
- old code left in place temporarily where needed
- purge later when replacements are real

That is the cleanest way to begin the rewrite for real.
