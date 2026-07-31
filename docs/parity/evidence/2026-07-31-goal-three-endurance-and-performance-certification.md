# Goal Three Endurance And Performance Certification

Date: 2026-07-31

Status: verified checkpoint for canonical live preview, playback smoothness,
whole-editor responsiveness, and bounded long-session resources. All 42 parity
rows are now verified. Goal Three remains open for agent workflow calibration
and the second original production.

## Architecture Under Test

The certification measures the architecture rather than adding a parallel
performance mode:

```text
canonical VizSession + live overlays -> one runtime preview plan
                                      -> one retained Three controller
                                      -> one canvas / WebGL context

pointer-rate interaction -> narrow imperative presentation
gesture end              -> one canonical/history commit

inspection -> read-only session, renderer, audio, subscriber, and DOM counts
```

The new inspection surface delegates to existing owners. It does not mirror
resource state into React or introduce another lifecycle authority.

## Repeatable Endurance Workload

`pnpm benchmark:endurance` runs headed Chromium at 1600 × 1000, DPR 1, with
trace and video disabled and explicit garbage collection available. One warm-up
cycle establishes caches, followed by six measured cycles. Every cycle performs:

- bundled audio next and previous
- layer duplicate and delete
- Rhythm Lab open and close
- profiler open and close
- Stage Scene creation, four bundled model leases, playback, and deletion
- Signal Cathedral import, live graph open, playback, and close
- simple three-layer project reopen

Before and after the cycles, the harness uses a three-second warm-up and
five-second measured playback window. It also samples real pixels so a fast
blank or frozen canvas cannot pass.

The complete machine-readable result is retained in
[the editor endurance report](./artifacts/2026-07-31-goal-three-v2-editor-endurance.json).

## Resource And Heap Result

After the warm-up, every measured cycle and the final snapshot had exactly the
same renderer inventory:

| Resource                               | Stable count |
| -------------------------------------- | -----------: |
| Runtime layers                         |            3 |
| Retained component programs            |            1 |
| Cached image textures / pending loads  |        0 / 0 |
| Cached model resources / active leases |        4 / 0 |
| WebGL geometries / textures            |        6 / 9 |
| Shader programs                        |            7 |
| Render targets                         |            5 |

The four decoded Stage models deliberately remain as a bounded renderer cache;
their active reference count returns to zero after every Stage deletion.

The subscriber inventory also remained exact across all snapshots:

| Subscriber owner       | Stable count |
| ---------------------- | -----------: |
| Audio presentation     |            4 |
| Transport presentation |            3 |
| Rhythm selection       |            1 |
| Runtime inspection     |            1 |
| Runtime invalidation   |            1 |

Audio returned to one running context topology with one analyser, gain,
media-element source, decoded buffer, and no capture stream. DOM ownership
returned to one runtime canvas, one audio element, one intentionally retained
hidden graph overlay, and no profiler surface.

Forced-GC used heap rose from 115,936,345 to 127,278,099 bytes: 11.34 MB of
growth and range, inside the explicit 32 MB growth and 64 MB range budgets.
This edit-heavy evidence complements the earlier 180-second playback soak,
which crossed the complete bundled audio loop.

## Playback And Visible Correctness

The end-of-run steady playback window recorded:

| Metric               |   Result |
| -------------------- | -------: |
| Display median       | 13.90 ms |
| Display p95          | 21.50 ms |
| Display p99          | 27.30 ms |
| Display maximum      | 28.60 ms |
| Intervals over 25 ms |  7 / 355 |

The p95 remains inside the 25 ms fixed-device diagnostic budget. Tail intervals
are retained rather than hidden. The final canvas had all 2,304 sampled pixels
visible and a different fingerprint from the pre-sample frame.

The immutable pinned-V1 comparison remains the baseline-relative proof for the
same simple three-layer, three-graph, audio-backed fixture. V2 passed all 21
comparison checks at 119.899 mean FPS and 9.900 ms frame-time p95, against V1's
74.915 FPS and 17.600 ms p95.

Signal Cathedral separately records an 18-node graph at 15.40 ms median and
23.30 ms p95 canonical runtime cadence. Stage with real animated FBX characters
is exercised on every endurance cycle and returns its model leases and WebGL
resources to the warmed steady state.

## Whole-Editor Responsiveness

The fixed-device evidence now covers all primary continuous interaction
families under representative load:

| Interaction                              | p95 visible/update interval |
| ---------------------------------------- | --------------------------: |
| Generic parameter input to visible frame |                     9.00 ms |
| Signal Cathedral node movement           |                    11.60 ms |
| Graph pan / zoom                         |             2.00 / 12.30 ms |
| Waveform live selection                  |                     9.20 ms |
| Audio volume live update                 |                    15.10 ms |
| Workspace resize                         |                    12.80 ms |

All live parameter samples produced zero canonical revisions before release
and exactly one revision on release. Graph pan/zoom and waveform presentation
remain outside project history. Runtime signals and debug values publish
through narrow imperative subscribers rather than runtime-cadence React state.

## Parity Result

The final four rows advance to `verified`:

- `preview.live-rendering`
- `performance.playback-smoothness`
- `performance.editor-responsiveness`
- `performance.long-session-stability`

The parity matrix now contains 42 verified capabilities, with zero partial,
gap, or unaudited rows.

## Validation

Passed during this checkpoint:

- two-cycle endurance calibration
- six-cycle fixed-device endurance certification in 1.1 minutes
- complete `pnpm check:foundation` gate:
  - 42 valid parity rows, all verified
  - clean dependency architecture, formatting, lint, and all type checks
  - 62 Vitest files and 283 deterministic tests
  - all 16 active headed Chromium journeys passed and the two opt-in
    performance journeys skipped in the ordinary gate
  - all 17 package builds, the studio production build, the packed-consumer
    smoke, and the creative-loop smoke
- prior controlled V1/V2 comparison, 180-second playback soak, Signal
  Cathedral graph benchmark, interaction benchmarks, and headed browser
  workflows referenced above

The final browser run also replaced a lossy `requestAnimationFrame` poll in the
loop-boundary journey with the canonical transport subscription. Under
full-suite load the old poll could miss the synchronous frame-zero state even
though the loop occurred; the subscription preserves the strict loop assertion
without relying on a minimum media-clock rate.

## Assumptions And Boundaries

- Bounded stability is evidence over the explicit workload, not a mathematical
  claim that an arbitrary infinite session cannot leak.
- The warmed model cache is intentional. Unbounded accumulation of distinct
  external models remains a future cache-policy concern if real workloads
  demonstrate it; repeated use of the supported bundled Stage assets is stable.
- Subscriber counts cover VizEngine-owned singleton presentation/runtime
  channels. Browser-internal listeners are not enumerable, so their teardown is
  additionally exercised through repeated panel/project mount cycles and stable
  DOM ownership.
- The 28.60 ms maximum playback interval remains visible in the report. The
  approved boundary is p95, not a claim that every display interval is below
  25 ms.
- Goal Three still requires a second original production and its own final
  performance rerun. That creative completion requirement is broader than V1
  product parity and does not reopen these established parity rows unless it
  finds a regression.
- The known FBXLoader warnings describe preparation limitations in the bundled
  legacy assets. The harness filters only those exact warnings; production
  diagnostics are not globally suppressed.
