export type ColorMode = 'single' | 'multi';

export interface LaserConfig {
  enabled: boolean;
  mode: 'auto' | 0 | 1 | 2;
  colorMode: ColorMode;
  singleColor: string;
  rotationSpeed: number;
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
}

export interface BlinderConfig {
  enabled: boolean;
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
  shaderWall: boolean;

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
    },
    blinders: {
      enabled: true,
    },
    crowd: {
      count: 500,
    },
    shaderWall: true,
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
