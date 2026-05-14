import {
  loadLocalVizProjectBundle,
  writeLocalVizProjectBundle,
} from '@viz-engine/dev-cli';

import {
  createVizEditorControl,
  type CreateVizEditorControlOptions,
  type VizEditorControl,
  type VizEditorControlSnapshot,
} from './index.js';

export interface VizNodeEditorControl extends VizEditorControl {
  openBundleProject(bundleDirectory: string): VizEditorControlSnapshot;
  exportWorkingBundle(
    bundleDirectory: string,
  ): ReturnType<typeof writeLocalVizProjectBundle>;
}

export const createVizNodeEditorControl = (
  options: CreateVizEditorControlOptions = {},
): VizNodeEditorControl => {
  const control = createVizEditorControl(options);

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
