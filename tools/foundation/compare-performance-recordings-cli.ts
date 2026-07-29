import { runPerformanceRecordingComparisonCli } from './compare-performance-recordings';

runPerformanceRecordingComparisonCli().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
