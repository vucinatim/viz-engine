import { existsSync } from 'node:fs';

import { readJsonFile } from './json-file';
import {
  defaultSensoryMapPath,
  goalFiveMatrixPath,
  resolveRepositoryPath,
} from './paths';
import { EvidenceLane, evidenceLanes } from './program';

interface SensoryLane {
  id: EvidenceLane;
  owner: string;
}

interface SensoryMap {
  schemaVersion: 1;
  goalId: string;
  certificationMatrix: string;
  evidenceLanes: SensoryLane[];
  categoryMappings: Record<string, EvidenceLane[]>;
  calibrationFailures: string[];
}

interface CertificationCriterion {
  id: string;
  category: string;
  environment: string;
  observation: string;
  decisionRule: string;
  evaluation: {
    kind: string;
    harness: 'ready' | 'planned' | 'human';
    command?: string;
    workflow?: string;
  };
  artifacts: string[];
  status: string;
}

interface CertificationMatrix {
  goalId: string;
  criteria: CertificationCriterion[];
}

interface PackageManifest {
  scripts?: Record<string, string>;
}

export const readAndValidateSensoryMap = (path = defaultSensoryMapPath) => {
  const map = readJsonFile<SensoryMap>(path);
  if (map.schemaVersion !== 1)
    throw new Error('Unsupported sensory map schema.');
  if (map.goalId !== 'goal-five-flagship') {
    throw new Error('Sensory map must target goal-five-flagship.');
  }
  if (resolveRepositoryPath(map.certificationMatrix) !== goalFiveMatrixPath) {
    throw new Error(
      'Sensory map must reference the canonical Goal Five matrix.',
    );
  }
  if (!existsSync(goalFiveMatrixPath))
    throw new Error('Goal Five matrix is missing.');
  const laneIds = new Set(map.evidenceLanes.map((lane) => lane.id));
  if (
    laneIds.size !== evidenceLanes.length ||
    evidenceLanes.some((lane) => !laneIds.has(lane))
  ) {
    throw new Error(
      'Sensory map must define every canonical evidence lane once.',
    );
  }
  map.evidenceLanes.forEach((lane) => {
    if (typeof lane.owner !== 'string' || lane.owner.trim().length === 0) {
      throw new Error(`Evidence lane ${lane.id} needs an owner.`);
    }
  });
  if (
    !Array.isArray(map.calibrationFailures) ||
    map.calibrationFailures.length === 0
  ) {
    throw new Error('Sensory map needs known calibration failures.');
  }

  const matrix = readJsonFile<CertificationMatrix>(goalFiveMatrixPath);
  if (matrix.goalId !== map.goalId)
    throw new Error('Sensory map goal mismatch.');
  const scripts =
    readJsonFile<PackageManifest>(resolveRepositoryPath('package.json'))
      .scripts ?? {};
  const mappedCriteria = matrix.criteria.map((criterion) => {
    const lanes = map.categoryMappings[criterion.category];
    if (!lanes || lanes.length === 0) {
      throw new Error(
        `Criterion ${criterion.id} has no evidence-lane mapping.`,
      );
    }
    if (lanes.some((lane) => !laneIds.has(lane))) {
      throw new Error(
        `Criterion ${criterion.id} maps to an unknown evidence lane.`,
      );
    }
    if (!['ready', 'planned', 'human'].includes(criterion.evaluation.harness)) {
      throw new Error(
        `Criterion ${criterion.id} has an invalid harness state.`,
      );
    }
    const observation =
      criterion.evaluation.command ?? criterion.evaluation.workflow ?? '';
    if (!observation) {
      throw new Error(`Criterion ${criterion.id} has no observation workflow.`);
    }
    if (
      !Array.isArray(criterion.artifacts) ||
      criterion.artifacts.length === 0
    ) {
      throw new Error(`Criterion ${criterion.id} has no evidence artifact.`);
    }
    if (criterion.evaluation.harness === 'ready') {
      const command = criterion.evaluation.command;
      const scriptName = command?.match(/^pnpm ([\w:-]+)$/u)?.[1];
      const script = scriptName ? scripts[scriptName] : undefined;
      if (!script) {
        throw new Error(
          `Ready criterion ${criterion.id} does not name an existing package script.`,
        );
      }
      const missingArtifactContract = criterion.artifacts.find(
        (artifact) => !script.includes(artifact),
      );
      if (missingArtifactContract) {
        throw new Error(
          `Ready criterion ${criterion.id} command does not declare output ${missingArtifactContract}.`,
        );
      }
    }
    return {
      criterionId: criterion.id,
      category: criterion.category,
      evidenceLanes: lanes,
      environment: criterion.environment,
      observation: criterion.observation,
      decisionRule: criterion.decisionRule,
      organ: {
        status: criterion.evaluation.harness,
        kind: criterion.evaluation.kind,
        workflow: observation,
        artifacts: criterion.artifacts,
      },
      criterionStatus: criterion.status,
    };
  });

  if (mappedCriteria.length !== 46) {
    throw new Error(
      `Sensory map expected 46 Goal Five criteria, received ${mappedCriteria.length}.`,
    );
  }

  return {
    map,
    criteria: mappedCriteria,
    counts: {
      total: mappedCriteria.length,
      ready: mappedCriteria.filter((entry) => entry.organ.status === 'ready')
        .length,
      planned: mappedCriteria.filter(
        (entry) => entry.organ.status === 'planned',
      ).length,
      human: mappedCriteria.filter((entry) => entry.organ.status === 'human')
        .length,
    },
  };
};
