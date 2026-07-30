import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const CODE_EXTENSION = /\.(?:ts|tsx|mts|mjs)$/;

const sourceFiles = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  {
    encoding: 'utf8',
  },
)
  .split('\0')
  .filter((file) => file && fs.existsSync(file));

const countLines = (files) =>
  files.reduce(
    (total, file) =>
      total + fs.readFileSync(file, 'utf8').split(/\r?\n/).length,
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
  commit: execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim(),
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
