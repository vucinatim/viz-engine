import { randomUUID } from 'node:crypto';
import {
  closeSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

export const readJsonFile = <T>(path: string): T =>
  JSON.parse(readFileSync(path, 'utf8')) as T;

export const writeJsonFileAtomic = (path: string, value: unknown) => {
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = join(
    dirname(path),
    `.${randomUUID()}.${path.split('/').at(-1) ?? 'state'}.tmp`,
  );
  const descriptor = openSync(temporaryPath, 'wx', 0o600);
  try {
    writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  try {
    renameSync(temporaryPath, path);
  } catch (error) {
    try {
      unlinkSync(temporaryPath);
    } catch {
      // Preserve the original atomic-write failure.
    }
    throw error;
  }
};

export const writeJsonFileExclusive = (path: string, value: unknown) => {
  mkdirSync(dirname(path), { recursive: true });
  const descriptor = openSync(path, 'wx', 0o600);
  try {
    writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
};
