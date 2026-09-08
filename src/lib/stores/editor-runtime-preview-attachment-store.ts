import type {
  LayerRuntimeDebugAttachment,
  LayerRuntimePreviewAttachment,
} from '@/lib/editor-layer-types';
import { awaitAbortable } from '@/lib/utils/await-abortable';
import type {
  VizSessionRuntimePreviewAudioFrameData,
  VizSessionRuntimePreviewFrame,
} from '@/lib/viz-session/types';
import type { VizRenderPlan } from '@viz-engine/contracts';
import type { VizThreeResourceStats } from '@viz-engine/renderer-three';
import { create } from 'zustand';

interface EditorRuntimePreviewAttachmentStore {
  previewAttachment: LayerRuntimePreviewAttachment | null;
  previewLayerIds: Set<string>;
  debugAttachments: Map<string, LayerRuntimeDebugAttachment>;
  mirrorCanvasesByLayerId: Record<string, HTMLCanvasElement[]>;
  compositeMirrorCanvases: HTMLCanvasElement[];
  registerMirrorCanvas: (id: string, canvas: HTMLCanvasElement) => void;
  unregisterMirrorCanvas: (id: string, canvas: HTMLCanvasElement) => void;
  registerCompositeMirrorCanvas: (canvas: HTMLCanvasElement) => void;
  unregisterCompositeMirrorCanvas: (canvas: HTMLCanvasElement) => void;
  registerPreviewAttachment: (
    attachment: LayerRuntimePreviewAttachment,
    layerIds: readonly string[],
  ) => void;
  updatePreviewLayerIds: (layerIds: readonly string[]) => void;
  unregisterPreviewAttachment: (
    attachment: LayerRuntimePreviewAttachment,
  ) => void;
  registerDebugAttachment: (
    layerId: string,
    attachment: LayerRuntimeDebugAttachment,
  ) => void;
  unregisterDebugAttachment: (
    layerId: string,
    attachment: LayerRuntimeDebugAttachment,
  ) => void;
  pruneLayerEntries: (activeLayerIds: string[]) => void;
  whenPreviewReady(): Promise<void>;
  getPreviewViewport: () => {
    width: number;
    height: number;
  } | null;
  invokeLayerAction: (layerId: string, actionId: string) => boolean;
  renderRuntimePlan: (
    frame: VizSessionRuntimePreviewFrame,
    audioFrameData: VizSessionRuntimePreviewAudioFrameData,
    renderPlan: VizRenderPlan,
    hasLiveOverrides: boolean,
  ) => string[];
  requiresContinuousRendering: () => boolean;
  inspectRuntimeResources: () => VizThreeResourceStats | null;
  reset: () => void;
}

const filterActiveLayerEntries = <T>(
  entries: Record<string, T>,
  activeLayerIds: Set<string>,
) =>
  Object.fromEntries(
    Object.entries(entries).filter(([layerId]) => activeLayerIds.has(layerId)),
  );

let readiness = new AbortController();
const invalidateReadiness = () => {
  readiness.abort(
    new Error(
      'Runtime preview attachment changed while waiting for resources.',
    ),
  );
  readiness = new AbortController();
};

const useEditorRuntimePreviewAttachmentStore =
  create<EditorRuntimePreviewAttachmentStore>((set, get) => ({
    previewAttachment: null,
    previewLayerIds: new Set(),
    debugAttachments: new Map(),
    mirrorCanvasesByLayerId: {},
    compositeMirrorCanvases: [],
    registerPreviewAttachment: (attachment, layerIds) => {
      invalidateReadiness();
      set({
        previewAttachment: attachment,
        previewLayerIds: new Set(layerIds),
      });
    },
    updatePreviewLayerIds: (layerIds) =>
      set({ previewLayerIds: new Set(layerIds) }),
    unregisterPreviewAttachment: (attachment) =>
      set((state) => {
        if (state.previewAttachment !== attachment) {
          return state;
        }

        invalidateReadiness();
        return {
          previewAttachment: null,
          previewLayerIds: new Set(),
        };
      }),
    registerDebugAttachment: (layerId, attachment) =>
      set((state) => {
        const debugAttachments = new Map(state.debugAttachments);
        debugAttachments.set(layerId, attachment);
        return { debugAttachments };
      }),
    unregisterDebugAttachment: (layerId, attachment) =>
      set((state) => {
        if (state.debugAttachments.get(layerId) !== attachment) {
          return state;
        }
        const debugAttachments = new Map(state.debugAttachments);
        debugAttachments.delete(layerId);
        return { debugAttachments };
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
    registerCompositeMirrorCanvas: (canvas) =>
      set((state) =>
        state.compositeMirrorCanvases.includes(canvas)
          ? state
          : {
              compositeMirrorCanvases: [
                ...state.compositeMirrorCanvases,
                canvas,
              ],
            },
      ),
    unregisterCompositeMirrorCanvas: (canvas) =>
      set((state) => ({
        compositeMirrorCanvases: state.compositeMirrorCanvases.filter(
          (candidate) => candidate !== canvas,
        ),
      })),
    pruneLayerEntries: (activeLayerIds) =>
      set((state) => {
        const activeLayerIdSet = new Set(activeLayerIds);
        const debugAttachments = new Map(state.debugAttachments);
        for (const layerId of debugAttachments.keys()) {
          if (!activeLayerIdSet.has(layerId)) {
            debugAttachments.delete(layerId);
          }
        }

        return {
          previewLayerIds: new Set(
            [...state.previewLayerIds].filter((layerId) =>
              activeLayerIdSet.has(layerId),
            ),
          ),
          debugAttachments,
          mirrorCanvasesByLayerId: filterActiveLayerEntries(
            state.mirrorCanvasesByLayerId,
            activeLayerIdSet,
          ),
        };
      }),
    getPreviewViewport: () => {
      return get().previewAttachment?.getViewport() ?? null;
    },
    invokeLayerAction: (layerId, actionId) => {
      if (!get().previewLayerIds.has(layerId)) {
        return false;
      }
      return (
        get().previewAttachment?.invokeLayerAction?.(layerId, actionId) ?? false
      );
    },
    async whenPreviewReady() {
      const attachment = get().previewAttachment;
      if (!attachment)
        throw new Error('No runtime preview attachment is mounted.');
      const signal = readiness.signal;
      await awaitAbortable(() => attachment.whenReady(), signal);
      signal.throwIfAborted();
      if (attachment !== get().previewAttachment)
        throw new Error(
          'Runtime preview attachment changed while waiting for resources.',
        );
    },
    renderRuntimePlan: (
      frame,
      audioFrameData,
      renderPlan,
      hasLiveOverrides,
    ) => {
      const state = get();
      const result = state.previewAttachment?.render({
        frame,
        audioFrameData,
        renderPlan,
        hasLiveOverrides,
      });
      for (const layerPlan of renderPlan.layers) {
        state.debugAttachments.get(layerPlan.layerId)?.render({
          frame,
          audioFrameData,
          layerPlan,
          stats: result?.layerStats[layerPlan.layerId],
        });
      }

      return renderPlan.layers
        .map((layer) => layer.layerId)
        .filter((layerId) => state.previewLayerIds.has(layerId));
    },
    requiresContinuousRendering: () =>
      get().previewAttachment?.requiresContinuousRendering?.() ?? false,
    inspectRuntimeResources: () =>
      get().previewAttachment?.getResourceStats?.() ?? null,
    reset: () => {
      invalidateReadiness();
      set({
        previewAttachment: null,
        previewLayerIds: new Set(),
        debugAttachments: new Map(),
        mirrorCanvasesByLayerId: {},
        compositeMirrorCanvases: [],
      });
    },
  }));

export default useEditorRuntimePreviewAttachmentStore;
