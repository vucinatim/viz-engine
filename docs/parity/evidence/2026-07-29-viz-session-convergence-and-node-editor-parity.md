# VizSession Convergence And Node-Editor Parity Evidence

Date: 2026-07-29  
Branch: `codex/viz-engine-v2`

## Automated Evidence

- all package, studio, and tool TypeScript checks passed
- the full foundation test suite passed: 36 test files / 148 tests
- canonical action tests cover graph replace/remove, timeline mutation, and
  detached graph references
- editor-session tests cover action history, undo/redo, and continuous gesture
  coalescing
- graph evaluation tests inspect per-node resolved inputs and outputs
- runtime preview tests cover graph results, layer snapshots, assets, issues,
  reset, and failure behavior
- local editor-control tests cover project/resource inspection, graph runtime
  inspection, node results, and canonical undo/redo
- the production package and studio builds, built consumer smoke, creative-loop
  bundle roundtrip, and parity-matrix validation pass through
  `pnpm check:foundation`

## Runtime Benchmark

`pnpm benchmark:runtime-preview` evaluated 300 frames with 15 components after
30 warmup frames at 1280×720:

- canonical mean: 0.329 ms
- canonical median: 0.283 ms
- canonical p95: 0.687 ms
- canonical max: 1.073 ms
- former per-layer/callback-shaped mean: 0.480 ms
- former-to-canonical mean ratio: 1.457

This benchmark covers plan evaluation. Browser rendering was inspected
separately.

## Browser Evidence

The preserved editor was exercised at 1280×720:

1. Added the real Stage Scene and confirmed the model-backed DJ/crowd scene,
   lighting, walls, lasers, and controls render.
2. Added Debug Animation and enabled its Value graph.
3. Found and corrected a React Flow parity regression: canonical
   roundtripping had discarded transient node measurements, leaving nodes
   hidden.
4. Verified input and output nodes become visible after canvas-local
   measurement ownership was restored.
5. Applied the Sine Oscillator preset and observed three visible nodes and
   their edges.
6. Started playback and observed runtime-backed node and layer live values
   change.
7. Undid the preset to two nodes and redid it to three nodes through the normal
   Edit menu.
8. Reloaded the page and recovered both layers plus the complete three-node
   canonical graph.
9. Applied 25 sequential graph input edits; all three nodes remained visible
   and the final value remained canonical.
10. Opened the video export dialog and verified resolution, FPS, quality,
    format, range, duration, estimate, cancel, and start controls.

No application, React, shader, or runtime errors were observed. The Stage FBX
assets emit warnings for unsupported legacy material map fields and vertices
with more than four skin weights. Those warnings are non-fatal and remain
visible asset-pipeline debt rather than hidden runtime failures.

## Acceptance

The convergence preserves the established editor layout and workflows while
removing duplicate project, graph-execution, live-value, layer-projection, and
history ownership. Node graphs, live values, undo/redo, persistence, Stage
models, playback, and export configuration remain operational over the V2
contracts.
