import type {
  VizFramePlan,
  VizMaterializedAsset,
  VizRenderNode,
  VizRenderPlan,
  VizResolvedInputValue,
} from '@viz-engine/contracts';

const roundNumber = (value: number): number => {
  return Number(value.toFixed(4));
};

const classifyUri = (uri: string | undefined): string | undefined => {
  if (!uri) {
    return undefined;
  }

  if (uri.startsWith('data:')) {
    return 'data-uri';
  }

  if (uri.startsWith('file:')) {
    return 'file-uri';
  }

  return 'uri';
};

const sortObject = (
  value: Record<string, unknown>,
): Record<string, unknown> => {
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => [key, normalizeUnknownValue(entryValue)]),
  );
};

const summarizeMaterializedAsset = (
  asset: VizMaterializedAsset,
): Record<string, unknown> => {
  const summary: Record<string, unknown> = {
    id: asset.id,
    kind: asset.kind,
    source: asset.source,
  };

  if (asset.mimeType !== undefined) {
    summary.mimeType = asset.mimeType;
  }

  if (asset.label !== undefined) {
    summary.label = asset.label;
  }

  if ('width' in asset && typeof asset.width === 'number') {
    summary.width = asset.width;
  }

  if ('height' in asset && typeof asset.height === 'number') {
    summary.height = asset.height;
  }

  if ('imageSourceUri' in asset) {
    summary.sourceUriKind = classifyUri(asset.imageSourceUri);
  } else if ('audioSourceUri' in asset) {
    summary.sourceUriKind = classifyUri(asset.audioSourceUri);
  } else if ('videoSourceUri' in asset) {
    summary.sourceUriKind = classifyUri(asset.videoSourceUri);
  } else if ('binarySourceUri' in asset) {
    summary.sourceUriKind = classifyUri(asset.binarySourceUri);
  }

  if (asset.metadata !== undefined) {
    summary.metadata = sortObject(asset.metadata);
  }

  return summary;
};

const summarizeResolvedInputValue = (
  input: VizResolvedInputValue,
): Record<string, unknown> => {
  const summary: Record<string, unknown> = {
    key: input.key,
    sourceKind: input.sourceKind,
    status: input.status,
  };

  if (input.value !== undefined) {
    summary.value = normalizeUnknownValue(input.value);
  }

  if (input.message !== undefined) {
    summary.message = input.message;
  }

  return summary;
};

const summarizeRenderNode = (
  node: VizRenderNode | null | undefined,
): Record<string, unknown> | null => {
  if (node === null || node === undefined) {
    return null;
  }

  const base: Record<string, unknown> = {
    kind: node.kind,
  };

  if (node.id !== undefined) {
    base.id = node.id;
  }

  if ('transform' in node && node.transform !== undefined) {
    base.transform = normalizeUnknownValue(node.transform);
  }

  if ('style' in node && node.style !== undefined) {
    base.style = normalizeUnknownValue(node.style);
  }

  if (node.kind === 'group') {
    base.children = node.children.map((child) => summarizeRenderNode(child));
    return base;
  }

  if (node.kind === 'rect') {
    base.x = roundNumber(node.x);
    base.y = roundNumber(node.y);
    base.width = roundNumber(node.width);
    base.height = roundNumber(node.height);

    if (node.radius !== undefined) {
      base.radius = roundNumber(node.radius);
    }

    return base;
  }

  if (node.kind === 'circle') {
    base.cx = roundNumber(node.cx);
    base.cy = roundNumber(node.cy);
    base.r = roundNumber(node.r);
    return base;
  }

  if (node.kind === 'image') {
    base.assetId = node.assetId;
    base.x = roundNumber(node.x);
    base.y = roundNumber(node.y);
    base.width = roundNumber(node.width);
    base.height = roundNumber(node.height);

    if (node.fitMode !== undefined) {
      base.fitMode = node.fitMode;
    }

    return base;
  }

  return base;
};

export const normalizeUnknownValue = (value: unknown): unknown => {
  if (typeof value === 'number') {
    return roundNumber(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeUnknownValue(entry));
  }

  if (value && typeof value === 'object') {
    if (
      'id' in value &&
      'kind' in value &&
      ('imageSourceUri' in value ||
        'audioSourceUri' in value ||
        'videoSourceUri' in value ||
        'binarySourceUri' in value)
    ) {
      return summarizeMaterializedAsset(value as VizMaterializedAsset);
    }

    return sortObject(value as Record<string, unknown>);
  }

  return value;
};

export const summarizeFramePlan = (
  framePlan: VizFramePlan,
): Record<string, unknown> => {
  return {
    frameContext: normalizeUnknownValue(framePlan.frameContext),
    issues: framePlan.issues.map((issue) => normalizeUnknownValue(issue)),
    layers: framePlan.layers.map((layer) => ({
      layerId: layer.layerId,
      componentId: layer.componentId,
      ...(layer.componentName === undefined
        ? {}
        : { componentName: layer.componentName }),
      rendererFamily: layer.rendererFamily,
      enabled: layer.enabled,
      opacity: roundNumber(layer.opacity),
      blendMode: layer.blendMode,
      ...(layer.settings === undefined
        ? {}
        : { settings: normalizeUnknownValue(layer.settings) }),
      resolvedInputs: Object.fromEntries(
        Object.entries(layer.resolvedInputs)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, input]) => [key, summarizeResolvedInputValue(input)]),
      ),
    })),
  };
};

export const summarizeRenderPlan = (
  renderPlan: VizRenderPlan,
): Record<string, unknown> => {
  return {
    frameContext: normalizeUnknownValue(renderPlan.frameContext),
    viewport: normalizeUnknownValue(renderPlan.viewport),
    issues: renderPlan.issues.map((issue) => normalizeUnknownValue(issue)),
    materializedAssets: renderPlan.materializedAssets.map((asset) =>
      summarizeMaterializedAsset(asset),
    ),
    layers: renderPlan.layers.map((layer) => ({
      layerId: layer.layerId,
      componentId: layer.componentId,
      ...(layer.componentName === undefined
        ? {}
        : { componentName: layer.componentName }),
      rendererFamily: layer.rendererFamily,
      enabled: layer.enabled,
      opacity: roundNumber(layer.opacity),
      blendMode: layer.blendMode,
      ...(layer.settings === undefined
        ? {}
        : { settings: normalizeUnknownValue(layer.settings) }),
      resolvedInputs: Object.fromEntries(
        Object.entries(layer.resolvedInputs)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, input]) => [key, summarizeResolvedInputValue(input)]),
      ),
      node: summarizeRenderNode(layer.node),
    })),
  };
};
