import type { VizRenderThreeProgramNode } from "@viz-engine/contracts";
import { createSimpleCubeProgram } from "./simple-cube.js";
import { createParticleSystemProgram } from "./particle-system.js";
import { createOrbitingCubesProgram } from "./orbiting-cubes.js";
import { createInstancedSupercubeProgram } from "./instanced-supercube.js";
import { createLightTunnelProgram } from "./light-tunnel.js";
import type {
  VizThreeProgramFactory,
  VizThreeProgramInstance,
} from "./types.js";

const programFactories = new Map<string, VizThreeProgramFactory>([
  ["viz-core/simple-cube/v1", createSimpleCubeProgram],
  ["viz-core/particle-system/v1", createParticleSystemProgram],
  ["viz-core/orbiting-cubes/v1", createOrbitingCubesProgram],
  ["viz-core/instanced-supercube/v1", createInstancedSupercubeProgram],
  ["viz-core/light-tunnel/v1", createLightTunnelProgram],
]);

export const createVizThreeProgramInstance = ({
  node,
  width,
  height,
}: {
  node: VizRenderThreeProgramNode;
  width: number;
  height: number;
}): VizThreeProgramInstance => {
  const factory = programFactories.get(node.programId);

  if (!factory) {
    throw new Error(`Unknown Viz Three program "${node.programId}".`);
  }

  return factory({ node, width, height });
};
