import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

const packageEntry = (packageName: string) => {
  return path.resolve(repoRoot, "packages", packageName, "src", "index.ts");
};

export default defineConfig({
  resolve: {
    alias: {
      "@viz-engine/contracts": packageEntry("viz-contracts"),
      "@viz-engine/runtime": packageEntry("viz-runtime"),
      "@viz-engine/bake": packageEntry("viz-bake"),
      "@viz-engine/remotion-adapter": packageEntry("viz-remotion-adapter"),
      "@viz-engine/example-projects": packageEntry("viz-example-projects"),
      "@viz-engine/dev-cli": packageEntry("viz-dev-cli"),
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
