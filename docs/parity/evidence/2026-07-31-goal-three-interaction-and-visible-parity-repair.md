# Goal Three Interaction And Visible-Parity Repair

Date: 2026-07-31

Status: implementation checkpoint; final 42-capability parity certification
remains open.

## Scope

This checkpoint follows the initial runtime/playback repair and addresses the
reported interaction and visible-product failures:

- sliders and other continuous controls were laggy
- node movement and graph inputs performed canonical work at interaction rate
- paused previews evaluated continuously
- graph and debug values did not reflect effective runtime values
- Curve Spectrum rendered many sticks instead of a curve
- parameter typography differed from V1
- dialogs entered from the wrong position
- conditional debug canvases could miss persistent renderer attachments
- the supplied console dump showed a catalog preview crash for an unregistered
  production Three program

The supplied console text contained one causal exception:

```text
Unknown Viz Three program "viz-production/signal-cathedral/v1"
```

React's remaining output was the component stack produced by that exception.
The composed preview registry and catalog failure containment from the prior
checkpoint cover this failure class.

## Canonical Interaction Contract

The earlier layer-only live controller is now a session-owned transient
authoring overlay:

```text
begin gesture
  -> capture canonical revision and affected project identity

update
  -> structurally replace only the affected transient layer or graph
  -> retain the latest exact value outside the React/Zustand project state
  -> coalesce invalidation to the next display frame
  -> evaluate through the ordinary runtime and renderer

commit
  -> apply one validated action or multi-action transaction
  -> synchronize the canonical editor projection once
  -> create one project revision/history result
  -> clear the transient overlay
```

Layer settings, layer properties, graph-node inputs, and multi-input graph
gestures share this ownership. A frequency-range drag can therefore update both
endpoints live and commit them together.

The overlay remains cancellable and revision guarded. Any unrelated canonical
mutation, load, undo, or redo cancels it. It is never persisted and is not a
second project document.

## React And Frame Ownership

React remains responsible for editor structure and focused control
presentation. It is not the pointer bus or preview clock.

- Parameter fields no longer subscribe to and rerender from every transient
  layer value.
- Slider-local state moves only the small control thumb; runtime updates travel
  directly through the external overlay.
- Numeric scrubbing updates its input DOM value imperatively while dragging.
- Color canvases and graph custom controls publish directly to the overlay.
- React Flow owns transient node positions; one final position action is
  committed at drag end.
- Graph text inputs retain narrow local form state, publish valid intermediate
  values live, and commit on blur or Enter.
- Node-input keyboard events stop at the input rather than triggering graph
  canvas shortcuts.
- Runtime invalidations are coalesced to one animation frame.

## Runtime And Temporal Graph Semantics

Render and frame plans accept transient graph documents explicitly.
Non-temporal graphs evaluate directly. A temporal graph with a transient
override resumes from the latest checkpoint before the target frame, evaluates
the changed current frame, and never mutates canonical checkpoints. This avoids
both stale exact-frame results and full-song replay on every pointer event.

Render-plan entries now distinguish authored `settings` from
`resolvedSettings`. Debug presentation consumes `resolvedSettings`, so
graph-driven and runtime-input-driven values reflect what the component
actually rendered without changing the established frame-plan contract or
golden outputs.

## Paused Preview Lifecycle

The preview driver now renders continuously only for:

- active playback
- live stream capture
- an attachment that explicitly requires continuous work, such as fly-camera
  movement

While paused, canonical session changes, transient overlay changes, audio
structure changes, attachment changes, and explicit invalidations request one
coalesced render. Remotion frame polling and audio time publication also stop
while paused.

Direct browser measurement at 1600 × 1000 reported zero render-cycle growth
over both one-second and two-second paused idle windows. Thirty direct
transient layer updates within one display interval produced one preview
render, followed by one canonical commit render.

## Visible-Parity Repairs

### Curve Spectrum

The spectrum curve is now one native polyline with round joins/caps instead of
hundreds of rotated rectangle groups. Grid lines, point markers, frequency
labels, and amplitude labels remain explicit render nodes. Direct browser
inspection showed one polyline with 47 active curve points and no segment
groups.

The V1 gradient area fill remains open. It should be restored through a
canonical area/gradient primitive or renderer program, not rectangle
reconstruction.

### Typography

V1 and V2 parameter markup both used `text-2xs`, but the Tailwind v4 theme
omitted the token. Restoring `--text-2xs: 0.575rem` produced the intended
computed 9.2 px Inter parameter label.

### Dialog Motion

The current dialog source already matched the latest shadcn registry shape.
The actual bug was transform composition: Tailwind v4 static centering and
`tw-animate-css` half-screen slide transforms compounded. Removing the slide
translation while retaining fade and zoom keeps the dialog centered through
open and close animation.

### Debug Overlay

Persistent renderer attachments now accept a debug canvas after creation.
Toggling debug no longer relies on destroying and recreating the renderer.
The overlay receives effective resolved settings and is explicitly invalidated
when mounted.

## Direct Browser Proof

Environment:

- Chromium through Chrome DevTools
- 1600 × 1000 CSS viewport
- device scale factor 1
- no CPU or network throttling

Layer live path:

- 120 transient updates completed in 0.4 ms in-page time
- canonical revision remained unchanged during the gesture
- React-facing session-store identity remained unchanged
- the latest transient runtime setting was observable on the next frame
- one commit advanced the canonical revision once

Graph live path:

- a Math-node literal changed from `360` to `420`
- before blur, the DOM and runtime both reported `420`
- host and projected canonical revisions both remained `3`
- the complete Zustand session object retained identity
- after blur, host and projected revisions both became `4`
- the canonical graph and runtime both retained `420`
- no runtime error occurred

Debug path:

- enabling debug mounted a 2196 × 1326 backing canvas for a 1098 × 663 display
  surface at quality 2
- a transient Pattern Scale of `1.23` appeared in the effective render-plan
  settings while canonical revision stayed unchanged
- the debug canvas contained rendered nontransparent pixels

Playback and graph animation:

- playback advanced the frame and graph values
- visible HSL, Math, Envelope, and Normalize values changed during playback
- pausing stopped frame and idle-preview churn

Console:

- no warning or error messages appeared after sample load, layer and graph
  editing, playback, Curve Spectrum rendering, dialog motion, and debug
  toggling

## Deterministic Validation

New focused coverage includes:

- stable external layer snapshot identity
- multi-input transient graph gestures
- one synchronized graph commit after external updates
- transient graph evaluation without canonical checkpoint poisoning
- resolved render settings for debug presentation
- one Curve Spectrum polyline with no segment groups
- frequency and amplitude text nodes

The complete deterministic gate at this checkpoint passes 55 Vitest files and
242 tests, in addition to parity-matrix validation, workspace architecture,
formatting, lint, and all package, studio, and tool type checks.

The complete browser gate passed all seven journeys in 1.5 minutes, including
bounded edit/playback churn, still export, and probed nonblank/nonfrozen video
export. All package builds, the production studio build, the packed-consumer
smoke, and the built agent creative-loop smoke also passed.

Checkpoint source metrics:

- production: 353 files / 69,254 lines
- tests: 57 files / 13,354 lines
- all maintained code: 449 files / 88,384 lines

## Remaining Work

This checkpoint does not claim Goal Three completion. Still required:

- controlled V1/V2 comparison evidence for every affected parity row
- repeated fixed-device pointer-to-visible and release-to-settle distributions
- a real pointer-based React Flow movement benchmark
- Curve Spectrum's canonical area/gradient fill
- removal or consolidation of remaining idle RAF consumers where measurement
  shows material cost
- the complete sample/component/catalog interaction audit
- agent inspection/tooling work and the second original production
