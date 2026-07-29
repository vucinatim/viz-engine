import type {
  VizMaterializedAsset,
  VizRenderThreeProgramNode,
} from "@viz-engine/contracts";
import { createSimpleCubeProgram } from "./simple-cube.js";
import { createStageSceneProgram } from "./stage-scene.js";
import { createParticleSystemProgram } from "./particle-system.js";
import { createOrbitingCubesProgram } from "./orbiting-cubes.js";
import { createInstancedSupercubeProgram } from "./instanced-supercube.js";
import { createLightTunnelProgram } from "./light-tunnel.js";
import { createMorphShapesProgram } from "./morph-shapes.js";
import { createNeuralNetworkProgram } from "./neural-network.js";
import type {
  VizThreeProgramFactory,
  VizThreeProgramInstance,
} from "./types.js";
import {
  createVizThreeModelResourceManager,
  type VizThreeModelResourceManager,
} from "../model-resources.js";

const programFactories = new Map<string, VizThreeProgramFactory>([
  ["viz-core/simple-cube/v1", createSimpleCubeProgram],
  ["viz-core/particle-system/v1", createParticleSystemProgram],
  ["viz-core/orbiting-cubes/v1", createOrbitingCubesProgram],
  ["viz-core/instanced-supercube/v1", createInstancedSupercubeProgram],
  ["viz-core/light-tunnel/v1", createLightTunnelProgram],
  ["viz-core/morph-shapes/v1", createMorphShapesProgram],
  ["viz-core/neural-network/v1", createNeuralNetworkProgram],
  ["viz-core/stage-scene/v1", createStageSceneProgram],
]);

export const createVizThreeProgramInstance = ({
  node,
  width,
  height,
  materializedAssets,
  modelResources,
  invalidate,
}: {
  node: VizRenderThreeProgramNode;
  width: number;
  height: number;
  materializedAssets?: ReadonlyMap<string, VizMaterializedAsset>;
  modelResources?: VizThreeModelResourceManager;
  invalidate?: () => void;
}): VizThreeProgramInstance => {
  const factory = programFactories.get(node.programId);

  if (!factory) {
    throw new Error(`Unknown Viz Three program "${node.programId}".`);
  }

  return factory({
    node,
    width,
    height,
    materializedAssets: materializedAssets ?? new Map(),
    modelResources:
      modelResources ?? createVizThreeModelResourceManager(),
    invalidate: invalidate ?? (() => undefined),
  });
};
