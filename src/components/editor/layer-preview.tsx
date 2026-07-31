import editorControl from '@/lib/editor-control';
import { LayerData } from '@/lib/editor-layer-types';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import LayerMirrorCanvas from './layer-mirror-canvas';

interface LayerPreviewProps {
  layer: LayerData;
}

const LayerPreview = ({ layer }: LayerPreviewProps) => {
  return (
    <div className="group relative aspect-video h-full shrink-0 overflow-hidden rounded-md">
      {layer.layerSettings.visible && <LayerMirrorCanvas layer={layer} />}
      <button
        type="button"
        aria-label={`${layer.layerSettings.visible ? 'Hide' : 'Show'} ${layer.comp.name} layer`}
        aria-pressed={layer.layerSettings.visible}
        data-testid="toggle-layer-visibility"
        onClick={() =>
          editorControl.project.updateLayerSettings(layer.id, {
            ...layer.layerSettings,
            visible: !layer.layerSettings.visible,
          })
        }
        className={cn(
          'absolute inset-0 cursor-pointer bg-zinc-500/20 transition-opacity focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none',
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
      </button>
    </div>
  );
};

export default LayerPreview;
