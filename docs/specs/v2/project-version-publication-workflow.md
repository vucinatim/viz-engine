# Project Version Publication Workflow

## Purpose

This document defines how VizEngine V2 should move from:

- mutable active editing state

to:

- stable project versions

that can be referenced by:

- Viz Cloud
- Magnify
- render jobs
- review workflows

This is one of the most important product and integration workflows in the
system.

## Core Goal

We need a workflow that supports both:

- fast ongoing editing
- stable reproducible external references

The main risk this document solves is ambiguity between:

- current working scene state
- approved or stable published scene state

## Core Rule

There must always be a clear distinction between:

1. editable working head
2. stable project version

Magnify should generally reference stable project versions, not mutable working
head state.

## Decided Now

### Decision 1: Every project has a mutable working head

We are deciding now that editing should happen against a mutable working head.

This is where:

- humans edit
- AI agents mutate scenes
- drafts evolve rapidly

The working head is not the same thing as a stable project version.

### Decision 2: Stable versions are explicitly created

We are deciding now that a stable project version should be created through an
explicit publish/version creation action.

That means:

- versions are not accidental autosave snapshots
- versions are not inferred implicitly from edit history
- stable references are intentional

### Decision 3: Magnify should reference versions, not working head

We are deciding now that Magnify should generally store:

- `projectId`
- `projectVersionId`

and should not rely on the current mutable draft by default.

### Decision 4: Draft preview is allowed, but must be explicit

We are deciding now that previewing mutable working head state from Magnify is
allowed only as an explicitly requested draft workflow.

It should never happen silently.

### Decision 5: Render jobs should record the exact version used

We are deciding now that every hosted render job should record:

- `projectVersionId`

as part of its durable execution metadata.

This is required for:

- reproducibility
- debugging
- approvals
- auditability

## Conceptual State Model

The publication workflow should distinguish these conceptual states:

- working head
- draft version
- published version
- archived version

## Recommended Interpretation

### Working Head

The mutable editor state for a project.

This may be autosaved frequently.

It is not a stable external reference by default.

### Draft Version

An explicit named or cut version that is stable enough to inspect or review,
but not yet considered the chosen published version.

Useful for:

- checkpoints
- candidate reviews
- AI-generated alternatives
- branch-like experimentation without full branching semantics yet

### Published Version

The stable version intended for reliable preview, render, and integration use.

This should usually be the default target for:

- Magnify references
- stable preview
- candidate render generation

### Archived Version

A historical version retained for traceability but no longer active.

## Why This Model

This model is strong because it avoids two bad extremes:

### Bad Extreme 1

Everything is just a mutable draft.

This breaks:

- reproducibility
- approvals
- stable handoff

### Bad Extreme 2

Every tiny change becomes a formal published version.

This creates:

- noise
- version sprawl
- friction

The working-head plus explicit-version model is the right balance.

## Workflow Shape

The intended publication flow should look like this:

1. a project exists
2. editor and AI mutate the working head
3. the user or agent chooses to cut a version
4. that version is stored as a stable project version artifact
5. the version may remain `draft` or be marked `published`
6. Magnify usually links to the selected published version
7. render jobs run against that exact version

## Version Creation Action

Preferred conceptual action:

```ts
type CreateProjectVersionAction = {
  type: "project.version.create";
  payload: {
    projectId: string;
    status?: "draft" | "published";
    title?: string;
    note?: string;
  };
};
```

## What Version Creation Should Do

When a version is created, the system should:

1. capture the current working head scene document
2. resolve or record relevant artifact refs
3. store a stable `documentArtifactId`
4. assign a `versionNumber`
5. persist metadata about creator and source context

The result should be a stable project version object.

## Publication Action

Preferred conceptual action:

```ts
type PublishProjectVersionAction = {
  type: "project.version.publish";
  payload: {
    projectId: string;
    projectVersionId: string;
  };
};
```

## Publishing Behavior

When a version is published:

- it becomes the project's selected stable version
- it becomes the default external integration target
- it may replace the prior published version as the default active version

Important:

- old published versions should remain addressable
- publication should not destroy historical versions

## Current Version Pointer

Projects should generally maintain a pointer like:

- `currentVersionId`

But we should define what it means.

### Decided meaning

`currentVersionId` should mean:

- the currently selected stable version for external usage

It should not mean:

- the current mutable working head

This distinction is critical.

## Draft Head Storage

We are not defining full editor storage mechanics yet, but the data model should
assume there is some concept of:

- current draft document state

That may be:

- stored as a mutable draft artifact
- stored as frequent autosave state
- stored as a latest working document

But regardless of mechanism, it is not the same as a published version.

The deeper working-head storage model now lives here:

- [Draft Autosave And Working Head Storage Model](./draft-autosave-and-working-head-storage-model.md)

## Magnify Interaction Rules

These need to be explicit.

### Default Magnify rule

Magnify should reference:

- `projectVersionId`

and that should usually be:

- the published version

### Draft exception rule

If Magnify wants preview of working head or draft state, it must request a
draft-mode preview explicitly.

That should be treated as:

- ephemeral
- non-approval-safe
- non-default

### Render rule

Final or candidate renders used in workflow should generally run against stable
versioned documents, not mutable draft head.

## Approval And Review Implications

This workflow is designed to support review later without changing the core
model.

Because versions are stable:

- reviews can target versions
- approvals can target versions
- rejection can leave the working head untouched while keeping the approved
  version stable

This is much cleaner than approval against mutable drafts.

## AI Workflow Implications

This model is also strong for AI-native authoring.

AI can:

- iterate rapidly on working head
- cut explicit draft versions for checkpoints
- publish a chosen version intentionally

This gives a very clean machine-operable workflow:

- generate
- inspect
- version
- compare
- publish

## Artifact Relationship

Each stable project version should point at:

- a stable project document artifact

It may also record or summarize:

- dependent source assets
- relevant baked artifacts
- default render profile metadata

But the main requirement is:

- versioned scene document artifact must be stable and reproducible

## Render Relationship

Every render job should record:

- `projectVersionId`
- optional input profile
- output artifact id

This allows:

- exact reruns
- auditing
- review traceability

## Optional Future Extensions

This workflow should support, but does not require yet:

- named branches
- formal compare/diff between versions
- release tags
- protected publish flows
- approval gates before publication

These can be layered on later without breaking the core model.

## Failure Modes This Prevents

This workflow is specifically meant to prevent:

- Magnify pointing at silently changed draft state
- inability to reproduce render outputs
- confusion over what was approved
- accidental overwrite of externally referenced scene state

## Decisions Locked In Here

We are deciding all of this now:

1. working head is mutable
2. stable versions are explicit
3. published versions are the default integration target
4. Magnify references versions, not draft head
5. draft preview must be explicit
6. render jobs record exact project version

## Next Docs To Write

The next strongest follow-up docs are:

1. render job ownership and lifecycle model
2. auth and identity federation model
3. draft autosave and working head storage model
