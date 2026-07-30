import type { VizRenderThreeProgramNode } from '@viz-engine/contracts';
import {
  BoxGeometry,
  Color,
  DynamicDrawUsage,
  FogExp2,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Scene,
  SphereGeometry,
  Vector2,
  type InterleavedBufferAttribute,
  type WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import {
  createVizThreePostProcessingPipeline,
  type VizThreePostProcessingSettings,
} from './post-processing.js';
import {
  asBoolean,
  asNumber,
  asNonEmptyString as asString,
  assertProgram,
  hashString,
} from './program-input.js';
import type { VizThreeProgramFactory } from './types.js';

const PROGRAM_ID = 'viz-core/light-tunnel/v1';
const MAX_TUNNEL_DEPTH = 40;
const CUBES_PER_RING = 8;
const MAX_CUBE_COUNT = MAX_TUNNEL_DEPTH * CUBES_PER_RING;
const SEGMENTS_PER_CUBE = 12;
const MAX_SEGMENT_COUNT = MAX_CUBE_COUNT * SEGMENTS_PER_CUBE;
const MAX_LIGHT_COUNT = 16;

const GRID_POSITIONS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
] as const;

const CENTER_DIRECTIONS = new Map<number, readonly [number, number]>([
  [1, [0, -1]],
  [3, [1, 0]],
  [5, [0, 1]],
  [7, [-1, 0]],
]);

const CUBE_CORNERS = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
] as const;

const CUBE_EDGES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
] as const;

const asStringArray = (
  value: unknown,
  fallback: readonly string[],
): string[] => {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const result = value.filter(
    (entry): entry is string => typeof entry === 'string' && entry.length > 0,
  );
  return result.length > 0 ? result : [...fallback];
};

const asNumberArray = (value: unknown): number[] =>
  Array.isArray(value)
    ? value.filter(
        (entry): entry is number =>
          typeof entry === 'number' && Number.isFinite(entry),
      )
    : [];

const easeInOutCubic = (value: number): number =>
  value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;

const resolveCubeColor = ({
  colorMode,
  edgeColor,
  palette,
  seed,
  sourceRing,
  cubeIndex,
}: {
  colorMode: string;
  edgeColor: string;
  palette: readonly string[];
  seed: string;
  sourceRing: number;
  cubeIndex: number;
}): string => {
  if (colorMode === 'Single' || palette.length === 0) {
    return edgeColor;
  }

  if (colorMode === 'Random') {
    const hash = hashString(`${seed}:${sourceRing}:${cubeIndex}`);
    return palette[hash % palette.length] ?? edgeColor;
  }

  if (colorMode === 'Spiral') {
    return palette[(sourceRing + cubeIndex) % palette.length] ?? edgeColor;
  }

  if (colorMode === 'Depth') {
    return palette[sourceRing % palette.length] ?? edgeColor;
  }

  return palette[cubeIndex % palette.length] ?? edgeColor;
};

const resolveWaveDisplacement = ({
  activeWaveAges,
  logicalRing,
  waveSpeed,
  waveDuration,
  waveAmplitude,
}: {
  activeWaveAges: readonly number[];
  logicalRing: number;
  waveSpeed: number;
  waveDuration: number;
  waveAmplitude: number;
}): number => {
  let displacement = 0;
  const ringDelay = logicalRing / waveSpeed;

  for (const waveAge of activeWaveAges) {
    const localTime = waveAge - ringDelay;
    if (localTime < 0 || localTime > waveDuration) {
      continue;
    }

    const progress = localTime / waveDuration;
    displacement +=
      Math.sin(easeInOutCubic(progress) * Math.PI) * waveAmplitude;
  }

  return displacement;
};

const readPostProcessingSettings = (
  parameters: Readonly<Record<string, unknown>>,
): VizThreePostProcessingSettings => ({
  bloomEnabled: asBoolean(parameters.bloomEnabled, true),
  bloomStrength: Math.max(0, asNumber(parameters.bloomStrength, 0.5)),
  bloomRadius: Math.max(0, asNumber(parameters.bloomRadius, 0.8)),
  bloomThreshold: Math.max(0, asNumber(parameters.bloomThreshold, 0.1)),
  depthOfFieldEnabled: asBoolean(parameters.depthOfFieldEnabled, false),
  depthOfFieldFocus: Math.max(0, asNumber(parameters.depthOfFieldFocus, 1)),
  depthOfFieldAperture: Math.max(
    0,
    asNumber(parameters.depthOfFieldAperture, 0.0011),
  ),
  depthOfFieldMaxBlur: 0.01,
});

export const createLightTunnelProgram: VizThreeProgramFactory = ({
  node,
  width,
  height,
}) => {
  assertProgram(node, PROGRAM_ID, 'Light Tunnel');

  const scene = new Scene();
  scene.fog = new FogExp2('#000000', 0.095);
  const root = new Group();
  const camera = new PerspectiveCamera(
    75,
    width / Math.max(height, 1),
    0.1,
    1000,
  );
  camera.position.set(0, 0, 0);
  camera.lookAt(0, 0, -1);

  const edgePositions = new Float32Array(MAX_SEGMENT_COUNT * 6);
  const edgeColors = new Float32Array(MAX_SEGMENT_COUNT * 6);
  const edgeGeometry = new LineSegmentsGeometry();
  edgeGeometry.setPositions(edgePositions);
  edgeGeometry.setColors(edgeColors);
  edgeGeometry.instanceCount = 0;
  const edgeMaterial = new LineMaterial({
    color: '#ffffff',
    linewidth: 5.5,
    resolution: new Vector2(width, height),
    vertexColors: true,
  });
  const edgeLines = new LineSegments2(edgeGeometry, edgeMaterial);
  edgeLines.frustumCulled = false;

  const solidGeometry = new BoxGeometry(1, 1, 1);
  const solidMaterial = new MeshStandardMaterial({
    color: '#0a0a0a',
    metalness: 0.7,
    roughness: 0.77,
  });
  const solidCubes = new InstancedMesh(
    solidGeometry,
    solidMaterial,
    MAX_CUBE_COUNT,
  );
  solidCubes.instanceMatrix.setUsage(DynamicDrawUsage);
  solidCubes.frustumCulled = false;

  const lightCircle = new Group();
  const helperGeometry = new SphereGeometry(0.05, 8, 8);
  const helperMaterials: MeshBasicMaterial[] = [];
  const lights: PointLight[] = [];
  const helpers: Mesh[] = [];
  for (let index = 0; index < MAX_LIGHT_COUNT; index += 1) {
    const light = new PointLight('#ffffff', 0, 100);
    const helperMaterial = new MeshBasicMaterial({ color: '#ffffff' });
    const helper = new Mesh(helperGeometry, helperMaterial);
    helper.visible = false;
    lightCircle.add(light, helper);
    lights.push(light);
    helpers.push(helper);
    helperMaterials.push(helperMaterial);
  }

  root.add(edgeLines, solidCubes, lightCircle);
  root.userData.edgeLines = edgeLines;
  root.userData.solidCubes = solidCubes;
  root.userData.lightCircle = lightCircle;
  scene.add(root);

  const postProcessing = createVizThreePostProcessingPipeline({
    scene,
    camera,
    width,
    height,
    settings: readPostProcessingSettings(node.parameters),
  });
  const instanceMatrix = new Matrix4();
  const edgeColor = new Color();
  const emissiveColor = new Color();

  const update = (nextNode: VizRenderThreeProgramNode): void => {
    assertProgram(nextNode, PROGRAM_ID, 'Light Tunnel');
    const parameters = nextNode.parameters;
    const time = Math.max(0, asNumber(parameters.time, 0));
    const seed = asString(parameters.seed, 'light-tunnel');
    const cubeSize = Math.max(0.01, asNumber(parameters.cubeSize, 2.5));
    const spacing = Math.max(0, asNumber(parameters.spacing, 1.3));
    const ringSpacing = cubeSize + spacing;
    const tunnelDepth = Math.min(
      MAX_TUNNEL_DEPTH,
      Math.max(1, Math.round(asNumber(parameters.tunnelDepth, 13))),
    );
    const renderMode = asString(parameters.renderMode, 'Solid');
    const colorMode = asString(parameters.colorMode, 'Alternating');
    const baseEdgeColor = asString(parameters.edgeColor, '#00FFFF');
    const colorPalette = asStringArray(parameters.colorPalette, [
      '#FF00FF',
      '#00FFFF',
    ]);
    const glowIntensity = Math.max(0, asNumber(parameters.glowIntensity, 1.8));
    const tunnelSpeed = Math.max(0, asNumber(parameters.tunnelSpeed, 0.5));
    const travel = time * tunnelSpeed;
    const wrapCount = ringSpacing > 0 ? Math.floor(travel / ringSpacing) : 0;
    const tunnelOffset = ringSpacing > 0 ? travel % ringSpacing : 0;
    const activeWaveAges = asNumberArray(parameters.activeWaveAges);
    const waveSpeed = Math.max(0.0001, asNumber(parameters.waveSpeed, 8.5));
    const waveDuration = Math.max(
      0.0001,
      asNumber(parameters.waveDuration, 0.4),
    );
    const waveAmplitude = Math.max(0, asNumber(parameters.waveAmplitude, 1));
    let cubeCount = 0;
    let segmentCount = 0;

    for (let logicalRing = 0; logicalRing < tunnelDepth; logicalRing += 1) {
      const sourceRing = (logicalRing + wrapCount) % tunnelDepth;
      const z = -logicalRing * ringSpacing + tunnelOffset;
      const ringWaveDisplacement = resolveWaveDisplacement({
        activeWaveAges,
        logicalRing,
        waveSpeed,
        waveDuration,
        waveAmplitude,
      });

      for (let cubeIndex = 0; cubeIndex < CUBES_PER_RING; cubeIndex += 1) {
        const gridPosition = GRID_POSITIONS[cubeIndex]!;
        const direction = CENTER_DIRECTIONS.get(cubeIndex);
        const x =
          gridPosition[0] * ringSpacing +
          (direction?.[0] ?? 0) * ringWaveDisplacement;
        const y =
          gridPosition[1] * ringSpacing +
          (direction?.[1] ?? 0) * ringWaveDisplacement;

        instanceMatrix.makeScale(cubeSize, cubeSize, cubeSize);
        instanceMatrix.setPosition(x, y, z);
        solidCubes.setMatrixAt(cubeCount, instanceMatrix);

        const resolvedColor = resolveCubeColor({
          colorMode,
          edgeColor: baseEdgeColor,
          palette: colorPalette,
          seed,
          sourceRing,
          cubeIndex,
        });
        edgeColor.set(resolvedColor).multiplyScalar(glowIntensity);
        const halfSize = cubeSize * 0.51;

        for (const [startIndex, endIndex] of CUBE_EDGES) {
          const start = CUBE_CORNERS[startIndex]!;
          const end = CUBE_CORNERS[endIndex]!;
          const offset = segmentCount * 6;
          edgePositions[offset] = x + start[0] * halfSize;
          edgePositions[offset + 1] = y + start[1] * halfSize;
          edgePositions[offset + 2] = z + start[2] * halfSize;
          edgePositions[offset + 3] = x + end[0] * halfSize;
          edgePositions[offset + 4] = y + end[1] * halfSize;
          edgePositions[offset + 5] = z + end[2] * halfSize;
          edgeColors[offset] = edgeColor.r;
          edgeColors[offset + 1] = edgeColor.g;
          edgeColors[offset + 2] = edgeColor.b;
          edgeColors[offset + 3] = edgeColor.r;
          edgeColors[offset + 4] = edgeColor.g;
          edgeColors[offset + 5] = edgeColor.b;
          segmentCount += 1;
        }
        cubeCount += 1;
      }
    }

    solidCubes.count = cubeCount;
    solidCubes.visible = renderMode === 'Solid';
    solidCubes.instanceMatrix.needsUpdate = true;
    edgeGeometry.instanceCount = segmentCount;
    (
      edgeGeometry.attributes.instanceStart as InterleavedBufferAttribute
    ).data.needsUpdate = true;
    (
      edgeGeometry.attributes.instanceColorStart as InterleavedBufferAttribute
    ).data.needsUpdate = true;
    edgeMaterial.linewidth = Math.max(
      0,
      asNumber(parameters.edgeThickness, 5.5),
    );

    solidMaterial.color.set(asString(parameters.solidCubeColor, '#0a0a0a'));
    solidMaterial.metalness = Math.max(0, asNumber(parameters.metalness, 0.7));
    solidMaterial.roughness = Math.max(0, asNumber(parameters.roughness, 0.77));
    solidMaterial.envMapIntensity = Math.max(
      0,
      asNumber(parameters.envMapIntensity, 0),
    );
    emissiveColor
      .set(asString(parameters.solidEmissiveColor, 'rgb(0, 0, 0)'))
      .multiplyScalar(
        Math.max(0, asNumber(parameters.solidEmissiveIntensity, 0)),
      );
    solidMaterial.emissive.copy(emissiveColor);

    const lightsEnabled =
      renderMode === 'Solid' && asBoolean(parameters.enableLights, true);
    const lightCount = Math.min(
      MAX_LIGHT_COUNT,
      Math.max(0, Math.round(asNumber(parameters.lightCount, 6))),
    );
    const lightRadius = Math.max(0, asNumber(parameters.lightCircleRadius, 7));
    const lightIntensity = Math.max(
      0,
      asNumber(parameters.lightIntensity, 100),
    );
    const lightDistance = Math.max(0, asNumber(parameters.lightDistance, 100));
    lightCircle.position.z = -Math.max(
      0,
      asNumber(parameters.lightCircleDistance, 7),
    );
    lightCircle.rotation.z =
      -time * Math.max(0, asNumber(parameters.lightRotationSpeed, 0.15));

    for (let index = 0; index < MAX_LIGHT_COUNT; index += 1) {
      const light = lights[index]!;
      const helper = helpers[index]!;
      const visible = lightsEnabled && index < lightCount;
      light.visible = visible;
      helper.visible = false;
      if (!visible) {
        continue;
      }

      const angle = (index / lightCount) * Math.PI * 2;
      const x = Math.cos(angle) * lightRadius;
      const y = Math.sin(angle) * lightRadius;
      const color =
        colorMode === 'Single'
          ? baseEdgeColor
          : (colorPalette[index % colorPalette.length] ?? baseEdgeColor);
      light.position.set(x, y, 0);
      light.color.set(color);
      light.intensity = lightIntensity;
      light.distance = lightDistance;
      helper.position.copy(light.position);
      (helper.material as MeshBasicMaterial).color.set(color);
    }

    root.rotation.z =
      time * Math.max(0, asNumber(parameters.rotationSpeed, 0.05));
    if (scene.fog instanceof FogExp2) {
      scene.fog.density = Math.max(0, asNumber(parameters.fogDensity, 0.095));
    }
    postProcessing.update(readPostProcessingSettings(parameters));
  };

  update(node);

  return {
    programId: PROGRAM_ID,
    scene,
    camera,
    root,
    update,
    resize(nextWidth, nextHeight) {
      camera.aspect = nextWidth / Math.max(nextHeight, 1);
      camera.updateProjectionMatrix();
      edgeMaterial.resolution.set(nextWidth, nextHeight);
      postProcessing.resize(nextWidth, nextHeight);
    },
    render(renderer: WebGLRenderer, renderTarget: WebGLRenderTarget) {
      postProcessing.render(renderer, renderTarget);
    },
    dispose() {
      postProcessing.dispose();
      edgeGeometry.dispose();
      edgeMaterial.dispose();
      solidGeometry.dispose();
      solidMaterial.dispose();
      helperGeometry.dispose();
      for (const material of helperMaterials) {
        material.dispose();
      }
      root.clear();
      scene.clear();
    },
  };
};
