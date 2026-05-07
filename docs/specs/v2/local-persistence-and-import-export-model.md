# Local Persistence And Import/Export Model

## Purpose

This document defines how VizEngine V2 should behave as a local-first system
while still supporting Viz Cloud and Magnify integration cleanly.

It exists to answer:

- how local projects should be stored
- how local working head relates to cloud working head
- what a portable Viz export artifact should contain
- how import should behave
- how Magnify should think about local Viz artifacts versus cloud-hosted Viz

This is a critical boundary document because local persistence and import/export
must not create a second hidden scene architecture.

## Core Goal

We need one clean model that supports all of these without drift:

- standalone local OSS Viz usage
- hosted Viz Cloud usage
- movement between local and cloud
- reproducible export/import
- Magnify integration through stable refs or artifact bundles

## Core Rule

Local mode, cloud mode, and export/import must all use the same canonical scene
contracts.

That means:

- one `VizProjectDocument` shape
- one baked artifact reference model
- one stable asset reference philosophy

We must not create:

- one scene format for local
- one scene format for cloud
- one scene format for exported bundles

That would immediately split the product into incompatible modes.

## Decided Now

### Decision 1: Local Viz is a first-class mode, not a fallback

We are deciding now that local OSS Viz usage is a real product mode.

That means:

- local authoring must be legitimate
- local persistence must be designed deliberately
- export/import must not feel bolted on

### Decision 2: The canonical scene document stays the same everywhere

We are deciding now that the canonical `VizProjectDocument` shape is shared
across:

- local projects
- working head persistence
- stable project versions
- portable exports

The lifecycle differs by context, but the document contract does not.

### Decision 3: Import/export is an explicit product feature, not an afterthought

We are deciding now that import/export must be a first-class architectural
surface.

Reason:

- open-core credibility
- local-first credibility
- portability between Viz OSS and Viz Cloud
- future ecosystem friendliness

### Decision 4: Export artifacts should be self-describing and versioned

We are deciding now that a portable Viz export must be:

- explicit
- versioned
- inspectable
- stable enough for reproducible re-import

### Decision 5: Magnify may consume either cloud refs or exported Viz bundles

We are deciding now that Magnify integration should support two legitimate
modes:

- cloud/reference mode
- local/exported-bundle mode

This preserves both deep hosted integration and true local portability.

## Design Principles

The local persistence and import/export model should be:

- local-first
- contract-first
- artifact-first
- explicit
- inspectable
- provider-agnostic

It should avoid:

- hidden browser-only magic
- ad hoc cache directories acting as product truth
- opaque binary blobs as the only import/export format
- duplicate local and cloud semantics

## Canonical Content Layers

We should distinguish four layers clearly:

1. editor UI state
2. working head scene content
3. stable version scene content
4. portable project bundle

### 1. Editor UI state

Examples:

- selected layer
- open inspector panel
- viewport transform
- temporary drag state

This is local UI state only and should not be part of portable scene truth.

### 2. Working head scene content

This is mutable current scene content backed by the canonical
`VizProjectDocument`.

### 3. Stable version scene content

This is an explicit version snapshot, again backed by the same canonical scene
document shape.

### 4. Portable project bundle

This is the transport shape used to move a project and its required artifacts
between environments.

This bundle should reference the same canonical document semantics, not invent a
new scene model.

## Local Persistence Model

## Preferred First Posture

The first local persistence posture should be:

- one primary working project document
- local asset references with explicit ids
- explicit local baked artifact refs
- durable filesystem-backed storage

The exact app shell can change later.

The architecture should not assume browser `localStorage` as the primary long
term truth layer.

## Why Filesystem-First Is Better

A filesystem-oriented local model is better because it is:

- inspectable
- portable
- debuggable
- tool-friendly
- compatible with AI-agent workflows

It also aligns better with:

- git-friendly project history if desired
- local scripting
- future CLI support
- non-browser environments

## Preferred Local Project Shape

We do not need to freeze exact filenames yet, but the first good conceptual
shape looks like:

```text
my-viz-project/
  project.json
  assets/
  baked/
  metadata/
```

Where:

- `project.json` contains the canonical `VizProjectDocument`
- `assets/` contains local managed source artifacts
- `baked/` contains reusable derived artifacts
- `metadata/` can hold optional local-only operational metadata

## Important Rule

The canonical scene document should not depend on these exact paths.

It should depend on explicit asset and artifact references that can be resolved
through an environment-specific resolver.

This keeps the document portable.

## Local Working Head Semantics

Local working head should behave the same conceptually as cloud working head:

- one active mutable draft
- autosave updates that draft
- explicit actions create stable versions

The storage backend changes.

The behavior should not.

## Local Versioning Posture

We should not require a full local version graph system immediately.

Preferred first posture:

- durable working head
- explicit manual export/version cut
- optional local version snapshots later if justified

This keeps the baseline simple.

## Portable Export Bundle

We should define a real portable Viz bundle model now.

## Purpose Of The Bundle

A portable export bundle should support:

- moving a project from local Viz to Viz Cloud
- moving a project from Viz Cloud to local Viz
- archiving a self-contained scene package
- attaching a Viz scene to Magnify in artifact mode
- deterministic re-import later

## Bundle Rule

An export bundle should contain enough information to reconstruct the intended
project context without requiring hidden original environment state.

## Preferred Conceptual Shape

```ts
type VizProjectBundle = {
  schemaVersion: 1;
  kind: "viz.project-bundle.v1";
  manifest: VizProjectBundleManifest;
  document: VizProjectDocument;
  assets: VizBundledAssetEntry[];
  bakedArtifacts: VizBundledArtifactEntry[];
  metadata?: Record<string, unknown>;
};
```

## Preferred Manifest Shape

```ts
type VizProjectBundleManifest = {
  bundleId: string;
  projectId: string;
  title: string;
  exportedAt: string;
  exportedFrom:
    | "viz-oss-local"
    | "viz-cloud-working-head"
    | "viz-cloud-version";
  sourceWorkspaceId?: string;
  sourceProjectVersionId?: string;
  includesManagedAssets: boolean;
  includesBakedArtifacts: boolean;
  metadata?: Record<string, unknown>;
};
```

## What The Bundle Should Contain

At minimum the bundle should contain:

- canonical scene document
- asset manifest entries
- baked artifact manifest entries
- enough metadata to understand provenance

## Asset Inclusion Rules

We should make asset behavior explicit.

### Managed local assets

If Viz manages the asset file directly, bundle export should usually include it.

### Remote or external assets

If an asset is external, bundle export should choose explicitly between:

- embedding it
- leaving it as an external ref
- failing export if reproducibility requires the asset and it cannot be bundled

Silent omission is not acceptable.

## Baked Artifact Inclusion Rules

Bundle export should allow explicit policy choices:

- include baked artifacts
- exclude baked artifacts
- include only required baked artifacts

Preferred first posture:

- include referenced baked artifacts when feasible

Reason:

- better reproducibility
- faster re-open
- less ambiguity in render behavior

## Bundle Packaging Direction

We do not need to freeze the final transport encoding yet, but the bundle should
be easy to inspect and easy to stream.

Good directions:

- directory form for local use
- archive form for transport

Examples:

- unpacked folder bundle
- zipped archive containing manifest, document, and artifact folders

The important thing is not the archive extension.

The important thing is that the internal structure is explicit and versioned.

## Import Model

Import should be a real contract, not a “best effort” mystery.

## Import Goal

Import should:

- validate the bundle
- reconstruct the canonical project document
- register or copy assets as needed
- register baked artifacts as needed
- return a clear imported project result

## Preferred Import Behavior

1. validate bundle schema and manifest
2. validate canonical scene document schema
3. validate asset entries and artifact entries
4. materialize or register imported assets
5. materialize or register imported baked artifacts
6. create local project or cloud project/version context
7. return explicit ids and warnings

## Import Result Shape

```ts
type VizImportResult = {
  ok: boolean;
  projectId?: string;
  workspaceId?: string;
  projectVersionId?: string;
  importedAssetIds?: string[];
  importedBakedArtifactIds?: string[];
  warnings?: string[];
  errors?: string[];
};
```

## Import Identity And IDs

We should choose a clean posture here.

### Preferred rule

Imports should preserve source ids where safe and useful for internal
referential integrity inside the imported package.

But:

- environment-level ownership ids may still need remapping
- collisions must be handled explicitly

That means:

- internal graph/layer/asset references should remain coherent
- workspace-local registry identities may be reissued if required

## Import Collision Rules

We should not do vague merge behavior.

Preferred first posture:

- create a new imported project by default
- preserve bundle-internal references
- do not silently merge into an existing project

If later we support merge/import-into-project workflows, that should be an
explicit advanced feature.

## Cloud Import And Export

Viz Cloud should support:

- importing a local bundle into a workspace
- exporting a project version as a portable bundle
- optionally exporting working head explicitly

Important rule:

- cloud export of a stable version should be the safest default for external
  workflows

## Local Import And Export

Local Viz should support:

- opening a local project directory directly
- exporting a portable bundle
- importing a portable bundle into a new local project

This is important for open-core credibility.

## Magnify Integration Modes

Magnify should understand two valid Viz integration modes.

## Mode A: Cloud Reference Mode

Magnify stores:

- `vizWorkspaceId`
- `vizProjectId`
- `vizProjectVersionId`

Magnify requests preview/render through Viz APIs.

This is the preferred deep integration mode.

## Mode B: Bundle Artifact Mode

Magnify stores:

- a Viz portable bundle artifact
- optional extracted metadata

Magnify can then:

- send that bundle into Viz later
- keep it as a durable attached source artifact
- use it as a reproducible interchange package

This is the preferred offline/local-friendly integration mode.

## Important Magnify Rule

Magnify should not need to care whether a project was originally authored:

- locally
- in Viz Cloud

It should care whether it has:

- stable cloud refs
- or a stable portable bundle

That is the right integration seam.

## Resolver Model

Because documents should stay portable, asset and baked artifact resolution
should be environment-driven.

That means the runtime/editor should work through resolver interfaces such as:

- local filesystem resolver
- browser/local app resolver
- cloud object-store resolver
- imported bundle resolver

This is cleaner than baking path assumptions into the scene document.

## Security And Trust Rules

We should also define these now:

1. imported bundles must be schema-validated
2. imported bundles must not execute arbitrary code during import
3. asset and baked artifact paths must be normalized and sanitized
4. import must not trust hidden absolute source-machine paths
5. cloud import/export should respect workspace authorization

## Explicit Non-Goals

We are not deciding all of this yet:

- final CLI UX for import/export
- final archive extension
- full local branching/version graph
- real-time multi-device local/cloud sync
- complex partial bundle diff/merge

Those can come later if justified.

## Final Product Posture

The intended posture is:

- local Viz is real
- Viz Cloud is real
- one canonical scene contract spans both
- portable project bundles are first-class
- Magnify can integrate through cloud refs or portable bundles

This is the cleanest model for an open-core product that still wants deep hosted
integration.

## Decisions Locked In Here

We are deciding all of this now:

1. local OSS Viz is a first-class product mode
2. canonical scene contracts stay the same across local, cloud, and export
3. import/export is a first-class architectural surface
4. portable bundles should be self-describing and versioned
5. Magnify may integrate through cloud refs or portable bundles
6. asset resolution must be environment-driven, not hard-coded into documents
7. imports should create new projects by default rather than silently merging

## Next Docs To Write

The strongest next follow-up docs are:

1. future MCP/tool surface inventory
2. specialized AI runner vision
3. asset resolver and storage abstraction spec
