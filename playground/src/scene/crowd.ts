import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import femaleModelUrl from '../models/female-dancer.fbx?url';
import maleModelUrl from '../models/male-dancer.fbx?url';

const CROWD_COUNT = 50;
const CROWD_AREA_WIDTH = 50;
const CROWD_AREA_DEPTH = 40;
const CROWD_AREA_START_Z = 60;

export function createCrowd(scene: THREE.Scene, debug: boolean) {
  const loader = new FBXLoader();
  const mixers: THREE.AnimationMixer[] = [];

  // Add a debug helper for the spawn area
  const areaGeometry = new THREE.BoxGeometry(
    CROWD_AREA_WIDTH,
    10,
    CROWD_AREA_DEPTH,
  );
  const areaMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    wireframe: true,
  });
  const areaHelper = new THREE.Mesh(areaGeometry, areaMaterial);
  areaHelper.position.set(0, 5, CROWD_AREA_START_Z - CROWD_AREA_DEPTH / 2);
  if (debug) {
    scene.add(areaHelper);
  }

  const loadModel = (url: string): Promise<THREE.Group> => {
    return new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });
  };

  Promise.all([loadModel(femaleModelUrl), loadModel(maleModelUrl)]).then(
    ([femaleModel, maleModel]) => {
      const models = [femaleModel, maleModel];

      for (let i = 0; i < CROWD_COUNT; i++) {
        const sourceModel = models[Math.floor(Math.random() * models.length)];
        const newModel = SkeletonUtils.clone(sourceModel); // Use SkeletonUtils for deep cloning

        newModel.scale.set(0.032, 0.032, 0.032);
        const x = Math.random() * CROWD_AREA_WIDTH - CROWD_AREA_WIDTH / 2;
        const z = CROWD_AREA_START_Z - Math.random() * CROWD_AREA_DEPTH;
        newModel.position.set(x, 0, z);

        // Make the model generally face the DJ at (0,0,0) with some randomness
        const baseRotation = Math.atan2(-x, -z);
        const randomOffset = (Math.random() - 0.5) * (Math.PI / 2); // Random offset of +/- 45 degrees
        newModel.rotation.y = baseRotation + randomOffset;

        newModel.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            const material = (child as THREE.Mesh)
              .material as THREE.MeshStandardMaterial;
            const newMaterial = material.clone();
            newMaterial.color.set(0x333333);
            (child as THREE.Mesh).material = newMaterial;
          }
        });

        if (sourceModel.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(newModel);
          const action = mixer.clipAction(sourceModel.animations[0]);
          action.time = Math.random() * action.getClip().duration; // Randomize start time
          action.play();
          mixers.push(mixer);
        }

        scene.add(newModel);
      }
    },
  );

  const update = (delta: number) => {
    for (const mixer of mixers) {
      mixer.update(delta);
    }
  };

  return { update };
}
