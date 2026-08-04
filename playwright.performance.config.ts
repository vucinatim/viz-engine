import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: process.env.VIZ_LIGHT_TUNNEL_PERFORMANCE
    ? 'light-tunnel-playback-performance.spec.ts'
    : process.env.VIZ_WORKSPACE_RESIZE
      ? 'editor-critical-journey.spec.ts'
      : process.env.VIZ_ENDURANCE
        ? 'editor-endurance-performance.spec.ts'
        : 'editor-interaction-performance.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['line']],
  outputDir: '.artifacts/playwright-performance',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4174',
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
    headless: false,
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
    launchOptions: {
      args: ['--js-flags=--expose-gc'],
    },
  },
  webServer: {
    command:
      'pnpm --filter @viz-engine/app-viz-studio dev --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
