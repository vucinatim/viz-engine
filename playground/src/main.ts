import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { setupControls } from './controls';
import { createBeams } from './scene/beams';
import { createBlinders } from './scene/blinders';
import { createCrowd } from './scene/crowd';
import { createDj } from './scene/dj';
import { createDebugHelpers } from './scene/helpers';
import { createLasers } from './scene/lasers';
import { createMovingLights } from './scene/moving-lights';
import { createShaderWall } from './scene/shader-wall';
import { createSpeakerStacks } from './scene/speakers';
import { createStage } from './scene/stage';
import { createStageLights } from './scene/stage-lights';
import { createStrobes } from './scene/strobes';
import { createWashLights } from './scene/wash-lights';
import { setupUI } from './ui';

const sceneConfig = {
  movingLights: true,
  lasers: true,
  laserMode: 'auto' as 'auto' | 0 | 1 | 2,
  stageLights: true,
  stageWash: true,
  strobes: true,
  blinders: true,
  shaderWall: true,
  bloom: true,
  debug: false,
  beams: true,
  beamMode: 'auto' as 'auto' | 0 | 1 | 2 | 3 | 4,
  bloomStrength: 0.2,
  cinematicCamera: false,
};

// --- SCENE SETUP ---
const scene = new THREE.Scene();
const clock = new THREE.Clock();
// REDUCED FOG for better visibility
scene.fog = new THREE.FogExp2(0x000000, 0.008);

// --- LIGHTING ---
const hemisphereLight = new THREE.HemisphereLight(0x606080, 0x202020, 0.5);
scene.add(hemisphereLight);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// --- CAMERA ---
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(0, 8, 40);

const cameraPath = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(0, 65, 45), // 1. Start with a wider, less steep top-down view
    new THREE.Vector3(-80, 40, 100), // 2. Sweep out for a wide panoramic view from the left
    new THREE.Vector3(0, 30, 130), // 3. Go further back for a full panoramic shot
    new THREE.Vector3(80, 40, 100), // 4. Sweep to the right side for another wide view
    new THREE.Vector3(20, 15, 25), // 5. Fly in lower towards the stage
    new THREE.Vector3(0, 18, 60), // 6. Move back above the crowd
    new THREE.Vector3(-20, 20, 80), // 7. Circle around above the crowd
    new THREE.Vector3(0, 65, 45), // 8. Return to the start for a smooth loop
  ],
  true, // Closed loop
);
const cameraLookAtTarget = new THREE.Vector3(0, 5, 0); // A fixed point to look at (the DJ)
const cinematicLookAt = new THREE.Vector3(0, 5, 0); // Temp vector for lerping
const cinematicPosition = new THREE.Vector3(); // Temp vector for lerping

// --- RENDERER ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.useLegacyLights = false;
document.body.appendChild(renderer.domElement);

// --- POST-PROCESSING (BLOOM) ---
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.2,
  0.4,
  0.0,
);
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// --- SCENE CREATION ---
const { djBooth, stageGeometry } = createStage(scene);
const speakerBoxGeometry = new THREE.BoxGeometry(5, 3, 3);
const { shaderWall, panelSize, panelSpacing, gridWidth } = createShaderWall(
  scene,
  speakerBoxGeometry,
);
createSpeakerStacks(
  scene,
  panelSize,
  panelSpacing,
  gridWidth,
  speakerBoxGeometry,
);
const { stageLights } = createStageLights(scene, stageGeometry, djBooth);
const { movingLights } = createMovingLights(scene);
const { masterLaserGroup, laserBeamGroup, laserSheetGroup, numLasers } =
  createLasers(scene);
const { strobes } = createStrobes(scene);
const { stageWashLights, rectLight1, rectLight2 } = createWashLights(scene);
const { blinders, blinderIntensity } = createBlinders(scene);
const blinderGroup = new THREE.Group();
blinders.forEach((blinder) => blinderGroup.add(blinder));
scene.add(blinderGroup);
const { helpersGroup } = createDebugHelpers(scene);
const { beamGroup, update: updateBeams } = createBeams(scene);
const beamTargetRotations = beamGroup.children.map(() => new THREE.Euler());
const { update: updateDj } = createDj(scene);
const { update: updateCrowd } = createCrowd(scene, sceneConfig.debug);

// --- UI & CONTROLS ---
const { debugOverlay } = setupUI(
  sceneConfig,
  hemisphereLight,
  ambientLight,
  bloomPass,
  rectLight1,
  rectLight2,
);
const { keysPressed, moveSpeed, isPointerLocked } = setupControls(camera);

// --- RESPONSIVE HANDLING ---
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  if (shaderWall) {
    (
      shaderWall.material as THREE.ShaderMaterial
    ).uniforms.u_resolution.value.set(width, height);
  }
});

// --- EXTRA LIGHTS ---
const light1 = new THREE.PointLight(0xff00ff, 1.5, 100, 2);
light1.position.set(-15, 10, 5);
scene.add(light1);
const light2 = new THREE.PointLight(0x00ffff, 1.5, 100, 2);
light2.position.set(15, 10, 5);
scene.add(light2);
const djSpotLight = new THREE.SpotLight(
  0xffffff,
  0.8,
  200,
  Math.PI / 8,
  0.5,
  2,
);
djSpotLight.position.set(0, 40, 0);
djSpotLight.target = djBooth;
scene.add(djSpotLight);
scene.add(djSpotLight.target);

// --- ANIMATION LOOP ---
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();
  const actualMoveSpeed = moveSpeed * delta;

  if (sceneConfig.cinematicCamera) {
    const loopDuration = 60; // Duration of one camera loop in seconds
    const progress = (elapsedTime % loopDuration) / loopDuration;

    // Get the new camera position from our path
    cinematicPosition.copy(cameraPath.getPointAt(progress));
    camera.position.lerp(cinematicPosition, 0.05);

    // Always look at the DJ booth
    cinematicLookAt.copy(cameraLookAtTarget);
    camera.lookAt(cinematicLookAt.lerp(camera.position, 0.95));
  } else {
    // Standard manual controls when cinematic mode is off
    if (keysPressed['w']) camera.translateZ(-actualMoveSpeed);
    if (keysPressed['s']) camera.translateZ(actualMoveSpeed);
    if (keysPressed['a']) camera.translateX(-actualMoveSpeed);
    if (keysPressed['d']) camera.translateX(actualMoveSpeed);
    if (keysPressed[' ']) camera.position.y += actualMoveSpeed;
    if (keysPressed['shift']) camera.position.y -= actualMoveSpeed;
  }

  updateDj(delta);
  updateCrowd(delta);

  if (debugOverlay) {
    debugOverlay.innerHTML = `
      --- DEBUG INFO ---<br>
      Pointer Locked: ${isPointerLocked}<br>
      Delta Time: ${delta.toFixed(4)}s<br><br>
      -- Camera Position --<br>
      X: ${camera.position.x.toFixed(2)}<br>
      Y: ${camera.position.y.toFixed(2)}<br>
      Z: ${camera.position.z.toFixed(2)}<br><br>
      -- Camera Rotation --<br>
      X (Pitch): ${camera.rotation.x.toFixed(2)}<br>
      Y (Yaw):   ${camera.rotation.y.toFixed(2)}<br>
    `;
  }

  beamGroup.visible = sceneConfig.beams;
  if (beamGroup.visible) {
    updateBeams(elapsedTime);

    const beamMode =
      sceneConfig.beamMode === 'auto'
        ? Math.floor(elapsedTime / 8) % 5
        : sceneConfig.beamMode;

    const numBeams = beamGroup.children.length;
    const centerIndex = (numBeams - 1) / 2;

    if (beamMode === 0) {
      // Mirrored Wave
      beamGroup.children.forEach((beam, i) => {
        const target = beamTargetRotations[i];
        const material = (beam as THREE.Mesh).material as THREE.ShaderMaterial;
        const hue = (elapsedTime * 0.2 + i * 0.1) % 1;
        material.uniforms.color.value.setHSL(hue, 1, 0.6);

        const side = i <= centerIndex ? 1 : -1;
        const distanceFromCenter = Math.abs(i - centerIndex);

        target.y =
          Math.sin(elapsedTime * 4 + distanceFromCenter * 0.5) * 0.6 * side;
        target.x =
          -Math.PI / 3 +
          Math.cos(elapsedTime * 4 + distanceFromCenter * 0.5) * 0.4;
      });
    } else if (beamMode === 1) {
      // Strobe
      beamGroup.children.forEach((beam, i) => {
        const target = beamTargetRotations[i];
        const material = (beam as THREE.Mesh).material as THREE.ShaderMaterial;
        const hue = (Math.floor(elapsedTime * 2) * 0.3) % 1;
        material.uniforms.color.value.setHSL(hue, 1, 0.6);
        target.y = (Math.sin(elapsedTime * 2 + i) * Math.PI) / 4;
        target.x = -Math.PI / 3 + Math.sin(elapsedTime * 5 + i) * 0.2;
      });
    } else if (beamMode === 2) {
      // Center Cross
      beamGroup.children.forEach((beam, i) => {
        const target = beamTargetRotations[i];
        const material = (beam as THREE.Mesh).material as THREE.ShaderMaterial;
        const hue = (elapsedTime * 0.2) % 1;
        material.uniforms.color.value.setHSL(hue, 1, 0.6);

        const side = i <= centerIndex ? -1 : 1;
        const normalizedFromCenter = (i - centerIndex) / centerIndex;

        const crossFactor = (Math.sin(elapsedTime * 4) + 1) / 2; // 0 to 1 cycle

        target.y =
          side * (Math.PI / 6) * (1 - crossFactor) +
          normalizedFromCenter * (Math.PI / 4) * crossFactor;
        target.x = -Math.PI / 3 + crossFactor * 0.6;
      });
    } else if (beamMode === 3) {
      // Outward Fan
      beamGroup.children.forEach((beam, i) => {
        const target = beamTargetRotations[i];
        const material = (beam as THREE.Mesh).material as THREE.ShaderMaterial;
        const hue = (elapsedTime * 0.3 + i * 0.05) % 1;
        material.uniforms.color.value.setHSL(hue, 1, 0.6);

        const normalizedFromCenter = (i - centerIndex) / centerIndex;
        const fanFactor = (Math.sin(elapsedTime * 3) + 1) / 2; // 0 to 1

        target.y = (fanFactor * normalizedFromCenter * Math.PI) / 3;
        target.x = -Math.PI / 3 + fanFactor * 0.6;
      });
    } else if (beamMode === 4) {
      // Crowd Sweep
      beamGroup.children.forEach((beam, i) => {
        const target = beamTargetRotations[i];
        const material = (beam as THREE.Mesh).material as THREE.ShaderMaterial;
        const hue = (elapsedTime * 0.2) % 1;
        material.uniforms.color.value.setHSL(hue, 1, 0.6);

        const sweepSpeed = 1.5;
        const sweepRange = Math.PI / 3; // 60 degree sweep range
        const baseAngle = -Math.PI / 2.5; // Start high

        target.x =
          baseAngle +
          ((Math.sin(elapsedTime * sweepSpeed) + 1) / 2) * sweepRange;
        const normalizedFromCenter = (i - centerIndex) / centerIndex;
        target.y = normalizedFromCenter * (Math.PI / 8);
      });
    }

    beamGroup.children.forEach((beam, i) => {
      const targetRotation = beamTargetRotations[i];
      beam.rotation.x += (targetRotation.x - beam.rotation.x) * 0.1;
      beam.rotation.y += (targetRotation.y - beam.rotation.y) * 0.1;
      beam.rotation.z += (targetRotation.z - beam.rotation.z) * 0.1;
    });
  }

  stageLights.visible = sceneConfig.stageLights;
  stageWashLights.visible = sceneConfig.stageWash;
  shaderWall.visible = sceneConfig.shaderWall;
  if (sceneConfig.shaderWall) {
    shaderWall.material.uniforms.u_time.value = elapsedTime;
  }

  light1.position.x = Math.sin(elapsedTime * 0.7) * 20;
  light1.position.z = Math.cos(elapsedTime * 0.7) * 10 - 5;
  light2.position.x = Math.sin(elapsedTime * 0.5) * -20;
  light2.position.z = Math.cos(elapsedTime * 0.5) * 10 - 5;

  masterLaserGroup.visible = sceneConfig.lasers;
  if (masterLaserGroup.visible) {
    let currentMode =
      sceneConfig.laserMode === 'auto'
        ? Math.floor(elapsedTime / 8.0) % 3
        : sceneConfig.laserMode;

    laserBeamGroup.visible = currentMode === 0 || currentMode === 1;
    laserSheetGroup.visible = currentMode === 2;

    if (currentMode === 0) {
      laserBeamGroup.children.forEach((laser, i) => {
        const time = elapsedTime * 2;
        laser.rotation.z = (Math.sin(time + i * 0.8) * Math.PI) / 6;
        laser.rotation.y = (Math.cos(elapsedTime * 0.2) * Math.PI) / 12;
        (
          (laser as THREE.Mesh).material as THREE.MeshBasicMaterial
        ).color.setHSL((elapsedTime * 0.1 + i * 0.05) % 1, 1, 0.5);
      });
    } else if (currentMode === 1) {
      laserBeamGroup.children.forEach((laser, i) => {
        const time = elapsedTime * 40;
        laser.rotation.y = (Math.sin(time + i * 0.2) * Math.PI) / 4;
        laser.rotation.z = Math.PI / 16;
        (
          (laser as THREE.Mesh).material as THREE.MeshBasicMaterial
        ).color.setHSL((Math.floor(elapsedTime * 2) * 0.3) % 1, 1, 0.5);
      });
    } else {
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
            // 1. Jerky, fast rotation changes
            const time = Math.floor(elapsedTime * 5); // Use floor to create steps
            const randomSeed = i * 1.23;
            laserSheet.rotation.z = (Math.sin(time + randomSeed) * Math.PI) / 8;
            laserSheet.rotation.y =
              (Math.cos(time * 1.5 + randomSeed) * Math.PI) / 16;
            // 2. Pulsing / Scaling effect (only for moving lasers)
            const scaleFactor =
              0.8 + Math.abs(Math.sin(elapsedTime * 15)) * 0.4; // Fast pulse
            laserSheet.scale.set(scaleFactor, scaleFactor, scaleFactor);
          } else {
            // SMOOTH animation for static lasers
            const time = elapsedTime * 0.5;
            const randomSeed = i * 1.23;
            laserSheet.rotation.z =
              (Math.sin(time + randomSeed) * Math.PI) / 12;
            laserSheet.rotation.y =
              (Math.cos(time * 0.75 + randomSeed) * Math.PI) / 24;
          }

          // 3. Animate Spread with a smoother "breathing" effect
          if (isMovingLaser) {
            const spreadCycle = (Math.sin(elapsedTime * 1.5) + 1) / 2; // Oscillates between 0 and 1
            const minSpread = 0.3;
            const maxSpread = 2.5;
            material.uniforms.spread.value =
              minSpread + spreadCycle * (maxSpread - minSpread);
          } else {
            const spreadCycle = (Math.sin(elapsedTime * 1.0) + 1) / 2; // Slower, different cycle
            const minSpread = 0.5;
            const maxSpread = 3.5; // Larger spread
            material.uniforms.spread.value =
              minSpread + spreadCycle * (maxSpread - minSpread);
          }

          const colorHue = isMovingLaser
            ? (Math.floor(elapsedTime) * 0.1) % 1
            : (Math.floor(elapsedTime) * 0.1 + 0.5) % 1;
          material.uniforms.color.value.setHSL(colorHue, 0.9, 0.5);
        }
      });
    }
  }

  movingLights.visible = sceneConfig.movingLights;
  if (movingLights.visible) {
    movingLights.children.forEach((lightGroup, i) => {
      const spotLight = lightGroup.children[0] as THREE.SpotLight;
      const target = lightGroup.children[1];
      const time = elapsedTime * 0.5;
      target.position.x = Math.sin(time * (i * 0.3 + 1)) * 60;
      target.position.z = Math.cos(time * (i * 0.5 + 1)) * 40 - 20;
      target.position.y = Math.sin(time * (i * 0.4 + 1)) * 10 + 5;
      spotLight.color.setHSL((time * 0.1 + i * 0.1) % 1, 1, 0.5);
    });
  }

  strobes.visible = sceneConfig.strobes;
  if (strobes.visible) {
    strobes.children.forEach((strobeUnit) => {
      const lightPart = strobeUnit.getObjectByName(
        'strobeLightPart',
      ) as THREE.Mesh;
      (lightPart.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
    });
    if (Math.random() > 0.7) {
      const strobeIndex = Math.floor(Math.random() * strobes.children.length);
      const activeStrobe = strobes.children[strobeIndex];
      const lightPart = activeStrobe.getObjectByName(
        'strobeLightPart',
      ) as THREE.Mesh;
      (lightPart.material as THREE.MeshStandardMaterial).emissiveIntensity =
        500;
    }
  }

  blinderGroup.visible = sceneConfig.blinders;
  if (blinderGroup.visible) {
    const [blinderLeft, blinderRight] = blinders;
    if (Math.random() > 0.95) {
      // 5% chance each frame
      const onDuration = 0.05; // very short flash
      blinderLeft.intensity = blinderIntensity;
      blinderRight.intensity = blinderIntensity;
      setTimeout(() => {
        blinderLeft.intensity = 0;
        blinderRight.intensity = 0;
      }, onDuration * 1000);
    }
  }

  helpersGroup.visible = sceneConfig.debug;

  bloomPass.enabled = sceneConfig.bloom;
  // Dynamic Bloom based on distance
  const stageCenter = new THREE.Vector3(0, 1.5, 0);
  const distance = camera.position.distanceTo(stageCenter);

  const minDistance = 40;
  const maxDistance = 150;
  const maxStrength = 0.8;

  const bloomFactor = THREE.MathUtils.smoothstep(
    distance,
    minDistance,
    maxDistance,
  );
  bloomPass.strength =
    sceneConfig.bloomStrength +
    bloomFactor * (maxStrength - sceneConfig.bloomStrength);
  composer.render();
}

animate();
