import useNodeNetworkStore, {
  nodeNetworkStoreMerge,
  nodeNetworkStorePartialize,
} from '@/components/node-network/node-network-store';
import { useEditorHistoryStore } from '@/lib/stores/editor-history-store';
import useEditorStore from '@/lib/stores/editor-store';
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
    alert(
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
  useEditorHistoryStore.getState().resetHistory();

  // Wait for IndexedDB persistence to complete (stores have 100ms throttle)
  // Add extra buffer to ensure all writes complete
  await new Promise((resolve) => setTimeout(resolve, 300));
}

export function loadProject(file: File) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const json = e.target?.result as string;
      const projectFile: ProjectFile = JSON.parse(json);

      await hydrateProjectData(projectFile);

      alert('Project loaded successfully! The application will now reload.');

      // Force a page refresh to load the new state from persistence
      window.location.reload();
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

    alert(
      'Sample project loaded successfully! The application will now reload.',
    );

    // Force a page refresh to load the new state from persistence
    window.location.reload();
  } catch (error) {
    console.error('Failed to load sample project', error);
    alert('Failed to load sample project. See console for details.');
  }
}

export function resetProject() {
  // Reset all stores to their initial states
  useLayerStore.setState({
    layers: [],
  });

  useLayerValuesStore.setState({
    values: {},
  });

  useNodeNetworkStore.setState({
    networks: {},
    openNetwork: null,
    areNetworksMinimized: false,
  });

  useEditorStore.setState({
    isPlaying: false,
    playerRef: { current: null },
    playerFPS: 60,
    ambientMode: false,
    dominantColor: '#fff',
    resolutionMultiplier: 1,
  });

  // Reset editor history
  useEditorHistoryStore.getState().resetHistory();

  // Force reload to ensure clean state
  window.location.reload();
}
