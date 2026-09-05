import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  buildProductionTreatment,
  renderProductionTreatment,
  validateProductionTreatment,
} from '../../tools/foundation/author-goal-five-production-treatment';

function load(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const inputs = {
  inventory: load(
    'docs/parity/evidence/artifacts/2026-09-04-goal-five-authorized-input-inventory.json',
  ),
  catalog: load(
    'docs/parity/evidence/artifacts/2026-09-04-goal-five-capability-catalog.json',
  ),
  analysis: load(
    'docs/parity/evidence/artifacts/2026-09-04-goal-five-music-window-analysis.json',
  ),
  map: load(
    'docs/parity/evidence/artifacts/2026-09-05-goal-five-frame-exact-musical-map.json',
  ),
};

function build() {
  return buildProductionTreatment(inputs, 'sha256:test-generator');
}

describe('Goal Five flagship production treatment', () => {
  it('binds the exact upstream window, five acts, models, layers, graphs, and human gate', () => {
    const treatment = build();
    expect(() => validateProductionTreatment(treatment, inputs)).not.toThrow();
    expect(treatment.music.windowId).toBe('hiphop-808-rap-f135-d2880');
    expect(treatment.acts).toHaveLength(5);
    expect(treatment.transitions).toHaveLength(4);
    expect(treatment.models).toHaveLength(4);
    expect(treatment.layers).toHaveLength(9);
    expect(treatment.graphs).toHaveLength(7);
    expect(treatment.humanBoundary.gate).toBe('Gate 1');
  });

  it('rejects count-preserving substitutions and runtime-only authoring claims', () => {
    const expected = build();
    const substituted = structuredClone(expected);
    substituted.layers[0]!.component.id = 'debug-animation';
    expect(() =>
      validateProductionTreatment(substituted, inputs, expected),
    ).toThrow();

    const runtimeOnly = structuredClone(expected);
    runtimeOnly.layers[0]!.component.id = 'cover-image';
    expect(() => validateProductionTreatment(runtimeOnly, inputs)).toThrow(
      'not authorable core',
    );
  });

  it('rejects duplicate roles, copied models, missing male-cheer risk, and false host parity', () => {
    const duplicateRole = structuredClone(build());
    duplicateRole.layers[1]!.role = duplicateRole.layers[0]!.role;
    expect(() => validateProductionTreatment(duplicateRole, inputs)).toThrow(
      'unique responsibility',
    );

    const copiedModel = structuredClone(build());
    copiedModel.models[1]!.contentIdentity =
      copiedModel.models[0]!.contentIdentity;
    expect(() => validateProductionTreatment(copiedModel, inputs)).toThrow(
      'Exact authorized Stage source models drifted',
    );

    const referenceCopy = structuredClone(build());
    referenceCopy.models[0]!.path =
      'public/productions/afterlight-assembly/assets/viz-builtin-stage-female-dj.fbx';
    expect(() => validateProductionTreatment(referenceCopy, inputs)).toThrow(
      'Exact authorized Stage source models drifted',
    );

    const falseAuthority = structuredClone(build());
    falseAuthority.models[0]!.authority = 'redistributable';
    expect(() => validateProductionTreatment(falseAuthority, inputs)).toThrow(
      'Exact authorized Stage source models drifted',
    );

    const hiddenRisk = structuredClone(build());
    hiddenRisk.models.find(({ path }) =>
      path.endsWith('male-cheer.fbx'),
    )!.risk = null;
    expect(() => validateProductionTreatment(hiddenRisk, inputs)).toThrow(
      'normal-map risk',
    );

    const falseParity = structuredClone(build());
    falseParity.gaps = falseParity.gaps.filter(({ id }) => id !== 'GAP-03');
    expect(() => validateProductionTreatment(falseParity, inputs)).toThrow(
      'requires GAP-03',
    );

    const copiedHostClaim = structuredClone(build());
    copiedHostClaim.layers[0]!.component.hostAvailability.localCliRenderedWithoutOmission = true;
    expect(() => validateProductionTreatment(copiedHostClaim, inputs)).toThrow(
      'Component host availability drift',
    );
  });

  it('rejects dangling consumers, unknown nodes and presets, and raw rate modulation', () => {
    const dangling = structuredClone(build());
    dangling.graphs[0]!.outputs[0]!.consumer = 'missing-layer:intensity';
    expect(() => validateProductionTreatment(dangling, inputs)).toThrow(
      'Dangling graph consumer',
    );

    const unknownPreset = structuredClone(build());
    unknownPreset.graphs[0]!.presetRefs[0] = 'missing-preset';
    expect(() => validateProductionTreatment(unknownPreset, inputs)).toThrow(
      'Unknown preset',
    );

    const unknownNode = structuredClone(build());
    unknownNode.graphs[0]!.nodeTypeRefs[0] = 'missing-node';
    expect(() => validateProductionTreatment(unknownNode, inputs)).toThrow(
      'Unknown node type',
    );

    const unsafeRate = structuredClone(build());
    unsafeRate.graphs[0]!.outputs[0]!.consumer =
      'layer-human-stage:characters.animationSpeed';
    expect(() => validateProductionTreatment(unsafeRate, inputs)).toThrow(
      'absolute-time rate',
    );

    const shaderSpeed = structuredClone(build());
    shaderSpeed.graphs[0]!.outputs[0]!.consumer = 'layer-void-field:speed';
    expect(() => validateProductionTreatment(shaderSpeed, inputs)).toThrow(
      'absolute-time rate',
    );

    const strobeFrequency = structuredClone(build());
    strobeFrequency.graphs[0]!.outputs[0]!.consumer =
      'layer-peak-flash:intensity';
    expect(() => validateProductionTreatment(strobeFrequency, inputs)).toThrow(
      'absolute-time rate',
    );

    const noiseFlow = structuredClone(build());
    noiseFlow.graphs[0]!.outputs[0]!.consumer =
      'layer-grain-veil:animation.flowX';
    expect(() => validateProductionTreatment(noiseFlow, inputs)).toThrow(
      'absolute-time rate',
    );

    const cameraDuration = structuredClone(build());
    cameraDuration.graphs[0]!.outputs[0]!.consumer =
      'layer-human-stage:camera.cinematicDuration';
    expect(() => validateProductionTreatment(cameraDuration, inputs)).toThrow(
      'absolute-time rate',
    );

    const particleEmission = structuredClone(build());
    particleEmission.graphs[0]!.outputs[0]!.consumer =
      'layer-atmospheric-haze:physics.emissionRate';
    expect(() => validateProductionTreatment(particleEmission, inputs)).toThrow(
      'absolute-time rate',
    );

    const morphRotation = structuredClone(build());
    morphRotation.graphs[0]!.outputs[0]!.consumer =
      'layer-signal-idol:rotation.speed';
    expect(() => validateProductionTreatment(morphRotation, inputs)).toThrow(
      'absolute-time rate',
    );

    const incompatible = structuredClone(build());
    incompatible.graphs[0]!.outputs[0]!.type = 'color';
    expect(() => validateProductionTreatment(incompatible, inputs)).toThrow(
      'Type-incompatible graph consumer',
    );
  });

  it('rejects impossible baseline settings, unknown presets, and an invisible manual flash', () => {
    const proseSetting = structuredClone(build());
    proseSetting.layers[1]!.baselineSettings.fixedRatePolicy = 'not a setting';
    expect(() => validateProductionTreatment(proseSetting, inputs)).toThrow(
      'Unknown baseline setting',
    );

    const invalidListItem = structuredClone(build());
    invalidListItem.layers[3]!.baselineSettings.appearance.colorPalette = [123];
    expect(() => validateProductionTreatment(invalidListItem, inputs)).toThrow(
      'Type-invalid list item',
    );

    const unknownAuthoringPreset = structuredClone(build());
    unknownAuthoringPreset.layers[7]!.authoringPresetId = 'missing';
    expect(() =>
      validateProductionTreatment(unknownAuthoringPreset, inputs),
    ).toThrow('Unknown authoring preset');

    const invisible = structuredClone(build());
    invisible.graphs.find(({ id }) => id === 'graph-score-direction')!.outputs =
      invisible.graphs
        .find(({ id }) => id === 'graph-score-direction')!
        .outputs.filter(
          ({ consumer }) => consumer !== 'layer-peak-flash:strength',
        );
    expect(() => validateProductionTreatment(invisible, inputs)).toThrow(
      'visible strength control path',
    );
  });

  it('requires breadth, evidence-bound exclusions, review coverage, and motion windows', () => {
    const missingBreadth = structuredClone(build());
    missingBreadth.breadth.included = missingBreadth.breadth.included.filter(
      ({ family }) => family !== 'complementary-2d',
    );
    expect(() => validateProductionTreatment(missingBreadth, inputs)).toThrow(
      'Missing breadth family complementary-2d',
    );

    const weakExclusion = structuredClone(build());
    weakExclusion.breadth.exclusions[0]!.evidenceRef = 'none';
    expect(() => validateProductionTreatment(weakExclusion, inputs)).toThrow(
      'requires input evidence and Gate 1',
    );

    const missingPeak = structuredClone(build());
    missingPeak.review.stillFrames = missingPeak.review.stillFrames.filter(
      ({ localFrame }) => localFrame !== 2655,
    );
    expect(() => validateProductionTreatment(missingPeak, inputs)).toThrow(
      'Missing required review frame 2655',
    );

    const missingMotion = structuredClone(build());
    missingMotion.review.motionWindows.pop();
    expect(() => validateProductionTreatment(missingMotion, inputs)).toThrow(
      'motion windows are required',
    );

    const falseStressCount = structuredClone(build());
    falseStressCount.performance.stressFrames[0]!.intendedSimultaneousLayerCount = 7;
    expect(() => validateProductionTreatment(falseStressCount, inputs)).toThrow(
      'Stress-frame layer count drifted',
    );

    const substitutedReview = structuredClone(build());
    substitutedReview.review.stillFrames[4]!.localFrame = 781;
    expect(() =>
      validateProductionTreatment(substitutedReview, inputs),
    ).toThrow('Exact still-review target set drifted');
  });

  it('rejects exact music-coordinate, act-boundary, and transition drift', () => {
    const musicTuple = structuredClone(build());
    musicTuple.music.durationSeconds = 47;
    expect(() => validateProductionTreatment(musicTuple, inputs)).toThrow(
      'Complete selected music identity tuple drifted',
    );

    const coordinate = structuredClone(build());
    coordinate.music.source.sampleStart += 1;
    expect(() => validateProductionTreatment(coordinate, inputs)).toThrow(
      'Music coordinate contract drifted',
    );

    const act = structuredClone(build());
    act.acts[1]!.range.localFrameStart += 1;
    expect(() => validateProductionTreatment(act, inputs)).toThrow(
      'Exact act identities or ranges drifted',
    );

    const transition = structuredClone(build());
    transition.transitions[0]!.centerLocalFrame += 1;
    expect(() => validateProductionTreatment(transition, inputs)).toThrow(
      'Exact transition identities or ranges drifted',
    );
  });

  it('never promotes performance targets or creative intent to automated approval', () => {
    const promotedPerformance = structuredClone(build());
    promotedPerformance.performance.status = 'passed';
    expect(() =>
      validateProductionTreatment(promotedPerformance, inputs),
    ).toThrow('must not be claimed as passes');

    const automatedApproval = structuredClone(build());
    automatedApproval.humanBoundary.authority =
      'Automated checks approve this treatment.';
    expect(() =>
      validateProductionTreatment(automatedApproval, inputs),
    ).toThrow('Creative approval must remain human-owned');
  });

  it('binds the rendered human document to the manifest identity and authored blueprint', () => {
    const treatment = build();
    const document = renderProductionTreatment(treatment, 'sha256:manifest');
    expect(document).toContain('Manifest content identity: `sha256:manifest`');
    expect(document).toContain('Gate 1 must explicitly approve or correct it');
    const changed = structuredClone(treatment);
    changed.title = 'Tampered';
    expect(() =>
      validateProductionTreatment(changed, inputs, treatment),
    ).toThrow('differs from deterministic authored blueprint');
  });
});
