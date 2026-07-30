import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

const packageEntry = (packageName: string) => {
  return path.resolve(repoRoot, "packages", packageName, "src", "index.ts");
};

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": path.resolve(repoRoot, "src"),
      "@viz-engine/contracts": packageEntry("viz-contracts"),
      "@viz-engine/runtime": packageEntry("viz-runtime"),
      "@viz-engine/bake/node": path.resolve(
        repoRoot,
        "packages",
        "viz-bake",
        "src",
        "node.ts",
      ),
      "@viz-engine/bake": packageEntry("viz-bake"),
      "@viz-engine/render/node": path.resolve(
        repoRoot,
        "packages",
        "viz-render",
        "src",
        "node.ts",
      ),
      "@viz-engine/render": packageEntry("viz-render"),
      "@viz-engine/components-core": packageEntry("viz-components-core"),
      "@viz-engine/remotion-adapter": packageEntry("viz-remotion-adapter"),
      "@viz-engine/example-projects/node": path.resolve(
        repoRoot,
        "packages",
        "viz-example-projects",
        "src",
        "node.ts",
      ),
      "@viz-engine/example-projects": packageEntry("viz-example-projects"),
      "@viz-engine/dev-cli": packageEntry("viz-dev-cli"),
      "@viz-engine/actions": packageEntry("viz-actions"),
      "@viz-engine/editor-session": packageEntry("viz-editor-session"),
      "@viz-engine/editor-control/node": path.resolve(
        repoRoot,
        "packages",
        "viz-editor-control",
        "src",
        "node.ts",
      ),
      "@viz-engine/editor-control": packageEntry("viz-editor-control"),
      "@viz-engine/nodes-core": packageEntry("viz-nodes-core"),
      "@viz-engine/production-signal-cathedral": packageEntry(
        "viz-production-signal-cathedral",
      ),
      "@viz-engine/renderer-svg": packageEntry("viz-renderer-svg"),
      "@viz-engine/renderer-three": packageEntry("viz-renderer-three"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
