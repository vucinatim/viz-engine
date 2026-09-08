# Maintained media dependency changes

The exact packages and patch hashes are pinned in `package.json` and
`pnpm-lock.yaml`. These changes are part of the supported export attachment.
They are installed by pnpm; application code never reaches into private muxer or
codec state. The patches cover the source and the package's exported ESM/CJS
entry points. Unexported, minified CDN bundles are not application entry points.

## Mediabunny 1.55.7

`IsobmffOutputFormatOptions.getTrackPresentationWindow(track)` supplies one final
presentation interval in coded-media seconds. It is called once per track when
final metadata is written and requires explicit `fastStart: false`. The option
rejects invalid configuration before encoding and rejects nonfinite, negative,
empty or out-of-media intervals at finalization. The muxer retains every coded
sample, including decoder priming, and owns all box sizes and offsets. It writes
a version-1 `elst` selecting the interval, updates `tkhd`/`mvhd` presentation
duration, and leaves `mdhd` and coded packet/sample tables intact. The movie
timescale is 28,224,000, divisible by every supported AAC sample rate and common
video frame rates, so sample-count edits do not lose precision. Header duration
inspection uses the track's movie duration, which includes its presentation edit,
instead of exposing padded coded duration as the presentation duration.

`canEncodeVideo({ frameRate })` negotiates the same requested rate used by actual
encoding; unsupported exact rates fail before capture starts.

`MkvOutputFormatOptions.getTrackPresentationEnd(track)` supplies the exact end of
an Opus track on the output presentation timeline. The muxer requires a finite
positive endpoint, an Opus track with its identification header, and coded
coverage of that endpoint. It reads `CodecDelay` from the header's pre-skip at
48 kHz and keeps `SeekPreRoll` at 80 ms. Coded packet timestamps and payloads are
preserved; a final `BlockGroup` carries positive nanosecond `DiscardPadding`.
Segment duration uses presented endpoints across tracks. An entire packet beyond
the requested endpoint rejects instead of silently accepting incompatible input.
This removes codec tail from presentation without trimming submitted PCM or
assuming a fixed encoder delay.

Cancellation force-closes codecs before waiting for finalization ownership.
Custom codec close runs even after serialized encode/flush failure, and can
interrupt a pending operation. Native encoder backpressure waiters wake on
closure; a codec created during cancellation immediately closes. Stream writers
release their locks, including on error. Finalization cannot restore success
after cancellation. Caller-owned IO cancellation still belongs to the output
sink; a muxer cannot cancel arbitrary external storage by itself.

## @mediabunny/aac-encoder 1.55.7

The encoder's existing FFmpeg bridge returns actual packet PTS and duration.
`AacEncoderPacketMetadata.aacTiming` preserves those integer sample coordinates
for every packet while keeping the nonnegative coded-media packet timeline.
VizEngine derives presentation start from the first reported PTS and presentation
length from the exact submitted PCM count. It never infers priming from total
file length, discards priming packets, or guesses a platform-dependent offset.

Worker close rejects pending requests and is idempotent. Worker errors and
message errors settle requests, and a worker created after cancellation closes
immediately. This makes codec cancellation work during initialization, encoding
and flushing, including a deliberately held worker response.

## Maintenance and removal contract

Keep both packages pinned together. Rebase these changes deliberately when
upgrading, inspecting source and exported entry points. Remove a patch only when
upstream supplies equivalent timing, presentation, cancellation and closure
contracts and the same independent tests pass without it. Do not silently fall
back to native AAC: its current API does not supply the required priming
provenance. Native video and Opus remain capability-negotiated WebCodecs paths.

Proof lives in `tests/browser/streaming-export.spec.ts` and the existing render
job/executor/output foundation tests. It includes independent FFprobe/FFmpeg
inspection/decoding, sample alignment, short and partial AAC blocks, displaced
and truncated controls, and held/rejected/erroring worker commands followed by
successful reuse. Independent Matroska traversal verifies OpusHead, codec delay,
seek preroll, tail discard and duration. Native browser decoding at explicit
48 kHz verifies short and partial Opus clips and rejects zeroed tail discard. Parser/muxer self-agreement alone is insufficient evidence.
Patch hunks represent surrounding context as identical removed/added lines.
This preserves standard replacement coordinates for pnpm while avoiding diff
marker whitespace in tracked patch files. Freshly installed files are compared
byte for byte with the intended package sources before browser validation.

Nonfragmented MP4 writes encoded payloads incrementally, but retains sample-table
metadata proportional to packet count. This is deliberate, reported storage;
it is not a claim of constant total memory or a fragmented streaming container.

Primary upstream context:
[AAC timing issue](https://github.com/Vanilagy/mediabunny/issues/444),
[AAC encoder attachment](https://mediabunny.dev/guide/extensions/aac-encoder).

## Independent decoder qualification

FFmpeg 7.1.1 mishandles simultaneous initial and final padding on a one-packet
Opus clip. Its decoder overwrites initial skip with zero; upstream commit
[`2153c6795cf93bc374357a4408f425213d872398`](https://github.com/FFmpeg/FFmpeg/commit/2153c6795cf93bc374357a4408f425213d872398)
fixes that operation, but initial-skip injection in the demuxer still overwrites
packet tail discard. A separately compiled build of that exact commit confirms
the second defect. The same unchanged 400-sample WebM decodes to 712 samples in
7.1.1, 648 in that build, and exactly 400 in Chromium's Web Audio decoder at 48 kHz.

The suite therefore uses independent browser decoding for Opus sample count and
signal correlation, alongside independent EBML parsing and corrupt-metadata
controls. FFmpeg remains the observer for AAC and ordinary audio/video decode;
its raw Opus count is retained and identified as invalid for that one-packet case.
No media mutation or post-hoc PCM trim compensates for either decoder defect.
`VIZ_MEDIA_FFMPEG` and `VIZ_MEDIA_FFPROBE` optionally select an observer binary;
the default is the executable on PATH, and observations record its version.

Normative Opus mapping and timing:
[Matroska Opus mapping](https://www.matroska.org/technical/codec_specs.html#a_opus),
[block timestamps](https://www.matroska.org/technical/notes.html#timestamps),
[DiscardPadding](https://www.matroska.org/technical/elements.html#DiscardPadding).
