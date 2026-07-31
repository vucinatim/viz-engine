# Goal Three Audio And Transport Reactivity

Date: 2026-07-31

Status: verified checkpoint for local and bundled audio loading, input capture,
volume, transport presentation, and accessible seeking. Goal Three remains
open.

## Product Contract

Audio and transport now use the same interaction doctrine as layer and graph
authoring:

```text
pointer/key input -> direct browser/runtime attachment -> immediate feedback
gesture release   -> one durable presentation value or canonical transaction

media/transport frame -> narrow imperative clock -> DOM/canvas/runtime
semantic transition   -> React session state
```

The session host remains the canonical transport owner. The presentation
clocks are notification channels, not competing scene or transport state.
React renders structure and semantic transitions; it is not the media clock,
audio signal bus, or pointer-rate gain path.

## Architecture Repairs

### Transport and audio clocks

The editor previously copied `audio.currentTime`, visual time, and canonical
transport frame into the React-facing session store every animation frame.
This woke broad subscribers and persistence-adjacent infrastructure during
playback even though those values were presentation cadence, not durable
project state.

`audioPresentationClock` now drives timecode, waveform, and Rhythm Lab refs.
`transportPresentationClock` drives the preview seeker, displayed time, and
runtime scheduling. The host continues to own play, pause, seek, duration,
loop, and current frame. The React session receives play/pause, paused seek,
duration, loop, mode, and other semantic transitions, but not every playing
frame.

A deterministic foundation test advances 20 canonical playing frames and
observes 20 transport-clock publications, zero React-session invalidations,
and exact final-frame synchronization when paused.

### Live volume with release commit

Volume pointer movement writes directly to the active Web Audio `GainNode`.
The Zustand presentation value changes once on release and seeds replacement
gain nodes, so graph rebuilds cannot jump back to unity. The control is named,
supports keyboard and pointer input, and never mutates project revision.

This is the intended pattern for every continuous authoring control: immediate
runtime or attachment feedback throughout the gesture, one semantic commit at
the end, and no canonical/persistence churn for intermediate pixels.

### Transactional source loading

Bundled and local media now pass a metadata probe before replacing the active
source. Loading and failure are visible. A corrupt, unsupported, timed-out, or
superseded request leaves the previous valid session and transport intact.
Locally created object URLs are revoked on failure, replacement, clear, and
engine reset.

The same coordinator owns default selection, search selection, next/previous,
and local-file attachment. Track navigation therefore cannot bypass the
validation or lifecycle path.

### Capture lifecycle

Capture permission is requested only from the button gesture. Denial and
missing audio tracks produce visible feedback without clearing the current
media source. Successful capture owns one stream source, stops every track,
disconnects idempotently, restores the existing media-element source, and
restores the prior local or bundled session.

The media element source is retained separately from the active meter source.
This avoids the browser-invalid attempt to construct a second
`MediaElementAudioSourceNode` for the same element after capture.

### Waveform and timeline access

The main waveform and overview are named sliders. Pointer capture supports
continuous seek while dragging; Home, End, and arrow keys provide exact
navigation. Timecode, waveform ARIA value, media time, canonical frame, and
rendered frame now follow the same host transport.

Zoom/scroll certification remains deliberately open. The preserved selection
window still works, but it needs a dedicated full-track pointer, wheel,
keyboard, and fixed-device performance pass before `audio.waveform-navigation`
can advance from partial.

## Headed Browser Proof

The dedicated Chromium journey proves:

- default bundled source and metadata load
- next/previous deterministic navigation through the shared loader
- playing audio advances 42 observed canonical frames with zero React-session
  updates during the observation window
- 20 distinct pointer-rate volume values, one release value, zero project
  revisions, and Home/End keyboard coverage
- main and overview waveform accessible identities and Home/End seeking
- corrupt local media shows a useful error and preserves the valid source
- a generated valid WAV becomes one local session with matching one-second
  metadata and a nonblank decoded waveform
- permission denial preserves the source and explains the failure
- successful synthetic capture enters stream mode, stops all tracks, and
  restores the exact previous local source
- no unexpected console warning, console error, or page error

The existing transport journey also passes after the clock split, including
paused and playing scrub, media/frame agreement, renderer progress, loop wrap,
and non-loop completion.

## Fixed-Device Interaction Result

The repeatable `pnpm benchmark:audio` command writes its machine-readable
result to `.artifacts/performance/v2-audio-workflow.json`. The certified result is
[the audio workflow report](./artifacts/2026-07-31-goal-three-v2-audio-workflow-performance.json).

| Measurement | Result |
| --- | ---: |
| Observed playing frames | 42 |
| React-session updates during playing sample | 0 |
| Distinct pointer-rate volume values | 20 |
| Volume median update interval | 8.40 ms |
| Volume p95 update interval | 15.10 ms |
| Volume maximum update interval | 16.10 ms |
| Project revision delta | 0 |

## Parity Result

The following rows advance to `verified`:

- `audio.file-loading`
- `audio.bundled-track-selection`
- `audio.capture-input`
- `audio.volume`
- `transport.timeline`

`audio.waveform-navigation`, `performance.playback-smoothness`, and
`performance.editor-responsiveness` remain partial. This checkpoint proves
the clock boundary and focused audio interaction, but not the full-track
zoom/scroll budget, pinned-V1 playback comparison, every representative scene,
or long-session behavior.

## Validation

Passed during this checkpoint:

- audio-session and transport-clock foundation tests
- dedicated headed audio workflow and interaction report
- existing headed transport/audio/render/loop journey
- complete `pnpm check:foundation` equivalent gate:
  - 42 valid parity rows: 26 verified and 16 partial
  - clean dependency architecture, formatting, lint, and all type checks
  - 60 Vitest files and 271 deterministic tests
  - 14 active headed Chromium journeys passed and the opt-in performance
    journey skipped in the ordinary gate
  - all 17 package builds, the studio production build, the packed-consumer
    smoke, and the creative-loop smoke

## Assumptions And Boundaries

- Volume is editor-session presentation state, not authored project content.
  If future render products need an authored mix, that belongs in an explicit
  audio/mix contract rather than in the browser gain attachment.
- A metadata-successful browser media source may still lack a decodable Web
  Audio waveform for an exotic codec. Playback remains valid; waveform decode
  failure must remain visible and is separate from media-source validity.
- Browser capture success is Chromium-specific product behavior. Permission
  and unsupported-browser feedback remain mandatory on every browser.
- This checkpoint does not certify long-session object, track, context, or
  memory stability; Goal Three retains that separate acceptance requirement.
