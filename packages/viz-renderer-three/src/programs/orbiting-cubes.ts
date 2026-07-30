import type { VizRenderThreeProgramNode } from '@viz-engine/contracts';
import {
  AmbientLight,
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SpotLight,
  Vector3,
  type WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';
import type { VizThreeProgramFactory } from './types.js';

const PROGRAM_ID = 'viz-core/orbiting-cubes/v1';

// Seeded random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  random() {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  randomInt(min: number, max: number) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }
}

// Cube structure with position and scale
type CubeData = { pos: [number, number, number]; scale: number };

// Generate neuron-like radial structures with various configurations
function generateFractalCubeStructure(
  seed: number,
  maxCubes: number,
  fractalDepth: number,
): CubeData[] {
  const rng = new SeededRandom(seed);
  const cubes: CubeData[] = [];
  const positionKeys: Set<string> = new Set();

  const addCube = (x: number, y: number, z: number, scale: number) => {
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)},${scale.toFixed(3)}`;
    if (!positionKeys.has(key) && cubes.length < maxCubes) {
      positionKeys.add(key);
      cubes.push({ pos: [x, y, z], scale });
      return true;
    }
    return false;
  };

  // Choose neuron variation based on seed
  const variation = Math.floor((seed * 7919) % 6);

  switch (variation) {
    case 0:
      generateStarNeuron(rng, addCube, maxCubes, fractalDepth);
      break;
    case 1:
      generateBranchingNeuron(rng, addCube, maxCubes, fractalDepth);
      break;
    case 2:
      generateClusteredNeuron(rng, addCube, maxCubes, fractalDepth);
      break;
    case 3:
      generateAsymmetricNeuron(rng, addCube, maxCubes, fractalDepth);
      break;
    case 4:
      generateDenseNeuron(rng, addCube, maxCubes, fractalDepth);
      break;
    case 5:
      generateSparseNeuron(rng, addCube, maxCubes, fractalDepth);
      break;
  }

  return cubes;
}

// Neuron Variation 1: Star Neuron (classic radial burst)
function generateStarNeuron(
  rng: SeededRandom,
  addCube: (x: number, y: number, z: number, scale: number) => boolean,
  maxCubes: number,
  depth: number,
) {
  // Large soma (cell body)
  addCube(0, 0, 0, 1.8);

  const dendrites = rng.randomInt(8, 16); // Dendrite count
  const stepsPerDendrite = Math.floor((maxCubes - 1) / dendrites);

  for (let d = 0; d < dendrites; d++) {
    // Random direction in 3D sphere
    const theta = (d / dendrites) * Math.PI * 2 + rng.random() * 0.3;
    const phi = Math.acos(2 * rng.random() - 1);

    const dx = Math.sin(phi) * Math.cos(theta);
    const dy = Math.cos(phi);
    const dz = Math.sin(phi) * Math.sin(theta);

    // Create dendrite
    for (let step = 1; step <= stepsPerDendrite; step++) {
      const t = step / stepsPerDendrite;
      const distance = step * (0.6 + depth * 0.2);
      const scale = Math.max(0.25, 1.3 - t * 1.0);
      const wobble = (rng.random() - 0.5) * 0.2;

      addCube(
        dx * distance + wobble,
        dy * distance + wobble,
        dz * distance + wobble,
        scale,
      );
    }
  }
}

// Neuron Variation 2: Branching Neuron (dendrites split)
function generateBranchingNeuron(
  rng: SeededRandom,
  addCube: (x: number, y: number, z: number, scale: number) => boolean,
  maxCubes: number,
  depth: number,
) {
  addCube(0, 0, 0, 2.0); // Soma

  const mainBranches = rng.randomInt(5, 8);

  const recursiveBranch = (
    x: number,
    y: number,
    z: number,
    dx: number,
    dy: number,
    dz: number,
    scale: number,
    remainingDepth: number,
  ) => {
    if (remainingDepth <= 0 || addCube.length >= maxCubes) return;

    const steps = rng.randomInt(3, 6);
    for (let i = 0; i < steps; i++) {
      x += dx * 0.5;
      y += dy * 0.5;
      z += dz * 0.5;
      addCube(x, y, z, scale);
    }

    // Branch splits
    if (remainingDepth > 1 && rng.random() > 0.4) {
      const branches = rng.randomInt(2, 3);
      for (let b = 0; b < branches; b++) {
        const newDx = dx + (rng.random() - 0.5) * 0.8;
        const newDy = dy + (rng.random() - 0.5) * 0.8;
        const newDz = dz + (rng.random() - 0.5) * 0.8;
        const len = Math.sqrt(newDx * newDx + newDy * newDy + newDz * newDz);
        recursiveBranch(
          x,
          y,
          z,
          newDx / len,
          newDy / len,
          newDz / len,
          scale * 0.7,
          remainingDepth - 1,
        );
      }
    }
  };

  for (let m = 0; m < mainBranches; m++) {
    const theta = (m / mainBranches) * Math.PI * 2;
    const phi = Math.acos(2 * rng.random() - 1);
    const dx = Math.sin(phi) * Math.cos(theta);
    const dy = Math.cos(phi);
    const dz = Math.sin(phi) * Math.sin(theta);

    recursiveBranch(0, 0, 0, dx, dy, dz, 0.9, depth);
  }
}

// Neuron Variation 3: Clustered Neuron (multiple soma clusters)
function generateClusteredNeuron(
  rng: SeededRandom,
  addCube: (x: number, y: number, z: number, scale: number) => boolean,
  maxCubes: number,
  _depth: number,
) {
  const clusters = rng.randomInt(3, 5);
  const cubesPerCluster = Math.floor(maxCubes / clusters);

  for (let c = 0; c < clusters; c++) {
    const theta = (c / clusters) * Math.PI * 2;
    const radius = 2.5;
    const cx = Math.cos(theta) * radius;
    const cy = (rng.random() - 0.5) * 2;
    const cz = Math.sin(theta) * radius;

    // Cluster soma
    addCube(cx, cy, cz, 1.2);

    // Small dendrites from this cluster
    const dendrites = rng.randomInt(4, 8);
    for (let d = 0; d < dendrites; d++) {
      const dTheta = (d / dendrites) * Math.PI * 2;
      const dPhi = Math.acos(2 * rng.random() - 1);
      const dx = Math.sin(dPhi) * Math.cos(dTheta);
      const dy = Math.cos(dPhi);
      const dz = Math.sin(dPhi) * Math.sin(dTheta);

      const steps = Math.floor(cubesPerCluster / dendrites);
      for (let s = 1; s < steps; s++) {
        const dist = s * 0.4;
        const scale = Math.max(0.2, 0.8 - (s / steps) * 0.5);
        addCube(cx + dx * dist, cy + dy * dist, cz + dz * dist, scale);
      }
    }
  }
}

// Neuron Variation 4: Asymmetric Neuron (organic variation)
function generateAsymmetricNeuron(
  rng: SeededRandom,
  addCube: (x: number, y: number, z: number, scale: number) => boolean,
  maxCubes: number,
  depth: number,
) {
  addCube(0, 0, 0, 1.9);

  // Different length dendrites for asymmetry
  const dendrites = rng.randomInt(6, 12);

  for (let d = 0; d < dendrites; d++) {
    const theta = rng.random() * Math.PI * 2;
    const phi = Math.acos(2 * rng.random() - 1);
    const dx = Math.sin(phi) * Math.cos(theta);
    const dy = Math.cos(phi);
    const dz = Math.sin(phi) * Math.sin(theta);

    // Random length for each dendrite
    const dendriteLength = rng.randomInt(3, 10 + depth * 2);

    for (let step = 1; step <= dendriteLength; step++) {
      const t = step / dendriteLength;
      const distance = step * 0.7;
      const scale = Math.max(0.3, 1.4 - t * 1.1);

      // Add more wobble for organic feel
      const wobble = (rng.random() - 0.5) * 0.5;

      addCube(
        dx * distance + wobble,
        dy * distance + wobble,
        dz * distance + wobble,
        scale,
      );
    }
  }
}

// Neuron Variation 5: Dense Neuron (many thin dendrites)
function generateDenseNeuron(
  rng: SeededRandom,
  addCube: (x: number, y: number, z: number, scale: number) => boolean,
  maxCubes: number,
  depth: number,
) {
  addCube(0, 0, 0, 1.5);

  const dendrites = rng.randomInt(20, 35); // Many dendrites
  const stepsPerDendrite = Math.max(2, Math.floor((maxCubes - 1) / dendrites));

  for (let d = 0; d < dendrites; d++) {
    const theta = rng.random() * Math.PI * 2;
    const phi = Math.acos(2 * rng.random() - 1);
    const dx = Math.sin(phi) * Math.cos(theta);
    const dy = Math.cos(phi);
    const dz = Math.sin(phi) * Math.sin(theta);

    for (let step = 1; step <= stepsPerDendrite; step++) {
      const distance = step * (0.5 + depth * 0.15);
      const scale = Math.max(0.2, 0.6 - (step / stepsPerDendrite) * 0.3); // Thin
      const wobble = (rng.random() - 0.5) * 0.15;

      addCube(
        dx * distance + wobble,
        dy * distance + wobble,
        dz * distance + wobble,
        scale,
      );
    }
  }
}

// Neuron Variation 6: Sparse Neuron (few thick dendrites)
function generateSparseNeuron(
  rng: SeededRandom,
  addCube: (x: number, y: number, z: number, scale: number) => boolean,
  maxCubes: number,
  depth: number,
) {
  addCube(0, 0, 0, 2.2); // Large soma

  const dendrites = rng.randomInt(4, 7); // Few dendrites
  const stepsPerDendrite = Math.floor((maxCubes - 1) / dendrites);

  for (let d = 0; d < dendrites; d++) {
    const theta = (d / dendrites) * Math.PI * 2 + rng.random() * 0.5;
    const phi = Math.PI / 3 + (rng.random() - 0.5) * 0.8;
    const dx = Math.sin(phi) * Math.cos(theta);
    const dy = Math.cos(phi);
    const dz = Math.sin(phi) * Math.sin(theta);

    for (let step = 1; step <= stepsPerDendrite; step++) {
      const distance = step * (0.8 + depth * 0.2);
      const scale = Math.max(0.4, 1.6 - (step / stepsPerDendrite) * 0.8); // Thick
      const wobble = (rng.random() - 0.5) * 0.25;

      addCube(
        dx * distance + wobble,
        dy * distance + wobble,
        dz * distance + wobble,
        scale,
      );
    }
  }
}

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const asString = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

const assertProgram = (node: VizRenderThreeProgramNode) => {
  if (node.programId !== PROGRAM_ID) {
    throw new Error(
      `Orbiting Cubes program cannot update incompatible program "${node.programId}".`,
    );
  }
};

export const createOrbitingCubesProgram: VizThreeProgramFactory = ({
  node,
  width,
  height,
}) => {
  assertProgram(node);

  const scene = new Scene();
  const root = new Group();
  const structure = new Group();
  const camera = new PerspectiveCamera(
    75,
    width / Math.max(height, 1),
    0.1,
    1000,
  );
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshStandardMaterial({
    color: '#1a1a2e',
    metalness: 0.95,
    roughness: 0.5,
  });
  const cubes = new InstancedMesh(geometry, material, 150);
  cubes.frustumCulled = false;
  structure.add(cubes);
  root.userData.structure = structure;
  root.userData.cubes = cubes;

  const lightDistance = 12;
  const createSpotlight = (angle: number) => {
    const light = new SpotLight('#ffffff', 500, 0, Math.PI / 3, 0.5, 2);
    light.position.set(
      Math.cos(angle) * lightDistance,
      lightDistance * 0.5,
      Math.sin(angle) * lightDistance,
    );
    light.target.position.set(0, 0, 0);
    root.add(light, light.target);
    return light;
  };
  const spotlight1 = createSpotlight(0);
  const spotlight2 = createSpotlight((Math.PI * 2) / 3);
  const spotlight3 = createSpotlight((Math.PI * 4) / 3);
  const ambientLight = new AmbientLight('#ffffff', 185);
  root.add(structure, ambientLight);
  scene.add(root);

  const matrix = new Matrix4();
  let structureKey = '';
  let transformKey = '';
  let cubeData: CubeData[] = [];

  const update = (nextNode: VizRenderThreeProgramNode) => {
    assertProgram(nextNode);
    const parameters = nextNode.parameters;
    const seed = Math.round(asNumber(parameters.seed, 3499));
    const maxCubes = Math.min(
      150,
      Math.max(8, Math.round(asNumber(parameters.maxCubes, 150))),
    );
    const fractalDepth = Math.min(
      5,
      Math.max(1, Math.round(asNumber(parameters.fractalDepth, 5))),
    );
    const nextStructureKey = `${seed}:${maxCubes}:${fractalDepth}`;
    if (nextStructureKey !== structureKey) {
      cubeData = generateFractalCubeStructure(seed, maxCubes, fractalDepth);
      cubes.count = cubeData.length;
      structureKey = nextStructureKey;
      transformKey = '';
    }

    const spacing = Math.max(0.1, asNumber(parameters.spacing, 0.65));
    const cubeSize = Math.max(0.1, asNumber(parameters.cubeSize, 0.45));
    const nextTransformKey = `${structureKey}:${spacing}:${cubeSize}`;
    if (nextTransformKey !== transformKey) {
      cubeData.forEach((cube, index) => {
        const [x, y, z] = cube.pos;
        const scale = cube.scale * cubeSize;
        matrix.makeScale(scale, scale, scale);
        matrix.setPosition(x * spacing, y * spacing, z * spacing);
        cubes.setMatrixAt(index, matrix);
      });
      cubes.instanceMatrix.needsUpdate = true;
      transformKey = nextTransformKey;
    }

    material.color.set(asString(parameters.cubeColor, '#1a1a2e'));
    material.metalness = Math.min(
      1,
      Math.max(0, asNumber(parameters.metalness, 0.95)),
    );
    material.roughness = Math.min(
      1,
      Math.max(0, asNumber(parameters.roughness, 0.5)),
    );
    spotlight1.color.set(asString(parameters.light1Color, '#FF00FF'));
    spotlight2.color.set(asString(parameters.light2Color, '#00FFFF'));
    spotlight3.color.set(asString(parameters.light3Color, '#FFFF00'));
    const lightIntensity = Math.max(
      0,
      asNumber(parameters.lightIntensity, 500),
    );
    spotlight1.intensity = lightIntensity;
    spotlight2.intensity = lightIntensity;
    spotlight3.intensity = lightIntensity;
    ambientLight.intensity = Math.max(
      0,
      asNumber(parameters.ambientBrightness, 185),
    );

    const time = Math.max(0, asNumber(parameters.time, 0));
    const rotationSpeed = Math.max(0, asNumber(parameters.rotationSpeed, 0.1));
    structure.rotation.set(
      time * rotationSpeed * 0.3,
      time * rotationSpeed,
      time * rotationSpeed * 0.5,
    );

    const orbitSpeed = Math.max(0, asNumber(parameters.orbitSpeed, 0.3));
    const orbitRadius = Math.max(3, asNumber(parameters.orbitRadius, 8));
    const angle1 = time * orbitSpeed;
    const angle2 = time * orbitSpeed * 0.7;
    const angle3 = time * orbitSpeed * 0.4;
    const phi = Math.PI / 3 + Math.sin(angle2) * 0.5;
    camera.position.set(
      orbitRadius * Math.sin(phi) * Math.cos(angle1 + angle3),
      orbitRadius * Math.cos(phi),
      orbitRadius * Math.sin(phi) * Math.sin(angle1 + angle3),
    );
    camera.lookAt(new Vector3(0, 0, 0));
    cubes.userData.structureKey = structureKey;
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
    },
    render(renderer: WebGLRenderer, renderTarget: WebGLRenderTarget) {
      renderer.setRenderTarget(renderTarget);
      renderer.render(scene, camera);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      root.clear();
      scene.clear();
    },
  };
};
