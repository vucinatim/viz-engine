import CurveSpectrum from './curve-spectrum';
import DebugAnimation from './debug-animation';
import HeartbeatMonitor from './heartbeat-monitor';
import MovingObjects from './moving-objects';
import SimpleCube from './simple-cube';

export const AllComps = [
  CurveSpectrum,
  DebugAnimation,
  MovingObjects,
  SimpleCube,
  HeartbeatMonitor,
];

export const CompDefinitionMap = new Map();
AllComps.forEach((comp) => CompDefinitionMap.set(comp.name, comp));
