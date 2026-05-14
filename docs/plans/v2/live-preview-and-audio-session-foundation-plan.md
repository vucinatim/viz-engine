# Live Preview And Audio Session Foundation Plan

## Purpose

This plan implements the next clean phase from the
[Agent-Operated Live Editor Roadmap](./agent-operated-live-editor-roadmap.md)
without drifting into shell-specific app state.

The goal is to add the first reusable live-preview control layer on top of the
new editor-session foundation:

- transport state
- play/pause/seek semantics
- preview frame ownership
- audio-session ownership
- explicit live-vs-baked diagnostics

## Why this phase belongs here

The new `@viz-engine/editor-session` package gives us a clean working head, but
the agent-operated editor vision also requires a truthful live loop:

- user presses play
- preview advances
- audio source state is known
- live-vs-baked input posture is visible

That should be explicit and reusable before it ever gets buried inside the
preserved V1 editor UI.

## Scope

Extend `@viz-engine/editor-session` with reusable preview controllers:

- transport controller
- audio session controller
- live input diagnostics

That layer should:

- remain pure TypeScript
- remain host-agnostic
- remain free of browser/UI assumptions
- be easy to wire into the eventual rebuilt V1 editor shell

## Non-goals

- final browser audio engine integration
- media-element ownership inside the package
- analyzer DSP implementation
- shell-specific React hooks or stores

## Deliverables

- deterministic transport controller with:
  - play
  - pause
  - seek
  - duration
  - looping
  - frame advancement
- audio session controller with:
  - attached source state
  - analyzer availability state
  - baked-artifact availability state
- diagnostics that explicitly report whether preview is using:
  - live-only
  - baked-only
  - hybrid
  - no valid inputs
- integration tests proving transport can drive editor-session preview state
  without UI coupling

## Validation

- `@viz-engine/editor-session` lint/build
- dedicated live-preview tests
- full V2 test suite
- full `pnpm check:foundation`

## Exit Criteria

This slice is done when:

- transport control is explicit and reusable
- audio preview session state is explicit and reusable
- the system can explain live-vs-baked input posture programmatically
- preview control can drive editor-session preview state without shell-specific
  state ownership

## Next Slice

The next meaningful step after this is wiring these foundations under the real
preserved V1 editor UX:

- current transport controls
- current audio panel
- current live preview stage

That should be a rebuild-under-the-UX move, not a new-editor move.
