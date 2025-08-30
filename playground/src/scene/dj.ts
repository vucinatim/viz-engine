import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import modelUrl from '../models/female-dj.fbx?url';

export function createDj(scene: THREE.Scene) {
  const loader = new FBXLoader();
  let mixer: THREE.AnimationMixer | null = null;

  loader.load(modelUrl, (object) => {
    object.scale.set(0.032, 0.032, 0.032);
    object.position.set(0, 3.4, -7); // Centered, on the stage floor, behind the booth
    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    if (object.animations.length > 0) {
      mixer = new THREE.AnimationMixer(object);
      const action = mixer.clipAction(object.animations[0]);
      action.play();
    }

    scene.add(object);
  });

  const update = (delta: number) => {
    if (mixer) {
      mixer.update(delta);
    }
  };

  return { update };
}
