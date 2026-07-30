import type { VizRenderRequest } from '@viz-engine/contracts';
import { exampleProjectBundleDirectoryUrl } from '@viz-engine/example-projects/node';
import { VizCliArguments } from './arguments.js';
import { bakeLocalBundleAudio } from './audio-bake-command.js';
import { createVizComponentScaffold } from './component-scaffold.js';
import {
  applyActionsToBundleProject,
  applyActionsToExampleProject,
  exportBundleProject,
  exportExampleBundle,
  inspectBundleFrame,
  inspectBundleRender,
  inspectExampleFrame,
  inspectExampleRender,
  renderBundleSvg,
  renderExampleSvg,
  validateBundleProject,
  validateExampleProject,
} from './local-services.js';
import { renderLocalBundle } from './render-command.js';
import type { VizCliOutput } from './types.js';
import { VizCliInputError } from './types.js';

type CommandHandler = (
  args: VizCliArguments,
) => VizCliOutput | Promise<VizCliOutput>;

const unknown = (scope: string, action: string | undefined): never => {
  throw new VizCliInputError(
    'unknown-command',
    `Unknown ${scope} command: ${action ?? '<empty>'}.`,
  );
};

const exampleCommands: Record<string, CommandHandler> = {
  validate: () => validateExampleProject(),
  frame: (args) => inspectExampleFrame(args.frame()),
  render: (args) => inspectExampleRender(args.frame()),
  svg: (args) => renderExampleSvg(args.frame()),
  'bundle-export': (args) =>
    exportExampleBundle(args.require('--out', 'output directory')),
  'action-apply': (args) =>
    applyActionsToExampleProject(args.actions(), args.optional('--out')),
};

export const runExampleCommand = (
  argv: string[],
): VizCliOutput | Promise<VizCliOutput> => {
  const [action, ...values] = argv;
  const handler = exampleCommands[action ?? ''];
  return handler
    ? handler(new VizCliArguments(values))
    : unknown('example', action);
};

const bundleDirectory = (args: VizCliArguments): string =>
  args.directory(exampleProjectBundleDirectoryUrl);

const bundleCommands: Record<string, CommandHandler> = {
  validate: (args) => validateBundleProject(bundleDirectory(args)),
  frame: (args) => inspectBundleFrame(bundleDirectory(args), args.frame()),
  render: (args) => inspectBundleRender(bundleDirectory(args), args.frame()),
  svg: (args) => renderBundleSvg(bundleDirectory(args), args.frame()),
  export: (args) =>
    exportBundleProject(
      bundleDirectory(args),
      args.require('--out', 'output directory'),
    ),
  'action-apply': (args) =>
    applyActionsToBundleProject(
      bundleDirectory(args),
      args.actions(),
      args.optional('--out'),
    ),
  'bake-audio': async (args) => {
    const sourceAssetId = args.optional('--asset-id');
    const fps = args.number('--fps', { minimum: Number.MIN_VALUE });
    const fftSize = args.number('--fft-size', {
      integer: true,
      minimum: 1,
    });
    const startSeconds = args.number('--start', { minimum: 0 });
    const durationSeconds = args.number('--duration', { minimum: 0 });
    const result = await bakeLocalBundleAudio({
      sourceBundleDirectory: bundleDirectory(args),
      outputBundleDirectory: args.require('--out', 'output directory'),
      ...(sourceAssetId === undefined ? {} : { sourceAssetId }),
      ...(fps === undefined ? {} : { fps }),
      ...(fftSize === undefined ? {} : { fftSize }),
      ...(startSeconds === undefined ? {} : { startSeconds }),
      ...(durationSeconds === undefined ? {} : { durationSeconds }),
    });
    return {
      ok: result.ok,
      command: 'bundle bake-audio',
      payload: result.payload,
    };
  },
  'render-job': async (args) => {
    const result = await renderLocalBundle({
      sourceBundleDirectory: bundleDirectory(args),
      outputDirectory: args.require('--out', 'output directory'),
      request: args.json(
        '--request',
        'render request file',
      ) as VizRenderRequest,
    });
    return {
      ok: result.ok,
      command: 'bundle render-job',
      payload: result.payload,
    };
  },
};

export const runBundleCommand = (
  argv: string[],
): VizCliOutput | Promise<VizCliOutput> => {
  const [action, ...values] = argv;
  const handler = bundleCommands[action ?? ''];
  return handler
    ? handler(new VizCliArguments(values))
    : unknown('bundle', action);
};

export const runComponentCommand = (argv: string[]): VizCliOutput => {
  const [action, ...values] = argv;
  if (action !== 'scaffold') {
    return unknown('component', action);
  }
  const args = new VizCliArguments(values);
  const result = createVizComponentScaffold({
    componentId: args.require('--id', 'component id'),
    componentName: args.require('--name', 'component name'),
    outputFile: args.require('--out', 'output file'),
  });
  return {
    ok: result.issues.length === 0,
    command: 'component scaffold',
    payload: result,
  };
};
