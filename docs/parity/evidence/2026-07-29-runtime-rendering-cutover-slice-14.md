# Runtime Rendering Cutover — Slice 14

Date: 2026-07-29

## Scope

This slice removes the temporary per-layer runtime-preview architecture and
makes one `VizSession` runtime evaluation authoritative for live preview and
export presentation.

It also closes a hidden node-graph gap: the former bridge did not provide a
node registry, so canonical graph bindings could not drive runtime component
settings.

## Architecture Result

- `VizSession` evaluates the complete canonical project once per frame.
- One cached runtime session preserves graph checkpoints across sequential
  frames.
- Shared live/offline audio enters as explicit frame input values.
- Graph audio, frequency analysis, and time enter through explicit runtime
  graph inputs.
- Every preserved editor node kernel is available through the canonical node
  registry boundary.
- The browser attachment store slices one full plan into per-layer plans for
  the retained stacked canvases.
- Preview and image/video export call the same session action.
- Component catalog previews use a dedicated package-runtime plan builder.

Deleted:

- `src/lib/editor-runtime-preview-runtime-bridge.ts`
- `src/lib/hooks/use-audio-frame-data.ts`
- editor component `draw`, `init3D`, `draw3D`, and `createState` contracts
- the export store's duplicated current-offline-audio frame state

## Automated Evidence

Focused coverage proves:

- complete-project evaluation returns all ordered layers in one plan
- Curve Spectrum receives shared frame audio without project mutation
- a canonical Input → Sine → Normalize → Output graph changes a Fullscreen
  Shader runtime setting and final shader uniform
- every editor node definition resolves in the runtime node registry
- all 15 preserved components are runtime-backed and callback-free
- the browser attachment store receives already-sliced runtime plans
- session inspection reports rendered layers and non-fatal plan issues
- frame-scoped runtime inputs override project inputs without mutating the
  project

The full foundation suite is required before the slice commit.

## Browser Evidence

Environment:

- in-app browser
- `http://localhost:4174`
- 1280×720 CSS viewport
- quality multiplier 2
- bundled `[HipHop] 808 Rap.mp3`

Validated:

1. Added Fullscreen Shader and Strobe Light from the real layer catalog.
2. Confirmed two 1748×924 runtime layer canvases on the shared 874×462 preview
   surface.
3. Played transport from `00:00.00` to `00:00.90`, then paused.
4. Hid and restored Strobe Light; the corresponding main canvas left and
   re-entered visible layout.
5. Enabled Strobe intensity animation, loaded the Sine Oscillator preset, and
   observed live output change from `0.81` to `-0.81`.
6. Saved `my-viz-project.vizengine.json`; the downloaded canonical envelope
   contained:
   - schema `2.0.0-alpha.1`
   - two layers (`fullscreen-shader`, `strobe-light`)
   - one graph
   - Input, Sine, and Output nodes
7. Captured a still-image preview and verified its natural dimensions were
   1920×1080.
8. No new browser warnings or errors appeared across creation, playback,
   graph editing, visibility, save, or export.

## Plan-Evaluation Benchmark

Command:

```text
pnpm benchmark:runtime-preview
```

Fixture:

- Apple arm64 host
- Node v22.22.0
- all 15 preserved components
- 1280×720 viewport
- 30 warm-up frames
- 300 measured frames at 60 fps

| Path | Mean | Median | p95 | Max |
| --- | ---: | ---: | ---: | ---: |
| Canonical one-session plan | 0.352 ms | 0.299 ms | 0.674 ms | 0.996 ms |
| Former per-layer evaluation shape | 0.908 ms | 0.695 ms | 1.962 ms | 7.435 ms |

The canonical path was 2.58× faster by mean in this plan-only fixture.

This benchmark does not measure browser/WebGL frame pacing. It proves that the
session cutover itself stays comfortably inside the 16.67 ms frame budget and
removes repeated per-layer config/session work.

## Remaining Product Evidence

Later status: the fixed-device comparison, bounded soak, and real video-export
artifact were completed in
`2026-07-29-v2-performance-and-video-certification.md`. The list below records
what remained at the Slice 14 checkpoint.

This slice does not certify the complete product:

- fixed-device browser frame pacing and interaction latency still need direct
  comparison with pinned V1 commit
  `e806fbc10980615588b52ff574bc923c6f00f35e`
- long-session memory/resource stability remains unmeasured
- exact historical Stage FBX character appearance remains an explicit visual
  decision
- full video-export duration/encoding evidence remains separate from the
  still-image proof
