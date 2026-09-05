import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';

const ANALYSIS_PATH =
  'docs/parity/evidence/artifacts/2026-09-04-goal-five-music-window-analysis.json';
const MAP_PATH =
  'docs/parity/evidence/artifacts/2026-09-05-goal-five-frame-exact-musical-map.json';
const REVIEW_PATH =
  'docs/parity/evidence/2026-09-05-goal-five-frame-exact-musical-map-review.md';
const ANALYSIS_IDENTITY =
  'sha256:e94ef2932f0ddd28f730711111e14d6d35ff952bc3328905f1e89dd6bb6657cc';
const WINDOW_ID = 'hiphop-808-rap-f135-d2880';
const TRACK_ID = 'hiphop-808-rap';
const IMPLEMENTATION_BASELINE = 'a611bbde9533a6047cd576f78f9e8e36f991aca6';
const FPS = 60;
const SAMPLE_RATE = 48_000;
const SAMPLES_PER_FRAME = SAMPLE_RATE / FPS;

type Point = {
  sourceSample: number;
  sourceFrame: number;
  seconds: number;
  strength?: number;
};

type AnalysisBin = {
  sourceFrameStart: number;
  sourceFrameEnd: number;
  startSeconds: number;
  endSeconds: number;
  loudness: number;
  bassEnergy: number;
  midEnergy: number;
  trebleEnergy: number;
  spectralCentroidHz: number;
  onsetStrength: number;
  waveformPeak: number;
};

type Track = {
  id: string;
  source: { path: string; contentIdentity: string };
  decode: {
    decodedSampleRate: number;
    pcm: { contentIdentity: string };
  };
  rhythm: {
    beatConfidence: number;
    beatGridHypothesis: Point[];
    phraseBoundaryHypotheses: Point[];
  };
  structure: {
    method: string;
    sectionBoundaryHypotheses: Point[];
  };
  transients: { threshold: number; events: Point[] };
  analysisBins: AnalysisBin[];
  candidateWindows: Array<{
    id: string;
    source: {
      startSample: number;
      endSampleExclusive: number;
      startFrame: number;
      endFrameExclusive: number;
      startSeconds: number;
      durationSeconds: number;
    };
    metrics: { silence: { intervals: unknown[] } };
  }>;
};

type Analysis = {
  analysisVersion: string;
  determinism: {
    algorithmIdentities: string[];
    config: { sectionContextSeconds: number };
  };
  tracks: Track[];
  recommendation: { provisionalWindowId: string };
};

type EnergyCandidate = {
  id: string;
  localFrameStart: number;
  localFrameEndExclusive: number;
  loudness: number;
};

type MusicalMap = ReturnType<typeof buildMusicalMap>;

function sha256(contents: string | Buffer): string {
  return `sha256:${createHash('sha256').update(contents).digest('hex')}`;
}

function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function localPoint(point: Point, startFrame: number, startSample: number) {
  const localFrame = point.sourceFrame - startFrame;
  const localSample = point.sourceSample - startSample;
  const scheduledLocalSample = localFrame * SAMPLES_PER_FRAME;
  return {
    sourceFrame: point.sourceFrame,
    sourceSample: point.sourceSample,
    sourceSeconds: point.seconds,
    localFrame,
    localSample,
    localSeconds: localSample / SAMPLE_RATE,
    scheduledLocalSample,
    schedulingQuantizationSamples: scheduledLocalSample - localSample,
  };
}

export function sectionDisposition(
  localFrame: number,
  windowFrameCount: number,
): 'excluded-near-window-edge' | 'proposed-act-boundary' {
  return localFrame < FPS || localFrame >= windowFrameCount - FPS
    ? 'excluded-near-window-edge'
    : 'proposed-act-boundary';
}

export function selectEnergyOpportunities(
  bins: EnergyCandidate[],
  mode: 'peak' | 'lower-energy',
  limit = 3,
) {
  const extrema = bins.filter((bin, index) => {
    const previous = bins[index - 1]?.loudness;
    const next = bins[index + 1]?.loudness;
    if (previous === undefined || next === undefined) return false;
    return mode === 'peak'
      ? bin.loudness >= previous && bin.loudness >= next
      : bin.loudness <= previous && bin.loudness <= next;
  });
  const direction = mode === 'peak' ? -1 : 1;
  return extrema
    .sort(
      (left, right) =>
        direction * (left.loudness - right.loudness) ||
        left.localFrameStart - right.localFrameStart,
    )
    .slice(0, limit)
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
      classification:
        mode === 'peak'
          ? 'energy-peak-opportunity'
          : 'lower-energy-rest-opportunity',
      silenceClaim: false,
      tiedAlternativeIds: extrema
        .filter(
          (other) =>
            other.id !== candidate.id && other.loudness === candidate.loudness,
        )
        .map((other) => other.id)
        .sort(),
    }));
}

const actBlueprint = [
  {
    id: 'act-1-threshold-and-restraint',
    start: 0,
    end: 405,
    title: 'Threshold and restraint',
    intent:
      'Establish a sparse visual identity, preserve negative space, and contract toward the first decisive change.',
  },
  {
    id: 'act-2-first-full-statement',
    start: 405,
    end: 1125,
    title: 'First full statement',
    intent:
      'Reveal the primary rhythmic system and stabilize it without spending the production peak.',
  },
  {
    id: 'act-3-contrast-and-rebuild',
    start: 1125,
    end: 1605,
    title: 'Contrast and rebuild',
    intent:
      'Pull density and brightness back, then rebuild motion and scale into the next structural turn.',
  },
  {
    id: 'act-4-suspended-evolution',
    start: 1605,
    end: 2205,
    title: 'Suspended evolution',
    intent:
      'Evolve composition and camera language across sustained energy while retaining final-act headroom.',
  },
  {
    id: 'act-5-final-statement-and-release',
    start: 2205,
    end: 2880,
    title: 'Final statement and release',
    intent:
      'Accumulate the clearest production peak, then make the ending feel authored through a concise release.',
  },
] as const;

function intentConfidence() {
  return {
    class: 'authored-production-intent',
    confidence: 'human-required',
    status: 'proposed-pending-gate-1',
  } as const;
}

export function buildMusicalMap(
  analysis: Analysis,
  generatorIdentity = 'test-generator',
) {
  if (analysis.recommendation.provisionalWindowId !== WINDOW_ID) {
    throw new Error('The upstream provisional window identity changed.');
  }
  const track = required(
    analysis.tracks.find((candidate) => candidate.id === TRACK_ID),
    `Missing track ${TRACK_ID}`,
  );
  const window = required(
    track.candidateWindows.find((candidate) => candidate.id === WINDOW_ID),
    `Missing window ${WINDOW_ID}`,
  );
  const { startFrame, endFrameExclusive, startSample, endSampleExclusive } =
    window.source;
  const windowFrameCount = endFrameExclusive - startFrame;
  const inside = (point: Point) =>
    point.sourceSample >= startSample &&
    point.sourceSample < endSampleExclusive;
  const beats = track.rhythm.beatGridHypothesis
    .filter(inside)
    .map((point, index) => ({
      id: `beat-${String(index + 1).padStart(3, '0')}`,
      ...localPoint(point, startFrame, startSample),
      provenance: {
        class: 'beat-hypothesis',
        algorithm: 'rhythm-core.beat-track.phase-optimized',
        confidence: track.rhythm.beatConfidence,
        interpretation:
          'Provisional pulse position; perceived beat and downbeat require human review.',
      },
    }));
  const phrases = track.rhythm.phraseBoundaryHypotheses
    .filter(inside)
    .map((point, index) => ({
      id: `phrase-${String(index + 1).padStart(2, '0')}`,
      ...localPoint(point, startFrame, startSample),
      provenance: {
        class: 'derived-phrase-hypothesis',
        method: 'every eighth beat from the upstream beat hypothesis',
        inheritedBeatConfidence: track.rhythm.beatConfidence,
        interpretation:
          'Provisional phrase boundary; phrase and downbeat require human review.',
      },
    }));
  const transients = track.transients.events
    .filter(inside)
    .map((point, index) => ({
      id: `transient-${String(index + 1).padStart(2, '0')}`,
      ...localPoint(point, startFrame, startSample),
      strength: required(point.strength, 'Transient strength is required.'),
      provenance: {
        class: 'transient-detector-hypothesis',
        algorithm: analysis.analysisVersion,
        analysisFps: 20,
        threshold: track.transients.threshold,
        interpretation:
          'Observed at a 20 fps bin center; localFrame is the nearest 60 fps scheduling frame.',
      },
    }));
  const sections = track.structure.sectionBoundaryHypotheses
    .filter(inside)
    .map((point, index) => {
      const local = localPoint(point, startFrame, startSample);
      const disposition = sectionDisposition(
        local.localFrame,
        windowFrameCount,
      );
      return {
        id: `section-${String(index + 1).padStart(2, '0')}`,
        ...local,
        strength: required(point.strength, 'Section strength is required.'),
        disposition,
        governingRule:
          disposition === 'excluded-near-window-edge'
            ? 'Exclude section hypotheses outside the upstream half-open inset [60, windowFrameCount - 60).'
            : 'Retain section hypotheses in the upstream half-open inset [60, windowFrameCount - 60).',
        provenance: {
          class: 'section-detector-hypothesis',
          method: track.structure.method,
          confidenceMetric: 'normalized novelty strength',
        },
      };
    });
  const energyBins = track.analysisBins
    .filter(
      (bin) =>
        bin.sourceFrameEnd > startFrame &&
        bin.sourceFrameStart < endFrameExclusive,
    )
    .map((bin, index) => {
      const clippedSourceFrameStart = Math.max(
        bin.sourceFrameStart,
        startFrame,
      );
      const clippedSourceFrameEndExclusive = Math.min(
        bin.sourceFrameEnd,
        endFrameExclusive,
      );
      return {
        id: `energy-bin-${String(index + 1).padStart(2, '0')}`,
        localFrameStart: clippedSourceFrameStart - startFrame,
        localFrameEndExclusive: clippedSourceFrameEndExclusive - startFrame,
        sourceFrameStart: clippedSourceFrameStart,
        sourceFrameEndExclusive: clippedSourceFrameEndExclusive,
        upstreamMeasurementFrameStart: bin.sourceFrameStart,
        upstreamMeasurementFrameEndExclusive: bin.sourceFrameEnd,
        coverage:
          clippedSourceFrameStart === bin.sourceFrameStart &&
          clippedSourceFrameEndExclusive === bin.sourceFrameEnd
            ? 'complete-upstream-bin'
            : 'partial-window-overlap-of-upstream-bin',
        measurementLimitation:
          'Metrics describe the complete upstream one-second bin; clipped bounds describe only its overlap with this window.',
        loudness: bin.loudness,
        bassEnergy: bin.bassEnergy,
        midEnergy: bin.midEnergy,
        trebleEnergy: bin.trebleEnergy,
        onsetStrength: bin.onsetStrength,
      };
    });
  const energyCandidates = energyBins.map(
    ({ id, localFrameStart, localFrameEndExclusive, loudness }) => ({
      id,
      localFrameStart,
      localFrameEndExclusive,
      loudness,
    }),
  );
  const peakOpportunities = selectEnergyOpportunities(energyCandidates, 'peak');
  const restOpportunities = selectEnergyOpportunities(
    energyCandidates,
    'lower-energy',
  );

  const acts = actBlueprint.map((act) => ({
    id: act.id,
    title: act.title,
    range: {
      localFrameStart: act.start,
      localFrameEndExclusive: act.end,
      sourceFrameStart: act.start + startFrame,
      sourceFrameEndExclusive: act.end + startFrame,
      localSampleStart: act.start * SAMPLES_PER_FRAME,
      localSampleEndExclusive: act.end * SAMPLES_PER_FRAME,
      sourceSampleStart: startSample + act.start * SAMPLES_PER_FRAME,
      sourceSampleEndExclusive: startSample + act.end * SAMPLES_PER_FRAME,
    },
    productionIntent: act.intent,
    judgment: intentConfidence(),
  }));
  const transitions = acts.slice(0, -1).map((act, index) => {
    const next = required(
      acts[index + 1],
      'Transition requires a following act.',
    );
    const center = act.range.localFrameEndExclusive;
    return {
      id: `transition-${index + 1}`,
      fromActId: act.id,
      toActId: next.id,
      centerLocalFrame: center,
      localFrameStart: center - 45,
      localFrameEndExclusive: center + 45,
      reviewFrames: { pre: center - 30, midpoint: center, post: center + 30 },
      evidenceRef: required(
        sections.find(
          (section) =>
            section.disposition === 'proposed-act-boundary' &&
            section.localFrame === center,
        ),
        `No section hypothesis supports transition at ${center}.`,
      ).id,
      productionIntent:
        index === 0
          ? 'Make the first full-system reveal legible across the boundary.'
          : index === 3
            ? 'Turn sustained energy into an unmistakable final-act escalation.'
            : 'Change compositional emphasis while maintaining rhythmic continuity.',
      judgment: intentConfidence(),
    };
  });
  const macroIntents = acts.map((act) => ({
    id: `macro-${act.id}`,
    timescale: 'macro',
    rangeRef: act.id,
    evidenceRefs: sections
      .filter(
        (section) =>
          section.localFrame >= act.range.localFrameStart &&
          section.localFrame < act.range.localFrameEndExclusive,
      )
      .map((section) => section.id),
    productionIntent: act.productionIntent,
    judgment: intentConfidence(),
  }));
  const phraseIntents = phrases.map((phrase, index) => ({
    id: `response-${phrase.id}`,
    timescale: 'phrase',
    rangeRef: phrase.id,
    evidenceRefs: [phrase.id],
    productionIntent: [
      'Clarify the current motif through a restrained compositional change.',
      'Advance camera or spatial phrasing without resetting the act identity.',
      'Vary density and color hierarchy while preserving continuity.',
    ][index % 3],
    judgment: intentConfidence(),
  }));
  const detailIntents = acts.flatMap((act) =>
    transients
      .filter(
        (transient) =>
          transient.localFrame >= act.range.localFrameStart &&
          transient.localFrame < act.range.localFrameEndExclusive,
      )
      .sort(
        (left, right) =>
          right.strength - left.strength || left.localFrame - right.localFrame,
      )
      .slice(0, 2)
      .map((transient, index) => ({
        id: `detail-${act.id}-${index + 1}`,
        timescale: 'detail',
        rangeRef: transient.id,
        evidenceRefs: [transient.id],
        productionIntent:
          'Reserve a short, bounded accent opportunity for a component-level response; exact consumer and magnitude remain treatment decisions.',
        candidateConsumers: [
          'camera',
          'lighting',
          'particles',
          'material modulation',
        ],
        judgment: intentConfidence(),
      })),
  );

  return {
    schemaVersion: 1,
    kind: 'viz-engine-goal-five-proposed-frame-exact-musical-map',
    status: 'proposed-pending-gate-1',
    identityScope: {
      implementationBaseline: IMPLEMENTATION_BASELINE,
      generatorPath: 'tools/foundation/author-goal-five-musical-map.ts',
      generatorContentIdentity: generatorIdentity,
      upstreamAnalysisPath: ANALYSIS_PATH,
      upstreamAnalysisContentIdentity: ANALYSIS_IDENTITY,
      upstreamAnalysisVersion: analysis.analysisVersion,
      upstreamAlgorithmIdentities: analysis.determinism.algorithmIdentities,
      trackId: TRACK_ID,
      windowId: WINDOW_ID,
      sourcePath: track.source.path,
      sourceContentIdentity: track.source.contentIdentity,
      decodedPcmContentIdentity: track.decode.pcm.contentIdentity,
    },
    ownership: {
      owner: 'tools/foundation/author-goal-five-musical-map.ts',
      role: 'Derived review evidence and proposed production timing authority after Gate 1 approval only.',
      canonicalInputs: [ANALYSIS_PATH],
      forbiddenOwners: [
        'VizProjectDocument',
        'VizSession',
        'runtime graph semantics',
        'transport state',
        'React editor state',
        'production component implementations',
      ],
    },
    coordinateContract: {
      timelineFps: FPS,
      decodedSampleRate: SAMPLE_RATE,
      samplesPerTimelineFrame: SAMPLES_PER_FRAME,
      intervalConvention: 'inclusive-start-exclusive-end',
      source: {
        frameStart: startFrame,
        frameEndExclusive: endFrameExclusive,
        sampleStart: startSample,
        sampleEndExclusive: endSampleExclusive,
      },
      local: {
        frameStart: 0,
        frameEndExclusive: endFrameExclusive - startFrame,
        sampleStart: 0,
        sampleEndExclusive: endSampleExclusive - startSample,
      },
      precision:
        'Window endpoints and source/local offsets are exact. Detector sourceSample is observation time; localFrame is the nearest scheduling frame and may differ by at most 400 samples (half a 60 fps frame).',
    },
    provenanceContract: {
      section: 'detector hypothesis plus measured normalized novelty strength',
      beat: `beat hypothesis with inherited track confidence ${track.rhythm.beatConfidence}`,
      phrase:
        'deterministically derived from every eighth hypothesized beat; inherits beat confidence',
      transient:
        '20 fps detector-bin-center hypothesis with measured strength and nearest 60 fps scheduling frame',
      energyOpportunity:
        'deterministic local extremum over inherited one-second loudness bins; ranked by loudness then earliest frame; equal-valued alternatives exposed',
      intent:
        'authored proposed production intent; confidence is human-required, never numeric',
    },
    landmarks: { sections, beats, phrases, transients },
    energy: {
      bins: energyBins,
      selectionPolicy: {
        metric: 'upstream one-second-bin loudness',
        candidateRule: 'strict interior local extrema; equality qualifies',
        rankRule:
          'peaks descending, lower-energy opportunities ascending, then earliest local frame',
        limitPerClass: 3,
        silenceRule:
          'No qualifying silence interval exists in the selected window; lower-energy opportunities are never silence claims.',
      },
      upstreamQualifyingSilenceIntervalCount:
        window.metrics.silence.intervals.length,
      peakOpportunities,
      restOpportunities,
    },
    acts,
    transitions,
    responsePlan: {
      interpretation:
        'Reusable production intent for later treatment and authoring; this map does not define hidden engine behavior or runtime bindings.',
      macro: macroIntents,
      phrase: phraseIntents,
      detail: detailIntents,
    },
    humanBoundary: {
      gate: 'Gate 1',
      requiredJudgments: [
        'intended track and source window',
        'section, downbeat, and phrase corrections',
        'peak and lower-energy-opportunity salience',
        'five-act viability and transition placement',
        'emotional and aesthetic intent',
        'visual treatment direction',
      ],
      authority:
        'This proposed map becomes production timing authority only after the named human gate approves or corrects it.',
    },
  };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function validateMusicalMap(
  map: MusicalMap,
  expected?: MusicalMap,
): void {
  assert(
    map.status === 'proposed-pending-gate-1',
    'Map must remain provisional before Gate 1.',
  );
  assert(
    map.identityScope.upstreamAnalysisContentIdentity === ANALYSIS_IDENTITY,
    'Upstream analysis identity drifted.',
  );
  assert(map.identityScope.windowId === WINDOW_ID, 'Window identity drifted.');
  assert(
    map.coordinateContract.source.sampleStart === 108_000,
    'Source sample start drifted.',
  );
  assert(
    map.coordinateContract.source.sampleEndExclusive === 2_412_000,
    'Source sample end drifted.',
  );
  assert(
    map.coordinateContract.source.frameStart === 135,
    'Source frame start drifted.',
  );
  assert(
    map.coordinateContract.source.frameEndExclusive === 3_015,
    'Source frame end drifted.',
  );
  assert(
    map.landmarks.sections.length === 5,
    'All five in-window section hypotheses must be retained.',
  );
  assert(map.landmarks.beats.length === 82, 'Expected the exact 82-beat set.');
  assert(
    map.landmarks.phrases.length === 10,
    'Expected the exact 10-phrase set.',
  );
  assert(
    map.landmarks.transients.length === 69,
    'Expected the exact 69-transient set.',
  );
  assert(
    map.landmarks.sections[0]?.disposition === 'excluded-near-window-edge' &&
      map.landmarks.sections[0]?.localFrame === 45,
    'The near-edge section hypothesis must be explicit and excluded by rule.',
  );
  assert(map.acts.length === 5, 'Expected five authored acts.');
  map.acts.forEach((act, index) => {
    const previousEnd =
      index === 0 ? 0 : map.acts[index - 1]?.range.localFrameEndExclusive;
    assert(
      act.range.localFrameStart === previousEnd,
      'Acts must be ordered, gapless, and non-overlapping.',
    );
    assert(
      act.range.localFrameEndExclusive > act.range.localFrameStart,
      'Act range must be non-empty.',
    );
  });
  assert(
    map.acts.at(-1)?.range.localFrameEndExclusive === 2_880,
    'Acts must cover the full local window.',
  );
  assert(map.transitions.length === 4, 'Expected four transition spans.');
  map.transitions.forEach((transition) => {
    assert(
      transition.localFrameStart < transition.centerLocalFrame,
      'Transition pre-span is invalid.',
    );
    assert(
      transition.centerLocalFrame < transition.localFrameEndExclusive,
      'Transition post-span is invalid.',
    );
    assert(
      transition.reviewFrames.midpoint === transition.centerLocalFrame,
      'Transition review midpoint drifted.',
    );
  });
  map.landmarks.transients.forEach((transient) => {
    assert(
      Math.abs(transient.schedulingQuantizationSamples) <= 400,
      'Transient exceeds half-frame scheduling quantization.',
    );
  });
  assert(
    map.energy.upstreamQualifyingSilenceIntervalCount === 0,
    'Selected window unexpectedly claims silence.',
  );
  assert(
    map.energy.restOpportunities.every((rest) => !rest.silenceClaim),
    'Lower-energy opportunity cannot claim silence.',
  );
  assert(
    map.energy.bins[0]?.coverage === 'partial-window-overlap-of-upstream-bin',
    'Opening edge bin must be partial.',
  );
  assert(
    map.energy.bins.at(-1)?.coverage ===
      'partial-window-overlap-of-upstream-bin',
    'Closing edge bin must be partial.',
  );
  const referenceIds = new Set([
    ...map.acts.map((entry) => entry.id),
    ...map.landmarks.sections.map((entry) => entry.id),
    ...map.landmarks.beats.map((entry) => entry.id),
    ...map.landmarks.phrases.map((entry) => entry.id),
    ...map.landmarks.transients.map((entry) => entry.id),
  ]);
  for (const response of [
    ...map.responsePlan.macro,
    ...map.responsePlan.phrase,
    ...map.responsePlan.detail,
  ]) {
    assert(
      referenceIds.has(response.rangeRef),
      `Dangling response range reference ${response.rangeRef}.`,
    );
    assert(
      response.evidenceRefs.every((id) => referenceIds.has(id)),
      `Dangling evidence reference in ${response.id}.`,
    );
    assert(
      response.productionIntent.length > 0,
      `Missing production intent in ${response.id}.`,
    );
  }
  assert(
    new Set([
      ...map.responsePlan.macro.map((entry) => entry.timescale),
      ...map.responsePlan.phrase.map((entry) => entry.timescale),
      ...map.responsePlan.detail.map((entry) => entry.timescale),
    ]).size === 3,
    'Macro, phrase, and detail response scales are all required.',
  );
  if (expected) {
    assert(
      stableJson(map) === stableJson(expected),
      'Musical-map content differs from deterministic derivation.',
    );
  }
}

export function renderReview(
  map: MusicalMap,
  artifactIdentity: string,
): string {
  const actRows = map.acts
    .map(
      (act) =>
        `| ${act.title} | \`${act.range.localFrameStart}..${act.range.localFrameEndExclusive}\` | ${act.productionIntent} |`,
    )
    .join('\n');
  const transitionRows = map.transitions
    .map(
      (transition) =>
        `| \`${transition.id}\` | ${transition.centerLocalFrame} | ${transition.reviewFrames.pre} / ${transition.reviewFrames.midpoint} / ${transition.reviewFrames.post} | \`${transition.evidenceRef}\` |`,
    )
    .join('\n');
  return (
    `# Goal Five proposed frame-exact musical map review\n\n` +
    `Status: **proposed; pending Gate 1 human judgment**\n\n` +
    `Artifact: [frame-exact musical map](./artifacts/2026-09-05-goal-five-frame-exact-musical-map.json)\n\n` +
    `Artifact content identity: \`${artifactIdentity}\`\n\n` +
    `Upstream analysis identity: \`${map.identityScope.upstreamAnalysisContentIdentity}\`\n\n` +
    `## What this owns\n\n` +
    `This evidence turns the selected P1-03 window into one deterministic, machine-readable and human-reviewable timing proposal. It owns derived evidence only. It does not modify the project document, session, runtime, graph, transport, editor state, or production components.\n\n` +
    `The 48-second interval is local frames \`[0,2880)\`, source frames \`[135,3015)\`, and source samples \`[108000,2412000)\` at 60 fps / 48 kHz. Source/local endpoint conversions are exact. Detector samples retain their 20 fps observation precision; their nearest 60 fps scheduling frames can differ by at most 400 samples (8.333 ms).\n\n` +
    `## Proposed five-act map\n\n` +
    `| Act | Local frames | Production intent |\n| --- | ---: | --- |\n${actRows}\n\n` +
    `All ranges use inclusive-start/exclusive-end semantics and cover the window without gaps or overlaps. The section hypothesis at local frame 45 remains recorded as \`excluded-near-window-edge\` under the upstream one-second edge rule; it is not silently discarded.\n\n` +
    `## Transition review\n\n| Transition | Center | Pre / midpoint / post | Evidence |\n| --- | ---: | ---: | --- |\n${transitionRows}\n\n` +
    `## Landmark and response coverage\n\n` +
    `- ${map.landmarks.sections.length} section hypotheses, including the explicit edge exclusion\n` +
    `- ${map.landmarks.beats.length} beat hypotheses at inherited confidence ${map.landmarks.beats[0]?.provenance.confidence}\n` +
    `- ${map.landmarks.phrases.length} eight-beat-derived phrase hypotheses\n` +
    `- ${map.landmarks.transients.length} transient hypotheses with observation samples and scheduling frames\n` +
    `- ${map.responsePlan.macro.length} macro, ${map.responsePlan.phrase.length} phrase, and ${map.responsePlan.detail.length} detail response opportunities\n\n` +
    `Energy peaks and lower-energy opportunities are deterministic local extrema over inherited one-second loudness bins. The first and last bins are explicitly partial overlaps. The selected window has zero qualifying silence intervals, so no rest opportunity is described as silence. Equal-valued alternatives are retained in the artifact.\n\n` +
    `## Human boundary\n\n` +
    `Gate 1 must listen and judge the intended track/window, correct sections/downbeats/phrases, assess peak and lower-energy salience, approve or change the five-act viability and transitions, and decide emotional, aesthetic, and visual-treatment intent. Until then, this map is evidence and a proposal—not approved production direction.\n`
  );
}

function loadAnalysis(): { analysis: Analysis; contents: Buffer } {
  const contents = readFileSync(ANALYSIS_PATH);
  assert(
    sha256(contents) === ANALYSIS_IDENTITY,
    'P1-03 analysis artifact identity changed.',
  );
  return {
    analysis: JSON.parse(contents.toString('utf8')) as Analysis,
    contents,
  };
}

async function run(): Promise<void> {
  const { analysis } = loadAnalysis();
  const generatorIdentity = sha256(
    readFileSync(fileURLToPath(import.meta.url)),
  );
  const expected = buildMusicalMap(analysis, generatorIdentity);
  validateMusicalMap(expected);
  const artifactContents = await format(stableJson(expected), {
    parser: 'json',
  });
  const artifactIdentity = sha256(artifactContents);
  const review = await format(renderReview(expected, artifactIdentity), {
    parser: 'markdown',
  });
  if (process.argv.includes('--write')) {
    writeFileSync(MAP_PATH, artifactContents);
    writeFileSync(REVIEW_PATH, review);
    console.log(`Wrote ${MAP_PATH} (${artifactIdentity}) and ${REVIEW_PATH}.`);
    return;
  }
  const recorded = JSON.parse(readFileSync(MAP_PATH, 'utf8')) as MusicalMap;
  validateMusicalMap(recorded, expected);
  assert(
    readFileSync(REVIEW_PATH, 'utf8') === review,
    'Musical-map review document differs from deterministic rendering.',
  );
  console.log(
    `Validated proposed musical map ${artifactIdentity}: 5 acts, 4 transitions, 82 beats, 10 phrases, 69 transients.`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void run().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
