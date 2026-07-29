import { beforeEach, describe, expect, it } from 'vitest';

import { CompDefinitionMap } from '@/components/comps';
import { VType } from '@/components/config/types';
import {
  buildProjectFile,
  hydrateProjectData,
} from '@/lib/project-persistence';
import { assignDeterministicIdsToConfig, getParameterIdsFromConfig } from '@/lib/comp-utils/config-utils';
import useCompStore from '@/lib/stores/comp-store';
import useEditorGraphStore from '@/lib/stores/editor-graph-store';
import useEditorProjectStore from '@/lib/stores/editor-project-store';
import useEditorStore from '@/lib/stores/editor-store';
import useNodeNetworkStore from '@/components/node-network/node-network-store';
import { VIZ_PROJECT_SCHEMA_VERSION } from '@viz-engine/contracts';
import { createTestProject } from './viz-session-test-utils';

if (!(globalThis as any).window) {
  (globalThis as any).window = globalThis;
}

describe('Project persistence', () => {
  beforeEach(() => {
    useCompStore.setState({
      comps: Array.from(CompDefinitionMap.values()),
    });
    useEditorGraphStore.getState().reset();
    useNodeNetworkStore.setState({
      openNetwork: null,
      areNetworksMinimized: false,
      shouldForceShowOverlay: false,
    });
    useEditorProjectStore.getState().importWorkingProject(createTestProject());
    useEditorStore.setState({
      ambientMode: false,
      dominantColor: '#fff',
      resolutionMultiplier: 1,
      isRhythmLabOpen: false,
      rhythmSelection: { start: 0, end: 0.2 },
      layerUi: {},
    });
  });

  it('serializes and hydrates canonical project persistence state', async () => {
    const comp = CompDefinitionMap.get('Simple Cube');
    if (!comp) {
      throw new Error('Simple Cube component definition not found');
    }

    const layerId = 'layer-persistence-test';
    const config = assignDeterministicIdsToConfig(layerId, comp.config.clone());
    const [parameterId] = getParameterIdsFromConfig(config);
    if (!parameterId) {
      throw new Error('Could not resolve parameter id');
    }

    useEditorProjectStore
      .getState()
      .importWorkingProject(createTestProject(comp, layerId));
    useEditorGraphStore
      .getState()
      .createNetworkForParameter(parameterId, VType.Number);
    useNodeNetworkStore.setState({
      openNetwork: parameterId,
      areNetworksMinimized: true,
      shouldForceShowOverlay: true,
    });
    useEditorStore.setState({
      ambientMode: true,
      dominantColor: '#fff',
      resolutionMultiplier: 2,
      isRhythmLabOpen: false,
      rhythmSelection: { start: 1, end: 2 },
      layerUi: {
        [layerId]: {
          isExpanded: true,
          isDebugEnabled: false,
        },
      },
    });

    const projectFile = buildProjectFile();

    expect(projectFile).toMatchObject({
      version: VIZ_PROJECT_SCHEMA_VERSION,
      project: {
        schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
        layerOrder: [layerId],
        layers: [
          {
            id: layerId,
            componentId: 'simple-cube',
          },
        ],
        graphs: [
          {
            id: parameterId,
            enabled: true,
          },
        ],
      },
      nodeEditorUi: {
        openNetwork: parameterId,
        areNetworksMinimized: true,
      },
      editorUi: {
        ambientMode: true,
        resolutionMultiplier: 2,
        rhythmSelection: { start: 1, end: 2 },
        layerUi: {
          [layerId]: {
            isExpanded: true,
            isDebugEnabled: false,
          },
        },
      },
    });
    expect((projectFile as any).graphs).toBeUndefined();
    expect((projectFile as any).layerStore).toBeUndefined();
    expect((projectFile as any).nodeNetworkStore).toBeUndefined();

    useEditorGraphStore.getState().reset();
    useNodeNetworkStore.setState({
      openNetwork: null,
      areNetworksMinimized: false,
      shouldForceShowOverlay: false,
    });
    useEditorProjectStore.getState().importWorkingProject(createTestProject());
    useEditorStore.setState({
      ambientMode: false,
      dominantColor: '#fff',
      resolutionMultiplier: 1,
      isRhythmLabOpen: false,
      rhythmSelection: { start: 0, end: 0.2 },
      layerUi: {},
    });

    await hydrateProjectData(projectFile);

    expect(
      useEditorProjectStore.getState().exportWorkingProject().layers[0]?.id,
    ).toBe(layerId);
    expect(useEditorGraphStore.getState().networks[parameterId]).toBeDefined();
    expect(useNodeNetworkStore.getState()).toMatchObject({
      openNetwork: parameterId,
      areNetworksMinimized: true,
      shouldForceShowOverlay: false,
    });
    expect(useEditorStore.getState()).toMatchObject({
      ambientMode: true,
      resolutionMultiplier: 2,
      rhythmSelection: { start: 1, end: 2 },
      layerUi: {
        [layerId]: {
          isExpanded: true,
          isDebugEnabled: false,
        },
      },
    });
  });
});
