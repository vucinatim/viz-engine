import editorControl from '@/lib/editor-control';
import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import { useVizSessionSelector } from '@/lib/viz-session';

const CaptureAudio = () => {
  const audioContext = useAudioEngineStore((s) => s.audioContext);
  const audioAnalyzer = useAudioEngineStore((s) => s.audioAnalyzer);
  const setAudioSource = useAudioEngineStore((s) => s.setAudioSource);
  const tabCaptureStream = useAudioEngineStore((s) => s.tabCaptureStream);
  const setTabCaptureStream = useAudioEngineStore((s) => s.setTabCaptureStream);
  const attachStreamToElement = useAudioEngineStore(
    (s) => s.attachStreamToElement,
  );
  const isCapturingTab = useVizSessionSelector(
    (state) => state.audio.session.source?.kind === 'stream',
  );
  const playerRef = useEditorRuntimePreviewAttachmentStore(
    (state) => state.playerRef,
  );

  const startTabCapture = async () => {
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        // Chrome rejects audio-only in many cases; request a tiny video track
        video: { width: 1, height: 1, frameRate: 1 },
      });
      if (!audioContext || !audioAnalyzer) return;
      // Ensure the audio context is running so the analyser produces data
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(audioAnalyzer);
      setAudioSource(source);
      await attachStreamToElement(stream);
      setTabCaptureStream(stream);
      const label = stream.getAudioTracks()[0]?.label || 'Captured Tab';
      editorControl.audio.attachCapturedStream(label);
      // Immediately start the Remotion timeline
      if (playerRef.current && !playerRef.current.isPlaying()) {
        editorControl.preview.play();
      }
      stream.getAudioTracks().forEach((t: MediaStreamTrack) => {
        t.addEventListener('ended', () => {
          try {
            source.disconnect();
          } catch {
            // The source may already be disconnected when the track ends.
          }
          setAudioSource(null);
          setTabCaptureStream(null);
          editorControl.audio.detachCapturedStream();
          // Pause playback when capture ends unexpectedly
          if (playerRef.current && playerRef.current.isPlaying()) {
            editorControl.preview.pause();
          }
        });
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Tab capture failed', e);
      // Ensure UI exits capture state on failure/cancel
      setTabCaptureStream(null);
      editorControl.audio.detachCapturedStream();
      // Pause playback on capture failure
      if (playerRef.current && playerRef.current.isPlaying()) {
        editorControl.preview.pause();
      }
    }
  };

  const stopTabCapture = () => {
    if (!tabCaptureStream) return;
    // Stop all tracks; some browsers will fire track 'ended' listeners afterwards
    tabCaptureStream.getTracks().forEach((t) => t.stop());
    setAudioSource(null);
    // Immediately clear capture state for UI
    setTabCaptureStream(null);
    editorControl.audio.detachCapturedStream();
    // Pause playback when exiting capture mode
    if (playerRef.current && playerRef.current.isPlaying()) {
      editorControl.preview.pause();
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        className={
          'rounded px-2 py-1 text-xs transition-colors ' +
          (isCapturingTab
            ? 'border border-animation-blue/60 bg-animation-blue/10 text-animation-blue/80 hover:bg-animation-blue/20'
            : 'border border-white/20 hover:bg-white/10')
        }
        onClick={() =>
          tabCaptureStream ? stopTabCapture() : startTabCapture()
        }>
        {tabCaptureStream ? 'Stop Tab Audio' : 'Capture Tab Audio'}
      </button>
    </div>
  );
};

export default CaptureAudio;
