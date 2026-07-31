import fs from 'node:fs';
import path from 'node:path';

import { VIZ_PROJECT_SCHEMA_VERSION } from '@viz-engine/contracts';
import { validateProjectDocument } from '@viz-engine/runtime';
import { describe, expect, it } from 'vitest';

describe('Bundled sample project files', () => {
  it('use the canonical project persistence shape', () => {
    const projectsDir = path.join(process.cwd(), 'public/projects');
    const projectFiles = fs
      .readdirSync(projectsDir)
      .filter((file) => file.endsWith('.vizengine.json'));

    expect(projectFiles.length).toBeGreaterThan(0);

    for (const fileName of projectFiles) {
      const projectFile = JSON.parse(
        fs.readFileSync(path.join(projectsDir, fileName), 'utf8'),
      );

      expect(projectFile).toHaveProperty('version', VIZ_PROJECT_SCHEMA_VERSION);
      expect(projectFile).toHaveProperty('project');
      expect(projectFile.project).toHaveProperty(
        'schemaVersion',
        VIZ_PROJECT_SCHEMA_VERSION,
      );
      expect(projectFile.project).toHaveProperty('layerOrder');
      expect(projectFile.project).toHaveProperty('graphs');
      expect(projectFile.project.timeline.durationInFrames).toBeGreaterThan(
        projectFile.project.timeline.fps,
      );
      expect(projectFile).toHaveProperty('nodeEditorUi');
      expect(projectFile).toHaveProperty('editorUi');
      expect(projectFile).not.toHaveProperty('graphs');
      expect(projectFile.layerStore).toBeUndefined();
      expect(projectFile.layerValuesStore).toBeUndefined();
      expect(projectFile.nodeNetworkStore).toBeUndefined();
      expect(projectFile.editorStore).toBeUndefined();
      expect(validateProjectDocument(projectFile.project)).toMatchObject({
        ok: true,
        issues: [],
      });
    }
  });
});
