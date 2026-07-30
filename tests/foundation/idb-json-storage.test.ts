// @vitest-environment jsdom

import { createIdbJsonStorage } from '@/lib/idb-json-storage';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createIndexedDbHarness = () => {
  const values = new Map<string, string>();
  const writes: string[] = [];

  const database = {
    objectStoreNames: {
      contains: () => true,
    },
    createObjectStore: vi.fn(),
    transaction: () => ({
      objectStore: () => ({
        get: (key: string) => {
          const request: {
            result?: string;
            error: null;
            onsuccess: (() => void) | null;
            onerror: (() => void) | null;
          } = {
            result: values.get(key),
            error: null,
            onsuccess: null,
            onerror: null,
          };
          queueMicrotask(() => request.onsuccess?.());
          return request;
        },
        put: (value: string, key: string) => {
          const request = {
            error: null,
            onsuccess: null as (() => void) | null,
            onerror: null as (() => void) | null,
          };
          writes.push(value);
          values.set(key, value);
          queueMicrotask(() => request.onsuccess?.());
          return request;
        },
        delete: (key: string) => {
          const request = {
            error: null,
            onsuccess: null as (() => void) | null,
            onerror: null as (() => void) | null,
          };
          values.delete(key);
          queueMicrotask(() => request.onsuccess?.());
          return request;
        },
      }),
    }),
  };

  const indexedDb = {
    open: () => {
      const request = {
        result: database,
        error: null,
        onupgradeneeded: null as (() => void) | null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      queueMicrotask(() => {
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
  };

  return { indexedDb, values, writes };
};

describe('createIdbJsonStorage', () => {
  const originalIndexedDb = globalThis.indexedDB;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: originalIndexedDb,
    });
    vi.useRealTimers();
  });

  it('deduplicates unchanged serialized state', async () => {
    const harness = createIndexedDbHarness();
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: harness.indexedDb,
    });
    const storage = createIdbJsonStorage({ throttleMs: 100 });

    const firstWrite = storage.setItem('session', '{"revision":1}');
    await vi.advanceTimersByTimeAsync(100);
    await firstWrite;

    await Promise.all(
      Array.from({ length: 250 }, () =>
        storage.setItem('session', '{"revision":1}'),
      ),
    );
    await vi.advanceTimersByTimeAsync(500);

    expect(harness.writes).toEqual(['{"revision":1}']);
  });

  it('flushes sustained changes on a bounded throttle cadence', async () => {
    const harness = createIndexedDbHarness();
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: harness.indexedDb,
    });
    const storage = createIdbJsonStorage({ throttleMs: 100 });
    const writes: Promise<void>[] = [];

    for (let revision = 1; revision <= 40; revision += 1) {
      writes.push(storage.setItem('session', JSON.stringify({ revision })));
      await vi.advanceTimersByTimeAsync(10);
    }

    expect(harness.writes.length).toBeGreaterThanOrEqual(3);
    expect(harness.writes.length).toBeLessThanOrEqual(4);

    await vi.advanceTimersByTimeAsync(100);
    await Promise.all(writes);

    expect(harness.writes.length).toBeLessThanOrEqual(5);
    expect(harness.writes.at(-1)).toBe('{"revision":40}');
    expect(harness.values.get('session')).toBe('{"revision":40}');
  });

  it('cancels a pending write before removing its key', async () => {
    const harness = createIndexedDbHarness();
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: harness.indexedDb,
    });
    const storage = createIdbJsonStorage({ throttleMs: 100 });

    const pendingWrite = storage.setItem('session', '{"revision":1}');
    await storage.removeItem('session');
    await pendingWrite;
    await vi.advanceTimersByTimeAsync(200);

    expect(harness.writes).toHaveLength(0);
    expect(harness.values.has('session')).toBe(false);
  });
});
