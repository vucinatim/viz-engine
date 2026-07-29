# Current State

## Project Status

VizEngine is at the boundary between:

- a strong V1 prototype/editor
- and a planned V2 rewrite into a deterministic runtime plus authoring system

One very important clarification:

- V1 is not only “legacy code”
- V1 is also the current product-quality UX reference

The editor experience in V1 should be treated as something to preserve
deliberately, even while the hidden runtime/store architecture underneath it is
replaced aggressively.

The current codebase already proves several important ideas:

- typed component definitions
- typed node graph authoring
- live audio-reactive visuals
- browser-native editing and preview
- offline audio analysis and offline export direction

But the current implementation is still fundamentally editor-first and
browser-state-driven. It is not yet a clean deterministic runtime that can be
reliably embedded into Remotion or other headless rendering systems.

## Active Focus

The active architectural focus is VizEngine V2.

That means the repo should move toward:

- a versioned project document as the canonical source of truth
- one canonical in-memory session engine: `VizSession`
- a headless runtime that can evaluate frames deterministically
- a clear split between editor state and runtime state
- first-class baking and precomputation for heavy audio or simulation work
- a clean adapter path into Magnify Core / Remotion rendering
- an AI-native command surface for scene creation and editing
- a full replacement rewrite with explicit purge of obsolete V1 architecture

But this should not be misread as:

- discard the V1 editor experience
- replace the product surface with a different weaker dev-shell UI

The intended direction is:

- preserve the strength of the current editor UX
- preserve the actual visible editor shell unless a better replacement is
  intentionally proven
- rebuild that editor over V2 runtime, action, and document truth
- replace architecture, not product instincts

That means preserving by default:

- the same layout
- the same colors and controls
- the same node-editor posture
- the same audio/transport posture
- the same dense, serious-tool feel

That direction is no longer only conceptual.

The repo now has:

- a real V2 runtime/package spine
- a real action-driven working-head foundation
- a real preview transport foundation under the preserved editor
- a real split between canonical audio-session truth and browser audio-engine
  attachments
- a real local operator surface
- a separate dev-shell path for engine validation

So the current phase is no longer “invent V2”.

The current phase is “rebuild the real editor experience over those V2 truth
surfaces without regressing the V1 UX bar”.

One important correction is now explicit:

- the destination is not a collection of cleaner editor-local canonical stores
- the destination is one canonical session engine called `VizSession`
- editor stores may exist as UI adapters or subscribers
- they are not the long-term architecture target

The hidden-brain swap is now materially underway:

- layer and working-project truth have been moved under a canonical app-local
  working head
- preview transport has been split out of `editor-store`
- audio source/session truth has been split from browser audio-engine
  attachment state
- graph truth has been split from node-editor UI ownership
- history truth has been split from legacy layer/value snapshot ownership

The next clean seam is no longer basic ownership extraction.

The next clean seam is collapsing these cleaned-up truths into `VizSession`
directly and deleting the remaining bridges.

The intended split is now explicit:

- the editor edits
- the runtime runs
- `VizSession` holds the live scene/session truth shared by both

In practice that means:

- the editor should hold UI state
- `VizSession` should hold working project, graph, preview, audio, and history
  truth
- the runtime should consume `VizSession` for scene evaluation and
  preview/render semantics
- React should host the editor surface, not define runtime truth

That split is now materially reflected in the real editor terrain too:

- canonical project truth exists
- canonical preview truth exists
- canonical audio-session truth exists
- canonical graph truth exists
- canonical history truth exists
- a local explicit editor control plane now sits above them so the preserved
  UI no longer needs to reach into many stores directly for routine commands

One important correction was followed by the right shell migration:

- an earlier attempt to make a weaker replacement shell the active app surface
  was rolled back
- the actual product shell is now the preserved real editor, mounted through
  the Vite app at `apps/viz-studio`
- the old Next shell is gone
- the active styling stack is now the Vite-native Tailwind v4 path, not the
  old Tailwind v3 plus PostCSS config path
- V2 editor/session/control work remains foundation work until it is wired
  further under the preserved real editor UX
- the runtime-preview ownership cutover is now materially in place too:
  - general component/config projection still exists for preserved V1
    consumers, but it is not preview truth
  - live preview and export dispatch frames through `VizSession`
  - `VizSession.preview.runtimeInspection` owns the last requested/completed
    frame, render-cycle count, rendered layer ids, runtime-backed layer ids,
    and failure state
  - the browser-only attachment store owns only registered render callbacks,
    mirror canvases, and the Remotion player ref
  - live preview timing/orchestration now runs through one explicit preview
    driver instead of per-layer loops
  - live preview and export share the `VizSession` runtime-preview frame
    contract and command surface
  - the redundant editor preview controller, editor preview frame module, and
    mixed runtime-preview store have been deleted
  - browser render attachment setup/resize/render/cleanup now live behind one
    explicit preview-attachment module instead of being owned directly by the
    React `LayerRenderer`
  - the first preserved-editor layer (`Curve Spectrum`) now gets its scene
    meaning from the package runtime/render-plan path inside the real editor
    preview instead of local `draw` / `draw3D`

The app-local `VizSession` convergence is now materially implemented:

- the package-level `VizProjectDocument` is now the working/source document
  stored by the session
- layer order, component settings, timeline, viewport, graph bindings, and
  embedded graph documents now share that one portable scene truth
- working project, graph projection, preview transport, audio session, and
  history state are exposed through one session store and command surface
- project history snapshots the complete canonical document, including graphs
- `.vizengine.json` persistence and bundled projects now carry one canonical
  `project` value instead of separate editor-shaped project and graph scene
  payloads
- the preserved editor still uses adapter stores where necessary for selective
  subscriptions, executable V1 node definitions, instantiated component
  configs, and browser attachments
- the adapter names do not make them independent canonical owners

The old `EditorProjectDocument` / `EditorProjectLayer` model is gone.
Per-layer expansion/debug preferences are editor UI state outside the portable
document, and the obsolete `layer-values-store` has been deleted.

The remaining adapter classification and deletion conditions are recorded in:

- [phase-12-canonical-viz-project-document-cutover.md](./plans/v2/phase-12-canonical-viz-project-document-cutover.md)
- [phase-13-viz-session-runtime-preview-ownership.md](./plans/v2/phase-13-viz-session-runtime-preview-ownership.md)

The biggest remaining architecture gaps are:

- the preserved V1 node canvas still needs an executable `NodeNetwork`
  projection over canonical graph documents until it consumes the package
  graph model and execution registry directly
- all 15 preserved editor components now render through package-runtime
  implementations and none retains `draw`, `init3D`, or `draw3D` ownership
- the temporary per-component runtime preview bridge is now the primary
  deletion target: preview still creates one runtime session and plan per layer
  instead of evaluating the canonical editor session once per frame

The active renderer cutover inventory and deletion map now lives in:

- [runtime-backed-rendering-cutover.md](./plans/v2/runtime-backed-rendering-cutover.md)

The renderer contract now has a persistent shader node:

- shader source and typed uniforms are deterministic render-plan data
- the Three adapter retains compatible GPU material and geometry resources
  between frames
- Strobe Light no longer accumulates editor-local time or calls
  `Math.random()` for runtime output

The renderer contract also has a persistent Three program node:

- runtime plans carry a stable program id and serializable deterministic
  parameters
- package Three program instances own GPU scenes and explicit
  update/resize/render/dispose lifecycles
- compatible updates retain scene, camera, geometry, material, and light
  resources
- Simple Cube rotation now derives from canonical frame time rather than
  accumulated browser `dt`

Runtime-backed component-catalog previews now use that same package registry
and renderer attachment. All fifteen editor definitions now contain
only authoring metadata and parameter schemas; their visual semantics live
entirely in package terrain. `Fullscreen Shader` GLSL source moved there as
part of the same cutover.

Particle System is now an analytic deterministic simulation. Each visible
particle is derived from canonical frame time, session seed, emission index,
and physics settings. Seeking no longer depends on replaying prior browser
callbacks or `Math.random()`.

Orbiting Cubes now retains one instanced mesh across topology, spacing, and
animation changes. Its seeded neuron topology, material, lights, structure
rotation, and camera orbit are package-owned and derive from canonical frame
state.

Component settings now have one runtime resolution rule: resolved canonical
layer inputs immutably override raw settings through colon-delimited parameter
paths. This closes the direct-runtime/export gap where node bindings were
previously visible in frame plans but most migrated components ignored them.

Heartbeat Monitor now uses a portable polyline/glow node and samples its visible
history from canonical frames. The SVG adapter renders the same path contract,
while the Three adapter updates retained wide-line position buffers rather than
rebuilding line resources per frame. Browser validation also corrected
double-application of device pixel ratio in the Three preview controller.

Instanced Supercube now owns one fixed-capacity instanced mesh in package
terrain. Its hollow-cube lattice, lighting, shadows, matrix updates, canonical
rotation, and historical explosion smoothing no longer depend on editor-owned
Three objects or render-call accumulation.

Light Tunnel now reduces the old per-cube/per-ring scene to one retained solid
instance batch and one retained wide-line edge batch. Tunnel movement, rotation,
palette selection, light motion, and rising-edge wave events derive from
canonical frame time, seed, and setting history. Bloom and depth of field now
run through one reusable renderer-owned post-processing pipeline that can be
shared by the remaining large Three scenes.

Morph Shapes now owns one retained 60,000-capacity instanced point-cloud mesh
in package terrain. Procedural cube/pyramid shapes, seeded model-surface
sampling, embedded-font or TTF text sampling, morph smoothing, explosion,
rotation, material mode, and shape transforms are driven by deterministic
render-plan data. The Three program can receive canonical materialized binary
assets and explicitly invalidates paused previews when asynchronous shape
generation finishes instead of depending on playback or polling.

Neural Network now generates its seeded neuron topology in package terrain and
collapses the historical per-neuron/per-dendrite material and mesh fan-out into
one merged dendrite surface plus retained soma, activation, signal, and halo
instance batches. Trigger edges are reconstructed from canonical resolved
settings, traveling orbs and activation decay are direct functions of trigger
age, and network rotation derives from canonical time. Its bloom and depth of
field use the shared post-processing attachment with the scene's intended
linear tone mapping.

Browser validation of the Neural Network slice also exposed and fixed an
attachment lifecycle regression: the layer renderer's empty mirror-canvas
selector and profiler object are now referentially stable, so hiding and
showing a runtime-backed layer no longer enters an unregister/re-register
maximum-update-depth loop.

Stage Scene now owns its complete retained stage/effect rig in package terrain.
Cinematic camera smoothing, beams, lasers, moving lights, strobes, blinders,
accents, shader wall, DJ, and crowd derive from canonical frame time and seed.
Fly Mode is a browser host attachment over an explicit preview camera-pose seam
and commits its final pose through canonical project actions. Action buttons
resolve to serializable `null` in project settings instead of leaking class
instances and functions into runtime or persistence.

The historical 27 MB FBX character attachment was replaced with retained
procedural actors so preview/export remain portable and deterministic. DJ and
crowd capability is preserved, but exact historical character-model appearance
is still an explicit visual-parity gap pending canonical materialized character
assets and bakeable animation sampling or product approval.

The per-layer runtime-preview bridge has now been deleted. `VizSession`
evaluates the complete canonical project into one render plan per frame through
one cached runtime session. The browser attachment store only slices that plan
for the existing stacked canvases, mirrors, and export capture surface; it no
longer creates runtime sessions, resolves component settings, samples audio, or
dispatches `draw`, `init3D`, or `draw3D`.

Live analyzer data and offline export data now enter as one explicit
frame-scoped runtime input snapshot. Curve Spectrum consumes that snapshot
without mutating the project document. Graphs receive the same audio/time
snapshot through the runtime graph-input contract, and all preserved editor
node kernels are registered behind the canonical node-registry extension
point.

Browser validation covered two stacked runtime layers, play/pause, layer
visibility, a live Sine graph, canonical JSON save, and a 1920×1080 still-image
export preview without new warnings or errors. The repeatable 15-component
plan benchmark measured a 0.352 ms mean and 0.674 ms p95 for the one-session
path versus 0.908 ms mean and 1.962 ms p95 for the former per-layer evaluation
shape on the same machine. This is plan-evaluation evidence, not yet the
required pinned-V1 browser frame-pacing comparison.

## Autonomous Calibration Foundation

The first autonomous calibration goal pinned the immutable product reference
to:

```text
e806fbc10980615588b52ff574bc923c6f00f35e
```

That commit is the final pre-V2 editor state and includes the accepted waveform,
window-control, and Rhythm Lab improvements that are newer than the current
`main` head.

The repository now also has:

- a 41-capability executable V1→V2 parity matrix covering shell, layers,
  parameters, nodes, audio, transport, preview, history, persistence, export,
  debugging, Rhythm Lab, and performance
- `pnpm parity:validate`, included in `pnpm check:foundation`
- a durable autonomous development operating contract with authority,
  recovery, quality-gate, and completion rules
- a preservation audit for the large pre-existing dirty worktree
- first browser comparison evidence against the pinned V1 reference

The calibration browser run found and corrected three regressions:

- sample project loading could blank V2 through a history feedback loop
- animation previews could blank V2 because node bodies used CommonJS
  `require(...)` in the Vite browser runtime
- the active Vite editor shell no longer mounted Rhythm Lab

The final clean V2 browser run loaded `simple-example`, rendered the preview and
node surfaces, opened and closed Rhythm Lab, and advanced and paused playback
without console errors or warnings.

Parity is not complete. The matrix intentionally remains conservative:

- 36 capabilities are `partial`
- 5 capabilities are `not-audited`
- 0 capabilities are currently classified as a known `gap`
- 0 capabilities are yet certified `verified`

Performance parity is still unmeasured and must not be inferred from this smoke
run.

## Current V1 Truth

Today the repo still contains:

- the existing editor UX and component surface
- Zustand-heavy runtime coupling
- component code that may depend on hidden mutable state
- node evaluation paths that are partly editor-oriented
- browser export pipelines that are useful but should not become the production
  render architecture

The important distinction is:

- these are not all equal
- some of this is architecture debt
- some of this is hard-won product UX value

We should mine V1 aggressively for:

- panel layout and spatial workflow
- live preview feel
- audio/visual interaction patterns
- layer workflow
- animation/node workflow intent
- serious-tool UX density and polish

## What Should Not Be Assumed

Do not assume:

- the current store layout is the correct long-term runtime architecture
- the current export path should become the main production renderer
- the current Remotion scaffolding is already the right integration model
- all existing components should survive unchanged into V2
- live-first behavior and render-deterministic behavior are the same problem

## Current Rewrite Posture

Preferred posture:

- salvage the good contracts and ideas
- preserve the V1 editor UX quality bar explicitly
- rewrite the runtime boundaries aggressively
- purge obsolete structure decisively
- keep the authoring DX simple
- treat deterministic evaluation as a first-class requirement
- treat AI controllability as a first-class requirement

## Immediate Docs To Use

- [working-agreements.md](./working-agreements.md)
- [visions/viz-engine-v2-vision.md](./visions/viz-engine-v2-vision.md)
- [visions/v2-product-architecture-and-parity-alignment.md](./visions/v2-product-architecture-and-parity-alignment.md)
- [specs/v2/viz-session.md](./specs/v2/viz-session.md)
- [plans/v2/autonomous-development-operating-contract.md](./plans/v2/autonomous-development-operating-contract.md)
- [plans/v2/current-uncommitted-worktree-audit.md](./plans/v2/current-uncommitted-worktree-audit.md)
- [parity/README.md](./parity/README.md)
- [parity/evidence/2026-07-29-calibration.md](./parity/evidence/2026-07-29-calibration.md)
- [suggestions.md](./suggestions.md)
