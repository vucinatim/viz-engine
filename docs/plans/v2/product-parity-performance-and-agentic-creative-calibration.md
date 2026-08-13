# Product Parity, Performance, And Agentic Creative Calibration

Status: complete and certified. This is the historical Goal Three execution
contract, not active scope.

Planning reference:
`039e73707a27527b5abdb111028c8c210dbce5da` on
`codex/viz-engine-v2`.

Immutable execution baseline:
`cfe627949227eaf5a1ebd2c94e2a7b77529bbc6b` on
`codex/viz-engine-v2`.

The baseline contains the complete approved Goal Three plan, the first direct
manual product-calibration findings, and the honestly reclassified parity
matrix. It was committed and pushed from a clean worktree before execution
began.

Machine-readable activation evidence:
[2026-07-31 Goal Three Baseline](../../parity/evidence/artifacts/2026-07-31-goal-three-baseline.json).

The activation `pnpm check:foundation` run passed parity, architecture,
formatting, lint, types, 55 Vitest files, and 232 deterministic tests. It then
failed the existing browser churn budget: six duplicate/delete cycles took
47.755 seconds against the existing 40-second ceiling. Six of seven browser
journeys passed. The budget remains unchanged; the failure is part of the
performance backlog rather than being waived.

Parent direction:

- [VizEngine V2 Vision](../../visions/viz-engine-v2-vision.md)
- [V2 Product Architecture And Parity Alignment](../../visions/v2-product-architecture-and-parity-alignment.md)
- [Autonomous Development Operating Contract](./autonomous-development-operating-contract.md)
- [Behavior-Preserving Minimization And Final Polish](./behavior-preserving-minimization-and-final-polish.md)

Executable product backlog:
[V1/V2 Parity Matrix](../../parity/v1-v2-parity-matrix.json).

## Goal

Turn VizEngine V2 from a strong, production-proven architecture into a
comprehensively verified creative product and a genuinely effective
agent-operated authoring environment.

The goal must prove all of the following together:

- the preserved editor works and feels like the established pre-V2 product
- critical interaction and rendering performance is measured, stable, and
  comparable or better
- an agent can understand, author, inspect, diagnose, and refine work through
  canonical contracts rather than UI imitation
- the human can watch and edit the same live session while the agent works
- a second original music-reactive production can be created without
  production-specific engine shortcuts
- the final video and the final editable project are both high-quality
  deliverables

This is a product-truth and creative-calibration goal. It is not another
line-reduction campaign, a UI redesign, or a collection of disconnected new
features.

## Why This Is The Right Next Goal

Goal One established the V2 substrate, validation system, browser journeys,
package boundaries, and deterministic production loop.

Goal Two removed architectural duplication and reduced production code by
7,879 lines while strengthening the proof surface.

The remaining uncertainty is no longer mainly architectural. It is whether the
complete product has been exercised deeply enough to claim:

- full UI and UX parity
- repeatable interaction performance
- broad visual correctness
- effective agent perception and feedback
- reusable creative productivity beyond Signal Cathedral

Before the first direct manual calibration pass, the parity matrix contained:

- 42 capabilities
- 3 verified
- 37 partial
- 2 not audited
- 0 recorded gaps

`Partial` does not mean the capability is known to be broken. It means the
available evidence is not yet sufficient to claim full parity.

The manual pass then confirmed real product failures and changed the planning
state to:

- 42 capabilities
- 3 verified
- 27 partial
- 1 not audited
- 11 gaps

See
[Pre-Goal Three Manual Product Calibration Findings](../../parity/evidence/2026-07-31-pre-goal-three-manual-calibration-findings.md).

The next goal must close that evidence gap, fix every real product gap it
reveals, and prove that the engine is pleasant to create with rather than only
correctly structured.

## Core Thesis

The product should be understandable as:

```text
agent / editor / CLI / host
  -> shared project actions, inspection, jobs, and events
  -> VizSession
  -> deterministic runtime
  -> renderer attachments

agent authors headlessly
  -> editor observes and edits the same session live
  -> render feedback returns through canonical jobs
  -> agent evaluates and refines
```

The UI remains the serious human creative cockpit.

The agent operates the contracts underneath that cockpit.

Neither receives a private scene model, mutation path, render path, or hidden
source of truth.

## Explicit Assumptions And Unknowns

The plan begins with these assumptions. They must be verified rather than
silently treated as facts:

1. Most `partial` parity rows represent missing evidence rather than missing
   behavior.
2. The V2 editor is visually close to the pinned pre-V2 editor, but no complete
   controlled visual comparison currently proves that.
3. The seven existing Chromium journeys cover representative workflows, not
   every interaction listed by the parity matrix.
4. Runtime-plan performance and resource ownership are strong, but
   input-to-visible-update latency, frame pacing, and long-session editor
   behavior need more fixed-device evidence.
5. Signal Cathedral proves that the canonical creative loop can produce one
   excellent result. It does not prove that the loop is broadly ergonomic or
   free of production-specific friction.
6. The current agent can construct and mutate projects headlessly, but its
   visual perception, diagnosis, comparison, and recovery tools are not yet
   sufficient for consistently excellent autonomous creative iteration.
7. The existing FBX-backed Stage path is a protected product capability. This
   goal does not assume that prepared GLB derivatives are visually equivalent.
8. Chromium is the current full browser target. Firefox and WebKit behavior,
   accessibility, dependency security, and deployed production scalability
   have not received equivalent certification.
9. The strict package contracts and type checks are strong, but dynamic
   node-editor and UI boundaries still contain avoidable `any` usage.
10. File size and line count are not evidence of bad architecture. Remaining
    large files should be split only when they contain separable
    responsibilities or obstruct real work.

Any assumption disproved during execution becomes a concrete issue to fix or a
recorded product decision requiring approval.

## Known Mandatory Pre-Activation Gaps

The first direct human calibration found:

1. broken transparency
2. parameter-label typography drift from V1
3. severe continuous-slider lag
4. static preview playback
5. non-animating graph signals and live values
6. broken modal show/hide motion
7. stale animated values in the debug overview
8. ordinary-use console errors and warning floods
9. a visually broken Curve Spectrum
10. severe node-editor lag

Initial browser and source investigation confirmed several mechanisms:

- all bundled samples declare a one-frame timeline
- audio can advance independently while the canonical rendered frame remains
  zero
- CSS `rgba(...)` alpha is passed to `THREE.Color`, which discards it
- the alpha warning can execute tens of thousands of times from the frame loop
- component catalog preview omits the installed production Three-program
  registry and can crash on Signal Cathedral
- every slider tick takes the complete canonical action, validation, project
  clone, state replacement, selector-cache invalidation, and runtime-revision
  path
- runtime inspection currently publishes structured-cloned render data through
  the React-facing session store on rendered frames
- debug overlay values originate from projected authored settings instead of
  canonical runtime-resolved values

These are the first mandatory Goal Three slices. They are not deferred polish.

### High-frequency update doctrine

React remains the correct editor presentation host, but it must not become the
frame clock, signal bus, meter bus, or pointer-rate renderer input path.

Continuous interaction should follow:

```text
begin gesture
  -> establish canonical base and history context

update transient live value
  -> immediately reflect the exact value in the control
  -> immediately update the affected runtime/renderer input
  -> render the resulting visual on the next available frame
  -> optional narrow diagnostics

commit gesture
  -> one canonical validated action
  -> one history result
  -> clear transient value
```

Frame-rate graph signals, animated values, debug values, meters, profiler
telemetry, and render attachments should use focused external subscriptions,
imperative attachments, refs, or canvas updates as appropriate.

The live path is part of the product contract. The latest value supplied by
pointer, touch, keyboard, or another continuous control must become the
effective live value synchronously and its visual consequence must be
observable on the next available display frame. Multiple input events within
one display interval may naturally collapse to the newest value; deliberately
debouncing or visibly throttling the stream may not. Displaying only a local
thumb while the preview remains stale, waiting for release, or sacrificing
smooth visual updates to protect React render performance does not satisfy
parity.

This applies to all continuous value editing, not only the current slider
component: numeric scrubbing, color and curve controls, timeline manipulation,
node movement, spatial transforms, and future parameter-control types must use
the same gesture semantics where applicable.

The transient channel must be explicit, inspectable, cancellable, and keyed by
stable identities. It must never become a second persisted project truth.

Blanket `memo`, unstable selector tricks, throttling without semantic ownership,
or hiding warning output are not acceptable primary fixes.

## Success Outcomes

### 1. Complete Product Parity Certification

Every capability in the parity matrix must be exercised against the pinned V1
reference and the current V2 product.

The audit must cover every dimension declared by each row:

- visual
- interaction
- functional
- performance

Source presence, type safety, or a passing unit test is not sufficient evidence
for a browser-visible capability.

At completion:

- no capability remains `not-audited`
- no capability remains `partial`
- no capability remains `gap`
- every capability is `verified` or an explicitly user-approved change
- every critical and high-importance capability has direct browser evidence
- visual and interaction claims use controlled comparisons where practical

If a capability is genuinely absent or regressed, record it as a gap
immediately. Do not preserve a green-looking matrix by weakening acceptance
criteria.

### 2. Preserved UI And UX Confidence

The editor must remain recognizably and practically the established VizEngine
editor:

- same serious-tool density
- same shell and panel organization
- same visual language
- same layer workflow
- same node-graph posture
- same waveform, transport, and timeline posture
- same discoverability of secondary tools
- same or better responsiveness

The audit must inspect at least:

- initial editor shell and loading behavior
- panel layout, resizing, minimums, and persistence
- toolbar, dialogs, keyboard shortcuts, focus, and feedback states
- layer search, create, duplicate, reorder, configure, hide, freeze, and delete
- grouped parameter controls, continuous editing, presets, and reset
- graph open/close, pan, zoom, search, create, connect, replace, move,
  copy/paste, delete, live values, and named outputs
- audio loading, bundled tracks, capture, waveform zoom/scroll/seek, volume,
  and failure states
- play, pause, restart, seek, loop, playhead, and duration behavior
- project New, Open, Save, Save As, import, reload, reset, and reopen
- layer mirror, debugging, profiler, performance statistics, Jobs, and Rhythm
  Lab
- still and video export settings, progress, cancellation, error handling, and
  resulting media
- Stage DJ, crowd, authored animation, model loading, and cinematic camera
  paths

Visual changes are allowed only when they are clearly better and explicitly
recorded. Architecture cleanup is not permission to simplify the visible
product.

### 3. Repeatable Performance Certification

Create a fixed-device browser performance harness that measures representative
creative work instead of relying on subjective feel.

The harness must record:

- environment and browser identity
- viewport and device-pixel ratio
- project, audio, asset, and execution identities
- warm-up duration
- frame-pacing median, p95, p99, and long-frame count
- input-to-session-mutation latency
- input-to-visible-update latency
- panel resize and continuous parameter-edit responsiveness
- graph pan, zoom, move, connect, and live-value responsiveness
- waveform zoom, scroll, and seek responsiveness
- memory and renderer-resource steady state
- listener, audio-node, texture, material, geometry, render-target, and model
  lifecycle where observable
- long-session behavior after repeated project, audio, panel, graph, and export
  operations

Representative workloads must include:

- a simple one-layer project
- a realistic multi-layer project with editable graphs
- Stage with real characters and animated models
- Signal Cathedral
- the second original production created by this goal

Performance comparisons must use the same machine, browser, viewport, scene,
audio source, warm-up, and observation window.

Budgets must be derived from the pinned V1 baseline and current certified V2
results. A faster metric is not acceptable if visible output or interaction
quality regresses.

Performance tooling should support local reproducibility first. It should not
require a cloud service.

### 4. Agent Perception, Feedback, And Recovery

The agent needs a closed creative loop, not only mutation commands.

The shared tooling should let an agent:

- inspect available components, nodes, settings, presets, inputs, outputs,
  assets, artifacts, renderer support, compatibility, and performance hints
- inspect the complete canonical project and selected semantic subsets
- inspect evaluated graphs, component values, render plans, issues, and
  execution identity at arbitrary frames
- select or request representative frames
- render exact stills, contact sheets, and short preview clips
- receive structured media probes and render diagnostics
- detect blank, frozen, clipped, invalid, missing-resource, and obviously
  unstable output
- compare the canonical project before and after a change semantically
- create named checkpoints and restore them safely
- perform dry runs and inspect warnings before committing risky actions
- observe progress and cancel bake/render work
- understand which action caused a visible or structural change
- recover after a failed experiment without reconstructing the project

The editor should make the same process legible to the human through:

- live session updates
- current revision and agent activity
- intelligible history entries
- running and completed jobs
- warnings and errors
- optional before/after or checkpoint context

This does not require a chat interface inside the editor. It requires clear,
shared state and feedback.

### 5. Live Capability Development Loop

Reduce the friction between writing a reusable capability and inspecting it in
the real editor.

The desired loop is:

```text
author or update capability
  -> validate manifest, authoring, renderer support, and identities
  -> make it available to the running development studio
  -> add or update it through canonical actions
  -> inspect it live
  -> render feedback
  -> refine
```

The implementation may use development-time reload or a controlled studio
restart when module-system constraints require it. It must not introduce
runtime loading of arbitrary untrusted JavaScript merely to avoid a
development restart.

Capability pickup must preserve:

- one studio composition root
- explicit trusted capability packs
- deterministic execution identity
- package-owned authoring contracts
- renderer extension ownership
- clear validation failures

### 6. Second Original Agent-Authored Production

Create a second polished, short, music-reactive production that is
substantially independent from Signal Cathedral.

Its purpose is to test reuse and authoring ergonomics, not to create another
one-off demo.

The production must:

- begin from a clean project or documented reusable template
- use an explicit creative brief and selected audio window
- be authored through public project, action, graph, asset, bake, render, and
  capability contracts
- remain fully editable and understandable in the preserved editor
- use inspectable musical intent rather than arbitrary parameter vibration
- exercise multiple layers or a comparably rich compositing structure
- exercise reusable components and nodes
- introduce a new capability pack only when the visual idea genuinely requires
  one
- keep production-specific identifiers and rendering behavior outside engine
  core
- be visible in the editor while the agent iterates
- use render feedback to drive documented refinements
- reopen from a portable bundle with pinned execution identity
- produce a final video with audio and a final editable project

It must not copy Signal Cathedral's composition, geometry, palette, or custom
program and call the result new.

The exact creative direction should be selected after the capability and
friction audit. Selection criteria should include:

- visual distinctiveness
- suitability of the available audio
- ability to exercise reusable engine systems
- ability to expose weak authoring or feedback tools
- achievable production quality within the goal

The creative work is part of validation. A technically correct but visually
weak result does not complete the goal.

### 7. Targeted Quality Improvements

Cleanup remains allowed and expected where product work reveals a concrete
problem.

Priority candidates include:

- typed React Flow nodes, handles, input maps, outputs, and editor instances
- generic typed search and selection controls
- clearer dynamic node I/O boundaries
- removal of remaining editor-era convenience accessors after caller
  migration
- clearer authoring DSL examples or named helpers where actual use reveals
  ambiguity
- decomposition of large files only when responsibilities are independently
  testable and reusable
- documentation cleanup where completed plans are still described as active

Every cleanup must improve at least one of:

- correctness
- local reasoning
- type safety
- authoring ergonomics
- testability
- performance
- deletion of obsolete ownership

No cleanup slice should exist only to improve a line-count statistic.

## Agent Tooling Principles

Tooling must wrap canonical contracts rather than become a second
architecture.

Prefer:

- composable typed operations
- structured results
- stable identifiers
- explicit revisions
- dry runs
- cancellation
- progress
- semantic inspection
- deterministic render requests
- portable artifacts

Avoid:

- UI-coordinate automation as the primary authoring path
- giant `createEverything` commands
- unrestricted code execution hidden behind a creative tool
- agent-only project mutations
- editor-only runtime semantics
- stringly typed configuration blobs
- duplicate render or bake pipelines
- opaque success responses without resulting revision, identity, or issues

Potential command names such as `viz doctor`, `viz inspect`, or
`viz checkpoint` are illustrative. Stable contracts should be designed before
surface naming is finalized.

## Testing Strategy

The goal should add proof where it changes confidence, not maximize a raw test
count.

### Browser acceptance

- Map each critical and high parity capability to a checked browser journey.
- Keep journeys focused enough that a failure identifies the broken workflow.
- Use deterministic projects, assets, viewports, and frame positions.
- Check visible output, not only DOM presence.
- Assert console and page errors where appropriate.

### Visual comparison

- Capture controlled V1 and V2 reference states.
- Preserve viewport, device scale, project, audio state, panel state, and frame.
- Compare shell, panels, graph, waveform, Stage views, dialogs, and exports.
- Use image comparison as evidence, not as a replacement for human judgment.
- Record approved intentional differences explicitly.

### Contracts and property testing

Add generative or fuzz-style coverage where it has strong leverage:

- valid and invalid project documents
- action sequences and revision conflicts
- undo/redo and grouped gestures
- graph connection compatibility
- bundle paths, identities, and corrupted content
- asset and artifact resolution
- protocol request validation

Generated cases must be reproducible from a recorded seed.

### Failure and lifecycle testing

Exercise:

- aborted audio loading
- failed or cancelled bake
- failed or cancelled render
- project mutation during render
- missing or invalid assets
- model load and animation failure
- context/resource disposal
- repeated open/close/reload cycles
- partial bundle and corrupted artifact recovery

### Browser breadth

- Keep the full parity suite on the primary Chromium target.
- Add a bounded Firefox and WebKit smoke covering startup, editing, graph,
  transport, preview, and a representative export where platform support
  permits.
- Record unsupported media APIs honestly rather than hiding skips.

### Accessibility

Audit at least:

- keyboard access to primary workflows
- focus preservation and focus visibility
- dialog focus trapping and restoration
- labels and accessible names
- disabled and error states
- contrast of critical information
- editor shortcuts not stealing text input

Accessibility changes must preserve the dense creative-tool workflow.

### Coverage posture

Do not use an arbitrary line-coverage percentage as the success measure.

Track coverage only as a discovery aid. Completion depends on protected
behaviors, contracts, failures, and product journeys.

## Evidence And Artifact Model

Every completed parity row should reference durable evidence.

Evidence may include:

- checked browser journey
- controlled screenshot pair
- interaction recording
- machine-readable performance report
- unit, integration, property, or lifecycle test
- deterministic frame or media identity
- media probe
- manual product observation with exact reproduction steps

Goal-level artifacts should include:

- activation baseline
- parity status summary
- V1/V2 controlled capture inventory
- performance environment and results
- long-session/resource report
- agent creative-loop activity and friction report
- second-production project and bundle identities
- second-production representative stills and contact sheet
- final video and audio probe
- final source, dependency, test, and build summary
- final machine-readable certification

Generated media should live in the repository's established artifact locations
and should not be committed blindly when it is large or reproducible. Durable
summaries and identities must remain.

## Architecture Guardrails

The goal must preserve:

- `VizProjectDocument` as portable project truth
- `VizSession` as live project/session/history truth
- editor presentation state separate from session/runtime state
- deterministic frame evaluation shared by preview, inspection, and render
- explicit asset and artifact resolution
- baking as a first-class system
- Remotion as an adapter
- one studio capability composition root
- renderer-owned resource lifecycle
- shared human, agent, CLI, and host action contracts
- structured errors, progress, cancellation, and diagnostics

The goal must not introduce:

- a parity-only production runtime
- screenshot-driven project semantics
- a second editor store for canonical scene data
- an agent shadow document
- a second graph evaluator
- a second browser export orchestrator
- production-specific behavior in engine core
- long-lived V1 compatibility layers
- broad speculative frameworks created only to support hypothetical features

## Execution Program

### Phase 0: Activation And Calibration

- Capture a clean immutable baseline commit and machine-readable metrics.
- Re-run the complete foundation gate.
- Reconcile current state, docs, parity statuses, and existing evidence.
- Pin the V1 reference environment and document how it is launched.
- Record browser, machine, viewport, and media capabilities.
- Establish artifact locations and naming.

### Phase 1: Parity Harness And Controlled Reference

- Build a parity-row-to-evidence inventory.
- Create reusable browser setup, project, viewport, and capture helpers.
- Capture controlled V1 and V2 states.
- Add visual comparison and interaction evidence conventions.
- Audit the remaining not-audited capability first.
- Reproduce and baseline every known pre-activation gap before changing it.
- Record genuine gaps immediately.

### Phase 2: Critical Product Parity

- Repair the canonical live transport/audio/frame relationship and make every
  bundled sample visibly animate.
- Restore correct alpha and transparency composition without frame-loop warning
  floods.
- Establish the transient continuous-interaction path before tuning individual
  slider or node components.
- Restore graph-signal and debug-value live behavior from canonical runtime
  results.
- Repair Curve Spectrum against controlled V1 reference captures.
- Make the complete component catalog preview-safe through the composed studio
  registries and bounded failure containment.
- Audit and close all critical capabilities.
- Fix functional, visual, interaction, and performance gaps.
- Protect each corrected behavior with the appropriate browser or contract
  proof.
- Keep editor architecture converged on `VizSession`.

### Phase 3: High And Standard Product Parity

- Restore V1 parameter typography and modal motion.
- Resolve form naming and label-association issues found by browser inspection.
- Audit and close all remaining capabilities.
- Include secondary surfaces, failure feedback, profiler, performance tools,
  Rhythm Lab, and less common workflows.
- Resolve or explicitly approve every visible difference.

### Phase 4: Performance And Lifecycle Lab

- Implement the fixed-device performance harness.
- Measure V1 and V2 representative workloads.
- Fix material regressions.
- Add repeatable resource and long-session scenarios.
- Record budgets without overfitting them to a single unusually fast run.

### Phase 5: Agent Feedback And Live Development Loop

- Inventory actual agent friction from Signal Cathedral and parity work.
- Add the smallest canonical inspection, comparison, checkpoint, render
  feedback, and capability-pickup improvements that remove that friction.
- Make agent activity understandable in the live editor.
- Validate source mode and built-package consumption.

### Phase 6: Second Original Production

- Select and document the creative direction.
- Author the project and any justified reusable capability through public
  contracts.
- Iterate using the new perception and feedback loop.
- Keep the project visible and editable in the live editor.
- Bake, render, probe, reopen, and certify the final portable result.
- Record creative and technical friction while it is encountered.

### Phase 7: Final Consolidation And Certification

- Resolve friction that belongs in reusable tooling or contracts.
- Remove transitional helpers introduced during the goal.
- Run targeted type-safety cleanup in touched dynamic editor boundaries.
- Run the complete parity, performance, browser, package, consumer, and
  production gates.
- Perform a clean-worktree audit at the exact final commit.
- Publish human-readable and machine-readable certification.

## Milestone Loop

Each milestone should:

1. name the parity rows or creative capability it advances
2. define visible and architectural acceptance before implementation
3. identify the canonical owner and forbidden duplicate owners
4. implement the smallest coherent slice
5. run focused tests and browser proof
6. measure performance when relevant
7. update evidence, current state, and the work ledger
8. review the complete diff for accidental complexity
9. commit and push only when authorized by the active goal

Browser observation should occur throughout the goal, not only at final
certification.

## Completion Contract

The goal is complete only when all of the following are true:

### Product

- all 42 parity capabilities are `verified` or explicitly approved changes
- zero capabilities are `not-audited`, `partial`, or `gap`
- the preserved editor remains fully featured and recognizably VizEngine
- all critical visual and interaction workflows have direct browser evidence

### Performance

- fixed-device measurements cover the representative workloads
- playback, editing, graph, waveform, and panel interactions meet approved
  baseline-relative budgets
- long-session resources remain bounded
- no performance improvement is purchased through visible or functional loss

### Agent workflow

- the agent can inspect, mutate, compare, checkpoint, render, diagnose, and
  refine through canonical contracts
- agent changes appear in the same live editor session
- capability development has a documented low-friction pickup loop
- source and built-package agent paths both pass

### Creative production

- a distinct second original production exists
- its canonical project is fully editable
- its portable bundle validates and reopens
- its deterministic identities are recorded
- its representative stills and contact sheet are visibly strong
- its final video is nonblank, nonfrozen, correctly timed, correctly sized,
  and contains the intended audio
- the creative result meets an explicit quality review, not only technical
  validity

### Architecture and quality

- no duplicate session, graph, runtime, bake, render, or agent truth exists
- strict types and package direction remain intact
- touched dynamic node/editor boundaries are no worse and preferably safer
- superseded code is deleted
- `pnpm check:foundation` passes
- additional parity, performance, cross-browser, lifecycle, and production
  gates pass
- docs, parity matrix, evidence, suggestions, and work ledger agree
- final source metrics and dependency architecture are recorded
- the final worktree is clean and independently auditable

## Stop And Decision Rules

Continue autonomously through ordinary implementation, test, visual,
performance, and browser failures.

Stop and request direction when:

- parity requires choosing between two materially different product designs
- a visible V1 behavior appears harmful and should become an approved change
- meeting a performance target would require degrading visual quality or
  interaction behavior
- the second production requires licensing or external assets not already
  authorized
- a new dependency or browser capability would create a material long-term
  commitment
- arbitrary third-party code loading, cloud infrastructure, authentication, or
  deployment becomes necessary
- an existing user change cannot be safely separated from the goal

## Explicit Non-Goals

This goal does not automatically authorize:

- redesigning the editor
- another code minimization target
- replacing the production FBX Stage path
- generic prepared-GLB conversion infrastructure unless the production or
  measured runtime need justifies it
- generalized masks or effect graphs
- speech, singing, facial animation, or retargeting systems
- a browser-free video executor without a deployment requirement
- Viz Cloud, authentication, billing, collaboration, or hosting
- Magnify-specific packages that bypass portable contracts
- runtime loading of arbitrary untrusted capability code
- publishing packages or deploying services

Those remain valid future directions. They should follow product and creative
confidence rather than distract from establishing it.

## Likely Direction After Completion

Once this goal is certified, the strongest next product directions are:

1. a generic `Model3D` authoring surface and deterministic model-preparation
   pipeline
2. masks, passes, and effect-graph composition
3. character retargeting, facial performance, speech, and singing semantics
4. broader reusable component and node libraries
5. native/server render executors when deployment requires them
6. Viz Cloud and Magnify Core integration over the proven portable contracts

The order should be informed by the second production's friction report and
real user priorities.
