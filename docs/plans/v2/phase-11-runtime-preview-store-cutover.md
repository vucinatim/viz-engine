# Phase 11: Runtime Preview Store Cutover

## Goal

Take the first real rendering-ownership step inside the preserved editor:

- keep the existing editor face intact
- stop treating the general layer projection store as the live preview owner
- give the runtime-facing preview path its own dedicated store for:
  - preview layers
  - preview render callbacks
  - preview mirror-canvas attachments

This is not the final runtime-driven editor rendering end state yet, but it is
the first clean separation between:

- editor/UI-facing layer projection
- live preview/browser-render attachment ownership

## What Changed

### Shared layer projection contract

The editor now has an explicit shared layer projection type in:

- [src/lib/editor-layer-types.ts](../../../src/lib/editor-layer-types.ts)

That keeps the runtime-preview store from depending on the old layer store for
type ownership.

### Dedicated runtime preview store

The live preview path now has its own dedicated store in:

- [src/lib/stores/editor-runtime-preview-store.ts](../../../src/lib/stores/editor-runtime-preview-store.ts)

It owns:

- preview-layer projections
- registered render functions
- mirror-canvas attachment state
- preview-layer pruning when layers are removed

### Canonical project sync now feeds two surfaces

Canonical working-project sync in:

- [src/lib/stores/editor-project-store.ts](../../../src/lib/stores/editor-project-store.ts)

now updates:

1. the UI-facing projected layer store
2. the runtime-facing preview store

That means the preserved editor can keep its old UI surface while the live
preview stops depending on the same store for browser rendering ownership.

### Live renderer and export moved off the general layer store

The real live preview now reads from:

- [src/components/editor/renderer.tsx](../../../src/components/editor/renderer.tsx)
- [src/components/editor/editor-runtime-preview-driver.tsx](../../../src/components/editor/editor-runtime-preview-driver.tsx)
- [src/components/editor/layer-renderer.tsx](../../../src/components/editor/layer-renderer.tsx)

through the runtime preview store instead of `layer-store`.

Export paths now do the same in:

- [src/components/editor/export-image-dialog.tsx](../../../src/components/editor/export-image-dialog.tsx)
- [src/lib/utils/export-orchestrator.ts](../../../src/lib/utils/export-orchestrator.ts)

Mirror canvases also moved to preview ownership in:

- [src/components/editor/layer-mirror-canvas.tsx](../../../src/components/editor/layer-mirror-canvas.tsx)

### Live render timing is now centralized

Before this follow-through, every `LayerRenderer` still owned its own
requestAnimationFrame loop and time stepping.

That has now been centralized into:

- [src/components/editor/editor-runtime-preview-driver.tsx](../../../src/components/editor/editor-runtime-preview-driver.tsx)

So the new split is:

- runtime preview store owns preview-layer registration and render callbacks
- one dedicated preview driver owns live timing/orchestration
- each `LayerRenderer` just sets up browser attachments and registers a render
  callback

### Live preview and export now share one explicit frame contract

The preview path now also has an explicit shared frame payload in:

- [src/lib/editor-runtime-preview-frame.ts](../../../src/lib/editor-runtime-preview-frame.ts)

That frame contract is now used by:

- [src/components/editor/editor-runtime-preview-driver.tsx](../../../src/components/editor/editor-runtime-preview-driver.tsx)
- [src/components/editor/export-image-dialog.tsx](../../../src/components/editor/export-image-dialog.tsx)
- [src/lib/utils/export-orchestrator.ts](../../../src/lib/utils/export-orchestrator.ts)
- [src/components/editor/layer-renderer.tsx](../../../src/components/editor/layer-renderer.tsx)

So the same explicit preview frame now drives:

- live editor playback
- single-frame image export
- multi-frame video export

### Preview path now has a canonical controller and snapshot

The preview seam is now also operable and inspectable through:

- [src/lib/editor-runtime-preview-controller.ts](../../../src/lib/editor-runtime-preview-controller.ts)

That controller now owns:

- preview-frame creation helpers
- preview-frame dispatch
- preview snapshot inspection

And the preview store now records:

- last requested frame
- last completed frame
- render cycle count

So the preview seam is no longer only an internal cleanup. It is now a real
control/inspection surface for:

- editor code
- future agent control
- future runtime preview diagnostics

### Browser render attachment ownership is now explicit too

The browser-side render attachment behavior now lives in:

- [src/lib/editor-runtime-preview-attachment.ts](../../../src/lib/editor-runtime-preview-attachment.ts)

That module now owns:

- 2D vs 3D render attachment setup
- internal canvas resolution updates
- debug-canvas sizing
- per-frame audio/config resolution for a layer render
- mirror-canvas fanout
- renderer/draw-call cleanup

That means [src/components/editor/layer-renderer.tsx](../../../src/components/editor/layer-renderer.tsx)
is now much closer to the right long-term role:

- host DOM refs
- register one preview render callback
- hand browser attachment work to an explicit preview-attachment seam

### First runtime-backed editor layer bridge is now real

The preserved editor preview now has its first actual runtime-backed layer
bridge in:

- [src/lib/editor-runtime-preview-runtime-bridge.ts](../../../src/lib/editor-runtime-preview-runtime-bridge.ts)

That bridge now translates supported editor layers into one-layer
`VizProjectDocument` previews and renders them through the package runtime plus
the package `Three` preview controller.

The first bridged layer is:

- `Curve Spectrum`

That required a real runtime component port in:

- [packages/viz-components-core/src/curve-spectrum.ts](../../../packages/viz-components-core/src/curve-spectrum.ts)

So for supported layers, the live editor preview is no longer deriving scene
meaning from local `draw` / `draw3D` callbacks at all. It now derives scene
meaning from:

1. editor layer state -> runtime bridge
2. runtime session -> render plan
3. package `Three` preview controller -> browser canvas

The preview snapshot now also exposes which visible layers are runtime-backed
through:

- `runtimeBackedLayerIds`

## Why This Matters

Before this slice:

- canonical project truth existed
- canonical preview truth existed
- but the actual live rendering path still depended on the same general
  projection store the rest of the editor used

After this slice:

- the editor still configures the same visible preview
- but preview/browser-render attachment ownership now has its own explicit seam
- export and live preview now speak the same preview-store contract
- `layer-store` is more honestly a UI projection store, not the live renderer
  owner
- per-layer live render loops are gone from `LayerRenderer`
- the editor now has one explicit live preview driver instead of many hidden
  layer-level loops
- live preview and export also share one explicit preview-frame payload instead
  of passing raw time/dt loosely
- preview rendering is now dispatched through one canonical controller and
  leaves behind an inspectable preview snapshot

This is the first meaningful step toward:

- editor configures
- runtime/preview path renders

## Validation

Focused validation:

- [tests/foundation/editor-runtime-preview-store.test.ts](../../../tests/foundation/editor-runtime-preview-store.test.ts)
- [tests/foundation/editor-project-store.test.ts](../../../tests/foundation/editor-project-store.test.ts)
- [tests/foundation/editor-app-control.test.ts](../../../tests/foundation/editor-app-control.test.ts)

Full validation:

- `pnpm check:foundation`

Browser/agent validation:

- loaded the real editor at `http://localhost:4173/?allowSmallViewport=1`
- dismissed the onboarding dialog
- clicked the real transport button
- verified visible timecode advanced from `00:00.00` to `00:01.76`
- attached the real local editor control surface to `window.__vizEditorDebug`
  in dev-only mode for truthful browser-side inspection of the mounted editor
- used that real running control surface to add a `Curve Spectrum` layer and
  confirmed the live preview snapshot changed to:
  - `layerCount: 1`
  - non-empty `runtimeBackedLayerIds`

## Remaining Gap After This Slice

The editor is still not yet fully package-runtime-rendered.

What is true now:

- rendering ownership is cleaner
- preview/browser attachment ownership is explicit
- export and live preview share the same dedicated preview seam

What still remains:

- move more render semantics out of editor-specific draw paths
- bridge the preserved live renderer more directly onto the package runtime
  preview model
- keep the preserved UI intact while continuing to reduce editor-owned render
  meaning
