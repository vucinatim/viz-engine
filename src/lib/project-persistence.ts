import useNodeNetworkStore from '@/components/node-network/node-network-store';
import { idbClearFiles } from '@/lib/idb-file-store';
import useEditorStore from '@/lib/stores/editor-store';
import { useHistoryStore } from '@/lib/stores/history-store';
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

export async function hydrateProjectData(projectFile: ProjectFile) {
  if (projectFile.version !== VIZ_ENGINE_PROJECT_VERSION) {
    console.warn(
      `Project file version (${projectFile.version}) does not match current version (${VIZ_ENGINE_PROJECT_VERSION}). There may be issues.`,
    );
  }

  assertValidProjectDocument(projectFile.project);
  const embeddedAssets = decodeEmbeddedAssets(projectFile);

  useNodeNetworkStore.setState((state) => ({
    ...state,
    openNetwork: projectFile.nodeEditorUi.openNetwork,
    areNetworksMinimized: projectFile.nodeEditorUi.areNetworksMinimized,
    shouldForceShowOverlay: false,
  }));

  useEditorStore.setState({
    ambientMode: projectFile.editorUi.ambientMode,
    resolutionMultiplier: projectFile.editorUi.resolutionMultiplier,
    rhythmSelection: projectFile.editorUi.rhythmSelection,
    layerUi: clone(projectFile.editorUi.layerUi ?? {}),
  });
  vizSessionActions.project.importWorkingProject(
    projectFile.project,
    embeddedAssets,
  );
  vizSessionActions.preview.reset();

  useHistoryStore.getState().reset();
}

export function loadProject(file: File) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const json = e.target?.result as string;
      const projectFile: ProjectFile = JSON.parse(json);

      await hydrateProjectData(projectFile);

      console.log('[loadProject] Project loaded successfully!');
    } catch (error) {
      console.error('Failed to load project file', error);
      alert('Failed to load project file. See console for details.');
    }
  };
  reader.readAsText(file);
}

export async function loadProjectFromUrl(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch project: ${response.statusText}`);
    }

    const json = await response.text();
    const projectFile: ProjectFile = JSON.parse(json);

    await hydrateProjectData(projectFile);

    console.log('[loadProjectFromUrl] Sample project loaded successfully!');
  } catch (error) {
    console.error('Failed to load sample project', error);
    alert('Failed to load sample project. See console for details.');
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
  console.log('[resetProject] Starting project reset...');

  try {
    // Step 1: Clear all persisted data
    console.log('[resetProject] Clearing IndexedDB...');
    await Promise.all([clearIndexedDB(), idbClearFiles()]);

    console.log('[resetProject] Clearing localStorage...');
    clearLocalStorage();

    // Step 2: Reset canonical stores first, then the editor adapters
    useNodeNetworkStore.setState({
      openNetwork: null,
      areNetworksMinimized: false,
      shouldForceShowOverlay: false,
    });

    console.log('[resetProject] Resetting project state...');
    vizSessionActions.project.importWorkingProject(
      createEmptyVizProjectDocument(),
    );

    console.log('[resetProject] Resetting editor UI state...');
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

    console.log('[resetProject] Resetting editor history...');
    useHistoryStore.getState().reset();

    console.log('[resetProject] Project reset complete!');
  } catch (error) {
    console.error('[resetProject] Error during reset:', error);
    alert(
      `Failed to reset project: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
