export type MonoSignal = Float32Array;
export type StereoSignal = [Float32Array, Float32Array];
export type AudioSignal = MonoSignal | StereoSignal;

export type WindowFunction = 'hann' | 'hamming' | 'blackman' | 'rect';

export interface AnalysisOptions {
  sr?: number;
  hopLength?: number;
  winLength?: number;
  nFft?: number;
  window?: WindowFunction;
  center?: boolean;
}

export interface OnsetStrengthOptions extends AnalysisOptions {
  aggregate?: 'mean' | 'median' | 'max';
  logCompression?: boolean;
}

export interface OnsetStrengthResult {
  onsetEnv: Float32Array;
  times: Float32Array;
  sr: number;
  hopLength: number;
}

export interface TempogramOptions {
  sr?: number;
  hopLength?: number;
  minBpm?: number;
  maxBpm?: number;
  method?: 'ac' | 'fourier';
}

export interface TempogramResult {
  tempogram: Float32Array;
  shape: [number, number];
  tempos: Float32Array;
  method: 'ac' | 'fourier';
}

export interface TempoOptions extends TempogramOptions {
  prior?: Float32Array;
}

export interface TempoResult {
  tempo: number;
  candidates: Float32Array;
}

export interface BeatTrackOptions extends TempoOptions {
  tightness?: number;
}

export interface BeatTrackResult {
  tempo: number;
  beats: Float32Array;
  confidence: number;
}
