# First Agent-Authored Production: Signal Cathedral

Status: completed and certified on 2026-07-30.

Certification:

- [Signal Cathedral Production Certification](../../parity/evidence/2026-07-30-signal-cathedral-production-certification.md)
- [`artifacts/2026-07-30-signal-cathedral-production-summary.json`](../../../artifacts/2026-07-30-signal-cathedral-production-summary.json)

## Goal

Create and certify the first genuinely new VizEngine V2 production through the
canonical agent-authored production loop.

The result must be both:

- a polished, music-reactive short video
- a portable, fully editable Viz project that reopens in the preserved editor

This production is not a one-off render script. Its executable visual belongs
to a trusted project-local capability pack, its authored scene remains
canonical project data, and its audio reactivity comes from portable bake
artifacts and editable node graphs.

## Creative Direction

Working title: **Signal Cathedral**

The scene is an endless luminous structure that feels halfway between a neon
cathedral, a concert stage, and a data tunnel:

- repeating emissive arches establish scale and forward motion
- a central energy core anchors the composition
- spectral particles and light bands make the air feel alive
- bass energy drives structural pulse and scale
- mid energy drives the core and secondary motion
- treble energy drives shimmer, particles, and color separation
- onset strength launches bounded shockwaves through the structure
- spectral flux adds short-lived bloom and camera emphasis

The desired result is cinematic and legible rather than visually noisy. Audio
reactivity should shape an intentional composition, not make every property
vibrate independently.

## Production Input

Use a canonical 12-second derivative of:

`public/music/[House] Progressive House.mp3`

Source window:

- start: 48 seconds
- end: 60 seconds
- duration: 12 seconds

The derivative becomes the production project's actual audio asset. Its
project timeline starts at audio time zero, and its bake artifact is generated
from that derivative.

This is deliberate:

- the selected window has strong measured loudness, bass energy, and spectral
  flux
- the final video can mux audio from timeline zero without hidden source-offset
  behavior
- live playback, baked analysis, final export, and portable reopening all use
  the same media timeline
- the generic engine does not gain a scene-specific audio-offset workaround

The derivative must retain provenance metadata for the original asset, source
window, derivation command identity, and content identities.

## Architectural Boundary

### Production capability package

Create a dedicated workspace package:

`@viz-engine/production-signal-cathedral`

It owns:

- the Signal Cathedral capability-pack manifest
- the component implementation and complete authoring definition
- its Three renderer extension and retained program
- useful presets
- the canonical production project factory
- production-specific graph and resource declarations

It must not own:

- editor UI code
- session mutation or history
- render-job orchestration
- browser asset persistence
- generic audio analysis
- generic execution-manifest or bundle infrastructure

### Engine core

Engine packages may only change to expose a clean injection seam or a proven
generic primitive needed by more than this scene.

Expected generic changes are limited to:

- one explicit studio capability composition root
- injected component and Three program registries through the real editor
  preview path
- public export of an already-generic Three post-processing helper if the
  production pack consumes it

Signal Cathedral identifiers, defaults, scene geometry, and project content
must never be hardcoded into engine core.

### Studio host

The studio host composes:

- the core component capability pack
- the Signal Cathedral production capability pack
- the core Three renderer extension
- the Signal Cathedral renderer extension

One central composition module supplies these registries to catalog,
inspection, session, runtime preview, and browser renderer attachments. No
consumer may reconstruct a private core-only registry.

This production pack is intentionally installed into this repository's studio
as a trusted first-party local pack. Future arbitrary third-party package
loading remains outside this milestone.

## Component Contract

The production component exposes complete editable authoring groups.

### Palette

- background
- primary emissive color
- secondary emissive color
- accent color
- fog color

### Structure

- arch count
- arch spacing
- nave width
- nave height
- segment thickness
- floor extent
- core size
- particle count

### Motion

- travel speed
- camera sway
- camera lift
- structural twist
- particle drift
- core rotation

### Reactivity

- master response
- bass response
- mid response
- treble response
- onset response
- flux response
- smoothing

### Light and post-processing

- ambient level
- key-light intensity
- bloom strength
- bloom radius
- bloom threshold
- exposure
- fog density

The schema must define sensible bounds, steps, descriptions, and conditions.
At least three production-quality presets must be provided:

- `Cathedral`
- `Pulse Chamber`
- `Afterglow`

The authored project may select one preset as a starting point, but all final
values remain ordinary editable component settings and graph-driven inputs.

## Audio And Graph Contract

The production uses the canonical standard audio artifact vocabulary.

At minimum, its editable graph derives:

- `structurePulse` from `bass-energy`
- `coreEnergy` from `mid-energy` and `loudness`
- `spectralShimmer` from `treble-energy`
- `shockwaveTrigger` from `onset-strength`
- `bloomAccent` from `spectral-flux`

Graph processing should use the existing portable nodes wherever possible:

- scale through multiplication
- establish a floor through addition
- clamp output to safe visual bounds
- decay or smooth event-heavy inputs

Graph outputs bind to named component inputs. Runtime dense spectrum may be
provided through the existing `audio.frequency-data` binding for local band
detail, but primary authored musical intent must remain inspectable in the
graph.

The scene must produce the same semantic response from the same artifact in
live preview and deterministic rendering.

## Retained Renderer Design

The Three program uses retained resources:

- one perspective camera
- instanced or otherwise batched repeating structural geometry
- bounded core and shockwave meshes
- one bounded particle buffer
- reused materials
- the shared post-processing pipeline

Per-frame work may update transforms, uniform values, bounded buffer ranges,
and visibility. It must not recreate geometries, materials, textures,
post-processing pipelines, or unbounded event meshes during ordinary playback.

Onset shockwaves use a fixed-size pool. Old waves are reused rather than
accumulated.

The program must dispose every owned GPU and post-processing resource.

## Canonical Project Shape

The authored project contains:

- one explicit production audio asset
- one attached standard audio bake artifact
- one Signal Cathedral visual layer
- one canonical reactivity graph
- graph-output bindings for the component's musical controls
- explicit output dimensions, duration, and frame rate
- no editor-only hidden state required for playback or render

Initial production format:

- duration: 12 seconds
- frame rate: 60 fps
- timeline frames: 720
- working resolution: 1280 × 720
- final certification target: 1920 × 1080 where the browser executor and
  measured device budget permit it

If 1080p certification cannot meet the performance budget, the project remains
1080p-capable but the first proof may ship at 1280 × 720 only with the measured
reason recorded. Visual quality must not be silently reduced.

## Iteration Loop

The agent authors through canonical project transactions and resource
operations rather than UI event synthesis.

For each meaningful visual revision:

1. validate project, capability, asset, artifact, and graph identities
2. inspect representative deterministic frames
3. render a contact sheet spanning the musical segment
4. render a short encoded clip around the most reactive passage
5. inspect visual-sanity, media-probe, runtime, and performance feedback
6. make a bounded authored or capability-pack revision
7. confirm the live editor observes the same result

Full-video encoding is reserved for credible candidates.

## Acceptance Gates

### Architecture

- the production component and renderer program live only in the production
  capability package
- the real studio obtains component and Three registries from one composition
  root
- headless and live paths accept the same injected capability identities
- project data contains no executable code
- no production-specific condition enters generic runtime packages

### Determinism and correctness

- strict package, project, graph, bake, and render contract tests pass
- repeated representative-frame evaluation is semantically deterministic
- source revision and content identities are carried into every render
- preview and final render sample the same artifact frames
- resource creation is bounded and disposal is complete

### Visual quality

- representative stills are nonblank and compositionally intentional
- the contact sheet shows meaningful progression without chaotic discontinuity
- the clip is not frozen and has visible music-correlated variation
- structural silhouettes remain readable during high-energy moments
- bloom preserves form rather than clipping most of the frame
- the camera is smooth and never creates abrupt unmotivated cuts
- no obvious geometry popping, z-fighting, particle discontinuity, or
  unbounded shockwave accumulation is visible

### Performance

- steady-state playback creates no new Three geometries, materials, or
  post-processing pipelines per frame
- the retained program uses bounded draw-call and resource counts
- 1280 × 720 preview targets a 60 fps median cadence on the certification
  machine
- representative render feedback reports frame timing and identifies any
  missed budget explicitly
- editor interaction remains responsive while paused, playing, seeking, and
  rendering

The precise draw-call and frame-time budgets are recorded from the first
instrumented implementation before visual tuning. They may tighten after the
baseline; they may not be weakened merely to make the gate pass.

### Preserved editor parity

With the production loaded:

- the component appears in the catalog with its full schema and presets
- all relevant settings are editable
- playback and seeking remain smooth
- the node graph is visible and editable
- live graph values remain inspectable
- one agent transaction is one undo step
- undo and redo preserve the complete production state
- project persistence and reopen work
- render jobs remain visible and cancellable
- export remains available
- no existing catalog component or parity capability disappears

### Final artifacts

- playable video containing expected H.264 video and AAC audio
- portable project bundle containing the project, derived audio, bake artifact,
  and execution manifest
- clean reopen into a fresh session
- representative rerender after reopen matches the original semantic output
- certification evidence records media, visual, runtime, performance, parity,
  and reproducibility results

## Validation Plan

Focused validation:

- capability-pack manifest and registry-origin tests
- authoring schema, bounds, conditions, and preset tests
- project/graph strict-decoding tests
- program lifecycle, retained-resource, deterministic-update, and disposal
  tests
- studio composition tests proving the pack reaches catalog, control, runtime,
  and Three preview paths
- audio derivative and bake provenance tests

Integration validation:

- real live editor load, playback, seek, graph edit, transaction, undo/redo,
  persistence, reopen, and export
- canonical still, contact-sheet, clip, and video jobs
- media probe and representative-frame visual checks
- portable bundle materialization and fresh-session reopen
- complete foundation, parity, package, build, consumer, and creative-loop
  gates

## Assumptions

- the bundled Progressive House source is authorized repository test/production
  media for this proof
- the 48–60 second window remains the selected segment unless rendered evidence
  demonstrates a materially stronger nearby window
- 60 fps is the authored timeline because smooth travel is part of the visual
  identity
- semantic determinism is required across renderer hosts; cross-GPU
  byte-identical pixels are not
- one custom retained program is cleaner for this cohesive visual than
  decomposing it into many tiny layers solely to increase component count
- the production package is a trusted project-local capability pack, not a
  general marketplace/plugin-loading solution
- the execution manifest and portable resource materialization are generic
  Phase 6 infrastructure and will not be embedded inside the production pack

## Non-Goals

- arbitrary runtime installation of untrusted capability packages
- a distributed session daemon
- native headless WebGL video rendering
- a general timeline audio-offset feature
- promotion of Signal Cathedral itself into engine core
- character, model, facial, speech, or lip-sync functionality
- proving every future renderer backend

## Completion Boundary

This plan is complete only when the visual is implemented, iterated from real
rendered evidence, loaded and edited in the preserved UI, packaged with all
portable resources and execution identities, reopened in a fresh session, and
certified without an unapproved parity or performance regression.
