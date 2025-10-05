import * as THREE from 'three';
import { v } from '../config/config';
import { createComponent } from '../config/create-component';
import { INPUT_ALIAS, OUTPUT_ALIAS } from '../node-network/presets';

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

  randomChoice<T>(array: T[]): T {
    return array[Math.floor(this.random() * array.length)];
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
  depth: number,
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

const OrbitingCubes = createComponent({
  name: 'Orbiting Cubes',
  description:
    'Neuron-like structures with dendrites and soma, orbiting camera reveals intricate patterns',
  config: v.config({
    seed: v.number({
      label: 'Structure Seed',
      description: 'Seed for procedural generation',
      defaultValue: 3499,
      min: 1,
      max: 10000,
      step: 1,
    }),
    maxCubes: v.number({
      label: 'Max Cubes',
      description: 'Maximum number of cubes in structure',
      defaultValue: 150,
      min: 8,
      max: 150,
      step: 8,
    }),
    fractalDepth: v.number({
      label: 'Fractal Depth',
      description:
        'Recursion depth for fractal generation (higher = more intricate)',
      defaultValue: 5,
      min: 1,
      max: 5,
      step: 1,
    }),
    cubeColor: v.color({
      label: 'Cube Color',
      description: 'Color of the cubes',
      defaultValue: '#1a1a2e',
    }),
    cubeSize: v.number({
      label: 'Cube Size',
      description: 'Size of each individual cube',
      defaultValue: 0.45,
      min: 0.1,
      max: 1,
      step: 0.05,
    }),
    metalness: v.number({
      label: 'Metalness',
      description: 'How metallic the cubes appear',
      defaultValue: 0.95,
      min: 0,
      max: 1,
      step: 0.05,
    }),
    roughness: v.number({
      label: 'Roughness',
      description: 'Surface roughness (0 = mirror-like, 1 = matte)',
      defaultValue: 0.5,
      min: 0,
      max: 1,
      step: 0.05,
    }),
    light1Color: v.color({
      label: 'Light 1 Color',
      description: 'Color of the first spotlight',
      defaultValue: '#FF00FF',
    }),
    light2Color: v.color({
      label: 'Light 2 Color',
      description: 'Color of the second spotlight',
      defaultValue: '#00FFFF',
    }),
    light3Color: v.color({
      label: 'Light 3 Color',
      description: 'Color of the third spotlight',
      defaultValue: '#FFFF00',
    }),
    lightIntensity: v.number({
      label: 'Light Intensity',
      description: 'Intensity of the colored lights',
      defaultValue: 500,
      min: 0,
      max: 500,
      step: 10,
    }),
    ambientBrightness: v.number({
      label: 'Ambient Brightness',
      description: 'Overall scene brightness/ambient light',
      defaultValue: 185,
      min: 0,
      max: 300,
      step: 5,
    }),
    spacing: v.number({
      label: 'Spacing',
      description: 'Space between cubes',
      defaultValue: 0.65,
      min: 0.1,
      max: 2,
      step: 0.05,
    }),
    orbitSpeed: v.number({
      label: 'Orbit Speed',
      description: 'Speed of camera orbit',
      defaultValue: 0.3,
      min: 0,
      max: 2,
      step: 0.05,
    }),
    orbitRadius: v.number({
      label: 'Orbit Radius',
      description: 'Distance of camera from center',
      defaultValue: 8,
      min: 3,
      max: 20,
      step: 0.5,
    }),
    rotationSpeed: v.number({
      label: 'Rotation Speed',
      description: 'Speed of structure rotation',
      defaultValue: 0.1,
      min: 0,
      max: 3,
      step: 0.1,
    }),
  }),
  defaultNetworks: {
    // Spacing: Audio-reactive with kick and bass frequency bands
    spacing: {
      id: 'spacing-network',
      name: 'Spacing - Kick & Bass Reactive',
      description:
        'Responds to kick (80-150Hz) and bass (20-163Hz) frequencies',
      outputType: 'number',
      autoPlace: false,
      nodes: [
        {
          id: 'kick_band',
          label: 'Frequency Band',
          position: { x: -20, y: -84 },
          inputValues: {
            startFrequency: 80,
            endFrequency: 150,
          },
        },
        {
          id: 'kick_info',
          label: 'Band Info',
          position: { x: 430, y: -230 },
        },
        {
          id: 'kick_adapt',
          label: 'Adaptive Normalize (Quantile)',
          position: { x: 648, y: -216 },
          inputValues: {
            windowMs: 4000,
            qLow: 0.5,
            qHigh: 0.98,
            freezeBelow: 140,
          },
        },
        {
          id: 'bass_band',
          label: 'Frequency Band',
          position: { x: -524, y: 195 },
          inputValues: {
            startFrequency: 20,
            endFrequency: 163,
          },
        },
        {
          id: 'bass_info',
          label: 'Band Info',
          position: { x: -72, y: 414 },
        },
        {
          id: 'bass_adapt',
          label: 'Adaptive Normalize (Quantile)',
          position: { x: 305, y: 241 },
          inputValues: {
            windowMs: 4000,
            qLow: 0.3,
            qHigh: 0.9,
            freezeBelow: 130,
          },
        },
        {
          id: 'combine',
          label: 'Math',
          position: { x: 936, y: -204 },
          inputValues: {
            operation: 'max',
          },
        },
        {
          id: 'envelope',
          label: 'Envelope Follower',
          position: { x: 838, y: 194 },
          inputValues: {
            attackMs: 5,
            releaseMs: 150,
          },
        },
        {
          id: 'scale',
          label: 'Math',
          position: { x: 1272, y: 4 },
          inputValues: {
            a: 1,
            b: 1,
            operation: 'multiply',
          },
        },
      ],
      edges: [
        {
          source: INPUT_ALIAS,
          sourceHandle: 'frequencyAnalysis',
          target: 'kick_band',
          targetHandle: 'frequencyAnalysis',
        },
        {
          source: 'kick_band',
          sourceHandle: 'bandData',
          target: 'kick_info',
          targetHandle: 'data',
        },
        {
          source: 'kick_info',
          sourceHandle: 'average',
          target: 'kick_adapt',
          targetHandle: 'value',
        },
        {
          source: INPUT_ALIAS,
          sourceHandle: 'frequencyAnalysis',
          target: 'bass_band',
          targetHandle: 'frequencyAnalysis',
        },
        {
          source: 'bass_band',
          sourceHandle: 'bandData',
          target: 'bass_info',
          targetHandle: 'data',
        },
        {
          source: 'bass_info',
          sourceHandle: 'average',
          target: 'bass_adapt',
          targetHandle: 'value',
        },
        {
          source: 'kick_adapt',
          sourceHandle: 'result',
          target: 'combine',
          targetHandle: 'a',
        },
        {
          source: 'bass_adapt',
          sourceHandle: 'result',
          target: 'combine',
          targetHandle: 'b',
        },
        {
          source: 'combine',
          sourceHandle: 'result',
          target: 'envelope',
          targetHandle: 'value',
        },
        {
          source: 'envelope',
          sourceHandle: 'env',
          target: 'scale',
          targetHandle: 'a',
        },
        {
          source: 'scale',
          sourceHandle: 'result',
          target: OUTPUT_ALIAS,
          targetHandle: 'output',
        },
      ],
    },
    // Seed: Changes neuron structure on frequency peaks
    seed: {
      id: 'seed-network',
      name: 'Seed - Frequency Trigger',
      description: 'Counts frequency peaks to change structure (180-4000Hz)',
      outputType: 'number',
      autoPlace: false,
      nodes: [
        {
          id: 'band',
          label: 'Frequency Band',
          position: { x: -329, y: 53 },
          inputValues: {
            startFrequency: 180,
            endFrequency: 4000,
          },
        },
        {
          id: 'info',
          label: 'Band Info',
          position: { x: 0, y: 0 },
        },
        {
          id: 'env',
          label: 'Envelope Follower',
          position: { x: 0, y: 0 },
          inputValues: {
            attackMs: 4,
            releaseMs: 140,
          },
        },
        {
          id: 'adapt',
          label: 'Adaptive Normalize (Quantile)',
          position: { x: 40, y: 76 },
          inputValues: {
            windowMs: 4000,
            qLow: 0.5,
            qHigh: 0.95,
            freezeBelow: 90,
          },
        },
        {
          id: 'counter',
          label: 'Threshold Counter',
          position: { x: 339, y: 83 },
          inputValues: {
            threshold: 0.5,
            maxValue: 1000,
          },
        },
      ],
      edges: [
        {
          source: INPUT_ALIAS,
          sourceHandle: 'frequencyAnalysis',
          target: 'band',
          targetHandle: 'frequencyAnalysis',
        },
        {
          source: 'band',
          sourceHandle: 'bandData',
          target: 'info',
          targetHandle: 'data',
        },
        {
          source: 'info',
          sourceHandle: 'average',
          target: 'env',
          targetHandle: 'value',
        },
        {
          source: 'env',
          sourceHandle: 'env',
          target: 'adapt',
          targetHandle: 'value',
        },
        {
          source: 'adapt',
          sourceHandle: 'result',
          target: 'counter',
          targetHandle: 'value',
        },
        {
          source: 'counter',
          sourceHandle: 'count',
          target: OUTPUT_ALIAS,
          targetHandle: 'output',
        },
      ],
    },
  },
  init3D: ({ threeCtx: { scene, camera, renderer }, config }) => {
    // Position camera
    camera.position.set(8, 5, 8);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Create parent group for the entire structure
    const structureGroup = new THREE.Group();
    scene.add(structureGroup);
    scene.userData.structureGroup = structureGroup;

    // Generate fractal cube structure
    const cubeData = generateFractalCubeStructure(
      config.seed,
      config.maxCubes,
      config.fractalDepth,
    );
    scene.userData.cubeData = cubeData;

    // Create instanced mesh for all cubes
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: config.cubeColor,
      metalness: config.metalness,
      roughness: config.roughness,
    });
    const instancedMesh = new THREE.InstancedMesh(
      geometry,
      material,
      cubeData.length,
    );

    // Set up instance matrices with variable scales
    const matrix = new THREE.Matrix4();

    cubeData.forEach((cube, i) => {
      const [x, y, z] = cube.pos;
      const scale = cube.scale * config.cubeSize;
      matrix.makeScale(scale, scale, scale);
      matrix.setPosition(
        x * config.spacing,
        y * config.spacing,
        z * config.spacing,
      );
      instancedMesh.setMatrixAt(i, matrix);
    });

    instancedMesh.instanceMatrix.needsUpdate = true;
    structureGroup.add(instancedMesh);

    scene.userData.instancedMesh = instancedMesh;
    scene.userData.orbitAngle = 0;
    scene.userData.orbitAngle2 = 0;
    scene.userData.orbitAngle3 = 0;
    scene.userData.lastSeed = config.seed;
    scene.userData.lastMaxCubes = config.maxCubes;
    scene.userData.lastFractalDepth = config.fractalDepth;
    scene.userData.lastSpacing = config.spacing;
    scene.userData.lastCubeSize = config.cubeSize;

    // Initialize lighting - 3 colored spotlights positioned symmetrically
    const lightDistance = 12;

    // Light 1 - positioned at 120 degree angle (front-right)
    const spotlight1 = new THREE.SpotLight(
      config.light1Color,
      config.lightIntensity,
      0,
      Math.PI / 3,
      0.5,
      2,
    );
    const angle1 = 0;
    spotlight1.position.set(
      Math.cos(angle1) * lightDistance,
      lightDistance * 0.5,
      Math.sin(angle1) * lightDistance,
    );
    spotlight1.target.position.set(0, 0, 0);
    scene.add(spotlight1);
    scene.add(spotlight1.target);

    // Light 2 - positioned at 120 degree angle offset (back-left)
    const spotlight2 = new THREE.SpotLight(
      config.light2Color,
      config.lightIntensity,
      0,
      Math.PI / 3,
      0.5,
      2,
    );
    const angle2 = (Math.PI * 2) / 3;
    spotlight2.position.set(
      Math.cos(angle2) * lightDistance,
      lightDistance * 0.5,
      Math.sin(angle2) * lightDistance,
    );
    spotlight2.target.position.set(0, 0, 0);
    scene.add(spotlight2);
    scene.add(spotlight2.target);

    // Light 3 - positioned at 120 degree angle offset (back-right)
    const spotlight3 = new THREE.SpotLight(
      config.light3Color,
      config.lightIntensity,
      0,
      Math.PI / 3,
      0.5,
      2,
    );
    const angle3 = (Math.PI * 4) / 3;
    spotlight3.position.set(
      Math.cos(angle3) * lightDistance,
      lightDistance * 0.5,
      Math.sin(angle3) * lightDistance,
    );
    spotlight3.target.position.set(0, 0, 0);
    scene.add(spotlight3);
    scene.add(spotlight3.target);

    // Add ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(
      '#ffffff',
      config.ambientBrightness,
    );
    scene.add(ambientLight);

    scene.userData.lights = {
      spotlight1,
      spotlight2,
      spotlight3,
      ambientLight,
    };
  },
  draw3D: ({
    threeCtx: { scene, camera, renderer },
    audioData: { dataArray },
    config,
    dt,
  }) => {
    const structureGroup = scene.userData.structureGroup as THREE.Group;
    let instancedMesh = scene.userData.instancedMesh as THREE.InstancedMesh;

    // Regenerate structure if seed, maxCubes, or fractalDepth changed
    if (
      scene.userData.lastSeed !== config.seed ||
      scene.userData.lastMaxCubes !== config.maxCubes ||
      scene.userData.lastFractalDepth !== config.fractalDepth
    ) {
      // Remove old instanced mesh
      structureGroup.remove(instancedMesh);
      instancedMesh.geometry.dispose();
      (instancedMesh.material as THREE.Material).dispose();

      // Generate new fractal structure
      const cubeData = generateFractalCubeStructure(
        config.seed,
        config.maxCubes,
        config.fractalDepth,
      );
      scene.userData.cubeData = cubeData;

      // Create new instanced mesh
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({
        color: config.cubeColor,
        metalness: config.metalness,
        roughness: config.roughness,
      });
      instancedMesh = new THREE.InstancedMesh(
        geometry,
        material,
        cubeData.length,
      );

      // Set up instance matrices with variable scales
      const matrix = new THREE.Matrix4();

      cubeData.forEach((cube, i) => {
        const [x, y, z] = cube.pos;
        const scale = cube.scale * config.cubeSize;
        matrix.makeScale(scale, scale, scale);
        matrix.setPosition(
          x * config.spacing,
          y * config.spacing,
          z * config.spacing,
        );
        instancedMesh.setMatrixAt(i, matrix);
      });

      instancedMesh.instanceMatrix.needsUpdate = true;
      structureGroup.add(instancedMesh);

      scene.userData.instancedMesh = instancedMesh;
      scene.userData.lastSeed = config.seed;
      scene.userData.lastMaxCubes = config.maxCubes;
      scene.userData.lastFractalDepth = config.fractalDepth;
      scene.userData.lastSpacing = config.spacing;
      scene.userData.lastCubeSize = config.cubeSize;
    }

    // Update instance matrices if spacing or size changed
    if (
      scene.userData.lastSpacing !== config.spacing ||
      scene.userData.lastCubeSize !== config.cubeSize
    ) {
      const cubeData = scene.userData.cubeData as CubeData[];
      const matrix = new THREE.Matrix4();

      cubeData.forEach((cube, i) => {
        const [x, y, z] = cube.pos;
        const scale = cube.scale * config.cubeSize;
        matrix.makeScale(scale, scale, scale);
        matrix.setPosition(
          x * config.spacing,
          y * config.spacing,
          z * config.spacing,
        );
        instancedMesh.setMatrixAt(i, matrix);
      });

      instancedMesh.instanceMatrix.needsUpdate = true;
      scene.userData.lastSpacing = config.spacing;
      scene.userData.lastCubeSize = config.cubeSize;
    }

    // Update material properties
    const material = instancedMesh.material as THREE.MeshStandardMaterial;
    material.color.set(config.cubeColor);
    material.metalness = config.metalness;
    material.roughness = config.roughness;

    // Update light colors and intensity
    const lights = scene.userData.lights as {
      spotlight1: THREE.SpotLight;
      spotlight2: THREE.SpotLight;
      spotlight3: THREE.SpotLight;
      ambientLight: THREE.AmbientLight;
    };

    lights.spotlight1.color.set(config.light1Color);
    lights.spotlight1.intensity = config.lightIntensity;

    lights.spotlight2.color.set(config.light2Color);
    lights.spotlight2.intensity = config.lightIntensity;

    lights.spotlight3.color.set(config.light3Color);
    lights.spotlight3.intensity = config.lightIntensity;

    lights.ambientLight.intensity = config.ambientBrightness;

    // Rotate the entire structure
    structureGroup.rotation.x += config.rotationSpeed * dt * 0.3;
    structureGroup.rotation.y += config.rotationSpeed * dt;
    structureGroup.rotation.z += config.rotationSpeed * dt * 0.5;

    // Orbit camera around the center with multi-axis rotation (like a satellite)
    scene.userData.orbitAngle += config.orbitSpeed * dt;
    scene.userData.orbitAngle2 += config.orbitSpeed * dt * 0.7; // Different speed for drift
    scene.userData.orbitAngle3 += config.orbitSpeed * dt * 0.4; // Even slower for precession

    const angle1 = scene.userData.orbitAngle;
    const angle2 = scene.userData.orbitAngle2;
    const angle3 = scene.userData.orbitAngle3;
    const radius = config.orbitRadius;

    // Use spherical coordinates with multiple rotating axes
    // This creates an off-axis orbit that drifts over time
    const theta = angle1; // Primary orbital angle
    const phi = Math.PI / 3 + Math.sin(angle2) * 0.5; // Inclination that drifts
    const twist = angle3; // Additional rotation for precession

    // Calculate position using spherical coordinates
    const x = radius * Math.sin(phi) * Math.cos(theta + twist);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta + twist);

    camera.position.set(x, y, z);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    renderer.render(scene, camera);
  },
});

export default OrbitingCubes;
