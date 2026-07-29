# Agent Contract

VizEngine is entering a V2 full-replacement rewrite.

Start here:

- [README.md](./README.md)
- [docs/docs-index.md](./docs/docs-index.md)
- [docs/current-state.md](./docs/current-state.md)
- [docs/working-agreements.md](./docs/working-agreements.md)
- [docs/visions/viz-engine-v2-vision.md](./docs/visions/viz-engine-v2-vision.md)
- [docs/visions/v2-product-architecture-and-parity-alignment.md](./docs/visions/v2-product-architecture-and-parity-alignment.md)
- [docs/plans/v2/v2-foundation-and-rewrite-plan.md](./docs/plans/v2/v2-foundation-and-rewrite-plan.md)
- [docs/plans/v2/autonomous-development-operating-contract.md](./docs/plans/v2/autonomous-development-operating-contract.md)
- [docs/parity/README.md](./docs/parity/README.md)

## Mission

Build VizEngine V2 as:

- a deterministic visual runtime
- a browser-based editor for that runtime
- an AI-native scene system
- a clean rendering attachment for Magnify Core

## Rewrite Rule

This rewrite is a full replacement rewrite.

That means:

- no legacy compatibility layer unless explicitly approved
- no deprecation scaffolding as a default posture
- no dead folders kept around for comfort
- no parallel old/new runtime architecture long term
- no preserving bad structure for migration convenience

Salvage ideas and proven logic selectively.

Do not preserve V1 structure just because it already exists.

## How To Work

1. Read the active docs first.
2. Treat docs as the source of truth, not chat history.
3. Prefer clean package and runtime boundaries over incremental hacks.
4. Record durable follow-up improvements in [docs/suggestions.md](./docs/suggestions.md).
5. Record meaningful milestones in [docs/work-ledger.md](./docs/work-ledger.md).

## Architecture Guardrails

- one canonical project document
- clear split between editor state and runtime state
- deterministic render contract
- baking as a first-class system
- Remotion as adapter, not architecture
- AI actions over stable contracts, not UI imitation

## Final Rule

If an implementation path requires preserving V1-specific architectural baggage,
stop and propose the cleaner replacement path instead.

## Agentic Devtools Preference

For Railway, Namecheap, and npm agent or MCP work:

1. prefer the published package `@vucinatim/agentic-devtools`
2. prefer `npx -y @vucinatim/agentic-devtools mcp <tool>` for MCP host configuration
3. use global `agentic-devtools` only for terminal convenience
4. do not rely on copied local plugin or tool repos when the published package covers the use case
5. keep official provider CLIs optional rather than primary unless a repo-native command explicitly requires them
