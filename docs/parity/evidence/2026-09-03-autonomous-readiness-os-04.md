# Autonomous Readiness OS-04 — Sensory Coverage Review

Status: accepted inventory proof.

## Coverage result

The canonical Goal Five matrix contains 46 unique criteria and the sensory map
derives an observation contract for all 46. Each derived entry has:

- one or more of the ten canonical evidence lanes
- an environment
- an observable product fact
- an explicit pass/fail decision rule
- a named command or human workflow
- at least one required artifact
- an honest `ready`, `planned`, or `human` harness classification

No second criterion list or product truth was introduced. The map joins the
existing certification matrix by category and adds only observation ownership.

## Current harness truth

| Classification | Count | Meaning                                                                          |
| -------------- | ----: | -------------------------------------------------------------------------------- |
| ready          |     1 | executable today with a declared artifact-producing package command              |
| planned        |    32 | required when the corresponding Goal Five slice makes the observation meaningful |
| human          |    13 | irreducible taste, usability, or activation judgment                             |

The low ready count is intentional rather than a quality claim: Goal Five
production is still paused, so future media, full-production, and editor
journeys must not be reported as executable evidence before their subjects
exist. Sensory adequacy is reevaluated before each product slice; a missing
required observation becomes part of that slice, while speculative harnesses
remain forbidden.

## Environment distribution

| Environment                | Criteria |
| -------------------------- | -------: |
| static Node                |       13 |
| browser functional         |        6 |
| browser performance        |        7 |
| deterministic repeated run |        3 |
| portable clean-room reopen |        1 |
| final decoded media        |        6 |
| human review               |       10 |

## Falsification calibration

The inventory explicitly names ten known false-pass families: invalid graphs,
missing assets, blank or clipped frames, frozen output, accidental silence,
audio/video drift, temporal discontinuity, renderer resource leaks,
pointer-rate durable revisions, and stale-server or wrong-project identity.
Future sensors must prove they fail on their relevant family before their
classification can move to `ready`.

## Assumptions

- automated metrics cannot replace creative judgment
- browser evidence must be isolated, muted, identity-checked, and opened only
  when its claimed lane requires it
- performance budgets are frozen from real baselines, not invented here
- a planned organ is a dependency declaration, not evidence of completion

The checkpoint evidence for this item must validate the matrix, sensory map,
program definition, repository links, and complete foundation suite under the
exact OS-04 claim.
