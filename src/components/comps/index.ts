import CurveSpectrum from './curve-spectrum';
import DebugAnimation from './debug-animation';
import FeatureExtractionBars from './feature-extraction-bars';
import HeartbeatMonitor from './heartbeat-monitor';
import InstancedSupercube from './instanced-supercube';
import MorphShapes from './morph-shapes';
import MovingObjects from './moving-objects';
import SimpleCube from './simple-cube';

export const AllComps = [
  CurveSpectrum,
  DebugAnimation,
  MovingObjects,
  SimpleCube,
  HeartbeatMonitor,
  InstancedSupercube,
  MorphShapes,
  FeatureExtractionBars,
];

export const CompDefinitionMap = new Map();
AllComps.forEach((comp) => CompDefinitionMap.set(comp.name, comp));
