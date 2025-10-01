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

  // --- Material for the standard BEAM lasers ---
  const laserBeamMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(config.singleColor),
    blending: THREE.AdditiveBlending,
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
    const laser = new THREE.Mesh(
      laserBeamGeometry,
      (laserBeamMaterial as THREE.MeshBasicMaterial).clone(),
    );
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
        ? Math.floor(elapsedTime / 8.0) % 3
        : currentConfig.mode;

    laserBeamGroup.visible = currentMode === 0 || currentMode === 1;
    laserSheetGroup.visible = currentMode === 2;

    const timeScale = currentConfig.rotationSpeed;

    if (currentMode === 0) {
      // Wave mode
      laserBeamGroup.children.forEach((laser, i) => {
        const time = elapsedTime * 2 * timeScale;
        laser.rotation.z = (Math.sin(time + i * 0.8) * Math.PI) / 6;
        laser.rotation.y =
          (Math.cos(elapsedTime * 0.2 * timeScale) * Math.PI) / 12;

        const material = (laser as THREE.Mesh)
          .material as THREE.MeshBasicMaterial;
        if (currentConfig.colorMode === 'single') {
          material.color.set(currentConfig.singleColor);
        } else {
          material.color.setHSL((elapsedTime * 0.1 + i * 0.05) % 1, 1, 0.5);
        }
      });
    } else if (currentMode === 1) {
      // Wobble mode
      laserBeamGroup.children.forEach((laser, i) => {
        const time = elapsedTime * 40 * timeScale;
        laser.rotation.y = (Math.sin(time + i * 0.2) * Math.PI) / 4;
        laser.rotation.z = Math.PI / 16;

        const material = (laser as THREE.Mesh)
          .material as THREE.MeshBasicMaterial;
        if (currentConfig.colorMode === 'single') {
          material.color.set(currentConfig.singleColor);
        } else {
          material.color.setHSL(
            (Math.floor(elapsedTime * 2) * 0.3) % 1,
            1,
            0.5,
          );
        }
      });
    } else {
      // Sheet mode
      const activeSheetIndex1 = Math.floor(elapsedTime * 2) % numLasers;
      const activeSheetIndex2 =
        numLasers - 1 - (Math.floor(elapsedTime * 2) % numLasers);

      laserSheetGroup.children.forEach((laserSheet, i) => {
        const isMovingLaser =
          laserSheet.name !== 'staticLaser1' &&
          laserSheet.name !== 'staticLaser2';
        const isActiveMoving =
          i === activeSheetIndex1 || i === activeSheetIndex2;

        let isActive = false;
        if (isMovingLaser) {
          isActive = isActiveMoving;
        } else {
          isActive = true; // Static lasers are always "active"
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
