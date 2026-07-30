import type { VizActionActor } from './actions.js';
import type { VizJobId } from './ids.js';

export type VizJobStatus =
  'queued' | 'validating' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface VizJobProgress {
  stage: string;
  completed: number;
  total: number;
  progress: number;
  message?: string;
}

export interface VizJobFailure {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface VizJobRecord<TRequest = unknown, TResult = unknown> {
  schemaVersion: 1;
  id: VizJobId;
  kind: string;
  status: VizJobStatus;
  request: TRequest;
  requestedBy: VizActionActor;
  requestedAt: string;
  updatedAt: string;
  inputIdentity?: string;
  progress?: VizJobProgress;
  result?: TResult;
  failure?: VizJobFailure;
  cancelRequestedAt?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface VizJobEvent<TRequest = unknown, TResult = unknown> {
  sequence: number;
  job: VizJobRecord<TRequest, TResult>;
}
