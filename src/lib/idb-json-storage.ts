export type IdbJsonStorageOptions = {
  dbName?: string;
  storeName?: string;
  throttleMs?: number;
};

type Resolver = () => void;

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
  const pendingResolvers = new Map<string, Resolver[]>();

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

  return {
    getItem: async (key: string): Promise<string | null> => {
      const db = await getDb();
      return await new Promise<string | null>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve((req.result as string) ?? null);
        req.onerror = () => reject(req.error);
      });
    },
    setItem: async (key: string, value: string): Promise<void> => {
      if (throttleMs <= 0) {
        await flushKey(key, value);
        return;
      }
      pendingValues.set(key, value);
      if (writeTimers.has(key)) {
        window.clearTimeout(writeTimers.get(key)!);
      }
      const promise = new Promise<void>((resolve) => {
        const list = pendingResolvers.get(key) ?? [];
        list.push(resolve);
        pendingResolvers.set(key, list);
      });
      const timer = window.setTimeout(async () => {
        writeTimers.delete(key);
        const latest = pendingValues.get(key);
        pendingValues.delete(key);
        if (latest !== undefined) {
          await flushKey(key, latest);
        }
        const resolvers = pendingResolvers.get(key) ?? [];
        pendingResolvers.delete(key);
        resolvers.forEach((r) => r());
      }, throttleMs);
      writeTimers.set(key, timer);
      await promise;
    },
    removeItem: async (key: string): Promise<void> => {
      const db = await getDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    },
  } as unknown as Storage;
};
