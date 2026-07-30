import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import useEditorPreviewStore from '@/lib/stores/editor-preview-store';
import { useEffect } from 'react';

const useAudioPlaybackSync = () => {
  const audioElementRef = useAudioEngineStore((s) => s.audioElementRef);
  const isPlaying = useEditorPreviewStore((s) => s.transport.isPlaying);

  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [audioElementRef, isPlaying]);
};

export default useAudioPlaybackSync;
