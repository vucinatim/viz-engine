import type {
  VizBlendMode,
  VizRenderCircleNode,
  VizRenderImageNode,
  VizRenderNode,
  VizRenderPointCloudNode,
  VizRenderPolygonNode,
  VizRenderPolylineNode,
  VizRenderRectNode,
  VizRenderShaderNode,
  VizRenderStyle,
  VizRenderTextNode,
  VizRenderTransform,
  VizShaderUniformValue,
} from '@viz-engine/contracts';
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  InterleavedBufferAttribute,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  SRGBColorSpace,
  ShaderMaterial,
  ShapeUtils,
  Texture,
  Vector2,
  Vector3,
  Vector4,
  type Blending,
  type MeshBasicMaterialParameters,
} from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
export interface VizImageMeshUserData {
  vizImageAssetId?: string;
}

interface VizShaderMeshUserData {
  vizShaderProgramId?: string;
}

interface VizPolylineGroupUserData {
  vizPolyline?: true;
}

interface VizPolygonMeshUserData {
  vizPolygon?: true;
}

interface VizPointCloudMeshUserData {
  vizPointCloud?: true;
}

interface VizTextMeshUserData {
  vizTextCanvas?: HTMLCanvasElement;
  vizOwnedTexture?: CanvasTexture;
  vizTextTextureKey?: string;
}

export type VizThreePortableObject = Group | Line | Mesh | Points;

export interface VizInheritedRenderState {
  opacity: number;
  blendMode?: VizBlendMode;
}

export const getVizThreeBlending = (
  blendMode: VizBlendMode | undefined,
): Blending => {
  if (blendMode === 'add') {
    return AdditiveBlending;
  }

  return NormalBlending;
};

export const createVizThreeOrthoCamera = (
  width: number,
  height: number,
): OrthographicCamera => {
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

export const updateVizThreeOrthoCamera = (
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

const clampOpacity = (value: number): number => Math.min(1, Math.max(0, value));

export const resolveVizThreeCssColor = (
  value: string,
): {
  value: string;
  opacity: number;
} => {
  const color = value.trim();
  const normalized = color.toLowerCase();

  if (normalized === 'transparent') {
    return { value: '#000000', opacity: 0 };
  }

  if (/^#[\da-f]{4}$/i.test(color)) {
    return {
      value: `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`,
      opacity: Number.parseInt(`${color[4]}${color[4]}`, 16) / 255,
    };
  }

  if (/^#[\da-f]{8}$/i.test(color)) {
    return {
      value: color.slice(0, 7),
      opacity: Number.parseInt(color.slice(7, 9), 16) / 255,
    };
  }

  const functionalColor = /^(rgba?|hsla?)\((.*)\)$/i.exec(color);
  if (!functionalColor) {
    return { value: color, opacity: 1 };
  }

  const functionName = functionalColor[1]!.toLowerCase();
  const body = functionalColor[2]!;
  const commaParts = body.split(',').map((part) => part.trim());
  const slashIndex = body.lastIndexOf('/');
  const alphaText =
    commaParts.length === 4
      ? commaParts[3]
      : slashIndex >= 0
        ? body.slice(slashIndex + 1).trim()
        : undefined;

  if (alphaText === undefined) {
    return { value: color, opacity: 1 };
  }

  const parsedAlpha = alphaText.endsWith('%')
    ? Number.parseFloat(alphaText) / 100
    : Number.parseFloat(alphaText);
  const opacity = Number.isFinite(parsedAlpha) ? clampOpacity(parsedAlpha) : 1;
  const opaqueBody =
    commaParts.length === 4
      ? commaParts.slice(0, 3).join(', ')
      : body.slice(0, slashIndex).trim();

  return {
    value: `${functionName.startsWith('rgb') ? 'rgb' : 'hsl'}(${opaqueBody})`,
    opacity,
  };
};

const createMaterial = (
  style: VizRenderStyle | undefined,
  fallbackFill = '#ffffff',
  overrides: MeshBasicMaterialParameters = {},
): MeshBasicMaterial => {
  const fill = resolveVizThreeCssColor(style?.fill ?? fallbackFill);
  const opacity = clampOpacity((style?.opacity ?? 1) * fill.opacity);

  return new MeshBasicMaterial({
    color: new Color(fill.value),
    transparent: opacity < 1,
    opacity,
    blending: getVizThreeBlending(style?.blendMode),
    depthWrite: false,
    ...overrides,
  });
};

const applyTransform = (
  object: VizThreePortableObject,
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
    ...(finalStyle.opacity === undefined
      ? {}
      : { opacity: finalStyle.opacity }),
    ...(finalStyle.blendMode === undefined
      ? {}
      : { blendMode: finalStyle.blendMode }),
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
  const hasFill = typeof fill === 'string' && fill.length > 0;
  const strokeMeshes = createRectStrokeMeshes({
    node,
    finalStyle,
    viewportWidth,
    viewportHeight,
  });

  if (hasFill && strokeMeshes.length === 0) {
    const geometry = new PlaneGeometry(node.width, node.height);
    const material = createMaterial(finalStyle, '#ffffff');
    const mesh = new Mesh(geometry, material);
    mesh.position.x = node.x + node.width / 2 - viewportWidth / 2;
    mesh.position.y = viewportHeight / 2 - (node.y + node.height / 2);
    return mesh;
  }

  const group = new Group();

  if (hasFill) {
    const fillMesh = new Mesh(
      new PlaneGeometry(node.width, node.height),
      createMaterial(finalStyle, '#ffffff'),
    );
    fillMesh.position.x = node.x + node.width / 2 - viewportWidth / 2;
    fillMesh.position.y = viewportHeight / 2 - (node.y + node.height / 2);
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
  const material = createMaterial(finalStyle, '#ffffff');
  const mesh = new Mesh(geometry, material);
  mesh.position.x = node.cx - viewportWidth / 2;
  mesh.position.y = viewportHeight / 2 - node.cy;
  return mesh;
};

const pointCloudVertexShader = `
uniform float vizPointSize;

void main() {
  gl_PointSize = vizPointSize;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const pointCloudFragmentShader = `
uniform vec3 vizColor;
uniform float vizOpacity;

void main() {
  vec2 centered = gl_PointCoord - vec2(0.5);
  if (dot(centered, centered) > 0.25) {
    discard;
  }
  gl_FragColor = vec4(vizColor, vizOpacity);
}
`;

const updatePointCloudPositions = (
  points: Points,
  node: VizRenderPointCloudNode,
  viewportWidth: number,
  viewportHeight: number,
): void => {
  const positions = points.geometry.getAttribute('position');
  if (
    !(positions instanceof Float32BufferAttribute) ||
    node.points.length > positions.count
  ) {
    throw new Error(
      `Point cloud contains ${node.points.length} points but its position buffer only holds ${positions.count}.`,
    );
  }
  node.points.forEach((point, index) => {
    positions.setXYZ(
      index,
      point.x - viewportWidth / 2,
      viewportHeight / 2 - point.y,
      0,
    );
  });
  positions.needsUpdate = true;
  points.geometry.setDrawRange(0, node.points.length);
};

const updatePointCloudMaterial = (
  material: ShaderMaterial,
  node: VizRenderPointCloudNode,
  inherited: VizInheritedRenderState,
): void => {
  const style = mergeRenderableStyle(inherited, node.style);
  const fill = resolveVizThreeCssColor(style.fill ?? '#ffffff');
  const opacity = clampOpacity((style.opacity ?? 1) * fill.opacity);
  (material.uniforms.vizPointSize!.value as number) = node.radius * 2;
  (material.uniforms.vizColor!.value as Color).set(fill.value);
  (material.uniforms.vizOpacity!.value as number) = opacity;
  material.blending = getVizThreeBlending(style.blendMode);
};

const convertPointCloudToPoints = (
  node: VizRenderPointCloudNode,
  inherited: VizInheritedRenderState,
  viewportWidth: number,
  viewportHeight: number,
): Points => {
  const capacity = Math.max(1, node.points.length);
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(new Float32Array(capacity * 3), 3),
  );
  const material = new ShaderMaterial({
    vertexShader: pointCloudVertexShader,
    fragmentShader: pointCloudFragmentShader,
    uniforms: {
      vizPointSize: { value: node.radius * 2 },
      vizColor: { value: new Color('#ffffff') },
      vizOpacity: { value: 1 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  updatePointCloudMaterial(material, node, inherited);
  const points = new Points(geometry, material);
  updatePointCloudPositions(points, node, viewportWidth, viewportHeight);
  points.frustumCulled = false;
  points.userData = {
    ...points.userData,
    vizPointCloud: true,
  } satisfies VizPointCloudMeshUserData;
  return points;
};

const polygonVertexShader = `
attribute vec4 vizColor;
varying vec4 vVizColor;

void main() {
  vVizColor = vizColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const polygonFragmentShader = `
varying vec4 vVizColor;

void main() {
  gl_FragColor = vVizColor;
}
`;

interface PreparedPolygonGradientStop {
  offset: number;
  color: Color;
  opacity: number;
}

interface PreparedPolygonFill {
  fromX: number;
  fromY: number;
  deltaX: number;
  deltaY: number;
  lengthSquared: number;
  opacity: number;
  stops: PreparedPolygonGradientStop[];
}

const preparePolygonFill = (
  node: VizRenderPolygonNode,
  inherited: VizInheritedRenderState,
): PreparedPolygonFill => {
  const opacity = inherited.opacity * (node.style?.opacity ?? 1);
  const gradient = node.fillGradient;
  const sourceStops =
    gradient?.stops.length === 0 || gradient === undefined
      ? [{ offset: 0, color: node.style?.fill ?? '#ffffff' }]
      : gradient.stops;
  const stops = sourceStops
    .map((stop) => {
      const resolved = resolveVizThreeCssColor(stop.color);
      return {
        offset: stop.offset,
        color: new Color(resolved.value),
        opacity: resolved.opacity * (stop.opacity ?? 1),
      };
    })
    .sort((left, right) => left.offset - right.offset);

  return {
    fromX: gradient?.from.x ?? 0,
    fromY: gradient?.from.y ?? 0,
    deltaX: gradient === undefined ? 0 : gradient.to.x - gradient.from.x,
    deltaY: gradient === undefined ? 0 : gradient.to.y - gradient.from.y,
    lengthSquared:
      gradient === undefined
        ? 0
        : Math.pow(gradient.to.x - gradient.from.x, 2) +
          Math.pow(gradient.to.y - gradient.from.y, 2),
    opacity,
    stops,
  };
};

const samplePolygonFill = (
  fill: PreparedPolygonFill,
  point: VizRenderPolygonNode['points'][number],
): [number, number, number, number] => {
  const progress =
    fill.lengthSquared === 0
      ? 0
      : Math.min(
          1,
          Math.max(
            0,
            ((point.x - fill.fromX) * fill.deltaX +
              (point.y - fill.fromY) * fill.deltaY) /
              fill.lengthSquared,
          ),
        );
  const rightIndex = fill.stops.findIndex((stop) => stop.offset >= progress);
  const right =
    rightIndex === -1
      ? fill.stops[fill.stops.length - 1]!
      : fill.stops[rightIndex]!;
  const left = rightIndex <= 0 ? right : fill.stops[rightIndex - 1]!;
  const span = Math.max(0.000001, right.offset - left.offset);
  const mix = Math.min(1, Math.max(0, (progress - left.offset) / span));
  return [
    left.color.r + (right.color.r - left.color.r) * mix,
    left.color.g + (right.color.g - left.color.g) * mix,
    left.color.b + (right.color.b - left.color.b) * mix,
    clampOpacity(
      fill.opacity * (left.opacity + (right.opacity - left.opacity) * mix),
    ),
  ];
};

const createPolygonGeometry = (
  node: VizRenderPolygonNode,
  inherited: VizInheritedRenderState,
  viewportWidth: number,
  viewportHeight: number,
): BufferGeometry => {
  const fill = preparePolygonFill(node, inherited);
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(
      node.points.flatMap((point) => [
        point.x - viewportWidth / 2,
        viewportHeight / 2 - point.y,
        0,
      ]),
      3,
    ),
  );
  geometry.setAttribute(
    'vizColor',
    new Float32BufferAttribute(
      node.points.flatMap((point) => samplePolygonFill(fill, point)),
      4,
    ),
  );
  geometry.setIndex(
    node.triangleIndices ??
      ShapeUtils.triangulateShape(
        node.points.map(
          (point) =>
            new Vector2(
              point.x - viewportWidth / 2,
              viewportHeight / 2 - point.y,
            ),
        ),
        [],
      ).flat(),
  );
  return geometry;
};

const updatePolygonGeometry = (
  geometry: BufferGeometry,
  node: VizRenderPolygonNode,
  inherited: VizInheritedRenderState,
  viewportWidth: number,
  viewportHeight: number,
): boolean => {
  if (node.triangleIndices === undefined) {
    return false;
  }

  const positions = geometry.getAttribute('position');
  const colors = geometry.getAttribute('vizColor');
  const index = geometry.getIndex();
  if (
    !(positions instanceof Float32BufferAttribute) ||
    !(colors instanceof Float32BufferAttribute) ||
    positions.count !== node.points.length ||
    colors.count !== node.points.length ||
    index === null ||
    index.count !== node.triangleIndices.length
  ) {
    return false;
  }

  const fill = preparePolygonFill(node, inherited);
  node.points.forEach((point, pointIndex) => {
    positions.setXYZ(
      pointIndex,
      point.x - viewportWidth / 2,
      viewportHeight / 2 - point.y,
      0,
    );
    colors.setXYZW(pointIndex, ...samplePolygonFill(fill, point));
  });
  node.triangleIndices.forEach((vertexIndex, indexPosition) => {
    index.setX(indexPosition, vertexIndex);
  });
  positions.needsUpdate = true;
  colors.needsUpdate = true;
  index.needsUpdate = true;
  return true;
};

const createPolygonMaterial = (
  node: VizRenderPolygonNode,
  inherited: VizInheritedRenderState,
): ShaderMaterial =>
  new ShaderMaterial({
    vertexShader: polygonVertexShader,
    fragmentShader: polygonFragmentShader,
    transparent: true,
    blending: getVizThreeBlending(node.style?.blendMode ?? inherited.blendMode),
    depthTest: false,
    depthWrite: false,
  });

const convertPolygonToMesh = (
  node: VizRenderPolygonNode,
  inherited: VizInheritedRenderState,
  viewportWidth: number,
  viewportHeight: number,
): Mesh => {
  const mesh = new Mesh(
    createPolygonGeometry(node, inherited, viewportWidth, viewportHeight),
    createPolygonMaterial(node, inherited),
  );
  mesh.frustumCulled = false;
  mesh.userData = {
    ...mesh.userData,
    vizPolygon: true,
  } satisfies VizPolygonMeshUserData;
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
}): Line | Line2 => {
  const resolvedColor = resolveVizThreeCssColor(color);
  const finalOpacity = clampOpacity(
    inherited.opacity * opacity * resolvedColor.opacity,
  );
  const positions = node.points.flatMap((point) => [
    point.x - viewportWidth / 2,
    viewportHeight / 2 - point.y,
    0,
  ]);
  if (width <= 1) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const line = new Line(
      geometry,
      new LineBasicMaterial({
        color: new Color(resolvedColor.value),
        opacity: finalOpacity,
        transparent: finalOpacity < 1,
        blending: getVizThreeBlending(
          node.style?.blendMode ?? inherited.blendMode,
        ),
        depthTest: false,
        depthWrite: false,
      }),
    );
    line.frustumCulled = false;
    return line;
  }

  const geometry = new LineGeometry();
  geometry.setPositions(positions);
  const material = new LineMaterial({
    color: new Color(resolvedColor.value).getHex(),
    linewidth: Math.max(0.01, width),
    opacity: finalOpacity,
    transparent: finalOpacity < 1,
    blending: getVizThreeBlending(node.style?.blendMode ?? inherited.blendMode),
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

  const stroke = node.style?.stroke ?? node.style?.fill ?? '#ffffff';
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
  const material = createMaterial(finalStyle, '#ffffff', {
    transparent: true,
  });
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
    node.anchor === 'middle'
      ? node.x - width / 2
      : node.anchor === 'end'
        ? node.x - width
        : node.x;
  const y =
    node.baseline === 'middle'
      ? node.y - height / 2
      : node.baseline === 'bottom' || node.baseline === 'alphabetic'
        ? node.y - height
        : node.y;

  return { x, y };
};

const drawTextCanvas = (
  canvas: HTMLCanvasElement,
  node: VizRenderTextNode,
): { width: number; height: number } | undefined => {
  const context = canvas.getContext('2d');
  if (!context) {
    return undefined;
  }

  const fontSize = Math.max(1, node.fontSize);
  const fontFamily = node.fontFamily ?? 'sans-serif';
  const fontWeight = node.fontWeight ?? 'normal';
  const textureScale = 2;
  const font = `${fontWeight} ${fontSize * textureScale}px ${fontFamily}`;
  context.font = font;
  const measuredWidth = Math.ceil(context.measureText(node.text).width);
  const textureWidth = Math.max(2, measuredWidth + 4 * textureScale);
  const textureHeight = Math.max(2, Math.ceil(fontSize * 1.45 * textureScale));
  canvas.width = textureWidth;
  canvas.height = textureHeight;

  context.clearRect(0, 0, textureWidth, textureHeight);
  context.font = font;
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillStyle = resolveVizThreeCssColor(
    node.style?.fill ?? '#ffffff',
  ).value;
  context.fillText(node.text, 2 * textureScale, textureHeight / 2);
  return {
    width: textureWidth / textureScale,
    height: textureHeight / textureScale,
  };
};

const createTextTextureKey = (node: VizRenderTextNode): string =>
  JSON.stringify([
    node.text,
    node.fontSize,
    node.fontFamily,
    node.fontWeight,
    node.style?.fill,
  ]);

const convertTextToObject = (
  node: VizRenderTextNode,
  inherited: VizInheritedRenderState,
  viewportWidth: number,
  viewportHeight: number,
): Group | Mesh => {
  if (typeof document === 'undefined') {
    const placeholder = new Group();
    placeholder.userData = {
      ...placeholder.userData,
      vizText: node.text,
    };
    return placeholder;
  }

  const canvas = document.createElement('canvas');
  const dimensions = drawTextCanvas(canvas, node);
  if (!dimensions) {
    return new Group();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;

  const { width, height } = dimensions;
  const finalStyle = mergeRenderableStyle(inherited, node.style);
  const material = createMaterial(finalStyle, '#ffffff', {
    color: new Color('#ffffff'),
    map: texture,
    transparent: true,
  });
  const mesh = new Mesh(new PlaneGeometry(width, height), material);
  const origin = getTextOrigin(node, width, height);
  mesh.position.x = origin.x + width / 2 - viewportWidth / 2;
  mesh.position.y = viewportHeight / 2 - (origin.y + height / 2);
  mesh.userData = {
    ...mesh.userData,
    vizTextCanvas: canvas,
    vizOwnedTexture: texture,
    vizTextTextureKey: createTextTextureKey(node),
  } satisfies VizTextMeshUserData;
  return mesh;
};

const convertShaderUniformValue = (
  value: VizShaderUniformValue,
): number | boolean | Color | Vector2 | Vector3 | Vector4 => {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value.type === 'color') {
    return new Color(value.value);
  }

  if (value.type === 'vec2') {
    return new Vector2(...value.value);
  }

  if (value.type === 'vec3') {
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
    blending: getVizThreeBlending(node.blendMode),
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new Mesh(new PlaneGeometry(node.width, node.height), material);
  mesh.position.x = node.x + node.width / 2 - viewportWidth / 2;
  mesh.position.y = viewportHeight / 2 - (node.y + node.height / 2);
  mesh.userData = {
    ...mesh.userData,
    vizShaderProgramId: node.programId,
  } satisfies VizShaderMeshUserData;
  return mesh;
};

export const createVizThreePortableNodeObject = (
  node: VizRenderNode,
  inherited: VizInheritedRenderState,
  viewportWidth: number,
  viewportHeight: number,
): VizThreePortableObject => {
  if (node.kind === 'rect') {
    return convertRectToMesh(node, inherited, viewportWidth, viewportHeight);
  }

  if (node.kind === 'circle') {
    return convertCircleToMesh(node, inherited, viewportWidth, viewportHeight);
  }

  if (node.kind === 'point-cloud') {
    return convertPointCloudToPoints(
      node,
      inherited,
      viewportWidth,
      viewportHeight,
    );
  }

  if (node.kind === 'polygon') {
    return convertPolygonToMesh(node, inherited, viewportWidth, viewportHeight);
  }

  if (node.kind === 'polyline') {
    return convertPolylineToObject(
      node,
      inherited,
      viewportWidth,
      viewportHeight,
    );
  }

  if (node.kind === 'image') {
    return convertImageToMesh(node, inherited, viewportWidth, viewportHeight);
  }

  if (node.kind === 'text') {
    return convertTextToObject(node, inherited, viewportWidth, viewportHeight);
  }

  if (node.kind === 'shader') {
    return convertShaderToMesh(node, viewportWidth, viewportHeight);
  }

  if (node.kind === 'three-program') {
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
    group.add(
      createVizThreePortableNodeObject(
        child,
        nextInherited,
        viewportWidth,
        viewportHeight,
      ),
    );
  }

  return group;
};

export const disposeVizThreeObject = (object: VizThreePortableObject): void => {
  const ownedTexture = object.userData.vizOwnedTexture;
  if (ownedTexture instanceof Texture) {
    ownedTexture.dispose();
  }

  if ('geometry' in object) {
    object.geometry.dispose();
  }

  if ('material' in object) {
    const material = object.material;

    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
    } else {
      material.dispose();
    }
  }

  for (const child of [...object.children]) {
    disposeVizThreeObject(child as VizThreePortableObject);
  }
};

export const clearVizThreeObjectChildren = (rootGroup: Group): void => {
  for (const child of [...rootGroup.children]) {
    disposeVizThreeObject(child as VizThreePortableObject);
    rootGroup.remove(child);
  }
};

const updateShaderUniformValue = (
  currentValue: unknown,
  nextValue: VizShaderUniformValue,
): unknown => {
  if (typeof nextValue === 'number' || typeof nextValue === 'boolean') {
    return nextValue;
  }

  if (nextValue.type === 'color' && currentValue instanceof Color) {
    currentValue.set(nextValue.value);
    return currentValue;
  }

  if (nextValue.type === 'vec2' && currentValue instanceof Vector2) {
    currentValue.set(...nextValue.value);
    return currentValue;
  }

  if (nextValue.type === 'vec3' && currentValue instanceof Vector3) {
    currentValue.set(...nextValue.value);
    return currentValue;
  }

  if (nextValue.type === 'vec4' && currentValue instanceof Vector4) {
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
  material.blending = getVizThreeBlending(node.blendMode);

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
  mesh.position.y = viewportHeight / 2 - (node.y + node.height / 2);
  return true;
};

const updateMaterialStyle = (
  material: LineBasicMaterial | LineMaterial | MeshBasicMaterial,
  style: VizRenderStyle,
  fallbackColor: string,
): void => {
  const color = resolveVizThreeCssColor(
    style.fill ?? style.stroke ?? fallbackColor,
  );
  material.color.set(color.value);
  material.opacity = clampOpacity((style.opacity ?? 1) * color.opacity);
  material.transparent = material.opacity < 1;
  material.blending = getVizThreeBlending(style.blendMode);
};

const updatePlaneGeometry = (
  mesh: Mesh,
  width: number,
  height: number,
): void => {
  const geometry = mesh.geometry as PlaneGeometry;
  if (
    geometry.parameters.width !== width ||
    geometry.parameters.height !== height
  ) {
    geometry.dispose();
    mesh.geometry = new PlaneGeometry(width, height);
  }
};

const updateRectObject = (
  object: Group | Mesh,
  node: VizRenderRectNode,
  inherited: VizInheritedRenderState,
  viewportWidth: number,
  viewportHeight: number,
): boolean => {
  const finalStyle = mergeRenderableStyle(inherited, node.style);
  const hasFill =
    typeof finalStyle.fill === 'string' && finalStyle.fill.length > 0;
  const hasStroke =
    typeof finalStyle.stroke === 'string' && (finalStyle.strokeWidth ?? 0) > 0;

  if (object instanceof Mesh) {
    if (!hasFill || hasStroke) {
      return false;
    }
    updatePlaneGeometry(object, node.width, node.height);
    object.position.x = node.x + node.width / 2 - viewportWidth / 2;
    object.position.y = viewportHeight / 2 - (node.y + node.height / 2);
    updateMaterialStyle(
      object.material as MeshBasicMaterial,
      finalStyle,
      '#ffffff',
    );
    return true;
  }

  const expectedCount = (hasFill ? 1 : 0) + (hasStroke ? 4 : 0);
  if (
    expectedCount === 0 ||
    object.children.length !== expectedCount ||
    !object.children.every((child) => child instanceof Mesh)
  ) {
    return false;
  }

  let childIndex = 0;
  if (hasFill) {
    const fill = object.children[childIndex++] as Mesh;
    updatePlaneGeometry(fill, node.width, node.height);
    fill.position.x = node.x + node.width / 2 - viewportWidth / 2;
    fill.position.y = viewportHeight / 2 - (node.y + node.height / 2);
    updateMaterialStyle(
      fill.material as MeshBasicMaterial,
      finalStyle,
      '#ffffff',
    );
  }
  if (!hasStroke) {
    return true;
  }

  const strokeWidth = finalStyle.strokeWidth!;
  const strokeColor = finalStyle.stroke!;
  const halfStroke = strokeWidth / 2;
  const horizontalWidth = Math.max(node.width + strokeWidth, strokeWidth);
  const verticalHeight = Math.max(node.height - strokeWidth, 0);
  const strokeStyle: VizRenderStyle = {
    fill: strokeColor,
    ...(finalStyle.opacity === undefined
      ? {}
      : { opacity: finalStyle.opacity }),
    ...(finalStyle.blendMode === undefined
      ? {}
      : { blendMode: finalStyle.blendMode }),
  };
  const placements = [
    {
      width: horizontalWidth,
      height: strokeWidth,
      x: node.x + node.width / 2 - viewportWidth / 2,
      y: viewportHeight / 2 - (node.y - halfStroke),
    },
    {
      width: horizontalWidth,
      height: strokeWidth,
      x: node.x + node.width / 2 - viewportWidth / 2,
      y: viewportHeight / 2 - (node.y + node.height + halfStroke),
    },
    {
      width: strokeWidth,
      height: verticalHeight,
      x: node.x - halfStroke - viewportWidth / 2,
      y: viewportHeight / 2 - (node.y + node.height / 2),
    },
    {
      width: strokeWidth,
      height: verticalHeight,
      x: node.x + node.width + halfStroke - viewportWidth / 2,
      y: viewportHeight / 2 - (node.y + node.height / 2),
    },
  ];
  placements.forEach((placement, index) => {
    const stroke = object.children[childIndex + index] as Mesh;
    updatePlaneGeometry(stroke, placement.width, placement.height);
    stroke.position.set(placement.x, placement.y, stroke.position.z);
    updateMaterialStyle(
      stroke.material as MeshBasicMaterial,
      strokeStyle,
      strokeColor,
    );
  });
  return true;
};

const updateCircleObject = (
  object: Group | Mesh,
  node: VizRenderCircleNode,
  inherited: VizInheritedRenderState,
  viewportWidth: number,
  viewportHeight: number,
): boolean => {
  if (!(object instanceof Mesh)) {
    return false;
  }
  const geometry = object.geometry as CircleGeometry;
  if (geometry.parameters.radius !== node.r) {
    geometry.dispose();
    object.geometry = new CircleGeometry(node.r, 48);
  }
  object.position.x = node.cx - viewportWidth / 2;
  object.position.y = viewportHeight / 2 - node.cy;
  updateMaterialStyle(
    object.material as MeshBasicMaterial,
    mergeRenderableStyle(inherited, node.style),
    '#ffffff',
  );
  return true;
};

const updatePointCloudObject = (
  object: VizThreePortableObject,
  node: VizRenderPointCloudNode,
  inherited: VizInheritedRenderState,
  viewportWidth: number,
  viewportHeight: number,
): boolean => {
  if (
    !(object instanceof Points) ||
    object.userData.vizPointCloud !== true ||
    !(object.material instanceof ShaderMaterial) ||
    object.geometry.getAttribute('position').count < node.points.length
  ) {
    return false;
  }
  updatePointCloudPositions(object, node, viewportWidth, viewportHeight);
  updatePointCloudMaterial(object.material, node, inherited);
  return true;
};

const updateImageObject = (
  object: Group | Mesh,
  node: VizRenderImageNode,
  inherited: VizInheritedRenderState,
  viewportWidth: number,
  viewportHeight: number,
): boolean => {
  if (!(object instanceof Mesh)) {
    return false;
  }
  updatePlaneGeometry(object, node.width, node.height);
  object.position.x = node.x + node.width / 2 - viewportWidth / 2;
  object.position.y = viewportHeight / 2 - (node.y + node.height / 2);
  const material = object.material as MeshBasicMaterial;
  updateMaterialStyle(
    material,
    mergeRenderableStyle(inherited, node.style),
    '#ffffff',
  );
  const userData = object.userData as VizImageMeshUserData;
  if (userData.vizImageAssetId !== node.assetId) {
    userData.vizImageAssetId = node.assetId;
    material.map = null;
    material.needsUpdate = true;
  }
  return true;
};

const updateTextObject = (
  object: Group | Mesh,
  node: VizRenderTextNode,
  inherited: VizInheritedRenderState,
  viewportWidth: number,
  viewportHeight: number,
): boolean => {
  if (!(object instanceof Mesh)) {
    return false;
  }
  const userData = object.userData as VizTextMeshUserData;
  const canvas = userData.vizTextCanvas;
  const texture = userData.vizOwnedTexture;
  if (!canvas || !texture) {
    return false;
  }
  const textureKey = createTextTextureKey(node);
  let dimensions: { width: number; height: number };
  if (userData.vizTextTextureKey === textureKey) {
    const geometry = object.geometry as PlaneGeometry;
    dimensions = {
      width: geometry.parameters.width,
      height: geometry.parameters.height,
    };
  } else {
    const nextDimensions = drawTextCanvas(canvas, node);
    if (!nextDimensions) {
      return false;
    }
    dimensions = nextDimensions;
    texture.needsUpdate = true;
    updatePlaneGeometry(object, dimensions.width, dimensions.height);
    userData.vizTextTextureKey = textureKey;
  }
  const origin = getTextOrigin(node, dimensions.width, dimensions.height);
  object.position.x = origin.x + dimensions.width / 2 - viewportWidth / 2;
  object.position.y = viewportHeight / 2 - (origin.y + dimensions.height / 2);
  const style = mergeRenderableStyle(inherited, node.style);
  const material = object.material as MeshBasicMaterial;
  const color = resolveVizThreeCssColor(node.style?.fill ?? '#ffffff');
  material.color.set('#ffffff');
  material.opacity = clampOpacity((style.opacity ?? 1) * color.opacity);
  material.transparent = material.opacity < 1;
  material.blending = getVizThreeBlending(style.blendMode);
  return true;
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

const updateNativeLinePositions = (
  line: Line,
  node: VizRenderPolylineNode,
  viewportWidth: number,
  viewportHeight: number,
): boolean => {
  const positions = line.geometry.getAttribute('position');
  if (
    !(positions instanceof Float32BufferAttribute) ||
    positions.count !== node.points.length
  ) {
    return false;
  }
  node.points.forEach((point, index) => {
    positions.setXYZ(
      index,
      point.x - viewportWidth / 2,
      viewportHeight / 2 - point.y,
      0,
    );
  });
  positions.needsUpdate = true;
  return true;
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

  if (!userData.vizPolyline || object.children.length !== expectedLineCount) {
    return false;
  }

  if (expectedLineCount === 0) {
    return true;
  }

  const stroke = node.style?.stroke ?? node.style?.fill ?? '#ffffff';
  const strokeWidth = Math.max(0.01, node.style?.strokeWidth ?? 1);
  const coreLine = object.children.at(-1);

  const coreStyle = mergeRenderableStyle(inherited, {
    ...node.style,
    fill: stroke,
  });
  if (coreLine instanceof Line2) {
    if (strokeWidth <= 1) {
      return false;
    }
    updateLinePositions(coreLine, node, viewportWidth, viewportHeight);
    updateMaterialStyle(coreLine.material as LineMaterial, coreStyle, stroke);
    (coreLine.material as LineMaterial).linewidth = strokeWidth;
    (coreLine.material as LineMaterial).resolution.set(
      viewportWidth,
      viewportHeight,
    );
  } else if (coreLine instanceof Line) {
    if (
      strokeWidth > 1 ||
      !updateNativeLinePositions(coreLine, node, viewportWidth, viewportHeight)
    ) {
      return false;
    }
    updateMaterialStyle(
      coreLine.material as LineBasicMaterial,
      coreStyle,
      stroke,
    );
  } else {
    return false;
  }

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

const updatePolygonMesh = (
  mesh: Mesh,
  node: VizRenderPolygonNode,
  inherited: VizInheritedRenderState,
  viewportWidth: number,
  viewportHeight: number,
): boolean => {
  if (
    mesh.userData.vizPolygon !== true ||
    !(mesh.material instanceof ShaderMaterial)
  ) {
    return false;
  }

  if (
    updatePolygonGeometry(
      mesh.geometry,
      node,
      inherited,
      viewportWidth,
      viewportHeight,
    )
  ) {
    mesh.material.blending = getVizThreeBlending(
      node.style?.blendMode ?? inherited.blendMode,
    );
    return true;
  }

  const previousGeometry = mesh.geometry;
  mesh.geometry = createPolygonGeometry(
    node,
    inherited,
    viewportWidth,
    viewportHeight,
  );
  previousGeometry.dispose();
  mesh.material.blending = getVizThreeBlending(
    node.style?.blendMode ?? inherited.blendMode,
  );
  mesh.material.needsUpdate = true;
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

export const updateVizThreePortableNodeObject = (
  object: VizThreePortableObject,
  previousNode: VizRenderNode,
  nextNode: VizRenderNode,
  inherited: VizInheritedRenderState,
  viewportWidth: number,
  viewportHeight: number,
): boolean => {
  if (previousNode.kind !== nextNode.kind) {
    return false;
  }

  if (nextNode.kind === 'shader' && previousNode.kind === 'shader') {
    return (
      object instanceof Mesh &&
      updateShaderMesh(object, nextNode, viewportWidth, viewportHeight)
    );
  }

  if (nextNode.kind === 'polyline') {
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

  if (nextNode.kind === 'polygon') {
    return (
      object instanceof Mesh &&
      updatePolygonMesh(
        object,
        nextNode,
        inherited,
        viewportWidth,
        viewportHeight,
      )
    );
  }

  if (nextNode.kind === 'rect' && previousNode.kind === 'rect') {
    return (
      (object instanceof Group || object instanceof Mesh) &&
      updateRectObject(
        object,
        nextNode,
        inherited,
        viewportWidth,
        viewportHeight,
      )
    );
  }

  if (nextNode.kind === 'circle' && previousNode.kind === 'circle') {
    return (
      (object instanceof Group || object instanceof Mesh) &&
      updateCircleObject(
        object,
        nextNode,
        inherited,
        viewportWidth,
        viewportHeight,
      )
    );
  }

  if (nextNode.kind === 'point-cloud' && previousNode.kind === 'point-cloud') {
    return updatePointCloudObject(
      object,
      nextNode,
      inherited,
      viewportWidth,
      viewportHeight,
    );
  }

  if (nextNode.kind === 'image' && previousNode.kind === 'image') {
    return (
      (object instanceof Group || object instanceof Mesh) &&
      updateImageObject(
        object,
        nextNode,
        inherited,
        viewportWidth,
        viewportHeight,
      )
    );
  }

  if (nextNode.kind === 'text' && previousNode.kind === 'text') {
    return (
      (object instanceof Group || object instanceof Mesh) &&
      updateTextObject(
        object,
        nextNode,
        inherited,
        viewportWidth,
        viewportHeight,
      )
    );
  }

  if (nextNode.kind === 'group' && previousNode.kind === 'group') {
    if (
      !(object instanceof Group) ||
      object.children.length !== nextNode.children.length
    ) {
      return false;
    }

    resetAndApplyTransform(object, nextNode.transform);
    const nextInherited = composeInheritedRenderState(
      inherited,
      nextNode.style,
    );

    return nextNode.children.every((child, index) => {
      const previousChild = previousNode.children[index];
      const childObject = object.children[index];
      return (
        previousChild !== undefined &&
        (childObject instanceof Group ||
          childObject instanceof Mesh ||
          childObject instanceof Points) &&
        updateVizThreePortableNodeObject(
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
