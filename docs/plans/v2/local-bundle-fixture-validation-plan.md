# Local Bundle Fixture Validation Plan

## Purpose

This document defines the next implementation slice after the shared asset
materialization seam and the first `Three` semantics cleanup.

It exists to answer:

- how to prove Viz V2 can consume portable project data beyond in-memory example
  objects
- how to introduce a clean first local bundle-directory posture without
  overbuilding the final import/export system
- how to validate the runtime against filesystem-backed portable scene inputs

## Why This Slice Exists

The current runtime is no longer a toy, but most validation still starts from
hardcoded example objects exported from TypeScript modules.

That is not enough.

If Viz is going to become a real local-first and portable system, it must prove
that the same runtime can consume project data from a filesystem-backed bundle
shape.

## Goal

Introduce a real local bundle fixture and a typed loader path that can feed the
existing runtime without changing runtime ownership.

## First Posture

The first posture should be a local bundle directory, not yet a final zipped
archive flow.

Conceptually:

```text
example-reactive-bars-bundle/
  bundle-manifest.json
  project.json
  assets/
  baked/
```

## Implementation Steps

1. add typed bundle-manifest contracts
2. create a real example bundle fixture directory
3. add a local bundle loader in the local-first CLI layer
4. validate project/frame/render/svg paths from the bundle fixture
5. make sure the example-projects package ships the fixture data
6. rerun the full V2 validation surface

## Non-Goals

This slice should not yet attempt:

- final zip export/import
- cloud bundle publication flows
- browser-side bundle loading
- general asset transformation jobs

## Success Criteria

This slice is complete when:

- V2 can validate and render from a real bundle directory fixture
- the runtime contract remains unchanged
- bundle loading stays outside the core runtime package
- `pnpm check:foundation` passes
