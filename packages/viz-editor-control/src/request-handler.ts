import type { VizControl } from './index.js';
import {
  decodeVizControlRequest,
  VIZ_CONTROL_PROTOCOL_VERSION,
  vizControlDiscovery,
  type VizControlResponse,
} from './protocol.js';

const createPortableSnapshot = (control: VizControl) => {
  const snapshot = control.getSnapshot();
  return {
    source: snapshot.source,
    revision: snapshot.session.revision,
    canUndo: snapshot.session.canUndo,
    canRedo: snapshot.session.canRedo,
    transport: snapshot.transport,
    audioDiagnostics: snapshot.audioDiagnostics,
  };
};

const createPortableTransactionResult = (
  control: VizControl,
  result: ReturnType<VizControl['applyTransaction']>,
) => {
  const transaction = result.transactionResult;
  return {
    ok: result.ok,
    status: transaction.status,
    transactionId: transaction.transactionId,
    actor: transaction.actor,
    baseRevision: transaction.baseRevision,
    revision: transaction.revision,
    dryRun: transaction.dryRun,
    conflict: transaction.conflict,
    transactionIssues: transaction.transactionIssues,
    warnings: transaction.warnings,
    errors: transaction.errors,
    validation: transaction.validation,
    issues: transaction.issues,
    actionEnvelopes: transaction.actionEnvelopes,
    snapshot: createPortableSnapshot(control),
  };
};

const getUntrustedRequestIdentity = (
  value: unknown,
): { id: string; operation: string } => {
  if (typeof value !== 'object' || value === null) {
    return {
      id: 'invalid-request',
      operation: 'unknown',
    };
  }

  const record = value as Record<string, unknown>;
  return {
    id:
      typeof record.id === 'string' && record.id.trim().length > 0
        ? record.id
        : 'invalid-request',
    operation:
      typeof record.operation === 'string' ? record.operation : 'unknown',
  };
};

export const executeVizControlRequest = (
  control: VizControl,
  rawRequest: unknown,
): VizControlResponse => {
  const decoded = decodeVizControlRequest(rawRequest);

  if (!decoded.ok) {
    const identity = getUntrustedRequestIdentity(rawRequest);
    return {
      protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
      id: identity.id,
      operation: identity.operation,
      ok: false,
      error: decoded.error,
    };
  }

  const request = decoded.value;

  try {
    switch (request.operation) {
      case 'control.discover':
        return {
          protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
          id: request.id,
          operation: request.operation,
          ok: true,
          result: vizControlDiscovery,
        };
      case 'control.snapshot':
        return {
          protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
          id: request.id,
          operation: request.operation,
          ok: true,
          result: control.getSnapshot(),
        };
      case 'project.inspect':
        return {
          protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
          id: request.id,
          operation: request.operation,
          ok: true,
          result: control.inspectProject(),
        };
      case 'component.inspect':
        return {
          protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
          id: request.id,
          operation: request.operation,
          ok: true,
          result: control.inspectComponents(),
        };
      case 'graph.inspect':
        return {
          protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
          id: request.id,
          operation: request.operation,
          ok: true,
          result:
            request.graphId === undefined
              ? control.inspectGraphs()
              : control.inspectGraph(request.graphId),
        };
      case 'transaction.apply': {
        const result = control.applyTransaction(request.transaction);
        return {
          protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
          id: request.id,
          operation: request.operation,
          ok: result.ok,
          result: createPortableTransactionResult(control, result),
        };
      }
      case 'history.undo': {
        control.undo();
        return {
          protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
          id: request.id,
          operation: request.operation,
          ok: true,
          result: createPortableSnapshot(control),
        };
      }
      case 'history.redo': {
        control.redo();
        return {
          protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
          id: request.id,
          operation: request.operation,
          ok: true,
          result: createPortableSnapshot(control),
        };
      }
      case 'preview.play': {
        control.play();
        return {
          protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
          id: request.id,
          operation: request.operation,
          ok: true,
          result: createPortableSnapshot(control),
        };
      }
      case 'preview.pause': {
        control.pause();
        return {
          protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
          id: request.id,
          operation: request.operation,
          ok: true,
          result: createPortableSnapshot(control),
        };
      }
      case 'preview.seek': {
        control.seekToFrame(request.frame);
        return {
          protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
          id: request.id,
          operation: request.operation,
          ok: true,
          result: createPortableSnapshot(control),
        };
      }
      case 'job.list':
        return {
          protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
          id: request.id,
          operation: request.operation,
          ok: true,
          result: control.listJobs(),
        };
      case 'job.inspect':
        return {
          protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
          id: request.id,
          operation: request.operation,
          ok: true,
          result: control.inspectJob(request.jobId),
        };
      case 'audio-bake.start':
        return {
          protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
          id: request.id,
          operation: request.operation,
          ok: true,
          result: control.startAudioFeatureBake(request.request),
        };
      case 'render.start':
        return {
          protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
          id: request.id,
          operation: request.operation,
          ok: true,
          result: control.startRender(request.request),
        };
      case 'job.cancel':
        return {
          protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
          id: request.id,
          operation: request.operation,
          ok: true,
          result: control.cancelJob(request.jobId),
        };
      case 'audio-bake.attach': {
        const result = control.attachAudioFeatureBakeOutput(
          request.jobId,
          request.expectedRevision,
        );
        return {
          protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
          id: request.id,
          operation: request.operation,
          ok: result.ok,
          result: createPortableTransactionResult(control, result),
        };
      }
    }
  } catch (error) {
    return {
      protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
      id: request.id,
      operation: request.operation,
      ok: false,
      error: {
        code: 'operation-failed',
        message:
          error instanceof Error
            ? error.message
            : 'Viz control operation failed.',
      },
    };
  }
};
