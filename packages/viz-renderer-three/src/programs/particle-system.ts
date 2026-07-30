import type { VizRenderThreeProgramNode } from '@viz-engine/contracts';
import {
  AdditiveBlending,
  Color,
  DynamicDrawUsage,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  MultiplyBlending,
  NormalBlending,
  Object3D,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  type Blending,
  type WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';
import {
  asBoolean,
  asNumber,
  asNonEmptyString as asString,
  assertProgram,
  hashString,
} from './program-input.js';
import type { VizThreeProgramFactory } from './types.js';

const PROGRAM_ID = 'viz-core/particle-system/v1';
const MAX_PARTICLES = 10_000;

const vertexShader = `
  attribute vec3 instanceColor;
  varying vec3 vColor;

  void main() {
    vColor = instanceColor;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;

  void main() {
    gl_FragColor = vec4(vColor, 0.8);
  }
`;

const random01 = (seed: number, particleIndex: number, channel: number) => {
  let value =
    seed ^
    Math.imul(particleIndex + 1, 0x9e3779b1) ^
    Math.imul(channel + 1, 0x85ebca6b);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
};

const blendingModes: Record<string, Blending> = {
  additive: AdditiveBlending,
  normal: NormalBlending,
  multiply: MultiplyBlending,
};

export const createParticleSystemProgram: VizThreeProgramFactory = ({
  node,
  width,
  height,
}) => {
  assertProgram(node, PROGRAM_ID, 'Particle System');

  const scene = new Scene();
  scene.background = new Color(0x0a0a0a);
  const root = new Group();
  const camera = new PerspectiveCamera(
    75,
    width / Math.max(height, 1),
    0.1,
    1000,
  );
  camera.position.set(0, 2, 8);
  camera.lookAt(0, 0, 0);

  const geometry = new SphereGeometry(1, 8, 8);
  const material = new ShaderMaterial({
    transparent: true,
    vertexShader,
    fragmentShader,
    blending: AdditiveBlending,
  });
  const mesh = new InstancedMesh(geometry, material, MAX_PARTICLES);
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.count = 0;
  const colorAttribute = new InstancedBufferAttribute(
    new Float32Array(MAX_PARTICLES * 3),
    3,
  );
  colorAttribute.setUsage(DynamicDrawUsage);
  geometry.setAttribute('instanceColor', colorAttribute);
  root.add(mesh);
  scene.add(root);

  const dummy = new Object3D();
  const position = new Vector3();
  const velocity = new Vector3();
  const startColor = new Color();
  const endColor = new Color();
  const particleColor = new Color();

  const update = (nextNode: VizRenderThreeProgramNode) => {
    assertProgram(nextNode, PROGRAM_ID, 'Particle System');
    const parameters = nextNode.parameters;
    const time = Math.max(0, asNumber(parameters.time, 0));
    const emissionRate = Math.max(0, asNumber(parameters.emissionRate, 100));
    const lifetime = Math.max(0.1, asNumber(parameters.lifetime, 2));
    const particleSize = Math.max(0.1, asNumber(parameters.particleSize, 0.2));
    const useGravity = asBoolean(parameters.useGravity, true);
    const gravityStrength = Math.max(
      0,
      asNumber(parameters.gravityStrength, 9.8),
    );
    const initialSpeed = Math.max(0, asNumber(parameters.initialSpeed, 2));
    const spread = Math.min(1, Math.max(0, asNumber(parameters.spread, 0.5)));
    const emitterShape = asString(parameters.emitterShape, 'point');
    const emitterSize = Math.max(0, asNumber(parameters.emitterSize, 0.5));
    const nextBlending =
      blendingModes[asString(parameters.blending, 'additive')] ??
      AdditiveBlending;
    if (material.blending !== nextBlending) {
      material.blending = nextBlending;
      material.needsUpdate = true;
    }

    startColor.set(asString(parameters.startColor, '#ff00ff'));
    endColor.set(asString(parameters.endColor, '#00ffff'));
    root.rotation.set(
      asNumber(parameters.rotationX, 0),
      asNumber(parameters.rotationY, 0),
      asNumber(parameters.rotationZ, 0),
    );

    if (emissionRate === 0) {
      mesh.count = 0;
      mesh.userData.activeParticleCount = 0;
      return;
    }

    const emittedCount = Math.floor(time * emissionRate);
    const maximumAlive = Math.min(
      MAX_PARTICLES,
      Math.ceil(emissionRate * lifetime),
    );
    const firstParticle = Math.max(0, emittedCount - maximumAlive);
    const seed = hashString(asString(parameters.seed, 'particle-system'));
    let slot = 0;

    for (
      let particleIndex = firstParticle;
      particleIndex < emittedCount && slot < MAX_PARTICLES;
      particleIndex += 1
    ) {
      const spawnTime = (particleIndex + 1) / emissionRate;
      const age = time - spawnTime;
      if (age < 0 || age >= lifetime) {
        continue;
      }

      position.set(0, 0, 0);
      if (emitterShape === 'sphere') {
        const theta = random01(seed, particleIndex, 0) * Math.PI * 2;
        const phi = Math.acos(2 * random01(seed, particleIndex, 1) - 1);
        position.set(
          emitterSize * Math.sin(phi) * Math.cos(theta),
          emitterSize * Math.sin(phi) * Math.sin(theta),
          emitterSize * Math.cos(phi),
        );
      } else if (emitterShape === 'box') {
        position.set(
          (random01(seed, particleIndex, 0) - 0.5) * emitterSize,
          (random01(seed, particleIndex, 1) - 0.5) * emitterSize,
          (random01(seed, particleIndex, 2) - 0.5) * emitterSize,
        );
      }

      const theta = random01(seed, particleIndex, 3) * Math.PI * 2;
      const phi = Math.acos(1 - spread * random01(seed, particleIndex, 4));
      velocity.set(
        initialSpeed * Math.sin(phi) * Math.cos(theta),
        initialSpeed * Math.cos(phi),
        initialSpeed * Math.sin(phi) * Math.sin(theta),
      );

      position.addScaledVector(velocity, age);
      if (useGravity) {
        position.y -= 0.5 * gravityStrength * age * age;
      }

      dummy.position.copy(position);
      dummy.scale.setScalar(particleSize);
      dummy.updateMatrix();
      mesh.setMatrixAt(slot, dummy.matrix);

      particleColor.copy(startColor).lerp(endColor, age / lifetime);
      colorAttribute.setXYZ(
        slot,
        particleColor.r,
        particleColor.g,
        particleColor.b,
      );
      slot += 1;
    }

    mesh.count = slot;
    mesh.userData.activeParticleCount = slot;
    mesh.instanceMatrix.needsUpdate = true;
    colorAttribute.needsUpdate = true;
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
