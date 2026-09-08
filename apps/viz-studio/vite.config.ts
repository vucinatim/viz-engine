import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import type { Alias } from 'vite';
import { defineConfig } from 'vite';
import { createVizControlBridgePlugin } from './viz-control-bridge-plugin';

const repoRoot = path.resolve(__dirname, '../..');
const publicRoot = path.resolve(repoRoot, 'public');
const musicDir = path.resolve(publicRoot, 'music');
const projectsDir = path.resolve(publicRoot, 'projects');
const tsconfigPath = path.resolve(repoRoot, 'tsconfig.base.json');

function createTsconfigAliases(): Alias[] {
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8')) as {
    compilerOptions?: { paths?: Record<string, string[]> };
  };
  const paths = tsconfig.compilerOptions?.paths ?? {};

  return Object.entries(paths).flatMap(([key, values]) => {
    const replacement = values[0];

    if (!replacement) {
      return [];
    }

    if (key.endsWith('/*') && replacement.endsWith('/*')) {
      return [
        {
          find: key.slice(0, -2),
          replacement: path.resolve(repoRoot, replacement.slice(0, -2)),
        },
      ];
    }

    return [
      {
        find: key,
        replacement: path.resolve(repoRoot, replacement),
      },
    ];
  });
}

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
  plugins: [
    react(),
    tailwindcss(),
    createPublicManifestPlugin(),
    createVizControlBridgePlugin(),
  ],
  publicDir: publicRoot,
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('/src/components/editor/rhythm-lab/') ||
            id.includes('/src/lib/rhythm-lab/')
          ) {
            return 'rhythm-lab';
          }

          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (
            id.includes('/three/examples/') ||
            id.includes('/@react-three/') ||
            id.includes('/meshline/')
          ) {
            return 'vendor-three-extras';
          }

          if (id.includes('/three/') || id.includes('/three/src/')) {
            return 'vendor-three';
          }

          if (
            id.includes('/remotion/') ||
            id.includes('/@remotion/') ||
            id.includes('/media-utils/')
          ) {
            return 'vendor-remotion';
          }

          if (
            id.includes('/@xyflow/') ||
            id.includes('/d3-drag/') ||
            id.includes('/d3-selection/')
          ) {
            return 'vendor-node-editor';
          }

          if (
            id.includes('/@radix-ui/') ||
            id.includes('/cmdk/') ||
            id.includes('/sonner/')
          ) {
            return 'vendor-ui';
          }

          if (
            id.includes('/react-hook-form/') ||
            id.includes('/@hookform/resolvers/') ||
            id.includes('/zod/') ||
            id.includes('/zod-metadata/')
          ) {
            return 'vendor-forms';
          }

          if (
            id.includes('/@dnd-kit/') ||
            id.includes('/react-resizable-panels/') ||
            id.includes('/react-use/')
          ) {
            return 'vendor-editor';
          }

          if (
            id.includes('/mediabunny/') ||
            id.includes('/@mediabunny/') ||
            id.includes('/jszip/')
          ) {
            return 'vendor-export';
          }

          if (
            id.includes('/recharts/') ||
            id.includes('/color/') ||
            id.includes('/lucide-react/') ||
            id.includes('/clsx/') ||
            id.includes('/class-variance-authority/') ||
            id.includes('/tailwind-merge/')
          ) {
            return 'vendor-utils';
          }

          if (id.includes('/react/') || id.includes('/react-dom/')) {
            return 'vendor-react';
          }

          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: createTsconfigAliases(),
  },
  server: {
    port: 4173,
    fs: {
      allow: [repoRoot],
    },
  },
});
