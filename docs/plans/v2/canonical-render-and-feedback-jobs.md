# Canonical Render And Feedback Jobs

Status: implemented and validated.

## Goal

Make rendering an explicit observable service that both an agent and the
preserved editor can use without UI event synthesis.

The first complete surface must support:

- deterministic stills
- contact sheets over explicit frames
- short preview clips
- final video
- media probing
- runtime diagnostics
- blank/near-black and frozen-frame checks
- render and encode timing
- cancellation and progress

The browser/WebGL/FFmpeg path remains valuable implementation. It becomes a
render executor behind this contract instead of remaining the architecture.

## Locked Decisions

### One job lifecycle

Render jobs use the same generic lifecycle vocabulary as audio bakes:

- `queued`
- `validating`
- `running`
- `succeeded`
- `failed`
- `cancelled`

Preview, candidate, and final outputs are intents on one lifecycle, not
different hidden systems.

### Exact source identity

A local live render captures:

- project id
- working revision
- deterministic project content identity
- resolved asset and artifact identities

A headless bundle render captures the same content identity without pretending
that a mutable editor revision exists.

The service fails closed when an expected source identity or revision no longer
matches.

### Adapter-backed execution

The portable render package owns:

- request/result contracts
- strict validation
- executor selection
- lifecycle, progress, cancellation, and failure semantics

Executors own host mechanics:

- deterministic SVG rendering
- browser WebGL presentation and capture
- native or WASM FFmpeg encoding
- storage and output URI materialization
- media probing

Executors do not own project mutation or alternate runtime semantics.

### Outputs are artifacts

A successful job returns one or more explicit render-output artifacts carrying:

- stable artifact id
- output role and format
- MIME type and URI
- content identity and byte length
- dimensions, frame rate, frame count, and duration where relevant
- renderer/executor identity

The job is not successful until the output is materialized and inspectable.
Render outputs do not silently attach themselves to the authored project.

### Feedback is part of the result

Every executor reports the feedback it can prove through one result shape:

- runtime and asset diagnostics
- media stream/probe information
- visual sample metrics
- render/encode timing
- warnings and failures

Missing feedback is explicit. A weak executor does not fabricate a successful
probe or visual check.

### Stills and contact sheets first

The implementation order is:

1. portable contracts and lifecycle
2. deterministic SVG still/contact-sheet executor
3. shared control and CLI operations
4. browser/WebGL still/contact-sheet executor
5. clip/video encoding
6. automated probe, visual, and performance feedback

This order gives the agent a fast inspectable feedback loop before paying the
cost of full video encoding.

## Package Boundaries

### `@viz-engine/contracts`

- render request union
- output artifact descriptor
- execution identity
- media probe
- visual/performance feedback
- render result

### `@viz-engine/render`

- authoritative request validation
- project-resource source boundary
- executor interface and registry
- observable render-job service
- deterministic project-resource identity

Node-only executors live under `@viz-engine/render/node`.

### `@viz-engine/editor-control`

- combines bake and render jobs in one inspectable job surface
- starts render jobs through the injected session service
- cancels by canonical job id
- exposes the same operations over direct and live transports

### Studio

- injects a browser executor that captures the actual preserved editor runtime
- shows the same job progress and outputs used by headless clients
- keeps DOM, canvas, WebGL, IndexedDB, Blob, and FFmpeg WASM out of portable
  packages

### Dev CLI

- starts and inspects live render jobs
- executes supported headless bundle render jobs directly
- writes output artifacts to explicit directories
- reports structured paths, identities, probes, diagnostics, and timings

## Request Model

The request is a discriminated union over:

- `still`
- `contact-sheet`
- `clip`
- `video`

Common fields identify:

- source project
- optional expected source revision/content identity
- intent (`preview`, `candidate`, `final`, `integration`)
- executor id
- output dimensions and quality
- output label

Frame selection is explicit per output kind. No executor may infer the current
UI playhead for a durable request.

## Validation Gates

### Contract and lifecycle

- strict boundary decoding rejects unknown fields and invalid combinations
- executor selection is explicit
- source identity and revision mismatch fail closed
- cancellation works during validation and execution
- progress snapshots are immutable and ordered
- failed jobs never contain successful output

### Still and contact sheet

- exact requested frames are evaluated
- runtime issues are returned
- outputs are materialized and content-identified
- contact-sheet ordering and layout are deterministic
- repeated input produces byte-identical deterministic SVG output

### Browser and media

- the actual Three/WebGL scene is captured, not an SVG approximation
- video includes expected audio/video streams
- duration, dimensions, frame rate, and codec are probed
- representative frames are non-blank and not all identical
- capture and encoding remain cancellable
- renderer resources are ready before the first capture

### Product

- an agent can start, await, inspect, and cancel jobs through direct and live
  control without manipulating export UI
- the editor observes the same job records
- portable bundle output can be reopened and rendered again
- the complete foundation/parity/build/consumer/creative-loop gate passes

## Assumptions

- semantic determinism is required; cross-GPU pixel identity is not
- local working-head renders are allowed only when labeled with exact revision
  and content identity
- SVG is a deterministic diagnostic executor, not a replacement for the Three
  production renderer
- the first browser executor may reuse proven capture and FFmpeg mechanics
  while their store/log presentation is separated from job semantics
- native FFmpeg is preferred for headless production when available; browser
  FFmpeg remains a valid local editor adapter

## Completion Boundary

This phase is complete only when both are true:

1. the agent has a fast deterministic still/contact-sheet feedback loop
2. the real browser/WebGL scene can produce and validate a short encoded clip
   through the same job/control surface

Both conditions are now proven. The browser path also produced and probed an
H.264/AAC clip from an explicit resolved audio asset, reported nonblank and
nonfrozen frames, exposed the job through the preserved editor, and cancelled a
longer capture cooperatively.

Evidence:

- [2026-07-30 canonical render and feedback jobs](../../parity/evidence/2026-07-30-canonical-render-and-feedback-jobs.md)

The final authored visual and production/parity certification remain later
phases.
