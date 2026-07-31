import { useVizSessionSelector } from '@/lib/viz-session';
import { useRef } from 'react';
import CustomPlayerControls from './custom-player-controls';
import EditorPreviewTransportDriver from './editor-preview-transport-driver';
import Renderer from './renderer';

const PreviewPlayer = () => {
  const durationInFrames = useVizSessionSelector(
    (state) => state.preview.transport.durationFrames,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      data-testid="preview-player"
      className="preview-player absolute inset-0 flex items-center justify-center">
      <EditorPreviewTransportDriver />
      <Renderer />
      <CustomPlayerControls
        containerRef={containerRef}
        durationInFrames={durationInFrames}
      />
    </div>
  );
};

export default PreviewPlayer;
