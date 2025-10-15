import * as THREE from 'three';
import { v } from '../config/config';
import { createComponent } from '../config/create-component';

type NoiseShaderState = {
  mesh: THREE.Mesh | null;
  material: THREE.ShaderMaterial | null;
  lastWidth: number;
  lastHeight: number;
  elapsedTime: number;
};

const NoiseShader = createComponent({
  name: 'Noise Shader',
  description:
    'Fullscreen procedural noise shader with extensive customization',
  presets: [
    {
      name: 'Init',
      values: {
        noise: {
          type: 'fbm',
          scale: 3.0,
          octaves: 4,
          lacunarity: 2.0,
          gain: 0.5,
        },
        animation: {
          speed: 1.0,
          flowX: 0.0,
          flowY: 0.0,
          rotationSpeed: 0.0,
        },
        distortion: {
          enabled: false,
          amount: 1.0,
          scale: 2.0,
        },
        color: {
          mode: 'gradient',
          color1: '#000000',
          color2: '#ffffff',
          color3: '#ff0000',
          hueShift: 1.0,
          saturation: 1.0,
        },
        output: {
          brightness: 1.0,
          contrast: 1.0,
          invert: false,
          posterize: 0,
        },
      },
    },
    {
      name: 'White Tiger (Monochrome)',
      values: {
        noise: {
          type: 'simplex',
          scale: 0.6,
          octaves: 2,
          lacunarity: 3.0,
          gain: 0.3,
        },
        animation: {
          speed: 2.8,
          flowX: 0.02,
          flowY: 0.02,
          rotationSpeed: 0.0,
        },
        distortion: {
          enabled: true,
          amount: 3.5,
          scale: 1.0,
        },
        color: {
          mode: 'monochrome',
          color1: '#ffffff',
          color2: '#ffffff',
          color3: '#ffffff',
          hueShift: 1.0,
          saturation: 0.0,
        },
        output: {
          brightness: 1.99,
          contrast: 3.0,
          invert: true,
          posterize: 1,
        },
      },
    },
    {
      name: 'Flowing Ink (Monochrome)',
      values: {
        noise: {
          type: 'perlin',
          scale: 1.9,
          octaves: 2,
          lacunarity: 3.0,
          gain: 0.3,
        },
        animation: {
          speed: 2.8,
          flowX: 0.0,
          flowY: 0.0,
          rotationSpeed: 0.0,
        },
        distortion: {
          enabled: true,
          amount: 4.0,
          scale: 1.5,
        },
        color: {
          mode: 'monochrome',
          color1: '#ffffff',
          color2: '#ffffff',
          color3: '#ffffff',
          hueShift: 1.0,
          saturation: 0.0,
        },
        output: {
          brightness: 1.99,
          contrast: 3.0,
          invert: false,
          posterize: 1,
        },
      },
    },
    {
      name: 'Flowing Liquid (Monochrome)',
      values: {
        noise: {
          type: 'perlin',
          scale: 8.0,
          octaves: 2,
          lacunarity: 3.0,
          gain: 0.3,
        },
        animation: {
          speed: 2.5,
          flowX: 0.0,
          flowY: 0.2,
          rotationSpeed: 0.0,
        },
        distortion: {
          enabled: true,
          amount: 4.0,
          scale: 1.5,
        },
        color: {
          mode: 'monochrome',
          color1: '#ffffff',
          color2: '#ffffff',
          color3: '#ffffff',
          hueShift: 1.0,
          saturation: 0.0,
        },
        output: {
          brightness: 1.5,
          contrast: 4.0,
          invert: true,
          posterize: 3,
        },
      },
    },
    {
      name: 'Smoke (Monochrome)',
      values: {
        noise: {
          type: 'perlin',
          scale: 0.6,
          octaves: 2,
          lacunarity: 3,
          gain: 0.3,
        },
        animation: {
          speed: 7,
          flowX: 0,
          flowY: 0,
          rotationSpeed: 0,
        },
        distortion: {
          enabled: true,
          amount: 4,
          scale: 1.5,
        },
        color: {
          mode: 'monochrome',
          color1: '#ffffff',
          color2: '#ffffff',
          color3: '#ffffff',
          hueShift: 1,
          saturation: 0,
        },
        output: {
          brightness: 1.49,
          contrast: 3,
          invert: true,
          posterize: 0,
        },
      },
    },
    {
      name: 'Plasma Wave',
      values: {
        noise: {
          type: 'simplex',
          scale: 4.0,
          octaves: 4,
          lacunarity: 2.0,
          gain: 0.5,
        },
        animation: {
          speed: 1.8,
          flowX: 0.15,
          flowY: 0.15,
          rotationSpeed: 0.4,
        },
        distortion: {
          enabled: true,
          amount: 2.0,
          scale: 2.5,
        },
        color: {
          mode: 'hue-shift',
          color1: '#ff0000',
          color2: '#00ff00',
          color3: '#0000ff',
          hueShift: 4.0,
          saturation: 1.9,
        },
        output: {
          brightness: 1.7,
          contrast: 1.6,
          invert: false,
          posterize: 0,
        },
      },
    },
    {
      name: 'Lava Lamp',
      values: {
        noise: {
          type: 'fbm',
          scale: 0.8,
          octaves: 5,
          lacunarity: 2.0,
          gain: 0.6,
        },
        animation: {
          speed: 0.8,
          flowX: 0.0,
          flowY: 0.12,
          rotationSpeed: 0.08,
        },
        distortion: {
          enabled: true,
          amount: 2.5,
          scale: 1.2,
        },
        color: {
          mode: 'palette',
          color1: '#ff0000',
          color2: '#ff6600',
          color3: '#ffff00',
          hueShift: 1.0,
          saturation: 1.8,
        },
        output: {
          brightness: 1.5,
          contrast: 1.3,
          invert: false,
          posterize: 0,
        },
      },
    },
    {
      name: 'Aurora Borealis',
      values: {
        noise: {
          type: 'fbm',
          scale: 0.4,
          octaves: 3,
          lacunarity: 2.0,
          gain: 0.5,
        },
        animation: {
          speed: 0.2,
          flowX: 0.15,
          flowY: 0.03,
          rotationSpeed: 0.0,
        },
        distortion: {
          enabled: true,
          amount: 0.5,
          scale: 1.0,
        },
        color: {
          mode: 'palette',
          color1: '#001a33',
          color2: '#00ff88',
          color3: '#8800ff',
          hueShift: 1.0,
          saturation: 1.6,
        },
        output: {
          brightness: 1.4,
          contrast: 1.2,
          invert: false,
          posterize: 0,
        },
      },
    },
    {
      name: 'Fire',
      values: {
        noise: {
          type: 'fbm',
          scale: 1.2,
          octaves: 4,
          lacunarity: 2.0,
          gain: 0.5,
        },
        animation: {
          speed: 1.0,
          flowX: 0.0,
          flowY: -0.2,
          rotationSpeed: 0.0,
        },
        distortion: {
          enabled: true,
          amount: 1.0,
          scale: 1.5,
        },
        color: {
          mode: 'palette',
          color1: '#000000',
          color2: '#ff3300',
          color3: '#ffff00',
          hueShift: 1.0,
          saturation: 2.0,
        },
        output: {
          brightness: 2.0,
          contrast: 2.0,
          invert: false,
          posterize: 0,
        },
      },
    },
    {
      name: 'Clouds',
      values: {
        noise: {
          type: 'fbm',
          scale: 0.6,
          octaves: 5,
          lacunarity: 2.0,
          gain: 0.5,
        },
        animation: {
          speed: 0.15,
          flowX: 0.02,
          flowY: 0.008,
          rotationSpeed: 0.0,
        },
        distortion: {
          enabled: false,
          amount: 1.0,
          scale: 2.0,
        },
        color: {
          mode: 'gradient',
          color1: '#4a90e2',
          color2: '#ffffff',
          color3: '#0000ff',
          hueShift: 1.0,
          saturation: 0.8,
        },
        output: {
          brightness: 1.2,
          contrast: 0.9,
          invert: false,
          posterize: 0,
        },
      },
    },
    {
      name: 'Marble',
      values: {
        noise: {
          type: 'perlin',
          scale: 2.0,
          octaves: 4,
          lacunarity: 2.0,
          gain: 0.5,
        },
        animation: {
          speed: 0.1,
          flowX: 0.0,
          flowY: 0.0,
          rotationSpeed: 0.05,
        },
        distortion: {
          enabled: true,
          amount: 2.0,
          scale: 1.0,
        },
        color: {
          mode: 'gradient',
          color1: '#1a1a1a',
          color2: '#f0f0f0',
          color3: '#0000ff',
          hueShift: 1.0,
          saturation: 0.3,
        },
        output: {
          brightness: 1.1,
          contrast: 1.8,
          invert: false,
          posterize: 0,
        },
      },
    },
    {
      name: 'Oil Slick',
      values: {
        noise: {
          type: 'simplex',
          scale: 2.5,
          octaves: 4,
          lacunarity: 2.0,
          gain: 0.5,
        },
        animation: {
          speed: 0.3,
          flowX: 0.0,
          flowY: 0.0,
          rotationSpeed: 0.08,
        },
        distortion: {
          enabled: true,
          amount: 0.8,
          scale: 2.0,
        },
        color: {
          mode: 'hue-shift',
          color1: '#ff0000',
          color2: '#00ff00',
          color3: '#0000ff',
          hueShift: 1.5,
          saturation: 1.8,
        },
        output: {
          brightness: 1.3,
          contrast: 1.5,
          invert: false,
          posterize: 0,
        },
      },
    },
    {
      name: 'Hard Edge Balls',
      values: {
        noise: {
          type: 'cellular',
          scale: 8.0,
          octaves: 4,
          lacunarity: 2.0,
          gain: 0.5,
        },
        animation: {
          speed: 3.0,
          flowX: 0.0,
          flowY: 0.0,
          rotationSpeed: 0.0,
        },
        distortion: {
          enabled: false,
          amount: 1.0,
          scale: 2.0,
        },
        color: {
          mode: 'monochrome',
          color1: '#ffffff',
          color2: '#ffffff',
          color3: '#0000ff',
          hueShift: 1.0,
          saturation: 1.0,
        },
        output: {
          brightness: 1.0,
          contrast: 2.0,
          invert: false,
          posterize: 2,
        },
      },
    },
    {
      name: 'Watercolor',
      values: {
        noise: {
          type: 'fbm',
          scale: 1.8,
          octaves: 5,
          lacunarity: 1.8,
          gain: 0.65,
        },
        animation: {
          speed: 0.6,
          flowX: 0.05,
          flowY: -0.08,
          rotationSpeed: 0.03,
        },
        distortion: {
          enabled: true,
          amount: 1.5,
          scale: 2.5,
        },
        color: {
          mode: 'palette',
          color1: '#ff6b9d',
          color2: '#c44569',
          color3: '#4a69bd',
          hueShift: 1.0,
          saturation: 1.3,
        },
        output: {
          brightness: 1.3,
          contrast: 1.1,
          invert: false,
          posterize: 0,
        },
      },
    },
  ],
  config: v.config({
    noise: v.group(
      {
        label: 'Noise Settings',
        description: 'Core noise generation parameters',
      },
      {
        type: v.select({
          label: 'Noise Type',
          description: 'Type of noise algorithm',
          defaultValue: 'fbm',
          options: ['perlin', 'simplex', 'fbm', 'voronoi', 'cellular'],
        }),
        scale: v.number({
          label: 'Scale',
          description: 'Zoom level of the noise pattern',
          defaultValue: 3.0,
          min: 0.1,
          max: 20.0,
          step: 0.1,
        }),
        octaves: v.number({
          label: 'Octaves',
          description: 'Detail layers (for FBM)',
          defaultValue: 4,
          min: 1,
          max: 8,
          step: 1,
          visibleIf: (vals) => vals.noise?.type === 'fbm',
        }),
        lacunarity: v.number({
          label: 'Lacunarity',
          description: 'Frequency multiplier per octave',
          defaultValue: 2.0,
          min: 1.0,
          max: 4.0,
          step: 0.1,
          visibleIf: (vals) => vals.noise?.type === 'fbm',
        }),
        gain: v.number({
          label: 'Gain',
          description: 'Amplitude multiplier per octave',
          defaultValue: 0.5,
          min: 0.0,
          max: 1.0,
          step: 0.01,
          visibleIf: (vals) => vals.noise?.type === 'fbm',
        }),
      },
    ),
    animation: v.group(
      {
        label: 'Animation',
        description: 'Motion and time-based effects',
      },
      {
        speed: v.number({
          label: 'Speed',
          description: 'Animation speed multiplier',
          defaultValue: 1.0,
          min: 0.0,
          max: 10.0,
          step: 0.1,
        }),
        flowX: v.number({
          label: 'Flow X',
          description: 'Horizontal flow/drift speed',
          defaultValue: 0.0,
          min: -2.0,
          max: 2.0,
          step: 0.01,
        }),
        flowY: v.number({
          label: 'Flow Y',
          description: 'Vertical flow/drift speed',
          defaultValue: 0.0,
          min: -2.0,
          max: 2.0,
          step: 0.01,
        }),
        rotationSpeed: v.number({
          label: 'Rotation Speed',
          description: 'Rotation animation speed',
          defaultValue: 0.0,
          min: -2.0,
          max: 2.0,
          step: 0.01,
        }),
      },
    ),
    distortion: v.group(
      {
        label: 'Distortion',
        description: 'Warping and distortion effects',
      },
      {
        enabled: v.toggle({
          label: 'Enable Distortion',
          description: 'Apply domain distortion to noise',
          defaultValue: false,
        }),
        amount: v.number({
          label: 'Amount',
          description: 'Strength of distortion',
          defaultValue: 1.0,
          min: 0.0,
          max: 5.0,
          step: 0.1,
          visibleIf: (vals) => vals.distortion?.enabled === true,
        }),
        scale: v.number({
          label: 'Scale',
          description: 'Frequency of distortion pattern',
          defaultValue: 2.0,
          min: 0.1,
          max: 10.0,
          step: 0.1,
          visibleIf: (vals) => vals.distortion?.enabled === true,
        }),
      },
    ),
    color: v.group(
      {
        label: 'Color',
        description: 'Color mapping and palette',
      },
      {
        mode: v.select({
          label: 'Color Mode',
          description: 'How to map noise to colors',
          defaultValue: 'gradient',
          options: ['gradient', 'palette', 'hue-shift', 'monochrome'],
        }),
        color1: v.color({
          label: 'Color 1',
          description: 'First color (gradient start, or monochrome)',
          defaultValue: '#000000',
          visibleIf: (vals) =>
            vals.color?.mode === 'gradient' ||
            vals.color?.mode === 'palette' ||
            vals.color?.mode === 'monochrome',
        }),
        color2: v.color({
          label: 'Color 2',
          description: 'Second color (gradient end)',
          defaultValue: '#ffffff',
          visibleIf: (vals) =>
            vals.color?.mode === 'gradient' || vals.color?.mode === 'palette',
        }),
        color3: v.color({
          label: 'Color 3',
          description: 'Third color (palette mode)',
          defaultValue: '#ff0000',
          visibleIf: (vals) => vals.color?.mode === 'palette',
        }),
        hueShift: v.number({
          label: 'Hue Shift Speed',
          description: 'Hue rotation speed',
          defaultValue: 1.0,
          min: 0.0,
          max: 5.0,
          step: 0.1,
          visibleIf: (vals) => vals.color?.mode === 'hue-shift',
        }),
        saturation: v.number({
          label: 'Saturation',
          description: 'Color saturation',
          defaultValue: 1.0,
          min: 0.0,
          max: 2.0,
          step: 0.01,
          visibleIf: (vals) =>
            vals.color?.mode === 'gradient' ||
            vals.color?.mode === 'palette' ||
            vals.color?.mode === 'hue-shift',
        }),
      },
    ),
    output: v.group(
      {
        label: 'Output',
        description: 'Final output adjustments',
      },
      {
        brightness: v.number({
          label: 'Brightness',
          description: 'Overall brightness',
          defaultValue: 1.0,
          min: 0.0,
          max: 3.0,
          step: 0.01,
        }),
        contrast: v.number({
          label: 'Contrast',
          description: 'Contrast adjustment',
          defaultValue: 1.0,
          min: 0.0,
          max: 3.0,
          step: 0.01,
        }),
        invert: v.toggle({
          label: 'Invert',
          description: 'Invert the output colors',
          defaultValue: false,
        }),
        posterize: v.number({
          label: 'Posterize Levels',
          description: 'Color banding effect (0 = off)',
          defaultValue: 0,
          min: 0,
          max: 16,
          step: 1,
        }),
      },
    ),
  }),
  createState: (): NoiseShaderState => ({
    mesh: null,
    material: null,
    lastWidth: 0,
    lastHeight: 0,
    elapsedTime: 0,
  }),
  init3D: ({ threeCtx: { scene, camera, renderer }, state }) => {
    // Initialize elapsed time
    state.elapsedTime = 0;

    // Track renderer size
    state.lastWidth = renderer.domElement.width;
    state.lastHeight = renderer.domElement.height;

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

    // Create shader material with comprehensive noise implementation
    const material = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0.0 },
        u_resolution: {
          value: new THREE.Vector2(state.lastWidth, state.lastHeight),
        },
        // Noise settings
        u_noiseType: { value: 1 }, // 0=perlin, 1=simplex, 2=fbm, 3=voronoi, 4=cellular
        u_scale: { value: 3.0 },
        u_octaves: { value: 4 },
        u_lacunarity: { value: 2.0 },
        u_gain: { value: 0.5 },
        // Animation
        u_speed: { value: 1.0 },
        u_flowX: { value: 0.0 },
        u_flowY: { value: 0.0 },
        u_rotationSpeed: { value: 0.0 },
        // Distortion
        u_distortionEnabled: { value: 0 },
        u_distortionAmount: { value: 1.0 },
        u_distortionScale: { value: 2.0 },
        // Color
        u_colorMode: { value: 0 }, // 0=gradient, 1=palette, 2=hue-shift, 3=monochrome
        u_color1: { value: new THREE.Color(0x000000) },
        u_color2: { value: new THREE.Color(0xffffff) },
        u_color3: { value: new THREE.Color(0xff0000) },
        u_hueShift: { value: 1.0 },
        u_saturation: { value: 1.0 },
        // Output
        u_brightness: { value: 1.0 },
        u_contrast: { value: 1.0 },
        u_invert: { value: 0 },
        u_posterize: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float u_time;
        uniform vec2 u_resolution;
        
        // Noise settings
        uniform int u_noiseType;
        uniform float u_scale;
        uniform int u_octaves;
        uniform float u_lacunarity;
        uniform float u_gain;
        
        // Animation
        uniform float u_speed;
        uniform float u_flowX;
        uniform float u_flowY;
        uniform float u_rotationSpeed;
        
        // Distortion
        uniform int u_distortionEnabled;
        uniform float u_distortionAmount;
        uniform float u_distortionScale;
        
        // Color
        uniform int u_colorMode;
        uniform vec3 u_color1;
        uniform vec3 u_color2;
        uniform vec3 u_color3;
        uniform float u_hueShift;
        uniform float u_saturation;
        
        // Output
        uniform float u_brightness;
        uniform float u_contrast;
        uniform int u_invert;
        uniform int u_posterize;
        
        varying vec2 vUv;
        
        // ===== NOISE FUNCTIONS =====
        
        // Hash function for pseudo-random values
        vec2 hash2(vec2 p) {
          p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
          return fract(sin(p) * 43758.5453123);
        }
        
        vec3 hash3(vec3 p) {
          p = vec3(
            dot(p, vec3(127.1, 311.7, 74.7)),
            dot(p, vec3(269.5, 183.3, 246.1)),
            dot(p, vec3(113.5, 271.9, 124.6))
          );
          return fract(sin(p) * 43758.5453123);
        }
        
        // Simplex noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289_2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
        
        float simplexNoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289_2(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
          m = m * m;
          m = m * m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
          vec3 g;
          g.x = a0.x * x0.x + h.x * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }
        
        // Perlin-style noise
        float perlinNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          
          return mix(
            mix(dot(hash2(i + vec2(0.0, 0.0)) * 2.0 - 1.0, f - vec2(0.0, 0.0)),
                dot(hash2(i + vec2(1.0, 0.0)) * 2.0 - 1.0, f - vec2(1.0, 0.0)), u.x),
            mix(dot(hash2(i + vec2(0.0, 1.0)) * 2.0 - 1.0, f - vec2(0.0, 1.0)),
                dot(hash2(i + vec2(1.0, 1.0)) * 2.0 - 1.0, f - vec2(1.0, 1.0)), u.x),
            u.y
          );
        }
        
        // FBM (Fractal Brownian Motion)
        float fbm(vec2 p, int octaves, float lacunarity, float gain) {
          float value = 0.0;
          float amplitude = 1.0;
          float frequency = 1.0;
          
          for (int i = 0; i < 8; i++) {
            if (i >= octaves) break;
            value += amplitude * simplexNoise(p * frequency);
            frequency *= lacunarity;
            amplitude *= gain;
          }
          
          return value;
        }
        
        // Voronoi noise
        float voronoiNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          
          float minDist = 1.0;
          
          for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
              vec2 neighbor = vec2(float(x), float(y));
              vec2 point = hash2(i + neighbor);
              vec2 diff = neighbor + point - f;
              float dist = length(diff);
              minDist = min(minDist, dist);
            }
          }
          
          return minDist;
        }
        
        // Cellular/Worley noise
        float cellularNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          
          float m_dist = 1.0;
          
          for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
              vec2 neighbor = vec2(float(x), float(y));
              vec2 point = hash2(i + neighbor);
              point = 0.5 + 0.5 * sin(u_time * 0.5 + 6.2831 * point);
              vec2 diff = neighbor + point - f;
              float dist = length(diff);
              m_dist = min(m_dist, dist);
            }
          }
          
          return m_dist;
        }
        
        // Get noise value based on type
        float getNoise(vec2 p) {
          if (u_noiseType == 0) {
            return perlinNoise(p);
          } else if (u_noiseType == 1) {
            return simplexNoise(p);
          } else if (u_noiseType == 2) {
            return fbm(p, u_octaves, u_lacunarity, u_gain);
          } else if (u_noiseType == 3) {
            return voronoiNoise(p);
          } else if (u_noiseType == 4) {
            return cellularNoise(p);
          }
          return 0.0;
        }
        
        // ===== COLOR FUNCTIONS =====
        
        // RGB to HSV
        vec3 rgb2hsv(vec3 c) {
          vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
          vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
          vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
          float d = q.x - min(q.w, q.y);
          float e = 1.0e-10;
          return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }
        
        // HSV to RGB
        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }
        
        // Apply saturation
        vec3 adjustSaturation(vec3 color, float sat) {
          vec3 hsv = rgb2hsv(color);
          hsv.y *= sat;
          return hsv2rgb(hsv);
        }
        
        // ===== MAIN =====
        
        void main() {
          // Setup coordinates with aspect ratio correction
          vec2 uv = vUv;
          uv.x *= u_resolution.x / u_resolution.y;
          vec2 p = uv * u_scale;
          
          // Apply rotation
          if (u_rotationSpeed != 0.0) {
            float angle = u_time * u_rotationSpeed;
            float s = sin(angle);
            float c = cos(angle);
            mat2 rot = mat2(c, -s, s, c);
            p = rot * (p - u_scale * 0.5) + u_scale * 0.5;
          }
          
          // Apply flow
          p.x += u_time * u_speed * u_flowX;
          p.y += u_time * u_speed * u_flowY;
          
          // Apply domain distortion if enabled
          if (u_distortionEnabled == 1) {
            vec2 q = vec2(
              getNoise(p * u_distortionScale),
              getNoise(p * u_distortionScale + vec2(5.2, 1.3))
            );
            p += q * u_distortionAmount;
          }
          
          // Add time animation to noise
          vec2 animatedP = p + vec2(0.0, u_time * u_speed * 0.1);
          
          // Get noise value
          float noiseValue = getNoise(animatedP);
          
          // Normalize to 0-1 range
          noiseValue = noiseValue * 0.5 + 0.5;
          
          // Apply color based on mode
          vec3 color;
          
          if (u_colorMode == 0) {
            // Gradient mode
            color = mix(u_color1, u_color2, noiseValue);
          } else if (u_colorMode == 1) {
            // Palette mode (3 colors)
            if (noiseValue < 0.5) {
              color = mix(u_color1, u_color2, noiseValue * 2.0);
            } else {
              color = mix(u_color2, u_color3, (noiseValue - 0.5) * 2.0);
            }
          } else if (u_colorMode == 2) {
            // Hue shift mode
            float hue = fract(noiseValue + u_time * u_hueShift * 0.1);
            color = hsv2rgb(vec3(hue, 1.0, 1.0));
          } else {
            // Monochrome mode
            color = u_color1 * noiseValue;
          }
          
          // Apply saturation
          color = adjustSaturation(color, u_saturation);
          
          // Apply contrast
          color = (color - 0.5) * u_contrast + 0.5;
          
          // Apply brightness
          color *= u_brightness;
          
          // Apply posterization if enabled
          if (u_posterize > 0) {
            float levels = float(u_posterize);
            color = floor(color * levels) / levels;
          }
          
          // Apply invert
          if (u_invert == 1) {
            color = 1.0 - color;
          }
          
          // Clamp to valid range
          color = clamp(color, 0.0, 1.0);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false,
    });

    state.material = material;

    // Create fullscreen plane sized to exactly fill viewport
    const geometry = new THREE.PlaneGeometry(visibleWidth, visibleHeight);

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    state.mesh = mesh;

    // Add to scene
    scene.add(mesh);
  },
  draw3D: ({ threeCtx: { renderer, camera }, state, config, dt, time }) => {
    if (!state.material || !state.mesh) return;

    // Use explicit time parameter instead of accumulating
    const elapsedTime = time;

    // Update resolution if changed
    const currentWidth = renderer.domElement.width;
    const currentHeight = renderer.domElement.height;
    if (
      currentWidth !== state.lastWidth ||
      currentHeight !== state.lastHeight
    ) {
      state.material.uniforms.u_resolution.value.set(
        currentWidth,
        currentHeight,
      );
      state.lastWidth = currentWidth;
      state.lastHeight = currentHeight;

      // Update plane geometry to match current viewport (handles window resizing)
      const aspect = currentWidth / currentHeight;
      const distance = 5;

      // Calculate visible height at distance based on FOV
      const vFOV = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
      const visibleHeight = 2 * Math.tan(vFOV / 2) * distance;
      const visibleWidth = visibleHeight * aspect;

      // Update plane geometry to match current viewport
      state.mesh.geometry.dispose(); // Clean up old geometry
      state.mesh.geometry = new THREE.PlaneGeometry(
        visibleWidth,
        visibleHeight,
      );
    }

    // Update uniforms from config
    state.material.uniforms.u_time.value = elapsedTime;

    // Noise settings
    const noiseTypeMap: { [key: string]: number } = {
      perlin: 0,
      simplex: 1,
      fbm: 2,
      voronoi: 3,
      cellular: 4,
    };
    state.material.uniforms.u_noiseType.value =
      noiseTypeMap[config.noise.type] ?? 1;
    state.material.uniforms.u_scale.value = config.noise.scale;
    state.material.uniforms.u_octaves.value = config.noise.octaves;
    state.material.uniforms.u_lacunarity.value = config.noise.lacunarity;
    state.material.uniforms.u_gain.value = config.noise.gain;

    // Animation
    state.material.uniforms.u_speed.value = config.animation.speed;
    state.material.uniforms.u_flowX.value = config.animation.flowX;
    state.material.uniforms.u_flowY.value = config.animation.flowY;
    state.material.uniforms.u_rotationSpeed.value =
      config.animation.rotationSpeed;

    // Distortion
    state.material.uniforms.u_distortionEnabled.value = config.distortion
      .enabled
      ? 1
      : 0;
    state.material.uniforms.u_distortionAmount.value = config.distortion.amount;
    state.material.uniforms.u_distortionScale.value = config.distortion.scale;

    // Color
    const colorModeMap: { [key: string]: number } = {
      gradient: 0,
      palette: 1,
      'hue-shift': 2,
      monochrome: 3,
    };
    state.material.uniforms.u_colorMode.value =
      colorModeMap[config.color.mode] ?? 0;
    state.material.uniforms.u_color1.value.set(config.color.color1);
    state.material.uniforms.u_color2.value.set(config.color.color2);
    state.material.uniforms.u_color3.value.set(config.color.color3);
    state.material.uniforms.u_hueShift.value = config.color.hueShift;
    state.material.uniforms.u_saturation.value = config.color.saturation;

    // Output
    state.material.uniforms.u_brightness.value = config.output.brightness;
    state.material.uniforms.u_contrast.value = config.output.contrast;
    state.material.uniforms.u_invert.value = config.output.invert ? 1 : 0;
    state.material.uniforms.u_posterize.value = config.output.posterize;
  },
});

export default NoiseShader;
