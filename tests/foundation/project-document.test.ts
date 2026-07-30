import { exampleProjectDocument } from '@viz-engine/example-projects';
import { validateProjectDocument } from '@viz-engine/runtime';
import { describe, expect, it } from 'vitest';

describe('Viz project document validation', () => {
  it('accepts the canonical example project document', () => {
    const result = validateProjectDocument(exampleProjectDocument);

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('requires external asset references to retain their portable URI', () => {
    const result = validateProjectDocument({
      ...exampleProjectDocument,
      assetRefs: [
        ...(exampleProjectDocument.assetRefs ?? []),
        {
          id: 'external-model',
          kind: 'model',
          source: 'external',
          label: 'External model',
        },
      ],
    });

    expect(result).toMatchObject({
      ok: false,
      issues: [
        {
          code: 'missing-field',
          path: 'assetRefs.external-model.externalUri',
        },
      ],
    });
  });
});
