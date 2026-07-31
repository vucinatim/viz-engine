import type {
  VizComponentImplementation,
  VizRenderGroupNode,
  VizRenderImageNode,
  VizRenderRectNode,
} from '@viz-engine/contracts';
import { asMaterializedImageAsset, asNumber } from './shared.js';

export const coverImageComponent: VizComponentImplementation = {
  id: 'cover-image',
  name: 'Cover Image',
  rendererFamily: 'three',
  description:
    'Image-backed layer rendered through the shared asset input path.',
  inputs: [
    {
      key: 'image',
      label: 'Image Asset',
      supportedSources: ['asset-ref'],
      required: true,
    },
  ],
  render: ({ viewport, layer, settings, resolvedInputs }) => {
    const asset = asMaterializedImageAsset(resolvedInputs.image?.value);

    if (!asset) {
      return null;
    }

    const width = Math.min(
      viewport.width * 0.42,
      Math.max(240, asNumber(settings.width, 460)),
    );
    const height = Math.min(
      viewport.height * 0.42,
      Math.max(240, asNumber(settings.height, 460)),
    );
    const x = asNumber(settings.x, viewport.width * 0.08);
    const y = asNumber(settings.y, viewport.height * 0.13);

    const matteRect: VizRenderRectNode = {
      kind: 'rect',
      id: `${layer.id}-matte`,
      x: x - 18,
      y: y - 18,
      width: width + 36,
      height: height + 36,
      style: {
        fill: '#0a1824',
        opacity: 0.9,
      },
    };

    const imageNode: VizRenderImageNode = {
      kind: 'image',
      id: `${layer.id}-image`,
      assetId: asset.id,
      x,
      y,
      width,
      height,
      fitMode: 'cover',
      style: {
        opacity: 0.96,
      },
    };

    const rimRect: VizRenderRectNode = {
      kind: 'rect',
      id: `${layer.id}-rim`,
      x: x - 3,
      y: y - 3,
      width: width + 6,
      height: height + 6,
      style: {
        stroke: '#88f3ff',
        strokeWidth: 3,
        opacity: 0.55,
      },
    };

    return {
      kind: 'group',
      id: layer.id,
      children: [matteRect, imageNode, rimRect],
    } satisfies VizRenderGroupNode;
  },
};
