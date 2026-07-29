# 2026-07-29 VizSession Runtime-Preview Ownership Evidence

## Scope

This evidence verifies the runtime-preview ownership cutover under the
preserved editor.

It covers:

- session-owned frame dispatch and runtime inspection
- browser-only attachment ownership
- representative editor workflow preservation

It does not certify complete product or performance parity.

## Architecture Evidence

The cutover is enforced by source and focused tests:

- `VizSession.preview.runtimeInspection` owns requested/completed frames,
  render cycles, rendered layer ids, runtime-backed layer ids, and failures
- live preview and image/video export dispatch through
  `vizSessionActions.preview.renderRuntimePreviewFrame(...)`
- `editor-runtime-preview-attachment-store.ts` owns only render callbacks,
  mirror canvases, and the Remotion player ref
- the player ref is not present in `VizSession`
- the former mixed preview store, editor preview controller, and editor-local
  frame module are deleted
- the remaining component-runtime bridge is retained only for the incomplete
  historical-component migration

Focused tests cover completed frames, failed frames, inspection reset,
attachment isolation and pruning, player-ref separation, local control-surface
inspection, and the package-runtime `Curve Spectrum` render-plan bridge.

## Browser Environment

- branch: `codex/viz-engine-v2`
- app: Vite editor at `http://localhost:4173/?allowSmallViewport=1`
- viewport: 1440 × 1000
- project: `simple-example.vizengine.json`
- audio: `[HipHop] 808 Rap.mp3`

## Browser Workflow

The sample loaded through the real Examples menu with:

- Fullscreen Shader
- Simple Cube
- Noise Shader
- the expected red-grid and patterned-cube composition
- the bundled waveform
- the executable node graph with live values and React Flow controls

Playback advanced to `00:01.83`. After pausing, the observed display remained
stable at `00:08.84` across the pause observation window.

Rhythm Lab opened with its onset and tempogram surfaces, then closed back to
the editor and restored the layer and graph workspace.

The video export configuration dialog opened with resolution, frame-rate,
quality, format, and timeline-range controls, then closed normally.

The browser reported no warnings or errors during the final workflow.

## Automated Gate

`pnpm check:foundation` passed with:

- parity validation across 41 capabilities
- package and studio type checks
- production studio build
- 30 foundation test files / 86 tests
- built-package consumer smoke
- agent creative-loop bundle roundtrip

## Result

The evidence proves the requested state-ownership cutover and representative UI
workflow preservation.

The live-rendering parity row remains `partial` because complete component
migration and a repeatable V1/V2 frame-time benchmark are still outstanding.
