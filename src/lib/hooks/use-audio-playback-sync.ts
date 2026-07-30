import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import { useVizSessionSelector } from '@/lib/viz-session';
import { useEffect } from 'react';

const useAudioPlaybackSync = () => {
  const audioElementRef = useAudioEngineStore((s) => s.audioElementRef);
  const isPlaying = useVizSessionSelector(
    (state) => state.preview.transport.isPlaying,
  );

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
