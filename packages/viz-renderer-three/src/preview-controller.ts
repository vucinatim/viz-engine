import type { VizRenderPlan } from '@viz-engine/contracts';
import { Color, WebGLRenderer } from 'three';

import {
  createVizThreeCompositorGraph,
  disposeVizThreeCompositorGraph,
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

const createRenderer = ({
  canvas,
  preserveDrawingBuffer,
}: {
  canvas: HTMLCanvasElement;
  preserveDrawingBuffer: boolean;
}) => {
  const context = canvas.getContext('webgl2', {
    alpha: false,
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
    alpha: false,
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

  let currentRenderPlan = renderPlan;
  let render = () => undefined;
  const modelResources = createVizThreeModelResourceManager();
  let compositorGraph = createVizThreeCompositorGraph(
    renderPlan,
    () => render(),
    modelResources,
    programRegistry,
  );
  const imageResources = createVizThreeImageResourceManager({
    onReady: () => render(),
  });
  const cameraPoseOverrides = new Map<string, VizThreePreviewCameraPose>();

  const resize = (width: number, height: number) => {
    renderer.setSize(width, height, false);
    resizeVizThreeCompositorGraph(compositorGraph, width, height);
  };

  render = () => {
    for (const layer of compositorGraph.layers) {
      const cameraPose = cameraPoseOverrides.get(layer.layer.layerId);
      if (cameraPose) {
        layer.contentCamera.position.set(...cameraPose.position);
        layer.contentCamera.rotation.set(...cameraPose.rotation);
        layer.contentCamera.updateMatrixWorld();
      }
      renderer.setRenderTarget(layer.renderTarget);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, true, true);
      if (layer.programInstance) {
        layer.programInstance.render(renderer, layer.renderTarget);
      } else {
        renderer.render(layer.contentScene, layer.contentCamera);
      }
    }

    renderer.setRenderTarget(null);
    if (currentRenderPlan.viewport.backgroundColor === undefined) {
      renderer.setClearColor(0x000000, 0);
    } else {
      renderer.setClearColor(
        new Color(currentRenderPlan.viewport.backgroundColor),
        1,
      );
    }
    renderer.clear(true, true, true);
    renderer.render(
      compositorGraph.compositeScene,
      compositorGraph.compositeCamera,
    );
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
      imageResources.dispose();
      cameraPoseOverrides.clear();
      modelResources.dispose();
      renderer.dispose();
    },
  };
};
