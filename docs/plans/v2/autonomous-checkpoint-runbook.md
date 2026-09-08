# Autonomous Checkpoint Runbook

Status: activated for VizEngine V2 branch development after supervised
calibration and explicit `ACT-01` approval.

This runbook is the exact operational entrypoint for every unattended VizEngine
checkpoint. It is subordinate to the
[Goal Five program](./flagship-autonomous-production-and-creative-system-maturation.md),
the
[autonomous sensory feedback operating system](./goal-five-autonomous-sensory-feedback-operating-system.md),
and the tracked active-program pointer at
`tools/repo/programs/active-program.json`. After the approved Gate 1 handoff,
the pointer selects the immutable production-foundation successor program. That
program contains no routine human checkpoints: former Gates 2 through 5 are
evidence-backed autonomous calibration milestones.

## Authority Boundary

The run may read and mutate repository state only after the maintainer CLI
grants an exact claim. It may create one coherent commit and, once that
checkpoint is complete and verified, fast-forward push its exact terminal
commit to the same-named `origin` branch when the branch matches the active
program's declared target and is neither `main` nor `master`.

This is an effect boundary, not a tool restriction. The agent may use `git`,
`gh`, repository CLIs, browsers, package commands, and other ordinary
development tools within this authority. Repository-specific tools remain
canonical only for the product and execution state they actually own.

Push safety comes from rechecking the exact terminal identity, pushing that
literal commit without force, and Git's atomic fast-forward update. If another
actor advances the remote between fetch and push, the server rejects the stale
update. VizEngine must not duplicate this behavior with a bespoke Git wrapper
or extend its local execution mutex across a network operation.

The run may never force-push, merge, open or merge a PR, tag, deploy, publish,
purchase, modify a production system or another external system, open visible
applications, or play audio. Remote divergence or push failure is a truthful
stop; it never authorizes merge, rebase, retry by force, or another checkpoint.

`human resolve` is an audit-recording command, not a cryptographic proof of
who invoked it. An autonomous run must never call it from its own judgment or
from an earlier inferred preference. It may be called only while carrying an
explicit, contemporaneous human instruction naming the decision. At an
unresolved human checkpoint the correct autonomous action is to emit the
review packet and exit without mutation.

The 2026-09-06 Human Signal decision delegates all reversible local decisions
inside the documented engine horizon. A run must not create a human checkpoint
for creative refinement, architecture, dependencies, editor UX, renderers,
tools, tests, files/assets, exports, or implementation-language choices it can
resolve with evidence. It stops only at the external, commercial, platform,
material north-star, intentional-regression, or unsafe-user-work boundary.

## Recovery Before Reading Operational State

Run:

```bash
pnpm --silent run repo -- run preflight --json
```

The preflight takes a coherent state snapshot behind the Git-common
operational mutex. Follow exactly one reported action:

Its `externalMutationAllowed: false` quiet-environment value governs the claimed
implementation phase. The narrow branch push authority begins only after the
item has completed, ownership has been released, and the terminal identity has
been reverified.

- `wait-operational-lock`: another live run owns a state transition; exit
  without mutation.
- `wait-writer-lease`: another live run owns the work-item lease; a fresh wake
  exits without mutation. Never copy its identity into a new wake.
- `recover-operational-lock`: recover only the exact reported local host and
  dead PID with `state recover-mutex`, then rerun preflight.
- `recover-transition`: roll back only the exact reported transition ID with
  `state recover-transition`, then rerun preflight.
- `recover-expired`: recover the exact program, work item, owner, claim, and
  lease identities; never discard or rewrite the diff.
- `finalize-terminal`: release the exact stranded terminal lease only after
  its recorded Git identity still matches.
- `continue`: continue only after an in-process compaction or deliberate resume
  of the same run. Rerun preflight with all four previously recorded values:
  `--lease-id <id> --owner <owner> --work-item-id <id> --claim-id <id>`.
  Supplying only some values fails; a fresh scheduled wake never invents or
  borrows them.
- `resume-blocked`: resume only through the exact per-claim marker and declared
  recovery evidence.
- `claim`: inspect and claim one dependency-ready autonomous item.
- `human-checkpoint` or `stop`: exit cleanly and report why.

Do not read a partially transitioned program, infer recovery identities, clean
the worktree, or acquire a replacement lease around the state machine.

If an active run enqueues a human question that blocks its current item, its
only permitted work-item mutation is to block that item and release ownership.
Checkpoint and completion fail closed. If the process dies in that narrow
window, recover the exact expired lease first, then record the block; do not
continue implementation. Rejected or changes-requested decisions never permit
unblocking. An approved decision must be supplied as exact program-scoped
`decision:<program-id>/<human-item-id>` recovery evidence.

## One-Checkpoint Protocol

1. Read `AGENTS.md`, the compounding vision, current state, active Goal Five
   plan, operating-system plan, autonomous compass, affected specs, and actual
   Git state.
2. Run preflight and obey its exact action.
3. Inspect the selected item and claim exactly one autonomous item.
4. State the observable outcome, canonical owner, forbidden owners,
   assumptions, evidence lanes, plausible false pass, acceptance, and any
   irreducibly human judgment.
5. Improve an observation only when the item cannot otherwise be proven.
6. Implement one primary conceptual axis through canonical product boundaries.
7. Run focused checks during work. Use headless, muted, isolated browser proof
   only when the claimed evidence lane requires it.
8. Canonicalize the active diff and request read-only semantic canonicalizer
   and checker reviews at architecture-bearing checkpoints.
9. Run the required checkpoint stage and retain its identity-bound record.
10. Review the complete diff, commit exactly one coherent checkpoint, and
    complete the item with every typed evidence requirement. If acceptance is
    not met, block truthfully with its exact recovery condition.
11. Create a review packet, verify the lease is released, and stop every scoped
    server, browser, encoder, and child process.
12. Re-read the terminal identity and clean state, fetch `origin`, and confirm
    that the destination is the same-named active target branch, is not
    `main` or `master`, and can advance by fast-forward. Use an ordinary
    non-force Git push of the literal terminal commit and verify the remote ref
    afterward. On divergence or failure, stop without merge, rebase, force, or
    history rewriting.
13. While the authorized night window remains open, re-read preflight and claim
    the next dependency-ready item. At 08:00 preserve and release any unfinished
    work through the exact recovery procedure. A later wake starts from repository
    truth afresh.

Completion accepts exactly one commit descended directly from the claim's
starting commit. Check evidence is admitted against the current canonical plan,
claim, lease, program definition, changed bytes, and terminal commit. Once
admitted, its immutable content-addressed copy is validated by its recorded
historical plan rather than reinterpreted by future tooling.

In the exact prompt below, “release ownership” names the terminal invariant,
not a later release command. After the commit, `program complete` admits the
typed evidence and atomically releases the lease; the run then creates its
review packet and verifies that release before stopping.

## Exact Scheduled Prompt

```text
Advance VizEngine through successive dependency-ready autonomous checkpoints
from 01:00 until 08:00 Europe/Ljubljana in this same task, using
docs/plans/v2/autonomous-checkpoint-runbook.md as the exact operating contract.
Begin with `pnpm --silent run repo -- run preflight --json` against the tracked
active program and obey its
reported action; never bypass, guess, or silently repair operational state.
Recover product direction from repository docs, not chat memory. Claim before
editing, keep one primary conceptual axis, preserve the V1 UX/performance floor
and canonical V2 project/session/runtime boundaries, and build only
end-state-compatible code.

Proceed autonomously through every reversible local creative, architecture,
dependency, editor, renderer, tooling, validation, asset/file, export, and
implementation-language decision inside the active engine-completion program.
Use evidence and bounded experiments to resolve uncertainty; do not invent a
human gate for those decisions. Stop only before hosted-platform or production
Magnify work, monetization or commercial policy, an external mutation, a
material north-star change, an intentional regression, or unsafe overlap with
ambiguous user work.

The certification matrix and sensory map distinguish delegated independent
review from the preserved Gate 1 human decision. Apply the typed inspection
contract in docs/parity/goal-five-delegated-review.md. Preserve the completed
EC-01 authority decision and predecessor evidence; do not replay it in a successor.

Remain quiet: no visible applications, no audio, no reused server, and one
heavy process at a time. Use normal development tools freely within this
authority; repository CLIs are canonical only for the state they own. Never
merge, open or merge a PR, force-push, tag, deploy, publish, purchase, touch
production systems, or mutate another external system. Never invoke `human
resolve` without an explicit contemporaneous human instruction naming that
decision. At the documented horizon boundary, unsafe state, live owner, or
empty ready queue, make no speculative mutation and exit truthfully.

Use the sensory adequacy gate, focused feedback, diff-scoped canonicalization,
independent read-only review, and the required staged check. Complete only with
all typed evidence and exactly one coherent local commit; otherwise block with
an exact recovery condition. Create a review packet, release ownership, and stop
all scoped children. Only then, re-read repository state and use an ordinary
non-force Git push to advance the same-named `origin` branch to the literal
verified terminal commit when it matches the active program's declared non-main
target; verify the remote ref. On divergence or failure, never merge, rebase,
force, or rewrite history. Report the checkpoint, evidence, push result,
remaining uncertainty, and next dependency-ready item when meaningful. Re-read
preflight and continue with the next ready item while the night window remains
open. Check the actual clock; advisory estimates never justify refusing useful
work. At 08:00 checkpoint and block unfinished work with an exact recovery
condition, release ownership and stop scoped processes.
```

## Calibration And Activation

The prompt must complete three supervised fresh-start runs (`CAL-01` through
`CAL-03`). Each run is reviewed for scope selection, ownership, evidence,
recovery, cleanup, and truthful stopping. Recurrence remains disabled through
those runs. Only the product owner's explicit `ACT-01` decision may authorize
creation of the schedule. A rejected or changes-requested decision leaves
`ACT-01` pending and recurrence disabled; it is not a terminal program result.

Each calibration packet must make its invocation boundary as reconstructable as
the available authority permits. Record the exact prompt source and digest, the
prior wake's terminal commit and review packet, the fresh preflight outcome, and
the resulting claim and lease identities. Retain raw preflight output when the
host exposes it durably; otherwise embed a normalized snapshot and label it as
supervised evidence. The repository must not invent a cryptographic task or
turn identity that belongs to the host application. Any host-only boundary or
timestamp, copied observation, or process and external-effect cleanup claim is
an explicit supervised attestation unless a canonical artifact proves it. Git,
program, lease, check, commit, evidence, and cleanup facts backed by canonical
repository records remain machine-verifiable.

The active-program cutover is one reviewed `ACT-01` commit with an exact
handoff:

1. claim `ACT-01` explicitly against the readiness program using `--program`
2. create the immutable successor program and switch the tracked pointer in
   that same commit
3. run every pre-commit command against the readiness program explicitly
4. after the commit, complete `ACT-01` using that same explicit readiness-program
   path; completion atomically releases its lease
5. create and verify the old-program post-commit review
6. only then allow a fresh default preflight to select the successor

No default-program mutation may run between the pointer-switch commit and the
old lease's completion. Recovery in that interval must use the exact recorded
readiness-program identity; it must never infer ownership from the new pointer.

The product owner's 2026-09-07 amendment authorizes one daily 01:00 wake in
the same Codex task, working successively until 08:00 `Europe/Ljubljana`.
Check actual local time at major boundaries. Claims remain sequential and each
checkpoint retains its own exact evidence, commit and lease release, but a run
may claim the next dependency-ready item after closure. Do not reject useful
work because an advisory estimate exceeds the remaining window. There is no
07:30 wind-down cutoff or one-checkpoint-per-wake limit.

At 08:00 preserve incomplete work through the exact checkpoint/block recovery
procedure, release ownership and stop scoped processes. A later wake still
exits read-only when another valid writer owns the lease. Never borrow another
run's identity, discard work for the clock, or report incomplete work complete.
Explicit daytime user requests are separately authorized interactive work.
Host schedule state remains app-owned.
