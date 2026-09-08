import { exampleAudioTimelineArtifact } from '@viz-engine/example-projects';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const outputPath = resolve(
  'packages/viz-example-projects/fixtures/example-reactive-bars-bundle/baked/audio-authored-main.json',
);

writeFileSync(
  outputPath,
  `${JSON.stringify(exampleAudioTimelineArtifact, null, 2)}\n`,
);

process.stdout.write(`${outputPath}\n`);
