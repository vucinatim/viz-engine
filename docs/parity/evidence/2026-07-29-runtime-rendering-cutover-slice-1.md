# Runtime Rendering Cutover — Slice 1

Date: 2026-07-29

## Scope

This evidence covers the first component-family cutover slice:

- portable `text` render-node contract
- SVG text adapter
- Three text adapter
- runtime implementation for `Debug Animation`
- runtime implementation for `Feature Extraction Bars`
- generic package-registry dispatch in the temporary editor runtime bridge

It does not claim completion of the full renderer cutover.

## Automated Evidence

Focused validation passed:

```text
pnpm studio:typecheck
pnpm vitest run \
  tests/foundation/component-registry.test.ts \
  tests/foundation/svg-renderer.test.ts \
  tests/foundation/editor-runtime-preview-runtime-bridge.test.ts \
  tests/foundation/three-renderer.test.ts
```

Result:

- 4 test files passed
- 13 tests passed

The focused tests prove:

- both migrated editor components are present in the strict runtime registry
- fixed project/settings/frame/seed inputs produce equal render plans
- text nodes serialize safely through the SVG adapter
- the editor bridge dispatches both canonical component ids into package
  runtime implementations
- existing Three primitive/compositor behavior remains covered

## Browser Evidence

The preserved Vite editor was exercised at `1280x720`.

Verified:

- added `Debug Animation` through the real Add Layer catalog
- observed runtime-rendered value, MIDI, text, track, border, and fill
- changed Value from `50` to `75` and Text from empty to `E4`
- observed the visible runtime output update to `Value: 75.00` and `Text: E4`
- added `Feature Extraction Bars` through the same catalog
- set channels to `0.20`, `0.40`, `0.60`, `0.80`, and `1.00`
- observed the five fills, labels, and numeric values update independently
- enabled the Kick animation and observed the preserved React Flow node
  workspace with Input and Output nodes
- started playback, observed transport advance to approximately `00:01.45`,
  and paused again
- observed no browser errors or warnings during the run

## Honest Classification

This slice proves runtime ownership and browser functionality for two
additional components. It does not yet prove:

- final pixel-level V1 parity
- export parity for these components
- sustained performance under animated text values
- completion of canonical package graph evaluation in the editor
- deletion of the temporary bridge or historical component draw callbacks

Those remain required by the parent cutover goal.
