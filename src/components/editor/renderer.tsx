import useLayerStore from '@/lib/stores/layer-store';
import { memo } from 'react';
import LayerRenderer from './layer-renderer';

const Renderer = memo(() => {
  const { layers } = useLayerStore();

  // Note: Audio playback is handled by WaveSurfer in AudioPanel, not here.
  // The Remotion Player synchronizes its timing with WaveSurfer's audio element.
  // We don't need a separate Remotion <Audio> component in the editor.

  return (
    <div className="h-full w-full">
      {layers.map((layer) => (
        <LayerRenderer key={layer.id} layer={layer} />
      ))}
    </div>
  );
});

Renderer.displayName = 'Renderer';

export default Renderer;
