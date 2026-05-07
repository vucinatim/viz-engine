# VizEngine V2 Foundation And Rewrite Plan

## Why This Plan Exists

VizEngine has crossed the point where incremental cleanup is no longer enough.

The right next step is a full replacement rewrite that preserves the core
creative value while replacing the architectural boundaries that block:

- deterministic rendering
- AI-native authoring
- clean headless runtime usage
- clean Magnify Core integration

## Rewrite Rule

This plan assumes a hard rewrite posture:

- full replacement rewrite
- full purge of obsolete structure
- no legacy compatibility layer by default
- no dead code, dead folders, or deprecation scaffolding kept around long term

If a temporary migration bridge is ever introduced, it must be:

- explicitly justified
- tightly scoped
- removed as soon as its milestone is complete

## Goals

The rewrite must produce:

- one canonical Viz project document
- one deterministic runtime contract
- one first-class baking system
- one editor built on top of those contracts
- one clean Remotion adapter path
- one AI-native action surface

## Non-Goals

This phase is not about:

- polishing V1 further
- preserving every existing component unchanged
- keeping existing folder layout intact
- making the browser export path the long-term production renderer

## Phase 0: Rewrite Guardrails

Deliverables:

- source-of-truth docs spine
- rewrite doctrine
- operating-system docs
- active architecture direction docs

Exit condition:

- the repo has a clear documented V2 posture and no ambiguity about the
  replacement strategy

## Phase 1: Canonical Contracts

Deliverables:

- `VizProjectDocument`
- asset reference contracts
- component metadata contract
- node metadata contract
- bake artifact contracts
- runtime request/result contracts

Exit condition:

- the project has one typed scene contract that can drive editor, bake, and
  render work

## Phase 2: Runtime Extraction

Deliverables:

- headless runtime package
- deterministic frame evaluation model
- runtime state stepping model
- standalone node graph evaluation as the canonical path

Exit condition:

- frame evaluation no longer depends on editor stores or browser app state

## Phase 3: Bake System

Deliverables:

- audio feature bake pipeline
- simulation/checkpoint bake pipeline
- baked artifact storage and loading model

Exit condition:

- heavy precomputation is a first-class contract instead of ad hoc helpers

## Phase 4: Editor Rebuild

Deliverables:

- editor rebuilt over the new contracts
- preview driven by the new runtime
- scene inspection tools
- AI action-friendly mutation surface

Exit condition:

- the editor is clearly a client of the runtime, not the owner of runtime
  semantics

## Phase 5: Render Adapters

Deliverables:

- Remotion adapter over the Viz runtime
- local deterministic render path
- Magnify-facing integration contract

Exit condition:

- one Viz scene can drive preview and final render without semantic drift

## Phase 6: Purge

Deliverables:

- removal of obsolete V1 runtime architecture
- removal of dead folders and dead code
- removal of temporary migration bridges
- README and docs aligned with the V2 implementation reality

Exit condition:

- the repo no longer carries obsolete architectural baggage

## Established Design Docs

The first V2 design docs now exist:

1. [Viz Project Document Spec](../../specs/v2/viz-project-document.md)
2. [V2 Component Contract](../../specs/v2/component-contract.md)
3. [V2 Node Contract](../../specs/v2/node-contract.md)
4. [V2 Bake Artifact Contract](../../specs/v2/bake-artifact-contract.md)
5. [V2 Runtime Package Split Plan](../../specs/v2/runtime-package-split-plan.md)

These should guide the next implementation planning pass.
