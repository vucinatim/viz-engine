# 2026-07-30 Live Session Host And Control Target

## Scope

This record certifies Phase 2 of the agent-authored production loop:

- one canonical session host for the preserved editor and agent control
- atomic revision-safe human/agent transactions
- trusted actor and transaction attribution
- live local request/response and event transport
- machine-readable CLI discovery and control
- immediate visible editor reflection without UI event synthesis

It does not certify the later audio-bake, render-job, or final creative-output
phases.

## Architecture Evidence

The implementation adds:

- `VizSessionHost` as the stable owner of editor session, transport, audio
  session, project resources, registries, and subscriptions
- injected `VizControl` instances over that host
- stable project loading without replacing the session object
- `VizProjectTransaction` with optional id, expected revision, dry run, and one
  or more canonical actions
- `applied`, `dry-run`, `conflict`, and `rejected` results
- host-assigned actor identity and shared transaction identity in action
  envelopes
- strict Zod decoding of the current project-action and control protocol
- a Vite-hosted local adapter using the existing HMR WebSocket for its browser
  leg and HTTP/SSE for tool clients
- `viz-dev live` discovery, inspection, transaction, history, and preview
  commands

The bridge is intentionally not a session owner. It routes to the control
mounted over the editor's actual host.

## Automated Evidence

Focused validation covered:

- atomic rejection without partial mutation
- one revision and undo step for a multi-action transaction
- stale expected-revision conflict
- side-effect-free dry run
- actor and transaction attribution
- duplicate transaction rejection
- stable session identity across project load
- two human/agent controls sharing one host, history, subscriptions, and undo
- the real app projection updating from the exact host exported to live control
- malformed nested protocol payload rejection
- lean portable mutation/history/preview transport results
- injectable live HTTP client behavior
- machine-readable CLI help

The focused gate passed:

```text
5 test files passed
37 tests passed
editor-control typecheck passed
dev-cli typecheck passed
studio typecheck passed
```

The complete repository gate was rerun after the final implementation; its
result is recorded in `docs/work-ledger.md`.

## Real Browser And Transport Acceptance

Environment:

- preserved VizEngine V2 editor
- `http://localhost:4173/?allowSmallViewport=1`
- bundled `simple-example`
- external HTTP requests and the `viz-dev live` CLI

Observed sequence:

1. discovery changed from `connected: false` before the page mounted to
   `connected: true` with a concrete editor instance id
2. `project.inspect` reported revision 2 and the complete three-layer,
   three-graph example
3. one external transaction at expected revision 2 changed Simple Cube
   `color` to `#00ff88` and `rotationSpeedY` to `1.25`
4. the transaction committed at revision 3 with two action envelopes sharing
   actor `{ kind: "agent", id: "viz-studio-live-control" }` and the requested
   transaction id
5. expanding the existing Simple Cube settings showed the new color and
   rotation value immediately
6. a request still expecting revision 2 returned a structured conflict with
   actual revision 3 and made no change
7. a dry run at revision 3 exposed candidate `rotationSpeedX: 2.5`, while the
   actual value remained `0.5`, revision remained 3, and history remained
   unchanged
8. the editor's native undo shortcut moved to revision 4, restored
   `#FF00FF` and `0.56`, and made redo available; both agent actions were
   reversed together
9. SSE emitted live preview/audio snapshots; the implementation was then
   hardened to deduplicate identical throttled snapshots
10. `viz-dev live discover` reported the mounted editor, all supported
    operations, and atomic/expected-revision/dry-run/host-actor capabilities
11. `viz-dev live pause` returned a lean portable snapshot from the same
    session

The browser console contained no warnings or errors. Chrome reported two
existing accessibility issues involving form ids/labels; these are not caused
by the live control seam and are not hidden by this evidence.

## Acceptance

Phase 2 is accepted.

The next architecture milestone is Phase 3: canonical deterministic audio bake
execution and artifacts through `rhythm-core`.
