import useNodeNetworkStore from '@/components/node-network/node-network-store';
import useRecorderStore from '@/lib/stores/performance-recorder-store';
import useProfilerStore from '@/lib/stores/profiler-store';
import {
  Activity,
  ChevronDown,
  Circle,
  Cpu,
  Database,
  Download,
  HardDrive,
  Layers,
  Monitor,
  Pause,
  Play,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { PerformanceStatsDialog } from './performance-stats-dialog';

// Format number to fixed decimal places
const formatNumber = (num: number, decimals = 2) => num.toFixed(decimals);

// Format bytes to MB
const formatMB = (mb: number) => `${formatNumber(mb, 1)} MB`;

// Format duration in ms to readable string
const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Format timestamp to readable date
const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

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
  // Profiler store state
  const enabled = useProfilerStore((s) => s.enabled);
  const visible = useProfilerStore((s) => s.visible);
  const setVisible = useProfilerStore((s) => s.setVisible);
  const editorFPS = useProfilerStore((s) => s.editorFPS);
  const layerFPSMap = useProfilerStore((s) => s.layerFPSMap);
  const memory = useProfilerStore((s) => s.memory);
  const gpu = useProfilerStore((s) => s.gpu);
  const indexedDB = useProfilerStore((s) => s.indexedDB);
  const cpu = useProfilerStore((s) => s.cpu);
  const nodeNetworkMap = useProfilerStore((s) => s.nodeNetworkMap);

  // Recorder store state
  const isRecording = useRecorderStore((s) => s.isRecording);
  const isPaused = useRecorderStore((s) => s.isPaused);
  const currentSession = useRecorderStore((s) => s.currentSession);
  const sessions = useRecorderStore((s) => s.sessions);
  const isLoading = useRecorderStore((s) => s.isLoading);
  const sampleRate = useRecorderStore((s) => s.sampleRate);

  // Recorder store actions
  const startRecording = useRecorderStore((s) => s.startRecording);
  const stopRecording = useRecorderStore((s) => s.stopRecording);
  const pauseRecording = useRecorderStore((s) => s.pauseRecording);
  const resumeRecording = useRecorderStore((s) => s.resumeRecording);
  const cancelRecording = useRecorderStore((s) => s.cancelRecording);
  const loadSessions = useRecorderStore((s) => s.loadSessions);
  const deleteSession = useRecorderStore((s) => s.deleteSession);
  const exportSession = useRecorderStore((s) => s.exportSession);
  const setSampleRate = useRecorderStore((s) => s.setSampleRate);

  // Node network store actions
  const clearStaleNetworks = useNodeNetworkStore((s) => s.clearStaleNetworks);

  // Local state
  const [recordingName, setRecordingName] = useState('');
  const [recordingDescription, setRecordingDescription] = useState('');
  const [currentDuration, setCurrentDuration] = useState(0);
  const [isRecorderExpanded, setIsRecorderExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [autoDuration, setAutoDuration] = useState<number>(0); // 0 = manual stop
  const [showMethodology, setShowMethodology] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Update current duration while recording
  useEffect(() => {
    if (!isRecording || !currentSession) return;

    const interval = setInterval(() => {
      setCurrentDuration(Date.now() - currentSession.startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording, currentSession]);

  // Force re-render every 500ms when profiler is visible
  useEffect(() => {
    if (!visible || !enabled) return;

    const intervalId = setInterval(() => {
      // Force component to re-render by triggering a state read
      // Zustand will handle the re-render when store updates
    }, 500);

    return () => clearInterval(intervalId);
  }, [visible, enabled]);

  // Handler functions
  const handleStartRecording = () => {
    const name =
      recordingName.trim() || `Recording ${new Date().toLocaleString()}`;
    const description = recordingDescription.trim();

    startRecording(name, {
      description,
      duration: autoDuration > 0 ? autoDuration * 1000 : undefined,
    });
    setRecordingName('');
    setRecordingDescription('');
  };

  const handleExport = (sessionId: string, format: 'json' | 'csv') => {
    exportSession(sessionId, {
      format,
      includeMetadata: true,
      includeStatistics: true,
      prettyPrint: true,
    });
  };

  const handleShowStats = (sessionId: string) => {
    setSelectedSessionId(sessionId);
  };

  // Get selected session for stats dialog - memoized to prevent unnecessary dialog re-renders
  const selectedSession = useMemo(() => {
    if (!selectedSessionId) return null;
    return sessions.find((s) => s.id === selectedSessionId) || null;
  }, [selectedSessionId, sessions]);

  if (!visible || !enabled) return null;

  const layers = Array.from(layerFPSMap.values());
  const nodeNetworks = Array.from(nodeNetworkMap.values());

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-end p-[13px]">
      <div
        className="scrollbar-hide pointer-events-auto flex flex-col gap-1 overflow-hidden rounded-lg transition-all duration-300 ease-in-out"
        style={{
          maxHeight: '100%',
          width: isHovered ? '20rem' : '2.5rem',
          overflow: isHovered ? 'auto' : 'visible',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}>
        {/* Collapsed Icon or Full Header */}
        {!isHovered ? (
          <Button className="mt-[3px] h-[33px] w-9 border-white/10 bg-black/80 backdrop-blur-sm">
            <div className="flex items-center justify-center">
              <Activity className="h-5 w-5 text-green-400" />
            </div>
          </Button>
        ) : (
          <Card className="border-white/10 bg-black/80 p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-400" />
                <h2 className="text-lg font-bold text-white">Performance</h2>
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
        )}

        {/* Performance Recorder Section */}
        {isHovered && (
          <Card className="border-white/10 bg-black/60 p-3">
            <Collapsible
              open={isRecorderExpanded}
              onOpenChange={setIsRecorderExpanded}>
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between text-left transition-colors hover:text-white">
                  <div className="flex items-center gap-2">
                    <Circle
                      className={`h-4 w-4 ${isRecording ? 'animate-pulse fill-red-500 text-red-500' : 'fill-red-300 text-red-300'}`}
                    />
                    <h3 className="text-sm font-semibold text-white">
                      Performance Recorder
                    </h3>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isRecorderExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-3 space-y-3">
                {/* Recording Controls */}
                <div className="space-y-2">
                  <div>
                    <Label
                      htmlFor="recording-name"
                      className="text-xs text-white">
                      Name
                    </Label>
                    <Input
                      id="recording-name"
                      value={recordingName}
                      onChange={(e) => setRecordingName(e.target.value)}
                      placeholder="e.g., 5 Layer Test - Run 1"
                      disabled={isRecording}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="recording-description"
                      className="text-xs text-white">
                      Description (optional)
                    </Label>
                    <Input
                      id="recording-description"
                      value={recordingDescription}
                      onChange={(e) => setRecordingDescription(e.target.value)}
                      placeholder="e.g., Testing with complex shaders"
                      disabled={isRecording}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label
                        htmlFor="sample-rate"
                        className="text-xs text-white">
                        Sample Rate: {sampleRate}ms
                      </Label>
                      <input
                        id="sample-rate"
                        type="range"
                        min="100"
                        max="2000"
                        step="100"
                        value={sampleRate}
                        onChange={(e) => setSampleRate(Number(e.target.value))}
                        disabled={isRecording}
                        className="mt-1 w-full"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="auto-duration"
                        className="text-xs text-white">
                        Auto-stop:{' '}
                        {autoDuration > 0 ? `${autoDuration}s` : 'Manual'}
                      </Label>
                      <select
                        id="auto-duration"
                        value={autoDuration}
                        onChange={(e) =>
                          setAutoDuration(Number(e.target.value))
                        }
                        disabled={isRecording}
                        className="mt-1 h-8 w-full rounded border border-white/10 bg-black/50 px-2 text-xs text-white">
                        <option value={0}>Manual</option>
                        <option value={30}>30 seconds</option>
                        <option value={60}>60 seconds</option>
                        <option value={90}>90 seconds</option>
                        <option value={120}>2 minutes</option>
                        <option value={180}>3 minutes</option>
                      </select>
                    </div>
                  </div>

                  {/* Current recording info */}
                  {isRecording && currentSession && (
                    <div className="rounded border border-white/10 bg-white/5 p-2">
                      <div className="text-xs text-muted-foreground">
                        Recording:
                      </div>
                      <div className="font-semibold text-white">
                        {currentSession.name}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-mono text-white">
                          {formatDuration(currentDuration)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Snapshots:
                        </span>
                        <span className="font-mono text-white">
                          {currentSession.snapshots.length}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Control buttons */}
                  <div className="flex gap-2">
                    {!isRecording ? (
                      <Button
                        onClick={handleStartRecording}
                        className="flex-1 bg-red-500 hover:bg-red-600"
                        size="sm">
                        <Circle className="mr-2 h-3 w-3 fill-current" />
                        Start
                      </Button>
                    ) : (
                      <>
                        {!isPaused ? (
                          <Button
                            onClick={pauseRecording}
                            variant="outline"
                            size="sm"
                            className="flex-1">
                            <Pause className="mr-2 h-3 w-3" />
                            Pause
                          </Button>
                        ) : (
                          <Button
                            onClick={resumeRecording}
                            variant="outline"
                            size="sm"
                            className="flex-1">
                            <Play className="mr-2 h-3 w-3" />
                            Resume
                          </Button>
                        )}
                        <Button
                          onClick={stopRecording}
                          className="flex-1 bg-green-500 hover:bg-green-600"
                          size="sm">
                          <Square className="mr-2 h-3 w-3" />
                          Stop
                        </Button>
                        <Button
                          onClick={cancelRecording}
                          variant="destructive"
                          size="sm">
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Saved Sessions */}
                <div className="border-t border-white/10 pt-3">
                  <h4 className="mb-2 text-xs font-semibold text-white">
                    Saved Sessions ({sessions.length})
                  </h4>

                  {isLoading && (
                    <div className="text-center text-xs text-muted-foreground">
                      Loading sessions...
                    </div>
                  )}

                  {!isLoading && sessions.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground">
                      No recordings yet
                    </div>
                  )}

                  <div className="space-y-2">
                    {sessions.slice(0, 5).map((session) => (
                      <div
                        key={session.id}
                        className="rounded border border-white/10 bg-white/5 p-2">
                        <div className="mb-1 text-xs font-semibold text-white">
                          {session.name}
                        </div>
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          <div className="text-[10px]">
                            {formatDate(session.startTime)}
                          </div>
                          <div className="text-[10px]">
                            {formatDuration(session.duration)} •{' '}
                            {session.snapshots.length} samples
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="mt-2 flex gap-1">
                          <Button
                            onClick={() => handleShowStats(session.id)}
                            variant="outline"
                            size="sm"
                            className="h-6 flex-1 px-1 text-[10px]">
                            <Activity className="mr-1 h-2.5 w-2.5" />
                            Stats
                          </Button>
                          <Button
                            onClick={() => handleExport(session.id, 'json')}
                            variant="outline"
                            size="sm"
                            className="h-6 flex-1 px-1 text-[10px]">
                            <Download className="mr-1 h-2.5 w-2.5" />
                            JSON
                          </Button>
                          <Button
                            onClick={() => handleExport(session.id, 'csv')}
                            variant="outline"
                            size="sm"
                            className="h-6 flex-1 px-1 text-[10px]">
                            <Download className="mr-1 h-2.5 w-2.5" />
                            CSV
                          </Button>
                          <Button
                            onClick={() => deleteSession(session.id)}
                            variant="destructive"
                            size="sm"
                            className="h-6 px-2 text-[10px]">
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {sessions.length > 5 && (
                    <div className="mt-2 text-center text-xs text-muted-foreground">
                      + {sessions.length - 5} more sessions
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}

        {/* Editor FPS */}
        {isHovered && (
          <MetricCard title="Editor FPS" icon={<Monitor className="h-4 w-4" />}>
            <FPSMetricsDisplay fps={editorFPS} />
          </MetricCard>
        )}

        {/* Main Thread Metrics */}
        {isHovered && (
          <MetricCard title="Main Thread" icon={<Cpu className="h-4 w-4" />}>
            <MetricRow
              label="Frame Budget"
              value={`${formatNumber(cpu.usage, 1)}%`}
              colorClass={getPercentColor(cpu.usage)}
            />
            <MetricRow
              label="Max Frame Time"
              value={`${formatNumber(cpu.taskDuration, 2)} ms`}
            />
          </MetricCard>
        )}

        {/* Memory Metrics */}
        {isHovered && (
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
        )}

        {/* GPU Metrics */}
        {isHovered && (
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
        )}

        {/* IndexedDB Metrics */}
        {isHovered && (
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
        )}

        {/* Layer FPS Metrics */}
        {isHovered && layers.length > 0 && (
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

        {/* Node Network Metrics */}
        {isHovered && (
          <MetricCard
            title="Node Networks"
            icon={<Activity className="h-4 w-4" />}>
            {nodeNetworks.length > 0 ? (
              <div className="space-y-3">
                {nodeNetworks.map((network) => (
                  <div
                    key={network.parameterId}
                    className="border-t border-white/10 pt-2 first:border-t-0 first:pt-0">
                    <div className="mb-1 text-xs font-semibold text-white">
                      {network.parameterName}
                    </div>
                    <MetricRow
                      label="Compute Time"
                      value={`${formatNumber(network.computeTime, 3)} ms`}
                      colorClass={
                        network.computeTime < 1
                          ? 'text-green-400'
                          : network.computeTime < 5
                            ? 'text-yellow-400'
                            : 'text-red-400'
                      }
                    />
                    <MetricRow label="Nodes" value={`${network.nodeCount}`} />
                  </div>
                ))}
                <div className="border-t border-white/10 pt-2">
                  <Button
                    onClick={clearStaleNetworks}
                    variant="outline"
                    size="sm"
                    className="w-full text-xs">
                    <Trash2 className="mr-1 h-3 w-3" />
                    Clear Stale Networks
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-center text-xs text-muted-foreground">
                  No active networks
                </div>
                <Button
                  onClick={clearStaleNetworks}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs">
                  <Trash2 className="mr-1 h-3 w-3" />
                  Clear Stale Networks
                </Button>
              </div>
            )}
          </MetricCard>
        )}
      </div>

      {/* Stats Dialog */}
      <PerformanceStatsDialog
        session={selectedSession}
        open={selectedSessionId !== null}
        onOpenChange={(open: boolean) => !open && setSelectedSessionId(null)}
      />
    </div>
  );
}
