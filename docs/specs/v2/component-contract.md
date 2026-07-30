# V2 Component And Capability Contract

## Status

Implemented foundation.

This document describes the canonical V2 component-authoring and capability
composition boundary now present in the repository. It replaces the earlier
conceptual component shape with the contracts that runtime, editor, tools, and
render hosts actually consume.

## Purpose

VizEngine needs one component definition to answer four different questions:

1. What deterministic scene meaning does this component produce?
2. How can a human or agent discover and edit its settings?
3. Which executable capability supplied it?
4. Which renderer-specific implementation, if any, must the host attach?

Those answers must remain portable and inspectable without putting React,
browser state, filesystem paths, or renderer globals into the project
document.

## Core Boundary

The canonical split is:

```text
portable contracts
  ├─ component identity and implementation version
  ├─ data-only authoring schema
  ├─ inputs and compatibility
  └─ capability-pack manifest identity

trusted executable capability pack
  ├─ component render implementation
  ├─ node implementations
  └─ optional renderer extensions

host composition
  ├─ injects component/node registries
  ├─ injects renderer-program registries
  └─ attaches UI controls and host actions

portable project
  └─ stores component ids, settings, bindings, assets, and graphs only
```

A project bundle never embeds executable component or renderer code.

## Canonical Component Definition

`VizComponentImplementation` combines:

- stable `id`
- human-facing `name` and optional `description`
- `rendererFamily`
- `implementationVersion`
- optional portable `authoring`
- explicit input definitions
- optional render policy and metadata
- a deterministic `render(context)` function that returns a portable render
  node or `null`

The render context contains only explicit frame, viewport, layer, settings,
resolved inputs, materialized assets, and deterministic setting-sampling
inputs. Components do not reach into editor stores or browser-global state.

## Portable Authoring Schema

`VizComponentAuthoring` is plain serializable data:

```ts
interface VizComponentAuthoring {
  schemaVersion: 1;
  componentId: string;
  category?: string;
  tags?: string[];
  catalogVisibility?: "public" | "hidden";
  compatibility: "render-safe" | "bake-required" | "live-only";
  settings: VizComponentGroupSetting;
  presets?: VizComponentPreset[];
  defaultNetworks?: Record<string, VizComponentDefaultNetwork>;
}
```

The schema vocabulary deliberately stays small:

- `number`
- `text`
- `boolean`
- `color`
- `select`
- `file`
- `vector3`
- `list`
- `action`
- `group`

Settings can carry labels, descriptions, animation eligibility, and
declarative visibility conditions. Conditions support:

- `equals`
- `not-equals`
- `in`
- `not-in`
- nested `all`
- nested `any`

There are no callbacks in the portable schema. An `action` setting declares an
`actionId`; a host may attach the trusted behavior for that id. The preserved
editor currently projects action settings into its existing button
presentation while keeping the project value serializable.

Component presets are stable data records. Default animation networks may
reference a named network or carry a portable inline graph preset.

## Authoring Helper

`@viz-engine/components-core` provides
`defineVizComponentAuthoring(...)` and the `v` schema builder. These are
authoring conveniences, not a second contract.

The builder emits the `@viz-engine/contracts` data shape. Runtime inspection,
JSON serialization, validation, the preserved editor adapter, and future agent
tools consume that same output.

## Preserved Editor Projection

The editor does not own a separate component catalog.

`createEditorCompFromDefinition(...)` converts the portable schema into the
existing rich config-control classes at the React presentation boundary. This
preserves the established:

- grouped settings
- sliders and numeric constraints
- colors, selects, toggles, text, files, vectors, and lists
- conditional controls
- presets
- default node networks
- animation affordances
- component ordering and descriptions

The adapter is intentionally one-way:

```text
portable component definition ──> editor presentation objects
```

Presentation classes and callbacks never flow back into contracts, runtime
registries, or project persistence.

## Catalog Policy

`coreComponents` contains every first-party runtime component.

`coreCatalogComponents` is the curated first-party authoring order. A
runtime-only primitive may remain registered without appearing as a top-level
layer choice.

All fifteen preserved editor choices now come from `coreCatalogComponents` and
carry the same authoring schema as their runtime definition. There are no
editor-local files containing duplicate component defaults or presets.

## Capability Packs

The executable composition unit is:

```ts
interface VizCapabilityPack {
  manifest: {
    id: string;
    version: string;
    description?: string;
  };
  components?: VizComponentImplementation[];
  nodes?: VizNodeImplementation[];
  metadata?: Record<string, unknown>;
}
```

The manifest identifies the trusted package contribution. A registry retains
that origin beside every registration so inspection and future execution
manifests can report where behavior came from.

The first-party pack is `@viz-engine/components-core@0.0.1`.

Project-local trusted source should contribute a separate pack and be composed
by the host. Adding a reusable visual must not require editing an engine-global
map.

## Renderer Extensions

Renderer-specific executable code is composed separately from portable
components:

```ts
interface VizThreeRendererExtension {
  capabilityPack: VizCapabilityPackManifest;
  programs: Array<{
    id: string;
    implementationVersion: string;
    factory: VizThreeProgramFactory;
  }>;
}
```

`createVizThreeProgramRegistry(...)` composes these extensions, rejects blank
or duplicate capability-pack identities, rejects blank or duplicate program
ids, requires implementation versions, and retains capability-pack origin.

The Three compositor and preview controller accept the resulting registry as a
host dependency. They do not depend on a mutable module-global extension map.

This means a project-local visual can provide:

- one portable component definition
- one capability-pack registration
- one optional Three program registration

and execute without changing renderer core.

## Compatibility Classification

Every authorable component declares one of:

- `render-safe`
- `bake-required`
- `live-only`

This classification is authoring and validation truth. It allows agents,
editors, and render jobs to reject incompatible production paths before
expensive work begins.

Current catalog components are `render-safe`. The vocabulary is already
present for future bake-dependent or live-input-only capabilities.

## Validation Rules

Strict component registries reject:

- blank or duplicate capability-pack identities
- missing or duplicate component ids
- missing names
- duplicate or invalid input keys
- empty or unsupported input-source declarations
- invalid default-asset declarations
- authoring/component id mismatches
- unsupported authoring schema versions or non-group roots
- duplicate setting paths
- invalid setting bounds or defaults
- select defaults absent from options
- invalid action ids
- invalid visibility conditions
- invalid or duplicate preset ids

The registry exposes validation issues in non-strict mode and throws during
strict host composition.

## Identity And Reproducibility

There are three distinct identities:

1. capability-pack `id` and `version`
2. component `id` and `implementationVersion`
3. renderer program `id` and `implementationVersion`

They must not be collapsed. A pack may rev independently, a component may keep
its stable document id across compatible implementation updates, and renderer
program identity must remain inspectable for final-output reproduction.

The current contracts expose these identities. The production-loop execution
manifest still needs to lock and persist them with the project artifacts.

## Authoring Workflow

The canonical workflow for a new visual is:

1. scaffold or write one `VizComponentImplementation`
2. define its portable authoring schema beside the runtime implementation
3. register it in a trusted capability pack
4. register any renderer-specific program through a renderer extension
5. compose those contributions into the session/render host
6. inspect and validate the resulting registry
7. edit the same settings headlessly or through the projected editor controls
8. render through the same runtime semantics

The scaffold command now emits the authoring schema and directs authors toward
capability-pack composition.

## Proven Evidence

The implementation is covered by:

- data-only JSON roundtrip tests
- full fifteen-component catalog/schema tests
- strict invalid-schema tests
- project-local capability-pack composition tests
- structured editor-control inspection tests
- project-local Three renderer-extension execution tests
- component scaffold tests
- full foundation, package build, consumer smoke, and creative-loop smoke
- a real preserved-editor browser pass covering:
  - all fifteen Add Layer entries
  - schema-projected Simple Cube controls
  - add and undo
  - three existing animation graphs and live values
  - waveform transport and package-runtime preview
  - a clean browser console after correcting a non-numeric live-value
    presentation edge case

## Remaining Work

This foundation deliberately does not yet solve:

- hot-reloading trusted project-local capability source in a running editor
- locking capability identities into the execution manifest
- authoritative decoding of arbitrary boundary JSON
- distributing or sandboxing untrusted executable packs
- attaching the registry composition to one shared live `VizSessionHost`

The immediate next architecture milestone is the shared live session/control
target. It should consume these injected registries rather than creating a new
catalog or plugin abstraction.

## No-Legacy Rule

Do not shape new component contracts around V1 render callback signatures.

The preserved editor may adapt portable definitions into familiar controls,
but visual semantics, defaults, presets, compatibility, implementation
identity, and registry ownership belong to V2 package terrain.
