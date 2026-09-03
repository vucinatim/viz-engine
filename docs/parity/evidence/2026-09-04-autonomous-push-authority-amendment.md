# Autonomous Push Authority Amendment

Status: explicitly authorized for the VizEngine V2 development branch.

Recorded: 2026-09-04.

## Human Decision

The product owner stated in the active Codex task:

> btw it should commit and push its own verified and proper work, but not deploy
> or merge to main

This instruction replaces the earlier no-push boundary for future autonomous
Goal Five checkpoints. It does not retroactively change the evidence or
authority under which readiness checkpoints were executed.

## Exact Authority

After a work item has passed its required checks, produced exactly one coherent
terminal commit, completed with its typed evidence and review, released its
lease, stopped scoped children, and left a clean worktree, the same wake may
perform one normal fast-forward push when all of these facts hold:

1. `HEAD` is the completed item's exact terminal commit.
2. The current branch exactly equals the active program's declared target.
3. The target is neither `main` nor `master`.
4. The configured remote is `origin` and the destination is the same-named
   branch.
5. The remote ref is absent or is an ancestor of `HEAD` after a fresh fetch.
6. The remote ref is verified to equal the terminal commit after the push.

The contract constrains effects, not tool choice. The agent may use ordinary
development tools such as `git`, `gh`, browsers, package commands, and the
repository CLIs within the authority they have. No VizEngine wrapper around Git
is required or desirable; repository tools remain canonical only for the
product and execution state they actually own.

The exact literal commit and Git server's normal fast-forward ref update provide
the race boundary. A concurrent remote advance rejects the stale push. The
local execution mutex therefore remains responsible only for local execution
state and is not held across network IO.

The authority excludes force push, merge, rebase of divergence, PR creation or
merge, tags, releases, package or media publication, deployment, production
access, purchases, asset acquisition, and every other external mutation. A
diverged remote, failed push, ambiguous upstream, dirty worktree, live lease, or
identity mismatch is a truthful stop and must not be repaired speculatively.

## Scheduled Contract

The exact scheduled prompt remains owned by the
[Autonomous Checkpoint Runbook](../../plans/v2/autonomous-checkpoint-runbook.md).
The amended prompt digest is
`ce922a0a24908763d9081680cda67884cce1db6733a63e204f327a130eaf1192` when
hashed with the terminal newline present in the fenced source. The Codex
scheduler may normalize that final newline when storing the prompt; all
substantive bytes and line breaks must otherwise match. Its normalized digest
without the terminal newline is
`93dce4e811e4ffd8fe5cc6a732f7d6156c9e72cb4f8b29581751c12731d2ee79`.

The app-owned heartbeat must remain attached to the current task, retain the
four approved Europe/Ljubljana night windows, and keep failure-only
notifications. Scheduled execution remains a wake mechanism rather than the
owner of product direction, completion, or Git authority.

## Activation Result

The current branch is `codex/viz-engine-v2`, tracks the same-named `origin`
branch, and was observed after a fresh fetch with no remote-only commits. This
amendment itself must pass the repository checkpoint gate, be committed once,
be fast-forward pushed normally with an ordinary Git-capable tool, and be
verified by exact remote commit ID.
