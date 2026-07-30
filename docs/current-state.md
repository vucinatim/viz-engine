# Current State

## Project Status

VizEngine is executing a V2 full-replacement rewrite beneath the preserved
product-quality editor.

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

The package runtime, canonical project document, action surface, editor
session, runtime-backed preview, and model asset substrate are now real. The
remaining work is to finish replacing editor-era presentation adapters,
expand the authoring/debugging experience over those contracts, and prove each
remaining parity capability rather than assuming it.

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
- a real deterministic audio-feature bake pipeline shared by browser export,
  Node/headless workflows, runtime components, graphs, and Remotion
- one observable job lifecycle and explicit revision-safe artifact attachment
- a real local operator surface
- a separate dev-shell path for engine validation

The first four phases of the agent-authored production loop are now certified:

- canonical component authoring and injected capability composition
- one live/headless session host and revision-safe control target
- canonical audio bake artifacts and runtime inputs
- canonical render and feedback jobs

The active next phase is the first genuinely new agent-authored visual:

- define it once in a project-local capability pack
- compose reusable engine capabilities without adding scene-specific core code
- author and iterate through canonical transactions, inspection, stills,
  contact sheets, and clips
- preserve live editor settings, node graphs, undo/redo, persistence, playback,
  and export behavior
- promote only proven generic pieces into reusable engine packages

The completed render foundation is recorded in:

- [Canonical Render And Feedback Jobs](./plans/v2/canonical-render-and-feedback-jobs.md)
- [2026-07-30 canonical render and feedback jobs](./parity/evidence/2026-07-30-canonical-render-and-feedback-jobs.md)

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

The canonical-session convergence seam is now complete:

- the preserved editor and reusable control package use the same
  `@viz-engine/editor-session` mutation/history kernel
- all project mutations route through typed actions
- undo/redo and continuous gesture grouping are session behavior
- the React history observer and separate layer/node history stacks are gone
- graph documents are canonical and `NodeNetwork` is an authoring projection
- built-in executable nodes live in `@viz-engine/nodes-core`
- IndexedDB stores one `VizProjectDocument`

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
    graph/node results, resolved layer inputs, materialized assets, issues, and
    failure state
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
- project history is owned by the package session and snapshots the complete
  canonical document, including graphs
- `.vizengine.json` persistence and bundled projects now carry one canonical
  `project` value instead of separate editor-shaped project and graph scene
  payloads
- the preserved editor still uses hook-shaped adapters where necessary for
  selective subscriptions, instantiated component configs, and browser
  attachments
- the adapter names do not make them independent canonical owners
- executable node definitions no longer belong to those adapters
- layer projections are computed views rather than a stateful store

The old `EditorProjectDocument` / `EditorProjectLayer` model is gone.
Per-layer expansion/debug preferences are editor UI state outside the portable
document, and the obsolete `layer-values-store` has been deleted.

The remaining adapter classification and deletion conditions are recorded in:

- [phase-12-canonical-viz-project-document-cutover.md](./plans/v2/phase-12-canonical-viz-project-document-cutover.md)
- [phase-13-viz-session-runtime-preview-ownership.md](./plans/v2/phase-13-viz-session-runtime-preview-ownership.md)

The largest remaining work is now beyond basic session convergence and render
infrastructure:

- execute the final agent-authored visual and production-certification phases
- continue shrinking hook-shaped compatibility facades as concrete preserved
  UI consumers can subscribe to `VizSession` directly
- lock capability, component, and renderer implementation identities into the
  portable execution manifest
- prepare legacy FBX source assets into cleaner derivatives so unsupported
  material-map and excess-weight warnings do not remain runtime concerns

The completed cutover and its exact boundaries are recorded in:

- [viz-session-convergence-and-editor-control-cutover.md](./plans/v2/viz-session-convergence-and-editor-control-cutover.md)

The next complete authoring, bake, render, feedback, and live/headless control
boundary is recorded in:

- [agent-authored-production-loop-architecture.md](./specs/v2/agent-authored-production-loop-architecture.md)

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

Component authoring now has one portable package-owned source of truth:

- `@viz-engine/contracts` owns the data-only authoring/settings schema,
  compatibility vocabulary, presets, default animation networks, and
  capability-pack manifest
- all fifteen preserved catalog choices declare that schema beside their
  package runtime implementation and carry explicit implementation versions
- `coreCatalogComponents` owns the curated first-party catalog order
- the preserved editor generates its existing rich controls from those
  definitions at the React presentation boundary
- the duplicate `src/components/comps/*.ts` definitions are gone
- strict registries retain capability-pack origin for structured inspection
- `@viz-engine/editor-control` accepts injected component and node registries

Three program attachment is now equally explicit. The renderer composes
`VizThreeRendererExtension` contributions into an injected program registry;
the compositor and preview controller no longer depend on mutable module-global
program lookup. A project-local proof component and Three program execute
without modifying renderer core.

The architecture, catalog policy, exact validation rules, and remaining
boundaries are recorded in:

- [component-contract.md](./specs/v2/component-contract.md)
- [canonical-component-authoring-and-capability-composition.md](./plans/v2/canonical-component-authoring-and-capability-composition.md)

The preserved editor and local agent now also share one real control target:

- `VizSessionHost` owns the stable package session, preview transport, audio
  session, resources, registries, and subscriptions
- the preserved editor delegates its project, history, transport, and audio
  commands to that host
- `VizControl` is injected over the same host and supplies trusted human or
  agent attribution
- multi-action transactions are atomic, increment revision once, and create
  one undo step
- expected-revision conflicts and dry-run validation are side-effect free
- project loads retain session/control/subscriber identity
- strict versioned request decoding covers the current project actions and
  live control operations
- the development Vite bridge routes HTTP request/response and SSE clients
  through the browser's mounted control while owning no project state
- `viz-dev live` exposes discovery, inspection, transactions, history, and
  preview commands
- live browser acceptance proved an externally applied two-action transaction
  appears immediately in existing settings and is reversed as one unit by the
  editor's native undo

The architecture and acceptance evidence are recorded in:

- [live-session-host-and-control-target.md](./plans/v2/live-session-host-and-control-target.md)
- [2026-07-30 live session host and control target](./parity/evidence/2026-07-30-live-session-host-and-control-target.md)

The active implementation frontier is now canonical deterministic audio bake
execution and artifacts through `rhythm-core`, not another session or control
surface.

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

The historical 27 MB Stage character content is now restored through the V2
native model system rather than through the historical browser loader. The
four content-pinned FBX files are canonical lazy bundle assets, renderer-owned
resources expose capability manifests and explicit readiness, the hero DJ
samples its authored clip from absolute frame time, and the three crowd
archetypes use deterministic seeded placement plus GPU-baked skeletal animation
textures. The retained procedural actors remain an immediate live-preview
fallback during loading or failure; final capture waits for required model
resources. This implements the first production slice of
`docs/specs/v2/native-3d-model-character-and-performance-system.md`.

The per-layer runtime-preview bridge has now been deleted. `VizSession`
evaluates the complete canonical project into one render plan per frame through
one cached runtime session. The browser attachment store only slices that plan
for the existing stacked canvases, mirrors, and export capture surface; it no
longer creates runtime sessions, resolves settings for scene output, samples
audio, or dispatches `draw`, `init3D`, or `draw3D`. Generic debug presentation
may inspect projected settings, and the isolated Stage Fly Mode host attachment
may inspect camera-control values; neither defines deterministic scene output.

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
shape on the same machine. This plan-only result is now supplemented by the
required pinned-V1 browser frame-pacing comparison.

The immutable V1 and final V2 recordings now cover the same three-layer
`simple-example` fixture on the same Apple M1 Pro browser environment. V2
passed all 21 strict comparison checks with 119.899 mean FPS versus 74.915,
9.900 ms frame-time p95 versus 17.600 ms, and 92.512 MB mean heap versus
230.086 MB. A separate three-minute V2 soak held 119.959 mean FPS across the
complete bundled audio loop. The soak is bounded playback evidence; edit-heavy
and unlimited-session stability remain broader parity work.

That measurement exposed and removed an IndexedDB persistence leak. Continuous
preview notifications had kept resetting the storage debounce while unresolved
serialized project writes accumulated. Persistence now deduplicates unchanged
values, flushes sustained changes on a bounded cadence, serializes per-key
writes, and safely cancels pending writes on removal.

The browser video encoder is now both lifecycle-hardened and product-certified
for the representative MP4 workflow. FFmpeg core JavaScript/WASM assets are
bundled instead of fetched from a CDN, development optimization preserves the
package worker, and editor preview WebGL buffers remain capturable. A real
three-runtime-layer export produced a visually changing 1280×720 H.264/AAC
artifact at 30 FPS, while development cancellation closed its frame batch and
cleaned partial state.

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

- 38 capabilities are `partial`
- 2 capabilities are `not-audited`
- 0 capabilities are currently classified as a known `gap`
- 2 capabilities are certified `verified`

The matching V2 candidate passes the fixed-device comparison contract and the
bounded three-minute playback soak is recorded. Full parity remains
conservative because interaction-latency instrumentation and an edit-heavy
long-session scenario are still outstanding.

The final cutover acceptance audit also browser-verified waveform seeking,
playback after seeking, canonical parameter persistence across reload, and the
model-backed Stage at normal, 500-character, and 1,000-character crowd sizes.
The architecture cutover requirements and the previously open Stage character
visual-parity condition are now proven. The broader parity matrix remains
conservative because unrelated interaction-latency and edit-heavy long-session
work is still partial or not audited.

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
