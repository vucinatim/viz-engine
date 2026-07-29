# Current Uncommitted Worktree Audit

## Audit Scope

This audit records the worktree encountered during the first autonomous
calibration goal on 2026-07-29.

It is a preservation and sequencing document. It does not claim authorship of
pre-existing changes and does not authorize discarding them.

## Repository Position

- branch: `codex/viz-engine-v2`
- current `HEAD`: `f4398682e9a60db3be82d96ffaa377ed6057619a`
- pinned pre-V2 parity reference:
  `e806fbc10980615588b52ff574bc923c6f00f35e`
- first V2 foundation commit:
  `8492e146f10f7c94f987fccd8ee07deb5c7bb233`
- staged changes at audit time: none
- tracked changed paths at audit time: 94
- porcelain-level untracked entries at audit time: 49
- tracked deletions at audit time: one
- `git diff --check` at audit time: clean

The single tracked deletion is:

- `src/lib/stores/audio-store.ts`

That deletion is consistent with the documented split into canonical audio
session state and browser audio-engine attachment state, but it remains part of
the larger uncommitted migration and must be validated as such.

## What Was Already In Progress

The dirty worktree is not one small change. It contains a substantial,
internally related V2 editor migration:

- preserved editor shell and Vite build adjustments
- canonical project, preview, audio-session, graph, and history ownership work
- consolidation into the app-local `VizSession`
- editor command/control-plane work
- runtime-preview store, controller, driver, bridge, and attachment work
- first package-runtime-backed `Curve Spectrum` path
- public sample-project canonicalization
- foundation regression tests for the migrated ownership paths
- phase-by-phase architecture and implementation documentation

The tracked diff also touches much of the preserved V1 UI because consumers are
being rewired away from old hidden stores. Large file counts therefore do not
mean those surfaces should be redesigned.

## Calibration-Goal Additions

The first calibration goal adds a separate, reviewable documentation and
validation slice:

- `docs/visions/v2-product-architecture-and-parity-alignment.md`
- `docs/parity/README.md`
- `docs/parity/v1-v2-parity-matrix.json`
- `docs/plans/v2/autonomous-development-operating-contract.md`
- this audit
- `tools/foundation/validate-v1-v2-parity-matrix.mjs`
- the root `parity:validate` command and foundation-gate integration
- links and status updates in canonical repository documents

These files should not be confused with the earlier runtime/editor migration
when reviewing or eventually staging the work.

## Coherent Change Slices

The current work should be understood and eventually reviewed in this order:

1. **Product and architecture alignment**
   - parity is a product contract
   - exact baseline is pinned
   - autonomous authority and quality gates are explicit
2. **Canonical `VizSession`**
   - working project
   - graphs
   - preview transport
   - audio session
   - history
   - inspection and subscriptions
3. **Preserved-editor adapters**
   - old component-facing stores become projections or are removed
   - editor controls route through one canonical command surface
4. **Runtime-preview cutover**
   - one driver and frame contract
   - browser rendering attachment isolated from runtime meaning
   - package runtime/render-plan drives migrated components
5. **Persistence and samples**
   - canonical project import, export, reset, and bundled examples
6. **Tests and milestone documentation**
   - ownership, persistence, preview, and session regression coverage
   - phase records and final current-state update

These are conceptual review slices. They are not permission to split or commit
files mechanically when dependencies cross the boundaries.

## Main Risks

### Mixed Scope

The worktree contains architecture, UI rewiring, fixtures, tests, and docs.
Blindly staging all changes would make review and rollback difficult.

### Transitional Duplication

Several app-local stores and preview bridges coexist with `VizSession`. Some are
necessary UI adapters; others may now be deletion candidates. Their ownership
must be judged by behavior and callers, not by filename.

### Session Size

`src/lib/viz-session/store.ts` is a large convergence point. It may be correct
as one canonical engine while still needing internal modules for reducers,
selectors, history, and adapters. Splitting internals must not recreate
multiple sources of truth.

### Project Contract Drift

The preserved editor and package runtime have historically used different
project shapes. Persistence, sample projects, agent actions, preview, and
export must converge on the package-level canonical document rather than a
permanent editor-shaped translation model.

### UI Confidence

Source preservation and a green typecheck do not prove visual, interaction, or
performance parity. The node editor, audio waveform, export flows, debug tools,
and Rhythm Lab remain especially important to exercise.

### Performance

The architecture intends selective subscriptions and imperative frame loops,
but the pinned V1/V2 benchmark is not yet established. Performance claims must
remain open until measured.

## Preservation Rules

Until the migration is deliberately stabilized:

- do not reset, clean, checkout, or otherwise discard the dirty worktree
- do not rewrite all touched files with a formatter
- do not stage every file by default
- do not resurrect `audio-store.ts` merely to reduce the visible deletion
- do not preserve an obsolete bridge merely because it is part of the current
  worktree
- do not mark parity rows verified from these changes alone
- do not push or deploy without explicit authorization

## Stabilization Sequence

The safest next implementation sequence is:

1. keep the parity validator and full foundation gate green
2. prove the current `VizSession` tests and editor build as one coherent state
3. browser-test the preserved shell and a representative set of critical
   workflows
4. map every remaining store/bridge to:
   - canonical owner
   - UI adapter
   - browser attachment
   - deletion candidate
5. remove only proven duplicate ownership
6. converge persistence and samples on one package-level project document
7. migrate additional visualization components through the runtime/render-plan
   path
8. establish repeatable parity benchmarks
9. update the matrix and current-state evidence after each slice

## Commit Guidance

No commit should be created from this dirty worktree until the exact intended
scope is staged and reviewed.

If the current state is intentionally preserved as one milestone, the commit
message and review must acknowledge that it contains the complete hidden-brain
swap plus runtime-preview work.

If it is split, use dependency-aware commits and verify the full gate after
each staged state. A superficially neat split that leaves intermediate commits
unbuildable is worse than one coherent, well-described milestone.

This calibration goal does not push, deploy, or discard any existing work.
