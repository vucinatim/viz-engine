import type {
  VizMaterializedAsset,
  VizMaterializedBinaryAsset,
  VizMaterializedModelAsset,
  VizRenderThreeProgramNode,
} from '@viz-engine/contracts';
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  DynamicDrawUsage,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NormalBlending,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  Vector3,
  type WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';
import helvetikerRegular from 'three/examples/fonts/helvetiker_regular.typeface.json' with { type: 'json' };
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import {
  FontLoader,
  type FontData,
} from 'three/examples/jsm/loaders/FontLoader.js';
import {
  GLTFLoader,
  type GLTF,
} from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TTFLoader } from 'three/examples/jsm/loaders/TTFLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import {
  asBoolean,
  asNumber,
  asRecord,
  asString,
  assertProgram,
  hashString,
} from './program-input.js';
import type { VizThreeProgramFactory } from './types.js';

const PROGRAM_ID = 'viz-core/morph-shapes/v1';
const MAX_INSTANCE_COUNT = 60_000;

type MorphSample = readonly [number, number, number];

interface ShapeDescriptor {
  shape: string;
  modelUrl: string;
  modelAssetId: string;
  text: string;
  textSize: number;
  textDepth: number;
  textFontUrl: string;
  position: readonly [number, number, number];
  rotationDegrees: readonly [number, number, number];
}

interface DeterministicMeshSurfaceSampler extends MeshSurfaceSampler {
  setRandomGenerator(random: () => number): this;
}

const asVectorTuple = (
  value: unknown,
  fallback: readonly [number, number, number],
): [number, number, number] => {
  if (!Array.isArray(value)) {
    return [...fallback];
  }
  return [
    asNumber(value[0], fallback[0]),
    asNumber(value[1], fallback[1]),
    asNumber(value[2], fallback[2]),
  ];
};

const asQuaternionTuple = (
  value: unknown,
): [number, number, number, number] => {
  if (!Array.isArray(value)) {
    return [0, 0, 0, 1];
  }
  return [
    asNumber(value[0], 0),
    asNumber(value[1], 0),
    asNumber(value[2], 0),
    asNumber(value[3], 1),
  ];
};

const asMorphHistory = (value: unknown): MorphSample[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!Array.isArray(entry)) {
      return [];
    }
    return [
      [
        asNumber(entry[0], 0),
        asNumber(entry[1], 0),
        asNumber(entry[2], 0.08),
      ] satisfies MorphSample,
    ];
  });
};

const readShapeDescriptor = (
  value: unknown,
  fallbackShape: string,
): ShapeDescriptor => {
  const shape = asRecord(value);
  return {
    shape: asString(shape.shape, fallbackShape),
    modelUrl: asString(shape.modelUrl, ''),
    modelAssetId: asString(shape.modelAssetId, ''),
    text: asString(shape.text, ''),
    textSize: Math.max(0.1, asNumber(shape.textSize, 1)),
    textDepth: Math.max(0.01, asNumber(shape.textDepth, 0.2)),
    textFontUrl: asString(shape.textFontUrl, ''),
    position: asVectorTuple(shape.position, [0, 0, 0]),
    rotationDegrees: asVectorTuple(shape.rotationDegrees, [0, 0, 0]),
  };
};

const createSeededRandom = (seed: string): (() => number) => {
  let state = hashString(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const generateCubeFramePositions = (gridSize: number): Vector3[] => {
  const positions: Vector3[] = [];
  const size = Math.max(3, gridSize);
  const half = (size - 1) / 2;
  for (let x = 0; x < size; x += 1) {
    for (let y = 0; y < size; y += 1) {
      for (let z = 0; z < size; z += 1) {
        const boundaryCount =
          Number(x === 0 || x === size - 1) +
          Number(y === 0 || y === size - 1) +
          Number(z === 0 || z === size - 1);
        if (boundaryCount < 2) {
          continue;
        }
        positions.push(
          new Vector3(
            (x - half) * (3 / 5),
            (y - half) * (3 / 5),
            (z - half) * (3 / 5),
          ),
        );
      }
    }
  }
  return positions;
};

const generatePyramidPositions = (gridSize: number): Vector3[] => {
  const positions: Vector3[] = [];
  const size = Math.max(3, gridSize);
  const half = (size - 1) / 2;
  const height = size * (3 / 5) * 0.8;

  for (let x = 0; x < size; x += 1) {
    for (let y = 0; y < size; y += 1) {
      if (x === 0 || x === size - 1 || y === 0 || y === size - 1) {
        positions.push(
          new Vector3((x - half) * (3 / 5), (y - half) * (3 / 5), -height),
        );
      }
    }
  }

  const corners = [
    new Vector3(-half * (3 / 5), -half * (3 / 5), -height),
    new Vector3(half * (3 / 5), -half * (3 / 5), -height),
    new Vector3(half * (3 / 5), half * (3 / 5), -height),
    new Vector3(-half * (3 / 5), half * (3 / 5), -height),
  ];
  const apex = new Vector3(0, 0, height);
  for (const corner of corners) {
    for (let step = 0; step <= size; step += 1) {
      positions.push(corner.clone().lerp(apex, step / size));
    }
  }
  return positions;
};

const normalizePointCloud = (points: readonly Vector3[]): Vector3[] => {
  if (points.length === 0) {
    return [];
  }

  const bounds = new Box3();
  for (const point of points) {
    bounds.expandByPoint(point);
  }
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const scale = 1 / (Math.max(size.x, size.y, size.z) || 1);
  return points.map((point) => point.clone().sub(center).multiplyScalar(scale));
};

const blueNoiseSelect = (
  normalizedPoints: readonly Vector3[],
  count: number,
  evenness: number,
): Vector3[] => {
  if (normalizedPoints.length === 0 || count <= 0) {
    return [];
  }

  const minimumDistance = Math.max(
    0.002,
    Math.min(0.2, evenness * Math.sqrt(1 / count)),
  );
  const minimumDistanceSquared = minimumDistance * minimumDistance;
  const cells = new Map<string, number[]>();
  const selected: Vector3[] = [];

  const cellCoordinates = (point: Vector3) =>
    [
      Math.floor(point.x / minimumDistance),
      Math.floor(point.y / minimumDistance),
      Math.floor(point.z / minimumDistance),
    ] as const;

  for (
    let pointIndex = 0;
    pointIndex < normalizedPoints.length && selected.length < count;
    pointIndex += 1
  ) {
    const point = normalizedPoints[pointIndex]!;
    const [cellX, cellY, cellZ] = cellCoordinates(point);
    let accepted = true;

    for (let offsetX = -1; offsetX <= 1 && accepted; offsetX += 1) {
      for (let offsetY = -1; offsetY <= 1 && accepted; offsetY += 1) {
        for (let offsetZ = -1; offsetZ <= 1; offsetZ += 1) {
          const neighbors = cells.get(
            `${cellX + offsetX}:${cellY + offsetY}:${cellZ + offsetZ}`,
          );
          if (
            neighbors?.some(
              (index) =>
                point.distanceToSquared(selected[index]!) <
                minimumDistanceSquared,
            )
          ) {
            accepted = false;
            break;
          }
        }
      }
    }

    if (!accepted) {
      continue;
    }
    const key = `${cellX}:${cellY}:${cellZ}`;
    const cell = cells.get(key) ?? [];
    cell.push(selected.length);
    cells.set(key, cell);
    selected.push(point.clone());
  }

  for (
    let pointIndex = 0;
    pointIndex < normalizedPoints.length && selected.length < count;
    pointIndex += 1
  ) {
    selected.push(normalizedPoints[pointIndex]!.clone());
  }
  return selected;
};

const fitPointCloudToGrid = (
  points: readonly Vector3[],
  gridSize: number,
): Vector3[] => {
  const desiredSpan = (Math.max(3, gridSize) - 1) * (3 / 5);
  return points.map((point) => point.clone().multiplyScalar(desiredSpan));
};

const applyTransform = (
  points: readonly Vector3[],
  descriptor: ShapeDescriptor,
): Vector3[] => {
  const rotation = new Euler(
    (descriptor.rotationDegrees[0] * Math.PI) / 180,
    (descriptor.rotationDegrees[1] * Math.PI) / 180,
    (descriptor.rotationDegrees[2] * Math.PI) / 180,
    'XYZ',
  );
  const matrix = new Matrix4()
    .makeRotationFromEuler(rotation)
    .setPosition(
      descriptor.position[0],
      descriptor.position[1],
      descriptor.position[2],
    );
  return points.map((point) => point.clone().applyMatrix4(matrix));
};

const padToCount = (points: readonly Vector3[], count: number): Vector3[] => {
  if (points.length >= count) {
    return points.slice(0, count).map((point) => point.clone());
  }
  if (points.length === 0) {
    return Array.from({ length: count }, () => new Vector3());
  }

  return Array.from({ length: count }, (_, index) =>
    points[index % points.length]!.clone(),
  );
};

const disposeGltf = (gltf: GLTF): void => {
  gltf.scene.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }
    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      material.dispose();
    }
  });
};

const loadBinaryGltf = async ({
  asset,
  url,
}: {
  asset: VizMaterializedBinaryAsset | VizMaterializedModelAsset | undefined;
  url: string;
}): Promise<GLTF> => {
  const loader = new GLTFLoader();
  if (asset?.bytes) {
    return loader.parseAsync(asset.bytes, '');
  }
  const source =
    asset?.kind === 'model'
      ? asset.modelSourceUri
      : (asset?.binarySourceUri ?? url);
  if (!source) {
    throw new Error('Morph model source is not materialized.');
  }
  return loader.loadAsync(source);
};

const sampleModelPoints = async ({
  asset,
  url,
  desiredCount,
  evenness,
  random,
}: {
  asset: VizMaterializedBinaryAsset | VizMaterializedModelAsset | undefined;
  url: string;
  desiredCount: number;
  evenness: number;
  random: () => number;
}): Promise<Vector3[]> => {
  const gltf = await loadBinaryGltf({ asset, url });
  const mesh = (() => {
    let result: Mesh | undefined;
    gltf.scene.traverse((object) => {
      if (!result && object instanceof Mesh && object.geometry) {
        result = object;
      }
    });
    return result;
  })();

  if (!mesh) {
    disposeGltf(gltf);
    return [];
  }

  const sampler = (
    new MeshSurfaceSampler(mesh) as DeterministicMeshSurfaceSampler
  )
    .setRandomGenerator(random)
    .build();
  const candidates: Vector3[] = [];
  const sample = new Vector3();
  const oversampleCount = Math.max(desiredCount * 4, desiredCount + 1000);
  for (let index = 0; index < oversampleCount; index += 1) {
    sampler.sample(sample);
    candidates.push(sample.clone());
  }
  const result = blueNoiseSelect(
    normalizePointCloud(candidates),
    desiredCount,
    evenness,
  );
  disposeGltf(gltf);
  return result;
};

const sampleTextPoints = async ({
  descriptor,
  desiredCount,
  random,
}: {
  descriptor: ShapeDescriptor;
  desiredCount: number;
  random: () => number;
}): Promise<Vector3[]> => {
  let fontData: FontData = helvetikerRegular as unknown as FontData;
  if (descriptor.textFontUrl) {
    try {
      fontData = await new TTFLoader().loadAsync(descriptor.textFontUrl);
    } catch {
      fontData = helvetikerRegular as unknown as FontData;
    }
  }
  const font = new FontLoader().parse(fontData);
  const geometry = new TextGeometry(descriptor.text || ' ', {
    font,
    size: descriptor.textSize,
    depth: descriptor.textDepth,
    curveSegments: 8,
    bevelEnabled: false,
  });
  geometry.center();
  geometry.computeVertexNormals();
  const material = new MeshBasicMaterial();
  const mesh = new Mesh(geometry, material);
  const sampler = (
    new MeshSurfaceSampler(mesh) as DeterministicMeshSurfaceSampler
  )
    .setRandomGenerator(random)
    .build();
  const point = new Vector3();
  const points: Vector3[] = [];
  for (let index = 0; index < desiredCount; index += 1) {
    sampler.sample(point);
    points.push(point.clone());
  }
  geometry.dispose();
  material.dispose();
  return normalizePointCloud(points);
};

const createShapeKey = ({
  descriptor,
  gridSize,
  modelPointCount,
  modelEvenness,
  seed,
}: {
  descriptor: ShapeDescriptor;
  gridSize: number;
  modelPointCount: number;
  modelEvenness: number;
  seed: string;
}): string =>
  JSON.stringify({
    descriptor,
    gridSize,
    modelPointCount,
    modelEvenness,
    seed,
  });

export const createMorphShapesProgram: VizThreeProgramFactory = ({
  node,
  width,
  height,
  materializedAssets: initialMaterializedAssets,
  invalidate,
}) => {
  assertProgram(node, PROGRAM_ID, 'Morph Shapes');

  const scene = new Scene();
  scene.background = new Color(0x111111);
  const root = new Group();
  const camera = new PerspectiveCamera(
    75,
    width / Math.max(height, 1),
    0.1,
    1000,
  );
  camera.position.set(0, 0, 20);
  camera.lookAt(0, 0, 0);

  const geometry = new SphereGeometry(1, 8, 6);
  const material = new MeshStandardMaterial({ color: '#ffffff' });
  const mesh = new InstancedMesh(geometry, material, MAX_INSTANCE_COUNT);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  root.add(mesh);
  root.userData.instances = mesh;

  const directionalLight = new DirectionalLight('#ffffff', 1);
  directionalLight.position.set(-8, 10, 12);
  directionalLight.castShadow = true;
  const ambientLight = new AmbientLight('#ffffff', 0.15);
  scene.add(root, directionalLight, ambientLight);

  let materializedAssets = initialMaterializedAssets;
  const shapeCache = new Map<string, Vector3[]>();
  const pendingShapes = new Set<string>();
  const failedShapeSources = new Map<
    string,
    VizMaterializedAsset | undefined
  >();
  let targetA: Vector3[] = [];
  let targetB: Vector3[] = [];
  let targetKey = '';
  let targetsVersion = 0;
  let lastAppliedTargetsVersion = -1;
  let lastFrame: number | undefined;
  let additiveMode = false;
  let lastNode = node;
  const matrix = new Matrix4();
  const position = new Vector3();
  const pointA = new Vector3();
  const pointB = new Vector3();
  const targetPosition = new Vector3();
  const direction = new Vector3();
  const color = new Color();

  const resolveShape = ({
    descriptor,
    gridSize,
    modelPointCount,
    modelEvenness,
    seed,
  }: {
    descriptor: ShapeDescriptor;
    gridSize: number;
    modelPointCount: number;
    modelEvenness: number;
    seed: string;
  }): Vector3[] => {
    if (descriptor.shape === 'pyramid') {
      return applyTransform(generatePyramidPositions(gridSize), descriptor);
    }
    if (descriptor.shape !== 'model' && descriptor.shape !== 'custom-text') {
      return applyTransform(generateCubeFramePositions(gridSize), descriptor);
    }

    const key = createShapeKey({
      descriptor,
      gridSize,
      modelPointCount,
      modelEvenness,
      seed,
    });
    const cached = shapeCache.get(key);
    if (cached) {
      return cached;
    }

    const modelAsset = descriptor.modelAssetId
      ? materializedAssets.get(descriptor.modelAssetId)
      : undefined;
    const failedWithCurrentSource =
      failedShapeSources.has(key) && failedShapeSources.get(key) === modelAsset;

    if (!pendingShapes.has(key) && !failedWithCurrentSource) {
      pendingShapes.add(key);
      const random = createSeededRandom(key);
      const request =
        descriptor.shape === 'custom-text'
          ? sampleTextPoints({
              descriptor,
              desiredCount: modelPointCount,
              random,
            })
          : sampleModelPoints({
              asset:
                modelAsset?.kind === 'binary' || modelAsset?.kind === 'model'
                  ? modelAsset
                  : undefined,
              url: descriptor.modelUrl,
              desiredCount: modelPointCount,
              evenness: modelEvenness,
              random,
            });

      void request
        .then((points) => {
          failedShapeSources.delete(key);
          shapeCache.set(
            key,
            fitPointCloudToGrid(applyTransform(points, descriptor), gridSize),
          );
          targetsVersion += 1;
          update(lastNode, materializedAssets);
          invalidate();
        })
        .catch(() => {
          failedShapeSources.set(key, modelAsset);
        })
        .finally(() => {
          pendingShapes.delete(key);
        });
    }

    return applyTransform(generateCubeFramePositions(gridSize), descriptor);
  };

  const refreshTargets = (
    parameters: Readonly<Record<string, unknown>>,
  ): void => {
    const shapeA = readShapeDescriptor(parameters.shapeA, 'cube');
    const shapeB = readShapeDescriptor(parameters.shapeB, 'pyramid');
    const gridSize = Math.max(
      1,
      Math.min(100, Math.round(asNumber(parameters.gridSize, 5))),
    );
    const modelPointCount = Math.max(
      1,
      Math.min(
        MAX_INSTANCE_COUNT,
        Math.round(asNumber(parameters.modelPointCount, 15_000)),
      ),
    );
    const modelEvenness = Math.max(
      0.2,
      Math.min(1, asNumber(parameters.modelEvenness, 0.7)),
    );
    const seed = asString(parameters.seed, 'morph-shapes');
    const nextTargetKey = JSON.stringify({
      shapeA,
      shapeB,
      gridSize,
      modelPointCount,
      modelEvenness,
      seed,
      targetsVersion,
    });
    if (nextTargetKey === targetKey) {
      return;
    }

    targetKey = nextTargetKey;
    const pointsA = resolveShape({
      descriptor: shapeA,
      gridSize,
      modelPointCount,
      modelEvenness,
      seed: `${seed}:a`,
    });
    const pointsB = resolveShape({
      descriptor: shapeB,
      gridSize,
      modelPointCount,
      modelEvenness,
      seed: `${seed}:b`,
    });
    const activeCount = Math.min(
      MAX_INSTANCE_COUNT,
      Math.max(pointsA.length, pointsB.length),
    );
    targetA = padToCount(pointsA, activeCount);
    targetB = padToCount(pointsB, activeCount);
    root.userData.targetBounds = {
      a: targetA.reduce(
        (maximum, point) =>
          Math.max(
            maximum,
            Math.abs(point.x),
            Math.abs(point.y),
            Math.abs(point.z),
          ),
        0,
      ),
      b: targetB.reduce(
        (maximum, point) =>
          Math.max(
            maximum,
            Math.abs(point.x),
            Math.abs(point.y),
            Math.abs(point.z),
          ),
        0,
      ),
    };
  };

  const resolveTarget = (
    index: number,
    sample: MorphSample,
    output: Vector3,
  ): Vector3 => {
    const [morph, explosion] = sample;
    pointA.copy(targetA[index]!);
    pointB.copy(targetB[index]!);
    output.copy(pointA).lerp(pointB, morph);
    direction.copy(output);
    if (direction.lengthSq() <= 1e-6) {
      direction.copy(pointA);
    }
    if (direction.lengthSq() > 1e-8) {
      output.addScaledVector(direction.normalize(), explosion);
    }
    return output;
  };

  const applyFromOrigin = ({
    frame,
    currentSample,
    history,
    sphereSize,
  }: {
    frame: number;
    currentSample: MorphSample;
    history: readonly MorphSample[];
    sphereSize: number;
  }): void => {
    const activeCount = targetA.length;
    mesh.count = activeCount;

    for (let index = 0; index < activeCount; index += 1) {
      position.set(0, 0, 0);
      if (history.length > 0) {
        for (const sample of history) {
          resolveTarget(index, sample, targetPosition);
          position.lerp(targetPosition, sample[2]);
        }
      } else {
        resolveTarget(index, currentSample, targetPosition);
        const response = 1 - Math.pow(1 - currentSample[2], frame + 1);
        position.copy(targetPosition).multiplyScalar(response);
      }

      matrix.makeScale(sphereSize, sphereSize, sphereSize);
      matrix.setPosition(position);
      mesh.setMatrixAt(index, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  const applySequentialStep = ({
    currentSample,
    sphereSize,
  }: {
    currentSample: MorphSample;
    sphereSize: number;
  }): void => {
    const activeCount = targetA.length;
    mesh.count = activeCount;
    for (let index = 0; index < activeCount; index += 1) {
      mesh.getMatrixAt(index, matrix);
      position.setFromMatrixPosition(matrix);
      resolveTarget(index, currentSample, targetPosition);
      position.lerp(targetPosition, currentSample[2]);
      matrix.makeScale(sphereSize, sphereSize, sphereSize);
      matrix.setPosition(position);
      mesh.setMatrixAt(index, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  const update = (
    nextNode: VizRenderThreeProgramNode,
    nextMaterializedAssets?: ReadonlyMap<string, VizMaterializedAsset>,
  ): void => {
    assertProgram(nextNode, PROGRAM_ID, 'Morph Shapes');
    lastNode = nextNode;
    if (nextMaterializedAssets) {
      materializedAssets = nextMaterializedAssets;
    }
    const parameters = nextNode.parameters;
    refreshTargets(parameters);
    const frame = Math.max(0, Math.round(asNumber(parameters.frame, 0)));
    const currentSample: MorphSample = [
      Math.max(0, Math.min(1, asNumber(parameters.morphT, 0))),
      Math.max(0, asNumber(parameters.explosionShift, 0)),
      Math.max(0.01, Math.min(1, asNumber(parameters.animationSpeed, 0.08))),
    ];
    const history = asMorphHistory(parameters.morphHistory);
    const sphereSize = Math.max(0.01, asNumber(parameters.sphereSize, 0.15));
    const canStepSequentially =
      lastFrame !== undefined &&
      frame === lastFrame + 1 &&
      lastAppliedTargetsVersion === targetsVersion;

    if (canStepSequentially) {
      applySequentialStep({ currentSample, sphereSize });
    } else {
      applyFromOrigin({
        frame,
        currentSample,
        history,
        sphereSize,
      });
    }

    color
      .set(asString(parameters.color, 'rgb(0, 200, 255)'))
      .multiplyScalar(Math.max(0.2, asNumber(parameters.glowIntensity, 1)));
    material.color.copy(color);
    const additive = asBoolean(parameters.additiveGlow, false);
    material.transparent = additive;
    material.depthWrite = !additive;
    material.blending = additive ? AdditiveBlending : NormalBlending;
    if (additive !== additiveMode) {
      material.needsUpdate = true;
      additiveMode = additive;
    }

    const quaternion = asQuaternionTuple(parameters.rotationQuaternion);
    root.quaternion
      .set(quaternion[0], quaternion[1], quaternion[2], quaternion[3])
      .normalize();
    lastFrame = frame;
    lastAppliedTargetsVersion = targetsVersion;
  };

  update(node, initialMaterializedAssets);

  return {
    programId: PROGRAM_ID,
    scene,
    camera,
    root,
    update,
    resize(nextWidth, nextHeight) {
      camera.aspect = nextWidth / Math.max(nextHeight, 1);
      camera.updateProjectionMatrix();
    },
    render(renderer: WebGLRenderer, renderTarget: WebGLRenderTarget) {
      const previousShadowEnabled = renderer.shadowMap.enabled;
      const previousToneMapping = renderer.toneMapping;
      const previousExposure = renderer.toneMappingExposure;
      renderer.shadowMap.enabled = true;
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      renderer.setRenderTarget(renderTarget);
      renderer.render(scene, camera);
      renderer.shadowMap.enabled = previousShadowEnabled;
      renderer.toneMapping = previousToneMapping;
      renderer.toneMappingExposure = previousExposure;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      directionalLight.shadow.map?.dispose();
      root.clear();
      scene.clear();
    },
  };
};
