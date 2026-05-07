# Suggestions

This file tracks durable, high-impact follow-up improvements for VizEngine V2.

## Active Architectural Suggestions

- Extract a canonical project document schema before large runtime rewrites
  spread implicit scene state further across the app.
- Split editor state from runtime state before adding more features on top of
  the current Zustand-coupled rendering path.
- Turn the standalone node evaluator into the basis of the real runtime instead
  of letting node execution remain editor-owned.
- Define a render compatibility classification for components and nodes:
  `render-safe`, `bake-required`, `live-only`.
- Introduce first-class baking contracts for audio features, simulation caches,
  and checkpoints instead of ad hoc offline helpers.
- Design a stable AI action surface early so the engine does not become
  UI-driven by accident.
- Keep Remotion behind a renderer adapter boundary and avoid letting Remotion
  semantics leak into the source-of-truth scene model.
- Move toward a package structure that cleanly separates contracts, runtime,
  bake, editor, and render adapters.
- Plan the V1 purge deliberately so the rewrite does not stall in an indefinite
  half-migrated state with duplicate folders and dead runtime paths.
