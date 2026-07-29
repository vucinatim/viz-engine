# Runtime Rendering Cutover — Slice 13

Date: 2026-07-29

## Scope

This evidence covers the package-runtime migration of `Stage Scene`:

- stage, ground, DJ booth, speaker stacks, and illuminated stage outline
- three-panel Mandelbox shader wall
- canonical cinematic camera paths and manual camera settings
- retained beams, lasers, moving lights, wash, strobes, blinders, accents,
  fog, and bloom
- deterministic DJ and crowd presence and motion
- renderer-owned debug helpers
- browser-hosted WASD fly-camera attachment
- removal of the final editor-owned `init3D` and `draw3D` callbacks

## Architecture

The preserved editor definition now contains only its established authoring
schema and default node-network declarations.

`@viz-engine/components-core` projects the complete nested Stage Scene settings
into a serializable `viz-core/stage-scene/v1` program node. The node includes
canonical frame, fps, time, seed, camera, shader-wall, light, effect, character,
and diagnostic parameters.

`@viz-engine/renderer-three` owns one retained scene containing:

- one fixed stage/environment assembly
- one instanced speaker batch
- one shared shader-wall material over three retained panels
- six retained beam meshes
- twelve retained laser beams and fourteen retained laser sheets
- eight retained moving lights and targets
- retained stage, wash, blinder, overhead, accent, and DJ lights
- one retained ten-unit strobe batch
- one retained 1,000-capacity crowd instance batch
- one retained procedural DJ actor
- one retained helper batch
- one perspective camera, fog, and shared bloom pipeline

Compatible updates keep the scene, program, groups, meshes, geometries,
materials, lights, camera, and post-processing attachment alive.

Fly Mode is deliberately outside scene evaluation. The editor installs a
browser host attachment on the Stage action button, while the preview
controller exposes only a camera-pose override seam. Exiting Fly Mode commits
manual camera position and rotation through canonical project actions and
disables cinematic mode. Runtime and export plans remain free of DOM, pointer
lock, keyboard, and mouse state.

Button actions are now editor metadata rather than project data. Button values
resolve to serializable `null`, closing a catalog/project cloning failure that
the browser pass exposed.

## Determinism

All moving visual state is a direct function of canonical frame time and seed:

- cinematic camera smoothing replays a bounded deterministic EMA window
- beam, laser, moving-light, accent, and actor motion use explicit time
- strobe and random-blinder selection use seeded frame hashing
- crowd placement, color, scale, phase, and movement use stable seeded hashes
- no Stage runtime path calls `Math.random()`, uses `setTimeout()`, advances an
  `AnimationMixer` by browser delta, or accumulates scene rotation

Seeking and export therefore produce the same scene state as sequential live
playback for the same canonical project, frame, and seed.

## Character-System Assumption

The historical Stage loaded roughly 27 MB of browser-bundled FBX files and
advanced their mixers by browser `dt`. That path was neither portable nor
random-access deterministic. This slice preserves the DJ and crowd features,
their controls, visible presence, count scaling, and canonical-time dancing
with retained procedural actors.

This is an architecture and performance improvement, but it is not evidence of
pixel-level character-model parity. A future production-character system
should use canonical materialized character assets plus bakeable animation
sampling rather than restoring editor URL imports or mutable mixers. Until that
system or an explicit product approval exists, exact historical character
appearance remains an honest visual-parity gap.

## Automated Evidence

Focused validation passed:

```text
pnpm vitest run \
  tests/foundation/editor-runtime-preview-runtime-bridge.test.ts \
  tests/foundation/component-registry.test.ts \
  tests/foundation/three-renderer.test.ts
```

The tests cover:

- deterministic fixed-frame Stage component-plan output
- projection of every Stage settings group
- serializable editor action-button values
- retained scene groups and crowd resources
- deterministic crowd matrices across independent program instances
- in-place crowd-count, beam-mode, and laser-mode updates
- canonical camera output
- absence of historical editor render callbacks

The complete gate also passed:

```text
pnpm check:foundation
```

Result:

- parity matrix validation passed
- package and studio typechecks passed
- production builds passed
- 32 test files and 128 tests passed
- package-consumer smoke passed
- creative-loop smoke passed

The production studio entry chunk changed from `389.07 kB` / `116.98 kB`
gzip before this slice to `377.55 kB` / `113.63 kB` gzip afterward: an
`11.52 kB` raw and `3.35 kB` gzip decrease. The shared Three-extras chunk
changed from `379.19 kB` / `115.02 kB` gzip to `330.82 kB` / `99.62 kB`
gzip: a `48.37 kB` raw and `15.40 kB` gzip decrease. The production build also
stopped emitting the four historical FBX assets.

These measurements prove a substantial bundle/distribution improvement, not
the required fixed-device runtime-performance comparison against V1.

## Browser Evidence

The preserved Vite editor was exercised at `1280x720`.

Verified:

- opened the real Add Layer catalog without the former button-cloning crash
- observed the runtime-backed Stage thumbnail
- added Stage Scene and observed the full runtime-backed stage
- observed the shader wall, stage outline, beams, lasers, moving lights, crowd,
  DJ, fog, and bloom
- expanded every preserved settings group
- changed DJ visibility and restored it
- changed crowd count and restored it
- disabled and restored lasers
- played and paused the transport and observed camera/effect/crowd motion
- hid and showed the layer without an attachment lifecycle error
- entered Fly Mode, exited with Escape, observed canonical manual-camera
  commit through the Cinematic Mode control, and restored the default
- observed no warnings or errors for Stage creation, playback, settings,
  visibility, or the final fly-mode pass

## Honest Classification

This proves package-runtime ownership for all 15 preserved editor components,
deterministic Stage scene evaluation, retained resources, browser-hosted camera
interaction, serializable settings, representative controls, playback, and
removal of the final editor component render callback.

It does not yet prove:

- exact historical FBX character appearance
- pixel-diff equivalence against the pinned V1 reference
- final export capture parity
- measured runtime performance parity against V1
- full historical V1-node reconstruction through the temporary per-layer
  bridge
- deletion of the temporary preview bridge
- one-session multi-layer preview evaluation
