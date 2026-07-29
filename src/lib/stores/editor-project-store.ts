import { useStore } from 'zustand';

import type { LayerSettings } from '@/components/editor/layer-settings';
import type { Comp } from '@/components/config/create-component';
import { vizSessionActions, vizSessionStore } from '@/lib/viz-session';
import type { VizProjectDocument } from '@viz-engine/contracts';

type LayerPreset = {
  name: string;
  values: Record<string, any>;
  networks?: Record<string, string>;
};

export type { VizProjectDocument };

export interface EditorProjectStore {
  initialized: boolean;
  revision: number;
  sourceProject: VizProjectDocument | null;
  workingProject: VizProjectDocument;
  initializeProjectState: (force?: boolean) => void;
  importWorkingProject: (project: VizProjectDocument) => void;
  exportWorkingProject: () => VizProjectDocument;
  refreshCompDefinitions: () => void;
  addLayer: (comp: Comp) => void;
  removeLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => void;
  reorderLayers: (activeId: string, overId: string) => void;
  setLayerExpanded: (layerId: string, isExpanded: boolean) => void;
  setAllLayersExpanded: (isExpanded: boolean) => void;
  setLayerDebugEnabled: (layerId: string, isDebugEnabled: boolean) => void;
  updateLayerSettings: (layerId: string, settings: LayerSettings) => void;
  updateLayerValue: (
    layerId: string,
    path: (string | number)[],
    value: any,
  ) => void;
  applyLayerPreset: (layerId: string, preset: LayerPreset) => void;
}

const selectEditorProjectStore = (): EditorProjectStore => {
  const project = vizSessionStore.getState().project;

  return {
    initialized: project.initialized,
    revision: project.revision,
    sourceProject: project.sourceProject,
    workingProject: project.workingProject,
    initializeProjectState: vizSessionActions.project.initializeProjectState,
    importWorkingProject: vizSessionActions.project.importWorkingProject,
    exportWorkingProject: vizSessionActions.project.exportWorkingProject,
    refreshCompDefinitions: vizSessionActions.project.refreshCompDefinitions,
    addLayer: vizSessionActions.project.addLayer,
    removeLayer: vizSessionActions.project.removeLayer,
    duplicateLayer: vizSessionActions.project.duplicateLayer,
    reorderLayers: vizSessionActions.project.reorderLayers,
    setLayerExpanded: vizSessionActions.project.setLayerExpanded,
    setAllLayersExpanded: vizSessionActions.project.setAllLayersExpanded,
    setLayerDebugEnabled: vizSessionActions.project.setLayerDebugEnabled,
    updateLayerSettings: vizSessionActions.project.updateLayerSettings,
    updateLayerValue: vizSessionActions.project.updateLayerValue,
    applyLayerPreset: vizSessionActions.project.applyLayerPreset,
  };
};

type EditorProjectSelector<T> = (state: EditorProjectStore) => T;
type EditorProjectListener = (
  state: EditorProjectStore,
  previousState: EditorProjectStore,
) => void;

const useEditorProjectStore = Object.assign(
  <T>(selector: EditorProjectSelector<T>) =>
    useStore(vizSessionStore, () => selector(selectEditorProjectStore())),
  {
    getState: () => selectEditorProjectStore(),
    subscribe: (listener: EditorProjectListener) =>
      vizSessionStore.subscribe((state, previousState) =>
        listener(
          {
            ...selectEditorProjectStore(),
            initialized: state.project.initialized,
            revision: state.project.revision,
            sourceProject: state.project.sourceProject,
            workingProject: state.project.workingProject,
          },
          {
            ...selectEditorProjectStore(),
            initialized: previousState.project.initialized,
            revision: previousState.project.revision,
            sourceProject: previousState.project.sourceProject,
            workingProject: previousState.project.workingProject,
          },
        ),
      ),
  },
);

export default useEditorProjectStore;
