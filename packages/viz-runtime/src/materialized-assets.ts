import type {
  VizMaterializedAsset,
  VizResolvedAsset,
} from "@viz-engine/contracts";

const getNumericMetadataValue = (
  metadata: Record<string, unknown> | undefined,
  key: string,
): number | undefined => {
  const value = metadata?.[key];
  return typeof value === "number" ? value : undefined;
};

const createOptionalAssetFields = (asset: VizResolvedAsset) => ({
  ...(asset.mimeType === undefined ? {} : { mimeType: asset.mimeType }),
  ...(asset.metadata === undefined ? {} : { metadata: asset.metadata }),
});

export const materializeVizResolvedAsset = (
  asset: VizResolvedAsset,
): VizMaterializedAsset => {
  if (asset.kind === "audio") {
    return {
      id: asset.id,
      kind: "audio",
      source: asset.source,
      ...createOptionalAssetFields(asset),
      audioSourceUri: asset.uri,
    };
  }

  if (asset.kind === "image") {
    const width = getNumericMetadataValue(asset.metadata, "width");
    const height = getNumericMetadataValue(asset.metadata, "height");

    return {
      id: asset.id,
      kind: "image",
      source: asset.source,
      ...createOptionalAssetFields(asset),
      imageSourceUri: asset.uri,
      ...(width === undefined ? {} : { width }),
      ...(height === undefined ? {} : { height }),
    };
  }

  if (asset.kind === "video") {
    const width = getNumericMetadataValue(asset.metadata, "width");
    const height = getNumericMetadataValue(asset.metadata, "height");

    return {
      id: asset.id,
      kind: "video",
      source: asset.source,
      ...createOptionalAssetFields(asset),
      videoSourceUri: asset.uri,
      ...(width === undefined ? {} : { width }),
      ...(height === undefined ? {} : { height }),
    };
  }

  return {
    id: asset.id,
    kind: "binary",
    source: asset.source,
    ...createOptionalAssetFields(asset),
    ...(asset.bytes === undefined ? {} : { bytes: asset.bytes }),
    binarySourceUri: asset.uri,
  };
};

export const materializeVizResolvedAssets = (
  resolvedAssets: VizResolvedAsset[],
): VizMaterializedAsset[] => {
  return resolvedAssets.map(materializeVizResolvedAsset);
};
