# RH-01 shared render host evidence

Scope: production-valid shared rendering foundation. Streaming is RH-02; complete
GPU/media integration and quiet-host measurements are RH-03. This record does not
close Goal Five production criteria or claim fully optimized export.

## Identity and ownership

Program: `goal-five-render-foundation`.
Definition: `7d14857310526ac660976fc1a6b5064a5de4fac4bdc02c93bc712e7abf03108a`.
Claim: `f8f8fcb4-69f7-4991-8b9a-879d211c22fa`.
Lease: `0225bfa2-01b8-482d-9b49-e4ee1e6527a4`.
Owner: `codex/render-foundation/2026-09-07`.
Starting commit: `5e74191135098d79eab0bb1ff02b20056cb77add`.
Terminal commit and exact passing checkpoint record are bound by the canonical
program completion evidence; this document cannot self-reference its commit hash.

The definition was prepared outside the checkout and claimed through the
canonical `claimWorkItem` API on a clean repository, then copied unchanged to its
tracked path before selecting it. No existing immutable definition/state was
rewritten, no EC item was falsely claimed, and the ordinary claim admission
passed using real host-load input. The user also explicitly authorized ordinary
implementation despite host load; no performance certification uses that override.

`@viz-engine/runtime` owns frame semantics. `@viz-engine/render` owns offline
frame-session setup with explicit registries and historical inputs. Both browser
and Node SVG export use that evaluator and canonical runtime seed defaults.
`@viz-engine/renderer-three` owns the shared GPU host, layer targets, compositor,
resource readiness and disposal. Studio injects capability registries and assets.
Preview-only navigation/mirroring remains in the editor. Export has no editor
attachment, DOM composition, viewport observation or gesture input dependency.

## Observations

- `tests/foundation/render-frame-session.test.ts`: equal explicit preview/export
  inputs produce equal scene plans through sequential and repeated/cold seeks;
  frozen project/viewport survives mutation. Out-of-session frames explicitly
  reject instead of silently clamping. This small fixture is not full production
  or cross-backend visual proof.
- `tests/foundation/browser-render-source.test.ts`: private blob URLs survive
  original-source ownership and remain retained through execution, then release
  once; partial concurrent-fetch failures release already-retained assets.
- `tests/foundation/studio-render-source.test.ts`: final resolved assets, including
  bundled defaults and explicit overrides, determine the reported source identity.
- `tests/foundation/browser-render-lifecycle.test.ts`: abort during pending resource
  readiness settles promptly, releases host/source once and rejects late rendering;
  constructor and initialization failures release retained assets.
- `tests/foundation/browser-render-executor.test.ts`: frame scheduling and failed
  capture cleanup. `three-renderer.test.ts` exercises pending/failed image
  readiness and cleanup after a later program factory fails.
- `VIZ_BROWSER_PORT=4183 pnpm exec playwright test tests/browser/render-host.spec.ts --retries=0`:
  passed in Chromium with DPR 2, no editor document/canvas mounted, exact drawing
  buffer and layer-target sizes 257x131 followed by 513x263. Bright/dark two-pixel
  bands are checked from actual pixels, rejecting a small preview enlarged to
  output size. The test attaches browser/GPU/DPR, request and Git/diff identities.
  This is a functional observation, not a performance benchmark.
- The canonicalizer independently reviewed ownership, allocation cleanup, asset
  lifetime, backend identity, Node evaluation and deletion of obsolete bridges.
  Initial findings were corrected. Remaining planning-display/DPR findings were
  addressed by shared repository planning discovery and explicit DPR 2.
- Passing checkpoint validation must accompany closure. Early failed checks are
  retained: stale renamed path, formatter receiving deleted paths, and a test
  that requested evaluation beyond its declared still horizon. The path/tool
  defects were fixed; the test now declares a sufficient horizon and separately
  checks explicit rejection outside it. An intermediate full run also correctly
  rejected repository drift while final reviewer fixes were being applied; final
  validation runs against an unchanged diff. No failure was relabeled as success.

## Limits and next work

Video still uses the prior FFmpeg.wasm sequence-buffering consumer in RH-01.
RH-02 must remove its JPEG sequence, bound frame handoff, retain codec/audio
semantics and include initialization/baking/publication in total elapsed time.
The detached capture currently performs a same-size 2D copy for that consumer;
streaming should accept GPU-backed frames where available.

RH-03 must verify actual exported still/video pixels against preview, editor
mutation during real export, audio/clip alignment, delayed models/textures,
cancellation at every async boundary, production scenes and repeated lifecycle.
The simple detached-host test is not a substitute for these observations.
Performance, full-media parity and WebGPU activation remain unobserved. Musical
and aesthetic review requires inspecting/listening to actual outputs under the
existing delegated-review contract.
