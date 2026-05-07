# Package Build Publication And Versioning Strategy

## Purpose

This document defines the intended package build, publication, and versioning
strategy for VizEngine V2.

It exists to answer:

- which Viz packages should be public
- how package versions should be managed
- how packages should be built and published
- how local tarball proof and npm publication should relate
- what release checks should exist before publish

This is the practical follow-up to the V2 package split and package-first
Magnify proof.

## Reference Posture

This strategy is informed by the release/publication discipline in
`../air-jam`.

The important thing to copy is not exact file names.

It is the operational posture:

- small intentional public surface
- canonical GitHub-driven publish path
- strong local prerelease gates
- tarball smoke confidence
- explicit public-package metadata handling

## Core Goal

Viz should have a professional package publication story that supports:

- local workspace development
- local tarball proof workflows
- future npm publication
- clean package boundaries
- reliable Magnify consumption

without turning package publishing into chaos.

## Core Position

The right default posture is:

- keep the public package surface intentionally small
- use unified versioning at first
- publish through GitHub Actions as the canonical path
- use npm trusted publishing when public publish starts
- keep local manual publishing as fallback-only
- make tarball smoke testing part of the release discipline

This is the cleanest early strategy for Viz.

## What We Should Copy From Air Jam

Air Jam has several patterns worth reusing:

1. a clearly defined public package set
2. a canonical GitHub Actions publish path
3. trusted publishing instead of long-lived npm tokens
4. a lighter publish-path CI gate and heavier local prerelease gate
5. tarball smoke validation
6. package manifest rewriting for public workspace dependencies at pack/publish

Those ideas transfer well.

## What We Should Not Copy Blindly

We should not copy implementation details blindly if Viz’s package graph ends up
simpler or different.

Examples:

- exact tag naming conventions
- exact scripts
- exact package set shape
- exact “all packages share a version forever” rule if Viz later grows into a
  more complex graph

We should copy the discipline and simplify where Viz can.

## Public Surface Rule

Viz should keep a deliberately small public package surface.

We should not publish every internal package just because it exists.

## Recommended Initial Public Package Set

The likely first serious public package set should be:

1. `@viz-engine/contracts`
2. `@viz-engine/runtime`
3. `@viz-engine/remotion-adapter`

Optional later:

4. `@viz-engine/bake`
5. a CLI or scaffold package if we intentionally expose one publicly

## Why The Public Surface Should Stay Small

This gives us:

- clearer support boundaries
- less accidental API surface
- easier version coordination
- simpler Magnify consumption

This is especially important during the V2 rewrite.

## Internal Vs Public Packages

We should explicitly distinguish:

- internal workspace packages
- public supported packages

Internal packages may exist for implementation boundaries without becoming part
of the external support contract.

That is healthy.

## Versioning Posture

For the first real public phase, I recommend unified versioning across the
public Viz package set.

That means:

- `@viz-engine/contracts`
- `@viz-engine/runtime`
- `@viz-engine/remotion-adapter`

all move together initially.

## Why Unified Versioning Is Best At First

Because the early public package graph is likely small and tightly related.

Unified versioning gives:

- simpler release reasoning
- simpler GitHub tagging
- simpler support expectations
- less dependency drift between core packages

This is the same core simplification Air Jam uses for its public graph.

## When To Reconsider Unified Versioning

We should only reconsider later if:

- the public package graph grows substantially
- release cadences diverge meaningfully
- independent versioning becomes operationally useful rather than theoretically
  appealing

Until then, unified versions are cleaner.

## Canonical Publish Path

The canonical future public publish path should be:

- GitHub Actions
- npm trusted publishing

This should be the default normal release path.

Local manual publish should be fallback-only.

## Why GitHub-Driven Publish Is Better

It gives:

- one clear release source of truth
- reproducible publish steps
- less personal-machine drift
- better auditability
- better alignment with trusted publishing

This is exactly the kind of discipline we want.

## Trusted Publishing Posture

When we begin public npm publication, the preferred posture should be:

- npm trusted publishing via GitHub Actions
- no long-lived `NPM_TOKEN` as the normal path

This follows the same core discipline Air Jam uses.

## Release Gate Split

We should copy the split between:

- heavier local prerelease validation
- lighter publish-path CI validation

## Heavy Local Gate

This is the maintainer-facing final local release confidence pass.

It should include things like:

- frozen-lockfile install confidence
- typecheck
- lint
- tests
- build
- package tarball smoke checks
- package export verification
- Magnify local proof-sensitive checks if relevant

## Lighter Publish Gate

This is the GitHub publish-path sanity gate.

It should confirm:

- repo still builds
- package graph is publishable
- supported package entrypoints are sane
- release path is not obviously broken

It should not rerun every expensive local sign-off check if those checks are
deliberately kept local.

This is a good Air Jam pattern to reuse.

## Tarball Smoke Rule

Tarball smoke confidence should be a first-class release concern.

This is especially important for Viz because:

- local tarball proof is already part of the Magnify integration strategy
- local workspace linking can hide packaging mistakes
- published package behavior must match tarball behavior

## Tarball Smoke Expectations

At minimum we should eventually verify:

- the package builds
- the packed tarball contains the right files
- exports resolve correctly from the tarball
- a consumer can install the tarball cleanly

For the Viz runtime seam, the ideal later smoke check is:

- a local consumer proof fixture can import the tarball and run a minimal
  runtime/adaptor flow

## Public Dependency Manifest Rule

If published packages depend on other public workspace packages, pack/publish
must not leak raw `workspace:` specs into the public manifest.

This is another very good Air Jam pattern.

## Recommended Manifest Strategy

Use prepack/postpack or equivalent release preparation scripts to:

- rewrite public workspace dependencies to concrete published semver ranges
- remove internal-only private workspace dependencies from published manifests
- restore local workspace manifests afterward

This keeps workspace ergonomics nice without breaking publication.

## Build Tooling Direction

The public package build posture should stay explicit and boring.

For libraries/packages, likely good defaults are:

- TypeScript
- `tsup` or similar for package bundling where appropriate
- explicit `exports`
- explicit `types`
- explicit `files`

The package surface should be inspectable and conservative.

## Package Metadata Rule

Public packages should have intentional:

- `name`
- `version`
- `repository`
- `exports`
- `types`
- `files`
- `license`
- `publishConfig`

No accidental package metadata.

## Build Artifact Rule

Public packages should publish built artifacts only, not depend on consuming
repos compiling raw internal source assumptions unintentionally.

Source can still be shipped if deliberate, but the supported runtime surface
should be the built output contract.

## Tagging Direction

We should use explicit release tags for public packages.

Good early direction:

- one canonical release trigger tag for the public graph
- package-specific tags/releases created as part of publish reconciliation

This is close to Air Jam’s discipline and keeps release history clearer.

## Dist-Tag Direction

We should support at least:

- `latest`
- `next`

This is enough for:

- stable public releases
- prerelease or validation lanes later

No need to get fancier early.

## Package Family Notes

## `@viz-engine/contracts`

This should be the most stable and easiest to consume package.

It should have:

- zero editor coupling
- clean types-first surface
- strict export discipline

## `@viz-engine/runtime`

This is the main engine seam.

It should publish:

- runtime construction
- runtime stepping/validation surfaces
- no editor coupling

## `@viz-engine/remotion-adapter`

This should stay thin.

It should depend on:

- contracts
- runtime

It should not smuggle editor/product concerns into the public runtime path.

## `@viz-engine/bake`

This may become public later if we intentionally want external consumers to run
Viz bake flows directly.

It does not need to be in the first public set if that would widen support
surface too early.

## Package Publication And Magnify

The package strategy should directly support the Magnify path we already chose.

That means:

- local workspace consumption during active development
- local tarball consumption as the stronger early proof
- future registry install once packages stabilize

The publication strategy should reinforce that progression.

## Existing Repo Transition Rule

Today the repo does not yet have a full V2 package publication system.

The transition should be:

1. stabilize V2 package boundaries
2. make packages buildable locally
3. make tarball proof real
4. define public package manifests
5. add GitHub publish workflow

Do not jump straight to public npm before steps 1 through 3 are trustworthy.

## Recommended First Release Milestones

## Milestone A: Local Package Discipline

Deliver:

- buildable V2 packages
- explicit package metadata
- tarball pack command
- local tarball inspection

## Milestone B: Consumer Proof Discipline

Deliver:

- a minimal consumer proof or smoke fixture
- imports from packed tarballs
- export sanity checks

## Milestone C: Public Workflow Discipline

Deliver:

- canonical public package list
- unified public version check
- manifest rewrite scripts
- GitHub publish workflow skeleton

## Milestone D: Trusted Publishing

Deliver:

- npm trusted publishing setup
- publish workflow live
- `latest` and `next` lanes

## Non-Goals

We are not deciding all of this yet:

- exact CI file names
- exact release tag names
- exact long-term independent versioning strategy if the public graph grows
- whether a public scaffold/CLI package is in the first release wave

Those can tighten later.

## Final Product Posture

The intended posture is:

- small intentional public package surface
- unified versions at first
- GitHub Actions as canonical publish path
- trusted publishing when public npm release begins
- strong tarball discipline because it directly supports Magnify proof

This is the cleanest package publication strategy for Viz V2 right now.

## Decisions Locked In Here

We are deciding all of this now:

1. Viz should keep a deliberately small public package set
2. unified versioning is the preferred early public strategy
3. GitHub-driven trusted publishing should be the canonical future publish path
4. local manual publish should be fallback-only
5. tarball smoke confidence is a first-class requirement
6. public manifest rewriting for workspace dependencies is a likely required
   release mechanism

## Next Docs To Write

The strongest next follow-up docs are:

1. first real implementation slicing plan for V2 packages
2. standard audio feature channel list and normalization appendix
3. first public package manifest and export map plan
