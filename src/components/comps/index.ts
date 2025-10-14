import CurveSpectrum from './curve-spectrum';
import DebugAnimation from './debug-animation';
import FeatureExtractionBars from './feature-extraction-bars';
import FullscreenShader from './fullscreen-shader';
import HeartbeatMonitor from './heartbeat-monitor';
import InstancedSupercube from './instanced-supercube';
import MorphShapes from './morph-shapes';
import NeuralNetwork from './neural-network';
import NoiseShader from './noise-shader';
import OrbitingCubes from './orbiting-cubes';
import ParticleSystem from './particle-system';
import SimpleCube from './simple-cube';
import StageScene from './stage-scene';
import StrobeLight from './strobe-light';

export const AllComps = [
  CurveSpectrum,
  DebugAnimation,
  SimpleCube,
  HeartbeatMonitor,
  InstancedSupercube,
  MorphShapes,
  FeatureExtractionBars,
  NeuralNetwork,
  NoiseShader,
  OrbitingCubes,
  ParticleSystem,
  StageScene,
  FullscreenShader,
  StrobeLight,
];

export const CompDefinitionMap = new Map();
AllComps.forEach((comp) => CompDefinitionMap.set(comp.name, comp));
