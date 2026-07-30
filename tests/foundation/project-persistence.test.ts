import { beforeEach, describe, expect, it } from 'vitest';

import { CompDefinitionMap } from '@/components/comps';
import { listComponentParameterIds } from '@/components/config/config';
import useNodeNetworkStore from '@/components/node-network/node-network-store';
import {
  buildProjectFile,
  hydrateProjectData,
} from '@/lib/project-persistence';
import useCompStore from '@/lib/stores/comp-store';
import useEditorGraphStore from '@/lib/stores/editor-graph-store';
import useEditorProjectStore from '@/lib/stores/editor-project-store';
import useEditorStore from '@/lib/stores/editor-store';
import { vizSessionActions, vizSessionHost } from '@/lib/viz-session';
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
    const [parameterId] = listComponentParameterIds(
      layerId,
      comp.authoring.settings,
    );
    if (!parameterId) {
      throw new Error('Could not resolve parameter id');
    }

    useEditorProjectStore
      .getState()
      .importWorkingProject(createTestProject(comp, layerId));
    useEditorGraphStore
      .getState()
      .createNetworkForParameter(parameterId, 'number');
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

  it('embeds local asset bytes and restores them into host ownership', async () => {
    const project = {
      ...createTestProject(),
      assetRefs: [
        {
          id: 'asset-portable-model',
          kind: 'model' as const,
          source: 'local' as const,
          label: 'portable.glb',
          mimeType: 'model/gltf-binary',
          originalFileName: 'portable.glb',
        },
      ],
    };
    const sourceBytes = Uint8Array.from([0x67, 0x6c, 0x54, 0x46]).buffer;
    vizSessionActions.project.importWorkingProject(project);
    vizSessionHost.registerResolvedAsset({
      id: 'asset-portable-model',
      kind: 'model',
      source: 'local',
      uri: 'memory:portable.glb',
      mimeType: 'model/gltf-binary',
      bytes: sourceBytes,
    });

    const projectFile = buildProjectFile();

    expect(projectFile.assetPayloadPolicy).toBe('embed-local-bytes-v1');
    expect(projectFile.embeddedAssets).toEqual([
      {
        assetId: 'asset-portable-model',
        encoding: 'base64',
        data: 'Z2xURg==',
      },
    ]);

    vizSessionActions.project.importWorkingProject(createTestProject());
    await hydrateProjectData(projectFile);

    const restored = vizSessionHost
      .getProjectResources()
      .resolvedAssets.find((asset) => asset.id === 'asset-portable-model');
    expect(restored).toMatchObject({
      id: 'asset-portable-model',
      kind: 'model',
      source: 'local',
      mimeType: 'model/gltf-binary',
    });
    expect([...new Uint8Array(restored?.bytes ?? new ArrayBuffer(0))]).toEqual([
      0x67, 0x6c, 0x54, 0x46,
    ]);
    expect(restored?.uri).not.toContain('idb:');
  });

  it('resolves explicitly externalized asset references without embedding', () => {
    const project = {
      ...createTestProject(),
      assetRefs: [
        {
          id: 'asset-external-model',
          kind: 'model' as const,
          source: 'external' as const,
          label: 'shared.glb',
          externalUri: 'https://assets.example.test/shared.glb',
        },
      ],
    };

    vizSessionActions.project.importWorkingProject(project);

    expect(buildProjectFile().embeddedAssets).toEqual([]);
    expect(vizSessionHost.getProjectResources().resolvedAssets).toEqual([
      expect.objectContaining({
        id: 'asset-external-model',
        uri: 'https://assets.example.test/shared.glb',
      }),
    ]);
  });
});
