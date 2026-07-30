import type { VizAudioFeatureBakeJobRequest } from '@viz-engine/bake';
import type {
  VizProjectTransaction,
  VizRenderRequest,
} from '@viz-engine/contracts';
import { z } from 'zod';

export const VIZ_CONTROL_PROTOCOL_VERSION = 1 as const;

const nonEmptyString = z.string().trim().min(1);
const unknownRecord = z.record(z.unknown());

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

const projectActionSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('asset.attach'),
      payload: z.object({ asset: assetRefSchema }).strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('asset.replace'),
      payload: z
        .object({
          assetId: nonEmptyString,
          asset: assetRefSchema,
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('artifact.attach'),
      payload: z.object({ artifact: artifactRefSchema }).strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('layer.create'),
      payload: z
        .object({
          layerId: nonEmptyString.optional(),
          index: z.number().int().optional(),
          layer: layerSchema.partial({ id: true }),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('layer.remove'),
      payload: z.object({ layerId: nonEmptyString }).strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('layer.move'),
      payload: z
        .object({
          layerId: nonEmptyString,
          index: z.number().int(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('layer.replace'),
      payload: z
        .object({
          layerId: nonEmptyString,
          layer: layerSchema,
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('layer.settings.set'),
      payload: z
        .object({
          layerId: nonEmptyString,
          path: nonEmptyString,
          value: z.unknown(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('layer.input.set'),
      payload: z
        .object({
          layerId: nonEmptyString,
          inputKey: nonEmptyString,
          valueSource: valueSourceSchema.nullable(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('timeline.set'),
      payload: z
        .object({
          timeline: z
            .object({
              fps: z.number().finite().positive(),
              durationInFrames: z.number().int().positive(),
              sampleRate: z.number().finite().positive().optional(),
            })
            .strict(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('graph.create'),
      payload: z
        .object({
          graphId: nonEmptyString.optional(),
          name: nonEmptyString,
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('graph.replace'),
      payload: z
        .object({
          graphId: nonEmptyString,
          graph: graphSchema,
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('graph.remove'),
      payload: z.object({ graphId: nonEmptyString }).strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('graph.input.set'),
      payload: z
        .object({
          graphId: nonEmptyString,
          inputKey: nonEmptyString,
          source: graphInputSourceSchema.nullable(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('graph.node.add'),
      payload: z
        .object({
          graphId: nonEmptyString,
          nodeId: nonEmptyString.optional(),
          nodeType: nonEmptyString,
          position: z
            .object({
              x: z.number(),
              y: z.number(),
            })
            .optional(),
          initialInputs: z.record(graphNodeInputBindingSchema).optional(),
          metadata: unknownRecord.optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('graph.node.position.set'),
      payload: z
        .object({
          graphId: nonEmptyString,
          nodeId: nonEmptyString,
          position: z.object({ x: z.number(), y: z.number() }).strict(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('graph.node.remove'),
      payload: z
        .object({
          graphId: nonEmptyString,
          nodeId: nonEmptyString,
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('graph.node.input.set'),
      payload: z
        .object({
          graphId: nonEmptyString,
          nodeId: nonEmptyString,
          inputKey: nonEmptyString,
          binding: graphNodeInputBindingSchema.nullable(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('graph.output.set'),
      payload: z
        .object({
          graphId: nonEmptyString,
          output: graphOutputSchema,
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('graph.output.remove'),
      payload: z
        .object({
          graphId: nonEmptyString,
          outputKey: nonEmptyString,
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('graph.output.position.set'),
      payload: z
        .object({
          graphId: nonEmptyString,
          outputKey: nonEmptyString,
          position: z.object({ x: z.number(), y: z.number() }).strict(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('graph.enabled.set'),
      payload: z
        .object({
          graphId: nonEmptyString,
          enabled: z.boolean(),
        })
        .strict(),
    })
    .strict(),
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

const controlRequestSchema = z.discriminatedUnion('operation', [
  z
    .object({
      protocolVersion: z.literal(VIZ_CONTROL_PROTOCOL_VERSION),
      id: nonEmptyString,
      operation: z.literal('control.discover'),
    })
    .strict(),
  z
    .object({
      protocolVersion: z.literal(VIZ_CONTROL_PROTOCOL_VERSION),
      id: nonEmptyString,
      operation: z.literal('control.snapshot'),
    })
    .strict(),
  z
    .object({
      protocolVersion: z.literal(VIZ_CONTROL_PROTOCOL_VERSION),
      id: nonEmptyString,
      operation: z.literal('project.inspect'),
    })
    .strict(),
  z
    .object({
      protocolVersion: z.literal(VIZ_CONTROL_PROTOCOL_VERSION),
      id: nonEmptyString,
      operation: z.literal('component.inspect'),
    })
    .strict(),
  z
    .object({
      protocolVersion: z.literal(VIZ_CONTROL_PROTOCOL_VERSION),
      id: nonEmptyString,
      operation: z.literal('graph.inspect'),
      graphId: nonEmptyString.optional(),
    })
    .strict(),
  z
    .object({
      protocolVersion: z.literal(VIZ_CONTROL_PROTOCOL_VERSION),
      id: nonEmptyString,
      operation: z.literal('transaction.apply'),
      transaction: projectTransactionSchema,
    })
    .strict(),
  z
    .object({
      protocolVersion: z.literal(VIZ_CONTROL_PROTOCOL_VERSION),
      id: nonEmptyString,
      operation: z.literal('history.undo'),
    })
    .strict(),
  z
    .object({
      protocolVersion: z.literal(VIZ_CONTROL_PROTOCOL_VERSION),
      id: nonEmptyString,
      operation: z.literal('history.redo'),
    })
    .strict(),
  z
    .object({
      protocolVersion: z.literal(VIZ_CONTROL_PROTOCOL_VERSION),
      id: nonEmptyString,
      operation: z.literal('preview.play'),
    })
    .strict(),
  z
    .object({
      protocolVersion: z.literal(VIZ_CONTROL_PROTOCOL_VERSION),
      id: nonEmptyString,
      operation: z.literal('preview.pause'),
    })
    .strict(),
  z
    .object({
      protocolVersion: z.literal(VIZ_CONTROL_PROTOCOL_VERSION),
      id: nonEmptyString,
      operation: z.literal('preview.seek'),
      frame: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      protocolVersion: z.literal(VIZ_CONTROL_PROTOCOL_VERSION),
      id: nonEmptyString,
      operation: z.literal('job.list'),
    })
    .strict(),
  z
    .object({
      protocolVersion: z.literal(VIZ_CONTROL_PROTOCOL_VERSION),
      id: nonEmptyString,
      operation: z.literal('job.inspect'),
      jobId: nonEmptyString,
    })
    .strict(),
  z
    .object({
      protocolVersion: z.literal(VIZ_CONTROL_PROTOCOL_VERSION),
      id: nonEmptyString,
      operation: z.literal('audio-bake.start'),
      request: audioFeatureBakeJobRequestSchema,
    })
    .strict(),
  z
    .object({
      protocolVersion: z.literal(VIZ_CONTROL_PROTOCOL_VERSION),
      id: nonEmptyString,
      operation: z.literal('render.start'),
      request: renderRequestSchema,
    })
    .strict(),
  z
    .object({
      protocolVersion: z.literal(VIZ_CONTROL_PROTOCOL_VERSION),
      id: nonEmptyString,
      operation: z.literal('job.cancel'),
      jobId: nonEmptyString,
    })
    .strict(),
  z
    .object({
      protocolVersion: z.literal(VIZ_CONTROL_PROTOCOL_VERSION),
      id: nonEmptyString,
      operation: z.literal('audio-bake.attach'),
      jobId: nonEmptyString,
      expectedRevision: z.number().int().nonnegative().optional(),
    })
    .strict(),
]);

interface VizControlRequestBase {
  protocolVersion: typeof VIZ_CONTROL_PROTOCOL_VERSION;
  id: string;
}

export type VizControlRequest =
  | (VizControlRequestBase & { operation: 'control.discover' })
  | (VizControlRequestBase & { operation: 'control.snapshot' })
  | (VizControlRequestBase & { operation: 'project.inspect' })
  | (VizControlRequestBase & { operation: 'component.inspect' })
  | (VizControlRequestBase & {
      operation: 'graph.inspect';
      graphId?: string;
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
    'component.inspect',
    'graph.inspect',
    'transaction.apply',
    'history.undo',
    'history.redo',
    'preview.play',
    'preview.pause',
    'preview.seek',
    'job.list',
    'job.inspect',
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
