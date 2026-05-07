# Asset Resolver And Storage Abstraction Spec

## Purpose

This document defines how VizEngine V2 should resolve assets and baked
artifacts across local OSS use, portable bundles, Viz Cloud, and Magnify
integration.

It exists to answer:

- what an asset reference is
- what a resolved asset is
- how baked artifact references differ from resolved baked artifacts
- how environment-specific storage should be abstracted
- how the runtime should consume resolved inputs
- how portability should be preserved

This is a critical boundary document because storage concerns must not leak
into scene truth or runtime semantics.

## Core Goal

We need one clean abstraction that supports all of these without drift:

- local filesystem-backed projects
- imported portable bundles
- Viz Cloud hosted object storage
- Magnify package-first runtime consumption
- future cloud-to-cloud integrations

## Core Rule

`VizProjectDocument` stores stable references.

Resolvers turn those references into concrete runtime-usable inputs.

Storage backends serve the resolvers.

The runtime should consume resolved inputs without caring whether they came
from:

- local disk
- a bundle
- cloud object storage
- Magnify-provided resolved artifacts

That separation is the whole point of this layer.

## Decided Now

### Decision 1: Scene truth must not hardcode environment-specific paths

We are deciding now that the canonical scene document must not depend on:

- absolute machine paths
- bundle-internal temp paths
- cloud-provider-specific object keys as raw scene truth
- arbitrary URLs buried inside component config when those inputs are real
  first-class assets

### Decision 2: Asset refs and resolved assets are different layers

We are deciding now that a scene-facing asset ref is not the same thing as a
runtime-facing resolved asset.

This distinction also applies to baked artifacts.

### Decision 3: Resolution is an environment concern, not a runtime concern

We are deciding now that:

- local storage
- bundle storage
- cloud storage
- Magnify-provided inputs

must be represented as resolver/backend differences, not as different runtime
semantics.

### Decision 4: The runtime consumes resolved inputs only

We are deciding now that `viz-runtime` should receive:

- `VizProjectDocument`
- resolved assets
- resolved baked artifacts

It should not be responsible for discovering storage backends on its own.

### Decision 5: Magnify should usually pass resolved inputs into Viz

We are deciding now that the package-first Magnify integration path should pass
resolved runtime inputs into Viz rather than relying on hidden Viz Cloud fetch
behavior.

## Layer Model

This system should be understood as four layers:

1. canonical refs
2. resolver interfaces
3. storage backends
4. resolved runtime inputs

## 1. Canonical Refs

These live in scene truth.

They are:

- stable
- portable
- typed
- environment-agnostic

## 2. Resolver Interfaces

These interpret refs in a given environment and turn them into usable runtime
objects.

## 3. Storage Backends

These are environment-specific implementations such as:

- local filesystem
- portable bundle directory/archive
- cloud object storage
- Magnify-managed resolved asset provider

## 4. Resolved Runtime Inputs

These are what `viz-runtime` actually receives.

Examples:

- file URL
- HTTP URL
- inline text payload
- parsed timed text JSON
- decoded feature timeline payload

## Asset Taxonomy

We should lock the high-level asset taxonomy now because future image/video
manipulation depends on it.

The clean model is:

1. source assets
2. derived managed assets
3. baked artifacts
4. render outputs

These are different things and should not be blurred together.

## 1. Source Assets

These are original user-managed inputs such as:

- uploaded audio
- uploaded image
- uploaded video
- imported media files

These should be durable first-class managed assets.

## 2. Derived Managed Assets

These are new managed media assets produced from other assets through explicit
transformations.

Examples:

- trimmed video clip
- looped video variant
- cropped image variant
- masked image variant
- preprocessed alpha video
- extracted frame sequence

Important rule:

- a manipulated image or video is often not a baked artifact
- it is often a new managed asset variant

## 3. Baked Artifacts

These are reusable non-display data payloads or simulation support data such
as:

- audio feature timelines
- beat maps
- simulation checkpoints
- waveform summaries

Baked artifacts are usually consumed by runtime logic rather than displayed as
the final media asset itself.

## 4. Render Outputs

These are final or candidate outputs produced by preview/render workflows.

Examples:

- preview still
- preview clip
- final mp4 render
- exported image sequence

These should stay distinct from both managed source assets and baked artifacts.

## Core Taxonomy Rule

If something is a durable media file that may be reused across scenes or
workflows, it should generally be modeled as a managed asset, even if it was
derived from another asset.

If something is reusable computational support data for runtime/render logic, it
should generally be modeled as a baked artifact.

## Runtime Manipulation Vs Managed Derivation

We should explicitly support both.

## Runtime Manipulation

Some media manipulations belong in scene/component semantics.

Examples:

- crop framing
- transform
- opacity
- blend mode
- shader treatment
- mask application
- timeline windowing

These should usually remain part of scene/component config when they are part of
the visual meaning of the scene.

## Managed Derivation

Some media manipulations should become durable managed asset operations.

Examples:

- trimming and re-encoding a video clip
- generating a reusable seamless loop
- extracting a sequence of frames
- preprocessing an image/video for repeated downstream use

These are better treated as asset-pipeline operations that produce new managed
asset variants.

## Derivation Provenance Direction

Because future manipulated media matters, managed assets should eventually be
able to carry provenance about derivation.

Preferred conceptual direction:

```ts
type VizAssetDerivation = {
  parentAssetIds: string[];
  operation: string;
  parameters?: Record<string, unknown>;
  createdAt: string;
  createdByAccountId?: string;
  metadata?: Record<string, unknown>;
};
```

We are not locking the full derivation schema yet, but we are deciding the
direction:

- derived media should be explicit
- provenance should be inspectable
- file storage and derivation metadata belong together

## Canonical Asset Ref Direction

We should define a strict direction for canonical asset refs.

Preferred conceptual shape:

```ts
type VizAssetRef = {
  id: string;
  kind: VizAssetKind;
  source: VizAssetSource;
  label?: string;
  required?: boolean;
  metadata?: Record<string, unknown>;
};
```

Where:

```ts
type VizAssetKind =
  | "audio"
  | "image"
  | "video"
  | "model"
  | "shader"
  | "text"
  | "timed_text"
  | "feature_timeline"
  | "simulation_cache"
  | "other";
```

## Canonical Asset Source Direction

The scene-facing source shape should stay logical rather than storage-specific.

Preferred conceptual direction:

```ts
type VizAssetSource =
  | { kind: "managed"; assetId: string }
  | { kind: "external"; uri: string }
  | { kind: "inline_text"; text: string; mimeType?: string }
  | { kind: "inline_json"; value: unknown; mimeType?: string };
```

Important rule:

- this is a logical source descriptor
- it is not permission for the runtime to fetch anything however it wants

## Canonical Baked Artifact Ref Direction

Preferred conceptual shape:

```ts
type VizBakedArtifactRef = {
  id: string;
  kind: VizBakedArtifactKind;
  version: number;
  source: VizBakedArtifactSource;
  required?: boolean;
  metadata?: Record<string, unknown>;
};
```

Preferred baked source direction:

```ts
type VizBakedArtifactSource =
  | { kind: "managed"; artifactId: string }
  | { kind: "inline_json"; value: unknown; mimeType?: string };
```

We should bias toward managed artifacts for heavy reusable data and reserve
inline payloads for small transportable cases.

## Resolved Asset Direction

Resolved assets are runtime-facing and environment-specific.

Preferred conceptual shape:

```ts
type ResolvedVizAsset = {
  id: string;
  kind: VizAssetKind;
  mimeType?: string;
  sourceDescription: string;
  resolved:
    | { kind: "url"; url: string }
    | { kind: "file"; path: string; fileUrl?: string }
    | { kind: "text"; text: string }
    | { kind: "json"; value: unknown }
    | { kind: "binary"; bytes: Uint8Array };
  metadata?: Record<string, unknown>;
};
```

Important rule:

- resolved assets are allowed to be environment-specific
- canonical scene refs are not

## Resolved Baked Artifact Direction

Resolved baked artifacts should be typed and runtime-usable.

Preferred conceptual shape:

```ts
type ResolvedVizBakedArtifact = {
  id: string;
  kind: VizBakedArtifactKind;
  version: number;
  sourceDescription: string;
  payload: unknown;
  metadata?: Record<string, unknown>;
};
```

Later this should tighten by artifact family rather than staying `unknown`.

## Resolved Maps

The runtime-facing maps should stay explicit.

Preferred direction:

```ts
type ResolvedVizAssetMap = Record<string, ResolvedVizAsset>;
type ResolvedVizBakedArtifactMap = Record<string, ResolvedVizBakedArtifact>;
```

The runtime should use explicit ids from the document to access these maps.

## Resolver Interfaces

The cleanest direction is to define explicit resolver ports.

Preferred conceptual shape:

```ts
interface VizAssetResolver {
  resolveAsset(ref: VizAssetRef, context: VizResolveContext): Promise<ResolvedVizAsset>;
}

interface VizBakedArtifactResolver {
  resolveArtifact(
    ref: VizBakedArtifactRef,
    context: VizResolveContext
  ): Promise<ResolvedVizBakedArtifact>;
}
```

Shared context direction:

```ts
type VizResolveContext = {
  mode: "live" | "render" | "bake";
  workspaceId?: string;
  projectId?: string;
  projectVersionId?: string;
  allowNetworkFetch?: boolean;
  cachePolicy?: VizResolveCachePolicy;
};
```

## Why Explicit Context Matters

Resolution rules may differ by mode.

Examples:

- `render` mode may hard-fail on missing required artifacts
- `live` mode may allow optional preview placeholders
- `bake` mode may need source audio access rather than already-baked data

That should be explicit.

## Backend Families

The first meaningful backend families should be:

1. local project backend
2. portable bundle backend
3. Viz Cloud storage backend
4. Magnify-provided resolved backend
5. derived-asset backend behavior over the same managed asset model

## 1. Local Project Backend

This backend resolves managed refs against a local project directory shape.

It should understand:

- local managed assets
- local baked artifact files
- local metadata files if needed

It should not leak raw absolute machine paths back into scene truth.

## 2. Portable Bundle Backend

This backend resolves refs from an imported or mounted Viz bundle.

It should:

- use bundle manifest information
- provide deterministic resolution
- avoid dependence on original source-machine paths

This is critical for real portability.

## 3. Viz Cloud Storage Backend

This backend resolves managed ids through Viz Cloud product metadata and object
storage.

It may return:

- signed URLs
- downloaded payloads
- parsed JSON payloads

depending on mode and artifact kind.

The provider can change.

The abstraction should not.

## 4. Magnify-Provided Resolved Backend

This backend is important for the package-first proof and later integrations.

In this mode, Magnify can hand Viz already-resolved inputs or resolver-friendly
descriptors without Viz needing to discover Viz Cloud storage.

This is the cleanest early integration posture.

## 5. Derived-Asset Backend Behavior

Future storage backends should treat derived managed media as normal managed
assets with provenance, not as a strange special case.

That means a derived image/video asset should still resolve through the same
resolver model:

- canonical ref in scene truth
- managed asset metadata in product/storage layer
- resolved runtime input through the resolver

The important difference is provenance and lifecycle, not runtime semantics.

## Runtime Construction Rule

The runtime boundary should stay:

```ts
createVizRuntime({
  scene,
  resolvedAssets,
  resolvedBakedArtifacts,
  mode,
  config,
});
```

That means:

- no hidden storage lookups inside runtime construction
- no cloud dependency inside `viz-runtime`
- no local path assumptions inside `viz-runtime`

## Validation And Failure Posture

We should decide this clearly now.

## Required Vs Optional Refs

Both asset refs and baked artifact refs should support an explicit `required`
posture.

Meaning:

- required missing inputs are hard problems
- optional missing inputs may degrade gracefully in some modes

## Missing Required Asset Behavior

Preferred posture:

- `render` mode: fail validation and fail resolution
- `live` mode: fail unless a component explicitly supports a truthful fallback
- `bake` mode: fail if the source is required for the bake task

## Missing Required Baked Artifact Behavior

Preferred posture:

- `render` mode: fail unless the scene explicitly allows recomputation and the
  runtime/bake boundary supports it cleanly
- `live` mode: allow only if the component/node path has an explicit fallback
- `bake` mode: not applicable if the bake task is producing the artifact

Important rule:

- no silent magical recomputation in random places

## External URI Posture

External URIs are useful but dangerous.

Preferred posture:

- external refs are allowed
- whether network fetch is allowed should be policy-driven
- portable bundle export must explicitly choose whether to embed, preserve, or
  reject unresolved externals

This should never be fuzzy.

## Caching Posture

Caching should be allowed, but it must never become scene truth.

## Cache Rule

Caches are accelerators only.

They must not become:

- the canonical project document
- the canonical baked artifact contract
- the only place a required payload exists without an explicit source record

## Good Cache Uses

Examples:

- downloaded remote asset cache
- decoded feature timeline cache
- temporary signed URL cache
- local preview image cache

## Bad Cache Uses

Examples:

- hidden local temp file that the scene silently depends on
- unnamed export helper file that acts like the real artifact
- runtime-generated cache with no explicit artifact record

## Security And Path Rules

We should lock these down now.

1. resolvers must normalize and sanitize filesystem paths
2. bundle import/export must not trust original absolute machine paths
3. cloud resolvers must not leak provider secrets into scene truth
4. network fetch should be policy-controlled, not implicitly always enabled
5. resolution results should be explicit about provenance

## Magnify Integration Direction

This doc matters a lot for Magnify.

## Package-First Proof

For the first Magnify proof, the clean path should be:

- Magnify prepares the `VizProjectDocument`
- Magnify resolves or provides needed assets/artifacts
- Magnify passes resolved maps into Viz runtime/adapters

This avoids:

- hidden Viz Cloud coupling
- premature auth/storage dependence
- confusing environment assumptions

## Later Hosted Integration

Later, Magnify may also reference stable Viz Cloud ids and let Viz Cloud-backed
resolvers do the fetch/resolve work.

But the runtime seam should stay the same.

That is the architectural win.

Future Magnify-connected workflows may also pass through true managed
image/video assets, including derived media variants. That should still fit
through the same resolver seam rather than inventing a parallel media path.

## Import/Export Relationship

Portable bundles should preserve canonical refs while shipping enough managed
payloads that bundle-backed resolution works deterministically.

This means bundle export/import should cooperate with the same resolver model,
not invent a separate loading architecture.

## CLI And Tooling Relationship

Future CLI, local tooling, and MCP tools should all use the same resolver
abstractions where practical.

That gives us:

- fewer hidden codepaths
- better debugging
- stronger parity between human and agent workflows

## Non-Goals

We are not deciding all of this yet:

- exact package names for resolver implementations
- exact object storage provider
- exact final TypeScript generics for every artifact kind
- exact CLI UX for resolving or prefetching assets
- the full media derivation job model

Those can tighten later.

## Final Product Posture

The intended posture is:

- scene truth stays portable
- resolution stays explicit
- storage stays environment-specific
- runtime stays storage-agnostic
- Magnify, local Viz, bundles, and Viz Cloud all meet at the same seam

This is the cleanest scalable architecture.

## Decisions Locked In Here

We are deciding all of this now:

1. canonical scene documents store stable refs, not runtime-specific paths
2. resolved inputs are a separate layer from scene refs
3. resolver interfaces are the correct environment seam
4. runtime consumes resolved inputs and should stay storage-agnostic
5. caching is allowed only as an accelerator, never as scene truth
6. Magnify package-first integration should usually pass resolved inputs into
   Viz
7. portable bundles, local projects, and Viz Cloud should all reuse the same
   resolver model
8. manipulated image/video files should usually become explicit managed derived
   assets rather than being confused with baked artifacts

## Next Docs To Write

The strongest next follow-up docs are:

1. local-first CLI and developer ergonomics plan
2. asset lifecycle and derivation job model
3. audio feature timeline spec
