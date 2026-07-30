# Canonical Audio Bake And Runtime Inputs

Status: implemented and validated on 2026-07-30.

## Goal

Make one deterministic audio analysis result drive:

- headless inspection and rendering
- browser export
- known-track live preview when a bake is available
- scalar artifact-feature bindings
- waveform/spectrum-dependent components and graph nodes

The milestone is complete only when the browser-only offline FFT helper is no
longer the semantic source for render audio.

## Implemented Terrain

The previously disconnected audio paths now converge on one artifact and
runtime-input contract:

- `@viz-engine/rhythm-core` owns pure signal, framing, window, FFT, onset,
  tempogram, tempo, beat, scalar frame analysis, and analyzer-compatible dense
  frame generation
- `@viz-engine/bake` validates and executes synchronous or cooperative
  asynchronous audio bakes and exposes one observable job lifecycle
- `@viz-engine/contracts` owns the versioned scalar and packed-dense artifact,
  runtime input, and generic job contracts
- `@viz-engine/runtime` validates and samples those artifacts for components,
  graphs, direct rendering, and Remotion
- the browser export path decodes through Web Audio but uses the canonical bake
  execution and artifact sampler instead of an editor-local FFT
- the Node adapter resolves media through FFprobe and FFmpeg while retaining
  the same PCM and bake boundary
- the live editor host and headless CLI use the same bake job service and
  explicit artifact-attachment transaction

## Locked Decisions

### Pure PCM boundary

Canonical DSP accepts decoded PCM:

- sample rate
- one or more `Float32Array` channels
- explicit source window

Audio container decoding is a host adapter:

- browser hosts may use `decodeAudioData`
- Node hosts may use FFmpeg
- `rhythm-core` and browser-safe `viz-bake` do not import browser or Node media
  APIs

### One standard frame analysis

`rhythm-core` owns the standard per-frame analysis algorithm.

The first stable scalar vocabulary is:

- `rms`
- `loudness`
- `bass-energy`
- `mid-energy`
- `treble-energy`
- `spectral-centroid`
- `spectral-flux`
- `onset-strength`
- `waveform-peak`

Units and normalization are explicit per series. Graph shaping remains the
artistic behavior layer.

### Packed dense frames

The same artifact may carry frame-aligned:

- byte frequency spectra
- byte waveform samples

They are stored as one contiguous row-major byte buffer per channel and encoded
as deterministic base64 for JSON portability.

The stable `standard` profile preserves the full analyzer-compatible shape:

- `fftSize / 2` frequency bins
- `fftSize` waveform samples

This is intentional. Reducing the standard artifact to display-sized arrays
would change frequency-bin meaning, weaken bass resolution, and break
components and graphs that legitimately inspect the analyzer shape. Future
compressed or reduced profiles may be explicit alternatives, but they must not
silently redefine the standard profile.

### Explicit alignment

Artifacts record:

- source sample rate and channel count
- source start and duration
- video FPS and frame count
- FFT/window parameters
- centered-frame alignment
- spectrum bins and waveform samples per frame
- decibel mapping
- DSP pipeline identity
- source content identity

The same frame number must sample the same row in preview and render.

### One runtime audio snapshot

Runtime receives one explicit audio frame snapshot containing:

- frequency bytes
- time-domain bytes
- sample rate
- FFT size
- source/artifact provenance when available

Live analyzer frames and baked frames enter through the same runtime input
contract. Browser attachments decide where bytes come from; components and
graphs do not.

### Job separation

Audio feature baking is a job/operation, not a project mutation.

The local first implementation will provide:

- a strict request
- deterministic execution
- progress and cancellation hooks
- structured result/issues/metrics
- a Node PCM decoder attachment
- artifact registration through an explicit project transaction after success

Cloud durability remains an adapter over the same request/result semantics.

This is now implemented. A successful job registers its result with the
session host, but the project changes only when the caller explicitly attaches
that output through a revision-safe transaction.

## Package Boundaries

### `@viz-engine/rhythm-core`

- mono mixing
- centered frame extraction
- windowing and FFT
- scalar feature computation
- packed waveform/spectrum byte generation

No project, artifact, browser, filesystem, or job semantics.

### `@viz-engine/contracts`

- versioned audio timeline artifact
- frame alignment/source window/analysis identity
- typed scalar descriptors
- packed dense-frame descriptors
- runtime audio frame snapshot

### `@viz-engine/bake`

- strict audio bake request validation
- calls `rhythm-core`
- portable base64 packing
- artifact/ref/result construction
- deterministic execution identity
- cancellation/progress

Node-only decoding lives under `@viz-engine/bake/node`.

### `@viz-engine/runtime`

- authoritative artifact validation
- scalar and dense frame sampling
- converts a baked artifact frame into the canonical runtime audio snapshot
- feeds components and graphs through one runtime input contract

### Studio

- keeps Web Audio as a live attachment
- uses canonical bake execution for decoded known tracks
- stops using editor-local FFT as render truth
- exposes bake availability/provenance through the session/control surface

## Validation Gates

### DSP

- deterministic repeated output
- silence is finite and zero-like
- sine-band energy lands in the expected band
- impulse produces onset/flux response
- window and frame alignment are exact
- packed frame lengths match descriptors

### Artifact

- strict request/artifact validation
- encode/decode roundtrip is byte exact
- scalar and dense frame sampling clamp consistently
- same PCM/request/content identity produces byte-identical artifact payload
- changed identity or analysis parameters changes execution identity

### Runtime

- one artifact frame feeds Curve Spectrum and graph audio inputs
- live and baked snapshots use the same runtime path
- scalar artifact-feature bindings continue to work
- missing/misaligned artifacts produce structured diagnostics

### Product

- real bundled audio is decoded and baked
- artifact is inspectable and portable
- editor can attach/use it without UI event synthesis
- headless render samples the same frames
- complete foundation/parity/build/smoke gate passes

## Validation Record

The completed implementation passed:

- deterministic DSP, silence, frequency-band, onset, packed-size, async parity,
  progress, and cancellation tests
- strict request, artifact, corruption, source-identity, and runtime-sampling
  tests
- a real FFmpeg/FFprobe integration that creates media, decodes it, bakes it,
  writes and reopens a portable bundle, drives Curve Spectrum, and reaches the
  Remotion adapter
- live-control job start/list/inspect/cancel/attach protocol tests
- all package, studio, and tool typechecks
- production package and studio builds
- packed external-consumer smoke validation
- the headless creative-loop smoke
- the full parity/foundation gate: 44 test files and 186 passing tests

Detailed evidence:

- [2026-07-30 canonical audio bake and runtime inputs](../../parity/evidence/2026-07-30-canonical-audio-bake-and-runtime-inputs.md)

## Assumptions

- standard-profile PCM analysis is local and deterministic
- the first implementation uses the existing JavaScript FFT backend
- the standard profile defaults to full analyzer-compatible dense frames;
  storage optimization is a future explicit representation concern
- MP3/AAC decoding itself is not reproducible DSP and is recorded as a host
  decoder identity; PCM plus source content identity is the canonical analysis
  input
- extended beat/section analysis can build on this artifact without changing
  the standard scalar/dense-frame contract
