import {
  createVizControl,
  decodeVizControlRequest,
  executeVizControlRequest,
  executeVizControlRequestAsync,
  VIZ_CONTROL_PROTOCOL_VERSION,
} from '@viz-engine/editor-control';
import { describe, expect, it } from 'vitest';

describe('VizControl protocol', () => {
  it('authoritatively rejects malformed nested action payloads', () => {
    const decoded = decodeVizControlRequest({
      protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
      id: 'invalid-action',
      operation: 'transaction.apply',
      transaction: {
        expectedRevision: 0,
        actions: [
          {
            type: 'layer.settings.set',
            payload: {
              layerId: '',
              path: 'color',
              value: '#ffffff',
              unexpected: true,
            },
          },
        ],
      },
    });

    expect(decoded.ok).toBe(false);
    if (!decoded.ok) {
      expect(decoded.error).toMatchObject({
        code: 'invalid-request',
        message: 'Invalid Viz control request.',
      });
      expect(decoded.error.issues?.length).toBeGreaterThan(0);
    }
  });

  it('executes decoded transactions with host-assigned actor identity', () => {
    const control = createVizControl({
      actor: { kind: 'agent', id: 'protocol-agent' },
    });
    const baseRevision = control.getSnapshot().session.revision;
    const response = executeVizControlRequest(control, {
      protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
      id: 'protocol-transaction',
      operation: 'transaction.apply',
      transaction: {
        id: 'protocol-transaction',
        expectedRevision: baseRevision,
        actions: [
          {
            type: 'layer.settings.set',
            payload: {
              layerId: 'layer-background',
              path: 'color',
              value: '#334455',
            },
          },
        ],
      },
    });

    expect(response.ok).toBe(true);
    expect(response.result).toMatchObject({
      ok: true,
      status: 'applied',
      transactionId: 'protocol-transaction',
      actor: {
        kind: 'agent',
        id: 'protocol-agent',
      },
      baseRevision,
      revision: baseRevision + 1,
      snapshot: {
        revision: baseRevision + 1,
        canUndo: true,
      },
    });
    expect(response.result).not.toHaveProperty('project');
    expect(response.result).not.toHaveProperty('candidateProject');
    expect(control.getSnapshot().session.actionHistory.at(-1)).toMatchObject({
      transactionId: 'protocol-transaction',
      actor: {
        kind: 'agent',
        id: 'protocol-agent',
      },
    });
  });

  it('returns lean portable snapshots for transport and history commands', () => {
    const control = createVizControl();
    const playResponse = executeVizControlRequest(control, {
      protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
      id: 'play',
      operation: 'preview.play',
    });
    const undoResponse = executeVizControlRequest(control, {
      protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
      id: 'undo',
      operation: 'history.undo',
    });

    expect(playResponse.result).toMatchObject({
      revision: control.getSnapshot().session.revision,
      transport: {
        isPlaying: true,
      },
    });
    expect(playResponse.result).not.toHaveProperty('session');
    expect(undoResponse.result).not.toHaveProperty('session');
  });

  it('supports focused component and node capability inspection', () => {
    const control = createVizControl();
    const componentResponse = executeVizControlRequest(control, {
      protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
      id: 'inspect-component',
      operation: 'component.inspect',
      componentId: 'reactive-bars',
    });
    const nodeResponse = executeVizControlRequest(control, {
      protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
      id: 'inspect-node',
      operation: 'node.inspect',
      nodeType: 'multiply',
    });

    expect(componentResponse.result).toMatchObject([
      {
        componentId: 'reactive-bars',
        inputKeys: ['bass', 'loudness'],
      },
    ]);
    expect(nodeResponse.result).toMatchObject([
      {
        nodeType: 'multiply',
        name: 'Multiply',
        category: 'pure',
        authoring: {
          inputs: [
            { key: 'value', type: 'number' },
            { key: 'factor', type: 'number' },
          ],
          outputs: [{ key: 'value', type: 'number' }],
        },
      },
    ]);
  });

  it('exposes canonical runtime diagnostics through the transport', () => {
    const control = createVizControl();
    const frameResponse = executeVizControlRequest(control, {
      protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
      id: 'inspect-frame',
      operation: 'frame.inspect',
      frame: 12,
    });
    const graphResponse = executeVizControlRequest(control, {
      protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
      id: 'inspect-graph-runtime',
      operation: 'graph.runtime.inspect',
      frame: 12,
    });
    const renderResponse = executeVizControlRequest(control, {
      protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
      id: 'inspect-render',
      operation: 'render.inspect',
      frame: 12,
    });

    expect(frameResponse.result).toMatchObject({
      frame: 12,
      framePlan: { frameContext: { frame: 12 } },
    });
    expect(graphResponse.result).toMatchObject({
      frame: 12,
      graphs: [{ graphId: 'graph-main-reactivity' }],
    });
    expect(renderResponse.result).toMatchObject({
      frame: 12,
      renderPlan: { frameContext: { frame: 12 } },
    });
  });

  it('opens resolved project bundles through the asynchronous host service', async () => {
    const control = createVizControl();
    const project = {
      ...control.getSnapshot().session.workingProject,
      projectId: 'project-opened-bundle',
      name: 'Opened Bundle',
    };
    const response = await executeVizControlRequestAsync(
      control,
      {
        protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
        id: 'open-bundle',
        operation: 'project.bundle.open',
        url: 'https://viz.test/productions/opened-bundle/',
      },
      {
        openBundle: async () => ({
          project,
          resolvedAssets: [],
          resolvedArtifacts: [],
          source: {
            kind: 'bundle',
            label: project.name,
            bundleDirectory: 'https://viz.test/productions/opened-bundle/',
          },
        }),
      },
    );

    expect(response).toMatchObject({
      ok: true,
      result: {
        source: { kind: 'bundle', label: 'Opened Bundle' },
        projectId: 'project-opened-bundle',
        projectName: 'Opened Bundle',
      },
    });
    expect(control.getSnapshot().session.workingProject.projectId).toBe(
      'project-opened-bundle',
    );
  });

  it('delegates browser-owned render output downloads through the host service', async () => {
    const control = createVizControl();
    const response = await executeVizControlRequestAsync(
      control,
      {
        protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
        id: 'download-output',
        operation: 'job.output.download',
        jobId: 'render-1',
        outputId: 'render-output-1',
      },
      {
        openBundle: async () => {
          throw new Error('not used');
        },
        downloadRenderOutput: async (jobId, outputId) => ({
          jobId,
          outputId,
          fileName: 'render.png',
        }),
      },
    );

    expect(response).toMatchObject({
      ok: true,
      result: {
        jobId: 'render-1',
        outputId: 'render-output-1',
        fileName: 'render.png',
      },
    });
  });

  it('returns structured errors instead of throwing on unknown requests', () => {
    const response = executeVizControlRequest(createVizControl(), {
      protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
      id: 'unknown-operation',
      operation: 'project.destroy',
    });

    expect(response).toMatchObject({
      id: 'unknown-operation',
      operation: 'project.destroy',
      ok: false,
      error: {
        code: 'invalid-request',
      },
    });
  });
});
