import * as THREE from 'three';

export function createDebugHelpers(scene: THREE.Scene) {
  const helpersGroup = new THREE.Group();
  helpersGroup.name = 'DebugHelpers';
  helpersGroup.visible = false; // Initially hidden
  scene.add(helpersGroup);

  scene.traverse((object) => {
    if (object instanceof THREE.PointLight) {
      const helper = new THREE.PointLightHelper(object, 0.5);
      helpersGroup.add(helper);
    }
    // Add other helpers as needed, e.g., SpotLightHelper, CameraHelper
  });

  return { helpersGroup };
}
