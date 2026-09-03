# Autonomous Readiness CAL-01 — Independent Review

Status: accepted pre-terminal calibration review.

Reviewer: independent read-only checker (`/root/bootstrap_checker`).

## Review scope

The checker independently inspected the CAL-01 packet, active program item,
checkpoint runbook, Git identity, live lease and claim, and discoverable OS-06
evidence. It made no file, program, lease, or external-state mutation.

The adversarial review covered:

- use of the exact future scheduled prompt
- separation from the prior wake
- one-item and one-commit scope
- lease, claim, owner, branch, and starting-commit identity
- admission and exact-continuation behavior
- evidence-lane adequacy and reconstructability
- truthful cleanup and terminal-state claims
- continued human ownership of activation

## Finding and correction

The first review rejected the draft because it only hashed the whole runbook and
self-reported normalized admission outcomes. That was insufficient to
distinguish an exact-prompt fresh calibration wake from an ordinary continuation
of OS-06 or to falsify the packet's own skipped-high-load-stop scenario.

The packet now adds:

- the exact prompt section, starting-commit line span, byte count, first and last
  lines, and SHA-256 digest
- the prior OS-06 terminal commit, completion time, clean review time and digest,
  absent lease, and sole next-ready item
- a stable CAL-01 invocation identity anchored to its claim
- embedded normalized preflight snapshots for the high-load stop and later
  low-load claim, including repository identity, load classification, action,
  lease state, and candidate disposition
- an explicit statement that the desktop task-turn boundary, pre-claim
  timestamps, and original command streams are not cryptographically observable
  by the repository

The reviewer accepted the corrected packet without further findings.

## Independently verified facts

- At starting commit `3faf4b0e3d714de1963b0d4c0da6dd8e55ae7ac6`,
  runbook lines 107–129 including the final newline are 1,479 UTF-8 bytes and
  hash to
  `3b1a7fea7d435c10ec9c356ea83ca8e0ef6c4a05fcffda229af18e1722be531d`.
- OS-06 completed at `2026-09-03T21:37:22.421Z`. Its review packet was created
  at `2026-09-03T21:37:31.030Z`, hashes to
  `8f8b30700081a40bd1b41c1cc5fca3e513c95a6720ae9cbac29af4c891b51234`,
  and records a clean matching HEAD, no active lease, and CAL-01 as the sole
  ready item.
- The live CAL-01 program and lease state match owner `codex/root`, claim
  `ebb1fb7f-8c1a-4ddd-af57-0af63fd1608a`, lease
  `7ac5139e-76e7-49ef-9f29-51b7a2c63fba`, branch
  `codex/viz-engine-v2`, and the stated starting commit.
- Every contract-input hash and referenced OS-06 artifact present in the packet
  matches the discoverable file or immutable evidence object.
- The two normalized admission observations are internally consistent with the
  declared load threshold and unchanged pre-claim repository identity.
- The selected code-architecture and creative-human evidence lanes are
  proportionate because CAL-01 changes operating evidence, not runtime, editor,
  rendering, audio, media, or performance behavior.
- The packet does not imply ACT-01 approval, schedule creation, feature
  production, push authority, or any external mutation.

## Residual uncertainty

The repository cannot independently prove the Codex Desktop task-turn boundary
or exact preflight invocation times. The fresh-wake boundary and embedded
preflight snapshots remain supervised attestations anchored by the prior
terminal review and later machine-owned claim. This is irreducible with the
current app/repository interface and is represented as such rather than as
machine proof.

The review accepts the pre-terminal packet. Final CAL-01 acceptance remains
conditional on a passing identity-bound checkpoint, exactly one coherent local
commit, content-addressed admission of this packet and review, lease release,
clean repository and child-process state, and starting no second item in this
wake.
