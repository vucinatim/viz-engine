export type ColorMode = 'single' | 'multi';

export interface LaserConfig {
  enabled: boolean;
  mode: 'auto' | 0 | 1 | 2 | 3 | 4;
  colorMode: ColorMode;
  singleColor: string;
  rotationSpeed: number;
  maxConcurrentLasers: number;
}

export interface BeamConfig {
  enabled: boolean;
  mode: 'auto' | 0 | 1 | 2 | 3 | 4;
  colorMode: ColorMode;
  singleColor: string;
  intensity: number;
}

export interface MovingLightConfig {
  enabled: boolean;
  mode: 'auto' | 0 | 1 | 2 | 3 | 4;
  colorMode: ColorMode;
  singleColor: string;
  intensity: number;
  speed: number;
}

export interface StageLightConfig {
  enabled: boolean;
  color: string;
}

export interface WashLightConfig {
  enabled: boolean;
  intensity: number;
}

export interface StrobeConfig {
  enabled: boolean;
  intensity: number;
  flashRate: number;
}

export interface BlinderConfig {
  enabled: boolean;
  intensity: number; // 0-1 value for blink intensity
  mode: 'random' | 'controlled'; // random flicker or controlled by intensity
}

export interface CrowdConfig {
  count: number;
}

export interface PostProcessingConfig {
  bloom: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
}

export interface CameraConfig {
  cinematicMode: boolean;
}

export interface ShaderWallConfig {
  enabled: boolean;
  scale: number;
  rotationSpeed: number;
  colorSpeed: number;
  travelSpeed: number;
  brightness: number;
}

export interface SceneConfig {
  // Scene elements
  lasers: LaserConfig;
  beams: BeamConfig;
  movingLights: MovingLightConfig;
  stageLights: StageLightConfig;
  stageWash: WashLightConfig;
  strobes: StrobeConfig;
  blinders: BlinderConfig;
  crowd: CrowdConfig;
  shaderWall: ShaderWallConfig;

  // Post processing
  postProcessing: PostProcessingConfig;

  // Camera
  camera: CameraConfig;

  // Lighting
  hemisphereIntensity: number;
  ambientIntensity: number;

  // Debug
  debug: boolean;
}

export function createDefaultSceneConfig(): SceneConfig {
  return {
    lasers: {
      enabled: true,
      mode: 'auto',
      colorMode: 'multi',
      singleColor: '#ff0000',
      rotationSpeed: 1.0,
      maxConcurrentLasers: 12,
    },
    beams: {
      enabled: true,
      mode: 'auto',
      colorMode: 'multi',
      singleColor: '#88aaff',
      intensity: 1.0,
    },
    movingLights: {
      enabled: true,
      mode: 'auto',
      colorMode: 'multi',
      singleColor: '#ffffff',
      intensity: 5.0,
      speed: 1.0,
    },
    stageLights: {
      enabled: true,
      color: '#ffffff',
    },
    stageWash: {
      enabled: true,
      intensity: 5.0,
    },
    strobes: {
      enabled: true,
      intensity: 500,
      flashRate: 0.3,
    },
    blinders: {
      enabled: true,
      intensity: 0,
      mode: 'controlled',
    },
    crowd: {
      count: 500,
    },
    shaderWall: {
      enabled: true,
      scale: 2.0,
      rotationSpeed: 1.0,
      colorSpeed: 1.0,
      travelSpeed: 1.0,
      brightness: 2.0,
    },
    postProcessing: {
      bloom: true,
      bloomStrength: 0.5,
      bloomRadius: 0.8,
      bloomThreshold: 0.6,
    },
    camera: {
      cinematicMode: false,
    },
    hemisphereIntensity: 1.0,
    ambientIntensity: 0.2,
    debug: false,
  };
}
