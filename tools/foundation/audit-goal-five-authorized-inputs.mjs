import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const auditRevision = '9fdc0712c0e1e67ef7ebbaf5ed4e1c192e005a9c';
const inventoryPath = resolve(
  repositoryRoot,
  'docs/parity/evidence/artifacts/2026-09-04-goal-five-authorized-input-inventory.json',
);
const mediaExtensions = new Set([
  '.fbx',
  '.gif',
  '.glb',
  '.gltf',
  '.ico',
  '.jpeg',
  '.jpg',
  '.m4a',
  '.mov',
  '.mp3',
  '.mp4',
  '.obj',
  '.ogg',
  '.png',
  '.svg',
  '.vizaudio',
  '.wav',
  '.webm',
  '.webp',
]);

const git = (arguments_, options = {}) =>
  execFileSync('git', arguments_, {
    cwd: repositoryRoot,
    maxBuffer: 128 * 1024 * 1024,
    ...options,
  });

const treePaths = git(['ls-tree', '-r', '--name-only', auditRevision], {
  encoding: 'utf8',
})
  .trim()
  .split('\n')
  .filter(Boolean)
  .sort();
const treePathSet = new Set(treePaths);
const repositoryLicenseFiles = treePaths.filter((path) =>
  /(?:^|\/)(?:license|licence)(?:\.|$)/iu.test(path),
);
const treeBytes = (path) => git(['show', `${auditRevision}:${path}`]);
const treeText = (path) => treeBytes(path).toString('utf8');
const contentIdentity = (bytes) =>
  `sha256:${createHash('sha256').update(bytes).digest('hex')}`;

const isProductionStructure = (path) =>
  /^public\/productions\/[^/]+\/(?:bundle-manifest|execution-manifest|project)\.json$/u.test(
    path,
  );
const isExampleProject = (path) =>
  /^public\/projects\/[^/]+\.vizengine\.json$/u.test(path);
const isFixtureInput = (path) =>
  (path.startsWith(
    'packages/viz-example-projects/fixtures/example-reactive-bars-bundle/',
  ) ||
    path.startsWith('tests/foundation/fixtures/')) &&
  (mediaExtensions.has(extname(path).toLowerCase()) || path.endsWith('.json'));
const isShaderSource = (path) => {
  if (!path.startsWith('packages/') || !/\.(?:ts|tsx)$/u.test(path)) {
    return false;
  }
  if (path.startsWith('packages/viz-contracts/')) return false;
  return /\b(?:Raw)?ShaderMaterial\b|\b(?:vertex|fragment)Shader\s*[:=]/u.test(
    treeText(path),
  );
};

const auditedPaths = treePaths.filter(
  (path) =>
    (path.startsWith('public/') &&
      (path.startsWith('public/productions/') ||
        mediaExtensions.has(extname(path).toLowerCase()) ||
        isExampleProject(path))) ||
    (path.startsWith('docs/parity/evidence/artifacts/') &&
      mediaExtensions.has(extname(path).toLowerCase())) ||
    isFixtureInput(path) ||
    isShaderSource(path),
);

const modelSourceForCopy = (path) => {
  const fileName = path
    .split('/')
    .at(-1)
    ?.replace(/^viz-builtin-stage-/u, '');
  return fileName ? `public/models/stage/${fileName}` : undefined;
};

const classify = (path) => {
  if (path.startsWith('public/music/')) {
    const technical = path.includes('/[Test] ');
    return {
      kind: 'audio',
      role: technical ? 'technical-audio-fixture' : 'source-music',
      goalFiveUse: technical ? 'technical-only' : 'candidate',
      authority: 'authorized-local-flagship-proof',
      licenseStatus: 'unverified-no-repository-record',
      provenance: { kind: 'repository-source', sourcePaths: [path] },
    };
  }
  if (path.startsWith('public/models/stage/')) {
    return {
      kind: 'model-with-embedded-textures-and-animation',
      role: 'source-stage-model',
      goalFiveUse: 'candidate',
      authority: 'authorized-local-flagship-proof',
      licenseStatus: 'unverified-no-repository-record',
      provenance: { kind: 'repository-source', sourcePaths: [path] },
      ...(path.endsWith('/male-cheer.fbx')
        ? {
            issues: [
              'References an unavailable external normal map; certified browser loading retains the mesh, rig, authored clip, and base material with a non-fatal warning.',
            ],
          }
        : {}),
    };
  }
  if (/^public\/productions\/[^/]+\/assets\/.*\.fbx$/u.test(path)) {
    const sourcePath = modelSourceForCopy(path);
    return {
      kind: 'model-with-embedded-textures-and-animation',
      role: 'portable-bundle-model-copy',
      goalFiveUse: 'reference-derived',
      authority: 'authorized-local-flagship-proof',
      licenseStatus: 'inherits-unverified-source',
      provenance: {
        kind: 'exact-copy',
        sourcePaths: sourcePath ? [sourcePath] : [],
      },
      ...(path.endsWith('/viz-builtin-stage-male-cheer.fbx')
        ? {
            issues: [
              'Carries the source male-cheer model external-normal-map warning.',
            ],
          }
        : {}),
    };
  }
  if (/^public\/productions\/[^/]+\/assets\/.*\.mp3$/u.test(path)) {
    const afterlight = path.includes('/afterlight-assembly/');
    return {
      kind: 'audio',
      role: 'derived-production-window',
      goalFiveUse: 'reference-derived',
      authority: 'authorized-local-flagship-proof',
      licenseStatus: 'inherits-unverified-source',
      provenance: {
        kind: 'declared-ffmpeg-derivation',
        sourcePaths: [
          afterlight
            ? 'public/music/[DnB] Dancefloor DnB.mp3'
            : 'public/music/[House] Progressive House.mp3',
        ],
      },
    };
  }
  if (/^public\/productions\/[^/]+\/baked\//u.test(path)) {
    return {
      kind: 'baked-artifact',
      role: 'prior-production-audio-analysis',
      goalFiveUse: 'reference-only',
      authority: 'authorized-local-reference',
      licenseStatus: 'not-a-display-asset',
      provenance: {
        kind: 'declared-production-bake',
        sourcePaths: [path.split('/baked/')[0] + '/bundle-manifest.json'],
      },
    };
  }
  if (/^public\/productions\/[^/]+\/renders\//u.test(path)) {
    return {
      kind: 'render-output',
      role: 'prior-production-review-output',
      goalFiveUse: 'reference-only',
      authority: 'authorized-local-reference',
      licenseStatus: 'not-evaluated-as-new-input',
      provenance: {
        kind: 'declared-production-output',
        sourcePaths: [path.split('/renders/')[0] + '/project.json'],
      },
    };
  }
  if (isProductionStructure(path)) {
    return {
      kind: 'production-pack',
      role: path.split('/').at(-1)?.replace('.json', ''),
      goalFiveUse: 'reference-only',
      authority: 'authorized-local-reference',
      licenseStatus: 'repository-project-data',
      provenance: { kind: 'repository-production-pack', sourcePaths: [path] },
    };
  }
  if (isExampleProject(path)) {
    return {
      kind: 'example-project',
      role: 'editor-example',
      goalFiveUse: 'reference-only',
      authority: 'authorized-local-reference',
      licenseStatus: 'repository-project-data',
      provenance: { kind: 'repository-example', sourcePaths: [path] },
    };
  }
  if (isFixtureInput(path)) {
    return {
      kind: 'test-fixture',
      role: 'automated-test-only',
      goalFiveUse: 'not-production-input',
      authority: 'test-only',
      licenseStatus: 'not-evaluated-as-production-input',
      provenance: { kind: 'repository-test-fixture', sourcePaths: [path] },
    };
  }
  if (isShaderSource(path)) {
    return {
      kind: 'shader-source',
      role: 'code-defined-render-capability',
      goalFiveUse: 'candidate-capability',
      authority: 'authorized-local-flagship-proof',
      licenseStatus: 'repository-code-open-core-license-undecided',
      provenance: { kind: 'repository-code', sourcePaths: [path] },
    };
  }
  return {
    kind: 'image-or-video',
    role: path.startsWith('docs/parity/evidence/artifacts/')
      ? 'certification-evidence'
      : path.startsWith('public/tutorials/')
        ? 'product-documentation'
        : path === 'public/gifs/demo.gif'
          ? 'product-demo'
          : 'product-branding-or-shell',
    goalFiveUse: 'not-production-input',
    authority: 'product-or-evidence-only',
    licenseStatus: 'not-evaluated-as-production-input',
    provenance: { kind: 'repository-product-media', sourcePaths: [path] },
  };
};

const entries = auditedPaths.map((path) => {
  const bytes = treeBytes(path);
  return {
    path,
    contentIdentity: contentIdentity(bytes),
    byteLength: bytes.byteLength,
    format: extname(path).toLowerCase().replace(/^\./u, '') || 'source',
    availability: 'present-at-audit-revision',
    ...classify(path),
  };
});

const duplicateGroups = Object.entries(
  Object.groupBy(entries, (entry) => entry.contentIdentity),
)
  .filter(([, matches]) => matches.length > 1)
  .map(([identity, matches]) => ({
    contentIdentity: identity,
    paths: matches.map(({ path }) => path).sort(),
  }))
  .sort((left, right) =>
    left.contentIdentity.localeCompare(right.contentIdentity),
  );

const productionBundles = treePaths
  .filter((path) =>
    /^public\/productions\/[^/]+\/bundle-manifest\.json$/u.test(path),
  )
  .map((manifestPath) => {
    const manifest = JSON.parse(treeText(manifestPath));
    const base = manifestPath.slice(0, manifestPath.lastIndexOf('/'));
    const projectPath = `${base}/${manifest.projectFile}`;
    const project = treePathSet.has(projectPath)
      ? JSON.parse(treeText(projectPath))
      : undefined;
    const declaredEntries = [
      ...(manifest.assetEntries ?? []),
      ...(manifest.artifactEntries ?? []),
    ];
    const issues = [];
    for (const entry of declaredEntries) {
      const targetPath = `${base}/${entry.path}`;
      if (!treePathSet.has(targetPath)) {
        issues.push(`Missing declared path ${targetPath}`);
        continue;
      }
      const declaredIdentity =
        entry.metadata?.contentIdentity ??
        entry.metadata?.sourceContentIdentity;
      if (
        typeof declaredIdentity === 'string' &&
        declaredIdentity.replace(/^sha256:/u, '') !==
          contentIdentity(treeBytes(targetPath)).replace(/^sha256:/u, '')
      ) {
        issues.push(`Content identity mismatch for ${targetPath}`);
      }
    }
    for (const file of [
      manifest.projectFile,
      manifest.executionManifestFile,
    ].filter(Boolean)) {
      if (!treePathSet.has(`${base}/${file}`)) {
        issues.push(`Missing declared path ${base}/${file}`);
      }
    }
    const assetIds = new Set(
      (manifest.assetEntries ?? []).map(({ assetId }) => assetId),
    );
    const artifactIds = new Set(
      (manifest.artifactEntries ?? []).map(({ artifactId }) => artifactId),
    );
    for (const asset of project?.assetRefs ?? []) {
      if (!assetIds.has(asset.id)) {
        issues.push(`Project references undeclared asset ${asset.id}`);
      }
    }
    for (const artifact of project?.artifactRefs ?? []) {
      if (!artifactIds.has(artifact.id)) {
        issues.push(`Project references undeclared artifact ${artifact.id}`);
      }
    }
    return {
      manifestPath,
      status: issues.length === 0 ? 'available' : 'invalid',
      declaredAssetCount: manifest.assetEntries?.length ?? 0,
      declaredArtifactCount: manifest.artifactEntries?.length ?? 0,
      issues,
    };
  });

const externalAssetReferences = treePaths
  .filter(
    (path) =>
      /^public\/productions\/[^/]+\/project\.json$/u.test(path) ||
      isExampleProject(path),
  )
  .flatMap((path) => {
    const project = JSON.parse(treeText(path));
    return (project.assetRefs ?? [])
      .filter(({ source }) => source === 'external')
      .map(({ id, externalUri }) => ({ path, assetId: id, externalUri }));
  });

const exactCopyIssues = entries
  .filter(({ provenance }) => provenance.kind === 'exact-copy')
  .flatMap((entry) => {
    const sourcePath = entry.provenance.sourcePaths[0];
    if (!sourcePath || !treePathSet.has(sourcePath)) {
      return [`${entry.path} has no available canonical source.`];
    }
    return contentIdentity(treeBytes(sourcePath)) === entry.contentIdentity
      ? []
      : [`${entry.path} differs from canonical source ${sourcePath}.`];
  });
const invalidBundleIssues = productionBundles.flatMap(({ issues }) => issues);
if (exactCopyIssues.length > 0 || invalidBundleIssues.length > 0) {
  throw new Error(
    `Goal Five input audit found invalid provenance: ${[
      ...exactCopyIssues,
      ...invalidBundleIssues,
    ].join('; ')}`,
  );
}

const countBy = (key) =>
  Object.fromEntries(
    Object.entries(Object.groupBy(entries, (entry) => entry[key]))
      .map(([value, matches]) => [value, matches.length])
      .sort(([left], [right]) => left.localeCompare(right)),
  );

const inventory = {
  schemaVersion: 1,
  kind: 'viz-engine.goal-five-authorized-input-inventory.v1',
  auditRevision,
  authority: {
    decision:
      'Existing repository music, models, animations, and media are authorized for the local Goal Five flagship proof with recorded provenance.',
    externalAcquisitionAllowed: false,
    publicationOrRedistributionRightsInferred: false,
  },
  scope: {
    included:
      'All media under public, prior production packs and derivatives, repository shader implementations, example bundles, test media fixtures, and media-valued parity evidence at the audit revision.',
    classificationRule:
      'Presence grants no role by itself; each entry declares candidate, reference, technical, or non-input use.',
  },
  summary: {
    entries: entries.length,
    repositoryLicenseFiles,
    byKind: countBy('kind'),
    byGoalFiveUse: countBy('goalFiveUse'),
    duplicateGroups: duplicateGroups.length,
    externalAssetReferences: externalAssetReferences.length,
    invalidProductionBundles: productionBundles.filter(
      ({ status }) => status !== 'available',
    ).length,
  },
  entries,
  duplicateGroups,
  productionBundles,
  externalAssetReferences,
  gaps: [
    'No repository license file or per-source audio/model license record proves publication or redistribution rights.',
    'No standalone image, video, or texture source is authorized as new flagship creative content; existing examples, UI media, renders, and evidence remain reference-only or non-input.',
    'No standalone shader asset exists; reusable shader implementations are repository code and require capability-level audit in P1-02.',
    'The four FBX files have embedded model, texture, rig, and authored-animation content but no prepared model derivatives or committed capability manifests.',
    'male-cheer.fbx retains a certified non-fatal missing external normal-map dependency.',
  ],
};

const serialized = `${JSON.stringify(inventory, null, 2)}\n`;
if (process.argv.includes('--write')) {
  writeFileSync(inventoryPath, serialized);
} else {
  if (!existsSync(inventoryPath)) {
    throw new Error(`Missing Goal Five input inventory at ${inventoryPath}`);
  }
  const recorded = JSON.parse(readFileSync(inventoryPath, 'utf8'));
  if (JSON.stringify(recorded) !== JSON.stringify(inventory)) {
    throw new Error(
      'Goal Five authorized input inventory does not match its pinned audit revision.',
    );
  }
}

process.stdout.write(
  `${JSON.stringify(
    {
      ok: true,
      mode: process.argv.includes('--write') ? 'write' : 'check',
      auditRevision,
      inventoryPath,
      summary: inventory.summary,
    },
    null,
    2,
  )}\n`,
);
