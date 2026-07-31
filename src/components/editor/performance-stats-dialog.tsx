import type {
  RecordingSession,
  SessionStatistics,
} from '@/lib/stores/performance-recorder-types';
import {
  computePerformanceBreakdown,
  computeSessionStatistics,
  type PerformanceBreakdown,
} from '@/lib/stores/performance-recorder-utils';
import {
  downloadAllChartsAsZip,
  downloadChartAsPNG,
  exportAllChartsAsZip,
  exportFPSChart,
  exportLayerPerformanceChart,
  exportLongTaskShareChart,
  exportMemoryChart,
  exportNodeNetworkPerformanceChart,
} from '@/lib/utils/chart-export';
import { Download, Image as ImageIcon } from 'lucide-react';
import { memo, useMemo, useState, type ReactNode } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface PerformanceStatsDialogProps {
  session: RecordingSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const chartTooltipStyle = {
  backgroundColor: '#1a1a1a',
  border: '1px solid #444',
  borderRadius: '8px',
  color: '#fff',
};

// Generate comprehensive JSON report with all statistics and data
function generateJSONReport(
  session: RecordingSession,
  stats: SessionStatistics,
  performance: PerformanceBreakdown,
): string {
  const report = {
    reportMetadata: {
      reportName: session.name,
      generatedAt: new Date().toISOString(),
      reportVersion: '1.0',
    },

    sessionInfo: {
      sessionId: session.id,
      name: session.name,
      description: session.description || null,
      startTime: new Date(session.startTime).toISOString(),
      duration: {
        milliseconds: session.duration,
        seconds: Number((session.duration / 1000).toFixed(2)),
        formatted: formatDurationForExport(session.duration),
      },
      sampleRate: {
        milliseconds: session.sampleRate,
        totalSamples: session.snapshots.length,
      },
    },

    testEnvironment: {
      browser: session.metadata.browser,
      userAgent: session.metadata.userAgent,
      platform: session.metadata.platform,
      gpu: session.metadata.gpu,
      display: {
        cssResolution: session.metadata.screenResolution,
        devicePixelRatio: session.metadata.devicePixelRatio,
        physicalResolution: session.metadata.physicalResolution,
        note: 'Physical resolution is what the GPU actually renders (CSS * DPR)',
      },
      timestamp: session.metadata.timestamp,
    },

    executiveSummary: {
      fps: {
        mean: Number(stats.editorFPS.mean.toFixed(3)),
        p95: Number(stats.editorFPS.p95.toFixed(3)),
      },
      frameStability: {
        score: Number((stats.frames.stability * 100).toFixed(1)),
        slowIntervalPercentage: Number(
          stats.frames.slowIntervalPercentage.toFixed(1),
        ),
      },
      memory: {
        p95MB: Number(stats.memory.p95.toFixed(1)),
      },
      mainThread: {
        meanLongTaskSharePercent: Number(
          stats.mainThread.meanLongTaskShare.toFixed(1),
        ),
        note: 'Long-task share is the percentage of each sample window occupied by browser Long Task API entries (tasks of at least 50ms).',
      },
    },

    detailedStatistics: {
      fps: {
        mean: Number(stats.editorFPS.mean.toFixed(3)),
        median: Number(stats.editorFPS.median.toFixed(3)),
        standardDeviation: Number(stats.editorFPS.stdDev.toFixed(3)),
        min: Number(stats.editorFPS.min.toFixed(3)),
        max: Number(stats.editorFPS.max.toFixed(3)),
        percentiles: {
          p50: Number(stats.editorFPS.p50.toFixed(3)),
          p75: Number(stats.editorFPS.p75.toFixed(3)),
          p90: Number(stats.editorFPS.p90.toFixed(3)),
          p95: Number(stats.editorFPS.p95.toFixed(3)),
          p99: Number(stats.editorFPS.p99.toFixed(3)),
        },
      },

      memory: {
        meanMB: Number(stats.memory.mean.toFixed(3)),
        medianMB: Number(stats.memory.median.toFixed(3)),
        standardDeviationMB: Number(stats.memory.stdDev.toFixed(3)),
        minMB: Number(stats.memory.min.toFixed(3)),
        maxMB: Number(stats.memory.max.toFixed(3)),
        p95MB: Number(stats.memory.p95.toFixed(3)),
      },

      mainThread: {
        meanLongTaskSharePercent: Number(
          stats.mainThread.meanLongTaskShare.toFixed(3),
        ),
        maxLongTaskSharePercent: Number(
          stats.mainThread.maxLongTaskShare.toFixed(3),
        ),
        meanLongestLongTaskMs: Number(
          stats.mainThread.meanLongestLongTask.toFixed(3),
        ),
        maxLongestLongTaskMs: Number(
          stats.mainThread.maxLongestLongTask.toFixed(3),
        ),
        meanFrameTimeMs: Number(stats.frameTimes.mean.toFixed(3)),
        maxFrameTimeMs: Number(stats.frameTimes.max.toFixed(3)),
        note: 'Long-task share measures blocking tasks of at least 50ms. Frame time is the observed foreground requestAnimationFrame interval.',
      },

      frameIntervals: {
        totalSampled: stats.frames.totalIntervals,
        slowIntervals: stats.frames.slowIntervals,
        slowIntervalPercentage: Number(
          stats.frames.slowIntervalPercentage.toFixed(3),
        ),
        stabilityScore: Number((stats.frames.stability * 100).toFixed(3)),
      },

      layers: {
        averageLayerCount: Number(stats.layers.avgLayerCount.toFixed(3)),
        averageCpuSubmitTimeMs: Number(stats.layers.avgRenderTime.toFixed(3)),
        averageDrawCalls: Number(stats.layers.avgDrawCalls.toFixed(3)),
      },
    },

    layerPerformance:
      performance.layers.length > 0
        ? performance.layers.map((layer) => ({
            layerName: layer.name,
            averageCpuSubmitTimeMs: Number(layer.avgRenderTime.toFixed(3)),
            maxCpuSubmitTimeMs: Number(layer.maxRenderTime.toFixed(3)),
            averageDrawCalls: layer.avgDrawCalls,
          }))
        : [],

    nodeNetworkPerformance:
      performance.nodeNetworks.length > 0
        ? performance.nodeNetworks.map((network) => ({
            parameterName: network.name,
            averageComputeTimeMs: Number(network.avgComputeTime.toFixed(3)),
            maxComputeTimeMs: Number(network.maxComputeTime.toFixed(3)),
            nodeCount: network.nodeCount,
          }))
        : [],
  };

  return JSON.stringify(report, null, 2);
}

// Generate simplified chart data export (CSV-like format for plotting tools)
function generateChartDataExport(
  session: RecordingSession,
  performance: PerformanceBreakdown,
): string {
  const chartData = {
    metadata: {
      sessionName: session.name,
      description: session.description || null,
      startTime: new Date(session.startTime).toISOString(),
      duration: `${(session.duration / 1000).toFixed(2)}s`,
      sampleRate: `${session.sampleRate}ms`,
      totalSamples: session.snapshots.length,
    },

    // Time series data (perfect for line charts)
    timeSeries: {
      description: 'Time-indexed performance metrics for plotting',
      columns: [
        'time_seconds',
        'fps_current',
        'fps_rolling_avg',
        'memory_mb',
        'long_task_share_percent',
        'layer_count',
        'node_network_count',
      ],
      data: performance.timeSeries.map((d) => [
        d.time,
        d.fps,
        d.avgFps,
        d.memory,
        d.longTaskShare,
        d.layers,
        d.nodeNetworks,
      ]),
    },

    // Layer performance summary (for bar charts)
    layerPerformance: {
      description: 'Per-layer performance aggregates',
      columns: [
        'layer_name',
        'avg_cpu_submit_ms',
        'max_cpu_submit_ms',
        'avg_draw_calls',
      ],
      data: performance.layers.map((l) => [
        l.name,
        Number(l.avgRenderTime.toFixed(3)),
        Number(l.maxRenderTime.toFixed(3)),
        l.avgDrawCalls,
      ]),
    },

    // Node network performance summary (for bar charts)
    nodeNetworkPerformance: {
      description: 'Per-network computation aggregates',
      columns: [
        'parameter_name',
        'avg_compute_ms',
        'max_compute_ms',
        'node_count',
      ],
      data: performance.nodeNetworks.map((n) => [
        n.name,
        Number(n.avgComputeTime.toFixed(3)),
        Number(n.maxComputeTime.toFixed(3)),
        n.nodeCount,
      ]),
    },

    // Usage example for plotting tools
    usage: {
      python_pandas: `
import pandas as pd
import json

# Load data
with open('chart_data.json') as f:
    data = json.load(f)

# Create DataFrame from time series
df = pd.DataFrame(data['timeSeries']['data'], columns=data['timeSeries']['columns'])

# Plot FPS over time
import matplotlib.pyplot as plt
plt.plot(df['time_seconds'], df['fps_current'], label='Current FPS')
plt.plot(df['time_seconds'], df['fps_rolling_avg'], label='Rolling Avg')
plt.xlabel('Time (seconds)')
plt.ylabel('FPS')
plt.legend()
plt.show()
      `,
      latex_pgfplots: `
% Use with pgfplotstable
\\addplot table[x=time_seconds, y=fps_current] {chart_data.dat};
      `,
    },
  };

  return JSON.stringify(chartData, null, 2);
}

function formatDurationForExport(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

const PerformanceStatsDialogComponent = ({
  session,
  open,
  onOpenChange,
}: PerformanceStatsDialogProps) => {
  // Export loading states
  const [exportingCharts, setExportingCharts] = useState<Set<string>>(
    new Set(),
  );
  const [exportingZip, setExportingZip] = useState(false);

  // Compute statistics
  const stats = useMemo(
    () => (session ? computeSessionStatistics(session) : null),
    [session],
  );

  const performance = useMemo(
    () => (session ? computePerformanceBreakdown(session) : null),
    [session],
  );
  const timeSeriesData = performance?.timeSeries ?? [];
  const layerPerformanceData = performance?.layers ?? [];
  const nodeNetworkPerformanceData = performance?.nodeNetworks ?? [];

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Download comprehensive JSON report
  const handleDownloadReport = () => {
    if (!session || !stats || !performance) return;

    const jsonReport = generateJSONReport(session, stats, performance);

    // Create blob and download
    const blob = new Blob([jsonReport], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${session.name.replace(/[^a-z0-9]/gi, '_')}_performance_report.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download simplified chart data for plotting tools
  const handleDownloadChartData = () => {
    if (!session || !performance) return;

    const chartData = generateChartDataExport(session, performance);

    // Create blob and download
    const blob = new Blob([chartData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${session.name.replace(/[^a-z0-9]/gi, '_')}_chart_data.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export chart as PNG
  const handleExportChart = async (
    chartType: string,
    exportFn: () => Promise<Blob>,
  ) => {
    if (!session) return;

    setExportingCharts((prev) => new Set(prev).add(chartType));

    try {
      const blob = await exportFn();
      const filename = `${session.name.replace(/[^a-z0-9]/gi, '_')}_${chartType}.png`;
      downloadChartAsPNG(blob, filename);
    } catch (error) {
      console.error(`Failed to export ${chartType} chart:`, error);
    } finally {
      setExportingCharts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(chartType);
        return newSet;
      });
    }
  };

  const exportChart = (
    chartType: string,
    exporter: (session: RecordingSession) => Promise<Blob>,
  ) => {
    if (session) {
      handleExportChart(chartType, () => exporter(session));
    }
  };

  // Download all charts as ZIP
  const handleDownloadAllCharts = async () => {
    if (!session) return;

    setExportingZip(true);
    try {
      const zipBlob = await exportAllChartsAsZip(session);
      downloadAllChartsAsZip(zipBlob, session.name);
    } catch (error) {
      console.error('Failed to export all charts as ZIP:', error);
    } finally {
      setExportingZip(false);
    }
  };

  if (!session || !stats) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scrollbar-custom max-h-[90vh] max-w-7xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{session.name}</DialogTitle>
          <DialogDescription asChild>
            <div>
              <p>Performance Analysis Report</p>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
                <span>
                  Duration:{' '}
                  <strong className="text-white">
                    {formatDuration(session.duration)}
                  </strong>
                </span>
                <span>
                  Samples:{' '}
                  <strong className="text-white">
                    {session.snapshots.length}
                  </strong>
                </span>
                <span>
                  Sample Rate:{' '}
                  <strong className="text-white">{session.sampleRate}ms</strong>
                </span>
                <span>
                  Date:{' '}
                  <strong className="text-white">
                    {new Date(session.startTime).toLocaleString()}
                  </strong>
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadReport}
                    className="h-6 gap-1.5 px-2 text-xs"
                    title="Download comprehensive JSON report with all statistics and metadata">
                    <Download className="h-3 w-3" />
                    Full Report
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadChartData}
                    className="h-6 gap-1.5 px-2 text-xs"
                    title="Download simplified chart data for plotting tools (Python, LaTeX, etc.)">
                    <Download className="h-3 w-3" />
                    Chart Data
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadAllCharts}
                    disabled={exportingZip}
                    className="h-6 gap-1.5 px-2 text-xs"
                    title="Download all chart images as a ZIP file">
                    {exportingZip ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    ) : (
                      <ImageIcon className="h-3 w-3" />
                    )}
                    {exportingZip ? 'Exporting...' : 'All Charts'}
                  </Button>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-6">
          {/* Key Metrics Summary */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-white">
              Executive Summary
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <StatCard
                label="Mean FPS"
                value={stats.editorFPS.mean.toFixed(2)}
                subValue={`P95: ${stats.editorFPS.p95.toFixed(2)}`}
                color="blue"
              />
              <StatCard
                label="Frame Stability"
                value={`${(stats.frames.stability * 100).toFixed(1)}%`}
                subValue={`Slow: ${stats.frames.slowIntervalPercentage.toFixed(1)}%`}
                color={stats.frames.stability > 0.9 ? 'green' : 'yellow'}
              />
              <StatCard
                label="Memory (P95)"
                value={`${stats.memory.p95.toFixed(1)} MB`}
                subValue={`Mean: ${stats.memory.mean.toFixed(1)} MB`}
                color="purple"
              />
              <StatCard
                label="Long-task Share"
                value={`${stats.mainThread.meanLongTaskShare.toFixed(1)}%`}
                subValue={`Max: ${stats.mainThread.maxLongTaskShare.toFixed(1)}%`}
                color="orange"
              />
            </div>
          </div>

          {/* FPS Over Time Chart */}
          <div>
            <ChartHeading
              title="FPS Performance Over Time"
              exporting={exportingCharts.has('fps')}
              onExport={() => exportChart('fps', exportFPSChart)}
            />
            <div className="rounded-lg border border-white/10 bg-black/40 p-4">
              {timeSeriesData.length > 0 ? (
                <TimeSeriesChart
                  data={timeSeriesData}
                  height={300}
                  yLabel="FPS"
                  series={[
                    {
                      dataKey: 'fps',
                      name: 'Current FPS',
                      color: '#10b981',
                      kind: 'area',
                      fillId: 'colorFps',
                    },
                    {
                      dataKey: 'avgFps',
                      name: 'Rolling Avg',
                      color: '#3b82f6',
                    },
                  ]}
                />
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Memory and main-thread diagnostics over time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <ChartHeading
                title="Memory Usage"
                exporting={exportingCharts.has('memory')}
                onExport={() => exportChart('memory', exportMemoryChart)}
              />
              <div className="rounded-lg border border-white/10 bg-black/40 p-4">
                <TimeSeriesChart
                  data={timeSeriesData}
                  height={200}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  paddedLegend={false}
                  series={[
                    {
                      dataKey: 'memory',
                      name: 'Memory (MB)',
                      color: '#a855f7',
                    },
                  ]}
                />
              </div>
            </div>

            <div>
              <ChartHeading
                title="Main-thread Long-task Share"
                exporting={exportingCharts.has('long_task_share')}
                onExport={() =>
                  exportChart('long_task_share', exportLongTaskShareChart)
                }
              />
              <div className="rounded-lg border border-white/10 bg-black/40 p-4">
                <TimeSeriesChart
                  data={timeSeriesData}
                  height={200}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  paddedLegend={false}
                  yDomain={[0, 100]}
                  series={[
                    {
                      dataKey: 'longTaskShare',
                      name: 'Long-task Share (%)',
                      color: '#f97316',
                    },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Layer Performance */}
          {layerPerformanceData.length > 0 && (
            <div>
              <ChartHeading
                title="Layer CPU Submit Time"
                exporting={exportingCharts.has('layer_performance')}
                onExport={() =>
                  exportChart('layer_performance', exportLayerPerformanceChart)
                }
              />
              <div className="rounded-lg border border-white/10 bg-black/40 p-4">
                <PerformanceBarChart
                  data={layerPerformanceData}
                  bars={[
                    {
                      dataKey: 'avgRenderTime',
                      name: 'Avg CPU Submit (ms)',
                      color: '#3b82f6',
                    },
                    {
                      dataKey: 'maxRenderTime',
                      name: 'Max CPU Submit (ms)',
                      color: '#ef4444',
                    },
                  ]}
                />
              </div>
            </div>
          )}

          {/* Node Network Performance */}
          {nodeNetworkPerformanceData.length > 0 && (
            <div>
              <ChartHeading
                title="Node Network Computation Time"
                exporting={exportingCharts.has('node_network_performance')}
                onExport={() =>
                  exportChart(
                    'node_network_performance',
                    exportNodeNetworkPerformanceChart,
                  )
                }
              />
              <div className="rounded-lg border border-white/10 bg-black/40 p-4">
                <PerformanceBarChart
                  data={nodeNetworkPerformanceData}
                  tickFontSize={12}
                  tickFormatter={(value, index) => {
                    const item = nodeNetworkPerformanceData[index];
                    return item ? `${item.name} (${item.layerName})` : value;
                  }}
                  bars={[
                    {
                      dataKey: 'avgComputeTime',
                      name: 'Avg Compute Time (ms)',
                      color: '#10b981',
                    },
                    {
                      dataKey: 'maxComputeTime',
                      name: 'Max Compute Time (ms)',
                      color: '#f59e0b',
                    },
                  ]}
                />
              </div>
            </div>
          )}

          {/* Detailed Statistics Tables */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-white">
              Detailed Statistics for Thesis
            </h3>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <StatisticsTable
                title="Frame Rate (FPS) Statistics"
                titleColor="text-blue-400"
                rows={[
                  ['Mean FPS', stats.editorFPS.mean.toFixed(3)],
                  ['Median FPS', stats.editorFPS.median.toFixed(3)],
                  ['Standard Deviation', stats.editorFPS.stdDev.toFixed(3)],
                  [
                    'Min / Max FPS',
                    `${stats.editorFPS.min.toFixed(3)} / ${stats.editorFPS.max.toFixed(3)}`,
                  ],
                  ['P50 (Median)', stats.editorFPS.p50.toFixed(3)],
                  ['P75 (75th percentile)', stats.editorFPS.p75.toFixed(3)],
                  ['P90 (90th percentile)', stats.editorFPS.p90.toFixed(3)],
                  ['P95 (95th percentile)', stats.editorFPS.p95.toFixed(3)],
                  ['P99 (99th percentile)', stats.editorFPS.p99.toFixed(3)],
                ]}
              />
              <StatisticsTable
                title="Memory Statistics"
                titleColor="text-purple-400"
                valueHeading="Value (MB)"
                rows={[
                  ['Mean Memory Usage', stats.memory.mean.toFixed(3)],
                  ['Median Memory Usage', stats.memory.median.toFixed(3)],
                  ['Standard Deviation', stats.memory.stdDev.toFixed(3)],
                  [
                    'Min / Max Memory',
                    `${stats.memory.min.toFixed(3)} / ${stats.memory.max.toFixed(3)}`,
                  ],
                  ['P95 (95th percentile)', stats.memory.p95.toFixed(3)],
                ]}
              />
              <StatisticsTable
                title="Main Thread Statistics"
                titleColor="text-orange-400"
                rows={[
                  [
                    'Mean Long-task Share',
                    `${stats.mainThread.meanLongTaskShare.toFixed(3)}%`,
                  ],
                  [
                    'Max Long-task Share',
                    `${stats.mainThread.maxLongTaskShare.toFixed(3)}%`,
                  ],
                  [
                    'Mean Longest Long Task',
                    `${stats.mainThread.meanLongestLongTask.toFixed(3)} ms`,
                  ],
                  [
                    'Max Longest Long Task',
                    `${stats.mainThread.maxLongestLongTask.toFixed(3)} ms`,
                  ],
                  ['Mean Frame Time', `${stats.frameTimes.mean.toFixed(3)} ms`],
                  ['Max Frame Time', `${stats.frameTimes.max.toFixed(3)} ms`],
                ]}
              />
              <StatisticsTable
                title="Frame Interval Statistics"
                titleColor="text-green-400"
                rows={[
                  ['Total Intervals Sampled', stats.frames.totalIntervals],
                  ['Slow Intervals (>33.33 ms)', stats.frames.slowIntervals],
                  [
                    'Slow Interval Percentage',
                    `${stats.frames.slowIntervalPercentage.toFixed(3)}%`,
                  ],
                  [
                    'Performance Stability Score',
                    `${(stats.frames.stability * 100).toFixed(3)}%`,
                  ],
                ]}
              />
            </div>

            <StatisticsTable
              title="Layer Statistics"
              titleColor="text-cyan-400"
              rows={[
                ['Average Layer Count', stats.layers.avgLayerCount.toFixed(3)],
                [
                  'Average CPU Submit Time',
                  `${stats.layers.avgRenderTime.toFixed(3)} ms`,
                ],
                ['Average Draw Calls', stats.layers.avgDrawCalls.toFixed(3)],
              ]}
            />

            {layerPerformanceData.length > 0 && (
              <BreakdownTable
                title="Per-Layer CPU Submit Breakdown"
                titleColor="text-indigo-400"
                rows={layerPerformanceData}
                getKey={(layer) => layer.layerId}
                columns={[
                  {
                    heading: 'Layer Name',
                    align: 'left',
                    value: (layer) => layer.name,
                  },
                  {
                    heading: 'Avg CPU Submit (ms)',
                    value: (layer) => layer.avgRenderTime.toFixed(3),
                  },
                  {
                    heading: 'Max CPU Submit (ms)',
                    value: (layer) => layer.maxRenderTime.toFixed(3),
                  },
                  {
                    heading: 'Avg Draw Calls',
                    value: (layer) => layer.avgDrawCalls,
                  },
                ]}
              />
            )}

            {nodeNetworkPerformanceData.length > 0 && (
              <BreakdownTable
                title="Per-Node-Network Performance Breakdown"
                titleColor="text-emerald-400"
                rows={nodeNetworkPerformanceData}
                getKey={(network) => network.parameterId}
                columns={[
                  {
                    heading: 'Parameter Name',
                    align: 'left',
                    value: (network) => (
                      <div>
                        <div className="font-medium">{network.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {network.layerName}
                        </div>
                      </div>
                    ),
                  },
                  {
                    heading: 'Avg Compute (ms)',
                    value: (network) => network.avgComputeTime.toFixed(3),
                  },
                  {
                    heading: 'Max Compute (ms)',
                    value: (network) => network.maxComputeTime.toFixed(3),
                  },
                  {
                    heading: 'Node Count',
                    value: (network) => network.nodeCount,
                  },
                ]}
              />
            )}
          </div>

          <StatisticsTable
            title="Test Environment (Metadata)"
            titleColor="text-white"
            largeTitle
            labelClassName="font-semibold text-muted-foreground"
            showHeader={false}
            valueClassName="font-mono text-white"
            rows={[
              ['Browser', session.metadata.browser],
              ['Platform', session.metadata.platform],
              ['GPU', session.metadata.gpu],
              ['CSS Resolution', session.metadata.screenResolution],
              ['Device Pixel Ratio', `${session.metadata.devicePixelRatio}x`],
              [
                'Physical Resolution',
                `${session.metadata.physicalResolution} (GPU render target)`,
              ],
              ...(session.description
                ? ([['Description', session.description]] as const)
                : []),
            ]}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Memoize the component to prevent re-renders when profiler updates
export const PerformanceStatsDialog = memo(
  PerformanceStatsDialogComponent,
  (prevProps, nextProps) => {
    // Only re-render if open state changes or if the session ID changes
    return (
      prevProps.open === nextProps.open &&
      prevProps.session?.id === nextProps.session?.id
    );
  },
);

PerformanceStatsDialog.displayName = 'PerformanceStatsDialog';

type TimeSeriesDefinition = {
  dataKey: string;
  name: string;
  color: string;
  kind?: 'area' | 'line';
  fillId?: string;
};

function TimeSeriesChart({
  data,
  height,
  series,
  margin = { top: 10, right: 30, left: 0, bottom: 20 },
  paddedLegend = true,
  yDomain = [0, 'auto'],
  yLabel,
}: {
  data: Record<string, unknown>[];
  height: number;
  series: TimeSeriesDefinition[];
  margin?: { top: number; right: number; left: number; bottom: number };
  paddedLegend?: boolean;
  yDomain?: [number, number | 'auto'];
  yLabel?: string;
}) {
  const areaSeries = series.filter(({ kind }) => kind === 'area');
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={margin}>
        {areaSeries.length > 0 && (
          <defs>
            {areaSeries.map(({ color, fillId }) => (
              <linearGradient
                key={fillId}
                id={fillId}
                x1="0"
                y1="0"
                x2="0"
                y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
        )}
        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
        <XAxis
          dataKey="time"
          stroke="#999"
          type="number"
          domain={['dataMin', 'dataMax']}
          tick={{ fill: '#999' }}
        />
        <YAxis
          stroke="#999"
          domain={yDomain}
          tick={{ fill: '#999' }}
          {...(yLabel
            ? {
                label: {
                  value: yLabel,
                  angle: -90,
                  position: 'insideLeft' as const,
                  style: { fill: '#999' },
                },
              }
            : {})}
        />
        <Tooltip contentStyle={chartTooltipStyle} />
        <Legend
          {...(paddedLegend ? { wrapperStyle: { paddingTop: '10px' } } : {})}
        />
        {series.map(({ dataKey, name, color, kind, fillId }) =>
          kind === 'area' ? (
            <Area
              key={dataKey}
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${fillId})`}
              name={name}
            />
          ) : (
            <Line
              key={dataKey}
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
              name={name}
            />
          ),
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function PerformanceBarChart({
  data,
  bars,
  tickFontSize,
  tickFormatter,
}: {
  data: Record<string, unknown>[];
  bars: Array<{ dataKey: string; name: string; color: string }>;
  tickFontSize?: number;
  tickFormatter?: (value: string, index: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
        <XAxis
          dataKey="name"
          stroke="#999"
          tick={{
            fill: '#999',
            ...(tickFontSize ? { fontSize: tickFontSize } : {}),
          }}
          {...(tickFormatter ? { tickFormatter } : {})}
        />
        <YAxis stroke="#999" tick={{ fill: '#999' }} />
        <Tooltip contentStyle={chartTooltipStyle} />
        <Legend />
        {bars.map(({ dataKey, name, color }) => (
          <Bar key={dataKey} dataKey={dataKey} fill={color} name={name} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function BreakdownTable<T>({
  title,
  titleColor,
  rows,
  columns,
  getKey,
}: {
  title: string;
  titleColor: string;
  rows: T[];
  columns: Array<{
    heading: string;
    value: (row: T) => ReactNode;
    align?: 'left' | 'right';
  }>;
  getKey: (row: T) => string;
}) {
  return (
    <div className="mb-4">
      <h4 className={`mb-2 text-sm font-semibold ${titleColor}`}>{title}</h4>
      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              {columns.map(({ heading, align = 'right' }) => (
                <th
                  key={heading}
                  className={`border-b border-white/10 px-4 py-2 text-white ${
                    align === 'left' ? 'text-left' : 'text-right'
                  }`}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-black/40">
            {rows.map((row, index) => {
              const border =
                index < rows.length - 1 ? 'border-b border-white/5' : '';
              return (
                <tr key={getKey(row)}>
                  {columns.map(
                    ({ heading, value, align = 'right' }, columnIndex) => (
                      <td
                        key={heading}
                        className={`${border} px-4 py-2 ${
                          align === 'left' ? 'text-left' : 'text-right'
                        } ${
                          columnIndex === 0
                            ? 'text-white'
                            : 'font-mono text-white'
                        }`}>
                        {value(row)}
                      </td>
                    ),
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper component for stat cards
interface StatCardProps {
  label: string;
  value: string;
  subValue: string;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
}

function StatCard({ label, value, subValue, color }: StatCardProps) {
  const colorClasses = {
    blue: 'border-blue-500/20 bg-blue-500/5 text-blue-400',
    green: 'border-green-500/20 bg-green-500/5 text-green-400',
    yellow: 'border-yellow-500/20 bg-yellow-500/5 text-yellow-400',
    purple: 'border-purple-500/20 bg-purple-500/5 text-purple-400',
    orange: 'border-orange-500/20 bg-orange-500/5 text-orange-400',
  };

  return (
    <div
      className={`rounded-lg border p-4 ${colorClasses[color]} transition-all hover:scale-105`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold`}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{subValue}</div>
    </div>
  );
}

function ChartHeading({
  title,
  exporting,
  onExport,
}: {
  title: string;
  exporting: boolean;
  onExport: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <Button
        variant="outline"
        size="sm"
        onClick={onExport}
        disabled={exporting}
        className="h-8 gap-1.5 px-2 text-xs">
        {exporting ? (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        ) : (
          <ImageIcon className="h-3 w-3" />
        )}
        {exporting ? 'Exporting...' : 'Export PNG'}
      </Button>
    </div>
  );
}

function StatisticsTable({
  title,
  titleColor,
  rows,
  largeTitle = false,
  labelClassName = 'text-muted-foreground',
  showHeader = true,
  valueHeading = 'Value',
  valueClassName = 'text-right font-mono text-white',
}: {
  title: string;
  titleColor: string;
  rows: Array<readonly [label: string, value: ReactNode]>;
  largeTitle?: boolean;
  labelClassName?: string;
  showHeader?: boolean;
  valueHeading?: string;
  valueClassName?: string;
}) {
  return (
    <div className="mb-4 flex flex-col">
      {largeTitle ? (
        <h3 className={`mb-3 text-lg font-semibold ${titleColor}`}>{title}</h3>
      ) : (
        <h4 className={`mb-2 text-sm font-semibold ${titleColor}`}>{title}</h4>
      )}
      <div className="flex-1 overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-sm">
          {showHeader && (
            <thead className="bg-white/5">
              <tr>
                <th className="border-b border-white/10 px-4 py-2 text-left text-white">
                  Metric
                </th>
                <th className="border-b border-white/10 px-4 py-2 text-right text-white">
                  {valueHeading}
                </th>
              </tr>
            </thead>
          )}
          <tbody className="bg-black/40">
            {rows.map(([label, value], index) => {
              const border =
                index < rows.length - 1 ? 'border-b border-white/5' : '';
              return (
                <tr key={label}>
                  <td className={`${border} px-4 py-2 ${labelClassName}`}>
                    {label}
                  </td>
                  <td className={`${border} px-4 py-2 ${valueClassName}`}>
                    {value}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
