# Autonomous Development Compass

Status: canonical decision and recovery summary for long-running VizEngine
work.

This compass derives from the
[VizEngine Compounding Vision](./visions/viz-engine-compounding-vision.md). It
does not replace the active goal, technical specifications, or validation
evidence.

## Recovery Order

At the start of a goal, after compaction, or in a fresh task, read:

1. `AGENTS.md`
2. `docs/visions/viz-engine-compounding-vision.md`
3. `docs/current-state.md`
4. the active goal named by `docs/current-state.md`, if one exists
5. `docs/working-agreements.md`
6. the technical specs directly governing the active slice
7. `docs/parity/README.md` and affected parity rows
8. `docs/suggestions.md` and the latest relevant ledger/evidence entries
9. the actual Git status, diff, implementation, tests, and running product

Chat history can explain intent but cannot override repository truth.

## Priority Order

When two useful actions compete, prefer the one that best preserves this
order:

1. product direction and creative quality
2. canonical ownership and deterministic meaning
3. V1-level UI, capability, and responsiveness
4. correctness, portability, and inspectability
5. reusable creative leverage
6. simplicity and deletion of conceptual duplication
7. active-goal throughput

Speed does not justify violating a higher item.

## Milestone Test

A good autonomous milestone:

- advances one explicit active-goal outcome
- names the canonical owner and forbidden duplicate owners
- defines visible, structural, and performance acceptance before coding
- implements the smallest coherent reusable slice
- uses canonical project, session, runtime, asset, bake, and render paths
- validates the real product, not only types or unit tests
- removes superseded code and temporary scaffolding
- updates current state and durable evidence
- leaves one understandable checkpoint for the next run

## Architecture Test

Reject or escalate a path that introduces:

- a second project, session, graph, transport, audio, runtime, or history truth
- React as a frame-rate or pointer-rate data bus
- agent-only scene semantics
- production-specific behavior in engine core
- a compatibility layer without a near deletion condition
- a generic abstraction with no proven consumer or stable domain boundary
- a new provider, dependency, or service as a semantic root
- a visible parity or quality regression disguised as cleanup

## Creative Test

For production work, confirm that:

- the music and creative brief are explicit
- motion expresses musical intent rather than arbitrary parameter vibration
- representative stills and motion are actually inspected
- the project remains readable and editable in the editor
- reusable improvements are promoted to the proper capability or tooling layer
- final media and the portable project are both deliverables
- major aesthetic checkpoints receive independent, evidence-backed calibration;
  human feedback may override the result but is not required inside the
  delegated engine horizon

## Stop And Escalate

Stop for human direction when work requires:

- beginning the hosted platform, monetization, commercial packaging, or
  production Magnify integration horizon
- a material product-vision or product-identity change
- accepting feature, quality, or performance loss
- licensing policy, publication, deployment, billing, purchase, or
  external-system authority
- mixing ambiguous user work that cannot be safely isolated

Ordinary failures, difficult debugging, and a first implementation that needs a
cleaner refactor are not reasons to stop. Neither is a reversible creative,
architecture, dependency, renderer, tooling, file, asset, export, or UX choice
that remains inside the documented engine vision and parity floor.

## Long-Running Execution Rule

One active goal owns execution scope. Recurring or resumed work must recover
from repository docs, select one bounded checkpoint, validate it, record it,
and stop cleanly before the next checkpoint.

Never run overlapping mutation loops against the same worktree. Isolated
worktrees may be used for scheduled work, but filesystem isolation does not
remove shared CPU, memory, GPU, disk, or product-direction constraints.

The active goal determines what to build. The compounding vision determines
what must not drift while building it.
