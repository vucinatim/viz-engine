# Goal Five proposed frame-exact musical map review

Status: **proposed; pending Gate 1 human judgment**

Artifact: [frame-exact musical map](./artifacts/2026-09-05-goal-five-frame-exact-musical-map.json)

Artifact content identity: `sha256:164395d23891a091d9374c48d3462c9b30ee8ac4aac4ac4c6dfe68f700568a55`

Upstream analysis identity: `sha256:e94ef2932f0ddd28f730711111e14d6d35ff952bc3328905f1e89dd6bb6657cc`

## What this owns

This evidence turns the selected P1-03 window into one deterministic, machine-readable and human-reviewable timing proposal. It owns derived evidence only. It does not modify the project document, session, runtime, graph, transport, editor state, or production components.

The 48-second interval is local frames `[0,2880)`, source frames `[135,3015)`, and source samples `[108000,2412000)` at 60 fps / 48 kHz. Source/local endpoint conversions are exact. Detector samples retain their 20 fps observation precision; their nearest 60 fps scheduling frames can differ by at most 400 samples (8.333 ms).

## Proposed five-act map

| Act                         | Local frames | Production intent                                                                                           |
| --------------------------- | -----------: | ----------------------------------------------------------------------------------------------------------- |
| Threshold and restraint     |     `0..405` | Establish a sparse visual identity, preserve negative space, and contract toward the first decisive change. |
| First full statement        |  `405..1125` | Reveal the primary rhythmic system and stabilize it without spending the production peak.                   |
| Contrast and rebuild        | `1125..1605` | Pull density and brightness back, then rebuild motion and scale into the next structural turn.              |
| Suspended evolution         | `1605..2205` | Evolve composition and camera language across sustained energy while retaining final-act headroom.          |
| Final statement and release | `2205..2880` | Accumulate the clearest production peak, then make the ending feel authored through a concise release.      |

All ranges use inclusive-start/exclusive-end semantics and cover the window without gaps or overlaps. The section hypothesis at local frame 45 remains recorded as `excluded-near-window-edge` under the upstream one-second edge rule; it is not silently discarded.

## Transition review

| Transition     | Center | Pre / midpoint / post | Evidence     |
| -------------- | -----: | --------------------: | ------------ |
| `transition-1` |    405 |       375 / 405 / 435 | `section-02` |
| `transition-2` |   1125 |    1095 / 1125 / 1155 | `section-03` |
| `transition-3` |   1605 |    1575 / 1605 / 1635 | `section-04` |
| `transition-4` |   2205 |    2175 / 2205 / 2235 | `section-05` |

## Landmark and response coverage

- 5 section hypotheses, including the explicit edge exclusion
- 82 beat hypotheses at inherited confidence 0.092826
- 10 eight-beat-derived phrase hypotheses
- 69 transient hypotheses with observation samples and scheduling frames
- 5 macro, 10 phrase, and 8 detail response opportunities

Energy peaks and lower-energy opportunities are deterministic local extrema over inherited one-second loudness bins. The first and last bins are explicitly partial overlaps. The selected window has zero qualifying silence intervals, so no rest opportunity is described as silence. Equal-valued alternatives are retained in the artifact.

## Human boundary

Gate 1 must listen and judge the intended track/window, correct sections/downbeats/phrases, assess peak and lower-energy salience, approve or change the five-act viability and transitions, and decide emotional, aesthetic, and visual-treatment intent. Until then, this map is evidence and a proposal—not approved production direction.
