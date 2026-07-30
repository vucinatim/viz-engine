import { loadLocalVizProjectBundle } from "@viz-engine/dev-cli";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const signalCathedralBundle = resolve(
  process.cwd(),
  "public/productions/signal-cathedral",
);

describe("portable execution manifests", () => {
  it("validates the pinned Signal Cathedral execution environment and content", () => {
    const loaded = loadLocalVizProjectBundle(
      signalCathedralBundle,
    );

    expect(loaded.issues).toHaveLength(0);
    expect(loaded.executionManifest).toMatchObject({
      kind: "viz.execution-manifest.v1",
      project: {
        projectId: "project-signal-cathedral",
      },
      runtime: {
        packageId: "@viz-engine/runtime",
        version: "0.0.1",
      },
      renderer: {
        package: {
          packageId: "@viz-engine/renderer-three",
          version: "0.0.1",
        },
      },
    });
    expect(
      loaded.executionManifest?.nodePackages[0]?.nodeTypes,
    ).toEqual(["add", "clamp", "graph-input", "multiply"]);
  });

  it("detects changed bundle bytes and missing node implementation coverage", () => {
    const bundleDirectory = mkdtempSync(
      join(tmpdir(), "viz-execution-manifest-"),
    );
    cpSync(signalCathedralBundle, bundleDirectory, {
      recursive: true,
    });

    try {
      const manifestPath = join(
        bundleDirectory,
        "execution-manifest.json",
      );
      const manifest = JSON.parse(
        readFileSync(manifestPath, "utf8"),
      ) as {
        assets: Array<{
          assetId: string;
          contentIdentity: string;
        }>;
        nodePackages: Array<{ nodeTypes: string[] }>;
      };
      manifest.assets[0]!.contentIdentity =
        `sha256:${"0".repeat(64)}`;
      manifest.nodePackages[0]!.nodeTypes =
        manifest.nodePackages[0]!.nodeTypes.filter(
          (type) => type !== "multiply",
        );
      writeFileSync(
        manifestPath,
        `${JSON.stringify(manifest, null, 2)}\n`,
      );

      const loaded = loadLocalVizProjectBundle(bundleDirectory);
      const codes = loaded.issues.map((issue) => issue.code);

      expect(codes).toContain(
        "execution-content-identity-mismatch",
      );
      expect(codes).toContain("missing-execution-node");
    } finally {
      rmSync(bundleDirectory, { recursive: true, force: true });
    }
  });
});
