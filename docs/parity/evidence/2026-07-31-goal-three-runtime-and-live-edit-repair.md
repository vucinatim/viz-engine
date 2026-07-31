# Goal Three Runtime And Live-Edit Repair

Date: 2026-07-31

Status: implementation checkpoint; not final parity certification.

## Scope

This checkpoint covers the first confirmed Goal Three failures:

- blank startup after an IndexedDB schema mismatch
- one-frame sample timelines and static playback
- CSS alpha loss in the Three renderer
- production component-preview crashes
- pointer-rate canonical project publication
- frame-rate runtime-inspection publication
- stale animated-value presentation

It does not close typography, modal motion, Curve Spectrum, node-editor
interaction performance, the complete sample/catalog audit, or the final
fixed-device performance certification.

## Implemented Contract

Continuous layer values now follow one explicit session-owned gesture:

```text
begin
  -> capture layer-local canonical base and project revision

update
  -> structurally update one transient layer
  -> notify only the exact control
  -> feed the transient layer into the ordinary runtime/render plan

commit
  -> apply one validated canonical action
  -> create one history result and one project revision
  -> clear the transient layer
```

The transient layer is never persisted or treated as a second project
document. Ordinary canonical mutation, load, undo, or redo cancels it.

The same controller supports component settings and canonical layer
properties. It currently backs numeric sliders, vector scrubbing, and layer
opacity, and establishes the contract for other continuous controls.

Runtime inspection is now a non-React latest-frame attachment. The render loop
publishes current plan references without cloning the project or replacing the
React-facing preview state. Agent/debug inspection clones only when explicitly
requested. Graph-node and animated parameter labels read the current values
imperatively on display frames.

## Deterministic Proof

Focused validation passed:

- editor-control live setting begin/update/commit/cancel and canonical
  interference behavior
- live layer-property preview and one-action commit behavior
- runtime frame/render plans consuming transient layers without mutating the
  runtime project
- runtime frames preserving the exact React-facing preview-state identity
- current runtime inspection remaining available through the editor facade
- Three alpha composition without warning output

The focused checkpoint run passed 48 tests across editor control, runtime
planning, preview inspection, editor app control, and the Three renderer.

The complete deterministic foundation phase passed:

- parity and dependency-architecture validation
- strict formatting and lint
- all package, studio, and tool type checks
- 55 test files / 239 tests

## Direct Browser Proof

Environment:

- Chromium through Chrome DevTools
- 1600 × 1000 CSS viewport
- device scale factor 1
- no CPU or network throttling

Parameter drag:

- Rotation Speed Y changed from `0.56` to `9.5`.
- Canonical project revision changed exactly once, from 3 to 4.
- Canonical action history changed exactly once, from 0 to 1.
- The React-facing preview-state object retained identity across the drag and
  more than 3,000 runtime render cycles.

Layer-opacity drag:

- Opacity changed from `1` to `0.02`.
- Canonical project revision changed exactly once.
- Canonical action history changed exactly once.
- Runtime inspection reported the same `0.02` effective opacity.
- The React-facing preview-state object again retained identity.

Playback:

- The bundled Simple Example reported a 2:24 timeline.
- Preview time, the visible scene, and the project audio element advanced
  together and paused together.

Component catalog:

- Signal Cathedral filtered to one result.
- Its thumbnail rendered with the composed studio Three-program registry.
- No preview fallback or console error appeared.

Console:

- no warning or error messages were present after the successful sample,
  slider, opacity, playback, and component-preview journeys

Persistence:

- the existing IndexedDB database retained its prior stores while adding the
  required VizSession store through a version upgrade
- a normal full reload restored the three-layer Simple Example project

## Remaining Performance Finding

The live path no longer performs canonical validation, whole-project
replacement, selector-cache invalidation, persistence, or history work for
pointer moves.

The frame loop also no longer clones a full host snapshot merely to read the
resource revision, and no longer structured-clones/publishes runtime
inspection through Zustand each frame.

Two DevTools drag traces still showed pointer-up end-to-paint results of:

- 106 ms for the component parameter
- 286 ms for layer opacity

The opacity trace consisted of approximately 4 ms input delay, 40 ms event
processing, and 242 ms presentation delay. The trace is a useful warning, not
yet a stable benchmark: the DevTools drag helper itself spans several seconds,
the scene was evaluating continuously while paused, and only one sample was
captured per interaction.

Goal Three must still:

- establish repeated fixed-device input-to-visible and release measurements
- determine whether paused scenes should render only on invalidation
- identify why the opacity commit produced a long presentation delay
- reduce the canonical post-commit projection/paint cost where measurements
  show it is responsible

No performance budget has been relaxed and no affected parity row should be
marked verified from this checkpoint alone.

## Complete Gate Result

The first browser-gate attempt ran while both manual-calibration tabs were
still evaluating the same three-layer scene continuously in the background.
That contaminated run timed out one save/reload read and measured churn at
55.672 seconds. It is retained as evidence that unconditional background
rendering creates real cross-tab contention, not treated as a product
benchmark.

After navigating both calibration tabs to `about:blank`, the isolated browser
gate passed all seven journeys in 4.5 minutes, including the unchanged
40-second churn ceiling, still-image export, and the nonblank/nonfrozen video
export.

All package builds, the production studio build, the built package-consumer
smoke, and the built agent creative-loop smoke then passed.

Checkpoint source metrics:

- production: 351 files / 68,472 lines
- tests: 57 files / 13,199 lines
- all maintained code: 447 files / 87,447 lines

The production increase from the immutable Goal Three baseline is 827 lines.
It includes the reusable transient-value controller, runtime override seam,
runtime-inspection attachment, IndexedDB recovery, transport repair, renderer
alpha handling, preview isolation, and UI bindings. This goal is not a
line-reduction campaign, but later cleanup should remove any duplication
revealed as the transient contract expands.
