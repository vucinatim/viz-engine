import type { VizSessionHost } from '@viz-engine/editor-control';
import { validateProjectDocument } from '@viz-engine/runtime';

import type { VizSessionPreviewState } from './types';

export const createStudioInspectionActions = ({
  host,
  getPreviewState,
  inspectRuntime,
}: {
  host: VizSessionHost;
  getPreviewState: () => VizSessionPreviewState;
  inspectRuntime: () => unknown;
}) => ({
  project() {
    const snapshot = host.getSnapshot().session;
    return {
      revision: snapshot.revision,
      project: snapshot.workingProject,
      validation: validateProjectDocument(snapshot.workingProject),
      issues: snapshot.issues,
      actionHistory: snapshot.actionHistory,
      canUndo: snapshot.canUndo,
      canRedo: snapshot.canRedo,
    };
  },
  graph(graphId: string) {
    const graph = host
      .getWorkingProject()
      .graphs?.find((candidate) => candidate.id === graphId);
    const runtime = getPreviewState().runtimeInspection.lastGraphResults.find(
      (result) => result.graphId === graphId,
    );
    return {
      graph: graph ? structuredClone(graph) : undefined,
      runtime: runtime ? structuredClone(runtime) : undefined,
    };
  },
  runtime: inspectRuntime,
  assets() {
    const project = host.getWorkingProject();
    return {
      assetRefs: structuredClone(project.assetRefs ?? []),
      artifactRefs: structuredClone(project.artifactRefs ?? []),
      materializedAssets: structuredClone(
        getPreviewState().runtimeInspection.lastMaterializedAssets,
      ),
    };
  },
});
