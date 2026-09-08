export const humanSignalProductionIdentity = {
  packageId: '@viz-engine/production-human-signal',
  version: '0.0.1',
  production: 'human-signal',
} as const;

export const humanSignalProvenance = {
  treatment: {
    path: 'docs/parity/evidence/artifacts/2026-09-05-goal-five-production-treatment-manifest.json',
    contentIdentity:
      'sha256:cf65ee4f7dab2cc36d5a502fbc3ae37cd60e08a2d72a2e73df175100e86723a2',
  },
  gateOne: {
    path: 'docs/parity/evidence/artifacts/2026-09-06-goal-five-gate-one-review-packet.json',
    contentIdentity:
      'sha256:249618da53da44a6c790cd1bb572748d360c408b33b463e40761ed7673b2c400',
    // Reference to the existing human decision, not a new automated approval.
    decisionId: 'human-5c26efca-6d77-443c-8e3c-bbc3ef3cca28',
  },
  musicalMap: {
    path: 'docs/parity/evidence/artifacts/2026-09-05-goal-five-frame-exact-musical-map.json',
    contentIdentity:
      'sha256:164395d23891a091d9374c48d3462c9b30ee8ac4aac4ac4c6dfe68f700568a55',
  },
  historicalCapabilityCatalog: {
    path: 'docs/parity/evidence/artifacts/2026-09-04-goal-five-capability-catalog.json',
    contentIdentity:
      'sha256:b1fcf990b8d45f4524f4051e16a5823dd46744f87db7b9c8b0f35b31606bff1e',
  },
} as const;
