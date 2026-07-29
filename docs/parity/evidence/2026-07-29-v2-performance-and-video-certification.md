# V2 Runtime Performance And Video Certification

Date: 2026-07-29

## Scope

Close the browser evidence that remained after the one-session runtime
rendering cutover:

- compare the real V2 editor with the immutable V1 reference on one controlled
  fixture
- run a longer V2 playback soak
- produce and inspect a real runtime-backed MP4
- exercise export progress, cancellation, cleanup, and development delivery

This evidence uses the finished capture-safe renderer configuration, including
retained WebGL drawing buffers on editor preview attachments.

## Persistence Regression Found During Measurement

The first V2 candidate had excellent frame pacing but grew from 853 MB to
1,216 MB of JS heap in 30 seconds. This was not renderer growth.

`createIdbJsonStorage` restarted its debounce timer on every Zustand persistence
notification. Continuous preview updates therefore prevented the timer from
firing while accumulating thousands of unresolved promises, each retaining a
serialized historical project value.

The storage adapter now:

- ignores unchanged serialized values
- flushes sustained changes on a real bounded throttle cadence
- serializes writes per key
- resolves or rejects every accepted write
- cancels pending stale writes before key removal
- permits a failed value to be retried

Focused tests cover unchanged-value deduplication, sustained updates, and
pending-write removal.

## Fixed-Device V1/V2 Comparison

Fixture:

- Chrome 150.0.0.0 on Apple M1 Pro through ANGLE Metal
- 1280×720 CSS viewport, DPR 2, quality 2
- `simple-example`
- Fullscreen Shader, Simple Cube, and Noise Shader
- three active node networks
- bundled `[HipHop] 808 Rap.mp3`
- 30 seconds at a 500 ms recorder cadence

Command:

```text
pnpm compare:runtime-performance \
  --baseline /Users/timvucina/Downloads/Pinned_V1_simple-example_30s_session_1785354064478_dt7gb0r.json \
  --candidate /Users/timvucina/Downloads/V2_simple-example_30s_final_capture_config_session_1785356647093_lr8n6y0.json
```

| Metric | V1 | V2 final | Result |
| --- | ---: | ---: | --- |
| Mean FPS | 74.915 | 119.899 | pass |
| FPS p05 | 70.035 | 118.824 | pass |
| Frame-time p95 | 17.600 ms | 9.900 ms | pass |
| Maximum frame time | 27.400 ms | 16.700 ms | pass |
| Mean JS heap | 230.086 MB | 92.512 MB | pass |
| 30-second heap growth | 64.937 MB | -9.205 MB | pass |
| Short-run heap trend | 24.100 MB/min | -14.874 MB/min | pass |

All 21 environment, fixture, duration, frame-pacing, and memory checks passed.
The compact exact result and raw-recording hashes are retained in
`artifacts/2026-07-29-v2-runtime-performance-summary.json`.

## Three-Minute Soak

The same V2 fixture ran for 180.008 seconds and 362 samples. This crosses the
complete 144.96-second audio loop.

| Metric | Result |
| --- | ---: |
| Mean / p05 FPS | 119.959 / 119.257 |
| Minimum sampled FPS | 112.000 |
| Frame-time p95 / max | 12.200 / 39.600 ms |
| Mean heap | 205.117 MB |
| Heap start / end | 151.791 / 229.426 MB |
| Heap trend | 16.123 MB/min |

The end heap remained below the V1 30-second mean and the longer-run trend
remained below V1's short-run trend. This is strong bounded playback evidence,
not proof that arbitrary edit churn or unlimited sessions cannot leak.

## Video Export Defects Found And Fixed

Two browser-only failures appeared in the real export:

1. FFmpeg loaded its core from a public CDN, and Vite development optimization
   could transform the package worker incompatibly.
2. The first successfully encoded MP4 contained black repeated frames because
   the WebGL buffers were cleared during the double-animation-frame delay
   before capture.

The final path:

- bundles pinned `@ffmpeg/core` JavaScript and WASM assets with the product
- excludes `@ffmpeg/ffmpeg` from Vite dependency optimization
- enables `preserveDrawingBuffer` only for editor preview attachments that must
  support capture
- captures immediately after synchronous runtime render and `gl.finish()`
- keeps catalog and thumbnail renderers on the cheaper default buffer policy

## Real Artifact Evidence

The final production export completed in 6.1 seconds:

- three of three layers were runtime attachments
- 88 frames rendered in 2.90 seconds
- FFmpeg initialized in 819 ms
- 90 virtual files were cleaned
- output size was 1,439,302 bytes

`ffprobe` reported:

- MP4 container
- H.264, 1280×720, yuv420p, 30 FPS, 88 frames, 2.933333 seconds
- AAC, 48 kHz stereo, 137 frames, 2.900000 seconds

Start, middle, and end frames had different hashes and were visually inspected.
Each contained the neon grid and procedural cube, with visible scene changes
across the sequence rather than repeated or black output.

The product checksum, media metadata, and sampled-frame hashes are retained in
`artifacts/2026-07-29-v2-video-export-summary.json`.

## Progress, Cancellation, And Development Delivery

The development server loaded the bundled FFmpeg core in 910 ms, registered all
three runtime attachments, and began rendering. Cancellation at frame 114 of
1,800:

- transitioned visibly through cancellation and cleanup
- stopped at the next bounded check
- closed the batch frame writer
- removed partial frame state
- returned to a usable settings/error surface

The only browser warning was the controlled browser denying Wake Lock
permission; export behavior remained correct.

## Honest Classification

This certifies the representative runtime playback comparison and real MP4
export workflow. It also supplies bounded playback-soak evidence.

It does not yet certify:

- measured input-to-visible-update latency for every editor interaction
- edit-heavy, track-switching, multi-panel sessions of arbitrary duration
- exact historical Stage FBX character appearance
- every supported export resolution, quality, codec, and browser combination
