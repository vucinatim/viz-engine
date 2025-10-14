import useEditorStore from '@/lib/stores/editor-store';
import { cn } from '@/lib/utils';
import { Github } from 'lucide-react';
import Image from 'next/image';
import { Label } from '../ui/label';
import { NumberScrubInput } from '../ui/number-scrub-input';
import { Switch } from '../ui/switch';
import EditorToolbar from './editor-toolbar';
import { InterfaceGuide } from './interface-guide';

const EditorHeader = () => {
  const ambientMode = useEditorStore((s) => s.ambientMode);
  const setAmbientMode = useEditorStore((s) => s.setAmbientMode);
  const resolutionMultiplier = useEditorStore((s) => s.resolutionMultiplier);
  const setResolutionMultiplier = useEditorStore(
    (s) => s.setResolutionMultiplier,
  );

  return (
    <div className="flex items-center px-4">
      <Image
        src="/logo.png"
        alt="VizEngineLogo"
        className="mr-2"
        priority
        width={25}
        height={25}
        style={{
          width: 'auto',
          height: 'auto',
        }}
      />
      <div className="grow">
        <EditorToolbar />
      </div>
      <div className="flex items-center gap-x-4">
        <div className="flex items-center gap-x-2">
          <Label
            htmlFor="resolution-multiplier"
            className="text-xs text-white/30">
            Quality
          </Label>
          <div className="flex items-center gap-x-2">
            <NumberScrubInput
              inputClassName="focus-visible:ring-0 focus-visible:outline-none"
              min={0.5}
              max={3}
              step={0.1}
              value={resolutionMultiplier}
              onChange={setResolutionMultiplier}
            />
          </div>
          <span className="w-8 text-xs text-white/30">
            {resolutionMultiplier.toFixed(1)}x
          </span>
        </div>
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
          onCheckedChange={setAmbientMode}
        />
        <InterfaceGuide />
        <a
          href="https://github.com/vucinatim/viz-engine"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 py-2 text-sm text-white/30 transition-colors hover:text-white"
          title="View on GitHub">
          <Github className="h-5 w-5" />
        </a>
      </div>
    </div>
  );
};

export default EditorHeader;
