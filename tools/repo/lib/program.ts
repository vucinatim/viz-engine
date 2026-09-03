import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import { CheckStage } from './check-contract';
import { readAndValidateCheckEvidence } from './check-evidence';
import { readHumanDecision } from './human-decision';
import { readJsonFile, writeJsonFileAtomic } from './json-file';
import {
  defaultProgramPath,
  repositoryRoot,
  resolveOperationalDirectory,
} from './paths';
import { readRepositoryIdentity } from './repository-state';

export const workItemStatuses = [
  'pending',
  'in_progress',
  'blocked',
  'complete',
] as const;
export type WorkItemStatus = (typeof workItemStatuses)[number];
export const workItemAuthorities = ['autonomous', 'human_checkpoint'] as const;
export type WorkItemAuthority = (typeof workItemAuthorities)[number];
export const evidenceLanes = [
  'project-semantic',
  'runtime-temporal',
  'audio-musical-intent',
  'visual-composition',
  'motion-continuity',
  'editor-parity',
  'performance-lifecycle',
  'portability-reproducibility',
  'code-architecture',
  'creative-human',
] as const;
export type EvidenceLane = (typeof evidenceLanes)[number];
export const evidenceKinds = [
  'artifact',
  'command',
  'decision',
  'document',
  'git',
] as const;
export type EvidenceKind = (typeof evidenceKinds)[number];

export interface EvidenceRequirement {
  id: string;
  kind: EvidenceKind;
  description: string;
  checkStage?: CheckStage;
}
export interface EvidenceReference {
  requirementId: string;
  reference: string;
}
export interface ProgramGate {
  id: string;
  title: string;
  wave: number;
}
export interface WorkItemOwner {
  id: string;
  claimId: string;
  leaseId: string;
  claimedAt: string;
}
export interface WorkItemBlocker {
  type: 'technical' | 'human' | 'external' | 'unsafe_state';
  reason: string;
  recovery: string;
  recordedAt: string;
  previousClaimId: string;
  previousLeaseId: string;
  humanValidationIds: string[];
}
export interface ProgramWorkItemDefinition {
  id: string;
  gate: string;
  lane: string;
  priority: number;
  title: string;
  authority: WorkItemAuthority;
  dependsOn: string[];
  estimate: { agentHoursMin: number; agentHoursMax: number };
  acceptance: string[];
  evidenceLanes: EvidenceLane[];
  evidenceRequirements: EvidenceRequirement[];
  affectedCriteria: string[];
  externalApproval?: string;
}
export interface ProgramWorkItemState {
  id: string;
  status: WorkItemStatus;
  evidence: EvidenceReference[];
  recoveryEvidence?: string[];
  owner?: WorkItemOwner;
  blocker?: WorkItemBlocker;
  completedAt?: string;
  note?: string;
  terminalIdentity?: {
    head: string;
    statusHash: string;
    claimId: string;
    leaseId: string;
    startingHead: string;
  };
}
export type ProgramWorkItem = ProgramWorkItemDefinition &
  Omit<ProgramWorkItemState, 'id'>;
export interface ExecutionProgramDefinition {
  schemaVersion: 2;
  id: string;
  title: string;
  targetBranch: string;
  parentGoal: string;
  executionPlan: string;
  criteriaContract: string;
  gates: ProgramGate[];
  workItems: ProgramWorkItemDefinition[];
}
export interface ExecutionProgramState {
  schemaVersion: 1;
  programId: string;
  definitionHash: string;
  branch: string;
  status: 'active' | 'complete';
  updatedAt: string;
  workItems: ProgramWorkItemState[];
}
export interface ExecutionProgram extends Omit<
  ExecutionProgramDefinition,
  'workItems'
> {
  definitionHash: string;
  status: 'active' | 'complete';
  updatedAt: string;
  workItems: ProgramWorkItem[];
}

const stableId = /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/u;
const fullCommit = /^[0-9a-f]{40}$/u;
const fullSha256 = /^[0-9a-f]{64}$/u;
const evidencePattern =
  /^(artifact|command|decision|document|git):\S(?:.*\S)?$/u;

const assertNonEmptyString = (value: unknown, label: string) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
};
const assertArray = (value: unknown, label: string, nonEmpty = false) => {
  if (!Array.isArray(value) || (nonEmpty && value.length === 0)) {
    throw new Error(
      `${label} must be ${nonEmpty ? 'a non-empty' : 'an'} array.`,
    );
  }
};
const resolveEvidencePath = (value: string, label: string, root: string) => {
  const resolved = resolve(root, value);
  if (
    value.startsWith('/') ||
    resolved === root ||
    !resolved.startsWith(`${root}/`) ||
    !existsSync(resolved)
  ) {
    throw new Error(
      `${label} must reference an existing repository-relative file.`,
    );
  }
  return resolved;
};
const contentHash = (path: string) =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

export const validateEvidenceReference = (
  reference: string,
  label: string,
  root = repositoryRoot,
  expected?: {
    checkStage?: EvidenceRequirement['checkStage'];
    programId?: string;
    programDefinitionHash?: string;
    claimId?: string;
    leaseId?: string;
    startingHead?: string;
    terminalHead?: string;
    enforceCanonicalPlan?: boolean;
  },
) => {
  if (!evidencePattern.test(reference)) {
    throw new Error(
      `${label} must use artifact:, command:, decision:, document:, or git:.`,
    );
  }
  const separator = reference.indexOf(':');
  const kind = reference.slice(0, separator) as EvidenceKind;
  const value = reference.slice(separator + 1);
  if (kind === 'git') {
    if (!fullCommit.test(value)) {
      throw new Error(`${label} git evidence must be a full lowercase SHA.`);
    }
    execFileSync('git', ['cat-file', '-e', `${value}^{commit}`], {
      cwd: root,
      stdio: 'ignore',
    });
    return kind;
  }
  if (kind === 'decision') {
    const [programId, itemId, ...extra] = value.split('/');
    if (
      extra.length > 0 ||
      !stableId.test(programId) ||
      !/^human-[A-Za-z0-9._-]+$/u.test(itemId)
    ) {
      throw new Error(
        `${label} decision evidence must use <program-id>/<human-item-id>.`,
      );
    }
    if (expected?.programId && programId !== expected.programId) {
      throw new Error(`${label} human decision belongs to another program.`);
    }
    const queuePath = resolve(
      resolveOperationalDirectory(root),
      'human-validation',
      `${programId}.json`,
    );
    if (!existsSync(queuePath)) {
      throw new Error(`${label} human decision queue does not exist.`);
    }
    const queue = readJsonFile<{ items?: Array<{ id?: string }> }>(queuePath);
    if (!queue.items?.some(({ id }) => id === itemId)) {
      throw new Error(`${label} human queue item does not exist.`);
    }
    const decision = readHumanDecision(root, programId, itemId);
    if (!decision) {
      throw new Error(`${label} human decision is unresolved.`);
    }
    return kind;
  }
  const stored = value.startsWith('sha256:');
  const marker = '#sha256=';
  const markerIndex = value.lastIndexOf(marker);
  if (!stored && markerIndex <= 0) {
    throw new Error(
      `${label} must use sha256:<digest> or end with #sha256=<digest>.`,
    );
  }
  const expectedHash = stored
    ? value.slice('sha256:'.length)
    : value.slice(markerIndex + marker.length);
  if (!fullSha256.test(expectedHash)) {
    throw new Error(`${label} has an invalid sha256 digest.`);
  }
  const resolved = stored
    ? resolve(resolveOperationalDirectory(root), 'evidence', expectedHash)
    : resolveEvidencePath(value.slice(0, markerIndex), label, root);
  if (!existsSync(resolved)) {
    throw new Error(`${label} immutable evidence object is missing.`);
  }
  if (contentHash(resolved) !== expectedHash) {
    throw new Error(`${label} content hash does not match.`);
  }
  if (kind === 'command') {
    readAndValidateCheckEvidence(resolved, label, root, {
      ...expected,
      requirePassing: true,
    });
  }
  return kind;
};

export const snapshotEvidenceReference = (
  reference: string,
  root = repositoryRoot,
) => {
  const kind = validateEvidenceReference(reference, 'evidence snapshot', root);
  if (kind === 'decision' || kind === 'git') return reference;
  const separator = reference.indexOf(':');
  const value = reference.slice(separator + 1);
  if (value.startsWith('sha256:')) return reference;
  const markerIndex = value.lastIndexOf('#sha256=');
  const hash = value.slice(markerIndex + '#sha256='.length);
  const source = resolveEvidencePath(
    value.slice(0, markerIndex),
    'evidence snapshot',
    root,
  );
  const directory = resolve(resolveOperationalDirectory(root), 'evidence');
  const destination = resolve(directory, hash);
  mkdirSync(directory, { recursive: true });
  if (!existsSync(destination)) {
    try {
      writeFileSync(destination, readFileSync(source), {
        flag: 'wx',
        mode: 0o600,
      });
    } catch (error) {
      if (!existsSync(destination)) throw error;
    }
  }
  if (contentHash(destination) !== hash) {
    throw new Error('Immutable evidence store content hash mismatch.');
  }
  return `${kind}:sha256:${hash}`;
};

const validateAcyclicDependencies = (
  items: Map<string, ProgramWorkItemDefinition>,
) => {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string, chain: string[]) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new Error(
        `Program dependency cycle: ${[...chain, id].join(' -> ')}.`,
      );
    }
    visiting.add(id);
    const item = items.get(id);
    if (!item) throw new Error(`Unknown work item ${id}.`);
    item.dependsOn.forEach((dependency) => visit(dependency, [...chain, id]));
    visiting.delete(id);
    visited.add(id);
  };
  items.forEach((_item, id) => visit(id, []));
};

export const validateExecutionProgramDefinition = (
  definition: ExecutionProgramDefinition,
  root = repositoryRoot,
) => {
  if (
    !definition ||
    typeof definition !== 'object' ||
    Array.isArray(definition)
  ) {
    throw new Error('Execution program definition must be an object.');
  }
  if (definition.schemaVersion !== 2) {
    throw new Error(
      `Unsupported program schemaVersion ${definition.schemaVersion}.`,
    );
  }
  assertNonEmptyString(definition.id, 'program.id');
  assertNonEmptyString(definition.title, 'program.title');
  assertNonEmptyString(definition.targetBranch, 'program.targetBranch');
  const currentBranch = readRepositoryIdentity(root).branch;
  if (currentBranch !== definition.targetBranch) {
    throw new Error(
      `Program ${definition.id} targets branch ${definition.targetBranch}; current branch is ${currentBranch || '(detached)'}.`,
    );
  }
  resolveEvidencePath(definition.parentGoal, 'program.parentGoal', root);
  resolveEvidencePath(definition.executionPlan, 'program.executionPlan', root);
  const criteriaPath = resolveEvidencePath(
    definition.criteriaContract,
    'program.criteriaContract',
    root,
  );
  assertArray(definition.gates, 'program.gates', true);
  assertArray(definition.workItems, 'program.workItems', true);
  const gateIds = new Set<string>();
  definition.gates.forEach((gate) => {
    if (!stableId.test(gate.id)) throw new Error(`Invalid gate id ${gate.id}.`);
    assertNonEmptyString(gate.title, `gate ${gate.id}.title`);
    if (!Number.isInteger(gate.wave) || gate.wave < 0) {
      throw new Error(`gate ${gate.id}.wave must be a non-negative integer.`);
    }
    if (gateIds.has(gate.id)) throw new Error(`Duplicate gate id ${gate.id}.`);
    gateIds.add(gate.id);
  });
  const items = new Map<string, ProgramWorkItemDefinition>();
  const criteria = readJsonFile<{ criteria?: Array<{ id?: string }> }>(
    criteriaPath,
  ).criteria;
  if (
    !Array.isArray(criteria) ||
    criteria.some(
      (entry) => !entry || typeof entry.id !== 'string' || !entry.id.trim(),
    )
  ) {
    throw new Error('Program criteria contract is malformed.');
  }
  const validAffectedCriteria = new Set(criteria.map(({ id }) => id as string));
  definition.workItems.forEach((item) => {
    if (!stableId.test(item.id))
      throw new Error(`Invalid work item id ${item.id}.`);
    if (items.has(item.id))
      throw new Error(`Duplicate work item id ${item.id}.`);
    items.set(item.id, item);
  });
  definition.workItems.forEach((item) => {
    assertNonEmptyString(item.title, `work item ${item.id}.title`);
    assertNonEmptyString(item.lane, `work item ${item.id}.lane`);
    if (!gateIds.has(item.gate)) {
      throw new Error(
        `Work item ${item.id} references unknown gate ${item.gate}.`,
      );
    }
    if (!workItemAuthorities.includes(item.authority)) {
      throw new Error(`Work item ${item.id} has invalid authority.`);
    }
    if (!Number.isInteger(item.priority) || item.priority <= 0) {
      throw new Error(`Work item ${item.id}.priority must be positive.`);
    }
    const { agentHoursMin, agentHoursMax } = item.estimate;
    if (
      !Number.isFinite(agentHoursMin) ||
      !Number.isFinite(agentHoursMax) ||
      agentHoursMin <= 0 ||
      agentHoursMax < agentHoursMin
    ) {
      throw new Error(`Work item ${item.id} has an invalid estimate.`);
    }
    assertArray(item.dependsOn, `work item ${item.id}.dependsOn`);
    assertArray(item.acceptance, `work item ${item.id}.acceptance`, true);
    assertArray(
      item.evidenceRequirements,
      `work item ${item.id}.evidenceRequirements`,
      true,
    );
    assertArray(item.affectedCriteria, `work item ${item.id}.affectedCriteria`);
    item.dependsOn.forEach((dependency) => {
      if (!items.has(dependency) || dependency === item.id) {
        throw new Error(
          `Work item ${item.id} has invalid dependency ${dependency}.`,
        );
      }
    });
    if (
      !Array.isArray(item.evidenceLanes) ||
      item.evidenceLanes.length === 0 ||
      item.evidenceLanes.some((lane) => !evidenceLanes.includes(lane))
    ) {
      throw new Error(`Work item ${item.id} has invalid evidence lanes.`);
    }
    const requirementIds = new Set<string>();
    item.evidenceRequirements.forEach((requirement, index) => {
      if (!requirement || !stableId.test(requirement.id)) {
        throw new Error(
          `Work item ${item.id}.evidenceRequirements[${index}].id is invalid.`,
        );
      }
      if (requirementIds.has(requirement.id)) {
        throw new Error(
          `Work item ${item.id} has duplicate evidence requirement ${requirement.id}.`,
        );
      }
      requirementIds.add(requirement.id);
      if (!evidenceKinds.includes(requirement.kind)) {
        throw new Error(
          `Work item ${item.id} evidence requirement ${requirement.id} has invalid kind.`,
        );
      }
      if (requirement.kind === 'command' && !requirement.checkStage) {
        throw new Error(
          `Work item ${item.id} command requirement ${requirement.id} needs checkStage.`,
        );
      }
      assertNonEmptyString(
        requirement.description,
        `work item ${item.id} evidence requirement ${requirement.id}.description`,
      );
    });
    item.affectedCriteria.forEach((id) => {
      assertNonEmptyString(id, `work item ${item.id}.affectedCriteria`);
      if (!validAffectedCriteria.has(id)) {
        throw new Error(
          `Work item ${item.id} references unknown criterion ${id}.`,
        );
      }
    });
    if (item.authority === 'human_checkpoint') {
      assertNonEmptyString(
        item.externalApproval,
        `work item ${item.id}.externalApproval`,
      );
    }
  });
  validateAcyclicDependencies(items);
  return definition;
};

export const hashProgramDefinition = (definition: ExecutionProgramDefinition) =>
  createHash('sha256').update(JSON.stringify(definition)).digest('hex');

const programStatePath = (
  definition: ExecutionProgramDefinition,
  root: string,
) => {
  const branch = readRepositoryIdentity(root).branch;
  const branchKey = createHash('sha256')
    .update(branch)
    .digest('hex')
    .slice(0, 16);
  return resolve(
    resolveOperationalDirectory(root),
    'program-state',
    `${basename(definition.id)}-${branchKey}.json`,
  );
};
const initialProgramState = (
  definition: ExecutionProgramDefinition,
  root: string,
): ExecutionProgramState => ({
  schemaVersion: 1,
  programId: definition.id,
  definitionHash: hashProgramDefinition(definition),
  branch: readRepositoryIdentity(root).branch,
  status: 'active',
  updatedAt: new Date(0).toISOString(),
  workItems: definition.workItems.map(({ id }) => ({
    id,
    status: 'pending',
    evidence: [],
  })),
});

const validateProgramState = (
  state: ExecutionProgramState,
  definition: ExecutionProgramDefinition,
  root: string,
) => {
  if (state.schemaVersion !== 1 || state.programId !== definition.id) {
    throw new Error('Operational program state identity is invalid.');
  }
  if (state.definitionHash !== hashProgramDefinition(definition)) {
    throw new Error(
      'Program definition is frozen once operational state exists; create a new program identity.',
    );
  }
  if (state.branch !== readRepositoryIdentity(root).branch) {
    throw new Error('Operational program state belongs to another branch.');
  }
  if (!['active', 'complete'].includes(state.status)) {
    throw new Error('Operational program status is invalid.');
  }
  if (!Number.isFinite(Date.parse(state.updatedAt))) {
    throw new Error('Operational program updatedAt must be an ISO timestamp.');
  }
  const definitions = new Map(
    definition.workItems.map((item) => [item.id, item]),
  );
  if (
    !Array.isArray(state.workItems) ||
    state.workItems.length !== definitions.size
  ) {
    throw new Error(
      'Operational program state does not cover every work item.',
    );
  }
  const seen = new Set<string>();
  state.workItems.forEach((item) => {
    const itemDefinition = definitions.get(item.id);
    if (!itemDefinition || seen.has(item.id)) {
      throw new Error(`Operational state has invalid work item ${item.id}.`);
    }
    seen.add(item.id);
    if (
      !workItemStatuses.includes(item.status) ||
      !Array.isArray(item.evidence)
    ) {
      throw new Error(`Operational state for ${item.id} is malformed.`);
    }
    const requirements = new Map(
      itemDefinition.evidenceRequirements.map((requirement) => [
        requirement.id,
        requirement,
      ]),
    );
    const covered = new Set<string>();
    item.evidence.forEach((evidence, index) => {
      const requirement = requirements.get(evidence.requirementId);
      if (!requirement || covered.has(evidence.requirementId)) {
        throw new Error(
          `Work item ${item.id} has invalid evidence binding ${evidence.requirementId}.`,
        );
      }
      const kind = validateEvidenceReference(
        evidence.reference,
        `work item ${item.id}.evidence[${index}].reference`,
        root,
        {
          checkStage: requirement.checkStage,
          programId: definition.id,
          programDefinitionHash: state.definitionHash,
          claimId: item.terminalIdentity?.claimId,
          leaseId: item.terminalIdentity?.leaseId,
          startingHead: item.terminalIdentity?.startingHead,
          terminalHead: item.terminalIdentity?.head,
        },
      );
      if (kind !== requirement.kind) {
        throw new Error(
          `Work item ${item.id} evidence ${evidence.requirementId} must use ${requirement.kind}:.`,
        );
      }
      covered.add(evidence.requirementId);
    });
    item.recoveryEvidence?.forEach((reference, index) =>
      validateEvidenceReference(
        reference,
        `work item ${item.id}.recoveryEvidence[${index}]`,
        root,
        { programId: definition.id },
      ),
    );
    if (item.status === 'in_progress' && !item.owner) {
      throw new Error(`In-progress work item ${item.id} requires an owner.`);
    }
    if (item.status !== 'in_progress' && item.owner) {
      throw new Error(
        `Only in-progress work item ${item.id} may have an owner.`,
      );
    }
    if (item.status === 'blocked' && !item.blocker) {
      throw new Error(`Blocked work item ${item.id} requires a blocker.`);
    }
    if (item.status !== 'blocked' && item.blocker) {
      throw new Error(`Only blocked work item ${item.id} may have a blocker.`);
    }
    if (
      item.blocker &&
      (!['technical', 'human', 'external', 'unsafe_state'].includes(
        item.blocker.type,
      ) ||
        !item.blocker.reason?.trim() ||
        !item.blocker.recovery?.trim() ||
        !Number.isFinite(Date.parse(item.blocker.recordedAt)) ||
        !item.blocker.previousClaimId?.trim() ||
        !item.blocker.previousLeaseId?.trim() ||
        !Array.isArray(item.blocker.humanValidationIds) ||
        item.blocker.humanValidationIds.some((id) => !id.trim()) ||
        new Set(item.blocker.humanValidationIds).size !==
          item.blocker.humanValidationIds.length ||
        (item.blocker.type === 'human' &&
          item.blocker.humanValidationIds.length === 0))
    ) {
      throw new Error(
        `Blocked work item ${item.id} has malformed recovery state.`,
      );
    }
    if (item.status === 'complete') {
      if (!item.completedAt || !Number.isFinite(Date.parse(item.completedAt))) {
        throw new Error(`Complete work item ${item.id} needs completedAt.`);
      }
      if ([...requirements].some(([id]) => !covered.has(id))) {
        throw new Error(
          `Complete work item ${item.id} has insufficient evidence references.`,
        );
      }
    }
    if (
      (item.status === 'complete' || item.status === 'blocked') &&
      (!item.terminalIdentity?.head ||
        !item.terminalIdentity.statusHash ||
        !item.terminalIdentity.claimId ||
        !item.terminalIdentity.leaseId ||
        !item.terminalIdentity.startingHead)
    ) {
      throw new Error(`Terminal work item ${item.id} lacks Git identity.`);
    }
    if (
      item.status !== 'complete' &&
      item.status !== 'blocked' &&
      item.terminalIdentity
    ) {
      throw new Error(
        `Non-terminal work item ${item.id} has terminal Git identity.`,
      );
    }
  });
  return state;
};

const composeProgram = (
  definition: ExecutionProgramDefinition,
  state: ExecutionProgramState,
): ExecutionProgram => {
  const states = new Map(state.workItems.map((item) => [item.id, item]));
  return {
    ...definition,
    definitionHash: state.definitionHash,
    status: state.status,
    updatedAt: state.updatedAt,
    workItems: definition.workItems.map((item) => ({
      ...item,
      ...states.get(item.id)!,
    })),
  };
};

export const readExecutionProgramDefinition = (
  path = defaultProgramPath,
  root = repositoryRoot,
) =>
  validateExecutionProgramDefinition(
    readJsonFile<ExecutionProgramDefinition>(path),
    root,
  );
export const readExecutionProgram = (
  definitionPath = defaultProgramPath,
  root = repositoryRoot,
) => {
  const definition = readExecutionProgramDefinition(definitionPath, root);
  const operationalPath = programStatePath(definition, root);
  const state = existsSync(operationalPath)
    ? readJsonFile<ExecutionProgramState>(operationalPath)
    : initialProgramState(definition, root);
  return composeProgram(
    definition,
    validateProgramState(state, definition, root),
  );
};
export const writeExecutionProgram = (
  program: ExecutionProgram,
  path = defaultProgramPath,
  root = repositoryRoot,
) => {
  const definition = readExecutionProgramDefinition(path, root);
  const state: ExecutionProgramState = {
    schemaVersion: 1,
    programId: program.id,
    definitionHash: program.definitionHash,
    branch: readRepositoryIdentity(root).branch,
    status: program.workItems.every((item) => item.status === 'complete')
      ? 'complete'
      : 'active',
    updatedAt: program.updatedAt,
    workItems: program.workItems.map(
      ({
        id,
        status,
        evidence,
        recoveryEvidence,
        owner,
        blocker,
        completedAt,
        note,
        terminalIdentity,
      }) => ({
        id,
        status,
        evidence,
        ...(recoveryEvidence ? { recoveryEvidence } : {}),
        ...(owner ? { owner } : {}),
        ...(blocker ? { blocker } : {}),
        ...(completedAt ? { completedAt } : {}),
        ...(note ? { note } : {}),
        ...(terminalIdentity ? { terminalIdentity } : {}),
      }),
    ),
  };
  validateProgramState(state, definition, root);
  writeJsonFileAtomic(programStatePath(definition, root), state);
};

export const getReadyWorkItems = (program: ExecutionProgram) => {
  const complete = new Set(
    program.workItems
      .filter((item) => item.status === 'complete')
      .map((item) => item.id),
  );
  return program.workItems
    .filter(
      (item) =>
        item.status === 'pending' &&
        item.dependsOn.every((dependency) => complete.has(dependency)),
    )
    .sort((left, right) =>
      left.priority === right.priority
        ? left.id.localeCompare(right.id)
        : left.priority - right.priority,
    );
};
export const summarizeExecutionProgram = (program: ExecutionProgram) => {
  const counts = Object.fromEntries(
    workItemStatuses.map((status) => [
      status,
      program.workItems.filter((item) => item.status === status).length,
    ]),
  );
  const ready = getReadyWorkItems(program);
  const remaining = program.workItems.filter(
    (item) => item.status !== 'complete',
  );
  return {
    schemaVersion: program.schemaVersion,
    id: program.id,
    definitionHash: program.definitionHash,
    title: program.title,
    status: program.status,
    updatedAt: program.updatedAt,
    counts,
    ready: {
      autonomous: ready.filter((item) => item.authority === 'autonomous')
        .length,
      humanCheckpoints: ready.filter(
        (item) => item.authority === 'human_checkpoint',
      ).length,
      items: ready.map((item) => item.id),
    },
    remainingEstimate: {
      agentHoursMin: remaining.reduce(
        (total, item) => total + item.estimate.agentHoursMin,
        0,
      ),
      agentHoursMax: remaining.reduce(
        (total, item) => total + item.estimate.agentHoursMax,
        0,
      ),
    },
    blockers: program.workItems
      .filter((item) => item.status === 'blocked')
      .map((item) => ({ id: item.id, blocker: item.blocker })),
  };
};
