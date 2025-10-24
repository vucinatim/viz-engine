import useProfilerStore from '@/lib/stores/profiler-store';
import {
  Activity,
  Cpu,
  Database,
  HardDrive,
  Layers,
  Monitor,
  X,
} from 'lucide-react';
import { useEffect } from 'react';
import { Card } from '../ui/card';

// Format number to fixed decimal places
const formatNumber = (num: number, decimals = 2) => num.toFixed(decimals);

// Format bytes to MB
const formatMB = (mb: number) => `${formatNumber(mb, 1)} MB`;

// Get color based on FPS value
const getFPSColor = (fps: number) => {
  if (fps >= 55) return 'text-green-400';
  if (fps >= 30) return 'text-yellow-400';
  return 'text-red-400';
};

// Get color based on percentage
const getPercentColor = (percent: number) => {
  if (percent < 50) return 'text-green-400';
  if (percent < 80) return 'text-yellow-400';
  return 'text-red-400';
};

// Metric Card Component
interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function MetricCard({ title, icon, children }: MetricCardProps) {
  return (
    <Card className="border-white/10 bg-black/60 p-3">
      <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
        <div className="text-muted-foreground">{icon}</div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="space-y-1 text-xs">{children}</div>
    </Card>
  );
}

// Metric Row Component
interface MetricRowProps {
  label: string;
  value: string | React.ReactNode;
  colorClass?: string;
}

function MetricRow({
  label,
  value,
  colorClass = 'text-white',
}: MetricRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}:</span>
      <span className={`font-mono font-semibold ${colorClass}`}>{value}</span>
    </div>
  );
}

// FPS Metrics Display
function FPSMetricsDisplay({ fps }: { fps: any }) {
  return (
    <>
      <MetricRow
        label="Current"
        value={`${formatNumber(fps.current, 1)} FPS`}
        colorClass={getFPSColor(fps.current)}
      />
      <MetricRow
        label="Average"
        value={`${formatNumber(fps.average, 1)} FPS`}
        colorClass={getFPSColor(fps.average)}
      />
      <MetricRow
        label="Min/Max"
        value={`${formatNumber(fps.min, 1)} / ${formatNumber(fps.max, 1)}`}
      />
    </>
  );
}

// Main Profiler Panel Component
export function ProfilerPanel() {
  const enabled = useProfilerStore((s) => s.enabled);
  const visible = useProfilerStore((s) => s.visible);
  const setVisible = useProfilerStore((s) => s.setVisible);
  const editorFPS = useProfilerStore((s) => s.editorFPS);
  const layerFPSMap = useProfilerStore((s) => s.layerFPSMap);
  const memory = useProfilerStore((s) => s.memory);
  const gpu = useProfilerStore((s) => s.gpu);
  const indexedDB = useProfilerStore((s) => s.indexedDB);
  const cpu = useProfilerStore((s) => s.cpu);

  // Force re-render every 500ms when profiler is visible
  useEffect(() => {
    if (!visible || !enabled) return;

    const intervalId = setInterval(() => {
      // Force component to re-render by triggering a state read
      // Zustand will handle the re-render when store updates
    }, 500);

    return () => clearInterval(intervalId);
  }, [visible, enabled]);

  if (!visible || !enabled) return null;

  const layers = Array.from(layerFPSMap.values());

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-end p-4">
      <div className="scrollbar-hide pointer-events-auto max-h-full w-80 space-y-3 overflow-y-auto">
        {/* Header */}
        <Card className="border-white/10 bg-black/80 p-3 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-400" />
              <h2 className="text-lg font-bold text-white">
                Performance Profiler
              </h2>
            </div>
            <button
              onClick={() => setVisible(false)}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
              title="Close profiler">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Real-time system and layer metrics
          </p>
        </Card>

        {/* Editor FPS */}
        <MetricCard title="Editor FPS" icon={<Monitor className="h-4 w-4" />}>
          <FPSMetricsDisplay fps={editorFPS} />
        </MetricCard>

        {/* CPU Metrics */}
        <MetricCard title="CPU" icon={<Cpu className="h-4 w-4" />}>
          <MetricRow
            label="Usage Estimate"
            value={`${formatNumber(cpu.usage, 1)}%`}
            colorClass={getPercentColor(cpu.usage)}
          />
          <MetricRow
            label="Task Duration"
            value={`${formatNumber(cpu.taskDuration, 2)} ms`}
          />
        </MetricCard>

        {/* Memory Metrics */}
        <MetricCard title="Memory" icon={<HardDrive className="h-4 w-4" />}>
          <MetricRow
            label="Used"
            value={formatMB(memory.usedJSHeapSize)}
            colorClass={getPercentColor(memory.percentage)}
          />
          <MetricRow label="Total" value={formatMB(memory.totalJSHeapSize)} />
          <MetricRow label="Limit" value={formatMB(memory.jsHeapSizeLimit)} />
          <MetricRow
            label="Usage"
            value={`${formatNumber(memory.percentage, 1)}%`}
            colorClass={getPercentColor(memory.percentage)}
          />
        </MetricCard>

        {/* GPU Metrics */}
        <MetricCard title="GPU" icon={<Activity className="h-4 w-4" />}>
          {gpu.available ? (
            <>
              <div className="mb-2 break-words font-mono text-xs text-white">
                {gpu.renderer}
              </div>
              <MetricRow label="Vendor" value={gpu.vendor} />
              <MetricRow
                label="Max Texture"
                value={`${gpu.maxTextureSize}px`}
              />
            </>
          ) : (
            <MetricRow
              label="Status"
              value="Not Available"
              colorClass="text-yellow-400"
            />
          )}
        </MetricCard>

        {/* IndexedDB Metrics */}
        <MetricCard
          title="Storage (IndexedDB)"
          icon={<Database className="h-4 w-4" />}>
          <MetricRow label="Used" value={formatMB(indexedDB.usage)} />
          <MetricRow label="Quota" value={formatMB(indexedDB.quota)} />
          <MetricRow
            label="Usage"
            value={`${formatNumber(indexedDB.percentage, 1)}%`}
            colorClass={getPercentColor(indexedDB.percentage)}
          />
        </MetricCard>

        {/* Layer FPS Metrics */}
        {layers.length > 0 && (
          <MetricCard
            title="Layer Performance"
            icon={<Layers className="h-4 w-4" />}>
            <div className="space-y-3">
              {layers.map((layer) => (
                <div
                  key={layer.layerId}
                  className="border-t border-white/10 pt-2 first:border-t-0 first:pt-0">
                  <div className="mb-1 font-semibold text-white">
                    {layer.layerName}
                  </div>
                  <MetricRow
                    label="FPS"
                    value={`${formatNumber(layer.fps.current, 1)}`}
                    colorClass={getFPSColor(layer.fps.current)}
                  />
                  <MetricRow
                    label="Avg FPS"
                    value={`${formatNumber(layer.fps.average, 1)}`}
                  />
                  <MetricRow
                    label="Render Time"
                    value={`${formatNumber(layer.renderTime, 2)} ms`}
                    colorClass={
                      layer.renderTime < 10
                        ? 'text-green-400'
                        : layer.renderTime < 16
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    }
                  />
                  <MetricRow
                    label="Draw Calls"
                    value={`${layer.drawCalls}`}
                    colorClass={
                      layer.drawCalls === 0
                        ? 'text-muted-foreground'
                        : layer.drawCalls < 50
                          ? 'text-green-400'
                          : layer.drawCalls < 100
                            ? 'text-yellow-400'
                            : 'text-red-400'
                    }
                  />
                </div>
              ))}
            </div>
          </MetricCard>
        )}
      </div>
    </div>
  );
}
