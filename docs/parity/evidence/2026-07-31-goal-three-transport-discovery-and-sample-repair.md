# Goal Three Transport, Discovery, And Sample Repair

Date: 2026-07-31

Status: transport, component discovery, and bundled-sample parity verified;
broader Goal Three certification remains open.

## What Changed

The live editor no longer uses Remotion Player as its frame clock. The
deterministic editor-session transport is the only owner of frame, duration,
play/pause, seek, and loop state.

A small browser adapter now:

- advances the canonical transport from elapsed time when no playable media
  source exists
- uses the media element as the clock when a file or bundled track is active
- aligns the media element to canonical time when playback begins
- owns authored timeline loop boundaries rather than delegating them to native
  media-source looping
- stops at the final frame when looping is disabled
- keeps the renderer driven from the canonical transport

The editor-only Remotion Player reference and attachment-store backchannel
were deleted. Remotion remains an optional future rendering adapter; it is not
live-editor architecture.

The waveform display no longer rewrites media time or implements an
independent selected-range loop. It displays and seeks through the canonical
transport only.

Project loading now treats the current editor audio input as session state. A
project-declared audio source replaces it; a visual project with no audio
leaves the current live source attached. Explicit clear-audio actions still
clear it. Default bundled-audio initialization also waits for persisted project
hydration, removing the race that previously left a selected URL with no
canonical audio source.

## Live Scrubbing Contract

The preview seeker uses pointer capture and updates its CSS progress variable
directly before publishing the transient seek. This keeps the thumb and track
under the pointer without waiting for a React render.

Seeking updates transport and media time continuously while dragging. It does
not mutate the project document or create history. Keyboard navigation is
available through slider semantics and arrow, Home, and End keys.

This is deliberately distinct from project-value gestures:

- project sliders use a transient live-value overlay and commit one canonical
  history action at release
- transport seeking is ephemeral session state, so every live seek is valid
  and there is no release-time project commit

## Discovery And Bundled Samples

Search option identity is now separate from human search text. Component IDs
remain stable keys while name, description, and component ID become search
terms. Exact human input such as `Curve Spectrum` therefore finds
`curve-spectrum` without weakening canonical identity.

The same typed search surface now covers enabled graph animations without
`any`-typed option plumbing.

The headed browser journey proves:

- exact human-readable Curve Spectrum search
- one result and Enter-to-add behavior
- one project revision for the add
- the new layer is first, expanded, and visible
- every published bundled sample loads its intended canonical project
- every sample produces a nonblank runtime canvas with one preview context
- ordinary use produces no console or page diagnostics

## Transport Browser Proof

The headed Chromium journey performs physical pointer gestures against the
visible preview seeker and proves:

- paused scrubbing reaches the intended frame
- media time and canonical frame agree
- scrubbing does not change project revision
- the renderer completes the scrubbed frame
- playback advances media, canonical transport, and rendered output
- seeking while playing remains synchronized and continues forward
- looping crosses the authored timeline boundary once and remains playing
- non-looping stops on the last frame and pauses media
- the final stopped frame is rendered
- no console or page diagnostics occur

The focused journey passed in 33.8 seconds in the headed Chromium suite.

## Deterministic Coverage

Unit coverage additionally proves:

- transport play, pause, seek, elapsed-time advancement, loop, and non-loop
  semantics
- browser attachments remain outside session transport state
- a project-declared audio asset becomes the active media source
- a project without audio preserves the current editor preview source
- explicit live-project attachment state remains separate from canonical
  project and transport state

## Complete Validation Gate

The complete foundation gate passed after the focused proof:

- 42 valid parity rows and clean workspace dependency architecture
- strict formatting and lint
- all package, studio, and tool type checks
- 56 Vitest files and 257 deterministic tests
- all 10 active headed browser journeys in 3.8 minutes; the fixed-device
  benchmark remains intentionally opt-in
- all package builds and the production studio build
- packed-consumer and built creative-loop smoke tests

At this checkpoint the parity matrix recorded seven verified capabilities and
two remaining explicit gaps: the controlled V1/V2 shell visual-language
comparison and the complete layer-debug-info acceptance audit. Both were
subsequently closed in
[Goal Three Shell And Layer Diagnostics Parity](./2026-07-31-goal-three-shell-and-layer-diagnostics-parity.md).
All broader unproven rows remain honestly partial or not audited.

## Assumptions And Boundary

An active media file is the most stable live playback clock in the browser.
When media playback is unavailable or rejected, elapsed time advances the same
canonical transport instead. Captured streams remain elapsed-time driven
because they do not provide a finite authored timeline.

Attaching a finite media source sets the project timeline duration from media
metadata, matching established editor behavior. Authored loop semantics then
operate on that canonical timeline rather than relying on the media element's
source-duration loop flag.

This checkpoint verifies transport, component discovery, and bundled sample
loading. It does not certify capture-permission UX, previous/next track
navigation, every waveform mode, or long-session audio stability; those rows
remain partial until their own acceptance evidence exists.
