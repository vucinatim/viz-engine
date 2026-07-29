# 2026-07-29 Canonical-Document Cutover Browser Evidence

## Scope

This smoke verifies that replacing the editor-shaped project model with the
package-level `VizProjectDocument` did not visibly break the preserved editor
workflow.

It is evidence for the canonical-document cutover, not a complete parity or
performance certification.

## Environment

- branch: `codex/viz-engine-v2`
- active app: Vite editor at `http://localhost:4173/?allowSmallViewport=1`
- browser viewport: 1440 × 1000
- reference project: `simple-example.vizengine.json`
- bundled audio: `[HipHop] 808 Rap.mp3`

## Verified Workflow

The canonicalized bundled project loaded through the real Examples menu and
preserved:

- the established editor shell and dense panel layout
- three ordered layers:
  - Fullscreen Shader
  - Simple Cube
  - Noise Shader
- the expected live red-grid, patterned-cube, and noise composition
- the bundled waveform and transport
- the executable node graph projection, including Input, Output, HSL Color,
  Band Info, Math, Envelope Follower, and Normalize nodes
- visible React Flow controls and live node values

Playback advanced from the start to `00:01.57` during the measured observation
window and was paused afterward.

Rhythm Lab opened as the established alternate workspace, displayed its onset,
tempogram, tempo, grid, and extraction surfaces, and closed back to the editor.

The browser reported no warnings or errors during the final run.

## Profiler Reclassification

The earlier calibration classified the profiler as a known `gap` because its
optional CommonJS lookups were incompatible with the Vite browser runtime and
could silently omit initialization or node-network metrics.

The cutover replaces that lookup path with an explicit browser-safe metric
sink in:

- `src/lib/profiling/node-network-metrics.ts`
- `src/lib/stores/profiler-store.ts`

The Performance command mounted the collapsed profiler control in the real
editor without browser warnings or errors. This removes the proven runtime
compatibility gap.

The parity row is now `partial`, not `verified`: profiler overhead is not yet
benchmarked, and the full open/reset/close acceptance workflow has not been
automated across representative playback scenes.

## Result

The browser smoke supports the architectural claim that the canonical document
cutover preserved the established editor surface and representative workflows.
It does not establish complete V1 parity, deterministic output equivalence, or
performance parity.
