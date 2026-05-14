# First Temporal Graph Execution Plan

## Purpose

This slice introduces the first real temporal node support into the V2 graph
runtime.

The goal is not full checkpoint baking yet.

The goal is a clean deterministic temporal baseline that:

- keeps node state explicit
- uses fixed-step frame time
- replays safely in render mode
- stays inside the runtime instead of leaking state back into the editor

## Why This Slice Exists

The current graph system is real, but still pure-node only.

That is enough for initial reactive shaping.

It is not enough for the part of Viz that should feel alive:

- decay
- envelope following
- cooldowns
- memory
- trailing motion

We need the first temporal capability now, but without reintroducing hidden
state.

## Scope

The first implementation should stay intentionally narrow.

It should include:

- explicit temporal node contract support
- deterministic fixed-step replay in the graph evaluator
- one real core temporal node
- one real example-graph use of that temporal node
- tests that prove deterministic temporal behavior

## Architectural Rule

Temporal node state must stay explicit runtime state.

It must not live in:

- module globals
- editor stores
- hidden closures

For the first slice, temporal graphs should replay from frame zero to the
requested frame under fixed timestep.

That is acceptable as the clean baseline before checkpoints.

## Validation Bar

This slice is complete when:

- node contracts support temporal stepping explicitly
- the runtime can evaluate temporal graphs deterministically
- at least one temporal node ships in `@viz-engine/nodes-core`
- the canonical example graph uses real temporal behavior
- tests prove stable temporal outputs
- `pnpm fixtures:update` and `pnpm check:foundation` remain green
