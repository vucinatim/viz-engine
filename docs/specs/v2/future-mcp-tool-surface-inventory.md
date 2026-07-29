# Future MCP/Tool Surface Inventory

## Purpose

This document defines the future machine-callable tool surface VizEngine V2
should expose once the stable baseline exists.

It exists to answer:

- what tools agents should eventually be able to call
- how those tools should be grouped
- which tools belong to local OSS Viz versus Viz Cloud
- how MCP/tool surfaces should relate to core actions and APIs
- how rollout should be staged safely

This is the concrete follow-up to the broader AI-native control-surface vision.

## Core Goal

Viz should become deeply controllable by an agent through explicit tools, not
through brittle UI imitation.

The tool surface should make it possible for a main agent to:

- inspect state
- mutate working head
- trigger bake and render work
- inspect results
- hand off bounded tasks to specialized runners later

without inventing hidden side channels or shadow state.

## Important Timing Rule

This tool surface is absolutely part of the intended future, but it should be
layered in after:

1. core contracts are stable
2. runtime extraction is real
3. Magnify has proven the runtime seam in actual usage
4. the package-first baseline is trustworthy

We are planning it now so V2 boundaries support it later.

We are not using it as an excuse to destabilize the baseline.

## Core Rule

The MCP/tool surface should wrap stable Viz contracts.

It should not become a second architecture.

That means tools should delegate to:

- project document actions
- runtime APIs
- bake APIs
- version/publication workflows
- product APIs

They should not bypass those layers through:

- random store poking
- editor-only hacks
- UI event simulation as the primary path

The same rule should apply to runtime controls:

- MCP/tools should wrap the same canonical working-head and runtime/session
  operations the editor uses
- they should not invent a separate agent-only control plane

## Tool Surface Layers

The future machine-callable surface should be understood as six layers:

1. catalog and schema inspection
2. project and working-head inspection
3. project and working-head mutation
4. runtime preview and diagnostics
5. bake/render/version operations
6. product/integration operations

## 1. Catalog And Schema Inspection

These tools help the agent understand what can be built before mutating
anything.

This is one of the most important AI-native layers because it reduces guessing.

## 2. Project And Working-Head Inspection

These tools let the agent inspect scene truth and current draft state.

## 3. Project And Working-Head Mutation

These tools apply explicit actions to working head state.

They should be thin wrappers around the core action model.

## 4. Runtime Preview And Diagnostics

These tools let the agent inspect how the scene behaves without committing
final renders.

They should also expose canonical runtime/session controls, not only passive
inspection.

## 5. Bake/Render/Version Operations

These tools let the agent perform heavyweight production actions with explicit
job tracking and safety controls.

## 6. Product/Integration Operations

These tools let the agent interact with Viz Cloud and connected systems such as
Magnify through explicit product contracts.

## Design Principles

The future tool surface should be:

- explicit
- typed
- inspectable
- id-based
- action-oriented
- mode-aware
- safe by default

It should avoid:

- giant opaque prompts as the interface
- editor-state-only operations
- ambiguous side effects
- hidden mutation bundles
- implicit “do what I mean” destructive actions

## Tool Shape Rule

Each tool should have:

- a narrow purpose
- explicit inputs
- explicit outputs
- explicit error semantics
- explicit side-effect expectations

This is better than giant kitchen-sink tools.

## Relationship To Actions And APIs

We should lock this boundary in now.

### Core actions

Own:

- scene mutations
- graph mutations
- asset attachment/replacement
- preview/render/bake requests

### Product APIs

Own:

- workspaces
- projects
- versions
- jobs
- auth-aware hosted operations

### MCP/tool surface

Owns:

- agent-callable wrapping of those stable operations
- readable summaries
- safe orchestration convenience

Important rule:

- tools wrap the architecture
- tools do not replace the architecture

## Tool Families

The first future tool families should be:

1. workspace tools
2. project tools
3. catalog tools
4. asset tools
5. layer tools
6. graph tools
7. runtime tools
8. bake tools
9. render tools
10. version/publication tools
11. diagnostics tools
12. Magnify integration tools

## 1. Workspace Tools

These are mostly Viz Cloud tools.

Examples:

- `viz.workspace.list`
- `viz.workspace.get`
- `viz.workspace.members.list`
- `viz.workspace.projects.list`

Purpose:

- discover the right workspace
- inspect access context
- inspect available projects

## 2. Project Tools

These should exist in both local-first and cloud-aware forms where practical.

Examples:

- `viz.project.list`
- `viz.project.get`
- `viz.project.summary`
- `viz.project.working_head.read`
- `viz.project.version.list`
- `viz.project.version.get`

Purpose:

- inspect a project quickly
- inspect current draft state
- inspect available stable versions

## 3. Catalog Tools

These are very important for agent usability.

Examples:

- `viz.catalog.components.list`
- `viz.catalog.components.get`
- `viz.catalog.nodes.list`
- `viz.catalog.nodes.get`
- `viz.catalog.examples.list`

Each result should ideally include:

- id
- purpose
- config schema
- input/output semantics
- compatibility flags
- examples
- performance notes

This is one of the highest-value tool families for AI-native authoring.

## 4. Asset Tools

Examples:

- `viz.asset.list`
- `viz.asset.get`

## Runtime Tool Examples

The runtime/tool family should eventually include operations like:

- `viz.runtime.preview.get`
- `viz.runtime.preview.set_transport`
- `viz.runtime.preview.set_time`
- `viz.runtime.preview.set_resolution`
- `viz.runtime.preview.set_audio_session`
- `viz.runtime.preview.inspect_state`

These should map onto the same underlying runtime entry points the editor uses
for preview and live control.
- `viz.asset.attach`
- `viz.asset.replace`
- `viz.asset.inspect`

Purpose:

- inspect available assets
- attach them to projects
- inspect metadata relevant to scene building

## 5. Layer Tools

These should be thin wrappers over action families.

Examples:

- `viz.layer.create`
- `viz.layer.remove`
- `viz.layer.move`
- `viz.layer.enable`
- `viz.layer.disable`
- `viz.layer.config.set`
- `viz.layer.timing.set`
- `viz.layer.inspect`

Purpose:

- manipulate scene assembly directly

## 6. Graph Tools

Examples:

- `viz.graph.bind.create`
- `viz.graph.bind.remove`
- `viz.graph.node.add`
- `viz.graph.node.remove`
- `viz.graph.node.update`
- `viz.graph.edge.connect`
- `viz.graph.edge.disconnect`
- `viz.graph.inspect`
- `viz.graph.evaluate.preview`

Purpose:

- create and inspect audio-reactive and procedural logic safely

## 7. Runtime Tools

These are the main preview/debug loop for agents.

Examples:

- `viz.runtime.scene_info`
- `viz.runtime.validate`
- `viz.runtime.preview_frame`
- `viz.runtime.preview_clip`
- `viz.runtime.snapshot`
- `viz.runtime.inspect_layer_state`
- `viz.runtime.inspect_node_state`

Purpose:

- understand what the runtime is doing
- catch mode incompatibilities early
- inspect deterministic behavior

## 8. Bake Tools

Examples:

- `viz.bake.audio_features.request`
- `viz.bake.simulation_checkpoints.request`
- `viz.bake.job.get`
- `viz.bake.job.list`
- `viz.bake.artifact.inspect`

Purpose:

- trigger heavyweight precompute flows
- inspect reuse opportunities
- understand bake outputs

## 9. Render Tools

Examples:

- `viz.render.preview.request`
- `viz.render.final.request`
- `viz.render.job.get`
- `viz.render.job.list`
- `viz.render.artifact.inspect`

Purpose:

- request candidate or final outputs
- inspect status and results

## 10. Version/Publication Tools

Examples:

- `viz.version.cut`
- `viz.version.publish`
- `viz.version.archive`
- `viz.version.diff_summary`
- `viz.version.promote_for_magnify`

Purpose:

- move from mutable draft state to stable external references

Important rule:

- these should be explicit
- autosave should not secretly impersonate them

## 11. Diagnostics Tools

Examples:

- `viz.diagnostics.validation_report`
- `viz.diagnostics.performance_report`
- `viz.diagnostics.missing_dependencies`
- `viz.diagnostics.render_compatibility_report`
- `viz.diagnostics.logs.tail`

Purpose:

- give the main agent a readable way to debug problems
- support later quality/performance runners

## 12. Magnify Integration Tools

These are later-stage cloud/product tools, not baseline requirements.

Examples:

- `viz.integration.magnify.link_reference`
- `viz.integration.magnify.open_context`
- `viz.integration.magnify.attach_render`
- `viz.integration.magnify.sync_status`

Purpose:

- let the agent move Viz outputs and refs into Magnify cleanly

Important rule:

- these tools should wrap explicit integration APIs
- they should not couple directly to Magnify DB state

## Local-First Vs Cloud-Aware Tool Split

We should define this clearly now.

## Local-First Tools

These should remain meaningful even without Viz Cloud:

- catalog tools
- project/working-head tools
- layer tools
- graph tools
- runtime preview tools
- local bake tools
- local import/export tools later

This preserves open-core credibility.

## Cloud-Aware Tools

These require Viz Cloud or hosted product context:

- workspace tools
- workspace membership tools
- hosted project/version listing
- hosted bake/render job listing
- publication tools tied to hosted versions
- Magnify integration tools

## Read Vs Write Tool Categories

We should separate these clearly because agent safety depends on it.

## Read Tools

Examples:

- list
- get
- inspect
- summary
- diagnostics
- preview

These should be easy to call frequently.

## Write Tools

Examples:

- create
- update
- remove
- attach
- cut version
- publish
- request render
- request bake

These should have stronger side-effect semantics and better logging.

## Proposed Safety Posture

We should decide this now.

### Safe-by-default read posture

Read tools should require no confirmation beyond access control.

### Explicit write posture

Write tools should:

- log actor identity
- log parameters
- return structured mutation results
- avoid ambiguous bulk changes by default

### Higher-friction operational posture

Potentially expensive or externally consequential actions should have extra
guardrails.

Examples:

- publish version
- trigger final render
- attach outputs into Magnify production workflows

## Result Shape Direction

Tool results should be structured and easy for agents to chain.

Preferred result qualities:

- stable ids
- summary fields
- warnings
- diagnostics pointers
- artifact refs
- next-step hints when useful

The goal is not chatty prose.

The goal is usable machine-facing output.

## Suggested Inventory By Phase

We should stage this intentionally.

## Phase A: Baseline Local Tooling

Add first:

- component catalog inspection
- node catalog inspection
- project read
- working-head read
- layer create/update/remove
- graph add/connect/update
- runtime validate
- preview frame/clip

This is the minimum serious AI authoring baseline.

## Phase B: Local Production Tooling

Add next:

- local bake request
- local render request
- diagnostics/performance reports
- import/export tools

This makes local-first serious.

## Phase C: Hosted Product Tooling

Add next:

- workspace/project/version cloud tools
- hosted bake/render job tools
- publication tools
- linked account/context open tools

This makes Viz Cloud properly agent-operable.

## Phase D: Connected Magnify Tooling

Add next:

- Magnify reference linking
- Magnify sync/status tools
- attach output tools
- approval-aware integration helpers

This makes the connected-workspace workflow serious.

## Phase E: Specialized Runner Tooling

Add later:

- runner dispatch tools
- bounded runner input/output contracts
- evaluation/QA runner tools
- optimization runner tools

This is where the main agent can safely coordinate specialized sub-agents.

## Specialized Runner Relationship

We should lock this boundary now.

Specialized runners should not get magical private powers.

They should use:

- the same core tools
- the same core actions
- the same contracts

possibly with:

- bounded higher-level compound workflows
- stricter input/output envelopes

This avoids building a shadow product architecture just for AI helpers.

## Human/UI Relationship

Where practical, the UI should call the same underlying operations that tools
use.

That means:

- the agent and the UI operate the same core system
- differences are in presentation and safety, not semantics

This is one of the most important long-term maintainability rules.

## Non-Goals

We are not deciding all of this yet:

- final MCP server transport details
- exact auth mechanism for every hosted tool call
- exact prompt architecture for specialized runners
- every final tool name
- every final permission matrix

Those can be refined later once baseline contracts are implemented.

## Final Product Posture

The intended posture is:

- Viz becomes deeply tool-operable
- the tool surface wraps stable runtime and product contracts
- local-first tooling remains real
- hosted tooling builds on the same architecture
- connected Magnify operations remain explicit and safe

This is the right way to make Viz genuinely AI-native.

## Decisions Locked In Here

We are deciding all of this now:

1. future Viz MCP/tools should wrap stable contracts rather than bypass them
2. local-first toolability is a first-class requirement
3. tool families should be narrow, typed, and explicit
4. read and write tool categories should be treated differently for safety
5. connected Magnify tools should sit on top of explicit integration APIs
6. specialized runners should use the same underlying tools and contracts as
   the main agent

## Next Docs To Write

The strongest next follow-up docs are:

1. specialized AI runner vision
2. asset resolver and storage abstraction spec
3. local-first CLI and developer ergonomics plan
