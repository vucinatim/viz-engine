import { beforeEach, describe, expect, it } from 'vitest';

import { CompDefinitionMap } from '@/components/comps';
import useEditorProjectStore from '@/lib/stores/editor-project-store';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import { getProjectedLayers } from '@/lib/stores/editor-layer-projection-store';
import useCompStore from '@/lib/stores/comp-store';
import { vizSessionStore } from '@/lib/viz-session';
import { createTestProject } from './viz-session-test-utils';

describe('Editor project store', () => {
  beforeEach(() => {
    if (!(globalThis as any).window) {
      (globalThis as any).window = globalThis;
    }

    useCompStore.setState({
      comps: Array.from(CompDefinitionMap.values()),
    });
    useEditorProjectStore
      .getState()
      .importWorkingProject(createTestProject());
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
    useEditorProjectStore.getState().importWorkingProject(project);

    expect(getProjectedLayers()).toHaveLength(1);

    useEditorProjectStore
      .getState()
      .updateLayerValue('layer-test', ['appearance', 'opacity'], 0.8);

    expect(
      useEditorProjectStore.getState().workingProject.layers[0].settings,
    ).toMatchObject({
      appearance: { opacity: 0.8 },
      color: '#ff00ff',
    });
    expect(vizSessionStore.getState().project.workingProject.layers[0].settings).toMatchObject({
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
    useEditorProjectStore.getState().importWorkingProject(project);

    useEditorProjectStore.getState().initializeProjectState();

    expect(getProjectedLayers()).toHaveLength(1);
    expect(
      useEditorProjectStore.getState().workingProject.layers[0].settings,
    ).toMatchObject({ value: 1 });
  });
});
