import * as THREE from 'three';

export function setupControls(camera: THREE.PerspectiveCamera) {
  const keysPressed: { [key: string]: boolean } = {};
  const moveSpeed = 20;
  const lookSpeed = 0.002;
  let isPointerLocked = false;
  camera.rotation.order = 'YXZ';

  document.addEventListener('click', async () => {
    if (!isPointerLocked) {
      try {
        await document.body.requestPointerLock();
      } catch (e) {
        console.warn(
          "Pointer lock request was denied. This is expected if the user presses 'Esc'.",
        );
      }
    }

    const instructions = document.getElementById('instructions');
    if (instructions) {
      instructions.style.display = 'none';
    }
  });

  document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === document.body;
  });

  document.addEventListener('mousemove', (event) => {
    if (!isPointerLocked) return;
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    camera.rotation.y -= movementX * lookSpeed;
    camera.rotation.x -= movementY * lookSpeed;
    camera.rotation.x = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, camera.rotation.x),
    );
  });

  document.addEventListener('keydown', (event) => {
    keysPressed[event.key.toLowerCase()] = true;
  });
  document.addEventListener('keyup', (event) => {
    keysPressed[event.key.toLowerCase()] = false;
  });

  return { keysPressed, moveSpeed, isPointerLocked };
}
