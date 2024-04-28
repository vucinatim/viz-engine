"use client";

import AudioFileLoader from "@/components/audio/audio-file-loader";
import AudioPlayer from "@/components/audio/audio-player";
import LayersConfigPanel from "@/components/editor/layers-config-panel";
import Renderer from "@/components/editor/renderer";
import EditorLayout, { EditorPanel } from "@/components/editor/editor-layout";
import EditorToolbar from "@/components/editor/editor-toolbar";

import Image from "next/image";

export default function Home() {
  return (
    <main className="relative flex flex-col h-screen w-screen bg-zinc-900">
      <div className="bg-zinc-800 mt-3 mx-3 flex items-center -mb-1 border overflow-hidden border-gray-600/20 backdrop-blur-sm rounded-md">
        <Image
          src="/logo.png"
          alt="VizEngineLogo"
          className="ml-4 mr-2"
          width={25}
          height={25}
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
            <div className="absolute inset-0 flex items-center justify-center">
              <AudioFileLoader />
              <AudioPlayer />
            </div>
          </EditorPanel>
        }
      />
    </main>
  );
}
