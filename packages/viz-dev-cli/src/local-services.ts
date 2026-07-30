import { applyVizProjectActions } from '@viz-engine/actions';
import { createCoreComponentRegistry } from '@viz-engine/components-core';
import type {
  VizProjectAction,
  VizProjectDocument,
  VizResolvedArtifact,
  VizResolvedAsset,
} from '@viz-engine/contracts';
import {
  exampleProjectDocument,
  exampleResolvedArtifacts,
  exampleResolvedAssets,
} from '@viz-engine/example-projects';
import { createCoreNodeRegistry } from '@viz-engine/nodes-core';
import {
  loadLocalVizProjectBundle,
  writeLocalVizProjectBundle,
  type LoadedLocalVizProjectBundle,
} from '@viz-engine/project-bundle/node';
import { renderVizRenderPlanToSvgMarkup } from '@viz-engine/renderer-svg';
import {
  createVizFramePlan,
  createVizRenderPlan,
  createVizRuntimeSession,
  sampleProjectAudioFrameSnapshot,
  validateProjectDocument,
} from '@viz-engine/runtime';
import type { VizCliOutput } from './types.js';

const componentRegistry = createCoreComponentRegistry();
const nodeRegistry = createCoreNodeRegistry();

const createBundleSession = (loaded: LoadedLocalVizProjectBundle) => {
  return createVizRuntimeSession({
    project: loaded.project,
    mode: 'render',
    resolvedAssets: loaded.resolvedAssets,
    resolvedArtifacts: loaded.resolvedArtifacts,
    seed: 'cli-bundle-seed',
  });
};

const createBundleRuntimeInputs = (
  loaded: LoadedLocalVizProjectBundle,
  frame: number,
) => {
  const audio = sampleProjectAudioFrameSnapshot(
    loaded.project,
    loaded.resolvedArtifacts,
    frame,
  );
  return audio === undefined ? {} : { audio };
};

export const validateExampleProject = (): VizCliOutput => {
  const result = validateProjectDocument(exampleProjectDocument);

  return {
    ok: result.ok,
    command: 'example validate',
    payload: result,
  };
};

export const inspectExampleFrame = (frame: number): VizCliOutput => {
  const session = createVizRuntimeSession({
    project: exampleProjectDocument,
    mode: 'render',
    resolvedAssets: exampleResolvedAssets,
    resolvedArtifacts: exampleResolvedArtifacts,
    seed: 'cli-seed',
  });

  const framePlan = createVizFramePlan({
    session,
    frame,
    registry: componentRegistry,
    nodeRegistry,
  });

  return {
    ok: framePlan.issues.length === 0,
    command: 'example frame',
    payload: framePlan,
  };
};

export const inspectExampleRender = (frame: number): VizCliOutput => {
  const session = createVizRuntimeSession({
    project: exampleProjectDocument,
    mode: 'render',
    resolvedAssets: exampleResolvedAssets,
    resolvedArtifacts: exampleResolvedArtifacts,
    seed: 'cli-seed',
  });

  const renderPlan = createVizRenderPlan({
    session,
    frame,
    registry: componentRegistry,
    nodeRegistry,
  });

  return {
    ok: renderPlan.issues.length === 0,
    command: 'example render',
    payload: renderPlan,
  };
};

export const renderExampleSvg = (frame: number): VizCliOutput => {
  const renderOutput = inspectExampleRender(frame);

  if (!renderOutput.ok) {
    return renderOutput;
  }

  return {
    ok: true,
    command: 'example svg',
    payload: {
      frame,
      svg: renderVizRenderPlanToSvgMarkup(
        renderOutput.payload as Parameters<
          typeof renderVizRenderPlanToSvgMarkup
        >[0],
      ),
    },
  };
};

export const validateBundleProject = (
  bundleDirectory: string,
): VizCliOutput => {
  const loaded = loadLocalVizProjectBundle(bundleDirectory);
  const result = validateProjectDocument(loaded.project);
  const ok = result.ok && loaded.issues.length === 0;

  return {
    ok,
    command: 'bundle validate',
    payload: {
      bundleDirectory: loaded.bundleDirectory,
      manifest: loaded.manifest,
      ...(loaded.executionManifest === undefined
        ? {}
        : { executionManifest: loaded.executionManifest }),
      project: loaded.project,
      resourceCounts: {
        assets: loaded.resolvedAssets.length,
        artifacts: loaded.resolvedArtifacts.length,
      },
      issues: loaded.issues,
      validation: result,
    },
  };
};

export const inspectBundleFrame = (
  bundleDirectory: string,
  frame: number,
): VizCliOutput => {
  const loaded = loadLocalVizProjectBundle(bundleDirectory);
  const session = createBundleSession(loaded);
  const framePlan = createVizFramePlan({
    session,
    frame,
    registry: componentRegistry,
    nodeRegistry,
    runtimeInputs: createBundleRuntimeInputs(loaded, frame),
  });

  return {
    ok: framePlan.issues.length === 0,
    command: 'bundle frame',
    payload: {
      bundleDirectory: loaded.bundleDirectory,
      manifest: loaded.manifest,
      framePlan,
    },
  };
};

export const inspectBundleRender = (
  bundleDirectory: string,
  frame: number,
): VizCliOutput => {
  const loaded = loadLocalVizProjectBundle(bundleDirectory);
  const session = createBundleSession(loaded);
  const renderPlan = createVizRenderPlan({
    session,
    frame,
    registry: componentRegistry,
    nodeRegistry,
    runtimeInputProvider: (requestedFrame) =>
      createBundleRuntimeInputs(loaded, requestedFrame),
  });

  return {
    ok: renderPlan.issues.length === 0,
    command: 'bundle render',
    payload: {
      bundleDirectory: loaded.bundleDirectory,
      manifest: loaded.manifest,
      renderPlan,
    },
  };
};

export const renderBundleSvg = (
  bundleDirectory: string,
  frame: number,
): VizCliOutput => {
  const renderOutput = inspectBundleRender(bundleDirectory, frame);

  if (!renderOutput.ok) {
    return renderOutput;
  }

  const payload = renderOutput.payload as {
    bundleDirectory: string;
    manifest: unknown;
    renderPlan: Parameters<typeof renderVizRenderPlanToSvgMarkup>[0];
  };

  return {
    ok: true,
    command: 'bundle svg',
    payload: {
      bundleDirectory: payload.bundleDirectory,
      manifest: payload.manifest,
      frame,
      svg: renderVizRenderPlanToSvgMarkup(payload.renderPlan),
    },
  };
};

export const exportExampleBundle = (bundleDirectory: string): VizCliOutput => {
  const result = writeLocalVizProjectBundle({
    bundleDirectory,
    project: exampleProjectDocument,
    resolvedAssets: exampleResolvedAssets,
    resolvedArtifacts: exampleResolvedArtifacts,
  });

  return {
    ok: result.issues.length === 0,
    command: 'example bundle export',
    payload: result,
  };
};

export const exportBundleProject = (
  sourceBundleDirectory: string,
  outputBundleDirectory: string,
): VizCliOutput => {
  const loaded = loadLocalVizProjectBundle(sourceBundleDirectory);
  const result = writeLocalVizProjectBundle({
    bundleDirectory: outputBundleDirectory,
    project: loaded.project,
    resolvedAssets: loaded.resolvedAssets,
    resolvedArtifacts: loaded.resolvedArtifacts,
  });

  return {
    ok: loaded.issues.length === 0 && result.issues.length === 0,
    command: 'bundle export',
    payload: {
      sourceBundleDirectory: loaded.bundleDirectory,
      manifest: result.manifest,
      issues: [...loaded.issues, ...result.issues],
    },
  };
};

interface ApplyProjectActionsOptions {
  command: string;
  project: VizProjectDocument;
  resolvedAssets: VizResolvedAsset[];
  resolvedArtifacts: VizResolvedArtifact[];
  actions: VizProjectAction[];
  outputBundleDirectory?: string;
  sourceIssues?: LoadedLocalVizProjectBundle['issues'];
  sourceBundleDirectory?: string;
}

const applyProjectActions = ({
  command,
  project,
  resolvedAssets,
  resolvedArtifacts,
  actions,
  outputBundleDirectory,
  sourceIssues = [],
  sourceBundleDirectory,
}: ApplyProjectActionsOptions): VizCliOutput => {
  const actionResult = applyVizProjectActions(project, actions);
  const validation = validateProjectDocument(actionResult.project);
  const bundleWriteResult =
    outputBundleDirectory === undefined || !validation.ok
      ? undefined
      : writeLocalVizProjectBundle({
          bundleDirectory: outputBundleDirectory,
          project: actionResult.project,
          resolvedAssets,
          resolvedArtifacts,
        });
  const framePlan = !validation.ok
    ? undefined
    : createVizFramePlan({
        session: createVizRuntimeSession({
          project: actionResult.project,
          mode: 'render',
          resolvedAssets,
          resolvedArtifacts,
          seed: 'cli-action-seed',
        }),
        frame: 0,
        registry: componentRegistry,
        nodeRegistry,
      });

  const ok =
    sourceIssues.length === 0 &&
    actionResult.ok &&
    validation.ok &&
    (framePlan?.issues.length ?? 0) === 0 &&
    (bundleWriteResult?.issues.length ?? 0) === 0;

  return {
    ok,
    command,
    payload: {
      ...(sourceBundleDirectory === undefined
        ? {}
        : {
            sourceBundleDirectory,
          }),
      actionResult,
      validation,
      ...(framePlan === undefined ? {} : { framePlan }),
      ...(sourceIssues.length === 0 ? {} : { sourceIssues }),
      ...(bundleWriteResult === undefined
        ? {}
        : {
            bundleWriteResult,
          }),
    },
  };
};

export const applyActionsToExampleProject = (
  actions: VizProjectAction[],
  outputBundleDirectory?: string,
): VizCliOutput => {
  return applyProjectActions({
    command: 'example action-apply',
    project: exampleProjectDocument,
    resolvedAssets: exampleResolvedAssets,
    resolvedArtifacts: exampleResolvedArtifacts,
    actions,
    ...(outputBundleDirectory === undefined ? {} : { outputBundleDirectory }),
  });
};

export const applyActionsToBundleProject = (
  sourceBundleDirectory: string,
  actions: VizProjectAction[],
  outputBundleDirectory?: string,
): VizCliOutput => {
  const loaded = loadLocalVizProjectBundle(sourceBundleDirectory);

  return applyProjectActions({
    command: 'bundle action-apply',
    project: loaded.project,
    resolvedAssets: loaded.resolvedAssets,
    resolvedArtifacts: loaded.resolvedArtifacts,
    actions,
    sourceIssues: loaded.issues,
    sourceBundleDirectory: loaded.bundleDirectory,
    ...(outputBundleDirectory === undefined ? {} : { outputBundleDirectory }),
  });
};
