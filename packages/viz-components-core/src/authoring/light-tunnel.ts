import {
  allSettingConditions,
  defineVizComponentAuthoring,
  settingCondition,
  v,
} from './schema.js';

export const lightTunnelAuthoring = defineVizComponentAuthoring({
  componentId: 'light-tunnel',
  compatibility: 'render-safe',
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
          visibleWhen: settingCondition(
            'appearance.colorMode',
            'equals',
            'Single',
          ),
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
          visibleWhen: settingCondition(
            'appearance.colorMode',
            'not-equals',
            'Single',
          ),
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
          visibleWhen: settingCondition(
            'appearance.renderMode',
            'equals',
            'Solid',
          ),
        }),
        solidEmissiveColor: v.color({
          label: 'Emissive Color',
          description: 'Glow color of the solid cube material',
          defaultValue: 'rgb(0, 0, 0)',
          visibleWhen: settingCondition(
            'appearance.renderMode',
            'equals',
            'Solid',
          ),
        }),
        solidEmissiveIntensity: v.number({
          label: 'Emissive Intensity',
          description: 'How much the solid material glows',
          defaultValue: 0,
          min: 0,
          max: 1,
          step: 0.05,
          visibleWhen: settingCondition(
            'appearance.renderMode',
            'equals',
            'Solid',
          ),
        }),
        metalness: v.number({
          label: 'Metalness',
          description: 'How metallic the material appears',
          defaultValue: 0.7,
          min: 0,
          max: 1,
          step: 0.05,
          visibleWhen: settingCondition(
            'appearance.renderMode',
            'equals',
            'Solid',
          ),
        }),
        roughness: v.number({
          label: 'Roughness',
          description: 'How rough/smooth the material surface is',
          defaultValue: 0.77,
          min: 0,
          max: 1,
          step: 0.01,
          visibleWhen: settingCondition(
            'appearance.renderMode',
            'equals',
            'Solid',
          ),
        }),
        envMapIntensity: v.number({
          label: 'Environment Reflection',
          description: 'Intensity of environment reflections',
          defaultValue: 0,
          min: 0,
          max: 5,
          step: 0.1,
          visibleWhen: settingCondition(
            'appearance.renderMode',
            'equals',
            'Solid',
          ),
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
          visibleWhen: settingCondition(
            'appearance.renderMode',
            'equals',
            'Solid',
          ),
        }),
        lightCount: v.number({
          label: 'Light Count',
          description: 'Number of lights in the circle',
          defaultValue: 6,
          min: 3,
          max: 16,
          step: 1,
          visibleWhen: allSettingConditions(
            settingCondition('appearance.renderMode', 'equals', 'Solid'),
            settingCondition('lighting.enableLights', 'equals', true),
          ),
        }),
        lightCircleRadius: v.number({
          label: 'Circle Radius',
          description: 'Radius of the light circle',
          defaultValue: 7,
          min: 0.2,
          max: 7,
          step: 0.1,
          visibleWhen: allSettingConditions(
            settingCondition('appearance.renderMode', 'equals', 'Solid'),
            settingCondition('lighting.enableLights', 'equals', true),
          ),
        }),
        lightCircleDistance: v.number({
          label: 'Circle Distance',
          description: 'Distance of light circle from camera (into tunnel)',
          defaultValue: 7,
          min: 0.5,
          max: 10,
          step: 0.5,
          visibleWhen: allSettingConditions(
            settingCondition('appearance.renderMode', 'equals', 'Solid'),
            settingCondition('lighting.enableLights', 'equals', true),
          ),
        }),
        lightIntensity: v.number({
          label: 'Light Intensity',
          description: 'Intensity of the point lights',
          defaultValue: 100,
          min: 0,
          max: 100,
          step: 1,
          visibleWhen: allSettingConditions(
            settingCondition('appearance.renderMode', 'equals', 'Solid'),
            settingCondition('lighting.enableLights', 'equals', true),
          ),
        }),
        lightDistance: v.number({
          label: 'Light Distance',
          description: 'Maximum distance of light effect',
          defaultValue: 100,
          min: 1,
          max: 100,
          step: 5,
          visibleWhen: allSettingConditions(
            settingCondition('appearance.renderMode', 'equals', 'Solid'),
            settingCondition('lighting.enableLights', 'equals', true),
          ),
        }),
        lightRotationSpeed: v.number({
          label: 'Rotation Speed',
          description: 'Speed of light circle rotation (clockwise)',
          defaultValue: 0.15,
          min: 0,
          max: 2,
          step: 0.05,
          visibleWhen: allSettingConditions(
            settingCondition('appearance.renderMode', 'equals', 'Solid'),
            settingCondition('lighting.enableLights', 'equals', true),
          ),
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
});
