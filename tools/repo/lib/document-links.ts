import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';

import { repositoryRoot } from './paths';

const markdownLink = /\[[^\]]*\]\(([^)]+)\)/gu;

export const validateLocalDocumentLinks = (files: string[]) => {
  const failures: { file: string; target: string }[] = [];
  files
    .filter((file) => extname(file) === '.md')
    .forEach((file) => {
      const absoluteFile = resolve(repositoryRoot, file);
      if (!existsSync(absoluteFile)) return;
      const source = readFileSync(absoluteFile, 'utf8');
      for (const match of source.matchAll(markdownLink)) {
        const rawTarget = match[1].trim().replace(/^<|>$/gu, '');
        const target = rawTarget.split('#')[0];
        if (!target || /^(?:https?:|mailto:|#)/u.test(rawTarget)) continue;
        if (!existsSync(resolve(dirname(absoluteFile), target))) {
          failures.push({ file, target: rawTarget });
        }
      }
    });
  if (failures.length > 0) {
    throw new Error(
      `Broken local document links:\n${failures
        .map(({ file, target }) => `- ${file}: ${target}`)
        .join('\n')}`,
    );
  }
  return {
    filesChecked: files.filter((file) => extname(file) === '.md').length,
  };
};
