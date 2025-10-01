import * as THREE from 'three';
import { ShaderWallConfig } from '../scene-config';

export function createShaderWall(
  scene: THREE.Scene,
  speakerBoxGeometry: THREE.BoxGeometry,
  renderer?: THREE.WebGLRenderer,
) {
  // --- NEW: SHADER-BASED VISUALIZER WALL ---
  // Use renderer size if available, otherwise fall back to window size
  const resolution = renderer
    ? new THREE.Vector2(renderer.domElement.width, renderer.domElement.height)
    : new THREE.Vector2(window.innerWidth, window.innerHeight);

  const shaderUniforms = {
    u_time: { value: 0.0 },
    u_resolution: { value: resolution },
    u_scale: { value: 2.0 },
    u_rotationSpeed: { value: 1.0 },
    u_colorSpeed: { value: 1.0 },
    u_travelSpeed: { value: 1.0 },
    u_brightness: { value: 2.0 },
  };

  const vertexShader = `
      varying vec2 vUv;
      varying vec3 vWorldPosition; // ADD THIS LINE

      void main() {
          vUv = uv;
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz; // ADD THIS LINE
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
  `;

  const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_scale;
      uniform float u_rotationSpeed;
      uniform float u_colorSpeed;
      uniform float u_travelSpeed;
      uniform float u_brightness;
      varying vec2 vUv;
      varying vec3 vWorldPosition; // ADD THIS LINE

      // --- CONSTANTS & UTILITIES ---
      const int MAX_STEPS = 64;
      const float MAX_DIST = 100.0;
      const float SURF_DIST = 0.001;

      // --- COLOR PALETTE ---
      vec3 palette( float t ) {
          return 0.5 + 0.5 * cos( 6.28318 * (t + vec3(0.0, 0.33, 0.67)) );
      }
      
      // --- 3D ROTATION ---
      mat3 rotateY(float angle) {
          float s = sin(angle);
          float c = cos(angle);
          return mat3(
              c, 0.0, -s,
              0.0, 1.0, 0.0,
              s, 0.0, c
          );
      }

      mat3 rotateZ(float angle) {
          float s = sin(angle);
          float c = cos(angle);
          return mat3(
              c, -s, 0.0,
              s, c, 0.0,
              0.0, 0.0, 1.0
          );
      }

      // --- THE SIGNED DISTANCE FUNCTION (SDF) ---
      // This function defines the 3D shape of our fractal (a Mandelbox)
      float sdfMandelbox(vec3 p) {
          vec4 q = vec4(p, 1.0);
          vec3 original_p = p;

          // Animate the parameters over time to make the fractal evolve
          float scale = u_scale + 0.2 * sin(u_time * 0.2);
          float minRadius = 0.5 + 0.1 * cos(u_time * 0.15);
          float fixedRadius = 1.0;

          // REDUCED ITERATIONS from 5 to 4 to lower the visual density
          for (int i=0; i<4; i++) {
              q.xyz = clamp(q.xyz, -1.0, 1.0) * 2.0 - q.xyz; // Box fold
              float r2 = dot(q.xyz, q.xyz);
              if (r2 < minRadius) {
                  q.xyz *= fixedRadius / minRadius; // Sphere inversion
                  q.w *= fixedRadius / minRadius;
              } else if (r2 < fixedRadius) {
                  q.xyz *= fixedRadius / r2; // Sphere inversion
                  q.w *= fixedRadius / r2;
              }
              q = q * scale + vec4(original_p, 1.0);
          }
          return (length(q.xyz) - 1.0) / abs(q.w);
      }

      // --- MAIN SCENE DISTANCE FUNCTION ---
      // This combines all shapes in our scene (in this case, just one)
      float map(vec3 p) {
          // --- NEW: DOMAIN REPETITION ---
          // This makes the fractal repeat seamlessly along the Z-axis, creating an infinite tunnel.
          float repetitionLength = 20.0;
          p.z = mod(p.z + repetitionLength * 0.5, repetitionLength) - repetitionLength * 0.5;

          // Rotate the entire fractal over time
          p = rotateY(u_time * 0.1 * u_rotationSpeed) * p;
          return sdfMandelbox(p);
      }

      // --- NORMAL CALCULATION ---
      // Calculates the "up" direction of the surface for lighting
      vec3 calcNormal(vec3 p) {
          vec2 e = vec2(0.001, 0.0);
          return normalize(vec3(
              map(p + e.xyy) - map(p - e.xyy),
              map(p + e.yxy) - map(p - e.yxy),
              map(p + e.yyx) - map(p - e.yyx)
          ));
      }
      
      // --- RAYMARCHING FUNCTION ---
      // Steps a ray through the scene to find the first surface hit
      float rayMarch(vec3 ro, vec3 rd) {
          float dO = 0.0;
          for(int i=0; i<MAX_STEPS; i++) {
              vec3 p = ro + rd * dO;
              float dS = map(p);
              dO += dS;
              if(dO > MAX_DIST || dS < SURF_DIST) break;
          }
          return dO;
      }

      // --- MAIN IMAGE GENERATION ---
      void main() {
          // Setup the "camera" for our raymarched scene
          
          // --- THIS IS THE KEY CHANGE ---
          // Instead of using the panel's local UVs, we use its world position.
          // This makes all panels sample from the same continuous 3D space.
          vec2 uv = vec2(vWorldPosition.x, vWorldPosition.y - 15.0) * 0.08;
          // uv.x *= u_resolution.x / u_resolution.y; // Aspect ratio correction no longer needed this way
          
          // Animate Ray Origin to fly forward continuously. The space itself now repeats.
          vec3 ro = vec3(0.0, 0.0, 2.5 - u_time * 0.5 * u_travelSpeed); 
          
          // Animate Ray Direction to rotate
          vec3 rd = normalize(vec3(uv, -1.5));
          rd = rotateZ(u_time * 0.1 * u_rotationSpeed) * rd;


          float dist = rayMarch(ro, rd);
          
          vec3 color = vec3(0.0);

          if (dist < MAX_DIST) {
              // We hit something!
              vec3 p = ro + rd * dist;
              vec3 normal = calcNormal(p);
              
              // Basic lighting
              float light = dot(normalize(vec3(1.0, 1.0, 1.0)), normal) * 0.5 + 0.5;
              
              // Get color from the palette based on position and time
              vec3 surfaceColor = palette(p.y * 0.1 + u_time * 0.1 * u_colorSpeed);
              
              // Combine lighting and color, and make it glow for the bloom pass
              color = surfaceColor * light * u_brightness;
          }

          gl_FragColor = vec4(color, 1.0);
      }
  `;

  const shaderWallMaterial = new THREE.ShaderMaterial({
    uniforms: shaderUniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.DoubleSide,
  });

  const panelSize = 2;
  const panelSpacing = 0.5;
  const gridWidth = 20;
  const gridHeight = 10;
  const wallWidth = gridWidth * (panelSize + panelSpacing) - panelSpacing;
  const wallHeight = gridHeight * (panelSize + panelSpacing) - panelSpacing;

  const shaderWallGeometry = new THREE.PlaneGeometry(wallWidth, wallHeight);
  const shaderWall = new THREE.Mesh(shaderWallGeometry, shaderWallMaterial);
  shaderWall.position.set(0, 15, -10);
  scene.add(shaderWall);

  const mainWallHalfWidthForSpeakers =
    (gridWidth * (panelSize + panelSpacing) - panelSpacing) / 2;
  const gapForSpeakers = 4;
  const speakerXOffset = mainWallHalfWidthForSpeakers + gapForSpeakers;
  // --- NEW: SIDE SHADER PANELS ---
  const sidePanelWidth = 15;
  const sidePanelHeight = wallHeight; // Changed from 35 to match the main panel
  const sidePanelGeometry = new THREE.PlaneGeometry(
    sidePanelWidth,
    sidePanelHeight,
  );
  const sidePanelXOffset =
    speakerXOffset +
    speakerBoxGeometry.parameters.width / 2 +
    sidePanelWidth / 2 +
    5;

  const leftSidePanel = new THREE.Mesh(sidePanelGeometry, shaderWallMaterial);
  leftSidePanel.position.set(-sidePanelXOffset, shaderWall.position.y, -5); // Corrected Y position
  leftSidePanel.rotation.y = Math.PI / 6; // Angle them inwards slightly
  scene.add(leftSidePanel);

  const rightSidePanel = new THREE.Mesh(sidePanelGeometry, shaderWallMaterial);
  rightSidePanel.position.set(sidePanelXOffset, shaderWall.position.y, -5); // Corrected Y position
  rightSidePanel.rotation.y = -Math.PI / 6; // Angle them inwards slightly
  scene.add(rightSidePanel);

  const update = (time: number, config: ShaderWallConfig) => {
    shaderWall.visible = config.enabled;
    leftSidePanel.visible = config.enabled;
    rightSidePanel.visible = config.enabled;

    if (config.enabled) {
      shaderWallMaterial.uniforms.u_time.value = time;
      shaderWallMaterial.uniforms.u_scale.value = config.scale;
      shaderWallMaterial.uniforms.u_rotationSpeed.value = config.rotationSpeed;
      shaderWallMaterial.uniforms.u_colorSpeed.value = config.colorSpeed;
      shaderWallMaterial.uniforms.u_travelSpeed.value = config.travelSpeed;
      shaderWallMaterial.uniforms.u_brightness.value = config.brightness;
    }
  };

  const updateResolution = (width: number, height: number) => {
    shaderWallMaterial.uniforms.u_resolution.value.set(width, height);
  };

  return {
    shaderWall,
    leftSidePanel,
    rightSidePanel,
    panelSize,
    panelSpacing,
    gridWidth,
    update,
    updateResolution,
  };
}
