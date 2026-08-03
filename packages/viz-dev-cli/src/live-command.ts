import { VizCliArguments } from './arguments.js';
import {
  DEFAULT_VIZ_CONTROL_URL,
  VIZ_CONTROL_PROTOCOL_VERSION,
  discoverLiveVizControl,
  requestLiveVizControl,
  type LiveVizControlRequest,
} from './live-control-client.js';
import type { VizCliOutput } from './types.js';
import { VizCliInputError } from './types.js';

const operations: Record<string, string> = {
  snapshot: 'control.snapshot',
  project: 'project.inspect',
  'bundle-open': 'project.bundle.open',
  components: 'component.inspect',
  nodes: 'node.inspect',
  graphs: 'graph.inspect',
  'graph-runtime': 'graph.runtime.inspect',
  frame: 'frame.inspect',
  render: 'render.inspect',
  debug: 'debug.inspect',
  undo: 'history.undo',
  redo: 'history.redo',
  play: 'preview.play',
  pause: 'preview.pause',
  seek: 'preview.seek',
  transact: 'transaction.apply',
  jobs: 'job.list',
  job: 'job.inspect',
  'job-download': 'job.output.download',
  'bake-start': 'audio-bake.start',
  'render-start': 'render.start',
  'job-cancel': 'job.cancel',
  'bake-attach': 'audio-bake.attach',
};

const createRequest = (
  operation: string,
  payload: Record<string, unknown> = {},
): LiveVizControlRequest => ({
  protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
  id: `viz-dev-${operation}-${globalThis.crypto.randomUUID()}`,
  operation,
  ...payload,
});

const requireJobId = (args: VizCliArguments): string =>
  args.require('--job-id', 'job id');

export const runLiveCommand = async (argv: string[]): Promise<VizCliOutput> => {
  const [action, ...values] = argv;
  const args = new VizCliArguments(values);
  const baseUrl = args.optional('--url') ?? DEFAULT_VIZ_CONTROL_URL;
  if (action === 'discover') {
    const bridge = await discoverLiveVizControl({ baseUrl });
    if (!bridge.ok || !bridge.discovery.editor.connected) {
      return {
        ok: false,
        command: 'live discover',
        payload: { bridge: bridge.discovery, status: bridge.status },
      };
    }
    const control = await requestLiveVizControl(
      createRequest('control.discover'),
      { baseUrl },
    );
    return {
      ok: control.ok,
      command: 'live discover',
      payload: { bridge: bridge.discovery, control: control.response },
    };
  }

  const operation = operations[action ?? ''];
  if (!operation) {
    throw new VizCliInputError(
      'unknown-command',
      `Unknown live command: ${action ?? '<empty>'}.`,
    );
  }
  const payload: Record<string, unknown> = {};
  if (action === 'bundle-open') {
    payload.url = args.require('--bundle-url', 'bundle URL');
  } else if (action === 'components') {
    const componentId = args.optional('--component-id');
    if (componentId) {
      payload.componentId = componentId;
    }
  } else if (action === 'nodes') {
    const nodeType = args.optional('--node-type');
    if (nodeType) {
      payload.nodeType = nodeType;
    }
  } else if (action === 'graphs') {
    const graphId = args.optional('--graph-id');
    if (graphId) {
      payload.graphId = graphId;
    }
  } else if (
    action === 'graph-runtime' ||
    action === 'frame' ||
    action === 'render' ||
    action === 'debug'
  ) {
    const frame = args.number('--frame', { integer: true, minimum: 0 });
    if (frame !== undefined) {
      payload.frame = frame;
    }
  } else if (action === 'seek') {
    payload.frame = args.frame();
  } else if (action === 'transact') {
    payload.transaction = args.json('--transaction', 'transaction file');
  } else if (
    action === 'job' ||
    action === 'job-download' ||
    action === 'job-cancel'
  ) {
    payload.jobId = requireJobId(args);
    if (action === 'job-download') {
      const outputId = args.optional('--output-id');
      if (outputId) payload.outputId = outputId;
    }
  } else if (action === 'bake-start') {
    payload.request = args.json('--request', 'audio bake request file');
  } else if (action === 'render-start') {
    payload.request = args.json('--request', 'render request file');
  } else if (action === 'bake-attach') {
    payload.jobId = requireJobId(args);
    const expectedRevision = args.number('--expected-revision', {
      integer: true,
      minimum: 0,
    });
    if (expectedRevision !== undefined) {
      payload.expectedRevision = expectedRevision;
    }
  }

  const result = await requestLiveVizControl(
    createRequest(operation, payload),
    { baseUrl },
  );
  return {
    ok: result.ok,
    command: `live ${action}`,
    payload: result.response,
  };
};
