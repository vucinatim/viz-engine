# First Action Surface Implementation Plan

## Purpose

This slice turns the V2 action vision into a real implementation baseline.

The goal is not full cloud orchestration or full editor integration yet.

The goal is a small pure mutation layer that:

- operates on `VizProjectDocument`
- uses explicit typed actions
- can be called by AI, CLI, tests, and future editor code
- stays separate from runtime state and UI state

## Why This Slice Exists

The repo already says AI and the editor should converge on stable actions.

But until this slice, that was only a design promise.

This slice makes the first part of that promise real.

## Scope

The first implementation should stay intentionally small.

It should support real high-value document mutations such as:

- attach or replace asset refs
- create, remove, and move layers
- set layer settings and layer inputs
- create graphs
- add graph nodes
- set node input bindings
- set graph outputs

This is enough to prove the mutation model without building a giant action
system too early.

## Architectural Rule

This should be a pure document-action package.

It should not:

- mutate runtime instances
- mutate editor UI state
- depend on browser-only behavior

It should only reduce explicit actions into new canonical project documents.

## Validation Bar

This slice is complete when:

- typed actions exist in canonical contracts
- a pure reducer package exists
- tests prove actions can create valid project mutations
- tests prove mutated projects still validate and plan/render correctly
- `pnpm check:foundation` remains green
