# Autonomous Readiness CAL-03 — Activation Audit

Status: activation-ready candidate after CAL-03 terminal admission; recurring
execution remains disabled pending explicit product-owner `ACT-01` approval.

## Decision in one sentence

The repository is ready for a monitored autonomous rollout under the exact
local-only contract below, but it is not authorized to create or run the
schedule until the product owner explicitly approves `ACT-01` in the Codex
task.

## Scope and authority

This audit covers the autonomous operating system beneath Goal Five. It does
not resume Goal Five feature production, approve a creative treatment, push,
merge, deploy, publish, purchase, mutate an external service, or authorize work
outside the V2 branch.

The activation decision is irreducibly human. The repository command
`human resolve` only records a contemporaneous human instruction; it cannot
manufacture one. CAL-03 therefore queues the exact decision and stops.

## Activation acceptance

| #   | Condition                                           | Result                        | Authoritative evidence                                                                                                                                                                                                                                                                                                           |
| --- | --------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Operating model and assumptions approved            | Pass                          | Approved operating-system plan and approval commit `892750196d4ee7abcd43da2b7ea6037575c736ed`                                                                                                                                                                                                                                    |
| 2   | Exact checkout ownership policy selected            | Pass                          | Reserved autonomous checkout during scheduled windows; concurrent human work uses another worktree                                                                                                                                                                                                                               |
| 3   | Completed Phase 0 commits durably available         | Pass                          | Baseline `b2b23b577feda29ef7eca9dcbf35a4e8c1162781`, implementation `82c1cd7958fbb99f71b4f7f41519691f81db95bc`, and certification `043f8dbae5f15828c5cba6c0b74f32cadb359946` are present and ancestors of CAL-03's starting commit                                                                                               |
| 4   | Status documentation agrees                         | Pass candidate                | README, docs index, current state, operating plan, runbook, and work ledger all state that readiness and supervised calibration are complete while recurrence and Goal Five Phase 1 remain disabled pending `ACT-01`                                                                                                             |
| 5   | Machine execution schema and initial items validate | Pass                          | Active readiness definition `2691c5b854b8f5262f969fc893f8f448901464b46b5d1adcdc8f518675fe640c` validates; CAL-03 is the final autonomous item and ACT-01 is human-only                                                                                                                                                           |
| 6   | Atomic ownership and stale recovery tested          | Pass                          | OS-03 recovery evidence plus OS-06 failure rehearsal cover sole-writer ownership, exact continuation, stale lease, mutex, interrupted transition, dirty-tree refusal, and cleanup behavior                                                                                                                                       |
| 7   | All 46 criteria have honest observation ownership   | Pass                          | The strict sensory map validates 46 of 46 criteria as existing, planned, or explicitly human-owned; it does not claim future harnesses already exist                                                                                                                                                                             |
| 8   | Manual exact-prompt rehearsal terminates coherently | Pass                          | CAL-01 used the exact scheduled prompt and completed at `5407ffee613570b26ef3a0deb7e78d0ecbc8b4b3` with packet `17fb3be285daad24f279212df3a358a62a49a78eb47dfbdb9d537583a57b7bb4`, independent review, released ownership, clean Git state, and no external mutation                                                             |
| 9   | Three pre-activation exact-prompt supervised runs   | Pass after terminal admission | CAL-01 and CAL-02 are complete and independently reviewed. This CAL-03 packet, certification record, single commit, completion transition, post-commit review, lease release, and clean terminal state provide the third proof. Until those terminal facts exist, this row remains a candidate rather than a claim of completion |
| 10  | Pause mechanism and review cadence agreed           | Pass                          | The scheduler can be paused, unsafe or human-owned work exits without mutation, human overlap pauses the schedule, and review packets are consolidated every 48–72 hours                                                                                                                                                         |

## Supporting system audit

| Boundary                              | Result | Notes                                                                                                                                                                                                      |
| ------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Durable direction                     | Pass   | The compounding vision, active Goal Five plan, current state, operating contract, runbook, and active-program pointer replace chat memory as authority                                                     |
| Work selection                        | Pass   | One immutable program defines dependencies, authority, acceptance, evidence types, and ready work; one wake may claim at most one item                                                                     |
| Sole-writer safety                    | Pass   | Program- and branch-scoped Git-common state, an atomic lease, exact claim identity, operational mutex, crash journal, and fail-closed admission prevent competing mutation                                 |
| Recovery across compaction or restart | Pass   | Exact lease, owner, work item, and claim identities are required for continuation; fresh wakes cannot borrow them                                                                                          |
| Validation discipline                 | Pass   | Fast, focused, checkpoint, integration, and certification stages separate inner-loop speed from broad claims; admitted check evidence is identity-bound                                                    |
| Sensory coverage                      | Pass   | The 46-criterion map states which observations exist now, which are planned, and which remain human; runtime, editor, graph, audio, render, export, performance, and creative review retain distinct lanes |
| Evidence and review                   | Pass   | Evidence is content-addressed, terminal requirements are typed, review packets bind Git/program/check identity, and semantic checker/canonicalizer roles remain read-only                                  |
| Quiet operation                       | Pass   | The runbook requires no visible apps, no audible playback, isolated muted headless browser use, one heavy process at a time, and scoped child cleanup                                                      |
| Human checkpoints                     | Pass   | Human questions retain recommendation, alternatives, safe/prohibited work, blocking scope, and append-only decisions; autonomous runs cannot approve them                                                  |
| Cross-agent consistency               | Pass   | `AGENTS.md`, `CLAUDE.md`, shared role contracts, and Codex specialist definitions point agents at the same canonical repository semantics                                                                  |

## Three-run calibration chain

| Run    | Terminal commit                            | Required evidence                                                                                                                                                | Post-commit review                                                 |
| ------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| CAL-01 | `5407ffee613570b26ef3a0deb7e78d0ecbc8b4b3` | Packet `17fb3be285daad24f279212df3a358a62a49a78eb47dfbdb9d537583a57b7bb4`; independent review `bd6dc27fa06a459a6ea3009a81386c9a17182882e28b6ce01b24e46be43fc0a4` | `c82afdfcd3d9a8044b97f672dc80e5d3854f895a95545d086c8d5bd9a0da6007` |
| CAL-02 | `90a909a675366c61980e3e9748a8888bfef7b61d` | Packet `3c5705bc200017442feed304ab9e568e4368d16a4868e15c8be1b9dcd2802c23`; friction review `6827268cb1caff540c089288951ea05cea714fa4311d2b0d20140a7809b54219`    | `a112bf75dd0cd783cd4f6b354f912712414fc76f88124fb49e3b701427fb7830` |
| CAL-03 | This audit's terminal commit               | CAL-03 packet and this activation audit are admitted as typed, content-addressed evidence                                                                        | Created only after CAL-03 completes and releases its lease         |

The exact scheduled prompt is unchanged across all three runs: runbook lines
107–129 at CAL-03's starting commit contain 1,479 UTF-8 bytes including the
final newline and hash to
`3b1a7fea7d435c10ec9c356ea83ca8e0ef6c4a05fcffda229af18e1722be531d`.

## Reviewed schedule proposal

Timezone: `Europe/Ljubljana`.

| Wake    | Local start |    Available capacity | Required terminal behavior                                       |
| ------- | ----------: | --------------------: | ---------------------------------------------------------------- |
| Night 1 |       20:00 | approximately 3 hours | One item or clean no-op, then evidence and cleanup               |
| Night 2 |       23:15 | approximately 3 hours | Fresh recovery; refuse overlap if the earlier lease remains live |
| Night 3 |       02:30 | approximately 3 hours | Fresh recovery; one heavy process maximum                        |
| Night 4 |       05:45 | approximately 3 hours | Finish before daytime human work; stop at any human gate         |

The 15-minute planned gaps are cleanup and overrun buffers, not enforced runtime
cutoffs. Twelve hours is available capacity, not an activity quota. No ready
work, unsafe load, uncertain direction, a live owner, or a human checkpoint
produces a truthful no-op exit; a later wake refuses mutation if an overrun
still owns the lease. The schedule is paused whenever the product owner is
actively using this checkout, and the first unattended week is a monitored
rollout with a consolidated review every 48–72 hours.

Official Codex automation documentation confirms the host capabilities this
proposal relies on: scheduled tasks can run in the background against local
projects or worktrees; same-chat tasks resume existing context; and local tasks
require the computer and Codex app to remain on. See
<https://learn.chatgpt.com/docs/automations>. These host capabilities do not
override the repository lease or grant product authority.

A read-only search of the local Codex automation definitions at CAL-03 start
found zero VizEngine or Goal Five schedule matches. This is supervised host
evidence, not a repository-owned cryptographic fact. No schedule was created or
modified during CAL-03.

## Activation and handoff contract

If, and only if, the product owner explicitly approves `ACT-01`, the next
bounded checkpoint is one reviewed handoff commit:

1. record the human decision in the readiness program
2. claim `ACT-01` against `tools/repo/programs/autonomous-readiness.json`
   explicitly
3. create the immutable Goal Five production program and switch
   `tools/repo/programs/active-program.json` in the same commit
4. run every pre-commit operation against the readiness program explicitly
5. complete `ACT-01` against that program, atomically releasing its lease
6. create and verify the old-program post-commit review
7. only after that review confirms release, let a fresh default preflight select
   the successor
8. create the reviewed local recurring automation with the exact prompt and
   schedule above

No default-program mutation may occur between pointer switch and old-lease
release. A crash in that interval recovers only through the exact readiness
program identity.

## Residual uncertainty and rollout controls

- Codex Desktop does not expose a cryptographic task-turn identity to the
  repository. Fresh-turn boundaries are supervised attestations anchored by
  machine-verifiable Git, program, claim, lease, check, evidence, and review
  facts.
- The calibrations are deliberately short evidence/control-plane checkpoints.
  They prove operating invariants, not that every future multi-hour production
  task will be defect-free. Lease expiry, staged validation, resource admission,
  human gates, and the monitored first week bound that residual risk.
- Headed aesthetic quality, intended-audio listening, and genuinely subjective
  product judgment remain coordinated human observations rather than fabricated
  autonomous confidence.
- Exact wake duration is capacity. The app scheduler wakes the task; the
  repository contract decides whether work may start or must stop.

## Recommendation

Approve `ACT-01` only if the exact four-window proposal, local-only authority,
reserved-checkout policy, monitored first week, and 48–72-hour review cadence
match the desired operating arrangement. Reject or request changes otherwise;
either outcome leaves recurrence disabled and Goal Five Phase 1 paused.
