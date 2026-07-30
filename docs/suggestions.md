# Suggestions

This file tracks durable, high-impact follow-up improvements that are not
already requirements of the active goal.

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

## Determinism And Baking

- Add artifact-backed checkpoints when simulations or dense event-heavy
  programs outgrow fixed-step replay.
- Keep temporal replay direct and inspectable until measurements justify
  checkpoint acceleration.
- Move bounded event histories such as Neural Network signal waves into
  explicit bake/checkpoint artifacts if future productions require dense
  long-lived triggering.

## Assets And 3D

- Introduce a shared material-resolver contract when server/render-time asset
  materialization becomes real; keep browser preview hydration explicit until
  then.
- Produce content-pinned prepared GLB derivatives and compare them against the
  current FBX reference before changing the production Stage path.
- Add an offline model-preparation command for material normalization,
  supported texture maps, bounded skin weights, validation, and deterministic
  derivative identity.
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
- Add a true live pick-up loop for newly authored or changed capability packs,
  so an agent can write a component and the user can inspect it with minimal
  friction.
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

- Continue removing editor-era convenience accessors that encourage treating
  projection or attachment stores as canonical truth.
- Move additional low-level browser/runtime attachments behind the existing
  attachment seam when doing so reduces coupling without adding indirection.
- Prefer deletion of superseded adapter code immediately after its final
  preserved-editor caller moves to a canonical subscription or action.
