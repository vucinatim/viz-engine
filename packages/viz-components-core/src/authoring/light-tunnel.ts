import {
  allSettingConditions,
  defineVizComponentAuthoring,
  field,
  settingCondition,
  v,
} from './schema.js';

export const lightTunnelAuthoring = defineVizComponentAuthoring({
  componentId: 'light-tunnel',
  compatibility: 'render-safe',
  config: v.config({
    structure: field.group(
      'Tunnel Structure',
      'Physical dimensions and depth of the tunnel',
      {
        cubeSize: field.number(
          'Cube Size',
          2.5,
          [0.5, 3, 0.1],
          'Size of each cube',
        ),
        spacing: field.number(
          'Spacing',
          1.3,
          [1, 5, 0.1],
          'Space between cubes',
        ),
        tunnelDepth: field.number(
          'Tunnel Depth',
          13,
          [10, 40, 1],
          'Number of cube rings visible in the tunnel',
        ),
      },
    ),
    appearance: field.group(
      'Visual Style',
      'Rendering mode and color configuration',
      {
        renderMode: field.select(
          'Render Mode',
          'Solid',
          ['Hollow', 'Solid'],
          'Hollow (edges only) or Solid (edges + material)',
        ),
        colorMode: field.select(
          'Color Mode',
          'Alternating',
          ['Single', 'Random', 'Alternating', 'Spiral', 'Depth'],
          'How to color the cube edges',
        ),
        edgeColor: field.color(
          'Edge Color',
          '#00FFFF',
          'Color of the glowing edges',
          {
            visibleWhen: settingCondition(
              'appearance.colorMode',
              'equals',
              'Single',
            ),
          },
        ),
        colorPalette: v.list({
          label: 'Color Palette',
          description: 'List of colors to use for multi-color modes',
          defaultValue: ['#FF00FF', '#00FFFF'],
          itemConfig: field.color('Color', '#FFFFFF', 'A color in the palette'),
          visibleWhen: settingCondition(
            'appearance.colorMode',
            'not-equals',
            'Single',
          ),
        }),
      },
    ),
    edges: field.group(
      'Edge Appearance',
      'Glowing edge styling and thickness',
      {
        edgeThickness: field.number(
          'Edge Thickness',
          5.5,
          [1, 10, 0.5],
          'Thickness of the glowing edges',
        ),
        glowIntensity: field.number(
          'Glow Intensity',
          1.8,
          [0.5, 5, 0.1],
          'Intensity of the edge glow',
        ),
      },
    ),
    material: field.group(
      'Solid Material',
      'PBR material properties for solid cubes',
      {
        solidCubeColor: field.color(
          'Base Color',
          '#0a0a0a',
          'Base color of the solid cube material',
          {
            visibleWhen: settingCondition(
              'appearance.renderMode',
              'equals',
              'Solid',
            ),
          },
        ),
        solidEmissiveColor: field.color(
          'Emissive Color',
          'rgb(0, 0, 0)',
          'Glow color of the solid cube material',
          {
            visibleWhen: settingCondition(
              'appearance.renderMode',
              'equals',
              'Solid',
            ),
          },
        ),
        solidEmissiveIntensity: field.number(
          'Emissive Intensity',
          0,
          [0, 1, 0.05],
          'How much the solid material glows',
          {
            visibleWhen: settingCondition(
              'appearance.renderMode',
              'equals',
              'Solid',
            ),
          },
        ),
        metalness: field.number(
          'Metalness',
          0.7,
          [0, 1, 0.05],
          'How metallic the material appears',
          {
            visibleWhen: settingCondition(
              'appearance.renderMode',
              'equals',
              'Solid',
            ),
          },
        ),
        roughness: field.number(
          'Roughness',
          0.77,
          [0, 1, 0.01],
          'How rough/smooth the material surface is',
          {
            visibleWhen: settingCondition(
              'appearance.renderMode',
              'equals',
              'Solid',
            ),
          },
        ),
        envMapIntensity: field.number(
          'Environment Reflection',
          0,
          [0, 5, 0.1],
          'Intensity of environment reflections',
          {
            visibleWhen: settingCondition(
              'appearance.renderMode',
              'equals',
              'Solid',
            ),
          },
        ),
      },
    ),
    lighting: field.group(
      'Scene Lighting',
      'Rotating light circle in front of camera',
      {
        enableLights: field.toggle(
          'Enable Lights',
          true,
          'Add a rotating circle of colored lights in front of camera',
          {
            visibleWhen: settingCondition(
              'appearance.renderMode',
              'equals',
              'Solid',
            ),
          },
        ),
        lightCount: field.number(
          'Light Count',
          6,
          [3, 16, 1],
          'Number of lights in the circle',
          {
            visibleWhen: allSettingConditions(
              settingCondition('appearance.renderMode', 'equals', 'Solid'),
              settingCondition('lighting.enableLights', 'equals', true),
            ),
          },
        ),
        lightCircleRadius: field.number(
          'Circle Radius',
          7,
          [0.2, 7, 0.1],
          'Radius of the light circle',
          {
            visibleWhen: allSettingConditions(
              settingCondition('appearance.renderMode', 'equals', 'Solid'),
              settingCondition('lighting.enableLights', 'equals', true),
            ),
          },
        ),
        lightCircleDistance: field.number(
          'Circle Distance',
          7,
          [0.5, 10, 0.5],
          'Distance of light circle from camera (into tunnel)',
          {
            visibleWhen: allSettingConditions(
              settingCondition('appearance.renderMode', 'equals', 'Solid'),
              settingCondition('lighting.enableLights', 'equals', true),
            ),
          },
        ),
        lightIntensity: field.number(
          'Light Intensity',
          100,
          [0, 100, 1],
          'Intensity of the point lights',
          {
            visibleWhen: allSettingConditions(
              settingCondition('appearance.renderMode', 'equals', 'Solid'),
              settingCondition('lighting.enableLights', 'equals', true),
            ),
          },
        ),
        lightDistance: field.number(
          'Light Distance',
          100,
          [1, 100, 5],
          'Maximum distance of light effect',
          {
            visibleWhen: allSettingConditions(
              settingCondition('appearance.renderMode', 'equals', 'Solid'),
              settingCondition('lighting.enableLights', 'equals', true),
            ),
          },
        ),
        lightRotationSpeed: field.number(
          'Rotation Speed',
          0.15,
          [0, 2, 0.05],
          'Speed of light circle rotation (clockwise)',
          {
            visibleWhen: allSettingConditions(
              settingCondition('appearance.renderMode', 'equals', 'Solid'),
              settingCondition('lighting.enableLights', 'equals', true),
            ),
          },
        ),
      },
    ),
    animation: field.group('Animation', 'Movement and rotation speeds', {
      tunnelSpeed: field.number(
        'Tunnel Speed',
        0.5,
        [0, 3, 0.1],
        'Speed of movement through the tunnel',
      ),
      rotationSpeed: field.number(
        'Rotation Speed',
        0.05,
        [0, 2, 0.05],
        'Speed of tunnel rotation around its axis',
      ),
    }),
    wave: field.group(
      'Mexican Wave',
      'Outward wave animation for center cubes',
      {
        triggerWave: field.toggle(
          'Trigger Wave',
          false,
          'Fire a wave animation through the tunnel',
        ),
        waveSpeed: field.number(
          'Wave Speed',
          8.5,
          [0.5, 10, 0.5],
          'Speed at which the wave travels down the tunnel',
        ),
        waveAmplitude: field.number(
          'Wave Amplitude',
          1,
          [0.5, 5, 0.1],
          'How far cubes move outward from center',
        ),
        waveDuration: field.number(
          'Wave Duration',
          0.4,
          [0.2, 2, 0.1],
          'Duration of the wave animation per cube',
        ),
      },
    ),
    atmosphere: field.group('Atmosphere', 'Environmental fog effects', {
      fogDensity: field.number(
        'Fog Density',
        0.095,
        [0, 0.1, 0.005],
        'Density of fog effect for depth',
      ),
    }),
    postProcessing: field.group(
      'Post Processing',
      'Bloom and depth of field effects',
      {
        bloom: field.toggle('Bloom Enabled', true, 'Enable bloom glow effect'),
        bloomStrength: field.number(
          'Bloom Strength',
          0.5,
          [0, 3, 0.05],
          'Intensity of the bloom glow effect',
        ),
        bloomRadius: field.number(
          'Bloom Radius',
          0.8,
          [0, 1, 0.01],
          'Size of the bloom glow spread',
        ),
        bloomThreshold: field.number(
          'Bloom Threshold',
          0.1,
          [0, 1, 0.01],
          'Brightness threshold for bloom effect',
        ),
        depthOfField: field.toggle(
          'Depth of Field',
          false,
          'Enable cinematic shallow focus effect',
        ),
        dofFocus: field.number(
          'DOF Focus Distance',
          1,
          [1, 50, 0.5],
          'Distance where objects are in focus',
        ),
        dofAperture: field.number(
          'DOF Aperture',
          0.0011,
          [0.0001, 0.002, 0.0001],
          'Blur amount (lower = more blur)',
        ),
      },
    ),
  }),
  defaultNetworks: {
    'wave.triggerWave': 'neural-fire-on-kick',
  },
});
