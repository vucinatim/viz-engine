# RH-02 streaming export evidence

Scope: incremental browser video encoding and output ownership. This closes only
RH-02 when accompanied by its passing exact checkpoint record. Production-scene
preview/export parity, long-duration A/V drift, quiet-host throughput and resource
endurance remain RH-03. No Goal Five creative or performance criterion is closed
by these small functional fixtures.

## Identity and architecture

Program: `goal-five-render-foundation`.
Definition: `7d14857310526ac660976fc1a6b5064a5de4fac4bdc02c93bc712e7abf03108a`.
Claim: `72874147-8283-4fa3-aa25-17cb5b1230fa`.
Lease: `44fbac8a-d4fb-458f-a0bd-443adb24d865`.
Owner: `codex/night/2026-09-08T0102`.
Starting commit: `ffe08d38ee3d92ee75295f01c99f51a17fe6b53c`.
The canonical completion record binds the terminal commit and passing checkpoint;
this tracked record cannot self-reference its own commit hash.

The shared Three host owns scene rendering. The browser executor borrows its
exact-resolution canvas and submits a synchronous video sample before advancing
the runtime. Awaited encoder handoff applies backpressure. The encoder attachment
owns codec configuration, timestamps, interleaved audio blocks and muxing; the
seekable OPFS sink owns positional writes and temporary-file deletion. One lazy
per-job decoded audio source is shared with feature baking. The generic render
job service owns elapsed wall time including source resolution and executor
cleanup. Studio composes these owners and presents results.

There is no retained JPEG frame sequence or general FFmpeg.wasm video path.
H.264 and VP9 video, and Opus audio, use negotiated WebCodecs configurations.
AAC uses the official Mediabunny libavcodec WASM worker with preserved encoder
packet timing. Maintained, pinned patches provide MP4 presentation edits and
cancel/close contracts; application code does not mutate private library state.
See [the implementation contract](../../plans/v2/streaming-export-implementation-contract.md)
and [dependency maintenance](../../../patches/README.md).

## Direct observations and false-pass controls

The browser suite `tests/browser/streaming-export.spec.ts` passed all five tests
with zero skips and retries in headless Chromium 151.0.7922.34, darwin arm64.
It is muted functional validation, not hardware throughput evidence or listening.
The final frozen-diff repetition is retained at
`.artifacts/autonomy/rh02-streaming-final.json`, including browser, Git/diff,
request, actual codec configuration and independently decoded observations.

- MP4 H.264/AAC and WebM VP9/Opus encode 30 changing 64x48 frames over one second
  with a nonzero stereo audio clip start. Independent FFprobe reads codec,
  dimensions, frame count and duration; FFmpeg decodes red first/blue final
  frames and distinct stereo tones. The library's own probe also reports the
  presentation duration. No editor canvas is mounted and no OPFS temporary file
  remains.
- AAC fixtures contain 400, 12,288 and 48,000 intended samples at 48 kHz, beginning
  at source sample 5,600. Independent MP4 box inspection reads a presentation
  start of 1,024 samples from authentic encoder priming and an exact intended
  duration. Nonperiodic band-limited signals correlate at zero lag at beginning,
  middle and end; tolerance is three samples with correlation at least 0.9.
  Displaced presentation start and truncated duration controls fail. Decoder
  block padding is recorded separately and is not mistaken for presentation
  duration or trimmed by discarding priming packets.
- Opus uses the same 400, 12,288 and 48,000-sample fixtures. Independent browser
  decoding at 48 kHz produces exactly those counts with zero-lag beginning,
  middle and end correlation under the unchanged three-sample/0.9 tolerances.
  Independent EBML inspection verifies actual OpusHead pre-skip, matching
  CodecDelay, 80 ms SeekPreRoll, positive final DiscardPadding and exact Segment
  duration. Zeroed discard produces excess decoded samples; changed delay fails
  the origin mapping invariant. The one-second WebM now reports 1.000 seconds and
  independently decodes to 48,000 samples in both browser and FFmpeg.
- Native handoff/finalization cancellation settles and a fresh export succeeds.
  Held worker initialization, encoding and flushing, rejected encoding and a
  worker error all settle with one worker created and terminated, no leaked
  temporary files and no unhandled page error. A subsequent normal export works.
  The five-second timeout is a hang detector, not a performance claim.
- Transparent PNG alpha and distinct red/blue contact-sheet cells survive borrowed
  canvas handoff. The consumer does not resize or destroy the host canvas.
- Foundation tests hold the encoder handoff and storage write to reject eager
  frame advancement, verify positional overwrites and final-order streaming
  hashes, and cover quota failure, abort, cleanup exceptions, unpublished URL
  revocation, PCM channel layout/clip/tail padding and exact lazy frame scheduling.
- A held asynchronous muxer `onFinalize` proves cancellation cannot be overwritten
  by a later success transition. Invalid presentation windows and incompatible
  MP4 modes reject explicitly. Matroska tests reject invalid callbacks/endpoints,
  non-Opus tracks, missing identification headers and insufficient coded coverage. A fake monotonic clock proves complete job time
  includes source resolution and does not add overlapping stage durations.

## Review and validation integrity

The sensory auditor identified codec priming and presentation interval inspection
as necessary evidence; metadata and a periodic tone alone could falsely pass.
The checker also caught a capability probe that omitted FPS; the maintained
preflight now uses the same requested frame rate as encoding, and a rate-specific
negative fixture proves rejection before capture.
The canonicalizer independently reviewed ownership, deletion, cleanup, alpha,
URL publication and dependency closure. Its final bounded review found no
remaining concrete release blocker. Checker review and exact passing staged
records accompany canonical closure.

Development failures remain failures: cancellation originally waited behind a
held worker/serializer; AAC timestamps initially lacked trustworthy priming;
movie timescale rounding lost sub-sample precision; a periodic correlation
fixture produced ambiguous matches; and zero-context package patches applied
insertions at the wrong locations on a fresh installation. The implementation,
stimulus and patch format were corrected without loosening tolerances or gates.
The initial WebM smoke allowed codec tail through its sample-count tolerance;
that gap was corrected in the muxer and the duration/sample assertions tightened.
The new single-packet test exposed two independent FFmpeg observer defects:
7.1.1 drops initial skip (712 samples); an isolated build of upstream fix
`2153c6795cf93bc374357a4408f425213d872398` drops tail discard (648 samples).
The unchanged artifact independently decodes to 400 samples in Chromium at 48 kHz.
The observer comparison and artifact hashes are retained in
`.artifacts/autonomy/rh02-media/opus-observer-failures.json`; source and normative
references are in the dependency-maintenance record. Browser decoding now enforces
exact Opus counts and correlation, with an independently corrupted tail control;
no padding, packetization or PCM workaround was introduced for the faulty observer.

All 24 modified Mediabunny files and four modified AAC files were compared byte
for byte with their intended sources after a fresh pnpm application; exported
ESM import and the complete browser suite then passed. The final dependency
hashes are in `pnpm-lock.yaml`.

## Explicit remaining limits

OPFS and exact requested codec configurations are required; unsupported browsers
fail explicitly. No alternate codec or resolution is silently selected. Audio
is still decoded as a whole source; baked features, per-frame feedback, output
Blob storage and nonfragmented MP4 sample tables remain retained costs. Reported
byte counts are not process peak-memory measurements. Successful job output URLs
still follow the existing job-history lifetime; an explicit retention/release
policy is recorded in `docs/suggestions.md`.

RH-03 owns integrated production scenes, editor mutation while real export runs,
long-window decoded synchronization and measured lifecycle/throughput. WebGPU,
TSL, worker rendering and conditional WASM/native computation remain documented
migration gates, not activated backend claims. Musical/aesthetic quality still
requires independent observation of actual visuals and audible music.
