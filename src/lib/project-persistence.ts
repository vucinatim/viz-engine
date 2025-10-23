import useNodeNetworkStore, {
  nodeNetworkStoreMerge,
  nodeNetworkStorePartialize,
} from '@/components/node-network/node-network-store';
import useEditorStore from '@/lib/stores/editor-store';
import { useHistoryStore } from '@/lib/stores/history-store';
import useLayerStore, {
  layerStoreMerge,
  layerStorePartialize,
} from '@/lib/stores/layer-store';
import useLayerValuesStore from '@/lib/stores/layer-values-store';

const VIZ_ENGINE_PROJECT_VERSION = '1.0.0';

interface ProjectFile {
  version: string;
  layerStore: any;
  layerValuesStore: any;
  nodeNetworkStore: any;
  editorStore: any;
}

export function saveProject(projectName: string = 'project') {
  const layerStoreState = useLayerStore.getState();
  const layerValuesStoreState = useLayerValuesStore.getState();
  const nodeNetworkStoreState = useNodeNetworkStore.getState();
  const editorStoreState = useEditorStore.getState();

  // We need to manually call the partialize logic from the persist middleware
  // to get a serializable version of the state.
  const partializedLayerStore = layerStorePartialize(layerStoreState);
  const partializedNodeNetworkStore = nodeNetworkStorePartialize(
    nodeNetworkStoreState,
  );

  // Cherry-pick serializable editor settings
  const partializedEditorStore = {
    playerFPS: editorStoreState.playerFPS,
    ambientMode: editorStoreState.ambientMode,
    resolutionMultiplier: editorStoreState.resolutionMultiplier,
  };

  const projectFile: ProjectFile = {
    version: VIZ_ENGINE_PROJECT_VERSION,
    layerStore: partializedLayerStore,
    layerValuesStore: layerValuesStoreState, // This store is fully serializable
    nodeNetworkStore: partializedNodeNetworkStore,
    editorStore: partializedEditorStore,
  };

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

async function hydrateProjectData(projectFile: ProjectFile) {
  if (projectFile.version !== VIZ_ENGINE_PROJECT_VERSION) {
    // Here you could handle migrating old project file versions
    console.warn(
      `Project file version (${projectFile.version}) does not match current version (${VIZ_ENGINE_PROJECT_VERSION}). There may be issues.`,
    );
  }

  // Rehydrate stores
  // For stores with custom merge logic, we manually call it
  const mergedLayerStore = layerStoreMerge(
    projectFile.layerStore,
    useLayerStore.getState(),
  );
  useLayerStore.setState(mergedLayerStore);

  const mergedNodeNetworkStore = nodeNetworkStoreMerge(
    projectFile.nodeNetworkStore,
    useNodeNetworkStore.getState(),
  );
  useNodeNetworkStore.setState(mergedNodeNetworkStore);

  // For stores with serializable state, we can just set it
  useLayerValuesStore.setState(projectFile.layerValuesStore);
  useEditorStore.setState(projectFile.editorStore);

  // Reset editor history when loading a project
  useHistoryStore.getState().resetLayerHistory();
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
    'layer-store',
    'layer-values-store',
    'node-network-store',
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
    await clearIndexedDB();

    console.log('[resetProject] Clearing localStorage...');
    clearLocalStorage();

    // Step 2: Reset all stores to their initial states
    console.log('[resetProject] Resetting layer store...');
    useLayerStore.setState({
      layers: [],
      layerRenderFunctions: new Map(),
    });

    console.log('[resetProject] Resetting layer values store...');
    useLayerValuesStore.setState({
      values: {},
    });

    console.log('[resetProject] Resetting node network store...');
    useNodeNetworkStore.setState({
      networks: {},
      openNetwork: null,
      areNetworksMinimized: false,
    });

    console.log('[resetProject] Resetting editor store...');
    // Preserve resolution multiplier (quality setting) and playerRef when resetting
    // playerRef is a runtime reference that should not be reset
    const currentResolutionMultiplier =
      useEditorStore.getState().resolutionMultiplier;
    const currentPlayerRef = useEditorStore.getState().playerRef;
    useEditorStore.setState({
      isPlaying: false,
      playerRef: currentPlayerRef, // Preserve the player ref
      playerFPS: 60,
      ambientMode: false,
      dominantColor: '#fff',
      resolutionMultiplier: currentResolutionMultiplier,
    });

    // Reset editor history
    console.log('[resetProject] Resetting editor history...');
    useHistoryStore.getState().resetLayerHistory();

    console.log('[resetProject] Project reset complete!');
  } catch (error) {
    console.error('[resetProject] Error during reset:', error);
    alert(
      `Failed to reset project: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
