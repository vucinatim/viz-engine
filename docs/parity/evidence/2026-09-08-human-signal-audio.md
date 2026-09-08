# Human Signal exact audio and cross-path evidence

EC-03 materializes the approved source samples `[108000,2412000)` as a
48-second, stereo, 48-kHz float32 WAV and a standard 60-fps audio bake. The
production package owns approved coordinates and references; `@viz-engine/bake`
owns sample validation, derivation, analysis and job lifecycle. Generic bundle
publication owns prepared validation, exclusive publication and rollback.
There is no production-local decoder, feature evaluator or render path.

## Exact sample and artifact observations

Two independently written and reopened bundles have identical canonical
projects, execution manifests and artifacts. Independent FFmpeg decoding of both
derivatives reproduces every float32 bit of the approved source slice. Both
contain 2,304,000 samples per channel. The WAV has 18,432,058 bytes and SHA-256
`b6c450401826ccfd9431a4f7a8e379e842ed9d6fc2e2421fdd72864d449c26af`.
Its sample-major, channel-interleaved little-endian PCM SHA-256 is
`ddf9b2e93f436bf8e9d1a345e08fccf86554a05efee1f92352a93c3c4c5a4c21`.

All 2,880 runtime frame samples match all nine scalar series and the packed
frequency/time-domain bytes. Reopened browser payload hashes equal Node hashes:

- frequency: `7095cf1a2a17661ace7f6365e969eb96f4388861fe362c9329e384907c87e84b`
- time domain: `c65158753fe4e86ce95a8582435b9936134d34b247d800a10deeabf58ec025a1`
- scalar series: `abd686c4d2ab11a360210cb93ceb28339c7501515bdc2ad9d70a58ddd10758db`

The bake algorithm identity is `viz-bake.audio-feature-timeline.v2`; its
execution descriptor includes actual PCM content/layout, actual decoder identity
and exact integer source bounds. The derivative recipe is
`viz-bake.audio-window.f32-wav.v1`. The observation uses FFmpeg 7.1.1; source,
decoder, artifact, renderer and implementation identities accompany the evidence.
One-sample shift and channel-swap controls produce different identities. Strict
rate/channel/window validation rejects malformed input instead of clamping it.

## Ordinary preview and encoded output

The browser journey loads the real production bundle without injected preview
audio. Ordinary preview and direct frame evaluation consume the exact baked
frequency bytes at frames 0, 404, 405, 1124, 1125, 1604, 1605, 2204, 2205, 2879,
then 405 again. This exposed and corrected paused-preview reuse of live/frozen
audio: a declared bake now owns audio selection before that policy.

Preview and same-resolution still pixels match exactly. A real 640×360,
60-fps H.264/AAC export covers frames `[400,412)`. Independently decoded frame 5
matches still frame 405 within the existing 0.015 mean absolute normalized pixel
error limit. The measured candidate error is 0.0117243. Re-rendering with a
valid-shaped but zero-frequency bake produces a worse comparison, 0.0158463,
exceeding the required 1.1× separation. Thus a mostly static image cannot alone
explain the positive comparison.

Independently decoded 48-kHz AAC correlates with the corresponding approved
derivative slice at 0.999418 with zero measured lag. The deliberately wrong
original-source offset correlates at only 0.036628. Both muxed tracks present
0.2 seconds; raw decoded AAC contains 640 extra tail samples, within the existing
one-frame (800-sample) tolerance. Raw decoder sample count is not claimed exact.

The production observation exposed underspecified video bitrate and avoidable
export resampling. The shared bitrate policy now includes FPS, high-quality AAC
uses 320 kbps, and export decoding respects declared sample rate. Lower-bitrate
candidate failures remain evidence: visual errors 0.022741 and 0.016177, followed
by audio correlations 0.97564 and 0.97961 before the final quality policy. These
are real quality improvements with larger output files, not hardware throughput
measurements. The backend identity advances to `viz-render.browser-webgl.v5`.

## Failure, cancellation and publication controls

Missing/corrupt declared artifacts fail with `audio-artifact-missing` or
`audio-artifact-invalid` before browser loading or rebaking; restoring the
artifact restores exact sampling. Standard artifacts require analysis and packed
frames. The longstanding hand-authored scalar-only example is now explicitly
specialized, with an authored fixture identity; it cannot impersonate a standard
bake. A missing declared derivative never falls back to full-source music.
Unresolved editor documents remain openable; required audio is enforced when
executing an audio export.

Real decoder cancellation waits for child closure, including bounded escalation
for a child that ignores termination. Source hash, probe and decode consume one
owned snapshot even if the caller replaces the original file. Cancellation at
final progress cannot publish an artifact. Derivative and bundle publication
preserve existing destinations, reject competing ownership, remove owned partial
outputs, report cleanup failures and support successful subsequent work.
Publication validation callbacks are read-only; filesystem IO and rollback stay
with the generic bundle owner.

Historical Gate 1 evidence remains immutable. Its validator now checks current
source identities and reproduces all 14 historical track PCM identities through
the current canonical decoder. Recomputed musical observations retain exact
algorithm/configuration/value comparison; only environment and implementation
source provenance may differ. Negative controls reject changed PCM layout,
feature values, boundaries, algorithm identity and configuration.

## Evidence scope and remaining gaps

The reproducible materialization report is
`.artifacts/autonomy/ec03-audio/materialization/audio-bake-manifest.json`.
`tests/browser/human-signal-audio.spec.ts` owns the real cross-path journey.
The active program closure archives the materialization inputs/outputs, actual
media, final browser report, failure observations and exact staged validation
records by content identity. Closure, rather than an unstaged candidate report,
establishes the final implementation identity.

This covers audio-musical-intent, runtime-temporal and portability evidence.
Headless software rendering does not certify hardware throughput, full-duration
endurance or creative quality. The production still has static initial layer
selection and zero executable graphs. The known performer model's external
normal-map reference is unresolved; no complete model-asset quality claim is
made. Final musical coherence, the seven-graph skeleton, reusable score and
compositor remain later work. WebGPU/TSL and related technology migration retain
the capability and parity gates in the rendering strategy.
