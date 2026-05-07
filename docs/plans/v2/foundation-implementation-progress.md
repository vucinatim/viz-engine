# Foundation Implementation Progress

## Purpose

This document tracks the concrete V2 foundation work after the planning phase.

It exists to answer:

- what has become real already
- what has only been scaffolded
- what the next implementation slices are

## Current Status

The V2 foundation is now partially implemented.

The repo now has real package boundaries for:

- `@viz-engine/contracts`
- `@viz-engine/runtime`
- `@viz-engine/bake`
- `@viz-engine/remotion-adapter`
- `@viz-engine/example-projects`
- `@viz-engine/app-viz-studio`

This is no longer just a doc-only posture.

## Completed Foundation Work

### Workspace and TypeScript

- introduced a package-safe shared TypeScript base config
- expanded the PNPM workspace to support `apps/*`
- added explicit V2 scripts for package typecheck/build, studio app, tests, and
  combined V2 checks

### Canonical Contracts

- introduced the first real `VizProjectDocument` contract shape
- introduced first real asset and artifact reference contracts
- introduced audio feature timeline artifact types
- introduced component metadata and frame-plan snapshot contracts

### Runtime

- introduced project validation
- introduced deterministic frame context creation
- introduced runtime session creation and ordered-layer resolution
- introduced component registry support
- introduced first frame-plan resolution against baked artifact inputs

### Bake and Adapter Seams

- introduced first bake-plan generation from project assets
- introduced first Remotion composition/frame-state adapter seam

### Example and Validation Surface

- introduced a canonical example project package
- introduced deterministic example baked feature artifacts
- introduced the first root V2 test suite
- introduced a minimal Vite-based `viz-studio` app shell that consumes the
  packages directly
- introduced the first local-first CLI surface for validating and inspecting
  canonical example projects without going through the app shell

## What This Proves

The current setup proves that V2 now has:

- a real monorepo package structure
- a canonical document model
- a deterministic runtime shell
- package-consumable example data
- a validatable and testable setup
- a first app shell outside the old Next editor terrain

## What Is Still Missing

The foundation is still not yet a real rendering/editor replacement.

Major missing layers are:

- component execution contract beyond metadata
- graph execution contract beyond document references
- resolved asset pipeline beyond baked artifact examples
- real renderer/compositor implementation
- real Remotion-mounted visual proof
- real editor mutation/action surface
- CLI layer

## Recommended Next Slices

### Slice 3

- add a real component execution contract
- add runtime component registry ownership and invocation shape
- add one actual executable visual component contract, not just metadata

### Slice 4

- add the first real Three/WebGL preview/compositor baseline
- mount one real visual through the studio shell
- mount the same visual through the Remotion adapter

### Slice 5

- add first portable project fixture/bundle validation path
- add CLI-style validation entrypoints
- add package-first Magnify proof wiring

## Guardrails

Important rules while continuing:

- keep new V2 work out of the old `src/` terrain unless bridging is truly
  required
- keep old app compatibility stable while V2 grows next to it
- do not overbuild fake abstraction before the first real visual proof exists
- keep tests and example fixtures growing alongside runtime behavior

## Final Position

The current V2 implementation status is strong enough to move from
infrastructure setup into the first actual visual runtime proof.

That should now become the focus.
