# Agent Contract

VizEngine is entering a V2 full-replacement rewrite.

Start here:

- [README.md](./README.md)
- [docs/docs-index.md](./docs/docs-index.md)
- [docs/visions/viz-engine-compounding-vision.md](./docs/visions/viz-engine-compounding-vision.md)
- [docs/current-state.md](./docs/current-state.md)
- [docs/autonomous-development-compass.md](./docs/autonomous-development-compass.md)
- [docs/working-agreements.md](./docs/working-agreements.md)
- [docs/visions/viz-engine-v2-vision.md](./docs/visions/viz-engine-v2-vision.md)
- [docs/visions/v2-product-architecture-and-parity-alignment.md](./docs/visions/v2-product-architecture-and-parity-alignment.md)
- [docs/plans/v2/v2-foundation-and-rewrite-plan.md](./docs/plans/v2/v2-foundation-and-rewrite-plan.md)
- [docs/plans/v2/autonomous-development-operating-contract.md](./docs/plans/v2/autonomous-development-operating-contract.md)
- [docs/plans/v2/product-parity-performance-and-agentic-creative-calibration.md](./docs/plans/v2/product-parity-performance-and-agentic-creative-calibration.md)
- [docs/plans/v2/goal-five-autonomous-sensory-feedback-operating-system.md](./docs/plans/v2/goal-five-autonomous-sensory-feedback-operating-system.md)
- [docs/plans/v2/autonomous-checkpoint-runbook.md](./docs/plans/v2/autonomous-checkpoint-runbook.md)
- [docs/parity/README.md](./docs/parity/README.md)

## Mission

Build VizEngine V2 as the open-core, music-driven visual scene language,
professional live editor, deterministic production runtime, and agent-native
creative system defined by the compounding vision:

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

## Repository CLI Rule

Before manually inspecting or changing repository state, read `package.json`
and discover the maintainer surface:

```bash
pnpm run repo -- --help
```

`pnpm viz` owns product, session, bundle, bake, render, and live-editor
operations. `pnpm run repo --` owns contributor workflow, execution-program
state, repository leases, staged checks, canonicalization, sensory coverage,
human-validation state, and review packets. Do not move product semantics into
the maintainer CLI or duplicate maintainer state in the product CLI.

While the autonomous-readiness program is active, agents must:

1. run `pnpm --silent run repo -- run preflight --json`
2. follow the exact recovery/stop action before reading mutable program state
3. run `pnpm --silent run repo -- program status --json`
4. run `pnpm --silent run repo -- program next --json`
5. claim one dependency-ready item before editing
6. checkpoint meaningful recoverable state
7. complete or block the item with typed evidence
8. release ownership before stopping

The bootstrap implementation that creates this otherwise-unavailable operating
surface is the sole exception to claim-before-edit. `OS-01` through `OS-05`
adopt and prove that already-built candidate substrate with separate exact
evidence and coherent closure commits; pending means “not yet proven and
closed,” not “not implemented.” `OS-06` is the first full rehearsal.

## Autonomous Writer And Recovery Rule

One repository writer lease covers all linked worktrees. A worktree is
isolation, not permission for multiple writers.

- Never edit when another valid lease exists.
- Never acquire a new lease over unknown dirty state.
- Recover an expired lease only through the exact owner, program, work item,
  claim, and previous lease identities.
- Preserve dirty work during recovery; never reset, clean, stash, or overwrite
  it automatically.
- Treat the Git-common resume marker as operational recovery state, not product
  data or a substitute for committed project direction.
- A later scheduled wake exits harmlessly when an earlier run still owns the
  lease.
- Only the same run may continue after compaction, by presenting all four exact
  lease, owner, work-item, and claim identities to `run preflight`. A fresh wake
  that receives `wait-writer-lease` exits read-only.
- `state status` reports the cross-file transition mutex and crash journal.
  Recover a proven-dead mutex only with its exact host/PID, then roll back an
  interrupted transition only with its exact transition ID. Never inspect or
  mutate a half-transitioned operational snapshot.
- The tracked active-program pointer selects one immutable execution
  definition. Each definition declares its exact target branch. Lifecycle and
  human-validation state are program- and branch-scoped; leases, resume
  markers, decisions, and immutable evidence live under Git-common operational
  state.

`human resolve` records an explicit decision but cannot cryptographically
distinguish a human from a local process. Autonomous agents must never invoke it
without a contemporaneous user instruction naming the decision. At a human
checkpoint, prepare evidence and stop.

Autonomous agents may use ordinary development tools, including `git`, `gh`,
browsers, and repository CLIs, within the authority granted here. Repository
tools are canonical where they own VizEngine product or execution state; they
do not replace general-purpose tools merely to constrain how work is performed.

After a Goal Five checkpoint is complete and verified, its exact terminal
commit may be fast-forward pushed to the same-named `origin` branch when that
branch is the active program's declared non-`main`/non-`master` target. The
constraint is on the resulting effect, not which ordinary Git-capable tool
performs it. Never force-push, merge, open or merge a PR, tag, publish, deploy to
or modify production systems, or mutate another external system. Remote
divergence or push failure is a truthful stop, never authority to merge, rebase,
or rewrite history.

## Sensory Adequacy Rule

Before a meaningful implementation slice, state:

1. the intended observable outcome
2. its canonical owner and forbidden duplicate owners
3. current and desired observations
4. how the observation rejects a plausible false pass
5. relevant environment, tolerances, and exact identities
6. which evidence lanes apply
7. what remains irreducibly human

If observation is inadequate, implement the smallest reusable observation
improvement that unlocks the claimed criterion. Do not create a generic sensor
framework or build speculative harnesses detached from a named criterion or
stable product boundary.

## Staged Validation Rule

Use the least expensive stage that truthfully answers the current question:

```bash
pnpm check:fast          # contract and structural guardrails
pnpm check:focused       # changed formatting/lint plus related/repo tests
pnpm check:checkpoint    # focused checks plus complete typecheck/unit suite
pnpm check:integration   # full authored checks, builds, and built smokes
pnpm check:certification # uninterrupted complete browser/repository gate
```

- Run `fast` when orienting or changing contracts.
- Run `focused` repeatedly during implementation.
- Run `checkpoint` before a coherent local commit.
- Run `integration` after cross-package integration and every four to six
  checkpoints.
- Run `certification` only for declared phase, candidate, or activation gates.
- Never cite a cheaper stage as evidence for a broader gate.
- Never weaken, skip, retry selectively, or relabel a failed check to obtain a
  pass.
- Run `pnpm canonicalize` before checkpoint validation; it formats only the
  active diff. Semantic canonicalization remains a review responsibility.

## Builder, Canonicalizer, And Checker Roles

Portable role contracts live in [`.agents/roles`](./.agents/roles), with
project-scoped read-only Codex agents in [`.codex/agents`](./.codex/agents):

- the builder owns the claimed implementation and focused feedback loop
- the canonicalizer independently reviews ownership, duplication, deletion,
  public surface, documentation truth, and end-state fit
- the checker independently verifies acceptance at the correct staged scope

Canonicalizer and checker agents are read-only unless they independently claim
a dependency-ready remediation item. Findings return to the sole writer; two
agents must never edit the same checkout concurrently. Run canonicalization and
checking after architecture-bearing checkpoints and during every integration
review, not mechanically after every keystroke.

Use `viz_sensory_auditor` before building a new observation surface,
`viz_canonicalizer` after an architecture-bearing diff, and `viz_checker` before
closing its checkpoint. Delegate only bounded read-heavy work whose output the
primary writer will integrate; do not create parallel implementation writers.

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
