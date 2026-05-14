import fs from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const repoRoot = path.resolve(__dirname, '../..');
const publicRoot = path.resolve(repoRoot, 'public');
const musicDir = path.resolve(publicRoot, 'music');
const projectsDir = path.resolve(publicRoot, 'projects');

function listBundledAudioFiles() {
  if (!fs.existsSync(musicDir)) {
    return [];
  }

  return fs
    .readdirSync(musicDir)
    .filter((file) => fs.statSync(path.resolve(musicDir, file)).isFile())
    .sort((left, right) => left.localeCompare(right));
}

function listBundledSampleProjects() {
  if (!fs.existsSync(projectsDir)) {
    return [];
  }

  return fs
    .readdirSync(projectsDir)
    .filter((file) => file.endsWith('.vizengine.json'))
    .sort((left, right) => left.localeCompare(right))
    .map((file) => ({
      name: file.replace(/\.vizengine\.json$/, ''),
      filename: file,
      url: `/projects/${file}`,
    }));
}

function createPublicManifestPlugin() {
  const audioId = 'virtual:bundled-audio-files';
  const sampleProjectsId = 'virtual:sample-projects';
  const resolvedAudioId = `\0${audioId}`;
  const resolvedSampleProjectsId = `\0${sampleProjectsId}`;

  return {
    name: 'viz-public-manifests',
    resolveId(id: string) {
      if (id === audioId) {
        return resolvedAudioId;
      }

      if (id === sampleProjectsId) {
        return resolvedSampleProjectsId;
      }

      return null;
    },
    load(id: string) {
      if (id === resolvedAudioId) {
        return `export default ${JSON.stringify(listBundledAudioFiles())};`;
      }

      if (id === resolvedSampleProjectsId) {
        return `export default ${JSON.stringify(listBundledSampleProjects())};`;
      }

      return null;
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), createPublicManifestPlugin()],
  publicDir: publicRoot,
  resolve: {
    alias: {
      '@': path.resolve(repoRoot, 'src'),
      '@viz-engine/example-projects': path.resolve(
        repoRoot,
        'packages/viz-example-projects/src/index.ts',
      ),
      '@viz-engine/runtime': path.resolve(
        repoRoot,
        'packages/viz-runtime/src/index.ts',
      ),
      '@viz-engine/components-core': path.resolve(
        repoRoot,
        'packages/viz-components-core/src/index.ts',
      ),
      '@viz-engine/renderer-svg': path.resolve(
        repoRoot,
        'packages/viz-renderer-svg/src/index.ts',
      ),
      '@viz-engine/renderer-three': path.resolve(
        repoRoot,
        'packages/viz-renderer-three/src/index.ts',
      ),
    },
  },
  server: {
    port: 4173,
    fs: {
      allow: [repoRoot],
    },
  },
});
