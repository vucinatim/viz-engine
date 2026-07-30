import {
  createEditorOutputNodeDefinition,
  editorNodeAuthoringDefinitions,
  inputNodeAuthoringDefinition,
  type VizNodeAuthoringDefinition,
} from '@viz-engine/nodes-core';
import type { ComponentType } from 'react';

import type { AnimNode } from '../config/create-node';
import type { NodeHandleType } from '../config/node-types';
import AdaptiveNormalizeQuantileBody from './bodies/adaptive-normalize-quantile-body';
import EnvelopeFollowerBody from './bodies/envelope-follower-body';
import frequencyBandBody from './bodies/frequency-band-body';
import HarmonicPresenceBody from './bodies/harmonic-presence-body';
import HSLColorBody from './bodies/hsl-color-body';
import HysteresisGateBody from './bodies/hysteresis-gate-body';
import MultiBandAnalysisBody from './bodies/multi-band-analysis-body';
import NormalizeBody from './bodies/normalize-body';
import PitchDetectionBody from './bodies/pitch-detection-body';
import RateLimiterBody from './bodies/rate-limiter-body';
import RGBColorBody from './bodies/rgb-color-body';
import SectionChangeDetectorBody from './bodies/section-change-detector-body';
import SpectralCentroidBody from './bodies/spectral-centroid-body';
import ThresholdCounterBody from './bodies/threshold-counter-body';
import TimeDomainSectionDetectorBody from './bodies/time-domain-section-detector-body';
import TonalPresenceBody from './bodies/tonal-presence-body';
import ValueMapperBody from './bodies/value-mapper-body';

export type { AnimNode } from '../config/create-node';

const customBodies: Readonly<Record<string, ComponentType<any>>> = {
  'Adaptive Normalize (Quantile)': AdaptiveNormalizeQuantileBody,
  Normalize: NormalizeBody,
  'Frequency Band': frequencyBandBody,
  'Pitch Detection': PitchDetectionBody,
  'Value Mapper': ValueMapperBody,
  'Harmonic Presence': HarmonicPresenceBody,
  'Tonal Presence': TonalPresenceBody,
  'Hysteresis Gate': HysteresisGateBody,
  'Envelope Follower': EnvelopeFollowerBody,
  'Threshold Counter': ThresholdCounterBody,
  'Section Change Detector': SectionChangeDetectorBody,
  'Multi-Band Analysis': MultiBandAnalysisBody,
  'Spectral Centroid': SpectralCentroidBody,
  'Adaptive Section Detector': TimeDomainSectionDetectorBody,
  'Rate Limiter': RateLimiterBody,
  'RGB Color': RGBColorBody,
  'HSL Color': HSLColorBody,
};

const toEditorNode = (definition: VizNodeAuthoringDefinition): AnimNode => ({
  ...definition,
  inputs: definition.inputs as AnimNode['inputs'],
  outputs: definition.outputs as AnimNode['outputs'],
  customBody: customBodies[definition.label],
  computeSignal: definition.computeSignal as AnimNode['computeSignal'],
});

export const InputNode = toEditorNode(inputNodeAuthoringDefinition);

export const createOutputNode = (type: NodeHandleType): AnimNode =>
  toEditorNode(createEditorOutputNodeDefinition(type));

export const nodes: AnimNode[] =
  editorNodeAuthoringDefinitions.map(toEditorNode);

export const NodeDefinitionMap = new Map<string, AnimNode>(
  nodes.map((node) => [node.label, node]),
);

NodeDefinitionMap.set(InputNode.label, InputNode);
