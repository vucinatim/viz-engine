# Goal Five Certification Contract

The canonical machine-readable contract is
[goal-five-certification-matrix.json](./goal-five-certification-matrix.json).

It freezes Goal Five's terminal proof before flagship implementation can tune
itself to favorable results. The matrix maps every completion requirement to:

- one stable criterion ID
- one pinned environment and source-revision role
- one exact observation set
- one numeric, semantic, structural, diagnostic, or human decision rule
- one exact command or review workflow
- one named evaluator
- one durable artifact location

Validate the planning contract with:

```bash
pnpm goal5:criteria:validate
```

That command is part of `pnpm check:foundation`. It validates the normalized
environment, observation, decision, evaluator, artifact, status, and identity
references while allowing criteria that are honestly pending.

Final certification uses:

```bash
pnpm goal5:criteria:validate -- --final
```

Final mode rejects:

- an unresolved candidate commit
- any pending or failed mandatory criterion
- any planned harness
- a criterion without durable evidence
- an exclusion outside the four Gate 1-excludable breadth categories
- a candidate that is not an ancestor of the checked-out evidence commit
- non-documentation changes between candidate `C` and evidence commit `E`

`E` is resolved as the checked-out commit during final validation. The matrix
does not try to contain its own future Git hash.

## Frozen Protocols

The contract freezes:

- semantic equality fields and `1e-6` absolute/relative numeric tolerances
- decoded-frame SSIM and normalized mean-error tolerances
- one-frame decoded audio/video synchronization tolerance
- black, clipped-white, freeze, silence, discontinuity, and missing-resource
  detection rules
- 58 FPS flagship playback, 20 ms display p95, planning/CPU budgets, long-frame
  distribution, and graph-open comparison
- 1 ms transient and 32 ms visible interaction p95 with zero/one revision
  semantics
- 100 ms p95 and 250 ms maximum seek-to-visible budgets
- six-cycle lifecycle, 16 MiB forced-GC heap, and exact renderer-resource
  steady-state rules
- 1920 × 1080 quality-2 60 fps final output and minimum render throughput
- the existing stronger Light Tunnel performance floor
- clean network-disabled portable reopen and immutable `C`/documentation-only
  `E` rules

Exact act ranges, transition ranges, and review frames cannot honestly be
numeric before the music window exists. Their selection protocol is frozen
now; Gate 1 must materialize their exact frame numbers in the approved
treatment before deep implementation. Changing a frozen protocol later is
allowed only to correct a demonstrated invalid test, with an evidence note and
complete rerun of every affected criterion.

Planned commands are not claims that their harnesses exist. Each must become a
real canonical evaluator before its criterion can pass, and final mode enforces
that transition. Human criteria can pass only through explicit recorded review;
automated aesthetic scores are not substitutes.
