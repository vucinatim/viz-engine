import type {
  VizLayerRenderPlanEntry,
  VizRenderCircleNode,
  VizRenderGroupNode,
  VizRenderImageFitMode,
  VizMaterializedImageAsset,
  VizRenderImageNode,
  VizRenderNode,
  VizRenderPlan,
  VizRenderRectNode,
  VizRenderStyle,
  VizRenderTextNode,
  VizRenderTransform,
} from "@viz-engine/contracts";

const escapeAttribute = (value: string): string => {
  return value.replaceAll("&", "&amp;").replaceAll("\"", "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
};

const fitModeToPreserveAspectRatio = (fitMode: VizRenderImageFitMode | undefined): string => {
  if (fitMode === "fill") {
    return "none";
  }

  if (fitMode === "cover") {
    return "xMidYMid slice";
  }

  return "xMidYMid meet";
};

const createStyleAttribute = (style: VizRenderStyle | undefined): string => {
  if (!style) {
    return "";
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

  return styleEntries.length > 0 ? ` style="${escapeAttribute(styleEntries.join(";"))}"` : "";
};

const createTransformAttribute = (transform: VizRenderTransform | undefined): string => {
  if (!transform) {
    return "";
  }

  const transforms: string[] = [];

  if (transform.translateX !== undefined || transform.translateY !== undefined) {
    transforms.push(`translate(${transform.translateX ?? 0} ${transform.translateY ?? 0})`);
  }

  if (transform.scaleX !== undefined || transform.scaleY !== undefined) {
    transforms.push(`scale(${transform.scaleX ?? 1} ${transform.scaleY ?? 1})`);
  }

  if (transform.rotationDegrees !== undefined) {
    transforms.push(`rotate(${transform.rotationDegrees})`);
  }

  return transforms.length > 0 ? ` transform="${escapeAttribute(transforms.join(" "))}"` : "";
};

const renderRectNode = (node: VizRenderRectNode): string => {
  return `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}"${
    node.radius !== undefined ? ` rx="${node.radius}" ry="${node.radius}"` : ""
  }${createStyleAttribute(node.style)} />`;
};

const renderCircleNode = (node: VizRenderCircleNode): string => {
  return `<circle cx="${node.cx}" cy="${node.cy}" r="${node.r}"${createStyleAttribute(node.style)} />`;
};

const renderImageNode = (
  node: VizRenderImageNode,
  materializedImageAssets: ReadonlyMap<string, VizMaterializedImageAsset>,
): string => {
  const asset = materializedImageAssets.get(node.assetId);

  if (!asset) {
    return "";
  }

  return `<image href="${escapeAttribute(asset.imageSourceUri)}" x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" preserveAspectRatio="${fitModeToPreserveAspectRatio(node.fitMode)}"${createStyleAttribute(node.style)} />`;
};

const renderTextNode = (node: VizRenderTextNode): string => {
  const anchor =
    node.anchor === "middle"
      ? "middle"
      : node.anchor === "end"
        ? "end"
        : "start";
  const baseline =
    node.baseline === "middle"
      ? "middle"
      : node.baseline === "top"
        ? "hanging"
        : node.baseline === "bottom"
          ? "text-after-edge"
          : "alphabetic";
  const fontFamily = node.fontFamily ?? "sans-serif";
  const fontWeight = node.fontWeight ?? "normal";

  return `<text x="${node.x}" y="${node.y}" text-anchor="${anchor}" dominant-baseline="${baseline}" font-family="${escapeAttribute(fontFamily)}" font-size="${node.fontSize}" font-weight="${fontWeight}"${createStyleAttribute(node.style)}>${escapeAttribute(node.text)}</text>`;
};

const renderGroupNode = (
  node: VizRenderGroupNode,
  materializedImageAssets: ReadonlyMap<string, VizMaterializedImageAsset>,
): string => {
  const children = node.children
    .map((child) => renderVizRenderNode(child, materializedImageAssets))
    .join("");
  return `<g${createTransformAttribute(node.transform)}${createStyleAttribute(node.style)}>${children}</g>`;
};

export const renderVizRenderNode = (
  node: VizRenderNode,
  materializedImageAssets: ReadonlyMap<string, VizMaterializedImageAsset>,
): string => {
  if (node.kind === "rect") {
    return renderRectNode(node);
  }

  if (node.kind === "circle") {
    return renderCircleNode(node);
  }

  if (node.kind === "image") {
    return renderImageNode(node, materializedImageAssets);
  }

  if (node.kind === "text") {
    return renderTextNode(node);
  }

  if (node.kind === "shader" || node.kind === "three-program") {
    return "";
  }

  return renderGroupNode(node, materializedImageAssets);
};

const renderLayerNode = (
  layer: VizLayerRenderPlanEntry,
  materializedImageAssets: ReadonlyMap<string, VizMaterializedImageAsset>,
): string => {
  if (!layer.node) {
    return "";
  }

  return `<g data-layer-id="${escapeAttribute(layer.layerId)}">${renderVizRenderNode(layer.node, materializedImageAssets)}</g>`;
};

export const renderVizRenderPlanToSvgMarkup = (renderPlan: VizRenderPlan): string => {
  const materializedImageAssets = new Map(
    renderPlan.materializedAssets
      .filter((asset): asset is VizMaterializedImageAsset => asset.kind === "image")
      .map((asset) => [asset.id, asset]),
  );
  const layerMarkup = renderPlan.layers
    .map((layer) => renderLayerNode(layer, materializedImageAssets))
    .join("");
  const backgroundFill = renderPlan.viewport.backgroundColor ?? "#000000";
  const background = `<rect x="0" y="0" width="${renderPlan.viewport.width}" height="${renderPlan.viewport.height}" fill="${escapeAttribute(backgroundFill)}" />`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${renderPlan.viewport.width} ${renderPlan.viewport.height}" width="${renderPlan.viewport.width}" height="${renderPlan.viewport.height}" role="img" aria-label="Viz frame ${renderPlan.frameContext.frame}">${background}${layerMarkup}</svg>`;
};
