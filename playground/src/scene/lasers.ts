import * as THREE from 'three';
import { LaserConfig } from '../scene-config';

export function createLasers(scene: THREE.Scene, config: LaserConfig) {
  const masterLaserGroup = new THREE.Group();
  const laserBeamGroup = new THREE.Group();
  const laserSheetGroup = new THREE.Group();
  masterLaserGroup.add(laserBeamGroup);
  masterLaserGroup.add(laserSheetGroup);

  const numLasers = 12;
  const laserTrussWidth = 90;

  // --- Material for the standard BEAM lasers (with fade toward tip) ---
  const laserBeamMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(config.singleColor) },
    },
    vertexShader: `
      varying vec3 vPosition;
      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPosition;
      uniform vec3 color;
      void main() {
        // Fade out toward the tip (y goes from 0 at base to 300 at tip)
        // Normalize to 0-1 range
        float fade = 1.0 - (vPosition.y / 300.0);
        // Apply aggressive power curve for faster fade
        fade = pow(fade, 4.5);
        
        // Bright core with glow
        vec3 finalColor = color * (1.0 + fade * 2.0);
        float finalOpacity = fade;
        
        gl_FragColor = vec4(finalColor, finalOpacity);
      }
    `,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });

  // --- Material for the SHEET lasers (with custom shader for fading) ---
  const laserSheetMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(config.singleColor) },
      spread: { value: 1.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      uniform float spread;
      varying float vSpread;
      void main() {
        vUv = uv;
        vSpread = spread;
        vec3 modifiedPosition = position;
        modifiedPosition.x *= spread;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(modifiedPosition, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 color;
      varying float vSpread;
      void main() {
        // vUv.y goes from 0 at the source to 1 at the end for the main fade
        float yFalloff = pow(1.0 - vUv.y, 4.0);

        // --- V-Shape Edge Detection ---
        // The shape is a triangle with UV vertices at (0.5,0), (0,1), and (1,1).
        // Left edge line equation: 2x + y - 1 = 0
        // Right edge line equation: 2x - y - 1 = 0
        float distToLeftEdge = abs(2.0 * vUv.x + vUv.y - 1.0) / sqrt(5.0);
        float distToRightEdge = abs(2.0 * vUv.x - vUv.y - 1.0) / sqrt(5.0);

        // Find the minimum distance to an edge
        float minEdgeDist = min(distToLeftEdge, distToRightEdge);

        // --- Create the Glow ---
        // The glow should be strongest at the edge and fall off quickly.
        float borderThickness = 0.002; // Adjust this for thicker/thinner lines
        // As the sheet spreads, the UV space gets stretched horizontally.
        // To maintain a constant visual thickness, we need to make the
        // thickness in UV space thinner by the same factor.
        float adjustedBorderThickness = borderThickness / vSpread;
        float edgeGlow = 1.0 - smoothstep(0.0, adjustedBorderThickness, minEdgeDist);

        // --- Combine Effects ---
        // Start with the base laser sheet (a semi-transparent fill)
        float baseOpacity = 0.1;
        // Add the edge glow, making sure it's affected by the vertical falloff
        float finalOpacity = baseOpacity + edgeGlow;
        // Apply the overall vertical falloff to everything
        finalOpacity *= yFalloff;

        // Make the color much brighter where the glow is strongest
        vec3 finalColor = color + color * edgeGlow * 4.0;

        gl_FragColor = vec4(finalColor, finalOpacity);
      }
    `,
    blending: THREE.AdditiveBlending,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false, // Important for additive blending
  });

  // --- Geometry for the BEAM effects ---
  const laserBeamGeometry = new THREE.CylinderGeometry(0.03, 0.03, 300, 8);
  // Translate geometry so the base is at the origin (not the center)
  // This makes the rotation point at the base instead of the middle
  laserBeamGeometry.translate(0, 150, 0);

  for (let i = 0; i < numLasers; i++) {
    // Give each beam its own material so we can color it individually
    const beamMaterialInstance = laserBeamMaterial.clone();
    beamMaterialInstance.uniforms.color.value = new THREE.Color(
      config.singleColor,
    );
    const laser = new THREE.Mesh(laserBeamGeometry, beamMaterialInstance);
    const xPos = (i / (numLasers - 1) - 0.5) * laserTrussWidth;
    laser.position.set(xPos, 36, -18);
    laser.rotation.x = Math.PI / 2;
    laserBeamGroup.add(laser);
  }

  // --- Geometry for the SHEET effect ---
  const laserSheetGeometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    // x,    y,    z
    -7.5,
    150,
    0, // top left
    7.5,
    150,
    0, // top right
    0,
    0,
    0, // bottom center (point)
  ]);
  laserSheetGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(vertices, 3),
  );

  const uvs = new Float32Array([
    0,
    1, // top left
    1,
    1, // top right
    0.5,
    0, // bottom center
  ]);
  laserSheetGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  laserSheetGeometry.computeVertexNormals();

  for (let i = 0; i < numLasers; i++) {
    // --- CHANGE: Use the new shader material for each sheet ---
    const sheetMaterialInstance = laserSheetMaterial.clone();
    sheetMaterialInstance.uniforms.color.value = new THREE.Color(
      config.singleColor,
    ); // Set initial color
    sheetMaterialInstance.uniforms.spread.value =
      laserSheetMaterial.uniforms.spread.value;

    const laserSheet = new THREE.Mesh(
      laserSheetGeometry,
      sheetMaterialInstance,
    );
    const xPos = (i / (numLasers - 1) - 0.5) * laserTrussWidth;
    laserSheet.position.set(xPos, 36, -25);
    laserSheet.rotation.x = Math.PI / 2;
    laserSheetGroup.add(laserSheet);
  }

  const staticLaser1 = new THREE.Mesh(
    laserSheetGeometry,
    laserSheetMaterial.clone(),
  );
  (staticLaser1.material as THREE.ShaderMaterial).uniforms.spread.value =
    laserSheetMaterial.uniforms.spread.value;
  staticLaser1.position.set(-25, 36, -25);
  staticLaser1.rotation.x = Math.PI / 2;
  staticLaser1.name = 'staticLaser1';
  laserSheetGroup.add(staticLaser1);

  const staticLaser2 = new THREE.Mesh(
    laserSheetGeometry,
    laserSheetMaterial.clone(),
  );
  (staticLaser2.material as THREE.ShaderMaterial).uniforms.spread.value =
    laserSheetMaterial.uniforms.spread.value;
  staticLaser2.position.set(25, 36, -25);
  staticLaser2.rotation.x = Math.PI / 2;
  staticLaser2.name = 'staticLaser2';
  laserSheetGroup.add(staticLaser2);

  scene.add(masterLaserGroup);

  // Update function to handle dynamic config changes
  const update = (elapsedTime: number, currentConfig: LaserConfig) => {
    // Update visibility
    masterLaserGroup.visible = currentConfig.enabled;
    if (!masterLaserGroup.visible) return;

    // Determine current mode
    let currentMode =
      currentConfig.mode === 'auto'
        ? Math.floor(elapsedTime / 8.0) % 5
        : currentConfig.mode;

    // Mode visibility:
    // 0: Wave (beams only)
    // 1: Wobble (beams only)
    // 2: Sheet (sheets only)
    // 3: Hybrid Flash (both - beams flash, sheets rotate)
    // 4: Hybrid Sweep (both - beams sweep, sheets rotate)
    laserBeamGroup.visible =
      currentMode === 0 ||
      currentMode === 1 ||
      currentMode === 3 ||
      currentMode === 4;
    laserSheetGroup.visible =
      currentMode === 2 || currentMode === 3 || currentMode === 4;

    const timeScale = currentConfig.rotationSpeed;
    const maxLasers = Math.min(
      numLasers,
      Math.max(1, currentConfig.maxConcurrentLasers || numLasers),
    );

    if (currentMode === 0) {
      // Wave mode
      laserBeamGroup.children.forEach((laser, i) => {
        laser.visible = i < maxLasers;

        if (i < maxLasers) {
          const time = elapsedTime * 2 * timeScale;
          laser.rotation.z = (Math.sin(time + i * 0.8) * Math.PI) / 6;
          laser.rotation.y =
            (Math.cos(elapsedTime * 0.2 * timeScale) * Math.PI) / 12;

          const material = (laser as THREE.Mesh)
            .material as THREE.ShaderMaterial;
          if (currentConfig.colorMode === 'single') {
            material.uniforms.color.value.set(currentConfig.singleColor);
          } else {
            material.uniforms.color.value.setHSL(
              (elapsedTime * 0.1 + i * 0.05) % 1,
              1,
              0.5,
            );
          }
        }
      });
    } else if (currentMode === 1) {
      // Wobble mode
      laserBeamGroup.children.forEach((laser, i) => {
        laser.visible = i < maxLasers;

        if (i < maxLasers) {
          const time = elapsedTime * 40 * timeScale;
          laser.rotation.y = (Math.sin(time + i * 0.2) * Math.PI) / 4;
          laser.rotation.z = Math.PI / 16;

          const material = (laser as THREE.Mesh)
            .material as THREE.ShaderMaterial;
          if (currentConfig.colorMode === 'single') {
            material.uniforms.color.value.set(currentConfig.singleColor);
          } else {
            material.uniforms.color.value.setHSL(
              (Math.floor(elapsedTime * 2) * 0.3) % 1,
              1,
              0.5,
            );
          }
        }
      });
    } else if (currentMode === 2) {
      // Sheet mode
      const activeSheetIndex1 = Math.floor(elapsedTime * 2) % maxLasers;
      const activeSheetIndex2 =
        maxLasers - 1 - (Math.floor(elapsedTime * 2) % maxLasers);

      laserSheetGroup.children.forEach((laserSheet, i) => {
        const isMovingLaser =
          laserSheet.name !== 'staticLaser1' &&
          laserSheet.name !== 'staticLaser2';
        const isActiveMoving =
          i === activeSheetIndex1 || i === activeSheetIndex2;

        let isActive = false;
        if (isMovingLaser) {
          isActive = isActiveMoving && i < maxLasers;
        } else {
          isActive = i < maxLasers; // Static lasers shown if within limit
        }

        laserSheet.visible = isActive;

        if (isActive) {
          const material = (laserSheet as THREE.Mesh)
            .material as THREE.ShaderMaterial;
          if (isMovingLaser) {
            // --- REALISTIC LASER MOVEMENT ---
            const time = Math.floor(elapsedTime * 5 * timeScale);
            const randomSeed = i * 1.23;
            laserSheet.rotation.z = (Math.sin(time + randomSeed) * Math.PI) / 8;
            laserSheet.rotation.y =
              (Math.cos(time * 1.5 + randomSeed) * Math.PI) / 16;
            // Pulsing / Scaling effect
            const scaleFactor =
              0.8 + Math.abs(Math.sin(elapsedTime * 15 * timeScale)) * 0.4;
            laserSheet.scale.set(scaleFactor, scaleFactor, scaleFactor);
          } else {
            // SMOOTH animation for static lasers
            const time = elapsedTime * 0.5 * timeScale;
            const randomSeed = i * 1.23;
            laserSheet.rotation.z =
              (Math.sin(time + randomSeed) * Math.PI) / 12;
            laserSheet.rotation.y =
              (Math.cos(time * 0.75 + randomSeed) * Math.PI) / 24;
          }

          // Animate Spread
          if (isMovingLaser) {
            const spreadCycle =
              (Math.sin(elapsedTime * 1.5 * timeScale) + 1) / 2;
            const minSpread = 0.3;
            const maxSpread = 2.5;
            material.uniforms.spread.value =
              minSpread + spreadCycle * (maxSpread - minSpread);
          } else {
            const spreadCycle =
              (Math.sin(elapsedTime * 1.0 * timeScale) + 1) / 2;
            const minSpread = 0.5;
            const maxSpread = 3.5;
            material.uniforms.spread.value =
              minSpread + spreadCycle * (maxSpread - minSpread);
          }

          // Set color
          if (currentConfig.colorMode === 'single') {
            material.uniforms.color.value.set(currentConfig.singleColor);
          } else {
            const colorHue = isMovingLaser
              ? (Math.floor(elapsedTime) * 0.1) % 1
              : (Math.floor(elapsedTime) * 0.1 + 0.5) % 1;
            material.uniforms.color.value.setHSL(colorHue, 0.9, 0.5);
          }
        }
      });
    } else if (currentMode === 3) {
      // Hybrid Flash Mode: Flashing line lasers + smooth rotating sheets

      // Sheet lasers - show static lasers within limit
      let sheetCount = 0;
      const maxSheets = Math.min(2, maxLasers); // Max 2 static sheets, or less if maxLasers is lower

      laserSheetGroup.children.forEach((laserSheet, i) => {
        const isStatic =
          laserSheet.name === 'staticLaser1' ||
          laserSheet.name === 'staticLaser2';

        const shouldShow = isStatic && sheetCount < maxSheets;
        if (shouldShow && isStatic) sheetCount++;

        laserSheet.visible = shouldShow;

        if (shouldShow) {
          const material = (laserSheet as THREE.Mesh)
            .material as THREE.ShaderMaterial;

          // Smooth rotation animation
          const time = elapsedTime * 0.3 * timeScale;
          const randomSeed = i * 1.23;
          laserSheet.rotation.z = (Math.sin(time + randomSeed) * Math.PI) / 10;
          laserSheet.rotation.y =
            (Math.cos(time * 0.8 + randomSeed) * Math.PI) / 20;

          // Gentle spread animation
          const spreadCycle = (Math.sin(elapsedTime * 0.8 * timeScale) + 1) / 2;
          const minSpread = 0.7;
          const maxSpread = 2.5;
          material.uniforms.spread.value =
            minSpread + spreadCycle * (maxSpread - minSpread);

          // Set color
          if (currentConfig.colorMode === 'single') {
            material.uniforms.color.value.set(currentConfig.singleColor);
          } else {
            const colorHue = (elapsedTime * 0.05 + i * 0.1) % 1;
            material.uniforms.color.value.setHSL(colorHue, 0.9, 0.5);
          }
        }
      });

      // Line lasers - fast flashing, mirrored left/right
      const maxBeams = Math.max(0, maxLasers - maxSheets); // Remaining capacity after sheets
      const beamsToShow = Math.min(2, maxBeams); // Show up to 2 beams if capacity allows
      const flashSpeed = 8; // Flashes per second
      const availableBeams = Math.min(numLasers, Math.ceil(maxBeams / 2)); // Half of available slots
      const flashIndex =
        availableBeams > 0
          ? Math.floor(elapsedTime * flashSpeed * timeScale) % availableBeams
          : 0;
      const leftLaserIndex = flashIndex;
      const rightLaserIndex = numLasers - 1 - flashIndex;

      laserBeamGroup.children.forEach((laser, i) => {
        const isActive =
          beamsToShow > 0 &&
          ((beamsToShow >= 1 && i === leftLaserIndex) ||
            (beamsToShow >= 2 && i === rightLaserIndex));
        laser.visible = isActive;

        if (isActive) {
          // Alternate directions for left and right
          const isLeft = i === leftLaserIndex;
          const direction = isLeft ? 1 : -1;

          laser.rotation.z = (direction * Math.PI) / 8;
          laser.rotation.y = (direction * Math.PI) / 16;

          const material = (laser as THREE.Mesh)
            .material as THREE.ShaderMaterial;
          if (currentConfig.colorMode === 'single') {
            material.uniforms.color.value.set(currentConfig.singleColor);
          } else {
            material.uniforms.color.value.setHSL(
              (elapsedTime * 0.2) % 1,
              1,
              0.5,
            );
          }
        }
      });
    } else if (currentMode === 4) {
      // Hybrid Sweep Mode: Sweeping line lasers + rotating sheets

      // Sheet lasers - show static lasers within limit
      let sheetCount4 = 0;
      const maxSheets4 = Math.min(2, maxLasers); // Max 2 static sheets, or less if maxLasers is lower

      laserSheetGroup.children.forEach((laserSheet, i) => {
        const isStatic =
          laserSheet.name === 'staticLaser1' ||
          laserSheet.name === 'staticLaser2';

        const shouldShow = isStatic && sheetCount4 < maxSheets4;
        if (shouldShow && isStatic) sheetCount4++;

        laserSheet.visible = shouldShow;

        if (shouldShow) {
          const material = (laserSheet as THREE.Mesh)
            .material as THREE.ShaderMaterial;

          // Continuous rotation
          const time = elapsedTime * 0.4 * timeScale;
          const randomSeed = i * 1.23;
          laserSheet.rotation.z = (Math.sin(time + randomSeed) * Math.PI) / 8;
          laserSheet.rotation.y =
            (Math.cos(time * 0.6 + randomSeed) * Math.PI) / 18;

          // Dynamic spread
          const spreadCycle =
            (Math.sin(elapsedTime * 1.0 * timeScale + i) + 1) / 2;
          const minSpread = 0.8;
          const maxSpread = 3.0;
          material.uniforms.spread.value =
            minSpread + spreadCycle * (maxSpread - minSpread);

          // Set color
          if (currentConfig.colorMode === 'single') {
            material.uniforms.color.value.set(currentConfig.singleColor);
          } else {
            const colorHue = (elapsedTime * 0.08 + i * 0.15) % 1;
            material.uniforms.color.value.setHSL(colorHue, 0.9, 0.5);
          }
        }
      });

      // Line lasers - sweeping pattern, mirrored
      const maxBeams4 = Math.max(0, maxLasers - maxSheets4); // Remaining capacity after sheets
      const beamsToShow4 = Math.min(2, maxBeams4); // Show up to 2 beams if capacity allows
      const sweepSpeed = 2; // Sweeps per second
      const availableBeams4 = Math.min(numLasers, Math.ceil(maxBeams4 / 2)); // Half of available slots
      const sweepIndex =
        availableBeams4 > 0
          ? Math.floor(elapsedTime * sweepSpeed * timeScale) % availableBeams4
          : 0;
      const leftSweepIndex = sweepIndex;
      const rightSweepIndex = numLasers - 1 - sweepIndex;

      laserBeamGroup.children.forEach((laser, i) => {
        const isActive =
          beamsToShow4 > 0 &&
          ((beamsToShow4 >= 1 && i === leftSweepIndex) ||
            (beamsToShow4 >= 2 && i === rightSweepIndex));
        laser.visible = isActive;

        if (isActive) {
          const time = elapsedTime * 1.5 * timeScale;
          const centerIndex = numLasers / 2;
          const distanceFromCenter = Math.abs(i - centerIndex);

          // Create sweeping wave pattern
          const phase = time + distanceFromCenter * 0.3;
          laser.rotation.z = (Math.sin(phase) * Math.PI) / 5;
          laser.rotation.y = (Math.cos(phase * 0.7) * Math.PI) / 10;

          const material = (laser as THREE.Mesh)
            .material as THREE.ShaderMaterial;
          if (currentConfig.colorMode === 'single') {
            material.uniforms.color.value.set(currentConfig.singleColor);
          } else {
            material.uniforms.color.value.setHSL(
              (time * 0.1 + i * 0.08) % 1,
              1,
              0.5,
            );
          }
        }
      });
    }
  };

  return {
    masterLaserGroup,
    laserBeamGroup,
    laserSheetGroup,
    numLasers,
    update,
  };
}
