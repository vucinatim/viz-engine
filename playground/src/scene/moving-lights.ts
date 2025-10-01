import * as THREE from 'three';
import { MovingLightConfig } from '../scene-config';

export function createMovingLights(
  scene: THREE.Scene,
  config: MovingLightConfig,
) {
  const movingLights = new THREE.Group();
  const numMovingLights = 8;
  const trussWidth = 80;
  for (let i = 0; i < numMovingLights; i++) {
    const spotLight = new THREE.SpotLight(
      new THREE.Color(config.singleColor),
      config.intensity,
      150,
      Math.PI / 12,
      0.3,
      0,
    );
    spotLight.position.set(
      (i / (numMovingLights - 1) - 0.5) * trussWidth,
      35,
      -15,
    );

    // The target object for the spotlight to look at
    const target = new THREE.Object3D();
    target.position.set(0, 0, 0);
    spotLight.target = target;

    const lightGroup = new THREE.Group();
    lightGroup.add(spotLight);
    lightGroup.add(target);
    movingLights.add(lightGroup);
  }
  scene.add(movingLights);

  // Update function to handle dynamic config changes
  const update = (elapsedTime: number, currentConfig: MovingLightConfig) => {
    movingLights.visible = currentConfig.enabled;
    if (!movingLights.visible) return;

    // Determine current mode
    let currentMode =
      currentConfig.mode === 'auto'
        ? Math.floor(elapsedTime / 8.0) % 5
        : currentConfig.mode;

    movingLights.children.forEach((lightGroup, i) => {
      const spotLight = lightGroup.children[0] as THREE.SpotLight;
      const target = lightGroup.children[1];
      const time = elapsedTime * 0.5 * currentConfig.speed;

      // Different movement patterns based on mode
      if (currentMode === 0) {
        // Mode 0: Sweeping - all lights sweep together left-right
        const sweepX = Math.sin(time * 0.5) * 60;
        const sweepZ = -20 + i * 2;
        target.position.x = sweepX;
        target.position.z = sweepZ;
        target.position.y = 5;
      } else if (currentMode === 1) {
        // Mode 1: Circular - lights move in circular pattern
        const angle = time * 0.8 + i * (Math.PI / 4);
        const radius = 40;
        target.position.x = Math.cos(angle) * radius;
        target.position.z = Math.sin(angle) * radius - 20;
        target.position.y = 5 + Math.sin(time * 0.5 + i) * 5;
      } else if (currentMode === 2) {
        // Mode 2: Wave - create a wave pattern across the lights
        const wavePhase = time * 1.2 + i * 0.5;
        target.position.x = Math.sin(wavePhase) * 50;
        target.position.z = Math.cos(wavePhase * 0.7) * 30 - 20;
        target.position.y = Math.sin(wavePhase) * 8 + 10;
      } else if (currentMode === 3) {
        // Mode 3: Center Focus - all lights converge to center, then spread out
        const focusCycle = (Math.sin(time * 0.6) + 1) / 2;
        const spread = 60 * focusCycle;
        target.position.x = Math.sin((i * Math.PI) / 4) * spread;
        target.position.z = Math.cos((i * Math.PI) / 4) * spread * 0.5 - 20;
        target.position.y = 5 + focusCycle * 10;
      } else if (currentMode === 4) {
        // Mode 4: Random Chase - individual lights move independently
        const phase1 = time * (0.8 + i * 0.1);
        const phase2 = time * (0.6 + i * 0.15);
        target.position.x = Math.sin(phase1) * 55 + Math.cos(phase2) * 10;
        target.position.z = Math.cos(phase1 * 0.7) * 35 - 20;
        target.position.y = Math.sin(phase2 * 1.3) * 12 + 8;
      }

      // Update intensity
      spotLight.intensity = currentConfig.intensity;

      // Update color based on mode
      if (currentConfig.colorMode === 'single') {
        spotLight.color.set(currentConfig.singleColor);
      } else {
        spotLight.color.setHSL((time * 0.1 + i * 0.1) % 1, 1, 0.5);
      }
    });
  };

  return { movingLights, update };
}
