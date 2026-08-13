import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const matrixPath = resolve(
  repositoryRoot,
  process.env.VIZ_GOAL5_CERTIFICATION_MATRIX ??
    'docs/parity/goal-five-certification-matrix.json',
);
const finalMode = process.argv.includes('--final');

const VALID_STATUSES = new Set([
  'pending',
  'passed',
  'failed',
  'approved-exclusion',
]);
const VALID_OBLIGATIONS = new Set(['mandatory', 'gate1-excludable']);
const VALID_HARNESSES = new Set(['ready', 'planned', 'human']);
const REQUIRED_CATEGORIES = new Set([
  'flagship-production',
  'canonical-workflow',
  'determinism-portability',
  'editor-product',
  'performance-lifecycle',
  'reusable-system',
  'repository-evidence',
  'artifact-evidence',
]);
const FULL_SHA = /^[0-9a-f]{40}$/;
const STABLE_ID = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

const fail = (message) => {
  throw new Error(`Goal Five certification validation failed: ${message}`);
};

const requireString = (value, label) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${label} must be a non-empty string`);
  }
};

const requireFullSha = (value, label) => {
  requireString(value, label);
  if (!FULL_SHA.test(value)) fail(`${label} must be a full lowercase Git SHA`);
  try {
    execFileSync('git', ['cat-file', '-e', `${value}^{commit}`], {
      cwd: repositoryRoot,
      stdio: 'ignore',
    });
  } catch {
    fail(`${label} does not resolve to a repository commit: ${value}`);
  }
};

const requireSafePath = (value, label, { mustExist = false } = {}) => {
  requireString(value, label);
  if (value.startsWith('/') || value.split('/').includes('..')) {
    fail(`${label} must be a repository-relative safe path`);
  }
  if (mustExist && !existsSync(resolve(repositoryRoot, value))) {
    fail(`${label} does not exist: ${value}`);
  }
};

const indexById = (values, label) => {
  if (!Array.isArray(values) || values.length === 0) {
    fail(`${label} must be a non-empty array`);
  }
  const indexed = new Map();
  values.forEach((value, index) => {
    requireString(value?.id, `${label}[${index}].id`);
    if (!STABLE_ID.test(value.id)) {
      fail(`${label}[${index}].id must use stable lowercase dot/dash notation`);
    }
    if (indexed.has(value.id)) fail(`duplicate ${label} id ${value.id}`);
    indexed.set(value.id, value);
  });
  return indexed;
};

if (!existsSync(matrixPath)) fail(`missing matrix at ${matrixPath}`);
const matrix = JSON.parse(readFileSync(matrixPath, 'utf8'));

if (matrix.schemaVersion !== 1) fail('schemaVersion must be 1');
if (matrix.goalId !== 'goal-five-flagship') {
  fail('goalId must be goal-five-flagship');
}
requireString(matrix.status, 'status');

for (const key of [
  'planningBaseline',
  'activationCommit',
  'phase0RepairCommit',
]) {
  requireFullSha(matrix.identity?.[key], `identity.${key}`);
}
for (const key of ['candidateCommit', 'evidenceCommit']) {
  const value = matrix.identity?.[key];
  if (value !== null) requireFullSha(value, `identity.${key}`);
}

if (!Array.isArray(matrix.references) || matrix.references.length === 0) {
  fail('references must be a non-empty array');
}
matrix.references.forEach((path, index) =>
  requireSafePath(path, `references[${index}]`, { mustExist: true }),
);

const environments = indexById(matrix.environments, 'environments');
for (const [id, environment] of environments) {
  for (const field of [
    'machine',
    'os',
    'browser',
    'viewport',
    'quality',
    'executionMode',
    'isolation',
  ]) {
    const value = environment[field];
    if (!(
      (typeof value === 'string' && value.trim().length > 0) ||
      (field === 'quality' && Number.isFinite(value))
    )) {
      fail(`environment ${id}.${field} must be explicit`);
    }
  }
  if (!(
    Number.isFinite(environment.dpr) ||
    (typeof environment.dpr === 'string' && environment.dpr.length > 0)
  )) {
    fail(`environment ${id}.dpr must be explicit`);
  }
}

const evaluators = indexById(matrix.evaluators, 'evaluators');
for (const [id, evaluator] of evaluators) {
  requireString(evaluator.kind, `evaluator ${id}.kind`);
  requireString(evaluator.owner, `evaluator ${id}.owner`);
}

const observations = indexById(matrix.observations, 'observations');
for (const [id, observation] of observations) {
  requireString(observation.definition, `observation ${id}.definition`);
}

const decisionRules = indexById(matrix.decisionRules, 'decisionRules');
for (const [id, rule] of decisionRules) {
  requireString(rule.definition, `decision rule ${id}.definition`);
}

const criteria = indexById(matrix.criteria, 'criteria');
const coveredCategories = new Set();
const statusCounts = Object.fromEntries(
  [...VALID_STATUSES].map((status) => [status, 0]),
);
const harnessCounts = Object.fromEntries(
  [...VALID_HARNESSES].map((harness) => [harness, 0]),
);

for (const [id, criterion] of criteria) {
  requireString(criterion.category, `criterion ${id}.category`);
  coveredCategories.add(criterion.category);
  if (!VALID_OBLIGATIONS.has(criterion.obligation)) {
    fail(`criterion ${id}.obligation is invalid`);
  }
  requireString(criterion.requirement, `criterion ${id}.requirement`);
  if (!environments.has(criterion.environment)) {
    fail(`criterion ${id} references unknown environment`);
  }
  if (!Object.hasOwn(matrix.identity, criterion.sourceRevision)) {
    fail(`criterion ${id} references unknown sourceRevision`);
  }
  if (!observations.has(criterion.observation)) {
    fail(`criterion ${id} references unknown observation`);
  }
  if (!decisionRules.has(criterion.decisionRule)) {
    fail(`criterion ${id} references unknown decisionRule`);
  }

  const evaluation = criterion.evaluation;
  requireString(evaluation?.kind, `criterion ${id}.evaluation.kind`);
  if (!VALID_HARNESSES.has(evaluation?.harness)) {
    fail(`criterion ${id}.evaluation.harness is invalid`);
  }
  harnessCounts[evaluation.harness] += 1;
  if (!evaluators.has(evaluation.evaluator)) {
    fail(`criterion ${id} references unknown evaluator`);
  }
  const hasCommand =
    typeof evaluation.command === 'string' &&
    evaluation.command.trim().length > 0;
  const hasWorkflow =
    typeof evaluation.workflow === 'string' &&
    evaluation.workflow.trim().length > 0;
  if (hasCommand === hasWorkflow) {
    fail(`criterion ${id} must define exactly one command or review workflow`);
  }
  if (evaluation.harness === 'human' && !hasWorkflow) {
    fail(`criterion ${id} human evaluation requires a review workflow`);
  }
  if (evaluation.harness !== 'human' && !hasCommand) {
    fail(`criterion ${id} automated evaluation requires an exact command`);
  }

  if (!Array.isArray(criterion.artifacts) || criterion.artifacts.length === 0) {
    fail(`criterion ${id}.artifacts must be a non-empty array`);
  }
  criterion.artifacts.forEach((path, index) =>
    requireSafePath(path, `criterion ${id}.artifacts[${index}]`),
  );

  if (!VALID_STATUSES.has(criterion.status)) {
    fail(`criterion ${id}.status is invalid`);
  }
  statusCounts[criterion.status] += 1;
  if (!Array.isArray(criterion.evidence)) {
    fail(`criterion ${id}.evidence must be an array`);
  }
  criterion.evidence.forEach((path, index) =>
    requireSafePath(path, `criterion ${id}.evidence[${index}]`, {
      mustExist: finalMode,
    }),
  );

  if (criterion.status === 'approved-exclusion') {
    if (criterion.obligation !== 'gate1-excludable') {
      fail(`criterion ${id} cannot exclude a mandatory obligation`);
    }
    if (criterion.evidence.length === 0) {
      fail(`criterion ${id} approved exclusion requires human evidence`);
    }
  }

  if (finalMode) {
    if (evaluation.harness === 'planned') {
      fail(`criterion ${id} still has a planned harness in final mode`);
    }
    if (!['passed', 'approved-exclusion'].includes(criterion.status)) {
      fail(`criterion ${id} is ${criterion.status} in final mode`);
    }
    if (criterion.evidence.length === 0) {
      fail(`criterion ${id} has no evidence in final mode`);
    }
  }
}

const missingCategories = [...REQUIRED_CATEGORIES].filter(
  (category) => !coveredCategories.has(category),
);
if (missingCategories.length > 0) {
  fail(`missing required categories: ${missingCategories.join(', ')}`);
}

if (finalMode) {
  requireFullSha(matrix.identity.candidateCommit, 'identity.candidateCommit');
  const evidenceCommit = execFileSync('git', ['rev-parse', 'HEAD^{commit}'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  }).trim();
  if (
    matrix.identity.evidenceCommit !== null &&
    matrix.identity.evidenceCommit !== evidenceCommit
  ) {
    fail(
      'identity.evidenceCommit must be null or equal the checked-out commit',
    );
  }
  if (matrix.identity.candidateCommit === evidenceCommit) {
    fail('candidateCommit and evidenceCommit must be different commits');
  }
  try {
    execFileSync(
      'git',
      [
        'merge-base',
        '--is-ancestor',
        matrix.identity.candidateCommit,
        evidenceCommit,
      ],
      { cwd: repositoryRoot, stdio: 'ignore' },
    );
  } catch {
    fail('candidateCommit must be an ancestor of the evidence commit');
  }
  const changedFiles = execFileSync(
    'git',
    ['diff', '--name-only', matrix.identity.candidateCommit, evidenceCommit],
    { cwd: repositoryRoot, encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .filter(Boolean);
  const invalidEvidenceFiles = changedFiles.filter(
    (path) => !path.startsWith('docs/'),
  );
  if (invalidEvidenceFiles.length > 0) {
    fail(
      `evidence commit range changes non-documentation files: ${invalidEvidenceFiles.join(', ')}`,
    );
  }
}

process.stdout.write(
  `${JSON.stringify(
    {
      ok: true,
      mode: finalMode ? 'final' : 'planning',
      goalId: matrix.goalId,
      criterionCount: criteria.size,
      coveredCategories: [...coveredCategories].sort(),
      statusCounts,
      harnessCounts,
      candidateCommit: matrix.identity.candidateCommit,
      evidenceCommit:
        finalMode && matrix.identity.evidenceCommit === null
          ? 'current-commit'
          : matrix.identity.evidenceCommit,
    },
    null,
    2,
  )}\n`,
);
