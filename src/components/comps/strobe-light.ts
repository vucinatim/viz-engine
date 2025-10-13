import * as THREE from 'three';
import { v } from '../config/config';
import { createComponent } from '../config/create-component';

// Simple vertex shader for fullscreen quad
const vertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader for strobe effect
const fragmentShader = `
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec2 vUv;
  
  void main() {
    // Simple fullscreen color flash
    vec3 color = uColor * uStrength;
    gl_FragColor = vec4(color, uStrength);
  }
`;

type StrobeState = {
  plane: THREE.Mesh;
  material: THREE.ShaderMaterial;
  accumulatedTime: number;
  currentFlashState: boolean;
};

const StrobeLight = createComponent({
  name: 'Strobe Light',
  description: 'Fullscreen strobe flash effect with intensity and manual modes',
  presets: [
    {
      name: 'Stage Scene Strobe',
      values: {
        mode: 'Random Flashes',
        color: '#ffffff',
        intensity: 1.0,
        strength: 1.0, // Full brightness when flashing
        dutyCycle: 0.5,
        flashRate: 0.3, // Same as stage scene default
      },
    },
    {
      name: 'High Energy Strobe',
      values: {
        mode: 'Intensity',
        color: '#ffffff',
        intensity: 8.0, // Will be modulated by kick/bass energy
        strength: 1.0, // Will be modulated by bass
        dutyCycle: 0.3, // Short, punchy flashes
        flashRate: 0.3, // Not used in Intensity mode
      },
      networks: {
        intensity: 'kick-bass-smooth-intensity',
      },
    },
    {
      name: 'Bass Pulse Strobe',
      values: {
        mode: 'Intensity',
        color: '#ffffff',
        intensity: 10.0, // Will be modulated by bass
        strength: 1.0, // Will be modulated by kick/bass
        dutyCycle: 0.25, // Very short, intense flashes
        flashRate: 0.3, // Not used in Intensity mode
      },
      networks: {
        intensity: 'bass-adaptive',
        strength: 'kick-bass-smooth-intensity',
      },
    },
  ],
  config: v.config({
    mode: v.select({
      label: 'Mode',
      description:
        'Strobe mode: Intensity (automatic), Manual (triggered), or Random Flashes',
      defaultValue: 'Intensity',
      options: ['Intensity', 'Manual', 'Random Flashes'],
    }),
    color: v.color({
      label: 'Strobe Color',
      description: 'Color of the strobe flash',
      defaultValue: '#ffffff',
    }),
    intensity: v.number({
      label: 'Intensity',
      description:
        'Flash frequency (higher = faster flashing). Only used in Intensity mode.',
      defaultValue: 1.0,
      min: 0.0,
      max: 20.0,
      step: 0.1,
      visibleIf: (vals) => vals.mode === 'Intensity',
    }),
    strength: v.number({
      label: 'Strength',
      description:
        'Flash brightness. In Manual mode, automate 0-1 for flashing.',
      defaultValue: 1.0,
      min: 0.0,
      max: 1.0,
      step: 0.01,
    }),
    dutyCycle: v.number({
      label: 'Duty Cycle',
      description:
        'Percentage of time flash is ON (0-1). Only used in Intensity mode.',
      defaultValue: 0.5,
      min: 0.1,
      max: 0.9,
      step: 0.05,
      visibleIf: (vals) => vals.mode === 'Intensity',
    }),
    flashRate: v.number({
      label: 'Flash Rate',
      description:
        'How often strobes flash (0 = never, 1 = constant). Only used in Random Flashes mode.',
      defaultValue: 0.3,
      min: 0,
      max: 1,
      step: 0.01,
      visibleIf: (vals) => vals.mode === 'Random Flashes',
    }),
  }),
  defaultNetworks: {
    strength: 'overhead-blinder-big-impact',
  },
  createState: (): StrobeState => ({
    plane: null as any,
    material: null as any,
    accumulatedTime: 0,
    currentFlashState: false,
  }),
  init3D: ({ threeCtx: { scene, camera, renderer }, state, config }) => {
    // Calculate plane size to perfectly fill viewport with perspective camera
    const canvas = renderer.domElement;
    const aspect = canvas.width / canvas.height;
    const distance = 5;

    // Calculate visible height at distance based on FOV
    const vFOV = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    const visibleHeight = 2 * Math.tan(vFOV / 2) * distance;
    const visibleWidth = visibleHeight * aspect;

    // Position camera
    camera.position.set(0, 0, distance);
    camera.lookAt(0, 0, 0);

    // Create fullscreen plane sized to exactly fill viewport
    const geometry = new THREE.PlaneGeometry(visibleWidth, visibleHeight);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(config.color) },
        uStrength: { value: config.strength },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending, // Additive blending for bright flash effect
    });

    const plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    state.plane = plane;
    state.material = material;
    state.accumulatedTime = 0;
    state.currentFlashState = false;
  },
  draw3D: ({ threeCtx: { renderer, scene, camera }, state, config, dt }) => {
    // Update plane size to match current viewport (handles window resizing)
    const canvas = renderer.domElement;
    const aspect = canvas.width / canvas.height;
    const distance = 5;

    // Calculate visible height at distance based on FOV
    const vFOV = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    const visibleHeight = 2 * Math.tan(vFOV / 2) * distance;
    const visibleWidth = visibleHeight * aspect;

    // Update plane geometry to match current viewport
    state.plane.geometry.dispose(); // Clean up old geometry
    state.plane.geometry = new THREE.PlaneGeometry(visibleWidth, visibleHeight);

    // Update color
    state.material.uniforms.uColor.value.set(config.color);

    // Calculate strength based on mode
    let finalStrength = 0;

    if (config.mode === 'Manual') {
      // In manual mode, just use the strength parameter directly
      // This allows automation to control flashing (e.g., 0 -> 1 -> 0 for a flash)
      finalStrength = config.strength;
    } else if (config.mode === 'Random Flashes') {
      // Random Flashes mode: random flashes based on flashRate (mimics stage scene strobes)
      const flashProbability = 1 - config.flashRate;
      if (Math.random() > flashProbability) {
        finalStrength = config.strength;
      } else {
        finalStrength = 0;
      }
    } else {
      // Intensity mode: automatic flashing based on intensity parameter
      if (config.intensity > 0) {
        // Calculate flash period based on intensity
        // Higher intensity = faster flashing (shorter period)
        const flashPeriod = 1.0 / config.intensity; // Period in seconds

        // Accumulate time
        state.accumulatedTime += dt;

        // Wrap time within one period
        if (state.accumulatedTime >= flashPeriod) {
          state.accumulatedTime = state.accumulatedTime % flashPeriod;
        }

        // Calculate normalized position in cycle (0 to 1)
        const cyclePosition = state.accumulatedTime / flashPeriod;

        // Flash is ON for dutyCycle percentage of the period
        const isFlashOn = cyclePosition < config.dutyCycle;

        if (isFlashOn) {
          finalStrength = config.strength;
        } else {
          finalStrength = 0;
        }
      } else {
        // Intensity is 0, no flashing
        finalStrength = 0;
      }
    }

    // Update shader uniform
    state.material.uniforms.uStrength.value = finalStrength;

    // Control visibility based on whether there's any flash
    // Only render when there's actually something to show (more efficient)
    state.plane.visible = finalStrength > 0;

    renderer.render(scene, camera);
  },
});

export default StrobeLight;
