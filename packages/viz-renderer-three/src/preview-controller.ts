import type { VizRenderPlan } from '@viz-engine/contracts';
import { WebGLRenderer } from 'three';

import { createVizThreeBlendCompositor } from './blend-compositor.js';
import {
  createVizThreeCompositorGraph,
  disposeVizThreeCompositorGraph,
  getVizThreeLayerClearColor,
  resizeVizThreeCompositorGraph,
  updateVizThreeCompositorGraph,
} from './compositor.js';
import { createVizThreeImageResourceManager } from './image-resources.js';
import {
  createVizThreeModelResourceManager,
  type VizThreeModelResourceDiagnostic,
} from './model-resources.js';
import {
  createCoreVizThreeProgramRegistry,
  type VizThreeProgramRegistry,
} from './programs/registry.js';

export interface VizThreePreviewController {
  update(renderPlan: VizRenderPlan): void;
  resize(width: number, height: number): void;
  render(): void;
  presentLayer(layerId: string): boolean;
  presentComposite(): void;
  getLastRenderStats(): VizThreePreviewRenderStats;
  getLayerCameraPose(layerId: string): VizThreePreviewCameraPose | null;
  setLayerCameraPose(
    layerId: string,
    pose: VizThreePreviewCameraPose | null,
  ): void;
  whenReady(): Promise<void>;
  getModelResourceDiagnostics(): VizThreeModelResourceDiagnostic[];
  getResourceStats(): VizThreePreviewResourceStats;
  dispose(): void;
}

export interface VizThreePreviewCameraPose {
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface VizThreePreviewResourceStats {
  layers: number;
  retainedPrograms: number;
  cachedImageTextures: number;
  pendingImageLoads: number;
}

export interface VizThreePreviewLayerRenderStats {
  milliseconds: number;
  drawCalls: number;
}

export interface VizThreePreviewRenderStats {
  layers: Record<string, VizThreePreviewLayerRenderStats>;
  composite: VizThreePreviewLayerRenderStats;
}

const createRenderer = ({
  canvas,
  preserveDrawingBuffer,
}: {
  canvas: HTMLCanvasElement;
  preserveDrawingBuffer: boolean;
}) => {
  const context = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    preserveDrawingBuffer,
  });
  if (!context) {
    throw new Error('Viz Three preview requires a WebGL 2 context.');
  }

  // A development remount can reuse a context whose texture upload state was
  // changed by the prior renderer. Three creates fallback 3D textures before
  // normalizing that state, so restore WebGL defaults at the ownership seam.
  context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, false);
  context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

  return new WebGLRenderer({
    canvas,
    context,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer,
  });
};

export const createVizThreePreviewController = ({
  canvas,
  renderPlan,
  preserveDrawingBuffer = false,
  programRegistry = createCoreVizThreeProgramRegistry(),
}: {
  canvas: HTMLCanvasElement;
  renderPlan: VizRenderPlan;
  preserveDrawingBuffer?: boolean;
  programRegistry?: VizThreeProgramRegistry;
}): VizThreePreviewController => {
  const renderer = createRenderer({ canvas, preserveDrawingBuffer });
  renderer.autoClear = true;
  renderer.info.autoReset = false;

  let currentRenderPlan = renderPlan;
  let render = () => undefined;
  const modelResources = createVizThreeModelResourceManager();
  let compositorGraph = createVizThreeCompositorGraph(
    renderPlan,
    () => render(),
    modelResources,
    programRegistry,
  );
  const blendCompositor = createVizThreeBlendCompositor(
    renderPlan.viewport.width,
    renderPlan.viewport.height,
  );
  const imageResources = createVizThreeImageResourceManager({
    onReady: () => render(),
  });
  const cameraPoseOverrides = new Map<string, VizThreePreviewCameraPose>();
  let lastRenderStats: VizThreePreviewRenderStats = {
    layers: {},
    composite: { milliseconds: 0, drawCalls: 0 },
  };

  const resize = (width: number, height: number) => {
    renderer.setSize(width, height, false);
    resizeVizThreeCompositorGraph(compositorGraph, width, height);
    blendCompositor.resize(width, height);
  };

  const presentComposite = () => {
    const stats = blendCompositor.compose(
      renderer,
      compositorGraph,
      currentRenderPlan.viewport,
    );
    lastRenderStats = {
      ...lastRenderStats,
      composite: stats,
    };
  };

  render = () => {
    const layerStats: VizThreePreviewRenderStats['layers'] = {};
    for (const layer of compositorGraph.layers) {
      const cameraPose = cameraPoseOverrides.get(layer.layer.layerId);
      if (cameraPose) {
        layer.contentCamera.position.set(...cameraPose.position);
        layer.contentCamera.rotation.set(...cameraPose.rotation);
        layer.contentCamera.updateMatrixWorld();
      }
      renderer.setRenderTarget(layer.renderTarget);
      const background = getVizThreeLayerClearColor(layer.layer);
      renderer.setClearColor(background.color, background.opacity);
      renderer.clear(true, true, true);
      renderer.info.reset();
      const startedAt = performance.now();
      if (layer.programInstance) {
        layer.programInstance.render(renderer, layer.renderTarget);
      } else {
        renderer.render(layer.contentScene, layer.contentCamera);
      }
      layerStats[layer.layer.layerId] = {
        milliseconds: performance.now() - startedAt,
        drawCalls: renderer.info.render.calls,
      };
    }
    lastRenderStats = {
      ...lastRenderStats,
      layers: layerStats,
    };
    presentComposite();
  };

  const hydrate = () => {
    imageResources.reconcile(compositorGraph.layers, currentRenderPlan);
  };

  resize(renderPlan.viewport.width, renderPlan.viewport.height);
  hydrate();
  render();

  return {
    update(nextRenderPlan) {
      const dimensionsChanged =
        currentRenderPlan.viewport.width !== nextRenderPlan.viewport.width ||
        currentRenderPlan.viewport.height !== nextRenderPlan.viewport.height;
      if (
        updateVizThreeCompositorGraph(
          compositorGraph,
          currentRenderPlan,
          nextRenderPlan,
        )
      ) {
        currentRenderPlan = nextRenderPlan;
        if (dimensionsChanged) {
          renderer.setSize(
            nextRenderPlan.viewport.width,
            nextRenderPlan.viewport.height,
            false,
          );
          blendCompositor.resize(
            nextRenderPlan.viewport.width,
            nextRenderPlan.viewport.height,
          );
        }
        hydrate();
        render();
        return;
      }

      currentRenderPlan = nextRenderPlan;
      disposeVizThreeCompositorGraph(compositorGraph);
      compositorGraph = createVizThreeCompositorGraph(
        nextRenderPlan,
        () => render(),
        modelResources,
        programRegistry,
      );
      resize(nextRenderPlan.viewport.width, nextRenderPlan.viewport.height);
      hydrate();
      render();
    },
    resize,
    render,
    presentLayer(layerId) {
      const selectedLayer = compositorGraph.layers.find(
        (layer) => layer.layer.layerId === layerId,
      );
      if (!selectedLayer) {
        return false;
      }

      blendCompositor.presentLayer(renderer, selectedLayer);
      return true;
    },
    presentComposite() {
      blendCompositor.presentComposite(renderer);
    },
    getLastRenderStats: () => lastRenderStats,
    getLayerCameraPose(layerId) {
      const layer = compositorGraph.layers.find(
        (candidate) => candidate.layer.layerId === layerId,
      );
      if (!layer) {
        return null;
      }
      return {
        position: layer.contentCamera.position.toArray(),
        rotation: [
          layer.contentCamera.rotation.x,
          layer.contentCamera.rotation.y,
          layer.contentCamera.rotation.z,
        ],
      };
    },
    setLayerCameraPose(layerId, pose) {
      if (pose) {
        cameraPoseOverrides.set(layerId, pose);
      } else {
        cameraPoseOverrides.delete(layerId);
      }
    },
    async whenReady() {
      for (;;) {
        const graph = compositorGraph;
        await Promise.all(
          graph.layers.map(
            (layer) =>
              layer.programInstance?.whenReady?.() ?? Promise.resolve(),
          ),
        );
        if (graph === compositorGraph) {
          return;
        }
      }
    },
    getModelResourceDiagnostics() {
      return modelResources.getDiagnostics();
    },
    getResourceStats() {
      const imageStats = imageResources.getStats();
      return {
        layers: compositorGraph.layers.length,
        retainedPrograms: compositorGraph.layers.filter(
          (layer) => layer.programInstance !== undefined,
        ).length,
        cachedImageTextures: imageStats.cachedTextures,
        pendingImageLoads: imageStats.pendingLoads,
      };
    },
    dispose() {
      disposeVizThreeCompositorGraph(compositorGraph);
      blendCompositor.dispose();
      imageResources.dispose();
      cameraPoseOverrides.clear();
      modelResources.dispose();
      renderer.dispose();
    },
  };
};
