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

- [Compounding product vision](docs/visions/viz-engine-compounding-vision.md)
- [Documentation index](docs/docs-index.md)
- [Current state](docs/current-state.md)
- [Autonomous development compass](docs/autonomous-development-compass.md)
- [Working agreements](docs/working-agreements.md)
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

The two certified agent-authored productions are
[Signal Cathedral](docs/plans/v2/first-agent-authored-production-signal-cathedral.md)
and
[Afterlight Assembly](docs/parity/evidence/2026-08-04-afterlight-assembly-motion-and-rig-polish.md).

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

Goals One through Four are complete and certified. The repository now has the
canonical V2 substrate, behavior-preserving consolidation and minimization,
42/42 verified parity capabilities, a calibrated live agent loop, two original
productions, and exact Light Tunnel 60 FPS performance certification.

[Goal Five](docs/plans/v2/flagship-autonomous-production-and-creative-system-maturation.md)
is paused at its completed Phase 0 boundary while its approved autonomous
operating model is implemented and proven. It remains the sole planned
implementation program: an ambitious
multi-act, multi-layer flagship production and creative-system maturation
campaign. Gate 0 is approved and the immutable planning baseline is
`b2b23b577feda29ef7eca9dcbf35a4e8c1162781`.

See [current state](docs/current-state.md) for implementation truth,
[the documentation map](docs/docs-index.md) for authority, and
[parity evidence](docs/parity/evidence/) for completed proof.

## Project Origin

The project originated as a Master’s thesis at the University of Ljubljana.
The thesis remains available at
[docs/thesis/viz-engine-thesis.pdf](docs/thesis/viz-engine-thesis.pdf).

The repository does not currently contain a license file. Final open-core
licensing is an explicit product decision rather than an assumption.
