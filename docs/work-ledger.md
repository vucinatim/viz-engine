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
