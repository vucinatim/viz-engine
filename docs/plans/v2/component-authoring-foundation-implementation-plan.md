# Component Authoring Foundation Implementation Plan

## Purpose

This plan implements the first real slice of the component-authoring phase from
the
[Agent-Operated Live Editor Roadmap](./agent-operated-live-editor-roadmap.md).

The goal here is not to claim full live component iteration is finished.

The goal is to make component authoring real and disciplined enough that the
next editor-facing authoring loop has a stable base:

- validated registry semantics
- predictable component file structure
- scaffolded authoring path
- at least one meaningful V1-derived component port

## Why this slice matters

Without this slice, “write the component for it” is still too ad hoc.

The repo needed:

- a cleaner component package structure
- stronger component validation at registration time
- a predictable scaffold path for new components
- proof that V1 visual ideas can be re-expressed cleanly in V2 components

## Scope

Improve the component-authoring posture by:

- splitting `@viz-engine/components-core` into per-component modules
- validating component registry contents
- adding a component scaffold helper
- exposing that helper through the local-first CLI package
- porting one clear V1 visual idea into a real V2 component

## Non-goals

- full V1 parity
- remote/plugin component loading
- solving every HMR/editor-loop concern in this slice

## Deliverables

- per-component module structure in `@viz-engine/components-core`
- validated `createVizComponentRegistry(...)`
- CLI-accessible component scaffold helper
- first V1-derived V2 component:
  - `feature-channel-bars`
- tests for:
  - registry validation
  - V1-derived component rendering
  - component scaffold generation

## Validation

- package lint for:
  - `@viz-engine/components-core`
  - `@viz-engine/runtime`
  - `@viz-engine/dev-cli`
- dedicated component tests
- full `pnpm check:foundation`

## Exit Criteria

This slice is done when:

- component registration fails fast on bad metadata
- new component files can be scaffolded predictably
- component authoring no longer depends on a single growing file
- at least one meaningful V1 visual idea exists as a clean V2 component

## Next Slice

The next component-authoring step should focus on the actual live iteration
loop:

- editor pick-up of new/changed components with minimal friction
- stronger component contract diagnostics in the editor surface
- more serious V1 visual ports chosen deliberately
