import {
  buildVideoEncodingCommand,
  estimateVideoSize,
  parseEncodedVideoProbe,
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

  it('authoritatively parses FFprobe media structure', () => {
    expect(
      parseEncodedVideoProbe(
        {
          format: {
            format_name: 'mov,mp4,m4a,3gp,3g2,mj2',
            duration: '2.000000',
          },
          streams: [
            {
              codec_type: 'video',
              codec_name: 'h264',
              width: 640,
              height: 360,
              r_frame_rate: '30/1',
              duration: '2.000000',
            },
            {
              codec_type: 'audio',
              codec_name: 'aac',
              sample_rate: '48000',
              channels: 2,
              duration: '2.000000',
            },
          ],
        },
        123_456,
      ),
    ).toEqual({
      container: 'mov,mp4,m4a,3gp,3g2,mj2',
      durationSeconds: 2,
      byteLength: 123_456,
      streams: [
        {
          kind: 'video',
          codec: 'h264',
          durationSeconds: 2,
          width: 640,
          height: 360,
          frameRate: 30,
        },
        {
          kind: 'audio',
          codec: 'aac',
          durationSeconds: 2,
          sampleRate: 48_000,
          channelCount: 2,
        },
      ],
    });
  });
});
