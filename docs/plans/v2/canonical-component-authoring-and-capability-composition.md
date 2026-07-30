# Canonical Component Authoring And Capability Composition

Status: implemented and validated on `codex/viz-engine-v2`.

## Goal

Complete Phase 1 of the agent-authored production-loop architecture:

1. define each authorable component once
2. keep its schema portable and data-only
3. preserve the full existing editor control experience
4. retain executable capability origin and implementation identity
5. let hosts compose project-local components and Three programs explicitly
6. remove editor-local catalog duplication and module-global renderer
   extension lookup

## Implemented Architecture

### One portable authoring truth

`@viz-engine/contracts` now defines a versioned authoring schema with:

- compatibility classification
- catalog metadata
- grouped settings
- numbers, text, booleans, colors, selects, files, vectors, lists, and actions
- declarative nested visibility conditions
- presets
- named or inline default animation networks

The schema contains plain serializable data only.

`@viz-engine/components-core` supplies a small builder for that contract.
Every one of the fifteen preserved editor catalog components now declares its
schema beside its package runtime implementation and has an explicit
implementation version.

### Preserved editor presentation

The existing editor config/control model remains a presentation attachment.
`createEditorCompFromDefinition(...)` projects the portable schema into those
controls, preserving the established catalog order, descriptions, defaults,
groups, conditions, presets, network defaults, and animation affordances.

The old `src/components/comps/*.ts` definition files were removed. The editor
catalog now maps the package-owned `coreCatalogComponents` directly.

### Capability-pack composition

`VizCapabilityPack` defines a trusted executable contribution with a manifest
and optional component/node implementations.

Component registries can now be constructed from multiple packs and expose
the capability-pack manifest for every registration. The core catalog is
published through the `@viz-engine/components-core` capability pack.

`@viz-engine/editor-control` accepts injected component and node registries.
Its structured component inspection reports:

- component identity
- implementation version
- compatibility
- capability-pack identity
- the complete portable authoring schema

### Three renderer extensions

Three programs now enter through explicit `VizThreeRendererExtension`
composition. Registrations carry:

- stable program id
- implementation version
- capability-pack identity
- trusted factory

The compositor and preview controller accept an injected program registry.
There is no mutable module-global extension map.

### Scaffolding

The component scaffold emits:

- stable component id and name
- implementation version
- a portable authoring schema
- a runtime implementation
- guidance to compose the result through a capability pack

It no longer instructs authors to edit independent runtime and editor
registries.

## Deliberate Policies

- executable source belongs to trusted capability packs
- portable project bundles remain data-only
- runtime-only first-party primitives may be registered but hidden from the
  authoring catalog
- host actions are attached to declared action ids; callbacks do not enter the
  schema
- capability, component, and renderer-program versions are separate identities
- React presentation classes are outputs of the adapter, never inputs to
  runtime or persistence
- project-local capabilities are composed by a host, not written into engine
  globals

## Validation

The milestone passed:

- package and studio type checks
- complete foundation suite: 38 files and 159 tests
- all package builds
- production studio build
- package-consumer smoke
- agent creative-loop and portable-bundle roundtrip smoke
- strict 42-capability parity matrix with zero gaps
- whitespace and diff validation

The browser and automated acceptance record is:

- [2026-07-30 canonical component authoring and capability composition](../../parity/evidence/2026-07-30-canonical-component-authoring-and-capability-composition.md)

Focused proofs cover:

- all fifteen catalog schemas and implementation versions
- data-only JSON roundtrip
- portable-schema validation failures
- capability-pack origin inspection
- injected project-local component control
- injected project-local Three-program execution through the real compositor
- component scaffold output
- editor/runtime preview planning from the generated catalog

The real preserved editor was also browser-validated:

- the `simple-example` project loaded with its three layers
- Add Layer displayed all fifteen canonical components
- adding Simple Cube produced the expected portable schema-derived controls
- Undo removed the inserted layer
- all three animation graphs opened with live node values
- the package-runtime preview, waveform, audio transport, and preserved layout
  remained functional
- a discovered non-numeric node live-value edge case was fixed at the
  presentation boundary
- a clean second browser context reported no errors or warnings

## Resolved Architecture Seams

The production-loop assessment items for:

- duplicated runtime/editor component authoring truth
- module-global component and Three-program extension lookup

are now resolved.

Node registries already supported explicit construction; the next session-host
milestone must finish injecting the same composed registries through the actual
live editor session and transport.

## Remaining Work

- one shared `VizSessionHost` and `VizControl`
- revision-safe actor-attributed transactions
- thin live transport over that same control target
- authoritative boundary decoders
- execution-manifest identity locks
- trusted capability build/reload workflow
- canonical bake and render jobs

These follow-ons must consume the composition boundary established here rather
than adding another catalog, plugin system, or project schema.

## Next Gate

An agent applies a transaction through the shared control object, and the open
editor immediately reflects that exact canonical session revision without UI
automation, file mirroring, or a second live session.
