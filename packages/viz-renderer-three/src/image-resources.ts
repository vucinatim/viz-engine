import type {
  VizMaterializedImageAsset,
  VizRenderPlan,
} from '@viz-engine/contracts';
import {
  Mesh,
  MeshBasicMaterial,
  Object3D,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three';

import type {
  VizImageMeshUserData,
  VizThreeCompositorLayer,
} from './compositor.js';

export interface VizThreeImageResourceStats {
  cachedTextures: number;
  pendingLoads: number;
}

export interface VizThreeImageResourceManager {
  reconcile(layers: VizThreeCompositorLayer[], renderPlan: VizRenderPlan): void;
  getStats(): VizThreeImageResourceStats;
  dispose(): void;
}

const visitMeshes = (object: Object3D, visit: (mesh: Mesh) => void) => {
  if (object instanceof Mesh) {
    visit(object);
  }
  for (const child of object.children) {
    visitMeshes(child, visit);
  }
};

const createImageAssetMap = (
  renderPlan: VizRenderPlan,
): ReadonlyMap<string, VizMaterializedImageAsset> =>
  new Map(
    renderPlan.materializedAssets
      .filter(
        (asset): asset is VizMaterializedImageAsset => asset.kind === 'image',
      )
      .map((asset) => [asset.id, asset]),
  );

export const createVizThreeImageResourceManager = ({
  onReady,
  loader = typeof window === 'undefined' ? null : new TextureLoader(),
}: {
  onReady: () => void;
  loader?: TextureLoader | null;
}): VizThreeImageResourceManager => {
  const textures = new Map<string, Texture>();
  const pending = new Set<string>();
  let currentLayers: VizThreeCompositorLayer[] = [];
  let currentAssets: ReadonlyMap<string, VizMaterializedImageAsset> = new Map();
  let currentUris = new Set<string>();
  let disposed = false;

  const hydrate = () => {
    if (!loader || disposed) {
      return;
    }
    for (const layer of currentLayers) {
      visitMeshes(layer.contentRoot, (mesh) => {
        const assetId = (mesh.userData as VizImageMeshUserData).vizImageAssetId;
        if (!assetId) {
          return;
        }
        const uri = assetId
          ? currentAssets.get(assetId)?.imageSourceUri
          : undefined;
        const material = mesh.material as MeshBasicMaterial;
        if (!uri) {
          if (material.map) {
            material.map = null;
            material.needsUpdate = true;
          }
          return;
        }
        const cached = textures.get(uri);
        if (cached) {
          if (material.map !== cached) {
            material.map = cached;
            material.needsUpdate = true;
          }
          return;
        }
        if (pending.has(uri)) {
          return;
        }

        pending.add(uri);
        loader.load(
          uri,
          (texture) => {
            if (disposed || !currentUris.has(uri)) {
              pending.delete(uri);
              texture.dispose();
              return;
            }
            texture.colorSpace = SRGBColorSpace;
            textures.set(uri, texture);
            pending.delete(uri);
            hydrate();
            onReady();
          },
          undefined,
          () => {
            pending.delete(uri);
          },
        );
      });
    }
  };

  return {
    reconcile(layers, renderPlan) {
      currentLayers = layers;
      currentAssets = createImageAssetMap(renderPlan);
      currentUris = new Set<string>();
      for (const layer of layers) {
        visitMeshes(layer.contentRoot, (mesh) => {
          const assetId = (mesh.userData as VizImageMeshUserData)
            .vizImageAssetId;
          const uri = assetId
            ? currentAssets.get(assetId)?.imageSourceUri
            : undefined;
          if (uri) {
            currentUris.add(uri);
          }
        });
      }
      for (const [uri, texture] of textures) {
        if (!currentUris.has(uri)) {
          texture.dispose();
          textures.delete(uri);
        }
      }
      hydrate();
    },
    getStats: () => ({
      cachedTextures: textures.size,
      pendingLoads: pending.size,
    }),
    dispose() {
      disposed = true;
      pending.clear();
      for (const texture of textures.values()) {
        texture.dispose();
      }
      textures.clear();
      currentLayers = [];
      currentAssets = new Map();
      currentUris.clear();
    },
  };
};
