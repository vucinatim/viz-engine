# Bake Job Ownership And Lifecycle Model

Status: hosted lifecycle remains the target model; the compatible local
in-memory lifecycle is implemented for audio feature bakes.

## Purpose

This document defines how hosted bake jobs should work in Viz Cloud.

It exists to answer:

- who owns bake jobs
- what the bake job lifecycle should be
- how status transitions should work
- how retries and cancellation should work
- how baked outputs should be registered and consumed

This is an operational lifecycle document, not a bake-algorithm document.

## Core Goal

We want bake jobs that are:

- durable
- reproducible
- observable
- integration-safe
- aligned with the rest of the Viz Cloud operational model

## Core Rule

Viz owns Viz bake jobs.

Inngest may orchestrate them, but Viz DB/API remains the source of truth.

Magnify or other systems may request or consume bake outputs, but should not
own bake lifecycle semantics.

## Decided Now

### Decision 1: Viz API/DB creates bake job truth

We are deciding now that a bake job starts by creating a durable bake job
record in Viz DB/API before orchestration begins.

### Decision 2: Inngest orchestrates, but does not define bake truth

We are deciding now that Inngest may run durable bake workflows, but job truth
still lives in Viz DB/API records.

### Decision 3: Bake jobs must point at explicit sources

We are deciding now that every bake job should reference its explicit inputs,
which may include:

- `projectId`
- `projectVersionId`
- `assetId`
- `layerId`
- bake kind

The job should never rely on implicit hidden context.

### Decision 4: Bake outputs are first-class baked artifacts

We are deciding now that successful bake jobs should register explicit baked
artifact records and underlying artifact storage refs.

### Decision 5: Bake jobs are separate from render jobs

We are deciding now that bake jobs should remain their own operational entity,
even if renders depend on their outputs.

This separation is important for:

- observability
- retries
- reuse
- caching

## Why Bake Jobs Matter

Bake jobs are central to V2 because they support:

- audio feature extraction
- section/onset/beat analysis
- simulation checkpoint generation
- reusable expensive precomputation

Without a first-class bake lifecycle, the system would drift back toward ad hoc
hidden precompute behavior.

## Ownership Split

### Viz owns

- bake job records
- input validation
- status transitions
- baked artifact registration
- bake semantics and pipelines
- retry semantics

### Inngest owns

- durable workflow execution
- retries
- long-running orchestration
- coordination and progress

### Magnify owns

- why it wants a bake output in its own workflow terms
- which Magnify workflow references the resulting artifacts

Magnify should not own bake semantics or bake job truth.

## Bake Job Record

Preferred conceptual shape:

```ts
type VizBakeJob = {
  id: string;
  workspaceId: string;
  status: VizBakeJobStatus;
  bakeKind: string;
  sourceProjectId?: string;
  sourceProjectVersionId?: string;
  sourceAssetId?: string;
  sourceLayerId?: string;
  requestedByAccountId?: string;
  requestedBySystem?: "viz" | "magnify" | "other";
  outputBakedArtifactIds: string[];
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
};
```

## Status Model

Preferred first statuses:

- `queued`
- `validating`
- `running`
- `succeeded`
- `failed`
- `cancelled`

This should mirror render jobs where practical.

## Status Transition Rules

Preferred lifecycle:

1. `queued`
2. `validating`
3. `running`
4. one of:
   - `succeeded`
   - `failed`
   - `cancelled`

### Status meanings

- `queued`: job record created and waiting for orchestration
- `validating`: checking inputs and requirements
- `running`: executing bake pipeline
- `succeeded`: baked artifact outputs registered successfully
- `failed`: terminal failure
- `cancelled`: explicit cancellation

## Lifecycle Flow

The intended hosted flow should be:

1. API receives bake request
2. API validates envelope shape
3. DB creates bake job as `queued`
4. API emits orchestration event
5. workflow moves job to `validating`
6. workflow resolves explicit inputs
7. workflow moves job to `running`
8. workflow executes bake pipeline
9. workflow registers baked artifact records and artifact refs
10. DB updates job to `succeeded`

If failure occurs:

- DB updates job to `failed`
- structured error info is recorded

## Input Validation Responsibilities

Validation should happen in two stages:

### Stage 1: API validation

Cheap validation:

- request shape
- auth/access
- required IDs
- bake kind presence

### Stage 2: workflow validation

Execution validation:

- source project/version/asset exists
- bake kind is supported
- prerequisites are available
- scene or layer is compatible with the requested bake

## Success Requirements

A bake job should not be marked `succeeded` until:

- baked artifact bytes exist
- baked artifact records exist
- bake job points to those baked artifact ids

Success must mean the result is actually reusable.

## Bake Kinds

We should explicitly allow multiple bake kinds under one lifecycle model.

Examples:

- `audio-features`
- `beat-map`
- `section-map`
- `waveform-summary`
- `simulation-checkpoints`
- `simulation-frame-cache`

This avoids baking being hardcoded as one special-case subsystem.

## Output Registration Model

Successful bake jobs should register:

- one or more baked artifact records
- underlying artifact storage refs
- optional logs or trace refs

The bake job should point to the resulting baked artifact ids explicitly.

## Reuse Model

Bake outputs exist partly to be reused.

That means the lifecycle should allow:

- later render jobs to reference baked outputs
- later previews to reference baked outputs
- multiple project versions to reuse compatible baked outputs if explicitly
  allowed

We are not deciding full cache invalidation logic yet, but we should preserve
reuse as a first-class reason the system exists.

## Failure Model

Failures should be explicit and structured.

Preferred fields:

- `errorCode`
- `errorMessage`
- optional logs or trace refs

Examples of useful codes:

- `SOURCE_PROJECT_NOT_FOUND`
- `SOURCE_PROJECT_VERSION_NOT_FOUND`
- `SOURCE_ASSET_NOT_FOUND`
- `BAKE_KIND_UNSUPPORTED`
- `BAKE_VALIDATION_FAILED`
- `BAKE_EXECUTION_FAILED`
- `BAKED_ARTIFACT_REGISTRATION_FAILED`

## Retry Model

The basic retry posture should mirror render jobs.

### Automatic retries

Good for:

- transient infrastructure failures
- temporary storage/network issues
- temporary worker failures

### Manual retries

Good for:

- corrected source state
- fixed bake implementation bug
- operational recovery

### Decided now

The preferred first posture is:

- keep one canonical bake job record
- increment retry metadata there

This keeps the operational story simple.

## Cancellation Model

Cancellation should be explicit.

Preferred flow:

1. API receives cancellation request
2. DB marks cancel intent
3. orchestration stops future work
4. running work is stopped safely or allowed to terminate cleanly
5. job status becomes `cancelled`

Cancellation must not delete historical state.

## Relationship To Working Head

We should be strict here.

### Default rule

Hosted bake jobs should use stable references where possible:

- project versions
- assets
- explicit layer refs

### Exception rule

If a bake is intentionally against working head/draft state:

- it must be labeled explicitly
- it must not masquerade as published-version-compatible baked output

This is especially important if future draft preview flows use baked data.

## Relationship To Render Jobs

Render jobs may depend on baked outputs, but:

- render jobs should not silently create hidden bake work in a way that erases
  observability

Reasonable future behavior:

- render job may require baked prerequisites
- if missing, the system may trigger or require explicit bake jobs

But those bake jobs should remain observable as jobs, not hidden internal work.

## Magnify Interaction Model

Magnify may request or benefit from bake outputs through Viz APIs, but Magnify
should not own bake job lifecycle.

Reasonable Magnify use cases:

- request audio-feature bake before attached scene workflows
- inspect whether required baked outputs exist
- consume artifacts indirectly through preview/render flows

But the job itself remains Viz-owned.

## Observability Requirements

Bake jobs should be observable enough for:

- debugging
- AI workflow reasoning
- render dependency tracing
- integration monitoring

Preferred observable fields:

- status
- bake kind
- source refs
- output baked artifact ids
- timestamps
- retry count
- error codes/messages
- trace/log refs

## Local-First Compatibility

This hosted bake lifecycle must not invalidate local bake execution.

That means:

- local bake remains possible without Viz Cloud jobs
- hosted bake job lifecycle is a cloud/product concern

The lifecycle here is for managed product operation, not for forcing all bake
flows into the cloud.

The local implementation now proves this split:

- one observable job service uses `queued`, `validating`, `running`,
  `succeeded`, `failed`, and `cancelled`
- requests carry actor and explicit source identity
- progress snapshots are immutable and subscribable
- cancellation is cooperative and terminal
- a source-content mismatch fails closed
- successful output is inspectable before project mutation
- attaching the output is a separate revision-safe project transaction
- the editor host, live bridge, CLI, and headless host consume the same service

Cloud persistence and orchestration can therefore implement the lifecycle
documented here without changing bake request, result, or artifact semantics.

## Decisions Locked In Here

We are deciding all of this now:

1. Viz owns bake jobs
2. Viz DB/API creates durable bake job truth
3. Inngest orchestrates but does not own truth
4. bake jobs must reference explicit sources
5. success means baked artifact registration is complete
6. retries are tracked on the same canonical job record initially
7. cancellation is explicit state transition, not deletion
8. bake jobs remain separate observable entities from render jobs

## Next Docs To Write

The next strongest follow-up docs are:

1. linked-account and SSO flow design
2. local persistence and import/export model
3. future MCP/tool surface inventory
