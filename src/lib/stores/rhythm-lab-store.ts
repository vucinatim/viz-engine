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

export type RhythmLabAnalysisResult = {
  onsetEnv: Float32Array;
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
  analysisMeta: RhythmLabAnalysisMeta;
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
  analysisSource: AudioBuffer | null;
  isComputing: boolean;
  setOutputView: (value: string) => void;
  setParam: (
    key: keyof RhythmLabParams,
    value: RhythmLabParams[keyof RhythmLabParams],
  ) => void;
  setEnabledStage: (id: string, enabled: boolean) => void;
  commitAnalysis: (
    result: RhythmLabAnalysisResult,
    source: AudioBuffer,
  ) => void;
  setIsComputing: (isComputing: boolean) => void;
  resetAnalysis: () => void;
};

const EMPTY_ANALYSIS = {
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
  analysisSource: null,
  isComputing: false,
} satisfies Partial<RhythmLabState>;

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
  ...EMPTY_ANALYSIS,
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
  commitAnalysis: (result, analysisSource) =>
    set({ ...result, analysisSource, isComputing: false }),
  setIsComputing: (isComputing) => set({ isComputing }),
  resetAnalysis: () => set(EMPTY_ANALYSIS),
}));

export default useRhythmLabStore;
