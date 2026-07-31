import type {
  VizComponentImplementation,
  VizRenderThreeProgramNode,
} from '@viz-engine/contracts';
import { simpleCubeAuthoring } from './authoring/simple-cube.js';
import { asNumber, asString } from './shared.js';

export const simpleCubeComponent: VizComponentImplementation = {
  id: 'simple-cube',
  name: 'Simple Cube',
  rendererFamily: 'three',
  description: 'A simple 3D cube visualization.',
  implementationVersion: '1.0.0',
  authoring: simpleCubeAuthoring,
  render: ({ frameContext, layer, settings }) => {
    const color = asString(settings.color, '#FF00FF');
    const size = Math.max(0.1, asNumber(settings.size, 1.5));
    const rotationSpeedX = asNumber(settings.rotationSpeedX, 1);
    const rotationSpeedY = asNumber(settings.rotationSpeedY, 1);

    return {
      kind: 'three-program',
      id: layer.id,
      programId: 'viz-core/simple-cube/v1',
      parameters: {
        color,
        size,
        rotationX: frameContext.timeInSeconds * rotationSpeedX,
        rotationY: frameContext.timeInSeconds * rotationSpeedY,
      },
    } satisfies VizRenderThreeProgramNode;
  },
};
