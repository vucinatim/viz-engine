# Phase 13: VizSession Runtime Preview Ownership

## Goal

Make `VizSession` the authoritative owner of runtime preview and inspection
state while keeping browser-only objects outside it.

This is an ownership cutover under the preserved editor. It is not a visual
redesign or a claim that every V1 component already renders through the package
runtime.

## Resulting Ownership

### VizSession

`VizSession.preview` owns:

- canonical transport state
- the shared live/export runtime-preview frame contract
- last requested frame
- last completed frame
- render-cycle count
- last rendered layer ids
- runtime-backed layer ids
- the last preview failure

Live editor frames, image-export frames, and video-export frames all dispatch
through:

```text
vizSessionActions.preview.renderRuntimePreviewFrame(frame)
```

The local editor control surface reads the same session inspection state
through:

```text
vizSessionActions.preview.inspectRuntimePreview()
```

### Browser attachment registry

`editor-runtime-preview-attachment-store.ts` owns only:

- registered imperative layer render callbacks
- mirror-canvas references
- the Remotion player ref
- pruning of browser attachments for removed layers

It does not contain:

- projected scene layers
- transport state
- requested/completed frames
- render-cycle state
- runtime-backed layer ids
- runtime failures

The Remotion player ref moved out of `VizSession` because it is a browser host
object, not portable session truth.

### Compatibility layer projection

The preserved editor and legacy render attachments still need instantiated
`Comp`, configuration, and local component-state objects.

Those values remain in `editor-layer-projection-store.ts` as a non-canonical
projection over `VizProjectDocument`. `Renderer` may use that projection to
mount the required browser attachments, but project and preview meaning remain
owned by `VizSession`.

## Removed Surfaces

The cutover deletes:

- `editor-runtime-preview-store.ts`
- `editor-runtime-preview-controller.ts`
- `editor-runtime-preview-frame.ts`

Their useful responsibilities moved directly to either:

- `VizSession`, for frame dispatch and inspection
- the browser attachment registry, for host objects and callbacks

This avoids preserving a facade whose only purpose would be to forward between
the actual owners.

## Remaining Necessary Runtime Bridge

`editor-runtime-preview-runtime-bridge.ts` remains deliberately.

It currently adapts the preserved `Curve Spectrum` editor projection into the
package runtime/render-plan path. The remaining V1 components still need their
historical `draw` / `draw3D` attachments for parity.

The bridge is deleted when every supported editor component has a direct
package-runtime implementation. Deleting it earlier would either remove
features or move scene interpretation back into React/browser code.

## Realtime Performance Rule

Runtime preview dispatch publishes one session inspection update per completed
or failed synchronous frame.

It does not publish a separate transient “rendering” update because that state
cannot be observed meaningfully during a synchronous render and would double
external-store notifications at playback cadence.

React continues to subscribe to narrow transport/project slices. The imperative
preview driver and attachment callbacks perform frame work without depending on
React rerenders.

## Validation

Focused coverage proves:

- completed frames update authoritative session inspection
- failed frames are recorded without being claimed as completed
- resetting session inspection does not delete mounted browser attachments
- the attachment store contains no scene or inspection fields
- project synchronization prunes layer-scoped attachments
- the Remotion player ref remains outside `VizSession`
- the local editor control surface reads session-owned inspection
- the package-runtime `Curve Spectrum` bridge still produces a valid render
  plan

The completion run passed:

- full `pnpm check:foundation`
- 30 foundation test files / 86 tests
- package and studio type checks
- production studio build
- built-package consumer smoke
- agent creative-loop bundle roundtrip
- browser verification in the preserved real editor
- no browser warnings or errors in the verified workflow
