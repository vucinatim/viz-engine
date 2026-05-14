# Working Agreements

These are the working rules for VizEngine V2.

## Core Direction

VizEngine should become:

- a deterministic visual runtime
- a browser-based authoring editor for that runtime
- an AI-native scene system
- a reusable rendering attachment for Magnify Core

Very important clarification:

- the V1 editor experience is not disposable
- the V1 hidden architecture is disposable
- the visible editor surface should remain effectively identical unless there
  is a clearly better replacement

That means preserving, by default:

- the same visual styling language
- the same panel layout
- the same toolbar/header posture
- the same layer workflow
- the same node-editor posture
- the same audio/transport posture
- the same overall interaction density and feel

We are not trying to invent a weaker alternate editor.

We are trying to preserve and rebuild the existing high-quality live authoring
experience on top of proper V2 contracts and runtime boundaries.

It should not become:

- only a browser toy
- only a Remotion project
- a pile of editor state disguised as runtime architecture

## Architecture Rules

1. Prefer one canonical project document.
2. Keep editor state separate from runtime state.
3. Keep runtime state separate from render inputs.
4. Treat deterministic frame evaluation as a first-class contract.
5. Make hidden mutable state explicit or remove it.
6. Make baking and precomputation first-class, not hacks.
7. Keep Remotion as an adapter, not the source-of-truth architecture.
8. Keep the runtime headless-capable.
9. Keep the component and node authoring API small and typed.
10. Prefer fewer stronger primitives over sprawling configurability.
11. Preserve the proven V1 editor UX patterns unless V2 gives a clearly better
    replacement.
12. Replace the architecture underneath the editor, not the product-quality
    editing posture itself.
13. Do not redesign the editor shell, color system, button language, panel
    structure, or node-editor posture unless explicitly approved.
14. Treat agent operability as a state/action/runtime integration problem, not
    as a reason to simplify or replace the editor UX.

## Rewrite Rules

This rewrite is a full replacement rewrite.

Default assumptions:

- no legacy compatibility layer
- no deprecation scaffolding
- no dead code preservation
- no dead folder preservation
- no long-term old/new parallel architecture

If a temporary bridge is needed, it should be explicitly justified and removed
quickly.

This rewrite rule applies to architecture, not to hard-won UX quality.

We should purge:

- bad store ownership
- hidden runtime semantics
- dead paths
- obsolete coupling

We should preserve deliberately:

- live authoring feel
- panel layout quality
- workflow clarity
- serious-tool interaction patterns

## AI-Native Rules

The AI should not need to click around the UI to operate the system.

The editor should remain powerful and dense for humans.

The agent should operate the same scene through stable contracts underneath
that UI, with browser interaction used mainly for verification or exceptional
surface-level actions.

VizEngine should expose stable machine-facing actions such as:

- create layer
- create component instance
- set parameter
- create node
- connect node
- bake feature timeline
- bake simulation cache
- render preview frame
- export scene artifact

Every component and node should eventually expose self-describing metadata:

- id
- purpose
- config schema
- examples
- compatibility mode
- performance profile
- asset requirements

## Runtime Rules

The runtime should support at least three execution modes:

- live
- deterministic render
- bake

These modes should share the same project model, but not necessarily the same
internal execution shortcuts.

## Component Rules

Component code should move toward:

- explicit frame/time input
- explicit audio/feature input
- explicit seeded randomness
- explicit local state shape
- optional deterministic simulation step
- optional bake step for expensive systems

Avoid new component APIs that:

- read directly from app stores
- depend on wall-clock timing
- depend on browser-only side effects during evaluation
- hide non-deterministic state transitions

## Node Rules

Nodes should be classified clearly:

- pure nodes
- temporal nodes
- bake nodes

Stateful temporal behavior is allowed, but it must be declared explicitly and
be replayable.

## Magnify Integration Rules

Magnify Core should consume VizEngine through explicit contracts:

- project artifacts
- baked feature timelines
- render-safe visual scene layers
- deterministic render adapters

Preview and final render should not drift into separate semantic models.

## Documentation Rules

When the V2 architecture changes materially, update:

- [current-state.md](./current-state.md)
- [visions/viz-engine-v2-vision.md](./visions/viz-engine-v2-vision.md)
- [suggestions.md](./suggestions.md)

Use docs as the source of truth, not chat memory.
