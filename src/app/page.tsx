"use client";

import LayersConfigPanel from "@/components/editor/layers-config-panel";
import Renderer from "@/components/editor/renderer";
import EditorLayout, { EditorPanel } from "@/components/editor/editor-layout";
import EditorToolbar from "@/components/editor/editor-toolbar";

import Image from "next/image";
import AudioPanel from "@/components/audio/audio-panel";
import useBodyProps from "@/lib/stores/body-props-store";
import EditorHeader from "@/components/editor/editor-header";
import useEditorStore from "@/lib/stores/editor-store";
import { cn } from "@/lib/utils";
import AmbientBackground from "@/components/editor/ambient-background";

export default function Home() {
  const { props } = useBodyProps();
  const { ambientMode } = useEditorStore();

  return (
    <main
      // className="relative flex flex-col h-screen w-screen bg-zinc-900"
      className="relative flex flex-col h-screen w-screen"
      {...props}
    >
      <div className="absolute inset-0 bg-zinc-900">
        {ambientMode && <AmbientBackground />}
      </div>
      <div
        className={cn(
          "bg-zinc-800/70 z-10 mt-3 mx-3 -mb-1 border overflow-hidden border-gray-600/20 rounded-md",
          ambientMode && "backdrop-blur-sm"
        )}
      >
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
            <Renderer />
          </EditorPanel>
        }
        bottomRightChildren={
          <EditorPanel>
            <AudioPanel />
          </EditorPanel>
        }
      />
    </main>
  );
}
