# Goal Three Project Lifecycle And Still Output

Date: 2026-07-31

Status: verified checkpoint for layer compositing controls, canonical project
persistence/import, and still-image export. Goal Three remains open.

## Canonical Import Boundary

Project files now cross one strict boundary before any state changes:

```text
bytes -> JSON -> file-envelope validation -> project validation
      -> embedded-asset decode -> canonical session import
      -> editor/node UI projection -> transport/history reset
```

Unsupported versions are rejected rather than warned through. Malformed
editor metadata, malformed canonical projects, duplicate or unreferenced
embedded assets, and unsupported encodings fail before editor UI mutation.
The canonical session import completes before UI projection, so a failed
import cannot leave a new panel state around an old project.

Expected user-file failures now produce visible toast feedback without
`alert`, console-error noise, or damage to the active project. The dropzone
accepts the actual `.vizengine.json` suffix through JSON files and visibly
rejects wrong file types.

## Persistence And Layer Semantics

The deterministic persistence test now round-trips explicit layer visibility,
opacity, blend mode, background alpha, and freeze policy alongside graphs,
node-editor UI, editor UI, and embedded local asset bytes.

The headed visible workflow saves a four-layer canonical file, verifies its V2
envelope and graph ownership, resets to the documented empty project, and
reopens the download. It then attempts malformed JSON, an unsupported version,
and a wrong-type drop. Every failure is explained and leaves layer identities,
revision, transport, and project state unchanged.

The compositor journey continues to compare all 17 supported blend modes
against Canvas 2D reference pixels and verifies nested color/layer alpha in the
single canonical runtime canvas with clean diagnostics.

## Still Output

The visible still-export journey now uses a controlled transparent project at
frame 23. PNG export proves:

- exact 1280 × 720 output
- intended RGB content
- layer opacity preserved as alpha rather than flattened to black
- a valid nontrivial PNG download
- project document, revision, current frame, duration, play state, and loop
  state unchanged by capture
- clean browser diagnostics

The still job is therefore using canonical project/frame semantics rather
than capturing or mutating incidental editor state.

## Parity Result

The following rows advance to `verified`:

- `layers.visibility-compositing`
- `persistence.save-load-reset`
- `persistence.drag-drop-import`
- `export.still-image`

`preview.multi-layer-compositing` remains partial. The shared preview/export
semantics and blend/alpha behavior are stronger, but hidden/frozen temporal
behavior still needs one explicit browser fixture before the broader row can
close.

## Focused Validation

- four project-persistence tests pass
- compositor, visible save/load/reset/failure, and still-export headed
  Chromium journeys pass
- studio type checking and touched-file ESLint pass
- expected invalid-file paths produce zero console diagnostics

The complete `pnpm check:foundation` gate passes: 33 verified / 9 partial
parity rows, clean architecture/format/lint/types, 62 Vitest files / 275 tests,
15 active headed Chromium journeys plus one opt-in skip, all 17 package builds,
the studio production build, and both consumer smokes.

## Assumptions And Boundaries

- V2 project files are strict full-replacement documents. There is no implicit
  compatibility mode for unknown versions.
- Editor UI metadata remains part of the project-file envelope, not the
  canonical `VizProjectDocument` scene truth.
- PNG transparency is tested through authored layer opacity over a transparent
  viewport. JPEG intentionally supplies an opaque black output background.
- Security/decompression limits for arbitrarily large user files are not
  certified by this local-product checkpoint.
