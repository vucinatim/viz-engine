# Signal Cathedral Production Certification

Date: 2026-07-30

Status: certified first agent-authored production.

## Outcome

Signal Cathedral closes the first complete V2 agent-authored production loop:

- one portable canonical project
- one trusted project-local capability pack
- one deterministic retained Three program
- one shared editable five-output music-reactivity graph
- one self-contained audio derivative and canonical standard bake
- one live editor session and the same command surface used without UI event
  synthesis
- one playable final video
- one portable bundle with explicit execution identities

The machine-readable summary is
[`artifacts/2026-07-30-signal-cathedral-production-summary.json`](../../../artifacts/2026-07-30-signal-cathedral-production-summary.json).

## Architecture Proof

The production implementation lives in
`@viz-engine/production-signal-cathedral`. Generic packages know only about
capability, component, node, renderer, bake, asset, artifact, and execution
manifest contracts.

The studio composes core and production capability in one
`src/lib/viz-capabilities.ts` root. Catalog, session, runtime preview, and Three
renderer attachments consume those same registries.

The execution manifest locks:

- project: `sha256:c0085922cb268a69b8306898b167a1e2386675fdcf96778a832c258e75bf9223`
- audio:
  `sha256:d13f1a0f9fe2af8cb088d08320f24822a8ecafddde4801143a52972fc4bc9dcd`
- bake artifact:
  `sha256:2f5f8dc41a8e2d49a499c91a4caeba711cbe8eb6f46863e1ad35428a49554f79`
- bake execution:
  `viz-bake.audio-feature-timeline.v1:c27288b9`
- runtime, capability-pack, component, node-package, renderer-backend, and
  renderer-program versions

The local bundle validator accepted the public bundle with zero issues,
including byte-level asset and artifact hash checks and complete component,
node, renderer, and bake coverage.

## Production And Media Proof

The final artifact is:

`public/productions/signal-cathedral/renders/signal-cathedral-final-1280x720-60fps.mp4`

Media probe:

- 12.000 seconds
- H.264, 1280 × 720, 60 fps
- AAC, 48 kHz, stereo
- 4,215,523 bytes
- SHA-256
  `a835883cafa005dc38851ea6cbb2e5adbf0abfd10137fa59bc6583383b2fcfb2`

All 720 frame metrics were present:

- blank frames: 0
- near-black frames: 0
- frozen frames: 0
- average browser render/capture time: 69.1411 ms
- p95: 71.9 ms
- maximum: 124.1 ms
- total frame production: 49,781.6 ms
- encode: 41,093.2 ms

The render/capture measurement includes GPU readback, pixel analysis, and JPEG
compression and is not a live playback frame-pacing measurement.

The contact sheet samples eight frames from the encoded final video. It shows
coherent cyan/violet architectural travel, legible central energy, bounded
shockwaves, controlled bloom, and meaningful musical progression. Its SHA-256
is
`852419d591a4139b31f5e43071f3512d3b1dee028932b23701d389cb4c5ff372`.

## Visual Iteration Findings

The first clip exposed one real discontinuity: an entire instanced arch changed
visibility at its wrap boundary. Consecutive-frame image difference at frame
525 was `0.1126`.

The retained program now applies per-instance near-plane fade through retained
instance colors. The same transition fell to `0.003409`, with continuous
luminance and no resource recreation.

The final 720p target was chosen deliberately. Sampled high-quality browser
capture feedback was approximately 79.4 ms at 720p and 93.3 ms at 1080p on the
certification machine. The authored project remains 1920 × 1080 capable; this
first encoded proof does not pretend the measured browser capture path met a
1080p real-time budget.

## Fresh Reopen And Determinism

A new isolated browser context with no persisted project opened the public
bundle and resolved:

- the correct Signal Cathedral project
- one production audio asset
- one standard bake artifact
- one 12-second timeline
- the correct production component and renderer program

Frame 360 rendered at 640 × 360 to:

- SHA-256
  `8527fc09dee569995799de25d2cff1c6b17fcf8314107ea9729c35de1b0528da`
- 192,501 PNG bytes
- average luminance `0.11647028935185312`
- dark-pixel ratio `0.1488715277777778`

The original and fresh contexts produced byte-identical PNG output and
identical metrics. Their host-local resource provenance labels differed
(`generated` versus `bundle`), as expected, while the execution manifest
locked the same underlying bytes.

## Preserved Editor Proof

The fresh project appeared in the preserved editor with:

- full grouped settings and presets
- the correct audio title and 0:12 duration
- five enabled animations
- Export, Jobs, Rhythm Lab, transport, waveform, and layer controls intact

Selecting Structure Pulse opened
`graph-signal-cathedral-reactivity` without changing revision or creating a
per-parameter graph. The editor projected:

- 18 canonical runtime nodes
- typed, editable Graph Input, Multiply, Add, and Clamp ports
- five protected named graph-output endpoints
- all canonical edges

Editing a projected portable node roundtrips without losing graph inputs,
outputs, node types, or production metadata. Disabling one parameter detaches
only that layer input; it does not disable or destroy the shared graph used by
the other four outputs.

At frame 550 the live shared graph reported zero issues and nonzero values:

- structure pulse: `0.9601613903045654`
- core energy: `0.6857243013381957`
- spectral shimmer: `0.45318009674549103`
- shockwave trigger: `0.2867406949400902`
- bloom accent: `0.24431936964392661`

One camera-sway change advanced revision exactly once. Undo restored `0.32`,
redo restored `0.41`, and a final undo restored `0.32` again.

## Live Performance Correction

The first live-artifact integration uncovered a severe hidden cost:
audio-artifact shape validation decoded and revalidated the packed 3 MB
timeline once per graph input, per frame. A representative seek could block
for tens of seconds.

Artifact validation and resolved-artifact lookup are now cached by immutable
object identity. Resolved host resources carry an explicit resource revision
into the runtime-preview session and are cloned only when that revision
changes.

After the correction:

- frame-550 seek latency: 22.5 ms
- graph issues: 0
- runtime-plan issues: 0
- a 12.503-second playback/loop observation completed 699 render cycles
- transport looped correctly to frame 29
- no runtime error or graph issue appeared

The preview driver also caps evaluation at the authored timeline rate on
high-refresh displays, avoiding duplicate evaluation of the same frame.

This browser observation is production acceptance evidence, not a replacement
for the existing fixed-device V1/V2 performance record.

## Scope And Assumptions

- The repository audio source is assumed authorized for this local production
  proof.
- Semantic determinism is the cross-host requirement. Byte-identical pixels
  were additionally achieved across the two browser contexts used here, but
  are not promised across different GPUs.
- Native Node-side WebGL video encoding remains a deliberate non-goal for this
  production. The agent operated through canonical session/job contracts
  without UI event synthesis; browser WebGL remained the installed renderer
  attachment.
- The broader parity matrix remains truthful: this production proves that the
  preserved workflows stayed intact for a demanding new scene, but it does not
  convert every still-partial V1 capability into `verified`.

## Gate

The production-specific architecture, media, visual, determinism, live editor,
node graph, transaction/history, persistence/reopen, export availability,
resource identity, and runtime performance gates are satisfied. Final
repository-wide gate results are recorded in the work ledger.
