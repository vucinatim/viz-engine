# Local-First CLI And Developer Ergonomics Plan

## Purpose

This document defines the intended local-first CLI and developer/operator
ergonomics posture for VizEngine V2.

It exists to answer:

- what the local command surface should look like
- how humans should operate Viz without depending on the hosted product
- how agents should benefit from the same local workflows
- what the first CLI families should be
- how CLI, package, runtime, and bundle workflows should fit together

This is a practical workflow/spec document built on top of the deeper V2
architecture.

## Core Goal

Viz should be a serious local-first system, not just a browser app with hidden
behavior.

That means a developer or agent should be able to do meaningful work locally
through explicit commands for things like:

- project creation
- validation
- preview/render requests
- bake operations
- import/export
- package proof workflows

without needing Viz Cloud just to operate the system coherently.

## Core Rule

The CLI should wrap the same stable contracts and runtime seams the rest of V2
uses.

It should not become a parallel architecture.

That means:

- CLI commands should use the same project document contracts
- CLI commands should use the same resolver model
- CLI commands should use the same runtime/bake/render boundaries
- CLI commands should not rely on editor-only state

## Why This Matters

The V2 architecture now strongly assumes:

- canonical scene documents
- local-first persistence
- portable bundles
- package-first Magnify proof
- future MCP/tool surfaces

Without a strong local CLI/dev ergonomics layer, those ideas stay theoretical.

The CLI is the practical human and agent operator surface for local-first Viz.

## Decided Now

### Decision 1: Local-first CLI is a first-class V2 requirement

We are deciding now that Viz should have a deliberate local CLI posture.

This is not an optional nice-to-have.

### Decision 2: CLI should serve both humans and agents

We are deciding now that the CLI should be usable by:

- developers
- advanced users
- local automation
- AI agents operating inside a repo/workspace

This means outputs should be:

- readable
- scriptable
- stable

### Decision 3: CLI should be contract-first, not UI-first

We are deciding now that the CLI should operate over:

- project documents
- assets
- artifacts
- runtime requests
- bundle flows

not over hidden editor state.

### Decision 4: Local workflows should be valid product workflows

We are deciding now that local-first workflows are not just dev hacks.

They are a legitimate mode of using Viz.

### Decision 5: Existing scripts should evolve into a coherent V2 CLI surface

We are deciding now that scattered helper scripts should eventually converge
into a deliberate CLI posture rather than remaining random task entrypoints.

## Ergonomics Principles

The local operator experience should be:

- explicit
- composable
- inspectable
- script-friendly
- stable enough for automation
- aligned with the actual architecture

It should avoid:

- requiring the browser for every meaningful operation
- hidden temp-file conventions
- vague command semantics
- one-off scripts with incompatible argument shapes

## CLI Scope

The local CLI should eventually cover six major families:

1. project commands
2. asset/artifact commands
3. validation and diagnostics commands
4. bake/render/preview commands
5. import/export/bundle commands
6. package/dev-integration commands

## 1. Project Commands

These are the basic local project operations.

Examples:

- `viz project init`
- `viz project inspect`
- `viz project validate`
- `viz project summary`
- `viz project version cut`

Purpose:

- create local projects
- inspect project metadata
- validate canonical documents
- prepare explicit local versions when useful

## 2. Asset/Artifact Commands

Examples:

- `viz asset list`
- `viz asset inspect`
- `viz asset import`
- `viz artifact list`
- `viz artifact inspect`

Purpose:

- inspect managed local media
- inspect baked artifacts
- make local asset state explicit

## 3. Validation And Diagnostics Commands

Examples:

- `viz validate`
- `viz diagnose runtime`
- `viz diagnose render-compat`
- `viz diagnose dependencies`
- `viz diagnose performance`

Purpose:

- catch structural problems early
- help both humans and agents understand why a scene is failing
- surface missing refs, incompatible nodes, or unresolved assets

## 4. Bake/Render/Preview Commands

Examples:

- `viz bake audio-features`
- `viz bake checkpoints`
- `viz preview frame`
- `viz preview clip`
- `viz render`

Purpose:

- make local deterministic output real
- make bake flows observable
- enable headless preview/render workflows

## 5. Import/Export/Bundle Commands

Examples:

- `viz bundle export`
- `viz bundle import`
- `viz bundle inspect`
- `viz bundle unpack`

Purpose:

- make portability real
- support local/cloud interchange
- support Magnify artifact-mode handoff

## 6. Package/Dev-Integration Commands

Examples:

- `viz package build`
- `viz package pack`
- `viz package inspect`
- `viz package magnify-proof`

Purpose:

- support the package-first Magnify proof
- make local tarball workflows explicit
- make package output inspectable

## Command Philosophy

We should prefer:

- a small set of strong top-level nouns
- predictable subcommands
- explicit flags

The likely core noun families are:

- `project`
- `asset`
- `artifact`
- `validate`
- `diagnose`
- `bake`
- `preview`
- `render`
- `bundle`
- `package`

This is cleaner than a large flat command list.

## Output Philosophy

CLI output should support both:

- direct human reading
- downstream automation

Preferred posture:

- normal readable output by default
- `--json` for stable machine-readable output

This is especially important for agent workflows.

## Error Philosophy

Errors should be:

- explicit
- actionable
- stable enough for automation

A good CLI error should make clear:

- what failed
- which project/asset/artifact id or path was involved
- whether the issue is validation, resolution, or runtime-related
- what the next likely fix is

## Local Project Root Direction

The CLI should work cleanly with the local-first project structure we already
planned.

Conceptual root:

```text
my-viz-project/
  project.json
  assets/
  baked/
  metadata/
```

The CLI should treat that as a first-class local operating unit.

That means commands should support:

- current working directory discovery
- explicit `--project` path targeting

## Resolver Relationship

The CLI should be one of the main clients of the asset/artifact resolver model.

That means commands like:

- `validate`
- `preview`
- `render`
- `bundle export`

should all rely on the same resolver abstractions, not reimplement path logic
separately.

This is a very important maintainability rule.

## Runtime Relationship

Preview and render CLI commands should use the same runtime seams as:

- the editor
- package-first Magnify proof
- future hosted render adapters

That means local CLI rendering is not a toy side path.

It is a real runtime client.

## MCP/Tool Relationship

The local CLI and the future MCP/tool surface should feel aligned.

They do not need identical names, but they should map cleanly to the same
underlying operations.

That gives us:

- better parity between human and agent workflows
- fewer hidden codepaths
- more reusable core operations

## Package-First Magnify Relationship

The CLI should make the package-first Magnify proof easier, not harder.

That means we should likely support commands such as:

- building the runtime packages
- packing local tarballs
- inspecting packaged exports
- running a local proof preparation workflow

This matters because the package-first proof is now a real V2 milestone.

## Existing Script Transition Rule

Today the repo has a small set of script entrypoints in [package.json](/Users/timvucina/Desktop/MyProjects/viz-engine/package.json), mostly around the app and docs.

The V2 direction should be:

- keep useful scripts during transition
- gradually converge meaningful operational scripts into a coherent CLI
- avoid growing a second random helper-script ecosystem

## Good Early CLI Milestones

The first useful CLI milestones should probably be:

## Milestone A: Project Validation Baseline

Deliver:

- `viz project inspect`
- `viz validate`
- `viz diagnose dependencies`

Reason:

- these are high-value
- they help both humans and agents
- they reinforce canonical contracts early

## Milestone B: Local Preview And Bake Baseline

Deliver:

- `viz preview frame`
- `viz bake audio-features`
- `viz artifact inspect`

Reason:

- proves runtime/bake seams locally

## Milestone C: Bundle And Portability Baseline

Deliver:

- `viz bundle export`
- `viz bundle import`
- `viz bundle inspect`

Reason:

- makes local/cloud interchange real

## Milestone D: Package-First Magnify Baseline

Deliver:

- `viz package build`
- `viz package pack`
- `viz package inspect`

Reason:

- directly supports the early Magnify integration path

## Milestone E: Richer Diagnostics And Local Versioning

Deliver later:

- performance diagnostics
- render-compat reports
- explicit local version-cut helpers

Reason:

- useful, but not required for the first baseline

## Agent Ergonomics

Because this repo is becoming AI-native, the CLI should also optimize for agent
use.

That means:

- commands should be deterministic
- outputs should support `--json`
- side effects should be explicit
- ids and paths should be returned clearly
- commands should avoid interactive-only flows by default

This is the right local-agent posture.

## Human Ergonomics

For humans, the CLI should feel:

- simple
- obvious
- unsurprising
- inspectable

A user should not need to remember hidden internal architecture to perform
common local workflows.

## Non-Goals

We are not deciding all of this yet:

- exact binary name
- exact implementation framework for the CLI
- exact argument parser
- whether the CLI lives in the main app package or its own package
- every final command spelling

Those should tighten once the first real V2 packages exist.

## Final Product Posture

The intended posture is:

- local-first Viz is a serious operating mode
- the CLI is a first-class local operator surface
- humans and agents should both benefit from it
- it should align with project docs, resolvers, runtime, bundles, and package
  proof workflows

This is the right practical layer on top of the V2 architecture.

## Decisions Locked In Here

We are deciding all of this now:

1. local-first CLI is a first-class V2 requirement
2. CLI should serve both humans and agents
3. CLI should wrap stable contracts rather than inventing a parallel
   architecture
4. preview/bake/render/import/export/package workflows should all become
   explicit local commands
5. package-first Magnify proof should be supported deliberately by the local
   command surface

## Next Docs To Write

The strongest next follow-up docs are:

1. audio feature timeline spec
2. asset lifecycle and derivation job model
3. package/build publication and versioning strategy
