import type {
  VizBlendMode,
  VizLayerRenderPlanEntry,
  VizMaterializedAsset,
  VizMaterializedImageAsset,
  VizRenderCircleNode,
  VizRenderGroupNode,
  VizRenderImageNode,
  VizRenderNode,
  VizRenderPlan,
  VizRenderPolylineNode,
  VizRenderRectNode,
  VizRenderShaderNode,
  VizRenderStyle,
  VizRenderTextNode,
  VizRenderThreeProgramNode,
  VizRenderTransform,
  VizShaderUniformValue,
} from "@viz-engine/contracts";
import {
  AdditiveBlending,
  CircleGeometry,
  CanvasTexture,
  Color,
  Group,
  InterleavedBufferAttribute,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  WebGLRenderer,
  type Blending,
  type Camera,
  type Material,
  type MeshBasicMaterialParameters,
} from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import {
  createCoreVizThreeProgramRegistry,
  createVizThreeProgramInstance,
  type VizThreeProgramRegistry,
} from "./programs/registry.js";
import type { VizThreeProgramInstance } from "./programs/types.js";
import {
  createVizThreeModelResourceManager,
  type VizThreeModelResourceDiagnostic,
  type VizThreeModelResourceManager,
} from "./model-resources.js";

export type {
  VizThreeProgramFactory,
  VizThreeProgramInstance,
} from "./programs/types.js";
export * from "./programs/registry.js";
export * from "./programs/post-processing.js";
export * from "./model-animation.js";
export * from "./model-resources.js";

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
}

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
  dispose(): void;
}

export interface VizThreePreviewCameraPose {
  position: [number, number, number];
  rotation: [number, number, number];
}

interface VizImageMeshUserData {
  vizImageAssetId?: string;
}

interface VizShaderMeshUserData {
  vizShaderProgramId?: string;
}

interface VizPolylineGroupUserData {
  vizPolyline?: true;
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

const createPolylineLine = ({
  node,
  color,
  width,
  opacity,
  inherited,
  viewportWidth,
  viewportHeight,
}: {
  node: VizRenderPolylineNode;
  color: string;
  width: number;
  opacity: number;
  inherited: VizInheritedRenderState;
  viewportWidth: number;
  viewportHeight: number;
}): Line2 => {
  const geometry = new LineGeometry();
  geometry.setPositions(
    node.points.flatMap((point) => [
      point.x - viewportWidth / 2,
      viewportHeight / 2 - point.y,
      0,
    ]),
  );
  const material = new LineMaterial({
    color: new Color(color).getHex(),
    linewidth: Math.max(0.01, width),
    opacity: inherited.opacity * opacity,
    transparent: inherited.opacity * opacity < 1,
    blending: getThreeBlending(node.style?.blendMode ?? inherited.blendMode),
    depthTest: false,
    depthWrite: false,
    worldUnits: false,
    resolution: new Vector2(viewportWidth, viewportHeight),
  });
  const line = new Line2(geometry, material);
  line.frustumCulled = false;
  return line;
};

const convertPolylineToObject = (
  node: VizRenderPolylineNode,
  inherited: VizInheritedRenderState,
  viewportWidth: number,
  viewportHeight: number,
): Group => {
  const group = new Group();
  group.userData = {
    ...group.userData,
    vizPolyline: true,
  } satisfies VizPolylineGroupUserData;

  if (node.points.length < 2) {
    return group;
  }

  const stroke = node.style?.stroke ?? node.style?.fill ?? "#ffffff";
  const strokeWidth = Math.max(0.01, node.style?.strokeWidth ?? 1);

  if (node.glow && node.glow.blur > 0) {
    const glow = createPolylineLine({
      node,
      color: node.glow.color,
      width: strokeWidth + node.glow.blur * 2,
      opacity: node.glow.opacity ?? 0.18,
      inherited,
      viewportWidth,
      viewportHeight,
    });
    glow.position.z = -0.1;
    group.add(glow);
  }

  group.add(
    createPolylineLine({
      node,
      color: stroke,
      width: strokeWidth,
      opacity: node.style?.opacity ?? 1,
      inherited,
      viewportWidth,
      viewportHeight,
    }),
  );
  return group;
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

const getTextOrigin = (
  node: VizRenderTextNode,
  width: number,
  height: number,
): { x: number; y: number } => {
  const x =
    node.anchor === "middle"
      ? node.x - width / 2
      : node.anchor === "end"
        ? node.x - width
        : node.x;
  const y =
    node.baseline === "middle"
      ? node.y - height / 2
      : node.baseline === "bottom" || node.baseline === "alphabetic"
        ? node.y - height
        : node.y;

  return { x, y };
};

const convertTextToObject = (
  node: VizRenderTextNode,
  inherited: VizInheritedRenderState,
  viewportWidth: number,
  viewportHeight: number,
): Group | Mesh => {
  if (typeof document === "undefined") {
    const placeholder = new Group();
    placeholder.userData = {
      ...placeholder.userData,
      vizText: node.text,
    };
    return placeholder;
  }

  const fontSize = Math.max(1, node.fontSize);
  const fontFamily = node.fontFamily ?? "sans-serif";
  const fontWeight = node.fontWeight ?? "normal";
  const textureScale = 2;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return new Group();
  }

  const font = `${fontWeight} ${fontSize * textureScale}px ${fontFamily}`;
  context.font = font;
  const measuredWidth = Math.ceil(context.measureText(node.text).width);
  const textureWidth = Math.max(2, measuredWidth + 4 * textureScale);
  const textureHeight = Math.max(
    2,
    Math.ceil(fontSize * 1.45 * textureScale),
  );
  canvas.width = textureWidth;
  canvas.height = textureHeight;

  context.clearRect(0, 0, textureWidth, textureHeight);
  context.font = font;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = node.style?.fill ?? "#ffffff";
  context.fillText(node.text, 2 * textureScale, textureHeight / 2);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;

  const width = textureWidth / textureScale;
  const height = textureHeight / textureScale;
  const finalStyle = mergeRenderableStyle(inherited, node.style);
  const material = createMaterial(finalStyle, "#ffffff", {
    color: new Color("#ffffff"),
    map: texture,
    transparent: true,
  });
  const mesh = new Mesh(new PlaneGeometry(width, height), material);
  const origin = getTextOrigin(node, width, height);
  mesh.position.x = origin.x + width / 2 - viewportWidth / 2;
  mesh.position.y = viewportHeight / 2 - (origin.y + height / 2);
  mesh.userData = {
    ...mesh.userData,
    vizOwnedTexture: texture,
  };
  return mesh;
};

const convertShaderUniformValue = (
  value: VizShaderUniformValue,
): number | boolean | Color | Vector2 | Vector3 | Vector4 => {
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value.type === "color") {
    return new Color(value.value);
  }

  if (value.type === "vec2") {
    return new Vector2(...value.value);
  }

  if (value.type === "vec3") {
    return new Vector3(...value.value);
  }

  return new Vector4(...value.value);
};

const createShaderUniforms = (
  uniforms: Record<string, VizShaderUniformValue>,
) =>
  Object.fromEntries(
    Object.entries(uniforms).map(([key, value]) => [
      key,
      { value: convertShaderUniformValue(value) },
    ]),
  );

const convertShaderToMesh = (
  node: VizRenderShaderNode,
  viewportWidth: number,
  viewportHeight: number,
): Mesh => {
  const material = new ShaderMaterial({
    uniforms: createShaderUniforms(node.uniforms),
    vertexShader: node.vertexShader,
    fragmentShader: node.fragmentShader,
    transparent: node.transparent ?? false,
    blending: getThreeBlending(node.blendMode),
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new Mesh(
    new PlaneGeometry(node.width, node.height),
    material,
  );
  mesh.position.x = node.x + node.width / 2 - viewportWidth / 2;
  mesh.position.y =
    viewportHeight / 2 - (node.y + node.height / 2);
  mesh.userData = {
    ...mesh.userData,
    vizShaderProgramId: node.programId,
  } satisfies VizShaderMeshUserData;
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

  if (node.kind === "polyline") {
    return convertPolylineToObject(
      node,
      inherited,
      viewportWidth,
      viewportHeight,
    );
  }

  if (node.kind === "image") {
    return convertImageToMesh(node, inherited, viewportWidth, viewportHeight);
  }

  if (node.kind === "text") {
    return convertTextToObject(
      node,
      inherited,
      viewportWidth,
      viewportHeight,
    );
  }

  if (node.kind === "shader") {
    return convertShaderToMesh(node, viewportWidth, viewportHeight);
  }

  if (node.kind === "three-program") {
    const placeholder = new Group();
    placeholder.userData = {
      ...placeholder.userData,
      vizThreeProgramId: node.programId,
    };
    return placeholder;
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
  const ownedTexture = object.userData.vizOwnedTexture;
  if (ownedTexture instanceof Texture) {
    ownedTexture.dispose();
  }

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
  materializedAssets: ReadonlyMap<string, VizMaterializedAsset>,
  modelResources: VizThreeModelResourceManager,
  invalidate: () => void,
  programRegistry: VizThreeProgramRegistry,
): VizThreeCompositorLayer => {
  if (layer.node?.kind === "three-program") {
    const programInstance = createVizThreeProgramInstance({
      node: layer.node,
      width: viewportWidth,
      height: viewportHeight,
      materializedAssets,
      modelResources,
      invalidate,
      programRegistry,
    });
    const compositeSurface = createCompositeSurface(
      layer,
      viewportWidth,
      viewportHeight,
    );
    const renderTarget = createLayerRenderTarget(
      viewportWidth,
      viewportHeight,
    );
    const material = compositeSurface.material as MeshBasicMaterial;
    material.map = renderTarget.texture;
    material.needsUpdate = true;

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
  invalidate: () => void = () => undefined,
  providedModelResources?: VizThreeModelResourceManager,
  programRegistry: VizThreeProgramRegistry = createCoreVizThreeProgramRegistry(),
): VizThreeCompositorGraph => {
  const compositeScene = new Scene();
  compositeScene.background =
    renderPlan.viewport.backgroundColor === undefined
      ? null
      : new Color(renderPlan.viewport.backgroundColor);
  const compositeCamera = createOrthoCamera(renderPlan.viewport.width, renderPlan.viewport.height);
  const compositeRoot = new Group();
  compositeScene.add(compositeRoot);
  const materializedAssets = new Map(
    renderPlan.materializedAssets.map((asset) => [asset.id, asset]),
  );
  const modelResources =
    providedModelResources ??
    createVizThreeModelResourceManager();

  const layers = renderPlan.layers
    .filter((layer) => Boolean(layer.node))
    .map((layer) =>
      createVizThreeCompositorLayer(
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
    if (layer.programInstance) {
      layer.programInstance.dispose();
    } else {
      clearRootGroup(layer.contentRoot);
    }
    layer.renderTarget.dispose();
    disposeObject(layer.compositeSurface);
  }

  clearRootGroup(graph.compositeRoot);
  if (graph.ownsModelResources) {
    graph.modelResources.dispose();
  }
};

const updateShaderUniformValue = (
  currentValue: unknown,
  nextValue: VizShaderUniformValue,
): unknown => {
  if (typeof nextValue === "number" || typeof nextValue === "boolean") {
    return nextValue;
  }

  if (nextValue.type === "color" && currentValue instanceof Color) {
    currentValue.set(nextValue.value);
    return currentValue;
  }

  if (nextValue.type === "vec2" && currentValue instanceof Vector2) {
    currentValue.set(...nextValue.value);
    return currentValue;
  }

  if (nextValue.type === "vec3" && currentValue instanceof Vector3) {
    currentValue.set(...nextValue.value);
    return currentValue;
  }

  if (nextValue.type === "vec4" && currentValue instanceof Vector4) {
    currentValue.set(...nextValue.value);
    return currentValue;
  }

  return convertShaderUniformValue(nextValue);
};

const updateShaderMesh = (
  mesh: Mesh,
  node: VizRenderShaderNode,
  viewportWidth: number,
  viewportHeight: number,
): boolean => {
  const userData = mesh.userData as VizShaderMeshUserData;
  const material = mesh.material;

  if (
    userData.vizShaderProgramId !== node.programId ||
    !(material instanceof ShaderMaterial)
  ) {
    return false;
  }

  const shaderChanged =
    material.vertexShader !== node.vertexShader ||
    material.fragmentShader !== node.fragmentShader;
  material.vertexShader = node.vertexShader;
  material.fragmentShader = node.fragmentShader;
  material.transparent = node.transparent ?? false;
  material.blending = getThreeBlending(node.blendMode);

  for (const [key, nextValue] of Object.entries(node.uniforms)) {
    const uniform = material.uniforms[key];
    if (uniform) {
      uniform.value = updateShaderUniformValue(uniform.value, nextValue);
    } else {
      material.uniforms[key] = {
        value: convertShaderUniformValue(nextValue),
      };
    }
  }

  for (const key of Object.keys(material.uniforms)) {
    if (!(key in node.uniforms)) {
      delete material.uniforms[key];
    }
  }

  if (shaderChanged) {
    material.needsUpdate = true;
  }

  const geometry = mesh.geometry as PlaneGeometry;
  const geometryParameters = geometry.parameters;
  if (
    geometryParameters.width !== node.width ||
    geometryParameters.height !== node.height
  ) {
    geometry.dispose();
    mesh.geometry = new PlaneGeometry(node.width, node.height);
  }

  mesh.position.x = node.x + node.width / 2 - viewportWidth / 2;
  mesh.position.y =
    viewportHeight / 2 - (node.y + node.height / 2);
  return true;
};

const updateMaterialStyle = (
  material: MeshBasicMaterial | LineMaterial,
  style: VizRenderStyle,
  fallbackColor: string,
): void => {
  material.color.set(style.fill ?? style.stroke ?? fallbackColor);
  material.opacity = style.opacity ?? 1;
  material.transparent = material.opacity < 1;
  material.blending = getThreeBlending(style.blendMode);
};

const updateLinePositions = (
  line: Line2,
  node: VizRenderPolylineNode,
  viewportWidth: number,
  viewportHeight: number,
): void => {
  const geometry = line.geometry as LineGeometry;
  const positions = node.points.flatMap((point) => [
    point.x - viewportWidth / 2,
    viewportHeight / 2 - point.y,
    0,
  ]);
  const startAttribute = geometry.attributes.instanceStart;
  const segmentArray =
    startAttribute instanceof InterleavedBufferAttribute
      ? startAttribute.data.array
      : undefined;
  const expectedLength = Math.max(0, positions.length - 3) * 2;

  if (
    startAttribute instanceof InterleavedBufferAttribute &&
    segmentArray &&
    segmentArray.length === expectedLength
  ) {
    for (
      let sourceOffset = 0, targetOffset = 0;
      sourceOffset < positions.length - 3;
      sourceOffset += 3, targetOffset += 6
    ) {
      segmentArray[targetOffset] = positions[sourceOffset]!;
      segmentArray[targetOffset + 1] = positions[sourceOffset + 1]!;
      segmentArray[targetOffset + 2] = positions[sourceOffset + 2]!;
      segmentArray[targetOffset + 3] = positions[sourceOffset + 3]!;
      segmentArray[targetOffset + 4] = positions[sourceOffset + 4]!;
      segmentArray[targetOffset + 5] = positions[sourceOffset + 5]!;
    }
    startAttribute.data.needsUpdate = true;
  } else {
    geometry.setPositions(positions);
  }
};

const updatePolylineObject = (
  object: Group,
  node: VizRenderPolylineNode,
  inherited: VizInheritedRenderState,
  viewportWidth: number,
  viewportHeight: number,
): boolean => {
  const userData = object.userData as VizPolylineGroupUserData;
  const expectedLineCount =
    node.points.length < 2 ? 0 : node.glow && node.glow.blur > 0 ? 2 : 1;

  if (
    !userData.vizPolyline ||
    object.children.length !== expectedLineCount
  ) {
    return false;
  }

  if (expectedLineCount === 0) {
    return true;
  }

  const stroke = node.style?.stroke ?? node.style?.fill ?? "#ffffff";
  const strokeWidth = Math.max(0.01, node.style?.strokeWidth ?? 1);
  const coreLine = object.children.at(-1);

  if (!(coreLine instanceof Line2)) {
    return false;
  }

  updateLinePositions(coreLine, node, viewportWidth, viewportHeight);
  const coreStyle = mergeRenderableStyle(inherited, {
    ...node.style,
    fill: stroke,
  });
  updateMaterialStyle(
    coreLine.material as LineMaterial,
    coreStyle,
    stroke,
  );
  (coreLine.material as LineMaterial).linewidth = strokeWidth;
  (coreLine.material as LineMaterial).resolution.set(
    viewportWidth,
    viewportHeight,
  );

  if (expectedLineCount === 2) {
    const glowLine = object.children[0];
    if (!(glowLine instanceof Line2) || !node.glow) {
      return false;
    }

    updateLinePositions(glowLine, node, viewportWidth, viewportHeight);
    const glowStyle = mergeRenderableStyle(inherited, {
      fill: node.glow.color,
      opacity: node.glow.opacity ?? 0.18,
      ...(node.style?.blendMode === undefined
        ? {}
        : { blendMode: node.style.blendMode }),
    });
    updateMaterialStyle(
      glowLine.material as LineMaterial,
      glowStyle,
      node.glow.color,
    );
    (glowLine.material as LineMaterial).linewidth =
      strokeWidth + node.glow.blur * 2;
    (glowLine.material as LineMaterial).resolution.set(
      viewportWidth,
      viewportHeight,
    );
  }

  return true;
};

const resetAndApplyTransform = (
  object: Group | Mesh,
  transform: VizRenderTransform | undefined,
): void => {
  object.position.set(0, 0, 0);
  object.scale.set(1, 1, 1);
  object.rotation.set(0, 0, 0);
  applyTransform(object, transform);
};

const updatePortableNodeObject = (
  object: Group | Mesh,
  previousNode: VizRenderNode,
  nextNode: VizRenderNode,
  inherited: VizInheritedRenderState,
  viewportWidth: number,
  viewportHeight: number,
): boolean => {
  if (previousNode.kind !== nextNode.kind) {
    return false;
  }

  if (nextNode.kind === "polyline") {
    return (
      object instanceof Group &&
      updatePolylineObject(
        object,
        nextNode,
        inherited,
        viewportWidth,
        viewportHeight,
      )
    );
  }

  if (nextNode.kind === "rect" && previousNode.kind === "rect") {
    const finalStyle = mergeRenderableStyle(inherited, nextNode.style);
    const hasFill =
      typeof finalStyle.fill === "string" && finalStyle.fill.length > 0;
    const hasStroke =
      typeof finalStyle.stroke === "string" &&
      (finalStyle.strokeWidth ?? 0) > 0;

    if (!(object instanceof Mesh) || !hasFill || hasStroke) {
      return false;
    }

    const geometry = object.geometry as PlaneGeometry;
    if (
      geometry.parameters.width !== nextNode.width ||
      geometry.parameters.height !== nextNode.height
    ) {
      geometry.dispose();
      object.geometry = new PlaneGeometry(nextNode.width, nextNode.height);
    }
    object.position.x =
      nextNode.x + nextNode.width / 2 - viewportWidth / 2;
    object.position.y =
      viewportHeight / 2 - (nextNode.y + nextNode.height / 2);
    updateMaterialStyle(
      object.material as MeshBasicMaterial,
      finalStyle,
      "#ffffff",
    );
    return true;
  }

  if (nextNode.kind === "group" && previousNode.kind === "group") {
    if (!(object instanceof Group) || object.children.length !== nextNode.children.length) {
      return false;
    }

    resetAndApplyTransform(object, nextNode.transform);
    const nextInherited = composeInheritedRenderState(inherited, nextNode.style);

    return nextNode.children.every((child, index) => {
      const previousChild = previousNode.children[index];
      const childObject = object.children[index];
      return (
        previousChild !== undefined &&
        (childObject instanceof Group || childObject instanceof Mesh) &&
        updatePortableNodeObject(
          childObject,
          previousChild,
          child,
          nextInherited,
          viewportWidth,
          viewportHeight,
        )
      );
    });
  }

  return false;
};

export const updateVizThreeCompositorGraph = (
  graph: VizThreeCompositorGraph,
  previousPlan: VizRenderPlan,
  nextPlan: VizRenderPlan,
): boolean => {
  if (
    previousPlan.viewport.width !== nextPlan.viewport.width ||
    previousPlan.viewport.height !== nextPlan.viewport.height ||
    graph.layers.length !== nextPlan.layers.length
  ) {
    return false;
  }
  const materializedAssets = new Map(
    nextPlan.materializedAssets.map((asset) => [asset.id, asset]),
  );

  for (let index = 0; index < graph.layers.length; index += 1) {
    const graphLayer = graph.layers[index]!;
    const previousLayer = previousPlan.layers[index];
    const nextLayer = nextPlan.layers[index];
    const previousNode = previousLayer?.node;
    const nextNode = nextLayer?.node;
    const object = graphLayer.contentRoot.children[0];

    const updated =
      previousNode?.kind === "shader" &&
      nextNode?.kind === "shader" &&
      object instanceof Mesh
        ? updateShaderMesh(
            object,
            nextNode,
            nextPlan.viewport.width,
            nextPlan.viewport.height,
          )
        : previousNode?.kind === "three-program" &&
            nextNode?.kind === "three-program" &&
            previousNode.programId === nextNode.programId &&
            graphLayer.programInstance?.programId === nextNode.programId
          ? (() => {
              graphLayer.programInstance.update(
                nextNode,
                materializedAssets,
              );
              return true;
            })()
          : previousNode != null &&
              nextNode != null &&
              (object instanceof Group || object instanceof Mesh)
            ? updatePortableNodeObject(
                object,
                previousNode,
                nextNode,
                { opacity: 1 },
                nextPlan.viewport.width,
                nextPlan.viewport.height,
              )
          : false;

    if (
      !previousLayer ||
      !nextLayer ||
      previousLayer.layerId !== nextLayer.layerId ||
      !updated
    ) {
      return false;
    }

    graphLayer.layer = nextLayer;
    const compositeMaterial =
      graphLayer.compositeSurface.material as MeshBasicMaterial;
    compositeMaterial.opacity = nextLayer.opacity;
    compositeMaterial.transparent = nextLayer.opacity < 1;
    compositeMaterial.blending = getThreeBlending(nextLayer.blendMode);
  }

  graph.compositeScene.background =
    nextPlan.viewport.backgroundColor === undefined
      ? null
      : new Color(nextPlan.viewport.backgroundColor);
  return true;
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
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer,
  });
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
  const textureCache = new Map<string, Texture>();
  const pendingTextureLoads = new Set<string>();
  const textureLoader = typeof window === "undefined" ? null : new TextureLoader();
  let materializedImageAssets = createMaterializedImageAssetMap(renderPlan);
  const cameraPoseOverrides = new Map<
    string,
    VizThreePreviewCameraPose
  >();

  const resize = (width: number, height: number) => {
    renderer.setSize(width, height, false);

    for (const layer of compositorGraph.layers) {
      layer.renderTarget.setSize(width, height);
      if (layer.programInstance) {
        layer.programInstance.resize(width, height);
      } else if (layer.contentCamera instanceof OrthographicCamera) {
        updateOrthoCamera(layer.contentCamera, width, height);
      }
      const geometry = layer.compositeSurface.geometry as PlaneGeometry;
      geometry.dispose();
      layer.compositeSurface.geometry = new PlaneGeometry(width, height);
    }

    updateOrthoCamera(compositorGraph.compositeCamera, width, height);
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
      if (
        updateVizThreeCompositorGraph(
          compositorGraph,
          currentRenderPlan,
          nextRenderPlan,
        )
      ) {
        currentRenderPlan = nextRenderPlan;
        materializedImageAssets =
          createMaterializedImageAssetMap(nextRenderPlan);
        hydrate();
        render();
        return;
      }

      currentRenderPlan = nextRenderPlan;
      materializedImageAssets = createMaterializedImageAssetMap(nextRenderPlan);
      disposeCompositorGraph(compositorGraph);
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
              layer.programInstance?.whenReady?.() ??
              Promise.resolve(),
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
    dispose() {
      disposeCompositorGraph(compositorGraph);
      for (const texture of textureCache.values()) {
        texture.dispose();
      }
      textureCache.clear();
      cameraPoseOverrides.clear();
      modelResources.dispose();
      renderer.dispose();
    },
  };
};
