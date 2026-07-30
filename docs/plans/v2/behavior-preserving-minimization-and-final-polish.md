# Behavior-Preserving Minimization And Final Polish

Status: active.

Activated: 2026-07-30.

Immutable baseline:
`6f4529b824d38a60cf3363b1cd646e55b4339227` on
`codex/viz-engine-v2`.

Machine-readable baseline:
[2026-07-30 Goal Two Baseline](../../parity/evidence/artifacts/2026-07-30-goal-two-baseline.json).

Parent program:
[Core Consolidation And Behavior-Preserving Minimization Program](./core-consolidation-and-minimization-program.md).

## Goal

Make VizEngine V2 materially smaller, clearer, and easier to extend without
making the product, its contracts, its diagnostics, or its evidence smaller.

This is a conceptual minimization goal. It is not a formatting exercise, a
file-splitting exercise, or code golf.

The desired architecture should be explainable as:

```text
VizProjectDocument
  -> VizSession
  -> deterministic frame evaluation
  -> renderer attachments

editor / CLI / live agent / headless tools
  -> the same actions, jobs, inspection, and project contracts
```

Every translation, facade, schema, registry, adapter, store, export, and
dependency outside that explanation must earn its place through a concrete
responsibility.

## Why This Goal Exists

Goal One corrected the major ownership problems and established trustworthy
browser and production protection. The architecture direction is now correct,
but the implementation still carries:

- repeated declarations
- broad public barrels
- repeated request and action dispatch
- legacy editor convenience surfaces
- one-use wrappers
- repeated lifecycle branches
- repeated validation, cloning, identity, and result shaping
- repeated UI presentation patterns
- repeated test setup

Those costs are individually understandable. Together they make the system
larger and harder to learn than its conceptual model requires.

The best time to remove them is now, before additional product capability
learns to depend on them.

## Baseline

Goal Two begins from the committed and pushed Goal One certification, not from
an uncommitted or historical worktree.

### Source

| Scope                              | Files | Physical lines |
| ---------------------------------- | ----: | -------------: |
| production app and package source  |   371 |         75,524 |
| repository developer tools         |    13 |          2,466 |
| tests                              |    54 |         12,637 |
| combined maintained code           |   438 |         90,627 |
| playground                         |    22 |          3,139 |
| all measured TypeScript/JavaScript |   464 |         93,954 |

Combined maintained code means production, tools, and tests. Documentation,
media, generated output, lockfiles, vendored assets, and playground code are
reported separately.

### Architecture

- 17 packages
- 21 declared package entrypoints
- 148 package source files
- 762 package-source export declarations
- zero dependency-direction violations
- zero workspace cycles
- zero undeclared workspace imports
- zero browser/Node entrypoint leaks

Export declarations are an audit signal, not a target to reduce blindly.
Deliberate public contracts remain protected.

### Behavior

- 42 parity capabilities
- zero known gaps
- 52 Vitest files
- 222 deterministic tests
- 7 real-browser editor journeys
- Signal Cathedral project, bundle, audio artifact, representative frame,
  contact sheet, and final media identities
- packed external-consumer smoke
- built-package agent creative loop

### Performance

The baseline includes:

- canonical 15-component runtime-plan evaluation
- audio-artifact size, decode, seek, and retained-representation measurements
- Signal Cathedral live seek and playback observation
- browser still and video export
- bounded editor/playback resource soak
- the pinned V1/V2 performance evidence already referenced by the parity
  matrix

## Ambition

### Hard completion requirements

Goal Two is incomplete unless:

- production source lines are lower than 75,524
- production-source deletions exceed production-source additions
- combined maintained code is lower than 90,627
- combined maintained-code deletions exceed additions
- no meaningful behavior or evidence is removed to produce those numbers
- the final architecture can be explained with fewer concepts

### Serious target

Remove at least 10,000 production lines while preserving all protected
behavior.

This means a final production surface below 65,524 lines.

### Stretch target

Finish between approximately 60,000 and 64,000 production lines, a reduction
of roughly 15–20%.

This is a direction and ambition, not permission to make code opaque. The goal
will stop at the honest simplification frontier if further reduction would
require:

- compressed expression-heavy code
- weaker types
- hidden generated source
- premature generic frameworks
- reduced diagnostics
- reduced tests
- behavior loss
- performance loss

### Secondary measurements

Track, but do not game:

- concept and translation count
- public entrypoints and exported symbols
- dependency count
- wrapper and facade count
- largest implementation concentrations
- repeated schema and dispatch patterns
- production bundle size
- interaction and runtime performance

## Protected Product Contract

### Editor and UI/UX

Preserve:

- the established layout and organization
- smooth interactive response
- layer creation, duplication, reordering, hiding, configuration, and deletion
- grouped settings, controls, presets, and reset behavior
- node-graph opening, authoring, connection, replacement, movement,
  measurement, copy/paste, deletion, live values, and named outputs
- transport, waveform, tracks, play, pause, seek, loop, volume, and duration
- undo/redo and grouped gestures
- project New, Open, Save, Save As, import, reload, and reopen
- still and video export
- Jobs, Rhythm Lab, profiling, debugging, and performance surfaces
- advanced or uncommon UI behavior represented in the parity matrix

The editor may become easier to implement. It may not become less capable.

### Runtime and determinism

Preserve:

- one canonical project document
- one session/history truth
- exact action and transaction semantics
- deterministic graph and component evaluation
- frame-plan and render-plan semantics
- live/render parity
- Remotion adapter behavior
- asset and artifact resolution
- execution identity
- fixed-step temporal behavior
- resource ownership and disposal

### Visual and media quality

Preserve:

- Three/WebGL rendering
- the production Stage, characters, crowds, models, animation, and FBX support
- Signal Cathedral visual behavior
- renderer program extension support
- final resolution, frame rate, codec, and audio semantics
- analyzer-compatible audio data
- nonblank and nonfrozen output guarantees

### Agent and host operability

Preserve:

- direct headless project construction
- canonical action transactions
- live editor control
- CLI source mode
- built-package mode
- inspection and event surfaces
- bake and render jobs
- portable bundles
- packed external consumption
- capability-pack composition

### Quality

Preserve or improve:

- strict types
- validation
- structured errors
- cancellation
- progress
- diagnostics
- deterministic fixtures
- browser acceptance
- package consumer proof
- performance and resource measurements

## Non-Goals

This goal does not authorize:

- a UI redesign
- feature removal
- replacing React Flow
- replacing Three.js
- replacing the canonical project/session/runtime architecture
- changing the product model
- adding broad new creative capabilities
- generalized masks or effect graphs
- a native headless WebGL stack
- hosted/cloud infrastructure
- marketplace infrastructure
- large folder moves for aesthetics
- public API breaks without explicit evidence and approval

Small behavior corrections discovered during minimization are allowed when
they restore the documented product contract and receive regression coverage.

## Forbidden Optimization Techniques

Do not:

- minify source
- collapse readable logic into one-line expressions
- shorten names or remove useful comments for line count
- use `any` to remove type declarations
- hide maintained behavior in generated blobs
- introduce opaque metaprogramming
- add a generic framework merely to make local callers shorter
- merge unrelated responsibilities into large files
- remove errors, progress, cancellation, inspection, or metrics
- delete tests or assertions without equal or stronger proof
- reduce audio bins, waveform samples, features, or timeline resolution
- lower render resolution, frame rate, media quality, or scene density
- move code into excluded folders
- count documentation, media, generated output, lockfiles, or vendored assets
  as implementation savings

## Operating Rule

Every minimization slice must answer:

1. Which duplicated concept or unnecessary layer is being removed?
2. Which behavior and parity rows are protected?
3. What is the measured source/export/dependency surface before the change?
4. What is the smallest canonical replacement?
5. Which superseded path is deleted immediately?
6. Which focused tests and browser journeys prove the change?
7. What changed in source size, public surface, output identity, and
   performance?
8. Is the result easier to explain?

If the slice adds code and does not unlock a larger immediate deletion, reject
or postpone it.

## Current Concentration Map

Large files are not automatically wrong. These identify where concepts or
repeated declarations may be concentrated:

| File                                                           | Baseline lines | Audit question                                                            |
| -------------------------------------------------------------- | -------------: | ------------------------------------------------------------------------- |
| `src/components/node-network/presets.ts`                       |          2,566 | Can canonical graph fragments replace repeated literal assembly?          |
| `packages/viz-nodes-core/src/editor-nodes.ts`                  |          1,910 | Can uniform definitions use transparent typed tables/factories?           |
| `src/components/editor/performance-stats-dialog.tsx`           |          1,539 | Can metric sections share declarative presentation?                       |
| `packages/viz-renderer-three/src/programs/stage-scene.ts`      |          1,487 | Which lifecycle branches are repeated versus scene-specific?              |
| `src/lib/utils/chart-export.ts`                                |          1,219 | Can chart data, formatting, and export share one descriptor model?        |
| `packages/viz-renderer-three/src/portable-nodes.ts`            |          1,206 | Can create/update/dispose paths use proven lifecycle helpers?             |
| `packages/viz-project-bundle/src/node.ts`                      |            950 | Are traversal, validation, and file result paths repeated?                |
| `packages/viz-renderer-three/src/programs/morph-shapes.ts`     |            893 | Which model/material lifecycle patterns are shared?                       |
| `packages/viz-editor-control/src/protocol.ts`                  |            887 | Can schemas derive from one request/result registry?                      |
| `packages/viz-actions/src/index.ts`                            |            866 | Can action application and decoding share typed descriptors?              |
| `packages/viz-renderer-three/src/programs/neural-network.ts`   |            850 | Which retained-resource patterns are generic?                             |
| `packages/viz-editor-session/src/index.ts`                     |            805 | Which session wrappers repeat canonical kernel operations?                |
| `src/components/audio/waveform-display.tsx`                    |            801 | Can interaction and drawing helpers become smaller without indirection?   |
| `packages/viz-editor-control/src/index.ts`                     |            759 | Which facade methods are pass-throughs?                                   |
| `packages/viz-components-core/src/authoring/noise-shader.ts`   |            746 | Can repeated authoring declarations use composable schema primitives?     |
| `packages/viz-renderer-three/src/programs/stage-characters.ts` |            744 | Which model resource paths duplicate shared ownership?                    |
| `src/components/editor/profiler-panel.tsx`                     |            733 | Can profiler sections use the same metric presentation vocabulary?        |
| `src/lib/utils/export-orchestrator.ts`                         |            708 | Can job/export orchestration converge on canonical render jobs?           |
| `src/components/config/config.tsx`                             |            695 | Which editor-form primitives repeat portable authoring semantics?         |
| `src/lib/viz-session/graph-authoring-actions.ts`               |            677 | Can transaction/result/history handling be shared without another facade? |

The audit must also inspect smaller repeated files. A collection of twenty
80-line copies can be a better minimization target than one legitimate
1,500-line domain implementation.

## Workstream 0: Baseline And Measurement

### Deliverables

- immutable pushed baseline commit
- machine-readable baseline artifact
- stable source scope rules
- exact dependency graph
- exact package entrypoint inventory
- public export inventory
- deterministic and production identities
- test and browser journey inventory
- baseline runtime, artifact, live, render, and resource measurements

### Required tooling

Add or refine small measurement tools only where a repeatable comparison
cannot be made with existing commands.

Measurement tooling must:

- report current and baseline values
- distinguish production, tools, tests, docs, and generated artifacts
- fail on invalid scope or missing baseline data
- avoid adding runtime dependencies
- be removable after the goal only if its protection has no durable value

## Workstream 1: Public Surface And Concept Audit

Build a concrete inventory of:

- deliberate package entrypoints
- exported runtime values and public types
- import counts for each exported symbol
- app-only exports accidentally exposed through package barrels
- one-caller helpers
- zero-caller exports
- circular re-export chains
- dependency fan-in/fan-out
- duplicate schemas and discriminated unions
- duplicate clone/validation/result helpers
- wrappers with no policy or state

Classify each surface:

- public and protected
- internal but shared
- app attachment
- transitional
- dead

Delete dead and transitional surfaces first. Do not invent replacement
abstractions for code with no callers.

## Workstream 2: Control, Actions, Session, And Bundle Semantics

### Objective

Make the canonical mutation and command path read directly from request to
session result.

### Targets

- repeated request decoding
- repeated action dispatch branches
- repeated transaction and history result shaping
- repeated revision/conflict checks
- repeated cloning and validation
- editor-control pass-through methods
- session wrappers with no independent policy
- project-bundle filesystem result/error repetition
- CLI service wrappers that only rename canonical services

### Preferred shape

- one typed action descriptor vocabulary
- one typed request handler registry
- one transaction/result path
- one conflict and error vocabulary
- one bundle traversal/validation policy
- narrow host attachments around real I/O

### Acceptance

- direct and live control remain semantically identical
- dry run, conflicts, attribution, transaction identity, and grouped history
  remain intact
- bundle content and execution identities remain exact
- CLI help and structured errors remain stable
- packed consumer and creative-loop proofs pass

## Workstream 3: Nodes, Graph Presets, And Component Authoring

### Objective

Replace repeated declarations with small typed vocabularies where the
definitions are genuinely uniform.

### Node targets

- repeated node metadata
- repeated handle declarations
- repeated number parsing/defaults
- repeated kernel wrappers
- repeated authoring/runtime pairing
- repeated editor body scaffolding

### Graph preset targets

- repeated node/edge literal construction
- repeated IDs and positional boilerplate
- repeated fragment cloning and offsetting
- repeated output wiring

### Component targets

- repeated setting metadata
- repeated range/vector/color/select declarations
- repeated presets and default networks
- repeated compatibility/catalog metadata
- duplicated defaults between authoring and runtime

### Preferred shape

- explicit data tables
- narrow typed constructors
- composable schema fragments
- canonical graph fragments
- small factories whose output remains ordinary inspectable data

### Acceptance

- every built-in node remains present and executable
- every catalog component remains present
- all authoring settings and presets remain visible
- graph connection and history semantics remain unchanged
- Signal Cathedral's shared graph remains editable
- node and component registry identities remain stable unless an intentional
  metadata-only change is documented

## Workstream 4: Renderer And Resource Lifecycles

### Objective

Remove repeated lifecycle machinery while retaining explicit ownership.

### Audit

- portable node creation/update/removal
- geometry/material reuse
- texture and image hydration
- text texture updates
- model loading and animation resources
- program creation/update/disposal
- render-target allocation and resize
- isolated-layer compositing
- preview lifecycle

### Preferred shape

- shared lifecycle helpers only for patterns proven by several callers
- explicit owners
- explicit disposal
- stable resources for value-only updates
- scene-specific logic remaining local

### Acceptance

- no renderer/backend change
- no visual quality change
- stable object and resource counts
- no texture, target, model, program, or canvas accumulation
- exact deterministic semantic output
- Signal Cathedral and Stage remain visually intact
- no performance regression

## Workstream 5: Editor Presentation And Diagnostics

### Objective

Make the preserved editor read more like a declaration of the product
experience and less like repeated imperative presentation machinery.

### Targets

- performance-stat sections
- profiler metric sections
- chart data/export formatting
- repeated config/form controls
- repeated node-body controls
- waveform drawing and interaction helpers
- export result/status presentation
- editor-era store convenience accessors

### Preferred shape

- typed presentation descriptors
- focused reusable controls
- selective canonical subscriptions
- shared formatting functions
- imperative code retained where animation/canvas performance requires it

### Acceptance

- layout and interaction behavior remain unchanged
- no panel or advanced control disappears
- no additional render churn
- live frame work remains imperative and bounded
- browser journeys and affected parity rows pass

## Workstream 6: Bake, Render, Export, And Host Orchestration

### Objective

Converge browser, Node, live, and local orchestration on the same domain
services without erasing real host boundaries.

### Targets

- repeated job lifecycle mapping
- repeated source resolution
- repeated progress and cancellation plumbing
- repeated media probe/result shaping
- legacy export orchestration that duplicates render jobs
- duplicate browser and Node error handling

### Acceptance

- bake and render contracts remain portable
- browser-specific facilities remain in browser attachments
- Node filesystem/media facilities remain in Node entrypoints
- visible still and video export pass
- headless bundle bake/render paths pass
- cancellation and progress remain observable

## Workstream 7: Dead Surface, Dependencies, And Compatibility Purge

Remove:

- zero-caller exports
- unused dependencies
- redundant barrels
- re-export aliases without a compatibility obligation
- obsolete compatibility metadata
- inactive feature flags
- unreachable branches
- superseded adapters
- old store accessors
- duplicate constants and identities
- stale comments and documentation references

Every retained adapter must have:

- a named owner
- one clear responsibility
- at least one real caller
- a reason it cannot be direct

## Workstream 8: Test And Tool Consolidation

### Objective

Reduce mechanical proof code while retaining or improving the strength of the
proof.

### Targets

- repeated project/session/registry fixtures
- repeated action expectations
- repeated bundle setup
- repeated browser setup and diagnostics capture
- repeated media probing
- repeated result normalization

### Preferred shape

- canonical fixtures
- parameterized tests
- table-driven parity cases
- shared browser helpers
- stronger failure diagnostics

### Protected evidence

- test count is not itself sacred
- every meaningful assertion and behavior is sacred
- a removed test must be demonstrably subsumed by equal or stronger coverage
- browser journeys may be reorganized but not weakened

## Workstream 9: Final Polish And Certification

### Architecture audit

Prove:

- one canonical project/session/history truth
- one direct graph authoring model
- one action/transaction path
- one execution identity composition path
- one portable asset model
- explicit browser and Node attachments
- explicit renderer resource ownership
- deliberate package entrypoints
- no cycles or upward dependencies

### Source audit

Report:

- baseline and final production files/lines
- baseline and final tool files/lines
- baseline and final test files/lines
- production additions/deletions
- combined maintained additions/deletions
- docs/generated/media/lockfile changes separately
- largest remaining files and why they remain large

### Behavior certification

Run and preserve:

```sh
pnpm parity:validate
pnpm architecture:validate
pnpm format:check
pnpm lint
pnpm typecheck:foundation
pnpm test:foundation
pnpm test:browser
pnpm build:packages
pnpm studio:build
pnpm smoke:consumer:built
pnpm smoke:creative-loop:built
pnpm check:foundation
```

### Performance and production certification

Run and compare:

```sh
pnpm benchmark:runtime-preview
pnpm benchmark:artifact-container
```

Also prove:

- Signal Cathedral bundle validation
- representative deterministic frame equivalence
- final media identity or approved evidence-backed metadata-only change
- bounded edit/playback resource stability
- visible nonblank still export
- visible probed nonblank/nonfrozen video export
- no unexplained browser errors or warnings

### Documentation

Reconcile:

- this plan
- `docs/current-state.md`
- `docs/suggestions.md`
- parity evidence
- `docs/work-ledger.md`
- README status
- package documentation affected by public-surface changes

## Validation Cadence

### Per edit

- formatting and static correctness
- focused relevant tests

### Per coherent slice

- focused tests
- affected browser journey
- source and public-surface delta
- deterministic identity check
- relevant performance/resource check

### Per major workstream

- architecture validation
- complete deterministic tests
- complete browser suite when editor/runtime behavior is affected
- package builds for affected boundaries
- source metric comparison

### Final

- one uninterrupted complete foundation gate
- independent performance and production checks
- fresh worktree audit
- requirement-by-requirement completion audit

## Decision Rules

### Autonomous authority

The active goal authorizes:

- internal refactoring
- internal API consolidation
- deletion of dead/transitional code
- replacement of repeated patterns with transparent typed structures
- dependency removal
- package-entrypoint narrowing when no deliberate consumer contract is broken
- test and tooling consolidation with equal or stronger proof
- documentation reconciliation

### Requires explicit approval

- deliberate public package API break
- UI/UX behavior change
- parity downgrade
- renderer/backend change
- deterministic output change beyond metadata/serialization with equal semantic
  output
- media quality reduction
- feature removal
- large project-folder relocation without measurable coupling reduction

### Stop conditions

Stop a proposed slice, not the goal, when:

- deletion requires obscuring ownership
- the replacement adds more concepts
- performance regresses
- behavior cannot be proved
- public compatibility impact is uncertain
- the only benefit is a smaller file rather than a smaller system

Choose another deletion target and continue.

## Assumptions

- Goal One's architecture direction is correct.
- The committed Goal One state is the product and quality baseline.
- Private `0.0.1` package internals may be changed.
- Deliberate package entrypoints and the packed consumer remain protected.
- Source line count is a constraint paired with behavior, not a quality proxy
  by itself.
- Signal Cathedral is a demanding regression fixture but does not replace the
  full parity matrix.
- Exact pixels are expected on the certified local environment; semantic
  determinism is the cross-host contract.
- No new product capability is required to complete this goal.

## Completion Definition

Goal Two is complete only when a final audit can point to authoritative
evidence for every requirement in this document and show:

1. the protected product is still complete
2. production and combined maintained code are strictly net-negative
3. the result is materially smaller, not merely reformatted
4. the architecture contains fewer concepts and translations
5. public and host boundaries are more deliberate
6. diagnostics, tests, and evidence are not weaker
7. deterministic and production outputs remain valid
8. performance and resources do not regress
9. the complete gate passes uninterrupted
10. the final state is committed and pushed

## Autonomous Goal Text

> Complete and certify VizEngine V2 Goal Two from
> `docs/plans/v2/behavior-preserving-minimization-and-final-polish.md`.
> Starting from immutable commit
> `6f4529b824d38a60cf3363b1cd646e55b4339227`, aggressively reduce
> duplicated concepts, translations, facades, declarations, dispatch
> machinery, renderer lifecycle branches, editor presentation boilerplate,
> test setup, public exports, dependencies, and obsolete compatibility
> surface. Target at least 10,000 fewer production lines and pursue a 15–20%
> production reduction when it remains transparent and honest. Require a
> strictly net-negative production and combined-maintained-code result.
> Preserve or improve every certified UI/UX behavior, node-graph capability,
> deterministic output, Signal Cathedral result, model and character path,
> portable asset workflow, agent-control surface, diagnostic, test, parity
> row, resource lifecycle, and performance budget. Work autonomously through
> measured slices, delete superseded paths immediately, reject changes that
> only make files smaller, and continue until the codebase is demonstrably
> smaller, conceptually simpler, fully validated, committed, and pushed.
