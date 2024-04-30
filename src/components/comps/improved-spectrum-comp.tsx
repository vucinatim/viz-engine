import { z } from "zod";
import { createComponent } from "../editor/layer-renderer";
import { InputType, meta } from "@/lib/types/field-metadata";

const presets = [
  {
    name: "Default",
    values: {
      display: {
        color: "#fff",
        heightScale: 100,
        barWidth: 2,
        barSpacing: 1,
      },
    },
  },
];

const ImprovedSpectrumComp = createComponent({
  name: "Professional Spectrum",
  description: "Advanced visualization of audio spectrum",
  presets,
  config: z.object({
    display: z.object({
      color: z
        .string()
        .min(1)
        .default("#7832ae")
        .describe(
          meta({
            label: "Bar Color",
            description: "Color of the spectrum bars",
            inputType: InputType.Color,
          })
        ),
      heightScale: z
        .number()
        .int()
        .positive()
        .min(0)
        .max(1)
        .default(0.5)
        .describe(
          meta({
            label: "Height Scale",
            description: "Scale factor for bar height",
            inputType: InputType.Slider,
          })
        ),
      barWidth: z
        .number()
        .int()
        .positive()
        .min(0)
        .max(1)
        .default(1)
        .describe(
          meta({
            label: "Bar Width",
            description: "Width of each spectrum bar",
            inputType: InputType.Slider,
          })
        ),
      barSpacing: z
        .number()
        .int()
        .min(0)
        .max(1)
        .default(0)
        .describe(
          meta({
            label: "Bar Spacing",
            description: "Spacing between spectrum bars",
            inputType: InputType.Slider,
          })
        ),
    }),
  }),
  draw: (ctx, dataArray, analyzer, config) => {
    const { display } = config;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const numBars = 300; // You can adjust this for more or fewer bars

    // Apply smoothing
    dataArray = smoothData(dataArray, 0.9);

    ctx.clearRect(0, 0, width, height);

    // We calculate the log of the min and max frequencies
    const minFreqLog = Math.log10(20); // Log of 20 Hz
    const maxFreqLog = Math.log10(22050); // Log of half the sample rate (Nyquist frequency)
    const logFreqRange = maxFreqLog - minFreqLog;

    // Define the bar width and the frequency step per bar
    const barWidth = width / numBars;

    for (let i = 0; i < numBars; i++) {
      // Calculate the logarithmic frequency index
      const logFreq = minFreqLog + (i / numBars) * logFreqRange;
      const freqIndex = Math.round(Math.pow(10, logFreq));

      // Map the logarithmic index back to the closest index in the dataArray
      const index = Math.floor(
        (freqIndex * 2 * dataArray.length) / analyzer.context.sampleRate
      );
      if (index < dataArray.length) {
        const value = dataArray[index];
        const barHeight = (value / 255) * height * display.heightScale;

        // Calculate the x position
        const x = barWidth * i;

        // Use gradient color based on amplitude
        ctx.fillStyle = getGradientColor(ctx, value, 255, barHeight);

        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      }
    }
  },
});

function smoothData(dataArray: Uint8Array, smoothingFactor: number) {
  const smoothedData = new Uint8Array(dataArray.length);
  smoothedData[0] = dataArray[0];
  for (let i = 1; i < dataArray.length; i++) {
    smoothedData[i] =
      dataArray[i] * smoothingFactor +
      smoothedData[i - 1] * (1 - smoothingFactor);
  }
  return smoothedData;
}

function getGradientColor(
  ctx: CanvasRenderingContext2D,
  value: number,
  max: number,
  height: number
) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, `rgba(255, 255, 255, ${value / max})`); // White at the top
  gradient.addColorStop(0.75, `rgba(0, 255, 0, ${value / max})`); // Green in the middle
  gradient.addColorStop(1, `rgba(255, 0, 0, ${value / max})`); // Red at the bottom
  return gradient;
}

function frequencyToXAxis(frequency: number, width: number) {
  const minF = Math.log10(20); // Log10 of minimum frequency
  const maxF = Math.log10(20000); // Log10 of maximum frequency

  let range = maxF - minF;
  let xAxis = ((Math.log10(frequency) - minF) / range) * width;
  return xAxis;
}

export default ImprovedSpectrumComp;
