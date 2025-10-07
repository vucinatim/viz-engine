import useLayerStore, { LayerData } from '@/lib/stores/layer-store';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import LayerMirrorCanvas from './layer-mirror-canvas';

interface LayerPreviewProps {
  layer: LayerData;
}

const LayerPreview = ({ layer }: LayerPreviewProps) => {
  const updateLayerSettings = useLayerStore((s) => s.updateLayerSettings);

  return (
    <div className="group relative aspect-video h-full shrink-0 cursor-pointer overflow-hidden rounded-md">
      {layer.layerSettings.visible && <LayerMirrorCanvas layer={layer} />}
      <div
        onMouseDown={() =>
          updateLayerSettings(layer.id, {
            ...layer.layerSettings,
            visible: !layer.layerSettings.visible,
          })
        }
        className={cn(
          'absolute inset-0 bg-zinc-500/20 transition-opacity',
          layer.layerSettings.visible
            ? 'opacity-0 group-hover:opacity-100'
            : 'opacity-100 group-hover:opacity-50',
        )}>
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            layer.layerSettings.visible
              ? 'opacity-0 group-hover:opacity-100'
              : 'opacity-100 group-hover:opacity-0',
          )}>
          <EyeOff className="h-5 w-5 text-zinc-500" />
        </div>
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center opacity-0',
            !layer.layerSettings.visible && 'opacity-0 group-hover:opacity-100',
          )}>
          <Eye className="h-5 w-5 text-zinc-500" />
        </div>
      </div>
    </div>
  );
};

export default LayerPreview;
