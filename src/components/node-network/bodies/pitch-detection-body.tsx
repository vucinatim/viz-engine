import { Label } from '@/components/ui/label';
import useAudioStore from '@/lib/stores/audio-store';
import { useNodeLiveValuesStore } from '@/lib/stores/node-live-values-store';
import { useNodeOutputCache } from '@/lib/stores/node-output-cache-store';
import { memo, useCallback, useRef, useState } from 'react';
import { useRafLoop } from 'react-use';
import { GraphNodeData } from '../node-network-store';

const MIN_FREQ = 20;
const MAX_FREQ = 20000;
const MIN_LOG_FREQ = Math.log(MIN_FREQ);
const MAX_LOG_FREQ = Math.log(MAX_FREQ);

interface PitchDetectionBodyProps {
  id: string;
  data: GraphNodeData;
  selected: boolean;
  nodeNetworkId: string;
}

function PitchDetectionBody({
  id: nodeId,
  data,
  nodeNetworkId,
}: PitchDetectionBodyProps) {
  const getNodeOutput = useNodeOutputCache((s) => s.getNodeOutput);
  const getLiveNodeValue = useNodeLiveValuesStore((s) => s.getNodeInputValue);
  const audioAnalyzer = useAudioStore((s) => s.audioAnalyzer);

  const [outputs, setOutputs] = useState<any>({});
  const [lastNote, setLastNote] = useState('');
  const [lastFrequency, setLastFrequency] = useState(0);
  const [lastMidi, setLastMidi] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minLineRef = useRef<HTMLDivElement>(null);
  const maxLineRef = useRef<HTMLDivElement>(null);
  const frequencyDataRef = useRef<Uint8Array>(new Uint8Array());

  const freqToLogPercent = useCallback((freq: number) => {
    if (freq <= MIN_FREQ) return 0;
    if (freq >= MAX_FREQ) return 100;
    return (
      ((Math.log(freq) - MIN_LOG_FREQ) / (MAX_LOG_FREQ - MIN_LOG_FREQ)) * 100
    );
  }, []);

  useRafLoop(() => {
    const nodeOutputs = getNodeOutput(nodeId) as any;
    if (nodeOutputs) {
      setOutputs(nodeOutputs);

      // Update last detected note if we have a signal
      const freq = Number(nodeOutputs?.frequency || 0);
      const note = String(nodeOutputs?.note || '');
      if (freq > 0 && note !== '') {
        setLastNote(note);
        setLastFrequency(freq);
        setLastMidi(Number(nodeOutputs?.midi || 0));
      }
    }

    // Get frequency data directly from audio analyzer
    let sampleRate = 44100;
    let fftSize = 2048;
    let fullSpectrum: Uint8Array | null = null;

    if (audioAnalyzer) {
      sampleRate = audioAnalyzer.context.sampleRate;
      fftSize = audioAnalyzer.fftSize;

      // Ensure buffer is correctly sized
      const size = audioAnalyzer.frequencyBinCount;
      if (frequencyDataRef.current.length !== size) {
        frequencyDataRef.current = new Uint8Array(size);
      }

      audioAnalyzer.getByteFrequencyData(frequencyDataRef.current as any);
      fullSpectrum = frequencyDataRef.current;
    }

    const minHz =
      getLiveNodeValue(nodeId, 'minHz') ?? data.inputValues.minHz ?? 200;
    const maxHz =
      getLiveNodeValue(nodeId, 'maxHz') ?? data.inputValues.maxHz ?? 2000;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      canvas.width = canvas.parentElement?.clientWidth ?? 0;
      canvas.height = canvas.parentElement?.clientHeight ?? 0;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    if (fullSpectrum && sampleRate) {
      ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
      const nyquist = sampleRate / 2;
      const frequencyPerBin = nyquist / (fftSize / 2);

      for (let i = 0; i < fullSpectrum.length; i++) {
        const freq = i * frequencyPerBin;
        const nextFreq = (i + 1) * frequencyPerBin;

        const x = (freqToLogPercent(freq) / 100) * width;
        const nextX = (freqToLogPercent(nextFreq) / 100) * width;
        const barWidth = Math.max(1, nextX - x);

        const barHeight = (fullSpectrum[i] / 255) * height;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      }
    }

    // Update cutoff line positions
    const minPercent = freqToLogPercent(minHz);
    const maxPercent = freqToLogPercent(maxHz);

    if (minLineRef.current) {
      minLineRef.current.style.left = `${minPercent}%`;
    }
    if (maxLineRef.current) {
      maxLineRef.current.style.left = `${maxPercent}%`;
    }
  });

  const note = String(outputs?.note || '');
  const frequency = Number(outputs?.frequency || 0);
  const midi = Number(outputs?.midi || 0);
  const octave = Number(outputs?.octave || 0);
  const confidence = Number(outputs?.confidence || 0);

  const hasSignal = frequency > 0 && note !== '';

  // Display last detected note if no current signal
  const displayNote = hasSignal ? note : lastNote || '—';
  const displayFreq = hasSignal ? frequency : lastFrequency;
  const displayMidi = hasSignal ? midi : lastMidi;

  return (
    <div className="space-y-3 p-1">
      {/* Main Display with Spectrum */}
      <div className="nodrag nopan relative h-28 w-full overflow-hidden rounded-lg border border-purple-500/20">
        {/* Canvas for spectrum visualization */}
        <canvas ref={canvasRef} className="h-full w-full bg-gray-900/50" />

        {/* Min/Max cutoff lines */}
        <div
          ref={minLineRef}
          className="pointer-events-none absolute top-0 h-full w-0.5 bg-purple-400"
          style={{ boxShadow: '0 0 4px rgba(168, 85, 247, 0.8)' }}
        />
        <div
          ref={maxLineRef}
          className="pointer-events-none absolute top-0 h-full w-0.5 bg-purple-400"
          style={{ boxShadow: '0 0 4px rgba(168, 85, 247, 0.8)' }}
        />

        {/* Status Indicator Dot */}
        <div className="pointer-events-none absolute right-2 top-2 z-10">
          <div
            className={`h-2 w-2 rounded-full ${
              hasSignal ? 'bg-green-500' : 'bg-red-500'
            } shadow-lg`}
            style={{
              boxShadow: hasSignal
                ? '0 0 8px rgba(34, 197, 94, 0.8)'
                : '0 0 8px rgba(239, 68, 68, 0.8)',
            }}
          />
        </div>

        {/* Note Display - Overlaid on top */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div
            className={`text-4xl font-bold ${hasSignal ? 'text-purple-300' : 'text-gray-500'}`}
            style={{
              textShadow:
                '0 0 10px rgba(0, 0, 0, 0.8), 0 2px 4px rgba(0, 0, 0, 0.6)',
            }}>
            {displayNote}
          </div>
          <div
            className="text-sm text-gray-300"
            style={{
              textShadow:
                '0 0 8px rgba(0, 0, 0, 0.9), 0 1px 2px rgba(0, 0, 0, 0.7)',
            }}>
            {displayFreq > 0 ? `${displayFreq.toFixed(2)} Hz` : '—'}
          </div>
          <div
            className="text-xs text-gray-400"
            style={{
              textShadow:
                '0 0 6px rgba(0, 0, 0, 0.9), 0 1px 2px rgba(0, 0, 0, 0.7)',
            }}>
            {displayMidi > 0 ? `MIDI: ${displayMidi}` : '—'}
          </div>
        </div>
      </div>

      {/* Confidence Indicator */}
      <div className="space-y-2">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label className="text-xs text-gray-400">Confidence</Label>
            <span className="text-xs text-gray-500">
              {(confidence * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-150"
              style={{ width: `${Math.min(100, confidence * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Piano Roll Visualization */}
      <div className="pt-2">
        <Label className="mb-2 block text-xs text-gray-400">
          Chromatic Scale
        </Label>
        <div className="flex gap-0.5">
          {[
            'C',
            'C#',
            'D',
            'D#',
            'E',
            'F',
            'F#',
            'G',
            'G#',
            'A',
            'A#',
            'B',
          ].map((noteName, idx) => {
            const isBlackKey = noteName.includes('#');
            const isActive = hasSignal && note.startsWith(noteName);

            return (
              <div
                key={idx}
                className={`h-8 flex-1 rounded transition-all duration-150 ${
                  isBlackKey
                    ? isActive
                      ? 'bg-purple-500'
                      : 'bg-gray-700'
                    : isActive
                      ? 'bg-purple-400'
                      : 'bg-gray-600'
                } ${isActive ? 'ring-2 ring-purple-300' : ''}`}
                title={noteName}>
                <div className="mt-0.5 text-center text-[8px] opacity-60">
                  {noteName}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default memo(PitchDetectionBody);
