# Phase 8 Canonical Project Persistence Closeout

## Purpose

Finish the next major transitional seam under the preserved editor:

- stop save/load/reset from speaking in legacy store payloads
- make `.vizengine.json` files reflect canonical project and graph truth
- keep the visible editor behavior unchanged

## What changed

- `src/lib/project-persistence.ts`
  - export now writes a canonical project file with:
    - `project`
    - `graphs`
    - `nodeEditorUi`
    - `editorUi`
  - load/hydration now re-enters the editor through:
    - `editor-project-store`
    - `editor-graph-store`
    - node-editor UI/session state
    - editor UI state
  - reset now clears canonical stores first, instead of reconstructing state
    through legacy layer/value payloads
- bundled sample project files in `public/projects/*.vizengine.json` were
  migrated to the same canonical shape

## Why this matters

Before this slice:

- project persistence still serialized and hydrated the editor as:
  - `layerStore`
  - `layerValuesStore`
  - `nodeNetworkStore`
  - `editorStore`
- that directly contradicted the rewrite goal of one canonical project/runtime
  architecture

After this slice:

- project files now reflect canonical scene and graph truth directly
- save/load/reset no longer depend on legacy-shaped store payloads
- bundled sample projects no longer ship the old persistence shape

## Validation

- `pnpm vitest run tests/foundation/project-persistence.test.ts tests/foundation/public-sample-projects.test.ts tests/foundation/editor-project-store.test.ts tests/foundation/history-store.test.ts tests/foundation/editor-graph-store.test.ts`
- `pnpm check:foundation`

## Remaining work after this phase

- tighten the remaining history/control seams so editor and future agent tools
  converge on one clearer canonical control plane
- address build hygiene warnings:
  - large Vite chunk size
  - static/dynamic import warnings around `idb-file-store` and `export-store`
