# Specialized AI Runner Vision

## Purpose

This document defines the intended long-term direction for specialized AI
runners in VizEngine V2.

It exists to answer:

- what specialized runners are supposed to be
- how they should relate to the main agent
- why they matter
- when they should appear
- what boundaries must stay clean

This is intentionally a vision document, not a near-term contract spec.

## Why This Is A Vision First

Specialized runners are strategically important, but they sit above several
lower-level systems that need to become real first:

- canonical project contracts
- deterministic runtime
- bake system
- tool/MCP surface
- stable Magnify integration seam

Until those are proven, locking a detailed runner contract would be premature.

So the right posture now is:

- decide the direction
- decide the boundaries
- avoid over-specifying implementation details too early

## Core Position

VizEngine V2 should eventually support a main coordinating agent that can
delegate bounded work to specialized AI runners.

These runners should help with:

- scene creation
- scene refinement
- synchronization tasks
- quality evaluation
- optimization
- delivery preparation

The important part is:

- they are not separate shadow products
- they are not magical private subsystems
- they are clients of the same Viz contracts and tools

## Main Thesis

The main agent should coordinate.

Specialized runners should execute bounded domain-specific tasks.

That means the right model is:

1. main agent inspects state
2. main agent decides the next subtask
3. main agent invokes a bounded runner
4. runner uses standard Viz tools and contracts
5. runner returns explicit outputs
6. main agent reviews and continues

This is the cleanest architecture.

## What Specialized Runners Are

Specialized runners are purpose-built AI workers with narrow responsibilities.

They should be:

- bounded
- inspectable
- repeatable enough to evaluate
- replaceable
- contract-driven

They should not be:

- all-powerful hidden agents
- owners of separate scene truth
- custom one-off scripts with undocumented behavior

## Why Runners Matter

Runners matter because there are categories of work that benefit from deeper
domain specialization than the main agent should carry at all times.

Examples:

- generating an initial visual composition from a song brief
- refining timing and musical responsiveness
- exploring palettes and style variants
- improving render performance
- checking quality and render-readiness

This is a good use of specialization.

It is not a good reason to split the architecture.

## Timing Rule

This should come after the stable baseline and after real Magnify usage proves
the system.

That means:

1. baseline contracts first
2. baseline runtime first
3. package-first Magnify proof first
4. baseline tool/MCP surface first
5. specialized runners later

This timing rule is important enough to repeat because runner excitement can
easily create premature complexity.

## Boundary Rule

Specialized runners should use:

- the same project documents
- the same action model
- the same runtime APIs
- the same bake/render/version operations
- the same product APIs
- the same MCP/tool surface

They may use higher-level orchestration on top of those surfaces.

They should not bypass them.

## Relationship To The Main Agent

We should lock this posture now.

## Main Agent

The main agent should own:

- user-facing coordination
- state inspection
- planning the next move
- choosing whether delegation is useful
- reviewing runner outputs
- deciding follow-up actions

## Specialized Runners

Specialized runners should own:

- one bounded task family
- one narrower evaluation loop
- one explicit input/output pattern

The main agent remains the orchestrator.

## Early Runner Families

These are good early conceptual runner families once the system is mature
enough:

1. scene generation runner
2. refinement runner
3. lyric-sync runner
4. palette/style exploration runner
5. performance optimization runner
6. render QA runner

## 1. Scene Generation Runner

Purpose:

- generate an initial scene structure from prompt, audio context, and asset
  context

Likely outputs:

- draft working-head mutations
- candidate layers
- graph suggestions

## 2. Refinement Runner

Purpose:

- improve an existing scene’s coherence, pacing, or visual density

Likely outputs:

- targeted mutation proposals
- refined timing/configuration changes

## 3. Lyric-Sync Runner

Purpose:

- improve synchronization between lyrics, timing assets, and visual behavior

Likely outputs:

- timing adjustments
- subtitle/karaoke alignment improvements
- graph or parameter tuning

## 4. Palette/Style Exploration Runner

Purpose:

- generate and compare stylistic directions without destabilizing the core scene

Likely outputs:

- candidate variant sets
- palette swaps
- style-oriented config proposals

## 5. Performance Optimization Runner

Purpose:

- identify expensive scene patterns and propose or apply safer alternatives

Likely outputs:

- performance diagnostics
- bake suggestions
- compatibility or simplification proposals

## 6. Render QA Runner

Purpose:

- inspect outputs for render readiness, obvious defects, and parity issues

Likely outputs:

- validation summaries
- blocker findings
- retry/fix suggestions

## Input/Output Direction

Even though this is not yet a contract spec, we should still lock the shape
direction.

Runner inputs should be:

- explicit
- bounded
- id-based
- version-aware where relevant

Runner outputs should be:

- explicit
- inspectable
- attributable
- easy for the main agent to review

This means outputs should lean toward:

- action proposals
- action batches
- diagnostics
- artifact refs
- structured findings

not vague natural-language-only side effects.

## Safety And Authority

We should be careful here.

Runner authority should be scoped by task family.

Examples:

- a generation runner may mutate working head
- a QA runner should usually report rather than publish
- a performance runner may propose simplifications rather than directly archive
  versions

The system should not assume every runner can do everything.

## Local-First And Cloud Relationship

Specialized runners should not require Viz Cloud conceptually.

There should be a meaningful path where at least some runners can operate in:

- local-first mode
- package-consumption mode
- cloud-hosted mode later

This preserves the open-core posture.

## Magnify Relationship

Specialized runners should eventually help within Magnify-connected workflows,
but Magnify should not be the only reason they exist.

The right posture is:

- runners are Viz capabilities
- Magnify can invoke or benefit from them later through explicit integration
  seams

This keeps Viz product value independent.

## Tool/MCP Relationship

The runner layer should sit on top of the future tool surface.

That means:

- first build the MCP/tool inventory into real callable surfaces
- then let runners orchestrate those tools

This is a much cleaner model than inventing private runner-only powers.

## Human Relationship

Users should be able to:

- observe what a runner is doing
- inspect what changed
- review what artifacts were produced
- intervene when needed

The runner layer should increase leverage, not reduce inspectability.

## Non-Goals

We are not deciding these yet:

- exact runner implementation framework
- exact runner scheduling/orchestration substrate
- exact prompt architecture
- exact permission matrix per runner
- exact result schema for every runner family

Those should come later once the lower layers are real.

## Final Product Posture

The intended posture is:

- one main coordinating agent
- multiple bounded specialized runners later
- all of them operating through the same underlying Viz contracts and tools
- no shadow architecture
- no premature complexity before the baseline is proven

This is the right long-term AI-native direction.
