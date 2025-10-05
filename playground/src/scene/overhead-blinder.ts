import * as THREE from 'three';

export interface OverheadBlinderConfig {
  enabled: boolean;
  intensity: number;
}

export function createOverheadBlinder(
  scene: THREE.Scene,
  config: OverheadBlinderConfig,
) {
  // Create a large rectangular light from above (invisible light source)
  const rectLight = new THREE.RectAreaLight(0xffffff, config.intensity, 80, 40);
  rectLight.position.set(0, 60, -5);
  rectLight.lookAt(0, 0, -5);
  scene.add(rectLight);

  const update = (time: number, currentConfig: OverheadBlinderConfig) => {
    rectLight.visible = currentConfig.enabled;

    if (!currentConfig.enabled) return;

    // Directly use intensity parameter (0 = off, max value = full brightness)
    rectLight.intensity = currentConfig.intensity;
  };

  return { rectLight, update };
}
