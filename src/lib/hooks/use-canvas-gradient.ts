import { useEffect, useState } from 'react';
import { AUDIO_THEME } from '../theme/audio-theme';

function useCanvasGradient(height: number = AUDIO_THEME.waveform.height) {
  const [gradient, setGradient] = useState<CanvasGradient | null>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Build gradient from theme stops
    const dpr =
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const grad = ctx.createLinearGradient(0, 0, 0, height * dpr);
    for (const stop of AUDIO_THEME.waveform.gradientStops) {
      grad.addColorStop(stop.offset, stop.color);
    }

    setGradient(grad);
  }, [height]);

  return gradient;
}

export default useCanvasGradient;
