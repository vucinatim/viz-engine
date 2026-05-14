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

Preferred top-level shape:

```ts
type VizProjectDocument = {
  schemaVersion: 1;
  kind: "viz.project.v1";
  projectId: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  settings: VizProjectSettings;
  assets: VizAssetRef[];
  bakedArtifacts: VizBakedArtifactRef[];
  layers: VizLayerDocument[];
  metadata?: Record<string, unknown>;
};
```

## Project Settings

Project settings should include only stable scene-level concerns:

- width
- height
- fps
- background
- audio source defaults
- preview defaults if needed
- render defaults if needed

Avoid mixing editor-only preferences into project settings.

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
- feature_timeline
- simulation_cache

Each asset should support stable ids and transportable references.

## Baked Artifacts

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

Preferred shape:

```ts
type VizLayerDocument = {
  id: string;
  componentId: string;
  enabled: boolean;
  timing?: VizTimingWindow;
  blend?: VizBlendSettings;
  config: Record<string, unknown>;
  graphBindings?: VizGraphBinding[];
  metadata?: Record<string, unknown>;
};
```

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

## Editor State Exclusion Rule

Do not put these in the project document:

- panel open state
- inspector layout state
- local window state
- selection state
- hover state
- temporary in-progress drag/drop UI state

That belongs in editor state only.

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
