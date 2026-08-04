# Afterlight Assembly Motion And Rig Polish

Date: 2026-08-04

Status: certified. The repaired production, exact final bundle, regenerated
media, focused acceptance checks, and complete repository gate all passed.

Machine-readable results live in
[`artifacts/2026-08-04-afterlight-assembly-motion-and-rig-polish.json`](./artifacts/2026-08-04-afterlight-assembly-motion-and-rig-polish.json).

## Reported Failure

Manual review of the first Afterlight Assembly delivery found two material
problems:

- crowd characters appeared buried roughly to the waist
- motion was deterministic under seeking but much too fast and visibly jumpy

The graph rewrite was treated as a possible cause and audited rather than
assumed correct.

## Root Causes

### Character grounding

The crowd animation-texture bake sampled the authored clip, then reset the
first skeleton bone to an identity transform before writing the bone matrices.
The bundled FBX rigs author their hips around 92 to 99 source units above the
model origin. Applying the reset after world-matrix refresh converted that
valid bind-pose height into roughly -92 to -99 units of skinning displacement.
At the Stage model scale of 0.032, this placed the mesh about three world units
below the floor.

The fix preserves the sampled skeleton. Bind inverses already remove the bind
pose; the renderer must not normalize an arbitrary rig root during animation
baking.

### Temporal discontinuity

The first production bound raw audio features to character animation speed and
shader-wall motion rates. Those programs derive phase from absolute timeline
time:

```text
phase = timelineTime * speed
```

When `speed` changes between adjacent frames, the entire historic timeline is
effectively multiplied by a new number. In the reported region, adjacent
frames could jump roughly 0.4 to 0.6 seconds through a clip and could also move
backward. This explains why seeking was repeatable while playback still looked
glitchy.

The canonical semantic distinction is now explicit:

- amplitude or intensity values may follow smoothed audio features directly
- a rate is a per-second derivative
- a changing rate must be integrated into phase before it drives motion
- an absolute-time `speed` parameter must remain authored and stable unless a
  component exposes an explicit phase contract

`@viz-engine/nodes-core` now includes a deterministic temporal `integrate`
node. It replays through the existing runtime checkpoint system and produces
the same result under direct and sequential evaluation.

## Production Repair

The Afterlight graph is now a 26-node, eight-output amplitude graph:

- bass, treble, loudness, and flux use time-aware envelope followers
- onset uses bounded peak decay for intentional strobe and overhead impact
- wall scale/brightness, beam intensity, moving-light intensity, wash,
  strobe intensity, overhead intensity, and bloom remain reactive
- character speed, wall rotation/travel, camera cadence, and moving-light speed
  remain stable authored motion rates
- every graph node has a unique editor position; sources, envelopes, scaling,
  offsets, and outputs occupy readable columns

Creative motion was retuned without degrading the scene:

- character animation speed: 0.78
- cinematic path duration: 32 seconds with 0.08 interpolation speed
- wall rotation/color/travel rates: 0.18 / 0.65 / 0.28
- moving-light speed: 0.68
- strobe cadence: 0.09, with audio controlling intensity rather than cadence

The four existing FBX performers and 420-character crowd remain part of the
production. No procedural-character downgrade or production-only renderer path
was introduced.

## Acceptance Tests

The synthetic rig fixture now has a non-zero root height and verifies that the
baked crowd matrices never acquire the large negative vertical offset that
caused the floor intersection.

The full 720-frame source production trajectory is evaluated in one runtime
session. Every frame and graph result is issue-free and finite. Maximum
adjacent-frame deltas for continuous controls are:

| Output | Maximum delta | Budget |
| --- | ---: | ---: |
| wall scale | 0.043791 | < 0.06 |
| beam intensity | 0.073752 | < 0.10 |
| moving-light intensity | 0.087128 | < 0.12 |
| wash intensity | 0.130693 | < 0.18 |
| wall brightness | 0.225376 | < 0.26 |
| bloom strength | 0.090151 | < 0.11 |

The test also rejects any graph binding on character animation speed or wall
rotation/travel speed.

## Browser And Media Proof

The exact final public bundle was reopened and rendered through an isolated
browser editor using the new generic `render:browser-bundle` command. The tool
uses the same live-control and browser render-job contracts as the editor,
captures the browser download deterministically, records render feedback, and
fails on browser console/page errors.

The seven-frame contact sheet covers frames 0, 120, 240, 360, 480, 600, and
719. Visual inspection confirms grounded full-body crowd silhouettes and a
smooth close-to-wide camera progression. Browser feedback reported:

- average luminance: 0.207883 to 0.450060
- adjacent sampled content difference: 0.115909 to 0.218639
- blank or near-black frames: 0
- frozen frame pairs: 0
- browser diagnostics: 0

The final 360-frame video reported:

- average luminance: 0.105083 to 0.428328
- adjacent-frame content difference: 0.012897 to 0.218789
- blank or near-black frames: 0
- frozen frame pairs: 0
- browser diagnostics: 0

An independent FFprobe/FFmpeg pass confirmed:

- 12.000 seconds, 11,983,573 bytes
- H.264 High, 1280 x 720, 30 fps, 360 frames
- AAC LC, 48 kHz, stereo
- no detected black, freeze, or silence intervals at the configured thresholds
- mean audio level -15.2 dB and maximum -3.5 dB

## Pinned Identities

- project: `sha256:8315723a1ad2f0a8aa69af2a93c104ea79c2a84c60edd29e04ba313fdfc3bad8`
- execution manifest file: `sha256:a4c4b7e64a3e2ccf3bd3e20f3e3e97c49e78138593a3089b6906fbcd5aeaf217`
- audio: `sha256:8ed6942b63378b0ebd1597f9ead5987126d6d0a0c6a60987e05c844d013af923`
- baked artifact: `sha256:62d4b342614af0e040e4d037414595f8c2e4698a9ff990b391af3a1430beadfa`
- still: `sha256:02170ba1abf345963ea9575c00c32c0f0b140606eb66d7e3f36427e39f85e6e3`
- contact sheet: `sha256:fad1dc12d81894b6b39d34c75d5b9e95f00c12a8361289255fcc80cae7a1fcce`
- final video: `sha256:d611d794ef73684fa742f6707e68a6ede20b4a3d12fe5f5ab73a578512e41b2f`

All three media outputs reproduced byte-for-byte when rerendered from the exact
final bundle after the graph-layout polish.

## Assumptions And Boundaries

- The bundled clips are in-place performance animations. Future locomotion
  clips need an explicit root-motion extraction policy; they must not revive
  full root-bone normalization.
- The existing repository audio and model assets remain authorized for this
  product proof.
- Intentional onset flashes are evaluated separately from continuous-control
  delta budgets.
- The new integrator establishes deterministic rate-to-phase computation, but
  Stage does not yet expose generalized phase authoring inputs. Until that
  contract exists, graph-authored variable rates must not be bound to its
  absolute-time speed settings.

## Complete Gate

`pnpm check:foundation` passed from one uncontended run:

- parity: 42 verified, zero partial, gap, or unaudited capabilities
- architecture: 18 packages, no upward dependencies, cycles, undeclared
  workspace imports, or Node entrypoint leaks
- formatting, ESLint, all package/app/tool type checks
- deterministic tests: 64 files, 293 tests
- headed Chromium: 16 passed, 2 intentional opt-in skips
- all 18 package builds and the Studio production build
- built consumer smoke and built creative-agent-loop smoke

