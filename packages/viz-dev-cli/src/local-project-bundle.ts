import type {
  VizArtifactId,
  VizAssetId,
  VizExecutionManifest,
  VizProjectBundleManifest,
  VizProjectDocument,
  VizResolvedArtifact,
  VizResolvedAsset,
} from "@viz-engine/contracts";
import {
  VIZ_PROJECT_BUNDLE_MANIFEST_KIND,
  VIZ_PROJECT_BUNDLE_MANIFEST_SCHEMA_VERSION,
  VIZ_EXECUTION_MANIFEST_KIND,
  VIZ_EXECUTION_MANIFEST_SCHEMA_VERSION,
} from "@viz-engine/contracts";
import { createHash } from "node:crypto";
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
    | "invalid-execution-manifest-kind"
    | "invalid-execution-manifest-schema-version"
    | "invalid-execution-manifest-json"
    | "invalid-execution-identity"
    | "execution-project-mismatch"
    | "execution-content-identity-mismatch"
    | "invalid-artifact-json"
    | "missing-project-file"
    | "missing-execution-manifest-file"
    | "missing-asset-file"
    | "missing-artifact-file"
    | "missing-execution-component"
    | "missing-execution-node"
    | "missing-execution-asset"
    | "missing-execution-artifact"
    | "missing-execution-bake"
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
  executionManifest?: VizExecutionManifest;
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
  executionManifest?: VizExecutionManifest;
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

const sha256File = (filePath: string): string =>
  `sha256:${createHash("sha256")
    .update(readFileSync(filePath))
    .digest("hex")}`;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isSha256Identity = (value: unknown): value is string =>
  typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value);

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

  if (asset.kind === "model") {
    if (asset.mimeType === "model/gltf-binary") {
      return ".glb";
    }
    if (asset.mimeType === "model/gltf+json") {
      return ".gltf";
    }
    if (
      asset.mimeType === "application/vnd.autodesk.fbx" ||
      asset.uri.toLowerCase().endsWith(".fbx")
    ) {
      return ".fbx";
    }
    return ".model";
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

const validateExecutionManifest = ({
  bundleDirectory,
  bundleManifest,
  executionManifest,
  project,
}: {
  bundleDirectory: string;
  bundleManifest: VizProjectBundleManifest;
  executionManifest: VizExecutionManifest;
  project: VizProjectDocument;
}): LocalVizProjectBundleValidationIssue[] => {
  const issues: LocalVizProjectBundleValidationIssue[] = [];
  const executionPath =
    bundleManifest.executionManifestFile ?? "execution-manifest.json";

  if (executionManifest.kind !== VIZ_EXECUTION_MANIFEST_KIND) {
    issues.push(
      createIssue(
        "invalid-execution-manifest-kind",
        `Execution manifest kind must be "${VIZ_EXECUTION_MANIFEST_KIND}".`,
        executionPath,
      ),
    );
  }
  if (
    executionManifest.schemaVersion !==
    VIZ_EXECUTION_MANIFEST_SCHEMA_VERSION
  ) {
    issues.push(
      createIssue(
        "invalid-execution-manifest-schema-version",
        `Execution manifest schemaVersion must be ${VIZ_EXECUTION_MANIFEST_SCHEMA_VERSION}.`,
        executionPath,
      ),
    );
  }
  if (
    executionManifest.project.projectId !== project.projectId ||
    executionManifest.project.schemaVersion !== project.schemaVersion
  ) {
    issues.push(
      createIssue(
        "execution-project-mismatch",
        `Execution manifest project identity does not match project "${project.projectId}" schema ${project.schemaVersion}.`,
        executionPath,
      ),
    );
  }

  const projectPath = resolve(bundleDirectory, bundleManifest.projectFile);
  if (
    existsSync(projectPath) &&
    executionManifest.project.contentIdentity !== sha256File(projectPath)
  ) {
    issues.push(
      createIssue(
        "execution-content-identity-mismatch",
        "Execution manifest project content identity does not match the bundled project file.",
        bundleManifest.projectFile,
      ),
    );
  }

  const packageIdentities = [
    executionManifest.runtime,
    executionManifest.renderer.package,
    ...executionManifest.nodePackages,
  ];
  const capabilityIdentities = [
    ...executionManifest.capabilityPacks,
    ...executionManifest.components.map(
      (component) => component.capabilityPack,
    ),
    ...executionManifest.renderer.programs.map(
      (program) => program.capabilityPack,
    ),
  ];
  if (
    packageIdentities.some(
      (identity) =>
        !isNonEmptyString(identity.packageId) ||
        !isNonEmptyString(identity.version),
    ) ||
    capabilityIdentities.some(
      (identity) =>
        !isNonEmptyString(identity.id) ||
        !isNonEmptyString(identity.version),
    ) ||
    !isNonEmptyString(executionManifest.renderer.backend.id) ||
    !isNonEmptyString(executionManifest.renderer.backend.version) ||
    executionManifest.components.some(
      (component) =>
        !isNonEmptyString(component.componentId) ||
        !isNonEmptyString(component.implementationVersion),
    ) ||
    executionManifest.renderer.programs.some(
      (program) =>
        !isNonEmptyString(program.programId) ||
        !isNonEmptyString(program.implementationVersion),
    ) ||
    executionManifest.bakes.some(
      (bake) => !isNonEmptyString(bake.executionIdentity),
    )
  ) {
    issues.push(
      createIssue(
        "invalid-execution-identity",
        "Execution manifest package, capability, component, node, renderer, and bake identities must be non-empty.",
        executionPath,
      ),
    );
  }

  const componentIds = new Set(
    executionManifest.components.map(
      (component) => component.componentId,
    ),
  );
  for (const componentId of new Set(
    project.layers.map((layer) => layer.componentId),
  )) {
    if (!componentIds.has(componentId)) {
      issues.push(
        createIssue(
          "missing-execution-component",
          `Project component "${componentId}" is missing from the execution manifest.`,
          executionPath,
        ),
      );
    }
  }

  const nodeTypes = new Set(
    executionManifest.nodePackages.flatMap(
      (nodePackage) => nodePackage.nodeTypes,
    ),
  );
  for (const nodeType of new Set(
    (project.graphs ?? []).flatMap((graph) =>
      graph.nodes.map((node) => node.type),
    ),
  )) {
    if (!nodeTypes.has(nodeType)) {
      issues.push(
        createIssue(
          "missing-execution-node",
          `Project node type "${nodeType}" is missing from the execution manifest.`,
          executionPath,
        ),
      );
    }
  }

  const executionAssets = new Map(
    executionManifest.assets.map((asset) => [asset.assetId, asset]),
  );
  const assetEntries = new Map(
    bundleManifest.assetEntries.map((asset) => [asset.assetId, asset]),
  );
  for (const assetRef of project.assetRefs ?? []) {
    const identity = executionAssets.get(assetRef.id);
    if (!identity) {
      issues.push(
        createIssue(
          "missing-execution-asset",
          `Project asset "${assetRef.id}" is missing from the execution manifest.`,
          executionPath,
        ),
      );
      continue;
    }
    const entry = assetEntries.get(assetRef.id);
    const assetPath =
      entry === undefined
        ? undefined
        : resolve(bundleDirectory, entry.path);
    if (
      !isSha256Identity(identity.contentIdentity) ||
      (assetPath !== undefined &&
        existsSync(assetPath) &&
        identity.contentIdentity !== sha256File(assetPath))
    ) {
      issues.push(
        createIssue(
          "execution-content-identity-mismatch",
          `Execution identity for asset "${assetRef.id}" does not match the bundled file.`,
          entry?.path ?? executionPath,
        ),
      );
    }
  }

  const executionArtifacts = new Map(
    executionManifest.artifacts.map((artifact) => [
      artifact.artifactId,
      artifact,
    ]),
  );
  const artifactEntries = new Map(
    bundleManifest.artifactEntries.map((artifact) => [
      artifact.artifactId,
      artifact,
    ]),
  );
  for (const artifactRef of project.artifactRefs ?? []) {
    const identity = executionArtifacts.get(artifactRef.id);
    if (!identity) {
      issues.push(
        createIssue(
          "missing-execution-artifact",
          `Project artifact "${artifactRef.id}" is missing from the execution manifest.`,
          executionPath,
        ),
      );
      continue;
    }
    const entry = artifactEntries.get(artifactRef.id);
    const artifactPath =
      entry === undefined
        ? undefined
        : resolve(bundleDirectory, entry.path);
    if (
      !isSha256Identity(identity.contentIdentity) ||
      (artifactPath !== undefined &&
        existsSync(artifactPath) &&
        identity.contentIdentity !== sha256File(artifactPath))
    ) {
      issues.push(
        createIssue(
          "execution-content-identity-mismatch",
          `Execution identity for artifact "${artifactRef.id}" does not match the bundled file.`,
          entry?.path ?? executionPath,
        ),
      );
    }

    if (
      artifactRef.kind === "audio-feature-timeline" &&
      !executionManifest.bakes.some(
        (bake) =>
          bake.artifactId === artifactRef.id &&
          bake.sourceAssetId === artifactRef.sourceAssetId,
      )
    ) {
      issues.push(
        createIssue(
          "missing-execution-bake",
          `Audio artifact "${artifactRef.id}" is missing its bake execution identity.`,
          executionPath,
        ),
      );
    }
  }

  return issues;
};

export const validateLocalVizProjectBundle = ({
  bundleDirectory,
  manifest,
  executionManifest,
  project,
}: {
  bundleDirectory: string;
  manifest: VizProjectBundleManifest;
  executionManifest?: VizExecutionManifest;
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

  if (manifest.executionManifestFile !== undefined) {
    const executionManifestPath = resolve(
      bundleDirectory,
      manifest.executionManifestFile,
    );
    if (!existsSync(executionManifestPath)) {
      issues.push(
        createIssue(
          "missing-execution-manifest-file",
          `Execution manifest file "${manifest.executionManifestFile}" does not exist in the bundle directory.`,
          manifest.executionManifestFile,
        ),
      );
    } else if (executionManifest !== undefined) {
      issues.push(
        ...validateExecutionManifest({
          bundleDirectory,
          bundleManifest: manifest,
          executionManifest,
          project,
        }),
      );
    }
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
  let executionManifest: VizExecutionManifest | undefined;
  const executionIssues: LocalVizProjectBundleValidationIssue[] = [];
  if (manifest.executionManifestFile !== undefined) {
    const executionManifestPath = resolve(
      bundleDirectory,
      manifest.executionManifestFile,
    );
    if (existsSync(executionManifestPath)) {
      try {
        executionManifest =
          readJsonFile<VizExecutionManifest>(executionManifestPath);
      } catch (error) {
        executionIssues.push(
          createIssue(
            "invalid-execution-manifest-json",
            error instanceof Error
              ? `Execution manifest "${manifest.executionManifestFile}" could not be parsed as JSON: ${error.message}`
              : `Execution manifest "${manifest.executionManifestFile}" could not be parsed as JSON.`,
            manifest.executionManifestFile,
          ),
        );
      }
    }
  }
  const issues = validateLocalVizProjectBundle({
    bundleDirectory,
    manifest,
    ...(executionManifest === undefined
      ? {}
      : { executionManifest }),
    project,
  });
  issues.push(...executionIssues);

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
    ...(executionManifest === undefined
      ? {}
      : { executionManifest }),
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
  executionManifest,
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
    ...(executionManifest === undefined
      ? {}
      : { executionManifestFile: "execution-manifest.json" }),
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
  if (executionManifest !== undefined) {
    writeFileSync(
      resolve(normalizedBundleDirectory, "execution-manifest.json"),
      `${JSON.stringify(executionManifest, null, 2)}\n`,
    );
  }

  return {
    bundleDirectory: normalizedBundleDirectory,
    manifest,
    issues,
  };
};
