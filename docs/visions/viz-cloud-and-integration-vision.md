# Viz Cloud And Integration Vision

## Purpose

This document defines how VizEngine should exist both as:

- its own standalone product
- and a deeply integrated system attachment for Magnify Core

The goal is to preserve both:

- open-source product value
- future monetization and hosted product value

without corrupting the architecture.

## Core Product Decision

VizEngine V2 should remain its own product.

It should not become just an internal Magnify subsystem.

The right model is:

- open core VizEngine
- optional hosted Viz Cloud
- explicit integration contracts with Magnify

This gives us:

- product independence
- monetization paths
- deep integration capability
- clean boundaries

## Open Core Direction

The open-source core should include the actual engine value:

- project contracts
- runtime
- bake system
- render adapters
- editor

This is important because:

- the engine should remain truly usable on its own
- local-first and self-hosted use should be possible
- Magnify should not be the only valid consumer
- the product remains attractive as an open system

## Viz Cloud Direction

Viz Cloud should be the optional hosted product layer on top of the open core.

Viz Cloud can justify its own database and server because it would own
product-level capabilities such as:

- authentication
- user accounts
- teams
- workspaces
- project storage
- project version history
- asset storage and indexing
- baked artifact storage
- cloud rendering
- cloud baking
- collaboration
- comments and review
- AI agent execution and logs
- integration APIs

This means the backend is not a forced dependency of the engine.

It is a value-add product layer.

## Decided Now

### Decision 1: Viz should have its own backend product layer

We are deciding now that it is valid and desirable for Viz to eventually have
its own:

- Postgres database
- object storage
- background jobs
- API server

This does not make Viz less open source.

It just means the hosted product is a real product.

### Decision 2: The backend is optional, not required for core usage

We are deciding now that the core engine must remain usable without Viz Cloud.

That means:

- local scenes should still work
- local rendering should still work
- self-hosted or exported artifact flows should still work

Viz Cloud is an enhancement layer, not the engine itself.

### Decision 3: Magnify should integrate through APIs and artifacts, not DB coupling

We are deciding now that Magnify should not read Viz database tables directly.

Magnify should integrate through:

- explicit identifiers
- explicit artifacts
- explicit APIs
- explicit render/preview requests

This is one of the most important boundary decisions in the system.

### Decision 4: Connected workspace style integration is desirable

We are deciding now that the ideal user experience is connected-workspace
integration.

That means Magnify should be able to:

- deep-link into Viz projects
- reference Viz project versions
- request previews and renders
- attach Viz scene references to content workflows

without manual copy-paste or brittle handoff steps.

## Product Shape

The cleanest product shape is:

### Viz OSS

Owns:

- engine
- scene model
- runtime
- bake logic
- editor logic
- render adapters

### Viz Cloud

Owns:

- hosted storage
- account system
- workspace model
- collaboration
- cloud jobs
- integration APIs
- hosted AI workflows

### Magnify Core

Owns:

- orchestration
- review/approval
- publishing workflows
- scheduling
- operational control plane

This is the correct separation of concerns.

## Why This Model Is Strong

This model is strong because it avoids two bad extremes:

### Bad Extreme 1

Viz becomes just an internal Magnify tool.

This kills:

- independent product value
- external adoption
- future standalone business value

### Bad Extreme 2

Viz is a totally isolated product with weak integration.

This kills:

- deep workflow leverage
- automation value
- connected media-system benefits

The open-core plus optional-cloud model avoids both failures.

## Monetization Implications

This model gives multiple future monetization paths without compromising the
engine.

Potential monetizable product areas:

- hosted workspaces
- team collaboration
- cloud bake jobs
- cloud render jobs
- asset/version history
- premium templates or curated component packs
- AI-assisted scene generation/editing
- managed integrations with systems like Magnify

The important principle is:

- monetize the hosted and operational layer
- keep the core engine strong and trustworthy

## Backend Architecture Direction

The current deployment and app-shell posture now lives here:

- [Deployment And App Shell Posture](./deployment-and-app-shell-posture.md)

The hosted product should be designed around generic infrastructure choices,
not around a single hosting provider.

Preferred hosted product primitives:

- Postgres
- object storage
- background jobs
- auth
- HTTP/API layer

Railway is completely fine as an early deployment target.

But the architecture should not become Railway-specific.

That keeps the product portable and serious.

## Workspace Model

The likely cloud mental model should be:

- account
- workspace
- project
- project version
- asset
- baked artifact
- render job

This fits both:

- a standalone Viz product
- a future connected Magnify integration

## Project Versioning Direction

If Viz Cloud exists, Magnify should generally point at a specific project
version or scene artifact version, not just an abstract mutable project head.

Reason:

- reproducibility
- auditability
- stable rendering
- clean approvals

That means versioning is not just a nice product feature.

It is an integration-quality feature.

## Magnify Integration Model

Magnify should treat Viz as a specialized visual system with its own workspace
and project model.

### Magnify should store references like:

- `vizWorkspaceId`
- `vizProjectId`
- `vizProjectVersionId`
- optional `vizRenderProfile`
- optional cached artifact ids

### Magnify should not store:

- raw editor state blobs as its source of truth
- direct copies of mutable Viz internal data for routine operation

### Magnify should be able to do:

- open the Viz project from Magnify
- preview the current selected Viz version
- request a render from Viz or through the Viz adapter
- persist the chosen Viz project reference on a Magnify content item

## Artifact Strategy

The cleanest shared integration seam is still artifacts plus API references.

That means:

- Viz project artifact
- baked feature artifacts
- rendered outputs
- preview outputs

Magnify can cache or store references to those artifacts without becoming the
owner of Viz scene semantics.

## Auth And Identity Direction

We are not deciding the exact auth system yet, but we should decide the
boundary posture now.

Preferred posture:

- Viz Cloud owns its own auth/account model
- Magnify and Viz may later support linked identity or shared SSO
- identity federation should happen at auth/API level, not via shared database

## AI Product Implication

This hosted model is especially strong because Viz Cloud can become the place
where AI-driven authoring, scene mutation, previews, and agent execution are
persisted and inspected.

That means the AI-native nature of V2 is not just a local editor feature.

It can become a premium hosted product capability too.

## Local-First Requirement

Even with Viz Cloud, V2 should preserve local-first viability.

That means:

- local project documents still matter
- local rendering still matters
- exported artifact bundles still matter
- Magnify should be able to consume exported Viz artifacts even without a live
  Viz Cloud dependency if necessary

This is important for resilience and product trust.

## Decision Summary

We are deciding all of this now:

1. VizEngine stays its own product.
2. Viz Cloud is an optional hosted layer on top.
3. Viz can and should eventually have its own DB/server/product backend.
4. Magnify integrates through refs, APIs, and artifacts, not DB coupling.
5. Connected workspace UX is a desired end state.
6. The engine must still remain locally usable and open-core.

## What We Should Write Next

The next docs that would deepen this direction are:

1. Viz Cloud workspace and data model
2. Viz to Magnify integration API spec
3. project versioning and artifact publication model
4. render job ownership model between Viz and Magnify

The first follow-up now exists here:

- [Viz Cloud Workspace Data Model](../specs/v2/viz-cloud-workspace-data-model.md)
- [Viz To Magnify Integration API Spec](../specs/v2/viz-to-magnify-integration-api-spec.md)
- [Viz Cloud Orchestration With Inngest](../specs/v2/viz-cloud-orchestration-with-inngest.md)
- [Auth And Identity Federation Model](../specs/v2/auth-and-identity-federation-model.md)
