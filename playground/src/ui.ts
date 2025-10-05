import * as THREE from 'three';
import { SceneConfig } from './scene-config';

export function setupUI(
  sceneConfig: SceneConfig,
  hemisphereLight: THREE.HemisphereLight,
  ambientLight: THREE.AmbientLight,
  bloomPass: any,
) {
  const debugOverlay = document.getElementById('debug-overlay');

  // Stop click propagation on overlays
  if (debugOverlay) {
    debugOverlay.addEventListener('click', (event) => event.stopPropagation());
  }
  const controlsOverlay = document.getElementById('controls-overlay');
  if (controlsOverlay) {
    controlsOverlay.addEventListener('click', (event) =>
      event.stopPropagation(),
    );
  }

  // Hemisphere Light
  const hemiSlider = document.getElementById('hemi-slider') as HTMLInputElement;
  const hemiValueSpan = document.getElementById('hemi-value');
  if (hemiSlider) {
    hemiSlider.addEventListener('input', (event) => {
      const intensity =
        parseFloat((event.target as HTMLInputElement).value) / 100.0;
      sceneConfig.hemisphereIntensity = intensity;
      if (hemiValueSpan) hemiValueSpan.textContent = intensity.toFixed(2);
    });
  }

  // Ambient Light
  const ambientSlider = document.getElementById(
    'ambient-slider',
  ) as HTMLInputElement;
  const ambientValueSpan = document.getElementById('ambient-value');
  if (ambientSlider) {
    ambientSlider.addEventListener('input', (event) => {
      const intensity =
        parseFloat((event.target as HTMLInputElement).value) / 100.0;
      sceneConfig.ambientIntensity = intensity;
      if (ambientValueSpan) ambientValueSpan.textContent = intensity.toFixed(2);
    });
  }

  // Bloom Controls
  const bloomStrengthSlider = document.getElementById(
    'bloom-strength-slider',
  ) as HTMLInputElement;
  const bloomStrengthValueSpan = document.getElementById(
    'bloom-strength-value',
  );
  if (bloomStrengthSlider) {
    bloomStrengthSlider.addEventListener('input', (event) => {
      const value =
        parseFloat((event.target as HTMLInputElement).value) / 100.0;
      sceneConfig.postProcessing.bloomStrength = value;
      if (bloomStrengthValueSpan)
        bloomStrengthValueSpan.textContent = value.toFixed(2);
    });
  }

  const bloomRadiusSlider = document.getElementById(
    'bloom-radius-slider',
  ) as HTMLInputElement;
  const bloomRadiusValueSpan = document.getElementById('bloom-radius-value');
  if (bloomRadiusSlider) {
    bloomRadiusSlider.addEventListener('input', (event) => {
      const value =
        parseFloat((event.target as HTMLInputElement).value) / 100.0;
      bloomPass.radius = value;
      sceneConfig.postProcessing.bloomRadius = value;
      if (bloomRadiusValueSpan)
        bloomRadiusValueSpan.textContent = value.toFixed(2);
    });
  }

  const bloomThresholdSlider = document.getElementById(
    'bloom-threshold-slider',
  ) as HTMLInputElement;
  const bloomThresholdValueSpan = document.getElementById(
    'bloom-threshold-value',
  );
  if (bloomThresholdSlider) {
    bloomThresholdSlider.addEventListener('input', (event) => {
      const value =
        parseFloat((event.target as HTMLInputElement).value) / 100.0;
      bloomPass.threshold = value;
      sceneConfig.postProcessing.bloomThreshold = value;
      if (bloomThresholdValueSpan)
        bloomThresholdValueSpan.textContent = value.toFixed(2);
    });
  }

  const bloomToggle = document.getElementById(
    'bloom-toggle',
  ) as HTMLInputElement;
  if (bloomToggle) {
    bloomToggle.addEventListener('change', (event) => {
      sceneConfig.postProcessing.bloom = (
        event.target as HTMLInputElement
      ).checked;
    });
  }

  // === LASERS ===
  const lasersToggle = document.getElementById(
    'lasers-toggle',
  ) as HTMLInputElement;
  if (lasersToggle) {
    lasersToggle.addEventListener('change', (event) => {
      sceneConfig.lasers.enabled = (event.target as HTMLInputElement).checked;
    });
  }

  const laserModeSelect = document.getElementById(
    'laser-mode-select',
  ) as HTMLSelectElement;
  if (laserModeSelect) {
    laserModeSelect.addEventListener('change', (event) => {
      const value = (event.target as HTMLSelectElement).value;
      if (value === 'auto') {
        sceneConfig.lasers.mode = 'auto';
      } else {
        sceneConfig.lasers.mode = parseInt(value, 10) as 0 | 1 | 2;
      }
    });
  }

  const laserColorModeSelect = document.getElementById(
    'laser-color-mode-select',
  ) as HTMLSelectElement;
  if (laserColorModeSelect) {
    laserColorModeSelect.addEventListener('change', (event) => {
      sceneConfig.lasers.colorMode = (event.target as HTMLSelectElement)
        .value as 'single' | 'multi';
    });
  }

  const laserColorInput = document.getElementById(
    'laser-color',
  ) as HTMLInputElement;
  if (laserColorInput) {
    laserColorInput.addEventListener('input', (event) => {
      sceneConfig.lasers.singleColor = (event.target as HTMLInputElement).value;
    });
  }

  const laserSpeedSlider = document.getElementById(
    'laser-speed-slider',
  ) as HTMLInputElement;
  const laserSpeedValueSpan = document.getElementById('laser-speed-value');
  if (laserSpeedSlider) {
    laserSpeedSlider.addEventListener('input', (event) => {
      const value =
        parseFloat((event.target as HTMLInputElement).value) / 100.0;
      sceneConfig.lasers.rotationSpeed = value;
      if (laserSpeedValueSpan)
        laserSpeedValueSpan.textContent = value.toFixed(2);
    });
  }

  // === MOVING LIGHTS ===
  const movingLightsToggle = document.getElementById(
    'moving-lights-toggle',
  ) as HTMLInputElement;
  if (movingLightsToggle) {
    movingLightsToggle.addEventListener('change', (event) => {
      sceneConfig.movingLights.enabled = (
        event.target as HTMLInputElement
      ).checked;
    });
  }

  const movingLightColorModeSelect = document.getElementById(
    'moving-light-color-mode-select',
  ) as HTMLSelectElement;
  if (movingLightColorModeSelect) {
    movingLightColorModeSelect.addEventListener('change', (event) => {
      sceneConfig.movingLights.colorMode = (event.target as HTMLSelectElement)
        .value as 'single' | 'multi';
    });
  }

  const movingLightColorInput = document.getElementById(
    'moving-light-color',
  ) as HTMLInputElement;
  if (movingLightColorInput) {
    movingLightColorInput.addEventListener('input', (event) => {
      sceneConfig.movingLights.singleColor = (
        event.target as HTMLInputElement
      ).value;
    });
  }

  const movingLightIntensitySlider = document.getElementById(
    'moving-light-intensity-slider',
  ) as HTMLInputElement;
  const movingLightIntensityValueSpan = document.getElementById(
    'moving-light-intensity-value',
  );
  if (movingLightIntensitySlider) {
    movingLightIntensitySlider.addEventListener('input', (event) => {
      const value =
        parseFloat((event.target as HTMLInputElement).value) / 100.0;
      sceneConfig.movingLights.intensity = value;
      if (movingLightIntensityValueSpan)
        movingLightIntensityValueSpan.textContent = value.toFixed(2);
    });
  }

  const movingLightSpeedSlider = document.getElementById(
    'moving-light-speed-slider',
  ) as HTMLInputElement;
  const movingLightSpeedValueSpan = document.getElementById(
    'moving-light-speed-value',
  );
  if (movingLightSpeedSlider) {
    movingLightSpeedSlider.addEventListener('input', (event) => {
      const value =
        parseFloat((event.target as HTMLInputElement).value) / 100.0;
      sceneConfig.movingLights.speed = value;
      if (movingLightSpeedValueSpan)
        movingLightSpeedValueSpan.textContent = value.toFixed(2);
    });
  }

  // === BEAMS ===
  const beamsToggle = document.getElementById(
    'beams-toggle',
  ) as HTMLInputElement;
  if (beamsToggle) {
    beamsToggle.addEventListener('change', (event) => {
      sceneConfig.beams.enabled = (event.target as HTMLInputElement).checked;
    });
  }

  const beamModeSelect = document.getElementById(
    'beam-mode-select',
  ) as HTMLSelectElement;
  if (beamModeSelect) {
    beamModeSelect.addEventListener('change', (event) => {
      const value = (event.target as HTMLSelectElement).value;
      if (value === 'auto') {
        sceneConfig.beams.mode = 'auto';
      } else {
        sceneConfig.beams.mode = parseInt(value, 10) as
          | 0
          | 1
          | 2
          | 3
          | 4
          | 5
          | 6;
      }
    });
  }

  const beamColorModeSelect = document.getElementById(
    'beam-color-mode-select',
  ) as HTMLSelectElement;
  if (beamColorModeSelect) {
    beamColorModeSelect.addEventListener('change', (event) => {
      sceneConfig.beams.colorMode = (event.target as HTMLSelectElement)
        .value as 'single' | 'multi';
    });
  }

  const beamColorInput = document.getElementById(
    'beam-color',
  ) as HTMLInputElement;
  if (beamColorInput) {
    beamColorInput.addEventListener('input', (event) => {
      sceneConfig.beams.singleColor = (event.target as HTMLInputElement).value;
    });
  }

  const beamIntensitySlider = document.getElementById(
    'beam-intensity-slider',
  ) as HTMLInputElement;
  const beamIntensityValueSpan = document.getElementById(
    'beam-intensity-value',
  );
  if (beamIntensitySlider) {
    beamIntensitySlider.addEventListener('input', (event) => {
      const value =
        parseFloat((event.target as HTMLInputElement).value) / 100.0;
      sceneConfig.beams.intensity = value;
      if (beamIntensityValueSpan)
        beamIntensityValueSpan.textContent = value.toFixed(2);
    });
  }

  // === STAGE LIGHTS ===
  const stageLightsToggle = document.getElementById(
    'stage-lights-toggle',
  ) as HTMLInputElement;
  if (stageLightsToggle) {
    stageLightsToggle.addEventListener('change', (event) => {
      sceneConfig.stageLights.enabled = (
        event.target as HTMLInputElement
      ).checked;
    });
  }

  const stageLightColorInput = document.getElementById(
    'stage-light-color',
  ) as HTMLInputElement;
  if (stageLightColorInput) {
    stageLightColorInput.addEventListener('input', (event) => {
      sceneConfig.stageLights.color = (event.target as HTMLInputElement).value;
    });
  }

  // === STAGE WASH ===
  const stageWashToggle = document.getElementById(
    'stage-wash-toggle',
  ) as HTMLInputElement;
  if (stageWashToggle) {
    stageWashToggle.addEventListener('change', (event) => {
      sceneConfig.stageWash.enabled = (
        event.target as HTMLInputElement
      ).checked;
    });
  }

  const stageWashSlider = document.getElementById(
    'stage-wash-slider',
  ) as HTMLInputElement;
  const stageWashValueSpan = document.getElementById('stage-wash-value');
  if (stageWashSlider) {
    stageWashSlider.addEventListener('input', (event) => {
      const intensity =
        parseFloat((event.target as HTMLInputElement).value) / 100.0;
      sceneConfig.stageWash.intensity = intensity;
      if (stageWashValueSpan)
        stageWashValueSpan.textContent = intensity.toFixed(2);
    });
  }

  // === STROBES ===
  const strobesToggle = document.getElementById(
    'strobes-toggle',
  ) as HTMLInputElement;
  if (strobesToggle) {
    strobesToggle.addEventListener('change', (event) => {
      sceneConfig.strobes.enabled = (event.target as HTMLInputElement).checked;
    });
  }

  const strobeIntensitySlider = document.getElementById(
    'strobe-intensity-slider',
  ) as HTMLInputElement;
  const strobeIntensityValueSpan = document.getElementById(
    'strobe-intensity-value',
  );
  if (strobeIntensitySlider) {
    strobeIntensitySlider.addEventListener('input', (event) => {
      const value = parseInt((event.target as HTMLInputElement).value, 10);
      sceneConfig.strobes.intensity = value;
      if (strobeIntensityValueSpan)
        strobeIntensityValueSpan.textContent = value.toString();
    });
  }

  // === BLINDERS ===
  const blindersToggle = document.getElementById(
    'blinders-toggle',
  ) as HTMLInputElement;
  if (blindersToggle) {
    blindersToggle.addEventListener('change', (event) => {
      sceneConfig.blinders.enabled = (event.target as HTMLInputElement).checked;
    });
  }

  // === OVERHEAD BLINDER ===
  const overheadBlinderToggle = document.getElementById(
    'overhead-blinder-toggle',
  ) as HTMLInputElement;
  if (overheadBlinderToggle) {
    overheadBlinderToggle.addEventListener('change', (event) => {
      sceneConfig.overheadBlinder.enabled = (
        event.target as HTMLInputElement
      ).checked;
    });
  }

  const overheadBlinderIntensitySlider = document.getElementById(
    'overhead-blinder-intensity-slider',
  ) as HTMLInputElement;
  const overheadBlinderIntensityValueSpan = document.getElementById(
    'overhead-blinder-intensity-value',
  );
  if (overheadBlinderIntensitySlider) {
    overheadBlinderIntensitySlider.addEventListener('input', (event) => {
      const value = parseInt((event.target as HTMLInputElement).value, 10);
      sceneConfig.overheadBlinder.intensity = value;
      if (overheadBlinderIntensityValueSpan)
        overheadBlinderIntensityValueSpan.textContent = value.toString();
    });
  }

  // === CROWD ===
  const crowdCountSlider = document.getElementById(
    'crowd-count-slider',
  ) as HTMLInputElement;
  const crowdCountValueSpan = document.getElementById('crowd-count-value');
  if (crowdCountSlider) {
    crowdCountSlider.addEventListener('input', (event) => {
      const value = parseInt((event.target as HTMLInputElement).value, 10);
      sceneConfig.crowd.count = value;
      if (crowdCountValueSpan)
        crowdCountValueSpan.textContent = value.toString();
    });
  }

  // === SCENE EFFECTS ===
  const shaderWallToggle = document.getElementById(
    'shader-wall-toggle',
  ) as HTMLInputElement;
  if (shaderWallToggle) {
    shaderWallToggle.addEventListener('change', (event) => {
      sceneConfig.shaderWall.enabled = (
        event.target as HTMLInputElement
      ).checked;
    });
  }

  const shaderWallScaleSlider = document.getElementById(
    'shader-wall-scale-slider',
  ) as HTMLInputElement;
  const shaderWallScaleValueSpan = document.getElementById(
    'shader-wall-scale-value',
  );
  if (shaderWallScaleSlider) {
    shaderWallScaleSlider.addEventListener('input', (event) => {
      const value =
        parseFloat((event.target as HTMLInputElement).value) / 100.0;
      sceneConfig.shaderWall.scale = value;
      if (shaderWallScaleValueSpan)
        shaderWallScaleValueSpan.textContent = value.toFixed(2);
    });
  }

  const shaderWallRotationSlider = document.getElementById(
    'shader-wall-rotation-slider',
  ) as HTMLInputElement;
  const shaderWallRotationValueSpan = document.getElementById(
    'shader-wall-rotation-value',
  );
  if (shaderWallRotationSlider) {
    shaderWallRotationSlider.addEventListener('input', (event) => {
      const value =
        parseFloat((event.target as HTMLInputElement).value) / 100.0;
      sceneConfig.shaderWall.rotationSpeed = value;
      if (shaderWallRotationValueSpan)
        shaderWallRotationValueSpan.textContent = value.toFixed(2);
    });
  }

  const shaderWallColorSlider = document.getElementById(
    'shader-wall-color-slider',
  ) as HTMLInputElement;
  const shaderWallColorValueSpan = document.getElementById(
    'shader-wall-color-value',
  );
  if (shaderWallColorSlider) {
    shaderWallColorSlider.addEventListener('input', (event) => {
      const value =
        parseFloat((event.target as HTMLInputElement).value) / 100.0;
      sceneConfig.shaderWall.colorSpeed = value;
      if (shaderWallColorValueSpan)
        shaderWallColorValueSpan.textContent = value.toFixed(2);
    });
  }

  const shaderWallTravelSlider = document.getElementById(
    'shader-wall-travel-slider',
  ) as HTMLInputElement;
  const shaderWallTravelValueSpan = document.getElementById(
    'shader-wall-travel-value',
  );
  if (shaderWallTravelSlider) {
    shaderWallTravelSlider.addEventListener('input', (event) => {
      const value =
        parseFloat((event.target as HTMLInputElement).value) / 100.0;
      sceneConfig.shaderWall.travelSpeed = value;
      if (shaderWallTravelValueSpan)
        shaderWallTravelValueSpan.textContent = value.toFixed(2);
    });
  }

  const shaderWallBrightnessSlider = document.getElementById(
    'shader-wall-brightness-slider',
  ) as HTMLInputElement;
  const shaderWallBrightnessValueSpan = document.getElementById(
    'shader-wall-brightness-value',
  );
  if (shaderWallBrightnessSlider) {
    shaderWallBrightnessSlider.addEventListener('input', (event) => {
      const value =
        parseFloat((event.target as HTMLInputElement).value) / 100.0;
      sceneConfig.shaderWall.brightness = value;
      if (shaderWallBrightnessValueSpan)
        shaderWallBrightnessValueSpan.textContent = value.toFixed(2);
    });
  }

  const cinematicCameraToggle = document.getElementById(
    'cinematic-camera-toggle',
  ) as HTMLInputElement;
  if (cinematicCameraToggle) {
    cinematicCameraToggle.addEventListener('change', (event) => {
      sceneConfig.camera.cinematicMode = (
        event.target as HTMLInputElement
      ).checked;
    });
  }

  const debugToggle = document.getElementById(
    'debug-toggle',
  ) as HTMLInputElement;
  if (debugToggle) {
    debugToggle.addEventListener('change', (event) => {
      sceneConfig.debug = (event.target as HTMLInputElement).checked;
    });
  }

  return { debugOverlay };
}
