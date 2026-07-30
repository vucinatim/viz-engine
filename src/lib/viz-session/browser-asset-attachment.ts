import { idbGetFile, idbPutFile } from '@/lib/idb-file-store';
import type {
  VizAssetKind,
  VizAssetRef,
  VizProjectDocument,
  VizResolvedAsset,
} from '@viz-engine/contracts';
import type { VizSessionHost } from '@viz-engine/editor-control';

export interface AttachedBrowserAsset {
  ref: VizAssetRef;
  resolved: VizResolvedAsset;
}

export type BrowserAssetSelection =
  { kind: 'file'; file: File } | { kind: 'external-uri'; uri: string };

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const contentIdentity = async (bytes: ArrayBuffer): Promise<string> =>
  `sha256:${toHex(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
  )}`;

const textIdentity = async (value: string): Promise<string> =>
  contentIdentity(new TextEncoder().encode(value).buffer);

const inferAssetKind = ({
  name,
  mimeType = '',
}: {
  name: string;
  mimeType?: string;
}): VizAssetKind => {
  const extension = name.toLowerCase().split(/[?#]/)[0]?.split('.').pop();
  if (
    mimeType.startsWith('model/') ||
    extension === 'glb' ||
    extension === 'gltf' ||
    extension === 'fbx'
  ) {
    return 'model';
  }
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }
  return 'binary';
};

const canUseIndexedDb = () => typeof indexedDB !== 'undefined';

export const createStudioBrowserAssetAttachment = ({
  host,
}: {
  host: VizSessionHost;
}) => {
  const objectUrls = new Map<string, string>();
  let projectGeneration = 0;

  const materializeBlob = async (
    ref: VizAssetRef,
    blob: Blob,
  ): Promise<VizResolvedAsset> => {
    return materializeBytes(ref, await blob.arrayBuffer());
  };

  const materializeBytes = (
    ref: VizAssetRef,
    bytes: ArrayBuffer,
  ): VizResolvedAsset => {
    const previousUrl = objectUrls.get(ref.id);
    if (previousUrl) {
      URL.revokeObjectURL(previousUrl);
    }
    const uri = URL.createObjectURL(
      new Blob([bytes], {
        ...(ref.mimeType === undefined ? {} : { type: ref.mimeType }),
      }),
    );
    objectUrls.set(ref.id, uri);
    return {
      id: ref.id,
      kind: ref.kind,
      source: ref.source,
      uri,
      ...(ref.mimeType === undefined ? {} : { mimeType: ref.mimeType }),
      bytes,
      ...(ref.metadata === undefined ? {} : { metadata: ref.metadata }),
    };
  };

  const externalResolvedAsset = (ref: VizAssetRef): VizResolvedAsset => {
    if (!ref.externalUri) {
      throw new Error(`External asset "${ref.id}" has no external URI.`);
    }
    return {
      id: ref.id,
      kind: ref.kind,
      source: ref.source,
      uri: ref.externalUri,
      ...(ref.mimeType === undefined ? {} : { mimeType: ref.mimeType }),
      ...(ref.metadata === undefined ? {} : { metadata: ref.metadata }),
    };
  };

  const attachLocalFile = async (file: File): Promise<AttachedBrowserAsset> => {
    const bytes = await file.arrayBuffer();
    const identity = await contentIdentity(bytes);
    const id = `asset-${identity.slice('sha256:'.length)}`;
    const ref: VizAssetRef = {
      id,
      kind: inferAssetKind({ name: file.name, mimeType: file.type }),
      source: 'local',
      label: file.name,
      ...(file.type ? { mimeType: file.type } : {}),
      originalFileName: file.name,
      metadata: {
        contentIdentity: identity,
        byteLength: file.size,
      },
    };
    await idbPutFile(id, file);
    return {
      ref,
      resolved: materializeBytes(ref, bytes),
    };
  };

  const attachExternalUri = async (
    uriInput: string,
  ): Promise<AttachedBrowserAsset> => {
    const uri = uriInput.trim();
    if (!uri) {
      throw new Error('External asset URI must not be empty.');
    }
    const identity = await textIdentity(uri);
    const ref: VizAssetRef = {
      id: `asset-${identity.slice('sha256:'.length)}`,
      kind: inferAssetKind({ name: uri }),
      source: 'external',
      label: uri.split('/').pop()?.split(/[?#]/)[0] || uri,
      externalUri: uri,
      metadata: {
        contentIdentity: identity,
      },
    };
    return {
      ref,
      resolved: externalResolvedAsset(ref),
    };
  };

  const prepareProjectAssets = (
    project: VizProjectDocument,
    embeddedBytes: ReadonlyMap<string, ArrayBuffer> = new Map(),
  ) => {
    projectGeneration += 1;
    const generation = projectGeneration;
    const referencedIds = new Set(
      (project.assetRefs ?? []).map((ref) => ref.id),
    );
    objectUrls.forEach((url, assetId) => {
      if (!referencedIds.has(assetId)) {
        URL.revokeObjectURL(url);
        objectUrls.delete(assetId);
      }
    });

    const resolvedAssets = (project.assetRefs ?? []).flatMap((ref) => {
      const bytes = embeddedBytes.get(ref.id);
      if (bytes) {
        return [materializeBytes(ref, bytes)];
      }
      if (ref.source === 'external') {
        return [externalResolvedAsset(ref)];
      }
      return [];
    });

    return {
      resolvedAssets,
      async restoreMissing() {
        if (!canUseIndexedDb()) {
          return;
        }
        await Promise.all(
          (project.assetRefs ?? [])
            .filter(
              (ref) => ref.source === 'local' && !embeddedBytes.has(ref.id),
            )
            .map(async (ref) => {
              const blob = await idbGetFile(ref.id);
              if (blob && generation === projectGeneration) {
                host.registerResolvedAsset(await materializeBlob(ref, blob));
              }
            }),
        );
      },
    };
  };

  const attach = (selection: BrowserAssetSelection) =>
    selection.kind === 'file'
      ? attachLocalFile(selection.file)
      : attachExternalUri(selection.uri);

  return {
    attach,
    attachLocalFile,
    attachExternalUri,
    prepareProjectAssets,
    dispose() {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
    },
  };
};

export type StudioBrowserAssetAttachment = ReturnType<
  typeof createStudioBrowserAssetAttachment
>;
