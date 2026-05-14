# Rich Scene Authoring And Debugging Implementation Plan

## Purpose

This plan implements Phase 5 from the
[Agent-Operated Live Editor Roadmap](./agent-operated-live-editor-roadmap.md).

The goal is to make the real editor surface a truthful shared inspection and
debugging environment for both the user and the agent, while preserving the
V1 editor UX posture instead of drifting into a weaker alternate tool.

## Why this phase matters

By this point V2 already had:

- canonical scene truth
- action-driven working-head mutation
- deterministic runtime inspection
- local agent control
- component authoring foundations

What it still needed was a real editor-facing shell where that truth is visible
in the actual Next app the user thinks of as “the editor”, not only in
runtime-only packages or a separate dev-shell posture.

## Scope

Wire a V2-backed editor shell into the real Next app while keeping browser-only
concerns outside the pure runtime/session packages.

That includes:

- a browser-local app store over `@viz-engine/editor-control`
- a React provider/hook layer for the current working head and preview state
- a scene/graph/issues inspection panel
- a live preview stage consuming the canonical runtime path
- an audio/transport panel that reflects explicit preview/audio-session state
- richer control-surface inspection for:
  - UI state
  - transport advancement
  - graph runtime values
  - graph checkpoint state
  - project resource summaries

## Non-goals

- replacing the V1 editor UX with a new product concept
- moving browser media element ownership into pure runtime/session packages
- claiming final V1 parity
- shipping a giant visual redesign

## Deliverables

- V2-backed editor shell in the real Next app entrypoint
- browser-local store in `src/lib/v2-editor`
- React provider and V2 editor UI slices under `src/components/editor`
- transport/audio panel under `src/components/audio`
- richer `@viz-engine/editor-control` inspection surface
- UI integration tests for scene/graph/issues inspection
- root-app validation included in `pnpm check:foundation`

## Validation

- dedicated UI integration tests for the scene/inspection surface
- browser-safe build verification for the real Next app
- full `pnpm check:foundation`
- manual browser verification that the real editor shell opens and renders

## Exit Criteria

This phase is done when:

- the real Next editor shell can open the canonical V2 example
- the user can see working-head, graph, and issue truth directly in the editor
- preview, transport, and audio status are visible without repo diving
- the browser app stays a client of the V2 runtime/control stack rather than
  recreating hidden runtime semantics locally

## Next Slice

The next meaningful phase after this is the first real agent-native creative
loop proof:

- one stable scripted path that opens a project
- mutates the working head
- adds graph/layer content
- exports and reloads a bundle
- proves the workflow the future agent loop will rely on
