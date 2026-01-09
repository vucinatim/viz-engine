import { useEffect } from 'react';
import useAudioStore from '@/lib/stores/audio-store';
import useEditorStore from '@/lib/stores/editor-store';

const useAudioPlaybackSync = () => {
  const audioElementRef = useAudioStore((s) => s.audioElementRef);
  const isPlaying = useEditorStore((s) => s.isPlaying);

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
