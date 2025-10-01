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

    movingLights.children.forEach((lightGroup, i) => {
      const spotLight = lightGroup.children[0] as THREE.SpotLight;
      const target = lightGroup.children[1];
      const time = elapsedTime * 0.5 * currentConfig.speed;

      target.position.x = Math.sin(time * (i * 0.3 + 1)) * 60;
      target.position.z = Math.cos(time * (i * 0.5 + 1)) * 40 - 20;
      target.position.y = Math.sin(time * (i * 0.4 + 1)) * 10 + 5;

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
