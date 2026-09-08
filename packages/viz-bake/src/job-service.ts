import type {
  VizActionActor,
  VizJobEvent,
  VizJobId,
  VizJobRecord,
} from '@viz-engine/contracts';
import {
  executeVizAudioFeatureBakeAsync,
  type VizAudioFeatureBakeRequest,
  type VizAudioFeatureBakeResult,
} from './audio-feature-bake.js';
import type { VizAudioPcmSource } from './audio-pcm.js';

export type VizAudioFeatureBakeJobRequest = Omit<
  VizAudioFeatureBakeRequest,
  'sourceContentIdentity' | 'decoderIdentity'
> & {
  expectedSourceContentIdentity?: string;
};

export interface VizResolvedAudioBakeSource {
  pcm: VizAudioPcmSource;
  sourceContentIdentity: string;
  decoderIdentity?: string;
}

export interface VizAudioBakeSourceResolver {
  resolve(
    request: VizAudioFeatureBakeJobRequest,
    signal: AbortSignal,
  ): Promise<VizResolvedAudioBakeSource>;
}

export type VizAudioFeatureBakeSuccess = Extract<
  VizAudioFeatureBakeResult,
  { ok: true }
>;

export type VizAudioFeatureBakeJobRecord = VizJobRecord<
  VizAudioFeatureBakeJobRequest,
  VizAudioFeatureBakeSuccess
>;

export type VizAudioFeatureBakeJobEvent = VizJobEvent<
  VizAudioFeatureBakeJobRequest,
  VizAudioFeatureBakeSuccess
>;

export interface CreateVizAudioFeatureBakeJobServiceOptions {
  sourceResolver: VizAudioBakeSourceResolver;
  createJobId?: () => VizJobId;
  now?: () => Date;
  yieldEveryFrames?: number;
  yieldToHost?: () => Promise<void>;
}

export interface VizAudioFeatureBakeJobService {
  start(
    request: VizAudioFeatureBakeJobRequest,
    requestedBy?: VizActionActor,
  ): VizAudioFeatureBakeJobRecord;
  get(jobId: VizJobId): VizAudioFeatureBakeJobRecord | undefined;
  list(): VizAudioFeatureBakeJobRecord[];
  cancel(jobId: VizJobId): VizAudioFeatureBakeJobRecord | undefined;
  wait(jobId: VizJobId): Promise<VizAudioFeatureBakeJobRecord>;
  subscribe(listener: (event: VizAudioFeatureBakeJobEvent) => void): () => void;
}

const clone = <T>(value: T): T => structuredClone(value);

const isTerminal = (status: VizAudioFeatureBakeJobRecord['status']): boolean =>
  status === 'succeeded' || status === 'failed' || status === 'cancelled';

export const createVizAudioFeatureBakeJobService = ({
  sourceResolver,
  createJobId,
  now = () => new Date(),
  yieldEveryFrames,
  yieldToHost,
}: CreateVizAudioFeatureBakeJobServiceOptions): VizAudioFeatureBakeJobService => {
  const jobs = new Map<VizJobId, VizAudioFeatureBakeJobRecord>();
  const controllers = new Map<VizJobId, AbortController>();
  const listeners = new Set<(event: VizAudioFeatureBakeJobEvent) => void>();
  const waiters = new Map<
    VizJobId,
    Set<(job: VizAudioFeatureBakeJobRecord) => void>
  >();
  let sequence = 0;
  let fallbackJobCounter = 0;

  const createId = (): VizJobId => {
    if (createJobId) {
      return createJobId();
    }
    fallbackJobCounter += 1;
    return typeof globalThis.crypto?.randomUUID === 'function'
      ? `audio-bake-${globalThis.crypto.randomUUID()}`
      : `audio-bake-${fallbackJobCounter}`;
  };
  const timestamp = (): string => now().toISOString();
  const emit = (job: VizAudioFeatureBakeJobRecord): void => {
    sequence += 1;
    const event = {
      sequence,
      job: clone(job),
    };
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
    patch: Partial<VizAudioFeatureBakeJobRecord>,
    shouldEmit = true,
  ): VizAudioFeatureBakeJobRecord => {
    const current = jobs.get(jobId);
    if (!current) {
      throw new Error(`Unknown audio bake job "${jobId}".`);
    }
    const next = {
      ...current,
      ...patch,
      updatedAt: timestamp(),
    };
    jobs.set(jobId, next);
    if (shouldEmit) {
      emit(next);
    }
    return next;
  };
  const completeCancelled = (
    jobId: VizJobId,
    message = 'Audio bake was cancelled.',
  ): void => {
    const completedAt = timestamp();
    update(jobId, {
      status: 'cancelled',
      completedAt,
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
    const completedAt = timestamp();
    update(jobId, {
      status: 'failed',
      completedAt,
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
    const controller = controllers.get(jobId);
    const initial = jobs.get(jobId);
    if (!controller || !initial) {
      return;
    }
    if (controller.signal.aborted) {
      completeCancelled(jobId);
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

    let source: VizResolvedAudioBakeSource;
    try {
      source = await sourceResolver.resolve(initial.request, controller.signal);
    } catch (error) {
      if (controller.signal.aborted) {
        completeCancelled(jobId);
        return;
      }
      fail(
        jobId,
        error instanceof Error &&
          'code' in error &&
          typeof error.code === 'string'
          ? error.code
          : 'source-resolution-failed',
        error instanceof Error
          ? error.message
          : 'Audio source resolution failed.',
      );
      return;
    }
    if (controller.signal.aborted) {
      completeCancelled(jobId);
      return;
    }
    if (
      initial.request.expectedSourceContentIdentity !== undefined &&
      initial.request.expectedSourceContentIdentity !==
        source.sourceContentIdentity
    ) {
      fail(
        jobId,
        'source-identity-mismatch',
        `Resolved source identity "${source.sourceContentIdentity}" does not match expected identity "${initial.request.expectedSourceContentIdentity}".`,
      );
      return;
    }

    update(jobId, {
      status: 'running',
      inputIdentity: source.sourceContentIdentity,
      progress: {
        stage: 'analyzing',
        completed: 0,
        total: 0,
        progress: 0,
      },
    });
    let lastEmittedCompleted = -1;
    const result = await executeVizAudioFeatureBakeAsync(
      {
        ...initial.request,
        sourceContentIdentity: source.sourceContentIdentity,
        decoderIdentity: source.decoderIdentity ?? 'caller-provided-pcm',
      },
      source.pcm,
      {
        shouldCancel: () => controller.signal.aborted,
        ...(yieldEveryFrames === undefined ? {} : { yieldEveryFrames }),
        ...(yieldToHost === undefined ? {} : { yieldToHost }),
        onProgress: (progress) => {
          const emitStride = Math.max(
            1,
            Math.floor(progress.totalFrames / 100),
          );
          const shouldEmit =
            progress.completedFrames === progress.totalFrames ||
            progress.completedFrames - lastEmittedCompleted >= emitStride;
          update(
            jobId,
            {
              progress: {
                stage: 'analyzing',
                completed: progress.completedFrames,
                total: progress.totalFrames,
                progress: progress.progress,
              },
            },
            shouldEmit,
          );
          if (shouldEmit) {
            lastEmittedCompleted = progress.completedFrames;
          }
        },
      },
    );

    if (controller.signal.aborted) {
      completeCancelled(jobId);
      return;
    }
    if (!result.ok) {
      if (result.status === 'cancelled' || controller.signal.aborted) {
        completeCancelled(jobId, result.issues[0]?.message);
        return;
      }
      fail(
        jobId,
        result.issues[0]?.code ?? 'audio-bake-failed',
        result.issues.map((issue) => issue.message).join(' '),
      );
      return;
    }

    const completedAt = timestamp();
    update(jobId, {
      status: 'succeeded',
      completedAt,
      result,
      progress: {
        stage: 'succeeded',
        completed: result.metrics.frameCount,
        total: result.metrics.frameCount,
        progress: 1,
      },
    });
    controllers.delete(jobId);
  };

  const start: VizAudioFeatureBakeJobService['start'] = (
    request,
    requestedBy = { kind: 'agent', id: 'local-audio-bake' },
  ) => {
    const id = createId();
    if (jobs.has(id)) {
      throw new Error(`Audio bake job id "${id}" already exists.`);
    }
    const requestedAt = timestamp();
    const job: VizAudioFeatureBakeJobRecord = {
      schemaVersion: 1,
      id,
      kind: 'audio-feature-timeline',
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
  };

  return {
    start,
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
      const cancelRequestedAt = timestamp();
      update(jobId, {
        cancelRequestedAt,
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
        return Promise.reject(new Error(`Unknown audio bake job "${jobId}".`));
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
