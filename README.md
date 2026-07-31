# VizEngine

VizEngine is a web-native, audio-reactive animation engine and editor.

The repository is building V2 as a full replacement architecture while
preserving the proven product quality of the original editor:

- a deterministic visual runtime
- a browser-based layer and node editor
- an AI-native project/action system
- reusable 2D, Three.js, audio, bake, and render packages
- a clean rendering attachment for Magnify Core

V2 replaces hidden architecture, not the editor’s serious creative-tool
ambition. Existing UX and capabilities remain the parity reference unless a
deliberate improvement replaces them.

## Start Here

- [Documentation index](docs/docs-index.md)
- [Current state](docs/current-state.md)
- [Working agreements](docs/working-agreements.md)
- [V2 vision](docs/visions/viz-engine-v2-vision.md)
- [Product architecture and parity alignment](docs/visions/v2-product-architecture-and-parity-alignment.md)
- [Core consolidation program](docs/plans/v2/core-consolidation-and-minimization-program.md)
- [Parity status](docs/parity/README.md)

## What Exists

- one versioned `VizProjectDocument`
- one canonical in-memory `VizSession`
- typed layers, settings, assets, artifacts, graphs, and actions
- deterministic live/render frame evaluation
- direct canonical node-graph authoring
- browser and Node audio-feature baking
- versioned compact audio-artifact storage
- SVG and retained Three.js renderer packages
- model-backed Stage characters and scalable animated crowds
- still and video render jobs with probing and feedback
- a preserved Vite/React studio with playback, graphs, history, persistence,
  import/export, and runtime inspection
- local CLI and live-control surfaces for agents and developers

The first complete agent-authored production is
[Signal Cathedral](docs/plans/v2/first-agent-authored-production-signal-cathedral.md).

## Quick Start

Requirements:

- Node.js 20+
- pnpm

```bash
pnpm install
pnpm dev
```

Open [http://localhost:4173](http://localhost:4173).

Useful checks:

```bash
pnpm check:foundation
pnpm test:foundation
pnpm test:browser
pnpm architecture:validate
pnpm metrics:source
```

## Local Agent And Developer CLI

Source-mode commands run without rebuilding the entire workspace:

```bash
pnpm viz --help
pnpm viz example validate
pnpm viz bundle validate --dir <bundle-directory>
pnpm viz bundle frame --dir <bundle-directory> --frame 36
pnpm viz live discover
```

Use `pnpm viz:built --help` when explicitly validating compiled package
consumption.

The CLI is a client of canonical bundle, action, bake, render, runtime, and live
control services. It does not define separate scene semantics.

## Architecture

The central flow is:

```text
VizProjectDocument
        │
        ▼
    VizSession ───── typed actions / history / transport
        │
        ▼
 deterministic frame and render plans
        │
        ├── SVG renderer
        ├── retained Three.js renderer
        ├── browser preview
        └── still/video render jobs
```

Key rules:

- no compatibility layer for obsolete V1 architecture by default
- one canonical project document and session truth
- editor state and runtime state remain distinct
- baking and deterministic seeking are first-class
- renderer and host adapters do not become architecture roots
- AI and CLI actions operate on stable contracts, not UI imitation
- portable assets and artifacts have explicit ownership and identity

Package and app boundaries are checked by
`pnpm architecture:validate`.

## Component Authoring

Reusable components live in capability packs and declare:

- stable component and implementation identity
- portable settings/authoring schemas
- deterministic runtime rendering
- optional renderer-program registrations
- required assets, artifacts, and render policy

Use the current scaffold command as a starting point:

```bash
pnpm viz component scaffold \
  --id my-component \
  --name "My Component" \
  --out /absolute/path/to/my-component.ts
```

See the [component contract](docs/specs/v2/component-contract.md) and
[agent-authored production architecture](docs/specs/v2/agent-authored-production-loop-architecture.md)
before adding engine-level capabilities.

## Rewrite Status

Goal One of the
[Core Consolidation And Behavior-Preserving Minimization Program](docs/plans/v2/core-consolidation-and-minimization-program.md)
is complete and
[certified](docs/parity/evidence/2026-07-30-core-consolidation-and-quality-hardening.md).
It consolidated the V2 substrate, automated preserved-editor acceptance,
removed obsolete seams, and established the fresh baseline for the separate
net-negative Goal Two minimization pass.

Goal Two is complete under the
[Behavior-Preserving Minimization And Final Polish](docs/plans/v2/behavior-preserving-minimization-and-final-polish.md)
contract. Against immutable commit `6f4529b`, production is 7,879 lines and
22 files smaller, combined maintained code is 7,632 lines smaller, and the
proof surface is stronger. The
[final certification](docs/parity/evidence/2026-07-31-behavior-preserving-minimization-and-final-polish.md)
records the architecture, behavior, browser, performance, and deterministic
production evidence.

The active Goal Three direction is
[Product Parity, Performance, And Agentic Creative Calibration](docs/plans/v2/product-parity-performance-and-agentic-creative-calibration.md).
It is closing the complete V1/V2 product-parity matrix, establishing controlled
editor-performance evidence, improving the agent's creative perception and
feedback loop, and certifying a distinct second original production as both
final media and a portable editable project.

Historical milestones and decisions belong in
[the work ledger](docs/work-ledger.md) and
[parity evidence](docs/parity/evidence/).

## License

VizEngine is licensed under the [MIT License](LICENSE).

The project originated as a Master’s thesis at the University of Ljubljana.
The thesis remains available at [docs/viz-engine-thesis.pdf](docs/viz-engine-thesis.pdf).
