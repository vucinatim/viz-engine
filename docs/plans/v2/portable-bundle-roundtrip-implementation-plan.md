# Portable Bundle Roundtrip Implementation Plan

## Purpose

This slice turns the current local bundle proof into a real export/import
surface.

Before this slice, Viz V2 could:

- load a bundle directory
- validate a bundle directory
- render from a bundle directory

But it could not yet write a new portable bundle from runtime-facing project
inputs.

That means portability was only half real.

## Goal

Add a clean node-only bundle writer that can:

- write `project.json`
- write a canonical `bundle-manifest.json`
- materialize asset files from exportable resolved assets
- materialize artifact payload files from exportable resolved artifacts
- support roundtrip reload and validation through the existing bundle loader

## Architectural Rule

This logic belongs in the node-only local-bundle layer.

It does not belong in:

- `viz-runtime`
- renderers
- app shells

The runtime should continue consuming resolved inputs only.

## First Export Scope

The first export writer should support:

- file-backed resolved assets
- data-URI-backed resolved assets
- byte-backed resolved assets
- JSON-serializable resolved artifact payloads
- file-backed artifact fallbacks where needed

It should fail explicitly for inputs that are not exportable yet.

That is better than pretending every runtime input is already portable.

## Validation Bar

This slice is only complete when:

- a bundle can be exported from loaded bundle/runtime inputs
- the exported bundle can be reloaded
- the reloaded bundle validates cleanly
- render output from the reloaded bundle still works
- `pnpm check:foundation` remains green
