import { cssColorToLinearRGB } from '@/lib/color-utils';
import * as THREE from 'three';
import { v } from '../config/config';
import { createComponent } from '../config/create-component';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  lifetime: number;
  color: THREE.Color;
}

const ParticleSystem = createComponent({
  name: 'Particle System',
  description:
    'GPU-accelerated particle system with physics and color interpolation',
  config: v.config({
    appearance: v.group(
      { label: 'Appearance' },
      {
        startColor: v.color({
          label: 'Start Color',
          description: 'Particle color at birth',
          defaultValue: '#ff00ff',
        }),
        endColor: v.color({
          label: 'End Color',
          description: 'Particle color at death',
          defaultValue: '#00ffff',
        }),
        particleSize: v.number({
          label: 'Particle Size',
          description: 'Size of individual particles',
          defaultValue: 0.2,
          min: 0.1,
          max: 5,
          step: 0.1,
        }),
        blending: v.select({
          label: 'Blending Mode',
          description: 'How particles blend together',
          defaultValue: 'additive',
          options: ['additive', 'normal', 'multiply'],
        }),
      },
    ),
    physics: v.group(
      { label: 'Physics' },
      {
        emissionRate: v.number({
          label: 'Emission Rate',
          description: 'Particles emitted per second',
          defaultValue: 100,
          min: 0,
          max: 1000,
          step: 10,
        }),
        lifetime: v.number({
          label: 'Lifetime (s)',
          description: 'How long each particle lives',
          defaultValue: 2,
          min: 0.1,
          max: 10,
          step: 0.1,
        }),
        useGravity: v.toggle({
          label: 'Use Gravity',
          description: 'Apply gravitational force to particles',
          defaultValue: true,
        }),
        gravityStrength: v.number({
          label: 'Gravity Strength',
          description: 'Strength of gravitational pull',
          defaultValue: 9.8,
          min: 0,
          max: 50,
          step: 0.1,
          visibleIf: (allValues) => allValues.physics.useGravity === true,
        }),
        initialSpeed: v.number({
          label: 'Initial Speed',
          description: 'Initial velocity magnitude',
          defaultValue: 2,
          min: 0,
          max: 10,
          step: 0.1,
        }),
        spread: v.number({
          label: 'Spread',
          description: 'Angular spread of particle emission (0-1)',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.01,
        }),
      },
    ),
    emission: v.group(
      { label: 'Emission' },
      {
        emitterShape: v.select({
          label: 'Emitter Shape',
          description: 'Shape of the particle emitter',
          defaultValue: 'point',
          options: ['point', 'sphere', 'box'],
        }),
        emitterSize: v.number({
          label: 'Emitter Size',
          description: 'Size of the emitter volume',
          defaultValue: 0.5,
          min: 0,
          max: 5,
          step: 0.1,
        }),
      },
    ),
    rotation: v.group(
      { label: 'Rotation' },
      {
        rotationSpeedX: v.number({
          label: 'Rotation Speed X',
          description: 'Rotation speed around X axis',
          defaultValue: 0,
          min: -5,
          max: 5,
          step: 0.1,
        }),
        rotationSpeedY: v.number({
          label: 'Rotation Speed Y',
          description: 'Rotation speed around Y axis',
          defaultValue: 1,
          min: -5,
          max: 5,
          step: 0.1,
        }),
        rotationSpeedZ: v.number({
          label: 'Rotation Speed Z',
          description: 'Rotation speed around Z axis',
          defaultValue: 0,
          min: -5,
          max: 5,
          step: 0.1,
        }),
      },
    ),
  }),
  createState: () => ({
    instancedMesh: null as THREE.InstancedMesh | null,
    material: null as THREE.ShaderMaterial | null,
    particleGroup: null as THREE.Group | null,
    particles: [] as Particle[],
    maxParticles: 10000,
    particlePool: [] as Particle[],
    accumulator: 0,
    dummy: new THREE.Object3D(),
    colorAttribute: null as THREE.InstancedBufferAttribute | null,
  }),
  init3D: ({ threeCtx: { scene, camera, renderer }, state, config }) => {
    // Ensure ALL state properties are initialized (fix for refresh issue)
    if (!state.particles) state.particles = [];
    if (!state.particlePool) state.particlePool = [];
    if (!state.maxParticles) state.maxParticles = 10000;
    if (!state.accumulator) state.accumulator = 0;
    if (!state.dummy) state.dummy = new THREE.Object3D();

    // Camera setup
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 0, 0);

    // Scene background
    scene.background = new THREE.Color(0x0a0a0a);

    // Create parent group for rotation
    const particleGroup = new THREE.Group();
    scene.add(particleGroup);
    state.particleGroup = particleGroup;

    // Create particle geometry
    const geometry = new THREE.SphereGeometry(1, 8, 8);

    // Create custom shader material for instanced colors
    const material = new THREE.ShaderMaterial({
      transparent: true,
      vertexShader: `
        attribute vec3 instanceColor;
        varying vec3 vColor;
        
        void main() {
          vColor = instanceColor;
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          gl_FragColor = vec4(vColor, 0.8);
        }
      `,
      blending: THREE.AdditiveBlending,
    });

    // Create instanced mesh
    const instancedMesh = new THREE.InstancedMesh(
      geometry,
      material,
      state.maxParticles,
    );
    instancedMesh.count = 0;

    // Create color attribute for instanced rendering
    const colorAttribute = new THREE.InstancedBufferAttribute(
      new Float32Array(state.maxParticles * 3),
      3,
    );
    instancedMesh.geometry.setAttribute('instanceColor', colorAttribute);

    // Add to particle group instead of directly to scene
    particleGroup.add(instancedMesh);

    // Store references
    state.instancedMesh = instancedMesh;
    state.material = material;
    state.colorAttribute = colorAttribute;

    // Pre-allocate particle pool for efficiency
    for (let i = 0; i < state.maxParticles; i++) {
      state.particlePool.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        age: 0,
        lifetime: 0,
        color: new THREE.Color(),
      });
    }
  },
  draw3D: ({
    threeCtx: { scene, camera, renderer },
    state,
    config,
    dt,
    audioData,
  }) => {
    if (!state.instancedMesh || !state.material || !state.colorAttribute) {
      return;
    }

    // Parse colors for interpolation
    const startColor = cssColorToLinearRGB(config.appearance.startColor);
    const endColor = cssColorToLinearRGB(config.appearance.endColor);

    // Update blending mode
    switch (config.appearance.blending) {
      case 'additive':
        state.material.blending = THREE.AdditiveBlending;
        break;
      case 'normal':
        state.material.blending = THREE.NormalBlending;
        break;
      case 'multiply':
        state.material.blending = THREE.MultiplyBlending;
        break;
    }

    // Emit new particles based on emission rate
    state.accumulator += dt;
    const emissionInterval = 1 / config.physics.emissionRate;

    while (
      state.accumulator >= emissionInterval &&
      state.particles.length < state.maxParticles
    ) {
      state.accumulator -= emissionInterval;
      emitParticle(state, config);
    }

    // Update existing particles
    const gravity = config.physics.useGravity
      ? new THREE.Vector3(0, -config.physics.gravityStrength, 0)
      : new THREE.Vector3(0, 0, 0);

    // Safety check for particles array
    if (!state.particles) {
      state.particles = [];
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const particle = state.particles[i];
      particle.age += dt;

      // Remove dead particles
      if (particle.age >= particle.lifetime) {
        if (state.particlePool) {
          state.particlePool.push(particle);
        }
        state.particles.splice(i, 1);
        continue;
      }

      // Apply physics
      particle.velocity.add(gravity.clone().multiplyScalar(dt));
      particle.position.add(particle.velocity.clone().multiplyScalar(dt));

      // Update instance matrix
      state.dummy.position.copy(particle.position);
      state.dummy.scale.setScalar(config.appearance.particleSize);
      state.dummy.updateMatrix();
      state.instancedMesh.setMatrixAt(i, state.dummy.matrix);

      // Update particle color based on lifetime
      const lifetimeProgress = particle.age / particle.lifetime;
      particle.color.lerpColors(
        new THREE.Color(startColor.r, startColor.g, startColor.b),
        new THREE.Color(endColor.r, endColor.g, endColor.b),
        lifetimeProgress,
      );

      // Update color attribute
      state.colorAttribute.setXYZ(
        i,
        particle.color.r,
        particle.color.g,
        particle.color.b,
      );
    }

    // Update instance count and mark for update
    state.instancedMesh.count = state.particles.length;
    state.instancedMesh.instanceMatrix.needsUpdate = true;
    state.colorAttribute.needsUpdate = true;

    // Rotate the entire particle system for comet-like effect
    if (state.particleGroup) {
      state.particleGroup.rotation.x += config.rotation.rotationSpeedX * dt;
      state.particleGroup.rotation.y += config.rotation.rotationSpeedY * dt;
      state.particleGroup.rotation.z += config.rotation.rotationSpeedZ * dt;
    }

    renderer.render(scene, camera);
  },
});

function emitParticle(state: any, config: any) {
  // Ensure particlePool exists
  if (!state.particlePool) {
    state.particlePool = [];
  }

  // Get particle from pool or create new one
  const particle = state.particlePool.pop() || {
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    age: 0,
    lifetime: 0,
    color: new THREE.Color(),
  };

  // Set lifetime
  particle.lifetime = config.physics.lifetime;
  particle.age = 0;

  // Initialize color to start color
  const startColor = cssColorToLinearRGB(config.appearance.startColor);
  particle.color.setRGB(startColor.r, startColor.g, startColor.b);

  // Set initial position based on emitter shape
  switch (config.emission.emitterShape) {
    case 'point':
      particle.position.set(0, 0, 0);
      break;
    case 'sphere':
      const sphereRadius = config.emission.emitterSize;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      particle.position.set(
        sphereRadius * Math.sin(phi) * Math.cos(theta),
        sphereRadius * Math.sin(phi) * Math.sin(theta),
        sphereRadius * Math.cos(phi),
      );
      break;
    case 'box':
      const boxSize = config.emission.emitterSize;
      particle.position.set(
        (Math.random() - 0.5) * boxSize,
        (Math.random() - 0.5) * boxSize,
        (Math.random() - 0.5) * boxSize,
      );
      break;
  }

  // Set initial velocity with spread
  const spread = config.physics.spread;
  const speed = config.physics.initialSpeed;

  // Generate random direction with spread control
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(1 - spread * Math.random());

  particle.velocity.set(
    speed * Math.sin(phi) * Math.cos(theta),
    speed * Math.cos(phi), // Bias upward
    speed * Math.sin(phi) * Math.sin(theta),
  );

  // Ensure particles array exists
  if (!state.particles) {
    state.particles = [];
  }

  state.particles.push(particle);
}

export default ParticleSystem;
