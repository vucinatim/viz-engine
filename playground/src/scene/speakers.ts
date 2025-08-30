import * as THREE from 'three';

export function createSpeakerStacks(
  scene: THREE.Scene,
  panelSize: number,
  panelSpacing: number,
  gridWidth: number,
  speakerBoxGeometry: THREE.BoxGeometry,
) {
  const speakerStacks = new THREE.Group();
  const speakerMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.8,
  });
  const mainWallHalfWidthForSpeakers =
    (gridWidth * (panelSize + panelSpacing) - panelSpacing) / 2;
  const gapForSpeakers = 4;
  const speakerXOffset = mainWallHalfWidthForSpeakers + gapForSpeakers;
  const stackHeight = 7;
  const straightSpeakers = 3;
  const angleIncrement = Math.PI / 45;
  const startY = 27.25 - speakerBoxGeometry.parameters.height / 2;
  const startZ = -6;
  for (let side = -1; side <= 1; side += 2) {
    let lastSpeakerPivotY = startY + speakerBoxGeometry.parameters.height / 2;
    let lastSpeakerPivotZ = startZ - speakerBoxGeometry.parameters.depth / 2;
    let accumulatedAngle = 0;
    for (let i = 0; i < stackHeight; i++) {
      const speakerBox = new THREE.Mesh(speakerBoxGeometry, speakerMaterial);
      if (i > 0 && i >= straightSpeakers) {
        accumulatedAngle += angleIncrement;
      }
      const pivotToCenterY = -speakerBoxGeometry.parameters.height / 2;
      const pivotToCenterZ = speakerBoxGeometry.parameters.depth / 2;
      const rotatedCenterY =
        pivotToCenterY * Math.cos(accumulatedAngle) -
        pivotToCenterZ * Math.sin(accumulatedAngle);
      const rotatedCenterZ =
        pivotToCenterY * Math.sin(accumulatedAngle) +
        pivotToCenterZ * Math.cos(accumulatedAngle);
      const speakerY = lastSpeakerPivotY + rotatedCenterY;
      const speakerZ = lastSpeakerPivotZ + rotatedCenterZ;
      speakerBox.position.set(speakerXOffset * side, speakerY, speakerZ);
      speakerBox.rotation.x = accumulatedAngle;
      speakerStacks.add(speakerBox);
      const centerToPivotY = -speakerBoxGeometry.parameters.height / 2;
      const centerToPivotZ = -speakerBoxGeometry.parameters.depth / 2;
      const rotatedPivotY =
        centerToPivotY * Math.cos(accumulatedAngle) -
        centerToPivotZ * Math.sin(accumulatedAngle);
      const rotatedPivotZ =
        centerToPivotY * Math.sin(accumulatedAngle) +
        centerToPivotZ * Math.cos(accumulatedAngle);
      lastSpeakerPivotY = speakerBox.position.y + rotatedPivotY;
      lastSpeakerPivotZ = speakerBox.position.z + rotatedPivotZ;
    }
  }
  scene.add(speakerStacks);
  return { speakerStacks, speakerXOffset };
}
