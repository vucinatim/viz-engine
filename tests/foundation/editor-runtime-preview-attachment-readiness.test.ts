import useEditorRuntimePreviewAttachmentStore, {
  waitForEditorRuntimePreviewAttachments,
} from '@/lib/stores/editor-runtime-preview-attachment-store';
import { afterEach, describe, expect, it } from 'vitest';

const attachment = {
  getViewport: () => ({ width: 320, height: 180 }),
  resize: () => undefined,
  render: () => undefined,
  whenReady: async () => undefined,
  activateFlyCameraMode: () => undefined,
  destroy: () => undefined,
};

afterEach(() => {
  useEditorRuntimePreviewAttachmentStore.getState().reset();
});

describe('editor runtime preview attachment readiness', () => {
  it('waits until every expected layer attachment is registered', async () => {
    const ready = waitForEditorRuntimePreviewAttachments(
      ['layer-a', 'layer-b'],
      { timeoutMilliseconds: 100 },
    );

    useEditorRuntimePreviewAttachmentStore
      .getState()
      .registerLayerAttachment('layer-a', attachment);
    useEditorRuntimePreviewAttachmentStore
      .getState()
      .registerLayerAttachment('layer-b', attachment);

    await expect(ready).resolves.toBeUndefined();
  });

  it('rejects promptly when readiness is cancelled', async () => {
    const controller = new AbortController();
    const ready = waitForEditorRuntimePreviewAttachments(['layer-a'], {
      signal: controller.signal,
      timeoutMilliseconds: 100,
    });

    controller.abort();

    await expect(ready).rejects.toThrow('cancelled');
  });
});
