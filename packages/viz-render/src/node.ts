import type {
  VizComponentRegistry,
  VizRenderDiagnostic,
  VizRenderOutputArtifact,
  VizRenderPerformanceFeedback,
  VizRenderPlan,
  VizRenderRequest,
} from '@viz-engine/contracts';
import {
  renderVizRenderPlanToSvgFragment,
  renderVizRenderPlanToSvgMarkup,
} from '@viz-engine/renderer-svg';
import {
  sampleProjectAudioFrameSnapshot,
  type VizNodeRegistry,
} from '@viz-engine/runtime';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createVizRenderFrameSession } from './frame-session.js';
import type {
  VizRenderExecutionContext,
  VizRenderExecutor,
  VizRenderExecutorResult,
} from './index.js';

export const VIZ_NODE_SVG_RENDER_EXECUTOR_ID = 'node-svg';
export const VIZ_NODE_SVG_RENDER_EXECUTOR_VERSION = 'viz-render.node-svg.v2';

export interface CreateVizNodeSvgRenderExecutorOptions {
  outputDirectory: string;
  componentRegistry: VizComponentRegistry;
  nodeRegistry: VizNodeRegistry;
  seed?: string;
}

const escapeAttribute = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const slugify = (value: string): string => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug.length > 0 ? slug : 'viz-render';
};

const sha256 = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');

const percentile95 = (values: readonly number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.ceil(sorted.length * 0.95) - 1,
  );
  return sorted[index]!;
};

const toPerformance = (
  frameDurations: readonly number[],
): VizRenderPerformanceFeedback => {
  const totalRenderMilliseconds = frameDurations.reduce(
    (total, duration) => total + duration,
    0,
  );
  return {
    evaluatedFrameCount: frameDurations.length,
    renderedFrameCount: frameDurations.length,
    totalRenderMilliseconds,
    averageRenderMilliseconds:
      frameDurations.length === 0
        ? 0
        : totalRenderMilliseconds / frameDurations.length,
    p95RenderMilliseconds: percentile95(frameDurations),
    maximumRenderMilliseconds:
      frameDurations.length === 0 ? 0 : Math.max(...frameDurations),
  };
};

const createFrameSession = (
  context: VizRenderExecutionContext,
  options: CreateVizNodeSvgRenderExecutorOptions,
) =>
  createVizRenderFrameSession({
    source: context.source,
    request: context.request,
    registry: options.componentRegistry,
    nodeRegistry: options.nodeRegistry,
    ...(options.seed === undefined ? {} : { seed: options.seed }),
    runtimeInputProvider: (frame) => {
      const audio = sampleProjectAudioFrameSnapshot(
        context.source.project,
        context.source.resolvedArtifacts,
        frame,
      );
      return audio === undefined ? undefined : { audio };
    },
  });

const assertPlanSucceeded = (frame: number, plan: VizRenderPlan): void => {
  if (plan.issues.length === 0) {
    return;
  }
  throw new Error(
    `Frame ${frame} failed runtime planning: ${plan.issues
      .map((issue) => `${issue.code}: ${issue.message}`)
      .join('; ')}`,
  );
};

const createOutput = (
  request: VizRenderRequest,
  markup: string,
  outputDirectory: string,
  fileName: string,
  width: number,
  height: number,
  frameCount: number,
): VizRenderOutputArtifact => {
  const hash = sha256(markup);
  const outputPath = join(outputDirectory, fileName);
  writeFileSync(outputPath, markup, 'utf8');
  return {
    id: `render-output-${hash.slice(0, 20)}`,
    kind: 'render-output',
    role: request.kind === 'still' ? 'still' : 'contact-sheet',
    label: request.outputLabel,
    format: 'svg',
    mimeType: 'image/svg+xml',
    uri: pathToFileURL(outputPath).href,
    contentIdentity: `sha256:${hash}`,
    byteLength: Buffer.byteLength(markup, 'utf8'),
    width,
    height,
    frameCount,
  };
};

const renderStill = (
  context: VizRenderExecutionContext,
  options: CreateVizNodeSvgRenderExecutorOptions,
): VizRenderExecutorResult => {
  const { request, signal, onProgress } = context;
  if (request.kind !== 'still') {
    throw new Error('Expected a still render request.');
  }
  if (signal.aborted) {
    throw new Error('Render cancelled.');
  }
  const start = performance.now();
  const plan = createFrameSession(context, options).evaluate(request.frame);
  assertPlanSucceeded(request.frame, plan);
  const markup = renderVizRenderPlanToSvgMarkup(plan);
  const duration = performance.now() - start;
  onProgress({
    stage: 'rendering',
    completed: 1,
    total: 1,
    progress: 1,
    message: `Rendered frame ${request.frame}.`,
  });
  const output = createOutput(
    request,
    markup,
    options.outputDirectory,
    `${slugify(request.outputLabel)}-frame-${request.frame}.svg`,
    request.viewport.width,
    request.viewport.height,
    1,
  );
  return {
    outputs: [output],
    diagnostics: [],
    performance: toPerformance([duration]),
  };
};

const renderContactSheet = (
  context: VizRenderExecutionContext,
  options: CreateVizNodeSvgRenderExecutorOptions,
): VizRenderExecutorResult => {
  const { request, signal, onProgress } = context;
  if (request.kind !== 'contact-sheet') {
    throw new Error('Expected a contact-sheet render request.');
  }
  const columns = Math.min(
    request.frames.length,
    request.columns ?? Math.ceil(Math.sqrt(request.frames.length)),
  );
  const rows = Math.ceil(request.frames.length / columns);
  const gap = request.gap ?? 8;
  const sheetWidth = columns * request.viewport.width + (columns - 1) * gap;
  const sheetHeight = rows * request.viewport.height + (rows - 1) * gap;
  const frameDurations: number[] = [];
  const cells: string[] = [];
  const diagnostics: VizRenderDiagnostic[] = [];

  const evaluation = createFrameSession(context, options);
  request.frames.forEach((frame, index) => {
    if (signal.aborted) {
      throw new Error('Render cancelled.');
    }
    const start = performance.now();
    const plan = evaluation.evaluate(frame);
    assertPlanSucceeded(frame, plan);
    frameDurations.push(performance.now() - start);
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = column * (request.viewport.width + gap);
    const y = row * (request.viewport.height + gap);
    cells.push(
      `<svg x="${x}" y="${y}" width="${request.viewport.width}" height="${request.viewport.height}" viewBox="0 0 ${request.viewport.width} ${request.viewport.height}" aria-label="Frame ${frame}">${renderVizRenderPlanToSvgFragment(plan)}</svg>`,
    );
    onProgress({
      stage: 'rendering',
      completed: index + 1,
      total: request.frames.length,
      progress: (index + 1) / request.frames.length,
      message: `Rendered frame ${frame}.`,
    });
  });

  const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sheetWidth} ${sheetHeight}" width="${sheetWidth}" height="${sheetHeight}" role="img" aria-label="${escapeAttribute(request.outputLabel)}">${cells.join('')}</svg>`;
  const output = createOutput(
    request,
    markup,
    options.outputDirectory,
    `${slugify(request.outputLabel)}-contact-sheet.svg`,
    sheetWidth,
    sheetHeight,
    request.frames.length,
  );
  return {
    outputs: [output],
    diagnostics,
    performance: toPerformance(frameDurations),
  };
};

export const createVizNodeSvgRenderExecutor = (
  options: CreateVizNodeSvgRenderExecutorOptions,
): VizRenderExecutor => {
  mkdirSync(options.outputDirectory, { recursive: true });
  return {
    id: VIZ_NODE_SVG_RENDER_EXECUTOR_ID,
    version: VIZ_NODE_SVG_RENDER_EXECUTOR_VERSION,
    rendererIdentity: 'viz-renderer-svg.v1',
    supports: (request) =>
      (request.kind === 'still' || request.kind === 'contact-sheet') &&
      request.format === 'svg',
    execute: async (context) => {
      if (context.request.kind === 'still') {
        return renderStill(context, options);
      }
      if (context.request.kind === 'contact-sheet') {
        return renderContactSheet(context, options);
      }
      throw new Error(
        `Node SVG executor does not support ${context.request.kind}/${context.request.format}.`,
      );
    },
  };
};
