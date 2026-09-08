import { sha256 } from '@noble/hashes/sha2.js';
import type { StreamTargetChunk } from 'mediabunny';

/** Hash finalized logical bytes, including any muxer header rewrites. */
export const hashVizRenderBlob = async (
  blob: Blob,
  signal: AbortSignal,
): Promise<string> => {
  signal.throwIfAborted();
  const hash = sha256.create();
  const reader = blob.stream().getReader();
  const abort = () => {
    void reader.cancel(signal.reason);
  };
  signal.throwIfAborted();
  signal.addEventListener('abort', abort, { once: true });
  try {
    while (!signal.aborted) {
      signal.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      hash.update(value);
    }
    signal.throwIfAborted();
    return Array.from(hash.digest(), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
  } finally {
    signal.removeEventListener('abort', abort);
    reader.releaseLock();
    hash.destroy();
  }
};

export interface VizBrowserRenderOutput {
  writable: WritableStream<StreamTargetChunk>;
  finalize(mimeType: string): Promise<Blob>;
  dispose(): Promise<void>;
  getWrittenBytes(): number;
}

/** Positional OPFS writes bound intermediate output storage; no encoded chunk array. */
export const openVizBrowserRenderOutput = async (
  signal: AbortSignal,
): Promise<VizBrowserRenderOutput> => {
  signal.throwIfAborted();
  if (!navigator.storage?.getDirectory) {
    throw new Error(
      'Streaming export requires browser private file storage (OPFS).',
    );
  }
  const directory = await navigator.storage.getDirectory();
  signal.throwIfAborted();
  const name = `viz-render-${crypto.randomUUID()}.tmp`;
  const file = await directory.getFileHandle(name, { create: true });
  let writer: FileSystemWritableFileStream;
  try {
    writer = await file.createWritable();
  } catch (error) {
    await directory.removeEntry(name);
    throw error;
  }
  let closed = false;
  let removed = false;
  let extent = 0;
  let disposal: Promise<void> | undefined;
  let streamController: WritableStreamDefaultController;
  const ioAbort = new AbortController();
  const waitForWrite = (operation: Promise<void>) =>
    new Promise<void>((resolve, reject) => {
      const abort = () => reject(ioAbort.signal.reason);
      if (ioAbort.signal.aborted) {
        void operation.catch(() => undefined);
        reject(ioAbort.signal.reason);
        return;
      }
      ioAbort.signal.addEventListener('abort', abort, { once: true });
      operation
        .then(resolve, reject)
        .finally(() => ioAbort.signal.removeEventListener('abort', abort));
    });
  const dispose = () =>
    (disposal ??= (async () => {
      signal.removeEventListener('abort', abort);
      if (!closed) {
        ioAbort.abort(new DOMException('Render output closed.', 'AbortError'));
        streamController.error(ioAbort.signal.reason);
        // Initiate abort immediately, rather than waiting behind the failed handoff.
        await writer.abort().catch(() => undefined);
        closed = true;
      }
      if (!removed) {
        await directory.removeEntry(name);
        removed = true;
      }
    })());
  const abort = () => {
    void dispose().catch(() => undefined);
  };
  const writable = new WritableStream<StreamTargetChunk>(
    {
      start(controller) {
        streamController = controller;
      },
      async write(chunk) {
        signal.throwIfAborted();
        if (closed || disposal) throw new Error('Render output is closed.');
        await waitForWrite(writer.write(chunk));
        extent = Math.max(extent, chunk.position + chunk.data.byteLength);
      },
      async close() {
        signal.throwIfAborted();
        await waitForWrite(writer.close());
        closed = true;
      },
      abort: dispose,
    },
    { highWaterMark: 1 },
  );
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) {
    await dispose();
    signal.throwIfAborted();
  }
  return {
    writable,
    getWrittenBytes: () => extent,
    async finalize(mimeType) {
      signal.throwIfAborted();
      if (!closed) throw new Error('Muxer has not closed the render output.');
      const temporary = await file.getFile();
      // Materialize browser-owned Blob storage before removing the OPFS file.
      // The downloadable artifact is retained output bytes, not constant memory.
      const blob = await new Response(
        temporary.stream().pipeThrough(new TransformStream(), { signal }),
        { headers: { 'Content-Type': mimeType } },
      ).blob();
      signal.throwIfAborted();
      await dispose();
      return blob;
    },
    dispose,
  };
};
