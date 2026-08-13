# VizEngine Documentation Map

This is the canonical entrypoint for VizEngine documentation.

The repository contains extensive design history. Use the authority hierarchy
below so completed plans and historical evidence inform work without becoming
accidental current direction.

## Authority Hierarchy

### 1. North star

- [VizEngine Compounding Vision](./visions/viz-engine-compounding-vision.md)

This defines the durable product identity, creative ambition, architecture
invariants, compounding model, parity floor, ecosystem boundaries, assumptions,
and autonomous decision limits.

### 2. Current strategy and state

- [Current State](./current-state.md)
- [Working Agreements](./working-agreements.md)
- [Autonomous Development Compass](./autonomous-development-compass.md)
- [Autonomous Development Operating Contract](./plans/v2/autonomous-development-operating-contract.md)
- [Suggestions](./suggestions.md)

`current-state.md` names what exists, what remains open, and the active goal.
If it names no active goal, completed plans must not be treated as active scope.

### 3. Active goal

The active implementation contract is:

- [Goal Five: Flagship Autonomous Production And Creative-System Maturation](./plans/v2/flagship-autonomous-production-and-creative-system-maturation.md)

Gate 0 is approved at planning baseline
`b2b23b577feda29ef7eca9dcbf35a4e8c1162781`. Recover its current phase,
checkpoint, human calibrations, validation tiers, and terminal certification
matrix from that document before acting.

### 4. Governing specifications

Use the smallest set of specs directly relevant to the active slice:

- [Viz Project Document](./specs/v2/viz-project-document.md)
- [VizSession](./specs/v2/viz-session.md)
- [Agent-Authored Production Loop Architecture](./specs/v2/agent-authored-production-loop-architecture.md)
- [Component Contract](./specs/v2/component-contract.md)
- [Node Contract](./specs/v2/node-contract.md)
- [Runtime API](./specs/v2/runtime-api-spec.md)
- [Audio Feature Timeline](./specs/v2/audio-feature-timeline-spec.md)
- [Bake Artifact Contract](./specs/v2/bake-artifact-contract.md)
- [Asset Resolver And Storage Abstraction](./specs/v2/asset-resolver-and-storage-abstraction-spec.md)
- [Asset Lifecycle And Derivation Jobs](./specs/v2/asset-lifecycle-and-derivation-job-model.md)
- [Native 3D Model, Character, And Performance System](./specs/v2/native-3d-model-character-and-performance-system.md)
- [Render Job Ownership](./specs/v2/render-job-ownership-and-lifecycle-model.md)
- [Bake Job Ownership](./specs/v2/bake-job-ownership-and-lifecycle-model.md)
- [Local Persistence And Import/Export](./specs/v2/local-persistence-and-import-export-model.md)

Specs govern their domain contracts. Older conceptual method names or open
questions do not override newer implemented contracts and certification.

### 5. Executable product evidence

- [Parity Program](./parity/README.md)
- [Parity Matrix](./parity/v1-v2-parity-matrix.json)
- [Goal Five Certification Contract](./parity/goal-five-certification.md)
- [Goal Five Certification Matrix](./parity/goal-five-certification-matrix.json)
- [Profiler Measurement Contract](./profiler-measurement-contract.md)
- [Parity Evidence](./parity/evidence/)
- [Work Ledger](./work-ledger.md)

The matrix and evidence define what has actually been certified. Evidence is
proof of a bounded claim, not a general product roadmap.

## Supporting Vision And Rationale

The canonical compounding vision synthesizes these detailed records:

- [VizEngine V2 Vision](./visions/viz-engine-v2-vision.md)
- [V2 Product, Architecture, And Parity Alignment](./visions/v2-product-architecture-and-parity-alignment.md)
- [Agent-Operated Live Editor Vision](./visions/agent-operated-live-editor-vision.md)
- [Multi-Renderer And Backend Capability Vision](./visions/multi-renderer-and-backend-capability-vision.md)
- [Rendering Performance And Deployment Strategy](./visions/rendering-performance-and-deployment-strategy.md)
- [Viz Cloud And Integration Vision](./visions/viz-cloud-and-integration-vision.md)
- [Deployment And App Shell Posture](./visions/deployment-and-app-shell-posture.md)
- [Specialized AI Runner Vision](./visions/specialized-ai-runner-vision.md)

These remain useful for detailed rationale and provisional strategy. When they
sound prospective about capabilities that now exist, use `current-state.md`
for implementation truth.

## Completed Programs And Historical Plans

The following major programs are complete and remain as rationale,
acceptance precedent, and implementation history:

- [V2 Foundation And Rewrite Plan](./plans/v2/v2-foundation-and-rewrite-plan.md)
- [Core Consolidation And Minimization](./plans/v2/core-consolidation-and-minimization-program.md)
- [Behavior-Preserving Minimization And Final Polish](./plans/v2/behavior-preserving-minimization-and-final-polish.md)
- [Product Parity, Performance, And Agentic Creative Calibration](./plans/v2/product-parity-performance-and-agentic-creative-calibration.md)
- [Temporal Runtime And Playback Performance Certification](./plans/v2/temporal-runtime-and-playback-performance-certification.md)
- [First Agent-Authored Production: Signal Cathedral](./plans/v2/first-agent-authored-production-signal-cathedral.md)

The remaining documents under `docs/plans/v2/` record completed phases,
cutovers, audits, proofs, and narrow implementation slices. They must not be
resumed merely because they use future tense or retain stale status language.

## Historical And Reference Material

The following material preserves valuable product lessons but is not current
V2 architecture:

- the thesis and V1 system architecture
- legacy export and video-export notes
- historical Stage implementation notes
- historical node-flow and node-output-cache descriptions
- old profiler, history-context, and shortcut implementation notes

Useful ideas may be salvaged selectively. Store ownership, browser-delta time,
editor-owned URLs, multi-canvas DOM composition, and other V1-specific
architecture are not preservation targets.

## Document Roles

- `visions/`
  Durable direction and detailed product rationale.
- `specs/v2/`
  Domain contracts and explicit system boundaries.
- `plans/v2/`
  Bounded execution sequences. Only a plan named active by current state is
  active.
- `parity/`
  Executable product expectations and bounded evidence.
- `current-state.md`
  Concise implementation truth and active frontier.
- `suggestions.md`
  Durable opportunities, not automatically authorized scope.
- `work-ledger.md`
  Historical milestones, not recovery order or current priority.

## Updating Documentation

When product direction changes:

1. update the compounding vision and name the changed assumption or decision
2. reconcile working agreements and affected specs
3. update current state

When implementation changes materially:

1. update the governing spec if its contract changed
2. update current state
3. record evidence and a meaningful ledger entry
4. update suggestions only for durable future work

When a goal completes:

1. mark the plan complete
2. remove it as active scope in current state and this index
3. preserve its certification as evidence

Docs are repository memory. Chat history is supporting context only.
