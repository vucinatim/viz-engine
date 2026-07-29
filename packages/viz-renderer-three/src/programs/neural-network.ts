import type { VizRenderThreeProgramNode } from "@viz-engine/contracts";
import {
  AdditiveBlending,
  AmbientLight,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  DynamicDrawUsage,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  LinearToneMapping,
  Matrix4,
  NormalBlending,
  PointLight,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type WebGLRenderTarget,
  type WebGLRenderer,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { createVizThreePostProcessingPipeline } from "./post-processing.js";
import type { VizThreeProgramFactory } from "./types.js";

const PROGRAM_ID = "viz-core/neural-network/v1";
const MAX_NEURON_COUNT = 50;
const MAX_SIGNAL_INSTANCE_COUNT = 2_000;
const PATH_SAMPLE_COUNT = 32;

interface NeuronConnection {
  fromIndex: number;
  targetPosition: Vector3;
}

interface DendritePath {
  points: Vector3[];
  startRadius: number;
  endRadius: number;
}

interface JunctionSphere {
  position: Vector3;
  radius: number;
}

interface NetworkTopology {
  geometry: BufferGeometry;
  neuronPositions: Vector3[];
  signalPaths: Vector3[][];
}

interface TriggerEvent {
  age: number;
  speed: number;
  size: number;
  color: string;
}

const neuronVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vLocalPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vLocalPosition = position;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
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
    float fresnel = pow(1.0 - abs(dot(normal, viewDir)), fresnelPower);
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float diffuse = max(dot(normal, lightDir), 0.0);
    vec3 ambient = baseColor * 0.3;
    vec3 diffuseColor = baseColor * diffuse * 0.7;
    vec3 fresnelGlow = glowColor * fresnel * glowIntensity;
    float distFactor = sin(length(vLocalPosition) * 0.5) * 0.1 + 0.9;
    vec3 finalColor = (ambient + diffuseColor) * distFactor + fresnelGlow;
    vec3 reflectDir = reflect(-viewDir, normal);
    float spec = pow(max(dot(reflectDir, lightDir), 0.0), 32.0) * metalness;
    finalColor += vec3(spec) * (1.0 - roughness);
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const activationVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const activationFragmentShader = `
  uniform vec3 glowColor;
  uniform float opacity;

  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    float glow = pow(1.0 - abs(dot(normal, viewDir)), 2.0);
    gl_FragColor = vec4(glowColor, glow * opacity);
  }
`;

const signalVertexShader = `
  attribute float instanceOpacity;
  attribute vec3 signalColor;
  varying float vOpacity;
  varying vec3 vColor;

  void main() {
    vOpacity = instanceOpacity;
    vColor = signalColor;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const signalFragmentShader = `
  uniform float intensity;
  varying float vOpacity;
  varying vec3 vColor;

  void main() {
    gl_FragColor = vec4(vColor * intensity, vOpacity);
  }
`;

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

const asString = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : fallback;

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readTriggerEvents = (value: unknown): TriggerEvent[] =>
  Array.isArray(value)
    ? value.flatMap((entry) => {
        const event = asRecord(entry);
        return [
          {
            age: Math.max(0, asNumber(event.age, 0)),
            speed: Math.max(1, asNumber(event.speed, 30)),
            size: Math.max(0.1, asNumber(event.size, 0.2)),
            color: asString(event.color, "rgb(255, 138, 201)"),
          },
        ];
      })
    : [];

const assertProgram = (node: VizRenderThreeProgramNode): void => {
  if (node.programId !== PROGRAM_ID) {
    throw new Error(
      `Neural Network program cannot update incompatible program "${node.programId}".`,
    );
  }
};

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  random(): number {
    const value = Math.sin(this.seed) * 10_000;
    this.seed += 1;
    return value - Math.floor(value);
  }

  randomRange(min: number, max: number): number {
    return min + this.random() * (max - min);
  }
}

const generateNeuronPositions = (
  count: number,
  seed: number,
): Vector3[] => {
  if (count === 1) {
    return [new Vector3()];
  }

  const spacing = 15;
  const random = new SeededRandom(seed * 777);
  const maximumRadius = Math.ceil(Math.cbrt(count)) + 1;
  const candidates: Array<{ position: Vector3; distance: number }> = [];

  for (let x = -maximumRadius; x <= maximumRadius; x += 1) {
    for (let y = -maximumRadius; y <= maximumRadius; y += 1) {
      for (let z = -maximumRadius; z <= maximumRadius; z += 1) {
        const offset = spacing * 0.4;
        const position = new Vector3(
          x * spacing + random.randomRange(-offset, offset),
          y * spacing + random.randomRange(-offset, offset),
          z * spacing + random.randomRange(-offset, offset),
        );
        candidates.push({
          position,
          distance: position.length(),
        });
      }
    }
  }

  candidates.sort(
    (left, right) => left.distance - right.distance,
  );
  return candidates
    .slice(0, count)
    .map(({ position }) => position);
};

const buildConnectionGraph = (
  positions: readonly Vector3[],
  maximumConnections: number,
  maximumDistance: number,
): NeuronConnection[] => {
  const connections: NeuronConnection[] = [];
  for (let fromIndex = 0; fromIndex < positions.length; fromIndex += 1) {
    const from = positions[fromIndex]!;
    const neighbors = positions
      .flatMap((position, index) =>
        index === fromIndex
          ? []
          : [{ index, distance: from.distanceTo(position) }],
      )
      .filter(({ distance }) => distance <= maximumDistance)
      .sort((left, right) => left.distance - right.distance)
      .slice(0, maximumConnections);

    for (const neighbor of neighbors) {
      connections.push({
        fromIndex,
        targetPosition: positions[neighbor.index]!.clone(),
      });
    }
  }
  return connections;
};

const generateOrganicCurve = (
  target: Vector3,
  random: SeededRandom,
): Vector3[] => {
  const origin = new Vector3();
  const direction = target.clone().normalize();
  const distance = target.length();
  const up = new Vector3(0, 1, 0);
  const reference =
    Math.abs(direction.dot(up)) > 0.99
      ? new Vector3(1, 0, 0)
      : up;
  const perpendicularA = new Vector3()
    .crossVectors(direction, reference)
    .normalize();
  const perpendicularB = new Vector3()
    .crossVectors(direction, perpendicularA)
    .normalize();
  const controls = [origin];

  for (let index = 1; index <= 3; index += 1) {
    const progress = index / 4;
    const strength =
      Math.sin(progress * Math.PI) * distance * 0.15;
    controls.push(
      target
        .clone()
        .multiplyScalar(progress)
        .addScaledVector(
          perpendicularA,
          random.randomRange(-1, 1) * strength,
        )
        .addScaledVector(
          perpendicularB,
          random.randomRange(-1, 1) * strength,
        ),
    );
  }
  controls.push(target.clone());
  return new CatmullRomCurve3(
    controls,
    false,
    "catmullrom",
    0.3,
  ).getPoints(PATH_SAMPLE_COUNT);
};

const generateNeuronPaths = ({
  seed,
  position,
  connections,
  growth,
}: {
  seed: number;
  position: Vector3;
  connections: readonly NeuronConnection[];
  growth: number;
}): {
  paths: DendritePath[];
  junctions: JunctionSphere[];
} => {
  const random = new SeededRandom(seed);
  const paths: DendritePath[] = [];
  const junctions: JunctionSphere[] = [
    { position: new Vector3(), radius: 1.2 },
  ];

  for (const connection of connections) {
    const localTarget = connection.targetPosition
      .clone()
      .sub(position);
    const fullCurve = generateOrganicCurve(localTarget, random);
    const activeCurve = fullCurve.slice(
      0,
      Math.max(2, Math.floor(fullCurve.length * growth)),
    );
    paths.push({
      points: activeCurve,
      startRadius: 0.8,
      endRadius: 0.3,
    });
    junctions.push({
      position: activeCurve[activeCurve.length - 1]!.clone(),
      radius: 0.4,
    });
    if (growth >= 0.99) {
      junctions.push({
        position: localTarget,
        radius: 0.5,
      });
    }
  }
  return { paths, junctions };
};

const createTaperedTube = (
  path: DendritePath,
  tubeRadius: number,
): TubeGeometry => {
  const curve = new CatmullRomCurve3(
    path.points,
    false,
    "catmullrom",
    0.3,
  );
  const geometry = new TubeGeometry(
    curve,
    PATH_SAMPLE_COUNT,
    1,
    12,
    false,
  );
  const positions = geometry.attributes.position!;
  for (let segment = 0; segment <= PATH_SAMPLE_COUNT; segment += 1) {
    const progress = segment / PATH_SAMPLE_COUNT;
    const radius =
      (path.startRadius +
        (path.endRadius - path.startRadius) * progress) *
      tubeRadius;
    const curvePoint = curve.getPoint(progress);
    for (let radial = 0; radial <= 12; radial += 1) {
      const index = segment * 13 + radial;
      positions.setXYZ(
        index,
        curvePoint.x +
          (positions.getX(index) - curvePoint.x) * radius,
        curvePoint.y +
          (positions.getY(index) - curvePoint.y) * radius,
        curvePoint.z +
          (positions.getZ(index) - curvePoint.z) * radius,
      );
    }
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
};

const buildNetworkTopology = ({
  neuronCount,
  seed,
  tubeRadius,
  dendriteReach,
  growth,
}: {
  neuronCount: number;
  seed: number;
  tubeRadius: number;
  dendriteReach: number;
  growth: number;
}): NetworkTopology => {
  const neuronPositions = generateNeuronPositions(neuronCount, seed);
  const connections = buildConnectionGraph(
    neuronPositions,
    4,
    dendriteReach,
  );
  const geometries: BufferGeometry[] = [];
  const signalPaths: Vector3[][] = [];

  for (let neuronIndex = 0; neuronIndex < neuronCount; neuronIndex += 1) {
    const position = neuronPositions[neuronIndex]!;
    const neuronConnections = connections.filter(
      ({ fromIndex }) => fromIndex === neuronIndex,
    );
    const { paths, junctions } = generateNeuronPaths({
      seed: seed + neuronIndex * 1_000,
      position,
      connections: neuronConnections,
      growth,
    });

    for (const path of paths) {
      const tube = createTaperedTube(path, tubeRadius);
      tube.translate(position.x, position.y, position.z);
      geometries.push(tube);
      signalPaths.push(
        path.points.map((point) => point.clone().add(position)),
      );
    }
    for (const junction of junctions) {
      const sphere = new SphereGeometry(
        junction.radius * tubeRadius,
        16,
        16,
      );
      sphere.translate(
        position.x + junction.position.x,
        position.y + junction.position.y,
        position.z + junction.position.z,
      );
      geometries.push(sphere);
    }
  }

  const geometry =
    geometries.length > 0
      ? mergeGeometries(geometries, false)
      : new BufferGeometry();
  for (const source of geometries) {
    source.dispose();
  }
  if (!geometry) {
    throw new Error("Neural Network geometry could not be merged.");
  }
  return { geometry, neuronPositions, signalPaths };
};

const createNeuronMaterial = (
  glowMultiplier: number,
): ShaderMaterial =>
  new ShaderMaterial({
    vertexShader: neuronVertexShader,
    fragmentShader: neuronFragmentShader,
    uniforms: {
      baseColor: { value: new Color("#00CED1") },
      glowColor: { value: new Color("rgb(255, 138, 201)") },
      glowIntensity: { value: 2 * glowMultiplier },
      fresnelPower: { value: 3 },
      metalness: { value: 0 },
      roughness: { value: 0.9 },
    },
    transparent: true,
    depthWrite: true,
  });

const createSignalMaterial = (intensity: number): ShaderMaterial =>
  new ShaderMaterial({
    vertexShader: signalVertexShader,
    fragmentShader: signalFragmentShader,
    uniforms: { intensity: { value: intensity } },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: NormalBlending,
  });

const easeOutCubic = (value: number): number =>
  1 - Math.pow(1 - value, 3);

export const createNeuralNetworkProgram: VizThreeProgramFactory = ({
  node,
  width,
  height,
}) => {
  assertProgram(node);

  const scene = new Scene();
  const root = new Group();
  const camera = new PerspectiveCamera(
    75,
    width / Math.max(height, 1),
    0.1,
    1_000,
  );
  camera.position.set(0, 2, 8);
  camera.lookAt(0, 0, 0);

  const dendriteMaterial = createNeuronMaterial(1);
  const somaMaterial = createNeuronMaterial(2);
  const dendriteMesh = new InstancedMesh(
    new BufferGeometry(),
    dendriteMaterial,
    1,
  );
  dendriteMesh.setMatrixAt(0, new Matrix4());
  const somaGeometry = new SphereGeometry(1.2, 32, 32);
  const somaInstances = new InstancedMesh(
    somaGeometry,
    somaMaterial,
    MAX_NEURON_COUNT,
  );
  somaInstances.instanceMatrix.setUsage(DynamicDrawUsage);
  const activationGeometry = new SphereGeometry(1.5, 32, 32);
  const activationMaterial = new ShaderMaterial({
    vertexShader: activationVertexShader,
    fragmentShader: activationFragmentShader,
    uniforms: {
      glowColor: { value: new Color("rgb(255, 138, 201)") },
      opacity: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const activationInstances = new InstancedMesh(
    activationGeometry,
    activationMaterial,
    MAX_NEURON_COUNT,
  );
  activationInstances.instanceMatrix.setUsage(DynamicDrawUsage);
  somaInstances.frustumCulled = false;
  activationInstances.frustumCulled = false;

  const signalGeometry = new SphereGeometry(1, 16, 16);
  signalGeometry.setAttribute(
    "instanceOpacity",
    new InstancedBufferAttribute(
      new Float32Array(MAX_SIGNAL_INSTANCE_COUNT),
      1,
    ),
  );
  signalGeometry.setAttribute(
    "signalColor",
    new InstancedBufferAttribute(
      new Float32Array(MAX_SIGNAL_INSTANCE_COUNT * 3),
      3,
    ),
  );
  const signalMaterial = createSignalMaterial(3);
  const signalInstances = new InstancedMesh(
    signalGeometry,
    signalMaterial,
    MAX_SIGNAL_INSTANCE_COUNT,
  );
  signalInstances.instanceMatrix.setUsage(DynamicDrawUsage);
  signalInstances.frustumCulled = false;

  const haloGeometry = new SphereGeometry(1, 16, 16);
  haloGeometry.setAttribute(
    "instanceOpacity",
    new InstancedBufferAttribute(
      new Float32Array(MAX_SIGNAL_INSTANCE_COUNT),
      1,
    ),
  );
  haloGeometry.setAttribute(
    "signalColor",
    new InstancedBufferAttribute(
      new Float32Array(MAX_SIGNAL_INSTANCE_COUNT * 3),
      3,
    ),
  );
  const haloMaterial = createSignalMaterial(1.5);
  const haloInstances = new InstancedMesh(
    haloGeometry,
    haloMaterial,
    MAX_SIGNAL_INSTANCE_COUNT,
  );
  haloInstances.instanceMatrix.setUsage(DynamicDrawUsage);
  haloInstances.frustumCulled = false;

  root.add(
    dendriteMesh,
    somaInstances,
    activationInstances,
    signalInstances,
    haloInstances,
  );
  scene.add(
    root,
    new AmbientLight("#ffffff", 0.3),
  );
  const keyLight = new DirectionalLight("#ffffff", 1);
  keyLight.position.set(10, 10, 10);
  const fillLight = new PointLight("#4169E1", 0.6);
  fillLight.position.set(-5, 0, -5);
  const rimLight = new PointLight("#FF1493", 0.4);
  rimLight.position.set(0, -5, 5);
  scene.add(keyLight, fillLight, rimLight);

  root.userData.dendriteMesh = dendriteMesh;
  root.userData.somaInstances = somaInstances;
  root.userData.activationInstances = activationInstances;
  root.userData.signalInstances = signalInstances;
  root.userData.haloInstances = haloInstances;

  let structureKey = "";
  let signalPaths: Vector3[][] = [];
  const matrix = new Matrix4();
  const position = new Vector3();
  const color = new Color();
  const postProcessing = createVizThreePostProcessingPipeline({
    scene,
    camera,
    width,
    height,
    settings: {
      bloomEnabled: false,
      bloomStrength: 0.2,
      bloomRadius: 0.8,
      bloomThreshold: 0.3,
      depthOfFieldEnabled: true,
      depthOfFieldFocus: 10,
      depthOfFieldAperture: 0.0005,
      depthOfFieldMaxBlur: 0.01,
      toneMapping: LinearToneMapping,
      toneMappingExposure: 1,
    },
  });

  const applyMaterialSettings = (
    parameters: Readonly<Record<string, unknown>>,
  ): void => {
    const neuronColor = asString(
      parameters.neuronColor,
      "#00CED1",
    );
    const somaEmission = asString(
      parameters.somaEmission,
      "rgb(255, 138, 201)",
    );
    const emissiveIntensity = Math.max(
      0,
      asNumber(parameters.emissiveIntensity, 2),
    );
    for (const [material, multiplier] of [
      [dendriteMaterial, 1],
      [somaMaterial, 2],
    ] as const) {
      material.uniforms.baseColor!.value.set(neuronColor);
      material.uniforms.glowColor!.value.set(somaEmission);
      material.uniforms.glowIntensity!.value =
        emissiveIntensity * multiplier;
      material.uniforms.fresnelPower!.value = asNumber(
        parameters.fresnelPower,
        3,
      );
      material.uniforms.metalness!.value = asNumber(
        parameters.metalness,
        0,
      );
      material.uniforms.roughness!.value = asNumber(
        parameters.roughness,
        0.9,
      );
    }
    activationMaterial.uniforms.glowColor!.value.set(somaEmission);
  };

  const updateStructure = (
    parameters: Readonly<Record<string, unknown>>,
  ): void => {
    const neuronCount = Math.max(
      1,
      Math.min(
        MAX_NEURON_COUNT,
        Math.round(asNumber(parameters.neuronCount, 30)),
      ),
    );
    const seed = Math.round(asNumber(parameters.seed, 42));
    const tubeRadius = Math.max(
      0.05,
      asNumber(parameters.tubeRadius, 0.25),
    );
    const dendriteReach = Math.max(
      5,
      asNumber(parameters.dendriteReach, 20),
    );
    const growth = Math.max(
      0,
      Math.min(1, asNumber(parameters.growth, 1)),
    );
    const nextKey = JSON.stringify({
      neuronCount,
      seed,
      tubeRadius,
      dendriteReach,
      growth,
    });
    if (nextKey === structureKey) {
      return;
    }

    const topology = buildNetworkTopology({
      neuronCount,
      seed,
      tubeRadius,
      dendriteReach,
      growth,
    });
    dendriteMesh.geometry.dispose();
    dendriteMesh.geometry = topology.geometry;
    signalPaths = topology.signalPaths;
    somaInstances.count = neuronCount;
    activationInstances.count = neuronCount;
    for (let index = 0; index < neuronCount; index += 1) {
      matrix.makeTranslation(
        topology.neuronPositions[index]!.x,
        topology.neuronPositions[index]!.y,
        topology.neuronPositions[index]!.z,
      );
      somaInstances.setMatrixAt(index, matrix);
      activationInstances.setMatrixAt(index, matrix);
    }
    somaInstances.instanceMatrix.needsUpdate = true;
    activationInstances.instanceMatrix.needsUpdate = true;
    structureKey = nextKey;
    root.userData.neuronCount = neuronCount;
    root.userData.pathCount = signalPaths.length;
    root.userData.neuronPositions = topology.neuronPositions.map(
      (point) => point.toArray(),
    );
  };

  const updateSignals = (
    parameters: Readonly<Record<string, unknown>>,
  ): void => {
    const events = readTriggerEvents(parameters.triggerEvents);
    const signalOpacity = signalGeometry.getAttribute(
      "instanceOpacity",
    ) as InstancedBufferAttribute;
    const haloOpacity = haloGeometry.getAttribute(
      "instanceOpacity",
    ) as InstancedBufferAttribute;
    const signalColors = signalGeometry.getAttribute(
      "signalColor",
    ) as InstancedBufferAttribute;
    const haloColors = haloGeometry.getAttribute(
      "signalColor",
    ) as InstancedBufferAttribute;
    let signalCount = 0;

    for (
      let eventIndex = events.length - 1;
      eventIndex >= 0 &&
      signalCount < MAX_SIGNAL_INSTANCE_COUNT;
      eventIndex -= 1
    ) {
      const event = events[eventIndex]!;
      color.set(event.color);
      for (const path of signalPaths) {
        if (signalCount >= MAX_SIGNAL_INSTANCE_COUNT) {
          break;
        }
        const segmentCount = path.length - 1;
        const progress = (event.age * event.speed) / segmentCount;
        if (progress < 0 || progress >= 1) {
          continue;
        }
        const eased = easeOutCubic(progress);
        const pathPosition = eased * segmentCount;
        const index = Math.floor(pathPosition);
        const nextIndex = Math.min(index + 1, segmentCount);
        position.lerpVectors(
          path[index]!,
          path[nextIndex]!,
          pathPosition - index,
        );
        const opacity =
          progress > 0.7
            ? 1 - (progress - 0.7) / 0.3
            : 1;

        matrix.makeScale(event.size, event.size, event.size);
        matrix.setPosition(position);
        signalInstances.setMatrixAt(signalCount, matrix);
        signalOpacity.setX(signalCount, opacity);
        signalColors.setXYZ(
          signalCount,
          color.r,
          color.g,
          color.b,
        );

        matrix.makeScale(
          event.size * 2,
          event.size * 2,
          event.size * 2,
        );
        matrix.setPosition(position);
        haloInstances.setMatrixAt(signalCount, matrix);
        haloOpacity.setX(signalCount, opacity * 0.4);
        haloColors.setXYZ(
          signalCount,
          color.r,
          color.g,
          color.b,
        );
        signalCount += 1;
      }
    }

    signalInstances.count = signalCount;
    haloInstances.count = signalCount;
    signalInstances.instanceMatrix.needsUpdate = true;
    haloInstances.instanceMatrix.needsUpdate = true;
    signalOpacity.needsUpdate = true;
    haloOpacity.needsUpdate = true;
    signalColors.needsUpdate = true;
    haloColors.needsUpdate = true;

    const activationDecay = Math.max(
      0,
      asNumber(parameters.activationDecay, 0.4),
    );
    const activationLevel =
      activationDecay <= 0
        ? 0
        : events.reduce(
            (maximum, event) =>
              Math.max(
                maximum,
                1 - event.age / activationDecay,
              ),
            0,
          );
    activationMaterial.uniforms.opacity!.value =
      Math.max(0, activationLevel) * 0.8;
    root.userData.activeSignalCount = signalCount;
    root.userData.activationLevel = Math.max(0, activationLevel);
  };

  const update = (nextNode: VizRenderThreeProgramNode): void => {
    assertProgram(nextNode);
    const parameters = nextNode.parameters;
    updateStructure(parameters);
    applyMaterialSettings(parameters);
    updateSignals(parameters);
    root.rotation.y =
      Math.max(0, asNumber(parameters.time, 0)) * 0.05;
    postProcessing.update({
      bloomEnabled: asBoolean(parameters.bloomEnabled, false),
      bloomStrength: Math.max(
        0,
        asNumber(parameters.bloomStrength, 0.2),
      ),
      bloomRadius: Math.max(
        0,
        asNumber(parameters.bloomRadius, 0.8),
      ),
      bloomThreshold: Math.max(
        0,
        asNumber(parameters.bloomThreshold, 0.3),
      ),
      depthOfFieldEnabled: asBoolean(
        parameters.depthOfFieldEnabled,
        true,
      ),
      depthOfFieldFocus: Math.max(
        1,
        asNumber(parameters.depthOfFieldFocus, 10),
      ),
      depthOfFieldAperture: Math.max(
        0.0001,
        asNumber(parameters.depthOfFieldAperture, 0.0005),
      ),
      depthOfFieldMaxBlur: 0.01,
      toneMapping: LinearToneMapping,
      toneMappingExposure: 1,
    });
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
      postProcessing.resize(nextWidth, nextHeight);
    },
    render(
      renderer: WebGLRenderer,
      renderTarget: WebGLRenderTarget,
    ) {
      postProcessing.render(renderer, renderTarget);
    },
    dispose() {
      postProcessing.dispose();
      dendriteMesh.geometry.dispose();
      dendriteMaterial.dispose();
      somaGeometry.dispose();
      somaMaterial.dispose();
      activationGeometry.dispose();
      activationMaterial.dispose();
      signalGeometry.dispose();
      signalMaterial.dispose();
      haloGeometry.dispose();
      haloMaterial.dispose();
      root.clear();
      scene.clear();
    },
  };
};
