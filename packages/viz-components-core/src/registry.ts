import type { VizComponentImplementation } from '@viz-engine/contracts';
import {
  createVizComponentRegistryFromCapabilityPacks,
  type VizCapabilityPack,
} from '@viz-engine/contracts';
import { coverImageComponent } from './cover-image.js';
import { curveSpectrumComponent } from './curve-spectrum.js';
import { debugAnimationComponent } from './debug-animation.js';
import { featureChannelBarsComponent } from './feature-channel-bars.js';
import { featureExtractionBarsComponent } from './feature-extraction-bars.js';
import { fullscreenShaderComponent } from './fullscreen-shader.js';
import { heartbeatMonitorComponent } from './heartbeat-monitor.js';
import { instancedSupercubeComponent } from './instanced-supercube.js';
import { lightTunnelComponent } from './light-tunnel.js';
import { morphShapesComponent } from './morph-shapes.js';
import { neuralNetworkComponent } from './neural-network.js';
import { noiseShaderComponent } from './noise-shader.js';
import { orbitingCubesComponent } from './orbiting-cubes.js';
import { particleSystemComponent } from './particle-system.js';
import { radialBloomComponent } from './radial-bloom.js';
import { reactiveBarsComponent } from './reactive-bars.js';
import { simpleCubeComponent } from './simple-cube.js';
import { solidColorComponent } from './solid-color.js';
import { stageSceneComponent } from './stage-scene.js';
import { strobeLightComponent } from './strobe-light.js';

export const coreComponents: VizComponentImplementation[] = [
  solidColorComponent,
  coverImageComponent,
  curveSpectrumComponent,
  debugAnimationComponent,
  featureExtractionBarsComponent,
  reactiveBarsComponent,
  radialBloomComponent,
  featureChannelBarsComponent,
  strobeLightComponent,
  simpleCubeComponent,
  fullscreenShaderComponent,
  heartbeatMonitorComponent,
  instancedSupercubeComponent,
  lightTunnelComponent,
  morphShapesComponent,
  neuralNetworkComponent,
  noiseShaderComponent,
  orbitingCubesComponent,
  particleSystemComponent,
  stageSceneComponent,
];

/**
 * The curated first-party authoring catalog. Runtime-only primitives can remain
 * in `coreComponents` without appearing as top-level editor choices.
 */
export const coreCatalogComponents: VizComponentImplementation[] = [
  curveSpectrumComponent,
  debugAnimationComponent,
  simpleCubeComponent,
  heartbeatMonitorComponent,
  instancedSupercubeComponent,
  lightTunnelComponent,
  morphShapesComponent,
  featureExtractionBarsComponent,
  neuralNetworkComponent,
  noiseShaderComponent,
  orbitingCubesComponent,
  particleSystemComponent,
  stageSceneComponent,
  fullscreenShaderComponent,
  strobeLightComponent,
];

export const coreComponentCapabilityPack: VizCapabilityPack = {
  manifest: {
    id: '@viz-engine/components-core',
    version: '0.0.1',
    description: 'First-party VizEngine visual components.',
  },
  components: coreComponents,
};

export const coreComponentPackageIdentity = {
  packageId: coreComponentCapabilityPack.manifest.id,
  version: coreComponentCapabilityPack.manifest.version,
} as const;

export const createCoreComponentRegistry = () => {
  return createVizComponentRegistryFromCapabilityPacks(
    [coreComponentCapabilityPack],
    {
      strict: true,
    },
  );
};
