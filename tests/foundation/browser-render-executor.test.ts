import { createVizBrowserVideoFrameSchedule } from '@/lib/utils/browser-render-executor';
import { describe, expect, it } from 'vitest';

describe('browser render frame scheduling', () => {
  it.each([
    {
      sourceFps: 60,
      outputFps: 30,
      expected: [120, 122, 124, 126],
    },
    {
      sourceFps: 60,
      outputFps: 60,
      expected: [120, 121, 122, 123],
    },
    {
      sourceFps: 60,
      outputFps: 120,
      expected: [120, 121, 121, 122],
    },
  ])(
    'samples a $sourceFps FPS timeline at $outputFps FPS',
    ({ sourceFps, outputFps, expected }) => {
      expect(
        createVizBrowserVideoFrameSchedule(
          120,
          expected.length,
          sourceFps,
          outputFps,
        ),
      ).toEqual(expected);
    },
  );
});
