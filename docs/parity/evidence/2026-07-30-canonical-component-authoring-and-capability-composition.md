# Canonical Component Authoring And Capability Composition Evidence

Date: 2026-07-30  
Branch: `codex/viz-engine-v2`

## Scope

This record validates the Phase 1 production-loop cutover from duplicate
editor/runtime component definitions and implicit renderer lookup to one
portable authoring catalog with explicit capability composition.

It does not promote every touched parity row to `verified`. The browser pass is
targeted regression evidence for the component catalog, generated controls,
node graph, history, transport, and preview surfaces affected by the cutover.

## Automated Evidence

`pnpm check:foundation` passed on the final source state:

- parity matrix: 42 capabilities, zero recorded gaps
- all package, studio, and tool TypeScript checks
- production studio build
- complete foundation suite: 38 files / 159 tests
- all package builds
- package-consumer smoke
- agent creative-loop and portable-bundle roundtrip smoke

Focused tests prove:

- all fifteen catalog components use one portable package-owned schema
- authoring data survives a JSON roundtrip and contains no functions
- the preserved editor projection retains canonical defaults and ids
- invalid setting bounds, selects, conditions, presets, and identities are
  rejected at registry boundaries
- blank or duplicate capability-pack manifests are rejected
- a project-local component pack is injectable and inspectable through editor
  control
- a project-local Three program executes through the real compositor from an
  injected renderer extension
- duplicate or invalid renderer-extension identities are rejected
- generated component scaffolds include authoring and implementation identity
- non-numeric runtime values cannot crash numeric live-value presentation

`git diff --check` also passed.

## Browser Evidence

The preserved Vite editor was exercised at 1280×720 with the bundled
`simple-example` project:

1. Loaded the example and observed its three ordered layers:
   Fullscreen Shader, Simple Cube, and Noise Shader.
2. Opened Add Layer and observed all fifteen canonical component entries with
   their package-owned names and descriptions.
3. Added Simple Cube and observed the existing editor automatically display
   schema-derived color, size, and rotation controls.
4. Used the normal Edit menu to undo the inserted layer.
5. Opened the Animations selector and observed all three existing graphs,
   their nodes, edges, controls, and live values.
6. Played and paused the bundled 2:24 track; the underlying transport advanced
   to 1.098 seconds and the waveform/preview remained responsive.
7. Observed the package-runtime Cyber Grid, cube, and noise composition in the
   preserved layout.

The first graph inspection exposed a real presentation regression:
`LiveValue` called `toFixed` whenever the declared socket presentation type was
`number`, even when a live runtime value was a string. The formatter now
formats finite numbers and safely represents mismatched values without
throwing.

The complete workflow was repeated in a clean second browser context after the
fix. Browser diagnostics contained zero errors and zero warnings.

## Acceptance

The architecture cutover preserves the real editor catalog, controls,
animation/node-graph access, live values, undo, waveform transport, and
runtime-backed preview while deleting fifteen duplicate editor definition
files.

Project-local executable visuals now have a clean path through:

```text
portable component definition
  -> trusted capability pack
  -> injected component registry
  -> optional injected Three renderer extension
  -> shared runtime/compositor
  -> generated preserved-editor controls
```

The next parity-sensitive milestone is to put this composed registry and the
preserved editor behind one shared live `VizSessionHost` and control target.
