import type {
  VizActionActor,
  VizJobEvent,
  VizJobId,
  VizJobProgress,
  VizProjectDocument,
  VizRenderDiagnostic,
  VizRenderJobRecord,
  VizRenderPerformanceFeedback,
  VizRenderRequest,
  VizRenderSuccess,
  VizResolvedArtifact,
  VizResolvedAsset,
} from '@viz-engine/contracts';

export const VIZ_RENDER_JOB_SERVICE_VERSION =
  'viz-render.job-service.v1' as const;

export interface VizRenderSource {
  project: VizProjectDocument;
  resolvedAssets: VizResolvedAsset[];
  resolvedArtifacts: VizResolvedArtifact[];
  contentIdentity: string;
  revision?: number;
}

export interface VizRenderSourceResolver {
  resolve(
    request: VizRenderRequest,
    signal: AbortSignal,
  ): Promise<VizRenderSource>;
}

export interface VizRenderExecutorResult {
  outputs: VizRenderSuccess['outputs'];
  diagnostics: VizRenderDiagnostic[];
  performance: VizRenderPerformanceFeedback;
  mediaProbe?: VizRenderSuccess['mediaProbe'];
  visualFeedback?: VizRenderSuccess['visualFeedback'];
}

export interface VizRenderExecutionContext {
  request: VizRenderRequest;
  source: VizRenderSource;
  signal: AbortSignal;
  onProgress(progress: VizJobProgress): void;
}

export interface VizRenderExecutor {
  id: string;
  version: string;
  rendererIdentity: string;
  supports(request: VizRenderRequest): boolean;
  execute(context: VizRenderExecutionContext): Promise<VizRenderExecutorResult>;
}

export interface VizRenderRequestIssue {
  code: 'invalid-request';
  message: string;
}

export interface CreateVizRenderJobServiceOptions {
  sourceResolver: VizRenderSourceResolver;
  executors: readonly VizRenderExecutor[];
  createJobId?: () => VizJobId;
  now?: () => Date;
}

export interface VizRenderJobService {
  start(
    request: VizRenderRequest,
    requestedBy?: VizActionActor,
  ): VizRenderJobRecord;
  get(jobId: VizJobId): VizRenderJobRecord | undefined;
  list(): VizRenderJobRecord[];
  cancel(jobId: VizJobId): VizRenderJobRecord | undefined;
  wait(jobId: VizJobId): Promise<VizRenderJobRecord>;
  subscribe(
    listener: (event: VizJobEvent<VizRenderRequest, VizRenderSuccess>) => void,
  ): () => void;
}

const clone = <T>(value: T): T => structuredClone(value);

const isPositiveInteger = (value: number): boolean =>
  Number.isInteger(value) && value > 0;

const isNonNegativeInteger = (value: number): boolean =>
  Number.isInteger(value) && value >= 0;

export const validateVizRenderRequest = (
  request: VizRenderRequest,
): VizRenderRequestIssue[] => {
  const issues: VizRenderRequestIssue[] = [];
  const invalidCommon =
    request.schemaVersion !== 1 ||
    typeof request.source?.projectId !== 'string' ||
    request.source.projectId.trim().length === 0 ||
    typeof request.executorId !== 'string' ||
    request.executorId.trim().length === 0 ||
    typeof request.outputLabel !== 'string' ||
    request.outputLabel.trim().length === 0 ||
    !isPositiveInteger(request.viewport.width) ||
    !isPositiveInteger(request.viewport.height) ||
    !['preview', 'candidate', 'final', 'integration'].includes(
      request.intent,
    ) ||
    !['draft', 'standard', 'high'].includes(request.quality);

  if (invalidCommon) {
    issues.push({
      code: 'invalid-request',
      message:
        'Render request requires schema version 1, project/executor/output identities, a supported intent/quality, and positive integer dimensions.',
    });
  }

  if (
    request.source.expectedRevision !== undefined &&
    !isNonNegativeInteger(request.source.expectedRevision)
  ) {
    issues.push({
      code: 'invalid-request',
      message: 'Expected project revision must be a non-negative integer.',
    });
  }
  if (
    request.source.expectedContentIdentity !== undefined &&
    request.source.expectedContentIdentity.trim().length === 0
  ) {
    issues.push({
      code: 'invalid-request',
      message: 'Expected project content identity must be non-empty.',
    });
  }

  if (request.kind === 'still') {
    if (
      !isNonNegativeInteger(request.frame) ||
      (request.imageQuality !== undefined &&
        (!Number.isFinite(request.imageQuality) ||
          request.imageQuality < 0 ||
          request.imageQuality > 1)) ||
      !['svg', 'png', 'jpeg', 'webp'].includes(request.format)
    ) {
      issues.push({
        code: 'invalid-request',
        message:
          'Still requests require a non-negative integer frame and supported image format.',
      });
    }
  } else if (request.kind === 'contact-sheet') {
    if (
      request.frames.length === 0 ||
      request.frames.some((frame) => !isNonNegativeInteger(frame)) ||
      new Set(request.frames).size !== request.frames.length ||
      (request.columns !== undefined && !isPositiveInteger(request.columns)) ||
      (request.gap !== undefined &&
        (!isNonNegativeInteger(request.gap) || request.gap > 256)) ||
      (request.imageQuality !== undefined &&
        (!Number.isFinite(request.imageQuality) ||
          request.imageQuality < 0 ||
          request.imageQuality > 1)) ||
      !['svg', 'png', 'jpeg', 'webp'].includes(request.format)
    ) {
      issues.push({
        code: 'invalid-request',
        message:
          'Contact-sheet requests require unique non-negative frames, optional positive columns, an integer gap from 0 to 256, and a supported image format.',
      });
    }
  } else if (
    !isNonNegativeInteger(request.startFrame) ||
    !isPositiveInteger(request.frameCount) ||
    !isPositiveInteger(request.fps) ||
    !['mp4', 'webm'].includes(request.format) ||
    typeof request.includeAudio !== 'boolean'
  ) {
    issues.push({
      code: 'invalid-request',
      message:
        'Clip/video requests require a non-negative start, positive frame count/FPS, audio policy, and supported video format.',
    });
  }

  return issues;
};

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value instanceof ArrayBuffer) {
    return {
      kind: 'array-buffer',
      byteLength: value.byteLength,
    };
  }
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    return {
      kind: value.constructor.name,
      byteLength: value.byteLength,
    };
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }
  return value;
};

const fnv1a = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const createVizRenderSourceContentIdentity = (
  source: Pick<
    VizRenderSource,
    'project' | 'resolvedAssets' | 'resolvedArtifacts'
  >,
): string => {
  const descriptor = {
    project: source.project,
    assets: source.resolvedAssets.map((asset) => ({
      id: asset.id,
      kind: asset.kind,
      source: asset.source,
      uri: asset.uri,
      mimeType: asset.mimeType ?? null,
      byteLength: asset.bytes?.byteLength ?? null,
      metadata: asset.metadata ?? null,
    })),
    artifacts: source.resolvedArtifacts.map((artifact) => ({
      id: artifact.id,
      kind: artifact.kind,
      uri: artifact.uri,
      payload: artifact.payload ?? null,
      metadata: artifact.metadata ?? null,
    })),
  };
  return `viz-render-source.v1:${fnv1a(
    JSON.stringify(stableValue(descriptor)),
  )}`;
};

const isTerminal = (status: VizRenderJobRecord['status']): boolean =>
  status === 'succeeded' || status === 'failed' || status === 'cancelled';

export const createVizRenderJobService = ({
  sourceResolver,
  executors,
  createJobId,
  now = () => new Date(),
}: CreateVizRenderJobServiceOptions): VizRenderJobService => {
  const executorMap = new Map<string, VizRenderExecutor>();
  for (const executor of executors) {
    if (executor.id.trim().length === 0) {
      throw new Error('Render executor id must be non-empty.');
    }
    if (executorMap.has(executor.id)) {
      throw new Error(`Duplicate render executor id "${executor.id}".`);
    }
    executorMap.set(executor.id, executor);
  }

  const jobs = new Map<VizJobId, VizRenderJobRecord>();
  const controllers = new Map<VizJobId, AbortController>();
  const listeners = new Set<
    (event: VizJobEvent<VizRenderRequest, VizRenderSuccess>) => void
  >();
  const waiters = new Map<VizJobId, Set<(job: VizRenderJobRecord) => void>>();
  let sequence = 0;
  let fallbackJobCounter = 0;

  const createId = (): VizJobId => {
    if (createJobId) {
      return createJobId();
    }
    fallbackJobCounter += 1;
    return typeof globalThis.crypto?.randomUUID === 'function'
      ? `render-${globalThis.crypto.randomUUID()}`
      : `render-${fallbackJobCounter}`;
  };
  const timestamp = (): string => now().toISOString();
  const emit = (job: VizRenderJobRecord): void => {
    sequence += 1;
    const event = { sequence, job: clone(job) };
    for (const listener of listeners) {
      listener(event);
    }
    if (isTerminal(job.status)) {
      for (const resolveWaiter of waiters.get(job.id) ?? []) {
        resolveWaiter(clone(job));
      }
      waiters.delete(job.id);
    }
  };
  const update = (
    jobId: VizJobId,
    patch: Partial<VizRenderJobRecord>,
  ): VizRenderJobRecord => {
    const current = jobs.get(jobId);
    if (!current) {
      throw new Error(`Unknown render job "${jobId}".`);
    }
    const next = {
      ...current,
      ...patch,
      updatedAt: timestamp(),
    };
    jobs.set(jobId, next);
    emit(next);
    return next;
  };
  const finishCancelled = (
    jobId: VizJobId,
    message = 'Render was cancelled.',
  ): void => {
    update(jobId, {
      status: 'cancelled',
      completedAt: timestamp(),
      progress: {
        stage: 'cancelled',
        completed: 0,
        total: 0,
        progress: 0,
        message,
      },
    });
    controllers.delete(jobId);
  };
  const fail = (jobId: VizJobId, code: string, message: string): void => {
    update(jobId, {
      status: 'failed',
      completedAt: timestamp(),
      failure: { code, message },
      progress: {
        stage: 'failed',
        completed: 0,
        total: 0,
        progress: 0,
        message,
      },
    });
    controllers.delete(jobId);
  };

  const run = async (jobId: VizJobId): Promise<void> => {
    const initial = jobs.get(jobId);
    const controller = controllers.get(jobId);
    if (!initial || !controller) {
      return;
    }
    if (controller.signal.aborted) {
      finishCancelled(jobId);
      return;
    }

    update(jobId, {
      status: 'validating',
      startedAt: timestamp(),
      progress: {
        stage: 'validating',
        completed: 0,
        total: 1,
        progress: 0,
      },
    });

    const requestIssues = validateVizRenderRequest(initial.request);
    if (requestIssues.length > 0) {
      fail(
        jobId,
        requestIssues[0]!.code,
        requestIssues.map((issue) => issue.message).join(' '),
      );
      return;
    }

    const executor = executorMap.get(initial.request.executorId);
    if (!executor || !executor.supports(initial.request)) {
      fail(
        jobId,
        'unsupported-render-request',
        `Executor "${initial.request.executorId}" does not support ${initial.request.kind}/${initial.request.format}.`,
      );
      return;
    }

    let source: VizRenderSource;
    try {
      source = clone(
        await sourceResolver.resolve(initial.request, controller.signal),
      );
    } catch (error) {
      if (controller.signal.aborted) {
        finishCancelled(jobId);
        return;
      }
      fail(
        jobId,
        'source-resolution-failed',
        error instanceof Error
          ? error.message
          : 'Render source resolution failed.',
      );
      return;
    }
    if (controller.signal.aborted) {
      finishCancelled(jobId);
      return;
    }
    if (source.project.projectId !== initial.request.source.projectId) {
      fail(
        jobId,
        'project-identity-mismatch',
        `Resolved project "${source.project.projectId}" does not match requested project "${initial.request.source.projectId}".`,
      );
      return;
    }
    if (
      initial.request.source.expectedRevision !== undefined &&
      source.revision !== initial.request.source.expectedRevision
    ) {
      fail(
        jobId,
        'project-revision-mismatch',
        `Resolved revision ${source.revision ?? 'none'} does not match expected revision ${initial.request.source.expectedRevision}.`,
      );
      return;
    }
    if (
      initial.request.source.expectedContentIdentity !== undefined &&
      source.contentIdentity !== initial.request.source.expectedContentIdentity
    ) {
      fail(
        jobId,
        'project-content-identity-mismatch',
        `Resolved project content identity "${source.contentIdentity}" does not match expected identity "${initial.request.source.expectedContentIdentity}".`,
      );
      return;
    }

    update(jobId, {
      status: 'running',
      inputIdentity: source.contentIdentity,
      progress: {
        stage: 'rendering',
        completed: 0,
        total: 0,
        progress: 0,
      },
    });

    try {
      const execution = await executor.execute({
        request: initial.request,
        source,
        signal: controller.signal,
        onProgress: (progress) => {
          if (!controller.signal.aborted) {
            update(jobId, { progress: clone(progress) });
          }
        },
      });
      if (controller.signal.aborted) {
        finishCancelled(jobId);
        return;
      }
      if (execution.outputs.length === 0) {
        fail(
          jobId,
          'render-produced-no-output',
          'Render executor completed without materializing an output.',
        );
        return;
      }

      const result: VizRenderSuccess = {
        schemaVersion: 1,
        ok: true,
        status: 'succeeded',
        executionIdentity: {
          executorId: executor.id,
          executorVersion: executor.version,
          projectContentIdentity: source.contentIdentity,
          ...(source.revision === undefined
            ? {}
            : { projectRevision: source.revision }),
          rendererIdentity: executor.rendererIdentity,
        },
        outputs: execution.outputs,
        diagnostics: execution.diagnostics,
        performance: execution.performance,
        ...(execution.mediaProbe === undefined
          ? {}
          : { mediaProbe: execution.mediaProbe }),
        ...(execution.visualFeedback === undefined
          ? {}
          : { visualFeedback: execution.visualFeedback }),
      };
      update(jobId, {
        status: 'succeeded',
        completedAt: timestamp(),
        result,
        progress: {
          stage: 'succeeded',
          completed: execution.outputs.length,
          total: execution.outputs.length,
          progress: 1,
        },
      });
      controllers.delete(jobId);
    } catch (error) {
      if (controller.signal.aborted) {
        finishCancelled(jobId);
        return;
      }
      fail(
        jobId,
        'render-execution-failed',
        error instanceof Error ? error.message : 'Render execution failed.',
      );
    }
  };

  return {
    start: (request, requestedBy = { kind: 'agent', id: 'local-render' }) => {
      const id = createId();
      if (jobs.has(id)) {
        throw new Error(`Render job id "${id}" already exists.`);
      }
      const requestedAt = timestamp();
      const job: VizRenderJobRecord = {
        schemaVersion: 1,
        id,
        kind: `render-${request.kind}`,
        status: 'queued',
        request: clone(request),
        requestedBy: clone(requestedBy),
        requestedAt,
        updatedAt: requestedAt,
        progress: {
          stage: 'queued',
          completed: 0,
          total: 0,
          progress: 0,
        },
      };
      jobs.set(id, job);
      controllers.set(id, new AbortController());
      emit(job);
      queueMicrotask(() => {
        void run(id);
      });
      return clone(job);
    },
    get: (jobId) => {
      const job = jobs.get(jobId);
      return job ? clone(job) : undefined;
    },
    list: () => [...jobs.values()].map(clone),
    cancel: (jobId) => {
      const job = jobs.get(jobId);
      if (!job || isTerminal(job.status)) {
        return job ? clone(job) : undefined;
      }
      update(jobId, {
        cancelRequestedAt: timestamp(),
        progress: {
          ...(job.progress ?? {
            completed: 0,
            total: 0,
            progress: 0,
          }),
          stage: 'cancelling',
          message: 'Cancellation requested.',
        },
      });
      controllers.get(jobId)?.abort();
      return clone(jobs.get(jobId)!);
    },
    wait: (jobId) => {
      const job = jobs.get(jobId);
      if (!job) {
        return Promise.reject(new Error(`Unknown render job "${jobId}".`));
      }
      if (isTerminal(job.status)) {
        return Promise.resolve(clone(job));
      }
      return new Promise((resolveWaiter) => {
        const current = waiters.get(jobId) ?? new Set();
        current.add(resolveWaiter);
        waiters.set(jobId, current);
      });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

export { createVizRenderFrameSession } from './frame-session.js';
