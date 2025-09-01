import * as THREE from 'three';

export function createStage(scene: THREE.Scene) {
  // --- STAGE & ENVIRONMENT ---
  const groundGeometry = new THREE.PlaneGeometry(400, 400);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.9,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const stageGeometry = new THREE.BoxGeometry(125, 3, 25);
  const stageMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.2,
    roughness: 0.8,
  });
  const stage = new THREE.Mesh(stageGeometry, stageMaterial);
  stage.position.y = 1.5;
  scene.add(stage);

  const djBoothGeometry = new THREE.BoxGeometry(8, 3, 6);
  const djBoothMaterial = new THREE.MeshStandardMaterial({
    color: 0x2b2b2b,
    roughness: 0.5,
  });
  const djBooth = new THREE.Mesh(djBoothGeometry, djBoothMaterial);
  djBooth.position.y = 3 + 1.5;
  djBooth.position.z = -2;
  scene.add(djBooth);

  return { ground, stage, djBooth, stageGeometry };
}
