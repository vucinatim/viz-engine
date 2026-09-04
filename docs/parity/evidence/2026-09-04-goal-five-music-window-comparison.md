# Goal Five Phase 1 Music-Window Comparison

Status: complete for `P1-03` against implementation baseline
`bd43c717600d9385ef6858ee502587d55e05686f` and the P1-01 input audit at
`9fdc0712c0e1e67ef7ebbaf5ed4e1c192e005a9c`.

## Decision

The deterministic provisional recommendation is
`hiphop-808-rap-f135-d2880`: the 48-second window from 2.25 through 50.25
seconds of `public/music/[HipHop] 808 Rap.mp3`.

Its exact decoded-source interval is:

- samples `[108000, 2412000)` at 48 kHz
- frames `[135, 3015)` at the declared 60 fps analysis timeline
- 48 seconds / 2,880 frames

It ranks first because the observed window combines five section-hypothesis
acts, a strong rising energy contour, the largest retained dynamic
range, dense transient detail, broad centroid movement, clean clipping
behavior, and an exact structural boundary alignment. The rank is a
transparent production-suitability observation, not an invented aesthetic
verdict.

Gate 1 still owns the real choice. A human must judge the track and window by
listening, correct or reject the section/phrase/downbeat hypotheses, assess
vocal and emotional fit, decide whether the music supports the intended visual
identity, and confirm that local-use authorization is sufficient. No audio was
played and no external input was acquired during this quiet checkpoint.

## Canonical Machine Evidence

The canonical machine record is the
[music-window analysis](./artifacts/2026-09-04-goal-five-music-window-analysis.json),
content identity
`sha256:e94ef2932f0ddd28f730711111e14d6d35ff952bc3328905f1e89dd6bb6657cc`.

It contains:

- all 14 and only the 14 P1-01 `source-music` candidates
- source byte identities, authority, provenance, and license status
- FFmpeg/FFprobe, Node, platform, decoder arguments, and analysis identities
- exact canonical interleaved decoded-PCM hashes and sample metadata
- complete-source, full-track-normalized frame analysis at 20 fps
- one-second energy and spectral observations across every decoded track
- section, beat-grid, phrase, and transient hypotheses with exact coordinates
- every evaluated-window disposition and three diverse retained windows per
  source
- exact sample, second, and 60 fps frame intervals
- decomposed scores, silence intervals, clipping observations, and the complete
  cross-track ranking

The analysis uses decoded sample count as duration truth. FFprobe duration and
its delta from decoded PCM remain recorded rather than silently substituting
container duration for actual samples.

## Complete Candidate Comparison

The table shows the highest-ranked retained window from every authorized
source. `Acts` means one plus the number of internal section-boundary
hypotheses; it is not a claim that the detector understands musical form.
Tempo and beat confidence are hypotheses and may contain half/double-time
aliases.

| Source                    | Best exact window (s) | Length | Score | Acts | Arc     | Dynamic | Tempo hypothesis | Beat confidence | Transients/s | Centroid mean | Silence | Clipped sample ratio |
| ------------------------- | --------------------: | -----: | ----: | ---: | ------- | ------: | ---------------: | --------------: | -----------: | ------------: | ------: | -------------------: |
| Acoustic — Guitar + Vocal |                94.000 |   52 s | 84.99 |    5 | falling |   0.223 |          200 BPM |           0.176 |         1.35 |      2,494 Hz |   0.000 |                0.000 |
| Bass — Future Bass        |                 0.000 |   52 s | 74.20 |    5 | rising  |   0.133 |         76.5 BPM |           0.069 |         1.65 |      3,002 Hz |   0.000 |                0.000 |
| Breakbeat — Funky         |               175.000 |   48 s | 75.41 |    5 | falling |   0.195 |         66.5 BPM |           0.061 |         1.50 |      3,614 Hz |   0.008 |                0.000 |
| DnB — Dancefloor          |                 3.000 |   60 s | 72.32 |    5 | rising  |   0.103 |        106.5 BPM |           0.096 |         1.28 |      2,714 Hz |   0.000 |                0.000 |
| DnB — Electric            |                 3.650 |   60 s | 75.70 |    5 | rising  |   0.126 |         86.5 BPM |           0.078 |         1.63 |      4,221 Hz |   0.000 |                0.000 |
| DnB — Rap                 |               141.000 |   52 s | 76.44 |    5 | rising  |   0.119 |         87.5 BPM |           0.141 |         1.83 |      3,828 Hz |   0.000 |                0.000 |
| HipHop — 808 Rap          |                 2.250 |   48 s | 89.12 |    5 | rising  |   0.260 |        102.5 BPM |           0.093 |         1.44 |      3,695 Hz |   0.003 |                0.000 |
| HipHop — LoFi             |                55.450 |   48 s | 67.26 |    5 | rising  |   0.120 |           87 BPM |           0.088 |         2.00 |      2,401 Hz |   0.000 |                0.000 |
| House — Progressive       |                 6.000 |   60 s | 65.29 |    5 | rising  |   0.064 |         63.5 BPM |           0.057 |         1.20 |      2,559 Hz |   0.000 |                0.000 |
| Jazz — Fusion             |                 0.000 |   52 s | 77.59 |    5 | rising  |   0.183 |           60 BPM |           0.074 |         1.81 |      3,256 Hz |   0.000 |                0.000 |
| Rock — Electronic         |                 0.000 |   48 s | 69.60 |    5 | rising  |   0.112 |           78 BPM |           0.068 |         1.56 |      3,199 Hz |   0.000 |                0.000 |
| Rock — Indie              |                 2.000 |   48 s | 63.39 |    6 | rising  |   0.094 |         71.5 BPM |           0.064 |         1.31 |      3,269 Hz |   0.000 |                0.000 |
| Synthwave — Retro         |                 0.000 |   60 s | 77.81 |    5 | rising  |   0.157 |        100.5 BPM |           0.094 |         1.42 |      3,160 Hz |   0.000 |                0.000 |
| Outsiders                 |               181.000 |   60 s | 77.70 |    5 | falling |   0.191 |           87 BPM |           0.077 |         2.75 |      3,550 Hz |   0.000 |                0.002 |

## Provisional Recommendation

### 1. HipHop — 808 Rap, 2.25–50.25 seconds

This is the strongest automated production-shaped window:

- energy quartiles rise `0.627 → 0.765 → 0.756 → 0.824`
- dynamic range is `0.260`
- four internal boundary hypotheses imply five possible acts
- transient density is `1.44/s`
- centroid p10/p90 spans approximately `1,463–5,999 Hz`
- observed silence ratio is `0.003`
- no clipped decoded samples were observed

The main uncertainty is musical, not technical. Its `102.5 BPM` estimate and
`0.093` beat confidence require listening and downbeat correction. The human
must also decide whether the lyrical/genre character matches the desired
flagship identity.

## Meaningful Alternatives

### Acoustic — Guitar + Vocal, 94–146 seconds

This window scores `84.99` and supplies the strongest beat-grid confidence
(`0.176`) and a large `0.223` dynamic span. Its contour falls
`0.860 → 0.837 → 0.761 → 0.659`, which offers a strong release or
transformation but does not independently satisfy the flagship's desired
build. The `200 BPM` result is explicitly an alias-prone tempo hypothesis.

### Synthwave — Retro, 0–60 seconds

This complete 60-second candidate scores `77.81`, rises toward its third
quartile, spans approximately `689–4,947 Hz` across centroid p10/p90, and has
no observed silence or clipping. It offers a clean full-length structure and a
visual identity naturally distinct from the two prior productions, but its
energy contrast (`0.157`) is weaker than the provisional choice.

### Outsiders, 181–241 seconds

This 60-second candidate scores `77.70`, supplies five section-hypothesis acts,
and has the densest transient field among the named alternatives (`2.75/s`).
Its falling energy contour (`0.928 → 0.876 → 0.820 → 0.760`) suggests a strong
release or deconstruction treatment, while its exact clipped-sample ratio of
`0.002433` needs human listening even though it remains far below the earlier
sampled-frame estimate.

### Jazz — Fusion, 0–52 seconds

This complete 52-second opening scores `77.59`, rises across all four energy
quartiles, spans approximately `1,092–5,971 Hz` across centroid p10/p90, and
has a negligible exact clipped-sample ratio (`0.000051`). Its `60 BPM` and
`0.074` beat-confidence hypotheses require human checking against the perceived
jazz phrasing.

## Observation And Ranking Contract

The tool consumes the P1-01 inventory instead of rediscovering a music folder.
It decodes each complete source exactly once through
`@viz-engine/bake/node.decodeVizAudioFileToPcm`, then computes one global
20-fps `rhythm-core.standard-audio-frame-analysis.v1` timeline. Candidate
metrics slice that common timeline. Exact clipped-sample ratios come from the
decoded PCM interval itself, not the gapped 20-fps FFT observation windows.
This order is load-bearing. `spectral-flux` and `onset-strength` are normalized
over the complete source. Baking each candidate separately would normalize
every window to its own peak and create a plausible but invalid cross-window
comparison.

Window search is exhaustive over the declared finite policy:

- durations: 48, 52, 56, and 60 seconds
- anchors: every section hypothesis, every eight-beat phrase hypothesis, and
  complete-track endpoints
- placements: anchor at window start, quarter, midpoint, or end
- coordinates: snapped to integer 60 fps frames and checked within one decoded
  source sample
- diversity: three retained starts per track, each at least four seconds apart
- tie-breaks: score, source start, duration, then stable identifier

The decomposed score measures multi-act potential, dynamic range, energy-span,
directorial arc, beat definition, transient density, spectral contrast,
boundary alignment, silence, and clipping. It does not measure emotional
meaning, lyrical suitability, visual taste, or subjective musical correctness.

## False-Pass Rejection

The checkpoint rejects the main ways this audit could look complete while
being wrong:

- exact P1-01 selection rejects technical fixtures, prior derivatives, and a
  missing or extra source
- source and decoded-PCM hashes prevent filename-only identity
- tracked or non-ignored untracked Bake, Rhythm Core, and observation-tool
  source-set hashes reject stale algorithm evidence even when an edit happens
  to preserve output bytes; only the tool's pinned artifact-digest declaration
  is normalized to break the content-address cycle
- full decode metadata rejects FFprobe duration as sample truth
- all sources are analyzed sequentially and failures abort the artifact rather
  than disappearing from a success count
- global normalization precedes slicing, so windows remain comparable
- full-track anchors and dispositions reject opening-only or hand-picked search
- exact sample/frame bounds reject rounded or out-of-range windows
- separate score components prevent a single opaque number from manufacturing
  creative confidence
- hypotheses remain labeled as hypotheses; filenames do not create section
  labels or genre truth
- synthetic quiet/build/peak/release, full-track normalization, PCM range, and
  candidate fixtures calibrate boundary, transient, exact clipping, score,
  stable tie, and diversity behavior
- historical digest tests reject semantic tampering even when counts remain
  valid
- `goal5:music:validate` cheaply verifies the immutable artifact digest,
  semantic shape, exact source identities, and inventory identity on every
  repository contract check
- `goal5:music:recompute` re-decodes every source and byte-compares the entire
  2.3 MB artifact under its recorded environment, without making routine
  repository checks host-specific

## Assumptions And Human Boundary

P1-03 makes these explicit assumptions:

1. The 14 candidates and local-use authority from P1-01 remain canonical.
2. A 60 fps coordinate timeline is the highest already-proven VizEngine
   cadence and remains an exact planning grid unless Gate 1 selects another
   final cadence.
3. Twenty analysis frames per second with FFT size 2,048 is sufficient for
   comparative planning; it is not the final runtime bake contract.
4. Section novelty, tempo, beat, phrase, and arc classifications are bounded
   deterministic hypotheses rather than musicological ground truth.
5. The score recommends where human listening should focus. It cannot approve
   intended audio or the flagship treatment.

Irreducibly human at Gate 1:

- intended track and exact window
- perceived sections, phrases, downbeats, build, release, and emotional arc
- vocal, lyrical, and genre suitability
- whether a candidate can support one coherent four-to-six-act visual work
- any 36–45 second exception
- licensing or redistribution beyond the already authorized local proof

## Reproduction

```text
pnpm goal5:music:update
pnpm goal5:music:validate
pnpm goal5:music:recompute
pnpm exec vitest run tests/foundation/goal-five-music-window-analysis.test.ts --no-file-parallelism
pnpm goal5:criteria:validate
```

`goal5:music:update` is the deliberate artifact-generation operation.
`goal5:music:validate` is the portable repository-wide contract check.
`goal5:music:recompute` is the environment-bound P1-03 evidence command: it
independently re-decodes all 14 exact sources, rebuilds the complete
observation, and rejects any byte difference.
