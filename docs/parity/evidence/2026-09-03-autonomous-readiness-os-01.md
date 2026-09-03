# Autonomous Readiness OS-01 — Contract Freeze

Status: accepted bootstrap proof.

## Claimed outcome

Freeze one repository-owned operating contract for long-running VizEngine work.
The machine program is subordinate to the product plans: it selects bounded
work and evidence but does not redefine product direction.

## Canonical ownership

- product direction: the compounding vision and Goal Five plan
- autonomous operating policy: `docs/plans/v2/autonomous-development-operating-contract.md`
- executable readiness graph: `tools/repo/programs/autonomous-readiness.json`
- active program selection: `tools/repo/programs/active-program.json`
- recovery and checkpoint protocol: `docs/plans/v2/autonomous-checkpoint-runbook.md`
- repository-agent rules: `AGENTS.md` and `CLAUDE.md`
- product authoring/runtime semantics: the package APIs and `pnpm viz`, never
  the repository maintainer CLI

No second roadmap, agent-only project model, UI-imitation workflow, or external
mutation authority is introduced.

## Assumptions verified

- autonomous work remains local to `codex/viz-engine-v2`
- exactly one work item and one conceptual axis are allowed per wake
- a run may create one coherent local commit but may not push, merge, deploy,
  publish, purchase, open visible applications, or play audio
- recurrence remains disabled until three supervised calibration runs and the
  explicit human `ACT-01` approval
- rejected or changes-requested activation leaves recurrence disabled

## Review result

The canonicalizer and checker independently found no remaining contract
blocker. Their last findings—program-scoped human decisions, fail-closed branch
selection, immutable successor selection, exact pointer-cutover recovery, and
serialized Git/lease drift failures—are present in the baseline beginning at
commit `df3c1b20441323ece38881a741bb4fc644f4a6c3`.

Acceptance is proven only when the checkpoint check for this claimed diff
passes under the exact OS-01 lease and the resulting commit is admitted by the
program transition.
