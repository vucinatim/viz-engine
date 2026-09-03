import { extname } from 'node:path';

export const checkStages = [
  'fast',
  'focused',
  'checkpoint',
  'integration',
  'certification',
] as const;
export type CheckStage = (typeof checkStages)[number];
export interface CheckCommand {
  id: string;
  command: string;
  arguments: string[];
  reason: string;
}
export interface CheckPlan {
  stage: CheckStage;
  changedFiles: string[];
  commands: CheckCommand[];
}

const prettierExtensions = new Set([
  '.css',
  '.json',
  '.md',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx',
]);
const eslintExtensions = new Set(['.mjs', '.mts', '.ts', '.tsx']);
const relatedExtensions = new Set(['.ts', '.tsx']);
export const isPrettierFile = (file: string) =>
  prettierExtensions.has(extname(file));
const repositoryContractChanged = (files: string[]) =>
  files.some(
    (file) =>
      file.startsWith('tools/repo/') ||
      file.startsWith('tests/foundation/repo-') ||
      file === 'docs/parity/goal-five-sensory-map.json',
  );
const command = (
  id: string,
  executable: string,
  arguments_: string[],
  reason: string,
): CheckCommand => ({ id, command: executable, arguments: arguments_, reason });
const fastCommands = (): CheckCommand[] => [
  command('git-diff', 'git', ['diff', '--check'], 'Reject malformed patches.'),
  command(
    'architecture',
    'pnpm',
    ['architecture:validate'],
    'Protect package direction and public entrypoint boundaries.',
  ),
  command(
    'parity-contract',
    'pnpm',
    ['parity:validate'],
    'Protect the frozen V1 parity contract.',
  ),
  command(
    'goal-five-contract',
    'pnpm',
    ['goal5:criteria:validate'],
    'Protect the frozen Goal Five certification contract.',
  ),
];

export const canonicalCheckPlan = (
  stage: CheckStage,
  changedFiles: string[],
): CheckPlan => {
  if (!checkStages.includes(stage))
    throw new Error(`Unknown check stage ${stage}.`);
  const prettierFiles = changedFiles.filter(isPrettierFile);
  const eslintFiles = changedFiles.filter((file) =>
    eslintExtensions.has(extname(file)),
  );
  const repoChanged = repositoryContractChanged(changedFiles);
  const relatedFiles = changedFiles.filter(
    (file) =>
      relatedExtensions.has(extname(file)) &&
      (!repoChanged ||
        (!file.startsWith('tools/repo/') &&
          !file.startsWith('tests/foundation/repo-'))),
  );
  const commands = fastCommands();

  if (stage === 'focused' || stage === 'checkpoint') {
    if (prettierFiles.length > 0) {
      commands.push(
        command(
          'format-changed',
          'pnpm',
          ['exec', 'prettier', '--check', ...prettierFiles],
          'Check formatting only on the active diff.',
        ),
      );
    }
    if (eslintFiles.length > 0) {
      commands.push(
        command(
          'lint-changed',
          'pnpm',
          ['exec', 'eslint', '--max-warnings', '0', ...eslintFiles],
          'Lint only changed source and tool files.',
        ),
      );
    }
    if (repoChanged) {
      commands.push(
        command(
          'repo-contract-tests',
          'pnpm',
          [
            'exec',
            'vitest',
            'run',
            '--no-file-parallelism',
            'tests/foundation/repo-program.test.ts',
            'tests/foundation/repo-lease.test.ts',
            'tests/foundation/repo-checks.test.ts',
            'tests/foundation/repo-cli.test.ts',
            'tests/foundation/repo-evidence.test.ts',
            'tests/foundation/repo-human-validation.test.ts',
            'tests/foundation/repo-operational-lock.test.ts',
            'tests/foundation/repo-review.test.ts',
          ],
          'Exercise repository contracts only when their implementation changes.',
        ),
      );
    }
    if (relatedFiles.length > 0) {
      commands.push(
        command(
          'related-tests',
          'pnpm',
          ['exec', 'vitest', 'related', '--run', ...relatedFiles],
          'Run tests related to the active TypeScript diff.',
        ),
      );
    }
  }
  if (stage === 'checkpoint') {
    commands.push(
      command(
        'typecheck-foundation',
        'pnpm',
        ['typecheck:foundation'],
        'Type-check every package, tool, and editor boundary before commit.',
      ),
      command(
        'unit-foundation',
        'pnpm',
        ['test:foundation'],
        'Run the complete deterministic unit and foundation suite.',
      ),
    );
  }
  if (stage === 'integration') {
    commands.splice(
      0,
      commands.length,
      ...fastCommands(),
      command(
        'format-all',
        'pnpm',
        ['format:check'],
        'Check all authored code.',
      ),
      command('lint-all', 'pnpm', ['lint'], 'Lint all authored code.'),
      command(
        'typecheck-all',
        'pnpm',
        ['typecheck:foundation'],
        'Type-check every package, tool, and editor boundary.',
      ),
      command('unit-all', 'pnpm', ['test:foundation'], 'Run all unit tests.'),
      command(
        'build-all',
        'pnpm',
        ['build:foundation'],
        'Build packages and editor.',
      ),
      command(
        'consumer-smoke',
        'pnpm',
        ['smoke:consumer:built'],
        'Exercise built package consumption.',
      ),
      command(
        'creative-loop-smoke',
        'pnpm',
        ['smoke:creative-loop:built'],
        'Exercise the built canonical creative loop.',
      ),
    );
  }
  if (stage === 'certification') {
    commands.splice(
      0,
      commands.length,
      command(
        'foundation-certification',
        'pnpm',
        ['check:foundation'],
        'Run the uninterrupted complete repository and browser gate.',
      ),
    );
  }
  return { stage, changedFiles, commands };
};
