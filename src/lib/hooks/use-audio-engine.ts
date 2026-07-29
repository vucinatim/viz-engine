import { useEffect, useMemo, useRef, useState } from 'react';
import useAudioEngineStore from '@/lib/stores/audio-engine-store';
import useEditorAudioSessionStore from '@/lib/stores/editor-audio-session-store';

const DEFAULT_LEVELS = [512, 1024, 2048, 4096, 8192, 16384];

const computeRmsPeaks = (buffer: AudioBuffer, target: number) => {
  const channel = buffer.getChannelData(0);
  const totalSamples = channel.length;
  const buckets = Math.max(256, Math.min(target, totalSamples));
  const samplesPerBucket = Math.max(1, Math.floor(totalSamples / buckets));
  const peaks = new Float32Array(buckets);

  for (let i = 0; i < buckets; i += 1) {
    const start = i * samplesPerBucket;
    const end = Math.min(totalSamples, start + samplesPerBucket);
    let sumSq = 0;
    let count = 0;
    for (let j = start; j < end; j += 1) {
      const v = channel[j];
      sumSq += v * v;
      count += 1;
    }
    peaks[i] = count > 0 ? Math.sqrt(sumSq / count) : 0;
  }

  return peaks;
};

const useAudioEngine = () => {
  const audioElementRef = useAudioEngineStore((s) => s.audioElementRef);
  const audioSource = useAudioEngineStore((s) => s.audioSource);
  const audioContext = useAudioEngineStore((s) => s.audioContext);
  const audioAnalyzer = useAudioEngineStore((s) => s.audioAnalyzer);
  const gainNode = useAudioEngineStore((s) => s.gainNode);
  const setAudioContext = useAudioEngineStore((s) => s.setAudioContext);
  const setAnalyzer = useAudioEngineStore((s) => s.setAnalyzer);
  const setGainNode = useAudioEngineStore((s) => s.setGainNode);
  const setAudioBuffer = useAudioEngineStore((s) => s.setAudioBuffer);
  const isCapturingTab = useEditorAudioSessionStore(
    (s) => s.session.source?.kind === 'stream',
  );
  const setAnalyzerState = useEditorAudioSessionStore(
    (s) => s.setAnalyzerState,
  );
  const setLiveInputAvailable = useEditorAudioSessionStore(
    (s) => s.setLiveInputAvailable,
  );

  const [peaksLevels, setPeaksLevels] = useState<Float32Array[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [bufferDuration, setBufferDuration] = useState(0);
  const lastDecodedSrcRef = useRef<string | null>(null);

  const src = audioElementRef.current?.src || '';

  useEffect(() => {
    const ac = new AudioContext();
    const an = ac.createAnalyser();
    an.fftSize = 2048;
    an.smoothingTimeConstant = 0;
    an.minDecibels = -90;
    an.maxDecibels = -10;
    const gn = ac.createGain();
    setAudioContext(ac);
    setAnalyzer(an);
    setGainNode(gn);
    setAnalyzerState('idle');
    setLiveInputAvailable(false);

    return () => {
      setAnalyzerState('unavailable');
      setLiveInputAvailable(false);
      ac.close();
    };
  }, [
    setAnalyzer,
    setAnalyzerState,
    setAudioContext,
    setGainNode,
    setLiveInputAvailable,
  ]);

  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio || !audioContext || !audioAnalyzer || !gainNode) return;

    const handlePlay = async () => {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      if (!audioSource.current) {
        const source = audioContext.createMediaElementSource(audio);
        audioSource.current = source;
        source.connect(audioAnalyzer);
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
      }
      setAnalyzerState('active');
      setLiveInputAvailable(true);
    };

    audio.addEventListener('play', handlePlay);
    return () => audio.removeEventListener('play', handlePlay);
  }, [
    audioAnalyzer,
    audioContext,
    audioElementRef,
    audioSource,
    gainNode,
    setAnalyzerState,
    setLiveInputAvailable,
  ]);

  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) return;

    const updateDuration = () => {
      if (Number.isFinite(audio.duration)) {
        setDuration(audio.duration || 0);
      }
    };

    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    updateDuration();

    return () => {
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
    };
  }, [audioElementRef, src]);

  useEffect(() => {
    if (!src || isCapturingTab || !audioContext) {
      setAudioBuffer(null);
      setPeaksLevels(null);
      lastDecodedSrcRef.current = null;
      return;
    }

    if (lastDecodedSrcRef.current === src) return;
    lastDecodedSrcRef.current = src;

    let cancelled = false;
    const controller = new AbortController();

    const decode = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(src, { signal: controller.signal });
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        if (cancelled) return;
        setAudioBuffer(audioBuffer);
        setBufferDuration(audioBuffer.duration || 0);
        const levels = DEFAULT_LEVELS.map((level) =>
          computeRmsPeaks(audioBuffer, level),
        );
        const highest = levels[levels.length - 1] || new Float32Array();
        let globalMax = 1e-6;
        for (let i = 0; i < highest.length; i += 1) {
          const v = highest[i];
          if (v > globalMax) globalMax = v;
        }
        const normalized = levels.map((level) => {
          const out = new Float32Array(level.length);
          for (let i = 0; i < level.length; i += 1) {
            out[i] = level[i] / globalMax;
          }
          return out;
        });
        setPeaksLevels(normalized);
      } catch (error) {
        if (!cancelled) {
          console.error('[audio-engine] decode failed', error);
          setAudioBuffer(null);
          setPeaksLevels(null);
          setBufferDuration(0);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    decode();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [audioContext, isCapturingTab, setAudioBuffer, src]);

  return useMemo(
    () => ({
      peaksLevels,
      duration,
      bufferDuration,
      isLoading,
    }),
    [bufferDuration, duration, isLoading, peaksLevels],
  );
};

export default useAudioEngine;
