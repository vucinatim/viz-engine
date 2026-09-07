import { Button } from '@/components/ui/button';
import useExportStore from '@/lib/stores/export-store';
import { useVizSessionSelector, vizControl } from '@/lib/viz-session';
import type { VizRenderJobRecord } from '@viz-engine/contracts';
import { Check, Download, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import ExportDialog from './export-dialog';

const mapJobPhase = (
  job: VizRenderJobRecord,
): ReturnType<typeof useExportStore.getState>['progress']['phase'] => {
  if (job.status === 'succeeded') return 'complete';
  if (job.status === 'failed' || job.status === 'cancelled') return 'error';
  if (job.progress?.stage === 'encoding') return 'encoding';
  if (job.status === 'running') return 'rendering';
  return 'preparing';
};

const downloadRenderOutput = (job: VizRenderJobRecord): void => {
  const output = job.result?.outputs[0];
  if (!output) return;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const link = document.createElement('a');
  link.href = output.uri;
  link.download = `viz-engine-export-${timestamp}.${output.format}`;
  link.click();
};

const ExportButton = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const audioUrl = useVizSessionSelector(
    (state) => state.audio.currentTrackUrl,
  );
  const isExporting = useExportStore((s) => s.isExporting);
  const progress = useExportStore((s) => s.progress);
  const activeJobId = useRef<string | null>(null);

  // Determine button state
  const isComplete = progress.phase === 'complete';
  const isError = progress.phase === 'error';
  const showLoading = isExporting && !isComplete && !isError;

  const handleOpenDialog = () => {
    if (!audioUrl) {
      toast.error('Please load an audio file first');
      return;
    }

    if (document.querySelector('[data-renderer-container]')) {
      setDialogOpen(true);
    } else {
      toast.error('Could not find renderer container');
    }
  };

  const handleStartExport = async () => {
    const renderJobs = vizControl.getHost().getServices().renderJobs;
    if (!renderJobs) {
      toast.error('Video export service is unavailable');
      return;
    }

    const exportStore = useExportStore.getState();
    const project = vizControl.getWorkingProject();
    const snapshot = vizControl.getSnapshot();
    const settings = exportStore.settings;
    const totalFrames = Math.ceil(settings.duration * settings.fps);
    const startedAt = Date.now();
    let wakeLock: WakeLockSentinel | null = null;
    let elapsedTimer: ReturnType<typeof setInterval> | undefined;
    let unsubscribe = () => {};
    let lastProgressSignature = '';

    exportStore.setIsExporting(true);
    exportStore.setError(null);
    exportStore.clearLogs();
    exportStore.setProgress({
      phase: 'preparing',
      message: 'Preparing export...',
      currentFrame: 0,
      totalFrames,
      percentage: 0,
      elapsedTime: 0,
    });
    exportStore.addLog({
      type: 'info',
      message: 'Starting canonical video render job',
      details: `${settings.width}×${settings.height} @ ${settings.fps} FPS, ${settings.quality} quality, ${settings.format}`,
    });

    try {
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
          exportStore.addLog({
            type: 'success',
            message: 'Wake lock acquired',
          });
        } catch (error) {
          exportStore.addLog({
            type: 'warning',
            message: 'Could not acquire wake lock',
            details: String(error),
          });
        }
      }
      elapsedTimer = setInterval(() => {
        useExportStore.getState().setProgress({
          elapsedTime: Math.floor((Date.now() - startedAt) / 1000),
        });
      }, 1000);

      const job = renderJobs.start(
        {
          schemaVersion: 1,
          kind: 'video',
          source: {
            projectId: project.projectId,
            expectedRevision: snapshot.session.revision,
          },
          intent: 'final',
          executorId: 'browser-webgl',
          outputLabel: `${project.name} video`,
          viewport: {
            width: settings.width,
            height: settings.height,
            backgroundColor: '#000000',
          },
          quality:
            settings.quality === 'high'
              ? 'high'
              : settings.quality === 'medium'
                ? 'standard'
                : 'draft',
          startFrame: Math.round(settings.startTime * project.timeline.fps),
          frameCount: totalFrames,
          fps: settings.fps,
          format: settings.format,
          includeAudio: true,
        },
        { kind: 'user', id: 'viz-studio' },
      );
      activeJobId.current = job.id;
      const projectJob = (record: VizRenderJobRecord) => {
        const phase = mapJobPhase(record);
        const stageProgress = record.progress?.progress ?? 0;
        const percentage =
          record.status === 'succeeded'
            ? 100
            : phase === 'preparing'
              ? stageProgress * 5
              : phase === 'rendering'
                ? 5 + stageProgress * 80
                : phase === 'encoding'
                  ? 85 + stageProgress * 15
                  : useExportStore.getState().progress.percentage;
        const message =
          record.status === 'cancelled'
            ? 'Export cancelled by user'
            : (record.failure?.message ??
              record.progress?.message ??
              (record.status === 'succeeded'
                ? 'Export complete!'
                : `Export ${record.progress?.stage ?? record.status}...`));
        const signature = `${record.status}:${record.progress?.stage}:${Math.floor(stageProgress * 10)}`;
        useExportStore.getState().setProgress({
          phase,
          message,
          currentFrame:
            record.status === 'succeeded'
              ? totalFrames
              : (record.progress?.completed ?? 0),
          totalFrames,
          percentage,
        });
        if (signature !== lastProgressSignature) {
          lastProgressSignature = signature;
          useExportStore.getState().addLog({
            type:
              record.status === 'failed'
                ? 'error'
                : record.status === 'cancelled'
                  ? 'warning'
                  : record.status === 'succeeded'
                    ? 'success'
                    : 'info',
            message,
          });
        }
      };
      projectJob(job);
      unsubscribe = renderJobs.subscribe(({ job: nextJob }) => {
        if (nextJob.id === job.id) projectJob(nextJob);
      });

      const completed = await renderJobs.wait(job.id);
      projectJob(completed);
      if (completed.status === 'succeeded') {
        const { performance, mediaProbe, diagnostics } = completed.result!;
        exportStore.addLog({
          type: 'perf',
          message: 'Render performance',
          details: `${performance.averageRenderMilliseconds.toFixed(1)} ms/frame average, ${performance.p95RenderMilliseconds.toFixed(1)} ms p95`,
          duration: performance.totalRenderMilliseconds,
        });
        if (mediaProbe) {
          exportStore.addLog({
            type: 'success',
            message: 'Encoded media validated',
            details: `${mediaProbe.container}, ${(mediaProbe.byteLength / 1024 / 1024).toFixed(2)} MB`,
          });
        }
        diagnostics.forEach((diagnostic) =>
          exportStore.addLog({
            type:
              diagnostic.severity === 'error'
                ? 'error'
                : diagnostic.severity === 'warning'
                  ? 'warning'
                  : 'info',
            message: diagnostic.message,
            details: diagnostic.code,
          }),
        );
        downloadRenderOutput(completed);
      } else if (completed.status === 'failed') {
        exportStore.setError(
          completed.failure?.message ?? 'Video export failed.',
        );
        toast.error('Export failed. Check the export console for details.');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Video export failed.';
      exportStore.setError(message);
      exportStore.setProgress({
        phase: 'error',
        message: 'Export failed',
      });
      exportStore.addLog({ type: 'error', message });
      toast.error('Export failed. Check the export console for details.');
    } finally {
      unsubscribe();
      if (elapsedTimer) clearInterval(elapsedTimer);
      if (wakeLock) await wakeLock.release();
    }
  };

  const handleCancelExport = () => {
    const jobId = activeJobId.current;
    if (jobId) vizControl.cancelJob(jobId);
    toast.info('Export cancelled');
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenDialog}
        className="gap-2 border-white/10 hover:bg-white/5">
        {showLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Exporting...
          </>
        ) : isComplete ? (
          <>
            <Check className="h-4 w-4" />
            Export Done!
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Export
          </>
        )}
      </Button>

      <ExportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onStartExport={handleStartExport}
        onCancelExport={handleCancelExport}
      />
    </>
  );
};

export default ExportButton;
