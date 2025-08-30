import * as THREE from 'three';

export function createBlinders(scene: THREE.Scene) {
  const blindersGroup = new THREE.Group();
  blindersGroup.name = 'Blinders';

  const blinderIntensity = 15000; // Increased intensity for spotlights
  const blinderDistance = 600;
  const blinderAngle = Math.PI / 4; // 45 degree cone
  const blinderPenumbra = 0.3; // Soft edge
  const blinderDecay = 2;

  // --- Blinder 1 (Left) ---
  const blinderLeft = new THREE.SpotLight(
    0xfff0dd, // Warm white
    0, // Initially off
    blinderDistance,
    blinderAngle,
    blinderPenumbra,
    blinderDecay,
  );
  blinderLeft.position.set(-45, 25, 20);

  const targetLeft = new THREE.Object3D();
  targetLeft.position.set(-30, 0, 12); // Aim towards the front-left of the stage
  scene.add(targetLeft);
  blinderLeft.target = targetLeft;

  blindersGroup.add(blinderLeft);
  blindersGroup.add(targetLeft); // Add target to group for organization

  // --- Blinder 2 (Right) ---
  const blinderRight = new THREE.SpotLight(
    0xfff0dd, // Warm white
    0, // Initially off
    blinderDistance,
    blinderAngle,
    blinderPenumbra,
    blinderDecay,
  );
  blinderRight.position.set(45, 25, 20);

  const targetRight = new THREE.Object3D();
  targetRight.position.set(30, 0, 12); // Aim towards the front-right of the stage
  scene.add(targetRight);
  blinderRight.target = targetRight;

  blindersGroup.add(blinderRight);
  blindersGroup.add(targetRight); // Add target to group for organization

  scene.add(blindersGroup);

  // Return the lights themselves, not the group, for individual control in main.ts
  return { blinders: [blinderLeft, blinderRight], blinderIntensity };
}
