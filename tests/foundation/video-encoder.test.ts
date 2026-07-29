import {
  buildVideoEncodingCommand,
  estimateVideoSize,
} from '@/lib/utils/video-encoder';
import { describe, expect, it } from 'vitest';

describe('video encoder contract', () => {
  it('builds an MP4 command with trimmed audio and fast-start metadata', () => {
    expect(
      buildVideoEncodingCommand(
        {
          audioDuration: 5,
          audioStartTime: 12,
          format: 'mp4',
          fps: 30,
          height: 720,
          quality: 'medium',
          width: 1280,
        },
        true,
      ),
    ).toEqual([
      '-framerate',
      '30',
      '-pattern_type',
      'glob',
      '-i',
      'frame*.jpg',
      '-ss',
      '12',
      '-t',
      '5',
      '-i',
      'audio.mp3',
      '-c:v',
      'libx264',
      '-preset',
      'faster',
      '-crf',
      '22',
      '-tune',
      'film',
      '-c:a',
      'aac',
      '-shortest',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      'output.mp4',
    ]);
  });

  it('keeps MP4-only flags out of WebM exports', () => {
    const command = buildVideoEncodingCommand(
      {
        format: 'webm',
        fps: 60,
        height: 1080,
        quality: 'high',
        width: 1920,
      },
      false,
    );

    expect(command).toContain('libvpx-vp9');
    expect(command).toContain('output.webm');
    expect(command).not.toContain('-movflags');
    expect(command).not.toContain('-shortest');
    expect(command).not.toContain('audio.mp3');
  });

  it('estimates equal-duration exports consistently at different frame rates', () => {
    expect(estimateVideoSize(300, 1920, 1080, 'high', 30)).toBe(
      estimateVideoSize(600, 1920, 1080, 'high', 60),
    );
  });
});
