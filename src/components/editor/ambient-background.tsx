import useEditorStore from '@/lib/stores/editor-store';
import CompositeMirrorCanvas from './composite-mirror-canvas';

const AmbientBackground = () => {
  const ambientMode = useEditorStore((s) => s.ambientMode);

  return (
    <div>
      {ambientMode && (
        <div className="absolute inset-0">
          <CompositeMirrorCanvas />
        </div>
      )}
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-xl" />
    </div>
  );
};

export default AmbientBackground;
