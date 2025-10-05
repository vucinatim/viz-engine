import femaleModelUrl from '../models/female-dancer.fbx?url';
import femaleDjUrl from '../models/female-dj.fbx?url';
import maleCheerModelUrl from '../models/male-cheer.fbx?url';
import maleDancerModelUrl from '../models/male-dancer.fbx?url';
import { modelCache } from './model-cache';

/**
 * Preload all 3D models used in the stage scene.
 * Call this when the app initializes to load models in the background.
 * Subsequent uses will be instant since models are cached.
 */
export async function preloadStageModels(): Promise<void> {
  const modelUrls = [
    femaleModelUrl,
    maleDancerModelUrl,
    maleCheerModelUrl,
    femaleDjUrl,
  ];

  console.log('🎭 Preloading stage models...');
  const startTime = performance.now();

  try {
    await modelCache.preload(modelUrls);
    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Preloaded ${modelUrls.length} models in ${duration}s`);
  } catch (error) {
    console.error('❌ Error preloading models:', error);
  }
}

/**
 * Get model cache statistics
 */
export function getModelCacheStats() {
  return modelCache.getStats();
}
