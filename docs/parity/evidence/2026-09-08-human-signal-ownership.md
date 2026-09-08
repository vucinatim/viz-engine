# Human Signal production ownership evidence

The canonical owner is `@viz-engine/production-human-signal`. Its browser-safe
root exports the project factory, approved score/graph requirements and resource
recipes. Its Node entrypoint verifies source identities and delegates actual
bundle and execution-manifest writing to `@viz-engine/project-bundle`.
Production-local tests live with that package and participate in focused,
checkpoint and integration validation. The dependency guard rejects reusable
engine packages importing any production package.

The approved treatment, Gate 1 packet/decision reference, musical map and
historical capability catalog are bound by exact identity. Source frames
`[135,3015)` and samples `[108000,2412000)` map to local `[0,2880)` and
`[0,2304000)` at 60 fps / 48 kHz. The approved decoded-PCM hash is a provenance
reference; this checkpoint does not claim to have decoded or baked that PCM.
Current package and registry owners supply executable versions; historical
capability availability is not used as current runtime truth.

The foundation project contains nine authored baseline layer records, five
initially enabled layers and zero executable graphs. Seven graph requirements,
five acts and four transitions remain explicit direction data. There is no
production-local cue evaluator. The generic audio resolver returns no audio:
full-source music is verified input provenance outside project asset refs. Only
the four actual performer models enter the executable bundle. The exact-window
audio derivative and standard bake remain `planned-not-created`.

Package tests verify independent factory objects, canonical validation, exact
approved direction, current package/component identities, actual bundle
round-tripping and model hashes. Negative controls reject one-frame and
one-sample source shifts, absent component registrations, model source
redirection, self-consistent bundles built from changed bytes at the copy
handoff, and subsequent project/asset corruption. These controls address two
independent-review findings: metadata cannot prevent automatic first-audio
selection, and internal bundle consistency alone cannot prove approved source
provenance. Source and copied-asset hashes must both match their approved owners.

A plain Node consumer probe exposed a missing JSON import attribute in the
Three renderer's font import; source-loader tests and the previous consumer
smoke had not exercised that path. The canonical import now declares its JSON
type. A permanent package-local plain Node smoke imports both built exports,
materializes and reopens the bundle, and runs in the integration consumer gate.
The original failure observation remains preserved alongside final evidence.

The reproducible local evidence is `.artifacts/autonomy/ec02-human-signal`,
with `ownership.json` and `bundle/{project,bundle-manifest,execution-manifest}.json`.
Closure archives these and the actual bundled model bytes by content identity,
alongside exact checkpoint/integration evidence in the active program.

This is project-semantic and code-architecture evidence. It does not certify
full-window contribution, musical response, visual quality, playback speed,
export throughput or any complete Goal Five product criterion. EC-04's demand
for seven real graph consumers conflicts with the current later placement of
EC-07/EC-08; the unresolved sequencing correction is recorded in
[suggestions](../../suggestions.md) and the
[ownership contract](../../plans/v2/human-signal-production-ownership-contract.md).
