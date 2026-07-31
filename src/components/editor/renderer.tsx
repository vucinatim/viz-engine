import { useProjectedLayers } from '@/lib/projected-layers';
import { memo } from 'react';
import EditorRuntimePreviewDriver from './editor-runtime-preview-driver';
import LayerRenderer from './layer-renderer';

const Renderer = memo(() => {
  const layers = useProjectedLayers();

  return (
    <div className="h-full w-full" data-renderer-container>
      <EditorRuntimePreviewDriver />
      <LayerRenderer layers={layers} />
    </div>
  );
});

Renderer.displayName = 'Renderer';

export default Renderer;
