import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const runHelp = (...arguments_: string[]) =>
  spawnSync('pnpm', ['--silent', 'run', 'repo', '--', ...arguments_], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
  });

describe('repository CLI discoverability', () => {
  it.each([
    [[], 'VizEngine repository maintainer CLI'],
    [['program', '--help'], 'program complete'],
    [['lease', '--help'], 'lease heartbeat'],
    [['checks', '--help'], 'checks plan|run'],
    [['canonicalize', '--help'], 'canonicalize check|apply'],
    [['senses', '--help'], 'senses status|validate'],
    [['human', '--help'], 'human resolve'],
    [['review', '--help'], 'review create'],
    [['run', '--help'], 'run preflight'],
    [['state', '--help'], 'state recover-transition'],
  ])('documents %j', (arguments_, expected) => {
    const result = runHelp(...arguments_);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(expected);
  });

  it('declares all custom reviewer agents read-only with complete instructions', () => {
    const config = readFileSync(resolve(root, '.codex/config.toml'), 'utf8');
    expect(config).toMatch(/max_concurrent_threads_per_session\s*=\s*3/u);
    for (const name of [
      'viz-canonicalizer',
      'viz-checker',
      'viz-sensory-auditor',
    ]) {
      const source = readFileSync(
        resolve(root, `.codex/agents/${name}.toml`),
        'utf8',
      );
      expect(source).toMatch(/^name\s*=\s*"[^"]+"/mu);
      expect(source).toMatch(/^description\s*=\s*"[^"]+"/mu);
      expect(source).toContain('sandbox_mode = "read-only"');
      expect(source).toMatch(/developer_instructions\s*=\s*"""[\s\S]+"""/u);
    }
  });
});
