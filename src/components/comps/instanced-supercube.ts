import * as THREE from 'three';
import { v } from '../config/config';
import { createComponent } from '../config/create-component';

const InstancedSupercube = createComponent({
  name: 'Instanced Supercube',
  description: 'Interactive 3D instanced cubes with explosion animation',
  config: v.config({
    explosionFactor: v.number({
      label: 'Explosion Factor',
      description: 'How far the cubes explode from the center',
      defaultValue: 1.67,
      min: 1,
      max: 3,
      step: 0.1,
    }),
    rotationSpeed: v.number({
      label: 'Rotation Speed',
      description: 'Speed of the overall rotation',
      defaultValue: 0.2,
      min: 0,
      max: 1,
      step: 0.1,
    }),
    animationSpeed: v.number({
      label: 'Animation Speed',
      description: 'Speed of the explosion/implosion animation',
      defaultValue: 0.08,
      min: 0.01,
      max: 0.2,
      step: 0.01,
    }),
    gridSize: v.number({
      label: 'Grid Size',
      description: 'Number of cubes per side of each sub-cube',
      defaultValue: 5,
      min: 3,
      max: 8,
      step: 1,
    }),
    spacing: v.number({
      label: 'Spacing',
      description: 'Distance between the hollow cubes',
      defaultValue: 4,
      min: 2,
      max: 8,
      step: 0.5,
    }),
    explosionShift: v.number({
      label: 'Explosion Shift',
      description:
        'Continuous control of explosion state (0 = imploded, 1 = exploded)',
      defaultValue: 0,
      min: 0,
      max: 1,
      step: 0.01,
    }),
  }),
  createState: () => ({
    instancedMesh: null as THREE.InstancedMesh | null,
    material: null as THREE.MeshStandardMaterial | null,
    implodedMatrices: [] as THREE.Matrix4[],
    explodedMatrices: [] as THREE.Matrix4[],
    instanceCount: 0,
    customUniforms: null as { uTime: { value: number } } | null,
    clock: null as THREE.Clock | null,
  }),
  init3D: ({ threeCtx: { scene, camera, renderer }, state, config }) => {
    // Store clock for timing
    state.clock = new THREE.Clock();

    // Set up camera
    camera.position.set(0, 0, 20);
    camera.lookAt(0, 0, 0);

    // Set scene background
    scene.background = new THREE.Color(0x111111);

    // Add lighting
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(-8, 10, 12);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    // Create the instanced mesh
    createInstancedMesh(scene, state, config);

    // Add shadow plane
    const planeGeometry = new THREE.PlaneGeometry(100, 100);
    const planeMaterial = new THREE.ShadowMaterial();
    planeMaterial.opacity = 0.3;
    const shadowPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    shadowPlane.receiveShadow = true;
    shadowPlane.position.z = -10;
    scene.add(shadowPlane);
  },
  draw3D: ({ threeCtx: { scene, camera, renderer }, state, config, dt }) => {
    if (!state.clock || !state.instancedMesh || !state.customUniforms) return;

    const time = state.clock.getElapsedTime();

    // Update shader time uniform
    state.customUniforms.uTime.value = time;

    // Rotate the entire mesh
    state.instancedMesh.rotation.x = time * config.rotationSpeed;
    state.instancedMesh.rotation.y = time * config.rotationSpeed;

    // Animate the explosion/implosion
    const currentMatrix = new THREE.Matrix4();
    const implodedMatrices = state.implodedMatrices;
    const explodedMatrices = state.explodedMatrices;

    for (let i = 0; i < state.instanceCount; i++) {
      state.instancedMesh.getMatrixAt(i, currentMatrix);

      // Get target positions for both states
      const implodedPos = implodedMatrices[i];
      const explodedPos = explodedMatrices[i];

      // Interpolate between imploded and exploded positions based on explosionShift
      const targetX = THREE.MathUtils.lerp(
        implodedPos.elements[12],
        explodedPos.elements[12],
        config.explosionShift,
      );
      const targetY = THREE.MathUtils.lerp(
        implodedPos.elements[13],
        explodedPos.elements[13],
        config.explosionShift,
      );
      const targetZ = THREE.MathUtils.lerp(
        implodedPos.elements[14],
        explodedPos.elements[14],
        config.explosionShift,
      );

      // Smoothly animate towards the target position
      currentMatrix.elements[12] +=
        (targetX - currentMatrix.elements[12]) * config.animationSpeed;
      currentMatrix.elements[13] +=
        (targetY - currentMatrix.elements[13]) * config.animationSpeed;
      currentMatrix.elements[14] +=
        (targetZ - currentMatrix.elements[14]) * config.animationSpeed;

      state.instancedMesh.setMatrixAt(i, currentMatrix);
    }
    state.instancedMesh.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
  },
});

function createInstancedMesh(scene: THREE.Scene, state: any, config: any) {
  // Define the geometry for a single small cube
  const subCubeSize = 3 / 5;
  const subCubeGeometry = new THREE.BoxGeometry(
    subCubeSize,
    subCubeSize,
    subCubeSize,
  );

  // Create material with custom shader
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
  });

  const customUniforms = {
    uTime: { value: 0.0 },
  };
  state.customUniforms = customUniforms;

  // Use onBeforeCompile to inject custom shader code
  material.onBeforeCompile = (shader: any) => {
    // Add our custom time uniform
    shader.uniforms.uTime = customUniforms.uTime;

    // Add a varying to pass the instance's world position to the fragment shader
    shader.vertexShader =
      'varying vec3 vInstanceWorldPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      // Calculate the world position of the center of the instance
      vInstanceWorldPosition = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      `,
    );

    // Inject the color logic into the fragment shader
    shader.fragmentShader =
      'uniform float uTime;\nvarying vec3 vInstanceWorldPosition;\n' +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      
      // Custom color logic based on the instance's world position
      vec3 colorA = vec3(0.1, 0.5, 0.9);
      vec3 colorB = vec3(0.9, 0.2, 0.5);
      float mixFactor = sin(vInstanceWorldPosition.y * 0.2 + uTime) * 0.5 + 0.5;
      vec3 finalColor = mix(colorA, colorB, mixFactor);

      // Apply this color to the material's diffuse color
      diffuseColor.rgb = finalColor;
      `,
    );
  };

  // Calculate matrices for all instances
  const gridSize = config.gridSize;
  const spacing = config.spacing;
  const explosionFactor = config.explosionFactor;
  let instanceCount = 0;

  const implodedMatrices: THREE.Matrix4[] = [];
  const explodedMatrices: THREE.Matrix4[] = [];

  const dummy = new THREE.Object3D();

  for (let hx = -1; hx <= 1; hx += 2) {
    for (let hy = -1; hy <= 1; hy += 2) {
      for (let hz = -1; hz <= 1; hz += 2) {
        const hollowCubePosition = new THREE.Vector3(
          (hx * spacing) / 2,
          (hy * spacing) / 2,
          (hz * spacing) / 2,
        );

        for (let i = 0; i < gridSize; i++) {
          for (let j = 0; j < gridSize; j++) {
            for (let k = 0; k < gridSize; k++) {
              let boundaryCount = 0;
              if (i === 0 || i === gridSize - 1) boundaryCount++;
              if (j === 0 || j === gridSize - 1) boundaryCount++;
              if (k === 0 || k === gridSize - 1) boundaryCount++;

              if (boundaryCount >= 2) {
                instanceCount++;
                const centerOffset = (gridSize - 1) / 2;
                const initialX = (i - centerOffset) * subCubeSize;
                const initialY = (j - centerOffset) * subCubeSize;
                const initialZ = (k - centerOffset) * subCubeSize;

                // Imploded position
                dummy.position.set(
                  hollowCubePosition.x + initialX,
                  hollowCubePosition.y + initialY,
                  hollowCubePosition.z + initialZ,
                );
                dummy.updateMatrix();
                implodedMatrices.push(dummy.matrix.clone());

                // Exploded position
                dummy.position.set(
                  hollowCubePosition.x + initialX * explosionFactor,
                  hollowCubePosition.y + initialY * explosionFactor,
                  hollowCubePosition.z + initialZ * explosionFactor,
                );
                dummy.updateMatrix();
                explodedMatrices.push(dummy.matrix.clone());
              }
            }
          }
        }
      }
    }
  }

  const instancedMesh = new THREE.InstancedMesh(
    subCubeGeometry,
    material,
    instanceCount,
  );
  instancedMesh.castShadow = true;

  // Set initial matrices
  for (let i = 0; i < instanceCount; i++) {
    instancedMesh.setMatrixAt(i, implodedMatrices[i]);
  }

  scene.add(instancedMesh);

  // Store references
  state.instancedMesh = instancedMesh;
  state.material = material;
  state.implodedMatrices = implodedMatrices;
  state.explodedMatrices = explodedMatrices;
  state.instanceCount = instanceCount;
}

export default InstancedSupercube;
