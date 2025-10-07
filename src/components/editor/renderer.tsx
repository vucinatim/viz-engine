import useLayerStore from '@/lib/stores/layer-store';
import { memo } from 'react';
import LayerRenderer from './layer-renderer';

const Renderer = memo(() => {
  const layers = useLayerStore((s) => s.layers);

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
