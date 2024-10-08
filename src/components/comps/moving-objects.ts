import * as THREE from 'three';
import { v } from '../config/config';
import { createComponent } from '../config/create-component';

const MovingObjects = createComponent({
  name: 'Moving Objects',
  description: 'A moving field of cubes',
  config: v.config({
    color: v.color({
      label: 'Cube Color',
      description: 'Color of the cube',
      defaultValue: '#a62fde',
    }),
    spawnSizeScale: v.number({
      label: 'Cube Spawn Size Scale',
      description: 'Scale of sizes for the cubes when spawned',
      defaultValue: 1,
      min: 0.1,
      max: 2.5,
      step: 0.1,
    }),
    spawningAreaOffset: v.number({
      label: 'Spawning Area Offset',
      description: 'Area offset in which cubes will spawn',
      defaultValue: -50,
      min: -100,
      max: 50,
      step: 1,
    }),
    spawningAreaSize: v.number({
      label: 'Spawning Area Size',
      description: 'Size of the area in which cubes will spawn',
      defaultValue: 50,
      min: 0,
      max: 100,
      step: 1,
    }),
    spawningAreaHoleSize: v.number({
      label: 'Spawning Area Hole Size',
      description: 'Size of the hole in the spawning area',
      defaultValue: 0.5,
      min: 0,
      max: 1,
      step: 0.1,
    }),
    spawnInterval: v.number({
      label: 'Spawn Interval',
      description: 'Time in seconds between spawns',
      defaultValue: 0.5,
      min: 0.1,
      max: 5,
      step: 0.1,
    }),
    velocityScale: v.number({
      label: 'Cube Velocity Scale',
      description: 'Scale of velocities for the cubes',
      defaultValue: 1,
      min: 0,
      max: 10,
      step: 0.1,
    }),
  }),
  state: {
    cubes: [] as MovingCube[],
    lastSpawnTime: 0,
    spawnPlane: null as THREE.Mesh | null,
    spawnHole: null as THREE.Mesh | null,
    spawningAreaSize: 50,
    currentSpeed: 0,
  },
  init3D: ({ threeCtx: { scene, camera }, state, config, debugEnabled }) => {
    if (state.cubes.length > 0) {
      state.cubes.forEach((cube) => {
        scene.remove(cube);
      });
      state.cubes = [];
    }

    camera.position.set(0, 1, 5);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Add a debug plane to visualize the spawning area
    if (debugEnabled) {
      state.spawnPlane = addDebugPlane(
        scene,
        0,
        state.spawningAreaSize,
        '#ff0000',
      );
      state.spawnHole = addDebugPlane(
        scene,
        0.1,
        state.spawningAreaSize,
        '#00ff00',
      );
    }

    // Initialize lighting
    // const light = new THREE.PointLight("#FFFFFF", 500);
    // light.position.set(5, 5, 5);
    // scene.add(light);
    const directionalLight = new THREE.DirectionalLight('#ffffff', 10);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight('#ffffff', 0.2);
    scene.add(ambientLight);
  },
  draw3D: ({
    threeCtx: { scene, camera, renderer },
    audioData,
    state,
    config,
    dt,
  }) => {
    // Spawn cubes at interval
    if (Date.now() - state.lastSpawnTime > config.spawnInterval * 1000) {
      for (let i = 0; i < 5; i++) {
        const size = THREE.MathUtils.lerp(
          config.spawnSizeScale * 0.5,
          config.spawnSizeScale * 5,
          Math.random(),
        );
        const spawnAreaSize = state.spawningAreaSize * config.spawningAreaSize;
        const spawnHoleSize =
          state.spawningAreaSize * config.spawningAreaHoleSize;
        // Calculate the x and y position of the cube
        // The cube should spawn within the spawning area and not inside the hole
        let x = THREE.MathUtils.lerp(
          -spawnAreaSize / 2,
          spawnAreaSize / 2,
          Math.random(),
        );

        let y = THREE.MathUtils.lerp(
          -spawnAreaSize / 2,
          spawnAreaSize / 2,
          Math.random(),
        );

        // If the cube is inside the hole, move it to the edge of the hole in a random direction
        if (
          Math.abs(x) < spawnHoleSize / 2 &&
          Math.abs(y) < spawnHoleSize / 2
        ) {
          if (Math.random() > 0.5) {
            x = x < 0 ? -spawnHoleSize / 2 : spawnHoleSize / 2;
          } else {
            y = y < 0 ? -spawnHoleSize / 2 : spawnHoleSize / 2;
          }
        }

        const position = new THREE.Vector3(x, y, config.spawningAreaOffset);
        const velocity = new THREE.Vector3(0, 0, config.velocityScale); // Ensure it's moving towards the camera

        const cube = createCube(size, config.color, position, velocity);
        state.cubes.push(cube);
        scene.add(cube);
      }
      state.lastSpawnTime = Date.now();
    }

    state.spawnPlane?.position.set(0, 0, config.spawningAreaOffset);
    state.spawnPlane?.scale.set(
      config.spawningAreaSize,
      config.spawningAreaSize,
      0,
    );
    state.spawnHole?.position.set(0, 0, config.spawningAreaOffset + 0.1);
    state.spawnHole?.scale.set(
      config.spawningAreaHoleSize,
      config.spawningAreaHoleSize,
      0,
    );

    // Calculate the average volume of low frequencies
    let lowFreqRange = audioData.dataArray.slice(
      0,
      Math.floor(audioData.dataArray.length * 0.05),
    );
    let averageLowFreq =
      lowFreqRange.reduce((acc, val) => acc + val, 0) / lowFreqRange.length;

    // Define the threshold for movement direction change
    const threshold = config.velocityScale * 140; // Midpoint of possible range 0-255, adjust based on observed data and desired responsiveness

    // Determine movement direction based on threshold
    const speed = averageLowFreq > threshold ? 20 : 5; // 1 for forward, -1 for backward

    // Update cube positions
    state.cubes.forEach((cube, index) => {
      // Increase opacity until it is fully opaque
      if (cube.material.opacity < 1) {
        cube.material.opacity += dt; // Adjust the rate of fade-in by changing the multiplier
        if (cube.material.opacity > 1) cube.material.opacity = 1;
      }

      // Move cubes based on the current amplitude exceeding the threshold
      cube.position.z += speed * dt;

      // Remove cubes that have moved past the camera or behind the spawning plane
      if (cube.position.z > camera.position.z) {
        scene.remove(cube);
        state.cubes.splice(index, 1);
      }
    });

    renderer.render(scene, camera);
  },
});

export default MovingObjects;

interface MovingCube
  extends THREE.Mesh<
    THREE.BoxGeometry,
    THREE.MeshStandardMaterial,
    THREE.Object3DEventMap
  > {
  velocity: THREE.Vector3;
}

// Function to create a new cube
function createCube(
  size: number,
  color: string,
  position: THREE.Vector3,
  velocity: THREE.Vector3,
): MovingCube {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.5,
    roughness: 0.2,
    transparent: true, // Enable transparency
    opacity: 0, // Start fully transparent
  });
  const cube = new THREE.Mesh(geometry, material) as MovingCube;
  cube.position.copy(position);
  cube.velocity = velocity;
  return cube;
}

function addDebugPlane(
  scene: THREE.Scene,
  positionZ: number,
  size: number = 50,
  color: string = '#ff0000',
) {
  const planeGeometry = new THREE.PlaneGeometry(size, size); // Adjust the size to fit your scene scale
  const planeMaterial = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5,
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.position.set(0, 0, positionZ);
  scene.add(plane);

  return plane;
}
