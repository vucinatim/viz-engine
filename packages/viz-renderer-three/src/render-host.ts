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

export interface VizThreeRenderHost {
  update(renderPlan: VizRenderPlan): void;
  resize(width: number, height: number): void;
  render(): void;
  presentLayer(layerId: string): boolean;
  presentComposite(): void;
  getLastRenderStats(): VizThreeRenderStats;
  getLayerCameraPose(layerId: string): VizThreeCameraPose | null;
  setLayerCameraPose(layerId: string, pose: VizThreeCameraPose | null): void;
  whenReady(): Promise<void>;
  getModelResourceDiagnostics(): VizThreeModelResourceDiagnostic[];
  getResourceStats(): VizThreeResourceStats;
  getOutputDimensions(): {
    width: number;
    height: number;
    layers: { width: number; height: number }[];
  };
  dispose(): void;
}

export interface VizThreeCameraPose {
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface VizThreeResourceStats {
  layers: number;
  retainedPrograms: number;
  cachedImageTextures: number;
  pendingImageLoads: number;
  modelResources: number;
  loadingModelResources: number;
  activeModelReferences: number;
  geometries: number;
  textures: number;
  shaderPrograms: number;
  renderTargets: number;
}

export interface VizThreeLayerRenderStats {
  milliseconds: number;
  drawCalls: number;
}

export interface VizThreeRenderStats {
  layers: Record<string, VizThreeLayerRenderStats>;
  composite: VizThreeLayerRenderStats;
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
    throw new Error('Viz Three render host requires a WebGL 2 context.');
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

export const createVizThreeRenderHost = ({
  canvas,
  renderPlan,
  preserveDrawingBuffer = false,
  programRegistry = createCoreVizThreeProgramRegistry(),
  releaseContextOnDispose = false,
}: {
  canvas: HTMLCanvasElement;
  renderPlan: VizRenderPlan;
  preserveDrawingBuffer?: boolean;
  programRegistry?: VizThreeProgramRegistry;
  releaseContextOnDispose?: boolean;
}): VizThreeRenderHost => {
  const renderer = createRenderer({ canvas, preserveDrawingBuffer });
  const cleanup: (() => void)[] = [
    () => {
      renderer.dispose();
      if (releaseContextOnDispose) renderer.forceContextLoss();
    },
  ];
  try {
    renderer.autoClear = true;
    renderer.info.autoReset = false;

    let disposed = false;
    const assertActive = () => {
      if (disposed) throw new Error('Render host is disposed.');
    };
    let notifyReadinessChange!: () => void;
    let readinessChange = new Promise<void>((resolve) => {
      notifyReadinessChange = resolve;
    });
    const invalidateReadiness = () => {
      notifyReadinessChange();
      readinessChange = new Promise<void>((resolve) => {
        notifyReadinessChange = resolve;
      });
    };
    let currentRenderPlan = renderPlan;
    let render = () => undefined;
    const modelResources = createVizThreeModelResourceManager();
    cleanup.push(() => modelResources.dispose());
    let compositorGraph = createVizThreeCompositorGraph(
      renderPlan,
      () => render(),
      modelResources,
      programRegistry,
    );
    cleanup.push(() => disposeVizThreeCompositorGraph(compositorGraph));
    const blendCompositor = createVizThreeBlendCompositor(
      renderPlan.viewport.width,
      renderPlan.viewport.height,
    );
    cleanup.push(() => blendCompositor.dispose());
    const imageResources = createVizThreeImageResourceManager({
      onReady: () => render(),
    });
    cleanup.push(() => imageResources.dispose());
    const cameraPoseOverrides = new Map<string, VizThreeCameraPose>();
    let lastRenderStats: VizThreeRenderStats = {
      layers: {},
      composite: { milliseconds: 0, drawCalls: 0 },
    };

    const resize = (width: number, height: number) => {
      assertActive();
      if (
        ![width, height].every(
          (value) =>
            Number.isInteger(value) &&
            value > 0 &&
            value <= renderer.capabilities.maxTextureSize,
        )
      ) {
        throw new Error(`Unsupported render dimensions ${width}x${height}.`);
      }
      renderer.setSize(width, height, false);
      resizeVizThreeCompositorGraph(compositorGraph, width, height);
      blendCompositor.resize(width, height);
      const gl = renderer.getContext();
      if (
        gl.drawingBufferWidth !== width ||
        gl.drawingBufferHeight !== height
      ) {
        throw new Error(
          `GPU drawing buffer does not match requested ${width}x${height}.`,
        );
      }
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
      if (disposed) return;
      const layerStats: VizThreeRenderStats['layers'] = {};
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
        assertActive();
        invalidateReadiness();
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
            resize(
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
      resize(width, height) {
        assertActive();
        invalidateReadiness();
        resize(width, height);
      },
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
        assertActive();
        const graph = compositorGraph;
        const changed = readinessChange;
        await Promise.race([
          changed,
          Promise.all([
            imageResources.whenReady(),
            ...graph.layers.map(
              (layer) =>
                layer.programInstance?.whenReady?.() ?? Promise.resolve(),
            ),
          ]),
        ]);
        assertActive();
        if (changed !== readinessChange || graph !== compositorGraph)
          throw new Error('Render plan changed while waiting for resources.');
        const failed = modelResources
          .getDiagnostics()
          .filter(
            (resource) =>
              resource.references > 0 && resource.status === 'failed',
          );
        if (failed.length)
          throw new Error(
            `Render model loading failed: ${JSON.stringify(failed)}`,
          );
      },
      getModelResourceDiagnostics() {
        return modelResources.getDiagnostics();
      },
      getResourceStats() {
        const imageStats = imageResources.getStats();
        const modelDiagnostics = modelResources.getDiagnostics();
        return {
          layers: compositorGraph.layers.length,
          retainedPrograms: compositorGraph.layers.filter(
            (layer) => layer.programInstance !== undefined,
          ).length,
          cachedImageTextures: imageStats.cachedTextures,
          pendingImageLoads: imageStats.pendingLoads,
          modelResources: modelDiagnostics.length,
          loadingModelResources: modelDiagnostics.filter(
            (resource) => resource.status === 'loading',
          ).length,
          activeModelReferences: modelDiagnostics.reduce(
            (total, resource) => total + resource.references,
            0,
          ),
          geometries: renderer.info.memory.geometries,
          textures: renderer.info.memory.textures,
          shaderPrograms: renderer.info.programs?.length ?? 0,
          renderTargets: compositorGraph.layers.length + 2,
        };
      },
      getOutputDimensions() {
        const gl = renderer.getContext();
        return {
          width: gl.drawingBufferWidth,
          height: gl.drawingBufferHeight,
          layers: compositorGraph.layers.map(({ renderTarget }) => ({
            width: renderTarget.width,
            height: renderTarget.height,
          })),
        };
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        invalidateReadiness();
        disposeVizThreeCompositorGraph(compositorGraph);
        blendCompositor.dispose();
        imageResources.dispose();
        cameraPoseOverrides.clear();
        modelResources.dispose();
        renderer.dispose();
        if (releaseContextOnDispose) renderer.forceContextLoss();
      },
    };
  } catch (error) {
    for (const release of cleanup.reverse()) release();
    throw error;
  }
};
