import { z } from "zod";
import { createComponent } from "./comp-renderer";

const presets = [
  {
    name: "Default",
    values: {
      neki: "Boo",
      color: "#ffff00",
      opacity: 0.7,
    },
  },
  {
    name: "Red",
    values: {
      neki: "Neki",
      color: "#ff0000",
      opacity: 1,
    },
  },
];

const SpectrumComp = createComponent({
  name: "Spectrum",
  description: "Visualize the audio spectrum",
  presets: presets,
  config: z.object({
    neki: z.string().default("Neki"),
    color: z.string().min(1).describe("color"),
    opacity: z.number().min(0).max(10).step(0.1).default(1),
  }),
  draw: (ctx, analyzer, config) => {
    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    analyzer.getByteFrequencyData(dataArray);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    dataArray.forEach((value, index) => {
      const x = index * 4;
      const height = value;
      ctx.fillStyle = config.color;
      ctx.globalAlpha = config.opacity;
      ctx.fillRect(x, ctx.canvas.height - height, 3, height);
    });
  },
});

export default SpectrumComp;
