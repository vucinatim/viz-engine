import type { VizRenderSource } from '@viz-engine/render';

/** Retain browser-owned assets until capture AND encoding have completed. */
export const retainVizBrowserRenderSource = async (
  source: VizRenderSource,
  signal: AbortSignal,
) => {
  const snapshot = structuredClone(source);
  const urls: string[] = [];
  const dispose = () => {
    for (const url of urls.splice(0)) URL.revokeObjectURL(url);
  };
  try {
    // Start every fetch before yielding so later editor removal cannot revoke a
    // not-yet-requested blob. Settle all tasks before cleanup on failure.
    const assets = await Promise.allSettled(
      snapshot.resolvedAssets.map(async (asset) => {
        if (!asset.uri.startsWith('blob:')) return asset;
        signal.throwIfAborted();
        const response = await fetch(asset.uri, { signal });
        if (!response.ok)
          throw new Error(`Could not retain render asset ${asset.id}.`);
        const blob = await response.blob();
        signal.throwIfAborted();
        const uri = URL.createObjectURL(blob);
        urls.push(uri);
        return { ...asset, uri };
      }),
    );
    signal.throwIfAborted();
    snapshot.resolvedAssets = assets.map((asset) => {
      if (asset.status === 'rejected') throw asset.reason;
      return asset.value;
    });
    return { source: snapshot, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
};
