import * as THREE from 'three';
// Post-processing now handled at layer level
import { v } from '../config/config';
import { createComponent } from '../config/create-component';

// Import scene creation functions from playground
import { ShaderWallConfig } from '../../../playground/src/scene-config';
import { createBeams } from '../../../playground/src/scene/beams';
import { createBlinders } from '../../../playground/src/scene/blinders';
import { createCrowd } from '../../../playground/src/scene/crowd';
import { createDj } from '../../../playground/src/scene/dj';
import { createDebugHelpers } from '../../../playground/src/scene/helpers';
import { createLasers } from '../../../playground/src/scene/lasers';
import { createMovingLights } from '../../../playground/src/scene/moving-lights';
import { createShaderWall } from '../../../playground/src/scene/shader-wall';
import { createSpeakerStacks } from '../../../playground/src/scene/speakers';
import { createStage } from '../../../playground/src/scene/stage';
import { createStageLights } from '../../../playground/src/scene/stage-lights';
import { createStrobes } from '../../../playground/src/scene/strobes';
import { createWashLights } from '../../../playground/src/scene/wash-lights';

// Cinematic camera path definitions
const CINEMATIC_PATHS = {
  'Panoramic Sweep': [
    new THREE.Vector3(0, 65, 45),
    new THREE.Vector3(-80, 40, 100),
    new THREE.Vector3(0, 30, 130),
    new THREE.Vector3(80, 40, 100),
    new THREE.Vector3(20, 15, 25),
    new THREE.Vector3(0, 18, 60),
    new THREE.Vector3(-20, 20, 80),
    new THREE.Vector3(0, 65, 45),
  ],
  'Stage Circle': [
    new THREE.Vector3(0, 10, 30),
    new THREE.Vector3(25, 10, 15),
    new THREE.Vector3(35, 10, -10),
    new THREE.Vector3(25, 10, -25),
    new THREE.Vector3(0, 10, -30),
    new THREE.Vector3(-25, 10, -25),
    new THREE.Vector3(-35, 10, -10),
    new THREE.Vector3(-25, 10, 15),
    new THREE.Vector3(0, 10, 30),
  ],
  'Crowd Flyover': [
    new THREE.Vector3(0, 5, 20),
    new THREE.Vector3(-15, 8, 40),
    new THREE.Vector3(-10, 12, 60),
    new THREE.Vector3(0, 15, 80),
    new THREE.Vector3(10, 12, 60),
    new THREE.Vector3(15, 8, 40),
    new THREE.Vector3(0, 5, 20),
  ],
  'High Orbit': [
    new THREE.Vector3(0, 80, 80),
    new THREE.Vector3(60, 80, 40),
    new THREE.Vector3(80, 80, -20),
    new THREE.Vector3(40, 80, -60),
    new THREE.Vector3(-40, 80, -60),
    new THREE.Vector3(-80, 80, -20),
    new THREE.Vector3(-60, 80, 40),
    new THREE.Vector3(0, 80, 80),
  ],
};

type StageSceneState = {
  // Scene elements
  djBooth: THREE.Mesh | null;
  stageGeometry: THREE.BoxGeometry | null;
  shaderWall: THREE.Mesh | null;
  helpersGroup: THREE.Group | null;
  beamGroup: THREE.Group | null;
  djModel: THREE.Group | null;
  crowdMesh: THREE.InstancedMesh | null;

  // Accent lights
  light1: THREE.PointLight | null;
  light2: THREE.PointLight | null;
  djSpotLight: THREE.SpotLight | null;

  // Update functions
  updateStageLights: ((config: any) => void) | null;
  updateWashLights: ((config: any) => void) | null;
  updateMovingLights: ((time: number, config: any) => void) | null;
  updateLasers: ((time: number, config: any) => void) | null;
  updateBeams: ((time: number, config: any) => void) | null;
  updateStrobes: ((config: any) => void) | null;
  updateBlinders: ((config: any) => void) | null;
  updateShaderWall: ((time: number, config: ShaderWallConfig) => void) | null;
  updateShaderWallResolution: ((width: number, height: number) => void) | null;
  updateDj: ((delta: number) => void) | null;
  updateCrowd: ((delta: number) => void) | null;
  removeDj: (() => void) | null;
  removeCrowd: (() => void) | null;

  // Lights
  hemisphereLight: THREE.HemisphereLight | null;
  ambientLight: THREE.AmbientLight | null;

  // Post-processing (disabled for now - conflicts with layer renderer)
  // composer: EffectComposer | null;
  // bloomPass: UnrealBloomPass | null;

  // Track renderer size for resolution updates
  lastRendererWidth: number;
  lastRendererHeight: number;

  // Track previous config values for dynamic updates
  prevShowDj: boolean | null;
  prevCrowdCount: number | null;

  // Camera control state
  wasdModeActive: boolean;
  keysPressed: { [key: string]: boolean };
  onKeyDown: ((e: KeyboardEvent) => void) | null;
  onKeyUp: ((e: KeyboardEvent) => void) | null;
  onMouseMove: ((e: MouseEvent) => void) | null;
  onPointerLockChange: (() => void) | null;

  // Cinematic camera state
  cinematicPath: THREE.CatmullRomCurve3 | null;
  cinematicPosition: THREE.Vector3;
  cinematicLookAt: THREE.Vector3;
  prevCinematicPathName: string | null;

  // Timing
  elapsedTime: number;
};

const StageScene = createComponent({
  name: 'Stage Scene',
  description:
    'Full 3D EDM stage scene with lights, lasers, beams, and effects',
  config: v.config({
    camera: v.group(
      {
        label: 'Camera',
        description: 'Camera position and controls',
      },
      {
        position: v.vector3({
          label: 'Position',
          description: 'Camera position (X, Y, Z)',
          defaultValue: { x: 0, y: 8, z: 40 },
        }),
        rotation: v.vector3({
          label: 'Rotation',
          description: 'Camera rotation in radians (Pitch, Yaw, Roll)',
          defaultValue: { x: 0, y: 0, z: 0 },
        }),
        enterWasdMode: v.button({
          label: 'Fly Mode',
          buttonLabel: 'Enter Fly Mode (WASD)',
          description:
            'Click to enter interactive camera control. Use WASD to move, mouse to look around, Space/Shift for up/down. Press ESC to exit.',
          onPress: () => {
            // This will be handled in draw3D
          },
        }),
        moveSpeed: v.number({
          label: 'Move Speed',
          description: 'Movement speed in WASD mode',
          defaultValue: 20,
          min: 1,
          max: 100,
          step: 1,
        }),
        lookSpeed: v.number({
          label: 'Look Sensitivity',
          description: 'Mouse look sensitivity in WASD mode',
          defaultValue: 0.002,
          min: 0.0001,
          max: 0.01,
          step: 0.0001,
        }),
        cinematicMode: v.toggle({
          label: 'Cinematic Mode',
          description:
            'Enable automated camera animation along a predefined path',
          defaultValue: true,
        }),
        cinematicPath: v.select({
          label: 'Cinematic Path',
          description: 'Choose the camera animation path',
          defaultValue: 'Panoramic Sweep',
          options: Object.keys(CINEMATIC_PATHS),
        }),
        cinematicDuration: v.number({
          label: 'Loop Duration',
          description: 'Duration of one complete camera loop (seconds)',
          defaultValue: 60,
          min: 10,
          max: 300,
          step: 5,
        }),
        cinematicLookAt: v.vector3({
          label: 'Look At Target',
          description: 'Point where camera should look (usually stage center)',
          defaultValue: { x: 0, y: 5, z: 0 },
        }),
        cinematicLerpSpeed: v.number({
          label: 'Camera Smoothness',
          description:
            'How smoothly the camera follows the path (0.01 = very smooth, 1 = instant)',
          defaultValue: 0.05,
          min: 0.01,
          max: 1,
          step: 0.01,
        }),
      },
    ),
    shaderWall: v.group(
      {
        label: 'Shader Wall',
        description: 'Fractal visualizer wall',
      },
      {
        enabled: v.toggle({
          label: 'Enabled',
          description: 'Enable shader wall',
          defaultValue: true,
        }),
        scale: v.number({
          label: 'Scale',
          description: 'Fractal zoom/size (great for bass pulsing)',
          defaultValue: 2.0,
          min: 0.5,
          max: 4.0,
          step: 0.1,
        }),
        rotationSpeed: v.number({
          label: 'Rotation Speed',
          description: 'How fast it spins (great for hi-hats)',
          defaultValue: 1.0,
          min: 0,
          max: 3,
          step: 0.1,
        }),
        colorSpeed: v.number({
          label: 'Color Speed',
          description: 'How fast colors cycle',
          defaultValue: 1.0,
          min: 0,
          max: 3,
          step: 0.1,
        }),
        travelSpeed: v.number({
          label: 'Travel Speed',
          description: 'Tunnel movement speed',
          defaultValue: 1.0,
          min: 0,
          max: 3,
          step: 0.1,
        }),
        brightness: v.number({
          label: 'Brightness',
          description: 'Overall intensity (great for kick flashes)',
          defaultValue: 2.0,
          min: 0,
          max: 5,
          step: 0.1,
        }),
      },
    ),
    lighting: v.group(
      {
        label: 'Lighting',
        description: 'Global scene lighting',
      },
      {
        hemisphereIntensity: v.number({
          label: 'Hemisphere Light',
          description: 'Hemisphere light intensity',
          defaultValue: 2,
          min: 0,
          max: 5,
          step: 0.1,
        }),
        ambientIntensity: v.number({
          label: 'Ambient Light',
          description: 'Ambient light intensity',
          defaultValue: 1,
          min: 0,
          max: 5,
          step: 0.1,
        }),
      },
    ),
    postProcessing: v.group(
      {
        label: 'Post Processing',
        description: 'Bloom and post-processing effects',
      },
      {
        bloom: v.toggle({
          label: 'Bloom Enabled',
          description: 'Enable bloom effect',
          defaultValue: true,
        }),
        bloomStrength: v.number({
          label: 'Bloom Strength',
          description: 'Bloom effect strength',
          defaultValue: 0.5,
          min: 0,
          max: 3,
          step: 0.01,
        }),
        bloomRadius: v.number({
          label: 'Bloom Radius',
          description: 'Bloom effect radius',
          defaultValue: 0.8,
          min: 0,
          max: 1,
          step: 0.01,
        }),
        bloomThreshold: v.number({
          label: 'Bloom Threshold',
          description: 'Bloom effect threshold',
          defaultValue: 0.6,
          min: 0,
          max: 1,
          step: 0.01,
        }),
      },
    ),
    lasers: v.group(
      {
        label: 'Lasers',
        description: 'Laser effects',
      },
      {
        enabled: v.toggle({
          label: 'Enabled',
          description: 'Enable lasers',
          defaultValue: true,
        }),
        mode: v.select({
          label: 'Mode',
          description: 'Laser pattern mode',
          defaultValue: 'auto',
          options: ['auto', '0', '1', '2', '3', '4'],
        }),
        colorMode: v.select({
          label: 'Color Mode',
          description: 'Single or multi-color mode',
          defaultValue: 'multi',
          options: ['multi', 'single'],
        }),
        singleColor: v.color({
          label: 'Color',
          description: 'Laser color (when in single mode)',
          defaultValue: '#ff0000',
        }),
        rotationSpeed: v.number({
          label: 'Speed',
          description: 'Rotation speed',
          defaultValue: 1.0,
          min: 0,
          max: 3,
          step: 0.1,
        }),
        maxConcurrentLasers: v.number({
          label: 'Max Active Lasers',
          description: 'Maximum number of lasers active at once',
          defaultValue: 12,
          min: 1,
          max: 12,
          step: 1,
        }),
      },
    ),
    movingLights: v.group(
      {
        label: 'Moving Lights',
        description: 'Moving head lights',
      },
      {
        enabled: v.toggle({
          label: 'Enabled',
          description: 'Enable moving lights',
          defaultValue: true,
        }),
        mode: v.select({
          label: 'Mode',
          description: 'Movement pattern mode',
          defaultValue: 'auto',
          options: ['auto', '0', '1', '2', '3', '4'],
        }),
        colorMode: v.select({
          label: 'Color Mode',
          description: 'Single or multi-color mode',
          defaultValue: 'multi',
          options: ['multi', 'single'],
        }),
        singleColor: v.color({
          label: 'Color',
          description: 'Light color (when in single mode)',
          defaultValue: '#ffffff',
        }),
        intensity: v.number({
          label: 'Intensity',
          description: 'Light intensity',
          defaultValue: 5.0,
          min: 0,
          max: 20,
          step: 0.1,
        }),
        speed: v.number({
          label: 'Speed',
          description: 'Movement speed',
          defaultValue: 1.0,
          min: 0,
          max: 3,
          step: 0.1,
        }),
      },
    ),
    beams: v.group(
      {
        label: 'Beams',
        description: 'Beam effects',
      },
      {
        enabled: v.toggle({
          label: 'Enabled',
          description: 'Enable beams',
          defaultValue: true,
        }),
        mode: v.select({
          label: 'Mode',
          description: 'Beam pattern mode',
          defaultValue: 'auto',
          options: ['auto', '0', '1', '2', '3', '4'],
        }),
        colorMode: v.select({
          label: 'Color Mode',
          description: 'Single or multi-color mode',
          defaultValue: 'multi',
          options: ['multi', 'single'],
        }),
        singleColor: v.color({
          label: 'Color',
          description: 'Beam color (when in single mode)',
          defaultValue: '#88aaff',
        }),
        intensity: v.number({
          label: 'Intensity',
          description: 'Beam intensity',
          defaultValue: 1.0,
          min: 0,
          max: 3,
          step: 0.1,
        }),
      },
    ),
    stageLights: v.group(
      {
        label: 'Stage Lights',
        description: 'Static stage lights',
      },
      {
        enabled: v.toggle({
          label: 'Enabled',
          description: 'Enable stage lights',
          defaultValue: true,
        }),
        color: v.color({
          label: 'Color',
          description: 'Stage light color',
          defaultValue: '#8888ff',
        }),
      },
    ),
    stageWash: v.group(
      {
        label: 'Stage Wash',
        description: 'Wash lights',
      },
      {
        enabled: v.toggle({
          label: 'Enabled',
          description: 'Enable wash lights',
          defaultValue: true,
        }),
        intensity: v.number({
          label: 'Intensity',
          description: 'Wash light intensity',
          defaultValue: 5.0,
          min: 0,
          max: 50,
          step: 0.5,
        }),
      },
    ),
    strobes: v.group(
      {
        label: 'Strobes',
        description: 'Strobe lights',
      },
      {
        enabled: v.toggle({
          label: 'Enabled',
          description: 'Enable strobes',
          defaultValue: true,
        }),
        intensity: v.number({
          label: 'Intensity',
          description: 'Strobe intensity (brightness)',
          defaultValue: 500,
          min: 0,
          max: 1000,
          step: 10,
        }),
        flashRate: v.number({
          label: 'Flash Rate',
          description: 'How often strobes flash (0 = never, 1 = constant)',
          defaultValue: 0.3,
          min: 0,
          max: 1,
          step: 0.01,
        }),
      },
    ),
    blinders: v.group(
      {
        label: 'Blinders',
        description: 'Blinder lights',
      },
      {
        enabled: v.toggle({
          label: 'Enabled',
          description: 'Enable blinders',
          defaultValue: true,
        }),
        mode: v.select({
          label: 'Mode',
          description: 'Random flicker or controlled by intensity',
          defaultValue: 'controlled',
          options: ['controlled', 'random'],
        }),
        intensity: v.number({
          label: 'Intensity',
          description: 'Blinder intensity (0-1), triggers above 0.3',
          defaultValue: 0,
          min: 0,
          max: 1,
          step: 0.01,
        }),
      },
    ),
    accentLights: v.group(
      {
        label: 'Accent Lights',
        description: 'Decorative accent lights',
      },
      {
        enabled: v.toggle({
          label: 'Enabled',
          description: 'Enable accent lights',
          defaultValue: true,
        }),
        light1Color: v.color({
          label: 'Light 1 Color',
          description: 'Color of first accent light',
          defaultValue: '#ff00ff',
        }),
        light2Color: v.color({
          label: 'Light 2 Color',
          description: 'Color of second accent light',
          defaultValue: '#00ffff',
        }),
        djSpotIntensity: v.number({
          label: 'DJ Spotlight',
          description: 'DJ spotlight intensity',
          defaultValue: 0.8,
          min: 0,
          max: 5,
          step: 0.1,
        }),
      },
    ),
    characters: v.group(
      {
        label: 'Characters',
        description: 'DJ and crowd settings',
      },
      {
        showDj: v.toggle({
          label: 'Show DJ',
          description: 'Show the DJ on stage',
          defaultValue: true,
        }),
        crowdCount: v.number({
          label: 'Crowd Count',
          description: 'Number of people in the crowd',
          defaultValue: 50,
          min: 0,
          max: 1000,
          step: 50,
        }),
      },
    ),
    debug: v.group(
      {
        label: 'Debug',
        description: 'Debug options',
      },
      {
        showHelpers: v.toggle({
          label: 'Show Helpers',
          description: 'Show debug helpers',
          defaultValue: false,
        }),
      },
    ),
  }),
  createState: (): StageSceneState => ({
    djBooth: null,
    stageGeometry: null,
    shaderWall: null,
    helpersGroup: null,
    beamGroup: null,
    djModel: null,
    crowdMesh: null,
    light1: null,
    light2: null,
    djSpotLight: null,
    updateStageLights: null,
    updateWashLights: null,
    updateMovingLights: null,
    updateLasers: null,
    updateBeams: null,
    updateStrobes: null,
    updateBlinders: null,
    updateShaderWall: null,
    updateShaderWallResolution: null,
    updateDj: null,
    updateCrowd: null,
    removeDj: null,
    removeCrowd: null,
    hemisphereLight: null,
    ambientLight: null,
    // composer: null,
    // bloomPass: null,
    lastRendererWidth: 0,
    lastRendererHeight: 0,
    prevShowDj: null,
    prevCrowdCount: null,
    wasdModeActive: false,
    keysPressed: {},
    onKeyDown: null,
    onKeyUp: null,
    onMouseMove: null,
    onPointerLockChange: null,
    cinematicPath: null,
    cinematicPosition: new THREE.Vector3(),
    cinematicLookAt: new THREE.Vector3(),
    prevCinematicPathName: null,
    elapsedTime: 0,
  }),
  defaultNetworks: {
    'blinders.intensity': 'hihat-adaptive',
    'beams.mode': 'beam-mode-melody-cycle',
    'beams.intensity': 'kick-bass-smooth-intensity',
    'strobes.flashRate': 'strobe-buildup-detector',
    'lasers.enabled': 'laser-high-energy-gate',
    'lasers.mode': 'laser-mode-section-cycle',
    'movingLights.mode': 'moving-lights-kick-cycle',
    'shaderWall.scale': 'shader-wall-bass-pulse',
    'shaderWall.brightness': 'shader-wall-kick-flash',
  },
  init3D: ({ threeCtx: { scene, camera, renderer }, state, config }) => {
    // Initialize renderer size tracking
    state.lastRendererWidth = renderer.domElement.width;
    state.lastRendererHeight = renderer.domElement.height;

    // Setup camera position and rotation
    camera.position.set(
      config.camera.position.x,
      config.camera.position.y,
      config.camera.position.z,
    );
    camera.rotation.set(
      config.camera.rotation.x,
      config.camera.rotation.y,
      config.camera.rotation.z,
    );
    camera.rotation.order = 'YXZ'; // Important for FPS-style controls

    // Setup WASD mode button callback
    const enterWasdModeBtn = config.camera.enterWasdMode as any;
    if (enterWasdModeBtn && enterWasdModeBtn.onPress) {
      enterWasdModeBtn.onPress = () => {
        state.wasdModeActive = true;
      };
    }

    // Initialize cinematic path
    const pathPoints =
      CINEMATIC_PATHS[
        config.camera.cinematicPath as keyof typeof CINEMATIC_PATHS
      ];
    if (pathPoints) {
      state.cinematicPath = new THREE.CatmullRomCurve3(pathPoints, true);
      state.prevCinematicPathName = config.camera.cinematicPath;
    }

    // Setup fog
    scene.fog = new THREE.FogExp2(0x000000, 0.008);

    // Setup lighting
    state.hemisphereLight = new THREE.HemisphereLight(
      0x8888ff,
      0xff8844,
      config.lighting.hemisphereIntensity,
    );
    scene.add(state.hemisphereLight);

    state.ambientLight = new THREE.AmbientLight(
      0xffffff,
      config.lighting.ambientIntensity,
    );
    scene.add(state.ambientLight);

    // Create scene elements
    const { djBooth, stageGeometry } = createStage(scene);
    state.djBooth = djBooth;
    state.stageGeometry = stageGeometry;

    const speakerBoxGeometry = new THREE.BoxGeometry(5, 3, 3);
    const {
      shaderWall,
      panelSize,
      panelSpacing,
      gridWidth,
      update: updateShaderWall,
      updateResolution: updateShaderWallResolution,
    } = createShaderWall(scene, speakerBoxGeometry, renderer);
    state.shaderWall = shaderWall;
    state.updateShaderWall = updateShaderWall;
    state.updateShaderWallResolution = updateShaderWallResolution;

    createSpeakerStacks(
      scene,
      panelSize,
      panelSpacing,
      gridWidth,
      speakerBoxGeometry,
    );

    const { update: updateStageLights } = createStageLights(
      scene,
      stageGeometry,
      djBooth,
      {
        enabled: config.stageLights.enabled,
        color: config.stageLights.color,
      },
    );
    state.updateStageLights = updateStageLights;

    const { update: updateWashLights } = createWashLights(scene, {
      enabled: config.stageWash.enabled,
      intensity: config.stageWash.intensity,
    });
    state.updateWashLights = updateWashLights;

    const { update: updateMovingLights } = createMovingLights(scene, {
      enabled: config.movingLights.enabled,
      mode:
        config.movingLights.mode === 'auto'
          ? 'auto'
          : (parseInt(config.movingLights.mode, 10) as 0 | 1 | 2 | 3 | 4),
      colorMode: config.movingLights.colorMode as 'single' | 'multi',
      singleColor: config.movingLights.singleColor,
      intensity: config.movingLights.intensity,
      speed: config.movingLights.speed,
    });
    state.updateMovingLights = updateMovingLights;

    const { update: updateLasers } = createLasers(scene, {
      enabled: config.lasers.enabled,
      mode:
        config.lasers.mode === 'auto'
          ? 'auto'
          : (parseInt(config.lasers.mode, 10) as 0 | 1 | 2 | 3 | 4),
      colorMode: config.lasers.colorMode as 'single' | 'multi',
      singleColor: config.lasers.singleColor,
      rotationSpeed: config.lasers.rotationSpeed,
      maxConcurrentLasers: config.lasers.maxConcurrentLasers,
    });
    state.updateLasers = updateLasers;

    const { beamGroup, update: updateBeams } = createBeams(scene, {
      enabled: config.beams.enabled,
      mode:
        config.beams.mode === 'auto'
          ? 'auto'
          : (parseInt(config.beams.mode, 10) as 0 | 1 | 2 | 3 | 4),
      colorMode: config.beams.colorMode as 'single' | 'multi',
      singleColor: config.beams.singleColor,
      intensity: config.beams.intensity,
    });
    state.beamGroup = beamGroup;
    state.updateBeams = updateBeams;

    const { update: updateStrobes } = createStrobes(scene, {
      enabled: config.strobes.enabled,
      intensity: config.strobes.intensity,
      flashRate: config.strobes.flashRate,
    });
    state.updateStrobes = updateStrobes;

    const { update: updateBlinders } = createBlinders(scene, {
      enabled: config.blinders.enabled,
      intensity: config.blinders.intensity,
      mode: config.blinders.mode as 'random' | 'controlled',
    });
    state.updateBlinders = updateBlinders;

    const { helpersGroup } = createDebugHelpers(scene);
    state.helpersGroup = helpersGroup;

    // Initialize DJ
    const djController = createDj(scene);
    state.updateDj = djController.update;
    state.removeDj = djController.remove;

    // Initialize crowd
    const crowdController = createCrowd(
      scene,
      config.debug.showHelpers,
      config.characters.crowdCount,
    );
    state.updateCrowd = crowdController.update;
    state.removeCrowd = crowdController.remove ?? null;

    // Store initial config values
    state.prevShowDj = config.characters.showDj;
    state.prevCrowdCount = config.characters.crowdCount;

    // Remove DJ initially if config says so
    if (!config.characters.showDj) {
      djController.remove();
      state.updateDj = null;
    }

    // Setup accent lights
    state.light1 = new THREE.PointLight(0xff00ff, 1.5, 100, 2);
    state.light1.position.set(-15, 10, 5);
    scene.add(state.light1);

    state.light2 = new THREE.PointLight(0x00ffff, 1.5, 100, 2);
    state.light2.position.set(15, 10, 5);
    scene.add(state.light2);

    state.djSpotLight = new THREE.SpotLight(
      0xffffff,
      0.8,
      200,
      Math.PI / 8,
      0.5,
      2,
    );
    state.djSpotLight.position.set(0, 40, 0);
    state.djSpotLight.target = djBooth;
    scene.add(state.djSpotLight);
    scene.add(state.djSpotLight.target);
  },
  draw3D: ({ threeCtx: { renderer, scene, camera }, state, config, dt }) => {
    // === WASD CAMERA CONTROL MODE ===
    // Handle WASD mode activation (triggered by button press)
    if (state.wasdModeActive && !state.onKeyDown) {
      // Setup event listeners for WASD mode
      state.onKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();

        // Only handle our control keys
        const controlKeys = ['w', 'a', 's', 'd', ' ', 'shift', 'escape'];
        if (controlKeys.includes(key)) {
          e.preventDefault();
          e.stopPropagation();
        }

        state.keysPressed[key] = true;

        // Exit on ESC
        if (e.key === 'Escape') {
          state.wasdModeActive = false;
        }
      };
      state.onKeyUp = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();

        // Only handle our control keys
        const controlKeys = ['w', 'a', 's', 'd', ' ', 'shift', 'escape'];
        if (controlKeys.includes(key)) {
          e.preventDefault();
          e.stopPropagation();
        }

        state.keysPressed[key] = false;
      };
      state.onMouseMove = (e: MouseEvent) => {
        if (document.pointerLockElement === renderer.domElement) {
          const movementX = e.movementX || 0;
          const movementY = e.movementY || 0;
          camera.rotation.y -= movementX * config.camera.lookSpeed;
          camera.rotation.x -= movementY * config.camera.lookSpeed;
          // Clamp pitch
          camera.rotation.x = Math.max(
            -Math.PI / 2,
            Math.min(Math.PI / 2, camera.rotation.x),
          );
        }
      };
      state.onPointerLockChange = () => {
        if (document.pointerLockElement !== renderer.domElement) {
          // Pointer lock was released (e.g., by pressing ESC)
          state.wasdModeActive = false;
        }
      };

      document.addEventListener('keydown', state.onKeyDown);
      document.addEventListener('keyup', state.onKeyUp);
      document.addEventListener('mousemove', state.onMouseMove);
      document.addEventListener('pointerlockchange', state.onPointerLockChange);

      // Request pointer lock
      renderer.domElement.requestPointerLock();
    } else if (!state.wasdModeActive && state.onKeyDown) {
      // Deactivate WASD mode and fully clean up
      // Cleanup event listeners
      if (state.onKeyDown)
        document.removeEventListener('keydown', state.onKeyDown);
      if (state.onKeyUp) document.removeEventListener('keyup', state.onKeyUp);
      if (state.onMouseMove)
        document.removeEventListener('mousemove', state.onMouseMove);
      if (state.onPointerLockChange)
        document.removeEventListener(
          'pointerlockchange',
          state.onPointerLockChange,
        );

      state.onKeyDown = null;
      state.onKeyUp = null;
      state.onMouseMove = null;
      state.onPointerLockChange = null;
      state.keysPressed = {};

      // Exit pointer lock
      if (document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock();
      }

      // Sync camera position/rotation back to config
      config.camera.position = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      };
      config.camera.rotation = {
        x: camera.rotation.x,
        y: camera.rotation.y,
        z: camera.rotation.z,
      };
    }

    // === CINEMATIC CAMERA MODE ===
    // Check if cinematic path changed and recreate curve
    if (config.camera.cinematicPath !== state.prevCinematicPathName) {
      const pathPoints =
        CINEMATIC_PATHS[
          config.camera.cinematicPath as keyof typeof CINEMATIC_PATHS
        ];
      if (pathPoints) {
        state.cinematicPath = new THREE.CatmullRomCurve3(pathPoints, true);
        state.prevCinematicPathName = config.camera.cinematicPath;
      }
    }

    // Apply camera movement based on active mode
    if (config.camera.cinematicMode && state.cinematicPath) {
      // Cinematic mode takes priority over everything
      const progress =
        (state.elapsedTime % config.camera.cinematicDuration) /
        config.camera.cinematicDuration;

      // Get position along the curve
      state.cinematicPosition.copy(state.cinematicPath.getPointAt(progress));
      camera.position.lerp(
        state.cinematicPosition,
        config.camera.cinematicLerpSpeed,
      );

      // Look at the target with smooth lerping
      state.cinematicLookAt.set(
        config.camera.cinematicLookAt.x,
        config.camera.cinematicLookAt.y,
        config.camera.cinematicLookAt.z,
      );
      camera.lookAt(
        state.cinematicLookAt.lerp(camera.position, 0.95), // Slight offset for natural look
      );
    } else if (state.wasdModeActive) {
      // WASD mode (fly controls)
      const actualMoveSpeed = config.camera.moveSpeed * dt;
      if (state.keysPressed['w']) camera.translateZ(-actualMoveSpeed);
      if (state.keysPressed['s']) camera.translateZ(actualMoveSpeed);
      if (state.keysPressed['a']) camera.translateX(-actualMoveSpeed);
      if (state.keysPressed['d']) camera.translateX(actualMoveSpeed);
      if (state.keysPressed[' ']) camera.position.y += actualMoveSpeed;
      if (state.keysPressed['shift']) camera.position.y -= actualMoveSpeed;
    } else {
      // Manual camera position/rotation from config
      camera.position.set(
        config.camera.position.x,
        config.camera.position.y,
        config.camera.position.z,
      );
      camera.rotation.set(
        config.camera.rotation.x,
        config.camera.rotation.y,
        config.camera.rotation.z,
      );
    }

    // Update shader wall resolution if renderer size changed
    if (state.updateShaderWallResolution) {
      const currentWidth = renderer.domElement.width;
      const currentHeight = renderer.domElement.height;
      if (
        currentWidth !== state.lastRendererWidth ||
        currentHeight !== state.lastRendererHeight
      ) {
        state.updateShaderWallResolution(currentWidth, currentHeight);
        state.lastRendererWidth = currentWidth;
        state.lastRendererHeight = currentHeight;
      }
    }

    // Handle dynamic DJ visibility changes
    if (state.prevShowDj !== config.characters.showDj) {
      if (config.characters.showDj) {
        // Show DJ - recreate if needed
        if (state.removeDj) {
          state.removeDj();
        }
        const djController = createDj(scene);
        state.updateDj = djController.update;
        state.removeDj = djController.remove;
      } else {
        // Hide DJ
        if (state.removeDj) {
          state.removeDj();
          state.updateDj = null;
        }
      }
      state.prevShowDj = config.characters.showDj;
    }

    // Handle dynamic crowd count changes
    if (state.prevCrowdCount !== config.characters.crowdCount) {
      // Remove old crowd
      if (state.removeCrowd) {
        state.removeCrowd();
      }
      // Create new crowd with updated count
      const crowdController = createCrowd(
        scene,
        config.debug.showHelpers,
        config.characters.crowdCount,
      );
      state.updateCrowd = crowdController.update;
      state.removeCrowd = crowdController.remove ?? null;
      state.prevCrowdCount = config.characters.crowdCount;
    }

    // Track elapsed time
    state.elapsedTime += dt;
    const elapsedTime = state.elapsedTime;

    // Update lighting
    if (state.hemisphereLight) {
      state.hemisphereLight.intensity = config.lighting.hemisphereIntensity;
    }
    if (state.ambientLight) {
      state.ambientLight.intensity = config.lighting.ambientIntensity;
    }

    // Update all scene elements
    if (state.updateBeams) {
      state.updateBeams(elapsedTime, {
        enabled: config.beams.enabled,
        mode:
          config.beams.mode === 'auto'
            ? 'auto'
            : (parseInt(config.beams.mode, 10) as 0 | 1 | 2 | 3 | 4),
        colorMode: config.beams.colorMode as 'single' | 'multi',
        singleColor: config.beams.singleColor,
        intensity: config.beams.intensity,
      });
    }

    if (state.updateStageLights) {
      state.updateStageLights({
        enabled: config.stageLights.enabled,
        color: config.stageLights.color,
      });
    }

    if (state.updateWashLights) {
      state.updateWashLights({
        enabled: config.stageWash.enabled,
        intensity: config.stageWash.intensity,
      });
    }

    if (state.updateShaderWall) {
      state.updateShaderWall(elapsedTime, config.shaderWall);
    }

    if (state.updateLasers) {
      state.updateLasers(elapsedTime, {
        enabled: config.lasers.enabled,
        mode:
          config.lasers.mode === 'auto'
            ? 'auto'
            : (parseInt(config.lasers.mode, 10) as 0 | 1 | 2 | 3 | 4),
        colorMode: config.lasers.colorMode as 'single' | 'multi',
        singleColor: config.lasers.singleColor,
        rotationSpeed: config.lasers.rotationSpeed,
        maxConcurrentLasers: config.lasers.maxConcurrentLasers,
      });
    }

    if (state.updateMovingLights) {
      state.updateMovingLights(elapsedTime, {
        enabled: config.movingLights.enabled,
        mode:
          config.movingLights.mode === 'auto'
            ? 'auto'
            : (parseInt(config.movingLights.mode, 10) as 0 | 1 | 2 | 3 | 4),
        colorMode: config.movingLights.colorMode as 'single' | 'multi',
        singleColor: config.movingLights.singleColor,
        intensity: config.movingLights.intensity,
        speed: config.movingLights.speed,
      });
    }

    if (state.updateStrobes) {
      state.updateStrobes({
        enabled: config.strobes.enabled,
        intensity: config.strobes.intensity,
        flashRate: config.strobes.flashRate,
      });
    }

    if (state.updateBlinders) {
      state.updateBlinders({
        enabled: config.blinders.enabled,
        intensity: config.blinders.intensity,
        mode: config.blinders.mode as 'random' | 'controlled',
      });
    }

    // Update accent lights
    if (state.light1 && config.accentLights.enabled) {
      state.light1.visible = true;
      state.light1.color.set(config.accentLights.light1Color);
      state.light1.position.x = Math.sin(elapsedTime * 0.7) * 20;
      state.light1.position.z = Math.cos(elapsedTime * 0.7) * 10 - 5;
    } else if (state.light1) {
      state.light1.visible = false;
    }

    if (state.light2 && config.accentLights.enabled) {
      state.light2.visible = true;
      state.light2.color.set(config.accentLights.light2Color);
      state.light2.position.x = Math.sin(elapsedTime * 0.5) * -20;
      state.light2.position.z = Math.cos(elapsedTime * 0.5) * 10 - 5;
    } else if (state.light2) {
      state.light2.visible = false;
    }

    if (state.djSpotLight) {
      state.djSpotLight.intensity = config.accentLights.djSpotIntensity;
    }

    // Update debug helpers
    if (state.helpersGroup) {
      state.helpersGroup.visible = config.debug.showHelpers;
    }

    // Update DJ animation
    if (state.updateDj) {
      state.updateDj(dt);
    }

    // Update crowd animation
    if (state.updateCrowd) {
      state.updateCrowd(dt);
    }
  },
});

export default StageScene;
