import useEditorStore from '@/lib/stores/editor-store';
import useLayerStore from '@/lib/stores/layer-store';
import LayerMirrorCanvas from './layer-mirror-canvas';

const AmbientBackground = () => {
  const layers = useLayerStore((s) => s.layers);
  const ambientMode = useEditorStore((s) => s.ambientMode);

  return (
    <div>
      {/* <Image src="/logo.png" alt={"bg"} layout="fill" objectFit="cover" /> */}
      {ambientMode && (
        <div className="absolute inset-0">
          {layers.map((layer) => (
            <LayerMirrorCanvas key={layer.id} layer={layer} />
          ))}
        </div>
      )}
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-xl" />
    </div>
  );
};

export default AmbientBackground;
