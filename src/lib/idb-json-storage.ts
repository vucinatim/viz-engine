export type IdbJsonStorageOptions = {
  dbName?: string;
  storeName?: string;
  throttleMs?: number;
};

type PendingWrite = {
  resolve: () => void;
  reject: (reason?: unknown) => void;
};

export const createIdbJsonStorage = (opts: IdbJsonStorageOptions = {}) => {
  const dbName = opts.dbName ?? 'viz-engine';
  const storeName = opts.storeName ?? 'zustand-json';
  const throttleMs = Math.max(0, opts.throttleMs ?? 0);

  let dbPromise: Promise<IDBDatabase> | null = null;
  const getDb = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  };

  const writeTimers = new Map<string, number>();
  const pendingValues = new Map<string, string>();
  const pendingWrites = new Map<string, PendingWrite[]>();
  const latestValues = new Map<string, string>();
  const writeChains = new Map<string, Promise<void>>();

  const flushKey = async (key: string, value: string) => {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  };

  const flushPendingKey = async (key: string) => {
    writeTimers.delete(key);
    const value = pendingValues.get(key);
    const writes = pendingWrites.get(key) ?? [];
    pendingValues.delete(key);
    pendingWrites.delete(key);

    if (value === undefined) {
      writes.forEach(({ resolve }) => resolve());
      return;
    }

    const previousWrite = writeChains.get(key) ?? Promise.resolve();
    const nextWrite = previousWrite
      .catch(() => undefined)
      .then(() => flushKey(key, value));
    writeChains.set(key, nextWrite);

    try {
      await nextWrite;
      writes.forEach(({ resolve }) => resolve());
    } catch (error) {
      if (latestValues.get(key) === value && !pendingValues.has(key)) {
        latestValues.delete(key);
      }
      writes.forEach(({ reject }) => reject(error));
    } finally {
      if (writeChains.get(key) === nextWrite) {
        writeChains.delete(key);
      }
    }
  };

  return {
    getItem: async (key: string): Promise<string | null> => {
      const db = await getDb();
      const value = await new Promise<string | null>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve((req.result as string) ?? null);
        req.onerror = () => reject(req.error);
      });
      if (value === null) {
        latestValues.delete(key);
      } else {
        latestValues.set(key, value);
      }
      return value;
    },
    setItem: async (key: string, value: string): Promise<void> => {
      if (latestValues.get(key) === value) {
        return;
      }
      latestValues.set(key, value);

      if (throttleMs <= 0) {
        try {
          await flushKey(key, value);
        } catch (error) {
          if (latestValues.get(key) === value) {
            latestValues.delete(key);
          }
          throw error;
        }
        return;
      }

      pendingValues.set(key, value);
      const promise = new Promise<void>((resolve, reject) => {
        const writes = pendingWrites.get(key) ?? [];
        writes.push({ resolve, reject });
        pendingWrites.set(key, writes);
      });

      if (!writeTimers.has(key)) {
        const timer = window.setTimeout(() => {
          void flushPendingKey(key);
        }, throttleMs);
        writeTimers.set(key, timer);
      }

      await promise;
    },
    removeItem: async (key: string): Promise<void> => {
      const timer = writeTimers.get(key);
      if (timer !== undefined) {
        window.clearTimeout(timer);
        writeTimers.delete(key);
      }
      pendingValues.delete(key);
      const writes = pendingWrites.get(key) ?? [];
      pendingWrites.delete(key);
      latestValues.delete(key);

      const previousWrite = writeChains.get(key);
      if (previousWrite) {
        await previousWrite.catch(() => undefined);
      }

      const db = await getDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      writes.forEach(({ resolve }) => resolve());
    },
  } as unknown as Storage;
};
