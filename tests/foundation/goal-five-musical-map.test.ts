import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  buildMusicalMap,
  renderReview,
  sectionDisposition,
  selectEnergyOpportunities,
  validateMusicalMap,
} from '../../tools/foundation/author-goal-five-musical-map';

const analysisPath =
  'docs/parity/evidence/artifacts/2026-09-04-goal-five-music-window-analysis.json';

function build() {
  return buildMusicalMap(
    JSON.parse(readFileSync(analysisPath, 'utf8')),
    'sha256:test-generator',
  );
}

describe('Goal Five frame-exact musical map', () => {
  it('preserves the exact landmark sets, edge exclusion, and gapless act map', () => {
    const map = build();
    expect(() => validateMusicalMap(map)).not.toThrow();
    expect(
      map.landmarks.sections.map(({ sourceFrame, disposition }) => ({
        sourceFrame,
        disposition,
      })),
    ).toEqual([
      { sourceFrame: 180, disposition: 'excluded-near-window-edge' },
      { sourceFrame: 540, disposition: 'proposed-act-boundary' },
      { sourceFrame: 1260, disposition: 'proposed-act-boundary' },
      { sourceFrame: 1740, disposition: 'proposed-act-boundary' },
      { sourceFrame: 2340, disposition: 'proposed-act-boundary' },
    ]);
    expect(
      map.acts.map(({ range }) => [
        range.localFrameStart,
        range.localFrameEndExclusive,
      ]),
    ).toEqual([
      [0, 405],
      [405, 1125],
      [1125, 1605],
      [1605, 2205],
      [2205, 2880],
    ]);
    expect(map.landmarks.beats).toHaveLength(82);
    expect(map.landmarks.phrases).toHaveLength(10);
    expect(map.landmarks.transients).toHaveLength(69);
  });

  it('keeps detector observation samples distinct from nearest scheduling frames', () => {
    const map = build();
    expect(
      Math.max(
        ...map.landmarks.transients.map(({ schedulingQuantizationSamples }) =>
          Math.abs(schedulingQuantizationSamples),
        ),
      ),
    ).toBe(400);
    expect(map.coordinateContract.precision).toContain('at most 400 samples');
  });

  it('matches the upstream half-open one-second section inset at both edges', () => {
    expect(sectionDisposition(59, 2880)).toBe('excluded-near-window-edge');
    expect(sectionDisposition(60, 2880)).toBe('proposed-act-boundary');
    expect(sectionDisposition(2819, 2880)).toBe('proposed-act-boundary');
    expect(sectionDisposition(2820, 2880)).toBe('excluded-near-window-edge');
  });

  it('rejects count-preserving substitution, edge omission, and act gaps', () => {
    const expected = build();
    const substituted = structuredClone(expected);
    substituted.landmarks.beats[0]!.sourceSample += 1;
    expect(() => validateMusicalMap(substituted, expected)).toThrow(
      'differs from deterministic derivation',
    );

    const omitted = structuredClone(expected);
    omitted.landmarks.sections.shift();
    expect(() => validateMusicalMap(omitted)).toThrow(
      'All five in-window section hypotheses',
    );

    const gapped = structuredClone(expected);
    gapped.acts[1]!.range.localFrameStart += 1;
    expect(() => validateMusicalMap(gapped)).toThrow('gapless');
  });

  it('labels partial edge bins and lower-energy opportunities without inventing silence', () => {
    const map = build();
    expect(map.energy.bins[0]!.coverage).toBe(
      'partial-window-overlap-of-upstream-bin',
    );
    expect(map.energy.bins.at(-1)!.coverage).toBe(
      'partial-window-overlap-of-upstream-bin',
    );
    expect(map.energy.upstreamQualifyingSilenceIntervalCount).toBe(0);
    expect(
      map.energy.restOpportunities.every(({ silenceClaim }) => !silenceClaim),
    ).toBe(true);
  });

  it('uses deterministic frame tie-breaking and exposes equal alternatives', () => {
    const candidates = [
      {
        id: 'edge-a',
        localFrameStart: 0,
        localFrameEndExclusive: 60,
        loudness: 0.5,
      },
      {
        id: 'late',
        localFrameStart: 60,
        localFrameEndExclusive: 120,
        loudness: 0.8,
      },
      {
        id: 'valley',
        localFrameStart: 120,
        localFrameEndExclusive: 180,
        loudness: 0.3,
      },
      {
        id: 'early',
        localFrameStart: 180,
        localFrameEndExclusive: 240,
        loudness: 0.8,
      },
      {
        id: 'edge-b',
        localFrameStart: 240,
        localFrameEndExclusive: 300,
        loudness: 0.4,
      },
    ];
    const peaks = selectEnergyOpportunities(candidates, 'peak');
    expect(peaks.map(({ id }) => id)).toEqual(['late', 'early']);
    expect(peaks[0]!.tiedAlternativeIds).toEqual(['early']);
  });

  it('rejects dangling intent references and binds the review to the artifact digest', () => {
    const map = build();
    const dangling = structuredClone(map);
    dangling.responsePlan.detail[0]!.evidenceRefs = ['missing-landmark'];
    expect(() => validateMusicalMap(dangling)).toThrow(
      'Dangling evidence reference',
    );
    expect(renderReview(map, 'sha256:artifact')).toContain(
      'Artifact content identity: `sha256:artifact`',
    );
  });
});
