# 2026-07-29 V1/V2 Browser Calibration

## Scope

This is the first browser comparison against the immutable V1 reference:

```text
e806fbc10980615588b52ff574bc923c6f00f35e
```

It is a calibration smoke, not a complete parity certification.

## Environment

- V1: detached Git worktree at the pinned commit, Next development server
- V2: current `codex/viz-engine-v2` worktree, Vite development server
- browser viewport: 1440 × 1000
- reference project: `simple-example.vizengine.json`
- bundled audio: `[HipHop] 808 Rap.mp3`

## Workflows Compared

### Initial Editor Shell

Both versions rendered the recognizable VizEngine shell with:

- header and menus
- layer panel
- preview workspace
- audio waveform and transport
- quality, Rhythm Lab, export, help, debug, and guide controls

The V2 shell remains visually close to the V1 reference. This smoke does not
certify exact spacing, panel sizing, responsive behavior, or all control states.

### Sample Project Loading

In both versions:

- the Examples menu exposed the three bundled projects
- `simple-example` loaded three layers:
  - Fullscreen Shader
  - Simple Cube
  - Noise Shader
- the preview produced the expected red grid, patterned cube, and noise layer
- the bundled waveform remained available

The first V2 attempt failed with a maximum React update-depth error. The cause
was an unstable derived `graphEnabledStates` object in `HistoryManager`: every
history update caused a new selector result, retriggering the history effect and
replacing the history timer repeatedly.

The fix selects the stable graph-network reference and derives enabled state
with `useMemo`. A jsdom regression test now mounts `HistoryManager`, imports a
project, settles the history debounce, and proves an unrelated history update
does not schedule another project-history push.

### Node Graph Surface

The V1 and V2 fixture both exposed three enabled animations and rendered their
graph previews.

The initial V2 animation-menu attempt crashed because four node body components
used CommonJS `require(...)` inside the Vite browser runtime:

- Frequency Band
- Hysteresis Gate
- Spectral Flux
- Value Mapper

Those bodies now use ESM imports. The clean verification run rendered the
Hysteresis Gate preview, selected the Simple Cube size network, and displayed
the full React Flow node workspace without console errors.

This proves the representative existing graph can be opened and rendered. It
does not yet certify every node type, graph edit, connection, preset, clipboard,
undo, or performance criterion in the parity matrix.

### Rhythm Lab

V1 replaced the top-right preview/node workspace with Rhythm Lab and displayed:

- waveform selection
- onset controls
- tempogram controls
- tempo card
- grid card
- extraction placeholder

The initial V2 button changed state but displayed no Rhythm Lab because
`EditorPage` had stopped mounting `RhythmLabPanel` during the Vite shell
migration.

The V1 conditional shell behavior has been restored. The clean V2 run displayed
the same Rhythm Lab workspace and returned to the preview through its close
control.

This proves workspace presence and navigation, not the correctness or
performance of every DSP analysis path.

### Playback

- V1 playback advanced from the start after the play interaction.
- V2 playback advanced to `00:01.01` during the observation window and paused
  successfully afterward.

This is a transport smoke only. Seek, looping, audio/render drift, boundary
behavior, and longer playback remain unverified.

## Console Evidence

The pinned V1 run logged:

- an existing persisted node-network merge error followed by its documented
  fallback
- a React Scan version warning from an external development script

The final clean V2 run logged no errors or warnings while:

- loading the editor
- loading `simple-example`
- rendering animation previews including Hysteresis Gate
- opening and closing Rhythm Lab
- starting and pausing playback

A source audit still found optional CommonJS `require(...)` calls in profiler
instrumentation. Those calls are caught rather than crashing the editor, but
they can silently omit profiler initialization or node-network metrics in the
Vite runtime. Profiler parity therefore remains a known gap rather than an
audited success.

## Result

This calibration found and corrected three product-blocking regressions:

1. sample project load could blank the editor through a history feedback loop
2. opening animation previews could blank the editor through CommonJS calls in
   the Vite runtime
3. Rhythm Lab was no longer mounted in the active editor shell

The exercised workflows now pass in V2 and preserve the intended V1 product
posture.

No matrix row is promoted to `verified` from this smoke alone because each row's
full acceptance criteria cover more behavior than this run exercised.

## Remaining Evidence Work

- all bundled projects and component types
- layer CRUD, reorder, settings, and complete undo/redo
- parameter schemas, presets, and reset
- node creation, connection validation, clipboard, and all node bodies
- file import/export and persistence roundtrip
- image and video export artifacts
- live audio capture and permission handling
- profiler and debug tools
- deterministic render comparisons
- fixed-fixture performance and long-session benchmarks
