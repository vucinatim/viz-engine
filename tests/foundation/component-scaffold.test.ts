import { createVizComponentScaffold } from '@viz-engine/dev-cli';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Viz component scaffold helper', () => {
  it('creates a predictable component scaffold file and next-step guidance', () => {
    const tempDirectory = mkdtempSync(
      join(tmpdir(), 'viz-component-scaffold-'),
    );

    try {
      const outputFile = join(tempDirectory, 'signal-ribbon.ts');
      const result = createVizComponentScaffold({
        componentId: 'signal-ribbon',
        componentName: 'Signal Ribbon',
        outputFile,
      });
      const fileContents = readFileSync(outputFile, 'utf8');

      expect(result.issues).toHaveLength(0);
      expect(result.exportName).toBe('SignalRibbonComponent');
      expect(fileContents).toContain('id: "signal-ribbon"');
      expect(fileContents).toContain('name: "Signal Ribbon"');
      expect(fileContents).toContain('SignalRibbonComponent');
      expect(fileContents).toContain('componentId: "signal-ribbon"');
      expect(fileContents).toContain('implementationVersion: "1.0.0"');
      expect(fileContents).toContain(
        'authoring: SignalRibbonComponentAuthoring',
      );
      expect(result.nextSteps[0]).toContain('capability pack');
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });

  it('rejects invalid scaffold ids without writing a file', () => {
    const result = createVizComponentScaffold({
      componentId: 'Signal Ribbon',
      componentName: 'Signal Ribbon',
      outputFile: join(tmpdir(), 'should-not-write.ts'),
    });

    expect(result.issues).toEqual([
      'Component id must be kebab-case using lowercase letters, numbers, and dashes only.',
    ]);
  });
});
