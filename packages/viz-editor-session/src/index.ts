import { applyVizProjectAction, applyVizProjectActions } from "@viz-engine/actions";
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
} from "@viz-engine/contracts";
import { assertValidProjectDocument, validateProjectDocument } from "@viz-engine/runtime";
export * from "./live-preview.js";

export interface VizEditorUiState {
  selectedLayerId: VizLayerId | undefined;
  selectedGraphId: VizGraphId | undefined;
  selectedNodeId: string | undefined;
  expandedLayerIds: VizLayerId[];
  activePanel: "layers" | "graph" | "components" | "audio";
}

export interface VizEditorPreviewState {
  currentFrame: number;
  isPlaying: boolean;
  mode: VizExecutionMode;
}

export interface VizEditorSessionIssue {
  source: "action" | "validation";
  severity: "warning" | "error";
  code: string;
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
  project: VizProjectDocument;
  revision: number;
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
      | ((current: VizEditorUiState) => VizEditorUiState | Partial<VizEditorUiState>),
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
    activePanel: overrides?.activePanel ?? "layers",
  };
};

const createEditorPreviewState = (
  overrides: Partial<VizEditorPreviewState> | undefined,
): VizEditorPreviewState => {
  return {
    currentFrame: overrides?.currentFrame ?? 0,
    isPlaying: overrides?.isPlaying ?? false,
    mode: overrides?.mode ?? "render",
  };
};

const mergeUiState = (
  current: VizEditorUiState,
  next:
    | Partial<VizEditorUiState>
    | ((current: VizEditorUiState) => VizEditorUiState | Partial<VizEditorUiState>),
): VizEditorUiState => {
  const patch = typeof next === "function" ? next(cloneUnknown(current)) : next;

  return {
    ...current,
    ...patch,
    expandedLayerIds: cloneUnknown(patch.expandedLayerIds ?? current.expandedLayerIds),
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
  const patch = typeof next === "function" ? next({ ...current }) : next;
  return {
    ...current,
    ...patch,
  };
};

const createSessionIssues = ({
  warnings,
  errors,
  validation,
}: {
  warnings: VizActionWarning[];
  errors: VizActionError[];
  validation: ReturnType<typeof validateProjectDocument>;
}): VizEditorSessionIssue[] => {
  const issues: VizEditorSessionIssue[] = [];

  for (const warning of warnings) {
    issues.push({
      source: "action",
      severity: "warning",
      code: warning.code,
      message: warning.message,
    });
  }

  for (const error of errors) {
    issues.push({
      source: "action",
      severity: "error",
      code: error.code,
      message: error.message,
    });
  }

  for (const issue of validation.issues) {
    issues.push({
      source: "validation",
      severity: "error",
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
}: {
  action: VizProjectAction;
  actor: VizActionActor;
  counter: number;
}): VizActionEnvelope => {
  return {
    id: `action-${counter}`,
    type: action.type,
    timestamp: new Date().toISOString(),
    actor,
    payload: cloneUnknown(action.payload),
  };
};

const createSnapshot = (state: InternalSessionState): VizEditorSessionSnapshot => {
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
  defaultActor: VizActionActor;
  past: ProjectHistoryEntry[];
  future: ProjectHistoryEntry[];
  historyGroupStart: VizProjectDocument | undefined;
}

const MAX_PROJECT_HISTORY_SIZE = 100;

export const createVizEditorSession = ({
  project,
  normalizeProject,
  actor = { kind: "user" },
  uiState,
  previewState,
}: CreateVizEditorSessionOptions): VizEditorSession => {
  const normalize = (projectDocument: VizProjectDocument) =>
    cloneProject(normalizeProject?.(cloneProject(projectDocument)) ?? projectDocument);
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

  const pushPast = (projectDocument: VizProjectDocument): ProjectHistoryEntry[] => {
    return [
      ...state.past,
      { project: cloneProject(projectDocument) },
    ].slice(-MAX_PROJECT_HISTORY_SIZE);
  };

  const mutateProjects = ({
    nextProject,
    actionEnvelopes,
    warnings,
    errors,
  }: {
    nextProject: VizProjectDocument;
    actionEnvelopes: VizActionEnvelope[];
    warnings: VizActionWarning[];
    errors: VizActionError[];
  }): VizEditorSessionMutationResult => {
    const normalizedProject = normalize(nextProject);
    const validation = validateProjectDocument(normalizedProject);
    const issues = createSessionIssues({
      warnings,
      errors,
      validation,
    });
    const ok = errors.length === 0 && validation.ok;

    if (!ok) {
      state = {
        ...state,
        issues,
      };
      notify();

      return {
        ok: false,
        project: cloneProject(state.workingProject),
        revision: state.revision,
        warnings: cloneUnknown(warnings),
        errors: cloneUnknown(errors),
        validation,
        issues: cloneUnknown(issues),
        actionEnvelopes: actionEnvelopes.map((entry) => cloneEnvelope(entry)),
      };
    }

    state = {
      ...state,
      workingProject: normalizedProject,
      actionHistory: [...state.actionHistory, ...actionEnvelopes.map((entry) => cloneEnvelope(entry))],
      issues,
      revision: state.revision + 1,
      actionCounter: state.actionCounter + actionEnvelopes.length,
      past:
        state.historyGroupStart === undefined
          ? pushPast(state.workingProject)
          : state.past,
      future: [],
    };
    notify();

    return {
      ok: true,
      project: cloneProject(state.workingProject),
      revision: state.revision,
      warnings: cloneUnknown(warnings),
      errors: cloneUnknown(errors),
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
    applyAction: (action, options) => {
      const result = applyVizProjectAction(state.workingProject, action);
      const actionEnvelope = createActionEnvelope({
        action,
        actor: cloneUnknown(options?.actor ?? state.defaultActor),
        counter: state.actionCounter + 1,
      });

      return mutateProjects({
        nextProject: result.project,
        actionEnvelopes: [actionEnvelope],
        warnings: result.warnings,
        errors: result.errors,
      });
    },
    applyActions: (actions, options) => {
      const result = applyVizProjectActions(state.workingProject, actions);
      const actionEnvelopes = actions.map((action, index) =>
        createActionEnvelope({
          action,
          actor: cloneUnknown(options?.actor ?? state.defaultActor),
          counter: state.actionCounter + index + 1,
        }),
      );

      return mutateProjects({
        nextProject: result.project,
        actionEnvelopes,
        warnings: result.warnings,
        errors: result.errors,
      });
    },
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
    resetWorkingProject: () => {
      state = {
        ...state,
        workingProject: cloneProject(state.sourceProject),
        issues: [],
        revision: state.revision + 1,
        actionHistory: [],
        actionCounter: 0,
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
