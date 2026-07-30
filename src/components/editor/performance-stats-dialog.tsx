import { destructureParameterId } from '@/lib/id-utils';
import type { RecordingSession } from '@/lib/stores/performance-recorder-types';
import { computeSessionStatistics } from '@/lib/stores/performance-recorder-utils';
import {
  downloadAllChartsAsZip,
  downloadChartAsPNG,
  exportAllChartsAsZip,
  exportFPSChart,
  exportFrameBudgetChart,
  exportLayerPerformanceChart,
  exportMemoryChart,
  exportNodeNetworkPerformanceChart,
} from '@/lib/utils/chart-export';
import { Download, Image as ImageIcon } from 'lucide-react';
import { memo, useMemo, useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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

// Generate comprehensive JSON report with all statistics and data
function generateJSONReport(
  session: RecordingSession,
  stats: any,
  layerPerformanceData: any[],
  nodeNetworkPerformanceData: any[],
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
        droppedFramePercentage: Number(
          stats.frames.droppedFramePercentage.toFixed(1),
        ),
      },
      memory: {
        p95MB: Number(stats.memory.p95.toFixed(1)),
      },
      mainThread: {
        meanFrameBudgetPercent: Number(stats.cpu.meanUsage.toFixed(1)),
        note: 'Frame budget usage: 100% = using full 16.67ms frame time (60fps target)',
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
        meanFrameBudgetPercent: Number(stats.cpu.meanUsage.toFixed(3)),
        maxFrameBudgetPercent: Number(stats.cpu.maxUsage.toFixed(3)),
        meanFrameTimeMs: Number(stats.frameTimes.mean.toFixed(3)),
        maxFrameTimeMs: Number(stats.frameTimes.max.toFixed(3)),
        note: 'Frame budget: % of 16.67ms used per frame. Frame time: actual ms per frame.',
      },

      frames: {
        totalFramesSampled: stats.frames.totalFrames,
        droppedFrames: stats.frames.droppedFrames,
        droppedFramePercentage: Number(
          stats.frames.droppedFramePercentage.toFixed(3),
        ),
        stabilityScore: Number((stats.frames.stability * 100).toFixed(3)),
      },

      layers: {
        averageLayerCount: Number(stats.layers.avgLayerCount.toFixed(3)),
        averageRenderTimeMs: Number(stats.layers.avgRenderTime.toFixed(3)),
        averageDrawCalls: Number(stats.layers.avgDrawCalls.toFixed(3)),
      },
    },

    layerPerformance:
      layerPerformanceData.length > 0
        ? layerPerformanceData.map((layer) => ({
            layerName: layer.name,
            averageRenderTimeMs: Number(layer.avgRenderTime.toFixed(3)),
            maxRenderTimeMs: Number(layer.maxRenderTime.toFixed(3)),
            averageDrawCalls: layer.avgDrawCalls,
          }))
        : [],

    nodeNetworkPerformance:
      nodeNetworkPerformanceData.length > 0
        ? nodeNetworkPerformanceData.map((network) => ({
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
  timeSeriesData: any[],
  layerPerformanceData: any[],
  nodeNetworkPerformanceData: any[],
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
        'frame_budget_percent',
        'layer_count',
        'node_network_count',
      ],
      data: timeSeriesData.map((d) => [
        d.time,
        d.fps,
        d.avgFps,
        d.memory,
        d.frameBudget,
        d.layers,
        d.nodeNetworks,
      ]),
    },

    // Layer performance summary (for bar charts)
    layerPerformance: {
      description: 'Per-layer performance aggregates',
      columns: [
        'layer_name',
        'avg_render_ms',
        'max_render_ms',
        'avg_draw_calls',
      ],
      data: layerPerformanceData.map((l) => [
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
      data: nodeNetworkPerformanceData.map((n) => [
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

  // Prepare chart data
  const timeSeriesData = useMemo(() => {
    if (!session) return [];
    const startTime = session.snapshots[0]?.timestamp || 0;
    const data = session.snapshots.map((snapshot) => ({
      time: Number(((snapshot.timestamp - startTime) / 1000).toFixed(1)), // Convert to seconds as number
      timeLabel: `${((snapshot.timestamp - startTime) / 1000).toFixed(1)}s`,
      fps: Number(snapshot.editorFPS.toFixed(1)),
      avgFps: Number(snapshot.editorAvgFPS.toFixed(1)),
      memory: Number(snapshot.memoryUsedMB.toFixed(1)),
      frameBudget: Number(snapshot.cpuUsage.toFixed(1)),
      layers: snapshot.activeLayerCount,
      nodeNetworks: snapshot.activeNodeNetworkCount,
    }));
    return data;
  }, [session]);

  // Layer performance data (aggregate by layer)
  const layerPerformanceData = useMemo(() => {
    if (!session) return [];
    const layerMap = new Map<
      string,
      { renderTimes: number[]; drawCalls: number[] }
    >();

    session.snapshots.forEach((snapshot) => {
      snapshot.layers.forEach((layer) => {
        if (!layerMap.has(layer.layerId)) {
          layerMap.set(layer.layerId, { renderTimes: [], drawCalls: [] });
        }
        const data = layerMap.get(layer.layerId)!;
        data.renderTimes.push(layer.renderTime);
        data.drawCalls.push(layer.drawCalls);
      });
    });

    return Array.from(layerMap.entries()).map(([layerId, data]) => {
      const layer = session.snapshots[0].layers.find(
        (l) => l.layerId === layerId,
      );
      const avgRenderTime =
        data.renderTimes.reduce((a, b) => a + b, 0) / data.renderTimes.length;
      const avgDrawCalls =
        data.drawCalls.reduce((a, b) => a + b, 0) / data.drawCalls.length;

      // Cap max render time to be logically consistent with frame times
      // A layer cannot take longer to render than the entire frame
      // This prevents measurement artifacts where layer render times exceed frame times
      const rawMaxRenderTime = Math.max(...data.renderTimes);
      const maxFrameTime =
        1000 / Math.min(...session.snapshots.map((s) => s.editorFPS));
      const maxRenderTime = Math.min(rawMaxRenderTime, maxFrameTime);

      return {
        name: layer?.layerName || layerId,
        avgRenderTime: Number(avgRenderTime.toFixed(2)),
        maxRenderTime: Number(maxRenderTime.toFixed(2)),
        avgDrawCalls: Math.round(avgDrawCalls),
      };
    });
  }, [session]);

  // Node network performance data
  const nodeNetworkPerformanceData = useMemo(() => {
    if (!session) return [];
    const networkMap = new Map<
      string,
      { computeTimes: number[]; nodeCounts: number[] }
    >();

    session.snapshots.forEach((snapshot) => {
      snapshot.nodeNetworks.forEach((network) => {
        if (!networkMap.has(network.parameterId)) {
          networkMap.set(network.parameterId, {
            computeTimes: [],
            nodeCounts: [],
          });
        }
        const data = networkMap.get(network.parameterId)!;
        data.computeTimes.push(network.computeTime);
        data.nodeCounts.push(network.nodeCount);
      });
    });

    return Array.from(networkMap.entries()).map(([parameterId, data]) => {
      const avgComputeTime =
        data.computeTimes.reduce((a, b) => a + b, 0) / data.computeTimes.length;
      const maxComputeTime = Math.max(...data.computeTimes);
      const avgNodeCount =
        data.nodeCounts.reduce((a, b) => a + b, 0) / data.nodeCounts.length;

      // Use destructureParameterId to get proper display names
      const paramInfo = destructureParameterId(parameterId);

      return {
        name: paramInfo.displayName,
        layerName: paramInfo.componentName,
        avgComputeTime: Number(avgComputeTime.toFixed(3)),
        maxComputeTime: Number(maxComputeTime.toFixed(3)),
        nodeCount: Math.round(avgNodeCount),
      };
    });
  }, [session]);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Download comprehensive JSON report
  const handleDownloadReport = () => {
    if (!session || !stats) return;

    const jsonReport = generateJSONReport(
      session,
      stats,
      layerPerformanceData,
      nodeNetworkPerformanceData,
    );

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
    if (!session) return;

    const chartData = generateChartDataExport(
      session,
      timeSeriesData,
      layerPerformanceData,
      nodeNetworkPerformanceData,
    );

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
          <DialogDescription>
            Performance Analysis Report
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
                subValue={`Dropped: ${stats.frames.droppedFramePercentage.toFixed(1)}%`}
                color={stats.frames.stability > 0.9 ? 'green' : 'yellow'}
              />
              <StatCard
                label="Memory (P95)"
                value={`${stats.memory.p95.toFixed(1)} MB`}
                subValue={`Mean: ${stats.memory.mean.toFixed(1)} MB`}
                color="purple"
              />
              <StatCard
                label="Frame Budget"
                value={`${stats.cpu.meanUsage.toFixed(1)}%`}
                subValue={`Max: ${stats.cpu.maxUsage.toFixed(1)}%`}
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
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={timeSeriesData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorFps" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>
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
                      domain={[0, 'auto']}
                      tick={{ fill: '#999' }}
                      label={{
                        value: 'FPS',
                        angle: -90,
                        position: 'insideLeft',
                        style: { fill: '#999' },
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Area
                      type="monotone"
                      dataKey="fps"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorFps)"
                      name="Current FPS"
                    />
                    <Line
                      type="monotone"
                      dataKey="avgFps"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      name="Rolling Avg"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Memory & CPU Over Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <ChartHeading
                title="Memory Usage"
                exporting={exportingCharts.has('memory')}
                onExport={() => exportChart('memory', exportMemoryChart)}
              />
              <div className="rounded-lg border border-white/10 bg-black/40 p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={timeSeriesData}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                      domain={[0, 'auto']}
                      tick={{ fill: '#999' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="memory"
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={false}
                      name="Memory (MB)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <ChartHeading
                title="Main Thread / Frame Budget Usage"
                exporting={exportingCharts.has('frame_budget')}
                onExport={() =>
                  exportChart('frame_budget', exportFrameBudgetChart)
                }
              />
              <div className="rounded-lg border border-white/10 bg-black/40 p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={timeSeriesData}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                      domain={[0, 100]}
                      tick={{ fill: '#999' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="frameBudget"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={false}
                      name="Frame Budget (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Layer Performance */}
          {layerPerformanceData.length > 0 && (
            <div>
              <ChartHeading
                title="Layer Performance Breakdown"
                exporting={exportingCharts.has('layer_performance')}
                onExport={() =>
                  exportChart('layer_performance', exportLayerPerformanceChart)
                }
              />
              <div className="rounded-lg border border-white/10 bg-black/40 p-4">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={layerPerformanceData}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis
                      dataKey="name"
                      stroke="#999"
                      tick={{ fill: '#999' }}
                    />
                    <YAxis stroke="#999" tick={{ fill: '#999' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="avgRenderTime"
                      fill="#3b82f6"
                      name="Avg Render Time (ms)"
                    />
                    <Bar
                      dataKey="maxRenderTime"
                      fill="#ef4444"
                      name="Max Render Time (ms)"
                    />
                  </BarChart>
                </ResponsiveContainer>
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
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={nodeNetworkPerformanceData}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis
                      dataKey="name"
                      stroke="#999"
                      tick={{ fill: '#999', fontSize: 12 }}
                      tickFormatter={(value, index) => {
                        const item = nodeNetworkPerformanceData[index];
                        return item
                          ? `${item.name} (${item.layerName})`
                          : value;
                      }}
                    />
                    <YAxis stroke="#999" tick={{ fill: '#999' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="avgComputeTime"
                      fill="#10b981"
                      name="Avg Compute Time (ms)"
                    />
                    <Bar
                      dataKey="maxComputeTime"
                      fill="#f59e0b"
                      name="Max Compute Time (ms)"
                    />
                  </BarChart>
                </ResponsiveContainer>
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
                    'Mean Frame Budget Usage',
                    `${stats.cpu.meanUsage.toFixed(3)}%`,
                  ],
                  [
                    'Max Frame Budget Usage',
                    `${stats.cpu.maxUsage.toFixed(3)}%`,
                  ],
                  ['Mean Frame Time', `${stats.frameTimes.mean.toFixed(3)} ms`],
                  ['Max Frame Time', `${stats.frameTimes.max.toFixed(3)} ms`],
                ]}
              />
              <StatisticsTable
                title="Frame Statistics"
                titleColor="text-green-400"
                rows={[
                  ['Total Frames Sampled', stats.frames.totalFrames],
                  ['Dropped Frames (<30 FPS)', stats.frames.droppedFrames],
                  [
                    'Dropped Frame Percentage',
                    `${stats.frames.droppedFramePercentage.toFixed(3)}%`,
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
                  'Average Render Time',
                  `${stats.layers.avgRenderTime.toFixed(3)} ms`,
                ],
                ['Average Draw Calls', stats.layers.avgDrawCalls.toFixed(3)],
              ]}
            />

            {/* Per-Layer Detailed Breakdown */}
            {layerPerformanceData.length > 0 && (
              <div className="mb-4">
                <h4 className="mb-2 text-sm font-semibold text-indigo-400">
                  Per-Layer Performance Breakdown
                </h4>
                <div className="overflow-hidden rounded-lg border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="border-b border-white/10 px-4 py-2 text-left text-white">
                          Layer Name
                        </th>
                        <th className="border-b border-white/10 px-4 py-2 text-right text-white">
                          Avg Render (ms)
                        </th>
                        <th className="border-b border-white/10 px-4 py-2 text-right text-white">
                          Max Render (ms)
                        </th>
                        <th className="border-b border-white/10 px-4 py-2 text-right text-white">
                          Avg Draw Calls
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-black/40">
                      {layerPerformanceData.map((layer, idx) => (
                        <tr key={idx}>
                          <td
                            className={`px-4 py-2 text-white ${idx < layerPerformanceData.length - 1 ? 'border-b border-white/5' : ''}`}>
                            {layer.name}
                          </td>
                          <td
                            className={`px-4 py-2 text-right font-mono text-white ${idx < layerPerformanceData.length - 1 ? 'border-b border-white/5' : ''}`}>
                            {layer.avgRenderTime.toFixed(3)}
                          </td>
                          <td
                            className={`px-4 py-2 text-right font-mono text-white ${idx < layerPerformanceData.length - 1 ? 'border-b border-white/5' : ''}`}>
                            {layer.maxRenderTime.toFixed(3)}
                          </td>
                          <td
                            className={`px-4 py-2 text-right font-mono text-white ${idx < layerPerformanceData.length - 1 ? 'border-b border-white/5' : ''}`}>
                            {layer.avgDrawCalls}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Per-Network Detailed Breakdown */}
            {nodeNetworkPerformanceData.length > 0 && (
              <div className="mb-4">
                <h4 className="mb-2 text-sm font-semibold text-emerald-400">
                  Per-Node-Network Performance Breakdown
                </h4>
                <div className="overflow-hidden rounded-lg border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="border-b border-white/10 px-4 py-2 text-left text-white">
                          Parameter Name
                        </th>
                        <th className="border-b border-white/10 px-4 py-2 text-right text-white">
                          Avg Compute (ms)
                        </th>
                        <th className="border-b border-white/10 px-4 py-2 text-right text-white">
                          Max Compute (ms)
                        </th>
                        <th className="border-b border-white/10 px-4 py-2 text-right text-white">
                          Node Count
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-black/40">
                      {nodeNetworkPerformanceData.map((network, idx) => (
                        <tr key={idx}>
                          <td
                            className={`px-4 py-2 text-white ${idx < nodeNetworkPerformanceData.length - 1 ? 'border-b border-white/5' : ''}`}>
                            <div>
                              <div className="font-medium">{network.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {network.layerName}
                              </div>
                            </div>
                          </td>
                          <td
                            className={`px-4 py-2 text-right font-mono text-white ${idx < nodeNetworkPerformanceData.length - 1 ? 'border-b border-white/5' : ''}`}>
                            {network.avgComputeTime.toFixed(3)}
                          </td>
                          <td
                            className={`px-4 py-2 text-right font-mono text-white ${idx < nodeNetworkPerformanceData.length - 1 ? 'border-b border-white/5' : ''}`}>
                            {network.maxComputeTime.toFixed(3)}
                          </td>
                          <td
                            className={`px-4 py-2 text-right font-mono text-white ${idx < nodeNetworkPerformanceData.length - 1 ? 'border-b border-white/5' : ''}`}>
                            {network.nodeCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* System Metadata */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-white">
              Test Environment (Metadata)
            </h3>
            <div className="overflow-hidden rounded-lg border border-white/10">
              <table className="w-full text-sm">
                <tbody className="bg-black/40">
                  <tr>
                    <td className="border-b border-white/5 px-4 py-2 font-semibold text-muted-foreground">
                      Browser
                    </td>
                    <td className="border-b border-white/5 px-4 py-2 font-mono text-white">
                      {session.metadata.browser}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-white/5 px-4 py-2 font-semibold text-muted-foreground">
                      Platform
                    </td>
                    <td className="border-b border-white/5 px-4 py-2 font-mono text-white">
                      {session.metadata.platform}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-white/5 px-4 py-2 font-semibold text-muted-foreground">
                      GPU
                    </td>
                    <td className="border-b border-white/5 px-4 py-2 font-mono text-white">
                      {session.metadata.gpu}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-white/5 px-4 py-2 font-semibold text-muted-foreground">
                      CSS Resolution
                    </td>
                    <td className="border-b border-white/5 px-4 py-2 font-mono text-white">
                      {session.metadata.screenResolution}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-white/5 px-4 py-2 font-semibold text-muted-foreground">
                      Device Pixel Ratio
                    </td>
                    <td className="border-b border-white/5 px-4 py-2 font-mono text-white">
                      {session.metadata.devicePixelRatio}x
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-white/5 px-4 py-2 font-semibold text-muted-foreground">
                      Physical Resolution
                    </td>
                    <td className="border-b border-white/5 px-4 py-2 font-mono text-white">
                      {session.metadata.physicalResolution}{' '}
                      <span className="text-xs text-muted-foreground">
                        (GPU render target)
                      </span>
                    </td>
                  </tr>
                  {session.description && (
                    <tr>
                      <td className="px-4 py-2 font-semibold text-muted-foreground">
                        Description
                      </td>
                      <td className="px-4 py-2 text-white">
                        {session.description}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
  valueHeading = 'Value',
}: {
  title: string;
  titleColor: string;
  rows: Array<readonly [label: string, value: ReactNode]>;
  valueHeading?: string;
}) {
  return (
    <div className="mb-4 flex flex-col">
      <h4 className={`mb-2 text-sm font-semibold ${titleColor}`}>{title}</h4>
      <div className="flex-1 overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-sm">
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
          <tbody className="bg-black/40">
            {rows.map(([label, value], index) => {
              const border =
                index < rows.length - 1 ? 'border-b border-white/5' : '';
              return (
                <tr key={label}>
                  <td className={`${border} px-4 py-2 text-muted-foreground`}>
                    {label}
                  </td>
                  <td
                    className={`${border} px-4 py-2 text-right font-mono text-white`}>
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
