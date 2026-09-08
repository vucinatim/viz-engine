import {
  createVizAudioPcmIdentity,
  encodeVizAudioPcmWav,
} from '@viz-engine/bake';
import {
  decodeVizAudioFileToPcm,
  deriveVizAudioFileWindow,
} from '@viz-engine/bake/node';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import * as fsAsync from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', async (original) => {
  const actual = await original<typeof import('node:fs/promises')>();
  return { ...actual, rm: vi.fn(actual.rm) };
});
const directories: string[] = [];
const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), 'viz-audio-derive-test-'));
  directories.push(root);
  const pcm = {
    sampleRate: 8000,
    channels: [
      Float32Array.from({ length: 8000 }, (_, i) => Math.sin(i / 11) * 0.5),
    ],
  };
  const sourcePath = join(root, 'source.wav');
  writeFileSync(sourcePath, encodeVizAudioPcmWav(pcm));
  return {
    root,
    pcm,
    sourcePath,
    outputPath: join(root, 'clip.wav'),
    window: { startSample: 101, endSampleExclusive: 4101 },
  };
};
afterEach(() => {
  vi.mocked(fsAsync.rm).mockClear();
  for (const root of directories.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe('exact Node audio derivation lifecycle', () => {
  it('repeats exact bytes, preserves source and snapshots caller-owned coordinates', async () => {
    const f = fixture();
    const source = readFileSync(f.sourcePath);
    const expectedPcm = createVizAudioPcmIdentity(f.pcm);
    const result = await deriveVizAudioFileWindow({
      ...f,
      expectedPcm,
      onProgress: (p) => {
        if (p.stage === 'writing') f.window.startSample = 202;
      },
    });
    expect(result.window).toEqual({
      startSample: 101,
      endSampleExclusive: 4101,
    });
    const decoded = await decodeVizAudioFileToPcm(f.outputPath);
    expect(decoded.pcm.channels[0]).toEqual(
      f.pcm.channels[0]!.slice(101, 4101),
    );
    const repeated = await deriveVizAudioFileWindow({
      ...f,
      window: result.window,
      outputPath: join(f.root, 'repeat.wav'),
    });
    expect(repeated.derivative.contentIdentity).toBe(
      result.derivative.contentIdentity,
    );
    expect(readFileSync(f.sourcePath)).toEqual(source);
  });

  it('rejects wrong source/PCM identities and out-of-bounds windows without output', async () => {
    const f = fixture();
    for (const [overrides, code] of [
      [
        { expectedSourceContentIdentity: 'sha256:wrong' },
        'source-identity-mismatch',
      ],
      [
        {
          expectedPcm: {
            ...createVizAudioPcmIdentity(f.pcm),
            sampleRate: 16000,
          },
        },
        'pcm-identity-mismatch',
      ],
      [
        { window: { startSample: 0, endSampleExclusive: 8001 } },
        'invalid-sample-window',
      ],
    ] as const) {
      await expect(
        deriveVizAudioFileWindow({ ...f, ...overrides }),
      ).rejects.toMatchObject({ code });
      expect(readdirSync(f.root)).toEqual(['source.wav']);
    }
  });

  it('preserves an existing target on exclusive publication failure', async () => {
    const f = fixture();
    writeFileSync(f.outputPath, 'existing');
    await expect(deriveVizAudioFileWindow(f)).rejects.toMatchObject({
      code: 'output-write-failed',
    });
    expect(readFileSync(f.outputPath, 'utf8')).toBe('existing');
    expect(readdirSync(f.root).sort()).toEqual(['clip.wav', 'source.wav']);
  });

  it.each(['decoding', 'deriving', 'writing'] as const)(
    'cancels at terminal %s progress, cleans output, and allows recovery',
    async (stage) => {
      const f = fixture();
      const controller = new AbortController();
      await expect(
        deriveVizAudioFileWindow({
          ...f,
          signal: controller.signal,
          onProgress: (p) => {
            if (p.stage === stage && p.completed === p.total)
              controller.abort();
          },
        }),
      ).rejects.toMatchObject({ code: 'cancelled' });
      expect(readdirSync(f.root)).toEqual(['source.wav']);
      await expect(deriveVizAudioFileWindow(f)).resolves.toMatchObject({
        derivative: { path: f.outputPath },
      });
    },
  );

  it('rolls back published output if temporary unlink fails and reports cleanup failure', async () => {
    const f = fixture();
    const actual =
      await vi.importActual<typeof import('node:fs/promises')>(
        'node:fs/promises',
      );
    vi.mocked(fsAsync.rm).mockImplementation(async (path, options) => {
      if (String(path).includes('.partial-'))
        throw new Error('injected unlink failure');
      return actual.rm(path, options);
    });
    try {
      await expect(deriveVizAudioFileWindow(f)).rejects.toMatchObject({
        code: 'output-write-failed',
        message: expect.stringContaining('injected unlink failure'),
      });
      expect(existsSync(f.outputPath)).toBe(false);
    } finally {
      vi.mocked(fsAsync.rm).mockImplementation(actual.rm);
    }
  });

  it('binds source identity to the decoded snapshot when the original path is replaced during probe', async () => {
    const f = fixture();
    const ffprobe = spawnSync('which', ['ffprobe'], {
      encoding: 'utf8',
    }).stdout.trim();
    const wrapper = join(f.root, 'probe-wrapper.cjs');
    writeFileSync(
      wrapper,
      `#!${process.execPath}\nconst fs=require('node:fs'); const cp=require('node:child_process'); fs.writeFileSync(${JSON.stringify(f.sourcePath)}, 'replaced'); const p=cp.spawnSync(${JSON.stringify(ffprobe)},process.argv.slice(2));process.stdout.write(p.stdout);process.stderr.write(p.stderr);process.exit(p.status ?? 1);`,
      { mode: 0o755 },
    );
    const decoded = await decodeVizAudioFileToPcm(f.sourcePath, {
      ffprobePath: wrapper,
    });
    expect(decoded.pcm.channels).toEqual(f.pcm.channels);
    expect(readFileSync(f.sourcePath, 'utf8')).toBe('replaced');
    expect(decoded.filePath).toBe(f.sourcePath);
  });
  it('settles actual child-process cancellation, removes its source snapshot and recovers', async () => {
    const f = fixture();
    const marker = join(f.root, 'decoder-started.json');
    const wrapper = join(f.root, 'decoder-wrapper.cjs');
    writeFileSync(
      wrapper,
      `#!${process.execPath}\nconst fs=require('node:fs'); if(process.argv.includes('-version')) { process.stdout.write('controlled decoder version 1\\n'); } else { process.on('SIGTERM', () => {}); fs.writeFileSync(${JSON.stringify(marker)}, JSON.stringify({pid:process.pid,input:process.argv[process.argv.indexOf('-i')+1]})); setInterval(()=>{},100); }`,
      { mode: 0o755 },
    );
    const controller = new AbortController();
    const decoding = decodeVizAudioFileToPcm(f.sourcePath, {
      ffmpegPath: wrapper,
      signal: controller.signal,
    });
    const rejection = expect(decoding).rejects.toMatchObject({
      code: 'cancelled',
    });
    await expect
      .poll(() => existsSync(marker), { interval: 10, timeout: 3000 })
      .toBe(true);
    const child = JSON.parse(readFileSync(marker, 'utf8'));
    controller.abort();
    await rejection;
    expect(() => process.kill(child.pid, 0)).toThrow();
    expect(existsSync(child.input)).toBe(false);
    expect((await decodeVizAudioFileToPcm(f.sourcePath)).pcm.channels).toEqual(
      f.pcm.channels,
    );
  });
});
