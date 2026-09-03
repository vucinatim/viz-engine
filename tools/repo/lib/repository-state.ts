import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { resolve } from 'node:path';

import { repositoryRoot } from './paths';

const git = (arguments_: string[], root = repositoryRoot) =>
  execFileSync('git', arguments_, { cwd: root, encoding: 'utf8' }).trim();

export const readRepositoryIdentity = (root = repositoryRoot) => {
  const status = git(
    ['status', '--porcelain=v2', '--untracked-files=all'],
    root,
  );
  const contentIdentity = createHash('sha256')
    .update(status)
    .update(git(['diff', '--binary', 'HEAD'], root));
  const changedFiles = git(
    ['ls-files', '--others', '--exclude-standard', '-z'],
    root,
  )
    .split('\0')
    .filter(Boolean)
    .sort();
  changedFiles.forEach((path) => {
    const absolutePath = resolve(root, path);
    contentIdentity.update(`\0${path}\0`);
    if (existsSync(absolutePath))
      contentIdentity.update(readFileSync(absolutePath));
  });
  return {
    root,
    branch: git(['branch', '--show-current'], root),
    head: git(['rev-parse', 'HEAD'], root),
    status,
    statusHash: contentIdentity.digest('hex'),
    clean: status.length === 0,
    host: hostname(),
    pid: process.pid,
  };
};

export const processIsAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
