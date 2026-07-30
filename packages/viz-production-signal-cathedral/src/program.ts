import type { VizRenderThreeProgramNode } from '@viz-engine/contracts';
import {
  createVizThreePostProcessingPipeline,
  type VizThreePostProcessingSettings,
  type VizThreeProgramFactory,
} from '@viz-engine/renderer-three';
import {
  AdditiveBlending,
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  FogExp2,
  GridHelper,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  TorusGeometry,
  type Material,
} from 'three';

export const SIGNAL_CATHEDRAL_PROGRAM_ID = 'viz-production/signal-cathedral/v1';

const MAX_ARCH_COUNT = 32;
const SEGMENTS_PER_ARCH = 4;
const MAX_ARCH_SEGMENTS = MAX_ARCH_COUNT * SEGMENTS_PER_ARCH;
const MAX_PARTICLE_COUNT = 1600;
const MAX_SHOCKWAVES = 8;

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const asString = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

const asNumberArray = (value: unknown): number[] =>
  Array.isArray(value)
    ? value.filter(
        (entry): entry is number =>
          typeof entry === 'number' && Number.isFinite(entry),
      )
    : [];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const fract = (value: number): number => value - Math.floor(value);

const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const hashUnit = (seed: number, index: number, channel: number): number => {
  let value =
    seed ^
    Math.imul(index + 1, 0x9e3779b1) ^
    Math.imul(channel + 11, 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
};

const assertProgram = (node: VizRenderThreeProgramNode): void => {
  if (node.programId !== SIGNAL_CATHEDRAL_PROGRAM_ID) {
    throw new Error(
      `Signal Cathedral cannot update incompatible program "${node.programId}".`,
    );
  }
};

const disposeMaterial = (material: Material | Material[]): void => {
  if (Array.isArray(material)) {
    material.forEach((entry) => entry.dispose());
  } else {
    material.dispose();
  }
};

const readPostProcessingSettings = (
  parameters: Readonly<Record<string, unknown>>,
): VizThreePostProcessingSettings => {
  const bloomAccent = clamp(asNumber(parameters.bloomAccent, 0), 0, 2.5);
  return {
    bloomEnabled: true,
    bloomStrength:
      Math.max(0, asNumber(parameters.bloomStrength, 0.72)) +
      bloomAccent * 0.25,
    bloomRadius: clamp(asNumber(parameters.bloomRadius, 0.62), 0, 1),
    bloomThreshold: clamp(asNumber(parameters.bloomThreshold, 0.18), 0, 1),
    depthOfFieldEnabled: false,
    depthOfFieldFocus: 1,
    depthOfFieldAperture: 0,
    depthOfFieldMaxBlur: 0,
    toneMappingExposure: clamp(
      asNumber(parameters.exposure, 1.05) + bloomAccent * 0.08,
      0.25,
      2.8,
    ),
  };
};

export const createSignalCathedralProgram: VizThreeProgramFactory = ({
  node,
  width,
  height,
}) => {
  assertProgram(node);

  const scene = new Scene();
  const root = new Group();
  const architecture = new Group();
  const atmosphere = new Group();
  const coreGroup = new Group();
  const shockwaveGroup = new Group();
  const camera = new PerspectiveCamera(
    62,
    width / Math.max(height, 1),
    0.1,
    240,
  );
  camera.position.set(0, 0.2, 8);
  camera.lookAt(0, 0, -24);

  const archGeometry = new BoxGeometry(1, 1, 1);
  const primaryArchMaterial = new MeshBasicMaterial({
    color: '#5cf5ff',
    transparent: true,
    opacity: 0.76,
    depthWrite: false,
    toneMapped: false,
  });
  const secondaryArchMaterial = new MeshBasicMaterial({
    color: '#8b5cff',
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    toneMapped: false,
  });
  const primaryArches = new InstancedMesh(
    archGeometry,
    primaryArchMaterial,
    MAX_ARCH_SEGMENTS,
  );
  const secondaryArches = new InstancedMesh(
    archGeometry,
    secondaryArchMaterial,
    MAX_ARCH_SEGMENTS,
  );
  primaryArches.instanceMatrix.setUsage(DynamicDrawUsage);
  secondaryArches.instanceMatrix.setUsage(DynamicDrawUsage);
  primaryArches.frustumCulled = false;
  secondaryArches.frustumCulled = false;

  const floorGeometry = new PlaneGeometry(1, 1);
  const floorMaterial = new MeshStandardMaterial({
    color: '#03040a',
    metalness: 0.72,
    roughness: 0.34,
  });
  const floor = new Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;

  const grid = new GridHelper(160, 80, '#5cf5ff', '#25204f');
  for (const material of Array.isArray(grid.material)
    ? grid.material
    : [grid.material]) {
    material.transparent = true;
    material.opacity = 0.22;
    material.blending = AdditiveBlending;
    material.depthWrite = false;
  }

  const coreGeometry = new IcosahedronGeometry(1, 3);
  const coreMaterial = new MeshBasicMaterial({
    color: '#5cf5ff',
    transparent: true,
    opacity: 0.9,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    wireframe: true,
  });
  const core = new Mesh(coreGeometry, coreMaterial);
  const coreHaloGeometry = new IcosahedronGeometry(1.25, 2);
  const coreHaloMaterial = new MeshBasicMaterial({
    color: '#8b5cff',
    transparent: true,
    opacity: 0.14,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const coreHalo = new Mesh(coreHaloGeometry, coreHaloMaterial);

  const ringGeometry = new TorusGeometry(1.7, 0.025, 8, 96);
  const coreRings = Array.from({ length: 3 }, (_, index) => {
    const material = new MeshBasicMaterial({
      color: index === 1 ? '#ff3fcf' : '#5cf5ff',
      transparent: true,
      opacity: 0.5,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const ring = new Mesh(ringGeometry, material);
    ring.rotation.set(
      index === 0 ? Math.PI / 2 : Math.PI / 3,
      index === 1 ? Math.PI / 2 : 0,
      index * (Math.PI / 3),
    );
    return ring;
  });

  const particleGeometry = new BufferGeometry();
  const particlePositions = new Float32Array(MAX_PARTICLE_COUNT * 3);
  const particlePositionAttribute = new BufferAttribute(particlePositions, 3);
  particlePositionAttribute.setUsage(DynamicDrawUsage);
  particleGeometry.setAttribute('position', particlePositionAttribute);
  particleGeometry.setDrawRange(0, 0);
  const particleMaterial = new PointsMaterial({
    color: '#5cf5ff',
    size: 0.045,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.62,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const particles = new Points(particleGeometry, particleMaterial);
  particles.frustumCulled = false;

  const shockwaveGeometry = new TorusGeometry(1, 0.035, 8, 96);
  const shockwaves = Array.from({ length: MAX_SHOCKWAVES }, () => {
    const material = new MeshBasicMaterial({
      color: '#ff3fcf',
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const wave = new Mesh(shockwaveGeometry, material);
    wave.visible = false;
    shockwaveGroup.add(wave);
    return wave;
  });

  const ambientLight = new AmbientLight('#8b8cff', 0.12);
  const keyLight = new PointLight('#5cf5ff', 18, 80, 1.8);
  keyLight.position.set(0, 1, -12);

  architecture.add(primaryArches, secondaryArches, floor, grid);
  coreGroup.add(core, coreHalo, ...coreRings);
  atmosphere.add(particles);
  root.add(architecture, atmosphere, coreGroup, shockwaveGroup);
  scene.add(root, ambientLight, keyLight);

  root.userData.vizResourceSummary = {
    geometries: 8,
    materials: 10 + MAX_SHOCKWAVES,
    instancedMeshes: 2,
    maxArchSegments: MAX_ARCH_SEGMENTS,
    maxParticles: MAX_PARTICLE_COUNT,
    maxShockwaves: MAX_SHOCKWAVES,
  };

  const postProcessing = createVizThreePostProcessingPipeline({
    scene,
    camera,
    width,
    height,
    settings: readPostProcessingSettings(node.parameters),
  });

  const matrixObject = new Object3D();
  const primaryColor = new Color();
  const secondaryColor = new Color();
  const accentColor = new Color();
  const archInstanceColor = new Color();
  const particleBaseX = new Float32Array(MAX_PARTICLE_COUNT);
  const particleBaseY = new Float32Array(MAX_PARTICLE_COUNT);
  const particleBaseZ = new Float32Array(MAX_PARTICLE_COUNT);
  let currentSeed = '';

  const initializeParticles = (seed: string): void => {
    if (seed === currentSeed) {
      return;
    }
    currentSeed = seed;
    const numericSeed = hashString(seed);
    for (let index = 0; index < MAX_PARTICLE_COUNT; index += 1) {
      particleBaseX[index] = hashUnit(numericSeed, index, 0);
      particleBaseY[index] = hashUnit(numericSeed, index, 1);
      particleBaseZ[index] = hashUnit(numericSeed, index, 2);
    }
  };

  const setArchSegment = ({
    target,
    index,
    x,
    y,
    z,
    length,
    thickness,
    rotationZ,
    intensity,
  }: {
    target: InstancedMesh;
    index: number;
    x: number;
    y: number;
    z: number;
    length: number;
    thickness: number;
    rotationZ: number;
    intensity: number;
  }): void => {
    matrixObject.position.set(x, y, z);
    matrixObject.rotation.set(0, 0, rotationZ);
    matrixObject.scale.set(thickness, length, thickness);
    matrixObject.updateMatrix();
    target.setMatrixAt(index, matrixObject.matrix);
    archInstanceColor.setRGB(intensity, intensity, intensity);
    target.setColorAt(index, archInstanceColor);
  };

  const update = (nextNode: VizRenderThreeProgramNode): void => {
    assertProgram(nextNode);
    const parameters = nextNode.parameters;
    const time = Math.max(0, asNumber(parameters.time, 0));
    const seed = asString(parameters.seed, 'signal-cathedral');
    const archCount = Math.round(
      clamp(asNumber(parameters.archCount, 24), 8, MAX_ARCH_COUNT),
    );
    const archSpacing = clamp(asNumber(parameters.archSpacing, 4.2), 2, 8);
    const naveWidth = clamp(asNumber(parameters.naveWidth, 11), 5, 18);
    const naveHeight = clamp(asNumber(parameters.naveHeight, 7), 3, 12);
    const segmentThickness = clamp(
      asNumber(parameters.segmentThickness, 0.16),
      0.05,
      0.6,
    );
    const floorExtent = clamp(asNumber(parameters.floorExtent, 120), 40, 180);
    const coreSize = clamp(asNumber(parameters.coreSize, 1.05), 0.2, 2.5);
    const particleCount = Math.round(
      clamp(asNumber(parameters.particleCount, 900), 100, MAX_PARTICLE_COUNT),
    );
    const travelSpeed = clamp(asNumber(parameters.travelSpeed, 4.8), 0, 14);
    const cameraSway = clamp(asNumber(parameters.cameraSway, 0.32), 0, 2);
    const cameraLift = clamp(asNumber(parameters.cameraLift, 0.16), 0, 1.5);
    const structuralTwist = clamp(
      asNumber(parameters.structuralTwist, 0.055),
      -0.3,
      0.3,
    );
    const particleDrift = clamp(asNumber(parameters.particleDrift, 0.7), 0, 3);
    const coreRotation = clamp(asNumber(parameters.coreRotation, 0.65), -3, 3);
    const structurePulse = clamp(asNumber(parameters.structurePulse, 0), 0, 3);
    const coreEnergy = clamp(asNumber(parameters.coreEnergy, 0), 0, 3);
    const spectralShimmer = clamp(
      asNumber(parameters.spectralShimmer, 0),
      0,
      3,
    );
    const onsetResponse = clamp(asNumber(parameters.onsetResponse, 1), 0, 3);
    const bloomAccent = clamp(asNumber(parameters.bloomAccent, 0), 0, 3);
    const spectrum = asNumberArray(parameters.spectrum);
    const primaryHex = asString(parameters.primaryColor, '#5cf5ff');
    const secondaryHex = asString(parameters.secondaryColor, '#8b5cff');
    const accentHex = asString(parameters.accentColor, '#ff3fcf');
    primaryColor.set(primaryHex);
    secondaryColor.set(secondaryHex);
    accentColor.set(accentHex);
    scene.background = new Color(
      asString(parameters.backgroundColor, '#02030d'),
    );
    scene.fog = new FogExp2(
      asString(parameters.fogColor, '#07051c'),
      clamp(asNumber(parameters.fogDensity, 0.022), 0, 0.08),
    );

    const cycleDepth = archCount * archSpacing;
    const travel = time * travelSpeed;
    const travelOffset = cycleDepth > 0 ? travel % cycleDepth : 0;
    const floorY = -naveHeight / 2;
    const shoulderY = naveHeight * 0.08;
    const pillarHeight = shoulderY - floorY;
    const diagonalHeight = naveHeight / 2 - shoulderY;
    const diagonalWidth = naveWidth / 2;
    const diagonalLength = Math.hypot(diagonalWidth, diagonalHeight);
    const diagonalAngle = Math.atan2(diagonalHeight, diagonalWidth);
    const pulseScale = 1 + structurePulse * 0.12;
    let primarySegmentIndex = 0;
    let secondarySegmentIndex = 0;

    for (let archIndex = 0; archIndex < archCount; archIndex += 1) {
      const logicalDepth =
        (archIndex * archSpacing + travelOffset) % cycleDepth;
      const z = 2 - logicalDepth;
      const depthFactor = archIndex / Math.max(archCount - 1, 1);
      const spectrumIndex =
        spectrum.length > 0
          ? Math.min(
              spectrum.length - 1,
              Math.floor(depthFactor * spectrum.length),
            )
          : 0;
      const bandEnergy =
        spectrum.length > 0 ? (spectrum[spectrumIndex] ?? 0) / 255 : 0;
      const gatePulse = pulseScale * (1 + bandEnergy * spectralShimmer * 0.035);
      const nearFade = clamp(
        logicalDepth / Math.min(archSpacing * 0.7, 2.5),
        0,
        1,
      );
      const twist = structuralTwist * logicalDepth;
      const horizontalOffset = Math.sin(twist) * 0.38;
      const leftX = (-naveWidth / 2) * gatePulse + horizontalOffset;
      const rightX = (naveWidth / 2) * gatePulse + horizontalOffset;
      const pillarCenterY = floorY + pillarHeight / 2;
      const leftDiagonalCenterX =
        (-naveWidth / 4) * gatePulse + horizontalOffset;
      const rightDiagonalCenterX =
        (naveWidth / 4) * gatePulse + horizontalOffset;
      const diagonalCenterY = shoulderY + diagonalHeight / 2;
      const target = archIndex % 2 === 0 ? primaryArches : secondaryArches;
      let targetIndex =
        archIndex % 2 === 0 ? primarySegmentIndex : secondarySegmentIndex;

      setArchSegment({
        target,
        index: targetIndex++,
        x: leftX,
        y: pillarCenterY,
        z,
        length: pillarHeight,
        thickness: segmentThickness,
        rotationZ: 0,
        intensity: nearFade,
      });
      setArchSegment({
        target,
        index: targetIndex++,
        x: rightX,
        y: pillarCenterY,
        z,
        length: pillarHeight,
        thickness: segmentThickness,
        rotationZ: 0,
        intensity: nearFade,
      });
      setArchSegment({
        target,
        index: targetIndex++,
        x: leftDiagonalCenterX,
        y: diagonalCenterY,
        z,
        length: diagonalLength,
        thickness: segmentThickness,
        rotationZ: -Math.PI / 2 + diagonalAngle,
        intensity: nearFade,
      });
      setArchSegment({
        target,
        index: targetIndex++,
        x: rightDiagonalCenterX,
        y: diagonalCenterY,
        z,
        length: diagonalLength,
        thickness: segmentThickness,
        rotationZ: Math.PI / 2 - diagonalAngle,
        intensity: nearFade,
      });
      if (archIndex % 2 === 0) {
        primarySegmentIndex = targetIndex;
      } else {
        secondarySegmentIndex = targetIndex;
      }
    }

    primaryArches.count = primarySegmentIndex;
    secondaryArches.count = secondarySegmentIndex;
    primaryArches.instanceMatrix.needsUpdate = true;
    secondaryArches.instanceMatrix.needsUpdate = true;
    if (primaryArches.instanceColor) {
      primaryArches.instanceColor.needsUpdate = true;
    }
    if (secondaryArches.instanceColor) {
      secondaryArches.instanceColor.needsUpdate = true;
    }
    primaryArchMaterial.color
      .copy(primaryColor)
      .lerp(secondaryColor, clamp(spectralShimmer * 0.12, 0, 0.24))
      .multiplyScalar(0.48 + structurePulse * 0.28 + spectralShimmer * 0.1);
    secondaryArchMaterial.color
      .copy(secondaryColor)
      .lerp(accentColor, clamp(spectralShimmer * 0.22, 0, 0.4))
      .multiplyScalar(0.44 + structurePulse * 0.22 + spectralShimmer * 0.16);

    floor.position.set(0, floorY - 0.08, -floorExtent / 2 + 4);
    floor.scale.set(naveWidth * 1.6, floorExtent, 1);
    floorMaterial.color
      .copy(primaryColor)
      .multiplyScalar(0.018 + structurePulse * 0.008);
    grid.position.set(
      0,
      floorY - 0.05,
      -floorExtent / 2 + 4 + (travelOffset % 2),
    );
    grid.scale.set(
      Math.max(0.2, (naveWidth * 1.6) / 160),
      1,
      floorExtent / 160,
    );

    const coreScale = coreSize * (1 + coreEnergy * 0.42);
    coreGroup.position.set(0, -0.1 + coreEnergy * 0.12, -13.5);
    coreGroup.rotation.y = time * coreRotation;
    coreGroup.rotation.x = Math.sin(time * 0.37) * 0.14;
    core.scale.setScalar(coreScale);
    coreHalo.scale.setScalar(coreScale * (1.08 + bloomAccent * 0.15));
    coreMaterial.color
      .copy(primaryColor)
      .lerp(accentColor, coreEnergy * 0.28)
      .multiplyScalar(1 + coreEnergy * 0.9);
    coreMaterial.opacity = clamp(0.64 + coreEnergy * 0.26, 0, 1);
    coreHaloMaterial.color
      .copy(secondaryColor)
      .lerp(accentColor, spectralShimmer * 0.35)
      .multiplyScalar(1 + bloomAccent * 0.6);
    coreHaloMaterial.opacity = clamp(
      0.08 + coreEnergy * 0.1 + bloomAccent * 0.08,
      0,
      0.36,
    );
    coreRings.forEach((ring, index) => {
      const scale =
        coreScale *
        (1.25 + index * 0.22 + spectralShimmer * (0.08 + index * 0.03));
      ring.scale.setScalar(scale);
      ring.rotation.z =
        time * coreRotation * (index % 2 === 0 ? 0.55 : -0.42) + index * 0.8;
      const material = ring.material as MeshBasicMaterial;
      material.color
        .copy(index === 1 ? accentColor : primaryColor)
        .multiplyScalar(1 + spectralShimmer * 0.75);
      material.opacity = clamp(
        0.26 + spectralShimmer * 0.22 - index * 0.035,
        0.08,
        0.72,
      );
    });

    initializeParticles(seed);
    for (let index = 0; index < particleCount; index += 1) {
      const baseX = particleBaseX[index] ?? 0;
      const baseY = particleBaseY[index] ?? 0;
      const baseZ = particleBaseZ[index] ?? 0;
      const z =
        2 -
        fract(baseZ + (time * particleDrift) / Math.max(cycleDepth, 1)) *
          cycleDepth;
      const particleOffset = index * 3;
      particlePositions[particleOffset] =
        (baseX - 0.5) * naveWidth * 1.25 +
        Math.sin(time * 0.5 + index * 0.17) * spectralShimmer * 0.08;
      particlePositions[particleOffset + 1] = floorY + baseY * naveHeight;
      particlePositions[particleOffset + 2] = z;
    }
    particleGeometry.setDrawRange(0, particleCount);
    particlePositionAttribute.needsUpdate = true;
    particleMaterial.color
      .copy(primaryColor)
      .lerp(accentColor, spectralShimmer * 0.44)
      .multiplyScalar(0.9 + spectralShimmer * 0.8);
    particleMaterial.size = 0.035 + spectralShimmer * 0.035;
    particleMaterial.opacity = clamp(0.38 + spectralShimmer * 0.3, 0, 0.82);

    const shockwaveAges = asNumberArray(parameters.shockwaveAges).slice(
      -MAX_SHOCKWAVES,
    );
    shockwaves.forEach((wave, index) => {
      const age = shockwaveAges[index];
      if (age === undefined || age < 0 || age > 2.4) {
        wave.visible = false;
        return;
      }
      const progress = age / 2.4;
      const strength = onsetResponse * (1 - progress);
      wave.visible = true;
      wave.position.set(0, 0, -8 - progress * 48);
      wave.scale.setScalar(1.2 + progress * 8 + structurePulse * 0.4);
      const material = wave.material as MeshBasicMaterial;
      material.color
        .copy(accentColor)
        .lerp(primaryColor, progress * 0.55)
        .multiplyScalar(1 + strength * 0.75);
      material.opacity = clamp(strength * 0.68, 0, 0.78);
    });

    camera.position.x =
      Math.sin(time * 0.42) * cameraSway +
      Math.sin(time * 0.13) * cameraSway * 0.35;
    camera.position.y = 0.2 + Math.sin(time * 0.31 + 0.8) * cameraLift;
    camera.lookAt(
      Math.sin(time * 0.19) * cameraSway * 0.2,
      Math.sin(time * 0.23) * cameraLift * 0.18,
      -24,
    );

    ambientLight.intensity = clamp(
      asNumber(parameters.ambientLevel, 0.12),
      0,
      2,
    );
    keyLight.color.copy(primaryColor).lerp(accentColor, coreEnergy * 0.3);
    keyLight.intensity =
      clamp(asNumber(parameters.keyLightIntensity, 18), 0, 60) *
      (0.72 + coreEnergy * 0.42);
    keyLight.position.x = Math.sin(time * 0.7) * 1.4;
    keyLight.position.y = 0.8 + Math.cos(time * 0.53) * 0.6;

    root.userData.vizFrameSummary = {
      time,
      activeArchSegments: primarySegmentIndex + secondarySegmentIndex,
      activeParticles: particleCount,
      activeShockwaves: shockwaveAges.length,
      structurePulse,
      coreEnergy,
      spectralShimmer,
      bloomAccent,
    };

    postProcessing.update(readPostProcessingSettings(parameters));
  };

  update(node);

  return {
    programId: SIGNAL_CATHEDRAL_PROGRAM_ID,
    scene,
    camera,
    root,
    update,
    resize(nextWidth, nextHeight) {
      camera.aspect = nextWidth / Math.max(nextHeight, 1);
      camera.updateProjectionMatrix();
      postProcessing.resize(nextWidth, nextHeight);
    },
    render(renderer, renderTarget) {
      postProcessing.render(renderer, renderTarget);
    },
    dispose() {
      postProcessing.dispose();
      archGeometry.dispose();
      primaryArchMaterial.dispose();
      secondaryArchMaterial.dispose();
      floorGeometry.dispose();
      floorMaterial.dispose();
      disposeMaterial(grid.material);
      coreGeometry.dispose();
      coreMaterial.dispose();
      coreHaloGeometry.dispose();
      coreHaloMaterial.dispose();
      ringGeometry.dispose();
      coreRings.forEach((ring) => disposeMaterial(ring.material));
      particleGeometry.dispose();
      particleMaterial.dispose();
      shockwaveGeometry.dispose();
      shockwaves.forEach((wave) => disposeMaterial(wave.material));
    },
  };
};
