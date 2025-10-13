import * as THREE from 'three';
import { v } from '../config/config';
import { createComponent } from '../config/create-component';

// Vertex shader (same for all - just a fullscreen quad)
const vertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Shader 1: Radial Ripple Grid
const radialRippleGrid = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec2 uResolution;
  uniform float uScale;
  uniform float uIntensity;
  uniform vec2 uOffset;
  varying vec2 vUv;
  
  #define PI 3.14159265359
  #define MAX_RIPPLES 3
  
  // Hash for pseudo-random ripple timing
  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }
  
  void main() {
    vec2 uv = (vUv - 0.5) * 2.0 + uOffset;
    uv.x *= uResolution.x / uResolution.y;
    
    // Grid pattern (horizontal and vertical lines)
    vec2 gridUv = uv * uScale * 5.0;
    vec2 gridFract = fract(gridUv);
    
    // Calculate distance to nearest grid line
    float lineDistX = min(gridFract.x, 1.0 - gridFract.x);
    float lineDistY = min(gridFract.y, 1.0 - gridFract.y);
    float lineThickness = 0.02;
    
    // Grid visibility (very subtle base)
    float gridH = smoothstep(lineThickness, 0.0, lineDistY);
    float gridV = smoothstep(lineThickness, 0.0, lineDistX);
    float baseGrid = max(gridH, gridV) * 0.08; // Very subtle
    
    // Distance from center for ripples
    float distFromCenter = length(uv);
    
    // Multiple expanding ripples
    float totalRipple = 0.0;
    float rippleDuration = 4.0 / uIntensity; // Longer cycle = slower ripples
    
    for (int i = 0; i < MAX_RIPPLES; i++) {
      float rippleOffset = hash(float(i)) * rippleDuration;
      float rippleTime = mod(uTime + rippleOffset, rippleDuration);
      float rippleProgress = rippleTime / rippleDuration;
      
      // Ripple radius expands outward
      float rippleRadius = rippleProgress * 2.5;
      
      // Distance from this ripple
      float distFromRipple = abs(distFromCenter - rippleRadius);
      
      // Softer ripple with wider falloff
      float rippleWidth = 0.25; // Wider for softer edges
      float ripple = exp(-pow(distFromRipple / rippleWidth, 2.0) * 2.0); // Lower exponent = softer
      
      // Add secondary softer wave for more natural falloff
      ripple += exp(-distFromRipple * 3.0) * 0.3;
      
      // Fade out as ripple expands
      ripple *= (1.0 - rippleProgress * 0.7);
      
      // Random intensity per ripple
      ripple *= 0.6 + hash(float(i) * 456.78) * 0.4;
      
      totalRipple += ripple;
    }
    
    // Ripples only light up the grid lines
    float rippleOnGrid = totalRipple * max(gridH, gridV) * 3.0;
    
    // Combine base grid + ripple highlights
    float finalPattern = baseGrid + rippleOnGrid;
    
    // Color
    vec3 baseColor = uColor * baseGrid * 0.5;
    vec3 rippleColor = uColor * rippleOnGrid;
    vec3 finalColor = baseColor + rippleColor;
    
    // Add glow for bright ripples
    finalColor += uColor * pow(rippleOnGrid, 2.0) * 0.5;
    
    // Subtle vignette
    float vignette = 1.0 - pow(distFromCenter / 2.0, 2.0) * 0.3;
    finalColor *= vignette;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Shader 2: Voronoi Flow Field
const voronoiFlow = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec2 uResolution;
  uniform float uScale;
  uniform float uIntensity;
  uniform vec2 uOffset;
  varying vec2 vUv;
  
  #define PI 3.14159265359
  
  // Simple 2D hash function
  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
  }
  
  // Smooth Voronoi with distance and edge information
  vec3 voronoi(vec2 uv, float time) {
    vec2 gridUv = uv * uScale;
    vec2 gridId = floor(gridUv);
    vec2 gridPos = fract(gridUv);
    
    float minDist = 10.0;
    vec2 minOffset = vec2(0.0);
    vec2 closestPoint = vec2(0.0);
    
    // Check 3x3 neighborhood
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 neighbor = vec2(float(x), float(y));
        vec2 neighborId = gridId + neighbor;
        
        // Animated point position within cell
        vec2 point = hash2(neighborId);
        point = 0.5 + 0.3 * sin(time * 0.3 + 6.2831 * point);
        
        vec2 diff = neighbor + point - gridPos;
        float dist = length(diff);
        
        if (dist < minDist) {
          minDist = dist;
          minOffset = diff;
          closestPoint = point;
        }
      }
    }
    
    // Calculate edge distance (distance to second-closest point)
    float edgeDist = 10.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 neighbor = vec2(float(x), float(y));
        vec2 neighborId = gridId + neighbor;
        vec2 point = hash2(neighborId);
        point = 0.5 + 0.3 * sin(time * 0.3 + 6.2831 * point);
        vec2 diff = neighbor + point - gridPos;
        float dist = length(diff);
        
        if (dist > minDist + 0.001) {
          edgeDist = min(edgeDist, dist);
        }
      }
    }
    
    return vec3(minDist, edgeDist - minDist, closestPoint.x + closestPoint.y);
  }
  
  void main() {
    vec2 uv = vUv + uOffset;
    uv.x *= uResolution.x / uResolution.y;
    
    // Get voronoi pattern with time evolution
    vec3 v = voronoi(uv, uTime);
    float cellDist = v.x;
    float edgeDist = v.y;
    float cellId = v.z;
    
    // Smooth cell coloring
    float cellPattern = smoothstep(0.0, 0.3, cellDist);
    
    // Highlight edges
    float edges = smoothstep(0.0, 0.05, edgeDist);
    edges = 1.0 - edges;
    
    // Combine patterns
    float pattern = mix(cellPattern * 0.6, 1.0, edges * 0.4);
    
    // Add slow flowing color variation based on cell ID
    float colorShift = sin(cellId * 12.34 + uTime * 0.2) * 0.5 + 0.5;
    
    // Apply intensity
    pattern *= (0.5 + uIntensity * 0.5);
    
    // Color mixing with subtle variation
    vec3 baseColor = uColor * pattern;
    vec3 accentColor = uColor * 1.5 * edges;
    vec3 finalColor = mix(baseColor, accentColor, colorShift * 0.3);
    
    // Subtle vignette
    vec2 centered = vUv * 2.0 - 1.0;
    float vignette = 1.0 - dot(centered, centered) * 0.2;
    finalColor *= vignette;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Shader map
const shaders: Record<string, string> = {
  'Radial Ripple Grid': radialRippleGrid,
  'Voronoi Flow': voronoiFlow,
};

type ShaderState = {
  plane: THREE.Mesh;
  material: THREE.ShaderMaterial;
  currentShader: string;
};

const FullscreenShader = createComponent({
  name: 'Fullscreen Shader',
  description: 'Audio-reactive fullscreen GLSL shaders',
  config: v.config({
    shader: v.select({
      label: 'Shader',
      description: 'Choose shader effect',
      defaultValue: 'Radial Ripple Grid',
      options: Object.keys(shaders),
    }),
    color: v.color({
      label: 'Primary Color',
      description: 'Main color for the shader',
      defaultValue: '#00ffff',
    }),
    speed: v.number({
      label: 'Animation Speed',
      description: 'Speed multiplier for animations',
      defaultValue: 1.0,
      min: 0.1,
      max: 5.0,
      step: 0.1,
    }),
    scale: v.number({
      label: 'Pattern Scale',
      description: 'Scale of the pattern',
      defaultValue: 1.0,
      min: 0.1,
      max: 5.0,
      step: 0.1,
    }),
    intensity: v.number({
      label: 'Intensity',
      description: 'Pattern intensity multiplier',
      defaultValue: 0.8,
      min: 0.0,
      max: 3.0,
      step: 0.1,
    }),
    offsetX: v.number({
      label: 'Offset X',
      description: 'Horizontal offset',
      defaultValue: 0.0,
      min: -2.0,
      max: 2.0,
      step: 0.01,
    }),
    offsetY: v.number({
      label: 'Offset Y',
      description: 'Vertical offset',
      defaultValue: 0.0,
      min: -2.0,
      max: 2.0,
      step: 0.01,
    }),
  }),
  createState: (): ShaderState => ({
    plane: null as any,
    material: null as any,
    currentShader: '',
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

    // Get canvas resolution for aspect-aware shaders
    const resolution = new THREE.Vector2(canvas.width, canvas.height);

    // Create fullscreen plane sized to exactly fill viewport
    const geometry = new THREE.PlaneGeometry(visibleWidth, visibleHeight);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uColor: { value: new THREE.Color(config.color) },
        uResolution: { value: resolution },
        uScale: { value: config.scale },
        uIntensity: { value: config.intensity },
        uOffset: { value: new THREE.Vector2(config.offsetX, config.offsetY) },
      },
      vertexShader: vertexShader,
      fragmentShader: shaders[config.shader],
      depthTest: false,
      depthWrite: false,
    });

    const plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    state.plane = plane;
    state.material = material;
    state.currentShader = config.shader;
  },
  draw3D: ({ threeCtx: { renderer, scene, camera }, state, config, dt }) => {
    // Update shader if it changed
    if (state.currentShader !== config.shader) {
      state.material.fragmentShader = shaders[config.shader];
      state.material.needsUpdate = true;
      state.currentShader = config.shader;
    }

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

    // Update resolution (in case canvas was resized)
    state.material.uniforms.uResolution.value.set(canvas.width, canvas.height);

    // Update uniforms from config (all animatable via node network)
    state.material.uniforms.uTime.value += dt * config.speed;
    state.material.uniforms.uColor.value.set(config.color);
    state.material.uniforms.uScale.value = config.scale;
    state.material.uniforms.uIntensity.value = config.intensity;
    state.material.uniforms.uOffset.value.set(config.offsetX, config.offsetY);

    renderer.render(scene, camera);
  },
});

export default FullscreenShader;
