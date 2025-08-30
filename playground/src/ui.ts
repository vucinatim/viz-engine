import * as THREE from 'three';

export function setupUI(
  sceneConfig: any,
  hemisphereLight: THREE.HemisphereLight,
  ambientLight: THREE.AmbientLight,
  bloomPass: any,
  rectLight1: THREE.RectAreaLight,
  rectLight2: THREE.RectAreaLight,
) {
  const debugOverlay = document.getElementById('debug-overlay');
  // --- UI CONTROLS ---
  const hemiSlider = document.getElementById('hemi-slider') as HTMLInputElement;
  const hemiValueSpan = document.getElementById('hemi-value');
  const ambientSlider = document.getElementById(
    'ambient-slider',
  ) as HTMLInputElement;
  const ambientValueSpan = document.getElementById('ambient-value');
  const bloomStrengthSlider = document.getElementById(
    'bloom-strength-slider',
  ) as HTMLInputElement;
  const bloomStrengthValueSpan = document.getElementById(
    'bloom-strength-value',
  );
  const bloomRadiusSlider = document.getElementById(
    'bloom-radius-slider',
  ) as HTMLInputElement;
  const bloomRadiusValueSpan = document.getElementById('bloom-radius-value');
  const bloomThresholdSlider = document.getElementById(
    'bloom-threshold-slider',
  ) as HTMLInputElement;
  const bloomThresholdValueSpan = document.getElementById(
    'bloom-threshold-value',
  );
  const movingLightsToggle = document.getElementById(
    'moving-lights-toggle',
  ) as HTMLInputElement;
  const lasersToggle = document.getElementById(
    'lasers-toggle',
  ) as HTMLInputElement;
  const laserModeSelect = document.getElementById(
    'laser-mode-select',
  ) as HTMLSelectElement;
  const stageLightsToggle = document.getElementById(
    'stage-lights-toggle',
  ) as HTMLInputElement;
  const stageWashToggle = document.getElementById(
    'stage-wash-toggle',
  ) as HTMLInputElement;
  const stageWashSlider = document.getElementById(
    'stage-wash-slider',
  ) as HTMLInputElement;
  const stageWashValueSpan = document.getElementById('stage-wash-value');
  const strobesToggle = document.getElementById(
    'strobes-toggle',
  ) as HTMLInputElement;
  const shaderWallToggle = document.getElementById(
    'shader-wall-toggle',
  ) as HTMLInputElement;
  const bloomToggle = document.getElementById(
    'bloom-toggle',
  ) as HTMLInputElement;
  const blindersToggle = document.getElementById(
    'blinders-toggle',
  ) as HTMLInputElement;
  const debugToggle = document.getElementById(
    'debug-toggle',
  ) as HTMLInputElement;
  const beamsToggle = document.getElementById(
    'beams-toggle',
  ) as HTMLInputElement;

  if (debugOverlay) {
    debugOverlay.addEventListener('click', (event) => event.stopPropagation());
  }
  const controlsOverlay = document.getElementById('controls-overlay');
  if (controlsOverlay) {
    controlsOverlay.addEventListener('click', (event) =>
      event.stopPropagation(),
    );
  }

  if (hemiSlider) {
    hemiSlider.addEventListener('input', (event) => {
      const intensity =
        parseFloat((event.target as HTMLInputElement).value) / 100.0;
      hemisphereLight.intensity = intensity;
      if (hemiValueSpan) hemiValueSpan.textContent = intensity.toFixed(2);
    });
  }

  if (ambientSlider) {
    ambientSlider.addEventListener('input', (event) => {
      const intensity =
        parseFloat((event.target as HTMLInputElement).value) / 100.0;
      ambientLight.intensity = intensity;
      if (ambientValueSpan) ambientValueSpan.textContent = intensity.toFixed(2);
    });
  }

  if (bloomStrengthSlider) {
    bloomStrengthSlider.addEventListener('input', (event) => {
      const value =
        parseFloat((event.target as HTMLInputElement).value) / 100.0;
      bloomPass.strength = value;
      if (bloomStrengthValueSpan)
        bloomStrengthValueSpan.textContent = value.toFixed(2);
    });
  }

  if (bloomRadiusSlider) {
    bloomRadiusSlider.addEventListener('input', (event) => {
      const value =
        parseFloat((event.target as HTMLInputElement).value) / 100.0;
      bloomPass.radius = value;
      if (bloomRadiusValueSpan)
        bloomRadiusValueSpan.textContent = value.toFixed(2);
    });
  }

  if (bloomThresholdSlider) {
    bloomThresholdSlider.addEventListener('input', (event) => {
      const value =
        parseFloat((event.target as HTMLInputElement).value) / 100.0;
      bloomPass.threshold = value;
      if (bloomThresholdValueSpan)
        bloomThresholdValueSpan.textContent = value.toFixed(2);
    });
  }

  if (movingLightsToggle) {
    movingLightsToggle.addEventListener('change', (event) => {
      sceneConfig.movingLights = (event.target as HTMLInputElement).checked;
    });
  }

  if (lasersToggle) {
    lasersToggle.addEventListener('change', (event) => {
      sceneConfig.lasers = (event.target as HTMLInputElement).checked;
    });
  }

  if (laserModeSelect) {
    laserModeSelect.addEventListener('change', (event) => {
      const value = (event.target as HTMLSelectElement).value;
      if (value === 'auto') {
        sceneConfig.laserMode = 'auto';
      } else {
        sceneConfig.laserMode = parseInt(value, 10) as 0 | 1 | 2;
      }
    });
  }

  if (stageLightsToggle) {
    stageLightsToggle.addEventListener('change', (event) => {
      sceneConfig.stageLights = (event.target as HTMLInputElement).checked;
    });
  }

  if (stageWashToggle) {
    stageWashToggle.addEventListener('change', (event) => {
      sceneConfig.stageWash = (event.target as HTMLInputElement).checked;
    });
  }

  if (strobesToggle) {
    strobesToggle.addEventListener('change', (event) => {
      sceneConfig.strobes = (event.target as HTMLInputElement).checked;
    });
  }

  if (shaderWallToggle) {
    shaderWallToggle.addEventListener('change', (event) => {
      sceneConfig.shaderWall = (event.target as HTMLInputElement).checked;
    });
  }

  if (bloomToggle) {
    bloomToggle.addEventListener('change', (event) => {
      sceneConfig.bloom = (event.target as HTMLInputElement).checked;
    });
  }

  if (blindersToggle) {
    blindersToggle.addEventListener('change', (event) => {
      sceneConfig.blinders = (event.target as HTMLInputElement).checked;
    });
  }

  if (beamsToggle) {
    beamsToggle.addEventListener('change', (event) => {
      sceneConfig.beams = (event.target as HTMLInputElement).checked;
    });
  }

  if (debugToggle) {
    debugToggle.addEventListener('change', (event) => {
      sceneConfig.debug = (event.target as HTMLInputElement).checked;
    });
  }

  if (stageWashSlider) {
    stageWashSlider.addEventListener('input', (event) => {
      const intensity =
        parseFloat((event.target as HTMLInputElement).value) / 100.0;
      rectLight1.intensity = intensity;
      rectLight2.intensity = intensity;
      if (stageWashValueSpan)
        stageWashValueSpan.textContent = intensity.toFixed(2);
    });
  }

  return { debugOverlay };
}
