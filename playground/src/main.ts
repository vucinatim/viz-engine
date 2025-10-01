import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { setupControls } from './controls';
import { createDefaultSceneConfig } from './scene-config';
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

const sceneConfig = createDefaultSceneConfig();

// --- SCENE SETUP ---
const scene = new THREE.Scene();
const clock = new THREE.Clock();
// REDUCED FOG for better visibility
scene.fog = new THREE.FogExp2(0x000000, 0.008);

// --- LIGHTING ---
// HemisphereLight: Sky color (top), Ground color (bottom), Intensity
// Sky = blue-ish, Ground = warm orange-ish for contrast
const hemisphereLight = new THREE.HemisphereLight(0x8888ff, 0xff8844, 1.0);
scene.add(hemisphereLight);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
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
  sceneConfig.postProcessing.bloomStrength, // Use config defaults
  sceneConfig.postProcessing.bloomRadius,
  sceneConfig.postProcessing.bloomThreshold,
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
const { stageLights, update: updateStageLights } = createStageLights(
  scene,
  stageGeometry,
  djBooth,
  sceneConfig.stageLights,
);
const { movingLights, update: updateMovingLights } = createMovingLights(
  scene,
  sceneConfig.movingLights,
);
const {
  masterLaserGroup,
  laserBeamGroup,
  laserSheetGroup,
  numLasers,
  update: updateLasers,
} = createLasers(scene, sceneConfig.lasers);
const { strobes, update: updateStrobes } = createStrobes(
  scene,
  sceneConfig.strobes,
);
const {
  stageWashLights,
  rectLight1,
  rectLight2,
  update: updateWashLights,
} = createWashLights(scene, sceneConfig.stageWash);
const {
  blinders,
  blindersGroup,
  blinderIntensity,
  update: updateBlinders,
} = createBlinders(scene, sceneConfig.blinders);
const { helpersGroup } = createDebugHelpers(scene);
const {
  beamGroup,
  update: updateBeams,
  updateRotations: updateBeamRotations,
  setBeamColor,
} = createBeams(scene, sceneConfig.beams);
const beamTargetRotations = beamGroup.children.map(() => new THREE.Euler());
const { update: updateDj } = createDj(scene);
const { update: updateCrowd } = createCrowd(scene, sceneConfig.debug);

// --- UI & CONTROLS ---
const { debugOverlay } = setupUI(
  sceneConfig,
  hemisphereLight,
  ambientLight,
  bloomPass,
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

  if (sceneConfig.camera.cinematicMode) {
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

  // Update all scene elements with config
  updateBeams(elapsedTime, sceneConfig.beams);
  if (sceneConfig.beams.enabled) {
    const beamMode =
      sceneConfig.beams.mode === 'auto'
        ? Math.floor(elapsedTime / 8) % 5
        : sceneConfig.beams.mode;

    const numBeams = beamGroup.children.length;
    const centerIndex = (numBeams - 1) / 2;

    if (beamMode === 0) {
      // Mirrored Wave
      beamGroup.children.forEach((beam, i) => {
        const target = beamTargetRotations[i];

        if (sceneConfig.beams.colorMode === 'multi') {
          const material = (beam as THREE.Mesh)
            .material as THREE.ShaderMaterial;
          const hue = (elapsedTime * 0.2 + i * 0.1) % 1;
          material.uniforms.color.value.setHSL(hue, 1, 0.6);
        }

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

        if (sceneConfig.beams.colorMode === 'multi') {
          const material = (beam as THREE.Mesh)
            .material as THREE.ShaderMaterial;
          const hue = (Math.floor(elapsedTime * 2) * 0.3) % 1;
          material.uniforms.color.value.setHSL(hue, 1, 0.6);
        }
        target.y = (Math.sin(elapsedTime * 2 + i) * Math.PI) / 4;
        target.x = -Math.PI / 3 + Math.sin(elapsedTime * 5 + i) * 0.2;
      });
    } else if (beamMode === 2) {
      // Center Cross
      beamGroup.children.forEach((beam, i) => {
        const target = beamTargetRotations[i];

        if (sceneConfig.beams.colorMode === 'multi') {
          const material = (beam as THREE.Mesh)
            .material as THREE.ShaderMaterial;
          const hue = (elapsedTime * 0.2) % 1;
          material.uniforms.color.value.setHSL(hue, 1, 0.6);
        }

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

        if (sceneConfig.beams.colorMode === 'multi') {
          const material = (beam as THREE.Mesh)
            .material as THREE.ShaderMaterial;
          const hue = (elapsedTime * 0.3 + i * 0.05) % 1;
          material.uniforms.color.value.setHSL(hue, 1, 0.6);
        }

        const normalizedFromCenter = (i - centerIndex) / centerIndex;
        const fanFactor = (Math.sin(elapsedTime * 3) + 1) / 2; // 0 to 1

        target.y = (fanFactor * normalizedFromCenter * Math.PI) / 3;
        target.x = -Math.PI / 3 + fanFactor * 0.6;
      });
    } else if (beamMode === 4) {
      // Crowd Sweep
      beamGroup.children.forEach((beam, i) => {
        const target = beamTargetRotations[i];

        if (sceneConfig.beams.colorMode === 'multi') {
          const material = (beam as THREE.Mesh)
            .material as THREE.ShaderMaterial;
          const hue = (elapsedTime * 0.2) % 1;
          material.uniforms.color.value.setHSL(hue, 1, 0.6);
        }

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

    updateBeamRotations(beamTargetRotations);
  }

  // Update other scene elements
  updateStageLights(sceneConfig.stageLights);
  updateWashLights(sceneConfig.stageWash);

  shaderWall.visible = sceneConfig.shaderWall;
  if (sceneConfig.shaderWall) {
    shaderWall.material.uniforms.u_time.value = elapsedTime;
  }

  light1.position.x = Math.sin(elapsedTime * 0.7) * 20;
  light1.position.z = Math.cos(elapsedTime * 0.7) * 10 - 5;
  light2.position.x = Math.sin(elapsedTime * 0.5) * -20;
  light2.position.z = Math.cos(elapsedTime * 0.5) * 10 - 5;

  updateLasers(elapsedTime, sceneConfig.lasers);
  updateMovingLights(elapsedTime, sceneConfig.movingLights);
  updateStrobes(sceneConfig.strobes);
  updateBlinders(sceneConfig.blinders);

  helpersGroup.visible = sceneConfig.debug;

  // Update ambient and hemisphere lights
  hemisphereLight.intensity = sceneConfig.hemisphereIntensity;
  ambientLight.intensity = sceneConfig.ambientIntensity;

  bloomPass.enabled = sceneConfig.postProcessing.bloom;
  bloomPass.threshold = sceneConfig.postProcessing.bloomThreshold;
  bloomPass.radius = sceneConfig.postProcessing.bloomRadius;

  // Dynamic Bloom based on distance - scales UP from config base values
  const stageCenter = new THREE.Vector3(0, 1.5, 0);
  const distance = camera.position.distanceTo(stageCenter);

  const minDistance = 40;
  const maxDistance = 150;
  // At max distance, bloom is 2.5x stronger than base config value
  const maxStrengthMultiplier = 2.5;

  const bloomFactor = THREE.MathUtils.smoothstep(
    distance,
    minDistance,
    maxDistance,
  );

  // Base strength from config, scales up based on distance
  bloomPass.strength =
    sceneConfig.postProcessing.bloomStrength *
    (1 + bloomFactor * (maxStrengthMultiplier - 1));

  composer.render();
}

animate();
