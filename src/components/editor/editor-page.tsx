import AudioPanel from '@/components/audio/audio-panel';
import AmbientBackground from '@/components/editor/ambient-background';
import EditorAudioSessionManager from '@/components/editor/editor-audio-session-manager';
import EditorCompRegistryManager from '@/components/editor/editor-comp-registry-manager';
import EditorHeader from '@/components/editor/editor-header';
import EditorLayout, { EditorPanel } from '@/components/editor/editor-layout';
import EditorProjectManager from '@/components/editor/editor-project-manager';
import LayersConfigPanel from '@/components/editor/layers-config-panel';
import ProjectDropzone from '@/components/editor/project-dropzone';
import RemotionPlayer from '@/components/editor/remotion-player';
import useNodeNetworkStore from '@/components/node-network/node-network-store';
import editorControl from '@/lib/editor-control';
import { useProfilerMonitors } from '@/lib/hooks/use-profiler-monitors';
import useBodyProps from '@/lib/stores/body-props-store';
import useEditorStore from '@/lib/stores/editor-store';
import { useNodeGraphClipboardStore } from '@/lib/stores/node-graph-clipboard-store';
import useProfilerStore from '@/lib/stores/profiler-store';
import { vizControl, vizSessionHost, vizSessionStore } from '@/lib/viz-session';
import { Suspense, lazy, useEffect } from 'react';

declare global {
  interface Window {
    __vizEditorDebug?: {
      editorControl: typeof editorControl;
      nodeGraphClipboardStore: typeof useNodeGraphClipboardStore;
      nodeNetworkStore: typeof useNodeNetworkStore;
      vizControl: typeof vizControl;
      vizSessionHost: typeof vizSessionHost;
      vizSessionStore: typeof vizSessionStore;
    };
  }
}

const AnimationBuilder = lazy(
  () => import('@/components/editor/animation-builder'),
);
const RhythmLabPanel = lazy(
  () => import('@/components/editor/rhythm-lab-panel'),
);
const ProfilerPanel = lazy(async () => {
  const module = await import('@/components/editor/profiler-panel');
  return { default: module.ProfilerPanel };
});

export default function EditorPage() {
  const { props } = useBodyProps();
  const ambientMode = useEditorStore((s) => s.ambientMode);
  const isRhythmLabOpen = useEditorStore((s) => s.isRhythmLabOpen);
  const openNetwork = useNodeNetworkStore((s) => s.openNetwork);
  const shouldForceShowOverlay = useNodeNetworkStore(
    (s) => s.shouldForceShowOverlay,
  );
  const isProfilerVisible = useProfilerStore((s) => s.visible);

  useProfilerMonitors();

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    window.__vizEditorDebug = {
      editorControl,
      nodeGraphClipboardStore: useNodeGraphClipboardStore,
      nodeNetworkStore: useNodeNetworkStore,
      vizControl,
      vizSessionHost,
      vizSessionStore,
    };

    return () => {
      delete window.__vizEditorDebug;
    };
  }, []);

  return (
    <main
      className="relative h-screen w-screen"
      data-testid="viz-editor"
      {...props}>
      <EditorCompRegistryManager />
      <EditorProjectManager />
      <EditorAudioSessionManager />
      {isProfilerVisible && (
        <Suspense fallback={null}>
          <ProfilerPanel />
        </Suspense>
      )}
      <ProjectDropzone className="flex flex-col">
        <div className="absolute inset-0 bg-zinc-900">
          {ambientMode && <AmbientBackground />}
        </div>
        <div className="z-10 mx-3 mt-3 -mb-1 overflow-hidden rounded-md border border-gray-600/20 bg-zinc-800/70">
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
              {isRhythmLabOpen ? (
                <Suspense fallback={null}>
                  <RhythmLabPanel />
                </Suspense>
              ) : (
                <>
                  <RemotionPlayer />
                  {(openNetwork || shouldForceShowOverlay) && (
                    <Suspense fallback={null}>
                      <AnimationBuilder />
                    </Suspense>
                  )}
                </>
              )}
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
