# Render Job Ownership And Lifecycle Model

## Purpose

This document defines how hosted render jobs should work in Viz Cloud.

It exists to answer:

- who owns render jobs
- what the render job lifecycle should be
- how status transitions should work
- how retries and cancellation should work
- how Magnify consumes render outputs

This is an operational lifecycle document, not a render-runtime semantics
document.

## Core Goal

We want render jobs that are:

- durable
- reproducible
- observable
- integration-safe
- consistent with the product boundaries already chosen

## Core Rule

Viz owns Viz-scene render jobs.

Magnify may request them and consume their outputs, but Magnify should not own
their internal execution lifecycle.

This is a very important boundary.

## Decided Now

### Decision 1: Viz API/DB creates the render job truth

We are deciding now that a render job begins with Viz API/DB creating a durable
render job record.

The render job record should exist before orchestration starts.

### Decision 2: Inngest orchestrates, but does not define truth

We are deciding now that Inngest may run the durable workflow, but the durable
render job truth still lives in Viz DB/API records.

### Decision 3: Every render job must reference a stable project version

We are deciding now that every hosted render job should record:

- `projectId`
- `projectVersionId`

The job must not depend on mutable working head state unless that is explicitly
modeled as a special draft render path.

### Decision 4: Render outputs are artifacts, not embedded payloads

We are deciding now that successful render outputs should be registered as
artifact references and linked back to the render job record.

### Decision 5: Magnify consumes outputs, but does not become render owner

We are deciding now that Magnify can request renders and reference outputs, but
Viz remains the system that owns:

- render job creation
- render job state transitions
- render output registration

## Render Job Ownership Model

The ownership split should be:

### Viz owns

- render job record
- input validation
- status transitions
- output artifact registration
- runtime/render adapter invocation
- retry semantics

### Inngest owns

- durable execution of the workflow
- retryable orchestration
- wait/retry coordination
- progress/event fan-out

### Magnify owns

- why a render was requested in content workflow terms
- which Magnify content item references the output
- what happens after the output is accepted

## Render Job Record

Preferred conceptual shape:

```ts
type VizRenderJob = {
  id: string;
  workspaceId: string;
  projectId: string;
  projectVersionId: string;
  status: VizRenderJobStatus;
  requestedByAccountId?: string;
  requestedBySystem?: "viz" | "magnify" | "other";
  sourceKind?: "manual" | "preview" | "candidate" | "final" | "integration";
  renderProfile?: string;
  outputArtifactId?: string;
  previewArtifactId?: string;
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

We should decide the first status model now.

Preferred statuses:

- `queued`
- `validating`
- `running`
- `succeeded`
- `failed`
- `cancelled`

Optional future additions:

- `retrying`
- `timed_out`
- `finalizing`

But the first set above is enough to keep the lifecycle clear.

## Status Transition Rules

Preferred lifecycle:

1. `queued`
2. `validating`
3. `running`
4. one of:
   - `succeeded`
   - `failed`
   - `cancelled`

### Rules

- `queued` is created by the API before orchestration starts
- `validating` means inputs and references are being checked
- `running` means actual render execution has started
- `succeeded` means output artifact registration is complete
- `failed` means the workflow is terminally unsuccessful
- `cancelled` means the job has been explicitly stopped or abandoned safely

## Lifecycle Flow

The intended hosted flow should be:

1. API receives render request
2. API validates request envelope shape
3. DB creates render job as `queued`
4. API emits orchestration event
5. workflow moves job to `validating`
6. workflow resolves project version, assets, baked artifacts
7. workflow moves job to `running`
8. workflow performs render
9. workflow registers output artifact
10. DB updates job to `succeeded`

If something fails:

- DB updates job to `failed`
- structured error info is recorded

## Input Validation Responsibilities

Validation should happen in two stages:

### Stage 1: API validation

Cheap envelope validation:

- request shape
- auth/access
- required IDs present

### Stage 2: workflow validation

Execution validation:

- project version exists
- artifacts are resolvable
- render profile is valid
- scene is render-compatible

This split is useful because it keeps request rejection fast while allowing
deeper execution checks inside the durable flow.

## Success Requirements

A render job should not be marked `succeeded` until:

- the output artifact exists
- the artifact is registered
- the render job record points to the artifact

Success must mean the result is actually consumable.

## Failure Model

Failures should be explicit and structured.

Preferred error fields:

- `errorCode`
- `errorMessage`
- optional logs or trace refs

Examples of useful error code categories:

- `PROJECT_VERSION_NOT_FOUND`
- `ASSET_NOT_FOUND`
- `BAKED_ARTIFACT_NOT_FOUND`
- `SCENE_VALIDATION_FAILED`
- `RENDER_EXECUTION_FAILED`
- `OUTPUT_ARTIFACT_REGISTRATION_FAILED`

## Retry Model

We should decide the basic retry posture now.

### Automatic retries

Automatic retries are appropriate for:

- transient infra errors
- temporary storage/network failures
- temporary worker failures

### Manual retries

Manual retries are appropriate for:

- invalid input corrected later
- fixed runtime bug after deploy
- resource issues resolved operationally

### Retry rule

Retry should reuse the same render job record or create a follow-up job?

### Decided now

The better first posture is:

- preserve the original render job record
- increment retry metadata on that job
- keep one canonical job identity unless there is a strong reason to fork a new
  job

Reason:

- easier operational reading
- simpler Magnify references
- simpler artifact/result lookup

We can add explicit rerun job spawning later if needed.

## Cancellation Model

Cancellation must be modeled explicitly.

Preferred cancellation flow:

1. API receives cancellation request
2. DB marks cancel intent
3. orchestration stops accepting new work for the job
4. if safe, running work is stopped or allowed to terminate cleanly
5. job status becomes `cancelled`

Important:

- cancellation should not silently delete partial records
- cancellation is a state transition, not record erasure

## Draft Render Exception

The default rule is versioned renders only.

But we should acknowledge the special case.

If draft/head renders are ever allowed:

- they must be explicitly marked in the job metadata
- they must not masquerade as stable published-version renders

This is a strict rule.

## Preview Vs Final Render

We should decide whether preview and final render are the same job type.

### Preferred posture

They can share the same conceptual lifecycle model, but should carry different
`sourceKind` or request metadata.

Examples:

- `preview`
- `candidate`
- `final`
- `integration`

This avoids duplicating job semantics while still distinguishing intent.

## Magnify Interaction Model

Magnify should interact with render jobs like this:

1. Magnify requests render through Viz API
2. Viz returns `renderJobId`
3. Magnify may poll status or receive updates
4. Magnify stores resulting artifact refs on its own content workflow state

Magnify should not:

- mutate Viz render job state directly
- bypass Viz API to "fix" job state
- assume artifact success before Viz marks the job successful

## Artifact Registration Model

Successful jobs should register:

- final output artifact
- optional preview artifact
- optional logs or trace artifact refs

Render jobs should point at those artifact ids explicitly.

This gives:

- traceability
- observability
- reproducibility

## Observability Requirements

Render jobs should be observable enough for:

- human debugging
- AI debugging
- Magnify integration monitoring

Preferred observable fields:

- status
- timestamps
- retry count
- artifact refs
- error code/message
- log refs

## Local-First Compatibility

This hosted render job model must not invalidate local rendering.

That means:

- local render remains possible without hosted render jobs
- hosted render job lifecycle is a product/cloud concern

The lifecycle model here is for Viz Cloud operations, not for forcing all Viz
usage into the cloud.

## Decisions Locked In Here

We are deciding all of this now:

1. Viz owns render jobs
2. Viz DB/API creates durable job truth
3. Inngest orchestrates but does not own truth
4. render jobs reference stable project versions
5. success means artifact registration is complete
6. retries are tracked on the same canonical job record initially
7. cancellation is explicit state transition, not deletion
8. Magnify consumes outputs but does not own Viz render lifecycle

## Next Docs To Write

The next strongest follow-up docs are:

1. auth and identity federation model
2. draft autosave and working head storage model
3. bake job ownership and lifecycle model

The first follow-up now exists here:

- [Bake Job Ownership And Lifecycle Model](./bake-job-ownership-and-lifecycle-model.md)
