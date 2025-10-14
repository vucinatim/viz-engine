'use client';

import { Button } from '@/components/ui/button';
import useExportStore, { ExportLog } from '@/lib/stores/export-store';
import { Copy, Terminal } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const ExportConsole = () => {
  const logs = useExportStore((s) => s.logs);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    if (duration < 1000) {
      return `${duration.toFixed(0)}ms`;
    }
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const getLogColor = (type: ExportLog['type']) => {
    switch (type) {
      case 'info':
        return 'text-blue-400';
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      case 'perf':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  const getLogIcon = (type: ExportLog['type']) => {
    switch (type) {
      case 'info':
        return 'ℹ️';
      case 'success':
        return '✓';
      case 'warning':
        return '⚠️';
      case 'error':
        return '✗';
      case 'perf':
        return '⏱️';
      default:
        return '•';
    }
  };

  const copyLogsToClipboard = async () => {
    if (logs.length === 0) {
      toast.info('No logs to copy');
      return;
    }

    const logsText = logs
      .map((log) => {
        const timestamp = formatTimestamp(log.timestamp);
        const duration = log.duration
          ? ` (${formatDuration(log.duration)})`
          : '';
        const details = log.details ? `\n  ${log.details}` : '';
        return `[${timestamp}] ${getLogIcon(log.type)} ${log.message}${duration}${details}`;
      })
      .join('\n');

    try {
      await navigator.clipboard.writeText(logsText);
      toast.success('Logs copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy logs');
    }
  };

  return (
    <div className="rounded-lg border border-border bg-black/40 backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Terminal className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">
          Export Console
        </span>
        {logs.length > 0 && (
          <>
            <span className="ml-auto text-xs text-muted-foreground">
              {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyLogsToClipboard}
              className="h-6 gap-1 px-2 text-xs">
              <Copy className="h-3 w-3" />
              Copy
            </Button>
          </>
        )}
      </div>
      <div
        ref={scrollRef}
        className="max-h-48 overflow-y-auto font-mono text-xs"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgb(55 65 81) transparent',
        }}>
        {logs.length === 0 ? (
          <div className="px-3 py-4 text-center text-muted-foreground">
            No logs yet. Export will start soon...
          </div>
        ) : (
          <div className="space-y-0.5 p-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`flex items-start gap-2 py-1 ${getLogColor(log.type)}`}>
                <span className="select-none opacity-70">
                  {getLogIcon(log.type)}
                </span>
                <span className="min-w-[90px] select-none opacity-50">
                  [{formatTimestamp(log.timestamp)}]
                </span>
                <div className="flex-1">
                  <span>{log.message}</span>
                  {log.duration !== undefined && (
                    <span className="ml-2 text-purple-400">
                      ({formatDuration(log.duration)})
                    </span>
                  )}
                  {log.details && (
                    <div className="mt-0.5 pl-4 opacity-70">{log.details}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportConsole;
