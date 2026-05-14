# Agent-Native Creative Loop Proof Plan

## Purpose

This plan implements the first real proof slice of Phase 6 from the
[Agent-Operated Live Editor Roadmap](./agent-operated-live-editor-roadmap.md).

The goal is not to claim the final product loop is finished.

The goal is to prove that the architecture now supports a truthful local
creative loop where an agent can operate the same project/runtime/editor stack
that the user sees.

## Why this phase matters

The roadmap is only credible if it eventually proves the workflow it promises:

- open the editor/runtime surface
- inspect the current scene
- mutate it through stable contracts
- add or rewire graph/layer behavior
- verify runtime outputs
- export and reload the result cleanly

Without this proof, the “agent-operated live editor” would still be mostly an
aspiration.

## Scope

Add a scripted local creative-loop scenario on top of the existing V2 operator
surface.

That scenario should:

- open the canonical example project
- mutate the working head through canonical actions
- add a new graph and layer
- inspect graph/runtime outputs at a chosen frame
- export the result to a bundle
- reload that bundle
- prove the roundtrip stays valid

It should also reinforce the browser/node boundary inside the control surface:

- browser-safe editor control stays in the root package entry
- bundle IO lives behind a Node-only secondary entry

## Non-goals

- final chat product
- browser automation as the main mutation path
- speculative cloud-runner orchestration
- pretending component authoring is already fully automatic

## Deliverables

- scripted local proof in `tools/foundation/agent-creative-loop-scenario.ts`
- browser-safe `@viz-engine/editor-control` root entry
- Node-only bundle helpers in `@viz-engine/editor-control/node`
- test and build config updates so both root app and node-only control paths
  validate cleanly
- full-gate proof through `pnpm smoke:creative-loop`

## Validation

- `pnpm smoke:creative-loop`
- external/package-facing operator tests that continue to pass
- full `pnpm check:foundation`

## Exit Criteria

This slice is done when:

- one scripted local scenario can exercise the real operator surface end to end
- the scenario proves working-head mutation, graph/layer addition, runtime
  inspection, bundle export, and bundle reload
- the control package keeps a clean browser-vs-Node boundary
- the proof survives the same full gate as the rest of the V2 system

## Next Slice

The next clean step after this proof is not more proof-only scripting.

It is to keep wiring more of the preserved V1 editor UX over the same
runtime/session/control stack:

- deeper transport behavior
- richer graph and layer panels
- stronger live component iteration inside the actual editor surface
