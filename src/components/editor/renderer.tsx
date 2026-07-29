import useEditorLayerProjectionStore from '@/lib/stores/editor-layer-projection-store';
import { memo } from 'react';
import EditorRuntimePreviewDriver from './editor-runtime-preview-driver';
import LayerRenderer from './layer-renderer';

const Renderer = memo(() => {
  const layers = useEditorLayerProjectionStore((state) => state.layers);

  return (
    <div className="h-full w-full" data-renderer-container>
      <EditorRuntimePreviewDriver />
      {layers.map((layer) => (
        <LayerRenderer key={layer.id} layer={layer} />
      ))}
    </div>
  );
});

Renderer.displayName = 'Renderer';

export default Renderer;
