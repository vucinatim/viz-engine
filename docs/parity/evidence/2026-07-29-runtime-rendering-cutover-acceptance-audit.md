# Runtime Rendering Cutover Acceptance Audit

Date: 2026-07-29

## Purpose

Audit the complete runtime-backed rendering cutover against its actual
completion conditions rather than inferring completion from passing tests or
the accumulated implementation history.

The immutable V1 product reference is:

```text
e806fbc10980615588b52ff574bc923c6f00f35e
```

## Requirement Audit

| Requirement | Authoritative evidence | Result |
| --- | --- | --- |
| Preserve the complete editor component inventory | The pinned V1 and current `src/components/comps/index.ts` both contain the same 15 components. `editor-runtime-preview-plan.test.ts` asserts an exact count of 15. | proven |
| Every supported editor component renders through package runtime | All 15 canonical IDs exist in `@viz-engine/components-core`; strict registry creation and per-component deterministic tests pass. The editor coverage test asserts every definition is runtime-backed. | proven |
| Component scene meaning is no longer owned by browser/editor callbacks | Current editor definitions contain authoring metadata, schemas, presets, and graph declarations only. The `Comp` contract and all 15 objects lack `draw`, `init3D`, `draw3D`, and `createState`. | proven |
| Package output is deterministic from canonical frame inputs | `component-registry.test.ts` covers deterministic stateless, shader, particle, orbit, heartbeat, supercube, tunnel, morph, neural, and Stage behavior. Package-runtime source contains no raw `Math.random`, wall-clock, RAF, or timer dependency. | proven |
| Complex scenes retain renderer resources | `three-renderer.test.ts` covers stable shader, scene, instancing, polyline, post-processing, topology, signal, morph, and Stage resources across updates. | proven |
| One `VizSession` evaluation owns live preview semantics | `vizSessionActions.preview.renderRuntimePreviewFrame` creates one full-project plan from the canonical working project and records the completed frame in session inspection state. | proven |
| Preview and export share scene semantics | Live preview and `export-orchestrator.ts` both dispatch through `renderRuntimePreviewFrame`; export supplies explicit frame time and offline audio rather than invoking a second component path. The real MP4 contained three runtime-backed layers. | proven |
| Browser attachments present plans without owning component scene behavior | `editor-runtime-preview-attachment.ts` only owns canvas/WebGL lifecycle, generic diagnostics, mirroring, profiling, and fly-camera presentation. The only component-specific browser behavior is isolated in `editor-runtime-host-attachments.ts` as the Stage Fly Mode UI attachment. | proven |
| Temporary rendering bridges are deleted | The per-layer runtime bridge, duplicated audio-frame hook, editor preview controller, and editor-local frame contract are absent. No fallback dispatch remains in source. | proven |
| Preserved node graphs drive runtime component parameters | Every editor node kernel is registered at the runtime extension point. An Input → Sine → Normalize → Output graph is tested through final shader uniforms; browser evidence shows live Sine output driving a migrated component. | proven |
| Audio, playback, pause, seek, and parameter updates work in the real editor | Component slices cover audio-reactive playback and paused edits. The final audit sought through the real waveform from 0:00 to 12.03 seconds, observed an immediate changed runtime frame, resumed playback to 13.45 seconds, and paused. | proven |
| Persistence survives the cutover | Browser save evidence covers canonical JSON. The final audit changed Noise Shader Scale from 7.2 to 8.3, waited for persistence, reloaded the page, and recovered all three layers, three active animation networks, bundled audio, and Scale 8.3. The value was restored afterward. | proven |
| Still and video export use the migrated system | A 1920×1080 still preview and a real 1280×720 H.264/AAC MP4 were inspected. Start/middle/end MP4 frames were distinct and visibly contained the runtime grid and cube. | proven |
| No material performance regression remains unexplained | The strict fixed-device comparator passed all 21 checks: V2 measured 119.899 mean FPS, 9.900 ms frame-time p95, and 92.512 MB mean heap versus V1's 74.915 FPS, 17.600 ms, and 230.086 MB. | proven |
| Bounded longer playback remains stable | A 180-second, 362-sample soak crossed the complete bundled audio loop at 119.959 mean FPS and 12.200 ms frame-time p95. This is bounded playback evidence, not arbitrary edit-churn certification. | proven for cutover scope |
| Full repository quality gate passes | `pnpm check:foundation` passed parity validation, all package/studio/tool type checks, two production studio builds, 35 test files / 132 tests, built-package consumer smoke, and the creative-loop bundle roundtrip. | proven |
| Documentation describes the resulting architecture | `current-state.md`, the cutover plan, evidence slices, parity matrix, work ledger, and suggestions describe the one-session runtime path and remaining limitations. | proven after this audit |
| Preserved visuals remain faithful | Fourteen components have deterministic/browser evidence for their established scene structure, controls, animation, and visible output. Stage preserves the full stage/effect/DJ/crowd capability but intentionally replaces historical FBX character models with procedural retained actors. | product decision required |

## Component Evidence Map

| Component | Runtime evidence |
| --- | --- |
| Curve Spectrum | Slice 14 shared frame-audio and multi-layer browser proof |
| Debug Animation | Slice 1 |
| Feature Extraction Bars | Slice 1 |
| Strobe Light | Slice 2 and Slice 14 node-driven browser proof |
| Simple Cube | Slice 3 plus final performance/export/seek fixture |
| Fullscreen Shader | Slice 4 plus Slice 14 node-driven browser proof |
| Noise Shader | Slice 5 plus final persistence reload |
| Particle System | Slice 6 |
| Orbiting Cubes | Slice 7 |
| Heartbeat Monitor | Slice 8 |
| Instanced Supercube | Slice 9 |
| Light Tunnel | Slice 10 |
| Morph Shapes | Slice 11 |
| Neural Network | Slice 12 |
| Stage Scene | Slice 13 |

Every slice includes focused deterministic tests and real preserved-editor
browser evidence. The final shared-session, export, performance, seek, and
persistence proofs apply across the completed architecture rather than
reintroducing component-specific paths.

## Source Audit

The current source audit found:

- no component `draw`, `init3D`, `draw3D`, or component-local render-state
  property
- no per-component runtime-preview bridge
- no package-runtime use of raw randomness, browser RAF, wall-clock time, or
  timers
- no component, runtime, or Three renderer package imports from app/editor
  terrain
- one explicit component-specific host attachment for Stage Fly Mode, outside
  deterministic scene evaluation

Generic UI canvases in Rhythm Lab, the audio fader, color picker, chart export,
debug diagnostics, and mirror presentation still draw browser UI. They are not
visual-component scene evaluation paths and therefore are not obsolete runtime
ownership.

## Remaining Product Decision

The only unmet completion condition is whether visual faithfulness requires the
exact historical Stage character models.

Current V2 deliberately does not restore:

- roughly 27 MB of editor-bundled FBX files
- browser URL loading as scene truth
- mutable browser-`dt` animation mixers
- a preview-only character path that cannot reproduce export deterministically

It instead preserves:

- DJ and crowd capability
- the complete stage and effect rig
- deterministic camera, actor, light, and effect motion
- portable preview/export behavior
- retained renderer resources

Recommended decision:

- approve the retained procedural actors as the intentional V2 Stage character
  implementation for this cutover
- treat future production character fidelity as a new canonical materialized
  asset plus deterministic/bakeable animation feature
- do not restore the historical FBX browser path

Until that decision is approved, the architecture cutover is proven complete
but the goal's final visual-faithfulness condition remains open.
