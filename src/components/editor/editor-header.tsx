import useEditorStore from '@/lib/stores/editor-store';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import EditorToolbar from './editor-toolbar';

const EditorHeader = () => {
  const {
    ambientMode,
    setAmbientMode,
    resolutionMultiplier,
    setResolutionMultiplier,
  } = useEditorStore();
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
            className="text-xs text-white/20">
            Quality
          </Label>
          <div className="w-40">
            <Slider
              min={0.5}
              max={3}
              step={0.1}
              value={resolutionMultiplier}
              onChange={setResolutionMultiplier}
            />
          </div>
          <span className="w-8 text-xs text-white/20">
            {resolutionMultiplier.toFixed(1)}x
          </span>
        </div>
        <Label
          htmlFor="airplane-mode"
          className={cn(
            'text-white/20 transition-colors',
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
      </div>
    </div>
  );
};

export default EditorHeader;
