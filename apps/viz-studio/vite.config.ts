import path from "node:path";
import fs from "node:fs";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const repoRoot = path.resolve(__dirname, "../..");
const publicDir = path.resolve(repoRoot, "public");
const musicDir = path.resolve(publicDir, "music");

const bundledAudioManifestPlugin = (): Plugin => {
  const virtualModuleId = "virtual:viz-bundled-audio-tracks";
  const resolvedVirtualModuleId = `\0${virtualModuleId}`;

  const getBundledTracks = () => {
    if (!fs.existsSync(musicDir)) {
      return [];
    }

    return fs
      .readdirSync(musicDir)
      .filter((file) => /\.(mp3|wav|ogg)$/i.test(file))
      .sort();
  };

  return {
    name: "viz-bundled-audio-manifest",
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
      return null;
    },
    load(id) {
      if (id !== resolvedVirtualModuleId) {
        return null;
      }

      const tracks = getBundledTracks();
      return `export const bundledAudioTracks = ${JSON.stringify(tracks)};`;
    },
    configureServer(server) {
      server.watcher.add(musicDir);
    },
  };
};

export default defineConfig({
  plugins: [react(), bundledAudioManifestPlugin()],
  publicDir,
  resolve: {
    alias: {
      "@": path.resolve(repoRoot, "src"),
      "@viz-engine/example-projects": path.resolve(repoRoot, "packages/viz-example-projects/src/index.ts"),
      "@viz-engine/runtime": path.resolve(repoRoot, "packages/viz-runtime/src/index.ts"),
      "@viz-engine/components-core": path.resolve(repoRoot, "packages/viz-components-core/src/index.ts"),
      "@viz-engine/renderer-svg": path.resolve(repoRoot, "packages/viz-renderer-svg/src/index.ts"),
      "@viz-engine/renderer-three": path.resolve(repoRoot, "packages/viz-renderer-three/src/index.ts"),
      "@viz-engine/editor-control": path.resolve(repoRoot, "packages/viz-editor-control/src/index.ts"),
      "@viz-engine/editor-session": path.resolve(repoRoot, "packages/viz-editor-session/src/index.ts"),
      "@viz-engine/nodes-core": path.resolve(repoRoot, "packages/viz-nodes-core/src/index.ts"),
      "@viz-engine/contracts": path.resolve(repoRoot, "packages/viz-contracts/src/index.ts"),
    },
  },
  server: {
    port: 4173,
  },
});
