# Live Session Host And Control Target

Status: implemented and validated on 2026-07-30.

## Goal

Make the preserved editor and headless/agent tooling operate one canonical
in-memory authoring session.

The milestone is complete only when:

- the editor does not mirror changes from a separately owned agent session
- human and agent changes share one revision sequence
- transactions are atomic and can reject stale revisions
- actor and transaction identity are retained in action history
- dry-run validation does not mutate history or revision
- undo/redo sees both human and agent edits
- control subscribers receive structured state changes
- a thin local transport exposes the same `VizControl`
- the real open editor reflects an agent transaction without UI event
  synthesis

## Implemented Seam

The repository now has the intended composition:

- `VizSessionHost` owns one stable editor session, transport controller,
  audio-session controller, resource set, registries, and subscriptions
- `VizControl` is injected with that host and assigns its trusted actor
- the preserved editor delegates project/history/transport/audio commands to
  the same host exported to the live control attachment
- opening a project calls the stable session's `loadProject(...)`; controls and
  subscribers retain identity
- canonical transactions are atomic, revision-safe, attributable, and
  dry-runnable
- the existing Zustand surface is a selective React read projection, not a
  second mutation/history engine
- a development-only bridge exposes the mounted control to local tools

## Target Topology

```text
                         one canonical mutable target
                    ┌───────────────────────────────┐
                    │        VizSessionHost         │
                    │                               │
                    │ stable project session        │
                    │ transport controller          │
                    │ audio-session controller      │
                    │ project resources             │
                    │ component/node registries     │
                    │ subscriptions                 │
                    └──────────────┬────────────────┘
                                   │
                         one injected VizControl
                                   │
                ┌──────────────────┴──────────────────┐
                │                                     │
     preserved editor attachments              headless/local tools
     - selective read model                    - transactions
     - React projections                       - inspection
     - canvas/audio attachments                - jobs later
```

The app-local Zustand store remains a selective browser read model and
persistence attachment during this milestone. It does not own a second project
mutation/history engine.

## Implementation Decisions

### Stable host identity

Opening or importing a project must load it into the existing session object.
It must not replace the session object captured by controls or transports.

Project loads:

- replace source and working project together
- reset project action/history stacks
- preserve host identity and subscriptions
- advance the host revision so stale clients cannot accidentally match

### Atomic transaction

The canonical project mutation request contains:

- optional caller transaction id
- optional expected revision
- dry-run flag
- one or more canonical project actions

The session applies all actions to a candidate project, validates that complete
candidate, and then either commits once or not at all.

Statuses are:

- `applied`
- `dry-run`
- `conflict`
- `rejected`

A conflict returns expected and actual revisions without evaluating or
mutating the project.

### Attribution

The trusted control supplies the actor. Transport payloads do not gain authority
to impersonate another actor by embedding arbitrary attribution.

Every committed action envelope retains:

- action id
- transaction id
- timestamp
- actor
- type and payload

All actions from one atomic transaction share the transaction id.

### Dry run

Dry run returns the candidate project, action warnings/errors, and project
validation. It does not:

- increment revision
- create persistent action envelopes
- alter history
- notify project subscribers

### Host attachments

The host owns package controllers and registries. Browser-only media elements,
canvases, React Flow measurement, notifications, and editor projections remain
attachments.

The studio control may invoke a post-commit attachment callback so the existing
selective read model and projected config objects update immediately. That
callback does not apply or reinterpret the project transaction.

### Naming

`VizSessionHost` is the public composition target.

`VizControl` is the semantic operator facade over an injected host.

The older `VizEditorControl` naming should be replaced in current V2 consumers
rather than kept as a deprecated alias.

## Local Transport Decision

The first live proof uses a development-only bridge hosted by the existing
Vite process:

- the browser connects outward over Vite's existing HMR WebSocket
- CLI/tool clients use HTTP request/response and Server-Sent Events
- all legs carry versioned data-only messages
- the bridge routes messages but owns no project/session state
- disconnecting the bridge does not affect the editor session
- no daemon or second project process is introduced

This is selected over:

- file mirroring, because it creates a second synchronization protocol
- browser UI automation, because controls should remain semantic
- a permanent standalone daemon, because the first proof has one open editor
  process
- a browser-global-only API, because Node tools need a process-neutral route

The Vite/HTTP/SSE transport remains an adapter. `VizControl` is the
architecture.

The exposed local endpoints are:

- `GET /__viz-control__/discovery`
- `POST /__viz-control__/request`
- `GET /__viz-control__/events`

The bridge enforces one active editor instance, heartbeat/staleness detection,
bounded request size, duplicate request protection, timeouts, and structured
unavailable/invalid/timeout responses. Snapshot events are lean, throttled,
and deduplicated.

The `viz-dev live ...` CLI provides machine-readable discovery, inspection,
transactions, history, and preview commands without importing the browser
control package or creating a package dependency cycle.

## Validation Gates

### Package gate

- two controls injected with one host observe the same revision and project
- stale expected revision is rejected
- dry run is side-effect free
- multi-action transaction commits once and creates one undo step
- actor and transaction ids are inspectable
- a project load retains host/control/subscriber identity
- transport and audio state remain stable across project mutations

### Studio gate

- an agent transaction through the studio control changes the canonical
  project and existing UI projection immediately
- a human edit followed by an agent edit has one revision sequence
- one undo reverses the latest agent transaction
- node graphs, playback, persistence, and runtime preview still work

### Transport gate

- machine-readable discovery reports protocol and capabilities
- a local client can inspect revision, apply a transaction, and subscribe
- disconnect/reconnect does not replace or reset the session
- malformed or stale requests return structured errors

### Full acceptance

- complete foundation/build/smoke/parity gate
- real browser validation
- no browser warnings or errors
- durable current-state, work-ledger, suggestions, and parity evidence updates

## Assumptions

- the first live bridge is development/local-only
- one browser editor is authoritative for the live proof
- local workspace code and the bridge client are trusted
- actor identity is assigned by the mounted control/transport host
- distributed collaboration, authentication, and untrusted clients remain
  outside this milestone

If any assumption changes, the transport and authority model must be revisited
explicitly.

## Acceptance Evidence

- two controls over one host share project, revision, history, attribution,
  subscriptions, conflict handling, dry-run, and undo in package tests
- the actual studio store and exported `vizControl` are proven to use the same
  host in app-level tests
- authoritative Zod decoding rejects malformed nested actions at the browser
  boundary
- live browser acceptance loaded `simple-example`, applied one two-action
  transaction externally, and immediately showed `#00ff88` and `1.25` in the
  existing Simple Cube settings
- a stale revision returned `conflict` without mutation
- a dry run returned its candidate value while revision, history, and actual
  project value stayed unchanged
- the editor's own undo shortcut reversed both agent changes as one unit
- CLI discovery reported the mounted instance, operations, and transaction
  capabilities; CLI preview control returned a lean portable snapshot
- SSE delivered live transport/audio snapshots and duplicate unchanged
  snapshots were removed after acceptance exposed unnecessary event churn
- no browser console warnings or errors occurred; two pre-existing form-label
  accessibility issues remain outside this architecture milestone

Detailed evidence:

- [2026-07-30 live session host and control target](../../parity/evidence/2026-07-30-live-session-host-and-control-target.md)
