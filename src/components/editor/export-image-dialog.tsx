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
import { Slider } from '@/components/ui/slider';
import { useVizSessionSelector, vizControl } from '@/lib/viz-session';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ExportImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const resolutionPresets = [
  { label: '720p (1280×720)', width: 1280, height: 720 },
  { label: '1080p (1920×1080)', width: 1920, height: 1080 },
  { label: '1440p (2560×1440)', width: 2560, height: 1440 },
  { label: '4K (3840×2160)', width: 3840, height: 2160 },
];

type ImageFormat = 'jpeg' | 'png';

const ExportImageDialog = ({ open, onOpenChange }: ExportImageDialogProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [format, setFormat] = useState<ImageFormat>('jpeg');
  const [quality, setQuality] = useState(0.95);

  const currentFrame = useVizSessionSelector(
    (state) => state.preview.transport.currentFrame,
  );
  const captureCurrentFrame = async () => {
    setIsCapturing(true);
    try {
      const project = vizControl.getWorkingProject();
      const snapshot = vizControl.getSnapshot();
      const renderJobs = vizControl.getHost().getServices().renderJobs;
      if (!renderJobs) throw new Error('Image export service is unavailable.');
      const job = renderJobs.start(
        {
          schemaVersion: 1,
          kind: 'still',
          source: {
            projectId: project.projectId,
            expectedRevision: snapshot.session.revision,
          },
          intent: 'final',
          executorId: 'browser-webgl',
          outputLabel: `${project.name} frame ${currentFrame}`,
          viewport: {
            width,
            height,
            backgroundColor: format === 'png' ? 'transparent' : '#000000',
          },
          quality: 'high',
          imageQuality: quality,
          frame: currentFrame,
          format,
        },
        { kind: 'user', id: 'viz-studio' },
      );
      const completed = await renderJobs.wait(job.id);
      const output = completed.result?.outputs[0];
      if (completed.status !== 'succeeded' || !output) {
        throw new Error(completed.failure?.message ?? 'Image export failed.');
      }
      setImageUrl(output.uri);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to capture frame',
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;

    // Create a download link
    const link = document.createElement('a');
    link.href = imageUrl;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = format === 'png' ? 'png' : 'jpg';
    link.download = `viz-engine-${width}x${height}-${timestamp}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Image downloaded!');
  };

  const handleResolutionChange = (value: string) => {
    const preset = resolutionPresets.find((p) => p.label === value);
    if (preset) {
      setWidth(preset.width);
      setHeight(preset.height);
      setImageUrl(null);
    }
  };

  const selectedPreset = resolutionPresets.find(
    (p) => p.width === width && p.height === height,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Export Current Frame</DialogTitle>
          <DialogDescription>
            Capture and download the current frame as a high-quality image
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resolution and Format Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Resolution</Label>
              <Select
                value={selectedPreset?.label || 'Custom'}
                onValueChange={handleResolutionChange}
                disabled={isCapturing}>
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
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select
                value={format}
                onValueChange={(v) => {
                  setFormat(v as ImageFormat);
                  setImageUrl(null);
                }}
                disabled={isCapturing}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jpeg">JPEG</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Output</Label>
              <div className="flex h-8 items-center rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm">
                {width} × {height} • {format.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Quality Slider (JPEG only) */}
          {format === 'jpeg' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Quality</Label>
                <span className="text-xs text-muted-foreground">
                  {Math.round(quality * 100)}%
                </span>
              </div>
              <Slider
                value={quality}
                onChange={(value: number) => {
                  setQuality(value);
                  setImageUrl(null);
                }}
                min={0.5}
                max={1}
                step={0.05}
              />
            </div>
          )}

          {/* Preview */}
          <div className="flex flex-col items-center gap-4">
            {isCapturing ? (
              <div className="flex h-64 w-full items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Rendering frame...
                  </p>
                </div>
              </div>
            ) : imageUrl ? (
              <div className="relative w-full overflow-hidden rounded-lg border border-zinc-700 bg-black">
                {/* Show exactly what will be downloaded */}
                <img
                  src={imageUrl}
                  alt="Export preview"
                  className="w-full select-none"
                />
              </div>
            ) : (
              <div className="flex h-64 w-full items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900">
                <p className="text-sm text-muted-foreground">
                  Click &quot;Capture Frame&quot; to preview
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCapturing}>
            Cancel
          </Button>
          <Button
            onClick={captureCurrentFrame}
            disabled={isCapturing}
            variant="secondary">
            {isCapturing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Capturing...
              </>
            ) : imageUrl ? (
              'Recapture Frame'
            ) : (
              'Capture Frame'
            )}
          </Button>
          <Button onClick={handleDownload} disabled={!imageUrl || isCapturing}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportImageDialog;
