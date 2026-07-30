import { runRegisteredVizCommand } from './command-registry.js';
import type { VizCliOutput } from './types.js';
import { VizCliInputError } from './types.js';

export { getVizCliCommands } from './command-registry.js';
export { createVizComponentScaffold } from './component-scaffold.js';
export * from './live-control-client.js';
export * from './local-services.js';
export { renderLocalBundle } from './render-command.js';
export type { VizCliOutput } from './types.js';

export const runVizCli = async (argv: string[]): Promise<VizCliOutput> => {
  try {
    return await runRegisteredVizCommand(argv);
  } catch (error) {
    return {
      ok: false,
      command: argv.slice(0, 2).join(' ') || 'error',
      payload: {
        code:
          error instanceof VizCliInputError
            ? error.code
            : 'command-execution-failed',
        message: error instanceof Error ? error.message : 'Unknown CLI error.',
      },
    };
  }
};

const main = async (): Promise<void> => {
  const output = await runVizCli(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  process.exit(output.ok ? 0 : 1);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
