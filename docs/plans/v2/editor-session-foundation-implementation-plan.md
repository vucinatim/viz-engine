# Editor Session Foundation Implementation Plan

## Purpose

This plan implements the first real rebuild seam from the
[V1 Editor UX Preservation And V2 Rebuild Map](./v1-editor-ux-preservation-and-v2-rebuild-map.md).

The goal is not to grow a new alternate editor.

The goal is to introduce the reusable editor-foundation layer that can sit
under the preserved V1 editor UX later:

- canonical working head
- canonical action-driven mutation
- explicit editor UI state
- explicit preview state
- exportable project truth with no editor-only leakage

## Why this is the right first seam

The current V2 runtime is already clean enough to be a source of truth, but the
repo had no dedicated editor-side session layer that could:

- hold a mutable working head
- apply canonical actions safely
- keep editor state separate from project truth
- keep preview state separate from project truth
- serialize the working head again cleanly

Without that seam, the rebuilt editor would drift back into store-owned scene
truth too easily.

## Scope

Implement a pure package:

- `@viz-engine/editor-session`

That package should:

- load a canonical `VizProjectDocument`
- validate the project at session creation
- keep both `sourceProject` and `workingProject`
- apply canonical project actions into `workingProject`
- reject invalid mutations without corrupting `workingProject`
- track action history for future user/agent workflows
- own explicit editor-only UI state
- own explicit preview-only state
- export the working head without leaking editor-only state

## Non-goals

- rebuilding the full editor shell
- replacing V1 panel components yet
- introducing audio transport/session behavior
- introducing React-specific editor state containers

## Deliverables

- `@viz-engine/editor-session` package
- session tests for:
  - truth-vs-ui-state separation
  - action-driven mutation
  - invalid mutation rejection
  - bundle export/reload roundtrip from the mutated working head
- external consumer smoke proving the package installs and works outside the
  monorepo

## Validation

- package lint/build
- dedicated editor-session test coverage
- V2 test suite
- external package-consumer smoke
- full `pnpm check:v2`

## Exit Criteria

This slice is done when:

- the repo has a reusable editor-session package instead of shell-specific
  ad-hoc session logic
- working-head mutation is driven through canonical actions
- editor UI state is not serialized into project truth
- preview state is not serialized into project truth
- a mutated working head can roundtrip through bundle export and reload

## Next Slice

Once this package is stable, the next clean phase is:

- explicit live transport and audio-session control on top of the editor
  session foundation

That should remain a generic runtime/editor seam first, then later get wired
under the preserved V1 editor UX.
