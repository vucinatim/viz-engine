import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "../..");
const matrixPath = resolve(
  repositoryRoot,
  "docs/parity/v1-v2-parity-matrix.json",
);

const VALID_STATUSES = new Set([
  "not-audited",
  "gap",
  "partial",
  "verified",
  "approved-change",
]);
const VALID_IMPORTANCE = new Set(["critical", "high", "standard"]);
const VALID_DIMENSIONS = new Set([
  "visual",
  "interaction",
  "functional",
  "performance",
]);
const VALID_VALIDATION_METHODS = new Set([
  "unit",
  "integration",
  "browser",
  "visual",
  "benchmark",
  "manual",
]);
const REQUIRED_AREAS = new Set([
  "shell",
  "layers",
  "parameters",
  "nodes",
  "audio",
  "transport",
  "preview",
  "history",
  "persistence",
  "export",
  "debugging",
  "rhythm-lab",
  "performance",
]);

const fail = (message) => {
  throw new Error(`Parity matrix validation failed: ${message}`);
};

const readMatrix = () => {
  if (!existsSync(matrixPath)) {
    fail(`missing matrix at ${matrixPath}`);
  }

  return JSON.parse(readFileSync(matrixPath, "utf8"));
};

const verifyGitObject = (object) => {
  try {
    execFileSync("git", ["cat-file", "-e", object], {
      cwd: repositoryRoot,
      stdio: "ignore",
    });
  } catch {
    fail(`missing Git object ${object}`);
  }
};

const requireNonEmptyString = (value, label) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} must be a non-empty string`);
  }
};

const requireStringArray = (value, label, { allowEmpty = false } = {}) => {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    fail(`${label} must be ${allowEmpty ? "an" : "a non-empty"} array`);
  }

  value.forEach((entry, index) =>
    requireNonEmptyString(entry, `${label}[${index}]`),
  );
};

const matrix = readMatrix();

if (matrix.schemaVersion !== 1) {
  fail("schemaVersion must be 1");
}

requireNonEmptyString(matrix.baseline?.commit, "baseline.commit");
if (!/^[0-9a-f]{40}$/.test(matrix.baseline.commit)) {
  fail("baseline.commit must be a full lowercase 40-character Git SHA");
}
requireNonEmptyString(matrix.baseline?.label, "baseline.label");
requireNonEmptyString(matrix.baseline?.rationale, "baseline.rationale");
verifyGitObject(`${matrix.baseline.commit}^{commit}`);

if (!Array.isArray(matrix.capabilities) || matrix.capabilities.length === 0) {
  fail("capabilities must be a non-empty array");
}

const ids = new Set();
const coveredAreas = new Set();
const statusCounts = Object.fromEntries(
  [...VALID_STATUSES].map((status) => [status, 0]),
);

for (const [index, capability] of matrix.capabilities.entries()) {
  const label = `capabilities[${index}]`;
  requireNonEmptyString(capability.id, `${label}.id`);
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(capability.id)) {
    fail(`${label}.id must use stable lowercase dot/dash notation`);
  }
  if (ids.has(capability.id)) {
    fail(`duplicate capability id ${capability.id}`);
  }
  ids.add(capability.id);

  requireNonEmptyString(capability.area, `${label}.area`);
  requireNonEmptyString(capability.capability, `${label}.capability`);
  coveredAreas.add(capability.area);

  if (!VALID_IMPORTANCE.has(capability.importance)) {
    fail(`${label}.importance is invalid`);
  }
  if (!VALID_STATUSES.has(capability.status)) {
    fail(`${label}.status is invalid`);
  }
  statusCounts[capability.status] += 1;

  requireStringArray(capability.parityDimensions, `${label}.parityDimensions`);
  capability.parityDimensions.forEach((dimension) => {
    if (!VALID_DIMENSIONS.has(dimension)) {
      fail(`${label}.parityDimensions contains invalid value ${dimension}`);
    }
  });

  requireStringArray(
    capability.referenceEvidence,
    `${label}.referenceEvidence`,
  );
  capability.referenceEvidence.forEach((path) => {
    if (path.startsWith("/") || path.includes("..")) {
      fail(`${label}.referenceEvidence contains unsafe path ${path}`);
    }
    verifyGitObject(`${matrix.baseline.commit}:${path}`);
  });

  requireStringArray(capability.v2Evidence, `${label}.v2Evidence`, {
    allowEmpty: capability.status === "not-audited" || capability.status === "gap",
  });
  capability.v2Evidence.forEach((path) => {
    if (path.startsWith("/") || path.includes("..")) {
      fail(`${label}.v2Evidence contains unsafe path ${path}`);
    }
    if (!existsSync(resolve(repositoryRoot, path))) {
      fail(`${label}.v2Evidence path does not exist: ${path}`);
    }
  });

  requireStringArray(capability.acceptance, `${label}.acceptance`);
  requireStringArray(
    capability.validationMethods,
    `${label}.validationMethods`,
  );
  capability.validationMethods.forEach((method) => {
    if (!VALID_VALIDATION_METHODS.has(method)) {
      fail(`${label}.validationMethods contains invalid value ${method}`);
    }
  });

  requireStringArray(
    capability.validationEvidence,
    `${label}.validationEvidence`,
    { allowEmpty: true },
  );
  if (
    (capability.status === "verified" ||
      capability.status === "approved-change") &&
    capability.validationEvidence.length === 0
  ) {
    fail(`${label} requires validationEvidence for status ${capability.status}`);
  }

  if (
    capability.parityDimensions.includes("performance") &&
    !capability.validationMethods.includes("benchmark")
  ) {
    fail(`${label} has performance parity without benchmark validation`);
  }
}

const missingAreas = [...REQUIRED_AREAS].filter(
  (area) => !coveredAreas.has(area),
);
if (missingAreas.length > 0) {
  fail(`missing required capability areas: ${missingAreas.join(", ")}`);
}

process.stdout.write(
  `${JSON.stringify(
    {
      ok: true,
      baseline: matrix.baseline.commit,
      capabilityCount: matrix.capabilities.length,
      coveredAreas: [...coveredAreas].sort(),
      statusCounts,
    },
    null,
    2,
  )}\n`,
);
