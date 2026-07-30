import { createCoreComponentRegistry } from "@viz-engine/components-core";
import type { VizRenderRequest } from "@viz-engine/contracts";
import { createCoreNodeRegistry } from "@viz-engine/nodes-core";
import {
  createVizRenderJobService,
  createVizRenderSourceContentIdentity,
} from "@viz-engine/render";
import { createVizNodeSvgRenderExecutor } from "@viz-engine/render/node";
import { loadLocalVizProjectBundle } from "./local-project-bundle.js";

export interface RenderLocalBundleOptions {
  sourceBundleDirectory: string;
  outputDirectory: string;
  request: VizRenderRequest;
}

export const renderLocalBundle = async ({
  sourceBundleDirectory,
  outputDirectory,
  request,
}: RenderLocalBundleOptions) => {
  const loaded = loadLocalVizProjectBundle(sourceBundleDirectory);
  if (loaded.issues.length > 0) {
    return {
      ok: false,
      payload: {
        sourceBundleDirectory: loaded.bundleDirectory,
        issues: loaded.issues,
      },
    };
  }
  const sourceBase = {
    project: loaded.project,
    resolvedAssets: loaded.resolvedAssets,
    resolvedArtifacts: loaded.resolvedArtifacts,
  };
  const contentIdentity =
    createVizRenderSourceContentIdentity(sourceBase);
  const service = createVizRenderJobService({
    sourceResolver: {
      resolve: async () => ({
        ...sourceBase,
        contentIdentity,
      }),
    },
    executors: [
      createVizNodeSvgRenderExecutor({
        outputDirectory,
        componentRegistry: createCoreComponentRegistry(),
        nodeRegistry: createCoreNodeRegistry(),
        seed: "viz-dev-node-svg-render",
      }),
    ],
  });
  const started = service.start(request, {
    kind: "agent",
    id: "viz-dev",
  });
  const completed = await service.wait(started.id);
  return {
    ok: completed.status === "succeeded",
    payload: {
      sourceBundleDirectory: loaded.bundleDirectory,
      outputDirectory,
      sourceContentIdentity: contentIdentity,
      job: completed,
    },
  };
};
