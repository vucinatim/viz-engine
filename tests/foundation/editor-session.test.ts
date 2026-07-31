import { createCoreComponentRegistry } from '@viz-engine/components-core';
import { createVizEditorSession } from '@viz-engine/editor-session';
import {
  exampleProjectDocument,
  exampleResolvedArtifacts,
  exampleResolvedAssets,
} from '@viz-engine/example-projects';
import { createCoreNodeRegistry } from '@viz-engine/nodes-core';
import {
  loadLocalVizProjectBundle,
  writeLocalVizProjectBundle,
} from '@viz-engine/project-bundle/node';
import {
  createVizFramePlan,
  createVizRuntimeSession,
  validateProjectDocument,
} from '@viz-engine/runtime';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Viz editor session foundation', () => {
  it('keeps canonical project truth separate from editor UI and preview state', () => {
    const session = createVizEditorSession({
      project: exampleProjectDocument,
      uiState: {
        selectedLayerId: 'layer-bars',
        expandedLayerIds: ['layer-bars', 'layer-bloom'],
        activePanel: 'graph',
      },
      previewState: {
        currentFrame: 48,
        isPlaying: true,
        mode: 'live',
      },
    });

    const snapshot = session.getSnapshot();
    const exported = session.exportWorkingProject();

    expect(snapshot.uiState.selectedLayerId).toBe('layer-bars');
    expect(snapshot.previewState.currentFrame).toBe(48);
    expect(snapshot.previewState.mode).toBe('live');
    expect(validateProjectDocument(exported).ok).toBe(true);
    expect(exported).not.toHaveProperty('uiState');
    expect(exported).not.toHaveProperty('previewState');
    expect(exported.layerOrder).toEqual(exampleProjectDocument.layerOrder);
  });

  it('applies canonical actions into the working head and keeps the project renderable', () => {
    const session = createVizEditorSession({
      project: exampleProjectDocument,
      actor: { kind: 'agent', id: 'codex' },
    });

    const result = session.applyActions([
      {
        type: 'layer.settings.set',
        payload: {
          layerId: 'layer-background',
          path: 'color',
          value: '#0a1623',
        },
      },
      {
        type: 'layer.input.set',
        payload: {
          layerId: 'layer-bloom',
          inputKey: 'intensity',
          valueSource: {
            kind: 'literal',
            value: 0.42,
          },
        },
      },
    ]);

    expect(result.ok).toBe(true);
    expect(result.revision).toBe(1);
    expect(result.actionEnvelopes).toHaveLength(2);
    expect(result.actionEnvelopes[0]?.actor).toEqual({
      kind: 'agent',
      id: 'codex',
    });

    const runtimeSession = createVizRuntimeSession({
      project: session.exportWorkingProject(),
      mode: 'render',
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
      seed: 'editor-session-seed',
    });
    const framePlan = createVizFramePlan({
      session: runtimeSession,
      frame: 24,
      registry: createCoreComponentRegistry(),
      nodeRegistry: createCoreNodeRegistry(),
    });

    expect(framePlan.issues).toHaveLength(0);
    expect(
      session
        .exportWorkingProject()
        .layers.find((layer) => layer.id === 'layer-background')?.settings,
    ).toMatchObject({
      color: '#0a1623',
    });
    expect(
      framePlan.layers.find((layer) => layer.layerId === 'layer-bloom')
        ?.resolvedInputs.intensity.value,
    ).toBe(0.42);
  });

  it('rejects invalid mutations without corrupting the working head', () => {
    const session = createVizEditorSession({
      project: exampleProjectDocument,
    });

    const before = session.exportWorkingProject();
    const result = session.applyAction({
      type: 'layer.remove',
      payload: {
        layerId: 'layer-does-not-exist',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('missing-layer');
    expect(result.revision).toBe(0);
    expect(session.exportWorkingProject()).toEqual(before);
    expect(session.getSnapshot().issues).toEqual([
      {
        source: 'action',
        severity: 'error',
        code: 'missing-layer',
        message: 'Cannot remove missing layer "layer-does-not-exist".',
      },
    ]);
  });

  it('roundtrips a mutated working head through bundle export and reload', () => {
    const session = createVizEditorSession({
      project: exampleProjectDocument,
    });
    const bundleDirectory = mkdtempSync(
      join(tmpdir(), 'viz-editor-session-bundle-'),
    );

    try {
      const mutation = session.applyActions([
        {
          type: 'graph.output.set',
          payload: {
            graphId: 'graph-main-reactivity',
            output: {
              key: 'barsGainEditor',
              nodeId: 'node-bars-bass-scale',
              output: 'value',
            },
          },
        },
        {
          type: 'layer.input.set',
          payload: {
            layerId: 'layer-bars',
            inputKey: 'gain',
            valueSource: {
              kind: 'graph-output',
              graphId: 'graph-main-reactivity',
              output: 'barsGainEditor',
            },
          },
        },
      ]);

      expect(mutation.ok).toBe(true);

      const writeResult = writeLocalVizProjectBundle({
        bundleDirectory,
        project: session.exportWorkingProject(),
        resolvedAssets: exampleResolvedAssets,
        resolvedArtifacts: exampleResolvedArtifacts,
      });
      const reloaded = loadLocalVizProjectBundle(bundleDirectory);

      expect(writeResult.issues).toHaveLength(0);
      expect(reloaded.issues).toHaveLength(0);
      expect(
        reloaded.project.graphs?.[0]?.outputs.some(
          (output) => output.key === 'barsGainEditor',
        ),
      ).toBe(true);
      expect(
        reloaded.project.layers.find((layer) => layer.id === 'layer-bars')
          ?.inputs?.gain,
      ).toEqual({
        kind: 'graph-output',
        graphId: 'graph-main-reactivity',
        output: 'barsGainEditor',
      });
    } finally {
      rmSync(bundleDirectory, { recursive: true, force: true });
    }
  });

  it('commits revision-safe transactions atomically with durable attribution', () => {
    const session = createVizEditorSession({
      project: exampleProjectDocument,
      actor: { kind: 'user', id: 'human' },
    });

    const result = session.transact(
      {
        id: 'agent-transaction',
        expectedRevision: 0,
        actions: [
          {
            type: 'layer.settings.set',
            payload: {
              layerId: 'layer-bars',
              path: 'gain',
              value: 0.35,
            },
          },
          {
            type: 'layer.remove',
            payload: {
              layerId: 'missing-layer',
            },
          },
        ],
      },
      {
        actor: { kind: 'agent', id: 'codex' },
      },
    );

    expect(result.status).toBe('rejected');
    expect(result.revision).toBe(0);
    expect(session.getSnapshot().actionHistory).toHaveLength(0);
    expect(
      session
        .getWorkingProject()
        .layers.find((layer) => layer.id === 'layer-bars')?.settings?.gain,
    ).not.toBe(0.35);

    const applied = session.transact(
      {
        id: 'agent-transaction',
        expectedRevision: 0,
        actions: [
          {
            type: 'layer.settings.set',
            payload: {
              layerId: 'layer-bars',
              path: 'gain',
              value: 0.35,
            },
          },
          {
            type: 'layer.settings.set',
            payload: {
              layerId: 'layer-bloom',
              path: 'intensity',
              value: 0.45,
            },
          },
        ],
      },
      {
        actor: { kind: 'agent', id: 'codex' },
      },
    );

    expect(applied).toMatchObject({
      ok: true,
      status: 'applied',
      transactionId: 'agent-transaction',
      baseRevision: 0,
      revision: 1,
    });
    expect(applied.actionEnvelopes).toHaveLength(2);
    expect(
      applied.actionEnvelopes.every(
        (entry) =>
          entry.transactionId === 'agent-transaction' &&
          entry.actor.kind === 'agent' &&
          entry.actor.id === 'codex',
      ),
    ).toBe(true);

    session.undo();
    expect(session.getSnapshot().revision).toBe(2);
    expect(
      session
        .getWorkingProject()
        .layers.find((layer) => layer.id === 'layer-bars')?.settings?.gain,
    ).not.toBe(0.35);
  });

  it('keeps dry runs and conflicts side-effect free', () => {
    const session = createVizEditorSession({
      project: exampleProjectDocument,
    });
    let notifications = 0;
    const unsubscribe = session.subscribe(() => {
      notifications += 1;
    });

    const dryRun = session.transact({
      expectedRevision: 0,
      dryRun: true,
      actions: [
        {
          type: 'layer.settings.set',
          payload: {
            layerId: 'layer-background',
            path: 'color',
            value: '#abcdef',
          },
        },
      ],
    });
    expect(dryRun.status).toBe('dry-run');
    expect(dryRun.revision).toBe(0);
    expect(
      dryRun.candidateProject.layers.find(
        (layer) => layer.id === 'layer-background',
      )?.settings?.color,
    ).toBe('#abcdef');

    const conflict = session.transact({
      expectedRevision: 1,
      actions: [
        {
          type: 'layer.settings.set',
          payload: {
            layerId: 'layer-background',
            path: 'color',
            value: '#abcdef',
          },
        },
      ],
    });
    expect(conflict.status).toBe('conflict');
    expect(conflict.conflict).toEqual({
      expectedRevision: 1,
      actualRevision: 0,
    });
    expect(session.getSnapshot().revision).toBe(0);
    expect(session.getSnapshot().actionHistory).toHaveLength(0);
    expect(notifications).toBe(0);

    unsubscribe();
  });

  it('loads a new project without replacing the subscribed session object', () => {
    const session = createVizEditorSession({
      project: exampleProjectDocument,
    });
    const observedProjectIds: string[] = [];
    session.subscribe((snapshot) => {
      observedProjectIds.push(snapshot.workingProject.projectId);
    });
    const loadedProject = structuredClone(exampleProjectDocument);
    loadedProject.projectId = 'project-loaded-in-place';
    loadedProject.name = 'Loaded In Place';

    const snapshot = session.loadProject(loadedProject);

    expect(snapshot.revision).toBe(1);
    expect(session.getSourceProject().projectId).toBe(
      'project-loaded-in-place',
    );
    expect(session.getWorkingProject().projectId).toBe(
      'project-loaded-in-place',
    );
    expect(observedProjectIds).toEqual(['project-loaded-in-place']);
  });

  it('publishes allocation-free change signals without requiring snapshots', () => {
    const session = createVizEditorSession({
      project: exampleProjectDocument,
    });
    let changes = 0;
    const unsubscribe = session.subscribeChanges(() => {
      changes += 1;
    });

    session.setPreviewState({ currentFrame: 12 });
    session.setUiState({ activePanel: 'preview' });

    expect(changes).toBe(2);
    unsubscribe();
    session.setPreviewState({ currentFrame: 24 });
    expect(changes).toBe(2);
  });

  it('preserves immutable structural sharing while exported projects remain defensive', () => {
    const session = createVizEditorSession({
      project: exampleProjectDocument,
    });
    const before = session.getWorkingProjectView();
    const unchangedLayer = before.layers.find(
      (layer) => layer.id === 'layer-bars',
    );
    const changedLayer = before.layers.find(
      (layer) => layer.id === 'layer-background',
    );

    session.applyAction({
      type: 'layer.settings.set',
      payload: {
        layerId: 'layer-background',
        path: 'color',
        value: '#123456',
      },
    });

    const after = session.getWorkingProjectView();
    expect(after).not.toBe(before);
    expect(after.layers.find((layer) => layer.id === 'layer-bars')).toBe(
      unchangedLayer,
    );
    expect(
      after.layers.find((layer) => layer.id === 'layer-background'),
    ).not.toBe(changedLayer);

    const exported = session.exportWorkingProject();
    exported.name = 'Mutated Export';
    expect(session.getWorkingProjectView().name).not.toBe('Mutated Export');
  });
});
