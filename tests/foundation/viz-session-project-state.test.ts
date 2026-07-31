import { beforeEach, describe, expect, it } from 'vitest';

import { CompDefinitionMap } from '@/components/comps';
import { getProjectedLayers } from '@/lib/projected-layers';
import useCompStore from '@/lib/stores/comp-store';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import {
  getVizSessionState,
  vizSessionActions,
  vizSessionStore,
} from '@/lib/viz-session';
import { createTestProject } from './viz-session-test-utils';

describe('VizSession project state', () => {
  beforeEach(() => {
    if (!(globalThis as any).window) {
      (globalThis as any).window = globalThis;
    }

    useCompStore.setState({
      comps: Array.from(CompDefinitionMap.values()),
    });
    vizSessionActions.project.importWorkingProject(createTestProject());
    useEditorRuntimePreviewAttachmentStore.getState().reset();
  });

  it('owns canonical layer/value truth while projection stores mirror it', () => {
    const comp = CompDefinitionMap.values().next().value;
    if (!comp) {
      throw new Error('Expected at least one component definition');
    }

    const project = createTestProject(comp, 'layer-test');
    project.layers[0] = {
      ...project.layers[0],
      settings: { appearance: { opacity: 0.5 }, color: '#ff00ff' },
    };
    vizSessionActions.project.importWorkingProject(project);

    expect(getProjectedLayers()).toHaveLength(1);

    vizSessionActions.project.updateLayerValue(
      'layer-test',
      ['appearance', 'opacity'],
      0.8,
    );

    expect(
      getVizSessionState().project.workingProject.layers[0].settings,
    ).toMatchObject({
      appearance: { opacity: 0.8 },
      color: '#ff00ff',
    });
    expect(
      vizSessionStore.getState().project.workingProject.layers[0].settings,
    ).toMatchObject({
      appearance: { opacity: 0.8 },
      color: '#ff00ff',
    });
  });

  it('re-hydrates projected layer state from canonical working-project truth', () => {
    const comp = CompDefinitionMap.values().next().value;
    if (!comp) {
      throw new Error('Expected at least one component definition');
    }

    const project = createTestProject(comp, 'layer-canonical');
    project.layers[0] = {
      ...project.layers[0],
      settings: { value: 1 },
    };
    vizSessionActions.project.importWorkingProject(project);

    vizSessionActions.project.initializeProjectState();

    expect(getProjectedLayers()).toHaveLength(1);
    expect(
      getVizSessionState().project.workingProject.layers[0].settings,
    ).toMatchObject({ value: 1 });
  });

  it('preserves projections for layers untouched by a canonical edit', () => {
    const comp = CompDefinitionMap.values().next().value;
    if (!comp) {
      throw new Error('Expected at least one component definition');
    }
    const project = createTestProject(comp, 'layer-changed');
    const secondLayer = {
      ...structuredClone(project.layers[0]!),
      id: 'layer-unchanged',
      name: 'Unchanged Layer',
    };
    project.layers.push(secondLayer);
    project.layerOrder.push(secondLayer.id);
    vizSessionActions.project.importWorkingProject(project);
    const before = getProjectedLayers();
    const canonicalBefore =
      getVizSessionState().project.workingProject.layers[1];

    vizSessionActions.project.updateLayerValue('layer-changed', ['value'], 2);
    const after = getProjectedLayers();
    const canonicalAfter =
      getVizSessionState().project.workingProject.layers[1];

    expect(canonicalAfter).toBe(canonicalBefore);
    expect(after[0]).not.toBe(before[0]);
    expect(after[1]).toBe(before[1]);
  });
});
