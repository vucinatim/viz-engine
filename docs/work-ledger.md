# Work Ledger

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
  and combined `check:v2` verification
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
  - `pnpm check:v2`
  - `pnpm viz:example:svg`
- added `docs/plans/v2/package-consumer-readiness-proof-plan.md` to define the
  next slice: proving that Viz V2 packages work as real external tarball
  dependencies instead of only inside the monorepo
- implemented the first package-consumer readiness proof:
  - trimmed V2 package tarballs to `dist`-first contents
  - added `tools/v2/package-consumer-smoke.mjs`
  - added `pnpm smoke:consumer:v2`
  - folded the consumer smoke into `pnpm check:v2`
  - fixed built package ESM imports to use explicit relative `.js` specifiers
  - proved that a temporary external consumer can install Viz tarballs and
    render the canonical example project without workspace alias help
- validated the external consumer seam:
  - `pnpm smoke:consumer:v2`
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
  - `pnpm check:v2`

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
  - root Next app typecheck/build now run inside `pnpm check:v2`
- added the first agent-native creative-loop proof in
  `tools/v2/agent-creative-loop-scenario.ts`, proving that the agent can open
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
  - `pnpm check:v2`
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
  - `pnpm test:v2`
  - `pnpm check:v2`
- added `docs/plans/v2/three-renderer-compositor-semantics-cleanup-plan.md`
  and implemented the first meaningful `Three` semantics cleanup:
  - inherited group opacity/blend propagation through the render tree
  - explicit stroke-only rect rendering as border meshes
  - stronger `Three` tests that assert material semantics instead of only
    scene-graph shape
- validated the `Three` semantics slice with:
  - `pnpm --filter @viz-engine/renderer-three lint`
  - `pnpm test:v2`
  - `pnpm check:v2`
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
  - added a checked-in `tests/v2/fixtures` golden set for frame-plan,
    render-plan, SVG, and exported bundle-manifest outputs
  - added `pnpm fixtures:v2:update` to regenerate those fixtures deliberately
  - added corruption-path tests covering invalid manifest metadata, missing
    files, orphan manifest entries, and missing manifest entries
  - hardened the local bundle loader so missing or malformed artifact payloads
    become explicit issues instead of crashing bundle loading
  - kept `pnpm check:v2` green with the stronger validation surface
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
  - kept `pnpm check:v2` green after the graph slice
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
  - kept `pnpm check:v2` green after the bundle roundtrip slice
- added `docs/plans/v2/explicit-three-layer-compositor-implementation-plan.md`
  and implemented the first explicit layer compositor step in the `Three`
  preview path:
  - added explicit isolated layer surfaces in the preview controller
  - moved layer opacity and blend ownership onto compositor surfaces
  - kept inner group/style opacity inside the layer content scene
  - expanded renderer tests to assert compositor-surface behavior directly
  - kept `pnpm check:v2` green after the compositor slice
- validated the local bundle slice with:
  - `pnpm test:v2`
  - `pnpm viz:bundle:validate`
  - `pnpm check:v2`
