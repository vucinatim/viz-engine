import { applyVizProjectActions } from '@viz-engine/actions';
import type {
  VizActionActor,
  VizActionEnvelope,
  VizActionError,
  VizActionWarning,
  VizExecutionMode,
  VizGraphId,
  VizLayerId,
  VizProjectAction,
  VizProjectDocument,
  VizProjectRevisionConflict,
  VizProjectTransaction,
  VizProjectTransactionStatus,
} from '@viz-engine/contracts';
import {
  assertValidProjectDocument,
  validateProjectDocument,
} from '@viz-engine/runtime';
export * from './live-preview.js';

export interface VizEditorUiState {
  selectedLayerId: VizLayerId | undefined;
  selectedGraphId: VizGraphId | undefined;
  selectedNodeId: string | undefined;
  expandedLayerIds: VizLayerId[];
  activePanel: 'layers' | 'graph' | 'components' | 'audio';
}

export interface VizEditorPreviewState {
  currentFrame: number;
  isPlaying: boolean;
  mode: VizExecutionMode;
}

export interface VizEditorSessionIssue {
  source: 'action' | 'validation' | 'transaction';
  severity: 'warning' | 'error';
  code: string;
  message: string;
}

export interface VizEditorSessionTransactionIssue {
  code:
    'invalid-transaction' | 'duplicate-transaction-id' | 'revision-conflict';
  message: string;
}

export interface VizEditorSessionSnapshot {
  sourceProject: VizProjectDocument;
  workingProject: VizProjectDocument;
  uiState: VizEditorUiState;
  previewState: VizEditorPreviewState;
  actionHistory: VizActionEnvelope[];
  issues: VizEditorSessionIssue[];
  revision: number;
  canUndo: boolean;
  canRedo: boolean;
}

export interface VizEditorSessionMutationResult {
  ok: boolean;
  status: VizProjectTransactionStatus;
  transactionId: string;
  actor: VizActionActor;
  baseRevision: number;
  project: VizProjectDocument;
  candidateProject: VizProjectDocument;
  revision: number;
  dryRun: boolean;
  conflict: VizProjectRevisionConflict | undefined;
  transactionIssues: VizEditorSessionTransactionIssue[];
  warnings: VizActionWarning[];
  errors: VizActionError[];
  validation: ReturnType<typeof validateProjectDocument>;
  issues: VizEditorSessionIssue[];
  actionEnvelopes: VizActionEnvelope[];
}

export interface CreateVizEditorSessionOptions {
  project: VizProjectDocument;
  normalizeProject?: (project: VizProjectDocument) => VizProjectDocument;
  actor?: VizActionActor;
  uiState?: Partial<VizEditorUiState>;
  previewState?: Partial<VizEditorPreviewState>;
}

export interface VizEditorSession {
  getSnapshot(): VizEditorSessionSnapshot;
  getSourceProject(): VizProjectDocument;
  getWorkingProject(): VizProjectDocument;
  getUiState(): VizEditorUiState;
  getPreviewState(): VizEditorPreviewState;
  setUiState(
    next:
      | Partial<VizEditorUiState>
      | ((
          current: VizEditorUiState,
        ) => VizEditorUiState | Partial<VizEditorUiState>),
  ): VizEditorSessionSnapshot;
  setPreviewState(
    next:
      | Partial<VizEditorPreviewState>
      | ((
          current: VizEditorPreviewState,
        ) => VizEditorPreviewState | Partial<VizEditorPreviewState>),
  ): VizEditorSessionSnapshot;
  applyAction(
    action: VizProjectAction,
    options?: { actor?: VizActionActor },
  ): VizEditorSessionMutationResult;
  applyActions(
    actions: VizProjectAction[],
    options?: { actor?: VizActionActor },
  ): VizEditorSessionMutationResult;
  transact(
    transaction: VizProjectTransaction,
    options?: { actor?: VizActionActor },
  ): VizEditorSessionMutationResult;
  undo(): VizEditorSessionSnapshot;
  redo(): VizEditorSessionSnapshot;
  canUndo(): boolean;
  canRedo(): boolean;
  beginHistoryGroup(): void;
  endHistoryGroup(): VizEditorSessionSnapshot;
  replaceWorkingProject(
    project: VizProjectDocument,
    options?: {
      actor?: VizActionActor;
      resetHistory?: boolean;
      recordHistory?: boolean;
    },
  ): VizEditorSessionSnapshot;
  loadProject(
    project: VizProjectDocument,
    options?: {
      actor?: VizActionActor;
      uiState?: Partial<VizEditorUiState>;
      previewState?: Partial<VizEditorPreviewState>;
    },
  ): VizEditorSessionSnapshot;
  resetWorkingProject(): VizEditorSessionSnapshot;
  exportWorkingProject(): VizProjectDocument;
  subscribe(listener: (snapshot: VizEditorSessionSnapshot) => void): () => void;
}

const cloneUnknown = <T>(value: T): T => {
  return structuredClone(value);
};

const cloneProject = (project: VizProjectDocument): VizProjectDocument => {
  return cloneUnknown(project);
};

const cloneEnvelope = <TAction extends VizProjectAction>(
  envelope: VizActionEnvelope<TAction>,
): VizActionEnvelope<TAction> => {
  return cloneUnknown(envelope);
};

const cloneIssue = (issue: VizEditorSessionIssue): VizEditorSessionIssue => {
  return { ...issue };
};

const createEditorUiState = (
  project: VizProjectDocument,
  overrides: Partial<VizEditorUiState> | undefined,
): VizEditorUiState => {
  const firstLayerId = project.layerOrder[0] ?? project.layers[0]?.id;

  return {
    selectedLayerId: overrides?.selectedLayerId ?? firstLayerId,
    selectedGraphId: overrides?.selectedGraphId,
    selectedNodeId: overrides?.selectedNodeId,
    expandedLayerIds: cloneUnknown(overrides?.expandedLayerIds ?? []),
    activePanel: overrides?.activePanel ?? 'layers',
  };
};

const createEditorPreviewState = (
  overrides: Partial<VizEditorPreviewState> | undefined,
): VizEditorPreviewState => {
  return {
    currentFrame: overrides?.currentFrame ?? 0,
    isPlaying: overrides?.isPlaying ?? false,
    mode: overrides?.mode ?? 'render',
  };
};

const mergeUiState = (
  current: VizEditorUiState,
  next:
    | Partial<VizEditorUiState>
    | ((
        current: VizEditorUiState,
      ) => VizEditorUiState | Partial<VizEditorUiState>),
): VizEditorUiState => {
  const patch = typeof next === 'function' ? next(cloneUnknown(current)) : next;

  return {
    ...current,
    ...patch,
    expandedLayerIds: cloneUnknown(
      patch.expandedLayerIds ?? current.expandedLayerIds,
    ),
  };
};

const mergePreviewState = (
  current: VizEditorPreviewState,
  next:
    | Partial<VizEditorPreviewState>
    | ((
        current: VizEditorPreviewState,
      ) => VizEditorPreviewState | Partial<VizEditorPreviewState>),
): VizEditorPreviewState => {
  const patch = typeof next === 'function' ? next({ ...current }) : next;
  return {
    ...current,
    ...patch,
  };
};

const createSessionIssues = ({
  warnings,
  errors,
  validation,
  transactionIssues = [],
}: {
  warnings: VizActionWarning[];
  errors: VizActionError[];
  validation: ReturnType<typeof validateProjectDocument>;
  transactionIssues?: VizEditorSessionTransactionIssue[];
}): VizEditorSessionIssue[] => {
  const issues: VizEditorSessionIssue[] = [];

  for (const issue of transactionIssues) {
    issues.push({
      source: 'transaction',
      severity: 'error',
      code: issue.code,
      message: issue.message,
    });
  }

  for (const warning of warnings) {
    issues.push({
      source: 'action',
      severity: 'warning',
      code: warning.code,
      message: warning.message,
    });
  }

  for (const error of errors) {
    issues.push({
      source: 'action',
      severity: 'error',
      code: error.code,
      message: error.message,
    });
  }

  for (const issue of validation.issues) {
    issues.push({
      source: 'validation',
      severity: 'error',
      code: issue.code,
      message: issue.message,
    });
  }

  return issues;
};

const createActionEnvelope = ({
  action,
  actor,
  counter,
  transactionId,
  timestamp,
}: {
  action: VizProjectAction;
  actor: VizActionActor;
  counter: number;
  transactionId: string;
  timestamp: string;
}): VizActionEnvelope => {
  return {
    id: `action-${counter}`,
    transactionId,
    type: action.type,
    timestamp,
    actor,
    payload: cloneUnknown(action.payload),
  };
};

const createSnapshot = (
  state: InternalSessionState,
): VizEditorSessionSnapshot => {
  return {
    sourceProject: cloneProject(state.sourceProject),
    workingProject: cloneProject(state.workingProject),
    uiState: cloneUnknown(state.uiState),
    previewState: { ...state.previewState },
    actionHistory: state.actionHistory.map((entry) => cloneEnvelope(entry)),
    issues: state.issues.map((issue) => cloneIssue(issue)),
    revision: state.revision,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
};

interface ProjectHistoryEntry {
  project: VizProjectDocument;
}

interface InternalSessionState {
  sourceProject: VizProjectDocument;
  workingProject: VizProjectDocument;
  uiState: VizEditorUiState;
  previewState: VizEditorPreviewState;
  actionHistory: VizActionEnvelope[];
  issues: VizEditorSessionIssue[];
  revision: number;
  actionCounter: number;
  transactionCounter: number;
  defaultActor: VizActionActor;
  past: ProjectHistoryEntry[];
  future: ProjectHistoryEntry[];
  historyGroupStart: VizProjectDocument | undefined;
}

const MAX_PROJECT_HISTORY_SIZE = 100;

export const createVizEditorSession = ({
  project,
  normalizeProject,
  actor = { kind: 'user' },
  uiState,
  previewState,
}: CreateVizEditorSessionOptions): VizEditorSession => {
  const normalize = (projectDocument: VizProjectDocument) =>
    cloneProject(
      normalizeProject?.(cloneProject(projectDocument)) ?? projectDocument,
    );
  const initialProject = normalize(project);
  assertValidProjectDocument(initialProject);

  const sourceProject = cloneProject(initialProject);
  let state: InternalSessionState = {
    sourceProject,
    workingProject: cloneProject(initialProject),
    uiState: createEditorUiState(initialProject, uiState),
    previewState: createEditorPreviewState(previewState),
    actionHistory: [],
    issues: [],
    revision: 0,
    actionCounter: 0,
    transactionCounter: 0,
    defaultActor: cloneUnknown(actor),
    past: [],
    future: [],
    historyGroupStart: undefined,
  };
  const listeners = new Set<(snapshot: VizEditorSessionSnapshot) => void>();

  const notify = () => {
    const snapshot = createSnapshot(state);
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const pushPast = (
    projectDocument: VizProjectDocument,
  ): ProjectHistoryEntry[] => {
    return [...state.past, { project: cloneProject(projectDocument) }].slice(
      -MAX_PROJECT_HISTORY_SIZE,
    );
  };

  const createGeneratedTransactionId = (): string => {
    const existingIds = new Set(
      state.actionHistory.map((entry) => entry.transactionId),
    );
    let counter = state.transactionCounter + 1;
    let transactionId = `transaction-${counter}`;

    while (existingIds.has(transactionId)) {
      counter += 1;
      transactionId = `transaction-${counter}`;
    }

    return transactionId;
  };

  const transact = (
    transaction: VizProjectTransaction,
    options?: { actor?: VizActionActor },
  ): VizEditorSessionMutationResult => {
    const baseRevision = state.revision;
    const transactionActor = cloneUnknown(options?.actor ?? state.defaultActor);
    const transactionId =
      typeof transaction.id === 'string' && transaction.id.trim().length > 0
        ? transaction.id
        : createGeneratedTransactionId();
    const transactionIssues: VizEditorSessionTransactionIssue[] = [];
    const currentProject = cloneProject(state.workingProject);
    const currentValidation = validateProjectDocument(currentProject);

    if (
      transaction.id !== undefined &&
      (typeof transaction.id !== 'string' || transaction.id.trim().length === 0)
    ) {
      transactionIssues.push({
        code: 'invalid-transaction',
        message: 'Transaction id must be a non-empty string when provided.',
      });
    }

    if (
      !Array.isArray(transaction.actions) ||
      transaction.actions.length === 0
    ) {
      transactionIssues.push({
        code: 'invalid-transaction',
        message: 'A project transaction must contain at least one action.',
      });
    }

    if (
      transaction.expectedRevision !== undefined &&
      (!Number.isInteger(transaction.expectedRevision) ||
        transaction.expectedRevision < 0)
    ) {
      transactionIssues.push({
        code: 'invalid-transaction',
        message:
          'Transaction expectedRevision must be a non-negative integer when provided.',
      });
    }

    if (
      state.actionHistory.some((entry) => entry.transactionId === transactionId)
    ) {
      transactionIssues.push({
        code: 'duplicate-transaction-id',
        message: `Transaction id "${transactionId}" has already been committed.`,
      });
    }

    if (
      transactionIssues.length === 0 &&
      transaction.expectedRevision !== undefined &&
      transaction.expectedRevision !== baseRevision
    ) {
      const conflict: VizProjectRevisionConflict = {
        expectedRevision: transaction.expectedRevision,
        actualRevision: baseRevision,
      };
      const conflictIssues: VizEditorSessionTransactionIssue[] = [
        {
          code: 'revision-conflict',
          message: `Expected project revision ${conflict.expectedRevision}, but the current revision is ${conflict.actualRevision}.`,
        },
      ];

      return {
        ok: false,
        status: 'conflict',
        transactionId,
        actor: transactionActor,
        baseRevision,
        project: currentProject,
        candidateProject: cloneProject(currentProject),
        revision: baseRevision,
        dryRun: transaction.dryRun ?? false,
        conflict,
        transactionIssues: conflictIssues,
        warnings: [],
        errors: [],
        validation: currentValidation,
        issues: createSessionIssues({
          warnings: [],
          errors: [],
          validation: currentValidation,
          transactionIssues: conflictIssues,
        }),
        actionEnvelopes: [],
      };
    }

    if (transactionIssues.length > 0) {
      const issues = createSessionIssues({
        warnings: [],
        errors: [],
        validation: currentValidation,
        transactionIssues,
      });

      return {
        ok: false,
        status: 'rejected',
        transactionId,
        actor: transactionActor,
        baseRevision,
        project: currentProject,
        candidateProject: cloneProject(currentProject),
        revision: baseRevision,
        dryRun: transaction.dryRun ?? false,
        conflict: undefined,
        transactionIssues: cloneUnknown(transactionIssues),
        warnings: [],
        errors: [],
        validation: currentValidation,
        issues,
        actionEnvelopes: [],
      };
    }

    const actionResult = applyVizProjectActions(
      state.workingProject,
      transaction.actions,
    );
    const candidateProject = normalize(actionResult.project);
    const validation = validateProjectDocument(candidateProject);
    const issues = createSessionIssues({
      warnings: actionResult.warnings,
      errors: actionResult.errors,
      validation,
    });
    const candidateIsValid = actionResult.errors.length === 0 && validation.ok;

    if (transaction.dryRun === true) {
      return {
        ok: candidateIsValid,
        status: candidateIsValid ? 'dry-run' : 'rejected',
        transactionId,
        actor: transactionActor,
        baseRevision,
        project: currentProject,
        candidateProject: cloneProject(candidateProject),
        revision: baseRevision,
        dryRun: true,
        conflict: undefined,
        transactionIssues: [],
        warnings: cloneUnknown(actionResult.warnings),
        errors: cloneUnknown(actionResult.errors),
        validation,
        issues: cloneUnknown(issues),
        actionEnvelopes: [],
      };
    }

    if (!candidateIsValid) {
      state = {
        ...state,
        issues,
      };
      notify();

      return {
        ok: false,
        status: 'rejected',
        transactionId,
        actor: transactionActor,
        baseRevision,
        project: cloneProject(state.workingProject),
        candidateProject: cloneProject(candidateProject),
        revision: state.revision,
        dryRun: false,
        conflict: undefined,
        transactionIssues: [],
        warnings: cloneUnknown(actionResult.warnings),
        errors: cloneUnknown(actionResult.errors),
        validation,
        issues: cloneUnknown(issues),
        actionEnvelopes: [],
      };
    }

    const timestamp = new Date().toISOString();
    const actionEnvelopes = transaction.actions.map((action, index) =>
      createActionEnvelope({
        action,
        actor: transactionActor,
        counter: state.actionCounter + index + 1,
        transactionId,
        timestamp,
      }),
    );

    state = {
      ...state,
      workingProject: candidateProject,
      actionHistory: [
        ...state.actionHistory,
        ...actionEnvelopes.map((entry) => cloneEnvelope(entry)),
      ],
      issues,
      revision: state.revision + 1,
      actionCounter: state.actionCounter + actionEnvelopes.length,
      transactionCounter: state.transactionCounter + 1,
      past:
        state.historyGroupStart === undefined
          ? pushPast(state.workingProject)
          : state.past,
      future: [],
    };
    notify();

    return {
      ok: true,
      status: 'applied',
      transactionId,
      actor: transactionActor,
      baseRevision,
      project: cloneProject(state.workingProject),
      candidateProject: cloneProject(state.workingProject),
      revision: state.revision,
      dryRun: false,
      conflict: undefined,
      transactionIssues: [],
      warnings: cloneUnknown(actionResult.warnings),
      errors: cloneUnknown(actionResult.errors),
      validation,
      issues: cloneUnknown(issues),
      actionEnvelopes: actionEnvelopes.map((entry) => cloneEnvelope(entry)),
    };
  };

  return {
    getSnapshot: () => createSnapshot(state),
    getSourceProject: () => cloneProject(state.sourceProject),
    getWorkingProject: () => cloneProject(state.workingProject),
    getUiState: () => cloneUnknown(state.uiState),
    getPreviewState: () => ({ ...state.previewState }),
    setUiState: (next) => {
      state = {
        ...state,
        uiState: mergeUiState(state.uiState, next),
      };

      notify();
      return createSnapshot(state);
    },
    setPreviewState: (next) => {
      state = {
        ...state,
        previewState: mergePreviewState(state.previewState, next),
      };

      notify();
      return createSnapshot(state);
    },
    applyAction: (action, options) => transact({ actions: [action] }, options),
    applyActions: (actions, options) => transact({ actions }, options),
    transact,
    undo: () => {
      const previous = state.past.at(-1);
      if (!previous) {
        return createSnapshot(state);
      }

      state = {
        ...state,
        workingProject: cloneProject(previous.project),
        past: state.past.slice(0, -1),
        future: [
          { project: cloneProject(state.workingProject) },
          ...state.future,
        ],
        issues: [],
        revision: state.revision + 1,
      };
      notify();
      return createSnapshot(state);
    },
    redo: () => {
      const next = state.future[0];
      if (!next) {
        return createSnapshot(state);
      }

      state = {
        ...state,
        workingProject: cloneProject(next.project),
        past: pushPast(state.workingProject),
        future: state.future.slice(1),
        issues: [],
        revision: state.revision + 1,
      };
      notify();
      return createSnapshot(state);
    },
    canUndo: () => state.past.length > 0,
    canRedo: () => state.future.length > 0,
    beginHistoryGroup: () => {
      if (state.historyGroupStart === undefined) {
        state = {
          ...state,
          historyGroupStart: cloneProject(state.workingProject),
        };
      }
    },
    endHistoryGroup: () => {
      if (state.historyGroupStart !== undefined) {
        const changed =
          JSON.stringify(state.historyGroupStart) !==
          JSON.stringify(state.workingProject);
        state = {
          ...state,
          past: changed
            ? [
                ...state.past,
                { project: cloneProject(state.historyGroupStart) },
              ].slice(-MAX_PROJECT_HISTORY_SIZE)
            : state.past,
          historyGroupStart: undefined,
        };
        notify();
      }
      return createSnapshot(state);
    },
    replaceWorkingProject: (projectDocument, options) => {
      const normalizedProject = normalize(projectDocument);
      assertValidProjectDocument(normalizedProject);

      state = {
        ...state,
        workingProject: normalizedProject,
        issues: [],
        revision: state.revision + 1,
        actionHistory: options?.resetHistory ? [] : state.actionHistory,
        actionCounter: options?.resetHistory ? 0 : state.actionCounter,
        transactionCounter: options?.resetHistory
          ? 0
          : state.transactionCounter,
        past: options?.resetHistory
          ? []
          : options?.recordHistory === false
            ? state.past
            : pushPast(state.workingProject),
        future: [],
        historyGroupStart: undefined,
      };

      notify();
      return createSnapshot(state);
    },
    loadProject: (projectDocument, options) => {
      const normalizedProject = normalize(projectDocument);
      assertValidProjectDocument(normalizedProject);

      state = {
        ...state,
        sourceProject: cloneProject(normalizedProject),
        workingProject: cloneProject(normalizedProject),
        uiState: createEditorUiState(normalizedProject, options?.uiState),
        previewState: createEditorPreviewState({
          mode: state.previewState.mode,
          ...options?.previewState,
        }),
        actionHistory: [],
        issues: [],
        revision: state.revision + 1,
        actionCounter: 0,
        transactionCounter: 0,
        defaultActor: cloneUnknown(options?.actor ?? state.defaultActor),
        past: [],
        future: [],
        historyGroupStart: undefined,
      };

      notify();
      return createSnapshot(state);
    },
    resetWorkingProject: () => {
      state = {
        ...state,
        workingProject: cloneProject(state.sourceProject),
        issues: [],
        revision: state.revision + 1,
        actionHistory: [],
        actionCounter: 0,
        transactionCounter: 0,
        past: [],
        future: [],
        historyGroupStart: undefined,
      };

      notify();
      return createSnapshot(state);
    },
    exportWorkingProject: () => cloneProject(state.workingProject),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
