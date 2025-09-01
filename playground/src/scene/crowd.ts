import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import femaleModelUrl from '../models/female-dancer.fbx?url';
import maleCheerModelUrl from '../models/male-cheer.fbx?url';
import maleDancerModelUrl from '../models/male-dancer.fbx?url';

const CROWD_COUNT = 500;

export function createCrowd(scene: THREE.Scene, debug: boolean) {
  const loader = new FBXLoader();
  const mixers: THREE.AnimationMixer[] = [];

  const dancers: {
    skeleton: THREE.Skeleton;
    mixer: THREE.AnimationMixer;
    rootBone: THREE.Bone;
  }[] = [];

  let crowdUpdate: (delta: number) => void = () => {};

  const loadModel = (url: string): Promise<THREE.Group> => {
    return new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, (error) => {
        console.error('An error happened while loading the model:', error);
        reject(error);
      });
    });
  };

  Promise.all([
    loadModel(femaleModelUrl),
    loadModel(maleDancerModelUrl),
    loadModel(maleCheerModelUrl),
  ]).then(([femaleModel, maleDancerModel, maleCheerModel]) => {
    const models = [femaleModel, maleDancerModel, maleCheerModel];

    // Find the single SkinnedMesh in the loaded model to use as a template
    // Note: All instances will share this geometry and material.
    const templateMesh = femaleModel.children.find(
      (child) => (child as THREE.SkinnedMesh).isSkinnedMesh,
    ) as THREE.SkinnedMesh;

    if (!templateMesh) return;

    // Use the template's geometry and material for the InstancedMesh.
    const mergedGeometry = templateMesh.geometry;
    const atlasTexture = (templateMesh.material as THREE.MeshStandardMaterial)
      .map;

    const MAX_BONES = templateMesh.skeleton.bones.length;

    mergedGeometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, 1, 0),
      2,
    );
    mergedGeometry.computeBoundingBox();

    const BONES = templateMesh.skeleton.bones.length;
    const TEXTURE_WIDTH = MAX_BONES * 4; // 4 pixels per mat4
    const TEXTURE_HEIGHT = CROWD_COUNT; // One row per dancer

    const boneData = new Float32Array(TEXTURE_WIDTH * TEXTURE_HEIGHT * 4); // 4 components (RGBA)
    const boneTexture = new THREE.DataTexture(
      boneData,
      TEXTURE_WIDTH,
      TEXTURE_HEIGHT,
      THREE.RGBAFormat,
      THREE.FloatType,
    );

    for (let i = 0; i < CROWD_COUNT; i++) {
      // --- CHANGE IS HERE ---
      // Instead of always using one model, randomly pick from the loaded models.
      // This will be the source for the skeleton and animations for this instance.
      const sourceModel = models[Math.floor(Math.random() * models.length)];
      // --- END OF CHANGE ---

      const newModel = SkeletonUtils.clone(sourceModel);

      const skinnedMesh = newModel.children.find(
        (child) => (child as THREE.SkinnedMesh).isSkinnedMesh,
      ) as THREE.SkinnedMesh;
      if (!skinnedMesh) continue;

      const skeleton = skinnedMesh.skeleton;
      const rootBone = skeleton.bones[0];
      const mixer = new THREE.AnimationMixer(newModel);

      if (sourceModel.animations.length > 0) {
        const animations = sourceModel.animations;

        // Pick a random animation clip from the selected source model
        const randomClip =
          animations[Math.floor(Math.random() * animations.length)];

        const action = mixer.clipAction(randomClip);

        action.time = Math.random() * action.getClip().duration; // Randomize start time
        action.play();
      }
      dancers.push({ skeleton, mixer, rootBone });
    }

    const material = new THREE.ShaderMaterial({
      uniforms: {
        boneTexture: { value: boneTexture },
        texture_sampler: {
          value: atlasTexture,
        },
        bindMatrix: { value: templateMesh.bindMatrix },
        bindMatrixInverse: { value: templateMesh.bindMatrixInverse },
      },
      vertexShader: `
          uniform sampler2D boneTexture;
          uniform mat4 bindMatrix;
          uniform mat4 bindMatrixInverse;
          
          attribute vec4 skinIndex;
          attribute vec4 skinWeight;

          varying vec2 vUv;

          mat4 getBoneMatrix(int instance, int boneNdx) {
              float j = float(boneNdx * 4);
              float i = float(instance);
              float textureWidth = float(${TEXTURE_WIDTH});
              float textureHeight = float(${TEXTURE_HEIGHT});

              vec4 v1 = texture2D(boneTexture, vec2(j/textureWidth, i/textureHeight));
              vec4 v2 = texture2D(boneTexture, vec2((j+1.0)/textureWidth, i/textureHeight));
              vec4 v3 = texture2D(boneTexture, vec2((j+2.0)/textureWidth, i/textureHeight));
              vec4 v4 = texture2D(boneTexture, vec2((j+3.0)/textureWidth, i/textureHeight));

              return mat4(v1, v2, v3, v4);
          }

          void main() {
              vUv = uv;
              mat4 boneMatX = getBoneMatrix(gl_InstanceID, int(skinIndex.x));
              mat4 boneMatY = getBoneMatrix(gl_InstanceID, int(skinIndex.y));
              mat4 boneMatZ = getBoneMatrix(gl_InstanceID, int(skinIndex.z));
              mat4 boneMatW = getBoneMatrix(gl_InstanceID, int(skinIndex.w));

              mat4 skinMatrix = boneMatX * skinWeight.x;
              skinMatrix += boneMatY * skinWeight.y;
              skinMatrix += boneMatZ * skinWeight.z;
              skinMatrix += boneMatW * skinWeight.w;

              vec4 bindPosePosition = bindMatrix * vec4(position, 1.0);

              vec4 skinned = skinMatrix * bindPosePosition;

              vec4 finalPosition = bindMatrixInverse * skinned;

              gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * finalPosition;
          }
        `,
      fragmentShader: `
          uniform sampler2D texture_sampler;
          varying vec2 vUv;

          void main() {
            gl_FragColor = texture2D(texture_sampler, vUv);
          }
        `,
    });

    const crowdMesh = new THREE.InstancedMesh(
      mergedGeometry,
      material,
      CROWD_COUNT,
    );

    const dummy = new THREE.Object3D();
    const positions: THREE.Vector3[] = []; // Array to store final valid positions

    // --- CROWD SHAPE PARAMETERS ---
    const stageFrontZ = 14;
    const stageWidth = 50;
    const crowdDepth = 80;
    const crowdSpreadFactor = 1.5;
    const minSeparation = 1.8;
    const maxPlacementTries = 100;

    for (let i = 0; i < CROWD_COUNT; i++) {
      let positionFound = false;
      let tries = 0;
      let candidatePosition = new THREE.Vector3();

      while (!positionFound && tries < maxPlacementTries) {
        tries++;
        const depthBias = Math.random() * Math.random();
        const z = stageFrontZ + depthBias * crowdDepth;
        const maxSpread =
          stageWidth / 2 + depthBias * crowdDepth * crowdSpreadFactor;
        const xBias = (Math.random() + Math.random()) / 2;
        const x = (xBias - 0.5) * 2 * maxSpread;

        candidatePosition.set(x, 0, z);

        let isTooClose = false;
        for (const pos of positions) {
          if (candidatePosition.distanceTo(pos) < minSeparation) {
            isTooClose = true;
            break;
          }
        }

        if (!isTooClose) {
          positionFound = true;
        }
      }
      positions.push(candidatePosition);
    }

    for (let i = 0; i < CROWD_COUNT; i++) {
      dummy.position.copy(positions[i]);

      const baseRotation = Math.atan2(-dummy.position.x, -dummy.position.z);
      const randomOffset = (Math.random() - 0.5) * (Math.PI / 4);
      dummy.rotation.y = baseRotation + randomOffset;

      dummy.scale.set(0.032, 0.032, 0.032);
      dummy.updateMatrix();
      crowdMesh.setMatrixAt(i, dummy.matrix);
    }
    crowdMesh.instanceMatrix.needsUpdate = true;

    scene.add(crowdMesh);

    crowdUpdate = (delta: number) => {
      if (!dancers.length) return;

      for (let i = 0; i < dancers.length; i++) {
        const dancer = dancers[i];
        dancer.mixer.update(delta);
        (dancer.mixer.getRoot() as THREE.Object3D).updateMatrixWorld(true);
        dancer.rootBone.position.set(0, 0, 0);
        dancer.rootBone.quaternion.set(0, 0, 0, 1);
        dancer.rootBone.scale.set(1, 1, 1);
        dancer.skeleton.update();
        const offset = i * MAX_BONES * 16;
        boneTexture.image.data.set(dancer.skeleton.boneMatrices, offset);
      }
      boneTexture.needsUpdate = true;
    };
  });

  const update = (delta: number) => {
    crowdUpdate(delta);
  };

  return { update };
}
