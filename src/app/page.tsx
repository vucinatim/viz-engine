"use client";

import AudioFileLoader from "@/components/audio/audio-file-loader";
import AudioPlayer from "@/components/audio/audio-player";
import CompConfigurator from "@/components/comps/comp-configurator";
import CompRenderer from "@/components/comps/comp-renderer";
import SpectrumComp from "@/components/comps/spectrum-comp";
import EditorLayerSearch from "@/components/editor-layer-search";
import EditorLayout, { EditorPanel } from "@/components/editor-layout";
import EditorToolbar from "@/components/editor-toolbar";
import { Slider } from "@/components/ui/slider";
import useCompStore from "@/lib/stores/comps-store";
import { useEffect } from "react";
import { z } from "zod";
import Image from "next/image";

export default function Home() {
  const { comps } = useCompStore();
  // Initialize the SpectrumComp in the CompStore
  useEffect(() => {
    useCompStore.getState().addComp(SpectrumComp);

    return () => {
      useCompStore.getState().removeComp(SpectrumComp.name);
    };
  }, []);

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
            <div className="absolute inset-0 flex flex-col items-stretch justify-start">
              <div className="border-b border-white/30 px-2 py-4 flex flex-col items-stretch gap-y-4">
                <EditorLayerSearch />
              </div>
              <div className="grow px-2 py-4 overflow-y-auto">
                {comps.map((compData) => (
                  <CompConfigurator key={compData.id} comp={compData.comp} />
                ))}
              </div>
            </div>
          </EditorPanel>
        }
        topRightChildren={
          <EditorPanel>
            <div className="absolute inset-0 flex items-center justify-center">
              {comps.map((compData) => (
                <CompRenderer key={compData.id} comp={compData.comp} />
              ))}
            </div>
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
