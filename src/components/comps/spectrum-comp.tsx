import { z } from "zod";
import { createComponent } from "../editor/layer-renderer";

const presets = [
  {
    name: "Default",
    values: {
      color: "#fff",
      heightScale: 100,
      opacity: 1,
    },
  },
];

const SpectrumComp = createComponent({
  name: "Spectrum",
  description: "Visualize the audio spectrum",
  presets: presets,
  config: z.object({
    color: z.string().min(1).describe("color"),
    heightScale: z.number().int().positive().default(100),
    opacity: z.number().min(0).max(1).step(0.01).default(1),
  }),
  draw: (ctx, analyzer, config) => {
    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    analyzer.getByteFrequencyData(dataArray);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    dataArray.forEach((value, index) => {
      const x = index * 4;
      const height = value * config.heightScale;
      ctx.fillStyle = config.color;
      ctx.globalAlpha = config.opacity;
      ctx.fillRect(x, ctx.canvas.height - height, 3, height);
    });
  },
});

export default SpectrumComp;
