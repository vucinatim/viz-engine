'use client';

import React from 'react';
import useEditorStore from '@/lib/stores/editor-store';
import { RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NumberScrubInput } from '@/components/ui/number-scrub-input';
import { Switch } from '@/components/ui/switch';
import { useV2EditorActions, useV2EditorSnapshot } from './v2-editor-provider';

export const V2EditorHeader = () => {
  const snapshot = useV2EditorSnapshot();
  const actions = useV2EditorActions();
  const ambientMode = useEditorStore((state) => state.ambientMode);
  const setAmbientMode = useEditorStore((state) => state.setAmbientMode);
  const resolutionMultiplier = useEditorStore(
    (state) => state.resolutionMultiplier,
  );
  const setResolutionMultiplier = useEditorStore(
    (state) => state.setResolutionMultiplier,
  );

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-xs font-semibold uppercase tracking-[0.24em] text-black">
          V2
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {snapshot.snapshot.session.workingProject.name}
          </p>
          <p className="truncate text-xs text-white/45">
            {snapshot.snapshot.source.label}
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center gap-2">
        <Button
          variant="outline"
          className="border-white/10 bg-transparent text-white hover:bg-white/10"
          onClick={() => actions.openExampleProject()}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reload Example
        </Button>
        <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
          revision {snapshot.snapshot.session.revision}
        </div>
        <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
          {snapshot.snapshot.transport.currentFrame}/
          {snapshot.snapshot.transport.durationFrames - 1}
        </div>
        <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
          {snapshot.snapshot.audioDiagnostics.inputMode}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-white/45">Ambient</Label>
          <Switch
            checked={ambientMode}
            onCheckedChange={setAmbientMode}
            className="border border-white/10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-white/45">Quality</Label>
          <NumberScrubInput
            inputClassName="focus-visible:ring-0 focus-visible:outline-none"
            min={0.5}
            max={3}
            step={0.1}
            value={resolutionMultiplier}
            onChange={setResolutionMultiplier}
          />
        </div>
      </div>
    </div>
  );
};
