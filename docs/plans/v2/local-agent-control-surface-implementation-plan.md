# Local Agent Control Surface Implementation Plan

## Purpose

This plan implements the next clean phase from the
[Agent-Operated Live Editor Roadmap](./agent-operated-live-editor-roadmap.md):

- a stable local operator surface for the agent
- no primary dependence on browser scraping
- shared semantics across tests, local tools, and future MCP-style surfaces

## Why this phase matters

At this point V2 already has:

- canonical project truth
- action-driven working-head mutation
- explicit preview state
- explicit transport/audio session foundations

What it still needed was the actual local control seam that can open a project,
inspect it, mutate it, ask for frame/render/debug output, and export it again
without relying on a specific UI shell.

That is the bridge from “good architecture” to “the agent can operate the
system truthfully”.

## Scope

Introduce a dedicated package:

- `@viz-engine/editor-control`

That package should:

- open canonical example projects
- open portable bundle-backed projects
- hold the current working head through `@viz-engine/editor-session`
- expose stable control operations for:
  - project open/switch
  - working-head mutation
  - graph inspection
  - preview state inspection
  - frame inspection
  - render inspection
  - debug snapshot generation
  - bundle export
  - transport control
  - audio-session state control

## Non-goals

- browser-driven primary control
- cloud orchestration
- multi-user collaboration
- the full MCP/product layer

## Deliverables

- `@viz-engine/editor-control` package
- end-to-end tests covering:
  - open example project
  - mutate through control surface
  - inspect frame/render/svg output
  - open bundle project
  - export mutated working head back to bundle
  - inspect preview/audio diagnostics
- external consumer smoke proving the control surface installs and works
  outside the monorepo

## Validation

- package lint/build
- dedicated control-surface tests
- external consumer smoke
- full `pnpm check:v2`

## Exit Criteria

This slice is done when:

- the agent has a stable local contract for opening and mutating projects
- the agent can request useful runtime/debug outputs without UI scraping
- the agent can inspect preview/audio state without parsing arbitrary UI text
- bundle export remains available from the same control surface

## Next Slice

The next meaningful phase after this is the live component authoring loop:

- predictable component registration
- low-friction component iteration
- a few serious V1-derived visuals ported cleanly into V2

That should still stay architecture-first and avoid shell-specific shortcuts.
