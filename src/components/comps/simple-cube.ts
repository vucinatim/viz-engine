import * as THREE from 'three';
import { v } from '../config/config';
import { createComponent } from '../config/create-component';
import { INPUT_ALIAS, OUTPUT_ALIAS } from '../node-network/presets';

const SimpleCube = createComponent({
  name: 'Simple Cube',
  description: 'A simple 3D cube visualization',
  config: v.config({
    color: v.color({
      label: 'Cube Color',
      description: 'Color of the cube',
      defaultValue: '#FF6347',
    }),
    size: v.number({
      label: 'Cube Size',
      description: 'Size of the cube',
      defaultValue: 2,
      min: 0.1,
      max: 10,
      step: 0.1,
    }),
  }),
  defaultNetworks: {
    // Animate size from audio: Input.audioSignal -> Average Volume -> Normalize(0..3) -> Output
    size: {
      id: 'cube-size-audio',
      name: 'Cube Size From Audio',
      description:
        'Input.audioSignal -> Average Volume -> Normalize(0..3) -> Output',
      outputType: 'number',
      autoPlace: true,
      nodes: [
        { id: 'avg', label: 'Average Volume', position: { x: 0, y: -80 } },
        {
          id: 'norm',
          label: 'Normalize',
          position: { x: 250, y: -80 },
          inputValues: {
            inputMin: 0,
            inputMax: 255,
            outputMin: 0,
            outputMax: 3,
          },
        },
      ],
      edges: [
        {
          source: INPUT_ALIAS,
          sourceHandle: 'audioSignal',
          target: 'avg',
          targetHandle: 'data',
        },
        {
          source: 'avg',
          sourceHandle: 'average',
          target: 'norm',
          targetHandle: 'value',
        },
        {
          source: 'norm',
          sourceHandle: 'result',
          target: OUTPUT_ALIAS,
          targetHandle: 'output',
        },
      ],
    },
  },
  init3D: ({ threeCtx: { scene, camera, renderer } }) => {
    camera.position.set(0, 1, 5); // Position the camera
    camera.lookAt(new THREE.Vector3(0, 0, 0)); // Make the camera look at the origin
    // scene.background = new THREE.Color("#00ff00"); // Set background color

    // Initialize cube
    const geometry = new THREE.BoxGeometry(1, 1, 1); // Size will be adjusted dynamically
    const material = new THREE.MeshPhongMaterial({ color: '#FF6347' });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 0, 0); // Explicitly position the cube at the origin
    scene.userData.cube = cube;
    scene.add(cube);

    // Initialize lighting
    const light = new THREE.PointLight('#FFFFFF', 100);
    light.position.set(5, 5, 5);
    scene.add(light);
    scene.userData.light = light;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.5); // soft white light
    scene.add(ambientLight);
  },
  draw3D: ({
    threeCtx: { scene, camera, renderer },
    audioData: { dataArray },
    config,
    dt,
  }) => {
    const cube = scene.userData.cube;

    // Calculate the average volume of low frequencies
    // let lowFreqRange = dataArray.slice(0, Math.floor(dataArray.length * 0.25)); // Adjust range as needed
    // let averageLowFreq =
    //   lowFreqRange.reduce((acc, val) => acc + val, 0) / lowFreqRange.length;

    // // Normalize and use this to scale the cube
    // let scale = Math.max(0.1, averageLowFreq / 128); // Normalize based on your data's range and desired effect
    // cube.scale.set(
    //   scale * config.size,
    //   scale * config.size,
    //   scale * config.size,
    // );

    cube.scale.set(config.size, config.size, config.size);

    cube.material.color.set(config.color);
    cube.rotation.x += 1 * dt;
    cube.rotation.y += 1 * dt;

    renderer.render(scene, camera);
  },
});

export default SimpleCube;
