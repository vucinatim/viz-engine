# Goal Three Agent Loop And Afterlight Assembly Certification

Date: 2026-08-03

Status: certified. The complete repository-wide gate passed from one clean,
uncontended run.

## Outcome

Goal Three now has its missing agent-workflow and second-production proof:

- an agent can discover component and node capabilities, inspect canonical
  project, graph, frame, render, and debug state, apply transactions, control
  transport, open portable bundles, start jobs, inspect feedback, and download
  browser-owned render outputs through the live control contract
- agent transactions remain ordinary canonical history and are visible in the
  editor through a compact recent-activity surface
- one browser-safe bundle loader resolves portable project, asset, and baked
  artifact resources before loading them through `VizControl.openProject`
- source-mode and built-package CLI paths expose the same operations
- Afterlight Assembly is a distinct, fully editable 12-second Stage production
  using the existing generic model/character asset path and four bundled FBX
  performers
- its 30-node shared graph maps six baked audio features to 12 Stage parameters
- its public bundle, representative still, six-frame contact sheet, and final
  H.264/AAC video are committed together

Machine-readable results live in
[`artifacts/2026-08-03-goal-three-final-certification.json`](./artifacts/2026-08-03-goal-three-final-certification.json).

## Canonical Ownership

No new project, graph, render, or agent truth was introduced.

- `VizProjectDocument` owns the authored scene and graph.
- `VizSession` owns the live working project, revision, history, transport, and
  resolved resources.
- `VizControl` owns stable inspection and mutation semantics.
- the Vite bridge only transports requests and supplies browser attachments for
  bundle fetch and file download.
- the browser WebGL executor remains the installed render attachment behind the
  existing render-job contract.
- React displays recent agent history; it is not an agent state store.

The browser bundle loader is a browser-only `@viz-engine/project-bundle`
entrypoint. Node filesystem logic remains in `@viz-engine/project-bundle/node`.

## Agent Calibration Findings

The direct production journey found five concrete friction points:

1. root CLI scripts used filtered package execution, which changed the process
   working directory and broke root-relative project paths
2. component inspection was unfilterable and node capability inspection was
   absent
3. canonical frame/render/debug/runtime-graph diagnostics existed in
   `VizControl` but were not reachable through the live protocol
4. a portable bundle could reopen headlessly but could not be loaded into the
   already-running editor session
5. browser render jobs returned correct blob outputs but an agent could not ask
   the browser host to download them

The smallest fixes were made at the existing boundaries. No UI automation,
shadow document, alternate evaluator, or second render orchestrator was added.

The capability pickup loop is now:

1. inspect component/node contracts with `viz live components` and
   `viz live nodes`
2. author through a package or existing capability pack
3. validate package types and canonical project data
4. materialize and validate a portable bundle
5. load it into the live editor with `viz live bundle-open`
6. inspect graph/runtime/render/debug state at chosen frames
7. mutate through revision-guarded transactions and inspect the same change in
   the editor
8. run browser render jobs, inspect their metrics/probe, and retrieve outputs
   with `viz live job-download`

Existing package source changes remain Vite-HMR visible. Adding a brand-new
workspace package intentionally requires `pnpm install` and a dev-server
restart so dependency and alias changes stay explicit.

## Production Direction

Afterlight Assembly deliberately tests a different path from Signal Cathedral.
It does not add a production-only component. It proves that the reusable Stage,
model assets, character animation, crowd, cinematic camera, node graph, audio
bake, render job, and portable bundle contracts can produce a complete second
work.

Creative direction:

- Dancefloor DnB source window from 60 to 72 seconds
- Crowd Flyover cinematic path
- persistent cyan, red, and violet Stage identity
- reactive wall scale/rotation/travel/brightness
- reactive beams, moving lights, wash, strobe cadence, bloom, overhead impact,
  and character speed
- four real bundled FBX character assets plus a 420-character crowd

The repository audio and models are assumed authorized for this local product
proof. No new external asset or dependency was introduced.

## Iteration And Quality Review

The first six-frame render was technically valid but creatively rejected. Two
frames had average luminance above `0.85`, and visual inspection confirmed broad
white clipping. The cause was production tuning: the Stage blinder intentionally
switches to a legacy 15,000-intensity flash, while the decayed onset held that
binary effect active too broadly.

The production correction:

- disabled the binary blinder for this piece
- retained onset-driven impact through the continuously controllable overhead
  light
- reduced wash, moving-light, beam, wall, bloom, and strobe envelopes
- preserved meaningful dynamic range and reactive movement

The accepted contact sheet spans frames `0`, `152`, `300`, `420`, `600`, and
`719`:

- luminance range: `0.101647` to `0.455147`
- blank frames: 0
- frozen frame pairs: 0
- every adjacent sample changed materially

The result reads as one coherent festival scene with clear progression from
warm opening glow, through cyan/green energy and a darker magenta breakdown, to
a wide yellow/cyan drop and close-stage finale. The camera movement, crowd
silhouettes, screen motion, beams, and palette remain legible without losing
the energetic Stage character.

## Bundle And Determinism

Public bundle:

`public/productions/afterlight-assembly`

Pinned identities:

- project: `sha256:4da634764ba0424c174f97841b8d816af5edda584622ca0732b432bd2513d267`
- audio: `sha256:8ed6942b63378b0ebd1597f9ead5987126d6d0a0c6a60987e05c844d013af923`
- baked artifact: `sha256:62d4b342614af0e040e4d037414595f8c2e4698a9ff990b391af3a1430beadfa`
- bake execution: `viz-bake.audio-feature-timeline.v1:d084160d`
- live render source: `viz-render-source.v1:79d6579f`

The bundle contains five assets, one binary audio-feature artifact, one Stage
layer, one shared graph, 30 nodes, and 12 graph outputs. Local validation,
execution-manifest validation, deterministic repeated-frame evaluation, and
browser reopen all completed with zero issues. All four model inputs and all 12
graph-bound Stage inputs resolved.

## Media Proof

Committed outputs:

- `public/productions/afterlight-assembly/renders/afterlight-assembly-drop-still.png`
- `public/productions/afterlight-assembly/renders/afterlight-assembly-contact-sheet.jpeg`
- `public/productions/afterlight-assembly/renders/afterlight-assembly-final.mp4`

Output identities:

- still: `sha256:66ff14edbb705cb291e0bc7aacd05ebe86ccb1ea44423a9b6191882b7b32f7a2`
- contact sheet: `sha256:c3dd60d6ae759fcaf4048d65188c53bc0a187d6da3e49ab48c5ae1fec3d2f190`
- final video: `sha256:acb803e5475c6ed7649ffc79d11a6a557bf932be0dc2ae70a7cb4a617f834f54`

Final video probe:

- duration: 12.000 seconds
- size: 15,315,714 bytes
- video: H.264 High, 1280 × 720, 30 fps, 360 frames
- audio: AAC LC, 48 kHz, stereo, 12.000 seconds
- blank or near-black frames: 0
- frozen frame pairs: 0
- browser render/capture average: 3.863 ms
- browser render/capture p95: 4.400 ms
- browser render/capture maximum: 6.200 ms
- encode time: 46,278.9 ms

An independent FFmpeg pass reported no black intervals of at least 250 ms, no
frozen intervals of at least 500 ms, and no audio silence intervals of at least
500 ms at the configured thresholds.

## Preserved Editor Proof

At 1440 × 900 in the real editor, the reopened project showed:

- the established VizEngine shell, layer card, waveform, transport, Export,
  Jobs, Rhythm Lab, and help surfaces
- a nonblank, changing Stage preview with crowd and cinematic camera
- the correct 0:12 project duration and production audio title
- 12 enabled animations
- one editable shared graph with typed nodes, named outputs, live values, and
  ordinary graph controls
- transport advancement from frame 0 to frame 152 without project revision
  changes or runtime issues

An external agent transaction also appeared in the editor's recent-activity
surface with its host-assigned actor, transaction id, and action types.

## Consolidation

Signal Cathedral and Afterlight Assembly now share one small audio-production
bundle helper for deterministic FFmpeg derivation, bootstrap bundle creation,
baked-resource resolution, execution environment pinning, and final bundle
writing. The Signal materializer lost its duplicated implementation while
preserving its existing content-identity convention and public output.

The goal did not add a browser-free video executor, runtime plugin loader,
generic Model3D authoring surface, prepared-GLB pipeline, masks/effect graph,
or character speech/facial semantics. Those remain deliberate future product
directions rather than hidden scope expansion.

## Final Gate

The final `pnpm check:foundation` run passed in full:

- parity: 42 verified capabilities, zero partial, gap, or unaudited rows
- architecture: 18 packages with no upward dependency, cycle, undeclared
  workspace import, or Node-entrypoint leak
- formatting, ESLint, all package type checks, Studio type check, and tool type
  checks
- deterministic tests: 64 files and 291 tests
- headed Chromium: 16 passed journeys and 2 intentionally opt-in skipped
  journeys, 18 discovered total
- all 18 package builds and the Viz Studio production build
- built-package consumer smoke with zero issues
- built creative-agent loop with canonical mutation, frame inspection, graph
  evaluation, and bundle roundtrip

The final run completed without another server or heavyweight production tab
sharing its browser/GPU resources. A prior diagnostic run correctly exposed a
stale Vite test server, then showed two timing failures while the manually
opened 420-character production was also rendering. After stopping those
external inspection processes, the two affected playback journeys passed in
focused reruns and again inside the complete uncontended gate. No product or
test tolerance was weakened.

This document, the machine-readable result, implementation, production bundle,
and media proof are part of the same certification commit.
