export const DEFAULT_VIZ_CONTROL_URL = "http://localhost:4173";
export const VIZ_CONTROL_PROTOCOL_VERSION = 1 as const;

export interface LiveVizControlClientOptions {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

export interface LiveVizControlRequest {
  protocolVersion: typeof VIZ_CONTROL_PROTOCOL_VERSION;
  id: string;
  operation: string;
  [key: string]: unknown;
}

export interface LiveVizControlDiscovery {
  protocolVersion: number;
  transport: {
    request: string;
    events: string;
  };
  editor: {
    connected: boolean;
    instanceId?: string;
    lastSeenAt?: string;
  };
}

const resolveBaseUrl = (baseUrl = DEFAULT_VIZ_CONTROL_URL): URL => {
  const url = new URL(baseUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(
      `Viz control URL must use http or https, received "${url.protocol}".`,
    );
  }
  if (!url.pathname.endsWith("/")) {
    url.pathname = `${url.pathname}/`;
  }
  return url;
};

const resolveEndpoint = (baseUrl: string | undefined, path: string): URL => {
  const root = resolveBaseUrl(baseUrl);
  return new URL(path.replace(/^\//, ""), root);
};

const readJsonResponse = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (text.trim().length === 0) {
    throw new Error(
      `Viz control bridge returned an empty HTTP ${response.status} response.`,
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(
      `Viz control bridge returned non-JSON HTTP ${response.status} content.`,
    );
  }
};

const getFetch = (
  fetchImplementation: typeof globalThis.fetch | undefined,
): typeof globalThis.fetch => {
  const resolved = fetchImplementation ?? globalThis.fetch;
  if (resolved === undefined) {
    throw new Error("This Node runtime does not provide fetch.");
  }
  return resolved;
};

const decodeDiscovery = (value: unknown): LiveVizControlDiscovery => {
  if (typeof value !== "object" || value === null) {
    throw new Error("Viz control discovery response must be an object.");
  }
  const discovery = value as Record<string, unknown>;
  const transport = discovery.transport;
  const editor = discovery.editor;
  if (
    typeof discovery.protocolVersion !== "number" ||
    typeof transport !== "object" ||
    transport === null ||
    typeof (transport as Record<string, unknown>).request !== "string" ||
    typeof (transport as Record<string, unknown>).events !== "string" ||
    typeof editor !== "object" ||
    editor === null ||
    typeof (editor as Record<string, unknown>).connected !== "boolean"
  ) {
    throw new Error("Viz control discovery response has an invalid shape.");
  }
  const editorRecord = editor as Record<string, unknown>;
  if (
    editorRecord.instanceId !== undefined &&
    typeof editorRecord.instanceId !== "string"
  ) {
    throw new Error("Viz control discovery editor instance id is invalid.");
  }
  if (
    editorRecord.lastSeenAt !== undefined &&
    typeof editorRecord.lastSeenAt !== "string"
  ) {
    throw new Error("Viz control discovery last-seen time is invalid.");
  }
  return {
    protocolVersion: discovery.protocolVersion,
    transport: {
      request: (transport as Record<string, unknown>).request as string,
      events: (transport as Record<string, unknown>).events as string,
    },
    editor: {
      connected: editorRecord.connected as boolean,
      ...(editorRecord.instanceId === undefined
        ? {}
        : { instanceId: editorRecord.instanceId as string }),
      ...(editorRecord.lastSeenAt === undefined
        ? {}
        : { lastSeenAt: editorRecord.lastSeenAt as string }),
    },
  };
};

export const discoverLiveVizControl = async (
  options: LiveVizControlClientOptions = {},
): Promise<{
  ok: boolean;
  status: number;
  discovery: LiveVizControlDiscovery;
}> => {
  const response = await getFetch(options.fetch)(
    resolveEndpoint(options.baseUrl, "/__viz-control__/discovery"),
    {
      headers: {
        accept: "application/json",
      },
    },
  );
  const discovery = decodeDiscovery(await readJsonResponse(response));
  return {
    ok: response.ok,
    status: response.status,
    discovery,
  };
};

export const requestLiveVizControl = async (
  request: LiveVizControlRequest,
  options: LiveVizControlClientOptions = {},
): Promise<{
  ok: boolean;
  status: number;
  response: unknown;
}> => {
  const response = await getFetch(options.fetch)(
    resolveEndpoint(options.baseUrl, "/__viz-control__/request"),
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    },
  );
  const payload = await readJsonResponse(response);
  const protocolOk =
    typeof payload === "object" &&
    payload !== null &&
    (payload as Record<string, unknown>).ok === true;
  return {
    ok: response.ok && protocolOk,
    status: response.status,
    response: payload,
  };
};
