# V1 To V2 Product Parity

## Purpose

This folder turns the preserved-editor requirement into executable product
evidence.

The canonical matrix is:

- [v1-v2-parity-matrix.json](./v1-v2-parity-matrix.json)

Validate it with:

```bash
pnpm parity:validate
```

The validator is part of `pnpm check:foundation`.

Browser comparison records live in [evidence](./evidence/). Start with:

- [2026-07-29 calibration](./evidence/2026-07-29-calibration.md)
- [2026-07-29 canonical-document cutover](./evidence/2026-07-29-canonical-document-cutover.md)
- [2026-07-29 VizSession runtime-preview ownership](./evidence/2026-07-29-viz-session-runtime-preview-ownership.md)
- [2026-07-29 runtime rendering cutover slice 1](./evidence/2026-07-29-runtime-rendering-cutover-slice-1.md)
- [2026-07-29 runtime rendering cutover slice 2](./evidence/2026-07-29-runtime-rendering-cutover-slice-2.md)
- [2026-07-29 runtime rendering cutover slice 3](./evidence/2026-07-29-runtime-rendering-cutover-slice-3.md)
- [2026-07-29 runtime rendering cutover slice 4](./evidence/2026-07-29-runtime-rendering-cutover-slice-4.md)
- [2026-07-29 runtime rendering cutover slice 5](./evidence/2026-07-29-runtime-rendering-cutover-slice-5.md)
- [2026-07-29 runtime rendering cutover slice 6](./evidence/2026-07-29-runtime-rendering-cutover-slice-6.md)

## Pinned Reference

The V1 product reference is pinned to:

```text
e806fbc10980615588b52ff574bc923c6f00f35e
```

This is the last pre-V2 commit on the active branch.

Its direct successor is:

```text
8492e146f10f7c94f987fccd8ee07deb5c7bb233
docs: establish vizengine v2 rewrite foundation
```

The pinned commit is intentionally newer than the current `main` head and
contains accepted editor, waveform, window-control, and Rhythm Lab improvements
that would otherwise be omitted from the reference.

The SHA is immutable. Moving branch names are not parity evidence.

## Status Meaning

- `not-audited`
  The capability is known from V1 but has not yet been tested against V2.
- `gap`
  Evidence proves the capability is missing or materially regressed.
- `partial`
  Some implementation or indirect evidence exists, but full acceptance has not
  been proven.
- `verified`
  The recorded acceptance criteria have current automated and/or browser
  evidence.
- `approved-change`
  The behavior intentionally differs from V1 and the product decision is
  recorded in `validationEvidence`.

Code presence alone is not enough for `verified`.

## Evidence Rules

Every row records:

- immutable V1 source evidence at the pinned commit
- current V2 source evidence where a replacement exists
- explicit acceptance criteria
- intended validation method
- current status
- validation evidence once verified

Browser-visible behavior requires browser evidence.

Performance behavior requires a repeatable measurement against the pinned
reference or an explicitly approved replacement budget.

## Updating The Matrix

When a capability changes:

1. update its current status honestly
2. preserve the original V1 evidence
3. add or update V2 evidence
4. run the declared validation
5. record the validation evidence
6. run `pnpm parity:validate`
7. update `docs/current-state.md` and `docs/work-ledger.md` for meaningful
   milestones

Do not mark rows `verified` merely because:

- TypeScript passes
- a component still exists
- a unit test covers a lower-level helper
- the UI looks similar in one screenshot

Parity means the real workflow behaves correctly and still feels like the
established product.
