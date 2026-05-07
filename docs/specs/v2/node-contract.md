# V2 Node Contract

## Purpose

This document defines the desired node contract for VizEngine V2.

The node system should remain easy to author while becoming more explicit and
runtime-safe.

## Node Categories

V2 should classify nodes as:

- pure nodes
- temporal nodes
- bake nodes

## Pure Nodes

Pure nodes:

- have no internal temporal state
- transform explicit inputs into explicit outputs
- are trivially deterministic

Examples:

- clamp
- map range
- mix
- color conversion
- threshold

## Temporal Nodes

Temporal nodes:

- hold explicit state
- step deterministically over time
- must be replayable under fixed inputs

Examples:

- envelope follower
- cooldown gate
- hysteresis
- spring
- decay
- integrator

## Bake Nodes

Bake nodes:

- depend on heavy analysis or precomputation
- output references to baked results or use baked artifacts during evaluation

Examples:

- song section detector
- expensive onset analysis
- simulation trajectory solver

## Desired Shape

Preferred conceptual contract:

```ts
type VizNodeDefinition<TInputs, TOutputs, TState> = {
  id: string;
  name: string;
  category: "pure" | "temporal" | "bake";
  inputs: VizNodeInputSchema<TInputs>;
  outputs: VizNodeOutputSchema<TOutputs>;
  createInitialState?: () => TState;
  evaluate?: (ctx: VizNodeEvaluateContext<TInputs, TOutputs, TState>) => TOutputs;
  step?: (ctx: VizNodeStepContext<TInputs, TOutputs, TState>) => {
    state: TState;
    outputs: TOutputs;
  };
  bake?: (ctx: VizNodeBakeContext<TInputs>) => Promise<VizBakeOutput>;
  metadata?: VizNodeMetadata;
};
```

## Explicit State Rule

If a node is stateful, that state must be explicit.

Do not hide temporal behavior in:

- module globals
- editor stores
- implicit closures that drift across runs

## Graph Persistence Rule

The graph is scene content.

Node definitions are engine capabilities.

Runtime node state is not scene content unless intentionally baked or
checkpointed.

## AI Metadata

Nodes should expose machine-readable metadata such as:

- purpose
- input expectations
- output meaning
- category
- compatibility
- example use

## Render Safety

The runtime should be able to validate whether a graph is:

- fully render-safe
- requires baking
- contains live-only elements

That validation should be contract-driven, not guessed from ad hoc behavior.

## No Legacy Rule

Do not preserve V1 node behavior implicitly by tying execution to editor store
shape.

Port nodes into explicit V2 categories instead.
