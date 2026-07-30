import {
  defineVizComponentAuthoring,
  field,
  settingCondition,
  v,
} from './schema.js';

const shapeSettings = ({
  label,
  path,
  defaultShape,
  description,
  rotationRange,
}: {
  label: string;
  path: string;
  defaultShape: string;
  description: string;
  rotationRange: readonly [number, number, number];
}) => {
  const whenShapeIs = (shape: string) =>
    settingCondition(`${path}.shape`, 'equals', shape);

  return field.group(label, undefined, {
    shape: field.select(
      'Shape',
      defaultShape,
      ['cube', 'pyramid', 'model', 'custom-text'],
      description,
    ),
    textFontUrl: field.text(
      'Font URL (.ttf)',
      '',
      'Optional TTF font URL (CORS-enabled, e.g., Google Fonts TTF) for custom text',
      { visibleWhen: whenShapeIs('custom-text') },
    ),
    modelUrl: field.file(
      'Model (.glb/.gltf)',
      '',
      ['.glb', '.gltf'],
      'Path or URL when shape is set to model',
      whenShapeIs('model'),
    ),
    text: field.text('Custom Text', '', 'Shown when shape is custom-text', {
      visibleWhen: whenShapeIs('custom-text'),
    }),
    textSize: field.number(
      'Text Size',
      1,
      [0.1, 10, 0.1],
      'Font size of 3D text',
      { visibleWhen: whenShapeIs('custom-text') },
    ),
    textDepth: field.number(
      'Text Depth',
      0.2,
      [0.01, 2, 0.01],
      'Extrusion depth of 3D text',
      { visibleWhen: whenShapeIs('custom-text') },
    ),
    position: field.vector3(
      'Position',
      { x: 0, y: 0, z: 0 },
      [-10, 10, 0.01],
      'Offset in world units',
    ),
    rotation: field.vector3(
      'Rotation (deg)',
      { x: 0, y: 0, z: 0 },
      rotationRange,
      'Euler rotation in degrees',
    ),
  });
};

export const morphShapesAuthoring = defineVizComponentAuthoring({
  componentId: 'morph-shapes',
  compatibility: 'render-safe',
  config: v.config({
    morphT: field.number('Morph', 0, [0, 1, 0.01], 'Morph between shapes'),
    explosionShift: field.number(
      'Explosion Shift',
      0,
      [0, 100, 0.1],
      'Explode outward along normals',
    ),
    animationSpeed: field.number(
      'Animation Speed',
      0.08,
      [0.01, 0.2, 0.01],
      'Follow speed toward target',
    ),
    color: field.color('Color', 'rgb(0, 200, 255)', 'Instance color'),
    gridSize: field.number(
      'Grid Size',
      5,
      [1, 100, 1],
      'Instance resolution of cube frame',
    ),
    modelPointCount: field.number(
      'Model Points',
      15000,
      [1, 60000, 10],
      'Number of points for model shapes',
    ),
    modelEvenness: field.number(
      'Evenness',
      0.7,
      [0.2, 1.0, 0.05],
      'Higher values push points apart more (blue-noise sampling)',
    ),
    sphereSize: field.number(
      'Sphere Size',
      0.15,
      [0.01, 1.0, 0.01],
      'Radius of each sphere instance',
    ),
    additiveGlow: field.toggle(
      'Additive Glow',
      false,
      'Use additive blending and disable depth for glowy look',
    ),
    glowIntensity: field.number(
      'Glow Intensity',
      1.0,
      [0.2, 5.0, 0.1],
      'Boost factor for glow (emissive simulation)',
    ),
    rotation: field.group('Rotation', 'Rotate the whole shape', {
      axis: field.vector3(
        'Axis',
        { x: 0, y: 1, z: 0 },
        [-1, 1, 0.01],
        'Rotation axis as a vector',
      ),
      speed: field.number(
        'Speed',
        0.5,
        [-5, 5, 0.01],
        'Angular speed (radians/sec)',
      ),
    }),
    shapeASettings: shapeSettings({
      label: 'Shape A Settings',
      path: 'shapeASettings',
      defaultShape: 'cube',
      description: 'Starting shape',
      rotationRange: [-360, 360, 0.1],
    }),
    shapeBSettings: shapeSettings({
      label: 'Shape B Settings',
      path: 'shapeBSettings',
      defaultShape: 'pyramid',
      description: 'Target shape',
      rotationRange: [-180, 180, 0.1],
    }),
  }),
});
