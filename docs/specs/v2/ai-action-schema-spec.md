# V2 AI Action Schema Spec

## Purpose

This document defines the first explicit machine-facing action model for
VizEngine V2.

The action schema exists so:

- AI can control the system directly
- the editor can use the same core mutation model
- future API or MCP surfaces can wrap stable operations

## Core Rule

The primary AI contract is not UI events.

The primary AI contract is explicit actions over:

- project documents
- assets
- graphs
- baked artifacts
- runtime preview/render requests

## Action Envelope

Preferred conceptual envelope:

```ts
type VizActionEnvelope = {
  id: string;
  type: string;
  timestamp: string;
  actor: VizActionActor;
  payload: Record<string, unknown>;
};
```

## Actor Model

Preferred early actor values:

```ts
type VizActionActor =
  | { kind: "user"; id?: string }
  | { kind: "agent"; id?: string }
  | { kind: "system"; id?: string };
```

## Action Families

The first action families should be:

- project
- asset
- layer
- graph
- bake
- preview
- render

## Project Actions

Examples:

```ts
type CreateProjectAction = {
  type: "project.create";
  payload: {
    title: string;
    settings: Partial<VizProjectSettings>;
  };
};
```

```ts
type UpdateProjectSettingsAction = {
  type: "project.settings.update";
  payload: {
    patch: Partial<VizProjectSettings>;
  };
};
```

## Asset Actions

Examples:

```ts
type AssetAttachAction = {
  type: "asset.attach";
  payload: {
    asset: VizAssetRef;
  };
};
```

```ts
type AssetReplaceAction = {
  type: "asset.replace";
  payload: {
    assetId: string;
    asset: VizAssetRef;
  };
};
```

## Layer Actions

Examples:

```ts
type LayerCreateAction = {
  type: "layer.create";
  payload: {
    layerId?: string;
    componentId: string;
    index?: number;
    initialConfig?: Record<string, unknown>;
  };
};
```

```ts
type LayerConfigSetAction = {
  type: "layer.config.set";
  payload: {
    layerId: string;
    path: string;
    value: unknown;
  };
};
```

```ts
type LayerTimingSetAction = {
  type: "layer.timing.set";
  payload: {
    layerId: string;
    timing: VizTimingWindow | null;
  };
};
```

## Graph Actions

Examples:

```ts
type GraphCreateForParameterAction = {
  type: "graph.bind.create";
  payload: {
    layerId: string;
    targetPath: string;
    graphId?: string;
  };
};
```

```ts
type GraphNodeAddAction = {
  type: "graph.node.add";
  payload: {
    graphId: string;
    nodeId?: string;
    nodeType: string;
    position?: { x: number; y: number };
    initialInputs?: Record<string, unknown>;
  };
};
```

```ts
type GraphEdgeConnectAction = {
  type: "graph.edge.connect";
  payload: {
    graphId: string;
    sourceNodeId: string;
    sourceOutput: string;
    targetNodeId: string;
    targetInput: string;
  };
};
```

## Bake Actions

Examples:

```ts
type BakeAudioFeaturesAction = {
  type: "bake.audio-features";
  payload: {
    assetId: string;
    fps?: number;
    featureSet?: string[];
  };
};
```

```ts
type BakeSimulationCheckpointsAction = {
  type: "bake.simulation-checkpoints";
  payload: {
    layerId: string;
    intervalFrames: number;
  };
};
```

## Preview Actions

Examples:

```ts
type PreviewRenderFrameAction = {
  type: "preview.frame.render";
  payload: {
    frame: number;
    width?: number;
    height?: number;
  };
};
```

```ts
type PreviewPlayAction = {
  type: "preview.play";
  payload: {
    fromFrame?: number;
  };
};
```

## Render Actions

Examples:

```ts
type RenderClipAction = {
  type: "render.clip";
  payload: {
    startFrame?: number;
    durationFrames?: number;
    output: VizRenderOutputSpec;
  };
};
```

## Action Processing

Preferred conceptual behavior:

- actions are validated
- actions are reduced into project/document changes or runtime requests
- results are returned as structured outputs

This suggests two important internal layers:

- action validation
- action reducers/executors

## Result Model

Preferred conceptual result:

```ts
type VizActionResult = {
  actionId: string;
  ok: boolean;
  patches?: unknown[];
  warnings?: string[];
  errors?: string[];
  artifacts?: string[];
  preview?: unknown;
};
```

## Why This Matters

This gives us:

- AI-native operation
- a single mutation language
- testable behavior
- future remote control surfaces

## Editor Relationship

The editor should increasingly call the same action layer for meaningful scene
mutations instead of mutating local state through one-off UI code paths.

That does not mean every hover interaction becomes an action.

It means:

- meaningful scene changes should converge on the same mutation surface

## No Legacy Rule

Do not model V2 actions around the current V1 Zustand mutation shape.
