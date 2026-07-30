import {
  createVizControl,
  decodeVizControlRequest,
  executeVizControlRequest,
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
