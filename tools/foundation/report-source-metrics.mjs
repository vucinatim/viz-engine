import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';

const CODE_EXTENSION = /\.(?:ts|tsx|mts|mjs)$/;
const commitArgumentIndex = process.argv.indexOf('--commit');
const requestedCommit =
  commitArgumentIndex === -1
    ? undefined
    : process.argv[commitArgumentIndex + 1];

if (commitArgumentIndex !== -1 && !requestedCommit) {
  throw new Error('Usage: report-source-metrics.mjs [--commit <git-ref>]');
}

const commit = execFileSync(
  'git',
  ['rev-parse', requestedCommit ? `${requestedCommit}^{commit}` : 'HEAD'],
  { encoding: 'utf8' },
).trim();

const historicalEntries = requestedCommit
  ? execFileSync('git', ['ls-tree', '-r', '-z', commit], { encoding: 'utf8' })
      .split('\0')
      .filter(Boolean)
      .map((entry) => {
        const match = entry.match(/^\d+ blob ([0-9a-f]+)\t(.+)$/s);
        if (!match) throw new Error(`Could not parse Git tree entry: ${entry}`);
        return { hash: match[1], path: match[2] };
      })
  : [];
const sourceFiles = requestedCommit
  ? historicalEntries.map((entry) => entry.path)
  : execFileSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
      { encoding: 'utf8' },
    )
      .split('\0')
      .filter((file) => file && fs.existsSync(file));
const codeEntries = historicalEntries.filter((entry) =>
  CODE_EXTENSION.test(entry.path),
);
const historicalSources = new Map();

if (requestedCommit) {
  const batch = spawnSync('git', ['cat-file', '--batch'], {
    input: `${codeEntries.map((entry) => entry.hash).join('\n')}\n`,
    maxBuffer: 128 * 1024 * 1024,
  });
  if (batch.status !== 0) {
    throw new Error(batch.stderr.toString('utf8'));
  }

  let cursor = 0;
  for (const entry of codeEntries) {
    const headerEnd = batch.stdout.indexOf(10, cursor);
    const [, type, sizeText] = batch.stdout
      .subarray(cursor, headerEnd)
      .toString('utf8')
      .split(' ');
    if (type !== 'blob') throw new Error(`Git object ${entry.hash} is ${type}`);
    const size = Number.parseInt(sizeText, 10);
    const contentStart = headerEnd + 1;
    historicalSources.set(
      entry.path,
      batch.stdout.subarray(contentStart, contentStart + size).toString('utf8'),
    );
    cursor = contentStart + size + 1;
  }
}

const readSource = (file) => {
  if (!requestedCommit) return fs.readFileSync(file, 'utf8');
  const source = historicalSources.get(file);
  if (source === undefined) throw new Error(`Missing Git source for ${file}`);
  return source;
};

const countLines = (files) =>
  files.reduce(
    (total, file) => total + readSource(file).split(/\r?\n/).length,
    0,
  );

const selectCode = (predicate) =>
  sourceFiles.filter((file) => CODE_EXTENSION.test(file) && predicate(file));

const scopes = {
  production: selectCode(
    (file) =>
      file.startsWith('src/') ||
      file.startsWith('apps/') ||
      /^packages\/[^/]+\/src\//.test(file),
  ),
  tools: selectCode((file) => file.startsWith('tools/')),
  tests: selectCode((file) => file.startsWith('tests/')),
  playground: selectCode((file) => file.startsWith('playground/')),
  allCode: selectCode(() => true),
};

const report = {
  schemaVersion: 1,
  commit,
  source: requestedCommit ? 'git-commit' : 'working-tree',
  scopes: Object.fromEntries(
    Object.entries(scopes).map(([name, files]) => [
      name,
      {
        files: files.length,
        lines: countLines(files),
      },
    ]),
  ),
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
