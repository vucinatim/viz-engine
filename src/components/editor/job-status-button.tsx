import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { vizControl } from '@/lib/viz-session';
import type {
  VizControlJobRecord,
  VizControlJobSummary,
} from '@viz-engine/editor-control';
import {
  Activity,
  Ban,
  CheckCircle2,
  ExternalLink,
  Loader2,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const isActive = (job: VizControlJobSummary): boolean =>
  job.status === 'queued' ||
  job.status === 'validating' ||
  job.status === 'running';

const getOutputs = (job: VizControlJobRecord) => {
  if (job.result === undefined || !('outputs' in job.result)) {
    return [];
  }
  return job.result.outputs;
};

const JobStatusIcon = ({
  status,
}: {
  status: VizControlJobSummary['status'];
}) => {
  if (
    status === 'queued' ||
    status === 'validating' ||
    status === 'running'
  ) {
    return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
  }
  if (status === 'succeeded') {
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
  }
  if (status === 'cancelled') {
    return <Ban className="h-3.5 w-3.5 text-zinc-500" />;
  }
  return <XCircle className="h-3.5 w-3.5 text-red-400" />;
};

const JobStatusButton = () => {
  const [jobs, setJobs] = useState<VizControlJobSummary[]>(
    () => vizControl.listJobs(),
  );

  useEffect(
    () =>
      vizControl.subscribe((snapshot) => {
        setJobs(snapshot.jobSummaries);
      }),
    [],
  );

  const activeCount = jobs.filter(isActive).length;
  const recentJobs = [...jobs].reverse().slice(0, 8);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="relative h-8 gap-2"
          aria-label="Render and bake jobs">
          <Activity className="h-4 w-4" />
          Jobs
          {activeCount > 0 && (
            <Badge className="h-5 min-w-5 justify-center px-1.5">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="text-sm font-medium">Background jobs</div>
          <div className="mt-0.5 text-xs text-white/45">
            Agent, editor, and headless work share this lifecycle.
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {recentJobs.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-white/40">
              No bake or render jobs yet.
            </div>
          ) : (
            recentJobs.map((summary) => {
              const record = vizControl.inspectJob(summary.id);
              const outputs = record ? getOutputs(record) : [];
              const percentage = Math.round(
                (summary.progress?.progress ?? 0) * 100,
              );
              return (
                <div
                  key={summary.id}
                  className="border-b border-white/5 px-4 py-3 last:border-b-0">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <JobStatusIcon status={summary.status} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium">
                          {summary.kind}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide text-white/45">
                          {summary.status}
                        </span>
                      </div>
                      {summary.progress && (
                        <div className="mt-2">
                          <div className="h-1 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full bg-violet-400 transition-[width]"
                              style={{
                                width: `${Math.max(0, Math.min(100, percentage))}%`,
                              }}
                            />
                          </div>
                          <div className="mt-1 flex justify-between text-[10px] text-white/40">
                            <span>{summary.progress.stage}</span>
                            <span>{percentage}%</span>
                          </div>
                        </div>
                      )}
                      {summary.failure && (
                        <div className="mt-2 text-[11px] text-red-300">
                          {summary.failure.message}
                        </div>
                      )}
                      {outputs.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {outputs.map((output) => (
                            <a
                              key={output.id}
                              href={output.uri}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-[10px] text-white/70 hover:bg-white/5 hover:text-white">
                              {output.role}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    {isActive(summary) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        aria-label={`Cancel ${summary.kind}`}
                        onClick={() => vizControl.cancelJob(summary.id)}>
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default JobStatusButton;
