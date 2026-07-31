import type {
  VizLayerRenderPlanEntry,
  VizMaterializedAsset,
  VizRenderPlan,
} from '@viz-engine/contracts';
import {
  Color,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  RGBAFormat,
  SRGBColorSpace,
  Scene,
  WebGLRenderTarget,
  type Camera,
} from 'three';

import {
  createVizThreeModelResourceManager,
  type VizThreeModelResourceManager,
} from './model-resources.js';
import {
  clearVizThreeObjectChildren,
  createVizThreeOrthoCamera,
  createVizThreePortableNodeObject,
  disposeVizThreeObject,
  getVizThreeBlending,
  updateVizThreeOrthoCamera,
  updateVizThreePortableNodeObject,
} from './portable-nodes.js';
import {
  createCoreVizThreeProgramRegistry,
  createVizThreeProgramInstance,
  type VizThreeProgramRegistry,
} from './programs/registry.js';
import type { VizThreeProgramInstance } from './programs/types.js';

export type { VizImageMeshUserData } from './portable-nodes.js';

export interface VizThreeSceneGraph {
  scene: Scene;
  camera: OrthographicCamera;
  rootGroup: Group;
}

export interface VizThreeCompositorLayer {
  layer: VizLayerRenderPlanEntry;
  contentScene: Scene;
  contentCamera: Camera;
  contentRoot: Group;
  compositeSurface: Mesh;
  renderTarget: WebGLRenderTarget;
  programInstance?: VizThreeProgramInstance;
}

export interface VizThreeCompositorGraph {
  compositeScene: Scene;
  compositeCamera: OrthographicCamera;
  compositeRoot: Group;
  layers: VizThreeCompositorLayer[];
  modelResources: VizThreeModelResourceManager;
  ownsModelResources: boolean;
  invalidate: () => void;
  programRegistry: VizThreeProgramRegistry;
}

const createLayerContentRoot = (
  layer: VizLayerRenderPlanEntry,
  viewportWidth: number,
  viewportHeight: number,
): Group => {
  const contentRoot = new Group();
  if (layer.node) {
    contentRoot.add(
      createVizThreePortableNodeObject(
        layer.node,
        { opacity: 1 },
        viewportWidth,
        viewportHeight,
      ),
    );
  }
  return contentRoot;
};

const createCompositeSurface = (
  layer: VizLayerRenderPlanEntry,
  width: number,
  height: number,
): Mesh => {
  const mesh = new Mesh(
    new PlaneGeometry(width, height),
    new MeshBasicMaterial({
      color: new Color('#ffffff'),
      transparent: layer.opacity < 1,
      opacity: layer.opacity,
      blending: getVizThreeBlending(layer.blendMode),
      depthWrite: false,
    }),
  );
  mesh.renderOrder = 1;
  mesh.userData = {
    ...mesh.userData,
    vizLayerId: layer.layerId,
  };
  return mesh;
};

const createLayerRenderTarget = (
  width: number,
  height: number,
): WebGLRenderTarget => {
  const renderTarget = new WebGLRenderTarget(width, height, {
    depthBuffer: false,
    stencilBuffer: false,
  });
  renderTarget.texture.colorSpace = SRGBColorSpace;
  renderTarget.texture.generateMipmaps = false;
  renderTarget.texture.minFilter = LinearFilter;
  renderTarget.texture.magFilter = LinearFilter;
  renderTarget.texture.format = RGBAFormat;
  return renderTarget;
};

const createCompositorLayer = (
  layer: VizLayerRenderPlanEntry,
  width: number,
  height: number,
  materializedAssets: ReadonlyMap<string, VizMaterializedAsset>,
  modelResources: VizThreeModelResourceManager,
  invalidate: () => void,
  programRegistry: VizThreeProgramRegistry,
): VizThreeCompositorLayer => {
  const compositeSurface = createCompositeSurface(layer, width, height);
  const renderTarget = createLayerRenderTarget(width, height);
  const compositeMaterial = compositeSurface.material as MeshBasicMaterial;
  compositeMaterial.map = renderTarget.texture;
  compositeMaterial.needsUpdate = true;

  if (layer.node?.kind === 'three-program') {
    const programInstance = createVizThreeProgramInstance({
      node: layer.node,
      width,
      height,
      materializedAssets,
      modelResources,
      invalidate,
      programRegistry,
    });
    return {
      layer,
      contentScene: programInstance.scene,
      contentCamera: programInstance.camera,
      contentRoot: programInstance.root,
      compositeSurface,
      renderTarget,
      programInstance,
    };
  }

  const contentScene = new Scene();
  const contentCamera = createVizThreeOrthoCamera(width, height);
  const contentRoot = createLayerContentRoot(layer, width, height);
  contentScene.add(contentRoot);
  return {
    layer,
    contentScene,
    contentCamera,
    contentRoot,
    compositeSurface,
    renderTarget,
  };
};

export const createVizThreeCompositorGraph = (
  renderPlan: VizRenderPlan,
  invalidate: () => void = () => undefined,
  providedModelResources?: VizThreeModelResourceManager,
  programRegistry: VizThreeProgramRegistry = createCoreVizThreeProgramRegistry(),
): VizThreeCompositorGraph => {
  const compositeScene = new Scene();
  compositeScene.background =
    renderPlan.viewport.backgroundColor === undefined
      ? null
      : new Color(renderPlan.viewport.backgroundColor);
  const compositeCamera = createVizThreeOrthoCamera(
    renderPlan.viewport.width,
    renderPlan.viewport.height,
  );
  const compositeRoot = new Group();
  compositeScene.add(compositeRoot);
  const materializedAssets = new Map(
    renderPlan.materializedAssets.map((asset) => [asset.id, asset]),
  );
  const modelResources =
    providedModelResources ?? createVizThreeModelResourceManager();
  const layers = renderPlan.layers
    .filter((layer) => Boolean(layer.node))
    .map((layer) =>
      createCompositorLayer(
        layer,
        renderPlan.viewport.width,
        renderPlan.viewport.height,
        materializedAssets,
        modelResources,
        invalidate,
        programRegistry,
      ),
    );
  for (const layer of layers) {
    compositeRoot.add(layer.compositeSurface);
  }
  return {
    compositeScene,
    compositeCamera,
    compositeRoot,
    layers,
    modelResources,
    ownsModelResources: providedModelResources === undefined,
    invalidate,
    programRegistry,
  };
};

export const createVizThreeSceneGraph = (
  renderPlan: VizRenderPlan,
): VizThreeSceneGraph => {
  const scene = new Scene();
  scene.background =
    renderPlan.viewport.backgroundColor === undefined
      ? null
      : new Color(renderPlan.viewport.backgroundColor);
  const camera = createVizThreeOrthoCamera(
    renderPlan.viewport.width,
    renderPlan.viewport.height,
  );
  const rootGroup = new Group();
  scene.add(rootGroup);
  for (const layer of renderPlan.layers) {
    rootGroup.add(
      createLayerContentRoot(
        layer,
        renderPlan.viewport.width,
        renderPlan.viewport.height,
      ),
    );
  }
  return { scene, camera, rootGroup };
};

export const summarizeVizThreeSceneGraph = (rootGroup: Group): string[] =>
  rootGroup.children.map((child) => child.type);

const disposeLayerContent = (layer: VizThreeCompositorLayer): void => {
  if (layer.programInstance) {
    layer.programInstance.dispose();
  } else {
    clearVizThreeObjectChildren(layer.contentRoot);
  }
  layer.renderTarget.dispose();
};

const disposeLayer = (layer: VizThreeCompositorLayer): void => {
  disposeLayerContent(layer);
  disposeVizThreeObject(layer.compositeSurface);
};

export const resizeVizThreeCompositorGraph = (
  graph: VizThreeCompositorGraph,
  width: number,
  height: number,
): void => {
  for (const layer of graph.layers) {
    layer.renderTarget.setSize(width, height);
    if (layer.programInstance) {
      layer.programInstance.resize(width, height);
    } else if (layer.contentCamera instanceof OrthographicCamera) {
      updateVizThreeOrthoCamera(layer.contentCamera, width, height);
    }
    updatePlaneSurface(layer.compositeSurface, width, height);
  }
  updateVizThreeOrthoCamera(graph.compositeCamera, width, height);
};

const updatePlaneSurface = (surface: Mesh, width: number, height: number) => {
  const geometry = surface.geometry as PlaneGeometry;
  if (
    geometry.parameters.width !== width ||
    geometry.parameters.height !== height
  ) {
    geometry.dispose();
    surface.geometry = new PlaneGeometry(width, height);
  }
};

export const disposeVizThreeCompositorGraph = (
  graph: VizThreeCompositorGraph,
): void => {
  for (const layer of graph.layers) {
    disposeLayerContent(layer);
  }
  clearVizThreeObjectChildren(graph.compositeRoot);
  if (graph.ownsModelResources) {
    graph.modelResources.dispose();
  }
};

const updateLayer = (
  graphLayer: VizThreeCompositorLayer,
  previousLayer: VizLayerRenderPlanEntry,
  nextLayer: VizLayerRenderPlanEntry,
  materializedAssets: ReadonlyMap<string, VizMaterializedAsset>,
  width: number,
  height: number,
): boolean => {
  const previousNode = previousLayer.node;
  const nextNode = nextLayer.node;
  const object = graphLayer.contentRoot.children[0];
  const updated =
    previousNode?.kind === 'three-program' &&
    nextNode?.kind === 'three-program' &&
    previousNode.programId === nextNode.programId &&
    graphLayer.programInstance?.programId === nextNode.programId
      ? (() => {
          graphLayer.programInstance.update(nextNode, materializedAssets);
          return true;
        })()
      : previousNode != null &&
          nextNode != null &&
          (object instanceof Group ||
            object instanceof Mesh ||
            object instanceof Points)
        ? updateVizThreePortableNodeObject(
            object,
            previousNode,
            nextNode,
            { opacity: 1 },
            width,
            height,
          )
        : false;

  if (!updated) {
    return false;
  }
  graphLayer.layer = nextLayer;
  const material = graphLayer.compositeSurface.material as MeshBasicMaterial;
  material.opacity = nextLayer.opacity;
  material.transparent = nextLayer.opacity < 1;
  material.blending = getVizThreeBlending(nextLayer.blendMode);
  return true;
};

export const updateVizThreeCompositorGraph = (
  graph: VizThreeCompositorGraph,
  previousPlan: VizRenderPlan,
  nextPlan: VizRenderPlan,
): boolean => {
  const width = nextPlan.viewport.width;
  const height = nextPlan.viewport.height;
  const materializedAssets = new Map(
    nextPlan.materializedAssets.map((asset) => [asset.id, asset]),
  );
  const previousLayers = new Map(
    previousPlan.layers.map((layer) => [layer.layerId, layer]),
  );
  const existingLayers = new Map(
    graph.layers.map((layer) => [layer.layer.layerId, layer]),
  );
  const retained = new Set<VizThreeCompositorLayer>();
  const disposed = new Set<VizThreeCompositorLayer>();
  const nextLayers: VizThreeCompositorLayer[] = [];

  for (const nextLayer of nextPlan.layers) {
    if (!nextLayer.node) {
      continue;
    }
    const existing = existingLayers.get(nextLayer.layerId);
    const previous = previousLayers.get(nextLayer.layerId);
    if (
      existing &&
      previous &&
      updateLayer(
        existing,
        previous,
        nextLayer,
        materializedAssets,
        width,
        height,
      )
    ) {
      retained.add(existing);
      nextLayers.push(existing);
      continue;
    }

    if (existing) {
      disposeLayer(existing);
      disposed.add(existing);
    }
    nextLayers.push(
      createCompositorLayer(
        nextLayer,
        width,
        height,
        materializedAssets,
        graph.modelResources,
        graph.invalidate,
        graph.programRegistry,
      ),
    );
  }

  for (const existing of graph.layers) {
    if (!retained.has(existing) && !disposed.has(existing)) {
      disposeLayer(existing);
    }
  }

  graph.layers = nextLayers;
  graph.compositeRoot.clear();
  for (const layer of nextLayers) {
    graph.compositeRoot.add(layer.compositeSurface);
  }
  resizeVizThreeCompositorGraph(graph, width, height);
  graph.compositeScene.background =
    nextPlan.viewport.backgroundColor === undefined
      ? null
      : new Color(nextPlan.viewport.backgroundColor);
  return true;
};
