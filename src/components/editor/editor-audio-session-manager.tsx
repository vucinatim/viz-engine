'use client';

import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import useEditorAudioSessionStore from '@/lib/stores/editor-audio-session-store';
import { useEffect } from 'react';

export default function EditorAudioSessionManager() {
  const audioAnalyzer = useAudioEngineStore((state) => state.audioAnalyzer);
  const audioSource = useAudioEngineStore((state) => state.audioSource);
  const setAnalyzerState = useEditorAudioSessionStore(
    (state) => state.setAnalyzerState,
  );
  const setLiveInputAvailable = useEditorAudioSessionStore(
    (state) => state.setLiveInputAvailable,
  );

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
  }, [
    audioAnalyzer,
    audioSource,
    setAnalyzerState,
    setLiveInputAvailable,
  ]);

  return null;
}
