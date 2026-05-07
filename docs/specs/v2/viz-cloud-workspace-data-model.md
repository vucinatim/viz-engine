# Viz Cloud Workspace Data Model

## Purpose

This document defines the first concrete data model direction for Viz Cloud.

It exists to answer:

- what the hosted product actually stores
- how workspaces and projects should be modeled
- how versions, assets, baked artifacts, and renders should relate
- what Magnify should reference

This is a product data model and integration model document.

It is not yet a database schema.

## Design Goals

The data model should support:

- standalone Viz Cloud usage
- team/workspace collaboration
- project versioning
- baked artifact reuse
- cloud rendering
- AI-driven authoring and logging
- clean Magnify integration

It should also preserve:

- local-first compatibility
- open-core boundaries
- API-first integration

## Core Rule

Viz Cloud stores product and collaboration state.

The canonical scene semantics still live in:

- Viz project documents
- baked artifacts
- runtime contracts

Viz Cloud should store and manage those artifacts well, but it should not invent
separate scene semantics.

## Main Entity Families

The first entity families should be:

1. account
2. workspace
3. membership
4. project
5. project version
6. asset
7. baked artifact
8. render job
9. integration link
10. AI session and action log

## Account

An account is the identity root for a user or system actor in Viz Cloud.

Preferred conceptual fields:

```ts
type VizAccount = {
  id: string;
  email?: string;
  displayName?: string;
  kind: "human" | "service";
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
};
```

## Workspace

A workspace is the top-level collaboration boundary.

Projects, assets, baked artifacts, and jobs should generally belong to a
workspace.

Preferred conceptual fields:

```ts
type VizWorkspace = {
  id: string;
  slug: string;
  name: string;
  ownerAccountId?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
};
```

## Membership

Membership defines who has access to a workspace.

Preferred conceptual fields:

```ts
type VizWorkspaceMembership = {
  id: string;
  workspaceId: string;
  accountId: string;
  role: "owner" | "admin" | "editor" | "viewer" | "agent";
  createdAt: string;
  updatedAt: string;
};
```

We are not deciding the full permission matrix yet, but role-based access is
the right starting point.

## Project

A project is the stable identity for a visual scene over time.

It is not the mutable scene content itself.

The mutable content should live in project versions.

Preferred conceptual fields:

```ts
type VizProject = {
  id: string;
  workspaceId: string;
  slug: string;
  title: string;
  description?: string;
  currentVersionId?: string;
  archivedAt?: string | null;
  createdByAccountId?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
};
```

## Project Version

This is one of the most important entities in the system.

A project version is the immutable or effectively immutable snapshot of a scene
used for:

- reproducibility
- approvals
- render stability
- Magnify references

Preferred conceptual fields:

```ts
type VizProjectVersion = {
  id: string;
  projectId: string;
  workspaceId: string;
  versionNumber: number;
  status: "draft" | "published" | "archived";
  documentArtifactId: string;
  basedOnVersionId?: string;
  createdByAccountId?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};
```

## Key Decision

Magnify should generally reference a `projectVersionId`, not just a `projectId`.

That gives:

- reproducibility
- stable previews
- stable renders
- clear review semantics

## Asset

Assets represent user-managed source inputs such as:

- audio
- image
- video
- model
- text

Preferred conceptual fields:

```ts
type VizAsset = {
  id: string;
  workspaceId: string;
  kind: "audio" | "image" | "video" | "model" | "text" | "other";
  label: string;
  artifactId: string;
  createdByAccountId?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
};
```

Assets should usually point at an underlying stored artifact rather than
duplicating file storage semantics directly in the data model.

Important future direction:

- not every derived thing is a baked artifact
- manipulated media such as trimmed video loops or cropped image variants should
  usually become explicit managed derived assets with provenance

This will matter for serious image/video workflows.

## Baked Artifact

Baked artifacts represent derived reusable data such as:

- audio feature timeline
- beat/onset map
- waveform summary
- simulation checkpoints
- simulation frame cache

Preferred conceptual fields:

```ts
type VizBakedArtifact = {
  id: string;
  workspaceId: string;
  kind: string;
  sourceProjectVersionId?: string;
  sourceAssetId?: string;
  artifactId: string;
  createdByAccountId?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};
```

## Render Job

Render jobs are hosted execution records.

They are product-level operational records, not scene semantics.

Preferred conceptual fields:

```ts
type VizRenderJob = {
  id: string;
  workspaceId: string;
  projectId: string;
  projectVersionId: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  requestedByAccountId?: string;
  outputArtifactId?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
};
```

## Integration Link

Integration links represent durable connections between Viz and external systems
such as Magnify.

Preferred conceptual fields:

```ts
type VizIntegrationLink = {
  id: string;
  workspaceId: string;
  provider: "magnify" | string;
  externalWorkspaceId?: string;
  externalProjectId?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
};
```

This should not be treated as the only way integrations work, but it is a good
place to store durable linkage and sync metadata.

## AI Session And Action Log

Since Viz is AI-native, Viz Cloud should be able to store AI work history in a
structured way.

Preferred conceptual entities:

- AI session
- action log
- preview artifact or result refs

Preferred conceptual shapes:

```ts
type VizAiSession = {
  id: string;
  workspaceId: string;
  projectId?: string;
  projectVersionId?: string;
  actorAccountId?: string;
  status: "active" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
};
```

```ts
type VizAiActionLog = {
  id: string;
  workspaceId: string;
  aiSessionId?: string;
  actionType: string;
  projectId?: string;
  projectVersionId?: string;
  createdAt: string;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
};
```

## Artifact Storage Relationship

Viz Cloud should separate:

- product metadata in the database
- heavy content in artifact/object storage

That means:

- project version document payloads should generally be stored as artifacts
- source assets should be stored as artifacts
- baked artifacts should be stored as artifacts
- render outputs should be stored as artifacts

The database stores references and operational metadata.

## Version Publication Model

We should decide the initial publication model now.

Preferred flow:

1. a project has a mutable working head in the editor
2. when the user or agent decides to publish a stable revision, a new project
   version is created
3. Magnify generally points to the published version

This means the mutable editing flow and stable external integration flow stay
cleanly separated.

We are not deciding the full draft autosave model yet, but this stable version
boundary is the right backbone.

The deeper publication workflow now lives here:

- [Project Version Publication Workflow](./project-version-publication-workflow.md)

## Magnify Reference Model

Magnify should generally store or resolve:

- `vizWorkspaceId`
- `vizProjectId`
- `vizProjectVersionId`
- optional `vizRenderJobId`
- optional cached artifact ids

Magnify should not rely on:

- direct Viz database reads
- mutable editor session state
- raw internal implementation details

## Local-First Compatibility

This cloud model must not make local projects second-class.

That means the core contracts should still support:

- project document export/import
- artifact bundle export/import
- local render
- local bake

Viz Cloud data entities should wrap and manage these capabilities, not replace
them conceptually.

## Operational Ownership

This is an important product/system boundary.

### Viz Cloud should own:

- workspace/project storage
- version storage
- asset storage
- bake job records
- render job records
- AI activity records

### Magnify should own:

- content workflow state
- approvals
- scheduling
- upload routing
- publication history

### Shared boundary:

- refs
- artifacts
- API calls

## What We Are Not Deciding Yet

Still intentionally open:

- exact SQL schema
- exact role/permission matrix
- exact draft autosave mechanics
- exact branching/forking model for projects
- exact billing model

Those should come after the data model direction is accepted.

## Decisions Locked In Here

We are deciding all of this now:

1. workspace is the top-level collaboration boundary
2. project is the stable identity of a scene
3. project version is the stable renderable/referencable revision
4. assets and baked artifacts are first-class managed entities
5. render jobs are hosted operational records
6. AI sessions and action logs are worth storing as product entities
7. Magnify should reference Viz versions and artifacts, not Viz internals

## Next Docs To Write

The next strongest follow-up docs are:

1. Viz to Magnify integration API spec
2. project version publication workflow
3. render job ownership model
4. auth and identity federation model
