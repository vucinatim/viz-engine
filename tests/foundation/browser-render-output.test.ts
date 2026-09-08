import {
  hashVizRenderBlob,
  openVizBrowserRenderOutput,
} from '@/lib/utils/browser-render-output';
import { createHash } from 'node:crypto';
import { afterEach, expect, it, vi } from 'vitest';

const storage = () => {
  let data = new Uint8Array(0);
  const write = vi.fn(
    async ({
      data: chunk,
      position,
    }: {
      data: Uint8Array;
      position: number;
    }) => {
      const next = new Uint8Array(
        Math.max(data.length, position + chunk.length),
      );
      next.set(data);
      next.set(chunk, position);
      data = next;
    },
  );
  const writer = {
    write,
    close: vi.fn(async () => {}),
    abort: vi.fn(async () => {}),
  };
  const removeEntry = vi.fn(async () => {});
  const directory = {
    removeEntry,
    getFileHandle: vi.fn(async () => ({
      createWritable: async () => writer,
      getFile: async () => new Blob([data]),
    })),
  };
  vi.stubGlobal('navigator', {
    storage: { getDirectory: async () => directory },
  });
  return { writer, directory };
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('writes positional overwrites, hashes finalized logical bytes, and removes temporary storage once', async () => {
  const { directory } = storage();
  const signal = new AbortController().signal;
  const sink = await openVizBrowserRenderOutput(signal);
  const writer = sink.writable.getWriter();
  await writer.write({
    type: 'write',
    position: 0,
    data: new Uint8Array([0, 0, 3, 4]),
  });
  await writer.write({
    type: 'write',
    position: 4,
    data: new Uint8Array([5, 6]),
  });
  await writer.write({
    type: 'write',
    position: 0,
    data: new Uint8Array([1, 2]),
  });
  await writer.close();
  const blob = await sink.finalize('video/mp4');
  expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([
    1, 2, 3, 4, 5, 6,
  ]);
  expect(sink.getWrittenBytes()).toBe(6);
  vi.spyOn(blob, 'arrayBuffer').mockRejectedValue(
    new Error('whole output read forbidden'),
  );
  expect(await hashVizRenderBlob(blob, signal)).toBe(
    createHash('sha256')
      .update(new Uint8Array([1, 2, 3, 4, 5, 6]))
      .digest('hex'),
  );
  await sink.dispose();
  expect(directory.removeEntry).toHaveBeenCalledOnce();
});

it('rejects a blocked write and queued work on abort without waiting to initiate file cancellation', async () => {
  const { writer: file, directory } = storage();
  let rejectWrite!: (reason: unknown) => void;
  file.write.mockImplementation(
    () =>
      new Promise<void>((_, reject) => {
        rejectWrite = reject;
      }),
  );
  file.abort.mockImplementation(async () => {
    rejectWrite(new Error('IO aborted'));
  });
  const controller = new AbortController();
  const sink = await openVizBrowserRenderOutput(controller.signal);
  const writer = sink.writable.getWriter();
  const first = writer.write({
    type: 'write',
    position: 0,
    data: new Uint8Array([1]),
  });
  const second = writer.write({
    type: 'write',
    position: 1,
    data: new Uint8Array([2]),
  });
  const settlements = Promise.allSettled([first, second]);
  await vi.waitFor(() => expect(file.write).toHaveBeenCalledOnce());
  controller.abort();
  expect((await settlements).map((result) => result.status)).toEqual([
    'rejected',
    'rejected',
  ]);
  await sink.dispose();
  expect(file.abort).toHaveBeenCalledOnce();
  expect(directory.removeEntry).toHaveBeenCalledOnce();
  expect(file.write).toHaveBeenCalledOnce();
});

it('cleans partial output after write failure and never finalizes it', async () => {
  const { writer: file, directory } = storage();
  file.write.mockRejectedValue(new Error('quota exhausted'));
  const sink = await openVizBrowserRenderOutput(new AbortController().signal);
  const writer = sink.writable.getWriter();
  await expect(
    writer.write({ type: 'write', position: 0, data: new Uint8Array([1]) }),
  ).rejects.toThrow('quota exhausted');
  await sink.dispose();
  expect(directory.removeEntry).toHaveBeenCalledOnce();
});
