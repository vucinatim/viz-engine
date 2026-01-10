import { create } from 'zustand';

export type RhythmAggregate = 'mean' | 'median' | 'max';

export type RhythmLabParams = {
  hopLength: number;
  nFft: number;
  winLength: number;
  aggregate: RhythmAggregate;
  logCompression: boolean;
  minBpm: number;
  maxBpm: number;
  phaseOffset: number;
  optimizePhase: boolean;
};

export type RhythmLabStats = {
  min: number;
  max: number;
  mean: number;
  frames: number;
};

export type TempogramStats = {
  min: number;
  max: number;
  mean: number;
  points: number;
};

export type RhythmLabAnalysisMeta = {
  sampleRate: number;
  hopLength: number;
  sampleCount: number;
  winLength: number;
};

type RhythmLabState = {
  outputView: string;
  params: RhythmLabParams;
  enabledStages: Record<string, boolean>;
  onsetEnv: Float32Array | null;
  tempogramCurve: Float32Array | null;
  tempogramTempos: Float32Array | null;
  tempoValue: number;
  tempoCandidates: Float32Array | null;
  tempoRefined: number;
  beats: Float32Array | null;
  beatsTimes: Float32Array | null;
  beatConfidence: number;
  beatPhase: number;
  beatPeriodFrames: number;
  stats: RhythmLabStats;
  tempogramStats: TempogramStats;
  analysisMeta: RhythmLabAnalysisMeta | null;
  isComputing: boolean;
  setOutputView: (value: string) => void;
  setParam: (key: keyof RhythmLabParams, value: RhythmLabParams[keyof RhythmLabParams]) => void;
  setEnabledStage: (id: string, enabled: boolean) => void;
  setOnsetEnv: (env: Float32Array | null) => void;
  setTempogramCurve: (curve: Float32Array | null) => void;
  setTempogramTempos: (tempos: Float32Array | null) => void;
  setTempoValue: (tempoValue: number) => void;
  setTempoCandidates: (candidates: Float32Array | null) => void;
  setTempoRefined: (tempoRefined: number) => void;
  setBeats: (beats: Float32Array | null) => void;
  setBeatsTimes: (beatsTimes: Float32Array | null) => void;
  setBeatConfidence: (confidence: number) => void;
  setBeatPhase: (phase: number) => void;
  setBeatPeriodFrames: (periodFrames: number) => void;
  setStats: (stats: RhythmLabStats) => void;
  setTempogramStats: (stats: TempogramStats) => void;
  setAnalysisMeta: (meta: RhythmLabAnalysisMeta | null) => void;
  setIsComputing: (isComputing: boolean) => void;
};

const useRhythmLabStore = create<RhythmLabState>((set) => ({
  outputView: 'Onset',
  params: {
    hopLength: 512,
    nFft: 2048,
    winLength: 2048,
    aggregate: 'mean',
    logCompression: true,
    minBpm: 60,
    maxBpm: 200,
    phaseOffset: 0,
    optimizePhase: true,
  },
  enabledStages: {
    onset: true,
  },
  onsetEnv: null,
  tempogramCurve: null,
  tempogramTempos: null,
  tempoValue: 0,
  tempoCandidates: null,
  tempoRefined: 0,
  beats: null,
  beatsTimes: null,
  beatConfidence: 0,
  beatPhase: 0,
  beatPeriodFrames: 0,
  stats: { min: 0, max: 0, mean: 0, frames: 0 },
  tempogramStats: { min: 0, max: 0, mean: 0, points: 0 },
  analysisMeta: null,
  isComputing: false,
  setOutputView: (outputView) => set({ outputView }),
  setParam: (key, value) =>
    set((state) => ({
      params: {
        ...state.params,
        [key]: value,
      },
    })),
  setEnabledStage: (id, enabled) =>
    set((state) => ({
      enabledStages: {
        ...state.enabledStages,
        [id]: enabled,
      },
    })),
  setOnsetEnv: (onsetEnv) => set({ onsetEnv }),
  setTempogramCurve: (tempogramCurve) => set({ tempogramCurve }),
  setTempogramTempos: (tempogramTempos) => set({ tempogramTempos }),
  setTempoValue: (tempoValue) => set({ tempoValue }),
  setTempoCandidates: (tempoCandidates) => set({ tempoCandidates }),
  setTempoRefined: (tempoRefined) => set({ tempoRefined }),
  setBeats: (beats) => set({ beats }),
  setBeatsTimes: (beatsTimes) => set({ beatsTimes }),
  setBeatConfidence: (beatConfidence) => set({ beatConfidence }),
  setBeatPhase: (beatPhase) => set({ beatPhase }),
  setBeatPeriodFrames: (beatPeriodFrames) => set({ beatPeriodFrames }),
  setStats: (stats) => set({ stats }),
  setTempogramStats: (tempogramStats) => set({ tempogramStats }),
  setAnalysisMeta: (analysisMeta) => set({ analysisMeta }),
  setIsComputing: (isComputing) => set({ isComputing }),
}));

export default useRhythmLabStore;
