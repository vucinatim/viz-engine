import { runLiveCommand } from './live-command.js';
import {
  runBundleCommand,
  runComponentCommand,
  runExampleCommand,
} from './local-commands.js';
import type { VizCliCommand, VizCliOutput } from './types.js';
import { VizCliInputError } from './types.js';

const commands: VizCliCommand[] = [
  {
    scope: 'live',
    category: 'live',
    usages: [
      'live discover [--url <origin>]',
      'live snapshot [--url <origin>]',
      'live project [--url <origin>]',
      'live components [--url <origin>]',
      'live graphs [--graph-id <id>] [--url <origin>]',
      'live transact --transaction <json-file> [--url <origin>]',
      'live undo|redo|play|pause [--url <origin>]',
      'live seek --frame <frame> [--url <origin>]',
      'live jobs [--url <origin>]',
      'live job --job-id <id> [--url <origin>]',
      'live bake-start --request <json-file> [--url <origin>]',
      'live render-start --request <json-file> [--url <origin>]',
      'live job-cancel --job-id <id> [--url <origin>]',
      'live bake-attach --job-id <id> [--expected-revision <revision>] [--url <origin>]',
    ],
    run: runLiveCommand,
  },
  {
    scope: 'example',
    category: 'local',
    usages: [
      'example validate|frame|render|svg',
      'example bundle-export --out <directory>',
      'example action-apply --actions <json-file> [--out <directory>]',
    ],
    run: runExampleCommand,
  },
  {
    scope: 'bundle',
    category: 'local',
    usages: [
      'bundle validate|frame|render|svg --dir <directory>',
      'bundle export --dir <directory> --out <directory>',
      'bundle action-apply --dir <directory> --actions <json-file> [--out <directory>]',
      'bundle bake-audio --dir <directory> --out <directory> [--asset-id <id>] [--fps <fps>] [--fft-size <size>] [--start <seconds>] [--duration <seconds>]',
      'bundle render-job --dir <directory> --out <directory> --request <json-file>',
    ],
    run: runBundleCommand,
  },
  {
    scope: 'component',
    category: 'local',
    usages: ['component scaffold --id <id> --name <name> --out <file>'],
    run: runComponentCommand,
  },
];

const createHelpOutput = (): VizCliOutput => ({
  ok: true,
  command: 'help',
  payload: {
    executable: 'viz-dev',
    commands: {
      live: commands
        .filter((command) => command.category === 'live')
        .flatMap((command) => command.usages),
      local: commands
        .filter((command) => command.category === 'local')
        .flatMap((command) => command.usages),
    },
  },
});

export const runRegisteredVizCommand = async (
  argv: string[],
): Promise<VizCliOutput> => {
  const [scope, ...rest] = argv;
  if (
    scope === undefined ||
    scope === 'help' ||
    scope === '--help' ||
    scope === '-h'
  ) {
    return createHelpOutput();
  }
  const command = commands.find((candidate) => candidate.scope === scope);
  if (!command) {
    throw new VizCliInputError(
      'unknown-command',
      `Unknown command scope: ${scope}.`,
    );
  }
  return command.run(rest);
};

export const getVizCliCommands = (): readonly VizCliCommand[] => commands;
