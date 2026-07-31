import { describe, expect, it } from 'vitest';

import {
  advanceEditorPreviewFrameDeadline,
  isEditorPreviewFrameDue,
} from '@/lib/editor-runtime-preview-clock';

describe('editor runtime preview clock', () => {
  it('carries frame deadlines across a higher-refresh display', () => {
    const displayInterval = 1_000 / 144;
    const renderInterval = 1_000 / 60;
    const renderedAt: number[] = [];
    let deadline = 0;

    for (let displayFrame = 0; displayFrame < 1_440; displayFrame += 1) {
      const now = displayFrame * displayInterval;
      if (!isEditorPreviewFrameDue(now, deadline)) {
        continue;
      }
      renderedAt.push(now);
      deadline = advanceEditorPreviewFrameDeadline(
        now,
        deadline,
        renderInterval,
      );
    }

    const intervals = renderedAt
      .slice(1)
      .map((now, index) => now - renderedAt[index]!);
    const mean =
      intervals.reduce((total, interval) => total + interval, 0) /
      intervals.length;

    expect(mean).toBeCloseTo(renderInterval, 1);
    expect(Math.min(...intervals)).toBeLessThan(renderInterval);
    expect(Math.max(...intervals)).toBeGreaterThan(renderInterval);
  });

  it('skips missed deadlines instead of requesting catch-up bursts', () => {
    expect(advanceEditorPreviewFrameDeadline(75, 16, 16)).toBe(80);
  });
});
