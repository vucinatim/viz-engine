import type {
  VizLayerRenderPlanEntry,
  VizMaterializedImageAsset,
  VizRenderCircleNode,
  VizRenderGroupNode,
  VizRenderImageFitMode,
  VizRenderImageNode,
  VizRenderNode,
  VizRenderPlan,
  VizRenderPointCloudNode,
  VizRenderPolygonNode,
  VizRenderPolylineNode,
  VizRenderRectNode,
  VizRenderStyle,
  VizRenderTextNode,
  VizRenderTransform,
} from '@viz-engine/contracts';

const escapeAttribute = (value: string): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
};

const fitModeToPreserveAspectRatio = (
  fitMode: VizRenderImageFitMode | undefined,
): string => {
  if (fitMode === 'fill') {
    return 'none';
  }

  if (fitMode === 'cover') {
    return 'xMidYMid slice';
  }

  return 'xMidYMid meet';
};

const createStyleAttribute = (style: VizRenderStyle | undefined): string => {
  if (!style) {
    return '';
  }

  const styleEntries: string[] = [];

  if (style.fill !== undefined) {
    styleEntries.push(`fill:${style.fill}`);
  }

  if (style.stroke !== undefined) {
    styleEntries.push(`stroke:${style.stroke}`);
  }

  if (style.strokeWidth !== undefined) {
    styleEntries.push(`stroke-width:${style.strokeWidth}`);
  }

  if (style.opacity !== undefined) {
    styleEntries.push(`opacity:${style.opacity}`);
  }

  if (style.blendMode !== undefined) {
    styleEntries.push(`mix-blend-mode:${style.blendMode}`);
  }

  return styleEntries.length > 0
    ? ` style="${escapeAttribute(styleEntries.join(';'))}"`
    : '';
};

const createTransformAttribute = (
  transform: VizRenderTransform | undefined,
): string => {
  if (!transform) {
    return '';
  }

  const transforms: string[] = [];

  if (
    transform.translateX !== undefined ||
    transform.translateY !== undefined
  ) {
    transforms.push(
      `translate(${transform.translateX ?? 0} ${transform.translateY ?? 0})`,
    );
  }

  if (transform.scaleX !== undefined || transform.scaleY !== undefined) {
    transforms.push(`scale(${transform.scaleX ?? 1} ${transform.scaleY ?? 1})`);
  }

  if (transform.rotationDegrees !== undefined) {
    transforms.push(`rotate(${transform.rotationDegrees})`);
  }

  return transforms.length > 0
    ? ` transform="${escapeAttribute(transforms.join(' '))}"`
    : '';
};

const renderRectNode = (node: VizRenderRectNode): string => {
  return `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}"${
    node.radius !== undefined ? ` rx="${node.radius}" ry="${node.radius}"` : ''
  }${createStyleAttribute(node.style)} />`;
};

const renderCircleNode = (node: VizRenderCircleNode): string => {
  return `<circle cx="${node.cx}" cy="${node.cy}" r="${node.r}"${createStyleAttribute(node.style)} />`;
};

const renderPointCloudNode = (node: VizRenderPointCloudNode): string => {
  const style = createStyleAttribute(node.style);
  return node.points
    .map(
      (point) =>
        `<circle cx="${point.x}" cy="${point.y}" r="${node.radius}"${style} />`,
    )
    .join('');
};

const createSvgDefinitionId = (node: VizRenderPolygonNode): string => {
  const source =
    node.id ?? node.points.map((point) => `${point.x},${point.y}`).join('|');
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
  }
  const label = source.replaceAll(/[^\w-]/g, '-').slice(0, 48) || 'polygon';
  return `viz-gradient-${label}-${(hash >>> 0).toString(16)}`;
};

const renderPolygonNode = (node: VizRenderPolygonNode): string => {
  if (node.points.length < 3) {
    return '';
  }

  const points = escapeAttribute(
    node.points.map((point) => `${point.x},${point.y}`).join(' '),
  );
  if (!node.fillGradient || node.fillGradient.stops.length === 0) {
    return `<polygon points="${points}"${createStyleAttribute(node.style)} />`;
  }

  const gradientId = createSvgDefinitionId(node);
  const { from, to } = node.fillGradient;
  const stops = [...node.fillGradient.stops]
    .sort((left, right) => left.offset - right.offset)
    .map(
      (stop) =>
        `<stop offset="${Math.min(1, Math.max(0, stop.offset))}" stop-color="${escapeAttribute(stop.color)}"${
          stop.opacity === undefined
            ? ''
            : ` stop-opacity="${Math.min(1, Math.max(0, stop.opacity))}"`
        } />`,
    )
    .join('');
  const style = { ...node.style };
  delete style.fill;

  return `<defs><linearGradient id="${gradientId}" gradientUnits="userSpaceOnUse" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}">${stops}</linearGradient></defs><polygon points="${points}" fill="url(#${gradientId})"${createStyleAttribute(style)} />`;
};

const renderPolylineNode = (node: VizRenderPolylineNode): string => {
  if (node.points.length === 0) {
    return '';
  }

  const points = escapeAttribute(
    node.points.map((point) => `${point.x},${point.y}`).join(' '),
  );
  const lineCap = node.lineCap ?? 'butt';
  const lineJoin = node.lineJoin ?? 'miter';
  const strokeWidth = node.style?.strokeWidth ?? 1;
  const glow = node.glow;
  const glowMarkup = glow
    ? `<polyline points="${points}" fill="none" stroke="${escapeAttribute(glow.color)}" stroke-width="${strokeWidth + Math.max(0, glow.blur) * 2}" stroke-linecap="${lineCap}" stroke-linejoin="${lineJoin}" opacity="${glow.opacity ?? 0.18}" />`
    : '';

  return `${glowMarkup}<polyline points="${points}" fill="none" stroke-linecap="${lineCap}" stroke-linejoin="${lineJoin}"${createStyleAttribute(node.style)} />`;
};

const renderImageNode = (
  node: VizRenderImageNode,
  materializedImageAssets: ReadonlyMap<string, VizMaterializedImageAsset>,
): string => {
  const asset = materializedImageAssets.get(node.assetId);

  if (!asset) {
    return '';
  }

  return `<image href="${escapeAttribute(asset.imageSourceUri)}" x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" preserveAspectRatio="${fitModeToPreserveAspectRatio(node.fitMode)}"${createStyleAttribute(node.style)} />`;
};

const renderTextNode = (node: VizRenderTextNode): string => {
  const anchor =
    node.anchor === 'middle'
      ? 'middle'
      : node.anchor === 'end'
        ? 'end'
        : 'start';
  const baseline =
    node.baseline === 'middle'
      ? 'middle'
      : node.baseline === 'top'
        ? 'hanging'
        : node.baseline === 'bottom'
          ? 'text-after-edge'
          : 'alphabetic';
  const fontFamily = node.fontFamily ?? 'sans-serif';
  const fontWeight = node.fontWeight ?? 'normal';

  return `<text x="${node.x}" y="${node.y}" text-anchor="${anchor}" dominant-baseline="${baseline}" font-family="${escapeAttribute(fontFamily)}" font-size="${node.fontSize}" font-weight="${fontWeight}"${createStyleAttribute(node.style)}>${escapeAttribute(node.text)}</text>`;
};

const renderGroupNode = (
  node: VizRenderGroupNode,
  materializedImageAssets: ReadonlyMap<string, VizMaterializedImageAsset>,
): string => {
  const children = node.children
    .map((child) => renderVizRenderNode(child, materializedImageAssets))
    .join('');
  return `<g${createTransformAttribute(node.transform)}${createStyleAttribute(node.style)}>${children}</g>`;
};

export const renderVizRenderNode = (
  node: VizRenderNode,
  materializedImageAssets: ReadonlyMap<string, VizMaterializedImageAsset>,
): string => {
  if (node.kind === 'rect') {
    return renderRectNode(node);
  }

  if (node.kind === 'circle') {
    return renderCircleNode(node);
  }

  if (node.kind === 'point-cloud') {
    return renderPointCloudNode(node);
  }

  if (node.kind === 'polygon') {
    return renderPolygonNode(node);
  }

  if (node.kind === 'polyline') {
    return renderPolylineNode(node);
  }

  if (node.kind === 'image') {
    return renderImageNode(node, materializedImageAssets);
  }

  if (node.kind === 'text') {
    return renderTextNode(node);
  }

  if (node.kind === 'shader' || node.kind === 'three-program') {
    return '';
  }

  return renderGroupNode(node, materializedImageAssets);
};

const renderLayerNode = (
  layer: VizLayerRenderPlanEntry,
  materializedImageAssets: ReadonlyMap<string, VizMaterializedImageAsset>,
): string => {
  if (!layer.enabled || !layer.node) {
    return '';
  }

  const blendMode =
    layer.blendMode === 'add' ? 'plus-lighter' : layer.blendMode;
  const style = `opacity:${layer.opacity};mix-blend-mode:${blendMode}`;

  return `<g data-layer-id="${escapeAttribute(layer.layerId)}" style="${escapeAttribute(style)}">${renderVizRenderNode(layer.node, materializedImageAssets)}</g>`;
};

export const renderVizRenderPlanToSvgFragment = (
  renderPlan: VizRenderPlan,
): string => {
  const materializedImageAssets = new Map(
    renderPlan.materializedAssets
      .filter(
        (asset): asset is VizMaterializedImageAsset => asset.kind === 'image',
      )
      .map((asset) => [asset.id, asset]),
  );
  const layerMarkup = renderPlan.layers
    .map((layer) => renderLayerNode(layer, materializedImageAssets))
    .join('');
  const backgroundFill = renderPlan.viewport.backgroundColor ?? '#000000';
  const background = `<rect x="0" y="0" width="${renderPlan.viewport.width}" height="${renderPlan.viewport.height}" fill="${escapeAttribute(backgroundFill)}" />`;

  return `${background}${layerMarkup}`;
};

export const renderVizRenderPlanToSvgMarkup = (
  renderPlan: VizRenderPlan,
): string => {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${renderPlan.viewport.width} ${renderPlan.viewport.height}" width="${renderPlan.viewport.width}" height="${renderPlan.viewport.height}" role="img" aria-label="Viz frame ${renderPlan.frameContext.frame}">${renderVizRenderPlanToSvgFragment(renderPlan)}</svg>`;
};
