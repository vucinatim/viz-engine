import type { VizCapabilityPack } from '@viz-engine/contracts';
import type { VizThreeRendererExtension } from '@viz-engine/renderer-three';
import { signalCathedralComponent } from './component.js';
import { createSignalCathedralProgram } from './program.js';

export * from './authoring.js';
export * from './component.js';
export * from './program.js';
export * from './project.js';

export const signalCathedralCapabilityPack: VizCapabilityPack = {
  manifest: {
    id: '@viz-engine/production-signal-cathedral',
    version: '0.0.1',
    description:
      'Trusted project-local capability pack for the Signal Cathedral production.',
  },
  components: [signalCathedralComponent],
  metadata: {
    production: 'signal-cathedral',
  },
};

export const signalCathedralThreeRendererExtension: VizThreeRendererExtension =
  {
    capabilityPack: signalCathedralCapabilityPack.manifest,
    programs: [
      {
        id: 'viz-production/signal-cathedral/v1',
        implementationVersion: '1.0.0',
        factory: createSignalCathedralProgram,
      },
    ],
  };
