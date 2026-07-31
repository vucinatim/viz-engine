# Goal Three Authoring Workspace

Date: 2026-07-31

Status: verified checkpoint for the editor shell, resizable workspace,
focus-safe shortcuts, layer commands, layer-card disclosure, preset/reset, and
truthful history feedback. The broader Goal Three certification remains open.

## Purpose

This checkpoint validates the ordinary authoring loop around the already
certified live-value path. The editor must remain immediate while manipulating
layout and values, but canonical project changes must still be deterministic,
portable, and historically complete.

The resulting ownership model is:

```text
panel pointer movement -> resizable-panel DOM state -> saved workspace layout

continuous value movement -> transient session overlay -> runtime -> pixels
gesture release          -> one canonical history transaction

layer/preset/reset command -> typed project actions -> one grouped undo result

keyboard event -> focus guard -> canonical editor command
```

React owns editor structure and control presentation. It is not used as the
pointer-rate project bus.

## Repairs And Decisions

### Workspace layout

- Both editor panel groups now have versioned persistence identities.
- Horizontal and vertical dividers have accessible names and visible
  hover/active feedback.
- Existing 20% panel minimums remain the product bounds.
- Panel DOM and CSS canvas presentation move continuously. Expensive WebGL
  backing-buffer reallocations, waveform redraws, and Rhythm Lab canvas redraws
  coalesce behind one workspace-resize coordinator and flush once on release.
- Resizing stays outside the project and project history.

### Keyboard commands

- One focus-safe shortcut dispatcher now owns playback, undo, redo, Save As,
  fullscreen, and graph clipboard commands.
- Platform `Mod` and physical `Control` are distinct, fixing graph clipboard
  commands on macOS without breaking the Control+F fullscreen binding.
- Text entry never triggers editor commands. Unmodified shortcuts also yield
  to focused buttons, sliders, and other interactive controls.
- The separate playback key listener was deleted.

Documented bindings exercised in Chromium:

| Command | Binding |
| --- | --- |
| Play/pause | Space |
| Undo | Mod+Z |
| Redo | Mod+Shift+Z; Mod+Y remains supported |
| Save As | Mod+Shift+S |
| Fullscreen | Control+F |

### Layer commands and parameter state

- Timestamp-only layer IDs were replaced with UUID-backed IDs after a focused
  test reproduced add/duplicate collisions within one millisecond.
- The sortable registry now uses the same top-to-bottom order that is visibly
  rendered.
- Add, duplicate, reorder, remove, preset, and reset all enter through the
  canonical session action surface.
- Reset is now a real layer command: it restores component defaults, removes
  stale parameter graphs and bindings, reconstructs declared default graphs,
  and produces one grouped history result.
- Presets deep-merge over component defaults. A deliberately partial test
  preset therefore produces a complete configuration instead of leaving
  missing or stale values.
- Layer preset selection no longer displays a stale local “selected preset”
  after later manual edits.
- Nested list items propagate transient, commit, and cancel callbacks through
  the same live-value protocol as top-level controls. Continuous list-contained
  values no longer fall back to pointer-rate canonical updates.

### History feedback

V2 intentionally owns one chronological project history rather than separate
layer and graph histories. The preserved V1 badge text incorrectly claimed
that hover changed the target history. The badge now reports the focused
editor context while explicitly explaining that undo and redo follow one
chronological project history. Toolbar disabled states continue to report the
actual canonical undo/redo capabilities.

## Headed Browser Proof

The new authoring-workspace journey uses real Chromium pointer, keyboard,
focus, menu, dialog, drag-and-drop, reload, preset, and reset interactions. It
proves:

- more than 15 distinct observed panel widths during one 30-step pointer drag;
  the fixed-device, no-video benchmark enforces sub-25 ms median, sub-60 ms
  p95, and sub-120 ms maximum gaps between active changed-width samples
- the 20% declared minimum, nonblank preview during resize, and unchanged
  project semantics
- panel width restoration after a full reload
- playback from Space and no playback or project mutation while typing Space
  or Mod+Z in the Save dialog input
- the visible Mod+Shift+S Save As workflow
- accurate disabled undo/redo menu states and canonical shortcut execution
- complete duplicate, delete, reorder, undo, and redo behavior
- visible preset application, reset, and undo restoration
- graph/layer focus feedback with truthful unified-history language
- no unexpected console warnings, console errors, or page errors

The established discovery journey separately proves a visible searched layer
add, one revision, immediate expanded-card placement, and all bundled samples.

Manual Chrome calibration at 1600 × 1000 confirmed the established V1 density,
card hierarchy, compact controls, expanded settings, preview/timeline balance,
and discoverability of the new reset action. The captured state is
[authoring workspace at 1600 × 1000](./artifacts/2026-07-31-goal-three-authoring-workspace-1600x1000.png).

## Deterministic Validation

Focused validation passed:

- focused Vitest session/history and resize-coordinator tests
  - 2 files, 8 tests
- `pnpm exec playwright test --grep "authoring workspace"`
  - 1 headed Chromium journey in 11.7 seconds
- `pnpm benchmark:workspace-resize`
  - the same journey at 1600 × 1000, DPR 1, headed, without video or trace
  - 30 changed widths; 7.00 ms median, 12.80 ms p95, and 60.70 ms maximum
    active resize interval
- studio typecheck and strict ESLint
- complete `pnpm check:foundation` gate
  - 57 Vitest files, 263 deterministic tests
  - 13 active headed Chromium journeys passed and 1 opt-in performance journey
    skipped in the ordinary gate, in 3.4 minutes
  - all 17 package builds, the studio production build, the packed-consumer
    smoke, and the creative-loop smoke passed

The session tests additionally prove:

- partial preset completion from component defaults
- reset removal and undo restoration of graph documents and layer bindings
- reset redo
- complete create, duplicate, reorder, remove, undo, and redo commands

## Parity Result

The following rows advance to `verified`:

- `shell.layout`
- `shell.resizable-workspace`
- `shell.keyboard-shortcuts`
- `layers.create-remove-reorder`
- `layers.cards-and-disclosure`
- `parameters.presets-reset`
- `history.context-feedback`

The matrix now contains 18 verified and 24 partial rows, with zero gaps and
zero unaudited rows.

`parameters.dynamic-schema-form` remains partial. The schema and renderer
support all declared field kinds, and nested continuous list editing now obeys
the live-value contract, but a dedicated visible catalog-wide field-kind audit
is still required before that broader row can honestly advance.

## Assumptions And Boundaries

- “Save” in the preserved product means the existing explicit Save As file
  workflow; there is no silent overwrite target in a browser-only project.
- Workspace persistence is local editor preference, not portable project
  meaning, so it remains outside `VizProjectDocument` and project history.
- The fixed-device shell-resize sample closes the node overlay before measuring
  panel motion. Graph-open resize and graph-canvas movement remain part of the
  still-partial node editor and editor-responsiveness certification rather than
  being hidden inside this shell result.
- UUID layer identity is intentionally nondeterministic at authoring time.
  Deterministic rendering begins from the saved canonical document.
- This checkpoint does not certify node creation/search/presets, persistence,
  audio workflows, long-session stability, or the second production. Those
  remain active Goal Three work.
