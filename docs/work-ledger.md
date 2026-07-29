# Work Ledger

## 2026-07-29

- started the full runtime-backed component rendering cutover:
  - inventoried all 15 preserved-editor visual components and classified them
    into portable primitive, deterministic temporal, persistent Three scene,
    and persistent shader families
  - documented the runtime representation, slice order, evidence gates, and
    final deletion conditions in
    `docs/plans/v2/runtime-backed-rendering-cutover.md`
  - added a portable typed `text` render node with SVG and Three adapters
  - added strict package-runtime implementations for `Debug Animation` and
    `Feature Extraction Bars`
  - generalized the temporary editor bridge so any canonical component found
    in the package registry can render through the runtime instead of relying
    on a Curve Spectrum name check
  - added deterministic component-plan, SVG text, and editor bridge tests
  - browser-verified both components in the preserved editor with parameter
    changes, five independent feature values, node-workspace opening,
    playback, and no browser errors or warnings
  - recorded conservative evidence in
    `docs/parity/evidence/2026-07-29-runtime-rendering-cutover-slice-1.md`
- completed the first persistent GPU shader slice:
  - added a typed serializable shader render node with explicit shader source,
    typed uniforms, transparency, and blend semantics
  - taught the Three compositor to reconcile compatible shader nodes in place
    without rebuilding mesh, geometry, or material resources every frame
  - added the package-runtime `Strobe Light` implementation
  - replaced V1 accumulated-time and `Math.random()` strobe behavior with
    canonical-time and seeded-frame evaluation
  - removed the obsolete `useLegacyLights` browser attachment assignment that
    produced Three deprecation warnings
  - browser-verified Manual strength updates and Intensity playback in the
    preserved editor
  - recorded evidence in
    `docs/parity/evidence/2026-07-29-runtime-rendering-cutover-slice-2.md`
- completed the first persistent Three scene-program slice:
  - added a typed serializable Three program render node
  - added a package-owned Three program registry and explicit
    update/resize/render/dispose lifecycle
  - migrated Simple Cube into a deterministic runtime component and persistent
    package Three scene
  - replaced accumulated rotation with canonical frame-time evaluation
  - proved compatible frame updates retain the program instance, cube,
    geometry, and material
  - removed the final obsolete component-preview `useLegacyLights` assignment
  - browser-verified lit output, playback rotation, pause stability, and a
    clean console
  - recorded evidence in
    `docs/parity/evidence/2026-07-29-runtime-rendering-cutover-slice-3.md`
- established the autonomous V2 calibration foundation:
  - pinned the immutable final pre-V2 parity reference to
    `e806fbc10980615588b52ff574bc923c6f00f35e`
  - confirmed its direct successor is the first V2 foundation commit
  - added a validated 41-capability V1→V2 parity matrix across UI, UX,
    functionality, and performance
  - added `pnpm parity:validate` to the root and made it the first part of
    `pnpm check:foundation`
  - documented honest `not-audited`, `gap`, `partial`, `verified`, and
    `approved-change` evidence semantics
- wrote the durable long-range execution setup:
  - added `docs/plans/v2/autonomous-development-operating-contract.md`
  - defined recovery order across compactions and tasks
  - defined autonomous authority and ask-first boundaries
  - defined milestone direction, architecture, correctness, parity,
    performance, cleanup, and evidence gates
  - made `/goal` plus repository evidence the continuity mechanism and rejected
    overlapping mutating loops on one worktree
- audited and preserved the large pre-existing dirty worktree:
  - recorded branch, head, staged state, changed/untracked inventory, deletion,
    coherent review slices, risks, and stabilization sequence
  - did not reset, clean, stage, commit, push, or deploy the mixed work
- browser-compared the pinned V1 editor and current V2 at a fixed desktop
  viewport using the same `simple-example` project and bundled audio
- found and fixed three browser-visible V2 regressions:
  - stabilized `HistoryManager` graph-enabled selection so loading a sample no
    longer enters a maximum-update-depth loop and blanks the editor
  - added a jsdom regression test covering project history followed by an
    unrelated history-state update
  - replaced four Vite-incompatible CommonJS node-body loads with ESM imports,
    restoring animation previews and the node graph surface
  - restored `RhythmLabPanel` to the active Vite editor shell with the same
    workspace replacement behavior as V1
- clean-browser verified:
  - sample project load and visible three-layer preview
  - animation preview rendering including Hysteresis Gate
  - node graph workspace
  - Rhythm Lab open and close
  - playback advance and pause
  - no V2 console errors or warnings during the final run
- recorded the first browser parity evidence in
  `docs/parity/evidence/2026-07-29-calibration.md`
- kept parity claims conservative:
  - no row was marked `verified` from the smoke alone
  - profiler parity was initially a known gap because browser-incompatible
    optional CommonJS instrumentation remained
  - performance parity remains unmeasured
- completed the canonical `VizProjectDocument` cutover:
  - deleted `EditorProjectDocument` and `EditorProjectLayer`
  - made `VizSession` source/working project state use the package contract
  - embedded canonical graph documents in the working project and turned
    executable V1 `NodeNetwork` values into non-persisted editor projections
  - preserved package-native graphs when the V1 node UI edits compatible graph
    projections
  - moved layer expansion/debug preferences into editor UI state
  - made history snapshot the complete project document, including graphs
  - migrated `.vizengine.json` persistence and all bundled sample projects to
    one canonical `project` payload
  - changed the runtime-preview bridge to begin from canonical session truth
  - deleted `layer-values-store` and rewired parameter controls directly to
    canonical layer settings
  - renamed `layer-store` to `editor-layer-projection-store` so its adapter role
    is explicit
  - replaced optional CommonJS profiler lookups with a browser-safe metric sink
  - documented every remaining adapter and its deletion condition in
    `phase-12-canonical-viz-project-document-cutover.md`
- browser-verified the canonical cutover in the preserved real editor:
  - loaded the canonicalized `simple-example` through the Examples menu
  - preserved the three-layer live preview, waveform, executable React Flow
    graph surface, playback, and Rhythm Lab navigation
  - observed no browser errors or warnings during the final run
- reclassified profiler parity from `gap` to `partial` after replacing the
  browser-incompatible CommonJS lookup path with an explicit metric sink;
  profiler overhead remains unverified until a repeatable benchmark exists
- validated the completed canonical cutover with the full
  `pnpm check:foundation` gate:
  - parity matrix valid with 41 capabilities
  - package and studio type checks passed
  - production studio build passed
  - 29 foundation test files / 82 tests passed
  - built-package consumer smoke passed
  - agent creative-loop bundle roundtrip passed
- completed the `VizSession` runtime-preview ownership cutover:
  - moved requested/completed frame inspection, render cycles, rendered layer
    ids, runtime-backed layer ids, and preview failure state into
    `VizSession.preview.runtimeInspection`
  - made live preview and image/video export dispatch frames through the same
    `VizSession` command
  - replaced the mixed runtime-preview store with a browser-only attachment
    registry for render callbacks, mirror canvases, and the Remotion player ref
  - moved the Remotion ref out of `VizSession`
  - deleted the redundant editor preview controller and editor-local frame
    contract modules
  - kept the remaining per-component runtime bridge explicitly temporary
    because deleting it before the component-runtime migration would regress
    features or move scene meaning back into browser/React code
- added focused runtime-preview ownership tests covering success, failure,
  reset/attachment isolation, attachment pruning, and the local inspection
  control surface
- browser-verified the runtime-preview ownership cutover in the preserved real
  editor:
  - loaded the canonical `simple-example` project with its three-layer visual,
    waveform, and executable React Flow graph
  - advanced playback to `00:01.83` and confirmed the paused time remained
    stable
  - opened and closed Rhythm Lab
  - opened and closed the video export configuration surface
  - observed no browser errors or warnings
- validated the completed cutover with `pnpm check:foundation`:
  - parity matrix valid with 41 capabilities
  - package and studio type checks passed
  - production studio build passed
  - 30 foundation test files / 86 tests passed
  - built-package consumer smoke passed
  - agent creative-loop bundle roundtrip passed

## 2026-05-15

- promoted `VizSession` to the explicit architectural target for the rewrite:
  - added `docs/specs/v2/viz-session.md`
  - defined `VizSession` as the one canonical in-memory session engine for:
    - working project truth
    - graph truth
    - preview transport truth
    - audio session truth
    - history truth
    - runtime inspection/preview state
  - made the editor/runtime/agent relationship explicit:
    - editor is a view/controller over `VizSession`
    - runtime evaluates `VizSession`
    - agents/tools mutate and inspect `VizSession`
  - made the rewrite posture stricter:
    - no new long-lived transitional ownership layers
    - no more treating cleaner editor-local canonical stores as the end state
    - direct convergence on `VizSession` from here forward
  - updated the core source-of-truth docs:
    - `docs/current-state.md`
    - `docs/working-agreements.md`
    - `docs/visions/viz-engine-v2-vision.md`
    - `docs/plans/v2/real-editor-v2-rewire-execution-plan.md`
    - `docs/docs-index.md`
    - `docs/suggestions.md`
- wrote the direct convergence plan for getting from the current partly
  regutted editor architecture to a real `VizSession` architecture:
  - added `docs/plans/v2/viz-session-transition-plan.md`
  - defined the hard migration posture:
    - no more “cleaner transitional glue” as the destination
    - move current canonical-ish stores into `VizSession`
    - rebind editor, runtime preview, and agents/tools to `VizSession`
    - delete superseded stores and bridges aggressively after each cutover
- documented the realtime UI-performance binding model for `VizSession`:
  - `VizSession` should preserve the current external-store/selective-
    subscription performance posture
  - `VizSession` may use `zustand/vanilla` or an equivalent external-store core
    internally
  - React should subscribe to small slices only
  - frame-driven preview/render/audio work should stay imperative instead of
    causing broad React rerender loops
  - updated:
    - `docs/specs/v2/viz-session.md`
    - `docs/plans/v2/viz-session-transition-plan.md`
    - `docs/working-agreements.md`

## 2026-05-14

- completed the first real hidden-brain swap under the preserved editor layer
  panel:
  - added a canonical app-local layer working-project store in
    `src/lib/stores/editor-project-store.ts`
  - made layer add/remove/duplicate/reorder/settings/value/preset mutations
    flow through that canonical store instead of direct component-level writes
    into `layer-store` and `layer-values-store`
  - kept the visible layer panel intact by projecting canonical layer truth
    back into the legacy layer/value stores for the current renderer and UI
    surfaces
  - added `src/components/editor/editor-project-manager.tsx` to bootstrap the
    canonical layer project from current persisted editor state
  - updated project save/load/reset so layer payload now re-enters the
    canonical working-project path
  - updated layer-history application so undo/redo re-imports restored layer
    truth into the canonical layer project instead of silently forking a second
    layer brain
  - documented the slice in
    `docs/plans/v2/phase-1-layer-working-project-implementation.md`
  - revalidated the slice with `pnpm studio:typecheck` and then the full
    `pnpm check:foundation` gate
- completed the next real hidden-brain swap under the preserved playback UI:
  - added a canonical app-local preview transport store in
    `src/lib/stores/editor-preview-store.ts`
  - backed that store with the existing transport controller semantics from
    `@viz-engine/editor-session`
  - rewired the real preview/playback cluster onto that store:
    - `remotion-player`
    - `custom-player-controls`
    - `audio-panel`
    - `capture-audio`
    - `waveform-display`
    - `animation-builder`
    - `layer-renderer`
    - `export-image-dialog`
    - export orchestrator playback pause/resume handling
  - narrowed `editor-store` so it no longer owns preview transport fields
  - updated project reset/persistence so preview transport is no longer treated
    as editor state
  - updated track navigation and restart flows so they also reset preview
    position through the canonical preview transport store
  - added foundation coverage in
    `tests/foundation/editor-preview-store.test.ts`
  - documented the slice in
    `docs/plans/v2/phase-2-preview-transport-implementation.md`
  - revalidated the slice with `pnpm studio:typecheck` and the full
    `pnpm check:foundation` gate
- completed the next real hidden-brain swap under the preserved audio UI:
  - split the old giant mixed audio store into:
    - `src/lib/stores/editor-audio-session-store.ts`
    - `src/lib/stores/audio-engine-store.ts`
  - moved source selection, track navigation, capture-session truth, and
    current/visual time onto the canonical audio-session store
  - kept browser audio refs, analyzer/gain/source nodes, decoded buffers, and
    captured streams in the narrower audio-engine store
  - rewired the real audio panel, audio file loader, capture control, waveform
    consumers, export audio-source lookup, and rhythm-lab visual-time readers
    onto that split ownership model
  - added `src/components/editor/editor-audio-session-manager.tsx` so analyzer
    availability and connected-source status feed back into canonical
    session truth
  - added regression coverage in
    `tests/foundation/editor-audio-session-store.test.ts`
  - documented the slice in
    `docs/plans/v2/phase-3-audio-session-truth-implementation.md`
  - revalidated the slice with `pnpm studio:typecheck`, targeted foundation
    tests, and the full `pnpm check:foundation` gate
- completed the next real hidden-brain swap under the preserved node editor:
  - added a canonical graph store in
    `src/lib/stores/editor-graph-store.ts`
  - moved graph network truth, graph execution, and graph persistence
    serialization into that canonical store
  - turned `src/components/node-network/node-network-store.ts` into a thin UI
    adapter that mirrors canonical graph truth while retaining the same
    component-facing API for the preserved node editor
  - updated graph history application so node undo/redo restores nodes and
    edges through the canonical graph path instead of mutating the UI adapter
    store as if it were authoritative
  - updated project save/load/reset so graph serialization and hydration now
    re-enter canonical graph ownership
  - updated layer duplication/default-network/preset flows so they also target
    canonical graph ownership
  - split shared graph node types into
    `src/components/node-network/graph-types.ts` to prevent import-time cycles
    between graph execution and the node-editor UI adapter
  - added regression coverage in
    `tests/foundation/editor-graph-store.test.ts`
  - documented the slice in
    `docs/plans/v2/phase-4-graph-truth-implementation.md`
- completed the next cleanup pass on layer history ownership:
  - changed `history-store` so layer undo/redo snapshots canonical
    `EditorProjectDocument` truth directly instead of serializing legacy
    `layer-store` and `layer-values-store` state
  - changed layer history restore to call
    `useEditorProjectStore.getState().importWorkingProject(...)` directly
    instead of reconstructing canonical truth through legacy stores first
  - rewired `history-manager` so it now watches canonical working-project
    truth and canonical graph enabled-state truth instead of the old split
    layer/value/network ownership path
  - added regression coverage in
    `tests/foundation/history-store.test.ts`
  - documented the cleanup in
    `docs/plans/v2/phase-5-canonical-history-cleanup.md`
- completed the real shell cutover the right way:
  - deleted the old Next shell and API routes
  - turned `apps/viz-studio` into the real product shell instead of the
    placeholder inspector app
  - preserved the existing editor UI by mounting the real editor surface
    through Vite instead of redesigning it
  - replaced the tiny Next-only integration points with Vite-safe equivalents:
    - `next/image` -> native image tags where needed
    - `/api/audio-files` -> static bundled-audio manifest
    - `/api/sample-projects` -> static sample-project manifest
  - moved the shared product styles into `src/styles/globals.css`
  - removed `next`, `@vercel/analytics`, `eslint-config-next`,
    `next.config.mjs`, `next-env.d.ts`, and `tsconfig.app.json`
  - moved `src/app/favicon.ico` to `public/favicon.ico`
  - revalidated the full repo with `pnpm check:foundation`
  - browser-verified the real preserved editor surface running from Vite
- completed the styling-foundation cleanup after the shell migration:
  - upgraded the product shell to the Vite-native Tailwind v4 path
  - removed the old root `tailwind.config.ts`
  - removed the old root `postcss.config.mjs`
  - removed the app-local `apps/viz-studio/postcss.config.cjs` override
  - replaced the old dark-mode workaround with an explicit `html.dark` root
  - updated `components.json` to point at `src/styles/globals.css`
  - fixed secondary CSS `@apply` usage under Tailwind v4 with explicit
    `@reference`
  - normalized the dev server back to `http://localhost:4173/`
  - revalidated the full repo again with `pnpm check:foundation`
  - browser-verified the styled editor at
    `http://localhost:4173/?allowSmallViewport=1`
- wrote the next real execution map for replacing hidden ownership under the
  preserved editor UI:
  - added `docs/plans/v2/real-editor-v2-rewire-execution-plan.md`
  - defined the strict implementation order:
    - ownership audit
    - layer/working-head rewiring
    - transport/preview rewiring
    - audio-session rewiring
    - node-editor rewiring
    - agent-surface hardening
    - legacy ownership burn-down
  - made validation and “no UI drift” explicit phase gates
- completed the detailed Phase 0 ownership audit for the real editor:
  - added `docs/plans/v2/editor-ownership-audit-and-phase-0-map.md`
  - mapped current ownership across:
    - `editor-store`
    - `layer-store`
    - `layer-values-store`
    - `node-network-store`
    - `audio-store`
    - `history-store`
    - `comp-store`
  - mapped current visible editor surfaces to the hidden stores behind them
  - identified the exact first rewire seam:
    - layer and working-project truth under the existing layer panel
  - identified the exact later seams:
    - transport/preview
    - audio session
    - graph truth
- tightened the source-of-truth docs around the clean editor/runtime split:
  - editor edits
  - runtime runs
  - React hosts the editor surface but does not define scene semantics
  - explicit runtime session state is allowed, but hidden editor-owned runtime
    semantics are not
- made the canonical runtime-control rule explicit for agents and tools too:
  - editor, local programmatic hosts, and future MCP/tools should all drive the
    same runtime/session entry points
  - agent tools should wrap the same canonical runtime controls the editor uses
    instead of inventing a second control plane
- cleaned the non-doc codebase naming so the rewrite no longer reads like a
  parallel “v2 app”:
  - renamed `tests/v2` -> `tests/foundation`
  - renamed `tools/v2` -> `tools/foundation`
  - renamed the active validation scripts to `*:foundation` / `fixtures:update`
  - removed stray `V2` product-facing strings from `apps/viz-studio` and the
    example assets/components
  - removed the stale dead `packages/viz-magnify-adapter` artifact directory
- clarified the core V2 product rule across the active docs:
  - preserve the visible V1 editor surface very literally
  - replace truth/state/runtime ownership underneath it
  - treat agent operability as an action/runtime problem, not a UI redesign
    problem
- reverted commit `5eaa4eb` (`refactor: migrate active editor shell to vite`)
- restored the real Next editor shell as the active product surface
- removed the fake V2 product-shell files that were lowering the UX bar:
  - `src/components/editor/v2-*`
  - `src/components/audio/v2-audio-panel.tsx`
  - `src/lib/v2-editor/app-store.ts`
  - related V2 shell tests
- kept the V2 engine/foundation packages intact
- corrected the docs posture so the repo now explicitly says:
  - preserve the V1 editor UX
  - replace architecture underneath it
  - do not ship or grow a weaker parallel replacement editor

## 2026-05-07

- established the initial VizEngine V2 docs spine
- added V2 source-of-truth docs:
  - `docs/docs-index.md`
  - `docs/current-state.md`
  - `docs/working-agreements.md`
  - `docs/visions/viz-engine-v2-vision.md`
  - `docs/suggestions.md`
- added repo-operating-system docs:
  - `AGENTS.md`
  - `docs/architecture.md`
  - `docs/monorepo-operating-system.md`
  - `docs/structural-doctrine.md`
  - `docs/work-ledger.md`
- added first V2 contract/spec docs:
  - `docs/specs/v2/viz-project-document.md`
  - `docs/specs/v2/component-contract.md`
  - `docs/specs/v2/node-contract.md`
  - `docs/specs/v2/bake-artifact-contract.md`
  - `docs/specs/v2/runtime-package-split-plan.md`
- defined the rewrite as a full replacement rewrite with explicit no-legacy and
  full-purge posture
- updated the root `README.md` to point to the V2 rewrite direction and docs
- added `docs/plans/v2/v2-system-design.md` as the first deeper V2 architecture
  decision document
- added more concrete V2 implementation specs:
  - `docs/specs/v2/runtime-api-spec.md`
  - `docs/specs/v2/ai-action-schema-spec.md`
- added `docs/visions/viz-cloud-and-integration-vision.md` to define the
  open-core plus optional-cloud product model and Magnify integration posture
- added `docs/specs/v2/viz-cloud-workspace-data-model.md` to define the first
  concrete hosted product data model direction
- added `docs/specs/v2/viz-to-magnify-integration-api-spec.md` to define the
  first explicit API boundary between Viz and Magnify
- added `docs/specs/v2/project-version-publication-workflow.md` to define
  working head vs stable version vs published version behavior
- added `docs/specs/v2/viz-cloud-orchestration-with-inngest.md` to define the
  orchestration boundary between Viz Cloud truth and Inngest workflows
- added `docs/specs/v2/render-job-ownership-and-lifecycle-model.md` to define
  Viz-owned hosted render job truth and lifecycle transitions
- added `docs/specs/v2/auth-and-identity-federation-model.md` with Better Auth
  as the preferred current Viz Cloud auth direction
- added `docs/specs/v2/draft-autosave-and-working-head-storage-model.md` to
  define mutable working-head persistence and autosave posture
- added `docs/specs/v2/ai-native-command-and-control-surface.md` to define the
  future AI-native control/tooling/runner direction and its staged rollout
- added `docs/specs/v2/bake-job-ownership-and-lifecycle-model.md` to define
  Viz-owned hosted bake job truth and lifecycle transitions
- added `docs/specs/v2/linked-account-and-sso-flow-design.md` to define the
  preferred Magnify-to-Viz human handoff and identity-linking flow
- expanded `docs/specs/v2/linked-account-and-sso-flow-design.md` into a fuller
  connected-workspace identity spec with canonical records, signed handoff
  payload shape, first-link flow, service integration flow, failure cases, and
  the exact default rule for project-version vs working-head opens
- added `docs/specs/v2/local-persistence-and-import-export-model.md` to define
  local-first project persistence, portable Viz bundle shape, import/export
  rules, and the clean boundary between cloud-reference mode and bundle-artifact
  mode for Magnify integration
- added
  `docs/specs/v2/runtime-package-consumption-and-local-tarball-integration-plan.md`
  to define the package-first Magnify proof, local tarball testing posture, and
  the staged path from local package proof to bundle proof to hosted Viz
  reference proof
- added `docs/specs/v2/future-mcp-tool-surface-inventory.md` to define the
  staged agent-callable MCP/tool families for local-first Viz, Viz Cloud, and
  future Magnify-connected workflows
- added `docs/visions/specialized-ai-runner-vision.md` to keep the runner
  layer at the right abstraction level until the baseline, tool surface, and
  Magnify proof are all real
- added `docs/specs/v2/asset-resolver-and-storage-abstraction-spec.md` to
  define the strict seam between canonical refs, environment-specific storage
  backends, and runtime-facing resolved inputs
- expanded the asset/storage direction to explicitly distinguish source assets,
  derived managed assets, baked artifacts, and render outputs so future
  manipulated image/video workflows stay architecturally clean
- added `docs/visions/deployment-and-app-shell-posture.md` to define the
  default hosted posture of R2 for media storage, Railway for deployed compute,
  and Vite-first product apps with Next.js only when explicitly justified
- added `docs/specs/v2/local-first-cli-and-developer-ergonomics-plan.md` to
  define the practical local operator surface for project, validation,
  preview/render, bundle, and package-proof workflows
- added `docs/visions/multi-renderer-and-backend-capability-vision.md` to
  define the future renderer-family posture: backend pluralism by design,
  explicit compatibility metadata, and one strong baseline backend before
  broader engine diversity
- added `docs/specs/v2/asset-lifecycle-and-derivation-job-model.md` to define
  source-vs-derived asset lifecycle, explicit provenance, and derivation jobs as
  a first-class operational family distinct from bake and render jobs
- added `docs/specs/v2/audio-feature-timeline-spec.md` to define the
  base-features plus graph-shaping plus optional-heavy-analysis model, with a
  standard convenience profile and explicit deterministic render posture
- added `docs/specs/v2/package-build-publication-and-versioning-strategy.md` to
  define the small public package surface, unified early versioning, GitHub
  trusted-publish posture, and tarball-smoke release discipline informed by
  `air-jam`
- added `docs/plans/v2/first-real-implementation-slicing-plan.md` to define
  the actual V2 scaffold/reorg start, immediate package ownership, and the
  first build order for contracts, runtime, bake, and remotion-adapter work
- added `docs/visions/rendering-performance-and-deployment-strategy.md` to
  define the explicit client/server rendering posture: scene-owned compositor,
  `Three/WebGL` as the first strong backend, deterministic mixed-layer
  composition rules, Remotion as the first production render host, native
  FFmpeg as the encoding/muxing layer, and Railway CPU workers as the first
  deployed render environment

## 2026-05-08

- started the first real V2 implementation slice instead of continuing to plan
- introduced a shared package-safe TypeScript base in `tsconfig.base.json` so
  new V2 packages no longer inherit Next-specific root config
- expanded the workspace structure to support `apps/*` as well as `packages/*`
- added root V2 scripts for package typecheck/build, studio app, V2 test runs,
  and combined `check:foundation` verification
- created the first real V2 packages:
  - `packages/viz-contracts`
  - `packages/viz-runtime`
  - `packages/viz-bake`
  - `packages/viz-remotion-adapter`
  - `packages/viz-example-projects`
- created the first real V2 app shell:
  - `apps/viz-studio`
- implemented the first canonical runtime contract surface:
  - project document validation
  - deterministic frame context creation
  - runtime session creation
  - ordered layer resolution
  - first frame-plan resolution against baked audio feature artifacts
  - component registry scaffolding
- implemented the first bake-plan generation seam from canonical project assets
- implemented the first Remotion composition/frame-state adapter seam
- added canonical example fixtures for:
  - a real V2 example project document
  - a standard audio feature timeline artifact
  - initial component metadata definitions
- added the first root V2 automated tests covering:
  - project validation
  - frame-plan resolution
  - bake-plan generation
  - Remotion adapter framing
- added the first local-first CLI package:
  - `packages/viz-dev-cli`
- added root example CLI commands for validating and inspecting canonical V2
  example projects
- added `docs/plans/v2/foundation-implementation-progress.md` to keep an
  explicit implementation trail from scaffold to actual visual runtime proof
- added `docs/plans/v2/first-visual-runtime-proof-plan.md` to define the
  next slice: executable components, explicit render nodes, a proof renderer,
  and shared studio/Remotion visual output
- implemented the first actual visual runtime proof:
  - executable component contract in `viz-contracts`
  - explicit render-node contract
  - runtime render-plan generation in `viz-runtime`
  - first real core components in `packages/viz-components-core`
  - first proof renderer in `packages/viz-renderer-svg`
- rewired `apps/viz-studio` to render from the shared runtime render plan
  instead of the earlier mock preview path
- expanded `@viz-engine/remotion-adapter` to create shared runtime render plans
  and proof-level SVG output
- expanded the local-first CLI to inspect render plans and emit SVG proof output
- expanded V2 tests to cover:
  - render-plan generation
  - SVG proof rendering
  - Remotion proof render plans and markup
- added `docs/plans/v2/first-three-compositor-proof-plan.md` to define the
  next slice: keeping render-plan ownership stable while adding the first
  actual `Three/WebGL` compositor proof
- implemented the first `Three/WebGL` compositor proof:
  - added `packages/viz-renderer-three`
  - mapped proof render nodes into a `Three` scene graph
  - made `apps/viz-studio` use the shared render plan for a real WebGL preview
  - kept the SVG proof renderer alive as a deterministic debug surface
- strengthened internal package discipline:
  - moved internal V2 packages to dist-first runtime exports
  - added source-first TypeScript path aliases for lint/dev
  - split package lint/dev resolution from package build resolution in
    `tsconfig` handling
- expanded tests to cover the `Three` renderer scene-graph mapping
- added `docs/plans/v2/media-backed-render-node-proof-plan.md` to define the
  next slice: proving image-backed asset visuals through the same shared
  render-plan system
- implemented the first media-backed render-node proof:
  - added `asset-ref` as a first-class input source in canonical contracts
  - added an explicit shared `image` render node
  - added the first image-backed core component
  - extended the canonical example project with a resolved image asset and
    image-backed layer
  - extended the SVG proof renderer to emit asset-backed `<image>` nodes
  - extended the `Three` proof renderer to hydrate image textures in preview
    without moving asset semantics into renderer-owned scene truth
- cleaned up accidental compiled source artifacts after the dist-first package
  export refactor so package builds remain strictly `dist`-owned
- validated the full V2 surface again after the media-backed proof:
  - `pnpm check:foundation`
  - `pnpm viz:example:svg`
- added `docs/plans/v2/package-consumer-readiness-proof-plan.md` to define the
  next slice: proving that Viz V2 packages work as real external tarball
  dependencies instead of only inside the monorepo
- implemented the first package-consumer readiness proof:
  - trimmed V2 package tarballs to `dist`-first contents
  - added `tools/foundation/package-consumer-smoke.mjs`
  - added `pnpm smoke:consumer`
  - folded the consumer smoke into `pnpm check:foundation`
  - fixed built package ESM imports to use explicit relative `.js` specifiers
  - proved that a temporary external consumer can install Viz tarballs and
    render the canonical example project without workspace alias help
- validated the external consumer seam:
  - `pnpm smoke:consumer`
- temporarily proved the cross-repo Magnify seam locally to validate that the
  portable Viz runtime could be hosted inside Magnify's Remotion environment
- deliberately removed the Magnify-specific adapter/package direction after the
  proof, to keep Viz centered on portable runtime contracts rather than
  app-specific glue inside the core workspace

## 2026-05-13

- finished the Magnify-adapter cleanup mechanically after the earlier proof:
  removed the temporary `viz-magnify-adapter` package, removed its test/proof
  wiring, and refreshed the workspace and lockfile so the core V2 package spine
  is portable-runtime-first again
- updated the docs/specs wording to use generic external host adapters instead
  of treating Magnify-specific glue as part of the core runtime architecture
- revalidated the cleaned portable-runtime-first setup with:
  - `pnpm install`
  - `pnpm check:foundation`

## 2026-05-14

- added `docs/visions/agent-operated-live-editor-vision.md` to define the
  explicit collaborative target where the user describes a visual, the agent
  opens and operates the editor/runtime surface, writes scene and component
  changes, wires audio reactivity, and both iterate on one live preview loop
- linked the new live-editor collaboration goal into `docs/docs-index.md` so
  it becomes part of the active V2 source-of-truth direction rather than
  staying implicit in chat
- added `docs/plans/v2/agent-operated-live-editor-roadmap.md` to turn that
  vision into a detailed multi-phase execution plan with clear deliverables,
  anti-goals, exit criteria, and validation gates for the road from the
  current runtime baseline to a true human-plus-agent live authoring loop
- added `docs/plans/v2/v1-editor-ux-preservation-and-v2-rebuild-map.md` to
  make it explicit that the V1 editor UX is the product reference and V2 must
  rebuild that experience while replacing the hidden architecture underneath it
- implemented the first real editor rebuild foundations:
  - `@viz-engine/editor-session`
  - explicit working-head mutation
  - explicit preview state
  - explicit UI state separation
- implemented the first live preview and audio-session foundation:
  - deterministic transport control
  - explicit audio-session state
  - live-vs-baked preview diagnostics
- implemented the first local agent control surface:
  - `@viz-engine/editor-control`
  - stable local operations over project open, mutation, preview inspection,
    graph inspection, SVG/debug output, and bundle export
- implemented the first component-authoring foundation slice:
  - per-component module structure in `@viz-engine/components-core`
  - registry validation
  - CLI component scaffold helper
  - first V1-derived V2 component port:
    - `feature-channel-bars`
- implemented the first V2-backed editor shell in the real Next app terrain:
  - `src/app/page.tsx` now mounts a V2 editor shell
  - browser-local editor state now wraps the V2 control surface instead of
    recreating runtime semantics directly in UI code
  - scene, graph, issue, preview, and audio-session truth are now inspectable
    inside the actual editor surface
- split `@viz-engine/editor-control` into:
  - a browser-safe root entry
  - a Node-only secondary entry for bundle IO
  so the real editor build can stay clean while local tooling still owns
  filesystem-backed roundtrips
- added root-app validation to the V2 gate:
  - `pnpm app:check`
  - root Next app typecheck/build now run inside `pnpm check:foundation`
- added the first agent-native creative-loop proof in
  `tools/foundation/agent-creative-loop-scenario.ts`, proving that the agent can open
  the canonical project, add graph/layer content, inspect runtime output,
  export a bundle, and reload it through the same V2 operator stack
- added explicit implementation docs for:
  - `rich-scene-authoring-and-debugging-implementation-plan.md`
  - `agent-native-creative-loop-proof-plan.md`
- hardened the real editor live loop further:
  - bundled audio discovery now comes from a shared server helper
  - the real Next page now passes bundled-track truth into the V2 editor shell
  - the V2 audio panel now exposes bundled tracks and explicit loop control
  - preview advancement in the V2 app-store no longer depends only on
    `requestAnimationFrame`
  - dedicated app-store tests now cover transport advancement, bundled-track
    load, preview-duration extension, and reset behavior
- added a deliberate local bypass for the old screen-size guard:
  - `?allowSmallViewport=1`
  so the real editor can be opened in the Codex browser without weakening the
  default product guard for normal users
- added the next editor-facing component-authoring slice:
  - `@viz-engine/editor-control.inspectComponents()`
  - V2 app-store component summaries
  - `Components` tab in the real scene panel showing registry-driven component
    truth
- added explicit implementation docs for:
  - `live-editor-transport-and-audio-hardening-plan.md`
  - `editor-component-catalog-inspection-plan.md`
- revalidated the full V2 stack after the editor-shell and creative-loop work:
  - `pnpm check:foundation`
  current V2 baseline to a real human-plus-agent live creation loop
- clarified the V2 source-of-truth docs so it is now explicit that:
  - the V1 editor experience is the UX reference to preserve
  - the hidden V1 architecture is what should be replaced
  - V2 must rebuild the real editor experience over the new runtime/action
    core instead of drifting toward a weaker alternate dev-shell editor
- added `docs/plans/v2/v1-editor-ux-preservation-and-v2-rebuild-map.md` as
  the concrete editor execution reference, classifying what to preserve as UX,
  what to replace as architecture, what to port later, and what the first true
  rebuild seam should be under the existing product workflow
- added `docs/plans/v2/editor-session-foundation-implementation-plan.md` and
  implemented the first reusable editor-foundation seam:
  - new `@viz-engine/editor-session` package
  - explicit split between source project, working head, editor UI state, and
    preview state
  - canonical action-driven working-head mutation
  - safe rejection of invalid mutations without corrupting working head truth
  - working-head bundle export/reload roundtrip coverage
  - external package-consumer smoke coverage for the new session package
- added `docs/plans/v2/live-preview-and-audio-session-foundation-plan.md` and
  implemented the next reusable live-preview seam on top of
  `@viz-engine/editor-session`:
  - deterministic transport controller
  - explicit play/pause/seek/frame-advance behavior
  - explicit audio-session state
  - explicit live-vs-baked diagnostics
  - tests proving preview control can drive editor-session preview state
    without shell-specific state ownership
- added `docs/plans/v2/local-agent-control-surface-implementation-plan.md` and
  implemented the first real local operator layer:
  - new `@viz-engine/editor-control` package
  - example/bundle/in-memory project opening
  - stable working-head mutation through canonical actions
  - graph, frame, render, and SVG debug inspection
  - transport and audio-session inspection/control
  - bundle export from the same operator surface
  - external package-consumer smoke coverage for the operator package
- added `docs/plans/v2/component-authoring-foundation-implementation-plan.md`
  and implemented the first component-authoring foundation slice:
  - refactored `@viz-engine/components-core` into per-component modules
  - strict runtime component-registry validation
  - local-first component scaffold helper
  - CLI exposure for scaffold generation
  - first V1-derived V2 component port: `feature-channel-bars`
  - dedicated tests for registry validation, scaffold generation, and the new
    component render path
- added `docs/plans/v2/shared-asset-materialization-implementation-plan.md`
  and implemented the first real shared asset materialization seam:
  - explicit materialized asset contracts
  - runtime materialization helpers
  - runtime session materialized asset maps
  - asset-ref inputs resolving to materialized assets
  - render plans carrying materialized assets
  - renderers consuming materialized assets via stable asset ids instead of raw
    source URIs embedded in render nodes
- expanded the V2 validation surface with a dedicated materialized-asset test
- revalidated the materialization slice with:
  - `pnpm test:foundation`
  - `pnpm check:foundation`
- added `docs/plans/v2/three-renderer-compositor-semantics-cleanup-plan.md`
  and implemented the first meaningful `Three` semantics cleanup:
  - inherited group opacity/blend propagation through the render tree
  - explicit stroke-only rect rendering as border meshes
  - stronger `Three` tests that assert material semantics instead of only
    scene-graph shape
- validated the `Three` semantics slice with:
  - `pnpm --filter @viz-engine/renderer-three lint`
  - `pnpm test:foundation`
  - `pnpm check:foundation`
- added `docs/plans/v2/local-bundle-fixture-validation-plan.md` and
  implemented the first real local bundle-directory proof:
  - typed bundle-manifest contracts
  - shipped example bundle fixture data inside `@viz-engine/example-projects`
  - node-specific example-projects bundle helpers on a clean `./node` subpath
  - generic local bundle loading in the local-first CLI layer
  - CLI validation/frame/svg flows from bundle-backed runtime inputs
  - local bundle validation issues for manifest correctness, reference
    coverage, and file presence
  - external consumer smoke rendering through the packaged bundle path itself
- added `docs/plans/v2/first-action-surface-implementation-plan.md` and
  implemented the first canonical project action surface:
  - introduced typed project action contracts in `@viz-engine/contracts`
  - added a pure `@viz-engine/actions` package that reduces explicit actions
    into new `VizProjectDocument` values
  - covered the first core mutation families for assets, artifacts, layers, and
    embedded graphs
  - added tests proving action-driven mutations still validate through the
    shared runtime/frame-plan/render-plan path
  - extended the external package-consumer smoke so host code can install the
    actions package and mutate a project document outside the monorepo
  - refreshed the workspace install so the new package builds through the same
    dist-first workspace path as the older V2 packages
- extended the local-first CLI with the first real action-apply operator
  surface:
  - example projects can now be mutated through canonical actions and optionally
    exported as bundles
  - portable bundle directories can now be mutated through canonical actions,
    re-exported, reloaded, and rendered again
  - invalid action-driven documents now report validation failures cleanly
    instead of crashing during runtime-session construction
- cleaned up the V2 studio bundle posture:
  - moved the `Three/WebGL` preview behind a lazy React boundary
  - split the preview renderer into a secondary build chunk
  - reduced the initial studio application chunk enough to remove the previous
    Vite chunk-size warning without hiding it or raising the threshold
- added `docs/plans/v2/validation-hardening-and-golden-output-plan.md` and
  implemented the first hardened validation baseline:
  - added a shared golden-output normalizer for canonical frame/render summaries
  - added a checked-in `tests/foundation/fixtures` golden set for frame-plan,
    render-plan, SVG, and exported bundle-manifest outputs
  - added `pnpm fixtures:update` to regenerate those fixtures deliberately
  - added corruption-path tests covering invalid manifest metadata, missing
    files, orphan manifest entries, and missing manifest entries
  - hardened the local bundle loader so missing or malformed artifact payloads
    become explicit issues instead of crashing bundle loading
  - kept `pnpm check:foundation` green with the stronger validation surface
- added `docs/plans/v2/first-temporal-graph-execution-plan.md` and
  implemented the first real temporal graph baseline:
  - expanded node contracts to support explicit temporal stepping
  - rewrote graph evaluation so temporal graphs replay from frame zero under
    fixed timestep instead of smuggling hidden state into the runtime
  - added explicit in-memory graph checkpoints to runtime sessions so repeated
    temporal graph evaluation can resume from the nearest stored frame
  - added a temporal `decay` node to `@viz-engine/nodes-core`
  - upgraded the canonical example graph and shipped example bundle to use the
    new temporal bloom-decay path
  - added deterministic temporal graph tests for both replay correctness and
    checkpoint reuse, and kept the stronger validation surface green
- added `docs/plans/v2/first-graph-execution-slice-plan.md` and implemented
  the first real graph execution path:
  - upgraded project graphs from stub refs to embedded graph documents
  - added graph contracts for graph-scoped inputs, node bindings, and named
    graph outputs
  - added a dedicated `@viz-engine/nodes-core` package for the first pure-node
    execution set
  - added runtime graph evaluation and `graph-output` resolution through the
    shared frame-plan/render-plan path
  - converted the example project and shipped example bundle to use real graph
    outputs for audio-reactive shaping
  - added direct graph tests for deterministic outputs and cycle detection
  - kept `pnpm check:foundation` green after the graph slice
- added `docs/plans/v2/portable-bundle-roundtrip-implementation-plan.md` and
  implemented the first real bundle export/reload path:
  - added a node-only local bundle writer in the CLI layer
  - added bundle export support for file-backed, data-URI-backed, and
    byte-backed assets plus JSON artifact payloads
  - made the in-memory example project exportable directly by supplying
    explicit placeholder audio bytes
  - added CLI export helpers for example-project and bundle-to-bundle export
  - added roundtrip tests for export and reload
  - strengthened the external consumer smoke to export and reload a packaged
    bundle outside the monorepo
  - kept `pnpm check:foundation` green after the bundle roundtrip slice
- added `docs/plans/v2/explicit-three-layer-compositor-implementation-plan.md`
  and implemented the first explicit layer compositor step in the `Three`
  preview path:
  - added explicit isolated layer surfaces in the preview controller
  - moved layer opacity and blend ownership onto compositor surfaces
  - kept inner group/style opacity inside the layer content scene
  - expanded renderer tests to assert compositor-surface behavior directly
  - kept `pnpm check:foundation` green after the compositor slice
- validated the local bundle slice with:
  - `pnpm test:foundation`
  - `pnpm viz:bundle:validate`
  - `pnpm check:foundation`
# 2026-05-15

- completed the first real node-editor adapter burn-down
- reduced `node-network-store` to UI/session ownership and moved graph
  mutation/execution access onto canonical graph helpers over
  `editor-graph-store`
- rewired graph-facing editor consumers onto that thinner split without
  changing the visible editor surface
- validated with focused graph/history/editor tests and the full
  `pnpm check:foundation` gate
- completed the first real layer-projection burn-down
- removed layer/value mutation APIs from `layer-store` and
  `layer-values-store`
- rewired remaining editor-side layer value writes onto
  `editor-project-store`
- validated with focused project/history/graph tests and the full
  `pnpm check:foundation` gate
- completed the first canonical project-persistence closeout
- changed `.vizengine.json` export/load/reset to use canonical
  project/graph/editor UI state instead of legacy store payloads
- migrated bundled sample project files in `public/projects` to the canonical
  format
- validated with focused persistence tests and the full
  `pnpm check:foundation` gate
- completed the bootstrap/history cleanup pass on top of the regutted editor
- removed persistence from `layer-store` and `layer-values-store`, leaving
  `editor-project-store` as the sole persisted project source
- renamed the canonical project bootstrap entrypoint from
  `initializeFromLegacy` to `initializeProjectState`
- removed duplicated node-editor selection context from `history-store` so
  undo/redo now reads the active graph from the node-editor UI store directly
- validated with focused history/project/persistence tests, the full
  `pnpm check:foundation` gate, and a browser sanity check on the real editor
- completed the first explicit editor control-plane consolidation pass
- added `src/lib/editor-control.ts` and rewired the preserved editor’s main
  user-facing commands onto one explicit local control surface over canonical
  project/graph/preview/audio/history/persistence ownership
- removed the remaining mixed-import build warnings around `export-store` and
  `idb-file-store`
- moved `animation-builder` and `profiler-panel` behind lazy boundaries so the
  Vite product shell no longer pays their cost eagerly on first load
- validated with `pnpm studio:typecheck`, `pnpm studio:build`, and the full
  `pnpm check:foundation` gate
- added `docs/plans/v2/phase-11-runtime-driven-editor-rendering.md` to define
  the next major regut phase: making the real editor host/configure the
  runtime instead of still owning live render semantics
- completed the first real rendering-ownership cutover under that phase
- added `src/lib/stores/editor-runtime-preview-store.ts` so live preview,
  render callbacks, mirror canvases, and export rendering no longer depend on
  the general layer projection store
- added `src/components/editor/editor-runtime-preview-driver.tsx` so the real
  editor now has one centralized live preview loop instead of per-layer RAF
  loops inside `layer-renderer`
- added `src/lib/editor-runtime-preview-frame.ts` so live preview and export
  now share one explicit preview-frame contract instead of loose time/dt calls
- added `src/lib/editor-runtime-preview-controller.ts` plus preview-store
  last-frame/render-cycle state so the runtime preview seam is now also a real
  control and inspection surface
- extracted `src/lib/editor-runtime-preview-attachment.ts` so browser render
  attachment setup/resize/render/cleanup no longer live directly inside
  `src/components/editor/layer-renderer.tsx`
- added the first real runtime-backed editor preview bridge:
  - ported `Curve Spectrum` into
    `packages/viz-components-core/src/curve-spectrum.ts`
  - added `src/lib/editor-runtime-preview-runtime-bridge.ts` to translate
    supported editor layers into one-layer `VizProjectDocument` previews
  - wired the preview attachment so supported layers now render through the
    package runtime plus package `Three` preview controller instead of local
    `draw` / `draw3D`
  - made runtime-backed preview layers inspectable through
    `runtimeBackedLayerIds` in the preview snapshot
  - exposed the real mounted local control surface at
    `window.__vizEditorDebug` in dev mode so browser-side agent checks can hit
    the same live editor state instead of duplicate module instances
- validated the slice with:
  - `tests/foundation/editor-runtime-preview-store.test.ts`
  - `tests/foundation/editor-runtime-preview-runtime-bridge.test.ts`
  - the full `pnpm check:foundation` gate
  - a live browser smoke where the real transport advanced from `00:00.00`
    to `00:01.76`
  - a live browser mutation through the mounted control surface that added a
    `Curve Spectrum` layer and confirmed the preview snapshot reported
    `layerCount: 1` plus a non-empty `runtimeBackedLayerIds`

# 2026-07-29

- added
  `docs/visions/v2-product-architecture-and-parity-alignment.md` as the active
  product and architecture alignment record for the V2 rewrite
- made the preserved-editor requirement explicit as a measurable UI, UX,
  capability, and performance parity contract rather than a visual-shell-only
  goal
- recorded that the exact pre-V2 parity baseline still needs to be pinned
  because the repository currently uses `main` while the requested reference
  was described as `master`, and this branch also contains later pre-rewrite UX
  improvements
- clarified the intended architectural relationship between:
  - `VizProjectDocument`
  - `VizSession`
  - project actions
  - session commands
  - job requests
  - runtime evaluation
  - compositor and renderer backends
- recorded the highest-impact architecture decisions that should be tightened
  before the rewrite hardens:
  - published execution dependency identity
  - modular `VizSession` ownership
  - explicit determinism levels
  - custom-code and portable-bundle security
  - portable versus backend-native component capability
  - content-addressed asset and bake identity
  - transactional agent mutation
  - empirical hosted rendering validation
- linked the alignment record into the active docs spine
