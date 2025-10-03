import * as THREE from 'three';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
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
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vLocalPosition;
  
  void main() {
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
    
    // Distance-based subtle color variation
    float dist = length(vLocalPosition);
    float distFactor = sin(dist * 0.5) * 0.1 + 0.9;
    
    // Combine all
    vec3 finalColor = (ambient + diffuseColor) * distFactor + fresnelGlow;
    
    // Metallic reflection hint
    vec3 reflectDir = reflect(-viewDir, normal);
    float spec = pow(max(dot(reflectDir, lightDir), 0.0), 32.0) * metalness;
    finalColor += vec3(spec) * (1.0 - roughness);
    
    gl_FragColor = vec4(finalColor, 1.0);
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

// Connection data between neurons
type NeuronConnection = {
  fromIndex: number;
  toIndex: number;
  targetPosition: THREE.Vector3; // World position of target neuron
};

// Dendrite path data
type DendritePath = {
  points: THREE.Vector3[]; // Path points in local space
  startRadius: number;
  endRadius: number;
  targetPosition: THREE.Vector3; // World target for this connection
};

// Junction sphere data
type JunctionSphere = {
  position: THREE.Vector3; // Local position
  radius: number;
};

// Traveling signal orb data
type SignalOrb = {
  mesh: THREE.Mesh;
  path: THREE.Vector3[]; // Path points in world space
  progress: number; // 0-1 along the path
  speed: number; // Units per second
  neuronIndex: number; // Which neuron this signal belongs to
  dendriteIndex: number; // Which dendrite path this is traveling on
};

// Neuron activation state
type NeuronActivation = {
  level: number; // 0-1 activation level
  lastTriggerTime: number; // Time when last triggered
};

// Ease-out function (starts fast, decelerates at end)
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Build connection graph between neurons based on proximity
function buildConnectionGraph(
  neuronPositions: THREE.Vector3[],
  maxConnections: number,
  maxDistance: number,
): NeuronConnection[] {
  const connections: NeuronConnection[] = [];

  neuronPositions.forEach((fromPos, fromIndex) => {
    // Find all neighbors within max distance
    const neighbors: Array<{ index: number; distance: number }> = [];

    neuronPositions.forEach((toPos, toIndex) => {
      if (fromIndex === toIndex) return;

      const distance = fromPos.distanceTo(toPos);
      if (distance <= maxDistance) {
        neighbors.push({ index: toIndex, distance });
      }
    });

    // Sort by distance and take K nearest
    neighbors.sort((a, b) => a.distance - b.distance);
    const connectionsToMake = Math.min(maxConnections, neighbors.length);

    for (let i = 0; i < connectionsToMake; i++) {
      connections.push({
        fromIndex,
        toIndex: neighbors[i].index,
        targetPosition: neuronPositions[neighbors[i].index].clone(),
      });
    }
  });

  return connections;
}

// Generate organic curve from start to target with perturbed control points
function generateOrganicCurve(
  startPos: THREE.Vector3,
  targetPos: THREE.Vector3,
  rng: SeededRandom,
  curveComplexity: number = 3,
): THREE.Vector3[] {
  const direction = new THREE.Vector3()
    .subVectors(targetPos, startPos)
    .normalize();
  const distance = startPos.distanceTo(targetPos);

  // Create perpendicular vectors for offset
  // Handle case where direction is parallel to up vector (vertical dendrites)
  const up = new THREE.Vector3(0, 1, 0);
  const isVertical = Math.abs(direction.dot(up)) > 0.99;
  const referenceVector = isVertical ? new THREE.Vector3(1, 0, 0) : up;

  const perpendicular1 = new THREE.Vector3()
    .crossVectors(direction, referenceVector)
    .normalize();
  const perpendicular2 = new THREE.Vector3()
    .crossVectors(direction, perpendicular1)
    .normalize();

  // Generate control points along the path with organic offsets
  const controlPoints: THREE.Vector3[] = [startPos.clone()];

  for (let i = 1; i < curveComplexity + 1; i++) {
    const t = i / (curveComplexity + 1);
    const basePoint = new THREE.Vector3().lerpVectors(startPos, targetPos, t);

    // Add organic offset (more in middle, less at ends)
    const offsetStrength = Math.sin(t * Math.PI) * distance * 0.15;
    const offsetX = rng.randomRange(-1, 1) * offsetStrength;
    const offsetY = rng.randomRange(-1, 1) * offsetStrength;

    const offset = perpendicular1
      .clone()
      .multiplyScalar(offsetX)
      .add(perpendicular2.clone().multiplyScalar(offsetY));

    controlPoints.push(basePoint.add(offset));
  }

  controlPoints.push(targetPos.clone());

  // Create smooth curve from control points
  const curve = new THREE.CatmullRomCurve3(
    controlPoints,
    false,
    'catmullrom',
    0.3,
  );
  return curve.getPoints(32);
}

// Generate neuron structure from connection graph
function generateNeuronPaths(
  seed: number,
  neuronPosition: THREE.Vector3,
  targetConnections: NeuronConnection[],
  growth: number,
): {
  paths: DendritePath[];
  junctions: JunctionSphere[];
} {
  const rng = new SeededRandom(seed);
  const paths: DendritePath[] = [];
  const junctions: JunctionSphere[] = [];

  // Add soma junction at origin
  junctions.push({
    position: new THREE.Vector3(0, 0, 0),
    radius: 1.2,
  });

  // Generate dendrite for each target connection
  targetConnections.forEach((connection) => {
    // Convert target from world space to this neuron's local space
    const localTarget = connection.targetPosition.clone().sub(neuronPosition);

    // Generate organic curve from origin (soma) to target
    const fullCurve = generateOrganicCurve(
      new THREE.Vector3(0, 0, 0),
      localTarget,
      rng,
      3,
    );

    // Apply growth: interpolate curve based on growth parameter
    const growthPointCount = Math.max(2, Math.floor(fullCurve.length * growth));
    const activeCurve = fullCurve.slice(0, growthPointCount);

    if (activeCurve.length >= 2) {
      // Add dendrite path
      paths.push({
        points: activeCurve,
        startRadius: 0.8, // Thick at soma
        endRadius: 0.3, // Thinner at tip
        targetPosition: connection.targetPosition,
      });

      // Add junction sphere at the growth tip
      const tipPosition = activeCurve[activeCurve.length - 1];
      junctions.push({
        position: tipPosition.clone(),
        radius: 0.4,
      });

      // If fully grown, add a synaptic junction at the target
      if (growth >= 0.99) {
        junctions.push({
          position: localTarget.clone(),
          radius: 0.5,
        });
      }
    }
  });

  return { paths, junctions };
}

// Helper: Create shader materials for neuron
function createNeuronMaterials(config: {
  neuronColor: string;
  somaEmission: string;
  emissiveIntensity: number;
  fresnelPower: number;
  metalness: number;
  roughness: number;
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

  // Add activation glow sphere (slightly larger, emissive)
  const activationGeometry = new THREE.SphereGeometry(1.5, 32, 32);
  const activationMaterial = new THREE.MeshBasicMaterial({
    color: somaMaterial.uniforms.glowColor.value,
    transparent: true,
    opacity: 0, // Hidden by default
    depthWrite: false,
  });
  const activationSphere = new THREE.Mesh(
    activationGeometry,
    activationMaterial,
  );
  neuronGroup.add(activationSphere);

  return { neuronGroup, soma, activationSphere };
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
  },
) {
  dendriteMaterial.uniforms.baseColor.value.set(config.neuronColor);
  dendriteMaterial.uniforms.glowColor.value.set(config.somaEmission);
  dendriteMaterial.uniforms.glowIntensity.value = config.emissiveIntensity;
  dendriteMaterial.uniforms.fresnelPower.value = config.fresnelPower;
  dendriteMaterial.uniforms.metalness.value = config.metalness;
  dendriteMaterial.uniforms.roughness.value = config.roughness;

  somaMaterial.uniforms.baseColor.value.set(config.neuronColor);
  somaMaterial.uniforms.glowColor.value.set(config.somaEmission);
  somaMaterial.uniforms.glowIntensity.value = config.emissiveIntensity * 2.0;
  somaMaterial.uniforms.fresnelPower.value = config.fresnelPower;
  somaMaterial.uniforms.metalness.value = config.metalness;
  somaMaterial.uniforms.roughness.value = config.roughness;
}

// Helper: Generate 3D grid positions for neurons (filling from center outward)
function generateNeuronPositions(
  count: number,
  baseSeed: number,
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];
  const spacing = 15; // Base spacing between neurons
  const rng = new SeededRandom(baseSeed * 777); // Unique seed for position generation

  if (count === 1) {
    // Single neuron at center
    positions.push(new THREE.Vector3(0, 0, 0));
    return positions;
  }

  // Generate all possible positions in a 3D grid with organic offsets, sorted by distance from center
  const possiblePositions: { pos: THREE.Vector3; dist: number }[] = [];
  const maxRadius = Math.ceil(Math.cbrt(count)) + 1;

  for (let x = -maxRadius; x <= maxRadius; x++) {
    for (let y = -maxRadius; y <= maxRadius; y++) {
      for (let z = -maxRadius; z <= maxRadius; z++) {
        // Start with grid position
        const baseX = x * spacing;
        const baseY = y * spacing;
        const baseZ = z * spacing;

        // Add organic random offset (up to 40% of spacing in each direction)
        const offsetStrength = spacing * 0.4;
        const offsetX = rng.randomRange(-offsetStrength, offsetStrength);
        const offsetY = rng.randomRange(-offsetStrength, offsetStrength);
        const offsetZ = rng.randomRange(-offsetStrength, offsetStrength);

        const pos = new THREE.Vector3(
          baseX + offsetX,
          baseY + offsetY,
          baseZ + offsetZ,
        );
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
      defaultValue: 25,
      min: 1,
      max: 50,
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
      defaultValue: 2.0,
      min: 0,
      max: 5,
      step: 0.1,
    }),
    metalness: v.number({
      label: 'Metalness',
      description: 'Metallic appearance',
      defaultValue: 0,
      min: 0,
      max: 1,
      step: 0.05,
    }),
    roughness: v.number({
      label: 'Roughness',
      description: 'Surface roughness',
      defaultValue: 0.9,
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
    trigger: v.toggle({
      label: 'Fire Neurons',
      description: 'Toggle on to fire neural signals through the network',
      defaultValue: false,
    }),
    signalSpeed: v.number({
      label: 'Signal Speed',
      description: 'How fast signals travel along dendrites',
      defaultValue: 30.0,
      min: 1.0,
      max: 40.0,
      step: 0.5,
    }),
    signalSize: v.number({
      label: 'Signal Orb Size',
      description: 'Radius of traveling signal orbs',
      defaultValue: 0.3,
      min: 0.1,
      max: 2.0,
      step: 0.1,
    }),
    activationDecay: v.number({
      label: 'Activation Decay',
      description: 'How quickly neurons fade after activation',
      defaultValue: 2.0,
      min: 0.5,
      max: 10.0,
      step: 0.5,
    }),
    postProcessing: v.group(
      {
        label: 'Post Processing',
        description: 'Bloom and depth of field effects',
      },
      {
        bloom: v.toggle({
          label: 'Bloom Enabled',
          description: 'Enable bloom glow effect',
          defaultValue: true,
        }),
        bloomStrength: v.number({
          label: 'Bloom Strength',
          description: 'Intensity of the bloom glow effect',
          defaultValue: 1.5,
          min: 0,
          max: 3,
          step: 0.01,
        }),
        bloomRadius: v.number({
          label: 'Bloom Radius',
          description: 'Size of the bloom glow spread',
          defaultValue: 0.8,
          min: 0,
          max: 1,
          step: 0.01,
        }),
        bloomThreshold: v.number({
          label: 'Bloom Threshold',
          description: 'Brightness threshold for bloom effect',
          defaultValue: 0.3,
          min: 0,
          max: 1,
          step: 0.01,
        }),
        depthOfField: v.toggle({
          label: 'Depth of Field',
          description: 'Enable cinematic shallow focus effect',
          defaultValue: false,
        }),
        dofFocus: v.number({
          label: 'DOF Focus Distance',
          description: 'Distance where objects are in focus',
          defaultValue: 10,
          min: 1,
          max: 50,
          step: 0.5,
        }),
        dofAperture: v.number({
          label: 'DOF Aperture',
          description: 'Blur amount (lower = more blur)',
          defaultValue: 0.0005,
          min: 0.0001,
          max: 0.002,
          step: 0.0001,
        }),
      },
    ),
  }),
  defaultNetworks: {},
  init3D: ({ threeCtx: { scene, camera, renderer, composer }, config }) => {
    // Camera positioned inside the neural network for immersive "flying in the brain" effect
    camera.position.set(0, 2, 8);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Setup post-processing passes
    if (composer) {
      // Add bloom pass
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        config.postProcessing.bloomStrength,
        config.postProcessing.bloomRadius,
        config.postProcessing.bloomThreshold,
      );
      bloomPass.enabled = config.postProcessing.bloom;
      composer.addPass(bloomPass);
      scene.userData.bloomPass = bloomPass;

      // Add depth of field pass
      const bokehPass = new BokehPass(scene, camera, {
        focus: config.postProcessing.dofFocus,
        aperture: config.postProcessing.dofAperture,
        maxblur: 0.01,
      });
      bokehPass.enabled = config.postProcessing.depthOfField;
      composer.addPass(bokehPass);
      scene.userData.bokehPass = bokehPass;
    }

    // Generate positions for all neurons
    const neuronPositions = generateNeuronPositions(
      config.neuronCount,
      config.seed,
    );

    // Build connection graph between neurons
    const connections = buildConnectionGraph(
      neuronPositions,
      4, // Max connections per neuron
      config.dendriteReach,
    );

    // Container for all neurons
    const networkGroup = new THREE.Group();
    const neurons: Array<{
      group: THREE.Group;
      soma: THREE.Mesh;
      activationSphere: THREE.Mesh;
      dendriteMaterial: THREE.ShaderMaterial;
      somaMaterial: THREE.ShaderMaterial;
      position: THREE.Vector3;
      dendritePaths: DendritePath[]; // Store paths for signal orbs
    }> = [];

    // Create each neuron with its connections
    neuronPositions.forEach((position, index) => {
      // Each neuron gets a unique seed
      const neuronSeed = config.seed + index * 1000;

      // Find all connections FROM this neuron
      const neuronConnections = connections.filter(
        (c) => c.fromIndex === index,
      );

      // Generate neuron paths based on connections
      const { paths, junctions } = generateNeuronPaths(
        neuronSeed,
        position,
        neuronConnections,
        config.growth,
      );

      // Create materials for this neuron
      const { dendriteMaterial, somaMaterial } = createNeuronMaterials(config);

      // Create neuron geometry
      const { neuronGroup, soma, activationSphere } = createNeuronGeometry(
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
        activationSphere,
        dendriteMaterial,
        somaMaterial,
        position,
        dendritePaths: paths, // Store the paths for signal orbs
      });
    });

    scene.add(networkGroup);
    scene.userData.networkGroup = networkGroup;
    scene.userData.neurons = neurons;
    scene.userData.neuronPositions = neuronPositions;
    scene.userData.connections = connections;
    scene.userData.lastSeed = config.seed;
    scene.userData.lastTubeRadius = config.tubeRadius;
    scene.userData.lastNeuronCount = config.neuronCount;
    scene.userData.lastGrowth = config.growth;
    scene.userData.lastDendriteReach = config.dendriteReach;

    // Initialize signal tracking
    scene.userData.signalOrbs = [] as SignalOrb[];
    scene.userData.neuronActivations = neuronPositions.map(() => ({
      level: 0,
      lastTriggerTime: -999,
    })) as NeuronActivation[];
    scene.userData.lastTriggerState = false;
    scene.userData.currentTime = 0;

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
      activationSphere: THREE.Mesh;
      dendriteMaterial: THREE.ShaderMaterial;
      somaMaterial: THREE.ShaderMaterial;
      position: THREE.Vector3;
      dendritePaths: DendritePath[];
    }>;

    // Regenerate if seed, tube radius, neuron count, or dendriteReach changed
    const needsFullRegeneration =
      scene.userData.lastSeed !== config.seed ||
      scene.userData.lastTubeRadius !== config.tubeRadius ||
      scene.userData.lastNeuronCount !== config.neuronCount ||
      scene.userData.lastDendriteReach !== config.dendriteReach;

    // Regenerate geometry if growth changed (but keep same connections)
    const needsGrowthUpdate = scene.userData.lastGrowth !== config.growth;

    if (needsFullRegeneration) {
      // Clear signal orbs first (before removing networkGroup)
      const oldSignalOrbs = scene.userData.signalOrbs as SignalOrb[];
      oldSignalOrbs?.forEach((orb) => {
        networkGroup.remove(orb.mesh);
        orb.mesh.geometry.dispose();
        if (Array.isArray(orb.mesh.material)) {
          orb.mesh.material.forEach((mat) => mat.dispose());
        } else {
          (orb.mesh.material as THREE.Material).dispose();
        }
      });

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

      // Build connection graph between neurons
      const connections = buildConnectionGraph(
        neuronPositions,
        4,
        config.dendriteReach,
      );

      // Container for all neurons
      const newNetworkGroup = new THREE.Group();
      const newNeurons: Array<{
        group: THREE.Group;
        soma: THREE.Mesh;
        activationSphere: THREE.Mesh;
        dendriteMaterial: THREE.ShaderMaterial;
        somaMaterial: THREE.ShaderMaterial;
        position: THREE.Vector3;
        dendritePaths: DendritePath[];
      }> = [];

      // Create each neuron with its connections
      neuronPositions.forEach((position, index) => {
        const neuronSeed = config.seed + index * 1000;

        // Find all connections FROM this neuron
        const neuronConnections = connections.filter(
          (c) => c.fromIndex === index,
        );

        const { paths, junctions } = generateNeuronPaths(
          neuronSeed,
          position,
          neuronConnections,
          config.growth,
        );

        const { dendriteMaterial, somaMaterial } =
          createNeuronMaterials(config);

        const { neuronGroup, soma, activationSphere } = createNeuronGeometry(
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
          activationSphere,
          dendriteMaterial,
          somaMaterial,
          position,
          dendritePaths: paths,
        });
      });

      scene.add(newNetworkGroup);
      scene.userData.networkGroup = newNetworkGroup;
      scene.userData.neurons = newNeurons;
      scene.userData.neuronPositions = neuronPositions;
      scene.userData.connections = connections;
      scene.userData.lastSeed = config.seed;
      scene.userData.lastTubeRadius = config.tubeRadius;
      scene.userData.lastNeuronCount = config.neuronCount;
      scene.userData.lastGrowth = config.growth;
      scene.userData.lastDendriteReach = config.dendriteReach;

      // Reinitialize signal tracking (orbs already cleaned up above)
      scene.userData.signalOrbs = [] as SignalOrb[];
      scene.userData.neuronActivations = neuronPositions.map(() => ({
        level: 0,
        lastTriggerTime: -999,
      })) as NeuronActivation[];
    } else if (needsGrowthUpdate) {
      // Only regenerate geometry for growth changes (keeps same connections)
      const neuronPositions = scene.userData.neuronPositions as THREE.Vector3[];
      const connections = scene.userData.connections as NeuronConnection[];

      // Clear signal orbs first (before removing networkGroup)
      const oldSignalOrbs = scene.userData.signalOrbs as SignalOrb[];
      oldSignalOrbs?.forEach((orb) => {
        networkGroup.remove(orb.mesh);
        orb.mesh.geometry.dispose();
        if (Array.isArray(orb.mesh.material)) {
          orb.mesh.material.forEach((mat) => mat.dispose());
        } else {
          (orb.mesh.material as THREE.Material).dispose();
        }
      });

      scene.remove(networkGroup);
      networkGroup.children.forEach((child) => {
        if (child instanceof THREE.Group) {
          child.children.forEach((grandchild) => {
            if (grandchild instanceof THREE.Mesh) {
              grandchild.geometry.dispose();
            }
          });
        }
      });

      const newNetworkGroup = new THREE.Group();
      const newNeurons: Array<{
        group: THREE.Group;
        soma: THREE.Mesh;
        activationSphere: THREE.Mesh;
        dendriteMaterial: THREE.ShaderMaterial;
        somaMaterial: THREE.ShaderMaterial;
        position: THREE.Vector3;
        dendritePaths: DendritePath[];
      }> = [];

      neuronPositions.forEach((position, index) => {
        const neuronSeed = config.seed + index * 1000;
        const neuronConnections = connections.filter(
          (c) => c.fromIndex === index,
        );

        const { paths, junctions } = generateNeuronPaths(
          neuronSeed,
          position,
          neuronConnections,
          config.growth,
        );

        const { dendriteMaterial, somaMaterial } =
          createNeuronMaterials(config);

        const { neuronGroup, soma, activationSphere } = createNeuronGeometry(
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
          activationSphere,
          dendriteMaterial,
          somaMaterial,
          position,
          dendritePaths: paths,
        });
      });

      scene.add(newNetworkGroup);
      scene.userData.networkGroup = newNetworkGroup;
      scene.userData.neurons = newNeurons;
      scene.userData.lastGrowth = config.growth;

      // Reinitialize signal tracking (orbs already cleaned up above)
      scene.userData.signalOrbs = [] as SignalOrb[];
    } else {
      // Update shader uniforms for all neurons without regenerating
      neurons.forEach(({ dendriteMaterial, somaMaterial }) => {
        updateMaterialUniforms(dendriteMaterial, somaMaterial, config);
      });
    }

    // Update current time
    scene.userData.currentTime += dt;
    const currentTime = scene.userData.currentTime as number;

    const signalOrbs = scene.userData.signalOrbs as SignalOrb[];
    const neuronActivations = scene.userData
      .neuronActivations as NeuronActivation[];
    const connections = scene.userData.connections as NeuronConnection[];

    // Detect button trigger (rising edge detection)
    const wasTriggered = scene.userData.lastTriggerState as boolean;
    const isTriggered = config.trigger;

    if (isTriggered && !wasTriggered) {
      // Toggle was just turned on - trigger all neurons!
      neurons.forEach((neuron, neuronIndex) => {
        // Activate this neuron
        neuronActivations[neuronIndex].level = 1.0;
        neuronActivations[neuronIndex].lastTriggerTime = currentTime;

        // Create a signal orb for each dendrite path
        neuron.dendritePaths.forEach((dendritePath, dendriteIndex) => {
          // Use the stored path (in neuron's local space)
          const localPath = dendritePath.points;

          // Skip if path is too short
          if (localPath.length < 2) return;

          // Convert path to networkGroup space by adding the neuron's position
          const networkPath = localPath.map((p) =>
            p.clone().add(neuron.position),
          );

          // Create glowing orb
          const orbGeometry = new THREE.SphereGeometry(
            config.signalSize,
            16,
            16,
          );
          const orbMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(config.somaEmission),
            transparent: true,
            opacity: 0.9,
          });
          const orbMesh = new THREE.Mesh(orbGeometry, orbMaterial);
          orbMesh.position.copy(networkPath[0]);

          // Add glow effect
          const glowGeometry = new THREE.SphereGeometry(
            config.signalSize * 1.5,
            16,
            16,
          );
          const glowMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(config.somaEmission),
            transparent: true,
            opacity: 0.3,
          });
          const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
          orbMesh.add(glowMesh);

          // Add to networkGroup so it rotates with the neurons!
          networkGroup.add(orbMesh);

          signalOrbs.push({
            mesh: orbMesh,
            path: networkPath,
            progress: 0,
            speed: config.signalSpeed,
            neuronIndex,
            dendriteIndex,
          });
        });
      });
    }

    scene.userData.lastTriggerState = isTriggered;

    // Update all signal orbs
    for (let i = signalOrbs.length - 1; i >= 0; i--) {
      const orb = signalOrbs[i];

      // Move along path
      const pathLength = orb.path.length - 1;
      const progressDelta = (orb.speed * dt) / pathLength;
      orb.progress += progressDelta;

      if (orb.progress >= 1.0) {
        // Orb reached the end - remove it
        networkGroup.remove(orb.mesh);
        orb.mesh.geometry.dispose();
        if (Array.isArray(orb.mesh.material)) {
          orb.mesh.material.forEach((mat) => mat.dispose());
        } else {
          (orb.mesh.material as THREE.Material).dispose();
        }
        // Dispose glow mesh too
        if (orb.mesh.children.length > 0) {
          const glowMesh = orb.mesh.children[0] as THREE.Mesh;
          glowMesh.geometry.dispose();
          if (Array.isArray(glowMesh.material)) {
            glowMesh.material.forEach((mat) => mat.dispose());
          } else {
            (glowMesh.material as THREE.Material).dispose();
          }
        }
        signalOrbs.splice(i, 1);
      } else {
        // Apply easing to create smooth deceleration at end
        const easedProgress = easeOutCubic(orb.progress);

        // Update position along path using eased progress
        const index = Math.floor(easedProgress * pathLength);
        const nextIndex = Math.min(index + 1, pathLength);
        const localProgress = easedProgress * pathLength - index;

        const currentPoint = orb.path[index];
        const nextPoint = orb.path[nextIndex];

        orb.mesh.position.lerpVectors(currentPoint, nextPoint, localProgress);

        // Fade out as it approaches the end (last 30% of journey)
        const fadeStart = 0.7;
        if (orb.progress > fadeStart) {
          const fadeProgress = (orb.progress - fadeStart) / (1.0 - fadeStart);
          const opacity = 1.0 - fadeProgress;

          // Update orb material opacity
          const orbMaterial = orb.mesh.material as THREE.MeshBasicMaterial;
          orbMaterial.opacity = opacity * 0.9; // Max opacity 0.9

          // Update glow material opacity
          if (orb.mesh.children.length > 0) {
            const glowMesh = orb.mesh.children[0] as THREE.Mesh;
            const glowMaterial = glowMesh.material as THREE.MeshBasicMaterial;
            glowMaterial.opacity = opacity * 0.3; // Max opacity 0.3
          }
        }
      }
    }

    // Update neuron activations (decay over time)
    neuronActivations.forEach((activation, index) => {
      if (activation.level > 0) {
        const timeSinceTrigger = currentTime - activation.lastTriggerTime;
        activation.level = Math.max(
          0,
          1.0 - timeSinceTrigger / config.activationDecay,
        );

        // Update activation sphere opacity based on activation level
        const neuron = neurons[index];
        const activationMaterial = neuron.activationSphere
          .material as THREE.MeshBasicMaterial;
        activationMaterial.opacity = activation.level * 0.6; // Max 60% opacity
        activationMaterial.color.set(config.somaEmission);
      } else {
        // Ensure activation sphere is hidden when not active
        const neuron = neurons[index];
        const activationMaterial = neuron.activationSphere
          .material as THREE.MeshBasicMaterial;
        activationMaterial.opacity = 0;
      }
    });

    // Update post-processing parameters
    const bloomPass = scene.userData.bloomPass as UnrealBloomPass;
    const bokehPass = scene.userData.bokehPass as BokehPass;

    if (bloomPass) {
      bloomPass.enabled = config.postProcessing.bloom;
      bloomPass.strength = config.postProcessing.bloomStrength;
      bloomPass.radius = config.postProcessing.bloomRadius;
      bloomPass.threshold = config.postProcessing.bloomThreshold;
    }

    if (bokehPass) {
      bokehPass.enabled = config.postProcessing.depthOfField;
      if (bokehPass.materialBokeh?.uniforms) {
        bokehPass.materialBokeh.uniforms['focus'].value =
          config.postProcessing.dofFocus;
        bokehPass.materialBokeh.uniforms['aperture'].value =
          config.postProcessing.dofAperture;
      }
    }

    // Subtle rotation for visual interest
    networkGroup.rotation.y += 0.05 * dt;

    // Render is handled by layer renderer's composer
    renderer.render(scene, camera);
  },
});

export default NeuralNetwork;
