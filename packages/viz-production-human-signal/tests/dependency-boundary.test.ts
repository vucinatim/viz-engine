import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const validator = resolve(
  'tools/foundation/validate-workspace-dependencies.mjs',
);

const check = (dependency: boolean, sourceImport: boolean) => {
  const directory = mkdtempSync(resolve(tmpdir(), 'viz-production-boundary-'));
  try {
    for (const [name, dependencies, source] of [
      [
        'runtime',
        dependency
          ? { '@viz-engine/production-human-signal': 'workspace:*' }
          : {},
        sourceImport
          ? "import { createHumanSignalProject } from '@viz-engine/production-human-signal';"
          : '',
      ],
      ['production-human-signal', { '@viz-engine/runtime': 'workspace:*' }, ''],
    ] as const) {
      const path = resolve(directory, 'packages', `viz-${name}`);
      mkdirSync(resolve(path, 'src'), { recursive: true });
      writeFileSync(
        resolve(path, 'package.json'),
        JSON.stringify({ name: `@viz-engine/${name}`, dependencies }),
      );
      writeFileSync(resolve(path, 'src/index.ts'), source);
    }
    const result = spawnSync(process.execPath, [validator], {
      cwd: directory,
      encoding: 'utf8',
    });
    return { status: result.status, output: result.stdout + result.stderr };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

describe('production dependency direction', () => {
  it('allows production packages to use reusable engine packages', () => {
    expect(check(false, false).status).toBe(0);
  });
  it('rejects a declared engine dependency on a production owner', () => {
    const result = check(true, true);
    expect(result.status).toBe(1);
    expect(result.output).toContain(
      'reusable packages cannot depend on productions',
    );
  });
  it('rejects an undeclared production source import too', () => {
    const result = check(false, true);
    expect(result.status).toBe(1);
    expect(result.output).toContain('imports undeclared workspace package');
  });
});
