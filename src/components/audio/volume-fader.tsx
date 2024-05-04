import useAudioStore from "@/lib/stores/audio-store";
import React, { useRef, useEffect } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

const VolumeFader = () => {
  const { gainNode, audioAnalyzer } = useAudioStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const MAX_VOLUME = 120; // Maximum expected volume for normalization

  useEffect(() => {
    if (!canvasRef.current || !audioAnalyzer || !gainNode) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const height = canvas.height;
    const width = canvas.width;

    const bufferLength = audioAnalyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!ctx) {
        requestAnimationFrame(draw);
        return;
      }

      audioAnalyzer.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i]; // Square the amplitudes to get power
      }

      const volume = Math.sqrt(sum / dataArray.length);
      // gainNode.gain.value is between -1 and 0
      // move it to between 0 and 1
      const gain = gainNode.gain.value + 1;
      const normalizedVolume = Math.min(volume / MAX_VOLUME, 1) * height * gain; // Normalize and scale the volume

      ctx.clearRect(0, 0, width, height); // Clear the canvas

      // Create a gradient from top (0) to the current volume level
      const gradient = ctx.createLinearGradient(
        0,
        height,
        0,
        height - normalizedVolume
      );
      gradient.addColorStop(0, "rgba(22, 44, 168, 0.75)");
      gradient.addColorStop(1, "rgba(242, 56, 180, 0.75)");

      ctx.fillStyle = gradient; // Apply the gradient as fill style
      ctx.fillRect(0, height - normalizedVolume, width, normalizedVolume); // Draw the volume level

      requestAnimationFrame(draw);
    };

    draw();
  }, [audioAnalyzer, gainNode]);

  useEffect(() => {
    if (!gainNode) return;
    gainNode.gain.value = 0; // Set the initial gain value
  }, [gainNode]);

  const handleVolumeChange = (value: number[]) => {
    if (!gainNode) return;
    gainNode.gain.value = value[0]; // Set gain based on slider input
  };

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        width={20}
        height={100}
        className="w-full h-full"
      />
      <SliderPrimitive.Root
        orientation="vertical"
        className="absolute inset-x-0 inset-y-4 cursor-pointer flex touch-none select-none justify-center items-center"
        defaultValue={[0]} // Default value as the middle of the slider
        onValueChange={handleVolumeChange}
        min={-1}
        max={0}
        step={0.01}
      >
        <SliderPrimitive.Track className="relative w-2 h-full overflow-hidden rounded-full">
          <div className="absolute inset-0 bg-zinc-700">
            <SliderPrimitive.Range className="absolute h-full bg-primary" />
          </div>
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-6 w-6 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
      </SliderPrimitive.Root>
    </div>
  );
};

export default VolumeFader;
