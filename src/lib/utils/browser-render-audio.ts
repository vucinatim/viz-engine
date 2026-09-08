import type { VizRenderExecutionContext } from '@viz-engine/render';
import { resolveVizProjectAudioAsset } from '@viz-engine/runtime';
import {
  loadAndDecodeBrowserAudio,
  type LoadedBrowserAudio,
} from './browser-audio-bake';

/** One decode shared by runtime feature baking and the encoded audio track. */
export interface VizBrowserRenderAudio {
  load(): Promise<LoadedBrowserAudio | undefined>;
  decodedBytes(): number;
  dispose(): void;
}

export const createVizBrowserRenderAudio = ({
  source,
  signal,
}: VizRenderExecutionContext): VizBrowserRenderAudio => {
  let pending: Promise<LoadedBrowserAudio | undefined> | undefined;
  let bytes = 0;
  let disposed = false;
  return {
    load() {
      signal.throwIfAborted();
      if (disposed) throw new Error('Render audio is disposed.');
      return (pending ??= (async () => {
        const asset = resolveVizProjectAudioAsset(
          source.project,
          source.resolvedAssets,
        );
        if (!asset) return undefined;
        const loaded = await loadAndDecodeBrowserAudio(
          asset.resolved.uri,
          signal,
        );
        signal.throwIfAborted();
        if (disposed) throw new Error('Render audio is disposed.');
        bytes =
          loaded.audioBuffer.length * loaded.audioBuffer.numberOfChannels * 4;
        return loaded;
      })());
    },
    decodedBytes: () => bytes,
    dispose() {
      disposed = true;
      pending = undefined;
    },
  };
};
