# Claude Workflow Contract

Claude follows [AGENTS.md](./AGENTS.md) and the same canonical repository path
as every other agent. This file adds no alternate product, runtime, validation,
or execution semantics.

## Recovery

Before repository work:

```bash
pnpm run repo -- --help
pnpm --silent run repo -- run preflight --json
pnpm --silent run repo -- program status --json
pnpm --silent run repo -- program next --json
```

Read the recovery documents in `AGENTS.md`, inspect Git state, and claim one
dependency-ready autonomous work item before editing. If preflight reports
`wait-writer-lease`, a fresh wake exits read-only. Only the same run after
compaction may request `continue`, and it must pass all four previously recorded
lease, owner, work-item, and claim values back to `run preflight`. Use exact
stale-lease recovery rather than inventing another lock or discarding dirty
state.

If preflight reports an operational mutex or interrupted transition, use
`state status`, recover only a proven-dead owner with its exact host/PID, then
roll back only the exact transition ID. Exit without mutation for a live or
unprovable owner. Never read or repair a half-transitioned snapshot manually.

## Product And Repository Boundaries

- Use `pnpm viz` for canonical Viz project/session/bundle/render operations.
- Use `pnpm run repo --` for execution state, ownership, checks,
  canonicalization, sensory coverage, review packets, and human questions.
- Keep editor and agent mutations on the same product contracts.
- Do not add agent-only scene semantics or a generic sensor framework.
- Use ordinary tools such as `git`, `gh`, browsers, and package commands freely
  within the granted authority. Repository CLIs own repository-specific state;
  they are not mandatory wrappers around general-purpose capabilities.
- After completing and verifying a checkpoint, fast-forward push only its exact
  terminal commit to the same-named `origin` branch matching the active
  program's declared non-`main`/non-`master` target. The tool used is not part of
  the contract. Never force-push, merge, open or merge a PR, tag, publish,
  deploy to or mutate production systems, rebase divergence, or push another
  branch.
- Never call `human resolve` without an explicit contemporaneous human
  instruction naming that decision; an unresolved human checkpoint is a clean
  stop.
- A rejected or changes-requested human decision never authorizes unblocking;
  approval must be bound as exact program-scoped decision evidence.

## Development Loop

1. State the claimed outcome, canonical owner, assumptions, sensory evidence,
   and acceptance.
2. Implement through the final production architecture.
3. Use `pnpm check:focused` for fast inner-loop feedback.
4. Run `pnpm canonicalize` and obtain the semantic canonicalizer review.
5. Run `pnpm check:checkpoint` before a coherent local commit.
6. Complete or block the work item with typed evidence and release the lease.

Escalate to `check:integration` after cross-package integration or four to six
checkpoints. Reserve `check:certification` for declared gates. A cheap green
stage never proves a more expensive one.

When acting as a canonicalizer or checker, follow the corresponding contract in
[`.agents/roles`](./.agents/roles) and remain read-only unless assigned and able
to claim a separate remediation item.

Codex-specific read-only agent definitions live in [`.codex/agents`](./.codex/agents).
Claude should apply the same role contracts when delegated equivalent work; do
not create a separate Claude-only workflow or source of truth.
