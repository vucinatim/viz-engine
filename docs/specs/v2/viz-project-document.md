# Viz Project Document Spec

## Purpose

`VizProjectDocument` is the canonical source-of-truth scene format for
VizEngine V2.

It must be sufficient to drive:

- live preview
- deterministic render
- bake workflows
- AI-driven editing
- Magnify integration

## Core Rule

The project document is the scene truth.

The editor is not the scene truth.

The runtime is not the scene truth.

Remotion is not the scene truth.

## Shape

The document should be versioned and explicit.

Canonical package shape:

```ts
type VizProjectDocument = {
  schemaVersion: '2.0.0-alpha.1';
  projectId: string;
  name: string;
  timeline: VizTimeline;
  viewport: VizViewport;
  layerOrder: string[];
  layers: VizLayer[];
  assetRefs?: VizAssetRef[];
  artifactRefs?: VizArtifactRef[];
  graphs?: VizNodeGraphDocument[];
  metadata?: Record<string, unknown>;
};
```

The executable definition lives in:

- `packages/viz-contracts/src/project.ts`
- `packages/viz-contracts/src/graphs.ts`

The spec and package contract must not be allowed to drift.

## Timeline And Viewport

Stable scene-level timing and viewport concerns belong in:

- `timeline`
  - fps
  - duration in frames
  - optional sample rate
- `viewport`
  - width
  - height
  - optional background color

Transient playback position and editor resolution preferences do not belong in
the document.

## Assets

Assets should be explicit references, not ad hoc URLs buried inside component
config.

Preferred categories:

- audio
- image
- video
- model
- shader
- text
- timed_text

Each asset should support stable ids and transportable references.

## Baked Artifacts

Feature timelines, simulation caches, and other reusable computational support
data are baked artifacts rather than source or derived displayable assets.
This keeps asset materialization separate from deterministic precomputation.

Baked artifacts should be first-class references, not implied cache files.

Examples:

- audio feature timeline
- beat/onset data
- section map
- simulation checkpoints
- particle cache

## Layers

Layers are the ordered scene assembly model.

Each layer should include:

- stable id
- component id
- z-index or ordering
- enabled flag
- timing window
- config values
- node graph attachment refs
- local metadata

Canonical shape:

```ts
type VizLayer = {
  id: string;
  name: string;
  componentId: string;
  enabled: boolean;
  opacity: number;
  blendMode: VizBlendMode;
  rendererFamily?: VizRendererFamily;
  transform?: VizLayerTransform;
  surface?: {
    backgroundColor?: string;
    freezeWhenPaused?: boolean;
  };
  settings?: Record<string, unknown>;
  inputs?: Record<string, VizValueSource>;
  graphId?: string;
  requiredAssetIds?: string[];
  requiredArtifactIds?: string[];
  renderPolicy?: VizLayerRenderPolicy;
  metadata?: Record<string, unknown>;
};
```

`settings` contains component configuration. Compositing and preview-surface
concerns have explicit fields so they cannot collide with component config.

## Node Graph Bindings

Node graphs should not be implied by editor state.

They should be explicit scene content.

V2 should start with embedded graph documents.

The practical early model is:

- graph-level external inputs using stable `VizValueSource` bindings
- node-level input bindings using:
  - literal values
  - graph-input bindings
  - upstream node-output bindings
- named graph outputs that layers can consume through `graph-output`

That keeps the canonical document explicit without inventing a second hidden
graph representation owned by the editor.

The preserved V1 node editor currently needs executable `NodeNetwork`
projections because it was built around callable node definitions and XYFlow
objects. Those projections are adapters only:

- their serializable truth is reconstructed from `project.graphs`
- all graph edits are written back into `project.graphs`
- they are not persisted separately
- package-native graphs the V1 node UI cannot project remain preserved in the
  canonical document

## Editor State Exclusion Rule

Do not put these in the project document:

- panel open state
- inspector layout state
- local window state
- selection state
- hover state
- temporary in-progress drag/drop UI state

That belongs in editor state only.

In the current studio this includes per-layer expansion and debug-toggle state.
Those values are persisted in the `.vizengine.json` editor envelope, outside
the canonical `project` value.

## Runtime State Exclusion Rule

Do not put volatile runtime state directly in the project document:

- live simulation buffers
- last evaluated node outputs
- transient playback cursors
- GPU objects

Those belong in runtime state or baked artifacts.

## AI Mutation Requirement

The document must be structured so an AI can mutate it through stable actions:

- create layer
- remove layer
- set parameter
- attach graph
- swap asset
- set timing
- add baked artifact ref

That means ids and parameter paths must be explicit and stable.

## No Legacy Rule

Do not design the document around V1 persistence format compatibility.

If a one-time importer is needed, it should be external to the V2 canonical
contract.

The current studio intentionally does not maintain a runtime compatibility
layer for the former `{ layers: EditorProjectLayer[] }` document. Bundled
projects were migrated in place to `VizProjectDocument`.

## Current Enforcement

The active studio now enforces this boundary:

- `VizSession.project.sourceProject` and `workingProject` are typed as
  `VizProjectDocument`
- project imports are validated by the package runtime validator
- graphs are embedded in `workingProject.graphs`
- project history snapshots the complete canonical document
- `.vizengine.json` stores one canonical `project`; graph and editor UI state
  are no longer competing top-level scene payloads
- the runtime-preview bridge starts from the canonical working document rather
  than constructing scene truth from `LayerData`
