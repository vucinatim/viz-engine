import * as THREE from 'three';

export function createMovingLights(scene: THREE.Scene) {
  const movingLights = new THREE.Group();
  const numMovingLights = 8;
  const trussWidth = 80;
  for (let i = 0; i < numMovingLights; i++) {
    const spotLight = new THREE.SpotLight(
      0xffffff,
      5,
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
  return { movingLights };
}
