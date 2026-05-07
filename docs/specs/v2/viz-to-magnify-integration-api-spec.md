# Viz To Magnify Integration API Spec

## Purpose

This document defines the intended integration contract between VizEngine and
Magnify Core.

It exists to answer:

- what Magnify should store
- what Viz should expose
- how linking, preview, and render should work
- which system owns what responsibility

This is an API and system-boundary document, not a transport-specific
implementation.

## Design Goals

The integration should be:

- deep
- explicit
- reproducible
- provider-agnostic
- safe for future product growth

It should avoid:

- manual copy-paste handoffs
- shared database coupling
- duplicate scene semantics
- ambiguous render ownership

## Core Rule

Magnify should integrate with Viz through:

- identifiers
- artifacts
- APIs
- stable version references

Magnify should not integrate with Viz through:

- direct Viz database reads
- editor-only state
- mutable draft scene assumptions

## Systems And Responsibilities

### Viz owns

- scene authoring
- scene document semantics
- baked artifact semantics
- runtime semantics
- preview semantics
- Viz-specific render adapter behavior

### Magnify owns

- content workflows
- review and approval state
- scheduling
- upload routing
- publication operations

### Shared boundary

- workspace/project/version references
- artifact references
- render/preview requests
- integration metadata

## Main Integration Objects

The integration should revolve around:

- Viz workspace reference
- Viz project reference
- Viz project version reference
- preview request/result
- render request/result
- integration link metadata

## Magnify-Side Reference Model

Magnify should generally store:

```ts
type MagnifyVizReference = {
  vizWorkspaceId: string;
  vizProjectId: string;
  vizProjectVersionId: string;
  vizRenderProfile?: string;
  vizIntegrationLinkId?: string;
  cachedPreviewArtifactId?: string;
  cachedRenderArtifactId?: string;
  metadata?: Record<string, unknown>;
};
```

Key rule:

- `vizProjectVersionId` is the important stable reference

## Core Flows

The first integration should support four core flows:

1. link Viz project
2. open Viz from Magnify
3. preview Viz from Magnify
4. render Viz for Magnify workflows

## Flow 1: Link Viz Project

Magnify should be able to attach a Viz project/version reference to a content
item or candidate.

Preferred conceptual flow:

1. user or agent chooses a Viz workspace/project/version
2. Magnify stores the stable reference
3. Magnify may optionally cache summary metadata and preview refs

### Preferred API shape

This can be an internal Magnify action or cross-system API call, but the
meaning should be:

```ts
type LinkVizProjectRequest = {
  magnifyContentId: string;
  vizWorkspaceId: string;
  vizProjectId: string;
  vizProjectVersionId: string;
  vizRenderProfile?: string;
};
```

```ts
type LinkVizProjectResult = {
  ok: boolean;
  reference?: MagnifyVizReference;
  warnings?: string[];
  errors?: string[];
};
```

## Flow 2: Open Viz From Magnify

Magnify should be able to deep-link into Viz Cloud so the user or agent can
work on the correct project directly.

Preferred conceptual response from Viz:

```ts
type VizOpenLinkResponse = {
  url: string;
  workspaceId: string;
  projectId: string;
  projectVersionId?: string;
};
```

This should support:

- current editable project head
- specific stable version view

## Flow 3: Preview Viz From Magnify

Magnify should be able to request a stable preview for a selected Viz version.

This preview may be:

- image preview
- short clip preview
- metadata summary

### Preferred request shape

```ts
type VizPreviewRequest = {
  workspaceId: string;
  projectId: string;
  projectVersionId: string;
  frame?: number;
  startFrame?: number;
  durationFrames?: number;
  width?: number;
  height?: number;
  profile?: string;
};
```

### Preferred result shape

```ts
type VizPreviewResult = {
  ok: boolean;
  artifactId?: string;
  previewUrl?: string;
  width?: number;
  height?: number;
  frameCount?: number;
  warnings?: string[];
  errors?: string[];
};
```

Key rule:

- preview should be derived from the selected `projectVersionId`
- preview should not silently resolve against mutable working draft state unless
  explicitly requested

## Flow 4: Render Viz For Magnify

This is the most important integration path.

Magnify should be able to request final or candidate renders against a stable
Viz project version.

### Preferred request shape

```ts
type VizRenderRequest = {
  workspaceId: string;
  projectId: string;
  projectVersionId: string;
  profile?: string;
  output: {
    format: "mp4" | "webm" | "png" | "jpeg";
    width?: number;
    height?: number;
    fps?: number;
    startFrame?: number;
    durationFrames?: number;
  };
  caller: {
    system: "magnify";
    contentId?: string;
    runId?: string;
  };
};
```

### Preferred result shape

```ts
type VizRenderResult = {
  ok: boolean;
  renderJobId?: string;
  artifactId?: string;
  status: "queued" | "running" | "succeeded" | "failed";
  warnings?: string[];
  errors?: string[];
};
```

## Synchronous Vs Asynchronous Render

We should decide this now:

- preview requests may be synchronous for small cases
- final render should be modeled as asynchronous by default

Reason:

- render duration variability
- hosted job ownership clarity
- operational observability

The deeper render-job lifecycle now lives here:

- [Render Job Ownership And Lifecycle Model](./render-job-ownership-and-lifecycle-model.md)

## Render Job Ownership

The cleanest starting posture is:

- Viz owns Viz-scene render jobs
- Magnify references and consumes their outputs

This means if Magnify requests a Viz render:

- Viz creates and owns the render job record
- Viz returns `renderJobId`
- Magnify polls or receives status updates
- Magnify stores the resulting artifact reference

This keeps render semantics close to the Viz runtime.

## Polling And Status

Preferred conceptual read shape:

```ts
type VizRenderJobStatusResponse = {
  renderJobId: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  artifactId?: string;
  previewArtifactId?: string;
  logs?: string[];
  error?: string;
};
```

## Version Selection Rules

We should make this explicit:

### Default rule

Magnify should use a published or explicitly selected stable
`projectVersionId`.

### Exception rule

If Magnify wants a draft preview workflow, it must request that explicitly.

This avoids silent ambiguity between:

- current editing head
- stable reviewed version

The deeper version/publication workflow now lives here:

- [Project Version Publication Workflow](./project-version-publication-workflow.md)

## Artifact Handoff

The integration should use explicit artifact ids/refs.

Viz should return:

- preview artifact ids
- render output artifact ids
- optional baked artifact ids when relevant

Magnify may cache those refs, but it should not become the owner of Viz scene
semantics.

## Metadata Summary Endpoint

Magnify will likely need a lightweight read model without downloading full
scene artifacts every time.

Preferred conceptual summary response:

```ts
type VizProjectVersionSummary = {
  workspaceId: string;
  projectId: string;
  projectVersionId: string;
  title: string;
  width: number;
  height: number;
  fps: number;
  durationFrames?: number;
  componentIds: string[];
  assetCounts: Record<string, number>;
  bakedArtifactCounts: Record<string, number>;
  createdAt: string;
  createdByAccountId?: string;
  status: "draft" | "published" | "archived";
};
```

This should be cheap for Viz to produce and enough for Magnify to display
references cleanly.

## Authorization Posture

We are not defining auth mechanics fully here, but the integration should
assume:

- Magnify is an authenticated client of Viz
- workspace access is enforced by Viz
- integration requests are authorized through API/auth boundaries

Not through:

- database trust
- implicit local network trust

## Integration Modes

The API should support at least two practical deployment modes:

### Mode 1: Viz Cloud Hosted

Magnify talks to Viz Cloud APIs directly.

This is the default long-term product mode.

### Mode 2: Local/Artifact Mode

Magnify works from exported Viz artifacts or local integration adapters without
live Viz Cloud dependency.

This preserves local-first and resilience.

## Failure Handling

Magnify needs predictable failure semantics.

Preferred result posture:

- explicit `ok`
- explicit `warnings`
- explicit `errors`
- stable job status

Do not rely on human-readable strings as the only integration signal.

## No Shared Scene Ownership

This is one of the most important decisions.

Magnify should not mutate Viz scene internals directly.

If Magnify needs scene changes, it should:

- call Viz actions/APIs
- or route the user/agent into Viz

Viz remains the owner of scene editing semantics.

## Decisions Locked In Here

We are deciding all of this now:

1. Magnify stores stable Viz references, especially `projectVersionId`
2. open/deep-link behavior is first-class
3. preview is a first-class integration API
4. final render is asynchronous by default
5. Viz owns Viz render jobs
6. artifacts are the primary output handoff seam
7. authorization is API-level, not DB-level
8. local/artifact mode should remain possible

## Next Docs To Write

The next strongest follow-up docs are:

1. project version publication workflow
2. render job ownership and lifecycle model
3. auth and identity federation model
