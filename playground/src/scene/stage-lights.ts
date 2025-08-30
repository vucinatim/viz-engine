import * as THREE from 'three';

export function createStageLights(
  scene: THREE.Scene,
  stageGeometry: THREE.BoxGeometry,
  djBooth: THREE.Mesh,
) {
  const stageLights = new THREE.Group();
  const stageOutlineMaterial = new THREE.MeshStandardMaterial({
    color: 0x8888ff,
    emissive: 0x4444ff,
    emissiveIntensity: 4,
  });
  const barGeo = new THREE.BoxGeometry(1, 1, 1); // We'll scale this

  // Front Edge
  const frontBar = new THREE.Mesh(barGeo, stageOutlineMaterial);
  frontBar.scale.set(stageGeometry.parameters.width, 0.2, 0.2);
  frontBar.position.set(
    0,
    1.5 + stageGeometry.parameters.height / 2,
    stageGeometry.parameters.depth / 2,
  );
  stageLights.add(frontBar);

  // Left Edge
  const leftBar = new THREE.Mesh(barGeo, stageOutlineMaterial);
  leftBar.scale.set(stageGeometry.parameters.depth, 0.2, 0.2);
  leftBar.position.set(
    -stageGeometry.parameters.width / 2,
    1.5 + stageGeometry.parameters.height / 2,
    0,
  );
  leftBar.rotation.y = Math.PI / 2;
  stageLights.add(leftBar);

  // Right Edge
  const rightBar = new THREE.Mesh(barGeo, stageOutlineMaterial);
  rightBar.scale.set(stageGeometry.parameters.depth, 0.2, 0.2);
  rightBar.position.set(
    stageGeometry.parameters.width / 2,
    1.5 + stageGeometry.parameters.height / 2,
    0,
  );
  rightBar.rotation.y = Math.PI / 2;
  stageLights.add(rightBar);

  // DJ Uplights
  const djUplight1 = new THREE.SpotLight(0x7d40ff, 3, 50, Math.PI / 9, 0.5, 1);
  djUplight1.position.set(-15, 4, 8);
  djUplight1.target = djBooth;
  stageLights.add(djUplight1);
  stageLights.add(djUplight1.target);

  const djUplight2 = new THREE.SpotLight(0x7d40ff, 3, 50, Math.PI / 9, 0.5, 1);
  djUplight2.position.set(15, 4, 8);
  djUplight2.target = djBooth;
  stageLights.add(djUplight2);
  stageLights.add(djUplight2.target);

  scene.add(stageLights);

  return { stageLights };
}
