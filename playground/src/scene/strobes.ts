import * as THREE from 'three';
import { StrobeConfig } from '../scene-config';

export function createStrobes(scene: THREE.Scene, config: StrobeConfig) {
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

  // Update function
  const update = (currentConfig: StrobeConfig) => {
    strobes.visible = currentConfig.enabled;
    if (!strobes.visible) return;

    // Random strobe effect
    strobes.children.forEach((strobeUnit) => {
      const lightPart = strobeUnit.getObjectByName(
        'strobeLightPart',
      ) as THREE.Mesh;
      (lightPart.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
    });

    // Use flashRate parameter to control probability (0 = never flash, 1 = always flash)
    const flashProbability = 1 - (currentConfig.flashRate || 0.3);
    if (Math.random() > flashProbability) {
      const strobeIndex = Math.floor(Math.random() * strobes.children.length);
      const activeStrobe = strobes.children[strobeIndex];
      const lightPart = activeStrobe.getObjectByName(
        'strobeLightPart',
      ) as THREE.Mesh;
      (lightPart.material as THREE.MeshStandardMaterial).emissiveIntensity =
        currentConfig.intensity;
    }
  };

  return { strobes, update };
}
