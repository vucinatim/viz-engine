import { defineVizComponentAuthoring, field, v } from './schema.js';

export const stageSceneAuthoring = defineVizComponentAuthoring({
  componentId: 'stage-scene',
  compatibility: 'render-safe',
  config: v.config({
    camera: field.group('Camera', 'Camera position and controls', {
      position: field.vector3(
        'Position',
        { x: 0, y: 8, z: 40 },
        undefined,
        'Camera position (X, Y, Z)',
      ),
      rotation: field.vector3(
        'Rotation',
        { x: 0, y: 0, z: 0 },
        undefined,
        'Camera rotation in radians (Pitch, Yaw, Roll)',
      ),
      enterWasdMode: v.action({
        label: 'Fly Mode',
        buttonLabel: 'Enter Fly Mode (WASD)',
        description:
          'Click to enter interactive camera control. Use WASD to move, mouse to look around, Space/Shift for up/down. Press ESC to exit.',
        actionId: 'stage.enter-fly-mode',
      }),
      moveSpeed: field.number(
        'Move Speed',
        20,
        [1, 100, 1],
        'Movement speed in WASD mode',
      ),
      lookSpeed: field.number(
        'Look Sensitivity',
        0.002,
        [0.0001, 0.01, 0.0001],
        'Mouse look sensitivity in WASD mode',
      ),
      cinematicMode: field.toggle(
        'Cinematic Mode',
        true,
        'Enable automated camera animation along a predefined path',
      ),
      cinematicPath: field.select(
        'Cinematic Path',
        'Panoramic Sweep',
        ['Panoramic Sweep', 'Stage Circle', 'Crowd Flyover', 'High Orbit'],
        'Choose the camera animation path',
      ),
      cinematicDuration: field.number(
        'Loop Duration',
        60,
        [10, 300, 5],
        'Duration of one complete camera loop (seconds)',
      ),
      cinematicLookAt: field.vector3(
        'Look At Target',
        { x: 0, y: 5, z: 0 },
        undefined,
        'Point where camera should look (usually stage center)',
      ),
      cinematicLerpSpeed: field.number(
        'Camera Smoothness',
        0.05,
        [0.01, 1, 0.01],
        'How smoothly the camera follows the path (0.01 = very smooth, 1 = instant)',
      ),
    }),
    shaderWall: field.group('Shader Wall', 'Fractal visualizer wall', {
      enabled: field.toggle('Enabled', true, 'Enable shader wall'),
      scale: field.number(
        'Scale',
        2.0,
        [0.5, 4.0, 0.1],
        'Fractal zoom/size (great for bass pulsing)',
      ),
      rotationSpeed: field.number(
        'Rotation Speed',
        1.0,
        [0, 3, 0.1],
        'How fast it spins (great for hi-hats)',
      ),
      colorSpeed: field.number(
        'Color Speed',
        3.0,
        [0, 3, 0.1],
        'How fast colors cycle',
      ),
      travelSpeed: field.number(
        'Travel Speed',
        1.0,
        [0, 3, 0.1],
        'Tunnel movement speed',
      ),
      brightness: field.number(
        'Brightness',
        2.0,
        [0, 5, 0.1],
        'Overall intensity (great for kick flashes)',
      ),
    }),
    lighting: field.group('Lighting', 'Global scene lighting', {
      hemisphereIntensity: field.number(
        'Hemisphere Light',
        2,
        [0, 5, 0.1],
        'Hemisphere light intensity',
      ),
      ambientIntensity: field.number(
        'Ambient Light',
        1,
        [0, 5, 0.1],
        'Ambient light intensity',
      ),
    }),
    postProcessing: field.group(
      'Post Processing',
      'Bloom and post-processing effects',
      {
        bloom: field.toggle('Bloom Enabled', true, 'Enable bloom effect'),
        bloomStrength: field.number(
          'Bloom Strength',
          0.5,
          [0, 3, 0.01],
          'Bloom effect strength',
        ),
        bloomRadius: field.number(
          'Bloom Radius',
          0.8,
          [0, 1, 0.01],
          'Bloom effect radius',
        ),
        bloomThreshold: field.number(
          'Bloom Threshold',
          0.6,
          [0, 1, 0.01],
          'Bloom effect threshold',
        ),
      },
    ),
    lasers: field.group('Lasers', 'Laser effects', {
      enabled: field.toggle('Enabled', true, 'Enable lasers'),
      mode: field.select(
        'Mode',
        'auto',
        ['auto', '0', '1', '2', '3', '4'],
        'Laser pattern mode',
      ),
      colorMode: field.select(
        'Color Mode',
        'multi',
        ['multi', 'single'],
        'Single or multi-color mode',
      ),
      singleColor: field.color(
        'Color',
        '#ff0000',
        'Laser color (when in single mode)',
      ),
      rotationSpeed: field.number('Speed', 1.0, [0, 3, 0.1], 'Rotation speed'),
      maxConcurrentLasers: field.number(
        'Max Active Lasers',
        12,
        [1, 12, 1],
        'Maximum number of lasers active at once',
      ),
    }),
    movingLights: field.group('Moving Lights', 'Moving head lights', {
      enabled: field.toggle('Enabled', true, 'Enable moving lights'),
      mode: field.select(
        'Mode',
        'auto',
        ['auto', '0', '1', '2', '3', '4'],
        'Movement pattern mode',
      ),
      colorMode: field.select(
        'Color Mode',
        'multi',
        ['multi', 'single'],
        'Single or multi-color mode',
      ),
      singleColor: field.color(
        'Color',
        '#ffffff',
        'Light color (when in single mode)',
      ),
      intensity: field.number(
        'Intensity',
        5.0,
        [0, 20, 0.1],
        'Light intensity',
      ),
      speed: field.number('Speed', 1.0, [0, 3, 0.1], 'Movement speed'),
    }),
    beams: field.group('Beams', 'Beam effects', {
      enabled: field.toggle('Enabled', true, 'Enable beams'),
      mode: field.select(
        'Mode',
        'auto',
        ['auto', '0', '1', '2', '3', '4', '5', '6'],
        'Beam pattern mode',
      ),
      colorMode: field.select(
        'Color Mode',
        'multi',
        ['multi', 'single'],
        'Single or multi-color mode',
      ),
      singleColor: field.color(
        'Color',
        '#88aaff',
        'Beam color (when in single mode)',
      ),
      intensity: field.number('Intensity', 1.0, [0, 3, 0.1], 'Beam intensity'),
    }),
    stageLights: field.group('Stage Lights', 'Static stage lights', {
      enabled: field.toggle('Enabled', true, 'Enable stage lights'),
      color: field.color('Color', '#8888ff', 'Stage light color'),
    }),
    stageWash: field.group('Stage Wash', 'Wash lights', {
      enabled: field.toggle('Enabled', true, 'Enable wash lights'),
      intensity: field.number(
        'Intensity',
        5.0,
        [0, 50, 0.5],
        'Wash light intensity',
      ),
    }),
    strobes: field.group('Strobes', 'Strobe lights', {
      enabled: field.toggle('Enabled', true, 'Enable strobes'),
      intensity: field.number(
        'Intensity',
        500,
        [0, 1000, 10],
        'Strobe intensity (brightness)',
      ),
      flashRate: field.number(
        'Flash Rate',
        0.3,
        [0, 1, 0.01],
        'How often strobes flash (0 = never, 1 = constant)',
      ),
    }),
    blinders: field.group('Blinders', 'Blinder lights', {
      enabled: field.toggle('Enabled', true, 'Enable blinders'),
      mode: field.select(
        'Mode',
        'controlled',
        ['controlled', 'random'],
        'Random flicker or controlled by intensity',
      ),
      intensity: field.number(
        'Intensity',
        0,
        [0, 1, 0.01],
        'Blinder intensity (0-1), triggers above 0.3',
      ),
    }),
    overheadBlinder: field.group(
      'Overhead Blinder',
      'White flood light from above for drops',
      {
        enabled: field.toggle('Enabled', true, 'Enable overhead blinder'),
        intensity: field.number(
          'Intensity',
          0,
          [0, 200, 1],
          'Overhead blinder intensity (0 = off)',
        ),
      },
    ),
    accentLights: field.group('Accent Lights', 'Decorative accent lights', {
      enabled: field.toggle('Enabled', true, 'Enable accent lights'),
      light1Color: field.color(
        'Light 1 Color',
        '#ff00ff',
        'Color of first accent light',
      ),
      light2Color: field.color(
        'Light 2 Color',
        '#00ffff',
        'Color of second accent light',
      ),
      djSpotIntensity: field.number(
        'DJ Spotlight',
        0.8,
        [0, 5, 0.1],
        'DJ spotlight intensity',
      ),
    }),
    characters: field.group('Characters', 'DJ and crowd settings', {
      showDj: field.toggle('Show DJ', true, 'Show the DJ on stage'),
      animationSpeed: field.number(
        'Animation Speed',
        1,
        [0, 4, 0.05],
        'Playback speed for the authored DJ and crowd animation',
      ),
      crowdCount: field.number(
        'Crowd Count',
        500,
        [0, 1000, 50],
        'Number of people in the crowd',
      ),
    }),
    debug: field.group('Debug', 'Debug options', {
      showHelpers: field.toggle('Show Helpers', false, 'Show debug helpers'),
    }),
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
