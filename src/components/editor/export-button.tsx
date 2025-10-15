'use client';

import { Button } from '@/components/ui/button';
import useAudioStore from '@/lib/stores/audio-store';
import useExportStore from '@/lib/stores/export-store';
import { cancelExport, exportVideo } from '@/lib/utils/export-orchestrator';
import { Check, Download, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import ExportDialog from './export-dialog';

const ExportButton = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const audioUrl = useAudioStore((s) => s.currentTrackUrl);
  const isExporting = useExportStore((s) => s.isExporting);
  const progress = useExportStore((s) => s.progress);

  // We need a reference to the renderer container
  // We'll get this by finding the Remotion player's container
  const rendererContainerRef = useRef<HTMLElement | null>(null);

  // Determine button state
  const isComplete = progress.phase === 'complete';
  const isError = progress.phase === 'error';
  const showLoading = isExporting && !isComplete && !isError;

  const handleOpenDialog = () => {
    if (!audioUrl) {
      toast.error('Please load an audio file first');
      return;
    }

    // Find the renderer container (the Remotion player div)
    const remotionPlayer = document.querySelector('.remotion-player');
    if (remotionPlayer) {
      rendererContainerRef.current = remotionPlayer as HTMLElement;
      setDialogOpen(true);
    } else {
      toast.error('Could not find renderer container');
    }
  };

  const handleStartExport = async () => {
    console.log('[ExportButton] Starting export...');
    if (!rendererContainerRef.current) {
      toast.error('Renderer container not found');
      return;
    }

    console.log(
      '[ExportButton] Renderer container found, calling exportVideo...',
    );
    try {
      await exportVideo(rendererContainerRef.current);
      console.log('[ExportButton] Export completed successfully');
    } catch (error) {
      console.error('[ExportButton] Export error:', error);
      toast.error('Export failed. Check console for details.');
    }
  };

  const handleCancelExport = () => {
    cancelExport();
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
