import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useVizSessionSelector } from '@/lib/viz-session';
import { Bot, CheckCircle2 } from 'lucide-react';

const AgentActivityIndicator = () => {
  const activity = useVizSessionSelector(
    (state) => state.history.recentAgentActivity,
  );

  if (!activity) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="relative h-8 gap-2"
          aria-label="Agent activity">
          <Bot className="h-4 w-4" />
          Agent
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-zinc-800" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Agent change applied
          </div>
          <div className="mt-1 text-xs text-white/45">
            Applied through the same canonical session and history as editor
            changes.
          </div>
        </div>
        <div className="space-y-3 px-4 py-3 text-xs">
          <div>
            <div className="text-[10px] tracking-wide text-white/40 uppercase">
              Actor
            </div>
            <div className="mt-0.5 text-white/80">
              {activity.actorId ?? 'agent'}
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-wide text-white/40 uppercase">
              Transaction
            </div>
            <div className="mt-0.5 truncate font-mono text-[11px] text-white/70">
              {activity.transactionId}
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-wide text-white/40 uppercase">
              Actions
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {activity.actionTypes.map((actionType) => (
                <span
                  key={actionType}
                  className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/65">
                  {actionType}
                </span>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AgentActivityIndicator;
