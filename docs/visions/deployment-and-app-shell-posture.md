# Deployment And App Shell Posture

## Purpose

This document defines the intended deployment and frontend app-shell posture
for VizEngine V2 and Viz Cloud.

It exists to answer:

- what should run on Railway
- what should use Cloudflare R2
- whether product apps should be Vite or Next.js
- how frontend apps should relate to backend services
- what the default infrastructure posture should be

This is an architecture vision document rather than a low-level deployment
spec.

## Core Position

The preferred current posture is:

- `Cloudflare R2` for durable object/file storage
- `Railway` for deployed compute and managed service hosting
- `Vite` as the default frontend app shell posture
- `Next.js` only when there is a specific justified product need

This is the cleanest direction for Viz V2 right now.

## Why This Is The Right Default

Viz is becoming:

- a media-heavy system
- a runtime/editor platform
- an open-core product
- an optionally hosted cloud product

That means the architecture should favor:

- simple portable frontend apps
- clean backend boundaries
- strong object storage for large media and derived files
- minimal framework coupling in the editor and studio layers

## Core Infrastructure Posture

The intended baseline is:

- Railway for compute
- R2 for object storage
- Postgres for product metadata
- optional Redis/queue infrastructure for workers and orchestration

This should remain provider-aware in implementation but provider-agnostic in
the core architecture where practical.

## Storage Posture

We are deciding now that `Cloudflare R2` is the preferred object storage
direction for Viz.

This is a strong fit for:

- source assets
- derived managed assets
- baked artifacts
- preview outputs
- final render outputs
- portable upload/download flows

Why it fits well:

- S3-compatible API
- good fit for media/object storage workflows
- favorable egress posture for internet delivery

Relevant current docs:

- [R2 Overview](https://developers.cloudflare.com/r2/)
- [How R2 Works](https://developers.cloudflare.com/r2/how-r2-works/)
- [R2 S3 API](https://developers.cloudflare.com/r2/get-started/s3/)
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)

## Compute Posture

We are deciding now that `Railway` is the preferred current deployed compute
platform for Viz Cloud.

This is a good fit for:

- API service
- auth service integration
- workers
- background job consumers
- Postgres hosting
- Redis hosting if needed
- optionally static frontend hosting too

Relevant current docs:

- [Railway Docs](https://docs.railway.com/)
- [Railway Static Hosting](https://docs.railway.com/guides/static-hosting)
- [Railway Next.js Guide](https://docs.railway.com/guides/nextjs)
- [Railway Full-Stack Next.js Guide](https://docs.railway.com/guides/fullstack-nextjs)

## Frontend App Shell Posture

The preferred default frontend posture is:

- Vite-first

That means we should not default to `Next.js` for Viz product apps unless we
have a real reason.

## Why Vite-First Fits Viz Better

Viz Studio and related product apps are application surfaces, not primarily
SSR/SEO content sites.

They benefit from:

- lighter frontend architecture
- less server framework coupling
- faster iteration for app-like tooling surfaces
- cleaner separation between frontend and backend services

This fits especially well for:

- the studio/editor
- internal visual tooling
- cloud dashboards that are not SSR-dependent

## Why Not Default To Next.js

`Next.js` is not wrong.

It is just not the best default posture here.

Defaulting to Next too early would risk:

- coupling product UI decisions to server framework semantics
- smearing API concerns into app-shell concerns
- making the editor/product UI heavier than necessary

Viz should prefer deliberate boundaries instead.

## When Next.js Is Justified

We should still leave room for `Next.js` when it is truly useful.

Good reasons would include:

- strong SSR needs
- server-routed auth/product pages where that meaningfully simplifies the
  product
- a combined hosted product shell where server-rendered routes are actually
  valuable
- SEO-heavy public-facing marketing or docs surfaces if we decide to co-locate
  them

Important rule:

- use Next because it solves a real product need
- not because it feels like the default modern SaaS choice

## Better Auth Relationship

Better Auth does not force us into Next.js.

Better Auth is currently documented as framework-agnostic, even though it has a
strong [Next.js integration](https://better-auth.com/docs/integrations/next).

That means:

- Better Auth is still compatible with a Vite-first frontend posture
- auth can live behind a dedicated backend/service boundary
- we do not need to choose Next just because we choose Better Auth

Relevant docs:

- [Better Auth Introduction](https://www.better-auth.com/docs)
- [Better Auth Basic Usage](https://better-auth.com/docs/basic-usage)
- [Better Auth Next.js Integration](https://better-auth.com/docs/integrations/next)

## Intended App Split

The clean early shape should likely be something close to:

- `apps/viz-studio`
  Vite app for the main editor/studio experience
- `apps/viz-cloud-web`
  Vite app for hosted product/dashboard/workspace UI
- `services/viz-api`
  backend API and auth integration layer
- `services/viz-workers`
  bake/render/derivation/background worker services

Exact folder names can change.

The important part is the split of responsibility.

## What Railway Should Host

The default Railway-hosted set should be:

- `viz-api`
- `viz-workers`
- `Postgres`
- `Redis` if needed
- optionally the frontend apps too

This gives a very practical early hosted product shape.

## What R2 Should Store

The default R2-stored set should be:

- source media assets
- derived managed media assets
- baked artifacts
- preview artifacts
- final render artifacts
- imported/exported portable bundles if useful

That is the correct storage boundary for a media-heavy system.

## Studio Posture

The main Viz Studio should most likely be a Vite app.

Reason:

- it is primarily a rich application shell
- it benefits from clean package/runtime integration
- it does not need Next semantics by default

This also aligns better with the package-first local proof and open-core
posture.

## Cloud Product Posture

The hosted cloud product can also start Vite-first.

That means:

- browser app frontend
- dedicated backend service for auth/API/jobs

This is a clean and modern posture.

We should only move to Next for the cloud product shell if we later conclude
that server-coupled routing or SSR meaningfully improves the product.

## Open-Core Relationship

This posture also supports the open-core model better.

Because:

- the editor/studio can stay app-oriented and package-oriented
- the backend remains optional for core local use
- the hosted layer stays additive rather than invasive

That is exactly what we want.

## Magnify Relationship

This direction also fits Magnify integration well.

Because:

- Magnify package-first proof does not depend on hosted Viz app shell choices
- the runtime seam remains package-oriented
- hosted Viz Cloud can still exist cleanly later

This keeps our priorities in the right order.

## Important Non-Goals

We are not deciding all of this yet:

- exact Railway service names
- exact Docker/Nixpacks shape
- whether every frontend app is separately deployed
- marketing-site stack choice
- final monorepo folder layout

Those can tighten later.

## Final Product Posture

The intended posture is:

- R2 for durable object/media storage
- Railway for deployed compute
- Vite as the default app-shell posture
- Next.js only when explicitly justified
- backend services kept separate from frontend app shells by default

This is the cleanest scalable posture for Viz V2 right now.
