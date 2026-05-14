# Audio Feature Timeline Spec

## Purpose

This document defines the intended audio feature timeline model for VizEngine
V2.

It exists to answer:

- what the standard baked audio feature artifact should contain
- whether base features should be auto-extracted
- how optional heavier offline analysis should fit
- how node graphs should consume audio features
- how live mode, render mode, and bake mode should relate

This is one of the most important concrete artifact contracts in V2.

## Core Goal

We want an audio-reactive system that is:

- pleasant to author with
- deterministic in render mode
- still expressive in graphs and components
- able to benefit from offline analysis
- not forced to precompute every possible thing all the time

## Core Position

The right model is three layers:

1. base feature timelines
2. runtime graph shaping
3. optional heavy offline analyses

That means:

- a small standard base feature profile should usually be easy or automatic to
  obtain
- the graph system should still remain central
- expensive higher-level analyses should stay optional and explicit

This preserves both convenience and architectural clarity.

## What We Are Not Doing

We are not replacing the node graph system with baked audio analysis.

The graph remains the main place where reactive behavior is shaped.

Baked audio features provide better raw material.

They do not replace the expressive graph layer.

## The Three Layers

## 1. Base Feature Timelines

These are broadly useful low-to-medium-cost features that many music visuals
want.

Examples:

- loudness / RMS
- coarse band energies
- spectral centroid / brightness
- flux / onset strength
- waveform summary
- maybe coarse beat confidence or pulse hints

These should usually be available with very low friction.

## 2. Runtime Graph Shaping

This is the main reactive logic layer.

The node graph should consume base features and shape them into scene behavior.

Examples:

- smoothing
- envelope following
- thresholding
- cooldown gates
- hysteresis
- band mixing
- remapping
- decay
- attack/release shaping

This is where most expressive reactive behavior should still live.

## 3. Optional Heavy Offline Analyses

These are more expensive or higher-level derived music structures.

Examples:

- stronger beat grid
- phrase or section map
- lyrical timing alignment
- richer onset refinement
- stem-aware or source-separated analysis later

These should be explicit baked artifacts, not silently computed in every case.

## Most Important Rule

The standard baked feature profile should improve convenience.

It should not become a reason to flatten the node graph into a giant fixed
offline pipeline.

## Standard Vs Extended Vs Specialized

The cleanest artifact model is to define three analysis profiles.

## Standard Profile

This is the default convenience profile.

It should contain the common features needed by a large share of music-reactive
visuals.

This profile should usually be:

- auto-baked by convenience policy
- small enough to be cheap
- stable enough to be the default baseline for render mode

## Extended Profile

This is a richer analysis profile for stronger reactive visuals.

It may include:

- better onset data
- refined pulse/beat information
- richer frequency-band detail
- stronger temporal summaries

This should usually be explicit or demand-driven, not always automatic.

## Specialized Profile

This is for higher-level or niche workflows.

Examples:

- lyric alignment
- section/phrase structure
- stem-aware features
- style-specific music descriptors

This should always be explicit and intentional.

## Auto-Bake Convenience Policy

We should separate artifact contract from UX policy.

## Contract

The system should treat audio feature timelines as explicit baked artifacts.

## Ergonomics

The system may automatically create a standard base-profile bake for
convenience when:

- an audio asset is attached
- a component clearly needs standard features
- a render/preview path requires standard features and they are missing

This means:

- the artifact remains explicit
- the UX remains smooth

That is the right balance.

## Recommended Default Posture

My recommendation is:

- `standard` profile: auto-baked by convenience most of the time
- `extended` profile: demand-driven
- `specialized` profile: explicit

This avoids overcomputing everything while still making authoring pleasant.

## Artifact Identity Direction

Audio feature timelines should be first-class baked artifacts.

Preferred conceptual classification:

- artifact family: `audio-feature-timeline`
- profile: `standard` | `extended` | `specialized`
- source asset id
- fps / alignment metadata
- feature channel descriptors

## Preferred Conceptual Shape

```ts
type VizAudioFeatureTimelineArtifact = {
  schemaVersion: 1;
  kind: "viz.audio-feature-timeline.v1";
  profile: "standard" | "extended" | "specialized";
  sourceAssetId: string;
  sourceWindow?: VizAudioSourceWindow;
  frameAlignment: VizAudioFrameAlignment;
  channels: VizAudioFeatureChannel[];
  metadata?: Record<string, unknown>;
};
```

## Source Window Direction

Audio analysis must describe what part of the source it covers.

Preferred conceptual shape:

```ts
type VizAudioSourceWindow = {
  startSec?: number;
  durationSec?: number;
};
```

This matters for:

- clipped renders
- partial scene windows
- reproducibility

## Frame Alignment Direction

The artifact should be frame-aligned to the intended runtime/render usage.

Preferred conceptual shape:

```ts
type VizAudioFrameAlignment = {
  fps: number;
  frameCount: number;
  sampleRate?: number;
  hopSize?: number;
  alignment: "frame-centered" | "frame-leading";
};
```

The important point is not the exact field names.

The important point is:

- frame-based deterministic alignment must be explicit

## Feature Channel Direction

The artifact should expose named channels rather than one opaque blob.

Preferred conceptual shape:

```ts
type VizAudioFeatureChannel = {
  id: string;
  featureKind: string;
  values: number[];
  valueRange?: {
    min: number;
    max: number;
  };
  normalization?: "none" | "unit" | "zscore" | "custom";
  metadata?: Record<string, unknown>;
};
```

This makes it much easier for:

- components
- graphs
- AI agents
- Magnify integrations

to understand what the artifact contains.

## Standard Profile Contents

The standard profile should stay intentionally compact and broadly useful.

Suggested initial contents:

- `loudness`
- `low_band_energy`
- `mid_band_energy`
- `high_band_energy`
- `spectral_centroid`
- `onset_strength`
- `waveform_summary`

This is enough to drive a large number of visuals without making the baseline
analysis too heavy.

## Extended Profile Contents

The extended profile can add things like:

- finer multi-band decomposition
- better beat/pulse confidence channels
- richer spectral movement signals
- stronger transient descriptors

This should be used when a scene or component genuinely benefits from it.

## Specialized Profile Contents

Specialized profiles may include:

- section labels
- phrase boundaries
- lyric alignment tracks
- future stem-aware channels
- domain-specific music descriptors

These should not be assumed to exist by default.

## Graph Relationship

This is the heart of the authoring model.

The graph should usually consume audio feature channels and shape them further.

The graph remains the place for:

- behavior design
- modulation composition
- temporal response shaping
- combining channels
- artistic interpretation

The feature artifact should not try to pre-bake every artistic decision.

## Node Category Relationship

This fits the node model cleanly.

## Pure Nodes

Useful for:

- remapping channels
- mixing channels
- thresholding
- color/parameter transforms

## Temporal Nodes

Useful for:

- smoothing
- attack/release behavior
- hysteresis
- cooldowns
- envelopes

## Bake Nodes

Useful for:

- requesting richer analysis
- consuming specialized analysis artifacts
- bridging expensive offline music understanding into the graph

This is the right layered model.

## Component Relationship

Components should be able to declare whether they:

- work with standard audio features
- benefit from extended features
- require specialized features
- are bake-required because of heavier audio logic

This helps with:

- validation
- UX guidance
- AI authoring choices

## Live Mode Relationship

Live mode should remain strong.

Preferred posture:

- live mode may use live analyzer data for immediate responsiveness
- if the song/asset is known and baked features already exist, live mode may
  also use them
- live mode may choose lower-fidelity or partially live-derived approximations
  only when that does not change core scene semantics dishonestly

The important point is:

- live mode can be flexible
- render mode must be explicit and deterministic

## Render Mode Relationship

Render mode should strongly prefer explicit baked feature timelines.

That gives:

- determinism
- reproducibility
- parity across machines
- easier debugging

If a required audio feature artifact is missing, render mode should usually:

- fail validation
- or trigger an explicit standard-profile bake as part of a known workflow

It should not silently invent ad hoc runtime-only analysis.

## Bake Mode Relationship

Bake mode should produce the artifacts other modes consume.

Examples:

- create standard profile
- create extended profile
- create specialized profile

Bake mode is where expensive work belongs.

## Missing Artifact Policy

We should make this explicit.

## Standard Profile Missing

Preferred posture:

- if a component/scene needs only standard audio features, the system may
  auto-trigger a standard bake by convenience policy
- the resulting artifact must still become explicit and registered

## Extended Or Specialized Missing

Preferred posture:

- do not auto-compute heavy extended/specialized analyses casually
- require explicit request, scene requirement, or user/agent decision

This prevents background over-analysis.

## Magnify Relationship

This artifact family should be consumable both by:

- Viz runtime
- external host adapters

That is very important.

Magnify should not need to reinvent audio analysis semantics for scenes that are
already Viz-authored.

## AI-Native Relationship

This model is also good for AI.

Because an agent can reason clearly about:

- what profile exists
- what profile is missing
- whether a scene only needs standard features
- whether an explicit richer bake is justified

This is much better than a hidden “sometimes analyzer data exists” system.

## Validation Direction

The runtime and tooling should be able to validate:

- whether required feature profiles are present
- whether frame alignment matches the scene/render settings
- whether components or nodes require richer profiles than are available

This should be contract-driven.

## Good First Implementation Posture

The clean baseline is:

1. define one standard profile well
2. let components/graphs consume it cleanly
3. keep node shaping expressive
4. add extended/specialized profiles later as explicit needs emerge

This is much better than designing a huge feature universe before the baseline
exists.

## Non-Goals

We are not deciding all of this yet:

- the exact DSP implementation for every feature
- the exact normalization policy for every channel
- lyric/section model details
- future stem-separation strategy

Those can tighten later.

## Final Product Posture

The intended posture is:

- a small standard feature profile is usually easy or automatic to obtain
- heavier analysis remains optional and explicit
- node graphs remain the main behavior-shaping layer
- render mode consumes explicit feature artifacts
- live mode stays flexible without lying about semantics

This is the cleanest audio-reactive architecture for Viz V2.

## Decisions Locked In Here

We are deciding all of this now:

1. audio feature timelines are a first-class baked artifact family
2. the correct model is base features plus graph shaping plus optional heavy
   analysis
3. a standard profile should usually be auto-baked by convenience policy
4. extended and specialized analyses should stay explicit
5. node graphs remain central and are not replaced by baking
6. render mode should prefer explicit baked feature timelines for determinism

## Next Docs To Write

The strongest next follow-up docs are:

1. package/build publication and versioning strategy
2. first real implementation slicing plan for V2 packages
3. standard audio feature channel list and normalization appendix
