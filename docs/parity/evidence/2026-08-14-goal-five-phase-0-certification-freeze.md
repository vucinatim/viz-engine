# Goal Five Phase 0 Certification Freeze

Checkpoint ID and title: `G5-P0-CERTIFICATION-FREEZE` — immutable baseline,
executable criteria, and uncontended complete gate.

Status: passed at behavioral commit
`043f8dbae5f15828c5cba6c0b74f32cadb359946`.

Objective contribution: Goal Five now has an executable terminal-proof contract
whose environments, observations, decision rules, evaluators, criteria,
artifact locations, and immutable candidate/evidence roles were fixed before
flagship implementation can tune itself to favorable tests.

Canonical owner: the Goal Five certification contract and its validator.

Forbidden duplicate owners: checkpoint prose, chat history, production-local
code, UI-only state, ad hoc benchmark scripts, and undocumented reviewer
judgment.

Hypothesis: a normalized machine-readable matrix can express the complete
flagship acceptance surface without pretending that future production harnesses,
artifacts, candidate identity, or human approvals already exist.

Scope:

- freeze the activation identity and exact source metrics
- freeze seven execution/review environments
- freeze eleven observation protocols, fifteen decision rules, five evaluator
  classes, eight criterion categories, and forty-six stable criteria
- distinguish ready, planned, and human harnesses honestly
- validate both the planning state and the stricter final state
- make the validator part of the complete repository gate
- remove stale-server ambiguity from functional browser acceptance
- repair the audio playback observation without weakening its 700 ms window or
  playback threshold

Affected packages and files: repository foundation tools and tests, Playwright
configuration, audio browser acceptance, package scripts, Goal Five planning,
and parity documentation. No production runtime or editor behavior changed.

Affected parity rows: none. The existing 42-row V1/V2 parity matrix remains
fully verified; this checkpoint adds a separate Goal Five terminal-proof
contract.

Acceptance:

- structural: every matrix reference is normalized and validator-enforced
- behavioral: planning validation passes while final validation correctly
  rejects pending criteria, planned harnesses, missing evidence, unresolved
  candidate identity, invalid exclusions, and a non-documentation-only `C..E`
- visual: all 16 active browser journeys pass at the preserved 1440 × 900
  functional viewport; no new visual design claim is made
- deterministic: the activation baseline metrics reproduce directly from its
  immutable Git tree rather than the current worktree
- performance: the existing exact Light Tunnel fixed-device floor remains
  green in the complete browser aggregate
- cleanup: the fresh browser owns a unique port, never reuses an unknown
  server, is muted, and leaves no scoped process behind

Changes made:

- added
  [`goal-five-certification-matrix.json`](../goal-five-certification-matrix.json)
  and its human-readable
  [contract](../goal-five-certification.md)
- added a planning/final validator and regression fixtures
- extended source metrics with efficient historical-commit reads through one
  Git object batch
- captured the activation baseline in
  [`2026-08-13-goal-five-phase-0-baseline.json`](./artifacts/2026-08-13-goal-five-phase-0-baseline.json)
- made browser acceptance use a fresh muted server
- changed the audio workflow to wait for the exact selected media element to be
  genuinely playable, then independently observe audio-clock advance, browser
  animation frames, canonical transport frames, playback state, and the absence
  of durable project-store traffic

Validation commands and results:

- `pnpm goal5:criteria:validate` — passed; 46 pending criteria across all 8
  categories, with 6 ready, 27 planned, and 13 human harnesses
- `pnpm exec vitest run tests/foundation/goal-five-certification.test.ts tests/foundation/source-metrics.test.ts`
  — 2 files and 4 tests passed
- `pnpm metrics:source -- --commit 62322d30292974e15b29f87b833a78f9b30210c9`
  — reproduced 366 production files / 74,216 lines, 17 tool files / 3,002
  lines, 72 test files / 20,698 lines, 22 playground files / 3,139 lines,
  and 482 total code files / 101,286 lines
- focused audio acceptance repeated in five fresh Chromium runs — 5/5 passed
- `VIZ_BROWSER_PORT=4290 pnpm check:foundation` — passed uninterrupted: parity,
  Goal Five planning contract, architecture, format, lint, all typechecks, 67
  Vitest files / 304 tests, 16 active Chromium journeys with 3 intentional
  opt-in skips, all 18 package builds, Studio production build, built-consumer
  smoke, and creative-loop smoke
- `git diff --check` — passed

Browser observations: the first complete attempt exposed a false early sample:
the selected source URI had changed, but the media element had not yet buffered
future data. That attempt was retained as a failed observation. The test now
waits for the exact decoded URI, finite duration, and
`HTMLMediaElement.HAVE_FUTURE_DATA`; it keeps the original measurement window
and frame threshold and adds independent clocks so a stalled transport cannot
pass accidentally. The repaired test passed five fresh isolated repetitions and
the subsequent complete aggregate.

Measurements: the complete browser aggregate passed 16 active journeys in
6.2 minutes. The activation source metrics and all frozen numeric budgets are
machine-readable in the linked artifacts and matrix; this checkpoint does not
invent flagship measurements before the flagship exists.

Artifacts:

- `docs/parity/goal-five-certification-matrix.json`
- `docs/parity/evidence/artifacts/2026-08-13-goal-five-phase-0-baseline.json`
- Playwright traces remain failure-only and no failed trace is promoted as
  certification evidence

Diff and deletion review: the checkpoint adds a deliberately explicit data
contract rather than production abstraction. Repeated environments, rules,
observations, and evaluators are referenced by ID instead of copied into 46
criteria. The historical source reader was reduced from one Git process per
file to one tree read and one object batch. No compatibility layer, runtime
owner, test-only product path, timeout increase, or memoization blanket was
introduced.

Known limitations: 27 production evaluators still have planned harnesses, 13
criteria require real human decisions, all flagship artifacts remain pending,
and final validation must remain red until candidate `C` and documentation-only
evidence commit `E` genuinely exist. Phase 0 certifies the proof contract and
baseline, not the future production.

Human gate: none for this checkpoint. Goal Five is paused at the Phase 0
boundary so the autonomous loop operating model can be agreed before Phase 1;
the next creative approval remains Gate 1 treatment approval.

Commit: behavioral checkpoint
`043f8dbae5f15828c5cba6c0b74f32cadb359946`; this record is committed
documentation-only afterward.

Next checkpoint: after agreeing on the loop, perform the bounded Phase 1
capability, authorized-asset, and music-window audit and prepare the production
treatment for Gate 1.
