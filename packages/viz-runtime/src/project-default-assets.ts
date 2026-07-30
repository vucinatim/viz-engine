import type {
  VizComponentDefinition,
  VizProjectDocument,
} from "@viz-engine/contracts";

const clone = <T>(value: T): T => structuredClone(value);

export const applyVizComponentDefaultAssets = (
  project: VizProjectDocument,
  getComponent: (
    componentId: string,
  ) => VizComponentDefinition | undefined,
): VizProjectDocument => {
  const assetRefs = [...(project.assetRefs ?? [])];
  const knownAssetIds = new Set(assetRefs.map((asset) => asset.id));
  let changed = false;

  const layers = project.layers.map((layer) => {
    const component = getComponent(layer.componentId);
    const defaultInputs = (component?.inputs ?? []).filter(
      (input) => input.defaultAsset !== undefined,
    );

    if (defaultInputs.length === 0) {
      return layer;
    }

    const inputs = { ...(layer.inputs ?? {}) };
    const requiredAssetIds = new Set(layer.requiredAssetIds ?? []);
    let layerChanged = false;

    for (const input of defaultInputs) {
      const asset = input.defaultAsset!;

      if (inputs[input.key] === undefined) {
        if (!knownAssetIds.has(asset.id)) {
          assetRefs.push(clone(asset));
          knownAssetIds.add(asset.id);
          changed = true;
        }
        inputs[input.key] = {
          kind: "asset-ref",
          assetId: asset.id,
        };
        layerChanged = true;
        if (input.required && !requiredAssetIds.has(asset.id)) {
          requiredAssetIds.add(asset.id);
          layerChanged = true;
        }
      }
    }

    if (!layerChanged) {
      return layer;
    }

    changed = true;
    return {
      ...layer,
      inputs,
      requiredAssetIds: [...requiredAssetIds],
    };
  });

  if (!changed) {
    return project;
  }

  return {
    ...project,
    layers,
    assetRefs,
  };
};
