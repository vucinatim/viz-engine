import useAudioStore from '@/lib/stores/audio-store';
import useLayerStore from '@/lib/stores/layer-store';
import { memo, useEffect, useRef } from 'react';
import { Audio } from 'remotion';
import LayerRenderer from './layer-renderer';

const Renderer = memo(() => {
  const { layers } = useLayerStore();
  const audioElementRef = useRef<HTMLAudioElement>(null);
  const { setAudioElementRef } = useAudioStore();

  // console.log('Renderer actually rerendering!');

  useEffect(() => {
    setAudioElementRef(audioElementRef);
  }, [audioElementRef, setAudioElementRef]);

  return (
    <div className="h-full w-full">
      {audioElementRef.current && (
        <Audio src={audioElementRef.current?.baseURI} ref={audioElementRef} />
      )}
      {layers.map((layer) => (
        <LayerRenderer key={layer.id} layer={layer} />
      ))}
    </div>
  );
});

Renderer.displayName = 'Renderer';

export default Renderer;
