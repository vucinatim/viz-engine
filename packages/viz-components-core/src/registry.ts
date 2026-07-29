import type { VizComponentImplementation } from "@viz-engine/contracts";
import { createVizComponentRegistry } from "@viz-engine/contracts";
import { coverImageComponent } from "./cover-image.js";
import { curveSpectrumComponent } from "./curve-spectrum.js";
import { debugAnimationComponent } from "./debug-animation.js";
import { featureChannelBarsComponent } from "./feature-channel-bars.js";
import { featureExtractionBarsComponent } from "./feature-extraction-bars.js";
import { fullscreenShaderComponent } from "./fullscreen-shader.js";
import { heartbeatMonitorComponent } from "./heartbeat-monitor.js";
import { noiseShaderComponent } from "./noise-shader.js";
import { orbitingCubesComponent } from "./orbiting-cubes.js";
import { particleSystemComponent } from "./particle-system.js";
import { radialBloomComponent } from "./radial-bloom.js";
import { reactiveBarsComponent } from "./reactive-bars.js";
import { simpleCubeComponent } from "./simple-cube.js";
import { solidColorComponent } from "./solid-color.js";
import { strobeLightComponent } from "./strobe-light.js";

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
  noiseShaderComponent,
  orbitingCubesComponent,
  particleSystemComponent,
];

export const createCoreComponentRegistry = () => {
  return createVizComponentRegistry(coreComponents, {
    strict: true,
  });
};
