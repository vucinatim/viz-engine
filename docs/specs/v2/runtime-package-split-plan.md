# V2 Runtime Package Split Plan

## Purpose

This document defines the intended package and folder boundary split for the V2
rewrite.

The exact folder names can change, but the boundary responsibilities should be
kept clean.

## Target Split

### `packages/viz-contracts`

Owns:

- project schemas
- asset schemas
- baked artifact schemas
- component metadata contracts
- node metadata contracts

### `packages/viz-runtime`

Owns:

- deterministic evaluation
- component execution
- node graph execution
- state stepping
- scene assembly

### `packages/viz-bake`

Owns:

- offline audio analysis
- bake pipelines
- simulation checkpoint generation
- other reusable precompute flows

### `apps/viz-editor`

Owns:

- editing UI
- inspectors
- preview controls
- scene browsing
- AI action dispatch UI if needed

### `packages/viz-render-adapters`

Owns:

- Remotion adapter
- future alternate render adapters if needed

## Migration Rule

Do not gradually smear V2 logic back into the current V1 app structure if that
recreates the same coupling we are trying to escape.

If a capability is clearly V2 runtime logic, put it behind the new boundary.

## Purge Rule

Once a new boundary fully owns a concern, the obsolete V1 implementation path
should be removed instead of kept indefinitely.

## First Implementation Sequence

Recommended first sequence:

1. establish `viz-contracts`
2. establish `viz-runtime`
3. establish `viz-bake`
4. reconnect editor over new contracts
5. add render adapters

This sequence reduces the risk of rebuilding the editor on top of the wrong
runtime again.
