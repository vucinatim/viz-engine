import { vizControl } from '@/lib/viz-session';
import {
  executeVizControlRequestAsync,
  VIZ_CONTROL_PROTOCOL_VERSION,
  type VizControlEvent,
} from '@viz-engine/editor-control';
import { loadBrowserVizProjectBundle } from '@viz-engine/project-bundle/browser';

interface BridgeRequest {
  targetEditorInstanceId: string;
  request: unknown;
}

const createEditorInstanceId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `viz-editor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const isBridgeRequest = (value: unknown): value is BridgeRequest => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).targetEditorInstanceId ===
      'string' &&
    'request' in value
  );
};

export const mountVizControlBridge = (): (() => void) => {
  if (import.meta.hot === undefined) {
    return () => undefined;
  }

  const editorInstanceId = createEditorInstanceId();
  let lastPublishedRevision = -1;
  let lastPublishedPayload = '';
  let transportEventTimer: ReturnType<typeof setTimeout> | undefined;

  const publishSnapshot = () => {
    const snapshot = vizControl.getSnapshot();
    const event: VizControlEvent = {
      protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
      type: 'snapshot',
      revision: snapshot.session.revision,
      snapshot: {
        source: snapshot.source,
        revision: snapshot.session.revision,
        canUndo: snapshot.session.canUndo,
        canRedo: snapshot.session.canRedo,
        transport: snapshot.transport,
        audioDiagnostics: snapshot.audioDiagnostics,
      },
    };
    const serializedEvent = JSON.stringify(event);
    if (serializedEvent === lastPublishedPayload) {
      return;
    }
    import.meta.hot?.send('viz-control:event', {
      editorInstanceId,
      event,
    });
    lastPublishedRevision = snapshot.session.revision;
    lastPublishedPayload = serializedEvent;
  };

  const publishSnapshotSoon = () => {
    const revision = vizControl.getSnapshot().session.revision;
    if (revision !== lastPublishedRevision) {
      if (transportEventTimer !== undefined) {
        clearTimeout(transportEventTimer);
        transportEventTimer = undefined;
      }
      publishSnapshot();
      return;
    }
    if (transportEventTimer === undefined) {
      transportEventTimer = setTimeout(() => {
        transportEventTimer = undefined;
        publishSnapshot();
      }, 100);
    }
  };

  const handleRequest = async (data: unknown) => {
    if (
      !isBridgeRequest(data) ||
      data.targetEditorInstanceId !== editorInstanceId
    ) {
      return;
    }
    const response = await executeVizControlRequestAsync(
      vizControl,
      data.request,
      {
        openBundle: async (url) => {
          const bundle = await loadBrowserVizProjectBundle(url);
          return {
            project: bundle.project,
            resolvedAssets: bundle.resolvedAssets,
            resolvedArtifacts: bundle.resolvedArtifacts,
            source: {
              kind: 'bundle',
              label: bundle.project.name,
              bundleDirectory: bundle.bundleUrl,
            },
          };
        },
        downloadRenderOutput: async (jobId, outputId) => {
          const job = vizControl.getHost().getServices().renderJobs?.get(jobId);
          if (!job) throw new Error(`Render job "${jobId}" was not found.`);
          if (job.status !== 'succeeded' || !job.result) {
            throw new Error(`Render job "${jobId}" has not succeeded.`);
          }
          const output = outputId
            ? job.result.outputs.find((candidate) => candidate.id === outputId)
            : job.result.outputs[0];
          if (!output) {
            throw new Error(
              outputId
                ? `Render output "${outputId}" was not found.`
                : `Render job "${jobId}" has no output.`,
            );
          }
          const fileStem =
            output.label
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '') || 'viz-render-output';
          const fileName = `${fileStem}.${output.format}`;
          const link = document.createElement('a');
          link.href = output.uri;
          link.download = fileName;
          link.click();
          return {
            jobId,
            outputId: output.id,
            fileName,
            contentIdentity: output.contentIdentity,
            byteLength: output.byteLength,
          };
        },
      },
    );
    import.meta.hot?.send('viz-control:response', {
      editorInstanceId,
      response,
    });
  };

  import.meta.hot.on('viz-control:request', handleRequest);
  const unsubscribe = vizControl.subscribe(publishSnapshotSoon);
  const heartbeat = setInterval(() => {
    import.meta.hot?.send('viz-control:heartbeat', {
      editorInstanceId,
    });
  }, 5_000);

  import.meta.hot.send('viz-control:ready', {
    editorInstanceId,
  });
  publishSnapshot();

  const dispose = () => {
    unsubscribe();
    clearInterval(heartbeat);
    if (transportEventTimer !== undefined) {
      clearTimeout(transportEventTimer);
    }
    import.meta.hot?.off('viz-control:request', handleRequest);
  };

  import.meta.hot.dispose(dispose);
  return dispose;
};
