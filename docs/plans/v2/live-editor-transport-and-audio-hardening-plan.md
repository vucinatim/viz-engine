# Live Editor Transport And Audio Hardening Plan

## Purpose

This plan hardens the next important slice under the preserved editor UX:

- the real live transport loop in the actual editor terrain
- bundled audio-track availability without manual upload-only workflows
- a browser-usable path for opening the editor inside Codex even on a smaller
  viewport

## Why this phase matters

The agent-operated editor vision is not credible if the local live loop still
depends on fragile preview mechanics or one-off file-upload friction.

At this point V2 already had:

- deterministic transport semantics in pure packages
- an explicit audio-session model
- a V2-backed editor shell in the real Next app

What it still needed was a stronger product-facing live loop:

- bundled audio sources available immediately
- preview transport not tied to paint-cycle quirks
- a clean way to open the editor in the Codex browser despite the old
  small-screen guard

## Scope

Harden the real editor loop by:

- moving bundled audio discovery to a shared server helper
- feeding bundled track lists from the real Next page into the V2 editor shell
- adding bundled-track selection to the V2 audio panel
- replacing paint-bound preview ticking with timer-driven transport advancement
- exposing explicit loop controls in the V2 audio surface
- adding a deliberate small-viewport bypass query param for local/agent use

## Non-goals

- final production audio-reactivity fidelity
- replacing the whole old audio toolchain
- weakening the default screen-size product guard for regular users

## Deliverables

- shared server helper for bundled audio discovery
- root Next page passing bundled tracks into the V2 editor shell
- V2 audio panel with bundled-track visibility and loop control
- timer-driven preview transport in the V2 app store
- store-level tests for:
  - playback advancement without a bound audio element
  - bundled track load and duration extension
  - reset behavior when reopening the canonical example
- local browser-open path using `?allowSmallViewport=1`

## Validation

- dedicated V2 app-store tests
- root app typecheck/build
- manual browser verification that:
  - the editor opens under `?allowSmallViewport=1`
  - bundled tracks are visible
  - the live transport surface is present in the actual editor shell

## Exit Criteria

This slice is done when:

- the real editor shell no longer depends on client fetch timing to discover
  bundled tracks
- preview advancement is no longer tied only to `requestAnimationFrame`
- the user and agent have a practical local way to open the editor in Codex
  despite the old screen-size guard
- transport/audio behavior is covered by direct automated tests

## Next Slice

The next clean slice after this is editor-visible component catalog truth:

- what components exist
- which renderer family they belong to
- what inputs they expose

That belongs in the real editor surface, not only in code or CLI inspection.
