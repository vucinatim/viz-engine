# Human Signal exact audio and bake observation

EC-03 must materialize source samples `[108000,2412000)` at 48 kHz into a
2,304,000-frame-per-channel lossless derivative. Verify the approved full source
file and sample-major/channel-interleaved float32 little-endian PCM hashes
before slicing. The derivative starts at local sample zero; the standard bake
covers exactly 2,880 frames at 60 fps, with explicit algorithm parameters and
actual PCM/decoder provenance in execution identity.

The production package owns approved coordinates, source identities and authored
asset references. `@viz-engine/bake` owns PCM validation, content identity and
strict slicing; its Node entrypoint owns filesystem decoding/materialization.
The existing job service owns progress/cancellation and artifact creation.
Runtime artifact sampling and ordinary preview policy own cross-path audio
selection. The existing bundle and render services retain their ownership.
Production-local decoders, feature loops, hidden frame cues, test-injected
preview audio and missing-artifact rebake/silence substitutions cannot prove
this checkpoint.

## Observations

- Decode the actual approved source, derive twice, independently decode both
  lossless outputs, and compare every float32 bit to the approved source slice.
  Record adjacent start/end samples. One-sample shift, channel swap, wrong rate,
  changed source bytes and truncated intervals must fail.
- Bake the derivative through the canonical asynchronous job service. Compare
  all nine scalar series and packed frequency/time-domain bytes across repeated
  materialization and bundle reopen. Assert exact identities, local origin,
  sample rate, FPS and frame count.
- Observe ordinary mounted preview and direct seeks without injected audio,
  forward/backward/repeated seeks, still evaluation, and one short actual video.
  Compare consumed features at the same source/act boundaries and representative
  varying frames against the reopened artifact. Whole-artifact equality provides
  inexpensive complete frame coverage; a video duration probe alone does not.
- Retain a declared artifact reference while removing/corrupting its payload;
  require typed failure, then restore it and prove recovery. A genuinely unbaked
  project is distinct from a broken declared artifact.
- Observe cancellation in actual decode, cooperative analysis and output
  materialization. Require monotonic stage-local progress, terminal settlement,
  no attached partial artifact or late output, and successful subsequent work.
  Non-abortable browser decode completion is distinct from job cancellation.

Evidence lanes: audio-musical-intent, runtime-temporal and
portability-reproducibility. PCM/features have zero tolerance. Encoded A/V uses
the existing one-frame tolerance; visual comparisons retain RH-03's pinned
headless browser, dimensions and metrics. Record exact claim/commit, decoder,
bake and renderer identities. Software rendering does not certify hardware
throughput. Listening and final musical/emotional coherence remain human or
later delegated creative judgments; no new aesthetic gate is needed here.
