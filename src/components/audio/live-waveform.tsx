'use client';

import useAudioStore from '@/lib/stores/audio-store';
import { useEffect, useRef } from 'react';

const LiveWaveform = () => {
  const audioAnalyzer = useAudioStore((s) => s.audioAnalyzer);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !audioAnalyzer) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const buffer = new Uint8Array(audioAnalyzer.fftSize);
    // Smoothing and rendering options
    const SMOOTH_ALPHA = 0.3; // responsiveness (0..1)
    const DISPLAY_GAIN = 1.8; // visual amplification of waveform
    const SHOW_ZERO_LINE = false;
    const SHOW_RMS = false;
    let lastCssW = 0;
    let lastCssH = 0;
    // Persistent smoothed waveform state
    let smoothed: Float32Array | null = null;

    const render = () => {
      const dpr =
        typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.max(1, Math.floor(rect.width));
      const cssH = Math.max(1, Math.floor(rect.height));
      const w = Math.floor(cssW * dpr);
      const h = Math.floor(cssH * dpr);
      if (
        canvas.width !== w ||
        canvas.height !== h ||
        lastCssW !== cssW ||
        lastCssH !== cssH
      ) {
        canvas.width = w;
        canvas.height = h;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        lastCssW = cssW;
        lastCssH = cssH;
      }

      audioAnalyzer.getByteTimeDomainData(buffer);

      // Transparent background – just clear
      ctx.clearRect(0, 0, cssW, cssH);

      if (SHOW_ZERO_LINE) {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, cssH / 2);
        ctx.lineTo(cssW, cssH / 2);
        ctx.stroke();
      }

      // Initialize smoothed array once
      if (!smoothed || smoothed.length !== buffer.length) {
        smoothed = new Float32Array(buffer.length);
        for (let i = 0; i < buffer.length; i++) {
          smoothed[i] = (buffer[i] - 128) / 128;
        }
      } else {
        // Exponential smoothing across frames
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          smoothed[i] = smoothed[i] + SMOOTH_ALPHA * (v - smoothed[i]);
        }
      }

      // Draw a filled area (no stroke lines) for a calmer look
      const step = buffer.length / cssW;
      // Neon gradient
      const topColor = 'rgba(34, 211, 238, 0.85)'; // cyan-500 strong
      const bottomColor = 'rgba(168, 85, 247, 0.4)'; // purple-500 soft
      const grad = ctx.createLinearGradient(0, 0, 0, cssH);
      grad.addColorStop(0, topColor);
      grad.addColorStop(1, bottomColor);
      ctx.fillStyle = grad;
      ctx.beginPath();
      // Upper curve
      for (let x = 0; x < cssW; x++) {
        const i = Math.floor(x * step);
        const v = Math.max(-1, Math.min(1, smoothed[i] * DISPLAY_GAIN));
        const y = Math.max(
          2,
          Math.min(cssH - 2, cssH / 2 - v * (cssH / 2 - 4)),
        );
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      // Close shape down to baseline and back
      ctx.lineTo(cssW, cssH / 2);
      ctx.lineTo(0, cssH / 2);
      ctx.closePath();
      ctx.fill();

      // Neon glow outline
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(34,211,238,0.95)';
      ctx.shadowColor = 'rgba(34,211,238,0.9)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      for (let x = 0; x < cssW; x++) {
        const i = Math.floor(x * step);
        const v = Math.max(-1, Math.min(1, smoothed![i] * DISPLAY_GAIN));
        const y = Math.max(
          2,
          Math.min(cssH - 2, cssH / 2 - v * (cssH / 2 - 4)),
        );
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // Inner crisp highlight
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      for (let x = 0; x < cssW; x++) {
        const i = Math.floor(x * step);
        const v = Math.max(-1, Math.min(1, smoothed![i] * DISPLAY_GAIN));
        const y = Math.max(
          2,
          Math.min(cssH - 2, cssH / 2 - v * (cssH / 2 - 4)),
        );
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (SHOW_RMS) {
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = smoothed ? smoothed[i] : (buffer[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);
        const amp = rms * (cssH / 2 - 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, cssH / 2 - amp);
        ctx.lineTo(cssW, cssH / 2 - amp);
        ctx.moveTo(0, cssH / 2 + amp);
        ctx.lineTo(cssW, cssH / 2 + amp);
        ctx.stroke();
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [audioAnalyzer]);

  return <canvas ref={canvasRef} className="h-full w-full" />;
};

export default LiveWaveform;
