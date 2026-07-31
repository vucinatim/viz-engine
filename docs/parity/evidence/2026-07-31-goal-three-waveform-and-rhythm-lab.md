# Goal Three Waveform And Rhythm Lab

Date: 2026-07-31

Status: verified checkpoint for waveform navigation and the preserved Rhythm
Lab workspace and analysis interaction. Goal Three remains open.

## Product Contract

This checkpoint applies the established high-frequency interaction doctrine to
the remaining audio editing surface:

```text
pointer movement -> narrow presentation channel -> canvas and DOM now
pointer release  -> one editor-UI commit

worker request   -> isolated computation
worker response  -> one complete analysis-store commit
```

The transient selection window is not a second project document. It is a
short-lived presentation value shared by the waveform and Rhythm Lab canvases.
The editor UI store remains the durable selection preference and changes once
at a pointer release, once after a wheel burst, or once for a discrete keyboard
command. Because the view window is editor UI rather than authored scene data,
it intentionally creates no project revision or undo entry.

Authored layer and graph controls continue to use the session-owned,
revision-guarded live-project overlay. They update the runtime throughout the
gesture and create one canonical history result on release. The waveform
channel is the same interaction pattern applied to non-project presentation
state, not a parallel authoring architecture.

## Waveform Navigation

The preserved minimap selection now supports:

- continuous pointer move and left/right edge resizing
- pointer cancellation that restores the pre-gesture window
- pointer capture and one release commit
- pointer-anchored wheel zoom
- horizontal or Shift-wheel panning
- one coalesced UI-store commit after each wheel burst
- Arrow Left/Right pan, `+`/`-` zoom, and Home/End positioning
- immediate main-waveform viewport redraw through a focused external
  subscription, without pointer-rate Zustand or broad React updates
- seeking against the live viewport refs, including before the durable commit
  has caused a structural React render

This extends rather than degrades the pinned V1 behavior. The pinned V1 at
`e806fbc10980615588b52ff574bc923c6f00f35e` wrote every pointer move into the
editor Zustand store and did not provide wheel or keyboard view-window
navigation. V2 retains its recognizable waveform, overview, timeline, and
selection language while removing that pointer-rate store traffic.

## Rhythm Lab Coherence

Rhythm Lab retains the V1 panel hierarchy, five established stage cards,
selection information, output selection, controls, resizable analysis canvas,
and horizontal stage navigation.

The live selection presentation now feeds the main analysis canvas, Onset
meter, Grid flash, and selection text directly. Onset and Grid frame-rate
feedback writes to narrow DOM refs instead of setting React state every frame.

A worker result is committed atomically. The earlier implementation called a
long series of independent Zustand setters, briefly allowing consumers to
observe a mixture of old and new analysis. The store now accepts one complete
typed result with the exact `AudioBuffer` identity that produced it.

Source replacement invalidates the old request before paint, clears stale
results, and automatically recomputes when analysis had already been active.
Closing and reopening Rhythm Lab retains a result only while the active audio
buffer identity still matches. Visible states distinguish unavailable audio,
ready-to-analyze, computing, ready, and worker failure.

## Headed Browser Proof

`tests/browser/waveform-rhythm-workflow.spec.ts` exercises real pointer input
and proves:

- 24 visible pointer-rate selection changes occur while the editor UI store
  remains unchanged
- release produces exactly one selection-store update
- a six-event wheel zoom burst is live immediately and produces one later
  durable update
- keyboard navigation produces one discrete update
- all selection gestures leave canonical project revision unchanged
- Rhythm Lab opens with all five stages and preserves editor work on close and
  reopen
- analysis returns a nonblank canvas and nonempty onset/frame data
- stage toggles remain functional without mutating the project
- retained analysis survives a same-source workspace remount
- changing tracks visibly invalidates the old result and analyzes the new
  source rather than exposing cross-track data
- no unexpected console warning, console error, or page error occurs

The controlled final workspace capture is
[the V2 Rhythm Lab screenshot](./artifacts/2026-07-31-goal-three-waveform-rhythm-workspace.png).

## Fixed-Device Result

`pnpm benchmark:waveform` writes the repeatable machine-readable result. The
certified artifact is
[the waveform and Rhythm Lab report](./artifacts/2026-07-31-goal-three-v2-waveform-rhythm-performance.json).

| Measurement | Result |
| --- | ---: |
| Pointer-rate presentation samples | 24 |
| Median visible selection interval | 8.10 ms |
| p95 visible selection interval | 9.20 ms |
| Maximum visible selection interval | 36.70 ms |
| Pointer, wheel-burst, and keyboard durable commits | 3 |
| Project revision delta | 0 |
| First analysis onset/frame points | 1,212 |
| First analysis input samples | 622,335 |
| Stale result invalidated on track change | yes |
| Replacement source analyzed | yes |
| Browser diagnostics | 0 |

The isolated maximum was retained rather than hidden; the p95 remains below a
single 60 Hz frame. This slice does not claim whole-editor performance
certification from one audio gesture.

## Deterministic Proof

`tests/foundation/rhythm-core-determinism.test.ts` analyzes the same synthetic
120 BPM click track twice and requires identical onset, tempogram, tempo,
beat-time, and confidence results, with the detected tempo within the declared
test tolerance.

`tests/foundation/rhythm-presentation.test.ts` proves transient selection
subscription behavior and that one complete worker result causes exactly one
analysis-store update.

## Parity Result

The following rows advance to `verified`:

- `audio.waveform-navigation`
- `rhythm-lab.workspace`
- `rhythm-lab.analysis-interaction`

`performance.editor-responsiveness` remains partial. This result expands its
evidence but does not replace the required representative multi-layer and
graph workload or certify every continuous control in one measurement.

## Validation

The complete `pnpm check:foundation` gate passes:

- all 42 parity rows validate as 29 verified and 13 partial, with zero gaps or
  unaudited capabilities
- dependency architecture, formatting, ESLint, package/app/tool types, and
  source boundaries are clean
- 62 Vitest files and 274 deterministic tests pass
- 15 active headed Chromium journeys pass and the opt-in fixed-device journey
  remains skipped in the ordinary gate
- all 17 packages and the studio production app build
- the packed-consumer and agent creative-loop smoke scenarios pass

## Assumptions And Boundaries

- The selection window is editor workspace state, not authored project truth.
  If selection later becomes a renderable loop or authored analysis region,
  that requires an explicit project contract and canonical history action.
- Wheel interaction uses the latest event value synchronously and coalesces
  only the durable store commit. It does not debounce visible zoom or canvas
  updates.
- React continues to render structural and semantic changes. Narrow local
  primitive state is acceptable for the control itself; React, Zustand, and
  project validation are not used as the pointer-rate runtime bus.
- The browser journey covers the bundled full-length source used by the studio
  and a second bundled source. It does not certify live-capture analysis,
  Firefox/WebKit, touch gestures, or long-session memory stability.
