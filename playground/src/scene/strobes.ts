import * as THREE from 'three';

export function createStrobes(scene: THREE.Scene) {
  const strobes = new THREE.Group();
  const numStrobes = 10;
  const strobeSpacing = 10;

  for (let i = 0; i < numStrobes; i++) {
    const strobeUnit = new THREE.Group();

    const strobeBodyMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.4,
    });
    // --- CHANGE: Made strobes smaller ---
    const strobeBodyGeo = new THREE.BoxGeometry(2, 1, 1.5);
    const strobeBody = new THREE.Mesh(strobeBodyGeo, strobeBodyMat);

    const strobeLightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0,
    });
    // --- CHANGE: Made light part smaller ---
    const strobeLightGeo = new THREE.BoxGeometry(1.7, 0.8, 0.3);
    const strobeLightPart = new THREE.Mesh(strobeLightGeo, strobeLightMat);
    // --- CHANGE: Adjusted position for new smaller size ---
    strobeLightPart.position.z = 0.75;
    strobeLightPart.name = 'strobeLightPart';

    strobeUnit.add(strobeBody);
    strobeUnit.add(strobeLightPart);

    const xPos = (i - (numStrobes - 1) / 2) * (strobeSpacing * 1.1);
    // --- CHANGE: Moved strobes to the middle of the stage, in front of the DJ ---
    // Position on top of stage (stage top is at y=3, new strobe is 1 high).
    strobeUnit.position.set(xPos, 3.5, 0);
    strobeUnit.rotation.x = -Math.PI / 16;

    strobes.add(strobeUnit);
  }
  scene.add(strobes);
  return { strobes };
}
