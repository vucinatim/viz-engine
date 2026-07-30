# V2 AI Action Schema Spec

## Scope Clarification

This document introduced the first conceptual machine-facing action families.
The durable architecture now distinguishes:

- project transactions for canonical document mutations
- session commands for ephemeral preview and transport state
- jobs for bake, preparation, render, and export work
- inspections and events for read-only observation

The project-action examples below remain useful where they mutate the project.
The earlier grouping of bake, preview, and render as action families must not be
implemented as if all operations were document mutations.

See
[Agent-Authored Production Loop Architecture](./agent-authored-production-loop-architecture.md)
for the canonical operation and live/headless session model.

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

Implemented committed-action envelope:

```ts
type VizActionEnvelope = {
  id: string;
  transactionId: string;
  type: string;
  timestamp: string;
  actor: VizActionActor;
  payload: Record<string, unknown>;
};
```

Attribution is assigned by the trusted host/control. A transport client cannot
impersonate an actor by including arbitrary actor data.

## Project Transaction

The canonical mutation unit is implemented as:

```ts
type VizProjectTransaction = {
  id?: string;
  expectedRevision?: number;
  dryRun?: boolean;
  actions: VizProjectAction[];
};

type VizProjectTransactionStatus =
  | "applied"
  | "dry-run"
  | "conflict"
  | "rejected";
```

Rules:

- actions are evaluated against one candidate project
- the complete candidate is validated before commit
- a successful transaction increments revision once and creates one undo step
- every committed action envelope shares transaction id, timestamp, and actor
- a stale `expectedRevision` returns expected and actual revisions without
  evaluating or mutating
- dry run returns validation/candidate diagnostics without changing project,
  revision, history, or subscriptions
- empty, malformed, duplicate-id, action-error, or invalid-project
  transactions are rejected atomically

The in-process result retains the project/candidate for trusted callers. The
live protocol deliberately returns a lean portable result with status,
revisions, attribution, conflict, diagnostics, envelopes, and a compact
snapshot; clients can call `project.inspect` when they need the document.

## Implemented Live Protocol

Protocol version 1 currently exposes:

- `control.discover`
- `control.snapshot`
- `project.inspect`
- `component.inspect`
- `graph.inspect`
- `transaction.apply`
- `history.undo`
- `history.redo`
- `preview.play`
- `preview.pause`
- `preview.seek`

All request shapes and nested project actions are decoded authoritatively with
strict schemas in the mounted browser control. Unknown fields and malformed
nested values are rejected rather than cast into trusted TypeScript types.

The local adapter is development-only:

- discovery: `GET /__viz-control__/discovery`
- request/response: `POST /__viz-control__/request`
- events: `GET /__viz-control__/events`

The transport owns routing, limits, heartbeat, and timeouts. It never owns a
project or session.

## Actor Model

Preferred early actor values:

```ts
type VizActionActor =
  | { kind: "user"; id?: string }
  | { kind: "agent"; id?: string }
  | { kind: "system"; id?: string };
```

## Conceptual Action Families

The longer-term families remain:

- project
- asset
- layer
- graph
- bake jobs
- preview commands
- render jobs

Bake, preview, and render must not be forced into document-mutation actions.
They use jobs or ephemeral session commands.

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
