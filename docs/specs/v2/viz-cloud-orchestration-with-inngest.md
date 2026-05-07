# Viz Cloud Orchestration With Inngest

## Purpose

This document defines how Inngest should fit into Viz Cloud.

It exists to answer:

- whether Viz should use Inngest
- which layer should use it
- what Inngest should own
- what Inngest must not own

This is an orchestration-boundary document.

It is not a scene-runtime document.

## Core Decision

Viz should think about using Inngest, but only for Viz Cloud orchestration.

It should not be used as the core architecture of:

- Viz runtime
- Viz scene semantics
- Viz editor semantics

The clean model is:

- Viz contracts define truth of scene shape
- Viz runtime defines scene execution semantics
- Viz Cloud database/API defines hosted product truth
- Inngest coordinates durable hosted workflows around that truth

## Why Inngest Fits

Inngest is a strong fit for:

- durable multi-step jobs
- retries
- long-running background workflows
- queued rendering
- bake workflows
- AI workflow orchestration
- delayed or event-driven follow-ups

That makes it a good match for Viz Cloud product operations.

## Why Inngest Should Not Own The Core

Inngest is not the right place to define:

- scene document semantics
- frame evaluation semantics
- node graph semantics
- editor state
- the product database of truth

If we let Inngest leak into those layers, we will create a workflow-shaped
engine instead of a clean runtime-plus-product architecture.

## Decided Now

### Decision 1: Inngest belongs to Viz Cloud, not Viz core

We are deciding now that Inngest should be treated as an optional durable
orchestration substrate for the hosted product layer.

It should not be a required dependency of:

- local-only Viz usage
- local runtime execution
- local rendering
- project document semantics

### Decision 2: Viz Cloud DB/API remains source of truth

We are deciding now that even when Inngest is used:

- Viz Cloud DB/API remains the product truth
- Inngest coordinates durable work around that truth

This is the same good boundary Magnify is already following.

### Decision 3: Heavy artifacts stay out of Inngest state

We are deciding now that:

- large scene blobs
- media artifacts
- baked data payloads
- render outputs

should not live inside Inngest function state.

Inngest should pass:

- IDs
- refs
- small typed payloads

## Allowed Responsibilities

Good Inngest responsibilities for Viz Cloud:

- render job orchestration
- bake job orchestration
- version publication side effects
- AI workflow orchestration
- integration-triggered follow-up work
- retries and delayed retry workflows
- progress/event fan-out

## Forbidden Responsibilities

Bad Inngest responsibilities:

- storing the canonical project document
- being the only audit ledger
- owning workspace truth
- owning project version truth
- owning render artifact storage
- owning editor mutation semantics
- serving as a substitute for a product API

## Product Truth Split

This is the intended split:

### Viz Cloud DB/API owns

- accounts
- workspaces
- memberships
- projects
- project versions
- assets
- baked artifact records
- render job records
- AI session records

### Inngest owns

- durable workflow execution
- retries
- workflow progress
- event coordination

### Artifact storage owns

- project document artifacts
- source asset bytes
- baked artifact bytes
- render output bytes

## First Good Workflow Families

The first workflow families where Inngest makes sense are:

1. render workflows
2. bake workflows
3. AI workflows
4. integration workflows

The deeper bake lifecycle now lives here:

- [Bake Job Ownership And Lifecycle Model](./bake-job-ownership-and-lifecycle-model.md)

## 1. Render Workflows

Examples:

- `viz.render.requested`
- `viz.render.retry-requested`
- `viz.render.cancel-requested`

Typical responsibilities:

- validate render request
- load project version refs
- resolve assets/baked artifacts
- invoke render execution
- persist status transitions
- register output artifact refs

## 2. Bake Workflows

Examples:

- `viz.bake.audio-features.requested`
- `viz.bake.simulation-checkpoints.requested`

Typical responsibilities:

- resolve source inputs
- execute bake logic
- register baked artifact refs
- attach outputs to project/version context where appropriate

## 3. AI Workflows

Examples:

- `viz.ai.scene-generate.requested`
- `viz.ai.scene-refine.requested`
- `viz.ai.variant-generate.requested`

Typical responsibilities:

- coordinate multi-step AI flows
- persist AI session status
- record action logs
- cut draft versions or publish versions if requested

## 4. Integration Workflows

Examples:

- `viz.integration.magnify.preview.requested`
- `viz.integration.magnify.render.requested`
- `viz.integration.magnify.version-linked`

Typical responsibilities:

- validate external refs
- request or queue preview/render work
- persist integration status and output refs

## Event Design Direction

The first Inngest event design should stay small and reference-based.

Preferred pattern:

```ts
type VizRenderRequestedEvent = {
  name: "viz.render.requested";
  data: {
    workspaceId: string;
    projectId: string;
    projectVersionId: string;
    renderJobId: string;
  };
};
```

And not:

- giant embedded scene payloads
- large encoded media blobs
- ad hoc mutable draft state dumps

## Function Design Rules

If Viz Cloud uses Inngest, functions should follow these rules:

1. function-top-level logic stays small and deterministic
2. non-deterministic work lives inside steps
3. heavy payloads move through IDs and artifact refs
4. DB state is updated explicitly
5. outputs are registered as artifacts and records

## Render Job Orchestration Model

The clean render job model with Inngest should look like:

1. API receives render request
2. DB creates render job record as `queued`
3. API emits `viz.render.requested`
4. Inngest executes durable workflow
5. workflow updates render job status
6. workflow writes output artifact refs
7. DB remains the source of truth for final status

This is important:

- API and DB create truth
- Inngest executes the durable workflow

Not the other way around.

The deeper render-job lifecycle now lives here:

- [Render Job Ownership And Lifecycle Model](./render-job-ownership-and-lifecycle-model.md)

## Bake Job Orchestration Model

The bake model should mirror render:

1. API receives bake request
2. DB creates bake job or artifact-prep record
3. API emits bake event
4. Inngest runs bake flow
5. DB/artifact refs are updated

## AI Workflow Model

The AI workflow model should also be durable and observable:

1. API creates AI session record
2. API emits AI workflow event
3. Inngest coordinates AI steps
4. AI action logs are persisted
5. results are written back as working-head changes, draft versions, or
   published versions depending on the request

## Magnify Relationship

If Magnify triggers Viz Cloud behavior, Magnify should still talk to Viz
through Viz APIs or explicit integration events.

Magnify should not emit raw assumptions into Viz internals.

The boundary should stay:

- Magnify triggers request
- Viz API persists truth
- Viz API emits Inngest event
- Inngest orchestrates work

That keeps ownership clean.

## Connect Vs Serve Posture

We are not making a deep infrastructure commitment here, but the current
high-level posture should be:

- if Inngest is used seriously for hosted workers, prefer the worker-oriented
  model that best fits long-running job execution
- do not shape the whole Viz architecture around a thin HTTP-only workflow view

The exact deployment mode can be finalized later.

## Local-First Compatibility

The use of Inngest must not make local-only Viz invalid.

That means:

- local OSS usage must still work without Inngest
- local render and bake must still be possible
- cloud orchestration is an enhancement layer

This is a very important product rule.

## When Not To Use Inngest

Do not use Inngest for:

- per-frame work
- local preview loop
- scene graph evaluation
- editor autosave on every tiny mutation
- giant scene payload transport

If a workflow is not truly durable/multi-step/background-oriented, it probably
does not belong in Inngest.

## Decisions Locked In Here

We are deciding all of this now:

1. Inngest is a good fit for Viz Cloud orchestration
2. Inngest is not a fit for Viz core runtime semantics
3. Viz Cloud DB/API remains source of truth
4. IDs and artifact refs are the main workflow payload shape
5. render, bake, AI, and integration flows are the first good Inngest targets
6. local-first Viz must remain fully possible without Inngest

## Next Docs To Write

The next strongest follow-up docs are:

1. render job ownership and lifecycle model
2. auth and identity federation model
3. draft autosave and working head storage model
