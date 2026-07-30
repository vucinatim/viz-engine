import type { VizComponentImplementation } from './components.js';
import type { VizNodeImplementation } from './graphs.js';

export interface VizCapabilityPackManifest {
  id: string;
  version: string;
  description?: string;
}

/**
 * Executable host contribution. Portable projects reference the manifest
 * identity; they never embed this source code.
 */
export interface VizCapabilityPack {
  manifest: VizCapabilityPackManifest;
  components?: VizComponentImplementation[];
  nodes?: VizNodeImplementation[];
  metadata?: Record<string, unknown>;
}
