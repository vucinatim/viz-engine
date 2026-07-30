import {
  loadLocalVizProjectBundle,
  writeLocalVizProjectBundle,
} from '@viz-engine/dev-cli';

import {
  createVizControl,
  type CreateVizControlOptions,
  type VizControl,
  type VizControlSnapshot,
} from './index.js';

export interface VizNodeControl extends VizControl {
  openBundleProject(bundleDirectory: string): VizControlSnapshot;
  exportWorkingBundle(
    bundleDirectory: string,
  ): ReturnType<typeof writeLocalVizProjectBundle>;
}

export const createVizNodeControl = (
  options: CreateVizControlOptions = {},
): VizNodeControl => {
  const control = createVizControl(options);

  return {
    ...control,
    openBundleProject(bundleDirectory) {
      const loaded = loadLocalVizProjectBundle(bundleDirectory);

      if (loaded.issues.length > 0) {
        throw new Error(
          `Cannot open bundle with issues: ${loaded.issues
            .map((issue) => issue.message)
            .join('; ')}`,
        );
      }

      return control.openProject({
        project: loaded.project,
        resolvedAssets: loaded.resolvedAssets,
        resolvedArtifacts: loaded.resolvedArtifacts,
        source: {
          kind: 'bundle',
          label: `Bundle ${loaded.project.name}`,
          bundleDirectory: loaded.bundleDirectory,
        },
      });
    },
    exportWorkingBundle(bundleDirectory) {
      const resources = control.getProjectResources();
      return writeLocalVizProjectBundle({
        bundleDirectory,
        project: resources.project,
        resolvedAssets: resources.resolvedAssets,
        resolvedArtifacts: resources.resolvedArtifacts,
      });
    },
  };
};
