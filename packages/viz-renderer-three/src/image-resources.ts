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
  whenReady(): Promise<void>;
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
  const pending = new Map<string, { promise: Promise<void>; settle(): void }>();
  const failures = new Set<string>();
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
        if (pending.has(uri) || failures.has(uri)) {
          return;
        }

        let settle!: () => void;
        const promise = new Promise<void>((resolve) => {
          settle = resolve;
        });
        pending.set(uri, { promise, settle });
        loader.load(
          uri,
          (texture) => {
            if (disposed || !currentUris.has(uri)) {
              pending.delete(uri);
              settle();
              texture.dispose();
              return;
            }
            texture.colorSpace = SRGBColorSpace;
            textures.set(uri, texture);
            pending.delete(uri);
            settle();
            hydrate();
            onReady();
          },
          undefined,
          () => {
            pending.delete(uri);
            if (!disposed && currentUris.has(uri)) failures.add(uri);
            settle();
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
      for (const uri of failures) {
        if (!currentUris.has(uri)) failures.delete(uri);
      }
      hydrate();
    },
    async whenReady() {
      for (;;) {
        if (disposed) throw new Error('Image resources are disposed.');
        const failed = [...failures].find((uri) => currentUris.has(uri));
        if (failed) throw new Error(`Could not load render image: ${failed}`);
        const active = [...pending].filter(([uri]) => currentUris.has(uri));
        if (active.length === 0) return;
        await Promise.all(active.map(([, load]) => load.promise));
      }
    },
    getStats: () => ({
      cachedTextures: textures.size,
      pendingLoads: pending.size,
    }),
    dispose() {
      disposed = true;
      for (const load of pending.values()) load.settle();
      pending.clear();
      failures.clear();
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
