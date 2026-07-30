import {
  VIZ_EXECUTION_MANIFEST_KIND,
  VIZ_EXECUTION_MANIFEST_SCHEMA_VERSION,
  type VizCapabilityPackManifest,
  type VizComponentImplementation,
  type VizComponentRegistration,
  type VizExecutionCapabilityIdentity,
  type VizExecutionManifest,
  type VizExecutionPackageIdentity,
  type VizNodeImplementation,
  type VizProjectBundleManifest,
  type VizProjectDocument,
  type VizResolvedArtifact,
} from '@viz-engine/contracts';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface VizExecutionNodePackageRegistration extends VizExecutionPackageIdentity {
  nodes: readonly VizNodeImplementation[];
}

export interface VizExecutionRendererProgramRegistration {
  id: string;
  implementationVersion: string;
  capabilityPack: VizCapabilityPackManifest;
}

export interface VizExecutionManifestEnvironment {
  runtime: VizExecutionPackageIdentity;
  components: readonly VizComponentRegistration[];
  nodePackages: readonly VizExecutionNodePackageRegistration[];
  renderer: {
    package: VizExecutionPackageIdentity;
    backend: VizExecutionCapabilityIdentity;
    programs: readonly VizExecutionRendererProgramRegistration[];
  };
  metadata?: Record<string, unknown>;
}

export interface CreateVizExecutionManifestOptions {
  bundleDirectory: string;
  bundleManifest: VizProjectBundleManifest;
  project: VizProjectDocument;
  resolvedArtifacts: readonly VizResolvedArtifact[];
  environment: VizExecutionManifestEnvironment;
}

const sha256File = (filePath: string): string =>
  `sha256:${createHash('sha256').update(readFileSync(filePath)).digest('hex')}`;

const requireImplementationVersion = (
  component: VizComponentImplementation,
): string => {
  const version = component.implementationVersion?.trim();
  if (!version) {
    throw new Error(
      `Execution component "${component.id}" has no implementation version.`,
    );
  }
  return version;
};

const addCapabilityPack = (
  packs: Map<string, VizExecutionCapabilityIdentity>,
  pack: VizCapabilityPackManifest | undefined,
  owner: string,
): VizExecutionCapabilityIdentity => {
  if (!pack?.id.trim() || !pack.version.trim()) {
    throw new Error(`${owner} has no registered capability-pack identity.`);
  }
  const existing = packs.get(pack.id);
  if (existing && existing.version !== pack.version) {
    throw new Error(
      `Capability pack "${pack.id}" is registered with conflicting versions.`,
    );
  }
  const identity = { id: pack.id, version: pack.version };
  packs.set(pack.id, identity);
  return identity;
};

export const createVizExecutionManifest = ({
  bundleDirectory,
  bundleManifest,
  project,
  resolvedArtifacts,
  environment,
}: CreateVizExecutionManifestOptions): VizExecutionManifest => {
  const componentRegistrations = new Map(
    environment.components.map((registration) => [
      registration.component.id,
      registration,
    ]),
  );
  const capabilityPacks = new Map<string, VizExecutionCapabilityIdentity>();
  const components = [
    ...new Set(project.layers.map((layer) => layer.componentId)),
  ]
    .sort()
    .map((componentId) => {
      const registration = componentRegistrations.get(componentId);
      if (!registration) {
        throw new Error(
          `Project component "${componentId}" is absent from the execution registry.`,
        );
      }
      return {
        componentId,
        implementationVersion: requireImplementationVersion(
          registration.component,
        ),
        capabilityPack: addCapabilityPack(
          capabilityPacks,
          registration.capabilityPack,
          `Execution component "${componentId}"`,
        ),
      };
    });

  const usedNodeTypes = [
    ...new Set(
      (project.graphs ?? []).flatMap((graph) =>
        graph.nodes.map((node) => node.type),
      ),
    ),
  ].sort();
  const nodeOwners = new Map<string, VizExecutionNodePackageRegistration>();
  for (const nodePackage of environment.nodePackages) {
    for (const node of nodePackage.nodes) {
      if (nodeOwners.has(node.type)) {
        throw new Error(
          `Execution node type "${node.type}" has multiple registered package owners.`,
        );
      }
      nodeOwners.set(node.type, nodePackage);
    }
  }
  const nodeTypesByPackage = new Map<
    VizExecutionNodePackageRegistration,
    string[]
  >();
  for (const nodeType of usedNodeTypes) {
    const owner = nodeOwners.get(nodeType);
    if (!owner) {
      throw new Error(
        `Project node type "${nodeType}" is absent from the execution registry.`,
      );
    }
    const nodeTypes = nodeTypesByPackage.get(owner) ?? [];
    nodeTypes.push(nodeType);
    nodeTypesByPackage.set(owner, nodeTypes);
  }
  const nodePackages = [...nodeTypesByPackage]
    .map(([owner, nodeTypes]) => ({
      packageId: owner.packageId,
      version: owner.version,
      nodeTypes,
    }))
    .sort((left, right) => left.packageId.localeCompare(right.packageId));

  const programs = [...environment.renderer.programs]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((program) => ({
      programId: program.id,
      implementationVersion: program.implementationVersion,
      capabilityPack: addCapabilityPack(
        capabilityPacks,
        program.capabilityPack,
        `Renderer program "${program.id}"`,
      ),
    }));

  const artifactMap = new Map(
    resolvedArtifacts.map((artifact) => [artifact.id, artifact]),
  );
  const bakes = (project.artifactRefs ?? [])
    .filter((artifact) => artifact.kind === 'audio-feature-timeline')
    .map((artifact) => {
      const resolved = artifactMap.get(artifact.id);
      const executionIdentity =
        resolved?.metadata &&
        typeof resolved.metadata.executionIdentity === 'string'
          ? resolved.metadata.executionIdentity
          : artifact.metadata &&
              typeof artifact.metadata.executionIdentity === 'string'
            ? artifact.metadata.executionIdentity
            : undefined;
      if (!executionIdentity) {
        throw new Error(
          `Audio artifact "${artifact.id}" has no registered bake execution identity.`,
        );
      }
      return {
        artifactId: artifact.id,
        ...(artifact.sourceAssetId === undefined
          ? {}
          : { sourceAssetId: artifact.sourceAssetId }),
        executionIdentity,
      };
    });

  return {
    schemaVersion: VIZ_EXECUTION_MANIFEST_SCHEMA_VERSION,
    kind: VIZ_EXECUTION_MANIFEST_KIND,
    project: {
      projectId: project.projectId,
      schemaVersion: project.schemaVersion,
      contentIdentity: sha256File(
        resolve(bundleDirectory, bundleManifest.projectFile),
      ),
    },
    runtime: environment.runtime,
    capabilityPacks: [...capabilityPacks.values()].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
    components,
    nodePackages,
    renderer: {
      package: environment.renderer.package,
      backend: environment.renderer.backend,
      programs,
    },
    bakes,
    assets: bundleManifest.assetEntries.map((entry) => ({
      assetId: entry.assetId,
      contentIdentity: sha256File(resolve(bundleDirectory, entry.path)),
    })),
    artifacts: bundleManifest.artifactEntries.map((entry) => ({
      artifactId: entry.artifactId,
      contentIdentity: sha256File(resolve(bundleDirectory, entry.path)),
    })),
    ...(environment.metadata === undefined
      ? {}
      : { metadata: environment.metadata }),
  };
};
