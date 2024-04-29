"use client";

import useAudioStore from "@/lib/stores/audio-store";
import { Toggle } from "../ui/toggle";
import AudioFileLoader from "./audio-file-loader";
import { Pause, Play } from "lucide-react";
import VolumeFader from "./volume-fader";
import useWavesurferSetup from "@/lib/hooks/use-wavesurfer-setup";
import useKeypress from "@/lib/hooks/use-keypress";

const AudioPanel = () => {
  const { wavesurfer } = useAudioStore();
  const { waveformDisplayRef, audioElementRef, isPlaying, currentTime } =
    useWavesurferSetup();
  useKeypress("Space", () => wavesurfer?.playPause());

  return (
    <div className="absolute inset-0 flex items-stretch justify-stretch">
      <div className="w-20 border-r border-white/20">
        <VolumeFader />
      </div>
      <div className="grow flex flex-col items-stretch">
        <div className="grid grid-cols-3 content-center p-2 h-14">
          <AudioFileLoader />
          <div className="place-self-center">
            <Toggle
              aria-label="Toggle visibility"
              onClick={() => wavesurfer?.playPause()}
            >
              {isPlaying ? <Pause /> : <Play />}
            </Toggle>
          </div>
          <div className="flex items-center justify-end">
            <p className="text-white text-xs font-mono">
              {
                // Format the currentTime in float seconds to a human readable format
                Math.floor(currentTime / 60)
                  .toString()
                  .padStart(2, "0") +
                  ":" +
                  Math.floor(currentTime % 60)
                    .toString()
                    .padStart(2, "0") +
                  "." +
                  // Only show two numbers for milliseconds
                  Math.floor((currentTime % 1) * 1000)
                    .toString()
                    .slice(0, 2)
                    .padStart(2, "0")
              }
            </p>
          </div>
        </div>
        <div className="grow relative">
          <div className="absolute inset-0">
            <audio ref={audioElementRef} />
            <div ref={waveformDisplayRef} className="w-full my-auto" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPanel;
