import useEditorStore from '@/lib/stores/editor-store';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../ui/resizable';

interface EditorLayoutProps {
  leftChildren: ReactNode;
  topRightChildren: ReactNode;
  bottomRightChildren: ReactNode;
}

export function EditorLayout({
  leftChildren,
  topRightChildren,
  bottomRightChildren,
}: EditorLayoutProps) {
  // const { setDominantColor } = useEditorStore();
  // const {layers} = useLayerStore();

  // useEffect(() => {
  //   console.log("EditorLayout rerendering");
  //   const colors = [];
  //   for (const layer of layers) {
  //     const config = layer.valuesRef.current;
  //     Object.entries(config).forEach(([key, value]) => {
  //       if (key === "color") {
  //         colors.push(value);
  //       }
  //     });
  //   }

  // }, [layers]);

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="flex h-full w-full items-stretch justify-stretch p-2">
      <ResizablePanel minSize={20} defaultSize={30}>
        <div className="relative flex h-full w-full flex-col items-stretch justify-stretch">
          {leftChildren}
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={70}>
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={80} minSize={50}>
            <div className="relative flex h-full w-full flex-col items-stretch justify-stretch">
              {topRightChildren}
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel
            className="min-h-[227px]"
            defaultSize={20}
            minSize={20}>
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
  const { ambientMode } = useEditorStore();
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
