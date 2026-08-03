import editorControl from '@/lib/editor-control';
import useEditorStore from '@/lib/stores/editor-store';
import { cn } from '@/lib/utils';
import { Github } from 'lucide-react';
import { memo } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { NumberScrubInput } from '../ui/number-scrub-input';
import { Switch } from '../ui/switch';
import AgentActivityIndicator from './agent-activity-indicator';
import { DebugInfoDialog } from './debug-info-dialog';
import EditorToolbar from './editor-toolbar';
import ExportButton from './export-button';
import { HelpDialog } from './help-dialog';
import { InterfaceGuide } from './interface-guide';
import JobStatusButton from './job-status-button';

const EditorHeader = () => {
  const ambientMode = useEditorStore((s) => s.ambientMode);
  const resolutionMultiplier = useEditorStore((s) => s.resolutionMultiplier);
  const isRhythmLabOpen = useEditorStore((s) => s.isRhythmLabOpen);

  return (
    <div className="flex items-center px-4">
      <div className="relative mr-2">
        <img
          src="/logo.png"
          alt="VizEngineLogo"
          width={25}
          height={25}
          className="h-[25px] w-[25px] shrink-0 object-contain"
        />
        <div className="fixed top-1 left-[-10px] -rotate-[30deg] rounded-[2px] bg-gradient-to-t from-violet-300 to-purple-50 px-5 py-0.5 text-[6px] font-bold tracking-wide text-black uppercase shadow-md">
          Alpha
        </div>
      </div>
      <div className="grow">
        <EditorToolbar />
      </div>
      <div className="flex items-center gap-x-4">
        <Label
          htmlFor="airplane-mode"
          className={cn(
            'text-white/30 transition-colors',
            ambientMode && 'text-white',
          )}>
          Ambient Mode
        </Label>
        <Switch
          id="airplane-mode"
          className="border border-white/5"
          checked={ambientMode}
          onCheckedChange={editorControl.ui.setAmbientMode}
        />
        <div className="flex items-center gap-x-2">
          <Label
            htmlFor="resolution-multiplier"
            className="text-xs text-white/30">
            Quality
          </Label>
          <div className="flex items-center gap-x-2">
            <NumberScrubInput
              id="resolution-multiplier"
              inputClassName="focus-visible:ring-0 focus-visible:outline-none"
              min={0.5}
              max={3}
              step={0.1}
              value={resolutionMultiplier}
              onChange={editorControl.ui.setResolutionMultiplier}
            />
          </div>
          {/* <span className="w-8 text-xs text-white/30">
            {resolutionMultiplier.toFixed(1)}x
          </span> */}
        </div>

        <Button
          variant={isRhythmLabOpen ? 'default' : 'outline'}
          className="h-8"
          onClick={() => editorControl.ui.setRhythmLabOpen(!isRhythmLabOpen)}>
          Rhythm Lab
        </Button>
        <ExportButton />
        <AgentActivityIndicator />
        <JobStatusButton />
        <HelpDialog />
        <DebugInfoDialog />
        <InterfaceGuide />
        <a
          href="https://github.com/vucinatim/viz-engine"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 py-2 text-sm text-zinc-500 transition-colors hover:text-white"
          title="View on GitHub">
          <Github className="h-5 w-5" />
        </a>
      </div>
    </div>
  );
};

export default memo(EditorHeader);
