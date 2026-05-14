# Vite Product Shell Migration Plan

## Goal

Retire Next.js from VizEngine's active product/editor path and make the Vite app the real editor shell.

This is not a cosmetic framework swap.

It is a cleanup of ownership:

- `apps/viz-studio` becomes the real browser product shell
- V2 editor/session/live-preview code moves under the Vite app
- root Next app files stop being the active runtime path
- bundled media and sample project assets are served through Vite's public pipeline

## Why

The repo drifted into an invalid middle state:

- V2 packages and runtime were clean
- but the actual product shell was still running through root Next.js
- while `apps/viz-studio` remained a secondary inspector shell

That is the wrong architecture.

The active editor product should live in the Vite app.

## Scope

### In

- promote `apps/viz-studio` into the real editor shell
- move active V2 editor UI/session code under `apps/viz-studio/src`
- configure Vite to serve the repo root `public/` directory
- replace server-side bundled-audio discovery with a Vite-native manifest/module path
- repoint root scripts and validation to the Vite app
- remove root Next app/config/runtime files from the active path
- update docs to state clearly that Vite is now the product shell

### Out

- full extraction of preserved V1 UX components into standalone packages
- full deletion of every legacy V1 source file
- cloud/backend work

## Phase Exit Criteria

- `pnpm dev` starts the Vite editor shell, not Next.js
- `pnpm build` builds the Vite editor shell, not Next.js
- `pnpm check:v2` is green
- the editor opens in-browser through Vite
- bundled track selection still works
- the active V2 editor shell no longer depends on root Next `app/` routes or `next.config.mjs`

## Notes

- Preserve the V1 editor UX posture.
- Replace hidden framework/runtime architecture.
- Do not create a second-class alternate editor during the migration.
