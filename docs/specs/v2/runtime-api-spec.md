# V2 Runtime API Spec

## Purpose

This document defines the first concrete API direction for the VizEngine V2
runtime.

The runtime API should be:

- headless-capable
- deterministic in render mode
- usable by the editor
- usable by bake systems
- usable by render adapters such as Remotion

## Design Goals

The runtime API should make these operations straightforward:

- load a scene
- resolve assets and baked artifacts
- step simulation state
- evaluate node graphs
- render the current frame
- create and restore checkpoints
- serve live preview and deterministic render through the same semantics

## Main Runtime Object

Preferred conceptual shape:

```ts
interface VizRuntime {
  getSceneInfo(): VizSceneInfo;
  reset(): void;
  seek(frame: number): VizFrameResult;
  step(frameCount?: number): VizFrameResult;
  render(target: VizRenderTarget): Promise<void> | void;
  snapshot(): VizRuntimeSnapshot;
  restore(snapshot: VizRuntimeSnapshot): void;
  dispose(): void;
}
```

## Construction

Preferred conceptual factory:

```ts
function createVizRuntime(input: VizRuntimeCreateInput): VizRuntime;
```

Where:

```ts
type VizRuntimeCreateInput = {
  scene: VizProjectDocument;
  resolvedAssets: ResolvedVizAssetMap;
  resolvedBakedArtifacts: ResolvedVizBakedArtifactMap;
  mode: VizRuntimeMode;
  config: VizRuntimeConfig;
  adapters?: VizRuntimeAdapters;
};
```

## Scene Info

The runtime should expose cheap static scene info:

```ts
type VizSceneInfo = {
  width: number;
  height: number;
  fps: number;
  durationFrames?: number;
  layerCount: number;
  componentIds: string[];
};
```

## Modes

The runtime should support:

```ts
type VizRuntimeMode = "live" | "render" | "bake";
```

Mode should affect:

- timing policy
- optimization policy
- validation strictness
- adapter availability

Mode should not affect:

- scene semantics
- graph semantics
- component semantics

## Runtime Config

Preferred early runtime config:

```ts
type VizRuntimeConfig = {
  seed: string;
  previewScale?: number;
  strictDeterminism?: boolean;
  allowLiveFallbacks?: boolean;
  maxCheckpointHistory?: number;
};
```

## Seek And Step Semantics

We should make this explicit now.

### `step(frameCount?)`

`step()` advances from the current frame by a fixed number of frames.

Default:

- `step()` means one frame

### `seek(frame)`

`seek(frame)` should guarantee the runtime ends at the requested frame.

How it gets there may differ:

- direct reset plus replay
- checkpoint restore plus replay
- future optimized path

But the semantic contract is:

- after `seek(frame)`, the runtime state matches what deterministic sequential
  stepping would have produced for that frame

## Render Targets

The runtime should not be tied to a single rendering backend.

Preferred conceptual target families:

- `canvas-2d`
- `webgl`
- `offscreen-canvas`
- `image-buffer`
- future custom targets

Conceptual shape:

```ts
type VizRenderTarget =
  | { kind: "canvas-2d"; ctx: CanvasRenderingContext2D }
  | { kind: "webgl"; renderer: unknown }
  | { kind: "offscreen-canvas"; canvas: OffscreenCanvas }
  | { kind: "image-buffer"; buffer: Uint8ClampedArray; width: number; height: number };
```

The exact types can tighten later.

## Snapshots And Checkpoints

The runtime should distinguish:

- lightweight snapshot for editor/runtime state capture
- durable checkpoint artifact for reusable render access

Preferred conceptual split:

```ts
type VizRuntimeSnapshot = {
  frame: number;
  globalState: unknown;
  layerStates: Record<string, unknown>;
  nodeStates: Record<string, unknown>;
};
```

Snapshots are in-memory runtime constructs.

Durable checkpoint artifacts belong to the bake system.

## Validation

The runtime should expose explicit validation.

Preferred conceptual API:

```ts
function validateVizSceneForMode(
  scene: VizProjectDocument,
  mode: VizRuntimeMode
): VizValidationReport;
```

This should detect:

- missing assets
- missing baked artifacts
- render-incompatible components
- live-only nodes in render mode
- invalid graph bindings

## Editor Usage

The editor should use the runtime in `live` mode for:

- play/pause
- preview frame rendering
- scrubbing
- state inspection

The editor should not re-implement runtime semantics on the side.

## Remotion Usage

The Remotion adapter should use the runtime in `render` mode.

It should:

- construct runtime
- seek or step to the requested frame
- render to the adapter target

If full random-access render is too expensive for certain scenes, the adapter
should rely on baked checkpoints rather than inventing different scene logic.

## No Legacy Rule

Do not design the V2 runtime API around current V1 store access or V1 render
component signatures.
