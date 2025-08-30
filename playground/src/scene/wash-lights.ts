import * as THREE from 'three';

export function createWashLights(scene: THREE.Scene) {
  // --- NEW: DYNAMIC COLOR WASH LIGHTS ---
  const colorWashLight1 = new THREE.SpotLight(
    0xffffff,
    80,
    300,
    Math.PI / 3.5,
    0.5,
    2,
  );
  colorWashLight1.position.set(-50, 30, 20);
  const target1 = new THREE.Object3D();
  target1.position.set(0, 0, 0);
  colorWashLight1.target = target1;

  const colorWashLight2 = new THREE.SpotLight(
    0xffffff,
    80,
    300,
    Math.PI / 3.5,
    0.5,
    2,
  );
  colorWashLight2.position.set(50, 30, 20);
  const target2 = new THREE.Object3D();
  target2.position.set(0, 0, 0);
  colorWashLight2.target = target2;

  // --- NEW: SOFT STAGE WASH LIGHTS ---
  const stageWashLights = new THREE.Group();
  const rectLight1 = new THREE.RectAreaLight(0x5566ff, 5, 50, 20); // color, intensity, width, height
  rectLight1.position.set(-30, 25, 10);
  rectLight1.lookAt(0, 0, 0);
  stageWashLights.add(rectLight1);

  const rectLight2 = new THREE.RectAreaLight(0x5566ff, 5, 50, 20);
  rectLight2.position.set(30, 25, 10);
  rectLight2.lookAt(0, 0, 0);
  stageWashLights.add(rectLight2);

  scene.add(stageWashLights);

  return { stageWashLights, rectLight1, rectLight2 };
}
