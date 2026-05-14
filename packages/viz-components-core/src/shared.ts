import type {
  VizMaterializedAsset,
  VizMaterializedImageAsset,
} from "@viz-engine/contracts";

export const asNumber = (value: unknown, fallback: number): number => {
  return typeof value === "number" ? value : fallback;
};

export const asString = (value: unknown, fallback: string): string => {
  return typeof value === "string" && value.length > 0 ? value : fallback;
};

export const asMaterializedAsset = (value: unknown): VizMaterializedAsset | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  if (!("kind" in value) || typeof value.kind !== "string") {
    return undefined;
  }

  return value as VizMaterializedAsset;
};

export const asMaterializedImageAsset = (
  value: unknown,
): VizMaterializedImageAsset | undefined => {
  const asset = asMaterializedAsset(value);

  if (!asset || asset.kind !== "image" || typeof asset.imageSourceUri !== "string") {
    return undefined;
  }

  return asset;
};
