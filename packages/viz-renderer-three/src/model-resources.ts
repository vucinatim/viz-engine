import type {
  VizMaterializedAsset,
  VizMaterializedBinaryAsset,
  VizMaterializedModelAsset,
  VizModelFormat,
  VizModelManifest,
} from '@viz-engine/contracts';
import { VIZ_MODEL_MANIFEST_SCHEMA_VERSION } from '@viz-engine/contracts';
import {
  AnimationClip,
  Box3,
  Group,
  LoadingManager,
  Material,
  Mesh,
  Object3D,
  Texture,
} from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

export type VizThreeModelAsset =
  VizMaterializedModelAsset | VizMaterializedBinaryAsset;

export type VizThreeModelResourceErrorCode =
  | 'MODEL_ASSET_UNSUPPORTED'
  | 'MODEL_SOURCE_MISSING'
  | 'MODEL_FETCH_FAILED'
  | 'MODEL_PARSE_FAILED'
  | 'MODEL_RESOURCE_LOAD_CANCELLED'
  | 'MODEL_RESOURCE_MANAGER_DISPOSED';

export class VizThreeModelResourceError extends Error {
  readonly code: VizThreeModelResourceErrorCode;
  readonly assetId: string;

  constructor({
    code,
    assetId,
    message,
    cause,
  }: {
    code: VizThreeModelResourceErrorCode;
    assetId: string;
    message: string;
    cause?: unknown;
  }) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'VizThreeModelResourceError';
    this.code = code;
    this.assetId = assetId;
  }
}

export interface VizThreeDecodedModel {
  scene: Group;
  animations: AnimationClip[];
  sourceFormat: VizModelFormat;
  warnings?: VizThreeModelResourceWarning[];
}

export interface VizThreeModelResourceWarning {
  code: 'MODEL_DEPENDENCY_LOAD_FAILED';
  uri: string;
  message: string;
}

export interface VizThreeModelResource {
  assetId: string;
  cacheKey: string;
  scene: Group;
  animations: AnimationClip[];
  manifest: VizModelManifest;
  warnings: VizThreeModelResourceWarning[];
  instantiate(): Group;
}

export interface VizThreeModelDecoder {
  decode(
    asset: VizThreeModelAsset,
    signal: AbortSignal,
  ): Promise<VizThreeDecodedModel>;
}

export interface VizThreeModelResourceLease {
  readonly assetId: string;
  readonly ready: Promise<VizThreeModelResource>;
  release(): void;
}

export interface VizThreeModelResourceDiagnostic {
  assetId: string;
  cacheKey: string;
  status: 'loading' | 'ready' | 'failed';
  references: number;
  error?: VizThreeModelResourceError;
  warnings?: VizThreeModelResourceWarning[];
}

export interface VizThreeModelResourceManager {
  acquire(asset: VizMaterializedAsset): VizThreeModelResourceLease;
  getDiagnostics(): VizThreeModelResourceDiagnostic[];
  dispose(): void;
}

interface ModelResourceEntry {
  assetId: string;
  cacheKey: string;
  controller: AbortController;
  references: number;
  status: VizThreeModelResourceDiagnostic['status'];
  ready: Promise<VizThreeModelResource>;
  resource?: VizThreeModelResource;
  error?: VizThreeModelResourceError;
}

const isModelBinaryAsset = (
  asset: VizMaterializedAsset,
): asset is VizThreeModelAsset => {
  if (asset.kind === 'model') {
    return true;
  }

  return (
    asset.kind === 'binary' &&
    (asset.mimeType?.startsWith('model/') === true ||
      asset.mimeType === 'application/vnd.autodesk.fbx')
  );
};

const getModelSourceUri = (asset: VizThreeModelAsset): string | undefined =>
  asset.kind === 'model' ? asset.modelSourceUri : asset.binarySourceUri;

const readMetadataString = (
  asset: VizThreeModelAsset,
  key: string,
): string | undefined => {
  const value = asset.metadata?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const inferModelFormat = (asset: VizThreeModelAsset): VizModelFormat => {
  const declaredFormat = readMetadataString(
    asset,
    'modelFormat',
  )?.toLowerCase();
  if (
    declaredFormat === 'fbx' ||
    declaredFormat === 'glb' ||
    declaredFormat === 'gltf' ||
    declaredFormat === 'obj'
  ) {
    return declaredFormat;
  }

  if (asset.mimeType === 'application/vnd.autodesk.fbx') {
    return 'fbx';
  }
  if (asset.mimeType === 'model/gltf-binary') {
    return 'glb';
  }
  if (asset.mimeType === 'model/gltf+json') {
    return 'gltf';
  }

  const uri = getModelSourceUri(asset)?.toLowerCase() ?? '';
  if (uri.split(/[?#]/u)[0]?.endsWith('.fbx')) {
    return 'fbx';
  }
  if (uri.split(/[?#]/u)[0]?.endsWith('.glb')) {
    return 'glb';
  }
  if (uri.split(/[?#]/u)[0]?.endsWith('.gltf')) {
    return 'gltf';
  }
  if (uri.split(/[?#]/u)[0]?.endsWith('.obj')) {
    return 'obj';
  }

  return 'unknown';
};

const getResourceBasePath = (uri: string | undefined): string => {
  if (!uri) {
    return '';
  }

  const cleanUri = uri.split(/[?#]/u)[0] ?? uri;
  const separatorIndex = cleanUri.lastIndexOf('/');
  return separatorIndex < 0 ? '' : cleanUri.slice(0, separatorIndex + 1);
};

const fetchModelBytes = async (
  asset: VizThreeModelAsset,
  signal: AbortSignal,
): Promise<ArrayBuffer> => {
  if (asset.bytes !== undefined) {
    return asset.bytes.slice(0);
  }

  const sourceUri = getModelSourceUri(asset);
  if (!sourceUri) {
    throw new VizThreeModelResourceError({
      code: 'MODEL_SOURCE_MISSING',
      assetId: asset.id,
      message: `Model asset "${asset.id}" has neither bytes nor a source URI.`,
    });
  }

  let response: Response;
  try {
    response = await fetch(sourceUri, { signal });
  } catch (error) {
    if (signal.aborted) {
      throw new VizThreeModelResourceError({
        code: 'MODEL_RESOURCE_LOAD_CANCELLED',
        assetId: asset.id,
        message: `Loading model asset "${asset.id}" was cancelled.`,
        cause: error,
      });
    }
    throw new VizThreeModelResourceError({
      code: 'MODEL_FETCH_FAILED',
      assetId: asset.id,
      message: `Model asset "${asset.id}" could not be fetched from "${sourceUri}".`,
      cause: error,
    });
  }

  if (!response.ok) {
    throw new VizThreeModelResourceError({
      code: 'MODEL_FETCH_FAILED',
      assetId: asset.id,
      message: `Model asset "${asset.id}" returned HTTP ${response.status} from "${sourceUri}".`,
    });
  }

  return response.arrayBuffer();
};

const createDefaultModelDecoder = (): VizThreeModelDecoder => ({
  async decode(asset, signal) {
    const format = inferModelFormat(asset);
    if (format !== 'fbx' && format !== 'glb' && format !== 'gltf') {
      throw new VizThreeModelResourceError({
        code: 'MODEL_ASSET_UNSUPPORTED',
        assetId: asset.id,
        message: `Model asset "${asset.id}" uses unsupported runtime format "${format}".`,
      });
    }

    const bytes = await fetchModelBytes(asset, signal);
    if (signal.aborted) {
      throw new VizThreeModelResourceError({
        code: 'MODEL_RESOURCE_LOAD_CANCELLED',
        assetId: asset.id,
        message: `Loading model asset "${asset.id}" was cancelled.`,
      });
    }

    const sourceUri = getModelSourceUri(asset);
    const basePath = getResourceBasePath(sourceUri);

    try {
      if (format === 'fbx') {
        let dependencyLoadStarted = false;
        let resolveDependencies: () => void = () => undefined;
        const dependenciesReady = new Promise<void>((resolve) => {
          resolveDependencies = resolve;
        });
        const warnings: VizThreeModelResourceWarning[] = [];
        const loadingManager = new LoadingManager();
        loadingManager.onStart = () => {
          dependencyLoadStarted = true;
        };
        loadingManager.onLoad = resolveDependencies;
        loadingManager.onError = (url) => {
          warnings.push({
            code: 'MODEL_DEPENDENCY_LOAD_FAILED',
            uri: url,
            message: `A non-critical model dependency could not be loaded from "${url}".`,
          });
        };
        const scene = new FBXLoader(loadingManager).parse(bytes, basePath);
        if (dependencyLoadStarted) {
          await dependenciesReady;
        }
        if (signal.aborted) {
          throw new VizThreeModelResourceError({
            code: 'MODEL_RESOURCE_LOAD_CANCELLED',
            assetId: asset.id,
            message: `Loading model asset "${asset.id}" was cancelled.`,
          });
        }
        return {
          scene,
          animations: [...scene.animations],
          sourceFormat: format,
          warnings,
        };
      }

      const gltf = await new GLTFLoader().parseAsync(bytes, basePath);
      return {
        scene: gltf.scene,
        animations: [...gltf.animations],
        sourceFormat: format,
      };
    } catch (error) {
      if (error instanceof VizThreeModelResourceError) {
        throw error;
      }
      throw new VizThreeModelResourceError({
        code: 'MODEL_PARSE_FAILED',
        assetId: asset.id,
        message: `Model asset "${asset.id}" could not be parsed as ${format.toUpperCase()}.`,
        cause: error,
      });
    }
  },
});

const createStableObjectId = (object: Object3D, index: number): string =>
  object.name.trim() || `${object.type}-${index}`;

const createModelManifest = ({
  asset,
  decoded,
}: {
  asset: VizThreeModelAsset;
  decoded: VizThreeDecodedModel;
}): VizModelManifest => {
  const nodes: VizModelManifest['nodes'] = [];
  const materials = new Map<string, VizModelManifest['materials'][number]>();
  const skeletons = new Map<string, VizModelManifest['skeletons'][number]>();
  const morphTargets: VizModelManifest['morphTargets'] = [];
  const objectIds = new Map<Object3D, string>();
  let hasMesh = false;
  let hasSkeletalAnimation = false;
  let hasMorphAnimation = false;
  let hasCamera = false;
  let hasLight = false;
  let objectIndex = 0;

  decoded.scene.traverse((object) => {
    const id = createStableObjectId(object, objectIndex);
    objectIndex += 1;
    objectIds.set(object, id);
    nodes.push({
      id,
      name: object.name,
      type: object.type,
      ...(object.parent && objectIds.has(object.parent)
        ? { parentId: objectIds.get(object.parent)! }
        : {}),
    });

    if ((object as { isCamera?: boolean }).isCamera === true) {
      hasCamera = true;
    }
    if ((object as { isLight?: boolean }).isLight === true) {
      hasLight = true;
    }

    const mesh = object as Mesh;
    if (mesh.isMesh !== true) {
      return;
    }

    hasMesh = true;
    const meshMaterials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    for (const material of meshMaterials) {
      if (!material || materials.has(material.uuid)) {
        continue;
      }
      materials.set(material.uuid, {
        id: material.uuid,
        name: material.name,
      });
    }

    const skinnedMesh = object as Mesh & {
      isSkinnedMesh?: boolean;
      skeleton?: {
        uuid: string;
        bones: Object3D[];
      };
    };
    if (
      skinnedMesh.isSkinnedMesh === true &&
      skinnedMesh.skeleton !== undefined
    ) {
      hasSkeletalAnimation = true;
      const skeleton = skinnedMesh.skeleton;
      if (!skeletons.has(skeleton.uuid)) {
        skeletons.set(skeleton.uuid, {
          id: skeleton.uuid,
          name: object.name || 'Skeleton',
          boneCount: skeleton.bones.length,
          boneNames: skeleton.bones.map((bone) => bone.name),
        });
      }
    }

    for (const [name, morphIndex] of Object.entries(
      mesh.morphTargetDictionary ?? {},
    )) {
      hasMorphAnimation = true;
      morphTargets.push({
        id: `${id}:morph:${morphIndex}`,
        name,
        meshNodeId: id,
      });
    }
  });

  const bounds = new Box3().setFromObject(decoded.scene);

  const contentIdentity = readMetadataString(asset, 'contentIdentity');

  return {
    schemaVersion: VIZ_MODEL_MANIFEST_SCHEMA_VERSION,
    assetId: asset.id,
    ...(contentIdentity === undefined ? {} : { contentIdentity }),
    sourceFormat: decoded.sourceFormat,
    ...(bounds.isEmpty()
      ? {}
      : {
          bounds: {
            min: bounds.min.toArray(),
            max: bounds.max.toArray(),
          },
        }),
    nodes,
    materials: [...materials.values()],
    skeletons: [...skeletons.values()],
    animationClips: decoded.animations.map((clip, index) => ({
      id: clip.name || `clip-${index}`,
      name: clip.name,
      durationSeconds: clip.duration,
      trackCount: clip.tracks.length,
    })),
    morphTargets,
    capabilities: {
      staticMesh: hasMesh,
      transformAnimation: decoded.animations.some((clip) =>
        clip.tracks.some(
          (track) => !track.name.endsWith('.morphTargetInfluences'),
        ),
      ),
      skeletalAnimation: hasSkeletalAnimation,
      morphAnimation: hasMorphAnimation,
      embeddedCameras: hasCamera,
      embeddedLights: hasLight,
    },
  };
};

const disposeMaterial = (material: Material): void => {
  for (const value of Object.values(
    material as unknown as Record<string, unknown>,
  )) {
    if (value instanceof Texture) {
      value.dispose();
    }
  }
  material.dispose();
};

const disposeModelResource = (resource: VizThreeModelResource): void => {
  const geometries = new Set<{
    dispose(): void;
  }>();
  const materials = new Set<Material>();

  resource.scene.traverse((object) => {
    const mesh = object as Mesh;
    if (mesh.isMesh !== true) {
      return;
    }
    geometries.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]) {
      if (material) {
        materials.add(material);
      }
    }
  });

  for (const geometry of geometries) {
    geometry.dispose();
  }
  for (const material of materials) {
    disposeMaterial(material);
  }
};

const toResourceError = (
  assetId: string,
  error: unknown,
): VizThreeModelResourceError => {
  if (error instanceof VizThreeModelResourceError) {
    return error;
  }

  return new VizThreeModelResourceError({
    code: 'MODEL_PARSE_FAILED',
    assetId,
    message: `Model asset "${assetId}" failed to load.`,
    cause: error,
  });
};

export const createVizThreeModelResourceManager = ({
  decoder = createDefaultModelDecoder(),
}: {
  decoder?: VizThreeModelDecoder;
} = {}): VizThreeModelResourceManager => {
  const entries = new Map<string, ModelResourceEntry>();
  let disposed = false;

  const createEntry = (
    asset: VizThreeModelAsset,
    cacheKey: string,
  ): ModelResourceEntry => {
    const controller = new AbortController();
    const entry: ModelResourceEntry = {
      assetId: asset.id,
      cacheKey,
      controller,
      references: 0,
      status: 'loading',
      ready: Promise.resolve(null as never),
    };

    entry.ready = decoder
      .decode(asset, controller.signal)
      .then((decoded) => {
        if (disposed || controller.signal.aborted) {
          throw new VizThreeModelResourceError({
            code: disposed
              ? 'MODEL_RESOURCE_MANAGER_DISPOSED'
              : 'MODEL_RESOURCE_LOAD_CANCELLED',
            assetId: asset.id,
            message: disposed
              ? `Model resource manager was disposed while loading "${asset.id}".`
              : `Loading model asset "${asset.id}" was cancelled.`,
          });
        }

        const resource: VizThreeModelResource = {
          assetId: asset.id,
          cacheKey,
          scene: decoded.scene,
          animations: decoded.animations,
          manifest: createModelManifest({ asset, decoded }),
          warnings: [...(decoded.warnings ?? [])],
          instantiate: () => cloneSkeleton(decoded.scene) as Group,
        };
        entry.status = 'ready';
        entry.resource = resource;
        return resource;
      })
      .catch((error: unknown) => {
        const resourceError = toResourceError(asset.id, error);
        entry.status = 'failed';
        entry.error = resourceError;
        throw resourceError;
      });

    entries.set(cacheKey, entry);
    return entry;
  };

  return {
    acquire(asset) {
      if (disposed) {
        const error = new VizThreeModelResourceError({
          code: 'MODEL_RESOURCE_MANAGER_DISPOSED',
          assetId: asset.id,
          message: `Cannot acquire model asset "${asset.id}" from a disposed resource manager.`,
        });
        return {
          assetId: asset.id,
          ready: Promise.reject(error),
          release: () => undefined,
        };
      }

      if (!isModelBinaryAsset(asset)) {
        const error = new VizThreeModelResourceError({
          code: 'MODEL_ASSET_UNSUPPORTED',
          assetId: asset.id,
          message: `Asset "${asset.id}" is not a materialized model asset.`,
        });
        return {
          assetId: asset.id,
          ready: Promise.reject(error),
          release: () => undefined,
        };
      }

      const cacheKey =
        readMetadataString(asset, 'contentIdentity') ??
        getModelSourceUri(asset) ??
        asset.id;
      const entry = entries.get(cacheKey) ?? createEntry(asset, cacheKey);
      entry.references += 1;
      let released = false;

      return {
        assetId: asset.id,
        ready: entry.ready,
        release() {
          if (released) {
            return;
          }
          released = true;
          entry.references = Math.max(0, entry.references - 1);

          if (entry.references === 0 && entry.status === 'loading') {
            entry.controller.abort();
            entries.delete(cacheKey);
          }
        },
      };
    },
    getDiagnostics() {
      return [...entries.values()].map((entry) => ({
        assetId: entry.assetId,
        cacheKey: entry.cacheKey,
        status: entry.status,
        references: entry.references,
        ...(entry.error === undefined ? {} : { error: entry.error }),
        ...(entry.resource?.warnings.length
          ? { warnings: [...entry.resource.warnings] }
          : {}),
      }));
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;

      for (const entry of entries.values()) {
        entry.controller.abort();
        if (entry.resource) {
          disposeModelResource(entry.resource);
        }
      }
      entries.clear();
    },
  };
};
