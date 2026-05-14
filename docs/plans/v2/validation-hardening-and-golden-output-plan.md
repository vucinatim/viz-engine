# Validation Hardening And Golden Output Plan

## Purpose

This slice strengthens automatic validation before deeper engine capability
work.

The goal is to protect the real V2 foundation that now exists:

- canonical project documents
- deterministic runtime planning
- graph execution
- shared asset materialization
- bundle load/export/reload
- SVG proof rendering
- `Three` preview composition
- pure project actions

## Why This Slice Exists

The current V2 tests already prove a lot of structural behavior, but many of
them still verify broad shape rather than pinning canonical outputs tightly.

That is enough for early construction.

It is not enough for the next wave of work:

- temporal graph state
- deeper compositor semantics
- more V1 visual ports
- broader bundle/import/export behavior

We need stronger regression detection before those slices land.

## Scope

This slice should add:

- file-backed golden fixtures for canonical outputs
- a deliberate fixture refresh command
- stronger negative-path bundle validation tests
- stronger action/bundle roundtrip coverage through the existing operator
  surface

## Validation Targets

The first hardened goldens should cover:

- canonical example frame-plan output
- canonical example render-plan output
- canonical SVG proof output
- canonical exported bundle manifest output

The first hardened negative-path validation should cover:

- invalid manifest kind/schema
- missing asset file
- missing artifact file
- orphan asset/artifact entries
- missing asset/artifact entries

## Architectural Rules

- golden fixtures should be explicit checked-in files, not hidden inline blobs
- fixture generation should be intentional and command-driven
- test summaries should normalize unstable details instead of snapshotting
  accidental noise
- runtime code should not learn test-only behavior
- bundle corruption tests should exercise the same real local bundle loader,
  not mocked validation helpers

## Completion Bar

This slice is complete when:

- the repo has a real golden-fixture update command
- canonical output tests compare against checked-in fixtures
- bundle corruption tests cover the first real failure matrix
- `pnpm check:foundation` remains green
