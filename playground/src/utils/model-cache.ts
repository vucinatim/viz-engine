import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

/**
 * Global model cache to prevent reloading the same models multiple times.
 * Models are loaded once and cloned for subsequent uses.
 */
class ModelCache {
  private cache: Map<string, THREE.Group> = new Map();
  private loadingPromises: Map<string, Promise<THREE.Group>> = new Map();
  private loader: FBXLoader;

  constructor() {
    // Suppress Three.js warnings during FBX load to prevent lag
    const originalWarn = console.warn;
    console.warn = () => {}; // Temporarily disable warnings

    // Create loading manager that prevents texture loading entirely
    const loadingManager = new THREE.LoadingManager();

    // Override the default texture loader to prevent 404s
    loadingManager.setURLModifier((url) => {
      // If it's a texture file (not the FBX itself), return empty data URL
      if (url.match(/\.(png|jpg|jpeg|gif|bmp|tga)$/i)) {
        // Return a 1x1 transparent pixel as data URL to avoid 404s
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      }
      return url;
    });

    // Restore console.warn after any load completes
    loadingManager.onLoad = () => {
      console.warn = originalWarn;
    };
    loadingManager.onError = () => {
      console.warn = originalWarn;
    };

    this.loader = new FBXLoader(loadingManager);
  }

  /**
   * Load a model from cache or fetch it if not cached.
   * Returns the ORIGINAL cached model (not a clone).
   * Caller is responsible for cloning if needed (e.g., using SkeletonUtils.clone for skinned meshes).
   */
  async load(url: string): Promise<THREE.Group> {
    // Return cached model if available
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    // If already loading, return the existing promise
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    // Load the model
    const loadPromise = new Promise<THREE.Group>((resolve, reject) => {
      this.loader.load(
        url,
        (model) => {
          this.cache.set(url, model);
          this.loadingPromises.delete(url);
          resolve(model); // Return original, caller decides how to clone
        },
        undefined,
        (error) => {
          console.error(`Error loading model from ${url}:`, error);
          this.loadingPromises.delete(url);
          reject(error);
        },
      );
    });

    this.loadingPromises.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Preload models without returning them.
   * Useful for loading models in the background.
   */
  async preload(urls: string[]): Promise<void> {
    await Promise.all(urls.map((url) => this.load(url)));
  }

  /**
   * Clear the cache (useful for testing or memory management)
   */
  clear(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      cachedModels: this.cache.size,
      loading: this.loadingPromises.size,
    };
  }
}

// Export singleton instance
export const modelCache = new ModelCache();
