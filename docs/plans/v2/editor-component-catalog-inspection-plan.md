# Editor Component Catalog Inspection Plan

## Purpose

This plan implements the next tight slice after transport hardening:

- make the real editor surface show the current component building blocks
- make that catalog truthful to the registered V2 component system
- keep component authoring visible in the product surface instead of hiding it
  in code-only terrain

## Why this phase matters

The editor should not only show:

- layers
- graphs
- issues

It also needs to show the reusable visual primitives the system currently
offers, because that is part of how both the user and the agent reason about
what can be built next.

Without this, component authoring still feels too invisible and too separate
from the actual editor.

## Scope

Add a component-catalog inspection surface to the V2-backed editor shell.

That includes:

- extending `@viz-engine/editor-control` with component summaries
- surfacing those summaries through the V2 app-store layer
- adding a `Components` tab to the scene/inspection panel
- showing:
  - component name
  - component id
  - renderer family
  - description
  - exposed inputs

## Non-goals

- a full drag-drop component marketplace
- solving live code reload for every component workflow
- generic plugin loading

## Deliverables

- `inspectComponents()` in `@viz-engine/editor-control`
- component summaries in the V2 app-store snapshot
- `Components` tab in the real editor shell
- tests proving:
  - control-surface component inspection
  - editor panel component-catalog rendering

## Validation

- control-surface tests
- UI integration tests for the scene panel
- root app typecheck
- full `pnpm check:v2`

## Exit Criteria

This slice is done when:

- the real editor surface exposes the registered V2 component set directly
- the agent and the user can inspect those building blocks without repo diving
- the catalog stays truthful to the runtime/component registry rather than
  duplicating hardcoded UI-only data

## Next Slice

The next meaningful component-authoring step should be stronger live pick-up
and layer creation flows over the same catalog truth, not a hidden side path.
