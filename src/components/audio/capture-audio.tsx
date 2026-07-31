import editorControl from '@/lib/editor-control';
import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import { useVizSessionSelector } from '@/lib/viz-session';
import { useEffect, useRef, useState } from 'react';

const CaptureAudio = () => {
  const audioContext = useAudioEngineStore((s) => s.audioContext);
  const audioAnalyzer = useAudioEngineStore((s) => s.audioAnalyzer);
  const setAudioSource = useAudioEngineStore((s) => s.setAudioSource);
  const elementAudioSource = useAudioEngineStore((s) => s.elementAudioSource);
  const tabCaptureStream = useAudioEngineStore((s) => s.tabCaptureStream);
  const setTabCaptureStream = useAudioEngineStore((s) => s.setTabCaptureStream);
  const attachStreamToElement = useAudioEngineStore(
    (s) => s.attachStreamToElement,
  );
  const isCapturingTab = useVizSessionSelector(
    (state) => state.audio.session.source?.kind === 'stream',
  );
  const captureSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const finishingRef = useRef(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finishCapture = (stream: MediaStream | null) => {
    if (finishingRef.current) return;
    finishingRef.current = true;

    stream?.getTracks().forEach((track) => track.stop());
    try {
      captureSourceRef.current?.disconnect();
    } catch {
      // The browser may disconnect a source when its last track ends.
    }
    captureSourceRef.current = null;
    setAudioSource(elementAudioSource);
    setTabCaptureStream(null);
    editorControl.audio.detachCapturedStream();
    editorControl.preview.pause();
    finishingRef.current = false;
  };

  const startTabCapture = async () => {
    if (isStarting || tabCaptureStream) return;
    setIsStarting(true);
    setError(null);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        // Chrome rejects audio-only in many cases; request a tiny video track
        video: { width: 1, height: 1, frameRate: 1 },
      });
      if (!audioContext || !audioAnalyzer) {
        throw new Error('The audio engine is not ready yet. Please try again.');
      }
      if (stream.getAudioTracks().length === 0) {
        throw new Error('The selected tab did not share an audio track.');
      }
      // Ensure the audio context is running so the analyser produces data
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(audioAnalyzer);
      captureSourceRef.current = source;
      setAudioSource(source);
      await attachStreamToElement(stream);
      setTabCaptureStream(stream);
      const label = stream.getAudioTracks()[0]?.label || 'Captured Tab';
      editorControl.audio.attachCapturedStream(label);
      editorControl.preview.play();
      stream.getTracks().forEach((track) => {
        track.addEventListener('ended', () => finishCapture(stream), {
          once: true,
        });
      });
    } catch (cause) {
      stream?.getTracks().forEach((track) => track.stop());
      try {
        captureSourceRef.current?.disconnect();
      } catch {
        // The partially created source may already be disconnected.
      }
      captureSourceRef.current = null;
      setAudioSource(elementAudioSource);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Tab audio capture could not be started.',
      );
    } finally {
      setIsStarting(false);
    }
  };

  const stopTabCapture = () => {
    finishCapture(tabCaptureStream);
  };

  useEffect(
    () => () => {
      useAudioEngineStore
        .getState()
        .tabCaptureStream?.getTracks()
        .forEach((track) => track.stop());
      captureSourceRef.current?.disconnect();
    },
    [],
  );

  return (
    <div className="flex items-center gap-3">
      <button
        aria-pressed={isCapturingTab}
        disabled={isStarting || (!isCapturingTab && !audioContext)}
        className={
          'rounded px-2 py-1 text-xs transition-colors ' +
          (isCapturingTab
            ? 'border border-animation-blue/60 bg-animation-blue/10 text-animation-blue/80 hover:bg-animation-blue/20'
            : 'border border-white/20 hover:bg-white/10')
        }
        onClick={() => {
          if (tabCaptureStream) stopTabCapture();
          else void startTabCapture();
        }}>
        {isStarting
          ? 'Starting…'
          : tabCaptureStream
            ? 'Stop Tab Audio'
            : 'Capture Tab Audio'}
      </button>
      {error && (
        <span role="alert" className="max-w-52 text-xs text-rose-300">
          {error}
        </span>
      )}
    </div>
  );
};

export default CaptureAudio;
