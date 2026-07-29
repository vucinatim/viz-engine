# Phase 12: Canonical VizProjectDocument Cutover

## Goal

Make the package-level `VizProjectDocument` the only scene/project document
used by the real editor and app-local `VizSession`.

This phase changes hidden ownership only. The preserved editor shell, layer
workflow, node workflow, transport, audio posture, and preview behavior remain
the product contract.

## Completed Cutover

### One project document

`VizSession` now stores:

- `sourceProject: VizProjectDocument | null`
- `workingProject: VizProjectDocument`

The competing app-local types were deleted:

- `EditorProjectDocument`
- `EditorProjectLayer`

Layer order, component settings, compositor settings, graph bindings, embedded
graphs, timeline, viewport, assets, and artifact references now have one
portable document owner.

### Editor-only state is outside the document

These values moved to `editor-store`:

- layer expanded/collapsed state
- layer debug-toggle state

They remain persistable editor preferences but are not scene semantics.

### Graph truth is embedded

V1 node-editor networks are now projected from and written back to
`workingProject.graphs`.

The canonical graph representation stores:

- stable graph and node ids
- enabled state
- node types
- literal and upstream-output input bindings
- named graph outputs
- editor position metadata needed to preserve the node-canvas layout

The former independently persisted graph payload was removed. Project history
now snapshots the complete `VizProjectDocument`, including graphs, so graph
enablement no longer needs a parallel history map.

Package-native graphs that the preserved V1 node UI cannot execute are retained
unchanged in the project document when editor-compatible graphs are edited.

### Persistence speaks the canonical contract

`.vizengine.json` now contains:

- `version`
- one canonical `project: VizProjectDocument`
- `nodeEditorUi`
- `editorUi`

It no longer contains a sibling scene-level `graphs` payload.

All bundled projects under `public/projects` were migrated to the same shape
and are validated with the package runtime validator in foundation tests.

### Preview starts from canonical truth

The first package-runtime preview bridge now selects its source layer from
`VizSession.project.workingProject`.

It may overlay frame-local evaluated config and live audio inputs for browser
preview, but it no longer invents a separate one-layer scene from
`LayerData`.

## Adapter Classification

The following adapters remain intentionally and are not canonical owners:

| Surface | Classification | Why it remains | Deletion condition |
| --- | --- | --- | --- |
| `editor-project-store.ts` | React binding over `VizSession.project` | Preserves narrow Zustand-style subscriptions while the real editor is rewired | Delete or rename when all consumers use session selectors directly |
| `editor-graph-store.ts` | Executable V1 node-editor projection binding | The preserved node canvas still needs callable V1 definitions and XYFlow objects | Delete when the node editor consumes `VizNodeGraphDocument` plus an explicit execution registry directly |
| `editor-preview-store.ts` | React binding over `VizSession.preview` | Prevents transport cadence from broad React rerenders | Delete only if direct session selectors provide the same update isolation |
| `editor-audio-session-store.ts` | React binding over `VizSession.audio` | Preserves selective audio UI subscriptions | Delete only after audio UI binds directly without widening rerenders |
| `editor-layer-projection-store.ts` | V1 UI component/config projection | The preserved layer panels still require instantiated `Comp` and `VConfig` objects | Delete when layer UI consumes canonical metadata/config schemas directly |
| `editor-runtime-preview-attachment-store.ts` | Browser attachment registry | Owns callbacks, mirror canvases, and the Remotion player ref; it contains no scene or inspection state | Retain while the browser host needs imperative attachments |
| `editor-runtime-preview-attachment.ts` | Browser host attachment | DOM, Canvas, WebGL, and resize ownership correctly stay outside the document | Retain as an attachment, but continue removing scene meaning from it |
| `editor-runtime-preview-runtime-bridge.ts` | Temporary component-render migration bridge | Preserves V1 rendering while components move onto package runtime implementations | Delete when all supported editor layers render through the canonical runtime path |

## Deleted Or Reclassified

- deleted `layer-values-store.ts`; parameter controls now subscribe directly to
  canonical layer `settings`
- renamed `layer-store.ts` to `editor-layer-projection-store.ts` so its
  non-canonical role is explicit
- removed graph serialization from `node-network-store`; it now persists UI
  state only
- removed CommonJS profiler lookups and added an explicit browser-safe
  node-network metric sink
- changed the session persistence key to the canonical schema version so an
  obsolete editor-shaped persisted document cannot be mistaken for V2 truth
- moved runtime preview inspection into `VizSession` and replaced the former
  mixed runtime-preview store with a browser-only attachment registry

## Contract Improvements Needed For Parity

The package contract now includes:

- the complete CSS blend-mode set exposed by the preserved V1 editor
- explicit layer surface background/freeze settings
- graph enabled state
- optional stable edge ids on node-output bindings

These are product semantics required by the established editor, not
compatibility baggage.

## Validation

The phase is covered by:

- canonical project/session tests
- graph projection and package-native graph preservation tests
- canonical persistence round-trip tests
- bundled project validation
- history tests over complete `VizProjectDocument` snapshots
- runtime-preview bridge tests starting from canonical session truth
- full `pnpm check:foundation`
- browser parity verification in the real Vite editor

The completion run passed all foundation checks, including 29 test files / 82
tests, the production studio build, built-package consumer smoke, and the agent
creative-loop bundle roundtrip. The browser run loaded the canonicalized
`simple-example`, exercised playback and Rhythm Lab, confirmed the executable
React Flow projection, and reported no warnings or errors.

## Remaining Architecture Work

This phase removes the competing document model. It does not claim the entire
runtime/editor rewrite is complete.

Still required:

- port the remaining historical `draw` / `draw3D` components to package
  runtime implementations
- replace the executable V1 graph projection with direct canonical graph
  editor/runtime integration
- automate the current manual V1/V2 browser parity smoke
- establish measured performance parity against the pinned V1 baseline
