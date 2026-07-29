import type { VizAssetId } from "./ids.js";

export const VIZ_MODEL_MANIFEST_SCHEMA_VERSION = 1 as const;

export type VizModelFormat =
  | "fbx"
  | "glb"
  | "gltf"
  | "obj"
  | "unknown";

export interface VizModelNodeDescriptor {
  id: string;
  name: string;
  type: string;
  parentId?: string;
}

export interface VizModelMaterialDescriptor {
  id: string;
  name: string;
}

export interface VizModelSkeletonDescriptor {
  id: string;
  name: string;
  boneCount: number;
  boneNames: string[];
}

export interface VizModelAnimationClipDescriptor {
  id: string;
  name: string;
  durationSeconds: number;
  trackCount: number;
}

export interface VizModelMorphTargetDescriptor {
  id: string;
  name: string;
  meshNodeId: string;
}

export interface VizModelManifest {
  schemaVersion: typeof VIZ_MODEL_MANIFEST_SCHEMA_VERSION;
  assetId: VizAssetId;
  contentIdentity?: string;
  sourceFormat: VizModelFormat;
  bounds?: {
    min: [number, number, number];
    max: [number, number, number];
  };
  nodes: VizModelNodeDescriptor[];
  materials: VizModelMaterialDescriptor[];
  skeletons: VizModelSkeletonDescriptor[];
  animationClips: VizModelAnimationClipDescriptor[];
  morphTargets: VizModelMorphTargetDescriptor[];
  capabilities: {
    staticMesh: boolean;
    transformAnimation: boolean;
    skeletalAnimation: boolean;
    morphAnimation: boolean;
    embeddedCameras: boolean;
    embeddedLights: boolean;
  };
}

export type VizModelAnimationLoopMode =
  | "loop"
  | "once"
  | "ping-pong";

export interface VizModelAnimationPlayback {
  clipId?: string;
  loopMode?: VizModelAnimationLoopMode;
  speed?: number;
  phaseSeconds?: number;
  weight?: number;
}
