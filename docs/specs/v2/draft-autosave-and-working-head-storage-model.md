# Draft Autosave And Working Head Storage Model

## Purpose

This document defines how VizEngine V2 should handle mutable in-progress scene
state.

It exists to answer:

- what the working head actually is
- where mutable draft state lives
- how autosave should behave
- how draft state differs from stable versions
- how local-first and cloud-hosted editing should coexist

This is the missing operational counterpart to the project version publication
workflow.

## Core Goal

We need a working model that supports:

- fast iteration
- AI-heavy mutation workflows
- crash resilience
- local-first usability
- clean separation from stable published versions

## Core Rule

Working head state is mutable operational editing state.

It is not the same as:

- a stable project version
- a published version
- a render-safe external reference

This distinction must stay hard.

## Decided Now

### Decision 1: Every project has exactly one active working head

We are deciding now that each project should have one primary mutable working
head.

This is the main active editing state for:

- human edits
- AI scene mutations
- autosave
- preview iteration

We are not introducing branching as a default editing primitive yet.

### Decision 2: Autosave should target the working head, not create stable versions

We are deciding now that autosave updates the mutable working head.

Autosave should not:

- silently create published versions
- silently create externally referenced stable versions

Stable versions remain explicit actions.

### Decision 3: Working head state should be durable enough for recovery

We are deciding now that working head state should be persisted durably enough
to recover from:

- refresh
- crash
- browser restart
- temporary disconnects

This does not mean every tiny UI gesture must be committed synchronously.

### Decision 4: Cloud and local working head semantics should match

We are deciding now that the conceptual working-head model should be the same
for:

- local OSS use
- Viz Cloud use

The storage backends may differ, but the editing semantics should stay aligned.

### Decision 5: Magnify should never rely on working head by default

We are deciding now that Magnify should never treat working head as the default
source for stable preview or final render.

Draft use from Magnify must remain explicit.

## Conceptual Model

The system should distinguish:

1. editor UI state
2. working head document state
3. project versions

### Editor UI state

Examples:

- selected layer
- open panel
- viewport position
- drag in progress
- hovered node

This is ephemeral UI state and should not be treated as scene content.

### Working head document state

This is the mutable scene content currently being edited.

Examples:

- layer list
- config values
- graph structure
- asset refs
- timing
- scene-level settings

This is real scene content, but not yet a stable external version.

### Project versions

These are explicit stable snapshots created from the working head when the user
or agent decides to cut a version.

## Working Head Shape

The cleanest early model is:

- working head uses the same canonical scene document shape as published
  versions
- the difference is lifecycle and storage semantics, not a separate scene model

This is a very important decision.

We should not invent:

- one document model for draft
- another document model for published

That would create drift and complexity immediately.

## Preferred Conceptual Shape

```ts
type VizWorkingHead = {
  projectId: string;
  workspaceId?: string;
  document: VizProjectDocument;
  revision: number;
  updatedAt: string;
  updatedByAccountId?: string;
  dirty: boolean;
  metadata?: Record<string, unknown>;
};
```

## Storage Direction

The storage mechanism may differ by environment, but the conceptual target is:

- one durable latest working document
- plus optional local/session buffering

### Local OSS direction

Local mode can store working head in local persistence such as:

- local files
- browser storage
- local app storage

depending on app architecture later.

### Viz Cloud direction

Viz Cloud should store working head durably enough that an authenticated user
can resume work across sessions and devices.

We are not deciding the exact storage table/artifact strategy yet, but it
should behave as one current mutable draft state per project.

## Autosave Behavior

We should decide the autosave posture now.

### Preferred autosave model

Autosave should be:

- frequent
- debounced or buffered
- best-effort fast
- durable enough for recovery

### Autosave should respond to meaningful scene mutations

Examples:

- layer add/remove/reorder
- config value changes
- graph add/remove/connect/update
- timing changes
- asset reference changes

### Autosave should not fire for pure UI noise

Examples:

- hover changes
- panel resizing
- viewport pan
- temporary drag ghost state

## Save Granularity

We should decide this clearly.

### Preferred first posture

Persist full working head documents initially.

Reason:

- simpler
- clearer
- easier AI reasoning
- easier correctness

We can add patch/diff optimization later if needed.

This is a deliberate simplicity choice.

## Revision Tracking

Working head should carry a monotonically increasing revision number or similar
change token.

Reason:

- conflict detection
- optimistic concurrency
- debugging
- AI/session coordination

Preferred conceptual field:

- `revision`

## Dirty State

The editor/runtime may keep a dirty flag for UX and save coordination, but the
source of truth should still be:

- the latest persisted working head
- plus current in-memory edits not yet flushed

Dirty state is a coordination concept, not a stable scene identity concept.

## AI Mutation Relationship

The working head model must be good for AI-native usage.

That means AI actions should generally:

- mutate the working head
- trigger autosave or explicit save
- optionally cut draft or published versions from that working head

This is the correct default authoring loop.

We should not force AI to create a stable version for every small iteration.

## Version Creation Relationship

The relationship to versioning should be:

1. edit working head
2. autosave working head
3. optionally inspect/preview working head
4. explicitly create version when needed
5. optionally publish version

That keeps the workflow clean.

## Draft Preview Relationship

Preview should be allowed against working head state.

That is one of the main reasons working head exists.

But:

- working-head preview is not the same as stable published preview
- integrations must label it explicitly when that matters

## Render Relationship

We should be strict here.

### Default rule

Hosted render jobs should use stable project versions.

### Exception rule

Working-head render is allowed only if explicitly requested as draft render.

If this happens, the render job metadata must say so clearly.

## Conflict Posture

We are not designing full collaborative editing yet, but the working-head model
should not block it.

Preferred early posture:

- last-write-wins is acceptable initially if bounded by revision checks
- detect mismatched revision on save attempts
- introduce stronger merge or collaboration semantics later only if needed

This is intentionally pragmatic.

## Local-First Compatibility

The working-head model should remain valid offline or without Viz Cloud.

That means:

- working head is a core editing concept
- cloud persistence is one backend for it
- local persistence is another backend for it

This is another reason to keep the document shape canonical.

## Failure Recovery Expectations

Working head persistence should be good enough that a user does not lose major
scene work due to:

- refresh
- crash
- minor connectivity issues

We are not guaranteeing zero-loss collaborative editing yet.

We are guaranteeing that working head is treated as important product state.

## What Working Head Must Not Become

Working head must not become:

- a hidden pseudo-versioning system
- a silent published-version replacement
- an integration-safe stable reference by accident

This is the main risk to guard against.

## Decisions Locked In Here

We are deciding all of this now:

1. every project has one primary working head
2. autosave targets working head, not stable versions
3. working head uses the same canonical scene document shape
4. full-document autosave is the preferred first posture
5. working head should be durably recoverable
6. AI primarily mutates working head
7. Magnify should not rely on working head by default

## Next Docs To Write

The next strongest follow-up docs are:

1. bake job ownership and lifecycle model
2. linked-account and SSO flow design
3. local persistence and import/export model
