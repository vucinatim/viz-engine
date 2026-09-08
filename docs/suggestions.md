# Suggestions

This file tracks durable, high-impact follow-up improvements that are not
already requirements of the active goal.

## Documentation And Operating System

- If unattended decision capture ever needs stronger identity than the current
  explicit user-authority contract, add a Codex-app-signed or UI-issued human
  decision receipt. Do not pretend a CLI provenance string is cryptographic
  human attestation.
- Define retention and garbage collection for Git-common immutable evidence,
  recovered mutex owners, transaction journals, and lease archives after real
  multi-week volume exists. Retention must preserve every object reachable from
  active or completed program state.
- Reject unknown maintainer-CLI flags once the command surface stabilizes so a
  typo cannot silently degrade an intended operation.
- Separate non-creating operational path resolution from initialization if
  read-only tooling later needs a strict zero-filesystem-side-effect contract.
- Add a lightweight documentation validator if status drift recurs. It should
  check local links, require `docs/current-state.md` to name the only active
  goal, and reject completed plans presented as active entrypoints without
  turning historical prose into a rigid schema.
- Consider adding a generated chronological index over `docs/work-ledger.md`
  rather than rewriting or reordering historical evidence. Recovery should
  continue to use current state and the active goal, not ledger order.

## Runtime And Rendering

- Add a native browser-free clip/video executor behind the existing render-job
  contract when deployment requirements justify it. Reuse the request, output,
  probe, cancellation, identity, and feedback semantics.
- Move cooperative browser audio analysis into a worker attachment if
  production-length measurements show main-thread contention.
- Restore the editor debug toggle through renderer-owned diagnostic overlays
  for grids, axes, lights, resources, and programs.
- Define explicit `render-safe`, `bake-required`, and `live-only`
  compatibility classifications for components and nodes.
- Extend the isolated-layer Three compositor into masks and a pass/effect graph
  only through explicit layer/resource ownership; do not implement effects as
  primitive-level exceptions.
- Keep Remotion behind the renderer-adapter boundary.
- Treat the FFmpeg WASM core as a large lazy production asset with immutable
  caching and deployment compression.
- Replace paced synchronous layer-mirror capture only when a browser/GPU-native
  path can prove exact isolated-layer snapshots under rapid switching. An
  unfenced `createImageBitmap` attempt could publish stale layer content and
  was correctly rejected.

## Determinism And Baking

- Define explicit phase-authoring inputs for motion-capable components before
  permitting graph-driven variable rates. The core deterministic `integrate`
  node now provides rate-to-phase computation; absolute-time `speed` settings
  must stay stable until components can consume phase directly.
- Add artifact-backed checkpoints when simulations or dense event-heavy
  programs outgrow fixed-step replay.
- Keep temporal replay direct and inspectable until measurements justify
  checkpoint acceleration.
- Move bounded event histories such as Neural Network signal waves into
  explicit bake/checkpoint artifacts if future productions require dense
  long-lived triggering.
- Compact Morph Shapes' response history into fixed-size temporal state or an
  artifact if production measurements show checkpoint payload growth on long,
  densely modulated timelines. Keep the current inspectable history until that
  workload exists; checkpoint count is already bounded.

## Assets And 3D

- Add explicit horizontal root-motion extraction and locomotion-placement
  policy when non-in-place clips enter the model pipeline. Preserve authored
  vertical rig transforms; never normalize an arbitrary skeleton root to fix
  placement.
- Introduce a shared material-resolver contract when server/render-time asset
  materialization becomes real; keep browser preview hydration explicit until
  then.
- Produce content-pinned prepared GLB derivatives and compare them against the
  current FBX reference before changing the production Stage path.
- Add an offline model-preparation command for material normalization,
  supported texture maps, bounded skin weights, validation, and deterministic
  derivative identity.
- Add an explicit project-scoped or bounded-LRU policy to the renderer model
  cache if real sessions begin cycling through many distinct external models.
  The warmed bundled Stage set is stable and releases every active lease, so do
  not add eviction complexity until that broader workload exists.
- Expose the proven substrate through a generic `Model3D` product surface with
  hierarchy, clip, material, and morph inspection. Keep character, facial, and
  retargeting semantics in their specialized layer.

## Editor And Agent Workflow

- Preserve the established editor UX as the product reference while replacing
  hidden architecture.
- If per-graph compute timing is restored in the profiler, emit it from the
  canonical runtime evaluator or inspection contract. Do not recreate an
  editor-only metric sink with no runtime producer.
- Keep the shared project action surface pure across editor, CLI, live control,
  and future agent tooling.
- Keep `@viz-engine/editor-control` small and durable; add operations only for
  stable editor/runtime concepts.
- If future third-party capability development needs runtime plugin discovery,
  design a trusted manifest/loading boundary. The current first-party loop uses
  explicit workspace registration, Vite HMR, live capability inspection, and
  portable bundle open; do not add arbitrary runtime code loading only to avoid
  an intentional install/restart boundary for new packages.
- Keep browser media-element ownership outside pure session packages.
- Keep transport controls mechanically simple and explicitly controlled on the
  critical live-loop path.

## Portability And Operations

- Grow directory bundles into an archive import/export surface with explicit
  policies for large or externally owned media.
- Keep host integrations on portable runtime/control contracts rather than
  introducing host-specific packages without a reusable boundary.
- Extend performance capture into a fixed-device headless browser command for
  comparable frame pacing, interactions, memory, and long-session stability.
- Keep golden fixtures small, canonical, and tied to meaningful behavior.
- Keep initial studio loading intentionally chunked with lazy heavy surfaces
  and a small explicit vendor split.

## Cleanup Candidates

- Stop deriving component presentation labels by parsing layer or parameter
  IDs. Carry explicit layer/component metadata into diagnostics and reports
  when that surface is next revised; IDs should remain opaque identity.
- Continue removing editor-era convenience accessors that encourage treating
  projection or attachment stores as canonical truth.
- Move additional low-level browser/runtime attachments behind the existing
  attachment seam when doing so reduces coupling without adding indirection.
- Prefer deletion of superseded adapter code immediately after its final
  preserved-editor caller moves to a canonical subscription or action.

## Render artifact lifecycle and codec maintenance

- Successful browser job history retains output Blob URLs. Define an explicit
  artifact retention/release operation with truthful availability metadata,
  cancellation-safe ownership transfer and UI/control consumers before adding
  long unattended export batches. Rejected executor handoffs now release their
  outputs; this does not define a retention policy for successful artifacts.
- Maintain the pinned codec/muxer changes in `patches/README.md` until equivalent
  upstream APIs pass the independent timing and failure tests. Native AAC needs
  trustworthy priming provenance before replacing the current AAC worker.
- Move eligible render/media orchestration off the main thread after RH-03
  measures contention; preserve the same host and explicit transfer lifetimes.
  Nonfragmented MP4 packet-table storage and per-frame diagnostics need an
  explicit large-duration policy if those measured costs become material.
