import type { VizBlendMode, VizLayerTransform } from '@viz-engine/contracts';

export interface HumanSignalLayerDirection {
  id: string;
  role: string;
  componentId: string;
  compositor: {
    order: number;
    blendMode: VizBlendMode;
    baselineOpacity: number;
    transform: VizLayerTransform;
  };
  activeRanges: Array<{
    localFrameStart: number;
    localFrameEndExclusive: number;
  }>;
  baselineSettings: Record<string, unknown>;
  authoringPresetId: string | null;
}

// Approved treatment projection; executable cue/graph semantics belong to the
// reusable engine. Tests bind this authored data to the immutable Gate 1 input.
const direction = {
  music: {
    trackId: 'hiphop-808-rap',
    windowId: 'hiphop-808-rap-f135-d2880',
    sourcePath: 'public/music/[HipHop] 808 Rap.mp3',
    sourceContentIdentity:
      'sha256:f3c72436ec15e5e5c4fafb11be8f0085dd2b64f58c848b349085a7de7931341d',
    decodedPcmContentIdentity:
      'sha256:d6f3d8415fa600a6a189838c0d61b800c326f7aa03a2a2d678191f2436e10fbb',
    durationSeconds: 48,
    timelineFps: 60,
    sampleRate: 48000,
    local: {
      frameStart: 0,
      frameEndExclusive: 2880,
      sampleStart: 0,
      sampleEndExclusive: 2304000,
    },
    source: {
      frameStart: 135,
      frameEndExclusive: 3015,
      sampleStart: 108000,
      sampleEndExclusive: 2412000,
    },
    futureMaterialization: {
      status: 'planned-not-created',
      derivedAudio:
        'Create a content-pinned 48-second production audio asset through existing asset/action owners after Gate 1.',
      bake: 'Create the standard audio-feature artifact through the existing bake/session owners after Gate 1.',
    },
  },
  acts: [
    {
      id: 'act-1-threshold-and-restraint',
      title: 'Threshold and restraint',
      range: {
        localFrameStart: 0,
        localFrameEndExclusive: 405,
      },
      emotionalIntent: 'intimacy and anticipation',
      densityIntent: 'sparse',
      evidenceRef: 'musical-map:act-1-threshold-and-restraint',
    },
    {
      id: 'act-2-first-full-statement',
      title: 'First full statement',
      range: {
        localFrameStart: 405,
        localFrameEndExclusive: 1125,
      },
      emotionalIntent: 'arrival and confidence',
      densityIntent: 'stable-medium',
      evidenceRef: 'musical-map:act-2-first-full-statement',
    },
    {
      id: 'act-3-contrast-and-rebuild',
      title: 'Contrast and rebuild',
      range: {
        localFrameStart: 1125,
        localFrameEndExclusive: 1605,
      },
      emotionalIntent: 'fracture and rebuild',
      densityIntent: 'contracted-then-rising',
      evidenceRef: 'musical-map:act-3-contrast-and-rebuild',
    },
    {
      id: 'act-4-suspended-evolution',
      title: 'Suspended evolution',
      range: {
        localFrameStart: 1605,
        localFrameEndExclusive: 2205,
      },
      emotionalIntent: 'suspended transformation',
      densityIntent: 'layered-but-reserved',
      evidenceRef: 'musical-map:act-4-suspended-evolution',
    },
    {
      id: 'act-5-final-statement-and-release',
      title: 'Final statement and release',
      range: {
        localFrameStart: 2205,
        localFrameEndExclusive: 2880,
      },
      emotionalIntent: 'collective peak and release',
      densityIntent: 'dense-then-released',
      evidenceRef: 'musical-map:act-5-final-statement-and-release',
    },
  ],
  transitions: [
    {
      id: 'transition-1',
      range: {
        localFrameStart: 360,
        localFrameEndExclusive: 450,
      },
      centerLocalFrame: 405,
      reviewFrames: {
        pre: 375,
        midpoint: 405,
        post: 435,
      },
      evidenceRef: 'musical-map:section-02',
    },
    {
      id: 'transition-2',
      range: {
        localFrameStart: 1080,
        localFrameEndExclusive: 1170,
      },
      centerLocalFrame: 1125,
      reviewFrames: {
        pre: 1095,
        midpoint: 1125,
        post: 1155,
      },
      evidenceRef: 'musical-map:section-03',
    },
    {
      id: 'transition-3',
      range: {
        localFrameStart: 1560,
        localFrameEndExclusive: 1650,
      },
      centerLocalFrame: 1605,
      reviewFrames: {
        pre: 1575,
        midpoint: 1605,
        post: 1635,
      },
      evidenceRef: 'musical-map:section-04',
    },
    {
      id: 'transition-4',
      range: {
        localFrameStart: 2160,
        localFrameEndExclusive: 2250,
      },
      centerLocalFrame: 2205,
      reviewFrames: {
        pre: 2175,
        midpoint: 2205,
        post: 2235,
      },
      evidenceRef: 'musical-map:section-05',
    },
  ],
  energyTargets: {
    primaryRestraint: {
      range: {
        localFrameStart: 225,
        localFrameEndExclusive: 285,
      },
      reviewFrame: 255,
      loudness: 0.39415,
    },
    primaryPeak: {
      range: {
        localFrameStart: 2625,
        localFrameEndExclusive: 2685,
      },
      motionContext: {
        localFrameStart: 2580,
        localFrameEndExclusive: 2730,
      },
      reviewFrame: 2655,
      loudness: 0.837235,
    },
    release: {
      range: {
        localFrameStart: 2745,
        localFrameEndExclusive: 2880,
      },
      reviewFrame: 2835,
    },
  },
  graphs: [
    {
      id: 'graph-stage-performance',
      responsibility:
        'Detail lighting energy inside the human anchor while all absolute-time rates stay fixed.',
      timescales: ['detail', 'phrase'],
      outputs: [
        {
          name: 'beamIntensity',
          type: 'number',
          consumer: 'layer-human-stage:beams.intensity',
          intent: 'Smoothed bass/kick amplitude.',
        },
        {
          name: 'wallBrightness',
          type: 'number',
          consumer: 'layer-human-stage:shaderWall.brightness',
          intent: 'Bounded kick exposure.',
        },
        {
          name: 'stageLightColor',
          type: 'color',
          consumer: 'layer-human-stage:stageLights.color',
          intent: 'Slow spectral hue family.',
        },
      ],
      presetRefs: [
        'kick-bass-smooth-intensity',
        'shader-wall-kick-flash',
        'spectral-centroid-hue',
      ],
      nodeTypeRefs: [
        'Input',
        'Multi-Band Analysis',
        'Envelope Follower',
        'HSL Color',
        'Output',
      ],
    },
    {
      id: 'graph-world-field',
      responsibility:
        'Detail/phrase amplitude for the persistent shader field without modulating speed.',
      timescales: ['detail', 'phrase'],
      outputs: [
        {
          name: 'fieldIntensity',
          type: 'number',
          consumer: 'layer-void-field:intensity',
          intent: 'Restrained loudness envelope.',
        },
        {
          name: 'fieldScale',
          type: 'number',
          consumer: 'layer-void-field:scale',
          intent: 'Phrase-scale breathing.',
        },
      ],
      presetRefs: ['bass-adaptive'],
      nodeTypeRefs: [
        'Input',
        'Average Volume',
        'Adaptive Normalize (Quantile)',
        'multiply',
        'add',
        'Output',
      ],
    },
    {
      id: 'graph-signal-architecture',
      responsibility:
        'Transient and phrase response for tunnel/idol amplitude, form, and color.',
      timescales: ['detail', 'phrase'],
      outputs: [
        {
          name: 'tunnelImpact',
          type: 'boolean',
          consumer: 'layer-signal-tunnel:wave.triggerWave',
          intent: 'Refractory kick trigger.',
        },
        {
          name: 'idolEmissive',
          type: 'number',
          consumer: 'layer-signal-idol:glowIntensity',
          intent: 'Smoothed spectral energy.',
        },
      ],
      presetRefs: ['neural-fire-on-kick', 'bass-adaptive'],
      nodeTypeRefs: [
        'Input',
        'Spectral Flux',
        'Refractory Gate',
        'Envelope Follower',
        'Output',
      ],
    },
    {
      id: 'graph-atmosphere',
      responsibility:
        'Separate slow haze breathing from short impact spark bursts.',
      timescales: ['detail', 'phrase'],
      outputs: [
        {
          name: 'hazeSize',
          type: 'number',
          consumer: 'layer-atmospheric-haze:appearance.particleSize',
          intent:
            'Low-range sustained magnitude; emission, lifetime, velocity, and integration remain fixed.',
        },
        {
          name: 'sparkSize',
          type: 'number',
          consumer: 'layer-impact-sparks:appearance.particleSize',
          intent:
            'Bounded transient magnitude inside exact active ranges; particle integration remains fixed.',
        },
      ],
      presetRefs: ['bass-adaptive', 'kick-bass-smooth-intensity'],
      nodeTypeRefs: [
        'Input',
        'Multi-Band Analysis',
        'Adaptive Normalize (Quantile)',
        'Refractory Gate',
        'decay',
        'Output',
      ],
    },
    {
      id: 'graph-signal-horizon',
      responsibility: 'Readable 2D trace scale and color response.',
      timescales: ['detail'],
      outputs: [
        {
          name: 'horizonScale',
          type: 'number',
          consumer: 'layer-signal-horizon:appearance.scaleY',
          intent: 'Audio magnitude.',
        },
        {
          name: 'horizonColor',
          type: 'color',
          consumer: 'layer-signal-horizon:line.color',
          intent: 'Spectral cyan/magenta shift.',
        },
      ],
      presetRefs: ['bass-adaptive', 'spectral-centroid-hue'],
      nodeTypeRefs: [
        'Input',
        'Multi-Band Analysis',
        'Spectral Centroid',
        'HSL Color',
        'Output',
      ],
    },
    {
      id: 'graph-score-direction',
      responsibility:
        'Macro act/transition/peak/release direction from exact treatment cues.',
      timescales: ['macro', 'phrase'],
      outputs: [
        {
          name: 'actProgress',
          type: 'number',
          consumer: 'gap:GAP-01',
          intent: 'Named range-local progress.',
        },
        {
          name: 'transitionPulse',
          type: 'number',
          consumer: 'gap:GAP-01',
          intent: 'Deterministic authored transition envelope.',
        },
        {
          name: 'peakFlashStrength',
          type: 'number',
          consumer: 'layer-peak-flash:strength',
          intent:
            'GAP-01-gated 0..1 envelope inside the layer active ranges; zero elsewhere.',
        },
      ],
      presetRefs: [],
      nodeTypeRefs: ['graph-input', 'clamp', 'Output'],
    },
    {
      id: 'graph-compositor-choreography',
      responsibility:
        'Macro opacity/transform choreography from direction outputs.',
      timescales: ['macro', 'phrase'],
      outputs: [
        {
          name: 'layerOpacity',
          type: 'number',
          consumer: 'gap:GAP-02',
          intent: 'Frame-exact layer reveals and dissolves.',
        },
        {
          name: 'layerScale',
          type: 'number',
          consumer: 'gap:GAP-02',
          intent: 'Bounded compositor-scale transitions.',
        },
      ],
      presetRefs: [],
      nodeTypeRefs: ['graph-input', 'multiply', 'add', 'clamp', 'Output'],
    },
  ],
  layers: [
    {
      id: 'layer-void-field',
      role: 'Persistent void and perspective-grid foundation; never competes with the performers.',
      compositor: {
        order: 0,
        blendMode: 'normal',
        baselineOpacity: 0.72,
        transform: {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotationDegrees: 0,
          anchorX: 0.5,
          anchorY: 0.5,
        },
      },
      activeRanges: [
        {
          localFrameStart: 0,
          localFrameEndExclusive: 2880,
        },
      ],
      baselineSettings: {
        shader: 'Cyber Grid',
        color: '#6D4AFF',
        speed: 0.32,
        scale: 0.62,
        intensity: 0.7,
      },
      authoringPresetId: null,
      componentId: 'fullscreen-shader',
    },
    {
      id: 'layer-grain-veil',
      role: 'Low-opacity texture that binds otherwise independent compositor worlds.',
      compositor: {
        order: 1,
        blendMode: 'soft-light',
        baselineOpacity: 0.16,
        transform: {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotationDegrees: 0,
          anchorX: 0.5,
          anchorY: 0.5,
        },
      },
      activeRanges: [
        {
          localFrameStart: 0,
          localFrameEndExclusive: 2880,
        },
      ],
      baselineSettings: {},
      authoringPresetId: null,
      componentId: 'noise-shader',
    },
    {
      id: 'layer-human-stage',
      role: 'Primary human narrative, venue, lighting, and sole 48-second camera arc.',
      compositor: {
        order: 2,
        blendMode: 'normal',
        baselineOpacity: 1,
        transform: {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotationDegrees: 0,
          anchorX: 0.5,
          anchorY: 0.5,
        },
      },
      activeRanges: [
        {
          localFrameStart: 0,
          localFrameEndExclusive: 2880,
        },
      ],
      baselineSettings: {
        camera: {
          cinematicMode: true,
          cinematicPath: 'Panoramic Sweep',
          cinematicDuration: 48,
        },
        characters: {
          showDj: true,
          animationSpeed: 1,
          crowdCount: 420,
        },
        shaderWall: {
          enabled: true,
          rotationSpeed: 0.4,
          colorSpeed: 0.5,
          travelSpeed: 0.45,
        },
        strobes: {
          enabled: false,
        },
        blinders: {
          enabled: false,
        },
      },
      authoringPresetId: null,
      componentId: 'stage-scene',
    },
    {
      id: 'layer-signal-tunnel',
      role: 'Temporary procedural spatial architecture for the fracture and rebuild.',
      compositor: {
        order: 3,
        blendMode: 'screen',
        baselineOpacity: 0.54,
        transform: {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotationDegrees: 0,
          anchorX: 0.5,
          anchorY: 0.5,
        },
      },
      activeRanges: [
        {
          localFrameStart: 1080,
          localFrameEndExclusive: 1650,
        },
      ],
      baselineSettings: {
        appearance: {
          renderMode: 'Hollow',
          colorMode: 'Alternating',
          colorPalette: ['#32E6FF', '#FF3FB4'],
        },
      },
      authoringPresetId: null,
      componentId: 'light-tunnel',
    },
    {
      id: 'layer-signal-idol',
      role: 'Singular procedural totem that carries the suspended evolution.',
      compositor: {
        order: 4,
        blendMode: 'lighten',
        baselineOpacity: 0.62,
        transform: {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotationDegrees: 0,
          anchorX: 0.5,
          anchorY: 0.5,
        },
      },
      activeRanges: [
        {
          localFrameStart: 1560,
          localFrameEndExclusive: 2250,
        },
      ],
      baselineSettings: {
        animationSpeed: 0.08,
        glowIntensity: 1.2,
        morphT: 0.35,
      },
      authoringPresetId: null,
      componentId: 'morph-shapes',
    },
    {
      id: 'layer-atmospheric-haze',
      role: 'Slow continuous depth and atmosphere, deliberately absent during the heaviest middle transition.',
      compositor: {
        order: 5,
        blendMode: 'screen',
        baselineOpacity: 0.3,
        transform: {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotationDegrees: 0,
          anchorX: 0.5,
          anchorY: 0.5,
        },
      },
      activeRanges: [
        {
          localFrameStart: 0,
          localFrameEndExclusive: 1125,
        },
        {
          localFrameStart: 1650,
          localFrameEndExclusive: 2880,
        },
      ],
      baselineSettings: {
        appearance: {
          particleSize: 4.5,
        },
        physics: {
          emissionRate: 18,
          lifetime: 5,
          useGravity: false,
          initialSpeed: 0.15,
          spread: 0.8,
        },
      },
      authoringPresetId: null,
      componentId: 'particle-system',
    },
    {
      id: 'layer-impact-sparks',
      role: 'Short-lived, high-velocity transient punctuation distinct from atmospheric haze.',
      compositor: {
        order: 6,
        blendMode: 'add',
        baselineOpacity: 0.72,
        transform: {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotationDegrees: 0,
          anchorX: 0.5,
          anchorY: 0.5,
        },
      },
      activeRanges: [
        {
          localFrameStart: 390,
          localFrameEndExclusive: 420,
        },
        {
          localFrameStart: 1110,
          localFrameEndExclusive: 1140,
        },
        {
          localFrameStart: 1590,
          localFrameEndExclusive: 1620,
        },
        {
          localFrameStart: 2190,
          localFrameEndExclusive: 2220,
        },
        {
          localFrameStart: 2625,
          localFrameEndExclusive: 2685,
        },
      ],
      baselineSettings: {
        appearance: {
          particleSize: 2,
        },
        physics: {
          emissionRate: 180,
          lifetime: 0.55,
          useGravity: false,
          initialSpeed: 4.5,
          spread: 1,
        },
      },
      authoringPresetId: null,
      componentId: 'particle-system',
    },
    {
      id: 'layer-signal-horizon',
      role: 'Complementary two-dimensional music trace and horizon line.',
      compositor: {
        order: 7,
        blendMode: 'screen',
        baselineOpacity: 0.42,
        transform: {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotationDegrees: 0,
          anchorX: 0.5,
          anchorY: 0.5,
        },
      },
      activeRanges: [
        {
          localFrameStart: 0,
          localFrameEndExclusive: 2880,
        },
      ],
      baselineSettings: {
        appearance: {
          scaleY: 0.55,
        },
        line: {
          color: '#32E6FF',
          thickness: 2,
        },
      },
      authoringPresetId: 'neon',
      componentId: 'curve-spectrum',
    },
    {
      id: 'layer-peak-flash',
      role: 'Bounded exposure punctuation only at authored transitions and the primary energy peak.',
      compositor: {
        order: 8,
        blendMode: 'add',
        baselineOpacity: 1,
        transform: {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotationDegrees: 0,
          anchorX: 0.5,
          anchorY: 0.5,
        },
      },
      activeRanges: [
        {
          localFrameStart: 390,
          localFrameEndExclusive: 420,
        },
        {
          localFrameStart: 1110,
          localFrameEndExclusive: 1140,
        },
        {
          localFrameStart: 1590,
          localFrameEndExclusive: 1620,
        },
        {
          localFrameStart: 2190,
          localFrameEndExclusive: 2220,
        },
        {
          localFrameStart: 2625,
          localFrameEndExclusive: 2685,
        },
      ],
      baselineSettings: {
        mode: 'Manual',
        color: '#F4F7FF',
        strength: 0,
      },
      authoringPresetId: null,
      componentId: 'strobe-light',
    },
  ] satisfies HumanSignalLayerDirection[],
  models: [
    {
      path: 'public/models/stage/female-dj.fbx',
      contentIdentity:
        'sha256:87c7b85a746330c4423bf0598ae0356a9289299316030d46cf067f7fc9cd9c16',
      risk: null,
    },
    {
      path: 'public/models/stage/female-dancer.fbx',
      contentIdentity:
        'sha256:fd6847858a95d9de88e64d0c070b44e95b3c822bf3231ff347f2832dc9396479',
      risk: null,
    },
    {
      path: 'public/models/stage/male-dancer.fbx',
      contentIdentity:
        'sha256:c9cf2a023a282b391534e8a10a91092438def435d786e9d12309ef367eb43582',
      risk: null,
    },
    {
      path: 'public/models/stage/male-cheer.fbx',
      contentIdentity:
        'sha256:354aab94cf2a971baf58f4007ab0eecfa379126f1a11d421a56dd8f68ee3959b',
      risk: 'References an unavailable external normal map; certified browser loading retains the mesh, rig, authored clip, and base material with a non-fatal warning.',
    },
  ],
};

/** Independent authoring data, never a production-local runtime evaluator. */
export type HumanSignalDirection = Omit<typeof direction, 'layers'> & {
  layers: HumanSignalLayerDirection[];
};
export const createHumanSignalDirection = (): HumanSignalDirection =>
  structuredClone(direction);
