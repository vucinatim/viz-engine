# Goal Three Authoring Schema And Live Controls

Date: 2026-07-31

Status: verified checkpoint for the complete portable authoring vocabulary and
continuous value transaction contract. Goal Three remains open.

## Result

The dynamic parameter editor now has one explicit ownership rule:

```text
pointer / keystroke sample
  -> active leaf-control presentation
  -> session-host live layer overlay
  -> canonical runtime preview
  -> visible pixels

gesture release / blur / Enter
  -> one typed project action
  -> one project revision and history result

Escape / pointer cancellation
  -> discard live overlay
  -> restore canonical control presentation
```

React remains responsible for editor structure and the presentation of the
active leaf control. It is not the pointer-rate project bus: the canonical
Zustand project projection is unchanged during the gesture, and the runtime
driver subscribes directly to the live session host. This is an ownership
boundary, not a broad memoization workaround.

## Authoring Vocabulary

The portable core catalog currently declares:

| Kind | Definitions |
| --- | ---: |
| group | 56 |
| number | 158 |
| color | 30 |
| boolean | 26 |
| text | 5 |
| select | 18 |
| list | 1 |
| vector3 | 8 |
| file | 2 |
| action | 1 |

The headed catalog journey visibly exercises every value kind plus the action
field using Morph Shapes, Light Tunnel, Stage Scene, and the loaded example.
It also exercises conditional fields, nested groups, a list of continuous
color controls, list addition, and vector scrubbing.

Missing or malformed editor values now resolve predictably from the portable
schema default instead of being cast into an invalid control. Select values
must remain in their declared options and partial vectors recover only their
missing axes. The component registry now rejects invalid number/vector bounds
or steps, malformed scalar defaults, duplicate/empty select options, invalid
file extensions, and list defaults that do not satisfy their item schema.

## Continuous Editing

- number sliders publish live values throughout pointer and keyboard movement
  and commit once on release
- direct numeric entry publishes valid transient values and commits on blur or
  Enter
- vector numeric scrubbing and typing use the same whole-vector live overlay
- text editing now publishes each keystroke to preview while committing once
  on blur or Enter
- color canvas gestures keep their imperative canvas path and publish through
  the same live overlay
- continuous controls nested in lists preserve the same gesture callbacks
- toggles, selects, list add/remove, actions, and asset attachment remain
  discrete operations because they do not have a continuous gesture

Accessible control names now come from the portable schema labels for select,
color, boolean, file, text, and vector-axis controls. Field kind/path markers
exist only as inspectable editor semantics and browser-test anchors; they do
not introduce another state model.

## Browser Proof

The headed Chromium authoring journey proves with real UI interactions:

- text typing advances the runtime preview render cycle while the canonical
  value and revision remain unchanged
- blur commits the final text, clears the live overlay, and advances the
  revision exactly once
- vector scrubbing changes its numeric readout and live whole-vector value
  while the canonical revision remains unchanged
- pointer release commits the vector exactly once
- conditional text and file fields appear for their declared select values
- list addition creates one canonical revision
- all supported value kinds and the action field render visibly
- no unexpected console warning, console error, or page error occurs

## Fixed-Device Performance

Environment: headed Chromium 151, Apple M1 Pro, 1600 × 1000, DPR 1, simple
three-layer example, 20 physical slider gestures.

| Boundary | Mean | Median | p95 | Max |
| --- | ---: | ---: | ---: | ---: |
| input to transient overlay | 0.26 ms | 0.20 ms | 0.30 ms | 0.50 ms |
| input to runtime publication | 1.42 ms | 1.40 ms | 1.50 ms | 2.40 ms |
| input to visible frame | 7.93 ms | 7.90 ms | 9.00 ms | 9.10 ms |
| release to canonical mutation | 0.32 ms | 0.30 ms | 0.50 ms | 0.60 ms |

All 20 gestures created zero project revisions before release and exactly one
revision on release. The compact machine-readable result is
[authoring live-contract metrics](./artifacts/2026-07-31-goal-three-authoring-live-contract.json).

## Assumptions And Boundaries

- “Optional fields” in this parity row means conditionally visible fields and
  recoverable absent values. Schema version 1 intentionally has no generic
  nullable setting kind; adding one without a product use case would increase
  complexity without meaning.
- Asset URI editing stays draft-local until attachment/blur because fetching
  or registering an external asset on every keystroke would be incorrect.
- Leaf-local React/Radix updates are acceptable presentation work. Broad
  editor/project/runtime React updates are prohibited on the live path.
- Schema defaults protect control presentation and registry authoring. This
  checkpoint does not redefine arbitrary imported project validation.
- The favorable interaction latency does not close the still-variable runtime
  playback tail or the broader editor-responsiveness and soak rows.

## Validation

- focused authoring and session tests: 25 tests passed
- focused headed authoring-vocabulary journey: passed
- fixed-device interaction benchmark: passed, 20 gestures
- all package, studio, and tool type checks: passed
- strict ESLint: passed
- complete foundation gate: 62 deterministic test files / 279 tests; 16
  active headed Chromium journeys passed with 1 opt-in benchmark journey
  skipped; all 17 packages and the studio built; packed-consumer and creative
  loop smokes passed

`parameters.dynamic-schema-form` advances to `verified`. The parity matrix now
contains 36 verified and 6 partial capabilities, with zero gaps and zero
unaudited rows.
