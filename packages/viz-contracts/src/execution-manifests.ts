import type {
  VizArtifactId,
  VizAssetId,
  VizProjectId,
} from "./ids.js";

export const VIZ_EXECUTION_MANIFEST_SCHEMA_VERSION = 1 as const;
export const VIZ_EXECUTION_MANIFEST_KIND =
  "viz.execution-manifest.v1" as const;

export interface VizExecutionPackageIdentity {
  packageId: string;
  version: string;
}

export interface VizExecutionCapabilityIdentity {
  id: string;
  version: string;
}

export interface VizExecutionComponentIdentity {
  componentId: string;
  implementationVersion: string;
  capabilityPack: VizExecutionCapabilityIdentity;
}

export interface VizExecutionNodePackageIdentity
  extends VizExecutionPackageIdentity {
  nodeTypes: string[];
}

export interface VizExecutionRendererProgramIdentity {
  programId: string;
  implementationVersion: string;
  capabilityPack: VizExecutionCapabilityIdentity;
}

export interface VizExecutionContentIdentity {
  contentIdentity: string;
}

export interface VizExecutionAssetIdentity
  extends VizExecutionContentIdentity {
  assetId: VizAssetId;
}

export interface VizExecutionArtifactIdentity
  extends VizExecutionContentIdentity {
  artifactId: VizArtifactId;
}

export interface VizExecutionBakeIdentity {
  artifactId: VizArtifactId;
  sourceAssetId?: VizAssetId;
  executionIdentity: string;
}

export interface VizExecutionManifest {
  schemaVersion: typeof VIZ_EXECUTION_MANIFEST_SCHEMA_VERSION;
  kind: typeof VIZ_EXECUTION_MANIFEST_KIND;
  project: {
    projectId: VizProjectId;
    schemaVersion: string;
    contentIdentity: string;
  };
  runtime: VizExecutionPackageIdentity;
  capabilityPacks: VizExecutionCapabilityIdentity[];
  components: VizExecutionComponentIdentity[];
  nodePackages: VizExecutionNodePackageIdentity[];
  renderer: {
    package: VizExecutionPackageIdentity;
    backend: {
      id: string;
      version: string;
    };
    programs: VizExecutionRendererProgramIdentity[];
  };
  bakes: VizExecutionBakeIdentity[];
  assets: VizExecutionAssetIdentity[];
  artifacts: VizExecutionArtifactIdentity[];
  metadata?: Record<string, unknown>;
}
