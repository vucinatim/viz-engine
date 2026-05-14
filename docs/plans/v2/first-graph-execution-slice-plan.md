# First Graph Execution Slice Plan

## Purpose

This slice turns V2 graphs from document references into executable scene
content.

The goal is not a full node system yet.

The goal is the first clean portable graph path that:

- lives inside the canonical project document
- evaluates deterministically per frame
- feeds layer inputs through `graph-output`
- stays shared across studio, CLI, SVG, Remotion, and future hosts

## Why This Slice Exists

Before this slice:

- `VizProjectDocument` could reference graphs
- `VizValueSource` already included `graph-output`
- the runtime did not actually evaluate graphs

That meant the architecture was promising a behavior it did not own yet.

This slice fixes that at the root instead of adding temporary shortcuts inside
components or host adapters.

## Scope

This slice should implement:

1. real embedded graph contracts
2. a first core-node package
3. runtime graph evaluation once per frame
4. `graph-output` resolution through the shared frame-plan path
5. example-project proof through real graph usage
6. tests that prove graph behavior directly and through render hosts

## Deliberate Limits

This slice should not try to do everything:

- no temporal node state yet
- no bake-node execution yet
- no graph editor UI rewrite yet
- no reusable graph library abstraction yet

The first implementation should stay small and explicit:

- pure-node execution only
- embedded graphs only
- deterministic frame evaluation only

## Contract Direction

The graph should be embedded scene content, not editor-owned state.

The preferred early shape is:

- graph-level external inputs using stable `VizValueSource` bindings
- node-level input bindings using:
  - literal values
  - graph-input bindings
  - node-output bindings
- graph-level named outputs that layers can consume through `graph-output`

This keeps the canonical document simple and avoids a second edge-only scene
representation when input bindings already express the same meaning directly.

## Runtime Direction

The runtime should:

- evaluate graphs once per frame
- cache node outputs within that graph evaluation pass
- detect cycles explicitly
- surface graph issues through the same planning/reporting path

The runtime should not:

- hide graph behavior inside component code
- evaluate graphs ad hoc in each host
- let host adapters redefine graph semantics

## First Core Nodes

The initial built-in node set should stay minimal:

- `graph-input`
- `multiply`
- `add`
- `clamp`

That is enough to prove:

- external feature input ingestion
- graph shaping behavior
- deterministic graph outputs into components

## Validation

This slice is only complete when all of these are true:

- direct graph evaluation tests pass
- frame-plan tests prove `graph-output` resolution
- example and bundle flows still pass
- studio build still passes
- external consumer smoke still passes
- `pnpm check:v2` is green

## Exit Condition

This slice is done when Viz V2 can truthfully say:

- graphs are real embedded project content
- graph outputs are executable runtime semantics
- host adapters consume graph-shaped layer inputs without special-case logic
