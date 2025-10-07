import useEditorStore from '@/lib/stores/editor-store';
import { cn } from '@/lib/utils';
import { ReactNode, useEffect } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../ui/resizable';

interface EditorLayoutProps {
  leftChildren: ReactNode;
  topRightChildren: ReactNode;
  midRightChildren?: ReactNode;
  bottomRightChildren: ReactNode;
}

export function EditorLayout({
  leftChildren,
  topRightChildren,
  midRightChildren,
  bottomRightChildren,
}: EditorLayoutProps) {
  const setResolutionMultiplier = useEditorStore(
    (state) => state.setResolutionMultiplier,
  );

  // Set resolution multiplier to devicePixelRatio on mount and when DPR changes
  useEffect(() => {
    const update = () => {
      const dpr =
        typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      setResolutionMultiplier(dpr);
    };
    update();
    // Some browsers support 'change' event on matchMedia for DPR changes
    const mq =
      typeof window !== 'undefined'
        ? window.matchMedia(
            `(resolution: ${typeof window !== 'undefined' ? window.devicePixelRatio : 1}dppx)`,
          )
        : null;
    mq?.addEventListener?.('change', update);
    window.addEventListener('resize', update);
    return () => {
      mq?.removeEventListener?.('change', update);
      window.removeEventListener('resize', update);
    };
  }, [setResolutionMultiplier]);

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="flex h-full w-full items-stretch justify-stretch p-2">
      <ResizablePanel id="left-panel" order={0} minSize={20} defaultSize={30}>
        <div className="relative flex h-full w-full flex-col items-stretch justify-stretch">
          {leftChildren}
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel id="right-panel" order={1} defaultSize={70}>
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel id="top-right-panel" defaultSize={72} minSize={20}>
            <div className="relative flex h-full w-full flex-col items-stretch justify-stretch">
              {topRightChildren}
            </div>
          </ResizablePanel>
          {midRightChildren && (
            <>
              <ResizableHandle />
              <ResizablePanel id="mid-right-panel" defaultSize={50}>
                <div className="relative flex h-full w-full">
                  {midRightChildren}
                </div>
              </ResizablePanel>
            </>
          )}
          <ResizableHandle />
          <ResizablePanel id="bottom-right-panel" defaultSize={28} minSize={20}>
            <div className="relative flex h-full w-full flex-col items-stretch justify-stretch">
              {bottomRightChildren}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

interface EditorPanelProps {
  children: ReactNode;
}

export const EditorPanel = ({ children }: EditorPanelProps) => {
  const ambientMode = useEditorStore((s) => s.ambientMode);
  return (
    <div className="absolute inset-0">
      <div
        className={cn(
          'absolute inset-1 overflow-hidden rounded-md border border-gray-600/20 bg-zinc-800/70',
          ambientMode && 'backdrop-blur-sm',
        )}>
        {children}
      </div>
    </div>
  );
};

export default EditorLayout;
