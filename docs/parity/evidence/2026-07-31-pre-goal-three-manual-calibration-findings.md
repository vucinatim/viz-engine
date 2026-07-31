# Pre-Goal Three Manual Product Calibration Findings

Date: 2026-07-31

Status: confirmed pre-activation product-gap evidence.

Planning reference:
`039e73707a27527b5abdb111028c8c210dbce5da` on
`codex/viz-engine-v2`.

Related plan:
[Product Parity, Performance, And Agentic Creative Calibration](../../plans/v2/product-parity-performance-and-agentic-creative-calibration.md).

## Purpose

This record captures direct human product observations made before Goal Three
activation and the first source/browser investigation of their mechanisms.

These findings supersede the assumption that the parity matrix contained no
known product gaps. They are mandatory Goal Three inputs.

This is diagnosis and calibration evidence. No production fix is claimed by
this document.

## Environment

- Vite development studio at `http://localhost:4174/`
- Chrome DevTools
- emulated desktop viewport: 1600 × 1000 at device scale 1
- dark color scheme
- bundled sample projects
- bundled `[HipHop] 808 Rap.mp3`

The user compared the current product directly through ordinary editor
interaction rather than through the test harness.

## Reported Product Failures

1. Transparency is visibly broken.
2. Layer-parameter labels use different typography from V1.
3. Continuous sliders are severely laggy.
4. Preview playback remains a static image.
5. Node-graph signals and live values do not animate.
6. Modal show/hide animation is broken.
7. The debug overview does not show animated runtime values changing.
8. Console errors and warnings occur during ordinary editor use.
9. Curve Spectrum renders sticks rather than the intended curve.
10. The graph-node editor is severely laggy.

The user explicitly rejected blanket React memoization as the primary
performance strategy. The intended behavior is that frame-rate rendering,
animated values, graph signals, and continuous control preview avoid broad
React state propagation.

## Confirmed Finding 1: Bundled Projects Have One Renderable Frame

All three bundled sample projects declare:

```json
{
  "timeline": {
    "fps": 60,
    "durationInFrames": 1
  }
}
```

Affected files:

- `public/projects/layer-blending-showcase.vizengine.json`
- `public/projects/light-tunnel.vizengine.json`
- `public/projects/simple-example.vizengine.json`

The canonical preview therefore displays `0:00 / 0:00`. The transport clamps
to frame zero and immediately reaches the end.

The audio element was observed at 4.36 seconds while the canonical rendered
frame remained zero. Audio and preview can therefore advance independently in
the visible product.

This is a real failure of sample-project, preview, transport, graph-live-value,
and audio/visual synchronization behavior. It is not merely missing evidence.

The replacement must decide and document how project duration, active audio
duration, preview transport, and portable project semantics relate. It must not
add a second editor-only clock.

## Confirmed Finding 2: Portable Color Alpha Is Discarded

Chrome emitted the warning:

```text
THREE.Color: Alpha component of rgba(204, 204, 204, 0.2) will be ignored.
```

The same warning accumulated 20,655 times during the observed session.

The stack originates in:

- `packages/viz-renderer-three/src/portable-nodes.ts`
- `createMaterial`
- portable node conversion
- the compositor
- the runtime preview frame loop

`createMaterial` currently passes the complete CSS color string to
`THREE.Color` while obtaining material opacity only from `style.opacity`.
Three intentionally ignores alpha embedded in `rgba(...)`.

Consequences include:

- incorrect visible transparency
- incorrect composition semantics
- repeated console work on the frame loop
- additional interaction and render-loop overhead

The canonical renderer needs one explicit color-and-alpha normalization path.
Embedded CSS alpha, inherited opacity, node opacity, layer opacity, and blend
mode must compose deliberately and identically in preview and export.

Suppressing the warning without fixing alpha semantics is not acceptable.

## Confirmed Finding 3: Component Search Can Crash A Preview

Opening or interacting with the layer/component search produced:

```text
Uncaught Error: Unknown Viz Three program
"viz-production/signal-cathedral/v1".
```

React reported the failure from `CompPreview` inside `SearchSelect`.

The studio's real layer attachments receive `studioThreeProgramRegistry`.
`CompPreview` creates a Three preview controller without the composed studio
program registry. A component owned by an installed first-party capability pack
therefore appears in the catalog but cannot be previewed by the catalog's
private core-only renderer setup.

The repair must:

- use the same trusted studio capability composition for catalog preview
- keep one registry composition root
- isolate a failed component thumbnail so it cannot crash the picker or editor
- expose a useful component-specific failure state
- add browser coverage for opening, searching, and hovering every registered
  component

Adding only a React error boundary would improve containment but would not fix
the registry ownership error.

## Confirmed Finding 4: Continuous Slider Updates Take The Canonical Heavy Path

Every Radix slider `onValueChange` currently invokes:

```text
layer.settings.set
  -> VizSessionHost.applyActions
  -> validate and create mutation result
  -> clone the complete resulting project through JSON
  -> reset selector caches
  -> replace the React-facing project state
  -> invalidate the revision-keyed runtime session
```

This occurs on pointer-rate updates during a drag.

History grouping prevents every tick from becoming a separate undo entry, but
it does not make the live path cheap.

Separately, the runtime preview frame loop currently publishes a replaced
preview state on rendered frames and structured-clones graph results, layer
snapshots, materialized assets, and issues into runtime inspection.

These mechanisms can create work even when most of the React tree does not
visibly need new state.

Profiling still needs to quantify the contribution of each mechanism, including
the repeated Three warnings, but the ownership problem is already clear:

- high-frequency preview values and telemetry are using durable React-facing
  state paths
- pointer-rate updates repeatedly invalidate canonical runtime construction
- React memoization cannot remove the validation, cloning, cache invalidation,
  store publication, and runtime work

## Required High-Frequency Architecture

Goal Three must introduce or restore an explicit high-frequency interaction
boundary with these semantics:

```text
pointer gesture begins
  -> establish canonical base value and history transaction

pointer moves
  -> update one transient live value
  -> affected control reflects the exact value immediately
  -> affected renderer/runtime input consumes it immediately
  -> affected visual renders on the next available frame
  -> optional narrow diagnostics consume it without broad React publication

pointer gesture commits
  -> emit one canonical project action
  -> validate once
  -> create one history result
  -> clear transient override
```

The exact owner may be a focused `VizSession` live-gesture facility or an
explicit runtime/editor attachment connected to it. It must remain:

- keyed by stable layer and parameter identity
- inspectable
- cancellable
- deterministic at commit
- compatible with agent and external-session observation
- unable to become a second persisted project truth

The intended behavior is explicitly live, not merely inexpensive at commit:
the newest input value must become effective synchronously and reach both the
control and visual runtime on the next available display frame. Input events
that arrive within one display interval may collapse naturally to the newest
value; deliberate debounce or visibly stepped throttling may not. Updating only
the control thumb or waiting for pointer release is a functional failure even
if the final history entry is correct.

The architecture must serve continuous value editing as a category rather than
special-case Radix sliders. Numeric scrubbing, color and curve controls,
timeline manipulation, node movement, spatial transforms, and later control
types should share the same begin/update/commit/cancel semantics where
applicable.

Frame-rate renderer state, graph signals, meters, debug values, and profiler
telemetry should use narrow external subscriptions, imperative attachments,
refs, or canvas drawing as appropriate. They should not replace the canonical
project or broad React state every frame.

## Confirmed Finding 5: Debug Uses Authored Values Instead Of Resolved Values

The layer preview attachment currently passes `layer.values` into the debug
overlay. Those values are the projected authored settings captured by the
layer attachment.

Animated graph outputs and other runtime-resolved values belong to the render
plan. The debug overview can therefore display static authored configuration
while the renderer uses different resolved values.

Debug information must come from the canonical runtime evaluation or render
inspection result. It must not reconstruct animation values through an
editor-only evaluator.

## Finding Requiring Deeper Visual Comparison: Curve Spectrum

The current Curve Spectrum implementation creates:

- one rect-based mesh group for every adjacent spectrum point
- optional circle nodes for every spectrum point
- new portable render nodes across the viewport width

The user observes sticks rather than the intended V1 curve.

The precise visual regression still requires controlled V1/V2 capture, but the
component is already a mandatory parity failure. The repair should prefer a
retained polyline/curve representation and bounded per-frame updates rather
than thousands of independent primitive nodes.

It must preserve:

- logarithmic frequency mapping
- smoothing behavior
- line thickness
- point controls
- grid appearance
- transparency
- live audio response
- preview/export equivalence

## Findings Requiring Focused Profiling

### Graph node editor

The node editor is visibly laggy. Likely contributors to measure include:

- broad project replacement
- projected graph reconstruction
- live runtime-inspection publication
- React Flow node/edge array replacement
- node body subscriptions
- live value propagation
- expensive canvas or chart bodies
- repeated console warnings

The correction must reduce update ownership and data movement before applying
component-level memoization.

### Modal motion

Modal show/hide motion is visibly broken.

The current dialog uses Radix state attributes and `tw-animate-css` utility
classes. Goal Three must compare actual computed animation behavior against the
current supported shadcn/Radix pattern and V1 interaction.

Updating copied shadcn components or Radix dependencies is permitted when it is
the cleanest compatible correction, but an upgrade should follow diagnosis and
browser proof rather than be assumed to fix the issue.

### Parameter typography

Parameter labels visibly differ from V1. Goal Three must compare computed:

- font family
- font size
- weight
- line height
- letter spacing
- color
- spacing and density

The desired result is the established V1 editor hierarchy unless an explicit
improvement is approved.

## Additional Browser Issues

Chrome also reported:

- 106 form controls without an `id` or `name` in one observed state
- 10 incorrect label/control associations in one observed state
- additional smaller counts after the component-picker failure

These are accessibility and form-contract issues and belong in the Goal Three
accessibility audit.

## Mandatory Regression Proof

Goal Three cannot close these findings without checked evidence that:

1. every bundled sample plays for a meaningful duration
2. audio time, displayed time, session frame, graph time, and visible frame
   remain synchronized
3. two captures from separated playback times are visibly different for every
   animated sample
4. transparent portable nodes and layers match the approved reference
5. ordinary playback emits no repeated color warnings
6. every registered component can be searched, previewed, and added without
   crashing the editor
7. the latest continuous-control value reaches the affected control and visible
   runtime result within a fixed input-to-visible-update budget without visible
   stepping
8. one slider gesture produces one canonical history result
9. dragging does not replace broad project/inspection state at pointer rate
10. node live values and debug values match canonical runtime results
11. graph pan, zoom, node movement, connection, and live updates meet a fixed
    interaction budget
12. Curve Spectrum matches controlled V1 reference captures
13. modal open and close motion is visible, smooth, and correctly interrupted
14. parameter typography matches the approved reference
15. the checked ordinary-use journey finishes without unexpected console
    errors or warning floods

## Parity Impact

The findings directly affect:

- `shell.visual-language`
- `layers.search-and-selection`
- `layers.visibility-compositing`
- `parameters.live-edit-responsiveness`
- `nodes.live-evaluation`
- `transport.play-pause-seek-loop`
- `preview.live-rendering`
- `preview.multi-layer-compositing`
- `persistence.sample-projects`
- `debugging.layer-debug-info`
- `performance.editor-responsiveness`

These rows are gaps until the product behavior and evidence satisfy their
acceptance criteria.
