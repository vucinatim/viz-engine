# Auth And Identity Federation Model

## Purpose

This document defines the intended authentication and identity model for Viz
Cloud, including how Viz should relate to Magnify identity.

It exists to answer:

- what auth system Viz Cloud should use
- where auth belongs in the architecture
- how user identity should map to workspaces and projects
- how Viz and Magnify should relate without database coupling

## Core Decision

Viz Cloud should use its own authentication layer, and Better Auth is the
preferred current direction.

The core Viz engine should remain auth-agnostic.

That means:

- auth belongs to `Viz Cloud`
- auth does not belong to `viz-runtime`
- auth does not belong to the scene contract

## Why Better Auth Fits

Based on Better Auth’s current official docs and project materials, it remains
a strong fit for Viz Cloud because it is:

- TypeScript-first
- framework-agnostic
- session/cookie aware
- social-provider capable
- plugin-extensible
- suitable for account linking and future product growth

Relevant official sources:

- [Introduction](https://better-auth.com/docs/introduction)
- [Basic Usage](https://better-auth.com/docs/basic-usage)
- [Options](https://better-auth.com/docs/reference/options)
- [User & Accounts](https://better-auth.com/docs/concepts/users-accounts)
- [Cookies](https://better-auth.com/docs/concepts/cookies)

## Architectural Rule

Better Auth should be treated as a Viz Cloud product-layer dependency.

It should not shape:

- scene document semantics
- runtime APIs
- local-only OSS use
- Magnify integration contracts

This is important because auth must not leak downward into the engine core.

## Decided Now

### Decision 1: Viz Cloud owns its own auth/account system

We are deciding now that Viz Cloud should own:

- account identity
- sessions
- workspace membership
- authorization checks

This keeps Viz as a real standalone product.

### Decision 2: Better Auth is the preferred current implementation direction

We are deciding now that Better Auth is the preferred auth direction for Viz
Cloud unless implementation teaches us a stronger reason to change.

This is not because auth is trendy.

It is because the current official Better Auth surface appears aligned with the
product shape we want:

- TypeScript product
- multi-provider auth
- account linking
- session-first web product

### Decision 3: Magnify and Viz should federate identity at API/auth level, not DB level

We are deciding now that identity sharing between Viz and Magnify should happen
through:

- SSO or linked identity flows
- API-level trust
- explicit integration tokens or sessions

Not through:

- shared user tables
- direct database coupling

### Decision 4: Local OSS usage must remain possible without Better Auth

We are deciding now that Better Auth is a hosted-product concern, not a core
engine requirement.

That means:

- local engine use should still be possible without any hosted auth dependency
- exported project artifacts should still work without cloud identity

## Auth Boundary Model

The intended boundary should be:

### Viz OSS / Core

Owns:

- scene contracts
- runtime
- bake
- render adapters
- local editor capabilities

Does not own:

- user identity
- sessions
- cloud authorization

### Viz Cloud

Owns:

- account records
- sessions
- auth flows
- workspace authorization
- API auth

### Magnify

Owns:

- its own auth and operator identity
- its own workspace/account model
- its own access control

### Shared boundary

- federated identity links
- API trust
- integration references

## Account Model

Viz Cloud should have its own account identity records even if users overlap
with Magnify.

Preferred conceptual account shape stays:

```ts
type VizAccount = {
  id: string;
  email?: string;
  displayName?: string;
  kind: "human" | "service";
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
};
```

Better Auth should help own the authentication side of this account system, not
replace the broader product data model.

## Session Direction

Viz Cloud should use a session model suitable for:

- browser editor usage
- cloud dashboard/API usage
- cross-app deep-linking
- future AI agent/service access

Better Auth’s documented cookie/session support makes it a reasonable fit for
the browser-facing part of this.

## Social And Password Posture

The likely starting auth posture for Viz Cloud should be:

- email/password support
- social login support
- account linking support

Reason:

- easy onboarding
- future team/workspace product needs
- better compatibility with standalone product positioning

Better Auth’s documented email/password, social providers, and account-linking
capabilities fit this direction well.

## Authorization Model

Authentication and authorization must stay distinct.

### Authentication

Should answer:

- who is this user or service?

### Authorization

Should answer:

- what can this actor do in this workspace/project/integration context?

The product should keep workspace authorization in its own data model:

- memberships
- roles
- project access rules

Better Auth can support identity/session handling, but Viz Cloud still needs
its own authorization layer.

## Service Identity

Viz Cloud will likely need non-human access too.

Examples:

- render workers
- AI orchestration services
- Magnify integration clients

So the identity model should support:

- human accounts
- service accounts
- API tokens or machine credentials

This is another reason not to reduce the auth model to only browser login.

## Magnify Federation Model

The right federation posture should be:

- Magnify has its own identity
- Viz has its own identity
- a user may link the two
- future shared SSO is desirable
- direct shared database identity is not desirable

## Preferred Early Federation Modes

The first reasonable federation modes are:

1. linked user identity by email or explicit account link
2. API-to-API trust for integration actions
3. future SSO if product maturity demands it

## Deep Link Auth Experience

Connected-workspace UX means the auth experience must not feel broken when
moving from Magnify to Viz.

Preferred eventual outcome:

- a user opens Viz from Magnify
- if already linked/authenticated, the project opens directly
- if not linked, a short auth/link flow resolves it cleanly

This should be solved at auth/session boundary level, not via unsafe trust
shortcuts.

## Better Auth-Specific Posture

We should be explicit here.

### Use Better Auth for:

- browser session management
- email/password auth
- social provider auth
- account linking
- auth routes and auth client flows

### Do not let Better Auth decide:

- Viz project semantics
- workspace authorization policy
- Magnify integration contracts
- artifact models
- render job truth

## Security Posture

Some practical rules we should adopt early:

- explicit base URL configuration
- secure cookie/session handling
- strict separation of auth and workspace authorization
- encryption or careful handling of provider tokens where relevant
- machine credentials for service-to-service integration

Better Auth’s current docs explicitly emphasize configuration such as base URL
and account/token options, which fits this posture.

## Source Of Truth Rule

Even with Better Auth:

- Better Auth is not the whole product truth
- Viz Cloud DB remains the product truth for workspaces, memberships, projects,
  versions, jobs, and artifacts

This distinction should stay explicit.

## Local-First Compatibility

The open-core/local-first rule still applies:

- local OSS use does not require Better Auth
- local scenes and renders remain valid without cloud sessions
- Better Auth is for Viz Cloud product operation

## Decisions Locked In Here

We are deciding all of this now:

1. Viz Cloud should own its own auth/account model
2. Better Auth is the preferred current auth direction
3. Better Auth belongs to the cloud/product layer, not the runtime core
4. Magnify and Viz should federate identity through auth/API boundaries
5. direct shared DB identity is not desirable
6. local-first Viz must remain usable without Better Auth

## Next Docs To Write

The next strongest follow-up docs are:

1. draft autosave and working head storage model
2. bake job ownership and lifecycle model
3. linked-account and SSO flow design

The follow-ups now exist here:

- [Draft Autosave And Working Head Storage Model](./draft-autosave-and-working-head-storage-model.md)
- [Bake Job Ownership And Lifecycle Model](./bake-job-ownership-and-lifecycle-model.md)
- [Linked-Account And SSO Flow Design](./linked-account-and-sso-flow-design.md)

The first follow-up now exists here:

- [Draft Autosave And Working Head Storage Model](./draft-autosave-and-working-head-storage-model.md)
