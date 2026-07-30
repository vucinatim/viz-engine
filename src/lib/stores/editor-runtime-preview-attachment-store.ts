import type { LayerRuntimePreviewAttachment } from '@/lib/editor-layer-types';
import type {
  VizSessionRuntimePreviewAudioFrameData,
  VizSessionRuntimePreviewFrame,
} from '@/lib/viz-session/types';
import type { PlayerRef } from '@remotion/player';
import type { VizRenderPlan } from '@viz-engine/contracts';
import { create } from 'zustand';

interface EditorRuntimePreviewAttachmentStore {
  layerAttachments: Map<string, LayerRuntimePreviewAttachment>;
  mirrorCanvasesByLayerId: Record<string, HTMLCanvasElement[]>;
  playerRef: { current: PlayerRef | null };
  registerMirrorCanvas: (id: string, canvas: HTMLCanvasElement) => void;
  unregisterMirrorCanvas: (id: string, canvas: HTMLCanvasElement) => void;
  registerLayerAttachment: (
    id: string,
    attachment: LayerRuntimePreviewAttachment,
  ) => void;
  unregisterLayerAttachment: (id: string) => void;
  setPlayerRef: (playerRef: { current: PlayerRef | null }) => void;
  pruneLayerAttachments: (activeLayerIds: string[]) => void;
  getPreviewViewport: () => {
    width: number;
    height: number;
  } | null;
  invokeLayerAction: (layerId: string, actionId: string) => boolean;
  renderRuntimePlan: (
    frame: VizSessionRuntimePreviewFrame,
    audioFrameData: VizSessionRuntimePreviewAudioFrameData,
    renderPlan: VizRenderPlan,
  ) => string[];
  whenRuntimeResourcesReady: () => Promise<void>;
  reset: () => void;
}

const filterActiveLayerEntries = <T>(
  entries: Record<string, T>,
  activeLayerIds: Set<string>,
) =>
  Object.fromEntries(
    Object.entries(entries).filter(([layerId]) => activeLayerIds.has(layerId)),
  );

const useEditorRuntimePreviewAttachmentStore =
  create<EditorRuntimePreviewAttachmentStore>((set, get) => ({
    layerAttachments: new Map(),
    mirrorCanvasesByLayerId: {},
    playerRef: { current: null },
    registerLayerAttachment: (id, attachment) =>
      set((state) => {
        const layerAttachments = new Map(state.layerAttachments);
        layerAttachments.set(id, attachment);
        return { layerAttachments };
      }),
    unregisterLayerAttachment: (id) =>
      set((state) => {
        if (!state.layerAttachments.has(id)) {
          return state;
        }

        const layerAttachments = new Map(state.layerAttachments);
        layerAttachments.delete(id);
        return { layerAttachments };
      }),
    registerMirrorCanvas: (id, canvas) =>
      set((state) => {
        const current = state.mirrorCanvasesByLayerId[id] ?? [];
        if (current.includes(canvas)) {
          return state;
        }

        return {
          mirrorCanvasesByLayerId: {
            ...state.mirrorCanvasesByLayerId,
            [id]: [...current, canvas],
          },
        };
      }),
    unregisterMirrorCanvas: (id, canvas) =>
      set((state) => {
        const nextCanvases = (state.mirrorCanvasesByLayerId[id] ?? []).filter(
          (candidate) => candidate !== canvas,
        );
        const mirrorCanvasesByLayerId = {
          ...state.mirrorCanvasesByLayerId,
        };

        if (nextCanvases.length === 0) {
          delete mirrorCanvasesByLayerId[id];
        } else {
          mirrorCanvasesByLayerId[id] = nextCanvases;
        }

        return { mirrorCanvasesByLayerId };
      }),
    setPlayerRef: (playerRef) => set({ playerRef }),
    pruneLayerAttachments: (activeLayerIds) =>
      set((state) => {
        const activeLayerIdSet = new Set(activeLayerIds);
        const layerAttachments = new Map(state.layerAttachments);

        for (const layerId of layerAttachments.keys()) {
          if (!activeLayerIdSet.has(layerId)) {
            layerAttachments.delete(layerId);
          }
        }

        return {
          layerAttachments,
          mirrorCanvasesByLayerId: filterActiveLayerEntries(
            state.mirrorCanvasesByLayerId,
            activeLayerIdSet,
          ),
        };
      }),
    getPreviewViewport: () => {
      const firstAttachment = get().layerAttachments.values().next().value;
      return firstAttachment?.getViewport() ?? null;
    },
    invokeLayerAction: (layerId, actionId) => {
      const action = get().layerAttachments.get(layerId)?.actions?.[actionId];
      action?.();
      return action !== undefined;
    },
    renderRuntimePlan: (frame, audioFrameData, renderPlan) => {
      const renderedLayerIds: string[] = [];

      for (const layerPlan of renderPlan.layers) {
        const attachment = get().layerAttachments.get(layerPlan.layerId);
        if (!attachment) {
          continue;
        }

        attachment.render({
          frame,
          audioFrameData,
          renderPlan: {
            ...renderPlan,
            layers: [layerPlan],
          },
        });
        renderedLayerIds.push(layerPlan.layerId);
      }

      return renderedLayerIds;
    },
    whenRuntimeResourcesReady: async () => {
      await Promise.all(
        [...get().layerAttachments.values()].map(
          (attachment) => attachment.whenReady?.() ?? Promise.resolve(),
        ),
      );
    },
    reset: () =>
      set({
        layerAttachments: new Map(),
        mirrorCanvasesByLayerId: {},
        playerRef: { current: null },
      }),
  }));

export const waitForEditorRuntimePreviewAttachments = (
  layerIds: readonly string[],
  options: {
    signal?: AbortSignal;
    timeoutMilliseconds?: number;
  } = {},
): Promise<void> => {
  const expectedLayerIds = [...new Set(layerIds)];
  if (expectedLayerIds.length === 0) {
    return Promise.resolve();
  }
  const missingLayerIds = () => {
    const attachments =
      useEditorRuntimePreviewAttachmentStore.getState().layerAttachments;
    return expectedLayerIds.filter((layerId) => !attachments.has(layerId));
  };
  if (missingLayerIds().length === 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const timeoutMilliseconds = options.timeoutMilliseconds ?? 5_000;
    let settled = false;
    let unsubscribe: () => void = () => undefined;
    const cleanup = () => {
      unsubscribe();
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', handleAbort);
    };
    const finish = (outcome: { ok: true } | { ok: false; error: Error }) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      if (outcome.ok) {
        resolve();
      } else {
        reject(outcome.error);
      }
    };
    const handleAbort = () => {
      finish({
        ok: false,
        error: new Error(
          'Waiting for editor render attachments was cancelled.',
        ),
      });
    };
    const timeout = setTimeout(() => {
      finish({
        ok: false,
        error: new Error(
          `Editor render attachments did not mount within ${timeoutMilliseconds}ms: ${missingLayerIds().join(', ')}.`,
        ),
      });
    }, timeoutMilliseconds);
    unsubscribe = useEditorRuntimePreviewAttachmentStore.subscribe(() => {
      if (missingLayerIds().length === 0) {
        finish({ ok: true });
      }
    });
    options.signal?.addEventListener('abort', handleAbort, {
      once: true,
    });
    if (options.signal?.aborted) {
      handleAbort();
    }
  });
};

export default useEditorRuntimePreviewAttachmentStore;
