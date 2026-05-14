import type { VizComponentImplementation } from "@viz-engine/contracts";
import { createVizComponentRegistry } from "@viz-engine/contracts";
import { coverImageComponent } from "./cover-image.js";
import { featureChannelBarsComponent } from "./feature-channel-bars.js";
import { radialBloomComponent } from "./radial-bloom.js";
import { reactiveBarsComponent } from "./reactive-bars.js";
import { solidColorComponent } from "./solid-color.js";

export const coreComponents: VizComponentImplementation[] = [
  solidColorComponent,
  coverImageComponent,
  reactiveBarsComponent,
  radialBloomComponent,
  featureChannelBarsComponent,
];

export const createCoreComponentRegistry = () => {
  return createVizComponentRegistry(coreComponents, {
    strict: true,
  });
};
