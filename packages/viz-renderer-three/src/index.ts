import type {
  VizBlendMode,
  VizLayerRenderPlanEntry,
  VizMaterializedImageAsset,
  VizRenderCircleNode,
  VizRenderGroupNode,
  VizRenderImageNode,
  VizRenderNode,
  VizRenderPlan,
  VizRenderRectNode,
  VizRenderStyle,
  VizRenderTransform,
} from "@viz-engine/contracts";
import {
  AdditiveBlending,
  CircleGeometry,
  Color,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  WebGLRenderTarget,
  WebGLRenderer,
  type Blending,
  type Material,
  type MeshBasicMaterialParameters,
} from "three";

export interface VizThreeSceneGraph {
  scene: Scene;
  camera: OrthographicCamera;
  rootGroup: Group;
}

export interface VizThreeCompositorLayer {
  layer: VizLayerRenderPlanEntry;
  contentScene: Scene;
  contentCamera: OrthographicCamera;
  contentRoot: Group;
  compositeSurface: Mesh;
  renderTarget: WebGLRenderTarget;
}

export interface VizThreeCompositorGraph {
  compositeScene: Scene;
  compositeCamera: OrthographicCamera;
  compositeRoot: Group;
  layers: VizThreeCompositorLayer[];
}

export interface VizThreePreviewController {
  update(renderPlan: VizRenderPlan): void;
  resize(width: number, height: number): void;
  render(): void;
  dispose(): void;
}

interface VizImageMeshUserData {
  vizImageAssetId?: string;
}

interface VizInheritedRenderState {
  opacity: number;
  blendMode?: VizBlendMode;
}

const getThreeBlending = (blendMode: VizBlendMode | undefined): Blending => {
  if (blendMode === "add") {
    return AdditiveBlending;
  }

  return NormalBlending;
};

const createOrthoCamera = (width: number, height: number): OrthographicCamera => {
  const camera = new OrthographicCamera(
    -width / 2,
    width / 2,
    height / 2,
    -height / 2,
    0.1,
    2000,
  );

  camera.position.z = 1000;
  return camera;
};

const updateOrthoCamera = (
  camera: OrthographicCamera,
  width: number,
  height: number,
): void => {
  camera.left = -width / 2;
  camera.right = width / 2;
  camera.top = height / 2;
  camera.bottom = -height / 2;
  camera.updateProjectionMatrix();
};

const createMaterial = (
  style: VizRenderStyle | undefined,
  fallbackFill = "#ffffff",
  overrides: MeshBasicMaterialParameters = {},
): MeshBasicMaterial => {
  const fill = style?.fill ?? fallbackFill;
  const opacity = style?.opacity ?? 1;

  return new MeshBasicMaterial({
    color: new Color(fill),
    transparent: opacity < 1,
    opacity,
    blending: getThreeBlending(style?.blendMode),
    depthWrite: false,
    ...overrides,
  });
};

const applyTransform = (
  object: Group | Mesh,
  transform: VizRenderTransform | undefined,
): void => {
  if (!transform) {
    return;
  }

  const translateX = transform.translateX ?? 0;
  const translateY = transform.translateY ?? 0;
  const scaleX = transform.scaleX ?? 1;
  const scaleY = transform.scaleY ?? 1;
  const rotationDegrees = transform.rotationDegrees ?? 0;

  object.position.x += translateX;
  object.position.y -= translateY;
  object.scale.set(scaleX, scaleY, 1);
  object.rotation.z = (-rotationDegrees * Math.PI) / 180;
};

const applyStyle = (object: Group | Mesh, style: VizRenderStyle | undefined): void => {
  if (!style) {
    return;
  }

  if ("material" in object && object.material) {
    const material = object.material as Material;

    if ("opacity" in material && style.opacity !== undefined) {
      material.opacity = style.opacity;
      material.transparent = style.opacity < 1;
    }

    if ("blending" in material && style.blendMode !== undefined) {
      material.blending = getThreeBlending(style.blendMode);
    }
  }
};

const composeInheritedRenderState = (
  inherited: VizInheritedRenderState,
  style: VizRenderStyle | undefined,
): VizInheritedRenderState => {
  const blendMode = style?.blendMode ?? inherited.blendMode;

  return {
    opacity: inherited.opacity * (style?.opacity ?? 1),
    ...(blendMode === undefined ? {} : { blendMode }),
  };
};

const mergeRenderableStyle = (
  inherited: VizInheritedRenderState,
  style: VizRenderStyle | undefined,
): VizRenderStyle => {
  const blendMode = style?.blendMode ?? inherited.blendMode;

  return {
    ...style,
    opacity: inherited.opacity * (style?.opacity ?? 1),
    ...(blendMode === undefined ? {} : { blendMode }),
  };
};

const createRectStrokeMeshes = ({
  node,
  finalStyle,
  viewportWidth,
  viewportHeight,
}: {
  node: VizRenderRectNode;
  finalStyle: VizRenderStyle;
  viewportWidth: number;
  viewportHeight: number;
}): Mesh[] => {
  const stroke = finalStyle.stroke;
  const strokeWidth = finalStyle.strokeWidth;

  if (!stroke || !strokeWidth || strokeWidth <= 0) {
    return [];
  }

  const halfStroke = strokeWidth / 2;
  const left = node.x;
  const right = node.x + node.width;
  const top = node.y;
  const bottom = node.y + node.height;
  const horizontalWidth = Math.max(node.width + strokeWidth, strokeWidth);
  const verticalHeight = Math.max(node.height - strokeWidth, 0);
  const strokeStyle: VizRenderStyle = {
    fill: stroke,
    ...(finalStyle.opacity === undefined ? {} : { opacity: finalStyle.opacity }),
    ...(finalStyle.blendMode === undefined ? {} : { blendMode: finalStyle.blendMode }),
  };

  const topMesh = new Mesh(
    new PlaneGeometry(horizontalWidth, strokeWidth),
    createMaterial(strokeStyle, stroke),
  );
  topMesh.position.x = left + node.width / 2 - viewportWidth / 2;
  topMesh.position.y = viewportHeight / 2 - (top - halfStroke);

  const bottomMesh = new Mesh(
    new PlaneGeometry(horizontalWidth, strokeWidth),
    createMaterial(strokeStyle, stroke),
  );
  bottomMesh.position.x = left + node.width / 2 - viewportWidth / 2;
  bottomMesh.position.y = viewportHeight / 2 - (bottom + halfStroke);

  const leftMesh = new Mesh(
    new PlaneGeometry(strokeWidth, verticalHeight),
    createMaterial(strokeStyle, stroke),
  );
  leftMesh.position.x = left - halfStroke - viewportWidth / 2;
  leftMesh.position.y = viewportHeight / 2 - (top + node.height / 2);

  const rightMesh = new Mesh(
    new PlaneGeometry(strokeWidth, verticalHeight),
    createMaterial(strokeStyle, stroke),
  );
  rightMesh.position.x = right + halfStroke - viewportWidth / 2;
  rightMesh.position.y = viewportHeight / 2 - (top + node.height / 2);

  return [topMesh, bottomMesh, leftMesh, rightMesh];
};

const convertRectToMesh = (
  node: VizRenderRectNode,
  inherited: VizInheritedRenderState,
  viewportWidth: number,
  viewportHeight: number,
): Group | Mesh => {
  const finalStyle = mergeRenderableStyle(inherited, node.style);
  const fill = finalStyle.fill;
  const hasFill = typeof fill === "string" && fill.length > 0;
  const strokeMeshes = createRectStrokeMeshes({
    node,
    finalStyle,
    viewportWidth,
    viewportHeight,
  });

  if (hasFill && strokeMeshes.length === 0) {
    const geometry = new PlaneGeometry(node.width, node.height);
    const material = createMaterial(finalStyle, "#ffffff");
    const mesh = new Mesh(geometry, material);
    mesh.position.x = node.x + node.width / 2 - viewportWidth / 2;
    mesh.position.y = viewportHeight / 2 - (node.y + node.height / 2);
    applyStyle(mesh, finalStyle);
    return mesh;
  }

  const group = new Group();

  if (hasFill) {
    const fillMesh = new Mesh(
      new PlaneGeometry(node.width, node.height),
      createMaterial(finalStyle, "#ffffff"),
    );
    fillMesh.position.x = node.x + node.width / 2 - viewportWidth / 2;
    fillMesh.position.y = viewportHeight / 2 - (node.y + node.height / 2);
    applyStyle(fillMesh, finalStyle);
    group.add(fillMesh);
  }

  for (const strokeMesh of strokeMeshes) {
    group.add(strokeMesh);
  }

  return group;
};

const convertCircleToMesh = (
  node: VizRenderCircleNode,
  inherited: VizInheritedRenderState,
  viewportWidth: number,
  viewportHeight: number,
): Mesh => {
  const finalStyle = mergeRenderableStyle(inherited, node.style);
  const geometry = new CircleGeometry(node.r, 48);
  const material = createMaterial(finalStyle, "#ffffff");
  const mesh = new Mesh(geometry, material);
  mesh.position.x = node.cx - viewportWidth / 2;
  mesh.position.y = viewportHeight / 2 - node.cy;
  applyStyle(mesh, finalStyle);
  return mesh;
};

const convertImageToMesh = (
  node: VizRenderImageNode,
  inherited: VizInheritedRenderState,
  viewportWidth: number,
  viewportHeight: number,
): Mesh => {
  const finalStyle = mergeRenderableStyle(inherited, node.style);
  const geometry = new PlaneGeometry(node.width, node.height);
  const material = createMaterial(
    finalStyle,
    "#ffffff",
    {
      transparent: true,
    },
  );
  const mesh = new Mesh(geometry, material);
  mesh.position.x = node.x + node.width / 2 - viewportWidth / 2;
  mesh.position.y = viewportHeight / 2 - (node.y + node.height / 2);
  mesh.userData = {
    ...mesh.userData,
    vizImageAssetId: node.assetId,
  } satisfies VizImageMeshUserData;
  return mesh;
};

const convertNodeToObject = (
  node: VizRenderNode,
  inherited: VizInheritedRenderState,
  viewportWidth: number,
  viewportHeight: number,
): Group | Mesh => {
  if (node.kind === "rect") {
    return convertRectToMesh(node, inherited, viewportWidth, viewportHeight);
  }

  if (node.kind === "circle") {
    return convertCircleToMesh(node, inherited, viewportWidth, viewportHeight);
  }

  if (node.kind === "image") {
    return convertImageToMesh(node, inherited, viewportWidth, viewportHeight);
  }

  const group = new Group();
  applyTransform(group, node.transform);
  const nextInherited = composeInheritedRenderState(inherited, node.style);

  for (const child of node.children) {
    group.add(convertNodeToObject(child, nextInherited, viewportWidth, viewportHeight));
  }

  return group;
};

const disposeObject = (object: Group | Mesh): void => {
  if ("geometry" in object) {
    object.geometry.dispose();
  }

  if ("material" in object) {
    const material = object.material;

    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
    } else {
      material.dispose();
    }
  }

  for (const child of [...object.children]) {
    disposeObject(child as Group | Mesh);
  }
};

const clearRootGroup = (rootGroup: Group): void => {
  for (const child of [...rootGroup.children]) {
    disposeObject(child as Group | Mesh);
    rootGroup.remove(child);
  }
};

const createLayerContentRoot = (
  layer: VizLayerRenderPlanEntry,
  viewportWidth: number,
  viewportHeight: number,
): Group => {
  const contentRoot = new Group();

  if (!layer.node) {
    return contentRoot;
  }

  const object = convertNodeToObject(
    layer.node,
    {
      opacity: 1,
    },
    viewportWidth,
    viewportHeight,
  );

  contentRoot.add(object);
  return contentRoot;
};

const createCompositeSurface = (
  layer: VizLayerRenderPlanEntry,
  width: number,
  height: number,
): Mesh => {
  const geometry = new PlaneGeometry(width, height);
  const material = new MeshBasicMaterial({
    color: new Color("#ffffff"),
    transparent: layer.opacity < 1,
    opacity: layer.opacity,
    blending: getThreeBlending(layer.blendMode),
    depthWrite: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.renderOrder = 1;
  mesh.userData = {
    ...mesh.userData,
    vizLayerId: layer.layerId,
  };
  return mesh;
};

const createLayerRenderTarget = (width: number, height: number): WebGLRenderTarget => {
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

const createVizThreeCompositorLayer = (
  layer: VizLayerRenderPlanEntry,
  viewportWidth: number,
  viewportHeight: number,
): VizThreeCompositorLayer => {
  const contentScene = new Scene();
  const contentCamera = createOrthoCamera(viewportWidth, viewportHeight);
  const contentRoot = createLayerContentRoot(layer, viewportWidth, viewportHeight);
  contentScene.add(contentRoot);

  const compositeSurface = createCompositeSurface(layer, viewportWidth, viewportHeight);
  const renderTarget = createLayerRenderTarget(viewportWidth, viewportHeight);
  const material = compositeSurface.material as MeshBasicMaterial;
  material.map = renderTarget.texture;
  material.needsUpdate = true;

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
): VizThreeCompositorGraph => {
  const compositeScene = new Scene();
  compositeScene.background =
    renderPlan.viewport.backgroundColor === undefined
      ? null
      : new Color(renderPlan.viewport.backgroundColor);
  const compositeCamera = createOrthoCamera(renderPlan.viewport.width, renderPlan.viewport.height);
  const compositeRoot = new Group();
  compositeScene.add(compositeRoot);

  const layers = renderPlan.layers
    .filter((layer) => Boolean(layer.node))
    .map((layer) =>
      createVizThreeCompositorLayer(
        layer,
        renderPlan.viewport.width,
        renderPlan.viewport.height,
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
  };
};

export const createVizThreeSceneGraph = (renderPlan: VizRenderPlan): VizThreeSceneGraph => {
  const scene = new Scene();
  scene.background =
    renderPlan.viewport.backgroundColor === undefined
      ? null
      : new Color(renderPlan.viewport.backgroundColor);
  const camera = createOrthoCamera(renderPlan.viewport.width, renderPlan.viewport.height);
  const rootGroup = new Group();
  scene.add(rootGroup);

  for (const layer of renderPlan.layers) {
    const layerRoot = createLayerContentRoot(
      layer,
      renderPlan.viewport.width,
      renderPlan.viewport.height,
    );
    rootGroup.add(layerRoot);
  }

  return {
    scene,
    camera,
    rootGroup,
  };
};

export const summarizeVizThreeSceneGraph = (rootGroup: Group): string[] => {
  return rootGroup.children.map((child) => child.type);
};

const visitMeshes = (object: Group | Mesh, visitor: (mesh: Mesh) => void): void => {
  if (object instanceof Mesh) {
    visitor(object);
  }

  for (const child of object.children) {
    visitMeshes(child as Group | Mesh, visitor);
  }
};

const createMaterializedImageAssetMap = (
  renderPlan: VizRenderPlan,
): ReadonlyMap<string, VizMaterializedImageAsset> => {
  return new Map(
    renderPlan.materializedAssets
      .filter((asset): asset is VizMaterializedImageAsset => asset.kind === "image")
      .map((asset) => [asset.id, asset]),
  );
};

const hydrateImageTextures = ({
  layers,
  materializedImageAssets,
  textureLoader,
  textureCache,
  pendingTextureLoads,
  onTextureReady,
}: {
  layers: VizThreeCompositorLayer[];
  materializedImageAssets: ReadonlyMap<string, VizMaterializedImageAsset>;
  textureLoader: TextureLoader | null;
  textureCache: Map<string, Texture>;
  pendingTextureLoads: Set<string>;
  onTextureReady: () => void;
}): void => {
  if (!textureLoader) {
    return;
  }

  for (const layer of layers) {
    visitMeshes(layer.contentRoot, (mesh) => {
      const userData = mesh.userData as VizImageMeshUserData;
      const assetId = userData.vizImageAssetId;
      const uri = assetId ? materializedImageAssets.get(assetId)?.imageSourceUri : undefined;

      if (!uri) {
        return;
      }

      const material = mesh.material as MeshBasicMaterial;
      const cachedTexture = textureCache.get(uri);

      if (cachedTexture) {
        if (material.map !== cachedTexture) {
          material.map = cachedTexture;
          material.needsUpdate = true;
        }

        return;
      }

      if (pendingTextureLoads.has(uri)) {
        return;
      }

      pendingTextureLoads.add(uri);

      textureLoader.load(
        uri,
        (texture) => {
          texture.colorSpace = SRGBColorSpace;
          textureCache.set(uri, texture);
          pendingTextureLoads.delete(uri);
          hydrateImageTextures({
            layers,
            materializedImageAssets,
            textureLoader,
            textureCache,
            pendingTextureLoads,
            onTextureReady,
          });
          onTextureReady();
        },
        undefined,
        () => {
          pendingTextureLoads.delete(uri);
        },
      );
    });
  }
};

const disposeCompositorGraph = (graph: VizThreeCompositorGraph): void => {
  for (const layer of graph.layers) {
    clearRootGroup(layer.contentRoot);
    layer.renderTarget.dispose();
    disposeObject(layer.compositeSurface);
  }

  clearRootGroup(graph.compositeRoot);
};

export const createVizThreePreviewController = ({
  canvas,
  renderPlan,
}: {
  canvas: HTMLCanvasElement;
  renderPlan: VizRenderPlan;
}): VizThreePreviewController => {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.autoClear = true;

  let currentRenderPlan = renderPlan;
  let compositorGraph = createVizThreeCompositorGraph(renderPlan);
  const textureCache = new Map<string, Texture>();
  const pendingTextureLoads = new Set<string>();
  const textureLoader = typeof window === "undefined" ? null : new TextureLoader();
  let materializedImageAssets = createMaterializedImageAssetMap(renderPlan);

  const resize = (width: number, height: number) => {
    renderer.setSize(width, height, false);

    for (const layer of compositorGraph.layers) {
      layer.renderTarget.setSize(width, height);
      updateOrthoCamera(layer.contentCamera, width, height);
      const geometry = layer.compositeSurface.geometry as PlaneGeometry;
      geometry.dispose();
      layer.compositeSurface.geometry = new PlaneGeometry(width, height);
    }

    updateOrthoCamera(compositorGraph.compositeCamera, width, height);
  };

  const render = () => {
    for (const layer of compositorGraph.layers) {
      renderer.setRenderTarget(layer.renderTarget);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, true, true);
      renderer.render(layer.contentScene, layer.contentCamera);
    }

    renderer.setRenderTarget(null);
    if (currentRenderPlan.viewport.backgroundColor === undefined) {
      renderer.setClearColor(0x000000, 0);
    } else {
      renderer.setClearColor(new Color(currentRenderPlan.viewport.backgroundColor), 1);
    }
    renderer.clear(true, true, true);
    renderer.render(compositorGraph.compositeScene, compositorGraph.compositeCamera);
  };

  const hydrate = () => {
    hydrateImageTextures({
      layers: compositorGraph.layers,
      materializedImageAssets,
      textureLoader,
      textureCache,
      pendingTextureLoads,
      onTextureReady: render,
    });
  };

  resize(renderPlan.viewport.width, renderPlan.viewport.height);
  hydrate();
  render();

  return {
    update(nextRenderPlan) {
      currentRenderPlan = nextRenderPlan;
      materializedImageAssets = createMaterializedImageAssetMap(nextRenderPlan);
      disposeCompositorGraph(compositorGraph);
      compositorGraph = createVizThreeCompositorGraph(nextRenderPlan);
      resize(nextRenderPlan.viewport.width, nextRenderPlan.viewport.height);
      hydrate();
      render();
    },
    resize,
    render,
    dispose() {
      disposeCompositorGraph(compositorGraph);
      for (const texture of textureCache.values()) {
        texture.dispose();
      }
      textureCache.clear();
      renderer.dispose();
    },
  };
};
