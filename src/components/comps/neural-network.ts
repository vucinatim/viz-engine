import * as THREE from 'three';
import { v } from '../config/config';
import { createComponent } from '../config/create-component';

// Custom neuron shader
const neuronVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vLocalPosition;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vLocalPosition = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const neuronFragmentShader = `
  uniform vec3 baseColor;
  uniform vec3 glowColor;
  uniform float glowIntensity;
  uniform float fresnelPower;
  uniform float metalness;
  uniform float roughness;
  uniform float growth;
  uniform float dendriteReach;
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vLocalPosition;
  
  void main() {
    // Growth animation - fade out dendrites beyond growth radius (from local origin)
    float distFromSoma = length(vLocalPosition);
    float growthRadius = growth * dendriteReach;
    
    // Smooth fadeout at the growth edge
    float fadeStart = growthRadius - 0.5;
    float fadeEnd = growthRadius;
    float alpha = 1.0 - smoothstep(fadeStart, fadeEnd, distFromSoma);
    
    // Discard fragments beyond growth
    if (alpha < 0.01) discard;
    
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    // Fresnel effect (rim lighting)
    float fresnel = pow(1.0 - abs(dot(normal, viewDir)), fresnelPower);
    
    // Basic lighting
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float diffuse = max(dot(normal, lightDir), 0.0);
    
    // Ambient + diffuse
    vec3 ambient = baseColor * 0.3;
    vec3 diffuseColor = baseColor * diffuse * 0.7;
    
    // Fresnel glow
    vec3 fresnelGlow = glowColor * fresnel * glowIntensity;
    
    // Distance-based subtle color variation (using local position)
    float dist = length(vLocalPosition);
    float distFactor = sin(dist * 0.5) * 0.1 + 0.9;
    
    // Enhanced glow at growth tips
    float tipGlow = smoothstep(fadeStart - 1.0, fadeStart, distFromSoma) * 0.3;
    
    // Combine all
    vec3 finalColor = (ambient + diffuseColor) * distFactor + fresnelGlow + glowColor * tipGlow;
    
    // Metallic reflection hint
    vec3 reflectDir = reflect(-viewDir, normal);
    float spec = pow(max(dot(reflectDir, lightDir), 0.0), 32.0) * metalness;
    finalColor += vec3(spec) * (1.0 - roughness);
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

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

  randomRange(min: number, max: number) {
    return min + this.random() * (max - min);
  }
}

// Dendrite path data
type DendritePath = {
  points: THREE.Vector3[];
  startRadius: number; // Radius at the start (near soma)
  endRadius: number; // Radius at the end (tip)
};

// Junction sphere data
type JunctionSphere = {
  position: THREE.Vector3;
  radius: number;
};

// Generate neuron structure as tube paths and junction spheres
function generateNeuronPaths(
  seed: number,
  dendriteReach: number,
): {
  paths: DendritePath[];
  junctions: JunctionSphere[];
} {
  const rng = new SeededRandom(seed);
  const paths: DendritePath[] = [];
  const junctions: JunctionSphere[] = [];

  // Generate 4-7 main dendrites with organic distribution
  const dendriteCount = rng.randomInt(4, 7);
  for (let i = 0; i < dendriteCount; i++) {
    // Random angles instead of evenly distributed
    const angle = rng.random() * Math.PI * 2;
    const elevation = rng.randomRange(-0.8, 0.8);

    // Main dendrites start thick (connected to soma)
    generateDendrite(
      paths,
      junctions,
      rng,
      new THREE.Vector3(0, 0, 0),
      angle,
      elevation,
      2,
      1.2, // Start very thick at soma
      dendriteReach,
    );
  }

  return { paths, junctions };
}

// Generate organic branching dendrite path
function generateDendrite(
  paths: DendritePath[],
  junctions: JunctionSphere[],
  rng: SeededRandom,
  startPos: THREE.Vector3,
  angle: number,
  elevation: number,
  depth: number,
  baseRadius: number,
  dendriteReach: number,
) {
  if (depth <= 0 || paths.length > 50) return;

  // Add junction sphere at start of this dendrite
  junctions.push({
    position: startPos.clone(),
    radius: baseRadius,
  });

  // Calculate initial direction
  let dx = Math.cos(angle) * Math.cos(elevation);
  let dy = Math.sin(elevation);
  let dz = Math.sin(angle) * Math.cos(elevation);

  // Normalize
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  dx /= len;
  dy /= len;
  dz /= len;

  const points: THREE.Vector3[] = [];
  let x = startPos.x;
  let y = startPos.y;
  let z = startPos.z;

  // Add start point
  points.push(new THREE.Vector3(x, y, z));

  // Scale segment length based on dendriteReach (was 2.5-4.5 for reach of 8)
  const reachScale = dendriteReach / 8.0;
  const segmentLength = rng.randomRange(2.5, 4.5) * reachScale;
  const steps = rng.randomInt(8, 12); // Fewer steps for smoother curves
  const stepSize = segmentLength / steps;

  // Low-frequency wave parameters for smooth, dreamlike motion
  const waveFreq1 = rng.random() * 0.3 + 0.1; // Very slow wave
  const waveFreq2 = rng.random() * 0.5 + 0.2; // Medium wave
  const wavePhase1 = rng.random() * Math.PI * 2;
  const wavePhase2 = rng.random() * Math.PI * 2;
  const waveAmp = 0.15; // Amplitude of the wave

  // Create smooth, wavy path
  for (let i = 0; i < steps; i++) {
    const t = i / steps;

    x += dx * stepSize;
    y += dy * stepSize;
    z += dz * stepSize;

    // Add low-frequency sinusoidal waves instead of high-frequency noise
    const wave1 = Math.sin(t * Math.PI * 2 * waveFreq1 + wavePhase1) * waveAmp;
    const wave2 =
      Math.sin(t * Math.PI * 2 * waveFreq2 + wavePhase2) * waveAmp * 0.5;

    // Apply waves perpendicular to direction
    const perpX = -dz;
    const perpZ = dx;
    const perpLen = Math.sqrt(perpX * perpX + perpZ * perpZ);

    if (perpLen > 0.001) {
      const waveOffset = wave1 + wave2;
      x += (perpX / perpLen) * waveOffset;
      z += (perpZ / perpLen) * waveOffset;
      y += wave1 * 0.3; // Subtle vertical wave
    }

    points.push(new THREE.Vector3(x, y, z));

    // Very gentle curve (reduced for smoother motion)
    const curveAmount = 0.03;
    dx += (rng.random() - 0.5) * curveAmount;
    dy += (rng.random() - 0.5) * curveAmount;
    dz += (rng.random() - 0.5) * curveAmount;

    // Re-normalize
    const newLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
    dx /= newLen;
    dy /= newLen;
    dz /= newLen;

    // Chance to branch mid-segment
    if (i > steps / 2 && rng.random() > 0.75 && depth > 1) {
      const branchAngle = Math.atan2(dz, dx) + rng.randomRange(-0.9, 0.9);
      const branchElevation = Math.asin(dy) + rng.randomRange(-0.6, 0.6);
      // Calculate current radius at this point along the dendrite
      const t = i / steps;
      const currentRadius = baseRadius * (1.0 - t * 0.7); // Taper along length
      generateDendrite(
        paths,
        junctions,
        rng,
        new THREE.Vector3(x, y, z),
        branchAngle,
        branchElevation,
        depth - 1,
        currentRadius * 0.75, // Branch is thinner than current thickness
        dendriteReach,
      );
    }
  }

  // Add this path with tapering radius
  if (points.length >= 2) {
    const endRadius = baseRadius * 0.4; // Taper to 40% of starting thickness (less aggressive)
    paths.push({
      points,
      startRadius: baseRadius,
      endRadius: endRadius,
    });
  }

  // Calculate radius at end for branches
  const endRadius = baseRadius * 0.4;

  // Branch at the end
  if (depth > 1 && rng.random() > 0.4) {
    const numBranches = rng.randomInt(2, 3);
    for (let b = 0; b < numBranches; b++) {
      const branchAngle = Math.atan2(dz, dx) + rng.randomRange(-1.2, 1.2);
      const branchElevation = Math.asin(dy) + rng.randomRange(-0.7, 0.7);
      generateDendrite(
        paths,
        junctions,
        rng,
        new THREE.Vector3(x, y, z),
        branchAngle,
        branchElevation,
        depth - 1,
        endRadius * 0.85, // Branches are slightly thinner than parent tip
        dendriteReach,
      );
    }
  } else {
    // Add endpoint sphere for dendrite tips
    junctions.push({
      position: new THREE.Vector3(x, y, z),
      radius: endRadius,
    });
  }
}

// Helper: Create shader materials for neuron
function createNeuronMaterials(config: {
  neuronColor: string;
  somaEmission: string;
  emissiveIntensity: number;
  fresnelPower: number;
  metalness: number;
  roughness: number;
  growth: number;
  dendriteReach: number;
}) {
  const dendriteMaterial = new THREE.ShaderMaterial({
    vertexShader: neuronVertexShader,
    fragmentShader: neuronFragmentShader,
    uniforms: {
      baseColor: { value: new THREE.Color(config.neuronColor) },
      glowColor: { value: new THREE.Color(config.somaEmission) },
      glowIntensity: { value: config.emissiveIntensity },
      fresnelPower: { value: config.fresnelPower },
      metalness: { value: config.metalness },
      roughness: { value: config.roughness },
      growth: { value: config.growth },
      dendriteReach: { value: config.dendriteReach },
    },
    transparent: true,
    depthWrite: true,
  });

  const somaMaterial = new THREE.ShaderMaterial({
    vertexShader: neuronVertexShader,
    fragmentShader: neuronFragmentShader,
    uniforms: {
      baseColor: { value: new THREE.Color(config.neuronColor) },
      glowColor: { value: new THREE.Color(config.somaEmission) },
      glowIntensity: { value: config.emissiveIntensity * 2.0 },
      fresnelPower: { value: config.fresnelPower },
      metalness: { value: config.metalness },
      roughness: { value: config.roughness },
      growth: { value: 1.0 }, // Soma always visible
      dendriteReach: { value: config.dendriteReach },
    },
    transparent: true,
    depthWrite: true,
  });

  return { dendriteMaterial, somaMaterial };
}

// Helper: Create neuron geometry (tubes, junctions, soma)
function createNeuronGeometry(
  paths: DendritePath[],
  junctions: JunctionSphere[],
  tubeRadius: number,
  dendriteMaterial: THREE.ShaderMaterial,
  somaMaterial: THREE.ShaderMaterial,
) {
  const neuronGroup = new THREE.Group();

  // Create tube geometry for each dendrite path
  paths.forEach((path) => {
    const curve = new THREE.CatmullRomCurve3(
      path.points,
      false,
      'catmullrom',
      0.3,
    );

    const tubeGeometry = new THREE.TubeGeometry(
      curve,
      32, // tubular segments
      1.0, // base radius
      12, // radial segments
      false,
    );

    // Manually adjust vertices to create taper
    const position = tubeGeometry.attributes.position;
    const radialSegments = 12;
    const tubularSegments = 32;

    for (let i = 0; i <= tubularSegments; i++) {
      const u = i / tubularSegments;
      const targetRadius =
        (path.startRadius + (path.endRadius - path.startRadius) * u) *
        tubeRadius;

      for (let j = 0; j <= radialSegments; j++) {
        const index = i * (radialSegments + 1) + j;
        const x = position.getX(index);
        const y = position.getY(index);
        const z = position.getZ(index);

        const curvePoint = curve.getPoint(u);

        const dx = x - curvePoint.x;
        const dy = y - curvePoint.y;
        const dz = z - curvePoint.z;

        position.setXYZ(
          index,
          curvePoint.x + dx * targetRadius,
          curvePoint.y + dy * targetRadius,
          curvePoint.z + dz * targetRadius,
        );
      }
    }

    position.needsUpdate = true;
    tubeGeometry.computeVertexNormals();

    const tubeMesh = new THREE.Mesh(tubeGeometry, dendriteMaterial);
    neuronGroup.add(tubeMesh);
  });

  // Add junction spheres at all branch points and endpoints
  junctions.forEach((junction) => {
    const junctionGeometry = new THREE.SphereGeometry(
      junction.radius * tubeRadius,
      16,
      16,
    );
    const junctionMesh = new THREE.Mesh(junctionGeometry, dendriteMaterial);
    junctionMesh.position.copy(junction.position);
    neuronGroup.add(junctionMesh);
  });

  // Add soma (cell body) at center
  const somaGeometry = new THREE.SphereGeometry(1.2, 32, 32);
  const soma = new THREE.Mesh(somaGeometry, somaMaterial);
  neuronGroup.add(soma);

  return { neuronGroup, soma };
}

// Helper: Update material uniforms
function updateMaterialUniforms(
  dendriteMaterial: THREE.ShaderMaterial,
  somaMaterial: THREE.ShaderMaterial,
  config: {
    neuronColor: string;
    somaEmission: string;
    emissiveIntensity: number;
    fresnelPower: number;
    metalness: number;
    roughness: number;
    growth: number;
    dendriteReach: number;
  },
) {
  dendriteMaterial.uniforms.baseColor.value.set(config.neuronColor);
  dendriteMaterial.uniforms.glowColor.value.set(config.somaEmission);
  dendriteMaterial.uniforms.glowIntensity.value = config.emissiveIntensity;
  dendriteMaterial.uniforms.fresnelPower.value = config.fresnelPower;
  dendriteMaterial.uniforms.metalness.value = config.metalness;
  dendriteMaterial.uniforms.roughness.value = config.roughness;
  dendriteMaterial.uniforms.growth.value = config.growth;
  dendriteMaterial.uniforms.dendriteReach.value = config.dendriteReach;

  somaMaterial.uniforms.baseColor.value.set(config.neuronColor);
  somaMaterial.uniforms.glowColor.value.set(config.somaEmission);
  somaMaterial.uniforms.glowIntensity.value = config.emissiveIntensity * 2.0;
  somaMaterial.uniforms.fresnelPower.value = config.fresnelPower;
  somaMaterial.uniforms.metalness.value = config.metalness;
  somaMaterial.uniforms.roughness.value = config.roughness;
  somaMaterial.uniforms.dendriteReach.value = config.dendriteReach;
}

// Helper: Generate 3D grid positions for neurons (filling from center outward)
function generateNeuronPositions(
  count: number,
  baseSeed: number,
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];
  const spacing = 15; // Spacing between neurons

  if (count === 1) {
    // Single neuron at center
    positions.push(new THREE.Vector3(0, 0, 0));
    return positions;
  }

  // Generate all possible positions in a 3D grid, sorted by distance from center
  const possiblePositions: { pos: THREE.Vector3; dist: number }[] = [];
  const maxRadius = Math.ceil(Math.cbrt(count)) + 1;

  for (let x = -maxRadius; x <= maxRadius; x++) {
    for (let y = -maxRadius; y <= maxRadius; y++) {
      for (let z = -maxRadius; z <= maxRadius; z++) {
        const pos = new THREE.Vector3(x * spacing, y * spacing, z * spacing);
        const dist = pos.length();
        possiblePositions.push({ pos, dist });
      }
    }
  }

  // Sort by distance from center (fills from inside out)
  possiblePositions.sort((a, b) => a.dist - b.dist);

  // Take the first 'count' positions
  for (let i = 0; i < count && i < possiblePositions.length; i++) {
    positions.push(possiblePositions[i].pos);
  }

  return positions;
}

const NeuralNetwork = createComponent({
  name: 'Neural Network',
  description: 'Realistic procedural neuron structures - fly through the brain',
  config: v.config({
    neuronCount: v.number({
      label: 'Neuron Count',
      description: 'Number of neurons to display',
      defaultValue: 1,
      min: 1,
      max: 25,
      step: 1,
    }),
    seed: v.number({
      label: 'Neuron Seed',
      description: 'Seed for procedural neuron generation',
      defaultValue: 42,
      min: 1,
      max: 10000,
      step: 1,
    }),
    tubeRadius: v.number({
      label: 'Tube Thickness',
      description: 'Radius of the dendrite tubes',
      defaultValue: 0.25,
      min: 0.05,
      max: 1,
      step: 0.05,
    }),
    neuronColor: v.color({
      label: 'Neuron Color',
      description: 'Base color of the neuron',
      defaultValue: '#00CED1', // Cyan
    }),
    somaEmission: v.color({
      label: 'Soma Glow',
      description: 'Emission color of the cell body',
      defaultValue: '#FF1493', // Hot pink
    }),
    emissiveIntensity: v.number({
      label: 'Glow Intensity',
      description: 'How much the soma glows',
      defaultValue: 0.5,
      min: 0,
      max: 2,
      step: 0.1,
    }),
    metalness: v.number({
      label: 'Metalness',
      description: 'Metallic appearance',
      defaultValue: 0.3,
      min: 0,
      max: 1,
      step: 0.05,
    }),
    roughness: v.number({
      label: 'Roughness',
      description: 'Surface roughness',
      defaultValue: 0.4,
      min: 0,
      max: 1,
      step: 0.05,
    }),
    fresnelPower: v.number({
      label: 'Rim Glow',
      description: 'Fresnel rim lighting intensity',
      defaultValue: 3.0,
      min: 0.5,
      max: 8,
      step: 0.5,
    }),
    growth: v.number({
      label: 'Growth',
      description: 'Dendrite growth animation (0 = just soma, 1 = fully grown)',
      defaultValue: 1.0,
      min: 0,
      max: 1,
      step: 0.01,
    }),
    dendriteReach: v.number({
      label: 'Dendrite Reach',
      description:
        'How far dendrites extend from soma (15+ to connect neurons)',
      defaultValue: 20,
      min: 5,
      max: 40,
      step: 1,
    }),
  }),
  defaultNetworks: {},
  init3D: ({ threeCtx: { scene, camera, renderer }, config }) => {
    // Camera positioned inside the neural network for immersive "flying in the brain" effect
    camera.position.set(0, 2, 8);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Generate positions for all neurons
    const neuronPositions = generateNeuronPositions(
      config.neuronCount,
      config.seed,
    );

    // Container for all neurons
    const networkGroup = new THREE.Group();
    const neurons: Array<{
      group: THREE.Group;
      soma: THREE.Mesh;
      dendriteMaterial: THREE.ShaderMaterial;
      somaMaterial: THREE.ShaderMaterial;
      position: THREE.Vector3;
    }> = [];

    // Create each neuron
    neuronPositions.forEach((position, index) => {
      // Each neuron gets a unique seed
      const neuronSeed = config.seed + index * 1000;
      const { paths, junctions } = generateNeuronPaths(
        neuronSeed,
        config.dendriteReach,
      );

      // Create materials for this neuron
      const { dendriteMaterial, somaMaterial } = createNeuronMaterials(config);

      // Create neuron geometry
      const { neuronGroup, soma } = createNeuronGeometry(
        paths,
        junctions,
        config.tubeRadius,
        dendriteMaterial,
        somaMaterial,
      );

      // Position the neuron
      neuronGroup.position.copy(position);

      networkGroup.add(neuronGroup);
      neurons.push({
        group: neuronGroup,
        soma,
        dendriteMaterial,
        somaMaterial,
        position,
      });
    });

    scene.add(networkGroup);
    scene.userData.networkGroup = networkGroup;
    scene.userData.neurons = neurons;
    scene.userData.lastSeed = config.seed;
    scene.userData.lastTubeRadius = config.tubeRadius;
    scene.userData.lastNeuronCount = config.neuronCount;

    // Lighting
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.3);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight('#ffffff', 1.0);
    keyLight.position.set(10, 10, 10);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight('#4169E1', 0.6); // Royal blue
    fillLight.position.set(-5, 0, -5);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight('#FF1493', 0.4); // Hot pink
    rimLight.position.set(0, -5, 5);
    scene.add(rimLight);

    scene.userData.lights = { ambientLight, keyLight, fillLight, rimLight };
  },
  draw3D: ({
    threeCtx: { scene, camera, renderer },
    audioData: { dataArray },
    config,
    dt,
  }) => {
    const networkGroup = scene.userData.networkGroup as THREE.Group;
    const neurons = scene.userData.neurons as Array<{
      group: THREE.Group;
      soma: THREE.Mesh;
      dendriteMaterial: THREE.ShaderMaterial;
      somaMaterial: THREE.ShaderMaterial;
      position: THREE.Vector3;
    }>;

    // Regenerate if seed, tube radius, or neuron count changed
    if (
      scene.userData.lastSeed !== config.seed ||
      scene.userData.lastTubeRadius !== config.tubeRadius ||
      scene.userData.lastNeuronCount !== config.neuronCount
    ) {
      // Remove old network group
      scene.remove(networkGroup);
      networkGroup.children.forEach((child) => {
        if (child instanceof THREE.Group) {
          child.children.forEach((grandchild) => {
            if (grandchild instanceof THREE.Mesh) {
              grandchild.geometry.dispose();
              if (Array.isArray(grandchild.material)) {
                grandchild.material.forEach((mat) => mat.dispose());
              } else {
                grandchild.material.dispose();
              }
            }
          });
        }
      });

      // Generate positions for all neurons
      const neuronPositions = generateNeuronPositions(
        config.neuronCount,
        config.seed,
      );

      // Container for all neurons
      const newNetworkGroup = new THREE.Group();
      const newNeurons: Array<{
        group: THREE.Group;
        soma: THREE.Mesh;
        dendriteMaterial: THREE.ShaderMaterial;
        somaMaterial: THREE.ShaderMaterial;
        position: THREE.Vector3;
      }> = [];

      // Create each neuron
      neuronPositions.forEach((position, index) => {
        const neuronSeed = config.seed + index * 1000;
        const { paths, junctions } = generateNeuronPaths(
          neuronSeed,
          config.dendriteReach,
        );

        const { dendriteMaterial, somaMaterial } =
          createNeuronMaterials(config);

        const { neuronGroup, soma } = createNeuronGeometry(
          paths,
          junctions,
          config.tubeRadius,
          dendriteMaterial,
          somaMaterial,
        );

        neuronGroup.position.copy(position);

        newNetworkGroup.add(neuronGroup);
        newNeurons.push({
          group: neuronGroup,
          soma,
          dendriteMaterial,
          somaMaterial,
          position,
        });
      });

      scene.add(newNetworkGroup);
      scene.userData.networkGroup = newNetworkGroup;
      scene.userData.neurons = newNeurons;
      scene.userData.lastSeed = config.seed;
      scene.userData.lastTubeRadius = config.tubeRadius;
      scene.userData.lastNeuronCount = config.neuronCount;
    } else {
      // Update shader uniforms for all neurons without regenerating
      neurons.forEach(({ dendriteMaterial, somaMaterial }) => {
        updateMaterialUniforms(dendriteMaterial, somaMaterial, config);
      });
    }

    // Subtle rotation for visual interest
    networkGroup.rotation.y += 0.05 * dt;

    renderer.render(scene, camera);
  },
});

export default NeuralNetwork;
