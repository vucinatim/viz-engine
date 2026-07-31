import {
  coreComponentCapabilityPack,
  defineVizComponentAuthoring,
  v,
} from '@viz-engine/components-core';
import {
  createVizComponentRegistryFromCapabilityPacks,
  type VizComponentImplementation,
} from '@viz-engine/contracts';
import {
  createVizControl,
  createVizSessionHost,
} from '@viz-engine/editor-control';
import { createVizNodeControl } from '@viz-engine/editor-control/node';
import {
  exampleProjectDocument,
  exampleResolvedArtifacts,
  exampleResolvedAssets,
} from '@viz-engine/example-projects';
import { exampleProjectBundleDirectoryUrl } from '@viz-engine/example-projects/node';
import { loadLocalVizProjectBundle } from '@viz-engine/project-bundle/node';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Viz local editor control surface', () => {
  it('opens the canonical example project and exposes stable scene state', () => {
    const control = createVizControl();
    const snapshot = control.openExampleProject();

    expect(snapshot.source.kind).toBe('example');
    expect(snapshot.session.workingProject.projectId).toBe(
      'project-example-reactive-bars',
    );
    expect(snapshot.graphSummaries).toEqual([
      {
        graphId: 'graph-main-reactivity',
        name: 'Main Reactivity Graph',
        nodeCount: 9,
        outputKeys: ['barsBass', 'barsLoudness', 'bloomIntensity'],
      },
    ]);
    expect(snapshot.transport.mode).toBe('live');
    expect(
      control
        .inspectComponents()
        .some((component) => component.componentId === 'feature-channel-bars'),
    ).toBe(true);
  });

  it('keeps transport fps and duration synchronized with the canonical project timeline', () => {
    const host = createVizSessionHost({
      initialProject: {
        project: exampleProjectDocument,
        resolvedAssets: exampleResolvedAssets,
        resolvedArtifacts: exampleResolvedArtifacts,
        source: { kind: 'example', label: 'initial' },
      },
    });
    const project = structuredClone(exampleProjectDocument);
    project.timeline = { fps: 24, durationInFrames: 288 };

    host.loadProject({
      project,
      resolvedAssets: exampleResolvedAssets,
      resolvedArtifacts: exampleResolvedArtifacts,
      source: { kind: 'memory', label: '24 fps fixture' },
    });

    expect(host.getSnapshot().transport).toMatchObject({
      fps: 24,
      durationFrames: 288,
      currentFrame: 0,
    });
  });

  it('keeps live setting gestures transient until one canonical commit', () => {
    const host = createVizSessionHost({
      initialProject: {
        project: exampleProjectDocument,
        resolvedAssets: exampleResolvedAssets,
        resolvedArtifacts: exampleResolvedArtifacts,
        source: { kind: 'example', label: 'live setting fixture' },
      },
    });
    const target = {
      layerId: 'layer-background',
      path: ['color'],
    } as const;
    const canonicalColor = host
      .getWorkingProject()
      .layers.find((layer) => layer.id === target.layerId)?.settings?.color;
    let liveNotifications = 0;
    const unsubscribe = host.subscribeLiveLayerSetting(target, () => {
      liveNotifications += 1;
    });

    host.beginLiveLayerSetting(target);
    host.updateLiveLayerSetting(target, '#112233');
    host.updateLiveLayerSetting(target, '#445566');

    expect(host.getSnapshot().session.revision).toBe(0);
    expect(host.getSnapshot().session.actionHistory).toHaveLength(0);
    expect(
      host
        .getWorkingProject()
        .layers.find((layer) => layer.id === target.layerId)?.settings?.color,
    ).toBe(canonicalColor);
    expect(host.getLiveLayerSetting(target)?.value).toBe('#445566');
    expect(host.getLiveLayerValues()[target.layerId]?.settings?.color).toBe(
      '#445566',
    );

    const result = host.commitLiveLayerSetting(target);

    expect(result?.status).toBe('applied');
    expect(host.getSnapshot().session.revision).toBe(1);
    expect(host.getSnapshot().session.actionHistory).toHaveLength(1);
    expect(
      host
        .getWorkingProject()
        .layers.find((layer) => layer.id === target.layerId)?.settings?.color,
    ).toBe('#445566');
    expect(host.getLiveLayerSetting(target)).toBeUndefined();
    expect(liveNotifications).toBe(4);
    unsubscribe();
  });

  it('cancels live settings when canonical state changes', () => {
    const host = createVizSessionHost({
      initialProject: {
        project: exampleProjectDocument,
        resolvedAssets: exampleResolvedAssets,
        resolvedArtifacts: exampleResolvedArtifacts,
        source: { kind: 'example', label: 'live setting cancellation fixture' },
      },
    });
    const target = {
      layerId: 'layer-background',
      path: ['color'],
    } as const;

    host.updateLiveLayerSetting(target, '#112233');
    host.applyAction({
      type: 'layer.settings.set',
      payload: {
        layerId: 'layer-bars',
        path: 'barCount',
        value: 16,
      },
    });

    expect(host.getLiveLayerSetting(target)).toBeUndefined();
    expect(host.getLiveLayerValues()).toEqual({});
  });

  it('previews layer properties and commits one layer replacement', () => {
    const host = createVizSessionHost({
      initialProject: {
        project: exampleProjectDocument,
        resolvedAssets: exampleResolvedAssets,
        resolvedArtifacts: exampleResolvedArtifacts,
        source: { kind: 'example', label: 'live layer property fixture' },
      },
    });
    const target = {
      layerId: 'layer-background',
      path: ['opacity'],
    } as const;

    host.beginLiveLayerProperty(target);
    host.updateLiveLayerProperty(target, 0.75);
    host.updateLiveLayerProperty(target, 0.4);

    expect(host.getSnapshot().session.revision).toBe(0);
    expect(host.getWorkingProject().layers[0]?.opacity).toBe(1);
    expect(host.getLiveLayerValues()[target.layerId]?.opacity).toBe(0.4);

    const result = host.commitLiveLayerProperty(target);

    expect(result?.status).toBe('applied');
    expect(host.getSnapshot().session.revision).toBe(1);
    expect(host.getSnapshot().session.actionHistory).toHaveLength(1);
    expect(host.getWorkingProject().layers[0]?.opacity).toBe(0.4);
    expect(host.getLiveLayerValues()).toEqual({});
  });

  it('inspects an explicitly injected project-local capability pack', () => {
    const localComponent: VizComponentImplementation = {
      id: 'project-signal-ribbon',
      name: 'Project Signal Ribbon',
      rendererFamily: 'three',
      implementationVersion: '1.0.0',
      authoring: defineVizComponentAuthoring({
        componentId: 'project-signal-ribbon',
        config: v.config({
          color: v.color({
            label: 'Color',
            defaultValue: '#88f3ff',
          }),
        }),
      }),
      render: () => null,
    };
    const componentRegistry = createVizComponentRegistryFromCapabilityPacks(
      [
        coreComponentCapabilityPack,
        {
          manifest: {
            id: 'project/production-proof',
            version: '1.0.0',
          },
          components: [localComponent],
        },
      ],
      { strict: true },
    );
    const control = createVizControl({ componentRegistry });
    const summary = control
      .inspectComponents()
      .find((component) => component.componentId === localComponent.id);

    expect(summary).toMatchObject({
      componentId: 'project-signal-ribbon',
      implementationVersion: '1.0.0',
      compatibility: 'render-safe',
      capabilityPack: {
        id: 'project/production-proof',
        version: '1.0.0',
      },
      authoring: {
        schemaVersion: 1,
        componentId: 'project-signal-ribbon',
      },
    });
  });

  it('mutates the working head and exposes updated frame and debug snapshots', () => {
    const control = createVizControl();
    control.openExampleProject();

    const mutation = control.applyActions([
      {
        type: 'layer.settings.set',
        payload: {
          layerId: 'layer-background',
          path: 'color',
          value: '#03111c',
        },
      },
      {
        type: 'layer.input.set',
        payload: {
          layerId: 'layer-bars',
          inputKey: 'gain',
          valueSource: {
            kind: 'literal',
            value: 0.35,
          },
        },
      },
    ]);

    expect(mutation.ok).toBe(true);
    expect(mutation.snapshot.session.revision).toBe(
      mutation.transactionResult.baseRevision + 1,
    );

    const frameInspection = control.inspectFrame(36);
    const debugSnapshot = control.createDebugSnapshot(36);

    expect(frameInspection.framePlan.issues).toHaveLength(0);
    expect(
      frameInspection.framePlan.layers.find(
        (layer) => layer.layerId === 'layer-bars',
      )?.resolvedInputs.gain.value,
    ).toBe(0.35);
    expect(debugSnapshot.renderPlan.issues).toHaveLength(0);
    expect(debugSnapshot.svg).toContain('data-layer-id="layer-bars"');
  });

  it('opens bundle-backed projects and exports a mutated working head', () => {
    const control = createVizNodeControl();
    const tempDirectory = mkdtempSync(
      join(tmpdir(), 'viz-editor-control-export-'),
    );

    try {
      const snapshot = control.openBundleProject(
        exampleProjectBundleDirectoryUrl,
      );
      expect(snapshot.source.kind).toBe('bundle');

      const mutation = control.applyAction({
        type: 'graph.output.set',
        payload: {
          graphId: 'graph-main-reactivity',
          output: {
            key: 'barsGainOperator',
            nodeId: 'node-bars-bass-scale',
            output: 'value',
          },
        },
      });

      expect(mutation.ok).toBe(true);

      const exportResult = control.exportWorkingBundle(tempDirectory);
      const reloaded = loadLocalVizProjectBundle(tempDirectory);

      expect(exportResult.issues).toHaveLength(0);
      expect(reloaded.issues).toHaveLength(0);
      expect(
        reloaded.project.graphs?.[0]?.outputs.some(
          (output) => output.key === 'barsGainOperator',
        ),
      ).toBe(true);
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });

  it('keeps explicit preview and audio diagnostics without UI scraping', () => {
    const control = createVizControl();
    control.openExampleProject();

    control.seekToFrame(48);
    control.play();
    control.pause();
    control.attachAudioSource({
      kind: 'file',
      id: 'audio-main',
      label: 'Main Track',
    });
    control.setAudioAnalyzerState('active');
    control.setLiveInputAvailable(true);

    const snapshot = control.getSnapshot();

    expect(snapshot.session.previewState.currentFrame).toBe(48);
    expect(snapshot.session.previewState.isPlaying).toBe(false);
    expect(snapshot.audioDiagnostics.inputMode).toBe('hybrid');
    expect(snapshot.audioDiagnostics.usesLiveAudio).toBe(true);
    expect(snapshot.audioDiagnostics.usesBakedArtifacts).toBe(true);
  });

  it('selects the project-declared baked audio source when project resources open', () => {
    const control = createVizControl();
    const nonProjectAudio = {
      ...exampleResolvedAssets[0]!,
      id: 'asset-unrelated-audio',
      kind: 'audio' as const,
      uri: 'file:///unrelated.mp3',
    };

    const snapshot = control.openProject({
      project: exampleProjectDocument,
      resolvedAssets: [nonProjectAudio, ...exampleResolvedAssets],
      resolvedArtifacts: exampleResolvedArtifacts,
      source: {
        kind: 'memory',
        label: 'Canonical project audio proof',
      },
    });

    const audioRef = exampleProjectDocument.assetRefs?.find(
      (asset) => asset.kind === 'audio',
    );
    const resolvedAudio = exampleResolvedAssets.find(
      (asset) => asset.id === audioRef?.id,
    );

    expect(snapshot.audioSession.source).toEqual({
      kind: 'media-element',
      id: audioRef?.id,
      label: audioRef?.label,
      uri: resolvedAudio?.uri,
    });
  });

  it('exposes ui-state mutation, graph runtime inspection, and transport advancement', () => {
    const control = createVizControl();
    control.openExampleProject();

    control.setUiState({
      activePanel: 'graph',
      selectedLayerId: 'layer-bars',
      selectedGraphId: 'graph-main-reactivity',
    });

    control.seekToFrame(24);
    control.play();
    control.advanceBySeconds(0.5);
    control.pause();

    const snapshot = control.getSnapshot();
    const graphRuntime = control.inspectGraphRuntime();
    const expectedFrame = 24 + Math.floor(snapshot.transport.fps * 0.5);

    expect(snapshot.session.uiState.activePanel).toBe('graph');
    expect(snapshot.session.uiState.selectedLayerId).toBe('layer-bars');
    expect(snapshot.session.uiState.selectedGraphId).toBe(
      'graph-main-reactivity',
    );
    expect(snapshot.session.previewState.currentFrame).toBe(expectedFrame);

    expect(graphRuntime.frame).toBe(expectedFrame);
    expect(graphRuntime.graphs).toHaveLength(1);
    expect(graphRuntime.graphs[0]?.graphId).toBe('graph-main-reactivity');
    expect(graphRuntime.graphs[0]?.values).toMatchObject({
      barsBass: expect.any(Number),
      barsLoudness: expect.any(Number),
      bloomIntensity: expect.any(Number),
    });
    expect(
      graphRuntime.graphs[0]?.nodes['node-bars-bass-scale']?.outputs.value,
    ).toEqual(expect.any(Number));
    expect(graphRuntime.graphs[0]?.checkpoint?.frame).toBe(expectedFrame);

    const projectInspection = control.inspectProject();
    expect(projectInspection.validation.ok).toBe(true);
    expect(projectInspection.assets.length).toBeGreaterThan(0);
    expect(projectInspection.issues).toHaveLength(0);
  });

  it('undoes and redoes through the same canonical action session', () => {
    const control = createVizControl();
    control.openExampleProject();
    control.applyAction({
      type: 'layer.settings.set',
      payload: {
        layerId: 'layer-background',
        path: 'color',
        value: '#123456',
      },
    });

    expect(
      control
        .getWorkingProject()
        .layers.find((layer) => layer.id === 'layer-background')?.settings
        ?.color,
    ).toBe('#123456');
    control.undo();
    expect(
      control
        .getWorkingProject()
        .layers.find((layer) => layer.id === 'layer-background')?.settings
        ?.color,
    ).not.toBe('#123456');
    control.redo();
    expect(
      control
        .getWorkingProject()
        .layers.find((layer) => layer.id === 'layer-background')?.settings
        ?.color,
    ).toBe('#123456');
  });

  it('shares one revision-safe host across human and agent controls', () => {
    const host = createVizSessionHost({
      actor: { kind: 'user', id: 'studio-user' },
      initialProject: {
        project: exampleProjectDocument,
        resolvedAssets: exampleResolvedAssets,
        resolvedArtifacts: exampleResolvedArtifacts,
        source: {
          kind: 'memory',
          label: 'Shared host proof',
        },
      },
    });
    const human = createVizControl({
      host,
      actor: { kind: 'user', id: 'studio-user' },
    });
    const agent = createVizControl({
      host,
      actor: { kind: 'agent', id: 'codex' },
    });
    const observedRevisions: number[] = [];
    const unsubscribe = agent.subscribe((snapshot) => {
      observedRevisions.push(snapshot.session.revision);
    });

    const humanMutation = human.applyAction({
      type: 'layer.settings.set',
      payload: {
        layerId: 'layer-background',
        path: 'color',
        value: '#102030',
      },
    });
    expect(humanMutation.transactionResult.status).toBe('applied');
    expect(humanMutation.snapshot.session.revision).toBe(1);

    const staleAgentMutation = agent.applyTransaction({
      id: 'agent-stale',
      expectedRevision: 0,
      actions: [
        {
          type: 'layer.settings.set',
          payload: {
            layerId: 'layer-bars',
            path: 'gain',
            value: 0.2,
          },
        },
      ],
    });
    expect(staleAgentMutation.transactionResult.status).toBe('conflict');
    expect(staleAgentMutation.transactionResult.conflict).toEqual({
      expectedRevision: 0,
      actualRevision: 1,
    });
    expect(host.getSnapshot().session.revision).toBe(1);

    const dryRun = agent.applyTransaction({
      id: 'agent-dry-run',
      expectedRevision: 1,
      dryRun: true,
      actions: [
        {
          type: 'layer.settings.set',
          payload: {
            layerId: 'layer-bars',
            path: 'gain',
            value: 0.25,
          },
        },
      ],
    });
    expect(dryRun.transactionResult.status).toBe('dry-run');
    expect(
      dryRun.transactionResult.candidateProject.layers.find(
        (layer) => layer.id === 'layer-bars',
      )?.settings?.gain,
    ).toBe(0.25);
    expect(host.getSnapshot().session.revision).toBe(1);
    expect(host.getSnapshot().session.actionHistory).toHaveLength(1);

    const agentMutation = agent.applyTransaction({
      id: 'agent-atomic-edit',
      expectedRevision: 1,
      actions: [
        {
          type: 'layer.settings.set',
          payload: {
            layerId: 'layer-bars',
            path: 'gain',
            value: 0.3,
          },
        },
        {
          type: 'layer.settings.set',
          payload: {
            layerId: 'layer-bloom',
            path: 'intensity',
            value: 0.4,
          },
        },
      ],
    });
    expect(agentMutation.transactionResult.status).toBe('applied');
    expect(agentMutation.snapshot.session.revision).toBe(2);
    expect(
      agentMutation.transactionResult.actionEnvelopes.map((entry) => ({
        transactionId: entry.transactionId,
        actor: entry.actor,
      })),
    ).toEqual([
      {
        transactionId: 'agent-atomic-edit',
        actor: { kind: 'agent', id: 'codex' },
      },
      {
        transactionId: 'agent-atomic-edit',
        actor: { kind: 'agent', id: 'codex' },
      },
    ]);
    expect(human.getSnapshot().session.revision).toBe(2);
    expect(
      human
        .getWorkingProject()
        .layers.find((layer) => layer.id === 'layer-bars')?.settings?.gain,
    ).toBe(0.3);

    human.undo();
    expect(host.getSnapshot().session.revision).toBe(3);
    expect(
      agent
        .getWorkingProject()
        .layers.find((layer) => layer.id === 'layer-bars')?.settings?.gain,
    ).not.toBe(0.3);
    expect(
      agent
        .getWorkingProject()
        .layers.find((layer) => layer.id === 'layer-background')?.settings
        ?.color,
    ).toBe('#102030');
    expect(observedRevisions).toContain(2);
    expect(human.getHost()).toBe(agent.getHost());

    unsubscribe();
  });
});
