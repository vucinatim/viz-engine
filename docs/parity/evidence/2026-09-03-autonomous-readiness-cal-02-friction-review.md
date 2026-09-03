# Autonomous Readiness CAL-02 — Friction Review

Status: proposed for independent review.

## Outcome under review

CAL-02 began from CAL-01's clean terminal commit with no writer lease and used a
fresh preflight without CAL-01 continuation identity. The preflight selected
CAL-02 as the sole dependency-ready autonomous item, and the atomic claim issued
a new claim and lease. This is a second independent traversal of the recovery,
admission, and ownership boundary rather than a continuation of the first
calibration item.

The only proposed operating-contract change is a calibration-provenance
paragraph in the canonical checkpoint runbook. It requires future calibration
packets to identify the exact prompt, prior terminal review, fresh preflight,
claim, and lease while explicitly distinguishing host-supervised facts from
machine-verifiable repository facts.

## Real friction observed

CAL-01 exposed two related evidence-assembly weaknesses:

1. Its first draft copied one discoverable review-packet hash incorrectly. The
   local content-hash check caught and corrected the value before acceptance.
   Independent semantic review then reverified the nested claim. Typed terminal
   evidence freezes and validates the final packet bytes and reference; it does
   not interpret nested fields. Together these existing layers are sufficient,
   so the error did not justify another hash or artifact subsystem.
2. Its first draft hashed the whole runbook but did not bind the exact fenced
   prompt or identify the prior terminal boundary. An independent checker
   correctly rejected the draft because a reader could not distinguish a fresh
   exact-prompt wake from an ordinary continuation. The corrected CAL-01 packet
   recorded the strongest available boundary and disclosed the remaining
   supervised attestation.

The second issue is durable operating knowledge and belongs in the runbook. The
first issue is adequately guarded by existing content-addressed evidence and
review; adding more machinery would duplicate authority.

## Changes deliberately rejected

- **Synthetic desktop identity:** the repository cannot observe or certify a
  Codex Desktop task-turn identifier. Inventing one would create false assurance
  and move host authority into repository data.
- **Durable mutation on denied preflight:** a high-load, live-writer,
  unsafe-state, or human-gate preflight may hold the transient operational mutex
  for a coherent snapshot but must leave no durable program, lease, worktree, or
  external mutation. Persisting a receipt from that path would weaken the
  boundary it is proving.
- **Parallel event log:** the program, lease, resume marker, staged-check record,
  immutable evidence store, and review packet already own the machine lifecycle.
  A calibration-only logger would be duplicate state with new retention and
  recovery failure modes.
- **Product instrumentation:** no runtime, editor, renderer, graph, audio, media,
  performance, or project semantic changed in this checkpoint. Product sensors
  cannot strengthen evidence about a host/repository invocation boundary.

## Why the runbook addition is justified

The addition converts an independently discovered review criterion into durable
procedure without changing the exact scheduled prompt or creating another
system. It also prevents future agents from claiming machine proof for a fact
owned by the host application. This remains valid after activation: repository
identities are verified mechanically, host-only boundaries are labeled, and
human activation stays explicit.

## Assumptions and residual uncertainty

- The supervised goal continuation is a fresh Codex task turn. The repository
  can prove the clean commit before it and the distinct claim after it, but not
  cryptographically prove the task-turn boundary itself.
- The captured fresh preflight is embedded as a normalized snapshot because the
  read-only command has no durable timestamped artifact. This limitation is
  explicit rather than hidden.
- Recurrence remains disabled and ACT-01 remains human-owned.
- No push, deployment, production mutation, or non-V2 work is authorized.

CAL-02 should be accepted only after an independent reviewer confirms this
classification and scope, the identity-bound checkpoint passes, one coherent
local commit is admitted, ownership is released, cleanup is verified, and no
second work item begins in this wake.
