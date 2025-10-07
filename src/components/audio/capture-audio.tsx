'use client';

import useAudioStore from '@/lib/stores/audio-store';
import useEditorStore from '@/lib/stores/editor-store';

const CaptureAudio = () => {
  const audioContext = useAudioStore((s) => s.audioContext);
  const audioAnalyzer = useAudioStore((s) => s.audioAnalyzer);
  const setAudioSource = useAudioStore((s) => s.setAudioSource);
  const tabCaptureStream = useAudioStore((s) => s.tabCaptureStream);
  const setTabCaptureStream = useAudioStore((s) => s.setTabCaptureStream);
  const isCapturingTab = useAudioStore((s) => s.isCapturingTab);
  const setIsCapturingTab = useAudioStore((s) => s.setIsCapturingTab);
  const captureLabel = useAudioStore((s) => s.captureLabel);
  const setCaptureLabel = useAudioStore((s) => s.setCaptureLabel);
  const audioElementRef = useAudioStore((s) => s.audioElementRef);
  const wavesurfer = useAudioStore((s) => s.wavesurfer);

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
      // Route the captured stream into the hidden audio element for WaveSurfer visualization
      const el = audioElementRef.current;
      if (el) {
        try {
          // Rebind element to the live stream so WaveSurfer visualizes it
          el.pause();
          // Clear any previous src URL
          el.removeAttribute('src');
          (el as any).srcObject = stream;
          el.muted = true; // prevent double playback
          el.load();
          await el.play().catch(() => {});
        } catch {}
      }
      setTabCaptureStream(stream);
      setIsCapturingTab(true);
      const label = stream.getAudioTracks()[0]?.label || 'Captured Tab';
      setCaptureLabel(label);
      // Immediately start the Remotion timeline
      const playerRef = useEditorStore.getState().playerRef;
      if (playerRef.current && !playerRef.current.isPlaying()) {
        playerRef.current.play();
        useEditorStore.getState().setIsPlaying(true);
      }
      stream.getAudioTracks().forEach((t: MediaStreamTrack) => {
        t.addEventListener('ended', () => {
          try {
            source.disconnect();
          } catch {}
          setAudioSource(null);
          setTabCaptureStream(null);
          setIsCapturingTab(false);
          setCaptureLabel(null);
        });
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Tab capture failed', e);
      // Ensure UI exits capture state on failure/cancel
      setTabCaptureStream(null);
      setIsCapturingTab(false);
      setCaptureLabel(null);
    }
  };

  const stopTabCapture = () => {
    if (!tabCaptureStream) return;
    // Stop all tracks; some browsers will fire track 'ended' listeners afterwards
    tabCaptureStream.getTracks().forEach((t) => t.stop());
    const el = audioElementRef.current;
    if (el) {
      try {
        el.pause();
        (el as any).srcObject = null;
        const url = useAudioStore.getState().currentTrackUrl;
        if (url) {
          el.src = url;
          el.muted = false;
          el.load();
          // Resume audible playback of the previously selected track
          el.play().catch(() => {});
          wavesurfer?.load(url);
        } else {
          el.removeAttribute('src');
          el.load();
        }
      } catch {}
    }
    // Immediately clear capture state for UI
    setTabCaptureStream(null);
    setIsCapturingTab(false);
    setCaptureLabel(null);
    // Ensure the Remotion timeline is playing after exiting capture mode
    const playerRef = useEditorStore.getState().playerRef;
    if (playerRef.current && !playerRef.current.isPlaying()) {
      playerRef.current.play();
      useEditorStore.getState().setIsPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        className={
          'rounded px-2 py-1 text-xs transition-colors ' +
          (isCapturingTab
            ? 'border border-cyan-400/60 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20'
            : 'border border-white/20 hover:bg-white/10')
        }
        onClick={() =>
          tabCaptureStream ? stopTabCapture() : startTabCapture()
        }>
        {tabCaptureStream ? 'Stop Tab Audio' : 'Capture Tab Audio'}
      </button>
      {isCapturingTab && (
        <span
          className="max-w-[12rem] truncate text-[10px] text-white/70"
          title={captureLabel || undefined}>
          {captureLabel}
        </span>
      )}
    </div>
  );
};

export default CaptureAudio;
