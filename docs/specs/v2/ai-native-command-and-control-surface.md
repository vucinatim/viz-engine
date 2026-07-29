# AI-Native Command And Control Surface

## Purpose

This document defines how VizEngine V2 should become deeply AI-native in the
same spirit as the direction you want from Magnify Core and the broader posture
seen in Air Jam.

It exists to answer:

- what “AI-native” should mean for Viz
- what control surfaces agents should eventually get
- how those surfaces should relate to the editor and cloud product
- when this work should happen relative to the stable baseline

## Core Position

VizEngine V2 should be designed so it becomes fully controllable through an
agent.

That means over time agents should be able to:

- inspect projects
- inspect runtime state
- mutate working head state
- create and publish versions
- trigger bake and render jobs
- inspect artifacts and logs
- operate collaboration/publishing flows safely

The important part is:

- this should happen through explicit contracts and tools
- not through brittle browser-only automation

One hard rule should be locked in now:

- editor controls, programmatic hosts, and agent tools should all converge on
  the same canonical runtime and working-head entry points wherever practical

That means:

- the editor is a client of those entry points
- MCP/tools are clients of those entry points
- local scripts or host apps are clients of those entry points

Not:

- one runtime path for the editor
- one hidden path for local code
- one separate path for agents

## Important Timing Rule

This AI-native control model is absolutely part of the intended future.

But it should be layered in after:

1. Viz has a stable baseline architecture
2. the core runtime/editor/product boundaries are proven
3. Viz has been used in real Magnify workflows successfully

This timing rule matters a lot.

We should not let speculative agent-control complexity destabilize the baseline
engine and product architecture before that baseline is real.

## What “AI-Native” Means Here

AI-native should not mean:

- giant prompt files
- hidden repo magic
- direct manipulation of arbitrary UI state
- one-off bespoke scripts for each workflow

AI-native should mean:

- explicit machine-facing contracts
- stable action surfaces
- strong typed schemas
- inspectable runtime and product state
- shared human and agent operations where practical

It should also mean runtime configurability in real time through those same
shared operations:

- project/working-head updates
- preview/runtime session updates
- transport updates
- audio-session updates
- inspection of evaluated runtime state

## Long-Term Goal

The long-term goal should feel like this:

1. a user describes the desired music visual or workflow outcome
2. Viz or a connected system coordinates specialized creation steps
3. the main agent can inspect state, invoke tools, and trigger specialized
   runners
4. the user watches, inspects, intervenes, and approves as needed
5. the scene reaches a genuinely polished state rather than stopping at rough
   automation output

This is not meant to be a toy prompt wrapper.

It is meant to be a serious visual creation harness.

## Air Jam Reference Pattern

The relevant lesson from Air Jam is not “copy game tooling.”

The relevant lesson is:

- humans and agents should use the same core contracts wherever possible
- machine-facing control should be explicit
- browser automation should be fallback, not primary architecture
- specialized agent tooling should sit on top of stable core contracts

That is the pattern Viz should adopt too.

## Command And Control Layers

Viz should eventually define five clear AI-native layers:

1. repo operating system
2. scene and runtime contracts
3. product and cloud contracts
4. tool and MCP surface
5. specialized AI runner layer

## 1. Repo Operating System

The repo itself should stay extremely AI-friendly.

That means:

- strong `AGENTS.md`
- strong docs index
- explicit plans/specs
- stable architecture language
- clear decision docs

This part is already underway in V2 planning.

## 2. Scene And Runtime Contracts

The engine must expose explicit machine-readable contracts for:

- project document structure
- node and component metadata
- runtime API
- working head semantics
- version publication semantics

Without that, higher-level AI tooling will become fragile.

## 3. Product And Cloud Contracts

Viz Cloud must expose explicit machine-facing contracts for:

- workspaces
- projects
- versions
- assets
- baked artifacts
- render jobs
- auth and integration flows

That is how AI will safely operate the hosted product.

## 4. Tool And MCP Surface

This is the first major AI-specific operational layer we should plan for.

Viz should eventually expose stable tools that a main agent can call directly.

Examples:

- inspect workspace
- inspect project
- inspect project version
- read working head
- mutate working head
- inspect component catalog
- inspect node catalog
- cut version
- publish version
- trigger bake
- inspect bake output
- trigger render
- inspect render job
- read logs and diagnostics
- open preview or request preview artifact

The important part is that these tools should wrap the same core contracts the
product uses.

That includes the runtime/session controls themselves.

Agents should be able to manipulate canonical runtime-facing settings such as:

- playback frame/time
- play/pause/seek state
- resolution or quality mode
- live audio source/session choice
- preview-mode vs render-mode selection where appropriate

through the same underlying operations the editor uses.

## 5. Specialized AI Runner Layer

This is the later-stage layer.

We should plan for specialized AI runners and helper agents that the main agent
can invoke through stable tooling.

Examples:

- scene generation runner
- visual refinement runner
- lyric-sync runner
- palette/style exploration runner
- performance optimization runner
- quality evaluation runner
- render QA runner

These runners should not become ad hoc side systems.

They should be clients of the same Viz contracts, tool surfaces, and product
APIs.

## Main Agent Vs Specialized Runners

We should decide this posture now.

### Main agent

The main agent should act as the coordinator.

It should be able to:

- inspect state
- choose the next action
- call tools
- trigger specialized runners
- review their outputs
- continue iterating

### Specialized runners

Specialized runners should be bounded, domain-specific workers.

They should:

- operate on explicit input contracts
- produce explicit outputs
- remain inspectable
- avoid inventing shadow state

This is how we avoid a chaotic agent architecture.

## MCP Direction

Viz should eventually expose an MCP/tool layer suitable for serious agent use.

The likely future tool families are:

- project inspection tools
- catalog inspection tools
- working-head mutation tools
- version/publication tools
- bake/render job tools
- preview/evaluation tools
- integration tools

This should be treated as a first-class future product and internal tooling
surface, not an afterthought.

The deeper concrete inventory now lives here:

- [Future MCP/Tool Surface Inventory](./future-mcp-tool-surface-inventory.md)

The runner-layer direction should stay in vision territory for now:

- [Specialized AI Runner Vision](../../visions/specialized-ai-runner-vision.md)

## Posting / Publishing / Operational Actions

You mentioned “including posting and this.”

The right interpretation is:

- once Viz Cloud and Magnify integrations are stable, agents should be able to
  trigger operational flows safely through the same contract layers

That can include:

- publishing project versions
- requesting renders
- attaching Viz outputs to Magnify workflows
- triggering follow-up integration actions

The key rule is safety:

- posting/publishing actions must go through explicit approval-aware or
  ownership-aware flows
- not direct side effects from hidden prompts

## Runtime Inspection Direction

A future AI-native Viz should let agents inspect more than static documents.

Eventually agents should be able to inspect:

- current runtime frame/time
- active layer/component state
- graph state and outputs
- validation reports
- logs and diagnostics
- performance snapshots

This is part of why the runtime API and state model need to stay explicit now.

## Visual Evaluation Direction

AI-native Viz should eventually support structured evaluation loops, not just
blind code generation.

Examples:

- render preview frame
- compare preview against expectations
- inspect quality/evaluation results
- rerun targeted fixes

This can later support stronger automated visual iteration.

## Human And Agent Workflow Rule

The long-term rule should be:

- humans and agents should use the same core contracts whenever possible

That means:

- if the human UI can do something important
- there should usually be a machine-facing contract for it too

Not necessarily with identical UX, but with the same semantic ownership.

## Browser Automation Rule

Browser automation may still exist as a fallback.

But it should not be the primary long-term control model.

The preferred long-term control path is:

- API/tool/MCP surface
- explicit runtime/product contracts

## Phase Model

We should make the rollout order explicit.

### Phase A: Baseline First

Before heavy AI-control work:

- stabilize V2 contracts
- stabilize runtime
- stabilize working head and versioning
- prove real Magnify integration

### Phase B: Core Tool Surface

Then add:

- inspection tools
- mutation tools
- bake/render job tools
- version/publication tools

### Phase C: Specialized Runners

Then add:

- bounded AI runners
- evaluation flows
- richer autonomous loops

### Phase D: Full Agentic Creation Harness

Only after the earlier phases are stable:

- deeper autonomous orchestration
- parallel specialized agents
- more advanced quality loops

## What We Are Not Doing Yet

We are explicitly not doing all of this immediately.

Right now the correct priority remains:

- stable baseline
- clear product/runtime boundaries
- real proof through Magnify usage

This is the discipline that keeps the AI-native future plausible instead of
becoming wishful complexity.

## Decisions Locked In Here

We are deciding all of this now:

1. Viz should become deeply AI-native
2. the control path should be explicit tools/contracts, not UI imitation
3. future MCP/tool surfaces are first-class and important
4. specialized AI runners are part of the intended future
5. the main agent should coordinate and invoke bounded specialized runners later
6. this heavy AI-control layer should come after the stable baseline and proven
   Magnify use

## Next Docs To Write

The next strongest follow-up docs are:

1. bake job ownership and lifecycle model
2. linked-account and SSO flow design
3. future MCP/tool surface inventory
4. specialized AI runner vision
