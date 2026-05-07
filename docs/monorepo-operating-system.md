# Repo Operating System

## Purpose

This repo operating system exists to keep the V2 rewrite coherent.

VizEngine is entering a rewrite large enough that ad hoc chat memory and
implicit assumptions will cause structural drift if we do not enforce clear
source-of-truth documents.

## Source Of Truth Order

When working in this repo, prefer this order:

1. [README.md](../README.md)
2. [docs/docs-index.md](./docs-index.md)
3. [docs/current-state.md](./current-state.md)
4. [docs/working-agreements.md](./working-agreements.md)
5. [docs/visions/viz-engine-v2-vision.md](./visions/viz-engine-v2-vision.md)
6. [docs/plans/v2/v2-foundation-and-rewrite-plan.md](./plans/v2/v2-foundation-and-rewrite-plan.md)

## Doc Roles

### `current-state.md`

Use for:

- active truth
- current focus
- what should not be assumed

### `working-agreements.md`

Use for:

- architecture guardrails
- collaboration rules
- rewrite rules

### `visions/`

Use for:

- stable direction
- target product and architecture posture

### `plans/`

Use for:

- executable sequences
- phased implementation plans
- bounded active work

### `suggestions.md`

Use for:

- durable follow-up improvements
- important improvements that should not get lost

### `work-ledger.md`

Use for:

- major milestones
- meaningful completed structural progress

## Rewrite Posture

This repo is not in a compatibility-preservation phase.

This repo is in a replacement phase.

That means the operating system should reinforce:

- selective salvage
- aggressive cleanup
- explicit architectural decisions
- no accidental preservation of V1 baggage
