import { rhythmSelectionPresentation } from '@/lib/rhythm-selection-presentation';
import useRhythmLabStore, {
  type RhythmLabAnalysisResult,
} from '@/lib/stores/rhythm-lab-store';
import { beforeEach, describe, expect, it } from 'vitest';

const analysisResult: RhythmLabAnalysisResult = {
  onsetEnv: new Float32Array([0.1, 0.8]),
  tempogramCurve: new Float32Array([0.2, 0.7]),
  tempogramTempos: new Float32Array([90, 120]),
  tempoValue: 120,
  tempoCandidates: new Float32Array([120, 90]),
  tempoRefined: 119.8,
  beats: new Float32Array([1, 0, 1]),
  beatsTimes: new Float32Array([0, 0.5]),
  beatConfidence: 0.9,
  beatPhase: 0.1,
  beatPeriodFrames: 43,
  stats: { min: 0.1, max: 0.8, mean: 0.45, frames: 2 },
  tempogramStats: { min: 0.2, max: 0.7, mean: 0.45, points: 2 },
  analysisMeta: {
    sampleRate: 44_100,
    hopLength: 512,
    sampleCount: 44_100,
    winLength: 2_048,
  },
};

describe('rhythm presentation', () => {
  beforeEach(() => {
    rhythmSelectionPresentation.publish({ start: 0, end: 0.2 });
    useRhythmLabStore.getState().resetAnalysis();
  });

  it('publishes transient selection windows without requiring editor state', () => {
    const received: Array<{ start: number; end: number }> = [];
    const unsubscribe = rhythmSelectionPresentation.subscribe((selection) => {
      received.push({ ...selection });
    });

    rhythmSelectionPresentation.publish({ start: 0.25, end: 0.5 });
    unsubscribe();
    rhythmSelectionPresentation.publish({ start: 0.5, end: 0.75 });

    expect(received).toEqual([{ start: 0.25, end: 0.5 }]);
    expect(rhythmSelectionPresentation.getSnapshot()).toEqual({
      start: 0.5,
      end: 0.75,
    });
  });

  it('commits a complete worker result as one coherent store update', () => {
    const source = {} as AudioBuffer;
    let updates = 0;
    const unsubscribe = useRhythmLabStore.subscribe(() => {
      updates += 1;
    });

    useRhythmLabStore.getState().commitAnalysis(analysisResult, source);

    const state = useRhythmLabStore.getState();
    expect(updates).toBe(1);
    expect(state.analysisSource).toBe(source);
    expect(state.analysisMeta).toEqual(analysisResult.analysisMeta);
    expect(state.onsetEnv).toBe(analysisResult.onsetEnv);
    expect(state.isComputing).toBe(false);

    unsubscribe();
  });
});
