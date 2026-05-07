# Asset Lifecycle And Derivation Job Model

## Purpose

This document defines how VizEngine V2 should model asset lifecycle and managed
media derivation workflows.

It exists to answer:

- how source assets should be represented over time
- how derived managed assets should be created and tracked
- how derivation jobs should work
- how provenance should be stored
- how this differs from baked artifacts and render outputs

This is an operational model document, not just a storage taxonomy note.

## Core Goal

We need a clean lifecycle model for media assets that supports:

- original uploaded media
- manipulated image/video/audio variants
- reusable derived media files
- explicit provenance
- deterministic scene reuse
- local-first and hosted product workflows

## Core Rule

Durable manipulated media should generally become explicit managed derived
assets.

It should not be confused with:

- baked artifacts
- preview outputs
- final render outputs
- ad hoc temp files

This distinction is central to a clean media-heavy architecture.

## Asset Families

We should explicitly distinguish four different families:

1. source assets
2. derived managed assets
3. baked artifacts
4. render outputs

## 1. Source Assets

These are original user-managed media inputs.

Examples:

- uploaded song audio
- uploaded image
- uploaded video clip
- imported reference media

## 2. Derived Managed Assets

These are durable reusable media assets produced from one or more parent
assets.

Examples:

- trimmed video clip
- transcoded loop
- cropped image variant
- alpha-matted image/video variant
- extracted frame sequence
- normalized audio variant

## 3. Baked Artifacts

These are reusable non-display computational outputs.

Examples:

- audio feature timeline
- beat map
- section map
- simulation checkpoints

## 4. Render Outputs

These are scene or job outputs rather than reusable asset-pipeline inputs.

Examples:

- preview still
- preview clip
- final rendered mp4
- exported image sequence from scene render

## Most Important Taxonomy Rule

If the result is a durable media file that may be reused directly as an input
to scenes or further workflows, it should usually become a managed asset.

If the result is reusable support data for runtime/render logic, it should
usually become a baked artifact.

If the result is the output of a preview/render job, it should usually become a
render output.

## Why This Matters

Without this distinction, systems drift into bad patterns:

- media variants hidden as temp files
- baked artifacts pretending to be media assets
- render outputs reused as source media without provenance
- scenes depending on undocumented transformed files

That is exactly what V2 should avoid.

## Asset Lifecycle Stages

A managed asset should conceptually move through stages such as:

1. registered
2. available
3. referenced
4. derived_from
5. superseded or archived later if needed

We do not need a complex workflow state machine immediately, but we do need a
clear lifecycle model.

## Canonical Managed Asset Direction

Preferred conceptual shape:

```ts
type VizManagedAsset = {
  id: string;
  workspaceId: string;
  kind: VizManagedAssetKind;
  label: string;
  lifecycle: VizManagedAssetLifecycle;
  artifactId: string;
  derivation?: VizAssetDerivationRecord | null;
  createdByAccountId?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  metadata?: Record<string, unknown>;
};
```

Where:

```ts
type VizManagedAssetKind =
  | "audio"
  | "image"
  | "video"
  | "image_sequence"
  | "audio_variant"
  | "video_variant"
  | "other";

type VizManagedAssetLifecycle =
  | "available"
  | "processing"
  | "failed"
  | "archived";
```

This is directionally what we want, even if final field names change.

## Derivation Record Direction

Derived assets should carry explicit provenance.

Preferred conceptual shape:

```ts
type VizAssetDerivationRecord = {
  jobId?: string;
  parentAssetIds: string[];
  operationKind: string;
  parameters?: Record<string, unknown>;
  createdAt: string;
  createdByAccountId?: string;
  metadata?: Record<string, unknown>;
};
```

Important rule:

- provenance should be explicit and inspectable
- derived media should never be an undocumented mystery

## Derivation Job Concept

We should model asset derivation as its own first-class job family.

This is analogous to:

- bake jobs
- render jobs

But it is not the same as either one.

## Why Derivation Jobs Should Be Separate

Derivation jobs are about producing durable managed media inputs.

They are not:

- runtime support computation
- scene preview/final output rendering

Keeping them separate improves:

- observability
- provenance
- retries
- reuse
- storage hygiene

## Derivation Job Examples

Examples of derivation job kinds:

- `video.trim`
- `video.loop`
- `video.transcode`
- `video.extract-frames`
- `image.crop`
- `image.mask`
- `image.resize`
- `audio.trim`
- `audio.normalize`
- `audio.transcode`

These operation names can change, but the family concept should stay.

## Derivation Job Record

Preferred conceptual shape:

```ts
type VizAssetDerivationJob = {
  id: string;
  workspaceId: string;
  status: VizAssetDerivationJobStatus;
  operationKind: string;
  sourceAssetIds: string[];
  targetAssetId?: string;
  requestedByAccountId?: string;
  requestedBySystem?: "viz" | "magnify" | "other";
  outputArtifactId?: string;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  parameters?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

type VizAssetDerivationJobStatus =
  | "queued"
  | "validating"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";
```

## Lifecycle Flow

The intended hosted flow should be:

1. API receives derivation request
2. API validates envelope shape
3. DB creates derivation job as `queued`
4. workflow resolves source assets and validates operation kind
5. job moves through `validating` to `running`
6. operation produces a new stored media artifact
7. system creates managed target asset record
8. derivation provenance is attached to that managed asset
9. job becomes `succeeded`

This mirrors the discipline of bake/render jobs while serving a different asset
family.

## Success Requirements

A derivation job should not be marked `succeeded` until:

- output media bytes exist
- output artifact storage is registered
- target managed asset record exists
- derivation provenance is recorded

Success must mean the new asset is actually reusable.

## Failure Model

Failures should be explicit and structured.

Useful error categories might include:

- `SOURCE_ASSET_NOT_FOUND`
- `UNSUPPORTED_OPERATION`
- `INVALID_PARAMETERS`
- `MEDIA_PROCESSING_FAILED`
- `OUTPUT_ARTIFACT_REGISTRATION_FAILED`
- `TARGET_ASSET_REGISTRATION_FAILED`

## Local-First Relationship

Derivation must not be cloud-only conceptually.

We should preserve a local-first meaning for derivation:

- a local project can generate derived managed media
- the resulting asset is still explicit
- the derivation metadata still exists

The storage backend changes.

The conceptual model should not.

## Bundle Relationship

Portable bundles should be able to carry:

- derived managed assets
- their media payloads when bundled
- their provenance metadata

That means import/export should not flatten derivation history into ambiguity.

We do not need full historical graphs in every case, but we should preserve
enough provenance to understand what the asset is.

## Resolver Relationship

Derived managed assets should still resolve through the same asset resolver
model as source assets.

That means:

- scene truth references a managed asset id
- product/storage layer knows whether it is source or derived
- resolver returns a runtime-usable resolved asset

Runtime should not care whether the media was original or derived unless a
component explicitly wants provenance-aware behavior.

## Runtime Manipulation Vs Derivation

We should restate this boundary clearly.

## Runtime Manipulation

Belongs in scene/component semantics when it is part of the visual meaning of a
scene.

Examples:

- placement
- scaling
- crop framing
- opacity
- blend mode
- shader treatment

## Durable Derivation

Belongs in the asset lifecycle when it creates a reusable media file.

Examples:

- trimmed reusable video clip
- generated reusable loop
- extracted reusable frame set
- normalized reusable audio variant

This boundary keeps the scene model and the media pipeline clean.

## Relationship To Baked Artifacts

We should say this plainly.

Baked artifacts are not the place to put durable media variants.

If the result is:

- a new mp4
- a new png
- a new jpg
- a new wav

it is usually a managed asset result, not a baked artifact.

If the result is:

- a feature timeline
- a beat map
- a checkpoint set

it is usually a baked artifact.

## Relationship To Render Outputs

Render outputs should also stay separate.

A scene render output is not automatically a managed asset variant.

If we later want to promote a render output into a reusable managed asset, that
should be an explicit action, not an implicit assumption.

## Cloud Data Model Relationship

Viz Cloud should eventually represent:

- managed asset records
- derivation job records
- artifact storage refs
- derivation provenance

This sits alongside, not inside, the baked artifact and render job models.

## Magnify Relationship

Magnify should eventually be able to benefit from this model in two ways:

1. consuming Viz scenes that reference derived managed assets
2. potentially requesting explicit media derivation workflows through Viz
   integration surfaces later

But Magnify should not need to own the derivation semantics themselves.

Viz should remain the authority on:

- how asset derivation works
- how provenance is tracked
- how derived assets are registered

## AI-Native Relationship

Agents should eventually be able to:

- inspect asset provenance
- request derivation jobs
- inspect derivation job status
- choose between runtime manipulation and durable derivation

This is one of the reasons the lifecycle needs to be explicit rather than
implicit.

## Safety And Hygiene Rules

We should lock these now:

1. derived assets must have explicit provenance
2. successful derivation must produce an explicit managed asset record
3. hidden temp files must never act as durable source-of-truth assets
4. derived media should resolve through the same resolver model as source media
5. render outputs should not silently masquerade as derived assets

## Non-Goals

We are not deciding all of this yet:

- exact ffmpeg pipeline details
- exact media-operation parameter schema for every operation
- exact UI flows for derivation authoring
- exact promotion workflow from render output to managed asset

Those can tighten later.

## Final Product Posture

The intended posture is:

- source assets are first-class
- derived managed assets are first-class
- derivation jobs are first-class
- provenance is explicit
- baked artifacts stay separate
- render outputs stay separate

This is the cleanest scalable media model for Viz V2.

## Decisions Locked In Here

We are deciding all of this now:

1. durable manipulated media should usually become explicit managed derived
   assets
2. asset derivation should be modeled as its own job family
3. provenance should be explicit and inspectable
4. derived assets should resolve through the same resolver seam as source
   assets
5. baked artifacts and render outputs should stay distinct from asset
   derivation

## Next Docs To Write

The strongest next follow-up docs are:

1. audio feature timeline spec
2. package/build publication and versioning strategy
3. first real implementation slicing plan for V2 packages
