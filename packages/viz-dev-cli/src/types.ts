export interface VizCliOutput {
  ok: boolean;
  command: string;
  payload: unknown;
}

export interface VizCliCommand {
  scope: string;
  category: 'live' | 'local';
  usages: readonly string[];
  run(argv: string[]): Promise<VizCliOutput> | VizCliOutput;
}

export class VizCliInputError extends Error {
  readonly code: 'invalid-arguments' | 'unknown-command';

  constructor(code: VizCliInputError['code'], message: string) {
    super(message);
    this.name = 'VizCliInputError';
    this.code = code;
  }
}
