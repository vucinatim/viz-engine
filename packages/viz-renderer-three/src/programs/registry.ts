import type {
  VizCapabilityPackManifest,
  VizMaterializedAsset,
  VizRenderThreeProgramNode,
} from '@viz-engine/contracts';
import {
  createVizThreeModelResourceManager,
  type VizThreeModelResourceManager,
} from '../model-resources.js';
import { createInstancedSupercubeProgram } from './instanced-supercube.js';
import { createLightTunnelProgram } from './light-tunnel.js';
import { createMorphShapesProgram } from './morph-shapes.js';
import { createNeuralNetworkProgram } from './neural-network.js';
import { createOrbitingCubesProgram } from './orbiting-cubes.js';
import { createParticleSystemProgram } from './particle-system.js';
import { createSimpleCubeProgram } from './simple-cube.js';
import { createStageSceneProgram } from './stage-scene.js';
import type {
  VizThreeProgramFactory,
  VizThreeProgramInstance,
} from './types.js';

export interface VizThreeProgramDefinition {
  id: string;
  implementationVersion: string;
  factory: VizThreeProgramFactory;
}

export interface VizThreeRendererExtension {
  capabilityPack: VizCapabilityPackManifest;
  programs: VizThreeProgramDefinition[];
}

export interface VizThreeProgramRegistration extends VizThreeProgramDefinition {
  capabilityPack: VizCapabilityPackManifest;
}

export interface VizThreeProgramRegistry {
  get(programId: string): VizThreeProgramRegistration | undefined;
  list(): VizThreeProgramRegistration[];
}

export const coreVizThreeRendererExtension: VizThreeRendererExtension = {
  capabilityPack: {
    id: '@viz-engine/components-core',
    version: '0.0.1',
  },
  programs: [
    {
      id: 'viz-core/simple-cube/v1',
      implementationVersion: '1.0.0',
      factory: createSimpleCubeProgram,
    },
    {
      id: 'viz-core/particle-system/v1',
      implementationVersion: '1.0.0',
      factory: createParticleSystemProgram,
    },
    {
      id: 'viz-core/orbiting-cubes/v1',
      implementationVersion: '1.0.0',
      factory: createOrbitingCubesProgram,
    },
    {
      id: 'viz-core/instanced-supercube/v1',
      implementationVersion: '1.0.0',
      factory: createInstancedSupercubeProgram,
    },
    {
      id: 'viz-core/light-tunnel/v1',
      implementationVersion: '1.0.0',
      factory: createLightTunnelProgram,
    },
    {
      id: 'viz-core/morph-shapes/v1',
      implementationVersion: '1.0.0',
      factory: createMorphShapesProgram,
    },
    {
      id: 'viz-core/neural-network/v1',
      implementationVersion: '1.0.0',
      factory: createNeuralNetworkProgram,
    },
    {
      id: 'viz-core/stage-scene/v1',
      implementationVersion: '1.0.0',
      factory: createStageSceneProgram,
    },
  ],
};

export const createVizThreeProgramRegistry = (
  extensions: VizThreeRendererExtension[],
): VizThreeProgramRegistry => {
  const seenCapabilityPackIds = new Set<string>();

  for (const extension of extensions) {
    const { id, version } = extension.capabilityPack;

    if (!id.trim() || !version.trim()) {
      throw new Error(
        'Viz Three renderer extensions must declare a non-empty capability-pack id and version.',
      );
    }
    if (seenCapabilityPackIds.has(id)) {
      throw new Error(
        `Duplicate Viz Three renderer extension for capability pack "${id}".`,
      );
    }
    seenCapabilityPackIds.add(id);
  }

  const registrations = extensions.flatMap((extension) =>
    extension.programs.map((program) => ({
      ...program,
      capabilityPack: extension.capabilityPack,
    })),
  );
  const registrationsById = new Map<string, VizThreeProgramRegistration>();

  for (const registration of registrations) {
    if (!registration.id.trim()) {
      throw new Error('Viz Three program id must be a non-empty string.');
    }
    if (!registration.implementationVersion.trim()) {
      throw new Error(
        `Viz Three program "${registration.id}" must declare an implementation version.`,
      );
    }
    if (registrationsById.has(registration.id)) {
      throw new Error(`Duplicate Viz Three program id "${registration.id}".`);
    }
    registrationsById.set(registration.id, registration);
  }

  return {
    get: (programId) => registrationsById.get(programId),
    list: () => [...registrations],
  };
};

export const createCoreVizThreeProgramRegistry = (): VizThreeProgramRegistry =>
  createVizThreeProgramRegistry([coreVizThreeRendererExtension]);

export const createVizThreeProgramInstance = ({
  node,
  width,
  height,
  materializedAssets,
  modelResources,
  invalidate,
  programRegistry = createCoreVizThreeProgramRegistry(),
}: {
  node: VizRenderThreeProgramNode;
  width: number;
  height: number;
  materializedAssets?: ReadonlyMap<string, VizMaterializedAsset>;
  modelResources?: VizThreeModelResourceManager;
  invalidate?: () => void;
  programRegistry?: VizThreeProgramRegistry;
}): VizThreeProgramInstance => {
  const registration = programRegistry.get(node.programId);

  if (!registration) {
    throw new Error(`Unknown Viz Three program "${node.programId}".`);
  }

  return registration.factory({
    node,
    width,
    height,
    materializedAssets: materializedAssets ?? new Map(),
    modelResources: modelResources ?? createVizThreeModelResourceManager(),
    invalidate: invalidate ?? (() => undefined),
  });
};
