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
