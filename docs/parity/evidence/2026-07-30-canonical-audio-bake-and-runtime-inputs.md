# Canonical Audio Bake And Runtime Inputs

Date: 2026-07-30

## Claim

VizEngine V2 now has one deterministic standard audio-analysis artifact and one
runtime-input contract shared by browser and Node hosts, live/headless control,
components, node graphs, direct rendering, browser export, and Remotion.

This evidence certifies production-loop Phase 3. It does not certify the later
render-job, authored-visual, or complete product-parity phases.

## Architecture Proven

- `rhythm-core` owns centered frame extraction, Hann windowing, FFT, scalar
  feature analysis, and analyzer-compatible dense frames.
- Browser Web Audio and Node FFmpeg/FFprobe code are source-decoder adapters
  over the same PCM boundary.
- `@viz-engine/bake` owns strict requests, deterministic execution identity,
  synchronous and cooperative asynchronous execution, progress, cancellation,
  results, and observable job lifecycle.
- The standard artifact records source/window, frame alignment, decoder and DSP
  identity, scalar descriptors, and packed dense data.
- Standard dense frames retain `fftSize / 2` frequency bytes and `fftSize`
  waveform bytes per frame so established visual and graph semantics are not
  degraded.
- `@viz-engine/runtime` authoritatively validates and samples the artifact,
  including when scene FPS differs from bake FPS.
- Components declare semantic runtime bindings; the editor does not special
  case Curve Spectrum or manually inject graph audio.
- A successful bake is inspectable job output. Project attachment remains a
  separate revision-safe canonical transaction.

## Automated Acceptance

The final `pnpm check:foundation` passed:

- parity validator: 42 capabilities, zero recorded gaps
- all package, studio, and tool typechecks
- production builds for all packages and the Vite studio
- 44 test files and 186 passing tests
- packed-package installation and execution from a fresh external consumer
- the headless creative-loop scenario

Focused coverage includes:

- deterministic repeated DSP output
- silence, sine-band, impulse/onset, alignment, and packed-length behavior
- byte-exact base64 and sync/async parity
- progress and cooperative cancellation
- strict corrupted-artifact rejection
- source-content mismatch failure
- job attribution, immutable snapshots, lifecycle, and explicit attachment
- protocol decoding for job list/inspect/start/cancel/attach
- runtime sampling into Curve Spectrum and graph frequency analysis
- Remotion receiving the same sampled frame data

## Real Media Proof

The Node integration test creates a real WAV file, probes and decodes it through
FFprobe/FFmpeg, executes the audio bake job, attaches the artifact to a portable
bundle, writes and reopens that bundle, samples it through the runtime, drives
Curve Spectrum, and reaches the Remotion adapter.

The CLI also exposes directory-bundle audio baking and the live bridge exposes
job inspection and control without editor UI event synthesis.

## Fidelity Decision

An earlier compact-dense proposal was rejected during implementation. Compact
standard frames would alter bin-to-frequency mapping, weaken low-frequency
resolution, and make waveform/spectrum consumers behave differently from the
established analyzer path.

Storage optimization remains valid as a future explicit encoding or profile.
It is not allowed to silently change the standard runtime semantics.

## Remaining Work

- browser-visible job progress and output presentation
- canonical still/contact-sheet/clip/video render jobs
- automated media, visual-sanity, and performance feedback
- the new project-local visual and final portable production
- systematic closure of the remaining partial and unaudited V1 parity rows
