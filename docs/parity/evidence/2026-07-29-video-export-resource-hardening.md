# Video Export Resource Hardening

Date: 2026-07-29

## Scope

Audit the preserved browser video exporter after preview and export converged
on the same `VizSession` frame-evaluation path.

This began as automated contract and lifecycle evidence. The required browser
artifact proof is now recorded in
`2026-07-29-v2-performance-and-video-certification.md`.

## Findings And Fixes

The renderer-to-frame path already evaluates the absolute runtime frame from
`startTime`, FPS, and the offline audio frame before presenting and capturing
the stacked runtime canvases.

The encoder audit found resource-lifecycle problems around that correct frame
path:

- the first encoding-progress callback could remain attached to the singleton
  FFmpeg instance across later exports
- the 15-minute timeout remained scheduled after successful encodes
- successful cleanup happened only on the happy path
- cancellation, timeout, or encoding failure could leave the worker and its
  virtual filesystem in an uncertain partially populated state
- MP4-only `+faststart` metadata was also passed to WebM
- file-size estimates assumed 60 FPS even when the export used another rate

The encoder now:

- attaches only per-encode progress handlers and removes them in `finally`
- clears cancellation polling and the encoding timeout in `finally`
- cleans every successful virtual input/output file from one finalizer
- terminates and invalidates the FFmpeg singleton on any failed encode, which
  stops in-flight work and discards the partial virtual filesystem
- creates a fresh encoder after load or encode failure
- emits `+faststart` only for MP4
- includes the selected FPS in size estimates

## Automated Evidence

`tests/foundation/video-encoder.test.ts` proves:

- exact MP4 video/audio codec, trimming, shortest-stream, pixel-format, and
  fast-start command order
- WebM uses VP9 without MP4-only metadata or an absent audio input
- equal-duration exports produce equal size estimates at different FPS values

Studio typechecking and the complete foundation gate remain required.

## Completed Product Evidence

The real browser certification now covers:

- a playable 1280×720, 30 FPS H.264/AAC MP4
- requested dimensions, FPS, and trimmed duration
- distinct visually inspected start, middle, and end frames
- three runtime-backed layers driven by offline audio frames
- visible progress and responsive cancellation
- successful and cancelled virtual-file cleanup
- production and development delivery of the bundled FFmpeg core

`export.video` is therefore classified `verified` for its recorded acceptance
criteria. Broader browser/codec combinations remain normal compatibility work,
not a blocker to this representative workflow.
