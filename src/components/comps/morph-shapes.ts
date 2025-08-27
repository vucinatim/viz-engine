import { cssColorToLinearRGB } from '@/lib/color-utils';
import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TTFLoader } from 'three/examples/jsm/loaders/TTFLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { v } from '../config/config';
import { createComponent } from '../config/create-component';

type MorphConfigValues = {
  shapeASettings: {
    shape: string;
    modelUrl: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    text?: string;
    textSize?: number;
    textDepth?: number;
    textFontUrl?: string;
  };
  shapeBSettings: {
    shape: string;
    modelUrl: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    text?: string;
    textSize?: number;
    textDepth?: number;
    textFontUrl?: string;
  };
  morphT: number;
  explosionShift: number;
  animationSpeed: number;
  color: string;
  gridSize: number;
  rotation: { axis: { x: number; y: number; z: number }; speed: number };
  modelPointCount: number;
  modelEvenness: number;
  sphereSize: number;
  additiveGlow: boolean;
  glowIntensity: number;
};

type MorphState = {
  root: THREE.Group | null;
  instancedMesh: THREE.InstancedMesh | null;
  material: THREE.MeshStandardMaterial | null;
  instanceCount: number;
  targetA: THREE.Vector3[];
  targetB: THREE.Vector3[];
  activeCount: number;
  prevGridSize?: number;
  prevShapeA?: string;
  prevShapeB?: string;
  prevModelUrlA?: string;
  prevModelUrlB?: string;
  prevModelATransformKey?: string;
  prevModelBTransformKey?: string;
  prevSphereSize?: number;
  prevGlowMode?: boolean;
  prevTextKeyA?: string;
  prevTextKeyB?: string;
  colorUniforms: { uColor: THREE.IUniform<THREE.Vector3> };
  clock: THREE.Clock;
  modelPositionsCache: Record<string, THREE.Vector3[]>;
  modelLoading: Record<string, true>;
};

const MorphShapes = createComponent({
  name: 'Morph Shapes',
  description:
    'Instanced morph between two hardcoded shapes with explosion overlay',
  config: v.config({
    morphT: v.number({
      label: 'Morph',
      description: 'Morph between shapes',
      defaultValue: 0,
      min: 0,
      max: 1,
      step: 0.01,
    }),
    explosionShift: v.number({
      label: 'Explosion Shift',
      description: 'Explode outward along normals',
      defaultValue: 0,
      min: 0,
      max: 100,
      step: 0.1,
    }),
    animationSpeed: v.number({
      label: 'Animation Speed',
      description: 'Follow speed toward target',
      defaultValue: 0.08,
      min: 0.01,
      max: 0.2,
      step: 0.01,
    }),
    color: v.color({
      label: 'Color',
      defaultValue: 'rgb(0, 200, 255)',
      description: 'Instance color',
    }),
    gridSize: v.number({
      label: 'Grid Size',
      description: 'Instance resolution of cube frame',
      defaultValue: 5,
      min: 1,
      max: 100,
      step: 1,
    }),
    modelPointCount: v.number({
      label: 'Model Points',
      description: 'Number of points for model shapes',
      defaultValue: 15000,
      min: 1,
      max: 10000,
      step: 10,
    }),
    modelEvenness: v.number({
      label: 'Evenness',
      description: 'Higher values push points apart more (blue-noise sampling)',
      defaultValue: 0.7,
      min: 0.2,
      max: 1.0,
      step: 0.05,
    }),
    sphereSize: v.number({
      label: 'Sphere Size',
      description: 'Radius of each sphere instance',
      defaultValue: 0.15,
      min: 0.01,
      max: 1.0,
      step: 0.01,
    }),
    additiveGlow: v.toggle({
      label: 'Additive Glow',
      description: 'Use additive blending and disable depth for glowy look',
      defaultValue: false,
    }),
    glowIntensity: v.number({
      label: 'Glow Intensity',
      description: 'Boost factor for glow (emissive simulation)',
      defaultValue: 1.0,
      min: 0.2,
      max: 5.0,
      step: 0.1,
    }),
    rotation: v.group(
      { label: 'Rotation', description: 'Rotate the whole shape' },
      {
        axis: v.vector3({
          label: 'Axis',
          description: 'Rotation axis as a vector',
          defaultValue: { x: 0, y: 1, z: 0 },
          min: -1,
          max: 1,
          step: 0.01,
        }),
        speed: v.number({
          label: 'Speed',
          description: 'Angular speed (radians/sec)',
          defaultValue: 0.5,
          min: -5,
          max: 5,
          step: 0.01,
        }),
      },
    ),
    shapeASettings: v.group(
      { label: 'Shape A Settings' },
      {
        shape: v.select({
          label: 'Shape',
          description: 'Starting shape',
          defaultValue: 'cube',
          options: ['cube', 'pyramid', 'model', 'custom-text'],
        }),
        textFontUrl: v.text({
          label: 'Font URL (.ttf)',
          description:
            'Optional TTF font URL (CORS-enabled, e.g., Google Fonts TTF) for custom text',
          defaultValue: '',
          visibleIf: (vals) => vals.shapeASettings?.shape === 'custom-text',
        }),
        modelUrl: v.file({
          label: 'Model (.glb/.gltf)',
          description: 'Path or URL when shape is set to model',
          defaultValue: '',
          allowedExtensions: ['.glb', '.gltf'],
          visibleIf: (vals) => vals.shapeASettings?.shape === 'model',
        }),
        text: v.text({
          label: 'Custom Text',
          description: 'Shown when shape is custom-text',
          defaultValue: '',
          visibleIf: (vals) => vals.shapeASettings?.shape === 'custom-text',
        }),
        textSize: v.number({
          label: 'Text Size',
          description: 'Font size of 3D text',
          defaultValue: 1,
          min: 0.1,
          max: 10,
          step: 0.1,
          visibleIf: (vals) => vals.shapeASettings?.shape === 'custom-text',
        }),
        textDepth: v.number({
          label: 'Text Depth',
          description: 'Extrusion depth of 3D text',
          defaultValue: 0.2,
          min: 0.01,
          max: 2,
          step: 0.01,
          visibleIf: (vals) => vals.shapeASettings?.shape === 'custom-text',
        }),
        position: v.vector3({
          label: 'Position',
          description: 'Offset in world units',
          defaultValue: { x: 0, y: 0, z: 0 },
          min: -10,
          max: 10,
          step: 0.01,
        }),
        rotation: v.vector3({
          label: 'Rotation (deg)',
          description: 'Euler rotation in degrees',
          defaultValue: { x: 0, y: 0, z: 0 },
          min: -360,
          max: 360,
          step: 0.1,
        }),
      },
    ),
    shapeBSettings: v.group(
      { label: 'Shape B Settings' },
      {
        shape: v.select({
          label: 'Shape',
          description: 'Target shape',
          defaultValue: 'pyramid',
          options: ['cube', 'pyramid', 'model', 'custom-text'],
        }),
        textFontUrl: v.text({
          label: 'Font URL (.ttf)',
          description:
            'Optional TTF font URL (CORS-enabled, e.g., Google Fonts TTF) for custom text',
          defaultValue: '',
          visibleIf: (vals) => vals.shapeBSettings?.shape === 'custom-text',
        }),
        modelUrl: v.file({
          label: 'Model (.glb/.gltf)',
          description: 'Path or URL when shape is set to model',
          defaultValue: '',
          allowedExtensions: ['.glb', '.gltf'],
          visibleIf: (vals) => vals.shapeBSettings?.shape === 'model',
        }),
        text: v.text({
          label: 'Custom Text',
          description: 'Shown when shape is custom-text',
          defaultValue: '',
          visibleIf: (vals) => vals.shapeBSettings?.shape === 'custom-text',
        }),
        textSize: v.number({
          label: 'Text Size',
          description: 'Font size of 3D text',
          defaultValue: 1,
          min: 0.1,
          max: 10,
          step: 0.1,
          visibleIf: (vals) => vals.shapeBSettings?.shape === 'custom-text',
        }),
        textDepth: v.number({
          label: 'Text Depth',
          description: 'Extrusion depth of 3D text',
          defaultValue: 0.2,
          min: 0.01,
          max: 2,
          step: 0.01,
          visibleIf: (vals) => vals.shapeBSettings?.shape === 'custom-text',
        }),
        position: v.vector3({
          label: 'Position',
          description: 'Offset in world units',
          defaultValue: { x: 0, y: 0, z: 0 },
          min: -10,
          max: 10,
          step: 0.01,
        }),
        rotation: v.vector3({
          label: 'Rotation (deg)',
          description: 'Euler rotation in degrees',
          defaultValue: { x: 0, y: 0, z: 0 },
          min: -180,
          max: 180,
          step: 0.1,
        }),
      },
    ),
  }),
  createState: (): MorphState => ({
    root: null,
    instancedMesh: null,
    material: null,
    instanceCount: 0,
    targetA: [],
    targetB: [],
    activeCount: 0,
    prevGridSize: undefined,
    prevShapeA: undefined,
    prevShapeB: undefined,
    prevModelUrlA: undefined,
    prevModelUrlB: undefined,
    colorUniforms: {
      uColor: { value: new THREE.Vector3(1, 1, 1) },
    },
    clock: new THREE.Clock(),
    modelPositionsCache: {},
    modelLoading: {},
  }),
  init3D: ({ threeCtx: { scene, camera }, state, config }) => {
    camera.position.set(0, 0, 20);
    camera.lookAt(0, 0, 0);
    scene.background = new THREE.Color(0x111111);

    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(-8, 10, 12);
    dir.castShadow = true;
    scene.add(dir);
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));

    // Preallocate to the maximum supported grid so gridSize can change live without reallocating
    const MAX_INSTANCES = 60000;
    const capacity = MAX_INSTANCES;
    // Use low-poly spheres for performance at high instance counts. Geometry will be resized by scale per-instance.
    const geometry = new THREE.SphereGeometry(1, 8, 6);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    material.depthWrite = true;
    material.transparent = false;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uColor = state.colorUniforms.uColor;
      shader.uniforms.uGlow = { value: 1.0 };
      shader.fragmentShader =
        'uniform vec3 uColor;\nuniform float uGlow;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>\n  diffuseColor.rgb = uColor * uGlow;`,
      );
    };

    const root = new THREE.Group();
    scene.add(root);

    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.count = capacity;
    mesh.castShadow = true;
    root.add(mesh);
    state.root = root;
    state.instancedMesh = mesh;
    state.material = material;
    state.instanceCount = capacity;

    // Seed targets from current config
    state.prevGridSize = config.gridSize;
    state.prevShapeA = config.shapeASettings.shape;
    state.prevShapeB = config.shapeBSettings.shape;
    state.prevModelUrlA = config.shapeASettings.modelUrl;
    state.prevModelUrlB = config.shapeBSettings.modelUrl;
    void rebuildTargets(state, config, state.instanceCount);

    // Initial color
    const css = config.color;
    const lin = cssColorToLinearRGB(css);
    const glow = Math.max(0.2, Math.min(5.0, config.glowIntensity ?? 1.0));
    state.colorUniforms.uColor.value.x = lin.r * glow;
    state.colorUniforms.uColor.value.y = lin.g * glow;
    state.colorUniforms.uColor.value.z = lin.b * glow;
  },
  draw3D: ({ threeCtx: { scene, camera, renderer }, state, config, dt }) => {
    if (!state.instancedMesh) return;

    const mesh = state.instancedMesh;
    const t = config.morphT;
    const explode = config.explosionShift;
    const speed = config.animationSpeed;

    // Live-rebuild targets when shape or grid changes
    if (
      state.prevGridSize !== config.gridSize ||
      state.prevShapeA !== config.shapeASettings.shape ||
      state.prevShapeB !== config.shapeBSettings.shape ||
      state.prevModelUrlA !== config.shapeASettings.modelUrl ||
      state.prevModelUrlB !== config.shapeBSettings.modelUrl
    ) {
      state.prevGridSize = config.gridSize;
      state.prevShapeA = config.shapeASettings.shape;
      state.prevShapeB = config.shapeBSettings.shape;
      state.prevModelUrlA = config.shapeASettings.modelUrl;
      state.prevModelUrlB = config.shapeBSettings.modelUrl;
      void rebuildTargets(state, config, state.instanceCount);
    }

    const css = config.color;
    const lin = cssColorToLinearRGB(css);
    const glow = Math.max(0.2, Math.min(5.0, config.glowIntensity ?? 1.0));
    state.colorUniforms.uColor.value.x = lin.r * glow;
    state.colorUniforms.uColor.value.y = lin.g * glow;
    state.colorUniforms.uColor.value.z = lin.b * glow;

    // Draw only active instances to avoid stray center cube
    mesh.count = state.activeCount;
    const tmp = new THREE.Matrix4();
    for (let i = 0; i < state.activeCount; i++) {
      mesh.getMatrixAt(i, tmp);
      const a = state.targetA[i] || new THREE.Vector3();
      const b = state.targetB[i] || new THREE.Vector3();
      const target = new THREE.Vector3().copy(a).lerp(b, t);
      const dir =
        target.lengthSq() > 1e-6
          ? target.clone().normalize()
          : a.clone().normalize();
      target.addScaledVector(dir, explode);
      tmp.elements[12] += (target.x - tmp.elements[12]) * speed;
      tmp.elements[13] += (target.y - tmp.elements[13]) * speed;
      tmp.elements[14] += (target.z - tmp.elements[14]) * speed;
      // Apply uniform scale for sphere size
      const s = config.sphereSize ?? 0.15;
      tmp.elements[0] = s; // scale X
      tmp.elements[5] = s; // scale Y
      tmp.elements[10] = s; // scale Z
      mesh.setMatrixAt(i, tmp);
    }
    mesh.instanceMatrix.needsUpdate = true;

    // Apply global rotation to the root group based on config
    if (state.root) {
      const v = config.rotation?.axis ?? { x: 0, y: 1, z: 0 };
      const speed = config.rotation?.speed ?? 0;
      const axis = new THREE.Vector3(v.x, v.y, v.z);
      if (axis.lengthSq() > 1e-8) {
        axis.normalize();
        state.root.rotateOnAxis(axis, speed * (dt ?? 0));
      }
    }

    // Toggle additive glow blending dynamically
    if (state.material) {
      const additive = !!config.additiveGlow;
      state.material.transparent = additive;
      state.material.depthWrite = !additive;
      state.material.blending = additive
        ? THREE.AdditiveBlending
        : THREE.NormalBlending;
    }
    renderer.render(scene, camera);
  },
});

export default MorphShapes;

// Helpers
async function rebuildTargets(
  state: MorphState,
  config: MorphConfigValues,
  instanceCount: number,
): Promise<void> {
  const shapeA = config.shapeASettings.shape ?? 'cube';
  const shapeB = config.shapeBSettings.shape ?? 'sphere';
  const grid = config.gridSize ?? 5;

  const desiredModelCount = generateCubeFramePositions(grid).length;
  let posA: THREE.Vector3[];
  if (shapeA === 'pyramid') {
    posA = generatePyramidPositions(grid);
  } else if (shapeA === 'custom-text' && config.shapeASettings.text) {
    posA = await generateTextPoints(
      config.shapeASettings.text,
      config.shapeASettings.textSize ?? 1,
      config.shapeASettings.textDepth ?? 0.2,
      Math.min((config.modelPointCount ?? 15000) | 0, instanceCount),
      config.shapeASettings.textFontUrl,
    );
    posA = fitPointCloudToGrid(
      applyTransform(
        posA,
        config.shapeASettings.position,
        config.shapeASettings.rotation,
      ),
      grid,
    );
  } else if (shapeA === 'model' && config.shapeASettings.modelUrl) {
    const count = Math.min(
      (config.modelPointCount ?? 15000) | 0,
      instanceCount,
    );
    const cached = state.modelPositionsCache[config.shapeASettings.modelUrl];
    if (cached && cached.length >= count) {
      posA = fitPointCloudToGrid(
        applyTransform(
          cached.slice(0, count),
          config.shapeASettings.position,
          config.shapeASettings.rotation,
        ),
        grid,
      );
    } else {
      // Trigger async load once and fall back to cube until ready
      if (!state.modelLoading[config.shapeASettings.modelUrl]) {
        state.modelLoading[config.shapeASettings.modelUrl] = true;
        loadModelPositions(
          config.shapeASettings.modelUrl,
          count,
          config.modelEvenness ?? 0.7,
        )
          .then((pts) => {
            state.modelPositionsCache[config.shapeASettings.modelUrl] = pts;
            delete state.modelLoading[config.shapeASettings.modelUrl];
            rebuildTargets(state, config, instanceCount);
          })
          .catch(() => {
            delete state.modelLoading[config.shapeASettings.modelUrl];
          });
      }
      posA = generateCubeFramePositions(grid);
    }
  } else {
    posA = generateCubeFramePositions(grid);
  }

  let posB: THREE.Vector3[];
  if (shapeB === 'pyramid') {
    posB = generatePyramidPositions(grid);
  } else if (shapeB === 'custom-text' && config.shapeBSettings.text) {
    posB = await generateTextPoints(
      config.shapeBSettings.text,
      config.shapeBSettings.textSize ?? 1,
      config.shapeBSettings.textDepth ?? 0.2,
      Math.min((config.modelPointCount ?? 15000) | 0, instanceCount),
      config.shapeBSettings.textFontUrl,
    );
    posB = fitPointCloudToGrid(
      applyTransform(
        posB,
        config.shapeBSettings.position,
        config.shapeBSettings.rotation,
      ),
      grid,
    );
  } else if (shapeB === 'model' && config.shapeBSettings.modelUrl) {
    const count = Math.min(
      (config.modelPointCount ?? 15000) | 0,
      instanceCount,
    );
    const cached = state.modelPositionsCache[config.shapeBSettings.modelUrl];
    if (cached && cached.length >= count) {
      posB = fitPointCloudToGrid(
        applyTransform(
          cached.slice(0, count),
          config.shapeBSettings.position,
          config.shapeBSettings.rotation,
        ),
        grid,
      );
    } else {
      if (!state.modelLoading[config.shapeBSettings.modelUrl]) {
        state.modelLoading[config.shapeBSettings.modelUrl] = true;
        loadModelPositions(
          config.shapeBSettings.modelUrl,
          count,
          config.modelEvenness ?? 0.7,
        )
          .then((pts) => {
            state.modelPositionsCache[config.shapeBSettings.modelUrl] = pts;
            delete state.modelLoading[config.shapeBSettings.modelUrl];
            rebuildTargets(state, config, instanceCount);
          })
          .catch(() => {
            delete state.modelLoading[config.shapeBSettings.modelUrl];
          });
      }
      posB = generateCubeFramePositions(grid);
    }
  } else {
    posB = generateCubeFramePositions(grid);
  }
  const activeCount = Math.min(
    instanceCount,
    Math.max(posA.length, posB.length),
  );
  posA = padToCount(posA, activeCount);
  posB = padToCount(posB, activeCount);
  state.targetA = posA;
  state.targetB = posB;
  state.activeCount = activeCount;
}

async function loadModelPositions(
  url: string,
  desiredCount: number,
  evenness: number,
): Promise<THREE.Vector3[]> {
  // Support idb: scheme for persisted blobs
  let loadUrl = url;
  if (url.startsWith('idb:')) {
    const key = url.slice('idb:'.length);
    const blob = await import('@/lib/idb-file-store').then((m) =>
      m.idbGetFile(key),
    );
    if (!blob) throw new Error('Missing blob for idb key');
    loadUrl = URL.createObjectURL(blob);
  } else if (url.startsWith('blob:')) {
    // Try to resolve blob via IndexedDB using derived key
    const lastSlash = url.lastIndexOf('/') + 1;
    const key = `blob:${url.slice(lastSlash)}`;
    const blob = await import('@/lib/idb-file-store').then((m) =>
      m.idbGetFile(key),
    );
    if (blob) {
      loadUrl = URL.createObjectURL(blob);
    } else {
      // If the UI normalizer hasn't migrated yet, attempt fetch to detect invalid URL early
    }
  }
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(loadUrl);
  const points = extractPointsFromGLTFEven(gltf, desiredCount, evenness);
  return points;
}

function extractPointsFromGLTFEven(
  gltf: GLTF,
  desiredCount: number,
  evenness: number,
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const tempPosition = new THREE.Vector3();
  const meshes: THREE.Mesh[] = [];

  gltf.scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) {
        meshes.push(mesh);
      }
    }
  });

  if (meshes.length === 0) {
    return points;
  }

  // Use surface sampling with blue-noise style dart throwing
  const sampler = new MeshSurfaceSampler(meshes[0]).build();
  const candidates: THREE.Vector3[] = [];
  const oversample = Math.max(desiredCount * 4, desiredCount + 1000);
  for (let i = 0; i < oversample; i++) {
    sampler.sample(tempPosition);
    candidates.push(
      new THREE.Vector3(tempPosition.x, tempPosition.y, tempPosition.z),
    );
  }
  const normalized = normalizePointCloud(candidates);
  const selected = blueNoiseSelect(normalized, desiredCount, evenness);
  return selected;
}

function normalizePointCloud(points: THREE.Vector3[]): THREE.Vector3[] {
  if (points.length === 0) return points;
  const bbox = new THREE.Box3();
  for (const p of points) bbox.expandByPoint(p);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const center = new THREE.Vector3();
  bbox.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = 1 / maxDim; // fit to unit cube
  return points.map(
    (p) =>
      new THREE.Vector3(
        (p.x - center.x) * scale,
        (p.y - center.y) * scale,
        (p.z - center.z) * scale,
      ),
  );
}

// Simple blue-noise selection using voxel hashing to enforce a minimum distance
function blueNoiseSelect(
  normalizedPoints: THREE.Vector3[],
  count: number,
  evenness: number,
): THREE.Vector3[] {
  if (normalizedPoints.length === 0 || count <= 0) return [];
  // Points are within unit cube after normalization.
  // Estimate minimum distance based on target count (heuristic).
  const targetArea = 1; // unit square proxy
  const minDist = Math.max(
    0.002,
    Math.min(0.2, evenness * Math.sqrt(targetArea / count)),
  );
  const cellSize = minDist;
  const grid = new Map<string, number[]>();
  const selected: THREE.Vector3[] = [];

  const toKey = (p: THREE.Vector3) => {
    const ix = Math.floor(p.x / cellSize);
    const iy = Math.floor(p.y / cellSize);
    const iz = Math.floor(p.z / cellSize);
    return `${ix}:${iy}:${iz}`;
  };

  const neighbors = (p: THREE.Vector3) => {
    const ix = Math.floor(p.x / cellSize);
    const iy = Math.floor(p.y / cellSize);
    const iz = Math.floor(p.z / cellSize);
    const res: number[] = [];
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${ix + dx}:${iy + dy}:${iz + dz}`;
          const arr = grid.get(key);
          if (arr) res.push(...arr);
        }
    return res;
  };

  const minDistSq = minDist * minDist;
  for (let i = 0; i < normalizedPoints.length && selected.length < count; i++) {
    const p = normalizedPoints[i];
    const nearbyIdx = neighbors(p);
    let ok = true;
    for (const idx of nearbyIdx) {
      if (p.distanceToSquared(selected[idx]) < minDistSq) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    const key = toKey(p);
    const arr = grid.get(key) || [];
    arr.push(selected.length);
    grid.set(key, arr);
    selected.push(p.clone());
  }

  // Fallback: if not enough selected, top-up with remaining points
  for (let i = 0; i < normalizedPoints.length && selected.length < count; i++) {
    selected.push(normalizedPoints[i].clone());
  }
  return selected;
}

function fitPointCloudToGrid(
  points: THREE.Vector3[],
  gridSize: number,
): THREE.Vector3[] {
  const desiredSpan = (Math.max(3, gridSize) - 1) * (3 / 5);
  // Points are in unit cube after normalize; scale to desiredSpan
  const halfSpan = desiredSpan / 2;
  return points.map(
    (p) =>
      new THREE.Vector3(
        p.x * desiredSpan,
        p.y * desiredSpan,
        p.z * desiredSpan,
      ),
  );
}
function normalizeToCount(
  arr: THREE.Vector3[],
  count: number,
): THREE.Vector3[] {
  if (arr.length >= count) return arr.slice(0, count);
  const res = arr.slice();
  while (res.length < count) res.push(new THREE.Vector3());
  return res;
}

function applyTransform(
  points: THREE.Vector3[],
  position?: { x: number; y: number; z: number },
  rotation?: { x: number; y: number; z: number },
): THREE.Vector3[] {
  if (!position && !rotation) return points;
  // Some point generators or caches may yield plain objects {x,y,z}.
  // Normalize each entry to a real THREE.Vector3 instance before transforming.
  const toVector3 = (p: any): THREE.Vector3 => {
    if (p instanceof THREE.Vector3) return p.clone();
    if (
      p &&
      typeof p.x === 'number' &&
      typeof p.y === 'number' &&
      typeof p.z === 'number'
    )
      return new THREE.Vector3(p.x, p.y, p.z);
    return new THREE.Vector3();
  };
  // Convert degrees to radians for Euler
  const rotX = ((rotation?.x ?? 0) * Math.PI) / 180;
  const rotY = ((rotation?.y ?? 0) * Math.PI) / 180;
  const rotZ = ((rotation?.z ?? 0) * Math.PI) / 180;
  const rot = new THREE.Euler(rotX, rotY, rotZ, 'XYZ');
  const pos = new THREE.Vector3(
    position?.x ?? 0,
    position?.y ?? 0,
    position?.z ?? 0,
  );
  const m = new THREE.Matrix4();
  m.makeRotationFromEuler(rot);
  m.setPosition(pos);
  return points.map((p) => toVector3(p).applyMatrix4(m));
}

function padToCount(arr: THREE.Vector3[], count: number): THREE.Vector3[] {
  if (arr.length >= count) return arr.slice(0, count);
  const res = arr.slice();
  for (let i = arr.length; i < count; i++) {
    const src = arr[i % arr.length];
    if (src instanceof THREE.Vector3) {
      res.push(src.clone());
    } else if (
      src &&
      typeof (src as any).x === 'number' &&
      typeof (src as any).y === 'number' &&
      typeof (src as any).z === 'number'
    ) {
      res.push(
        new THREE.Vector3((src as any).x, (src as any).y, (src as any).z),
      );
    } else {
      res.push(new THREE.Vector3());
    }
  }
  return res;
}

function generateCubeFramePositions(gridSize: number): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];
  const size = Math.max(3, gridSize);
  const half = (size - 1) / 2;
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        const onEdge =
          [x, y, z].filter((v) => v === 0 || v === size - 1).length >= 2;
        if (!onEdge) continue;
        positions.push(
          new THREE.Vector3(
            (x - half) * (3 / 5),
            (y - half) * (3 / 5),
            (z - half) * (3 / 5),
          ),
        );
      }
    }
  }
  return positions;
}

function generatePyramidPositions(gridSize: number): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];
  const size = Math.max(3, gridSize);
  const half = (size - 1) / 2;
  // Base square at z = -h, apex at z = +h
  const height = size * (3 / 5) * 0.8;
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      // perimeter of base
      if (x === 0 || x === size - 1 || y === 0 || y === size - 1) {
        positions.push(
          new THREE.Vector3(
            (x - half) * (3 / 5),
            (y - half) * (3 / 5),
            -height,
          ),
        );
      }
    }
  }
  // Edges from base corners to apex
  const corners = [
    new THREE.Vector3(-half * (3 / 5), -half * (3 / 5), -height),
    new THREE.Vector3(half * (3 / 5), -half * (3 / 5), -height),
    new THREE.Vector3(half * (3 / 5), half * (3 / 5), -height),
    new THREE.Vector3(-half * (3 / 5), half * (3 / 5), -height),
  ];
  const apex = new THREE.Vector3(0, 0, height);
  const steps = size;
  for (const c of corners) {
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      positions.push(new THREE.Vector3().copy(c).lerp(apex, t));
    }
  }
  return positions;
}

async function generateTextPoints(
  text: string,
  size: number,
  depth: number,
  desiredCount: number,
  ttfUrl?: string,
): Promise<THREE.Vector3[]> {
  // Try to load a TTF font if provided, otherwise fall back to Helvetiker
  let font: Font | null = null;
  if (ttfUrl) {
    try {
      const ttfLoader = new TTFLoader();
      const ttf = await ttfLoader.loadAsync(ttfUrl);
      const fontLoader = new FontLoader();
      font = fontLoader.parse(ttf);
    } catch {}
  }
  if (!font) {
    const loader = new FontLoader();
    // Fallback to embedded Helvetiker JSON via jsdelivr CDN
    font = await loader.loadAsync(
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r164/examples/fonts/helvetiker_regular.typeface.json',
    );
  }
  const geo = new TextGeometry(text || ' ', {
    font,
    size: Math.max(0.1, size),
    height: Math.max(0.01, depth),
    curveSegments: 8,
    bevelEnabled: false,
  });
  geo.center();
  geo.computeVertexNormals();
  // Sample text surface similar to model sampling
  const asMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
  const sampler = new MeshSurfaceSampler(asMesh).build();
  const pts: THREE.Vector3[] = [];
  const tmp = new THREE.Vector3();
  for (let i = 0; i < desiredCount; i++) {
    sampler.sample(tmp);
    pts.push(new THREE.Vector3(tmp.x, tmp.y, tmp.z));
  }
  return normalizePointCloud(pts);
}
