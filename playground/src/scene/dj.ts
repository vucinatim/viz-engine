import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import modelUrl from '../models/female-dj.fbx?url';
import { modelCache } from '../utils/model-cache';

export function createDj(scene: THREE.Scene) {
  let mixer: THREE.AnimationMixer | null = null;
  let djObject: THREE.Group | null = null;

  // Load model from cache (or fetch if not cached)
  modelCache.load(modelUrl).then((cachedModel) => {
    // Clone the cached model using SkeletonUtils (preserves skeleton structure)
    const object = SkeletonUtils.clone(cachedModel) as THREE.Group;
    object.scale.set(0.032, 0.032, 0.032);
    object.position.set(0, 3.4, -7); // Centered, on the stage floor, behind the booth
    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Animations are on the cached model, not the clone
    if (cachedModel.animations.length > 0) {
      mixer = new THREE.AnimationMixer(object);
      const action = mixer.clipAction(cachedModel.animations[0]);
      action.play();
    }

    djObject = object;
    scene.add(object);
  });

  const update = (delta: number) => {
    if (mixer) {
      mixer.update(delta);
    }
  };

  const remove = () => {
    if (djObject) {
      scene.remove(djObject);
      djObject = null;
    }
    mixer = null;
  };

  return { update, remove, getObject: () => djObject };
}
