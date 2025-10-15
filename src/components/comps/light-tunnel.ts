import * as THREE from 'three';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { v } from '../config/config';
import { createComponent } from '../config/create-component';

const LightTunnel = createComponent({
  name: 'Light Tunnel',
  description:
    'Infinite tunnel made with cubes that have glowing neon edges, camera centered',
  config: v.config({
    structure: v.group(
      {
        label: 'Tunnel Structure',
        description: 'Physical dimensions and depth of the tunnel',
      },
      {
        cubeSize: v.number({
          label: 'Cube Size',
          description: 'Size of each cube',
          defaultValue: 2.5,
          min: 0.5,
          max: 3,
          step: 0.1,
        }),
        spacing: v.number({
          label: 'Spacing',
          description: 'Space between cubes',
          defaultValue: 1.3,
          min: 1,
          max: 5,
          step: 0.1,
        }),
        tunnelDepth: v.number({
          label: 'Tunnel Depth',
          description: 'Number of cube rings visible in the tunnel',
          defaultValue: 13,
          min: 10,
          max: 40,
          step: 1,
        }),
      },
    ),
    appearance: v.group(
      {
        label: 'Visual Style',
        description: 'Rendering mode and color configuration',
      },
      {
        renderMode: v.select({
          label: 'Render Mode',
          description: 'Hollow (edges only) or Solid (edges + material)',
          defaultValue: 'Solid',
          options: ['Hollow', 'Solid'],
        }),
        colorMode: v.select({
          label: 'Color Mode',
          description: 'How to color the cube edges',
          defaultValue: 'Alternating',
          options: ['Single', 'Random', 'Alternating', 'Spiral', 'Depth'],
        }),
        edgeColor: v.color({
          label: 'Edge Color',
          description: 'Color of the glowing edges',
          defaultValue: '#00FFFF',
          visibleIf: (values) => values.appearance.colorMode === 'Single',
        }),
        colorPalette: v.list({
          label: 'Color Palette',
          description: 'List of colors to use for multi-color modes',
          defaultValue: ['#FF00FF', '#00FFFF'],
          itemConfig: v.color({
            label: 'Color',
            description: 'A color in the palette',
            defaultValue: '#FFFFFF',
          }),
          visibleIf: (values) => values.appearance.colorMode !== 'Single',
        }),
      },
    ),
    edges: v.group(
      {
        label: 'Edge Appearance',
        description: 'Glowing edge styling and thickness',
      },
      {
        edgeThickness: v.number({
          label: 'Edge Thickness',
          description: 'Thickness of the glowing edges',
          defaultValue: 5.5,
          min: 1,
          max: 10,
          step: 0.5,
        }),
        glowIntensity: v.number({
          label: 'Glow Intensity',
          description: 'Intensity of the edge glow',
          defaultValue: 1.8,
          min: 0.5,
          max: 5,
          step: 0.1,
        }),
      },
    ),
    material: v.group(
      {
        label: 'Solid Material',
        description: 'PBR material properties for solid cubes',
      },
      {
        solidCubeColor: v.color({
          label: 'Base Color',
          description: 'Base color of the solid cube material',
          defaultValue: '#0a0a0a',
          visibleIf: (values) => values.appearance.renderMode === 'Solid',
        }),
        solidEmissiveColor: v.color({
          label: 'Emissive Color',
          description: 'Glow color of the solid cube material',
          defaultValue: 'rgb(0, 0, 0)',
          visibleIf: (values) => values.appearance.renderMode === 'Solid',
        }),
        solidEmissiveIntensity: v.number({
          label: 'Emissive Intensity',
          description: 'How much the solid material glows',
          defaultValue: 0,
          min: 0,
          max: 1,
          step: 0.05,
          visibleIf: (values) => values.appearance.renderMode === 'Solid',
        }),
        metalness: v.number({
          label: 'Metalness',
          description: 'How metallic the material appears',
          defaultValue: 0.7,
          min: 0,
          max: 1,
          step: 0.05,
          visibleIf: (values) => values.appearance.renderMode === 'Solid',
        }),
        roughness: v.number({
          label: 'Roughness',
          description: 'How rough/smooth the material surface is',
          defaultValue: 0.77,
          min: 0,
          max: 1,
          step: 0.01,
          visibleIf: (values) => values.appearance.renderMode === 'Solid',
        }),
        envMapIntensity: v.number({
          label: 'Environment Reflection',
          description: 'Intensity of environment reflections',
          defaultValue: 0,
          min: 0,
          max: 5,
          step: 0.1,
          visibleIf: (values) => values.appearance.renderMode === 'Solid',
        }),
      },
    ),
    lighting: v.group(
      {
        label: 'Scene Lighting',
        description: 'Rotating light circle in front of camera',
      },
      {
        enableLights: v.toggle({
          label: 'Enable Lights',
          description:
            'Add a rotating circle of colored lights in front of camera',
          defaultValue: true,
          visibleIf: (values) => values.appearance.renderMode === 'Solid',
        }),
        lightCount: v.number({
          label: 'Light Count',
          description: 'Number of lights in the circle',
          defaultValue: 6,
          min: 3,
          max: 16,
          step: 1,
          visibleIf: (values) =>
            values.appearance.renderMode === 'Solid' &&
            values.lighting.enableLights,
        }),
        lightCircleRadius: v.number({
          label: 'Circle Radius',
          description: 'Radius of the light circle',
          defaultValue: 7,
          min: 0.2,
          max: 5,
          step: 0.1,
          visibleIf: (values) =>
            values.appearance.renderMode === 'Solid' &&
            values.lighting.enableLights,
        }),
        lightCircleDistance: v.number({
          label: 'Circle Distance',
          description: 'Distance of light circle from camera (into tunnel)',
          defaultValue: 7,
          min: 0.5,
          max: 10,
          step: 0.5,
          visibleIf: (values) =>
            values.appearance.renderMode === 'Solid' &&
            values.lighting.enableLights,
        }),
        lightIntensity: v.number({
          label: 'Light Intensity',
          description: 'Intensity of the point lights',
          defaultValue: 100,
          min: 0,
          max: 100,
          step: 1,
          visibleIf: (values) =>
            values.appearance.renderMode === 'Solid' &&
            values.lighting.enableLights,
        }),
        lightDistance: v.number({
          label: 'Light Distance',
          description: 'Maximum distance of light effect',
          defaultValue: 100,
          min: 1,
          max: 100,
          step: 5,
          visibleIf: (values) =>
            values.appearance.renderMode === 'Solid' &&
            values.lighting.enableLights,
        }),
        lightRotationSpeed: v.number({
          label: 'Rotation Speed',
          description: 'Speed of light circle rotation (clockwise)',
          defaultValue: 0.15,
          min: 0,
          max: 2,
          step: 0.05,
          visibleIf: (values) =>
            values.appearance.renderMode === 'Solid' &&
            values.lighting.enableLights,
        }),
      },
    ),
    animation: v.group(
      {
        label: 'Animation',
        description: 'Movement and rotation speeds',
      },
      {
        tunnelSpeed: v.number({
          label: 'Tunnel Speed',
          description: 'Speed of movement through the tunnel',
          defaultValue: 0.5,
          min: 0,
          max: 3,
          step: 0.1,
        }),
        rotationSpeed: v.number({
          label: 'Rotation Speed',
          description: 'Speed of tunnel rotation around its axis',
          defaultValue: 0.05,
          min: 0,
          max: 2,
          step: 0.05,
        }),
      },
    ),
    wave: v.group(
      {
        label: 'Mexican Wave',
        description: 'Outward wave animation for center cubes',
      },
      {
        triggerWave: v.toggle({
          label: 'Trigger Wave',
          description: 'Fire a wave animation through the tunnel',
          defaultValue: false,
        }),
        waveSpeed: v.number({
          label: 'Wave Speed',
          description: 'Speed at which the wave travels down the tunnel',
          defaultValue: 8.5,
          min: 0.5,
          max: 10,
          step: 0.5,
        }),
        waveAmplitude: v.number({
          label: 'Wave Amplitude',
          description: 'How far cubes move outward from center',
          defaultValue: 1,
          min: 0.5,
          max: 5,
          step: 0.1,
        }),
        waveDuration: v.number({
          label: 'Wave Duration',
          description: 'Duration of the wave animation per cube',
          defaultValue: 0.4,
          min: 0.2,
          max: 2,
          step: 0.1,
        }),
      },
    ),
    atmosphere: v.group(
      {
        label: 'Atmosphere',
        description: 'Environmental fog effects',
      },
      {
        fogDensity: v.number({
          label: 'Fog Density',
          description: 'Density of fog effect for depth',
          defaultValue: 0.095,
          min: 0,
          max: 0.1,
          step: 0.005,
        }),
      },
    ),
    postProcessing: v.group(
      {
        label: 'Post Processing',
        description: 'Bloom and depth of field effects',
      },
      {
        bloom: v.toggle({
          label: 'Bloom Enabled',
          description: 'Enable bloom glow effect',
          defaultValue: true,
        }),
        bloomStrength: v.number({
          label: 'Bloom Strength',
          description: 'Intensity of the bloom glow effect',
          defaultValue: 0.5,
          min: 0,
          max: 3,
          step: 0.05,
        }),
        bloomRadius: v.number({
          label: 'Bloom Radius',
          description: 'Size of the bloom glow spread',
          defaultValue: 0.8,
          min: 0,
          max: 1,
          step: 0.01,
        }),
        bloomThreshold: v.number({
          label: 'Bloom Threshold',
          description: 'Brightness threshold for bloom effect',
          defaultValue: 0.1,
          min: 0,
          max: 1,
          step: 0.01,
        }),
        depthOfField: v.toggle({
          label: 'Depth of Field',
          description: 'Enable cinematic shallow focus effect',
          defaultValue: false,
        }),
        dofFocus: v.number({
          label: 'DOF Focus Distance',
          description: 'Distance where objects are in focus',
          defaultValue: 1,
          min: 1,
          max: 50,
          step: 0.5,
        }),
        dofAperture: v.number({
          label: 'DOF Aperture',
          description: 'Blur amount (lower = more blur)',
          defaultValue: 0.0011,
          min: 0.0001,
          max: 0.002,
          step: 0.0001,
        }),
      },
    ),
  }),
  defaultNetworks: {
    'wave.triggerWave': 'neural-fire-on-kick',
  },
  init3D: ({ threeCtx: { scene, camera, renderer, composer }, config }) => {
    // Set up camera at center looking down the tunnel
    camera.position.set(0, 0, 0);
    camera.lookAt(new THREE.Vector3(0, 0, -1));

    // Add fog for depth effect (uses layer background color)
    scene.fog = new THREE.FogExp2('#000000', config.atmosphere.fogDensity);

    // Create container group for the entire tunnel
    const tunnelGroup = new THREE.Group();
    scene.add(tunnelGroup);

    // Store tunnel group and offset
    scene.userData.tunnelGroup = tunnelGroup;
    scene.userData.tunnelOffset = 0;
    scene.userData.cubeRings = [];

    // Initialize wave animation state - now supports multiple waves
    scene.userData.activeWaves = []; // Array of { startTime: number }
    scene.userData.lastTriggerState = false;

    // Generate tunnel cubes
    generateTunnel(scene, config);

    // Create light circle group
    const lightCircleGroup = new THREE.Group();
    scene.add(lightCircleGroup);
    scene.userData.lightCircleGroup = lightCircleGroup;

    // Generate the light circle
    generateLightCircle(scene, config);

    // Setup post-processing passes
    if (composer) {
      // Add bloom pass
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        config.postProcessing.bloomStrength,
        config.postProcessing.bloomRadius,
        config.postProcessing.bloomThreshold,
      );
      bloomPass.enabled = config.postProcessing.bloom;
      composer.addPass(bloomPass);
      scene.userData.bloomPass = bloomPass;

      // Add depth of field pass
      const bokehPass = new BokehPass(scene, camera, {
        focus: config.postProcessing.dofFocus,
        aperture: config.postProcessing.dofAperture,
        maxblur: 0.01,
      });
      bokehPass.enabled = config.postProcessing.depthOfField;
      composer.addPass(bokehPass);
      scene.userData.bokehPass = bokehPass;
    }
  },
  draw3D: ({
    threeCtx: { scene, camera, renderer },
    audioData: { dataArray },
    config,
    dt,
    time,
    debugEnabled,
  }) => {
    const tunnelGroup = scene.userData.tunnelGroup as THREE.Group;

    // Update fog density
    if (scene.fog) {
      (scene.fog as THREE.FogExp2).density = config.atmosphere.fogDensity;
    }

    // Regenerate tunnel if structure changed
    if (
      scene.userData.lastCubeSize !== config.structure.cubeSize ||
      scene.userData.lastSpacing !== config.structure.spacing ||
      scene.userData.lastTunnelDepth !== config.structure.tunnelDepth ||
      scene.userData.lastEdgeThickness !== config.edges.edgeThickness ||
      scene.userData.lastColorMode !== config.appearance.colorMode ||
      scene.userData.lastRenderMode !== config.appearance.renderMode ||
      JSON.stringify(scene.userData.lastColorPalette) !==
        JSON.stringify(config.appearance.colorPalette)
    ) {
      generateTunnel(scene, config);
    }

    // Regenerate light circle if structure changed
    if (
      scene.userData.lastEnableLights !== config.lighting.enableLights ||
      scene.userData.lastLightCount !== config.lighting.lightCount ||
      scene.userData.lastColorMode !== config.appearance.colorMode ||
      JSON.stringify(scene.userData.lastColorPalette) !==
        JSON.stringify(config.appearance.colorPalette)
    ) {
      generateLightCircle(scene, config);
    }

    // Update edge color, glow, resolution, and solid material properties
    const rendererSize = new THREE.Vector2();
    renderer.getSize(rendererSize);

    const cubeRings = scene.userData.cubeRings as THREE.Group[];
    cubeRings.forEach((ring) => {
      ring.children.forEach((child) => {
        if (child instanceof LineSegments2) {
          const material = child.material as LineMaterial;

          // Use stored color (for multi-color modes) or current edgeColor
          const baseColor =
            config.appearance.colorMode !== 'Single' && child.userData.cubeColor
              ? child.userData.cubeColor
              : config.appearance.edgeColor;

          const emissiveColor = new THREE.Color(baseColor);
          emissiveColor.multiplyScalar(config.edges.glowIntensity);
          material.color.copy(emissiveColor);
          material.linewidth = config.edges.edgeThickness;
          material.resolution.copy(rendererSize);
        } else if (child instanceof THREE.InstancedMesh) {
          // Update solid cube material properties (instanced mesh)
          const material = child.material as THREE.MeshStandardMaterial;
          material.color.set(config.material.solidCubeColor);
          material.metalness = config.material.metalness;
          material.roughness = config.material.roughness;
          material.envMapIntensity = config.material.envMapIntensity;

          // Update emissive color - independent from edge color
          const emissiveColor = new THREE.Color(
            config.material.solidEmissiveColor,
          );
          emissiveColor.multiplyScalar(config.material.solidEmissiveIntensity);
          material.emissive.copy(emissiveColor);
        }
      });
    });

    // Update light circle properties
    const lightCircleGroup = scene.userData.lightCircleGroup as THREE.Group;
    if (lightCircleGroup) {
      // Position the light circle in front of the camera
      lightCircleGroup.position.z = -config.lighting.lightCircleDistance;

      // Update each light in the circle
      lightCircleGroup.children.forEach((child) => {
        if (child instanceof THREE.PointLight) {
          child.intensity = config.lighting.enableLights
            ? config.lighting.lightIntensity
            : 0;
          child.distance = config.lighting.lightDistance;
        } else if (child instanceof THREE.Mesh) {
          // Update helper visibility - only show in debug mode
          child.visible = config.lighting.enableLights && debugEnabled;
        }
      });

      // Update positions based on radius
      const lightCount =
        scene.userData.lightCount || config.lighting.lightCount;
      for (let i = 0; i < lightCount; i++) {
        const light = lightCircleGroup.children[i * 2]; // Every other child (light, then helper)
        if (light instanceof THREE.PointLight) {
          const angle = (i / lightCount) * Math.PI * 2;
          const x = Math.cos(angle) * config.lighting.lightCircleRadius;
          const y = Math.sin(angle) * config.lighting.lightCircleRadius;
          light.position.set(x, y, 0);

          // Update helper position
          const helper = lightCircleGroup.children[i * 2 + 1];
          if (helper instanceof THREE.Mesh) {
            helper.position.copy(light.position);
          }
        }
      }

      // Rotate the light circle clockwise (negative rotation)
      lightCircleGroup.rotation.z -= config.lighting.lightRotationSpeed * dt;
    }

    // Handle wave animation trigger
    const currentTriggerState = config.wave.triggerWave;
    const lastTriggerState = scene.userData.lastTriggerState;

    // Detect rising edge of trigger (false -> true)
    // Spawn a new wave - multiple waves can now be active simultaneously
    if (currentTriggerState && !lastTriggerState) {
      if (debugEnabled) {
        console.log('[Light Tunnel] Wave spawned at time:', time);
      }
      scene.userData.activeWaves.push({ startTime: time });
    }

    scene.userData.lastTriggerState = currentTriggerState;

    // Process all active waves
    const activeWaves = scene.userData.activeWaves as Array<{
      startTime: number;
    }>;
    const ringSpacing = config.structure.cubeSize + config.structure.spacing;
    const totalWaveDuration =
      config.wave.waveDuration + cubeRings.length / config.wave.waveSpeed;

    // Center cube indices (not corners): bottom, right, top, left
    const centerIndices = [1, 3, 5, 7];

    // Direction vectors for each center cube (normalized)
    const centerDirections = [
      { x: 0, y: -1 }, // bottom-center moves down
      { x: 1, y: 0 }, // right-center moves right
      { x: 0, y: 1 }, // top-center moves up
      { x: -1, y: 0 }, // left-center moves left
    ];

    // Reset all cubes to original position first
    cubeRings.forEach((ring, ringIndex) => {
      centerIndices.forEach((cubeIndex) => {
        const gridPos = getGridPosition(
          cubeIndex,
          config.structure.cubeSize,
          config.structure.spacing,
        );

        // Reset edge positions
        const edgeChild = ring.children[cubeIndex];
        if (edgeChild instanceof LineSegments2) {
          edgeChild.position.set(gridPos.x, gridPos.y, 0);
        }

        // Reset solid mesh positions
        if (config.appearance.renderMode === 'Solid') {
          const instancedMesh = ring.children.find(
            (child) => child instanceof THREE.InstancedMesh,
          ) as THREE.InstancedMesh | undefined;

          if (instancedMesh) {
            const matrix = new THREE.Matrix4();
            matrix.setPosition(gridPos.x, gridPos.y, 0);
            instancedMesh.setMatrixAt(cubeIndex, matrix);
            instancedMesh.instanceMatrix.needsUpdate = true;
          }
        }
      });
    });

    // Apply displacement from all active waves (they stack/combine)
    const waveDisplacements = new Map<
      string,
      { x: number; y: number; count: number }
    >();

    activeWaves.forEach((wave) => {
      const waveTime = time - wave.startTime;

      cubeRings.forEach((ring, ringIndex) => {
        // Calculate delay for this ring based on its position in the tunnel
        const ringDelay = ringIndex / config.wave.waveSpeed;
        const ringLocalTime = waveTime - ringDelay;

        // Only animate if this ring's time has come
        if (ringLocalTime >= 0 && ringLocalTime <= config.wave.waveDuration) {
          // Calculate wave progress (0 to 1) with easeInOutCubic
          const progress = ringLocalTime / config.wave.waveDuration;
          const eased = easeInOutCubic(progress);

          // Create wave motion: 0 -> 1 -> 0 (out and back)
          const displacement =
            Math.sin(eased * Math.PI) * config.wave.waveAmplitude;

          // Update center cubes in this ring
          centerIndices.forEach((cubeIndex, dirIndex) => {
            const direction = centerDirections[dirIndex];
            const key = `${ringIndex}-${cubeIndex}`;

            // Accumulate displacements from multiple waves
            const existing = waveDisplacements.get(key) || {
              x: 0,
              y: 0,
              count: 0,
            };
            waveDisplacements.set(key, {
              x: existing.x + direction.x * displacement,
              y: existing.y + direction.y * displacement,
              count: existing.count + 1,
            });
          });
        }
      });
    });

    // Apply accumulated displacements
    waveDisplacements.forEach((displacement, key) => {
      const [ringIndex, cubeIndex] = key.split('-').map(Number);
      const ring = cubeRings[ringIndex];
      const direction = centerDirections[centerIndices.indexOf(cubeIndex)];

      const gridPos = getGridPosition(
        cubeIndex,
        config.structure.cubeSize,
        config.structure.spacing,
      );

      // Update edges (LineSegments2)
      const edgeChild = ring.children[cubeIndex];
      if (edgeChild instanceof LineSegments2) {
        edgeChild.position.set(
          gridPos.x + displacement.x,
          gridPos.y + displacement.y,
          0,
        );
      }

      // Update solid mesh instance if in solid mode
      if (config.appearance.renderMode === 'Solid') {
        const instancedMesh = ring.children.find(
          (child) => child instanceof THREE.InstancedMesh,
        ) as THREE.InstancedMesh | undefined;

        if (instancedMesh) {
          const matrix = new THREE.Matrix4();
          matrix.setPosition(
            gridPos.x + displacement.x,
            gridPos.y + displacement.y,
            0,
          );
          instancedMesh.setMatrixAt(cubeIndex, matrix);
          instancedMesh.instanceMatrix.needsUpdate = true;
        }
      }
    });

    // Remove completed waves
    scene.userData.activeWaves = activeWaves.filter((wave) => {
      const waveTime = time - wave.startTime;
      const isComplete = waveTime > totalWaveDuration;
      if (isComplete && debugEnabled) {
        console.log('[Light Tunnel] Wave completed');
      }
      return !isComplete;
    });

    // Move through tunnel by updating offset
    scene.userData.tunnelOffset += config.animation.tunnelSpeed * dt;

    // When offset exceeds one ring spacing, reset and move back ring to front
    while (scene.userData.tunnelOffset >= ringSpacing) {
      scene.userData.tunnelOffset -= ringSpacing;

      // Move the furthest back ring to the front
      const cubeRings = scene.userData.cubeRings as THREE.Group[];
      if (cubeRings.length > 0) {
        const backRing = cubeRings.shift()!;
        const frontRing = cubeRings[cubeRings.length - 1];

        if (frontRing) {
          backRing.position.z = frontRing.position.z - ringSpacing;
        }

        cubeRings.push(backRing);
        scene.userData.cubeRings = cubeRings;
      }
    }

    // Apply tunnel offset to all rings
    cubeRings.forEach((ring) => {
      ring.position.z += config.animation.tunnelSpeed * dt;
    });

    // Rotate tunnel around its axis
    tunnelGroup.rotation.z += config.animation.rotationSpeed * dt;

    // Update post-processing parameters
    const bloomPass = scene.userData.bloomPass as UnrealBloomPass;
    const bokehPass = scene.userData.bokehPass as BokehPass;

    if (bloomPass) {
      bloomPass.enabled = config.postProcessing.bloom;
      bloomPass.strength = config.postProcessing.bloomStrength;
      bloomPass.radius = config.postProcessing.bloomRadius;
      bloomPass.threshold = config.postProcessing.bloomThreshold;
    }

    if (bokehPass) {
      bokehPass.enabled = config.postProcessing.depthOfField;
      if (bokehPass.materialBokeh?.uniforms) {
        bokehPass.materialBokeh.uniforms['focus'].value =
          config.postProcessing.dofFocus;
        bokehPass.materialBokeh.uniforms['aperture'].value =
          config.postProcessing.dofAperture;
      }
    }

    renderer.render(scene, camera);
  },
});

function generateTunnel(scene: THREE.Scene, config: any) {
  const tunnelGroup = scene.userData.tunnelGroup as THREE.Group;

  // Clear existing cubes
  const oldRings = scene.userData.cubeRings as THREE.Group[];
  if (oldRings) {
    oldRings.forEach((ring) => {
      ring.children.forEach((child) => {
        if (child instanceof LineSegments2) {
          child.geometry.dispose();
          (child.material as LineMaterial).dispose();
        } else if (child instanceof THREE.InstancedMesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
      tunnelGroup.remove(ring);
    });
  }

  const cubeRings: THREE.Group[] = [];
  const ringSpacing = config.structure.cubeSize + config.structure.spacing;

  // Create cube geometry once and reuse
  const cubeGeometry = new THREE.BoxGeometry(
    config.structure.cubeSize,
    config.structure.cubeSize,
    config.structure.cubeSize,
  );

  // Create edge geometry for glowing edges using EdgesGeometry
  const edgesGeometry = new THREE.EdgesGeometry(cubeGeometry);

  // Calculate grid positions once (8 cubes in 3x3 grid with center empty)
  // Order them in a way that creates proper alternation when going around the ring
  const gridPositions: { x: number; y: number }[] = [];

  // Create positions in a clockwise order around the center for better alternation
  const positions = [
    { x: -1, y: -1 }, // bottom-left
    { x: 0, y: -1 }, // bottom-center
    { x: 1, y: -1 }, // bottom-right
    { x: 1, y: 0 }, // right-center
    { x: 1, y: 1 }, // top-right
    { x: 0, y: 1 }, // top-center
    { x: -1, y: 1 }, // top-left
    { x: -1, y: 0 }, // left-center
  ];

  positions.forEach(({ x, y }) => {
    gridPositions.push({
      x: x * (config.structure.cubeSize + config.structure.spacing),
      y: y * (config.structure.cubeSize + config.structure.spacing),
    });
  });

  const instanceCount = gridPositions.length; // 8 cubes per ring

  // Generate rings of cubes
  for (let ring = 0; ring < config.structure.tunnelDepth; ring++) {
    const ringGroup = new THREE.Group();

    // Position ring along Z axis (negative Z is forward into the tunnel)
    ringGroup.position.z = -ring * ringSpacing;

    // Create instances for each cube position
    for (let i = 0; i < instanceCount; i++) {
      const { x: posX, y: posY } = gridPositions[i];

      // Create LineSegments2 geometry from EdgesGeometry
      const lineGeometry = new LineSegmentsGeometry();

      // Convert EdgesGeometry positions to LineSegmentsGeometry format
      const positions = edgesGeometry.attributes.position.array;
      lineGeometry.setPositions(positions as Float32Array);

      // Determine color for this cube based on color mode
      let cubeColor = config.appearance.edgeColor;

      if (
        config.appearance.colorMode !== 'Single' &&
        config.appearance.colorPalette.length > 0
      ) {
        const paletteLength = config.appearance.colorPalette.length;

        switch (config.appearance.colorMode) {
          case 'Random':
            // Pick a random color from the palette
            cubeColor =
              config.appearance.colorPalette[
                Math.floor(Math.random() * paletteLength)
              ];
            break;

          case 'Alternating':
            // Alternate based on cube position (modulo)
            cubeColor = config.appearance.colorPalette[i % paletteLength];
            break;

          case 'Spiral':
            // Spiral pattern: combine ring number and position for rotation
            const spiralIndex = (ring + i) % paletteLength;
            cubeColor = config.appearance.colorPalette[spiralIndex];
            break;

          case 'Depth':
            // Each depth layer (ring) gets the next color in the palette
            cubeColor = config.appearance.colorPalette[ring % paletteLength];
            break;
        }
      }

      // Create glowing edge material with proper thickness support
      const emissiveColor = new THREE.Color(cubeColor);
      emissiveColor.multiplyScalar(config.edges.glowIntensity);

      const edgeMaterial = new LineMaterial({
        color: emissiveColor,
        linewidth: config.edges.edgeThickness, // in pixels
        resolution: new THREE.Vector2(1920, 1080), // Will be updated in draw
      });

      // Create the thick line segments
      const edges = new LineSegments2(lineGeometry, edgeMaterial);
      edges.position.set(posX, posY, 0);

      // Scale edges slightly larger than solid cubes to prevent z-fighting/clipping
      // Only needed in solid mode, but applied always for consistency
      edges.scale.setScalar(1.02);

      // Store the color in userData for later updates
      if (config.appearance.colorMode !== 'Single') {
        edges.userData.cubeColor = cubeColor;
      }

      ringGroup.add(edges);
    }

    // If in solid mode, create ONE instanced mesh for all 8 cubes in this ring
    if (config.appearance.renderMode === 'Solid') {
      // Create material with PBR properties (independent from edge color)
      const solidEmissive = new THREE.Color(config.material.solidEmissiveColor);
      solidEmissive.multiplyScalar(config.material.solidEmissiveIntensity);

      const cubeMaterial = new THREE.MeshStandardMaterial({
        color: config.material.solidCubeColor,
        metalness: config.material.metalness,
        roughness: config.material.roughness,
        emissive: solidEmissive,
        envMapIntensity: config.material.envMapIntensity,
      });

      // Create instanced mesh with 8 instances (one per cube position)
      const instancedMesh = new THREE.InstancedMesh(
        cubeGeometry,
        cubeMaterial,
        instanceCount,
      );

      // Set the transformation matrix for each instance
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < instanceCount; i++) {
        const { x: posX, y: posY } = gridPositions[i];
        matrix.setPosition(posX, posY, 0);
        instancedMesh.setMatrixAt(i, matrix);
      }

      instancedMesh.instanceMatrix.needsUpdate = true;
      ringGroup.add(instancedMesh);
    }

    cubeRings.push(ringGroup);
    tunnelGroup.add(ringGroup);
  }

  // Store references
  scene.userData.cubeRings = cubeRings;
  scene.userData.lastCubeSize = config.structure.cubeSize;
  scene.userData.lastSpacing = config.structure.spacing;
  scene.userData.lastTunnelDepth = config.structure.tunnelDepth;
  scene.userData.lastEdgeThickness = config.edges.edgeThickness;
  scene.userData.lastColorMode = config.appearance.colorMode;
  scene.userData.lastRenderMode = config.appearance.renderMode;
  scene.userData.lastColorPalette = [...config.appearance.colorPalette];
}

function generateLightCircle(scene: THREE.Scene, config: any) {
  const lightCircleGroup = scene.userData.lightCircleGroup as THREE.Group;

  // Clear existing lights
  while (lightCircleGroup.children.length > 0) {
    const child = lightCircleGroup.children[0];
    if (child instanceof THREE.PointLight) {
      child.removeFromParent();
    } else if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
      child.removeFromParent();
    } else {
      child.removeFromParent();
    }
  }

  // Only create lights if enabled and in solid mode
  if (
    !config.lighting.enableLights ||
    config.appearance.renderMode !== 'Solid'
  ) {
    scene.userData.lastEnableLights = config.lighting.enableLights;
    scene.userData.lastLightCount = config.lighting.lightCount;
    return;
  }

  // Get colors based on color mode
  const colors: string[] = [];
  if (config.appearance.colorMode === 'Single') {
    // For single mode, use the edge color for all lights
    for (let i = 0; i < config.lighting.lightCount; i++) {
      colors.push(config.appearance.edgeColor);
    }
  } else if (config.appearance.colorPalette.length > 0) {
    // For other modes, distribute palette colors evenly
    for (let i = 0; i < config.lighting.lightCount; i++) {
      const colorIndex = i % config.appearance.colorPalette.length;
      colors.push(config.appearance.colorPalette[colorIndex]);
    }
  } else {
    // Fallback to edge color if no palette
    for (let i = 0; i < config.lighting.lightCount; i++) {
      colors.push(config.appearance.edgeColor);
    }
  }

  // Create lights in a circle
  for (let i = 0; i < config.lighting.lightCount; i++) {
    const angle = (i / config.lighting.lightCount) * Math.PI * 2;
    const x = Math.cos(angle) * config.lighting.lightCircleRadius;
    const y = Math.sin(angle) * config.lighting.lightCircleRadius;

    // Create point light
    const pointLight = new THREE.PointLight(
      colors[i],
      config.lighting.lightIntensity,
      config.lighting.lightDistance,
    );
    pointLight.position.set(x, y, 0);
    lightCircleGroup.add(pointLight);

    // Create helper sphere to visualize the light (visible in debug mode)
    const helperGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const helperMaterial = new THREE.MeshBasicMaterial({
      color: colors[i],
      transparent: false,
    });
    const helperMesh = new THREE.Mesh(helperGeometry, helperMaterial);
    helperMesh.position.set(x, y, 0);
    helperMesh.visible = false; // Will be updated based on debugEnabled in draw3D
    lightCircleGroup.add(helperMesh);
  }

  // Position the light circle in front of the camera
  lightCircleGroup.position.z = -config.lighting.lightCircleDistance;

  // Store references
  scene.userData.lastEnableLights = config.lighting.enableLights;
  scene.userData.lastLightCount = config.lighting.lightCount;
  scene.userData.lightCount = config.lighting.lightCount;
}

// Helper function to get grid position for a cube index
function getGridPosition(
  index: number,
  cubeSize: number,
  spacing: number,
): { x: number; y: number } {
  // Same order as in generateTunnel function
  const positions = [
    { x: -1, y: -1 }, // 0: bottom-left (corner)
    { x: 0, y: -1 }, // 1: bottom-center
    { x: 1, y: -1 }, // 2: bottom-right (corner)
    { x: 1, y: 0 }, // 3: right-center
    { x: 1, y: 1 }, // 4: top-right (corner)
    { x: 0, y: 1 }, // 5: top-center
    { x: -1, y: 1 }, // 6: top-left (corner)
    { x: -1, y: 0 }, // 7: left-center
  ];

  const pos = positions[index];
  return {
    x: pos.x * (cubeSize + spacing),
    y: pos.y * (cubeSize + spacing),
  };
}

// Easing function for smooth animation
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default LightTunnel;
