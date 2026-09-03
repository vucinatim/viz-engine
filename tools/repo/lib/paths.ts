import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

export const resolveRepositoryPath = (relativePath: string) => {
  const resolved = resolve(repositoryRoot, relativePath);
  if (
    resolved !== repositoryRoot &&
    !resolved.startsWith(`${repositoryRoot}/`)
  ) {
    throw new Error(`Path must remain inside the repository: ${relativePath}`);
  }
  return resolved;
};

export const resolveGitCommonDirectory = (root = repositoryRoot) => {
  const rawPath = execFileSync('git', ['rev-parse', '--git-common-dir'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  return resolve(root, rawPath);
};

export const resolveOperationalDirectory = (root = repositoryRoot) => {
  const directory = resolve(
    resolveGitCommonDirectory(root),
    'viz-engine-autonomy',
  );
  mkdirSync(directory, { recursive: true });
  return directory;
};

export const resolveActiveProgramPath = (root = repositoryRoot) => {
  const pointerPath = resolve(root, 'tools/repo/programs/active-program.json');
  const pointer = JSON.parse(readFileSync(pointerPath, 'utf8')) as {
    schemaVersion?: number;
    program?: string;
  };
  if (
    pointer.schemaVersion !== 1 ||
    typeof pointer.program !== 'string' ||
    pointer.program.trim().length === 0
  ) {
    throw new Error('Active program pointer is malformed.');
  }
  const path = resolve(root, pointer.program);
  if (path === root || !path.startsWith(`${root}/`)) {
    throw new Error('Active program must remain inside the repository.');
  }
  return path;
};
export const defaultProgramPath = resolveActiveProgramPath();

export const defaultSensoryMapPath = resolveRepositoryPath(
  'docs/parity/goal-five-sensory-map.json',
);

export const goalFiveMatrixPath = resolveRepositoryPath(
  'docs/parity/goal-five-certification-matrix.json',
);
