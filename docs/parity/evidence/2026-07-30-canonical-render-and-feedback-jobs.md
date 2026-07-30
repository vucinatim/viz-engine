# Canonical Render And Feedback Jobs

Date: 2026-07-30

## Claim

VizEngine V2 now has one explicit render-job contract for deterministic
diagnostic stills, contact sheets, real browser WebGL captures, encoded clips
and videos, media probing, visual sanity feedback, performance feedback,
progress, and cancellation.

This evidence certifies production-loop Phase 4. It does not certify the new
authored visual or final production bundle.

## Architecture Proven

- `@viz-engine/contracts` owns strict still, contact-sheet, clip, and video
  request/result shapes.
- `@viz-engine/render` owns source identity, executor selection, lifecycle,
  progress, cancellation, and result semantics without importing browser or
  filesystem mechanics.
- Render requests fail closed on project id, expected revision, and expected
  content-identity mismatches.
- The Node SVG executor materializes deterministic, content-addressed stills
  and contact sheets for fast headless inspection.
- The browser executor captures the actual preserved Three/WebGL compositor,
  not an SVG approximation.
- The browser waits for every project-layer attachment and renderer resource
  before the first frame. An uninitialized editor source is rejected.
- Browser FFmpeg is an executor attachment. FFmpeg, DOM, WebGL, Blob URLs, and
  browser audio URLs remain outside the portable render package.
- Successful outputs carry content hashes, byte length, media facts, execution
  identity, diagnostics, visual feedback, and performance feedback.
- The preserved editor, direct `VizControl`, live bridge, and CLI observe the
  same job records. The editor header presents progress, failures,
  cancellation, and output links without owning a second export lifecycle.

## Real Browser Proof

The preserved editor loaded the three-layer `simple-example` project and ran
real jobs through the mounted shared `vizControl`.

### Deterministic video-only clip

- 12 exact frames at 60 FPS
- 320×180 H.264 MP4
- 0.2-second probed duration
- 12,963 bytes
- SHA-256:
  `e7690650f1e88216c7a536fd0bd49901782e9ee187e9b39180fed8b454956d5b`
- repeated runs produced the same content identity
- no blank/near-black frames
- no frozen-frame pairs
- 2.23 ms average browser frame capture
- 4.20 ms maximum capture
- 235.60 ms encode time on the calibration run

### Audio-inclusive clip

A bundled MP3 was registered as an explicit resolved `audio` asset and attached
to the canonical project before requesting the clip.

- 12 exact frames at 60 FPS
- 320×180 MP4
- H.264 video stream
- AAC audio stream
- stereo, 48 kHz
- 0.2-second probed duration
- 16,846 bytes
- no blank/near-black frames
- no frozen-frame pairs

The editor's live analyzer was not used as hidden render truth. Visual frames
used the canonical baked-artifact sampling path or explicit zero input, while
the resolved audio asset was muxed by the encoder.

### Contact sheet and cancellation

- six requested frames at 320×180 were captured into a 968×364 PNG
- every sampled frame was nonblank and changed across the sequence
- a 100-frame browser job cancelled cooperatively after 16 captures and
  produced no successful result

## Defects Found By Feedback

The real loop found and fixed three issues that lower-level tests did not:

1. `@ffmpeg/ffmpeg` exposed FFprobe while the pinned `@ffmpeg/core` 0.12.6
   binary did not. The core is now aligned at 0.12.10.
2. FFprobe core 0.12.10 leaves its shared return sentinel at `-1` even after
   producing valid JSON. VizEngine accepts that sentinel only after strict JSON
   parsing proves at least one real audio or video stream; other failures still
   fail closed.
3. capture could race editor layer-attachment mounting and encode black frames.
   Browser rendering now waits for the exact project attachments and renderer
   resources before the first capture.

The first frozen-frame threshold also classified subtle legitimate 60 FPS
motion as frozen. Because raw pixels are compared before encoding, the
threshold now detects effectively identical frames instead of merely
low-motion frames.

## Automated Acceptance

The final `pnpm check:foundation` passed:

- parity validator: 42 capabilities, zero recorded gaps
- all package, studio, and tool typechecks
- production builds for all packages and the Vite studio
- 48 test files and 196 passing tests
- packed-package installation and execution from a fresh external consumer
- the headless creative-loop scenario

Focused coverage includes:

- strict request decoding
- exact source revision and content identity
- observable lifecycle and actor attribution
- cancellation with no successful result
- deterministic SVG output materialization
- direct and live CLI render operations
- generic job list/inspect/cancel behavior
- FFprobe JSON validation
- editor attachment readiness and cancellation

## Remaining Work

- author the new project-local visual through the canonical loop
- publish the portable execution manifest
- produce and visually review the final video and portable project
- reopen, rerender, and complete the final UI/UX/performance parity audit
