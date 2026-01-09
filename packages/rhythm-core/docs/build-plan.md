# Rhythm Core Build Plan

This document defines a concrete, phased plan to build `@viz-engine/rhythm-core` alongside incremental editor UI tooling so each DSP milestone is testable and visualized as soon as it lands.

Abstract goals and philosophy
- Build a TS-native, browser + server rhythm analysis core that feels familiar to librosa users while remaining small, deterministic, and easy to extend.
- Make the editor Rhythm Lab a first-class “DSP workbench” that exposes every intermediate signal and parameter so the algorithm is understandable, testable, and debuggable.
- Keep outputs stable and predictable: same input + parameters must yield the same results across runs and environments.
- Maintain clean modular boundaries: rhythm-core is pure DSP; the editor handles all visualization and UX.
- Design for incremental growth: add features without breaking API contracts or visualization semantics.

Quality bar
- Deterministic, side-effect-free DSP functions.
- Clear input/output types and explicit units (samples, frames, seconds).
- Minimal hidden state; avoid global mutable data.
- Each stage returns inspectable intermediate data for UI and tests.
- Performance-conscious but correctness-first; optimize with WASM later.

Modularity and extensibility targets
- Core package
  - Isolated modules: signal -> stft -> onset -> tempogram -> tempo -> beat.
  - Pluggable FFT backend with a stable interface.
  - Configurable parameters with reasonable defaults and explicit overrides.
  - Additional feature modules can be layered without touching existing APIs.
- Rhythm Lab UI
  - Layered visualization components (base waveform, overlays, markers, gridlines).
  - Each analysis stage can be toggled and recomputed independently.
  - Visualizations bound to the same selection + time basis for alignment.
  - Worker-backed analysis to keep UI responsive.

Guiding principles
- Match librosa naming and concepts where practical, but implement a TS-native core with deterministic, inspectable outputs.
- Keep DSP core and visualization UI separate; the editor is the primary debugging surface.
- Prioritize outputs that are easy to visualize: curves, grids, phase shifts, and step-by-step optimization traces.

Scope summary
- Phase 0-3 deliver a usable rhythm/tempo/beat grid pipeline with a visual debugger panel.
- Later phases add robustness (DP/HMM), confidence tracking, and multi-band onset envelopes.

Current status (as of now)
- Workspace + `@viz-engine/rhythm-core` scaffolded with core modules and JS FFT backend.
- `onsetStrength` implemented (spectral flux) and used from the editor via a Web Worker.
- Rhythm Lab UI exists and reads the selected range from the custom waveform player.
- Manual recompute flow with loading state; no auto-recompute.
- Visualization: RMS envelope (filled), onset curve overlay, grid lines + amplitude scale, playhead, and live onset value bar.

Phase 0: Core scaffolding (DSP foundation)
Goal
- Establish core signal utilities and a minimal FFT backend contract so later features plug in without refactors.

Core tasks
- Add window functions: hann, hamming, blackman, rect
- Add signal framing utilities: frame(y, nFft, hopLength, center)
- FFT backend interface (pluggable): forward FFT and magnitude/power helpers
- Prepare feature module structure for onset/tempogram/tempo/beat

UI tasks
- Add a minimal editor overlay panel that can render numeric arrays as a polyline
- Support a second series (overlay) and horizontal marker lines
- Provide a basic file input hook (reuse existing audio loader if possible)

Exit criteria
- Simple plot panel can render any Float32Array, with scale normalization
- Core API skeletons compile and return empty shapes

Status: complete

Phase 1: Onset strength (flux)
Goal
- Compute onset envelope (OSF) from audio and visualize raw + onset curve.

Core tasks
- Implement STFT (or FFT over framed signal) with chosen backend
- Compute spectral flux between consecutive frames
- Add optional log compression and aggregation strategy
- Return onset_env and times (frames_to_time)

UI tasks
- Display raw waveform and onset envelope together
- Add controls for hop length, FFT size, and log compression
- Add simple stats readout: min, max, mean, peak

Exit criteria
- Onset curve is stable and reactive to parameter changes
- Visual aligns with audible transients on common test audio

Status: in progress
Notes
- Onset computed in a worker; manual recompute only.
- Overlayed onset curve is time-aligned to the selected range.
- Remaining: optional auto-recompute toggle, dB scaling option, and curve smoothing.

Phase 2: Tempogram + tempo selection
Goal
- Derive tempo candidates from autocorrelation and visualize tempogram.

Core tasks
- Autocorrelation tempogram of onset_env
- Convert lag domain to BPM range, apply min/max BPM
- Expose tempo candidates + dominant tempo
- (Optional) sliding window tempogram for tempo drift

UI tasks
- Display tempogram (curve or heat band)
- Show dominant tempo and top-N candidates
- Add min/max BPM controls, window length toggle

Exit criteria
- Tempo estimates are plausible for steady beat tracks
- UI shows tempo candidates and responds to parameter changes

Status: not started

Phase 3: Beat tracking v1 (comb phase)
Goal
- Find phase alignment for the dominant tempo and output beat grid.

Core tasks
- Comb/grid phase search over onset_env
- Produce beats in frames + times + grid lines
- Add confidence metric (sum energy at grid lines)

UI tasks
- Overlay grid lines on waveform/onset view
- Add phase offset slider and “optimize” button
- Visualize optimization by stepping phase offsets over time

Exit criteria
- Grid lines align with audible beats on steady tracks
- Optimize flow visibly steps rather than instant result

Status: not started

Phase 4: Beat tracking v2 (DP/HMM)
Goal
- Improve robustness for tempo drift, swing, and missing beats.

Core tasks
- Implement DP/Viterbi beat placement using onset_env + tempo prior
- Compute per-beat confidence scores
- Allow tempo curve output (time-varying)

UI tasks
- Display beat confidence (alpha or color intensity)
- Show per-step DP trace in a simplified form (optional)
- Add toggle between comb-phase and DP mode

Exit criteria
- Better beat alignment on complex tracks
- Confidence tracks user intuition and visual clarity

Status: not started

Phase 5: Extensions (optional)
Goal
- Expand capabilities without destabilizing earlier phases.

Core tasks
- Multi-band onset envelopes (low/mid/high)
- Downbeat estimation and bar grouping
- Alternative tempo estimation methods (Fourier tempogram)

UI tasks
- Multi-band overlay (color-coded curves)
- Bar markers, downbeat highlights
- Per-band parameter controls

UI mental model (code-defined pipeline)
- Output selector: a single dropdown for choosing the current extraction/output view (Grid, Kick, Snare, Hat, Custom).
- Read-only pipeline chain: horizontally scrollable cards showing DSP stages in code-defined order.
- Inline params per stage: each card exposes its most important parameters (with units + sensible ranges).
- Shared visualization: waveform timeline is the primary view; stages can toggle overlays (curves, grid lines, markers).
- Minimal per-card preview: optional sparkline + stats (min/max/mean) to keep the UI responsive.
- No graph editing: pipeline structure is authored in code; the UI only configures parameters.

Editor + rhythm-core symbiosis plan
- Define a Stage Contract in rhythm-core so the editor can render any stage generically:
  - id, name, inputs, params (with units + ranges), outputs (arrays + units), overlays, summary stats.
- Add an Analysis Graph definition (code-only) in the editor:
  - Ordered list of stage definitions (onset -> tempogram -> tempo -> grid -> extraction).
  - Each stage references a rhythm-core function + default params.
  - Provide a map of overlays to render on the timeline per stage/output.
- Build a Pipeline Renderer in the editor:
  - Renders cards from the graph definitions.
  - Binds UI controls to stage params and triggers recompute.
  - Shows compute status and last-updated timestamps per stage.
- Outputs and extractions:
  - Output dropdown selects which overlays + metrics are active.
  - Grid is its own output view, backed by the tempo + phase stages.
  - Extractions (kick/snare/hat/custom) consume grid + onset_env and produce hit markers.

Transparency requirements
- Every stage returns inspectable arrays and metadata (times, units, hop length).
- Every derived overlay is traceable to a stage output (no hidden transformations).
- Parameter changes recompute only dependent stages (avoid full recompute).
- Provide "export JSON" per stage for debugging and regression tests.

Testing strategy
- Unit tests for framing, windowing, FFT output size, and onset flux
- Golden-file style tests on short audio fixtures (deterministic outputs)
- Performance checks for medium-length files (1-3 minutes)

API stability strategy
- Keep `onsetStrength`, `tempogram`, `tempo`, `beatTrack` function signatures stable
- Add new options with defaults and document changes in `librosa-spec.md`
- Avoid breaking output types; add fields when needed

Implementation notes
- Start with a simple JS FFT and swap to WASM later without changing API
- Keep per-frame data in Float32Array for performance and memory efficiency
- Prefer deterministic algorithms over heuristic randomness
