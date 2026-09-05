import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';

const INPUT_PATH =
  'docs/parity/evidence/artifacts/2026-09-04-goal-five-authorized-input-inventory.json';
const CAPABILITY_PATH =
  'docs/parity/evidence/artifacts/2026-09-04-goal-five-capability-catalog.json';
const ANALYSIS_PATH =
  'docs/parity/evidence/artifacts/2026-09-04-goal-five-music-window-analysis.json';
const MAP_PATH =
  'docs/parity/evidence/artifacts/2026-09-05-goal-five-frame-exact-musical-map.json';
const MANIFEST_PATH =
  'docs/parity/evidence/artifacts/2026-09-05-goal-five-production-treatment-manifest.json';
const DOCUMENT_PATH =
  'docs/plans/v2/goal-five-flagship-production-treatment.md';

const UPSTREAM = {
  inputInventory:
    'sha256:d16b54aafac465326d867e2931647f49c90c07b9785c8d692642d69dd22c705d',
  capabilityCatalog:
    'sha256:b1fcf990b8d45f4524f4051e16a5823dd46744f87db7b9c8b0f35b31606bff1e',
  musicAnalysis:
    'sha256:e94ef2932f0ddd28f730711111e14d6d35ff952bc3328905f1e89dd6bb6657cc',
  musicalMap:
    'sha256:164395d23891a091d9374c48d3462c9b30ee8ac4aac4ac4c6dfe68f700568a55',
} as const;

const PHASE_UNSAFE_GRAPH_CONSUMERS = new Set([
  'layer-void-field:speed',
  'layer-grain-veil:animation.speed',
  'layer-grain-veil:animation.flowX',
  'layer-grain-veil:animation.flowY',
  'layer-grain-veil:animation.rotationSpeed',
  'layer-grain-veil:color.hueShift',
  'layer-human-stage:camera.moveSpeed',
  'layer-human-stage:camera.lookSpeed',
  'layer-human-stage:camera.cinematicDuration',
  'layer-human-stage:camera.cinematicLerpSpeed',
  'layer-human-stage:shaderWall.rotationSpeed',
  'layer-human-stage:shaderWall.colorSpeed',
  'layer-human-stage:shaderWall.travelSpeed',
  'layer-human-stage:lasers.rotationSpeed',
  'layer-human-stage:movingLights.speed',
  'layer-human-stage:strobes.flashRate',
  'layer-human-stage:characters.animationSpeed',
  'layer-signal-tunnel:lighting.lightRotationSpeed',
  'layer-signal-tunnel:animation.tunnelSpeed',
  'layer-signal-tunnel:animation.rotationSpeed',
  'layer-signal-tunnel:wave.waveSpeed',
  'layer-signal-tunnel:wave.waveDuration',
  'layer-signal-idol:animationSpeed',
  'layer-signal-idol:rotation.speed',
  'layer-atmospheric-haze:physics.emissionRate',
  'layer-atmospheric-haze:physics.lifetime',
  'layer-atmospheric-haze:physics.useGravity',
  'layer-atmospheric-haze:physics.gravityStrength',
  'layer-atmospheric-haze:physics.initialSpeed',
  'layer-atmospheric-haze:physics.spread',
  'layer-atmospheric-haze:emission.emitterSize',
  'layer-atmospheric-haze:rotation.rotationSpeedX',
  'layer-atmospheric-haze:rotation.rotationSpeedY',
  'layer-atmospheric-haze:rotation.rotationSpeedZ',
  'layer-impact-sparks:physics.emissionRate',
  'layer-impact-sparks:physics.lifetime',
  'layer-impact-sparks:physics.useGravity',
  'layer-impact-sparks:physics.gravityStrength',
  'layer-impact-sparks:physics.initialSpeed',
  'layer-impact-sparks:physics.spread',
  'layer-impact-sparks:emission.emitterSize',
  'layer-impact-sparks:rotation.rotationSpeedX',
  'layer-impact-sparks:rotation.rotationSpeedY',
  'layer-impact-sparks:rotation.rotationSpeedZ',
  'layer-peak-flash:intensity',
  'layer-peak-flash:flashRate',
]);

type Inputs = {
  inventory: any;
  catalog: any;
  analysis: any;
  map: any;
};

export type ProductionTreatment = ReturnType<typeof buildProductionTreatment>;

function sha256(contents: string | Buffer): string {
  return `sha256:${createHash('sha256').update(contents).digest('hex')}`;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function range(start: number, end: number) {
  return { localFrameStart: start, localFrameEndExclusive: end };
}

const identityTransform = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotationDegrees: 0,
  anchorX: 0.5,
  anchorY: 0.5,
};

function judgment() {
  return {
    status: 'proposed-pending-gate-1',
    confidence: 'human-required',
  } as const;
}

export function buildProductionTreatment(
  inputs: Inputs,
  generatorContentIdentity = 'sha256:test-generator',
) {
  const { inventory, catalog, analysis, map } = inputs;
  const selectedWindow = analysis.tracks
    .flatMap((track: any) =>
      track.candidateWindows.map((window: any) => ({ track, window })),
    )
    .find(({ window }: any) => window.id === 'hiphop-808-rap-f135-d2880');
  assert(selectedWindow, 'Selected music window is absent from P1-03.');

  const sourceModels = [
    'public/models/stage/female-dj.fbx',
    'public/models/stage/female-dancer.fbx',
    'public/models/stage/male-dancer.fbx',
    'public/models/stage/male-cheer.fbx',
  ].map((path) => {
    const entry = inventory.entries.find(
      (candidate: any) => candidate.path === path,
    );
    assert(entry, `Missing authorized model ${path}.`);
    return {
      path,
      contentIdentity: entry.contentIdentity,
      authority: entry.authority,
      usage:
        'Loaded by the single Stage Scene layer through its existing model pipeline.',
      risk: entry.issues?.[0] ?? null,
    };
  });

  const layer = (
    id: string,
    componentId: string,
    role: string,
    order: number,
    blendMode: string,
    opacity: number,
    activeRanges: ReturnType<typeof range>[],
    reviewFrames: number[],
    visibleContribution: string,
    settings: Record<string, unknown>,
    authoringPresetId: string | null = null,
  ) => {
    const component = catalog.components.find(
      (candidate: any) => candidate.id === componentId,
    );
    assert(component, `Missing component ${componentId}.`);
    return {
      id,
      component: {
        id: componentId,
        implementationVersion: component.implementationVersion,
        classification: component.classification,
        hostAvailability: component.hostAvailability,
      },
      role,
      compositor: {
        order,
        blendMode,
        baselineOpacity: opacity,
        transform: identityTransform,
      },
      activeRanges,
      reviewFrames,
      visibleContribution,
      baselineSettings: settings,
      authoringPresetId,
      judgment: judgment(),
    };
  };

  const layers = [
    layer(
      'layer-void-field',
      'fullscreen-shader',
      'Persistent void and perspective-grid foundation; never competes with the performers.',
      0,
      'normal',
      0.72,
      [range(0, 2880)],
      [60, 780, 1395, 1905, 2655],
      'A charcoal Cyber Grid with ultraviolet/cyan horizon structure remains readable in negative space.',
      {
        shader: 'Cyber Grid',
        color: '#6D4AFF',
        speed: 0.32,
        scale: 0.62,
        intensity: 0.7,
      },
    ),
    layer(
      'layer-grain-veil',
      'noise-shader',
      'Low-opacity texture that binds otherwise independent compositor worlds.',
      1,
      'soft-light',
      0.16,
      [range(0, 2880)],
      [255, 1155, 2175, 2835],
      'Fine dark grain prevents pristine CG separation without hiding silhouettes.',
      {},
    ),
    layer(
      'layer-human-stage',
      'stage-scene',
      'Primary human narrative, venue, lighting, and sole 48-second camera arc.',
      2,
      'normal',
      1,
      [range(0, 2880)],
      [60, 375, 435, 780, 1095, 1155, 1575, 1635, 2175, 2235, 2655, 2835],
      'Grounded DJ and crowd remain the visual subject while lighting and framing reveal scale over five acts.',
      {
        camera: {
          cinematicMode: true,
          cinematicPath: 'Panoramic Sweep',
          cinematicDuration: 48,
        },
        characters: { showDj: true, animationSpeed: 1, crowdCount: 420 },
        shaderWall: {
          enabled: true,
          rotationSpeed: 0.4,
          colorSpeed: 0.5,
          travelSpeed: 0.45,
        },
        strobes: { enabled: false },
        blinders: { enabled: false },
      },
    ),
    layer(
      'layer-signal-tunnel',
      'light-tunnel',
      'Temporary procedural spatial architecture for the fracture and rebuild.',
      3,
      'screen',
      0.54,
      [range(1080, 1650)],
      [1095, 1155, 1395, 1575, 1635],
      'A cyan/magenta tunnel briefly encloses the stage image, then dissolves before the suspended act settles.',
      {
        appearance: {
          renderMode: 'Hollow',
          colorMode: 'Alternating',
          colorPalette: ['#32E6FF', '#FF3FB4'],
        },
      },
    ),
    layer(
      'layer-signal-idol',
      'morph-shapes',
      'Singular procedural totem that carries the suspended evolution.',
      4,
      'lighten',
      0.62,
      [range(1560, 2250)],
      [1575, 1635, 1905, 2175, 2235],
      'One ultraviolet-to-amber morphing form occupies negative space without replacing the human anchor.',
      { animationSpeed: 0.08, glowIntensity: 1.2, morphT: 0.35 },
    ),
    layer(
      'layer-atmospheric-haze',
      'particle-system',
      'Slow continuous depth and atmosphere, deliberately absent during the heaviest middle transition.',
      5,
      'screen',
      0.3,
      [range(0, 1125), range(1650, 2880)],
      [255, 780, 1905, 2655, 2835],
      'Sparse cyan/amber motes drift slowly enough to establish depth rather than read as impacts.',
      {
        appearance: { particleSize: 4.5 },
        physics: {
          emissionRate: 18,
          lifetime: 5,
          useGravity: false,
          initialSpeed: 0.15,
          spread: 0.8,
        },
      },
    ),
    layer(
      'layer-impact-sparks',
      'particle-system',
      'Short-lived, high-velocity transient punctuation distinct from atmospheric haze.',
      6,
      'add',
      0.72,
      [
        range(390, 420),
        range(1110, 1140),
        range(1590, 1620),
        range(2190, 2220),
        range(2625, 2685),
      ],
      [405, 1125, 1605, 2205, 2655],
      'Brief magenta/cyan spark bursts expose selected impacts without creating a permanent particle field.',
      {
        appearance: { particleSize: 2 },
        physics: {
          emissionRate: 180,
          lifetime: 0.55,
          useGravity: false,
          initialSpeed: 4.5,
          spread: 1,
        },
      },
    ),
    layer(
      'layer-signal-horizon',
      'curve-spectrum',
      'Complementary two-dimensional music trace and horizon line.',
      7,
      'screen',
      0.42,
      [range(0, 2880)],
      [60, 255, 780, 1395, 1905, 2655, 2835],
      'A thin cyan/magenta curve sits low in frame, proving readable 2D graphic language beside Three scenes.',
      {
        appearance: { scaleY: 0.55 },
        line: { color: '#32E6FF', thickness: 2 },
      },
      'neon',
    ),
    layer(
      'layer-peak-flash',
      'strobe-light',
      'Bounded exposure punctuation only at authored transitions and the primary energy peak.',
      8,
      'add',
      1,
      [
        range(390, 420),
        range(1110, 1140),
        range(1590, 1620),
        range(2190, 2220),
        range(2625, 2685),
      ],
      [405, 1125, 1605, 2205, 2655],
      'Sub-frame-feeling white accents remain short, noncontinuous, and never replace stage lighting.',
      { mode: 'Manual', color: '#F4F7FF', strength: 0 },
    ),
  ];

  const graph = (
    id: string,
    responsibility: string,
    timescales: string[],
    outputs: Array<Record<string, unknown>>,
    presetRefs: string[],
    nodeTypeRefs: string[],
  ) => ({ id, responsibility, timescales, outputs, presetRefs, nodeTypeRefs });

  const graphs = [
    graph(
      'graph-stage-performance',
      'Detail lighting energy inside the human anchor while all absolute-time rates stay fixed.',
      ['detail', 'phrase'],
      [
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
      [
        'kick-bass-smooth-intensity',
        'shader-wall-kick-flash',
        'spectral-centroid-hue',
      ],
      [
        'Input',
        'Multi-Band Analysis',
        'Envelope Follower',
        'HSL Color',
        'Output',
      ],
    ),
    graph(
      'graph-world-field',
      'Detail/phrase amplitude for the persistent shader field without modulating speed.',
      ['detail', 'phrase'],
      [
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
      ['bass-adaptive'],
      [
        'Input',
        'Average Volume',
        'Adaptive Normalize (Quantile)',
        'multiply',
        'add',
        'Output',
      ],
    ),
    graph(
      'graph-signal-architecture',
      'Transient and phrase response for tunnel/idol amplitude, form, and color.',
      ['detail', 'phrase'],
      [
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
      ['neural-fire-on-kick', 'bass-adaptive'],
      [
        'Input',
        'Spectral Flux',
        'Refractory Gate',
        'Envelope Follower',
        'Output',
      ],
    ),
    graph(
      'graph-atmosphere',
      'Separate slow haze breathing from short impact spark bursts.',
      ['detail', 'phrase'],
      [
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
      ['bass-adaptive', 'kick-bass-smooth-intensity'],
      [
        'Input',
        'Multi-Band Analysis',
        'Adaptive Normalize (Quantile)',
        'Refractory Gate',
        'decay',
        'Output',
      ],
    ),
    graph(
      'graph-signal-horizon',
      'Readable 2D trace scale and color response.',
      ['detail'],
      [
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
      ['bass-adaptive', 'spectral-centroid-hue'],
      [
        'Input',
        'Multi-Band Analysis',
        'Spectral Centroid',
        'HSL Color',
        'Output',
      ],
    ),
    graph(
      'graph-score-direction',
      'Macro act/transition/peak/release direction from exact treatment cues.',
      ['macro', 'phrase'],
      [
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
      [],
      ['graph-input', 'clamp', 'Output'],
    ),
    graph(
      'graph-compositor-choreography',
      'Macro opacity/transform choreography from direction outputs.',
      ['macro', 'phrase'],
      [
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
      [],
      ['graph-input', 'multiply', 'add', 'clamp', 'Output'],
    ),
  ];

  const gaps = [
    {
      id: 'GAP-01',
      title: 'Portable macro direction and named cue contract',
      currentEvidence:
        'P1-02 records no reusable treatment direction contract; P1-04 provides evidence ranges but no project/runtime input.',
      smallestReusableChange:
        'Add portable named frame ranges, range-local progress, and cue values to contracts/actions/runtime/editor/CLI inspection; consume them as ordinary graph inputs.',
      canonicalOwners: [
        '@viz-engine/contracts',
        '@viz-engine/actions',
        '@viz-engine/runtime',
        '@viz-engine/editor-session',
        '@viz-engine/dev-cli',
        'Studio composition root',
      ],
      forbiddenOwners: [
        'production components',
        'React-only state',
        'transport side channels',
        'hard-coded flagship frame checks',
      ],
      unlocks: [
        'graph-score-direction',
        'graph-compositor-choreography',
        'scalable act/transition authoring',
      ],
      acceptance:
        'Direct playback, sequential playback, and arbitrary seek resolve the same named range/progress/cue values at the same frame.',
      withoutGap:
        'Phase 2 may build a fixed-setting whole-window skeleton, but cannot claim scalable authored macro direction.',
    },
    {
      id: 'GAP-02',
      title: 'Graph-driven compositor opacity and transform modulation',
      currentEvidence:
        'P1-02 records static layer opacity/transform with no graph-owned resolved compositor values.',
      smallestReusableChange:
        'Resolve graph-driven opacity and transform values in the canonical compositor plan with actions, editor authoring, session inspection, and render parity.',
      canonicalOwners: [
        '@viz-engine/contracts',
        '@viz-engine/runtime',
        '@viz-engine/renderer-three',
        '@viz-engine/actions',
        '@viz-engine/editor-session',
      ],
      forbiddenOwners: [
        'component settings',
        'production pack magic',
        'React animation state',
        'renderer-specific hidden interpolation',
      ],
      unlocks: [
        'graph-compositor-choreography',
        'authored cross-layer reveals and transitions',
      ],
      acceptance:
        'Preview, still, browser bundle, and final render expose identical resolved layer opacity/transform at every inspected frame.',
      withoutGap:
        'Phase 2 may hard-cut or use static layer ranges, but cannot approve the intended transition language.',
    },
    {
      id: 'GAP-03',
      title: 'Canonical full-fidelity product CLI host composition',
      currentEvidence:
        'P1-02 proves Studio/browser full fidelity while local product-CLI rendering omits the selected advanced Three components.',
      smallestReusableChange:
        'Extract one explicit capability/renderer composition root shared by Studio and product CLI so advanced Three components are never silently omitted.',
      canonicalOwners: [
        '@viz-engine/components-core',
        'renderer attachments',
        'Studio composition root',
        '@viz-engine/renderer-three',
        '@viz-engine/dev-cli',
      ],
      forbiddenOwners: [
        'maintainer CLI',
        'test-only registry copies',
        'production-specific CLI branches',
      ],
      unlocks: ['canonical headless full-fidelity authoring and rendering'],
      acceptance:
        'The same document produces the same capability availability and full-fidelity render plan in Studio and product CLI.',
      withoutGap:
        'The browser-bundle harness remains valid evidence, but standalone product-CLI full-fidelity parity is blocked.',
    },
  ];

  const reviewTargets = [
    [60, 'Opening identity and human silhouette'],
    [255, 'Primary lower-energy restraint opportunity'],
    [375, 'Transition 1 pre'],
    [435, 'Transition 1 post / full-system arrival'],
    [780, 'Act 2 stable statement'],
    [1095, 'Transition 2 pre'],
    [1155, 'Transition 2 post / tunnel fracture'],
    [1395, 'Act 3 rebuild'],
    [1575, 'Transition 3 pre'],
    [1635, 'Transition 3 post / idol handoff'],
    [1905, 'Act 4 suspended evolution'],
    [2175, 'Transition 4 pre'],
    [2235, 'Transition 4 post / final statement'],
    [2655, 'Primary energy peak and maximum intended layer stress'],
    [2835, 'Authored release and ending legibility'],
  ].map(([localFrame, purpose]) => ({ localFrame, purpose }));

  return {
    schemaVersion: 1,
    kind: 'viz-engine-goal-five-flagship-production-treatment',
    status: 'proposed-pending-gate-1',
    title: 'Human Signal',
    logline:
      'A 48-second club performance begins as intimate human presence, grows into a projected signal architecture, fractures into abstraction, and returns as a collective full-stage peak and release.',
    distinctness:
      'Unlike Signal Cathedral this is not a single custom procedural world; unlike Afterlight Assembly it is not a single Stage layer. Existing reusable components form a human-led, multi-layer compositor score.',
    identityScope: {
      generatorPath:
        'tools/foundation/author-goal-five-production-treatment.ts',
      generatorContentIdentity,
      outputManifestPath: MANIFEST_PATH,
      outputDocumentPath: DOCUMENT_PATH,
      upstream: [
        { path: INPUT_PATH, contentIdentity: UPSTREAM.inputInventory },
        { path: CAPABILITY_PATH, contentIdentity: UPSTREAM.capabilityCatalog },
        { path: ANALYSIS_PATH, contentIdentity: UPSTREAM.musicAnalysis },
        { path: MAP_PATH, contentIdentity: UPSTREAM.musicalMap },
      ],
    },
    ownership: {
      owner: 'tools/foundation/author-goal-five-production-treatment.ts',
      generatedOutputs: [MANIFEST_PATH, DOCUMENT_PATH],
      forbiddenDuplicateOwners: [
        'project defaults',
        'runtime/component implementations',
        'production-local magic',
        'React state',
        'independently maintained prose or JSON',
      ],
      boundary:
        'This owns proposed production direction and evidence only. It adds no runtime, project, graph, compositor, transport, UI, or component semantics.',
    },
    music: {
      trackId: 'hiphop-808-rap',
      windowId: selectedWindow.window.id,
      sourcePath: selectedWindow.track.source.path,
      sourceContentIdentity: selectedWindow.track.source.contentIdentity,
      decodedPcmContentIdentity:
        selectedWindow.track.decode.pcm.contentIdentity,
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
    creativeDirection: {
      emotionalArc: [
        'anticipation and intimacy',
        'arrival and confidence',
        'fracture and rebuild',
        'suspended transformation',
        'collective peak and release',
      ],
      visualHierarchy: [
        'human Stage subject',
        'signal architecture',
        'atmosphere and impacts',
        '2D music horizon',
        'bounded exposure punctuation',
      ],
      palette: [
        { name: 'void charcoal', hex: '#05060B', role: 'negative space' },
        { name: 'ultraviolet', hex: '#6D4AFF', role: 'architecture' },
        { name: 'electric cyan', hex: '#32E6FF', role: 'signal clarity' },
        { name: 'signal magenta', hex: '#FF3FB4', role: 'impact and contrast' },
        {
          name: 'human sodium amber',
          hex: '#FF9E3D',
          role: 'performer warmth',
        },
        {
          name: 'peak white',
          hex: '#F4F7FF',
          role: 'strictly bounded accents',
        },
      ],
      materialLanguage:
        'Glossy black venue surfaces, emissive wire/signal structures, translucent particle haze, grounded authored models, and one thin graphic spectrum line.',
      lighting:
        'Amber/cyan human keying leads; magenta is impact contrast; internal Stage strobes and blinders remain disabled; dedicated white accents are exact and short.',
      camera:
        'Stage Scene alone owns the primary Panoramic Sweep at fixed 48-second duration. Light Tunnel, Morph Shapes, and Particle System retain independent cameras and are compositor-joined projections, never represented as one shared world or shared occlusion space.',
      transitionLanguage:
        'Each exact P1-04 boundary changes hierarchy through bounded reveal/dissolve, color handoff, and one optional flash; no variable-speed time jump or arbitrary cut.',
      density:
        'Acts intentionally move sparse → stable → fractured → suspended → dense/released. Maximum intended simultaneous load is eight layers near frame 1605 and seven near frame 2655; this is a stress target, not a measured pass.',
      timescales: {
        macro:
          'Named acts, transitions, peak, and release control hierarchy and layer choreography.',
        phrase:
          'Phrase changes alter palette emphasis, framing weight, density, and form mix without resetting the act.',
        detail:
          'Smoothed energy and refractory transients modulate amplitude, intensity, color, and bounded triggers.',
      },
      temporalSafety:
        'Absolute-time speed/rate settings stay fixed. No graph output targets animation speed, camera cadence, shader travel/rotation speed, light motion speed, or particle integration rate unless a future consumer owns phase-continuous integration.',
      judgment: judgment(),
    },
    acts: map.acts.map((act: any, index: number) => ({
      id: act.id,
      title: act.title,
      range: {
        localFrameStart: act.range.localFrameStart,
        localFrameEndExclusive: act.range.localFrameEndExclusive,
      },
      emotionalIntent: [
        'intimacy and anticipation',
        'arrival and confidence',
        'fracture and rebuild',
        'suspended transformation',
        'collective peak and release',
      ][index],
      densityIntent: [
        'sparse',
        'stable-medium',
        'contracted-then-rising',
        'layered-but-reserved',
        'dense-then-released',
      ][index],
      evidenceRef: `musical-map:${act.id}`,
    })),
    transitions: map.transitions.map((transition: any) => ({
      id: transition.id,
      range: range(
        transition.localFrameStart,
        transition.localFrameEndExclusive,
      ),
      centerLocalFrame: transition.centerLocalFrame,
      reviewFrames: transition.reviewFrames,
      evidenceRef: `musical-map:${transition.evidenceRef}`,
    })),
    energyTargets: {
      primaryRestraint: {
        range: range(225, 285),
        reviewFrame: 255,
        loudness: 0.39415,
      },
      primaryPeak: {
        range: range(2625, 2685),
        motionContext: range(2580, 2730),
        reviewFrame: 2655,
        loudness: 0.837235,
      },
      release: { range: range(2745, 2880), reviewFrame: 2835 },
    },
    layers,
    models: sourceModels,
    graphs,
    breadth: {
      included: [
        {
          family: 'model-backed',
          refs: [
            'layer-human-stage',
            ...sourceModels.map((model) => model.path),
          ],
        },
        {
          family: 'procedural-spatial-3d',
          refs: ['layer-signal-tunnel', 'layer-signal-idol'],
        },
        { family: 'shader', refs: ['layer-void-field', 'layer-grain-veil'] },
        {
          family: 'particle-instancing',
          refs: ['layer-atmospheric-haze', 'layer-impact-sparks'],
        },
        { family: 'complementary-2d', refs: ['layer-signal-horizon'] },
        { family: 'camera', refs: ['layer-human-stage'] },
        { family: 'graph', refs: graphs.map((entry) => entry.id) },
        { family: 'compositor', refs: layers.map((entry) => entry.id) },
      ],
      exclusions: [
        {
          family: 'standalone-raster-image-video',
          reason:
            'P1-01 found no authorized standalone creative raster, image, texture, or video source.',
          evidenceRef: `${INPUT_PATH}#summary`,
          gate: 'Gate 1 must approve this evidence-based exclusion or explicitly authorize acquisition later.',
        },
        {
          family: 'shared-spatial-occlusion',
          reason:
            'The selected Three components are independent programs and the treatment intentionally uses compositor-space projection.',
          evidenceRef: `${CAPABILITY_PATH}#threePrograms`,
          gate: 'A later shared-world request is a new reusable gap, not a hidden treatment assumption.',
        },
      ],
    },
    gaps,
    conditionalObservation:
      'Only if the real seven-graph workload makes current runtime attribution insufficient, open a separate named multi-graph usage/cost sensor gap; do not build a speculative sensor framework in advance.',
    alternatives: [
      {
        id: 'alternative-stage-only',
        disposition: 'rejected',
        reason:
          'Preserves model quality but repeats Afterlight and cannot prove multi-layer/compositor breadth.',
      },
      {
        id: 'alternative-procedural-monolith',
        disposition: 'rejected',
        reason:
          'Could look coherent but repeats Signal Cathedral and creates production-local component leakage.',
      },
      {
        id: 'alternative-shared-three-world',
        disposition: 'rejected',
        reason:
          'Falsely assumes existing independent Three programs share a camera, depth, and occlusion contract.',
      },
      {
        id: 'alternative-human-signal',
        disposition: 'preferred-pending-gate-1',
        reason:
          'Uses existing reusable breadth while keeping human performers primary and gaps small and canonical.',
      },
    ],
    review: {
      stillFrames: reviewTargets,
      motionWindows: [
        ...map.transitions.map((transition: any) => ({
          id: transition.id,
          range: range(
            transition.localFrameStart,
            transition.localFrameEndExclusive,
          ),
        })),
        { id: 'primary-peak-context', range: range(2580, 2730) },
        { id: 'release', range: range(2745, 2880) },
      ],
      phaseTwoStrategy:
        'First materialize a low-detail full-window skeleton; then raise Act 5 [2205,2880) as the 11.25-second representative-quality prototype because it contains transition 4, the primary peak, and release.',
      humanQuestions: [
        'Is this the intended track and exact window?',
        'Does the five-act emotional arc feel musically true?',
        'Is Human Signal distinct and aesthetically coherent rather than a capability sampler?',
        'Are palette, material language, fixed Panoramic Sweep, and layer hierarchy right?',
        'Are all four performers worth retaining and visually grounded?',
        'Is the raster/image/video exclusion acceptable?',
        'Are GAP-01 through GAP-03 worth implementing as defined?',
      ],
    },
    performance: {
      status: 'targets-not-measured-passes',
      preview: {
        displayedFpsMin: 58,
        displayIntervalP95MsMax: 20,
        framesOver33_33MsPercentMax: 1,
        framesOver100MsMax: 0,
        runtimePlanningP95MsMax: 5,
        runtimeCpuP95MsMax: 12,
        graphOpenRegressionPercentMax: 10,
      },
      interaction: {
        pointerTransientP95MsMax: 1,
        pointerVisibleP95MsMax: 32,
        movementRevisionCount: 0,
        releaseRevisionCount: 1,
      },
      seek: {
        p95MsMax: 100,
        maxMs: 250,
        repetitions: 6,
        targetErrorSamplesAfter100MsMax: 1,
      },
      finalRender: {
        width: 1920,
        height: 1080,
        fps: 60,
        video: 'H.264',
        audio: 'AAC',
        quality: 2,
        encodedFpsMin: 5,
        wallClockMediaDurationMultipleMax: 12,
      },
      lifecycle: {
        cycles: 6,
        forcedGcHeapGrowthMiBMax: 16,
        finalDisplayP95InitialRatioMax: 1.1,
        monotonicResourceGrowthAllowed: false,
      },
      mediaSanity: {
        blackOrClippedWhiteSecondsThreshold: 0.5,
        freezeSecondsThreshold: 1,
        silenceDbfsThreshold: -60,
        silenceSecondsThreshold: 1,
        exceptionPolicy: 'Only treatment-approved exact intervals may pass.',
      },
      decodedEquivalence: {
        ssimMin: 0.995,
        normalizedMeanAbsoluteErrorMax: 0.006,
        avDriftFramesMax: 1,
      },
      stressFrames: [
        {
          localFrame: 1605,
          intendedSimultaneousLayerCount: 8,
          note: 'Middle transition maximum; haze absent.',
        },
        {
          localFrame: 2655,
          intendedSimultaneousLayerCount: 7,
          note: 'Primary peak; tunnel and idol absent.',
        },
      ],
    },
    risks: [
      {
        id: 'risk-capability-sampler',
        mitigation:
          'Human Stage remains primary; every secondary layer has a unique act role and explicit review contribution.',
      },
      {
        id: 'risk-overdraw-and-independent-three-cost',
        mitigation:
          'Bound active ranges, name stress frames, measure before approval, and remove redundant contribution rather than lower quality silently.',
      },
      {
        id: 'risk-temporal-jumps',
        mitigation:
          'Keep absolute-time rates fixed and reject raw variable-rate graph bindings.',
      },
      {
        id: 'risk-white-clipping',
        mitigation:
          'Disable internal Stage strobes/blinders and confine peak white to exact short Manual strobe ranges.',
      },
      {
        id: 'risk-model-material',
        mitigation:
          'Retain male-cheer missing-normal-map warning as a visual review target; do not claim clean asset provenance.',
      },
      {
        id: 'risk-host-parity',
        mitigation:
          'Use existing full-fidelity browser-bundle evidence until GAP-03 closes; never claim current local CLI renders advanced Three layers.',
      },
    ],
    forbiddenLeakage: [
      'No flagship frame numbers or act names inside reusable components or runtime evaluators.',
      'No production-only React store, transport field, hidden compositor branch, copied registry, or CLI special case.',
      'No generic model/facial/speech/root-motion system without a named criterion and authorized asset need.',
      'No automated wording that converts proposed aesthetic judgment into approval.',
    ],
    humanBoundary: {
      gate: 'Gate 1',
      automatedEvidenceCanProve: [
        'identity and range consistency',
        'capability/asset/node/preset existence',
        'host limitations',
        'reference/type/coverage completeness',
        'document/manifest derivation',
      ],
      humanOnly: [
        'track/window approval',
        'musical and emotional truth',
        'aesthetic distinctness',
        'palette/material/camera taste',
        'layer legibility and nonredundancy',
        'performer value and grounding',
        'exclusion approval',
        'gap value',
      ],
      authority:
        'No automated check approves the treatment. Gate 1 must explicitly approve or correct it before aesthetic implementation.',
    },
  };
}

export function validateProductionTreatment(
  treatment: ProductionTreatment,
  inputs: Inputs,
  expected?: ProductionTreatment,
): void {
  assert(
    treatment.status === 'proposed-pending-gate-1',
    'Treatment must remain pending Gate 1.',
  );
  assert(
    treatment.music.windowId === 'hiphop-808-rap-f135-d2880',
    'Music window identity drifted.',
  );
  assert(
    treatment.music.trackId === 'hiphop-808-rap' &&
      treatment.music.sourcePath === 'public/music/[HipHop] 808 Rap.mp3' &&
      treatment.music.durationSeconds === 48 &&
      treatment.music.timelineFps === 60 &&
      treatment.music.sampleRate === 48000,
    'Complete selected music identity tuple drifted.',
  );
  assert(
    treatment.music.sourceContentIdentity ===
      'sha256:f3c72436ec15e5e5c4fafb11be8f0085dd2b64f58c848b349085a7de7931341d',
    'Music source identity drifted.',
  );
  assert(
    treatment.music.decodedPcmContentIdentity ===
      'sha256:d6f3d8415fa600a6a189838c0d61b800c326f7aa03a2a2d678191f2436e10fbb',
    'PCM identity drifted.',
  );
  assert(
    JSON.stringify(treatment.music.local) ===
      JSON.stringify({
        frameStart: 0,
        frameEndExclusive: 2880,
        sampleStart: 0,
        sampleEndExclusive: 2304000,
      }) &&
      JSON.stringify(treatment.music.source) ===
        JSON.stringify({
          frameStart: 135,
          frameEndExclusive: 3015,
          sampleStart: 108000,
          sampleEndExclusive: 2412000,
        }),
    'Music coordinate contract drifted.',
  );
  assert(
    treatment.acts.length === 5 && treatment.transitions.length === 4,
    'Treatment must preserve five acts and four transitions.',
  );
  assert(
    JSON.stringify(
      treatment.acts.map(({ id, range }: any) => [
        id,
        range.localFrameStart,
        range.localFrameEndExclusive,
      ]),
    ) ===
      JSON.stringify([
        ['act-1-threshold-and-restraint', 0, 405],
        ['act-2-first-full-statement', 405, 1125],
        ['act-3-contrast-and-rebuild', 1125, 1605],
        ['act-4-suspended-evolution', 1605, 2205],
        ['act-5-final-statement-and-release', 2205, 2880],
      ]),
    'Exact act identities or ranges drifted.',
  );
  assert(
    JSON.stringify(
      treatment.transitions.map(
        ({ id, range: transitionRange, centerLocalFrame }: any) => [
          id,
          transitionRange.localFrameStart,
          centerLocalFrame,
          transitionRange.localFrameEndExclusive,
        ],
      ),
    ) ===
      JSON.stringify([
        ['transition-1', 360, 405, 450],
        ['transition-2', 1080, 1125, 1170],
        ['transition-3', 1560, 1605, 1650],
        ['transition-4', 2160, 2205, 2250],
      ]),
    'Exact transition identities or ranges drifted.',
  );
  assert(
    treatment.layers.length >= 8 && treatment.layers.length <= 12,
    'Treatment requires 8–12 meaningful layers.',
  );
  assert(
    new Set(treatment.layers.map(({ role }) => role)).size ===
      treatment.layers.length,
    'Every layer requires a unique responsibility.',
  );
  const layerIds = new Set(treatment.layers.map(({ id }) => id));
  const layersById = new Map(
    treatment.layers.map((entry) => [entry.id, entry]),
  );
  const catalogComponents = new Map(
    inputs.catalog.components.map((component: any) => [
      component.id,
      component,
    ]),
  );
  const validateSettings = (
    definition: any,
    value: Record<string, unknown>,
    owner: string,
  ): void => {
    for (const [key, settingValue] of Object.entries(value)) {
      const field = definition.fields?.[key];
      assert(field, `Unknown baseline setting ${owner}:${key}.`);
      if (field.kind === 'group') {
        assert(
          typeof settingValue === 'object' &&
            settingValue !== null &&
            !Array.isArray(settingValue),
          `Group setting ${owner}:${key} must be an object.`,
        );
        validateSettings(
          field,
          settingValue as Record<string, unknown>,
          `${owner}.${key}`,
        );
        continue;
      }
      const validType =
        (field.kind === 'number' && typeof settingValue === 'number') ||
        (field.kind === 'boolean' && typeof settingValue === 'boolean') ||
        ((field.kind === 'color' || field.kind === 'select') &&
          typeof settingValue === 'string') ||
        (field.kind === 'list' && Array.isArray(settingValue));
      assert(validType, `Type-invalid baseline setting ${owner}:${key}.`);
      if (field.kind === 'list') {
        for (const [index, itemValue] of (
          settingValue as unknown[]
        ).entries()) {
          const itemTypeValid =
            (field.item.kind === 'number' && typeof itemValue === 'number') ||
            (field.item.kind === 'boolean' && typeof itemValue === 'boolean') ||
            ((field.item.kind === 'color' || field.item.kind === 'select') &&
              typeof itemValue === 'string');
          assert(
            itemTypeValid,
            `Type-invalid list item ${owner}:${key}[${index}].`,
          );
          if (field.item.kind === 'select') {
            assert(
              field.item.options.includes(itemValue),
              `Option-invalid list item ${owner}:${key}[${index}].`,
            );
          }
        }
      }
      if (field.kind === 'select') {
        assert(
          field.options.includes(settingValue),
          `Option-invalid baseline setting ${owner}:${key}.`,
        );
      }
      if (field.kind === 'number') {
        assert(
          (field.min === undefined || settingValue >= field.min) &&
            (field.max === undefined || settingValue <= field.max),
          `Out-of-range baseline setting ${owner}:${key}.`,
        );
      }
    }
  };
  for (const layer of treatment.layers) {
    const component: any = catalogComponents.get(layer.component.id);
    assert(component, `Unknown component ${layer.component.id}.`);
    assert(
      component.classification === 'authorable-core-capability',
      `Component ${layer.component.id} is not authorable core.`,
    );
    assert(
      component.implementationVersion === layer.component.implementationVersion,
      `Component version drift for ${layer.id}.`,
    );
    assert(
      JSON.stringify(component.hostAvailability) ===
        JSON.stringify(layer.component.hostAvailability),
      `Component host availability drift for ${layer.id}.`,
    );
    assert(
      layer.component.hostAvailability.studioFullFidelityRender,
      `Layer ${layer.id} lacks Studio full-fidelity rendering.`,
    );
    assert(
      layer.activeRanges.length > 0 &&
        layer.reviewFrames.length > 0 &&
        layer.visibleContribution.length > 0,
      `Layer ${layer.id} lacks range/review/contribution evidence.`,
    );
    assert(
      layer.reviewFrames.every((frame) =>
        layer.activeRanges.some(
          ({ localFrameStart, localFrameEndExclusive }) =>
            frame >= localFrameStart && frame < localFrameEndExclusive,
        ),
      ),
      `Layer ${layer.id} has a review frame outside its active ranges.`,
    );
    validateSettings(
      component.authoring.settings,
      layer.baselineSettings,
      layer.id,
    );
    if (layer.authoringPresetId) {
      assert(
        component.authoring.presets.some(
          (preset: any) => preset.id === layer.authoringPresetId,
        ),
        `Unknown authoring preset ${layer.authoringPresetId} for ${layer.id}.`,
      );
    }
  }
  const advanced = treatment.layers.filter(
    ({ component }) =>
      component.hostAvailability.localCliRenderedWithoutOmission === false,
  );
  assert(
    advanced.length >= 1 && treatment.gaps.some(({ id }) => id === 'GAP-03'),
    'Advanced Three host limitation requires GAP-03.',
  );
  const exactModels = [
    [
      'public/models/stage/female-dj.fbx',
      'sha256:87c7b85a746330c4423bf0598ae0356a9289299316030d46cf067f7fc9cd9c16',
    ],
    [
      'public/models/stage/female-dancer.fbx',
      'sha256:fd6847858a95d9de88e64d0c070b44e95b3c822bf3231ff347f2832dc9396479',
    ],
    [
      'public/models/stage/male-dancer.fbx',
      'sha256:c9cf2a023a282b391534e8a10a91092438def435d786e9d12309ef367eb43582',
    ],
    [
      'public/models/stage/male-cheer.fbx',
      'sha256:354aab94cf2a971baf58f4007ab0eecfa379126f1a11d421a56dd8f68ee3959b',
    ],
  ];
  assert(
    JSON.stringify(
      treatment.models.map(({ path, contentIdentity, authority }) => [
        path,
        contentIdentity,
        authority,
      ]),
    ) ===
      JSON.stringify(
        exactModels.map(([path, contentIdentity]) => [
          path,
          contentIdentity,
          'authorized-local-flagship-proof',
        ]),
      ),
    'Exact authorized Stage source models drifted.',
  );
  assert(
    treatment.models.some(
      ({ path, risk }) =>
        path.endsWith('male-cheer.fbx') && risk?.includes('normal map'),
    ),
    'Male-cheer normal-map risk must remain explicit.',
  );
  const graphIds = new Set(treatment.graphs.map(({ id }) => id));
  const gapIds = new Set(treatment.gaps.map(({ id }) => id));
  const presetTypes = new Map(
    inputs.catalog.nodeNetworkPresets.map((preset: any) => [
      preset.id,
      preset.outputType,
    ]),
  );
  const nodeTypes = new Set(inputs.catalog.nodes.map((node: any) => node.type));
  for (const graph of treatment.graphs) {
    graph.presetRefs.forEach((id) =>
      assert(presetTypes.has(id), `Unknown preset ${id}.`),
    );
    graph.nodeTypeRefs.forEach((id) =>
      assert(nodeTypes.has(id), `Unknown node type ${id}.`),
    );
    graph.outputs.forEach((output: any) => {
      const [owner, settingPath] = output.consumer.split(':');
      assert(
        layerIds.has(owner) ||
          (owner === 'gap' && gapIds.has(output.consumer.slice(4))),
        `Dangling graph consumer ${output.consumer}.`,
      );
      assert(
        ['number', 'boolean', 'color'].includes(output.type),
        `Unsupported graph output type ${output.type}.`,
      );
      if (layerIds.has(owner)) {
        const layer = layersById.get(owner)!;
        const component: any = catalogComponents.get(layer.component.id);
        let definition = component.authoring.settings;
        for (const segment of settingPath.split('.')) {
          definition = definition.fields?.[segment];
          assert(definition, `Unknown setting consumer ${output.consumer}.`);
        }
        assert(
          definition.kind === output.type,
          `Type-incompatible graph consumer ${output.consumer}: ${output.type} -> ${definition.kind}.`,
        );
      }
    });
  }
  const forbiddenRateTargets = treatment.graphs
    .flatMap(({ outputs }) => outputs)
    .filter((output: any) => PHASE_UNSAFE_GRAPH_CONSUMERS.has(output.consumer));
  assert(
    forbiddenRateTargets.length === 0,
    'Raw graph output may not modulate an absolute-time rate.',
  );
  assert(
    treatment.gaps.every(({ unlocks }) =>
      unlocks.some(
        (ref) =>
          graphIds.has(ref) || /authoring|transition|rendering/i.test(ref),
      ),
    ),
    'Every gap must unlock a named treatment consumer.',
  );
  const packageIds = new Set(
    inputs.catalog.packages.map((entry: any) => entry.id),
  );
  const conceptualOwners = new Set([
    'Studio composition root',
    'renderer attachments',
  ]);
  treatment.gaps.forEach((gap) => {
    assert(
      gap.currentEvidence.length > 0,
      `Gap ${gap.id} lacks current evidence.`,
    );
    gap.canonicalOwners.forEach((owner) =>
      assert(
        packageIds.has(owner) || conceptualOwners.has(owner),
        `Gap ${gap.id} names unknown canonical owner ${owner}.`,
      ),
    );
  });
  const families = new Set(
    treatment.breadth.included.map(({ family }) => family),
  );
  [
    'model-backed',
    'procedural-spatial-3d',
    'shader',
    'particle-instancing',
    'complementary-2d',
    'camera',
    'graph',
    'compositor',
  ].forEach((family) =>
    assert(families.has(family), `Missing breadth family ${family}.`),
  );
  const mediaExclusion = treatment.breadth.exclusions.find(
    ({ family }) => family === 'standalone-raster-image-video',
  );
  const includedFamilies = new Set(
    treatment.breadth.included.map(({ family }) => family),
  );
  treatment.breadth.exclusions.forEach(({ family }) =>
    assert(
      !includedFamilies.has(family),
      `Breadth family ${family} cannot be included and excluded.`,
    ),
  );
  assert(
    mediaExclusion?.evidenceRef.includes('authorized-input-inventory') &&
      mediaExclusion.gate.includes('Gate 1'),
    'Raster/image/video exclusion requires input evidence and Gate 1.',
  );
  const stillFrames = new Set(
    treatment.review.stillFrames.map(({ localFrame }) => localFrame),
  );
  [255, 375, 435, 1095, 1155, 1575, 1635, 2175, 2235, 2655, 2835].forEach(
    (frame) =>
      assert(stillFrames.has(frame), `Missing required review frame ${frame}.`),
  );
  assert(
    JSON.stringify([...stillFrames]) ===
      JSON.stringify([
        60, 255, 375, 435, 780, 1095, 1155, 1395, 1575, 1635, 1905, 2175, 2235,
        2655, 2835,
      ]),
    'Exact still-review target set drifted.',
  );
  assert(
    treatment.review.motionWindows.length === 6,
    'Four transitions, peak context, and release motion windows are required.',
  );
  assert(
    treatment.performance.status === 'targets-not-measured-passes',
    'Performance budgets must not be claimed as passes.',
  );
  assert(
    treatment.humanBoundary.authority.startsWith('No automated check approves'),
    'Creative approval must remain human-owned.',
  );
  for (const stress of treatment.performance.stressFrames) {
    const activeCount = treatment.layers.filter(({ activeRanges }) =>
      activeRanges.some(
        ({ localFrameStart, localFrameEndExclusive }) =>
          stress.localFrame >= localFrameStart &&
          stress.localFrame < localFrameEndExclusive,
      ),
    ).length;
    assert(
      activeCount === stress.intendedSimultaneousLayerCount,
      `Stress-frame layer count drifted at ${stress.localFrame}.`,
    );
  }
  const peakFlash = layersById.get('layer-peak-flash');
  assert(
    peakFlash?.baselineSettings.mode === 'Manual' &&
      treatment.graphs.some(({ outputs }) =>
        outputs.some(
          (output: any) =>
            output.consumer === 'layer-peak-flash:strength' &&
            output.type === 'number',
        ),
      ),
    'Manual peak-flash layer requires a visible strength control path.',
  );
  if (expected) {
    assert(
      JSON.stringify(treatment) === JSON.stringify(expected),
      'Treatment differs from deterministic authored blueprint.',
    );
  }
}

function table(rows: string[][]): string {
  return rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
}

export function renderProductionTreatment(
  treatment: ProductionTreatment,
  manifestIdentity: string,
): string {
  const actRows: string[][] = treatment.acts.map((act: any) => [
    act.title,
    `\`${act.range.localFrameStart}..${act.range.localFrameEndExclusive}\``,
    act.emotionalIntent,
    act.densityIntent,
  ]);
  const layerRows: string[][] = treatment.layers.map((layer) => [
    `\`${layer.id}\``,
    `\`${layer.component.id}@${layer.component.implementationVersion}\``,
    layer.role,
    layer.activeRanges
      .map(
        (item) => `\`${item.localFrameStart}..${item.localFrameEndExclusive}\``,
      )
      .join(', '),
    `${layer.compositor.order} / ${layer.compositor.blendMode} / ${layer.compositor.baselineOpacity}`,
    layer.visibleContribution,
  ]);
  const graphRows: string[][] = treatment.graphs.flatMap((graph) =>
    graph.outputs.map((output: any) => [
      `\`${graph.id}\``,
      graph.timescales.join(', '),
      `\`${output.name}: ${output.type}\``,
      `\`${output.consumer}\``,
      output.intent,
    ]),
  );
  const layerConfiguration = treatment.layers
    .map(
      (layer) =>
        `- \`${layer.id}\`${layer.authoringPresetId ? ` uses authoring preset \`${layer.authoringPresetId}\` plus` : ' uses'} schema-validated baseline settings \`${JSON.stringify(layer.baselineSettings)}\`.`,
    )
    .join('\n');
  const reviewRows: string[][] = treatment.review.stillFrames.map(
    ({ localFrame, purpose }) => [String(localFrame), String(purpose)],
  );
  const gapSections = treatment.gaps
    .map(
      (gap) =>
        `### ${gap.id}: ${gap.title}\n\n${gap.smallestReusableChange}\n\n- Current evidence: ${gap.currentEvidence}\n- Canonical owners: ${gap.canonicalOwners.join(', ')}\n- Forbidden owners: ${gap.forbiddenOwners.join(', ')}\n- Acceptance: ${gap.acceptance}\n- If deferred: ${gap.withoutGap}`,
    )
    .join('\n\n');

  return `# Goal Five flagship production treatment: ${treatment.title}\n\nStatus: **proposed; pending Gate 1 human judgment**\n\nManifest: [production treatment manifest](../../parity/evidence/artifacts/2026-09-05-goal-five-production-treatment-manifest.json)\n\nManifest content identity: \`${manifestIdentity}\`\n\n## Treatment\n\n${treatment.logline}\n\n${treatment.distinctness}\n\nThis document and its manifest are derived from one authored blueprint at \`${treatment.ownership.owner}\`. They own proposed direction only and add no hidden product semantics.\n\n## Exact music and ownership\n\nThe treatment uses \`${treatment.music.windowId}\`: 48 seconds, local frames \`[0,2880)\`, source frames \`[135,3015)\`, and source samples \`[108000,2412000)\` at 60 fps / 48 kHz. Source identity is \`${treatment.music.sourceContentIdentity}\`; decoded PCM identity is \`${treatment.music.decodedPcmContentIdentity}\`. The trimmed production audio and standard feature bake remain planned through existing owners after Gate 1; neither is materialized here.\n\n${treatment.ownership.boundary}\n\n## Emotional and visual direction\n\nThe emotional arc is ${treatment.creativeDirection.emotionalArc.join(' → ')}. The hierarchy is ${treatment.creativeDirection.visualHierarchy.join(' → ')}.\n\n${treatment.creativeDirection.materialLanguage} ${treatment.creativeDirection.lighting}\n\nCamera contract: ${treatment.creativeDirection.camera}\n\nTransition contract: ${treatment.creativeDirection.transitionLanguage}\n\nDensity contract: ${treatment.creativeDirection.density}\n\nTemporal safety: ${treatment.creativeDirection.temporalSafety}\n\nPalette: ${treatment.creativeDirection.palette.map(({ name, hex, role }) => `**${name}** \`${hex}\` (${role})`).join('; ')}.\n\n## Five-act score\n\n${table([['Act', 'Local frames', 'Emotional intent', 'Density'], ['---', '---:', '---', '---'], ...actRows])}\n\nMacro owns acts/transitions/peak/release; phrase changes composition without resetting the act; detail owns smoothed energy and refractory accents. All intent remains human-required.\n\n## Layer and compositor plan\n\n${table([['Layer', 'Component', 'Unique responsibility', 'Active frames', 'Order / blend / opacity', 'Visible review contribution'], ['---', '---', '---', '---:', '---', '---'], ...layerRows])}\n\nEvery layer uses the canonical transform shape \`x/y/scaleX/scaleY/rotationDegrees/anchorX/anchorY\`. Stage owns the primary camera. Other Three programs are independent compositor inputs, not a shared 3D scene. The two Particle System instances are separate authored roles: slow haze versus transient sparks.\n\nSchema-valid materialization baseline:\n\n${layerConfiguration}\n\nThe Stage layer uses all four source FBX models exactly once through the existing Stage pipeline. \`male-cheer.fbx\` retains its unavailable external normal-map warning for visual review. No copied Afterlight bundle model is treated as a fifth asset.\n\n## Graph plan\n\n${table([['Graph', 'Timescale', 'Named typed output', 'Consumer', 'Intent'], ['---', '---', '---', '---', '---'], ...graphRows])}\n\nThe graphs may modulate amplitude, intensity, color, form mix, and bounded triggers. They do not modulate absolute-time speed/rate parameters. GAP-01 owns macro direction and GAP-02 owns graph-driven compositor values; neither is hidden in production code.\n\n## Breadth and evidence exclusions\n\nIncluded families: ${treatment.breadth.included.map(({ family }) => `\`${family}\``).join(', ')}. Curve Spectrum supplies complementary 2D language rather than excluding the entire category.\n\nStandalone raster/image/video is excluded because P1-01 found no authorized source; Gate 1 must approve or correct that exclusion. Shared spatial occlusion is excluded because existing Three programs are independent and this treatment intentionally uses compositor-space projection.\n\n## Smallest reusable gaps\n\n${gapSections}\n\n${treatment.conditionalObservation}\n\n## Alternatives and risks\n\n${treatment.alternatives.map(({ id, disposition, reason }) => `- \`${id}\` — **${disposition}**: ${reason}`).join('\n')}\n\n${treatment.risks.map(({ id, mitigation }) => `- \`${id}\`: ${mitigation}`).join('\n')}\n\nForbidden leakage:\n\n${treatment.forbiddenLeakage.map((item) => `- ${item}`).join('\n')}\n\n## Review plan\n\n${table([['Frame', 'Question'], ['---:', '---'], ...reviewRows])}\n\nMotion review covers all four exact transition spans, \`[2580,2730)\` around the primary peak, and \`[2745,2880)\` for release. ${treatment.review.phaseTwoStrategy}\n\n## Performance posture\n\nAll numbers are **targets, not measured passes**. The 1920×1080 / 60 fps H.264/AAC quality-2 final must retain displayed FPS ≥58, display p95 ≤20 ms, planning p95 ≤5 ms, runtime CPU p95 ≤12 ms, zero >100 ms frames, pointer transient p95 ≤1 ms, visible response p95 ≤32 ms, one release revision, seek p95 ≤100 ms, final encode ≥5 fps and ≤12× media duration, six-cycle resource stability, SSIM ≥0.995, NMAE ≤0.006, and A/V drift ≤one frame. Frames 1605 and 2655 are declared layer-stress targets, not evidence of success.\n\n## Gate 1 human boundary\n\nAutomated checks can prove identities, ranges, references, types, host limitations, coverage, and document derivation. They cannot approve musical truth or creative quality. Gate 1 must judge:\n\n${treatment.review.humanQuestions.map((question) => `- ${question}`).join('\n')}\n\n${treatment.humanBoundary.authority}\n`;
}

function loadInputs(): Inputs {
  const read = (path: string, identity: string) => {
    const contents = readFileSync(path);
    assert(
      sha256(contents) === identity,
      `Upstream identity drifted for ${path}.`,
    );
    return JSON.parse(contents.toString('utf8'));
  };
  return {
    inventory: read(INPUT_PATH, UPSTREAM.inputInventory),
    catalog: read(CAPABILITY_PATH, UPSTREAM.capabilityCatalog),
    analysis: read(ANALYSIS_PATH, UPSTREAM.musicAnalysis),
    map: read(MAP_PATH, UPSTREAM.musicalMap),
  };
}

async function run(): Promise<void> {
  const inputs = loadInputs();
  const generatorIdentity = sha256(
    readFileSync(fileURLToPath(import.meta.url)),
  );
  const expected = buildProductionTreatment(inputs, generatorIdentity);
  validateProductionTreatment(expected, inputs);
  const manifestContents = await format(
    `${JSON.stringify(expected, null, 2)}\n`,
    { parser: 'json' },
  );
  const manifestIdentity = sha256(manifestContents);
  const documentContents = await format(
    renderProductionTreatment(expected, manifestIdentity),
    { parser: 'markdown' },
  );
  if (process.argv.includes('--write')) {
    writeFileSync(MANIFEST_PATH, manifestContents);
    writeFileSync(DOCUMENT_PATH, documentContents);
    console.log(
      `Wrote ${MANIFEST_PATH} (${manifestIdentity}) and ${DOCUMENT_PATH} (${sha256(documentContents)}).`,
    );
    return;
  }
  const recorded = JSON.parse(
    readFileSync(MANIFEST_PATH, 'utf8'),
  ) as ProductionTreatment;
  validateProductionTreatment(recorded, inputs, expected);
  assert(
    readFileSync(DOCUMENT_PATH, 'utf8') === documentContents,
    'Treatment document differs from deterministic blueprint rendering.',
  );
  console.log(
    `Validated ${treatmentSummary(expected)} (${manifestIdentity}; ${sha256(documentContents)}).`,
  );
}

function treatmentSummary(treatment: ProductionTreatment): string {
  return `${treatment.title}: ${treatment.acts.length} acts, ${treatment.layers.length} layers, ${treatment.graphs.length} graphs, ${treatment.gaps.length} gaps, pending Gate 1`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void run().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
