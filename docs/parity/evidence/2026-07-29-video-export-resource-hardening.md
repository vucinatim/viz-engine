# Video Export Resource Hardening

Date: 2026-07-29

## Scope

Audit the preserved browser video exporter after preview and export converged
on the same `VizSession` frame-evaluation path.

This is automated contract and lifecycle evidence. It does not replace the
required browser proof of a playable encoded artifact.

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

## Remaining Product Evidence

`export.video` remains `partial`. Completion still requires a real browser
export whose downloaded artifact is inspected for:

- playable container and codecs
- requested dimensions, FPS, and duration
- synchronized trimmed audio
- deterministic visible frame sequence
- responsive progress and cancellation
- bounded resources after success and cancellation
