# Artifact Container And Execution Identity Evidence

Date: 2026-07-30

## Result

Goal One Workstream 8 is implemented.

- execution manifests are composed once by `@viz-engine/project-bundle`
- package, capability-pack, component, node, renderer-program, backend, bake,
  asset, artifact, and project identities come from registered metadata and
  exact written files
- the Signal Cathedral production materializer no longer reconstructs an
  execution manifest or package versions by hand
- newly written standard audio artifacts use the versioned
  `viz-audio-feature-timeline-v1` binary container
- legacy JSON/base64 artifacts remain readable
- decoded binary artifacts retain raw `Uint8Array` frames at the resource
  boundary, while scalar feature values and deterministic sampling semantics
  remain unchanged

The format change is serialization-only. It does not reduce features, FFT bins,
waveform samples, frame coverage, or timeline resolution.

## Production Measurement

Measured with:

```sh
pnpm benchmark:artifact-container
```

Input:

- Signal Cathedral production artifact
- 720 frames
- 9 scalar feature series
- 2,211,840 packed frequency and waveform values
- 10,000 deterministic seeks per timing run

Observed on the development host:

| Metric | Legacy JSON/base64 | Binary container | Result |
| --- | ---: | ---: | ---: |
| Stored bytes | 3,133,447 | 2,337,004 | 25.42% smaller |
| Median decode | 2.568 ms | 0.686 ms | 73.28% faster |
| Median 10k seeks | 10.868 ms | 10.491 ms | no regression |
| Retained packed representation floor | 5,160,960 bytes | 2,211,840 bytes | 2,949,120 bytes removed |

The retained-memory figure is an explicit lower-bound representation model:
legacy retains the base64 payload plus the decoded cache, while the container
retains the raw packed arrays once. It is not a whole-process heap claim.

Both seek paths produced the same checksum (`2881316.7188340724`), and focused
tests compare exact packed bytes, scalar data, and sampled frame snapshots.

## Validation

- 11 focused audio/container/execution tests passed
- the real ffmpeg decode, bake, bundle, reopen, runtime, and Remotion path
  passed
- a freshly finalized Signal Cathedral bundle used `.vizaudio`, composed its
  execution manifest from registries, and passed canonical CLI bundle
  validation
- package builds and the repository ESLint gate passed

## Compatibility Policy

- absent artifact-entry encoding means legacy JSON
- `json` remains an explicit generic artifact encoding
- `viz-audio-feature-timeline-v1` is the canonical standard-audio container
- unknown encodings and corrupt/truncated containers fail closed with
  structured bundle issues
- a future incompatible container must use a new encoding id rather than
  silently changing V1 bytes
