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

// Shader 3: Neon Grid - Cyberpunk-style tech substrate
const neonGrid = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec2 uResolution;
  uniform float uScale;
  uniform float uIntensity;
  uniform float uSeed;
  uniform float uScanIntensity;
  uniform float uWaveIntensity;
  varying vec2 vUv;
  
  // Hash functions for better pseudo-random distribution (with custom seed)
  float hash(vec2 p, float customSeed) {
    return fract(sin(dot(p + customSeed, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  float hash2(vec2 p, float customSeed) {
    return fract(sin(dot(p + customSeed, vec2(269.5, 183.3))) * 43758.5453);
  }
  
  // Function to render grid at a specific zoom level with custom seed
  vec4 renderGrid(vec2 baseUv, float zoom, float gridSeed, float time, vec3 gridColor, float gridScale, float brightnessBoost, float scanIntensity, float waveIntensity) {
    // Apply zoom - divide to zoom IN (makes things bigger)
    vec2 uv = baseUv / zoom;
    
    vec3 finalColor = vec3(0.0);
    float finalAlpha = 0.0;
    
    // Primary grid - main structure (slightly offset to avoid edge alignment, centered)
    float gridSize1 = 7.3 * gridScale;
    vec2 gridPos1 = fract(uv * gridSize1 + 0.5);
    vec2 gridID1 = floor(uv * gridSize1 + 0.5);
    
    // Multiple random values per cell for better variation
    float cellRandom1 = hash(gridID1, gridSeed);
    float cellRandom2 = hash2(gridID1, gridSeed);
    float cellRandom3 = hash(gridID1 + vec2(50.0, 25.0), gridSeed);
    
    // Determine which lines exist independently for each direction
    float horizontalLineExists = step(0.6, cellRandom1);
    float verticalLineExists = step(0.6, cellRandom2);
    
    // Main grid lines with varying thickness based on cell
    float hLineThickness = mix(0.02, 0.04, cellRandom3);
    float vLineThickness = mix(0.02, 0.04, fract(cellRandom3 + 0.5));
    
    float onHLine = step(gridPos1.y, hLineThickness) * horizontalLineExists;
    float onVLine = step(gridPos1.x, vLineThickness) * verticalLineExists;
    
    // Add pulsing animation to lines (more dynamic)
    float hLinePulse = 0.5 + 0.5 * sin(time * 0.7 + cellRandom1 * 6.28);
    float vLinePulse = 0.5 + 0.5 * sin(time * 0.7 + cellRandom2 * 6.28);
    
    onHLine *= mix(0.5, 0.95, hLinePulse);
    onVLine *= mix(0.5, 0.95, vLinePulse);
    
    float linePattern = max(onHLine, onVLine);
    
    // Secondary finer grid for detail (also offset and centered)
    float gridSize2 = 22.7 * gridScale;
    vec2 gridPos2 = fract(uv * gridSize2 + 0.5);
    vec2 gridID2 = floor(uv * gridSize2 + 0.5);
    float cellRandom2_1 = hash(gridID2 + vec2(42.0, 17.0), gridSeed);
    float cellRandom2_2 = hash2(gridID2 + vec2(17.0, 42.0), gridSeed);
    
    float fineLineThickness = 0.018;
    float showFineLine = step(0.75, max(cellRandom2_1, cellRandom2_2));
    float fineHLine = step(gridPos2.y, fineLineThickness) * step(0.5, cellRandom2_1);
    float fineVLine = step(gridPos2.x, fineLineThickness) * step(0.5, cellRandom2_2);
    float finePattern = max(fineHLine, fineVLine) * showFineLine;
    
    // Nodes at grid intersections with better distribution (subtle)
    vec2 nodePos = abs(gridPos1 - vec2(0.0));
    float nodeSize = 0.05; // Smaller size
    float nodeDist = length(nodePos);
    float node = smoothstep(nodeSize, nodeSize * 0.3, nodeDist); // Softer edges
    float showNode = step(0.85, cellRandom3); // Much less frequent (was 0.6)
    float nodePulse = 0.5 + 0.2 * sin(time * 1.5 + cellRandom1 * 10.0); // Dimmer pulse
    node *= showNode * nodePulse;
    
    // Circuit traces - only on some horizontal lines
    float showTrace = step(0.75, hash(gridID1 + vec2(100.0, 50.0), gridSeed));
    float tracePattern = step(abs(gridPos1.y - 0.5), 0.03) * showTrace * horizontalLineExists;
    // Add flowing data packets (faster)
    float dataFlow = fract(gridPos1.x - time * 0.5 + cellRandom1);
    float dataPacket = smoothstep(0.12, 0.05, abs(dataFlow - 0.5));
    tracePattern *= mix(0.6, 1.0, dataPacket);
    
    // Scanning effect - horizontal scan line that moves across screen (faster)
    float scanLine = abs(uv.y - (mod(time * 0.2, 4.0) - 2.0));
    float scan = smoothstep(0.25, 0.0, scanLine) * 0.4 * scanIntensity;
    
    // Energy waves - radial pulses from certain points (subtle, infrequent)
    vec2 waveCenter1 = vec2(sin(time * 0.2) * 1.2, cos(time * 0.18) * 1.2);
    float waveDist = length(uv - waveCenter1);
    float wave = sin(waveDist * 3.0 - time * 1.5) * 0.5 + 0.5; // Less frequent rings (was 10.0)
    wave *= smoothstep(2.0, 0.0, abs(fract(waveDist - time * 0.15) - 0.5) * 4.0);
    wave = pow(wave, 2.0); // Make falloff softer
    
    // Create color variations based on the base grid color
    vec3 primaryColor = gridColor;
    vec3 secondaryColor = gridColor * 0.9; // Slightly dimmer
    vec3 accentColor = gridColor * 1.2; // Slightly brighter
    
    // Layer the base patterns (without waves first)
    finalColor += primaryColor * linePattern * 0.7;
    finalColor += secondaryColor * finePattern * 0.6;
    finalColor += accentColor * node * 0.35; // Much more subtle (was 0.85)
    finalColor += primaryColor * tracePattern * 0.75;
    finalColor += primaryColor * scan * 0.7;
    
    // Calculate total alpha (without waves)
    finalAlpha = max(linePattern * 0.5, max(finePattern * 0.45, max(node * 0.25, max(tracePattern * 0.6, scan * 0.3))));
    
    // Apply waves as a brightness multiplier to existing patterns (screen blend mode)
    // This makes waves only visible where there are already grid lines
    float waveBrightness = 1.0 + wave * waveIntensity; // Boost brightness where waves pass
    finalColor *= waveBrightness;
    
    // Apply audio-reactive brightness boost
    finalColor *= brightnessBoost;
    
    // Clamp to prevent over-brightness
    finalColor = min(finalColor, vec3(1.0));
    
    return vec4(finalColor, finalAlpha);
  }
  
  void main() {
    // Aspect-corrected UV coordinates, centered at (0, 0)
    vec2 baseUv = (vUv - 0.5) * 2.0;
    baseUv.x *= uResolution.x / uResolution.y;
    
    // Continuous zoom-in effect with dual-layer crossfade (infinite tunnel)
    float zoomCycleDuration = 20.0; // How long one zoom cycle lasts (seconds)
    float minZoom = 1.0; // Starting zoom (smaller = zoomed out)
    float maxZoom = 2.0; // Ending zoom (larger = zoomed in)
    
    // Each layer goes through a full cycle: zoom from 1.0 to 2.0
    // - First half (0.0 to 0.5): zoom 1.0→1.5, opacity 0→1 (fade in)
    // - Second half (0.5 to 1.0): zoom 1.5→2.0, opacity 1→0 (fade out)
    // - At 1.0: jump back to 1.0 zoom (invisible, so no visual pop), change seed, repeat
    
    // Layer 1 cycle position (0.0 to 1.0)
    float layer1Progress = mod(uTime / zoomCycleDuration, 1.0);
    
    // Layer 2 cycle position (offset by 0.5 = half a cycle)
    float layer2Progress = mod((uTime / zoomCycleDuration) + 0.5, 1.0);
    
    // Calculate zoom for each layer (always zooming from min to max)
    float zoom1 = minZoom + (maxZoom - minZoom) * layer1Progress;
    float zoom2 = minZoom + (maxZoom - minZoom) * layer2Progress;
    
    // Calculate opacity for each layer
    // First half (0.0 to 0.5): opacity goes 0 → 1
    // Second half (0.5 to 1.0): opacity goes 1 → 0
    float layer1Opacity;
    if (layer1Progress < 0.5) {
      // Fade in: 0 → 1
      layer1Opacity = layer1Progress * 2.0;
    } else {
      // Fade out: 1 → 0
      layer1Opacity = (1.0 - layer1Progress) * 2.0;
    }
    
    float layer2Opacity;
    if (layer2Progress < 0.5) {
      // Fade in: 0 → 1
      layer2Opacity = layer2Progress * 2.0;
    } else {
      // Fade out: 1 → 0
      layer2Opacity = (1.0 - layer2Progress) * 2.0;
    }
    
    // Generate seeds based on which cycle each layer is on
    // Seed changes each time a layer completes its cycle (resets to zoom 1.0)
    float layer1CycleNumber = floor(uTime / zoomCycleDuration);
    float layer2CycleNumber = floor((uTime / zoomCycleDuration) + 0.5);
    
    float seed1 = uSeed + mod(layer1CycleNumber, 100.0) * 100.0;
    float seed2 = uSeed + mod(layer2CycleNumber, 100.0) * 100.0 + 50.0;
    
    // Calculate audio-reactive brightness boost
    float baseBrightness = 1.0;
    float maxBoost = 0.5; // Can boost up to 50% brighter
    float brightnessBoost = baseBrightness + uIntensity * maxBoost;
    
    // Render two grid layers at different zoom levels with different seeds
    vec4 layer1 = renderGrid(baseUv, zoom1, seed1, uTime, uColor, uScale, brightnessBoost, uScanIntensity, uWaveIntensity);
    vec4 layer2 = renderGrid(baseUv, zoom2, seed2, uTime, uColor, uScale, brightnessBoost, uScanIntensity, uWaveIntensity);
    
    // Blend layers based on their opacities
    // When one is fully visible (opacity=1), the other is invisible (opacity=0)
    // In between, they crossfade smoothly
    vec4 blended = layer1 * layer1Opacity + layer2 * layer2Opacity;
    
    gl_FragColor = blended;
  }
`;

// Shader map
const shaders: Record<string, string> = {
  'Radial Ripple Grid': radialRippleGrid,
  'Voronoi Flow': voronoiFlow,
  'Neon Grid': neonGrid,
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
      defaultValue: 0.5,
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
      visibleIf: (config) => config.shader !== 'Neon Grid',
    }),
    offsetY: v.number({
      label: 'Offset Y',
      description: 'Vertical offset',
      defaultValue: 0.0,
      min: -2.0,
      max: 2.0,
      step: 0.01,
      visibleIf: (config) => config.shader !== 'Neon Grid',
    }),
    seed: v.number({
      label: 'Seed',
      description: 'Random seed for pattern variation',
      defaultValue: 0,
      min: 0,
      max: 1000,
      step: 1,
      visibleIf: (config) => config.shader === 'Neon Grid',
    }),
    scanIntensity: v.number({
      label: 'Scan Intensity',
      description: 'Intensity of horizontal scan line',
      defaultValue: 0.7,
      min: 0.0,
      max: 2.0,
      step: 0.1,
      visibleIf: (config) => config.shader === 'Neon Grid',
    }),
    waveIntensity: v.number({
      label: 'Wave Intensity',
      description: 'Intensity of energy wave brightness boost',
      defaultValue: 0.6,
      min: 0.0,
      max: 2.0,
      step: 0.1,
      visibleIf: (config) => config.shader === 'Neon Grid',
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
        uSeed: { value: config.seed || 0 },
        uScanIntensity: { value: config.scanIntensity || 0.7 },
        uWaveIntensity: { value: config.waveIntensity || 0.6 },
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
    state.material.uniforms.uSeed.value = config.seed || 0;
    state.material.uniforms.uScanIntensity.value = config.scanIntensity || 0.7;
    state.material.uniforms.uWaveIntensity.value = config.waveIntensity || 0.6;

    renderer.render(scene, camera);
  },
});

export default FullscreenShader;
