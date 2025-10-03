import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import modelUrl from '../models/female-dj.fbx?url';

export function createDj(scene: THREE.Scene) {
  // Suppress Three.js warnings during FBX load to prevent lag
  const originalWarn = console.warn;
  console.warn = () => {}; // Temporarily disable warnings

  // Create loading manager that prevents texture loading entirely
  const loadingManager = new THREE.LoadingManager();

  // Override the default texture loader to prevent 404s
  loadingManager.setURLModifier((url) => {
    // If it's a texture file (not the FBX itself), return empty data URL
    if (url.match(/\.(png|jpg|jpeg|gif|bmp|tga)$/i)) {
      // Return a 1x1 transparent pixel as data URL to avoid 404s
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }
    return url;
  });

  // Restore console.warn after any load completes
  loadingManager.onLoad = () => {
    console.warn = originalWarn;
  };
  loadingManager.onError = () => {
    console.warn = originalWarn;
  };

  const loader = new FBXLoader(loadingManager);
  let mixer: THREE.AnimationMixer | null = null;
  let djObject: THREE.Group | null = null;

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
