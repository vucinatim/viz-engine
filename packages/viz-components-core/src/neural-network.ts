import type {
  VizComponentImplementation,
  VizRenderProgramValue,
  VizRenderThreeProgramNode,
} from '@viz-engine/contracts';
import { neuralNetworkAuthoring } from './authoring/neural-network.js';
import { asBoolean, asNumber, asRecord, asString } from './shared.js';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const readSignalSettings = (
  settings: Readonly<Record<string, unknown>>,
): {
  trigger: boolean;
  speed: number;
  size: number;
  color: string;
} => ({
  trigger: asBoolean(settings.trigger, false),
  speed: clamp(asNumber(settings.signalSpeed, 30), 1, 40),
  size: clamp(asNumber(settings.signalSize, 0.2), 0.1, 2),
  color: asString(settings.somaEmission, 'rgb(255, 138, 201)'),
});

interface NeuralSignalEvent {
  startFrame: number;
  speed: number;
  size: number;
  color: string;
}

interface NeuralNetworkTemporalState {
  previousTrigger: boolean;
  events: NeuralSignalEvent[];
}

const readTemporalState = (value: unknown): NeuralNetworkTemporalState => {
  if (!value || typeof value !== 'object') {
    return { previousTrigger: false, events: [] };
  }
  const state = value as Partial<NeuralNetworkTemporalState>;
  return {
    previousTrigger: state.previousTrigger === true,
    events: Array.isArray(state.events)
      ? state.events.filter(
          (event): event is NeuralSignalEvent =>
            Boolean(event) &&
            typeof event === 'object' &&
            Number.isInteger((event as NeuralSignalEvent).startFrame) &&
            typeof (event as NeuralSignalEvent).speed === 'number' &&
            typeof (event as NeuralSignalEvent).size === 'number' &&
            typeof (event as NeuralSignalEvent).color === 'string',
        )
      : [],
  };
};

export const neuralNetworkComponent: VizComponentImplementation = {
  id: 'neural-network',
  name: 'Neural Network',
  rendererFamily: 'three',
  implementationVersion: '1.0.0',
  authoring: neuralNetworkAuthoring,
  description:
    'Procedural neuron structures with traveling activation signals.',
  temporal: {
    step: ({ frameContext, settings }, previousState) => {
      const state = readTemporalState(previousState);
      const signal = readSignalSettings(settings);
      const events = state.events.filter(
        (event) =>
          frameContext.frame - event.startFrame <= 32 * frameContext.fps,
      );
      if (signal.trigger && !state.previousTrigger) {
        events.push({
          startFrame: frameContext.frame,
          speed: signal.speed,
          size: signal.size,
          color: signal.color,
        });
      }
      return {
        previousTrigger: signal.trigger,
        events,
      } satisfies NeuralNetworkTemporalState;
    },
  },
  render: ({ frameContext, layer, settings, temporalState }) => {
    const postProcessing = asRecord(settings.postProcessing);
    const state = readTemporalState(temporalState);

    return {
      kind: 'three-program',
      id: layer.id,
      programId: 'viz-core/neural-network/v1',
      parameters: {
        time: frameContext.timeInSeconds,
        neuronCount: Math.round(
          clamp(asNumber(settings.neuronCount, 30), 1, 50),
        ),
        seed: Math.round(clamp(asNumber(settings.seed, 42), 1, 10_000)),
        tubeRadius: clamp(asNumber(settings.tubeRadius, 0.25), 0.05, 1),
        neuronColor: asString(settings.neuronColor, '#00CED1'),
        somaEmission: asString(settings.somaEmission, 'rgb(255, 138, 201)'),
        emissiveIntensity: clamp(asNumber(settings.emissiveIntensity, 2), 0, 5),
        metalness: clamp(asNumber(settings.metalness, 0), 0, 1),
        roughness: clamp(asNumber(settings.roughness, 0.9), 0, 1),
        fresnelPower: clamp(asNumber(settings.fresnelPower, 3), 0.5, 8),
        growth: clamp(asNumber(settings.growth, 1), 0, 1),
        dendriteReach: clamp(asNumber(settings.dendriteReach, 20), 5, 40),
        triggerEvents: state.events.map(
          (event): Record<string, VizRenderProgramValue> => ({
            age: (frameContext.frame - event.startFrame) / frameContext.fps,
            speed: event.speed,
            size: event.size,
            color: event.color,
          }),
        ),
        activationDecay: clamp(asNumber(settings.activationDecay, 0.4), 0, 10),
        bloomEnabled: asBoolean(postProcessing.bloom, false),
        bloomStrength: clamp(asNumber(postProcessing.bloomStrength, 0.2), 0, 3),
        bloomRadius: clamp(asNumber(postProcessing.bloomRadius, 0.8), 0, 1),
        bloomThreshold: clamp(
          asNumber(postProcessing.bloomThreshold, 0.3),
          0,
          1,
        ),
        depthOfFieldEnabled: asBoolean(postProcessing.depthOfField, true),
        depthOfFieldFocus: clamp(asNumber(postProcessing.dofFocus, 10), 1, 50),
        depthOfFieldAperture: clamp(
          asNumber(postProcessing.dofAperture, 0.0005),
          0.0001,
          0.002,
        ),
      },
    } satisfies VizRenderThreeProgramNode;
  },
};
