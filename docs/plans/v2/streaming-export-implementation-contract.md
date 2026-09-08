# RH-02 streaming export contract

Authority: user-approved render foundation; nightly run 2026-09-08, RH-02 claim
`72874147-8283-4fa3-aa25-17cb5b1230fa`, lease
`44fbac8a-d4fb-458f-a0bd-443adb24d865`, owner
`codex/night/2026-09-08T0102`, starting commit
`ffe08d38ee3d92ee75295f01c99f51a17fe6b53c`.

## Target and ownership

The existing browser executor feeds one frame at a time to the streaming
encoder/muxer and await backpressure before evaluating the next frame. The
complete JPEG sequence and general FFmpeg.wasm video implementation are deleted. MP4 uses
H.264/AAC and WebM uses VP9/Opus. Unsupported exact browser configurations fail
explicitly before frame rendering; no hidden codec, size, FPS or audio downgrade.

The job service owns complete wall time including source resolution. The executor
owns lazy frame scheduling, source lifetime and stage observations. The
encoder attachment owns capability negotiation, encoded timestamps, audio/video
interleaving, codec closure and media structure. A seekable browser output sink
owns positional writes, temporary-file cleanup and finalized bytes. Renderer
resources remain in the shared Three host. Studio is only composition/UI.
Mediabunny is the codec/mux attachment dependency, not an alternate scene runtime.

A render captures the host canvas synchronously before its next update; it must
not resize or destroy the borrowed host canvas. Encoder-owned samples close on
all paths. The next frame waits until the prior handoff is accepted. Audio is
sampled from one per-job decoded source shared with feature baking, then fed in
bounded blocks interleaved with video. Clip start is startFrame/timeline FPS;
output duration is frameCount/output FPS. If the source ends early, encode
explicit silence for the remaining requested duration rather than shortening
video. This keeps the render request authoritative.

Output bytes stream to a positional disk-backed sink where available. Hash the
final logical file in order, after all header rewrites, with bounded read chunks.
Nonfragmented MP4 retains packet-table metadata and writes its final metadata
after the media. The returned download Blob remains browser-owned output storage; do not call it
constant total memory. Decoded PCM, baked features, retained source blobs and
per-frame diagnostic metadata are separately retained and reported honestly.
Never put a known-buffer estimate into a field labeled process peak memory.

## Observation before implementation

Current: frames are accumulated as JPEG Blobs, copied into FFmpeg's virtual FS,
then encoded. Capture timing omits analysis and preparation; source/host setup
and output hashing are absent from elapsed reporting. Existing FFmpeg-command
unit tests cannot prove incremental production or actual codecs.

Desired: bounded producer advancement under a deliberately blocked handoff and
sink; positional overwrite bytes/hash correctness; deterministic absolute video
and audio timestamps; prompt cancellation at load, handoff and finalization;
no late output after abort; a subsequent successful run; and small real
codec outputs for both declared containers.

False passes rejected: an async generator eagerly consumed into an array; video
packets retained while all audio waits; header writes hashed in arrival order;
claimed output dimensions from metadata alone; codec support inferred from API
presence; missing audio reported as successful audio export; encoder cleanup
that leaves pending late writes; stage durations added as if they were wall time.

Tests extend existing browser executor/source/lifecycle owners and add only the
encoder/output tests needed by this boundary. A small detached, muted browser
smoke must encode, independently demux/probe and decode changing frames and a
synthetic identifiable audio signal. Bind browser/GPU/codec/library/request and
Git identities. Unsupported codec observations do not count as passing support.
RH-03 retains production-wide pixel parity, decoded A/V drift (16.667 ms),
negative calibration, long-run memory/throughput and editor mutation coverage.

Evidence lanes: project semantics, temporal runtime/audio, visual composition,
performance/lifecycle, portability and architecture. The sensory auditor's
read-only requirements are reflected here. No new human gate is needed for this
engineering scope. Musical/aesthetic quality still requires actual independent
artifact inspection/listening; silent waveform analysis is not listening.

## Dependencies and reference

Mediabunny 1.55.7 supplies WebCodecs encoding, muxing, backpressure-aware sources,
seekable stream targets and actual media inspection. Its AAC attachment uses a
libavcodec WASM worker because native WebCodecs AAC lacks trustworthy priming
metadata. Maintained package changes preserve encoder-reported sample timing,
MP4 presentation edits, sample-exact movie timescale, Opus codec delay/tail
discard and force-close behavior.
See [dependency maintenance](../../../patches/README.md). Incremental SHA-256 uses
@noble/hashes 2.0.1. The application owns integration/lifetime policies and tests.
Primary reference: [Mediabunny media writing](https://mediabunny.dev/guide/writing-media-files).
