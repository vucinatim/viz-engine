# Autonomous Development Operating Contract

## Purpose

This contract defines how a long-running Codex goal should move VizEngine V2
forward without losing product direction, quality, or the established editor
experience.

It complements:

- [the compounding vision](../../visions/viz-engine-compounding-vision.md)
- [the autonomous development compass](../../autonomous-development-compass.md)
- [the V2 vision](../../visions/viz-engine-v2-vision.md)
- [the product, architecture, and parity alignment](../../visions/v2-product-architecture-and-parity-alignment.md)
- [the V2 foundation plan](./v2-foundation-and-rewrite-plan.md)
- [the executable parity matrix](../../parity/v1-v2-parity-matrix.json)

The operating model is:

- `/goal` provides durable execution continuity
- repository documents provide durable product and architecture memory
- tests, builds, browser checks, and measurements provide confidence
- small, coherent milestones provide forward motion

No workflow script can replace those four things. Automation may invoke checks,
but it must not become a second source of product direction.

## Canonical Recovery Order

At the start of a goal, after compaction, or when resuming in a new task, read
the following in order:

1. `AGENTS.md`
2. `docs/visions/viz-engine-compounding-vision.md`
3. `docs/current-state.md`
4. the active goal named by `docs/current-state.md`, if one exists
5. `docs/autonomous-development-compass.md`
6. `docs/working-agreements.md`
7. the technical specs directly governing the active slice
8. `docs/parity/README.md` and affected parity rows
9. `docs/suggestions.md` and the latest relevant ledger/evidence entries
10. the actual Git status, diff, tests, and running product

Chat memory may help explain intent, but it does not override current repository
evidence.

## Product Invariants

Autonomous work must preserve all of these:

1. VizEngine V2 is a deterministic visual runtime and a professional
   browser-based editor for that runtime.
2. `VizProjectDocument` is the canonical portable project representation.
3. `VizSession` is the canonical live scene/session engine.
4. Editor state and runtime/session state remain separate.
5. Baking is a first-class runtime capability.
6. Remotion is an adapter, not the architecture.
7. Human UI, programmatic hosts, and agent tools converge on the same stable
   action and inspection contracts.
8. V2 is a full replacement rewrite: obsolete V1 architecture is deleted after
   its replacement is proven.
9. V1 product behavior is not disposable. The pinned pre-V2 product at
   `e806fbc10980615588b52ff574bc923c6f00f35e` is the parity reference.
10. No primary editor capability may disappear silently. A difference must be
    proven equivalent, recorded as a gap, or explicitly approved as a change.

## Autonomous Authority

Within an active goal, Codex may proceed without asking for each step when the
work is local, reversible, and directly advances the named goal.

That includes:

- reading and auditing repository state
- editing code, tests, fixtures, and canonical documentation
- performing clean refactors required by the active slice
- deleting superseded code after all callers are migrated and the replacement
  is proven
- running type checks, tests, builds, linters, validators, local servers, and
  browser verification
- adding focused tests and local validation utilities
- recording findings in `docs/suggestions.md`
- recording completed milestones in `docs/work-ledger.md`
- creating small local commits only when the worktree scope is understood and
  the commit cannot accidentally absorb unrelated user work

Codex must stop and ask before:

- changing the product vision or approved editor design
- moving the pinned parity baseline
- accepting a known capability regression
- introducing a major dependency or infrastructure commitment
- changing public compatibility, licensing, pricing, hosting, or cloud scope
- pushing, opening a pull request, publishing, deploying, or changing external
  systems unless the goal explicitly authorizes it
- discarding, overwriting, or ambiguously mixing existing user changes

When a technically clean path conflicts with the documented product direction,
Codex must surface the conflict instead of choosing silently.

## Milestone Loop

Every autonomous milestone follows this loop:

1. **Orient**
   - recover canonical context
   - inspect the worktree
   - confirm the relevant parity rows and architecture boundary
2. **Define the slice**
   - state the user-visible or architectural outcome
   - identify the old owner, new owner, deletion target, and affected workflows
   - define acceptance and validation before implementation
3. **Implement narrowly**
   - use the smallest coherent architecture
   - avoid new bridge layers unless they have an explicit deletion condition
   - preserve selective subscriptions and imperative frame-driven work
4. **Validate locally**
   - run focused type checks and tests during development
   - add regression coverage for corrected ownership or behavior
5. **Validate as a product**
   - exercise affected workflows in the browser
   - compare against the pinned V1 reference for parity-sensitive behavior
   - inspect console errors and visible failure states
   - measure performance when a parity row includes the performance dimension
6. **Run the repository gate**
   - run `pnpm check:foundation`
   - do not weaken or bypass a gate to obtain green output
7. **Review the complete diff**
   - check for accidental scope, dead code, duplicate truth, debug artifacts,
     and documentation drift
   - run `git diff --check`
8. **Close the milestone**
   - update parity statuses only to the level supported by evidence
   - update `docs/current-state.md`
   - record meaningful work in `docs/work-ledger.md`
   - record durable follow-up architecture opportunities in
     `docs/suggestions.md`
   - create a logical local commit only when authorized and safe
9. **Select the next slice**
   - continue automatically while a safe, high-confidence next slice exists
   - otherwise stop with the exact decision or external input required

## Milestone Quality Gates

A milestone is complete only when every applicable gate passes.

### Direction Gate

- The slice advances the current documented V2 plan.
- It does not introduce a second canonical project, session, graph, transport,
  audio, history, or runtime truth.
- Any transitional bridge has a named deletion condition.

### Architecture Gate

- Runtime semantics do not move into React or UI-only stores.
- Browser-specific attachments remain outside the deterministic runtime core.
- Public contracts remain small, typed, and explicit.
- New abstractions remove more complexity than they add.

### Correctness Gate

- Focused regression tests cover the changed behavior.
- `pnpm check:foundation` passes from the repository root.
- Invalid input and failure paths are handled without corrupting canonical
  state.

### Product Parity Gate

- Affected rows in `docs/parity/v1-v2-parity-matrix.json` are reviewed.
- Browser-visible workflows are tested in a browser.
- Visual or interaction differences are recorded honestly.
- A capability is not marked `verified` from source presence or type safety
  alone.

### Performance Gate

- Frame-driven work stays outside broad React rerender paths.
- A performance-sensitive change has repeatable measurements using a fixed
  scene, viewport, device, and observation window.
- No performance row is marked `verified` from subjective feel alone.

### Cleanup Gate

- Superseded code is removed once the replacement is proven.
- No unused compatibility layer is kept for reassurance.
- Comments and documents describe current truth rather than migration history
  unless that history is needed for a decision.

### Evidence Gate

- `git diff --check` passes.
- Validation commands and browser observations are recorded.
- `docs/current-state.md`, the parity matrix, and the work ledger agree.

## Parity Workflow

The parity matrix is an executable backlog, not a celebratory checklist.

For each affected capability:

1. inspect the immutable V1 source evidence
2. run the V1 workflow at the pinned commit when behavior is unclear
3. run the same workflow in V2
4. validate every listed parity dimension
5. record the evidence
6. use:
   - `not-audited` when no comparison has been performed
   - `gap` when the behavior is absent or regressed
   - `partial` when replacement code or incomplete evidence exists
   - `verified` only when acceptance is proven
   - `approved-change` only with a recorded product decision

The matrix validator runs through:

```bash
pnpm parity:validate
```

It is also part of:

```bash
pnpm check:foundation
```

## Worktree Discipline

Before editing:

- inspect staged, tracked, untracked, and deleted files
- distinguish the active goal's changes from pre-existing work
- never assume a dirty file is disposable

During editing:

- keep changes within the active slice
- avoid formatters or generators that rewrite unrelated files
- prefer new focused files when an existing dirty file cannot be changed safely

Before committing:

- review the exact staged diff
- ensure all staged files form one coherent milestone
- leave unrelated changes unstaged

If ownership of a change is uncertain, preserve it and document the ambiguity.

## Failure And Stop Rules

Continue autonomously through ordinary implementation failures:

- failing tests
- type errors
- local build errors
- browser console errors
- a first implementation that needs a cleaner refactor

Stop and request direction when:

- product intent has two materially different plausible interpretations
- meeting a goal requires an unapproved regression or redesign
- a required external credential, authority, or service is unavailable
- existing user changes overlap so heavily that safe isolation is impossible
- the same external blocker persists and no meaningful local work remains

Do not stop merely because a slice is difficult or the first attempt failed.

## Goal Completion Contract

An autonomous goal is complete only when:

- every explicitly requested deliverable exists
- the relevant architecture and parity requirements are satisfied or remaining
  gaps are explicitly scoped
- the full repository gate passes
- required browser verification is complete
- current-state and ledger documentation are current
- the final worktree review finds no accidental changes
- no required work remains hidden behind phrases such as “should work” or
  “appears complete”

The completion report should lead with the outcome, name any remaining known
gaps, cite the validation evidence, and state whether any external action such
as commit, push, or deployment was intentionally not performed.

## Recommended Use

Use one durable `/goal` for a concrete program of work with explicit boundaries
and completion conditions. Let the goal continue across automatic
continuations and compactions.

Do not run overlapping autonomous edit loops against the same worktree.
Scheduled or recurring loops are useful for read-only monitoring, but they are
not the primary development memory system and should not mutate the same branch
in parallel.

The best next goal is a bounded architectural milestone, not “finish the whole
product.” Examples:

- collapse one remaining editor truth surface into `VizSession`
- move one representative component family onto the deterministic runtime
- verify and close one coherent parity area such as transport
- establish the first repeatable V1/V2 responsiveness benchmark

Each completed goal should leave the repository easier for the next goal to
understand and safer for the next goal to change.
