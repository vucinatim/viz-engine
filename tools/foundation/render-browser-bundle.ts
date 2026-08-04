import { chromium, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const readArgument = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
};

const requireArgument = (name: string): string => {
  const value = readArgument(name);
  if (!value) throw new Error(`Missing ${name} argument.`);
  return value;
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Viz control returned an invalid response.');
  }
  return value as Record<string, unknown>;
};

const requestControl = async (
  baseUrl: string,
  operation: string,
  payload: Record<string, unknown> = {},
): Promise<Record<string, unknown>> => {
  const response = await fetch(new URL('/__viz-control__/request', baseUrl), {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      protocolVersion: 1,
      id: `browser-bundle-render-${operation}-${crypto.randomUUID()}`,
      operation,
      ...payload,
    }),
  });
  const body = asRecord(await response.json());
  if (!response.ok || body.ok !== true) {
    throw new Error(
      `Viz control ${operation} failed: ${JSON.stringify(body.error ?? body)}`,
    );
  }
  return asRecord(body.result);
};

const readConnectedEditorId = async (
  baseUrl: string,
): Promise<string | undefined> => {
  const response = await fetch(new URL('/__viz-control__/discovery', baseUrl));
  const discovery = asRecord(await response.json());
  const editor = asRecord(discovery.editor);
  return typeof editor.instanceId === 'string' ? editor.instanceId : undefined;
};

const waitForDedicatedEditor = async (
  page: Page,
  baseUrl: string,
  previousEditorId: string | undefined,
): Promise<void> => {
  await page.waitForFunction(
    () =>
      Boolean(
        (window as Window & { __vizEditorDebug?: unknown }).__vizEditorDebug,
      ),
    undefined,
    {
      timeout: 30_000,
    },
  );
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const editorId = await readConnectedEditorId(baseUrl);
    if (editorId && editorId !== previousEditorId) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(
    'The dedicated render editor did not connect in time. Use a Vite server origin with no competing editor tabs.',
  );
};

const summarizeVisualFeedback = (value: unknown): Record<string, unknown> => {
  const feedback = asRecord(value);
  const samples = Array.isArray(feedback.sampledFrames)
    ? feedback.sampledFrames.map(asRecord)
    : [];
  const finite = (key: string) =>
    samples
      .map((sample) => sample[key])
      .filter(
        (candidate): candidate is number =>
          typeof candidate === 'number' && Number.isFinite(candidate),
      );
  const luminance = finite('averageLuminance');
  const differences = finite('contentDifferenceFromPrevious');
  const range = (values: number[]) =>
    values.length === 0
      ? undefined
      : { minimum: Math.min(...values), maximum: Math.max(...values) };
  const luminanceRange = range(luminance);
  const differenceRange = range(differences);

  return {
    sampledFrameCount: samples.length,
    ...(luminanceRange
      ? {
          minimumAverageLuminance: luminanceRange.minimum,
          maximumAverageLuminance: luminanceRange.maximum,
        }
      : {}),
    ...(differenceRange
      ? {
          minimumContentDifference: differenceRange.minimum,
          maximumContentDifference: differenceRange.maximum,
        }
      : {}),
    blankOrNearBlackFrames: feedback.blankOrNearBlackFrames,
    frozenFramePairs: feedback.frozenFramePairs,
  };
};

const main = async (): Promise<void> => {
  const baseUrl = requireArgument('--url');
  const bundleUrl = requireArgument('--bundle-url');
  const requestPath = resolve(requireArgument('--request'));
  const outputPath = resolve(requireArgument('--out'));
  const renderRequest = asRecord(
    JSON.parse(readFileSync(requestPath, 'utf8')) as unknown,
  );
  const previousEditorId = await readConnectedEditorId(baseUrl);
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const diagnostics: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      diagnostics.push(`console: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    diagnostics.push(`pageerror: ${error.message}`);
  });

  try {
    await page.addInitScript(() => {
      localStorage.setItem('vizengine-has-seen-tutorial', 'true');
    });
    await page.goto(`${baseUrl}/?allowSmallViewport=1`);
    await waitForDedicatedEditor(page, baseUrl, previousEditorId);

    const cacheBustedBundleUrl = new URL(bundleUrl);
    cacheBustedBundleUrl.searchParams.set('render', Date.now().toString(36));
    const opened = await requestControl(baseUrl, 'project.bundle.open', {
      url: cacheBustedBundleUrl.href,
    });
    const revision = opened.revision;
    if (typeof revision !== 'number') {
      throw new Error('Bundle open did not return a project revision.');
    }

    const source = asRecord(renderRequest.source);
    const started = await requestControl(baseUrl, 'render.start', {
      request: {
        ...renderRequest,
        source: { ...source, expectedRevision: revision },
      },
    });
    const jobId = started.id;
    if (typeof jobId !== 'string') {
      throw new Error('Render start did not return a job id.');
    }

    let completed: Record<string, unknown> | undefined;
    const deadline = Date.now() + 10 * 60_000;
    while (Date.now() < deadline) {
      const job = await requestControl(baseUrl, 'job.inspect', { jobId });
      if (job.status === 'failed' || job.status === 'cancelled') {
        throw new Error(`Render job ${jobId} ${String(job.status)}.`);
      }
      if (job.status === 'succeeded') {
        completed = job;
        break;
      }
      await new Promise((resolveWait) => setTimeout(resolveWait, 250));
    }
    if (!completed) throw new Error(`Render job ${jobId} timed out.`);

    const result = asRecord(completed.result);
    const [output] = result.outputs as Array<Record<string, unknown>>;
    if (!output || typeof output.id !== 'string') {
      throw new Error(`Render job ${jobId} produced no downloadable output.`);
    }

    const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
    await requestControl(baseUrl, 'job.output.download', {
      jobId,
      outputId: output.id,
    });
    const download = await downloadPromise;
    mkdirSync(dirname(outputPath), { recursive: true });
    await download.saveAs(outputPath);

    if (diagnostics.length > 0) {
      throw new Error(`Browser diagnostics: ${diagnostics.join('; ')}`);
    }

    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          bundleUrl: cacheBustedBundleUrl.href,
          requestPath,
          outputPath,
          jobId,
          output,
          performance: result.performance,
          visualFeedback: summarizeVisualFeedback(result.visualFeedback),
          diagnostics,
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await browser.close();
  }
};

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
