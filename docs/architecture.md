# Architecture

## Purpose

This document describes the intended architectural shape of VizEngine V2.

It is a target architecture document, not a description of the current V1 code.

## Primary System Boundary

VizEngine V2 should be split into a small number of clear system concerns:

- contracts
- runtime
- bake
- editor
- render adapters

The exact package names can change, but the boundary responsibilities should not.

## Intended Package Shape

### `viz-contracts`

Owns:

- project document schemas
- asset reference schemas
- component metadata contracts
- node metadata contracts
- bake artifact schemas
- runtime request and result types

### `viz-runtime`

Owns:

- deterministic frame evaluation
- component execution
- node graph evaluation
- runtime state stepping
- scene assembly logic

This package must be headless-capable.

### `viz-bake`

Owns:

- offline audio analysis
- feature extraction
- simulation checkpoint generation
- other expensive precomputation

### `viz-editor`

Owns:

- React authoring surfaces
- inspectors
- visual preview tooling
- editing workflows
- machine action adapters for editor-driven mutation

The editor should consume contracts and runtime. It should not define them.

### `viz-render-adapters`

Owns:

- Remotion integration
- future non-Remotion render adapters if needed

These adapters should mount or call the Viz runtime. They should not become the
source-of-truth architecture.

## Runtime Modes

VizEngine V2 should support three first-class modes:

- live
- render
- bake

These modes should share one canonical project model while still allowing mode-
specific internal optimizations.

## State Model

The architecture should keep these concerns separate:

- project document state
- editor UI state
- runtime state
- baked artifact state

Do not let these collapse into one store-driven blob.

## Integration Boundary With Magnify

Magnify should integrate with VizEngine through explicit artifacts and runtime
entrypoints:

- Viz project artifact
- baked feature/simulation artifact family
- preview/runtime adapter
- deterministic render adapter

Magnify should not need to understand editor internals.
