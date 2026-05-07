import type {
  VizArtifactId,
  VizExecutionMode,
  VizFrameContext,
  VizProjectDocument,
  VizResolvedArtifact,
  VizResolvedAsset,
} from "@viz-engine/contracts";
import { createFrameContext } from "./frame-context";
import { assertValidProjectDocument } from "./validation";

export interface CreateVizRuntimeSessionOptions {
  project: VizProjectDocument;
  mode: VizExecutionMode;
  resolvedAssets?: VizResolvedAsset[];
  resolvedArtifacts?: VizResolvedArtifact[];
  seed?: string;
}

export interface VizRuntimeSession {
  readonly project: VizProjectDocument;
  readonly mode: VizExecutionMode;
  readonly seed: string;
  getFrameContext(frame: number): VizFrameContext;
  getOrderedLayers(): VizProjectDocument["layers"];
  getResolvedAssetMap(): ReadonlyMap<string, VizResolvedAsset>;
  getResolvedArtifactMap(): ReadonlyMap<VizArtifactId, VizResolvedArtifact>;
}

export const orderProjectLayers = (project: VizProjectDocument): VizProjectDocument["layers"] => {
  const layersById = new Map(project.layers.map((layer) => [layer.id, layer]));
  const orderedLayers = project.layerOrder
    .map((layerId) => layersById.get(layerId))
    .filter((layer): layer is VizProjectDocument["layers"][number] => Boolean(layer));

  for (const layer of project.layers) {
    if (project.layerOrder.includes(layer.id)) {
      continue;
    }

    orderedLayers.push(layer);
  }

  return orderedLayers;
};

export const createVizRuntimeSession = ({
  project,
  mode,
  resolvedAssets = [],
  resolvedArtifacts = [],
  seed = "viz-default-seed",
}: CreateVizRuntimeSessionOptions): VizRuntimeSession => {
  assertValidProjectDocument(project);

  const assetMap = new Map(resolvedAssets.map((asset) => [asset.id, asset]));
  const artifactMap = new Map(resolvedArtifacts.map((artifact) => [artifact.id, artifact]));

  return {
    project,
    mode,
    seed,
    getFrameContext: (frame) =>
      createFrameContext({
        frame,
        timeline: project.timeline,
        mode,
        seed,
      }),
    getOrderedLayers: () => orderProjectLayers(project),
    getResolvedAssetMap: () => assetMap,
    getResolvedArtifactMap: () => artifactMap,
  };
};
