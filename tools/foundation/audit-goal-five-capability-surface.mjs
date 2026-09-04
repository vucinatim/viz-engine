import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const auditRevision = 'e1d78a1ef256bf91caf01b510d0ca856eafdd27a';
const catalogRelativePath =
  'docs/parity/evidence/artifacts/2026-09-04-goal-five-capability-catalog.json';
const catalogArgumentIndex = process.argv.indexOf('--catalog');
const catalogPath =
  catalogArgumentIndex === -1
    ? resolve(repositoryRoot, catalogRelativePath)
    : resolve(process.argv[catalogArgumentIndex + 1]);
const writeMode = process.argv.includes('--write');
const historicalOnlyMode = process.argv.includes('--verify-historical');
const expectedCatalogIdentity =
  'sha256:b1fcf990b8d45f4524f4051e16a5823dd46744f87db7b9c8b0f35b31606bff1e';

const git = (arguments_, options = {}) =>
  execFileSync('git', arguments_, {
    cwd: repositoryRoot,
    maxBuffer: 128 * 1024 * 1024,
    ...options,
  });
const hash = (bytes) =>
  `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const listLines = (value) => value.trim().split('\n').filter(Boolean).sort();
const treeEntries = listLines(
  git(['ls-tree', '-r', auditRevision], { encoding: 'utf8' }),
).map((line) => {
  const match = line.match(/^\d+\s+\w+\s+([0-9a-f]+)\t(.+)$/u);
  if (!match) throw new Error(`Unexpected Git tree entry: ${line}`);
  return { path: match[2], objectIdentity: `git:${match[1]}` };
});
const treeIdentityByPath = new Map(
  treeEntries.map(({ path, objectIdentity }) => [path, objectIdentity]),
);
const treePaths = treeEntries.map(({ path }) => path).sort();
const trackedPaths = listLines(git(['ls-files'], { encoding: 'utf8' }));

const sensoryToolPaths = new Set([
  'playwright.config.ts',
  'playwright.performance.config.ts',
  'tests/browser/audio-workflow.spec.ts',
  'tests/browser/editor-critical-journey.spec.ts',
  'tests/browser/editor-endurance-performance.spec.ts',
  'tests/browser/editor-interaction-performance.spec.ts',
  'tests/browser/light-tunnel-playback-performance.spec.ts',
  'tests/browser/waveform-rhythm-workflow.spec.ts',
  'tools/foundation/agent-creative-loop-scenario.ts',
  'tools/foundation/compare-performance-recordings-cli.ts',
  'tools/foundation/compare-performance-recordings.ts',
  'tools/foundation/light-tunnel-runtime-benchmark.ts',
  'tools/foundation/measure-audio-artifact-container.ts',
  'tools/foundation/render-browser-bundle.ts',
  'tools/foundation/report-source-metrics.mjs',
  'tools/foundation/runtime-preview-plan-benchmark.ts',
  'tools/foundation/validate-goal-five-certification.mjs',
  'tools/foundation/validate-v1-v2-parity-matrix.mjs',
  'tools/repo/lib/checks.ts',
]);

const isRuntimeCapabilitySource = (path) =>
  /^packages\/[^/]+\/(?:package\.json|src\/.*)$/u.test(path) ||
  /^src\/.*\.(?:ts|tsx)$/u.test(path) ||
  /^apps\/viz-studio\/src\/.*\.(?:ts|tsx)$/u.test(path) ||
  /^public\/(?:projects\/.*\.json|productions\/[^/]+\/(?:project|bundle-manifest|execution-manifest)\.json)$/u.test(
    path,
  ) ||
  path === 'docs/parity/v1-v2-parity-matrix.json';

const isCapabilitySource = (path) =>
  isRuntimeCapabilitySource(path) ||
  path === 'package.json' ||
  sensoryToolPaths.has(path);

const sourcePaths = treePaths.filter(isCapabilitySource);
const auditedRuntimePaths = treePaths.filter(isRuntimeCapabilitySource);
const currentSourcePaths = trackedPaths.filter(isRuntimeCapabilitySource);
const changedCapabilityPaths = listLines(
  git(['diff', '--name-only', auditRevision, '--'], { encoding: 'utf8' }),
).filter(isRuntimeCapabilitySource);
const currentMatchesAudit =
  JSON.stringify(auditedRuntimePaths) === JSON.stringify(currentSourcePaths) &&
  changedCapabilityPaths.length === 0;
const treeByteCache = new Map();
const treeBytes = (path) => {
  if (currentMatchesAudit && isRuntimeCapabilitySource(path)) {
    return readFileSync(resolve(repositoryRoot, path));
  }
  const cached = treeByteCache.get(path);
  if (cached) return cached;
  const bytes = git(['show', `${auditRevision}:${path}`]);
  treeByteCache.set(path, bytes);
  return bytes;
};
const treeText = (path) => treeBytes(path).toString('utf8');

const sourceSet = (id, predicate) => {
  const paths = sourcePaths.filter(predicate);
  return {
    id,
    pathCount: paths.length,
    contentIdentity: hash(
      Buffer.from(
        paths
          .map((path) => `${path}\0${treeIdentityByPath.get(path)}`)
          .join('\n'),
      ),
    ),
  };
};

const findOwnerPath = (packageRoot, needle) => {
  const matches = sourcePaths.filter(
    (path) =>
      path.startsWith(`${packageRoot}/src/`) && treeText(path).includes(needle),
  );
  return matches.sort((left, right) => left.length - right.length)[0];
};

const sourceReference = (path) => ({
  path,
  contentIdentity: treeIdentityByPath.get(path),
});

const unique = (values) => [...new Set(values)].sort();

const packageRoles = {
  '@viz-engine/actions': 'typed durable project mutations',
  '@viz-engine/bake': 'deterministic audio-analysis baking',
  '@viz-engine/components-core': 'first-party portable visual components',
  '@viz-engine/contracts': 'portable data and execution contracts',
  '@viz-engine/dev-cli': 'headless and live product control',
  '@viz-engine/editor-control':
    'transport-neutral live-editor control protocol',
  '@viz-engine/editor-session': 'canonical mutable project session',
  '@viz-engine/example-projects': 'canonical fixtures and example documents',
  '@viz-engine/nodes-core': 'first-party graph evaluation nodes',
  '@viz-engine/production-afterlight-assembly':
    'composition-only reference production',
  '@viz-engine/production-signal-cathedral':
    'trusted production-local capability pack',
  '@viz-engine/project-bundle': 'portable project bundle IO',
  '@viz-engine/remotion-adapter': 'Remotion attachment over runtime meaning',
  '@viz-engine/render': 'render-job orchestration and outputs',
  '@viz-engine/renderer-svg': 'deterministic structural SVG renderer',
  '@viz-engine/renderer-three': 'full-fidelity browser Three renderer',
  '@viz-engine/rhythm-core': 'shared rhythm and timing analysis',
  '@viz-engine/runtime': 'deterministic graph and frame evaluation',
};

const summarizePackage = (packageJsonPath) => {
  const manifest = JSON.parse(treeText(packageJsonPath));
  const workspaceDependencies = Object.entries(manifest.dependencies ?? {})
    .filter(([name]) => name.startsWith('@viz-engine/'))
    .map(([name]) => name)
    .sort();
  return {
    id: manifest.name,
    role: packageRoles[manifest.name],
    workspaceDependencies,
    publicExportCount: Object.keys(manifest.exports ?? {}).length,
    source: sourceReference(packageJsonPath),
  };
};

const extractStringLiterals = (text, expression) =>
  unique([...text.matchAll(expression)].map((match) => match[1]));

const dataSnapshot = (value) => JSON.parse(JSON.stringify(value));

const assertSameSet = (left, right, label) => {
  if (JSON.stringify(unique(left)) !== JSON.stringify(unique(right))) {
    throw new Error(
      `${label} do not have the same members: ${JSON.stringify({ left: unique(left), right: unique(right) })}`,
    );
  }
};

const extractCommandObjectKeys = (text, objectName) => {
  const body = text.match(
    new RegExp(
      `const ${objectName}: Record<string, CommandHandler> = \\{([\\s\\S]*?)\\n\\};`,
      'u',
    ),
  )?.[1];
  if (!body) throw new Error(`Could not locate ${objectName}.`);
  return unique(
    [...body.matchAll(/^\s{2}(?:'([^']+)'|([a-z][a-z-]*)):/gmu)].map(
      (match) => match[1] ?? match[2],
    ),
  );
};

const actionsFromUsages = (scope, usages) =>
  unique(
    usages.flatMap((usage) => {
      const token = usage.match(new RegExp(`^${scope} ([^ ]+)`, 'u'))?.[1];
      return token ? token.split('|') : [];
    }),
  );

const summarizeProject = (path, kind) => {
  const envelope = JSON.parse(treeText(path));
  const project = envelope.project ?? envelope;
  const layers = Array.isArray(project.layers) ? project.layers : [];
  const graphs = Array.isArray(project.graphs) ? project.graphs : [];
  const nodes = graphs.flatMap((graph) => graph.nodes ?? []);
  const outputs = graphs.flatMap((graph) => graph.outputs ?? []);
  return {
    id: project.projectId,
    name: project.name,
    kind,
    path,
    componentIds: unique(layers.map((layer) => layer.componentId)),
    layerCount: layers.length,
    graphCount: graphs.length,
    nodeCount: nodes.length,
    nodeTypes: unique(nodes.map((node) => node.type)),
    outputCount: outputs.length,
    assetCount: (project.assetRefs ?? []).length,
    artifactCount: (project.artifactRefs ?? []).length,
    sourceIdentity: treeIdentityByPath.get(path),
  };
};

const inferComponentRenderKinds = (sourcePath) => {
  const text = treeText(sourcePath);
  return unique(
    [...text.matchAll(/kind:\s*['"]([a-z-]+)['"]/gu)].map((match) => match[1]),
  ).filter((kind) =>
    [
      'circle',
      'group',
      'image',
      'point-cloud',
      'polygon',
      'polyline',
      'rect',
      'shader',
      'text',
      'three-program',
    ].includes(kind),
  );
};

const summarizeAuthoring = (authoring) => {
  if (!authoring) return null;
  const countSettings = (setting) =>
    1 +
    Object.values(setting?.fields ?? {}).reduce(
      (count, child) => count + countSettings(child),
      0,
    );
  return {
    schemaVersion: authoring.schemaVersion,
    componentId: authoring.componentId,
    compatibility: authoring.compatibility,
    category: authoring.category,
    catalogVisibility: authoring.catalogVisibility ?? 'visible',
    tags: authoring.tags ?? [],
    settingDefinitionCount: Object.values(
      authoring.settings?.fields ?? {},
    ).reduce((count, setting) => count + countSettings(setting), 0),
    presetCount: authoring.presets?.length ?? 0,
    defaultNetworkCount: Object.keys(authoring.defaultNetworks ?? {}).length,
    settings: dataSnapshot(authoring.settings),
    presets: dataSnapshot(authoring.presets ?? []),
    defaultNetworks: dataSnapshot(authoring.defaultNetworks ?? {}),
  };
};

const unwrap = (module) => module.default ?? module;

const buildCatalog = async () => {
  const componentsModule = unwrap(
    await import('../../packages/viz-components-core/src/index.ts'),
  );
  const nodesModule = unwrap(
    await import('../../packages/viz-nodes-core/src/index.ts'),
  );
  const threeModule = unwrap(
    await import('../../packages/viz-renderer-three/src/programs/registry.ts'),
  );
  const signalModule = unwrap(
    await import('../../packages/viz-production-signal-cathedral/src/index.ts'),
  );
  const cliModule = unwrap(
    await import('../../packages/viz-dev-cli/src/command-registry.ts'),
  );
  const studioModule = unwrap(
    await import('../../src/lib/viz-capabilities.ts'),
  );
  const projects = [
    ...sourcePaths
      .filter((path) => /^public\/projects\/.*\.json$/u.test(path))
      .map((path) => summarizeProject(path, 'editor-example')),
    ...sourcePaths
      .filter((path) =>
        /^public\/productions\/[^/]+\/project\.json$/u.test(path),
      )
      .map((path) =>
        summarizeProject(
          path,
          path.includes('signal-cathedral')
            ? 'production-local-capability-proof'
            : 'composition-only-production-proof',
        ),
      ),
  ].sort((left, right) => left.id.localeCompare(right.id));
  const componentConsumers = new Map();
  for (const project of projects) {
    for (const componentId of project.componentIds) {
      const consumers = componentConsumers.get(componentId) ?? [];
      consumers.push(project.id);
      componentConsumers.set(componentId, consumers);
    }
  }
  const coreCatalogIds = new Set(
    componentsModule.coreCatalogComponents.map((component) => component.id),
  );
  const coreComponents = componentsModule.coreComponents.map((component) => {
    const path = findOwnerPath(
      'packages/viz-components-core',
      `id: '${component.id}'`,
    );
    if (!path) throw new Error(`No source owner found for ${component.id}.`);
    const authoring = summarizeAuthoring(component.authoring);
    const renderNodeKinds = inferComponentRenderKinds(path);
    return {
      id: component.id,
      name: component.name,
      ownerPack: '@viz-engine/components-core',
      rendererFamily: component.rendererFamily,
      implementationVersion: component.implementationVersion ?? null,
      temporal: Boolean(component.temporal),
      inputs: dataSnapshot(component.inputs ?? []),
      renderNodeKinds,
      authoring,
      classification:
        authoring && coreCatalogIds.has(component.id)
          ? 'authorable-core-capability'
          : 'runtime-only-core-primitive',
      hostAvailability: {
        coreRegistry: true,
        studioRegistry: Boolean(
          studioModule.studioComponentRegistry.get(component.id),
        ),
        studioFullFidelityRender: true,
        localCliPlanInspection: true,
        localCliRenderedWithoutOmission: !renderNodeKinds.some((kind) =>
          ['shader', 'three-program'].includes(kind),
        ),
      },
      evidenceConsumers: (componentConsumers.get(component.id) ?? []).sort(),
      source: sourceReference(path),
    };
  });
  const localComponent = signalModule.signalCathedralComponent;
  const localPath = findOwnerPath(
    'packages/viz-production-signal-cathedral',
    `id: '${localComponent.id}'`,
  );
  const components = [
    ...coreComponents,
    {
      id: localComponent.id,
      name: localComponent.name,
      ownerPack: '@viz-engine/production-signal-cathedral',
      rendererFamily: localComponent.rendererFamily,
      implementationVersion: localComponent.implementationVersion,
      temporal: Boolean(localComponent.temporal),
      inputs: dataSnapshot(localComponent.inputs ?? []),
      renderNodeKinds: inferComponentRenderKinds(localPath),
      authoring: summarizeAuthoring(localComponent.authoring),
      classification: 'production-local-capability',
      hostAvailability: {
        coreRegistry: false,
        studioRegistry: true,
        studioFullFidelityRender: true,
        localCliPlanInspection: false,
        localCliRenderedWithoutOmission: false,
      },
      evidenceConsumers: (
        componentConsumers.get(localComponent.id) ?? []
      ).sort(),
      source: sourceReference(localPath),
    },
  ].sort((left, right) => left.id.localeCompare(right.id));
  const presetSourcePath = 'src/components/node-network/presets.ts';
  const nodeNetworkPresets = [
    ...treeText(presetSourcePath).matchAll(
      /define(Pipeline)?Preset\(\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)'[\s\S]*?outputType:\s*'([^']+)'/gu,
    ),
  ]
    .map((match) => ({
      id: match[2],
      name: match[3],
      outputType: match[4],
      registrationKind: match[1] ? 'pipeline' : 'explicit-graph',
      source: sourceReference(presetSourcePath),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const defaultNetworkPresetIds = unique(
    components.flatMap((component) =>
      Object.values(component.authoring?.defaultNetworks ?? {}).filter(
        (value) => typeof value === 'string',
      ),
    ),
  );
  const registeredPresetIds = new Set(nodeNetworkPresets.map(({ id }) => id));
  for (const presetId of defaultNetworkPresetIds) {
    if (!registeredPresetIds.has(presetId)) {
      throw new Error(`Unknown component default-network preset: ${presetId}.`);
    }
  }
  const nodes = nodesModule
    .createCoreNodeRegistry()
    .list()
    .map((node) => {
      const path =
        findOwnerPath('packages/viz-nodes-core', `type: '${node.type}'`) ??
        findOwnerPath('packages/viz-nodes-core', `label: '${node.type}'`);
      if (!path)
        throw new Error(`No source owner found for node ${node.type}.`);
      return {
        type: node.type,
        name: node.name,
        category: node.category,
        inputs: dataSnapshot(node.inputs ?? []),
        outputs: dataSnapshot(node.outputs ?? []),
        hasAuthoringMetadata: Boolean(node.authoring),
        authoring: node.authoring ? dataSnapshot(node.authoring) : null,
        evaluator: node.step ? 'temporal-step' : 'pure-evaluate',
        source: sourceReference(path),
      };
    })
    .sort((left, right) => left.type.localeCompare(right.type));
  const corePrograms = threeModule.createCoreVizThreeProgramRegistry().list();
  const studioPrograms = studioModule.studioThreeProgramRegistry.list();
  const programs = studioPrograms
    .map((program) => {
      const packageRoot = program.id.startsWith('viz-core/')
        ? 'packages/viz-renderer-three'
        : 'packages/viz-production-signal-cathedral';
      const registrationPath = findOwnerPath(
        packageRoot,
        `id: '${program.id}'`,
      );
      const programSlug = program.id.split('/').at(-2);
      const implementationPath = program.id.startsWith('viz-core/')
        ? sourcePaths.find((path) =>
            path.endsWith(`/programs/${programSlug}.ts`),
          )
        : 'packages/viz-production-signal-cathedral/src/program.ts';
      if (!registrationPath || !implementationPath) {
        throw new Error(
          `No complete source ownership found for ${program.id}.`,
        );
      }
      return {
        id: program.id,
        ownerPack: program.capabilityPack.id,
        implementationVersion: program.implementationVersion,
        classification: program.id.startsWith('viz-core/')
          ? 'core-three-program'
          : 'production-local-three-program',
        hostAvailability: {
          coreRegistry: corePrograms.some(
            (candidate) => candidate.id === program.id,
          ),
          studioRegistry: true,
          studioThreeExecution: true,
          localCliThreeExecution: false,
        },
        registrationSource: sourceReference(registrationPath),
        implementationSource: sourceReference(implementationPath),
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
  const actionsText = treeText('packages/viz-contracts/src/actions.ts');
  const actionTypes = extractStringLiterals(
    actionsText,
    /^\s*type: '([^']+)';$/gmu,
  );
  const actionExecutorCases = extractStringLiterals(
    treeText('packages/viz-actions/src/index.ts'),
    /^\s*case '([^']+)':$/gmu,
  );
  const protocolText = treeText('packages/viz-editor-control/src/protocol.ts');
  const actionProtocolSchemas = extractStringLiterals(
    protocolText,
    /actionSchema\('([^']+)'/gu,
  );
  assertSameSet(
    actionTypes,
    actionExecutorCases,
    'Action contract and executor',
  );
  assertSameSet(
    actionTypes,
    actionProtocolSchemas,
    'Action contract and protocol',
  );
  const operationBlock = protocolText.match(
    /operations:\s*\[([\s\S]*?)\],\n\s*transaction:/u,
  )?.[1];
  if (!operationBlock)
    throw new Error('Could not locate VizControl operations.');
  const controlOperations = extractStringLiterals(
    operationBlock,
    /'([^']+)'/gu,
  );
  const requestSchemaOperations = extractStringLiterals(
    protocolText,
    /requestSchema\('([^']+)'/gu,
  );
  const requestHandlerOperations = extractStringLiterals(
    treeText('packages/viz-editor-control/src/request-handler.ts'),
    /^\s*case '([^']+)':/gmu,
  );
  assertSameSet(
    controlOperations,
    requestSchemaOperations,
    'Control discovery and decoder schemas',
  );
  assertSameSet(
    controlOperations,
    requestHandlerOperations,
    'Control discovery and request handler',
  );
  const cliCommands = cliModule.getVizCliCommands().map((command) => ({
    scope: command.scope,
    category: command.category,
    usages: [...command.usages],
  }));
  const liveCommandText = treeText('packages/viz-dev-cli/src/live-command.ts');
  const liveOperationsBody =
    liveCommandText.match(
      /const operations:[\s\S]*?= \{([\s\S]*?)\n\};/u,
    )?.[1] ?? '';
  const liveOperationMap = extractStringLiterals(
    liveOperationsBody,
    /:\s*'([^']+)'/gu,
  );
  assertSameSet(
    controlOperations.filter((operation) => operation !== 'control.discover'),
    liveOperationMap,
    'Wire operations and live CLI operation map',
  );
  const localCommandText = treeText(
    'packages/viz-dev-cli/src/local-commands.ts',
  );
  const dispatchActions = {
    live: [
      'discover',
      ...unique(
        [
          ...liveOperationsBody.matchAll(
            /^\s*(?:'([^']+)'|([a-z][a-z-]*)):/gmu,
          ),
        ].map((match) => match[1] ?? match[2]),
      ),
    ],
    example: extractCommandObjectKeys(localCommandText, 'exampleCommands'),
    bundle: extractCommandObjectKeys(localCommandText, 'bundleCommands'),
    component: extractStringLiterals(
      localCommandText,
      /action !== '([^']+)'/gu,
    ),
  };
  for (const command of cliCommands) {
    assertSameSet(
      actionsFromUsages(command.scope, command.usages),
      dispatchActions[command.scope],
      `${command.scope} CLI registry and dispatch`,
    );
  }
  const packageJsonPaths = sourcePaths.filter((path) =>
    /^packages\/[^/]+\/package\.json$/u.test(path),
  );
  const parity = JSON.parse(treeText('docs/parity/v1-v2-parity-matrix.json'));
  const parityRows = parity.capabilities ?? parity.rows ?? parity;
  const schemaSurfaces = [
    [
      'project-document',
      '2.0.0-alpha.1',
      'packages/viz-contracts/src/project.ts',
    ],
    ['component-authoring', 1, 'packages/viz-contracts/src/components.ts'],
    ['audio-feature-timeline', 1, 'packages/viz-contracts/src/audio.ts'],
    [
      'graph-and-value-sources',
      'project-schema-owned',
      'packages/viz-contracts/src/graphs.ts',
    ],
    ['assets', 'project-schema-owned', 'packages/viz-contracts/src/assets.ts'],
    [
      'artifacts',
      'project-schema-owned',
      'packages/viz-contracts/src/artifacts.ts',
    ],
    ['jobs', 1, 'packages/viz-contracts/src/jobs.ts'],
    [
      'render-nodes',
      'project-schema-owned',
      'packages/viz-contracts/src/render-nodes.ts',
    ],
    ['render-request', 1, 'packages/viz-contracts/src/render-jobs.ts'],
    ['render-result', 1, 'packages/viz-contracts/src/render-jobs.ts'],
    ['bundle-manifest', 1, 'packages/viz-contracts/src/bundles.ts'],
    [
      'execution-manifest',
      1,
      'packages/viz-contracts/src/execution-manifests.ts',
    ],
    ['model-manifest', 1, 'packages/viz-contracts/src/models.ts'],
    ['control-protocol', 1, 'packages/viz-editor-control/src/protocol.ts'],
  ].map(([id, version, path]) => ({
    id,
    version,
    source: sourceReference(path),
  }));
  const rootScripts = JSON.parse(treeText('package.json')).scripts;
  const feedbackMetadata = {
    'smoke:creative-loop:built': [
      'agent-workflow',
      'canonical headless edit, bundle, bake, render-plan, and reopen loop',
      'structural workflow proof does not judge Studio visual quality',
      ['tools/foundation/agent-creative-loop-scenario.ts'],
    ],
    'render:browser-bundle': [
      'visual-output',
      'full-fidelity Studio render, downloaded output, and render performance',
      'uses Studio as host rather than standalone product-CLI composition',
      ['tools/foundation/render-browser-bundle.ts'],
    ],
    'benchmark:runtime-preview': [
      'runtime-performance',
      'deterministic runtime preview-plan evaluation cost',
      'does not include browser presentation or GPU work',
      ['tools/foundation/runtime-preview-plan-benchmark.ts'],
    ],
    'benchmark:light-tunnel': [
      'runtime-performance',
      'fixed Light Tunnel runtime evaluation workload',
      'does not include headed compositor cadence',
      ['tools/foundation/light-tunnel-runtime-benchmark.ts'],
    ],
    'benchmark:light-tunnel-headed': [
      'browser-performance',
      'headed Light Tunnel playback with open/closed graph and visible pixels',
      'covers one exact stress project and fixed environment',
      ['tests/browser/light-tunnel-playback-performance.spec.ts'],
    ],
    'benchmark:editor-interaction': [
      'browser-performance',
      'continuous editor gestures, response latency, and runtime publication',
      'uses one fixed editor workload',
      ['tests/browser/editor-interaction-performance.spec.ts'],
    ],
    'benchmark:node-editor': [
      'browser-performance',
      'Signal Cathedral graph-open editing and playback workload',
      'does not represent every future graph topology',
      ['tests/browser/editor-interaction-performance.spec.ts'],
    ],
    'benchmark:endurance': [
      'lifecycle-performance',
      'multi-cycle resource, subscriber, heap, and responsiveness stability',
      'bounded cycles are not an unlimited soak',
      ['tests/browser/editor-endurance-performance.spec.ts'],
    ],
    'benchmark:workspace-resize': [
      'browser-interaction',
      'workspace continuity, focus safety, resizing, and persisted layout',
      'does not judge aesthetic layout quality',
      ['tests/browser/editor-critical-journey.spec.ts'],
    ],
    'benchmark:audio': [
      'audio-performance',
      'audio switching, transport response, analysis, and browser cadence',
      'browser audio permissions and devices remain environment-sensitive',
      ['tests/browser/audio-workflow.spec.ts'],
    ],
    'benchmark:waveform': [
      'audio-presentation',
      'waveform and Rhythm Lab loading, interaction, and response',
      'does not judge musical treatment quality',
      ['tests/browser/waveform-rhythm-workflow.spec.ts'],
    ],
    'benchmark:artifact-container': [
      'artifact-performance',
      'baked-audio container size, decode, and access characteristics',
      'measures the canonical fixture rather than every future duration',
      ['tools/foundation/measure-audio-artifact-container.ts'],
    ],
    'compare:runtime-performance': [
      'performance-comparison',
      'identity-compatible performance recordings and budget regressions',
      'cannot compare mismatched workloads or environments honestly',
      [
        'tools/foundation/compare-performance-recordings-cli.ts',
        'tools/foundation/compare-performance-recordings.ts',
      ],
    ],
    'parity:validate': [
      'contract-coverage',
      'all V1/V2 capability rows, statuses, dimensions, and evidence shape',
      'validates declared evidence structure rather than replaying every journey',
      ['tools/foundation/validate-v1-v2-parity-matrix.mjs'],
    ],
    'goal5:criteria:validate': [
      'contract-coverage',
      '46 Goal Five completion criteria and harness readiness',
      'planning mode does not claim terminal criteria have passed',
      ['tools/foundation/validate-goal-five-certification.mjs'],
    ],
    'metrics:source': [
      'code-architecture',
      'source volume and structural trend',
      'line counts do not prove readability or architectural quality',
      ['tools/foundation/report-source-metrics.mjs'],
    ],
    'test:browser': [
      'browser-regression',
      'authored browser journeys and visible interaction outcomes',
      'automated journeys do not replace human aesthetic review',
      ['playwright.config.ts'],
    ],
  };
  const expectedFeedbackScriptIds = Object.keys(rootScripts).filter(
    (id) =>
      id === 'smoke:creative-loop:built' ||
      id === 'render:browser-bundle' ||
      id.startsWith('benchmark:') ||
      [
        'compare:runtime-performance',
        'parity:validate',
        'goal5:criteria:validate',
        'metrics:source',
        'test:browser',
      ].includes(id),
  );
  assertSameSet(
    expectedFeedbackScriptIds,
    Object.keys(feedbackMetadata),
    'Relevant feedback scripts and feedback inventory',
  );
  const agentFeedbackTools = Object.entries(feedbackMetadata)
    .map(([id, [category, observation, limitation, implementationPaths]]) => ({
      id,
      command: `pnpm ${id}`,
      implementation: rootScripts[id],
      category,
      observation,
      limitation,
      commandSource: sourceReference('package.json'),
      implementationSources: implementationPaths.map(sourceReference),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  return {
    schemaVersion: 1,
    audit: {
      id: 'goal-five-phase-1-capability-surface',
      revision: auditRevision,
      generatedAt: '2026-09-04',
      currentSourceMatchedAuditAtGeneration: true,
      method:
        'Runtime registries are interrogated only when the tracked capability source set exactly matches the pinned revision; historical validation then uses Git object identities.',
    },
    sourceSets: [
      sourceSet('all-capability-sources', isCapabilitySource),
      sourceSet('workspace-packages', (path) => path.startsWith('packages/')),
      sourceSet('studio-projection', (path) =>
        /^(?:src|apps\/viz-studio\/src)\//u.test(path),
      ),
      sourceSet('examples-and-productions', (path) =>
        path.startsWith('public/'),
      ),
      sourceSet('editor-parity', (path) => path.startsWith('docs/parity/')),
      sourceSet(
        'agent-feedback',
        (path) => path === 'package.json' || sensoryToolPaths.has(path),
      ),
    ],
    packages: packageJsonPaths
      .map(summarizePackage)
      .sort((left, right) => left.id.localeCompare(right.id)),
    capabilityPacks: [
      {
        id: componentsModule.coreComponentCapabilityPack.manifest.id,
        version: componentsModule.coreComponentCapabilityPack.manifest.version,
        classification: 'portable-core',
        componentIds: componentsModule.coreComponents
          .map(({ id }) => id)
          .sort(),
      },
      {
        id: signalModule.signalCathedralCapabilityPack.manifest.id,
        version: signalModule.signalCathedralCapabilityPack.manifest.version,
        classification: 'trusted-production-local',
        componentIds: [localComponent.id],
      },
    ],
    components,
    nodes,
    nodeNetworkPresets,
    threePrograms: programs,
    schemas: schemaSurfaces,
    projectActions: {
      owner: '@viz-engine/contracts + @viz-engine/actions',
      types: actionTypes,
      equalityProof: {
        executorCases: actionExecutorCases,
        protocolSchemas: actionProtocolSchemas,
      },
    },
    controlSurface: {
      owner: '@viz-engine/editor-control',
      protocolVersion: 1,
      operations: controlOperations,
      equalityProof: {
        decoderSchemas: requestSchemaOperations,
        requestHandlerCases: requestHandlerOperations,
        liveCliOperationMap: liveOperationMap,
      },
      distinction:
        'VizControl also has host-only transient methods; only these transport protocol operations are remotely exposed.',
    },
    cliSurface: {
      owner: '@viz-engine/dev-cli',
      commands: cliCommands,
      dispatchActions,
      localComposition:
        'Local bundle/example commands compose core components and nodes with the structural SVG executor; live commands address the Studio host composition.',
    },
    agentFeedbackTools,
    renderers: [
      {
        id: '@viz-engine/renderer-three',
        classification: 'full-fidelity-browser-renderer',
        supportedNodeKinds: [
          'group',
          'rect',
          'circle',
          'point-cloud',
          'polygon',
          'polyline',
          'image',
          'text',
          'shader',
          'three-program',
        ],
      },
      {
        id: '@viz-engine/renderer-svg',
        classification: 'deterministic-structural-renderer',
        supportedNodeKinds: [
          'group',
          'rect',
          'circle',
          'point-cloud',
          'polygon',
          'polyline',
          'image',
          'text',
        ],
        intentionallyOmittedNodeKinds: ['shader', 'three-program'],
      },
    ],
    projects,
    editorParity: {
      owner:
        'apps/viz-studio presentation over canonical session/runtime owners',
      source: sourceReference('docs/parity/v1-v2-parity-matrix.json'),
      rowCount: parityRows.length,
      statusCounts: parityRows.reduce((counts, row) => {
        counts[row.status] = (counts[row.status] ?? 0) + 1;
        return counts;
      }, {}),
      rows: parityRows.map((row) => ({
        id: row.id,
        area: row.area,
        capability: row.capability,
        importance: row.importance,
        parityDimensions: row.parityDimensions,
        status: row.status,
        validationMethods: row.validationMethods,
      })),
    },
  };
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const validateCatalog = (catalog) => {
  assert(catalog.schemaVersion === 1, 'Unsupported capability catalog schema.');
  assert(catalog.audit.revision === auditRevision, 'Audit revision drifted.');
  assert(catalog.packages.length === 18, 'Expected 18 workspace packages.');
  assert(catalog.components.length === 21, 'Expected 21 Studio components.');
  assert(
    catalog.components.filter(
      ({ classification }) => classification === 'authorable-core-capability',
    ).length === 15,
    'Expected 15 authorable core components.',
  );
  assert(
    catalog.components.filter(
      ({ classification }) => classification === 'runtime-only-core-primitive',
    ).length === 5,
    'Expected five runtime-only primitives.',
  );
  assert(catalog.nodes.length === 34, 'Expected 34 core nodes.');
  assert(
    catalog.nodeNetworkPresets.length === 26,
    'Expected 26 node-network presets.',
  );
  assert(
    catalog.nodes.filter(({ hasAuthoringMetadata }) => hasAuthoringMetadata)
      .length === 32,
    'Expected 32 nodes with authoring metadata.',
  );
  assert(
    catalog.threePrograms.length === 9,
    'Expected nine Studio Three programs.',
  );
  assert(
    catalog.projectActions.types.length === 22,
    'Expected 22 durable actions.',
  );
  assert(
    catalog.controlSurface.operations.length === 24,
    'Expected 24 wire protocol operations.',
  );
  assert(catalog.cliSurface.commands.length === 4, 'Expected four CLI scopes.');
  assert(
    catalog.projects.length === 5,
    'Expected five editor/production projects.',
  );
  assert(
    catalog.editorParity.rowCount === 42,
    'Expected 42 editor parity rows.',
  );
  assert(
    catalog.editorParity.rows.length === 42,
    'Expected 42 inventoried editor parity rows.',
  );
  assert(
    catalog.schemas.length === 14,
    'Expected 14 contract schema surfaces.',
  );
  assert(
    catalog.agentFeedbackTools.length === 17,
    'Expected 17 inspection, comparison, performance, and feedback tools.',
  );
  assertSameSet(
    catalog.components.filter(({ temporal }) => temporal).map(({ id }) => id),
    [
      'heartbeat-monitor',
      'instanced-supercube',
      'light-tunnel',
      'morph-shapes',
      'neural-network',
      'signal-cathedral',
    ],
    'Temporal component catalog and expected runtime implementations',
  );
  for (const source of [
    ...catalog.packages.map(({ source }) => source),
    ...catalog.components.map(({ source }) => source),
    ...catalog.nodes.map(({ source }) => source),
    ...catalog.nodeNetworkPresets.map(({ source }) => source),
    ...catalog.threePrograms.flatMap(
      ({ registrationSource, implementationSource }) => [
        registrationSource,
        implementationSource,
      ],
    ),
    ...catalog.schemas.map(({ source }) => source),
    ...catalog.agentFeedbackTools.flatMap(
      ({ commandSource, implementationSources }) => [
        commandSource,
        ...implementationSources,
      ],
    ),
    catalog.editorParity.source,
  ]) {
    assert(
      treeIdentityByPath.get(source.path) === source.contentIdentity,
      `Pinned source identity drifted: ${source.path}`,
    );
  }
  const recordedSourceSets = new Map(
    catalog.sourceSets.map((entry) => [entry.id, entry]),
  );
  for (const expected of [
    sourceSet('all-capability-sources', isCapabilitySource),
    sourceSet('workspace-packages', (path) => path.startsWith('packages/')),
    sourceSet('studio-projection', (path) =>
      /^(?:src|apps\/viz-studio\/src)\//u.test(path),
    ),
    sourceSet('examples-and-productions', (path) => path.startsWith('public/')),
    sourceSet('editor-parity', (path) => path.startsWith('docs/parity/')),
    sourceSet(
      'agent-feedback',
      (path) => path === 'package.json' || sensoryToolPaths.has(path),
    ),
  ]) {
    assert(
      JSON.stringify(recordedSourceSets.get(expected.id)) ===
        JSON.stringify(expected),
      `Pinned source set drifted: ${expected.id}`,
    );
  }
};

if (writeMode) {
  assert(
    currentMatchesAudit,
    `Refusing to generate: current capability sources do not match ${auditRevision}.`,
  );
  const catalog = await buildCatalog();
  validateCatalog(catalog);
  const { format } = await import('prettier');
  const formattedCatalog = await format(JSON.stringify(catalog), {
    parser: 'json',
  });
  writeFileSync(catalogPath, formattedCatalog);
  console.log(`Wrote ${catalogRelativePath}.`);
} else {
  const catalogBytes = readFileSync(catalogPath);
  const catalog = JSON.parse(catalogBytes.toString('utf8'));
  validateCatalog(catalog);
  assert(
    hash(catalogBytes) === expectedCatalogIdentity,
    'The complete historical capability catalog digest drifted.',
  );
  if (currentMatchesAudit && !historicalOnlyMode) {
    const rebuilt = await buildCatalog();
    assert(
      JSON.stringify(catalog) === JSON.stringify(rebuilt),
      'Capability catalog does not match the pinned implementation truth.',
    );
  }
  console.log(
    `Validated Goal Five capability catalog at ${auditRevision} (${catalog.components.length} components, ${catalog.nodes.length} nodes, ${catalog.nodeNetworkPresets.length} network presets, ${catalog.threePrograms.length} Three programs, ${catalog.projectActions.types.length} actions, ${catalog.controlSurface.operations.length} protocol operations, ${catalog.agentFeedbackTools.length} feedback tools).`,
  );
}
