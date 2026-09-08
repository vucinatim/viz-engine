# Rendering, performance, and deployment strategy

Updated 2026-09-07 after the user's approval of independent rendering,
exact-resolution output, streaming export, and modern graphics support.

## Contract and current state

One canonical project, runtime evaluator, render plan, and renderer implementation
serve both interactive preview and offline export. Hosts provide explicit inputs
and own their resource lifetime; the editor is a client, never an export dependency.
An export freezes its project, asset/artifact identities, authored camera, clock,
audio inputs, and output viewport. Editor resizing, gestures, transport, camera
navigation, or unmounting cannot change that export. Requested dimensions are actual
GPU drawing-buffer and layer-target dimensions, not a resized preview screenshot.

The current production graphics backend is Three/WebGL2, with retained renderer
programs, per-layer targets and GPU blend composition. Remotion is an optional
adapter concept, not the production runtime or the primary rendering path. The
Node executor currently supplies SVG still/contact-sheet rendering. A native or
hosted video runner must attach to the same render contract; it must not recreate
scene semantics. No cloud deployment, billing platform, or production mutation is
part of this work.

Before this implementation, browser export borrowed mounted Studio canvases and
live session inputs, resized the captured pixels, and retained a complete JPEG
sequence before FFmpeg.wasm encoding. Reported capture/encode stage durations did
not cover all wall time. Those are correctness and ownership problems before they
are optimization opportunities. Existing live performance certificates cover their
exact fixtures/devices, not every scene or production.

## Production-valid delivery

The immutable render-foundation definition is
`tools/repo/programs/goal-five-render-foundation.json`.
It inserted RH-01 through RH-03 before EC-02 through EC-27. RH-01 through RH-03
and EC-02/EC-03 are complete. The active
`tools/repo/programs/goal-five-production-foundation.json` preserves those exact
closures and moves the reusable EC-07/EC-08 prerequisites ahead of EC-04. See the
[dependency handoff](../plans/v2/production-foundation-dependency-handoff.md).
The predecessor definition and completed EC-01 evidence remain unchanged:
`goal-five-engine-completion`, definition
`adaa07fc59302c2e70ea389e1838c9b3a161129d31e2a410555066739fdad259`,
terminal commit `5e74191135098d79eab0bb1ff02b20056cb77add`.
EC-01's delegated authority remains in force; its historical completion is not
reclaimed or represented as new proof in the successor. Existing production,
parity, and creative criteria remain binding.

1. **RH-01 — shared render ownership.** Establish this roadmap and an independent
   Three render host at exact dimensions, use canonical runtime evaluation with
   explicit registries and inputs, move browser export off editor capture, and
   remove superseded ownership. Keep a working export consumer throughout this
   checkpoint. Focused observations prove ownership, dimensions, evaluation and
   cleanup; they do not certify encoded media or throughput.
2. **RH-02 — streaming export.** Replace the retained JPEG sequence with an
   incremental encoder/muxer handoff and explicit backpressure. Preserve audio
   source/clip alignment and supported container semantics through capability
   negotiation. Report complete elapsed time separately from overlapping stage
   costs. Abort and failure close frames, encoders, renderer resources and sinks.
   State memory bounds honestly: bounded transient frames is different from
   bounded total memory when encoded output, PCM or metric arrays are retained.
3. **RH-03 — integrated proof.** Exercise editor-absent rendering, preview/export
   equivalence, export isolation, decoded audio/video alignment, cancellation,
   delayed resources, supported formats and production fixtures in a real browser.
   Run integration validation and independent reviews. Measure performance on a
   quiet pinned host, retaining exact settings and environment. No fabricated
   benchmark or blanket "fully optimized" claim closes an unobserved criterion.

Estimates are advisory, not admission rules. Work is checkpointed and resumed;
insufficient time for an entire large item is not a reason to avoid useful work.
The user authorized ordinary implementation on the busy host for this session;
that authorization does not make noisy throughput numbers certification evidence.

## Streaming attachment implementation

RH-02 removes intermediate JPEGs and the general FFmpeg.wasm video runner.
Native WebCodecs encodes H.264/VP9 video and Opus audio. A pinned libavcodec AAC
worker preserves authentic encoder sample timing; maintained muxer changes map
that coded interval into exact MP4 presentation edits. This is a codec attachment,
not scene/runtime ownership. Native AAC may replace it only when equivalent
priming metadata and independent alignment evidence exist.

Frames and audio blocks advance together under awaited backpressure. Positional
OPFS storage owns temporary bytes; completed artifacts retain browser Blob
storage and are hashed incrementally after header rewrites. Nonfragmented MP4
keeps packet-table metadata, decoded audio/bakes remain retained per job, and
successful output artifacts remain retained by job history. These are explicit
remaining storage costs, not constant-memory claims. The job service measures
complete wall time separately from capture, analysis, handoff and finalization.

See [implementation contract](../plans/v2/streaming-export-implementation-contract.md)
and [maintained media changes](../../patches/README.md). RH-03 completed scoped
production parity, isolation, decoded A/V and lifecycle proof. Quiet-host
hardware throughput and full-duration performance certification remain separate
future evidence; software rendering does not establish those results.

The Human Signal audio checkpoint advances the browser backend identity to
`viz-render.browser-webgl.v5`. Video quality and file-size estimates share a
bits-per-pixel-per-frame policy, including FPS. High-quality AAC uses 320 kbps
(standard 192, draft 128), with larger files as the explicit quality tradeoff.
Export decoding follows the project's declared sample rate, defaulting to
44.1 kHz when absent. Human Signal declares 48 kHz and supplies a materialized
48-kHz bake. The standalone browser bake still defaults to 44.1 kHz; this is
not a claim that every browser decode path uses the production sample rate.

## Modern graphics roadmap

Modern capability support is a product direction, with explicit capability tests
and migration gates. It does not mean maintaining every possible rendering engine.

- **WebGPU and Three node materials/TSL:** advance the pinned Three version through
  a separately validated migration, port custom shader/material and compositor
  programs to supported node/TSL contracts, and add a WebGPU attachment using the
  same semantic render plans. WebGPU compute enables GPU-resident particles,
  simulation, instancing/culling and procedural work where profiling demonstrates
  value. Detect adapter limits/features and device loss. WebGL2 remains a declared
  supported backend where it meets a project's requirements; unsupported features
  receive typed diagnostics. A fallback backend must not silently change a scene.
  Remove the replaced implementation for each migrated owner; no perpetual old/new
  runtime split or duplicate scene evaluator.
- **WebCodecs:** negotiate actual encoder configuration support on the running
  browser, codec and dimensions. Hardware acceleration is a preference/capability,
  not a guarantee. Explicit timestamps, muxing, audio clipping and backpressure
  belong to the export attachment. Avoid GPU-to-CPU pixel readback and JPEG
  intermediates where supported; preserve lossless still export and honest
  unsupported-configuration errors. A native streaming encoder may share the
  host contract where browser codecs cannot meet declared requirements.
- **Workers and OffscreenCanvas:** move export/media orchestration and eligible
  rendering to workers once canvas, resources, cancellation and message ownership
  are explicit. This reduces main-thread contention; it does not by itself make
  GPU work faster. Keep interactive preview scheduling separate from export.
- **Measurement and GPU lifecycle:** distinguish runtime evaluation, CPU submission,
  GPU execution, resource loading, capture/readback, analysis, encoder work,
  mux/finalization and total elapsed time. Use asynchronous GPU timer queries only
  when supported and valid (including disjoint checks), and WebGPU timestamp
  queries only when available. Measure frame percentiles, memory and cancellation
  over real production duration. Pool targets, avoid redundant passes/uploads,
  batch/instance repeated geometry and cache compilation only where observations
  identify the cost. Color space, alpha, pixel ratio and output precision are
  explicit reproducibility settings.
- **WASM SIMD/threads and Rust/wgpu:** evaluate for measured CPU bottlenecks such
  as decode, DSP, geometry preparation or simulation. WASM is not a GPU renderer
  by itself. Rust/wgpu is a possible native/browser backend only if parity,
  portability and measured benefit justify its maintenance cost; it does not
  replace Three merely because native code sounds faster. Threaded WASM requires
  supported isolation and memory contracts.
- **Advanced visuals:** compute particles, procedural fields, richer lighting,
  postprocessing and higher precision/HDR are capability proposals with authored
  semantics, backend requirements and visual/performance evidence. Do not promise
  HDR, ray tracing or arbitrary cross-backend pixel identity without an explicit
  output/color pipeline and tested hardware support.

Migration gates: capability inventory and pinned dependency upgrade; ported
renderer programs and real production parity; deterministic time/resource tests;
lossless same-backend frame comparison and declared cross-backend tolerances;
context/device-loss recovery; interactive frame budgets and export/lifecycle
measurements; then default activation and deletion of obsolete paths. No modern
backend is called implemented until these observations exist.

## Acceptance and observation

Canonical owners are runtime semantics in `@viz-engine/runtime`, GPU presentation
and resources in `@viz-engine/renderer-three`, and export job/media orchestration
at the render attachment. Studio supplies registries and source snapshots. No
production-specific imports belong in generic owners. Preview navigation and
thumbnails stay in the editor.

- Assert drawing buffer and layer targets at the requested dimensions with a
  deliberately different editor size and device pixel ratio. A fine-detail frame
  rendered directly at target size rejects an upscaled-preview false pass.
- Compare plans and lossless frames at equal inputs/resolution for cold seek,
  sequential playback, repeated seek and nonzero starts. Include authored camera,
  blends, disabled layers and delayed texture/model readiness. Mutating or
  unmounting the editor while exporting must not change frozen output.
- Decode real exported video and audio: beginning/middle/end impulses and flashes,
  clip offsets and differing timeline/output FPS reject shifted or drifting media.
  Existing pinned certification tolerances remain SSIM >= 0.995, normalized MAE
  <= 0.006, and audio/video start/duration drift <= 16.667 ms where applicable.
- A slow/blocked sink must halt frame production at the documented bound. Abort
  during resource loading, frame submission, backpressure, flush and finalization;
  inject failures and prove subsequent exports work without late callbacks.
- Retain commit, source/request identities, assets/bakes, renderer/codec settings,
  browser/OS/GPU, DPR and color configuration with every meaningful measurement.
  Structural/unit evidence never stands in for real GPU/media observation.

Evidence lanes: project semantics, temporal runtime, visual composition, motion,
audio, editor parity, performance/lifecycle, portability and architecture.
Independent artifact inspection assesses visible regressions and motion; numerical
similarity alone does not establish aesthetic or musical quality. Listening must
actually occur before claiming an audio experience review. User taste and changes
to product direction remain human decisions; technical parity needs no extra gate.

## Primary references

- [WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)
- [Three WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html)
- [Three Shading Language](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language)
- [WebCodecs](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
- [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)
- [WebAssembly concepts](https://developer.mozilla.org/en-US/docs/WebAssembly/Guides/Concepts)
- [wgpu](https://wgpu.rs/)
- [WebGL GPU timer query](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/)
