import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@viz-engine/example-projects": path.resolve(__dirname, "../../packages/viz-example-projects/src/index.ts"),
      "@viz-engine/runtime": path.resolve(__dirname, "../../packages/viz-runtime/src/index.ts"),
      "@viz-engine/components-core": path.resolve(__dirname, "../../packages/viz-components-core/src/index.ts"),
      "@viz-engine/renderer-svg": path.resolve(__dirname, "../../packages/viz-renderer-svg/src/index.ts"),
      "@viz-engine/renderer-three": path.resolve(__dirname, "../../packages/viz-renderer-three/src/index.ts"),
    },
  },
  server: {
    port: 4173,
  },
});
