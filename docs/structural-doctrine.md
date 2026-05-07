# Structural Doctrine

## Core Doctrine

VizEngine V2 should be built by preserving the good ideas from V1 while
discarding the wrong boundaries from V1.

## Full Replacement Doctrine

The rewrite posture is:

- full replacement
- full purge
- no legacy dependency tail by default

This means:

- no long-lived dual runtime architecture
- no permanent `old/`, `legacy/`, `deprecated/`, or similar folders carried for
  comfort
- no compatibility layer unless it unlocks a specific, approved milestone
- no preserving old abstractions because migration feels safer

## Salvage Rule

Salvage:

- proven algorithms
- useful typed config patterns
- successful node/component ideas
- useful bake/export learnings

Do not salvage:

- store-coupled architecture
- muddled runtime/editor boundaries
- dead code
- comfort wrappers that only exist to avoid rewriting

## Simplicity Rule

Prefer:

- fewer stronger primitives
- smaller explicit contracts
- typed machine-readable metadata
- clean headless boundaries

Avoid:

- sprawling feature flags for old/new behavior
- compatibility indirection
- multiple competing scene models
- UI-first architecture pretending to be runtime architecture
