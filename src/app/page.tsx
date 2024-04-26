"use client";

import AudioFileLoader from "@/components/audio/audio-file-loader";
import AudioPlayer from "@/components/audio/audio-player";
import CompConfigurator from "@/components/comps/comp-configurator";
import CompRenderer from "@/components/comps/comp-renderer";
import SpectrumComp from "@/components/comps/spectrum-comp";
import EditorLayerSearch from "@/components/editor-layer-search";
import EditorLayout, { EditorPanel } from "@/components/editor-layout";
import useCompStore from "@/lib/stores/comps-store";
import { useEffect } from "react";

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
    <main className="relative flex h-screen w-screen bg-black">
      <EditorLayout
        leftChildren={
          <EditorPanel>
            <div className="absolute inset-0 flex flex-col items-stretch justify-start">
              <div className="border-b border-white/30 p-4 flex flex-col items-stretch gap-y-4">
                <p className="text-white font-bold">Layers</p>
                <EditorLayerSearch />
              </div>
              <div className="grow p-4 overflow-y-auto">
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
