import { ReactNode } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./ui/resizable";

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
  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full w-full flex items-stretch p-2 justify-stretch"
    >
      <ResizablePanel minSize={20} defaultSize={30}>
        <div className="relative h-full w-full flex flex-col items-stretch justify-stretch">
          {leftChildren}
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={70}>
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={80} minSize={50}>
            <div className="relative h-full w-full flex flex-col items-stretch justify-stretch">
              {topRightChildren}
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={20} minSize={10}>
            <div className="relative h-full w-full flex flex-col items-stretch justify-stretch">
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
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-1 bg-zinc-800 border overflow-hidden border-gray-600/20 backdrop-blur-sm rounded-md">
        {children}
      </div>
    </div>
  );
};

export default EditorLayout;
