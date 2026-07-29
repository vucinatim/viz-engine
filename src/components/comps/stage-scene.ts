import { v } from '../config/config';
import { createComponent } from '../config/create-component';

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
            // Interactive fly mode is installed by the editor host.
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
          options: [
            'Panoramic Sweep',
            'Stage Circle',
            'Crowd Flyover',
            'High Orbit',
          ],
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
          defaultValue: 3.0,
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
          options: ['auto', '0', '1', '2', '3', '4', '5', '6'],
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
    overheadBlinder: v.group(
      {
        label: 'Overhead Blinder',
        description: 'White flood light from above for drops',
      },
      {
        enabled: v.toggle({
          label: 'Enabled',
          description: 'Enable overhead blinder',
          defaultValue: true,
        }),
        intensity: v.number({
          label: 'Intensity',
          description: 'Overhead blinder intensity (0 = off)',
          defaultValue: 0,
          min: 0,
          max: 200,
          step: 1,
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
  defaultNetworks: {
    'blinders.intensity': 'hihat-adaptive',
    'beams.mode': 'beam-mode-melody-cycle',
    'beams.intensity': 'kick-bass-smooth-intensity',
    'strobes.flashRate': 'strobe-buildup-detector',
    'lasers.enabled': 'laser-high-energy-gate',
    'lasers.mode': 'laser-mode-section-cycle',
    'movingLights.mode': 'moving-lights-kick-cycle',
    'shaderWall.scale': 'shader-wall-bass-pulse',
    'shaderWall.rotationSpeed': 'shader-wall-rotation-kick-vocal',
    'shaderWall.travelSpeed': 'shader-wall-travel-snare-cycle',
    'stageLights.color': 'stage-lights-snare-color-cycle',
    'shaderWall.brightness': 'shader-wall-kick-flash',
    'overheadBlinder.intensity': 'overhead-blinder-big-impact',
  },
});

export default StageScene;
