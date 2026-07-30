import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer } from 'vite';

const DISCOVERY_PATH = '/__viz-control__/discovery';
const REQUEST_PATH = '/__viz-control__/request';
const EVENTS_PATH = '/__viz-control__/events';
const MAX_REQUEST_BYTES = 2 * 1024 * 1024;
const EDITOR_STALE_AFTER_MS = 15_000;
const REQUEST_TIMEOUT_MS = 10_000;

interface EditorSignal {
  editorInstanceId: string;
}

interface BridgeResponse extends EditorSignal {
  response: {
    id: string;
    [key: string]: unknown;
  };
}

interface BridgeEvent extends EditorSignal {
  event: unknown;
}

interface PendingRequest {
  editorInstanceId: string;
  response: ServerResponse;
  timeout: ReturnType<typeof setTimeout>;
}

const isEditorSignal = (value: unknown): value is EditorSignal => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).editorInstanceId === 'string' &&
    ((value as Record<string, unknown>).editorInstanceId as string).trim()
      .length > 0
  );
};

const isBridgeResponse = (value: unknown): value is BridgeResponse => {
  if (!isEditorSignal(value)) {
    return false;
  }
  if (!('response' in value)) {
    return false;
  }
  const response = value.response;
  return (
    typeof response === 'object' &&
    response !== null &&
    typeof (response as Record<string, unknown>).id === 'string'
  );
};

const isBridgeEvent = (value: unknown): value is BridgeEvent => {
  return isEditorSignal(value) && 'event' in value;
};

const sendJson = (
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(`${JSON.stringify(payload)}\n`);
};

const readJsonBody = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  let byteLength = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += buffer.byteLength;
    if (byteLength > MAX_REQUEST_BYTES) {
      throw new Error('Viz control request exceeds the 2 MiB limit.');
    }
    chunks.push(buffer);
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  if (rawBody.trim().length === 0) {
    throw new Error('Viz control request body is empty.');
  }
  return JSON.parse(rawBody) as unknown;
};

export const createVizControlBridgePlugin = (): Plugin => {
  let activeEditorInstanceId: string | undefined;
  let activeEditorLastSeenAt = 0;
  const pendingRequests = new Map<string, PendingRequest>();
  const eventClients = new Set<ServerResponse>();

  const editorIsConnected = () =>
    activeEditorInstanceId !== undefined &&
    Date.now() - activeEditorLastSeenAt <= EDITOR_STALE_AFTER_MS;

  const noteEditorSignal = (signal: EditorSignal) => {
    if (!editorIsConnected()) {
      activeEditorInstanceId = signal.editorInstanceId;
    }
    if (signal.editorInstanceId === activeEditorInstanceId) {
      activeEditorLastSeenAt = Date.now();
    }
  };

  const installSocketHandlers = (server: ViteDevServer) => {
    server.ws.on('viz-control:ready', (data: unknown) => {
      if (isEditorSignal(data)) {
        noteEditorSignal(data);
      }
    });

    server.ws.on('viz-control:heartbeat', (data: unknown) => {
      if (isEditorSignal(data)) {
        noteEditorSignal(data);
      }
    });

    server.ws.on('viz-control:response', (data: unknown) => {
      if (!isBridgeResponse(data)) {
        return;
      }
      noteEditorSignal(data);
      const pending = pendingRequests.get(data.response.id);
      if (
        pending === undefined ||
        pending.editorInstanceId !== data.editorInstanceId
      ) {
        return;
      }

      clearTimeout(pending.timeout);
      pendingRequests.delete(data.response.id);
      sendJson(pending.response, 200, data.response);
    });

    server.ws.on('viz-control:event', (data: unknown) => {
      if (!isBridgeEvent(data)) {
        return;
      }
      noteEditorSignal(data);
      if (data.editorInstanceId !== activeEditorInstanceId) {
        return;
      }
      const serialized = `event: snapshot\ndata: ${JSON.stringify(
        data.event,
      )}\n\n`;
      for (const client of eventClients) {
        client.write(serialized);
      }
    });
  };

  return {
    name: 'viz-control-bridge',
    apply: 'serve',
    configureServer(server) {
      installSocketHandlers(server);

      server.middlewares.use(async (request, response, next) => {
        const requestUrl = new URL(request.url ?? '/', 'http://localhost');

        if (
          request.method === 'GET' &&
          requestUrl.pathname === DISCOVERY_PATH
        ) {
          sendJson(response, 200, {
            protocolVersion: 1,
            transport: {
              request: REQUEST_PATH,
              events: EVENTS_PATH,
            },
            editor: {
              connected: editorIsConnected(),
              instanceId: editorIsConnected()
                ? activeEditorInstanceId
                : undefined,
              lastSeenAt:
                activeEditorLastSeenAt === 0
                  ? undefined
                  : new Date(activeEditorLastSeenAt).toISOString(),
            },
          });
          return;
        }

        if (request.method === 'GET' && requestUrl.pathname === EVENTS_PATH) {
          response.statusCode = 200;
          response.setHeader('Content-Type', 'text/event-stream');
          response.setHeader('Cache-Control', 'no-cache, no-transform');
          response.setHeader('Connection', 'keep-alive');
          response.flushHeaders();
          response.write(': viz-control events\n\n');
          eventClients.add(response);
          request.on('close', () => {
            eventClients.delete(response);
          });
          return;
        }

        if (request.method !== 'POST' || requestUrl.pathname !== REQUEST_PATH) {
          next();
          return;
        }

        if (!editorIsConnected() || activeEditorInstanceId === undefined) {
          sendJson(response, 503, {
            ok: false,
            error: {
              code: 'editor-unavailable',
              message: 'No live Viz editor is connected to this bridge.',
            },
          });
          return;
        }

        try {
          const body = await readJsonBody(request);
          if (
            typeof body !== 'object' ||
            body === null ||
            typeof (body as Record<string, unknown>).id !== 'string'
          ) {
            sendJson(response, 400, {
              ok: false,
              error: {
                code: 'invalid-request',
                message: 'Viz control requests must declare a string id.',
              },
            });
            return;
          }

          const requestId = (body as { id: string }).id;
          if (pendingRequests.has(requestId)) {
            sendJson(response, 409, {
              ok: false,
              error: {
                code: 'duplicate-request',
                message: `Viz control request "${requestId}" is already pending.`,
              },
            });
            return;
          }

          const editorInstanceId = activeEditorInstanceId;
          const timeout = setTimeout(() => {
            pendingRequests.delete(requestId);
            sendJson(response, 504, {
              ok: false,
              error: {
                code: 'editor-timeout',
                message: `Live Viz editor did not answer request "${requestId}" within ${REQUEST_TIMEOUT_MS} ms.`,
              },
            });
          }, REQUEST_TIMEOUT_MS);

          pendingRequests.set(requestId, {
            editorInstanceId,
            response,
            timeout,
          });
          server.ws.send('viz-control:request', {
            targetEditorInstanceId: editorInstanceId,
            request: body,
          });
        } catch (error) {
          sendJson(response, 400, {
            ok: false,
            error: {
              code: 'invalid-request',
              message:
                error instanceof Error
                  ? error.message
                  : 'Could not read Viz control request.',
            },
          });
        }
      });

      return () => {
        for (const pending of pendingRequests.values()) {
          clearTimeout(pending.timeout);
          if (!pending.response.writableEnded) {
            sendJson(pending.response, 503, {
              ok: false,
              error: {
                code: 'bridge-stopped',
                message: 'Viz control bridge stopped.',
              },
            });
          }
        }
        pendingRequests.clear();
        for (const client of eventClients) {
          client.end();
        }
        eventClients.clear();
      };
    },
  };
};
