import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import { vizSessionActions } from '@/lib/viz-session';
import { useEffect } from 'react';

export default function EditorAudioSessionManager() {
  const audioAnalyzer = useAudioEngineStore((state) => state.audioAnalyzer);
  const audioSource = useAudioEngineStore((state) => state.audioSource);
  const setAnalyzerState = vizSessionActions.audio.setAnalyzerState;
  const setLiveInputAvailable = vizSessionActions.audio.setLiveInputAvailable;

  useEffect(() => {
    if (!audioAnalyzer) {
      setAnalyzerState('unavailable');
      setLiveInputAvailable(false);
      return;
    }

    if (audioSource.current) {
      setAnalyzerState('active');
      setLiveInputAvailable(true);
      return;
    }

    setAnalyzerState('idle');
    setLiveInputAvailable(false);
  }, [audioAnalyzer, audioSource, setAnalyzerState, setLiveInputAvailable]);

  return null;
}
