// @vitest-environment jsdom

import { createIdbJsonStorage } from '@/lib/idb-json-storage';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createIndexedDbHarness = ({
  initialStores = ['viz-session-store'],
}: {
  initialStores?: string[];
} = {}) => {
  const values = new Map<string, string>();
  const writes: string[] = [];
  const stores = new Set(initialStores);
  const openVersions: Array<number | undefined> = [];
  let databaseVersion = 1;

  const database = {
    get version() {
      return databaseVersion;
    },
    objectStoreNames: {
      contains: (name: string) => stores.has(name),
    },
    createObjectStore: vi.fn((name: string) => {
      stores.add(name);
    }),
    close: vi.fn(),
    onversionchange: null as (() => void) | null,
    transaction: (name: string) => {
      if (!stores.has(name)) {
        throw new DOMException(
          `Object store "${name}" was not found.`,
          'NotFoundError',
        );
      }
      return {
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
      };
    },
  };

  const indexedDb = {
    open: (_name: string, version?: number) => {
      openVersions.push(version);
      const request = {
        result: database,
        error: null,
        onupgradeneeded: null as (() => void) | null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onblocked: null as (() => void) | null,
      };
      queueMicrotask(() => {
        if (version !== undefined && version > databaseVersion) {
          databaseVersion = version;
          request.onupgradeneeded?.();
        }
        request.onsuccess?.();
      });
      return request;
    },
  };

  return { database, indexedDb, openVersions, stores, values, writes };
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

  it('repairs an existing database that is missing the requested store', async () => {
    const harness = createIndexedDbHarness({ initialStores: ['legacy-store'] });
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: harness.indexedDb,
    });
    const storage = createIdbJsonStorage({
      storeName: 'viz-session-store',
    });

    await storage.setItem('session', '{"revision":1}');

    expect(harness.openVersions).toEqual([undefined, 2]);
    expect(harness.database.createObjectStore).toHaveBeenCalledWith(
      'viz-session-store',
    );
    expect(harness.stores.has('legacy-store')).toBe(true);
    expect(harness.values.get('session')).toBe('{"revision":1}');
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
