'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import useAudioStore from '@/lib/stores/audio-store';
import useExportStore from '@/lib/stores/export-store';
import { estimateVideoSize } from '@/lib/utils/video-encoder';
import { AlertCircle, ArrowLeft, Download, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ExportConsole from './export-console';
import { VideoTimeline } from './video-timeline';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartExport: () => void;
  onCancelExport: () => void;
}

const ExportDialog = ({
  open,
  onOpenChange,
  onStartExport,
  onCancelExport,
}: ExportDialogProps) => {
  const settings = useExportStore((s) => s.settings);
  const setSettings = useExportStore((s) => s.setSettings);
  const isExporting = useExportStore((s) => s.isExporting);
  const progress = useExportStore((s) => s.progress);
  const error = useExportStore((s) => s.error);
  const resetExport = useExportStore((s) => s.resetExport);
  const audioElementRef = useAudioStore((s) => s.audioElementRef);

  const [customStartTime, setCustomStartTime] = useState(settings.startTime);
  const [customEndTime, setCustomEndTime] = useState(
    settings.startTime + settings.duration,
  );
  const [currentTime, setCurrentTime] = useState(settings.startTime);

  // Get audio duration
  const audioDuration = useMemo(() => {
    const duration = audioElementRef.current?.duration;
    return duration && Number.isFinite(duration) ? duration : 0;
  }, [audioElementRef]);

  // Update custom end time when audio loads
  useEffect(() => {
    if (audioDuration > 0 && settings.duration === 30) {
      // Default was used, update to audio duration
      setCustomEndTime(audioDuration);
      setSettings({ duration: audioDuration });
    }
  }, [audioDuration, settings.duration, setSettings]);

  // Calculate duration from range
  const duration = customEndTime - customStartTime;

  // Estimated file size
  const estimatedSize = useMemo(() => {
    const totalFrames = Math.ceil(duration * settings.fps);
    return estimateVideoSize(
      totalFrames,
      settings.width,
      settings.height,
      settings.quality,
    );
  }, [
    duration,
    settings.fps,
    settings.width,
    settings.height,
    settings.quality,
  ]);

  const resolutionPresets = [
    { label: '720p (1280×720)', width: 1280, height: 720 },
    { label: '1080p (1920×1080)', width: 1920, height: 1080 },
    { label: '1440p (2560×1440)', width: 2560, height: 1440 },
    { label: '4K (3840×2160)', width: 3840, height: 2160 },
  ];

  const currentResolution = `${settings.width}×${settings.height}`;
  const selectedPreset = resolutionPresets.find(
    (p) => p.width === settings.width && p.height === settings.height,
  );

  const handleResolutionChange = (value: string) => {
    const preset = resolutionPresets.find((p) => p.label === value);
    if (preset) {
      setSettings({ width: preset.width, height: preset.height });
    }
  };

  const handleTimelineChange = (start: number, end: number) => {
    setCustomStartTime(start);
    setCustomEndTime(end);
    setSettings({
      startTime: start,
      duration: end - start,
    });
  };

  const handleTimeChange = (time: number) => {
    setCurrentTime(time);
  };

  const handleStartExport = () => {
    onStartExport();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Export Video</DialogTitle>
          <DialogDescription>
            Configure your video export settings
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-500/10 p-3 text-red-500">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {progress.phase === 'error' &&
          progress.message === 'Export cancelled by user' && (
            <div className="flex items-center gap-2 rounded-md bg-yellow-500/10 p-3 text-yellow-500">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Export was cancelled</span>
            </div>
          )}

        {isExporting ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {progress.message}
                </span>
                <span className="font-medium">
                  {Math.round(progress.percentage)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <div>Phase: {progress.phase}</div>
              <div>
                Frame: {progress.currentFrame} / {progress.totalFrames}
              </div>
              <div>
                Time elapsed: {Math.floor(progress.elapsedTime / 60)}m{' '}
                {progress.elapsedTime % 60}s
              </div>
              {(progress.phase === 'rendering' ||
                progress.phase === 'encoding') && (
                <div className="pt-2 text-blue-400">
                  {progress.message.includes('Tab hidden') ? (
                    <span className="text-yellow-400">
                      ⚠️ Please return to this tab to continue
                    </span>
                  ) : (
                    "⚡ Keep this tab active - system won't sleep"
                  )}
                </div>
              )}
            </div>

            {/* Export Console - shows detailed logs */}
            <ExportConsole />

            {progress.phase === 'complete' && (
              <div className="flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-green-500">
                <Download className="h-4 w-4" />
                <span className="text-sm">Video exported successfully!</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Export Settings */}
            <div className="grid grid-cols-2 gap-4">
              {/* Resolution */}
              <div className="space-y-2">
                <Label>Resolution</Label>
                <Select
                  value={selectedPreset?.label}
                  onValueChange={handleResolutionChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    {resolutionPresets.map((preset) => (
                      <SelectItem key={preset.label} value={preset.label}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {currentResolution}
                </p>
              </div>

              {/* FPS */}
              <div className="space-y-2">
                <Label>Frame Rate</Label>
                <Select
                  value={String(settings.fps)}
                  onValueChange={(v) => setSettings({ fps: Number(v) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 FPS</SelectItem>
                    <SelectItem value="60">60 FPS</SelectItem>
                    <SelectItem value="120">120 FPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quality */}
              <div className="space-y-2">
                <Label>Quality</Label>
                <Select
                  value={settings.quality}
                  onValueChange={(v) => setSettings({ quality: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High (Best quality)</SelectItem>
                    <SelectItem value="medium">Medium (Balanced)</SelectItem>
                    <SelectItem value="low">Low (Smaller file)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Format */}
              <div className="space-y-2">
                <Label>Format</Label>
                <Select
                  value={settings.format}
                  onValueChange={(v) => setSettings({ format: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mp4">MP4 (H.264)</SelectItem>
                    <SelectItem value="webm">WebM (VP9)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Estimated size */}
            <div className="rounded-lg border border-border bg-muted p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Estimated file size:
                </span>
                <span className="font-semibold">{estimatedSize} MB</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {Math.ceil(duration * settings.fps)} frames @ {settings.fps} FPS
              </p>
            </div>

            {/* Timeline Range */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Timeline Range</h3>
              <VideoTimeline
                startTime={customStartTime}
                endTime={customEndTime}
                duration={audioDuration > 0 ? audioDuration : 300}
                fps={settings.fps}
                currentTime={currentTime}
                onChange={handleTimelineChange}
                onTimeChange={handleTimeChange}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {isExporting ? (
            <>
              {progress.phase !== 'complete' && progress.phase !== 'error' && (
                <Button
                  variant="destructive"
                  onClick={onCancelExport}
                  className="gap-2">
                  <X className="h-4 w-4" />
                  Cancel Export
                </Button>
              )}
              {(progress.phase === 'complete' ||
                progress.phase === 'error') && (
                <Button onClick={resetExport} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Settings
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleStartExport}>
                <Download className="mr-2 h-4 w-4" />
                Start Export
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
