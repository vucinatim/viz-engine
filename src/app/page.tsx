'use client';

import EditorLayout, { EditorPanel } from '@/components/editor/editor-layout';
import LayersConfigPanel from '@/components/editor/layers-config-panel';

import AudioPanel from '@/components/audio/audio-panel';
import AmbientBackground from '@/components/editor/ambient-background';
import AnimationBuilder from '@/components/editor/animation-builder';
import EditorHeader from '@/components/editor/editor-header';
import ProjectDropzone from '@/components/editor/project-dropzone';
import RemotionPlayer from '@/components/editor/remotion-player';
import useBodyProps from '@/lib/stores/body-props-store';
import useEditorStore from '@/lib/stores/editor-store';

export default function Home() {
  const { props } = useBodyProps();
  const ambientMode = useEditorStore((s) => s.ambientMode);

  return (
    <main className="relative h-screen w-screen" {...props}>
      <ProjectDropzone className="flex flex-col">
        <div className="absolute inset-0 bg-zinc-900">
          {ambientMode && <AmbientBackground />}
        </div>
        <div className="z-10 mx-3 -mb-1 mt-3 overflow-hidden rounded-md border border-gray-600/20 bg-zinc-800/70">
          <EditorHeader />
        </div>
        <EditorLayout
          leftChildren={
            <EditorPanel>
              <LayersConfigPanel />
            </EditorPanel>
          }
          topRightChildren={
            <EditorPanel>
              <RemotionPlayer />
              <AnimationBuilder />
              {/* <Renderer /> */}
            </EditorPanel>
          }
          bottomRightChildren={
            <EditorPanel>
              <AudioPanel />
            </EditorPanel>
          }
        />
      </ProjectDropzone>
    </main>
  );
}
