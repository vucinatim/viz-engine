"use client";

import LayersConfigPanel from "@/components/editor/layers-config-panel";
import Renderer from "@/components/editor/renderer";
import EditorLayout, { EditorPanel } from "@/components/editor/editor-layout";
import EditorToolbar from "@/components/editor/editor-toolbar";

import Image from "next/image";
import AudioPanel from "@/components/audio/audio-panel";
import useBodyProps from "@/lib/stores/body-props-store";

export default function Home() {
  const { props } = useBodyProps();

  return (
    <main
      className="relative flex flex-col h-screen w-screen bg-zinc-900"
      {...props}
    >
      <div className="bg-zinc-800 mt-3 mx-3 flex items-center -mb-1 border overflow-hidden border-gray-600/20 backdrop-blur-sm rounded-md">
        <Image
          src="/logo.png"
          alt="VizEngineLogo"
          className="ml-4 mr-2"
          priority
          width={25}
          height={25}
          style={{
            width: "auto",
            height: "auto",
          }}
        />
        <EditorToolbar />
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
