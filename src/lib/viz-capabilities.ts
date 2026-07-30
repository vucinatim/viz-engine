import {
  coreCatalogComponents,
  coreComponentCapabilityPack,
} from '@viz-engine/components-core';
import { createVizComponentRegistryFromCapabilityPacks } from '@viz-engine/contracts';
import { createCoreNodeRegistry } from '@viz-engine/nodes-core';
import {
  signalCathedralCapabilityPack,
  signalCathedralComponent,
  signalCathedralThreeRendererExtension,
} from '@viz-engine/production-signal-cathedral';
import {
  coreVizThreeRendererExtension,
  createVizThreeProgramRegistry,
} from '@viz-engine/renderer-three';

/**
 * The studio's one trusted capability-composition root.
 *
 * Runtime, editor catalog, inspection, and renderer attachments consume these
 * same registries so a project-local pack cannot exist in only part of the
 * product.
 */
export const studioCapabilityPacks = [
  coreComponentCapabilityPack,
  signalCathedralCapabilityPack,
] as const;

export const studioComponentRegistry =
  createVizComponentRegistryFromCapabilityPacks([...studioCapabilityPacks], {
    strict: true,
  });

export const studioNodeRegistry = createCoreNodeRegistry();

export const studioCatalogComponents = [
  ...coreCatalogComponents,
  signalCathedralComponent,
];

export const studioThreeRendererExtensions = [
  coreVizThreeRendererExtension,
  signalCathedralThreeRendererExtension,
] as const;

export const studioThreeProgramRegistry = createVizThreeProgramRegistry([
  ...studioThreeRendererExtensions,
]);
