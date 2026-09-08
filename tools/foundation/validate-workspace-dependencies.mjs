import { readFileSync, readdirSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

const workspaceRoot = process.cwd();
const packagesDirectory = join(workspaceRoot, 'packages');
const packageDirectories = readdirSync(packagesDirectory, {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(packagesDirectory, entry.name));

const tiers = new Map([
  ['@viz-engine/contracts', 0],
  ['@viz-engine/rhythm-core', 1],
  ['@viz-engine/actions', 1],
  ['@viz-engine/bake', 1],
  ['@viz-engine/components-core', 1],
  ['@viz-engine/example-projects', 1],
  ['@viz-engine/nodes-core', 1],
  ['@viz-engine/production-signal-cathedral', 1],
  ['@viz-engine/production-afterlight-assembly', 1],
  ['@viz-engine/remotion-adapter', 1],
  ['@viz-engine/render', 1],
  ['@viz-engine/renderer-svg', 1],
  ['@viz-engine/renderer-three', 1],
  ['@viz-engine/runtime', 1],
  ['@viz-engine/editor-session', 2],
  ['@viz-engine/editor-control', 3],
  ['@viz-engine/project-bundle', 3],
  ['@viz-engine/production-human-signal', 3],
  ['@viz-engine/dev-cli', 4],
]);

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const packages = new Map(
  packageDirectories.map((directory) => {
    const manifest = readJson(join(directory, 'package.json'));
    return [manifest.name, { directory, manifest }];
  }),
);
const issues = [];

const listSourceFiles = (directory) => {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(path));
    } else if (/\.(?:ts|tsx|mts|mjs)$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
};

const packageImportPattern =
  /\b(?:from\s*|import\s*\()\s*['"](@viz-engine\/[a-z0-9-]+)(?:\/[^'"]*)?['"]/g;
const nodeImportPattern = /\b(?:from\s*|import\s*\()\s*['"]node:/;
const graph = new Map();

for (const [packageName, { directory, manifest }] of packages) {
  const tier = tiers.get(packageName);
  if (tier === undefined) {
    issues.push(`Package "${packageName}" has no declared architecture tier.`);
  }

  const dependencies = {
    ...(manifest.dependencies ?? {}),
    ...(manifest.optionalDependencies ?? {}),
    ...(manifest.peerDependencies ?? {}),
  };
  const workspaceDependencies = Object.keys(dependencies).filter((name) =>
    name.startsWith('@viz-engine/'),
  );
  graph.set(packageName, workspaceDependencies);

  for (const dependencyName of workspaceDependencies) {
    if (!packages.has(dependencyName)) {
      issues.push(
        `${packageName} declares unknown workspace dependency "${dependencyName}".`,
      );
      continue;
    }
    if (
      dependencyName.startsWith('@viz-engine/production-') &&
      !packageName.startsWith('@viz-engine/production-')
    ) {
      issues.push(
        `${packageName} imports production owner ${dependencyName}; reusable packages cannot depend on productions.`,
      );
    }
    const dependencyTier = tiers.get(dependencyName);
    if (
      tier !== undefined &&
      dependencyTier !== undefined &&
      dependencyTier > tier
    ) {
      issues.push(
        `${packageName} (tier ${tier}) depends upward on ${dependencyName} (tier ${dependencyTier}).`,
      );
    }
  }

  for (const sourcePath of listSourceFiles(join(directory, 'src'))) {
    const source = readFileSync(sourcePath, 'utf8');
    const relativePath = relative(workspaceRoot, sourcePath);
    for (const match of source.matchAll(packageImportPattern)) {
      const importedPackage = match[1];
      if (
        importedPackage !== packageName &&
        dependencies[importedPackage] === undefined
      ) {
        issues.push(
          `${relativePath} imports undeclared workspace package "${importedPackage}".`,
        );
      }
    }

    const nodeImportAllowed =
      packageName === '@viz-engine/dev-cli' ||
      packageName === '@viz-engine/project-bundle' ||
      basename(sourcePath) === 'node.ts';
    if (!nodeImportAllowed && nodeImportPattern.test(source)) {
      issues.push(
        `${relativePath} imports a Node builtin outside an explicit Node entrypoint.`,
      );
    }
  }

  const rootEntry = join(directory, 'src', 'index.ts');
  try {
    if (
      /from\s*['"]\.\/node(?:\.js)?['"]/.test(readFileSync(rootEntry, 'utf8'))
    ) {
      issues.push(
        `${relative(workspaceRoot, rootEntry)} leaks its Node entrypoint through the package root.`,
      );
    }
  } catch {
    // Node-only packages may intentionally expose only a ./node entrypoint.
  }
}

const visiting = new Set();
const visited = new Set();
const visit = (packageName, path = []) => {
  if (visiting.has(packageName)) {
    const cycleStart = path.indexOf(packageName);
    issues.push(
      `Workspace dependency cycle: ${[...path.slice(cycleStart), packageName].join(' -> ')}`,
    );
    return;
  }
  if (visited.has(packageName)) {
    return;
  }

  visiting.add(packageName);
  for (const dependency of graph.get(packageName) ?? []) {
    if (packages.has(dependency)) {
      visit(dependency, [...path, packageName]);
    }
  }
  visiting.delete(packageName);
  visited.add(packageName);
};

for (const packageName of packages.keys()) {
  visit(packageName);
}

if (issues.length > 0) {
  console.error(
    [
      'Workspace architecture validation failed:',
      ...issues.map((issue) => `- ${issue}`),
    ].join('\n'),
  );
  process.exitCode = 1;
} else {
  console.log(
    `Workspace architecture valid: ${packages.size} packages, no upward dependencies, cycles, undeclared workspace imports, or Node entrypoint leaks.`,
  );
}
