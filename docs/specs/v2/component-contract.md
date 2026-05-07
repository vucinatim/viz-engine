# V2 Component Contract

## Purpose

This document defines the desired authoring contract for VizEngine V2
components.

The goal is to preserve the good DX from V1 while making components:

- deterministic when needed
- AI-friendly
- headless-capable
- compatible with bake workflows

## Core Rule

A component should not rely on hidden app state.

A component should operate from explicit inputs and explicit local state.

## Desired Shape

Preferred conceptual contract:

```ts
type VizComponentDefinition<TConfig, TState> = {
  id: string;
  name: string;
  description: string;
  config: VizConfigSchema<TConfig>;
  compatibility: VizCompatibility;
  createInitialState?: (ctx: VizInitialStateContext) => TState;
  simulate?: (ctx: VizSimulationContext<TConfig, TState>) => TState;
  render2D?: (ctx: VizRender2DContext<TConfig, TState>) => void;
  render3D?: (ctx: VizRender3DContext<TConfig, TState>) => void;
  bake?: (ctx: VizBakeContext<TConfig>) => Promise<VizBakeOutput>;
  metadata?: VizComponentMetadata;
};
```

## Required Qualities

Every component should be:

- typed
- explicit about inputs
- explicit about state
- explicit about compatibility mode

## Compatibility Classification

Each component should declare one of:

- `render-safe`
- `bake-required`
- `live-only`

This gives the system a clean way to:

- validate renderability
- guide AI choices
- avoid pretending every component is safe everywhere

## Inputs

Render and simulation inputs should be explicit:

- current frame
- absolute time
- fixed timestep
- audio features
- time-domain/frequency-domain snapshots if needed
- baked artifact access
- seeded randomness access

Do not allow arbitrary direct store access inside component execution.

## State

Stateful behavior is allowed.

But state must be:

- declared
- serializable where practical
- replayable
- deterministic under fixed inputs

## Randomness

Components must not call raw `Math.random()` in runtime logic.

Use seeded randomness passed through context.

## Live Vs Render

The same component may support multiple modes, but that should be explicit.

Examples:

- simple bars visual: `render-safe`
- particle sim with checkpoints: `bake-required`
- experimental mic-controlled visualizer: `live-only`

## Bake Hook

Components may optionally declare a bake step for:

- feature preparation
- simulation checkpoint generation
- heavy geometry preprocessing

Bake output should become explicit artifact references, not hidden local files.

## AI Metadata

Component metadata should eventually include:

- purpose
- examples
- expected look/behavior
- required assets
- cost hints
- compatibility mode

That makes the authoring system genuinely AI-native.

## No Legacy Rule

Do not shape the V2 component contract around V1 callback signatures.

If V1 components are ported, port them intentionally into the new contract.
