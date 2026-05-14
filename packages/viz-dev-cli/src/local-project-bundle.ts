import type {
  VizArtifactId,
  VizAssetId,
  VizProjectBundleManifest,
  VizProjectDocument,
  VizResolvedArtifact,
  VizResolvedAsset,
} from "@viz-engine/contracts";
import {
  VIZ_PROJECT_BUNDLE_MANIFEST_KIND,
  VIZ_PROJECT_BUNDLE_MANIFEST_SCHEMA_VERSION,
} from "@viz-engine/contracts";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export interface LocalVizProjectBundleValidationIssue {
  code:
    | "invalid-manifest-kind"
    | "invalid-manifest-schema-version"
    | "invalid-artifact-json"
    | "missing-project-file"
    | "missing-asset-file"
    | "missing-artifact-file"
    | "missing-asset-entry"
    | "missing-artifact-entry"
    | "orphan-asset-entry"
    | "orphan-artifact-entry";
  message: string;
  path?: string;
}

export interface LoadedLocalVizProjectBundle {
  bundleDirectory: string;
  manifest: VizProjectBundleManifest;
  project: VizProjectDocument;
  resolvedAssets: VizResolvedAsset[];
  resolvedArtifacts: VizResolvedArtifact[];
  issues: LocalVizProjectBundleValidationIssue[];
}

export interface WriteLocalVizProjectBundleOptions {
  bundleDirectory: string;
  project: VizProjectDocument;
  resolvedAssets: VizResolvedAsset[];
  resolvedArtifacts: VizResolvedArtifact[];
}

export interface LocalVizProjectBundleWriteIssue {
  code:
    | "missing-resolved-asset"
    | "missing-resolved-artifact"
    | "unsupported-asset-uri"
    | "unsupported-artifact-payload"
    | "invalid-data-uri";
  message: string;
  path?: string;
}

export interface WrittenLocalVizProjectBundle {
  bundleDirectory: string;
  manifest: VizProjectBundleManifest;
  issues: LocalVizProjectBundleWriteIssue[];
}

const readJsonFile = <T>(filePath: string): T => {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
};

const normalizeBundleDirectoryInput = (bundleDirectoryInput: string): string => {
  return bundleDirectoryInput.startsWith("file:")
    ? fileURLToPath(bundleDirectoryInput)
    : bundleDirectoryInput;
};

const inferAssetExtension = (asset: VizResolvedAsset): string => {
  if (asset.kind === "audio") {
    return ".bin";
  }

  if (asset.kind === "image") {
    return asset.mimeType === "image/svg+xml" ? ".svg" : ".img";
  }

  if (asset.kind === "video") {
    return ".video";
  }

  return ".bin";
};

const decodeDataUri = (uri: string): Uint8Array | undefined => {
  const matches = uri.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,(.*)$/);

  if (!matches) {
    return undefined;
  }

  const base64Flag = matches[2];
  const rawPayload = matches[3] ?? "";

  if (base64Flag) {
    return Uint8Array.from(Buffer.from(rawPayload, "base64"));
  }

  return Uint8Array.from(Buffer.from(decodeURIComponent(rawPayload), "utf8"));
};

const asUint8Array = (bytes: ArrayBuffer): Uint8Array => {
  return new Uint8Array(bytes);
};

const createWriteIssue = (
  code: LocalVizProjectBundleWriteIssue["code"],
  message: string,
  path?: string,
): LocalVizProjectBundleWriteIssue => ({
  code,
  message,
  ...(path === undefined ? {} : { path }),
});

const writeResolvedAssetFile = (
  asset: VizResolvedAsset,
  outputPath: string,
): LocalVizProjectBundleWriteIssue | undefined => {
  if (asset.bytes) {
    writeFileSync(outputPath, asUint8Array(asset.bytes));
    return undefined;
  }

  if (asset.uri.startsWith("file:")) {
    copyFileSync(fileURLToPath(asset.uri), outputPath);
    return undefined;
  }

  if (asset.uri.startsWith("data:")) {
    const decoded = decodeDataUri(asset.uri);

    if (!decoded) {
      return createWriteIssue(
        "invalid-data-uri",
        `Resolved asset "${asset.id}" has an invalid data URI and could not be exported.`,
        outputPath,
      );
    }

    writeFileSync(outputPath, decoded);
    return undefined;
  }

  return createWriteIssue(
    "unsupported-asset-uri",
    `Resolved asset "${asset.id}" uses unsupported export URI "${asset.uri}".`,
    outputPath,
  );
};

const writeResolvedArtifactFile = (
  artifact: VizResolvedArtifact,
  outputPath: string,
): LocalVizProjectBundleWriteIssue | undefined => {
  if (artifact.payload !== undefined) {
    writeFileSync(outputPath, `${JSON.stringify(artifact.payload, null, 2)}\n`);
    return undefined;
  }

  if (artifact.uri.startsWith("file:")) {
    copyFileSync(fileURLToPath(artifact.uri), outputPath);
    return undefined;
  }

  return createWriteIssue(
    "unsupported-artifact-payload",
    `Resolved artifact "${artifact.id}" is not exportable because it has no serializable payload or file URI.`,
    outputPath,
  );
};

const createIssue = (
  code: LocalVizProjectBundleValidationIssue["code"],
  message: string,
  path?: string,
): LocalVizProjectBundleValidationIssue => ({
  code,
  message,
  ...(path === undefined ? {} : { path }),
});

export const validateLocalVizProjectBundle = ({
  bundleDirectory,
  manifest,
  project,
}: {
  bundleDirectory: string;
  manifest: VizProjectBundleManifest;
  project: VizProjectDocument;
}): LocalVizProjectBundleValidationIssue[] => {
  const issues: LocalVizProjectBundleValidationIssue[] = [];

  if (manifest.kind !== VIZ_PROJECT_BUNDLE_MANIFEST_KIND) {
    issues.push(
      createIssue(
        "invalid-manifest-kind",
        `Bundle manifest kind must be "${VIZ_PROJECT_BUNDLE_MANIFEST_KIND}".`,
        "bundle-manifest.json",
      ),
    );
  }

  if (manifest.schemaVersion !== VIZ_PROJECT_BUNDLE_MANIFEST_SCHEMA_VERSION) {
    issues.push(
      createIssue(
        "invalid-manifest-schema-version",
        `Bundle manifest schemaVersion must be ${VIZ_PROJECT_BUNDLE_MANIFEST_SCHEMA_VERSION}.`,
        "bundle-manifest.json",
      ),
    );
  }

  const projectPath = resolve(bundleDirectory, manifest.projectFile);

  if (!existsSync(projectPath)) {
    issues.push(
      createIssue(
        "missing-project-file",
        `Project file "${manifest.projectFile}" does not exist in the bundle directory.`,
        manifest.projectFile,
      ),
    );
  }

  const assetEntryIds = new Set<VizAssetId>(manifest.assetEntries.map((entry) => entry.assetId));
  const artifactEntryIds = new Set<VizArtifactId>(
    manifest.artifactEntries.map((entry) => entry.artifactId),
  );
  const projectAssetIds = new Set<VizAssetId>((project.assetRefs ?? []).map((entry) => entry.id));
  const projectArtifactIds = new Set<VizArtifactId>(
    (project.artifactRefs ?? []).map((entry) => entry.id),
  );

  for (const entry of manifest.assetEntries) {
    const assetPath = resolve(bundleDirectory, entry.path);

    if (!existsSync(assetPath)) {
      issues.push(
        createIssue(
          "missing-asset-file",
          `Asset file "${entry.path}" for asset "${entry.assetId}" does not exist.`,
          entry.path,
        ),
      );
    }

    if (!projectAssetIds.has(entry.assetId)) {
      issues.push(
        createIssue(
          "orphan-asset-entry",
          `Bundle asset entry "${entry.assetId}" is not referenced by the project document.`,
          entry.path,
        ),
      );
    }
  }

  for (const entry of manifest.artifactEntries) {
    const artifactPath = resolve(bundleDirectory, entry.path);

    if (!existsSync(artifactPath)) {
      issues.push(
        createIssue(
          "missing-artifact-file",
          `Artifact file "${entry.path}" for artifact "${entry.artifactId}" does not exist.`,
          entry.path,
        ),
      );
    }

    if (!projectArtifactIds.has(entry.artifactId)) {
      issues.push(
        createIssue(
          "orphan-artifact-entry",
          `Bundle artifact entry "${entry.artifactId}" is not referenced by the project document.`,
          entry.path,
        ),
      );
    }
  }

  for (const assetId of projectAssetIds) {
    if (!assetEntryIds.has(assetId)) {
      issues.push(
        createIssue(
          "missing-asset-entry",
          `Project asset "${assetId}" is missing a corresponding bundle asset entry.`,
          "bundle-manifest.json",
        ),
      );
    }
  }

  for (const artifactId of projectArtifactIds) {
    if (!artifactEntryIds.has(artifactId)) {
      issues.push(
        createIssue(
          "missing-artifact-entry",
          `Project artifact "${artifactId}" is missing a corresponding bundle artifact entry.`,
          "bundle-manifest.json",
        ),
      );
    }
  }

  return issues;
};

export const loadLocalVizProjectBundle = (
  bundleDirectoryInput: string,
): LoadedLocalVizProjectBundle => {
  const bundleDirectory = normalizeBundleDirectoryInput(bundleDirectoryInput);
  const manifestPath = resolve(bundleDirectory, "bundle-manifest.json");
  const manifest = readJsonFile<VizProjectBundleManifest>(manifestPath);
  const projectPath = resolve(bundleDirectory, manifest.projectFile);
  const project = readJsonFile<VizProjectDocument>(projectPath);
  const issues = validateLocalVizProjectBundle({
    bundleDirectory,
    manifest,
    project,
  });

  const resolvedAssets: VizResolvedAsset[] = manifest.assetEntries.map((entry) => ({
    id: entry.assetId,
    kind: entry.kind,
    source: "bundle",
    uri: pathToFileURL(resolve(bundleDirectory, entry.path)).href,
    ...(entry.mimeType === undefined ? {} : { mimeType: entry.mimeType }),
    ...(entry.metadata === undefined ? {} : { metadata: entry.metadata }),
  }));

  const resolvedArtifacts: VizResolvedArtifact[] = manifest.artifactEntries.map((entry) => {
    const artifactPath = resolve(bundleDirectory, entry.path);
    let payload: unknown;

    if (existsSync(artifactPath)) {
      try {
        payload = readJsonFile<unknown>(artifactPath);
      } catch (error) {
        issues.push(
          createIssue(
            "invalid-artifact-json",
            error instanceof Error
              ? `Artifact file "${entry.path}" for artifact "${entry.artifactId}" could not be parsed as JSON: ${error.message}`
              : `Artifact file "${entry.path}" for artifact "${entry.artifactId}" could not be parsed as JSON.`,
            entry.path,
          ),
        );
      }
    }

    return {
      id: entry.artifactId,
      kind: entry.kind,
      uri: pathToFileURL(artifactPath).href,
      ...(payload === undefined ? {} : { payload }),
      ...(entry.metadata === undefined ? {} : { metadata: entry.metadata }),
    };
  });

  return {
    bundleDirectory,
    manifest,
    project,
    resolvedAssets,
    resolvedArtifacts,
    issues,
  };
};

export const writeLocalVizProjectBundle = ({
  bundleDirectory,
  project,
  resolvedAssets,
  resolvedArtifacts,
}: WriteLocalVizProjectBundleOptions): WrittenLocalVizProjectBundle => {
  const normalizedBundleDirectory = normalizeBundleDirectoryInput(bundleDirectory);
  const assetMap = new Map(resolvedAssets.map((asset) => [asset.id, asset]));
  const artifactMap = new Map(resolvedArtifacts.map((artifact) => [artifact.id, artifact]));
  const issues: LocalVizProjectBundleWriteIssue[] = [];

  mkdirSync(normalizedBundleDirectory, { recursive: true });
  mkdirSync(resolve(normalizedBundleDirectory, "assets"), { recursive: true });
  mkdirSync(resolve(normalizedBundleDirectory, "baked"), { recursive: true });

  const assetEntries = (project.assetRefs ?? []).flatMap((assetRef) => {
    const resolvedAsset = assetMap.get(assetRef.id);

    if (!resolvedAsset) {
      issues.push(
        createWriteIssue(
          "missing-resolved-asset",
          `Project asset "${assetRef.id}" is missing a resolved asset for bundle export.`,
          "project.assetRefs",
        ),
      );
      return [];
    }

    const extension = extname(assetRef.originalFileName ?? "") || inferAssetExtension(resolvedAsset);
    const relativePath = `assets/${assetRef.id}${extension}`;
    const outputPath = resolve(normalizedBundleDirectory, relativePath);
    const issue = writeResolvedAssetFile(resolvedAsset, outputPath);

    if (issue) {
      issues.push(issue);
    }

    return [
      {
        assetId: assetRef.id,
        kind: assetRef.kind,
        path: relativePath,
        ...(assetRef.mimeType === undefined ? {} : { mimeType: assetRef.mimeType }),
        ...(assetRef.metadata === undefined ? {} : { metadata: assetRef.metadata }),
      },
    ];
  });

  const artifactEntries = (project.artifactRefs ?? []).flatMap((artifactRef) => {
    const resolvedArtifact = artifactMap.get(artifactRef.id);

    if (!resolvedArtifact) {
      issues.push(
        createWriteIssue(
          "missing-resolved-artifact",
          `Project artifact "${artifactRef.id}" is missing a resolved artifact for bundle export.`,
          "project.artifactRefs",
        ),
      );
      return [];
    }

    const preferredName =
      artifactRef.metadata && typeof artifactRef.metadata.fileName === "string"
        ? artifactRef.metadata.fileName
        : `${artifactRef.id}.json`;
    const relativePath = `baked/${basename(preferredName)}`;
    const outputPath = resolve(normalizedBundleDirectory, relativePath);
    const issue = writeResolvedArtifactFile(resolvedArtifact, outputPath);

    if (issue) {
      issues.push(issue);
    }

    return [
      {
        artifactId: artifactRef.id,
        kind: artifactRef.kind,
        path: relativePath,
        ...(artifactRef.metadata === undefined ? {} : { metadata: artifactRef.metadata }),
      },
    ];
  });

  const manifest: VizProjectBundleManifest = {
    schemaVersion: VIZ_PROJECT_BUNDLE_MANIFEST_SCHEMA_VERSION,
    kind: VIZ_PROJECT_BUNDLE_MANIFEST_KIND,
    projectFile: "project.json",
    assetEntries,
    artifactEntries,
  };

  writeFileSync(
    resolve(normalizedBundleDirectory, "project.json"),
    `${JSON.stringify(project, null, 2)}\n`,
  );
  writeFileSync(
    resolve(normalizedBundleDirectory, "bundle-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  return {
    bundleDirectory: normalizedBundleDirectory,
    manifest,
    issues,
  };
};
