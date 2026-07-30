import type {
  VizComponentDefinition,
  VizComponentRuntimeInputBinding,
  VizRuntimeAudioFrameSnapshot,
  VizRuntimeInputs,
} from "@viz-engine/contracts";

const resolveAudioBinding = (
  binding: VizComponentRuntimeInputBinding,
  audio: VizRuntimeAudioFrameSnapshot,
): unknown => {
  switch (binding) {
    case "audio.frequency-data":
      return audio.frequencyData;
    case "audio.time-domain-data":
      return audio.timeDomainData;
    case "audio.sample-rate":
      return audio.sampleRate;
    case "audio.fft-size":
      return audio.fftSize;
    case "audio.frequency-analysis":
      return {
          frequencyData: audio.frequencyData,
          sampleRate: audio.sampleRate,
          fftSize: audio.fftSize,
          minDecibels: audio.minDecibels,
          maxDecibels: audio.maxDecibels,
      };
  }
};

export const resolveVizComponentRuntimeInputValues = (
  component: VizComponentDefinition,
  runtimeInputs: VizRuntimeInputs,
): Readonly<Record<string, unknown>> => {
  const audio = runtimeInputs.audio;
  if (!audio) {
    return {};
  }

  return Object.fromEntries(
    (component.inputs ?? []).flatMap((input) =>
      input.runtimeBinding === undefined
        ? []
        : [
            [
              input.key,
              resolveAudioBinding(input.runtimeBinding, audio),
            ],
          ],
    ),
  );
};

export const createVizStandardGraphRuntimeInputValues = (
  timeInSeconds: number,
  runtimeInputs: VizRuntimeInputs,
): Readonly<Record<string, unknown>> => {
  const audio = runtimeInputs.audio;
  return {
    time: timeInSeconds,
    ...(audio === undefined
      ? {}
      : {
          audioSignal: audio.timeDomainData,
          frequencyAnalysis: {
            frequencyData: audio.frequencyData,
            sampleRate: audio.sampleRate,
            fftSize: audio.fftSize,
            minDecibels: audio.minDecibels,
            maxDecibels: audio.maxDecibels,
          },
        }),
  };
};
