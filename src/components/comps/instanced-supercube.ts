import { cssColorToLinearRGB } from '@/lib/color-utils';
import * as THREE from 'three';
import { v } from '../config/config';
import { createComponent } from '../config/create-component';

const InstancedSupercube = createComponent({
  name: 'Instanced Supercube',
  description: 'Interactive 3D instanced cubes with explosion animation',
  config: v.config({
    color: v.color({
      label: 'Color',
      description: 'Cube color (CSS)',
      defaultValue: 'rgb(255, 0, 0)',
    }),
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
    // Targets for animation
    implodedMatrices: [] as THREE.Matrix4[],
    explodedMatrices: [] as THREE.Matrix4[],
    instanceCount: 0,
    // Capacity and config snapshot
    maxGridSize: 8,
    maxCapacity: 0,
    prevGridSize: undefined as number | undefined,
    prevSpacing: undefined as number | undefined,
    prevExplosionFactor: undefined as number | undefined,
    // Shader/time
    customUniforms: null as { uTime: { value: number } } | null,
    clock: null as THREE.Clock | null,
    // Accumulated rotations for smooth, dt-based rotation updates
    rotationX: 0,
    rotationY: 0,
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

    // Create the instanced mesh once with fixed capacity and reuse it
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
  draw3D: ({
    threeCtx: { scene, camera, renderer },
    state,
    config,
    dt,
    time,
  }) => {
    if (!state.instancedMesh || !state.customUniforms) return;

    // Use explicit time parameter instead of THREE.Clock

    // Update shader time uniform
    state.customUniforms.uTime.value = time;
    // Update color uniform from config every frame for live edits
    try {
      const css = (config as any)?.color ?? 'rgb(255, 0, 0)';
      const lin = cssColorToLinearRGB(css);
      (state.customUniforms as any).uColor?.value?.setRGB?.(
        lin.r,
        lin.g,
        lin.b,
      );
    } catch {}

    // Rotate the entire mesh (dt-based to avoid snapping when speed changes)
    state.rotationX += config.rotationSpeed * dt;
    state.rotationY += config.rotationSpeed * dt;
    state.instancedMesh.rotation.x = state.rotationX;
    state.instancedMesh.rotation.y = state.rotationY;

    // If structural parameters changed, rebuild targets and adjust count
    if (
      state.prevGridSize !== config.gridSize ||
      state.prevSpacing !== config.spacing ||
      state.prevExplosionFactor !== config.explosionFactor
    ) {
      updateTargetsAndLayout(state, config);
    }

    // Animate the explosion/implosion towards target matrices
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

  // Initialize color uniform from current config
  const initialCss = (config as any)?.color ?? 'rgb(255, 0, 0)';
  const initialLin = cssColorToLinearRGB(initialCss);
  const initialThreeColor = new THREE.Color(
    initialLin.r,
    initialLin.g,
    initialLin.b,
  );

  const customUniforms = {
    uTime: { value: 0.0 },
    uColor: { value: initialThreeColor },
  } as const;
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

    // Inject color from config via a uniform (live-updatable)
    shader.fragmentShader =
      'uniform float uTime;\nuniform vec3 uColor;\nvarying vec3 vInstanceWorldPosition;\n' +
      shader.fragmentShader;
    // Bind uniforms
    (shader.uniforms as any).uColor = customUniforms.uColor;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      // Color from config (uniform is already linear RGB)
      diffuseColor.rgb = uColor;
      `,
    );
  };

  // Compute maximum capacity once
  const maxGridSize: number = state.maxGridSize ?? 8;
  const maxPerHollow = 12 * maxGridSize - 16; // edges + corners for grid S
  const maxCapacity = 8 * Math.max(0, maxPerHollow);
  state.maxGridSize = maxGridSize;
  state.maxCapacity = maxCapacity;

  const instancedMesh = new THREE.InstancedMesh(
    subCubeGeometry,
    material,
    maxCapacity,
  );
  instancedMesh.castShadow = true;
  instancedMesh.count = 0; // start empty until we build targets

  scene.add(instancedMesh);

  // Store references
  state.instancedMesh = instancedMesh;
  state.material = material;

  // Initialize targets and layout
  updateTargetsAndLayout(state, config);
}

function updateTargetsAndLayout(state: any, config: any) {
  const gridSize = config.gridSize as number;
  const spacing = config.spacing as number;
  const explosionFactor = config.explosionFactor as number;

  const implodedMatrices: THREE.Matrix4[] = [];
  const explodedMatrices: THREE.Matrix4[] = [];

  const subCubeSize = 3 / 5;
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

  // Update state targets
  state.implodedMatrices = implodedMatrices;
  state.explodedMatrices = explodedMatrices;
  state.instanceCount = Math.min(implodedMatrices.length, state.maxCapacity);
  state.prevGridSize = gridSize;
  state.prevSpacing = spacing;
  state.prevExplosionFactor = explosionFactor;

  // Ensure new instances have an initial matrix
  const currentMatrix = new THREE.Matrix4();
  const mesh: THREE.InstancedMesh = state.instancedMesh;
  const previousCount = Math.min(mesh.count, state.instanceCount);
  for (let i = previousCount; i < state.instanceCount; i++) {
    mesh.setMatrixAt(i, implodedMatrices[i]);
  }
  mesh.count = state.instanceCount;
  mesh.instanceMatrix.needsUpdate = true;
}

export default InstancedSupercube;
