import type { VizAudioFeatureBakeJobRequest } from '@viz-engine/bake';
import type {
  VizProjectTransaction,
  VizRenderRequest,
} from '@viz-engine/contracts';
import { z } from 'zod';

export const VIZ_CONTROL_PROTOCOL_VERSION = 1 as const;

const nonEmptyString = z.string().trim().min(1);
const unknownRecord = z.record(z.unknown());
const strictObject = <TShape extends z.ZodRawShape>(shape: TShape) =>
  z.object(shape).strict();
const positionSchema = strictObject({ x: z.number(), y: z.number() });

const assetRefSchema = z
  .object({
    id: nonEmptyString,
    kind: z.enum(['audio', 'image', 'video', 'model', 'binary']),
    source: z.enum(['local', 'bundle', 'cloud', 'external', 'generated']),
    label: nonEmptyString,
    mimeType: z.string().optional(),
    originalFileName: z.string().optional(),
    metadata: unknownRecord.optional(),
  })
  .strict();

const artifactRefSchema = z
  .object({
    id: nonEmptyString,
    kind: z.enum([
      'audio-feature-timeline',
      'simulation-checkpoint',
      'analysis-payload',
      'derived-media',
      'render-output',
    ]),
    label: nonEmptyString,
    sourceAssetId: nonEmptyString.optional(),
    metadata: unknownRecord.optional(),
  })
  .strict();

const valueSourceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('literal'), value: z.unknown() }).strict(),
  z
    .object({
      kind: z.literal('asset-ref'),
      assetId: nonEmptyString,
    })
    .strict(),
  z
    .object({
      kind: z.literal('graph-output'),
      graphId: nonEmptyString,
      output: nonEmptyString,
    })
    .strict(),
  z
    .object({
      kind: z.literal('artifact-feature'),
      artifactId: nonEmptyString,
      feature: nonEmptyString,
    })
    .strict(),
]);

const graphInputSourceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('literal'), value: z.unknown() }).strict(),
  z
    .object({
      kind: z.literal('asset-ref'),
      assetId: nonEmptyString,
    })
    .strict(),
  z
    .object({
      kind: z.literal('artifact-feature'),
      artifactId: nonEmptyString,
      feature: nonEmptyString,
    })
    .strict(),
]);

const graphNodeInputBindingSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('literal'), value: z.unknown() }).strict(),
  z
    .object({
      kind: z.literal('graph-input'),
      inputKey: nonEmptyString,
    })
    .strict(),
  z
    .object({
      kind: z.literal('node-output'),
      nodeId: nonEmptyString,
      output: nonEmptyString,
      edgeId: nonEmptyString.optional(),
    })
    .strict(),
]);

const graphNodeSchema = z
  .object({
    id: nonEmptyString,
    type: nonEmptyString,
    position: z
      .object({
        x: z.number(),
        y: z.number(),
      })
      .optional(),
    inputs: z.record(graphNodeInputBindingSchema).optional(),
    metadata: unknownRecord.optional(),
  })
  .strict();

const graphOutputSchema = z
  .object({
    key: nonEmptyString,
    nodeId: nonEmptyString.optional(),
    output: nonEmptyString.optional(),
    valueType: z
      .enum([
        'number',
        'string',
        'boolean',
        'color',
        'file',
        'vector3',
        'Uint8Array',
        'FrequencyAnalysis',
        'object',
        'math-op',
      ])
      .optional(),
    position: z
      .object({
        x: z.number(),
        y: z.number(),
      })
      .optional(),
  })
  .strict();

const graphSchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    enabled: z.boolean().optional(),
    inputs: z.record(graphInputSourceSchema).optional(),
    nodes: z.array(graphNodeSchema),
    outputs: z.array(graphOutputSchema),
    metadata: unknownRecord.optional(),
  })
  .strict();

const layerSchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    componentId: nonEmptyString,
    enabled: z.boolean(),
    opacity: z.number().finite(),
    blendMode: z.enum([
      'normal',
      'multiply',
      'screen',
      'overlay',
      'darken',
      'lighten',
      'color-dodge',
      'color-burn',
      'hard-light',
      'soft-light',
      'difference',
      'exclusion',
      'hue',
      'saturation',
      'color',
      'luminosity',
      'add',
    ]),
    rendererFamily: z
      .enum(['three', 'canvas2d', 'webgpu', 'video', 'image', 'unknown'])
      .optional(),
    transform: z
      .object({
        x: z.number().finite().optional(),
        y: z.number().finite().optional(),
        scaleX: z.number().finite().optional(),
        scaleY: z.number().finite().optional(),
        rotationDegrees: z.number().finite().optional(),
        anchorX: z.number().finite().optional(),
        anchorY: z.number().finite().optional(),
      })
      .strict()
      .optional(),
    surface: z
      .object({
        backgroundColor: z.string().optional(),
        freezeWhenPaused: z.boolean().optional(),
      })
      .strict()
      .optional(),
    settings: unknownRecord.optional(),
    inputs: z.record(valueSourceSchema).optional(),
    graphId: nonEmptyString.optional(),
    requiredAssetIds: z.array(nonEmptyString).optional(),
    requiredArtifactIds: z.array(nonEmptyString).optional(),
    renderPolicy: z
      .object({
        supportedModes: z.array(z.enum(['live', 'render', 'bake'])).optional(),
        requiresBake: z.boolean().optional(),
        preferredRendererFamily: z
          .enum(['three', 'canvas2d', 'webgpu', 'video', 'image', 'unknown'])
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const actionSchema = <TType extends string, TPayload extends z.ZodRawShape>(
  type: TType,
  payload: TPayload,
) =>
  strictObject({
    type: z.literal(type),
    payload: strictObject(payload),
  });

const projectActionSchema = z.discriminatedUnion('type', [
  actionSchema('asset.attach', { asset: assetRefSchema }),
  actionSchema('asset.replace', {
    assetId: nonEmptyString,
    asset: assetRefSchema,
  }),
  actionSchema('artifact.attach', { artifact: artifactRefSchema }),
  actionSchema('layer.create', {
    layerId: nonEmptyString.optional(),
    index: z.number().int().optional(),
    layer: layerSchema.partial({ id: true }),
  }),
  actionSchema('layer.remove', { layerId: nonEmptyString }),
  actionSchema('layer.move', {
    layerId: nonEmptyString,
    index: z.number().int(),
  }),
  actionSchema('layer.replace', {
    layerId: nonEmptyString,
    layer: layerSchema,
  }),
  actionSchema('layer.settings.set', {
    layerId: nonEmptyString,
    path: nonEmptyString,
    value: z.unknown(),
  }),
  actionSchema('layer.input.set', {
    layerId: nonEmptyString,
    inputKey: nonEmptyString,
    valueSource: valueSourceSchema.nullable(),
  }),
  actionSchema('timeline.set', {
    timeline: strictObject({
      fps: z.number().finite().positive(),
      durationInFrames: z.number().int().positive(),
      sampleRate: z.number().finite().positive().optional(),
    }),
  }),
  actionSchema('graph.create', {
    graphId: nonEmptyString.optional(),
    name: nonEmptyString,
  }),
  actionSchema('graph.replace', {
    graphId: nonEmptyString,
    graph: graphSchema,
  }),
  actionSchema('graph.remove', { graphId: nonEmptyString }),
  actionSchema('graph.input.set', {
    graphId: nonEmptyString,
    inputKey: nonEmptyString,
    source: graphInputSourceSchema.nullable(),
  }),
  actionSchema('graph.node.add', {
    graphId: nonEmptyString,
    nodeId: nonEmptyString.optional(),
    nodeType: nonEmptyString,
    position: positionSchema.optional(),
    initialInputs: z.record(graphNodeInputBindingSchema).optional(),
    metadata: unknownRecord.optional(),
  }),
  actionSchema('graph.node.position.set', {
    graphId: nonEmptyString,
    nodeId: nonEmptyString,
    position: positionSchema,
  }),
  actionSchema('graph.node.remove', {
    graphId: nonEmptyString,
    nodeId: nonEmptyString,
  }),
  actionSchema('graph.node.input.set', {
    graphId: nonEmptyString,
    nodeId: nonEmptyString,
    inputKey: nonEmptyString,
    binding: graphNodeInputBindingSchema.nullable(),
  }),
  actionSchema('graph.output.set', {
    graphId: nonEmptyString,
    output: graphOutputSchema,
  }),
  actionSchema('graph.output.remove', {
    graphId: nonEmptyString,
    outputKey: nonEmptyString,
  }),
  actionSchema('graph.output.position.set', {
    graphId: nonEmptyString,
    outputKey: nonEmptyString,
    position: positionSchema,
  }),
  actionSchema('graph.enabled.set', {
    graphId: nonEmptyString,
    enabled: z.boolean(),
  }),
]);

const projectTransactionSchema = z
  .object({
    id: nonEmptyString.optional(),
    expectedRevision: z.number().int().nonnegative().optional(),
    dryRun: z.boolean().optional(),
    actions: z.array(projectActionSchema).min(1),
  })
  .strict();

const audioFeatureBakeJobRequestSchema = z
  .object({
    kind: z.literal('audio-feature-timeline'),
    sourceAssetId: nonEmptyString,
    profile: z.literal('standard'),
    fps: z.number().finite().positive(),
    expectedSourceContentIdentity: nonEmptyString.optional(),
    artifactId: nonEmptyString.optional(),
    artifactLabel: nonEmptyString.optional(),
    artifactUri: nonEmptyString.optional(),
    fftSize: z
      .number()
      .int()
      .min(32)
      .refine((value) => (value & (value - 1)) === 0, {
        message: 'fftSize must be a power of two.',
      })
      .optional(),
    minDecibels: z.number().finite().optional(),
    maxDecibels: z.number().finite().optional(),
    sourceWindow: z
      .object({
        startSeconds: z.number().finite().nonnegative().optional(),
        durationSeconds: z.number().finite().nonnegative().optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (request) =>
      request.minDecibels === undefined ||
      request.maxDecibels === undefined ||
      request.minDecibels < request.maxDecibels,
    {
      message: 'minDecibels must be lower than maxDecibels.',
      path: ['minDecibels'],
    },
  );

const renderRequestBaseShape = {
  schemaVersion: z.literal(1),
  source: z
    .object({
      projectId: nonEmptyString,
      expectedRevision: z.number().int().nonnegative().optional(),
      expectedContentIdentity: nonEmptyString.optional(),
    })
    .strict(),
  intent: z.enum(['preview', 'candidate', 'final', 'integration']),
  executorId: nonEmptyString,
  outputLabel: nonEmptyString,
  viewport: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      backgroundColor: z.string().optional(),
    })
    .strict(),
  quality: z.enum(['draft', 'standard', 'high']),
};

const renderRequestSchema = z.discriminatedUnion('kind', [
  z
    .object({
      ...renderRequestBaseShape,
      kind: z.literal('still'),
      frame: z.number().int().nonnegative(),
      format: z.enum(['svg', 'png', 'jpeg', 'webp']),
      imageQuality: z.number().finite().min(0).max(1).optional(),
    })
    .strict(),
  z
    .object({
      ...renderRequestBaseShape,
      kind: z.literal('contact-sheet'),
      frames: z
        .array(z.number().int().nonnegative())
        .min(1)
        .max(256)
        .refine((frames) => new Set(frames).size === frames.length, {
          message: 'Contact-sheet frames must be unique.',
        }),
      columns: z.number().int().positive().optional(),
      gap: z.number().int().min(0).max(256).optional(),
      format: z.enum(['svg', 'png', 'jpeg', 'webp']),
      imageQuality: z.number().finite().min(0).max(1).optional(),
    })
    .strict(),
  z
    .object({
      ...renderRequestBaseShape,
      kind: z.literal('clip'),
      startFrame: z.number().int().nonnegative(),
      frameCount: z.number().int().positive(),
      fps: z.number().int().positive(),
      format: z.enum(['mp4', 'webm']),
      includeAudio: z.boolean(),
    })
    .strict(),
  z
    .object({
      ...renderRequestBaseShape,
      kind: z.literal('video'),
      startFrame: z.number().int().nonnegative(),
      frameCount: z.number().int().positive(),
      fps: z.number().int().positive(),
      format: z.enum(['mp4', 'webm']),
      includeAudio: z.boolean(),
    })
    .strict(),
]);

const requestSchema = <
  TOperation extends string,
  TFields extends z.ZodRawShape,
>(
  operation: TOperation,
  fields: TFields,
) =>
  strictObject({
    protocolVersion: z.literal(VIZ_CONTROL_PROTOCOL_VERSION),
    id: nonEmptyString,
    operation: z.literal(operation),
    ...fields,
  });

const controlRequestSchema = z.discriminatedUnion('operation', [
  requestSchema('control.discover', {}),
  requestSchema('control.snapshot', {}),
  requestSchema('project.inspect', {}),
  requestSchema('project.bundle.open', { url: nonEmptyString }),
  requestSchema('component.inspect', {
    componentId: nonEmptyString.optional(),
  }),
  requestSchema('node.inspect', { nodeType: nonEmptyString.optional() }),
  requestSchema('graph.inspect', { graphId: nonEmptyString.optional() }),
  requestSchema('graph.runtime.inspect', {
    frame: z.number().int().nonnegative().optional(),
  }),
  requestSchema('frame.inspect', {
    frame: z.number().int().nonnegative().optional(),
  }),
  requestSchema('render.inspect', {
    frame: z.number().int().nonnegative().optional(),
  }),
  requestSchema('debug.inspect', {
    frame: z.number().int().nonnegative().optional(),
  }),
  requestSchema('transaction.apply', {
    transaction: projectTransactionSchema,
  }),
  requestSchema('history.undo', {}),
  requestSchema('history.redo', {}),
  requestSchema('preview.play', {}),
  requestSchema('preview.pause', {}),
  requestSchema('preview.seek', { frame: z.number().int().nonnegative() }),
  requestSchema('job.list', {}),
  requestSchema('job.inspect', { jobId: nonEmptyString }),
  requestSchema('job.output.download', {
    jobId: nonEmptyString,
    outputId: nonEmptyString.optional(),
  }),
  requestSchema('audio-bake.start', {
    request: audioFeatureBakeJobRequestSchema,
  }),
  requestSchema('render.start', { request: renderRequestSchema }),
  requestSchema('job.cancel', { jobId: nonEmptyString }),
  requestSchema('audio-bake.attach', {
    jobId: nonEmptyString,
    expectedRevision: z.number().int().nonnegative().optional(),
  }),
]);

interface VizControlRequestBase {
  protocolVersion: typeof VIZ_CONTROL_PROTOCOL_VERSION;
  id: string;
}

export type VizControlRequest =
  | (VizControlRequestBase & { operation: 'control.discover' })
  | (VizControlRequestBase & { operation: 'control.snapshot' })
  | (VizControlRequestBase & { operation: 'project.inspect' })
  | (VizControlRequestBase & {
      operation: 'project.bundle.open';
      url: string;
    })
  | (VizControlRequestBase & {
      operation: 'component.inspect';
      componentId?: string;
    })
  | (VizControlRequestBase & {
      operation: 'node.inspect';
      nodeType?: string;
    })
  | (VizControlRequestBase & {
      operation: 'graph.inspect';
      graphId?: string;
    })
  | (VizControlRequestBase & {
      operation: 'graph.runtime.inspect';
      frame?: number;
    })
  | (VizControlRequestBase & {
      operation: 'frame.inspect';
      frame?: number;
    })
  | (VizControlRequestBase & {
      operation: 'render.inspect';
      frame?: number;
    })
  | (VizControlRequestBase & {
      operation: 'debug.inspect';
      frame?: number;
    })
  | (VizControlRequestBase & {
      operation: 'transaction.apply';
      transaction: VizProjectTransaction;
    })
  | (VizControlRequestBase & { operation: 'history.undo' })
  | (VizControlRequestBase & { operation: 'history.redo' })
  | (VizControlRequestBase & { operation: 'preview.play' })
  | (VizControlRequestBase & { operation: 'preview.pause' })
  | (VizControlRequestBase & {
      operation: 'preview.seek';
      frame: number;
    })
  | (VizControlRequestBase & { operation: 'job.list' })
  | (VizControlRequestBase & {
      operation: 'job.inspect';
      jobId: string;
    })
  | (VizControlRequestBase & {
      operation: 'job.output.download';
      jobId: string;
      outputId?: string;
    })
  | (VizControlRequestBase & {
      operation: 'audio-bake.start';
      request: VizAudioFeatureBakeJobRequest;
    })
  | (VizControlRequestBase & {
      operation: 'render.start';
      request: VizRenderRequest;
    })
  | (VizControlRequestBase & {
      operation: 'job.cancel';
      jobId: string;
    })
  | (VizControlRequestBase & {
      operation: 'audio-bake.attach';
      jobId: string;
      expectedRevision?: number;
    });

export interface VizControlProtocolError {
  code: 'invalid-request' | 'unsupported-operation' | 'operation-failed';
  message: string;
  issues?: Array<{
    path: Array<string | number>;
    message: string;
  }>;
}

export interface VizControlResponse {
  protocolVersion: typeof VIZ_CONTROL_PROTOCOL_VERSION;
  id: string;
  operation: string;
  ok: boolean;
  result?: unknown;
  error?: VizControlProtocolError;
}

export interface VizControlEvent {
  protocolVersion: typeof VIZ_CONTROL_PROTOCOL_VERSION;
  type: 'snapshot';
  revision: number;
  snapshot: unknown;
}

export interface VizControlDiscovery {
  protocolVersion: typeof VIZ_CONTROL_PROTOCOL_VERSION;
  control: 'VizControl';
  operations: VizControlRequest['operation'][];
  transaction: {
    atomic: true;
    expectedRevision: true;
    dryRun: true;
    actorAssignedByHost: true;
  };
}

export const vizControlDiscovery: VizControlDiscovery = {
  protocolVersion: VIZ_CONTROL_PROTOCOL_VERSION,
  control: 'VizControl',
  operations: [
    'control.discover',
    'control.snapshot',
    'project.inspect',
    'project.bundle.open',
    'component.inspect',
    'node.inspect',
    'graph.inspect',
    'graph.runtime.inspect',
    'frame.inspect',
    'render.inspect',
    'debug.inspect',
    'transaction.apply',
    'history.undo',
    'history.redo',
    'preview.play',
    'preview.pause',
    'preview.seek',
    'job.list',
    'job.inspect',
    'job.output.download',
    'audio-bake.start',
    'render.start',
    'job.cancel',
    'audio-bake.attach',
  ],
  transaction: {
    atomic: true,
    expectedRevision: true,
    dryRun: true,
    actorAssignedByHost: true,
  },
};

export const decodeVizProjectTransaction = (
  value: unknown,
):
  | { ok: true; value: VizProjectTransaction }
  | { ok: false; error: VizControlProtocolError } => {
  const parsed = projectTransactionSchema.safeParse(value);

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'invalid-request',
        message: 'Invalid Viz project transaction.',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      },
    };
  }

  return {
    ok: true,
    value: parsed.data as VizProjectTransaction,
  };
};

export const decodeVizControlRequest = (
  value: unknown,
):
  | { ok: true; value: VizControlRequest }
  | { ok: false; error: VizControlProtocolError } => {
  const parsed = controlRequestSchema.safeParse(value);

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'invalid-request',
        message: 'Invalid Viz control request.',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      },
    };
  }

  return {
    ok: true,
    value: parsed.data as VizControlRequest,
  };
};
