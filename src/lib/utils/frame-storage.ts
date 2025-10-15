/**
 * Frame Storage System using IndexedDB
 *
 * Stores captured video frames in IndexedDB to handle large exports
 * without running out of memory. Frames are stored as blobs and can be
 * retrieved in sequence for video encoding.
 */

const DB_NAME = 'viz-engine-export';
const STORE_NAME = 'frames';
const DB_VERSION = 1;

interface FrameRecord {
  frameIndex: number;
  blob: Blob;
  timestamp: number;
}

/**
 * Initialize or get the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open database: ${request.error}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'frameIndex',
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Store a single frame in IndexedDB
 */
export async function storeFrame(
  frameIndex: number,
  blob: Blob,
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const record: FrameRecord = {
      frameIndex,
      blob,
      timestamp: Date.now(),
    };

    const request = store.put(record);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(
        new Error(`Failed to store frame ${frameIndex}: ${request.error}`),
      );
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Batch frame writer - keeps DB connection open for multiple writes
 * This is MUCH faster than opening/closing DB for each frame
 */
export class BatchFrameWriter {
  private db: IDBDatabase | null = null;

  async open(): Promise<void> {
    this.db = await openDB();
  }

  async writeFrame(frameIndex: number, blob: Blob): Promise<void> {
    if (!this.db) {
      throw new Error('Database not opened. Call open() first.');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const record: FrameRecord = {
        frameIndex,
        blob,
        timestamp: Date.now(),
      };

      const request = store.put(record);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(
          new Error(`Failed to store frame ${frameIndex}: ${request.error}`),
        );
      };
    });
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

/**
 * Retrieve a single frame from IndexedDB
 */
export async function getFrame(frameIndex: number): Promise<Blob | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(frameIndex);

    request.onsuccess = () => {
      const record = request.result as FrameRecord | undefined;
      resolve(record?.blob || null);
    };

    request.onerror = () => {
      reject(new Error(`Failed to get frame ${frameIndex}: ${request.error}`));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Retrieve all frames in order
 */
export async function getAllFrames(): Promise<Blob[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const records = request.result as FrameRecord[];
      // Sort by frame index to ensure correct order
      records.sort((a, b) => a.frameIndex - b.frameIndex);
      const blobs = records.map((r) => r.blob);
      resolve(blobs);
    };

    request.onerror = () => {
      reject(new Error(`Failed to get all frames: ${request.error}`));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get frame count
 */
export async function getFrameCount(): Promise<number> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error(`Failed to count frames: ${request.error}`));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Clear all stored frames
 */
export async function clearAllFrames(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`Failed to clear frames: ${request.error}`));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Delete a specific frame
 */
export async function deleteFrame(frameIndex: number): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(frameIndex);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(
        new Error(`Failed to delete frame ${frameIndex}: ${request.error}`),
      );
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get storage size estimate
 */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  usageInMB: number;
  quotaInMB: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      usageInMB: (estimate.usage || 0) / (1024 * 1024),
      quotaInMB: (estimate.quota || 0) / (1024 * 1024),
    };
  }

  return {
    usage: 0,
    quota: 0,
    usageInMB: 0,
    quotaInMB: 0,
  };
}
