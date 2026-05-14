# Package Consumer Readiness Proof Plan

## Purpose

This document defines the next implementation slice after the first
media-backed render-node proof.

It exists to answer:

- whether Viz V2 packages are actually consumable outside the monorepo
- whether dist-first exports are real or only look correct internally
- how to prove the local tarball integration posture before Magnify consumes Viz

## Core Position

Internal workspace success is not enough.

If Viz is going to integrate cleanly into Magnify, the package seam must be
proven outside local TypeScript aliases and workspace resolution.

That means V2 needs a dedicated package-consumer readiness proof.

## What This Slice Must Prove

This slice should prove:

- key V2 packages can be built and packed cleanly
- packed manifests resolve workspace dependencies correctly
- tarballs do not ship accidental source-only internals
- an external temporary consumer can install the tarballs and execute a real
  Viz render path
- the consumer proof can use the same canonical example project and produce the
  same deterministic SVG output

## Non-Goals

This slice should not yet deliver:

- actual Magnify repo modifications
- npm publication automation
- full public-package scope decisions
- browser/WebGL consumer proof outside the repo

Those can come later.

## Recommended Scope

The first consumer-readiness proof should cover:

- `@viz-engine/contracts`
- `@viz-engine/runtime`
- `@viz-engine/components-core`
- `@viz-engine/example-projects`
- `@viz-engine/renderer-svg`
- `@viz-engine/remotion-adapter`

That is enough to prove the shared runtime seam and the first external render
path.

## Architectural Rule

The proof must run as a real external consumer.

It should not rely on:

- repo-local TypeScript path aliases
- direct `src/` imports
- monorepo-only workspace resolution behavior

## Expected Outcome

After this slice:

- Viz has a repeatable tarball consumer smoke test
- package manifests are cleaner and more publication-shaped
- the future Magnify local tarball proof has a direct precursor inside Viz

## Final Position

This slice is successful if Viz packages can be packed, installed into a clean
temporary consumer, and produce the same deterministic runtime-backed SVG proof
outside the monorepo.
