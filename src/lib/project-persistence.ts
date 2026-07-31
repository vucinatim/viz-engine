import useNodeNetworkStore from '@/components/node-network/node-network-store';
import { idbClearFiles } from '@/lib/idb-file-store';
import useEditorStore from '@/lib/stores/editor-store';
import {
  vizSessionActions,
  vizSessionHost,
  vizSessionStore,
} from '@/lib/viz-session';
import { createEmptyVizProjectDocument } from '@/lib/viz-session/project-document';
import {
  VIZ_PROJECT_SCHEMA_VERSION,
  type VizProjectDocument,
} from '@viz-engine/contracts';
import { assertValidProjectDocument } from '@viz-engine/runtime';
import { toast } from 'sonner';

const VIZ_ENGINE_PROJECT_VERSION = VIZ_PROJECT_SCHEMA_VERSION;
const PROJECT_ASSET_PAYLOAD_POLICY = 'embed-local-bytes-v1' as const;

export interface EmbeddedProjectAsset {
  assetId: string;
  encoding: 'base64';
  data: string;
}

export interface ProjectFile {
  version: string;
  project: VizProjectDocument;
  assetPayloadPolicy?: typeof PROJECT_ASSET_PAYLOAD_POLICY;
  embeddedAssets?: EmbeddedProjectAsset[];
  nodeEditorUi: {
    openNetwork: string | null;
    areNetworksMinimized: boolean;
  };
  editorUi: {
    ambientMode: boolean;
    resolutionMultiplier: number;
    rhythmSelection: { start: number; end: number };
    layerUi: ReturnType<typeof useEditorStore.getState>['layerUi'];
  };
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const encodeBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }
  return btoa(binary);
};

const decodeBase64 = (value: string): ArrayBuffer => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
};

const collectEmbeddedAssets = (
  project: VizProjectDocument,
): EmbeddedProjectAsset[] => {
  const resolvedById = new Map(
    vizSessionHost
      .getProjectResources()
      .resolvedAssets.map((asset) => [asset.id, asset]),
  );

  return (project.assetRefs ?? []).flatMap((ref) => {
    if (ref.source !== 'local' && ref.source !== 'generated') {
      return [];
    }
    const resolved = resolvedById.get(ref.id);
    if (!resolved?.bytes) {
      throw new Error(
        `Cannot export project: asset "${ref.label}" (${ref.id}) has no resolved bytes.`,
      );
    }
    return [
      {
        assetId: ref.id,
        encoding: 'base64' as const,
        data: encodeBase64(resolved.bytes),
      },
    ];
  });
};

const decodeEmbeddedAssets = (
  projectFile: ProjectFile,
): ReadonlyMap<string, ArrayBuffer> => {
  const refs = new Set(
    (projectFile.project.assetRefs ?? []).map((asset) => asset.id),
  );
  const decoded = new Map<string, ArrayBuffer>();
  for (const asset of projectFile.embeddedAssets ?? []) {
    if (!refs.has(asset.assetId)) {
      throw new Error(
        `Embedded asset "${asset.assetId}" is not referenced by the project.`,
      );
    }
    if (decoded.has(asset.assetId)) {
      throw new Error(`Embedded asset "${asset.assetId}" is duplicated.`);
    }
    if (asset.encoding !== 'base64') {
      throw new Error(
        `Embedded asset "${asset.assetId}" uses an unsupported encoding.`,
      );
    }
    decoded.set(asset.assetId, decodeBase64(asset.data));
  }
  return decoded;
};

const requireRecord = (
  value: unknown,
  label: string,
): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
};

export const parseProjectFile = (value: unknown): ProjectFile => {
  const file = requireRecord(value, 'Project file');
  if (file.version !== VIZ_ENGINE_PROJECT_VERSION) {
    throw new Error(
      `Unsupported project version "${String(file.version)}"; expected "${VIZ_ENGINE_PROJECT_VERSION}".`,
    );
  }
  const project = file.project;
  assertValidProjectDocument(project);
  const nodeEditorUi = requireRecord(file.nodeEditorUi, 'nodeEditorUi');
  const editorUi = requireRecord(file.editorUi, 'editorUi');
  const rhythmSelection = requireRecord(
    editorUi.rhythmSelection,
    'editorUi.rhythmSelection',
  );
  if (
    !(
      nodeEditorUi.openNetwork === null ||
      typeof nodeEditorUi.openNetwork === 'string'
    ) ||
    typeof nodeEditorUi.areNetworksMinimized !== 'boolean' ||
    typeof editorUi.ambientMode !== 'boolean' ||
    typeof editorUi.resolutionMultiplier !== 'number' ||
    typeof rhythmSelection.start !== 'number' ||
    typeof rhythmSelection.end !== 'number'
  ) {
    throw new Error('Project editor metadata is malformed.');
  }
  return file as unknown as ProjectFile;
};

export function buildProjectFile(): ProjectFile {
  const nodeNetworkStoreState = useNodeNetworkStore.getState();
  const editorStoreState = useEditorStore.getState();
  const workingProject = vizSessionStore.getState().project.initialized
    ? vizSessionActions.project.exportWorkingProject()
    : (() => {
        vizSessionActions.project.initializeProjectState();
        return vizSessionActions.project.exportWorkingProject();
      })();

  return {
    version: VIZ_ENGINE_PROJECT_VERSION,
    project: clone(workingProject),
    assetPayloadPolicy: PROJECT_ASSET_PAYLOAD_POLICY,
    embeddedAssets: collectEmbeddedAssets(workingProject),
    nodeEditorUi: {
      openNetwork: nodeNetworkStoreState.openNetwork,
      areNetworksMinimized: nodeNetworkStoreState.areNetworksMinimized,
    },
    editorUi: {
      ambientMode: editorStoreState.ambientMode,
      resolutionMultiplier: editorStoreState.resolutionMultiplier,
      rhythmSelection: clone(editorStoreState.rhythmSelection),
      layerUi: clone(editorStoreState.layerUi),
    },
  };
}

export function saveProject(projectName: string = 'project') {
  const projectFile = buildProjectFile();

  const json = JSON.stringify(projectFile, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName}.vizengine.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function hydrateProjectData(projectFile: unknown) {
  const validated = parseProjectFile(projectFile);
  const embeddedAssets = decodeEmbeddedAssets(validated);

  vizSessionActions.project.importWorkingProject(
    validated.project,
    embeddedAssets,
  );

  useNodeNetworkStore.setState((state) => ({
    ...state,
    openNetwork: validated.nodeEditorUi.openNetwork,
    areNetworksMinimized: validated.nodeEditorUi.areNetworksMinimized,
    shouldForceShowOverlay: false,
  }));

  useEditorStore.setState({
    ambientMode: validated.editorUi.ambientMode,
    resolutionMultiplier: validated.editorUi.resolutionMultiplier,
    rhythmSelection: validated.editorUi.rhythmSelection,
    layerUi: clone(validated.editorUi.layerUi ?? {}),
  });
  vizSessionActions.preview.reset();

  vizSessionActions.history.reset();
}

export async function loadProject(file: File) {
  try {
    await hydrateProjectData(JSON.parse(await file.text()));
    toast.success('Project loaded');
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : 'Project file could not be loaded.',
    );
  }
}

export async function loadProjectFromUrl(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch project: ${response.statusText}`);
    }

    const json = await response.text();
    await hydrateProjectData(JSON.parse(json));
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : 'Sample project could not be loaded.',
    );
  }
}

/**
 * Clear all IndexedDB stores for the viz-engine database
 */
async function clearIndexedDB() {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('viz-engine', 1);

    request.onsuccess = () => {
      const db = request.result;
      const storeNames = Array.from(db.objectStoreNames);

      if (storeNames.length === 0) {
        db.close();
        resolve();
        return;
      }

      const transaction = db.transaction(storeNames, 'readwrite');
      const clearPromises: Promise<void>[] = [];

      for (const storeName of storeNames) {
        const promise = new Promise<void>((resolveStore, rejectStore) => {
          const store = transaction.objectStore(storeName);
          const clearRequest = store.clear();
          clearRequest.onsuccess = () => resolveStore();
          clearRequest.onerror = () => rejectStore(clearRequest.error);
        });
        clearPromises.push(promise);
      }

      Promise.all(clearPromises)
        .then(() => {
          db.close();
          resolve();
        })
        .catch((error) => {
          db.close();
          reject(error);
        });
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all localStorage keys related to zustand stores
 */
function clearLocalStorage() {
  const keysToRemove = [
    'viz-session-store',
    `viz-session-${VIZ_PROJECT_SCHEMA_VERSION}`,
    `viz-project-${VIZ_PROJECT_SCHEMA_VERSION}`,
    'editor-project-store',
    'layer-store',
    'layer-values-store',
    'node-network-store',
    'node-network-ui-store',
    'editor-store',
    'editor-history-store',
  ];

  keysToRemove.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove localStorage key: ${key}`, error);
    }
  });
}

export async function resetProject() {
  try {
    await Promise.all([clearIndexedDB(), idbClearFiles()]);
    clearLocalStorage();
    useNodeNetworkStore.setState({
      openNetwork: null,
      areNetworksMinimized: false,
      shouldForceShowOverlay: false,
    });
    vizSessionActions.project.importWorkingProject(
      createEmptyVizProjectDocument(),
    );
    const currentResolutionMultiplier =
      useEditorStore.getState().resolutionMultiplier;
    useEditorStore.setState({
      ambientMode: false,
      dominantColor: '#fff',
      resolutionMultiplier: currentResolutionMultiplier,
      isRhythmLabOpen: false,
      rhythmSelection: { start: 0, end: 0.2 },
      layerUi: {},
    });
    vizSessionActions.preview.reset();
    vizSessionActions.history.reset();
  } catch (error) {
    toast.error(
      error instanceof Error
        ? `Failed to reset project: ${error.message}`
        : 'Failed to reset project.',
    );
  }
}
