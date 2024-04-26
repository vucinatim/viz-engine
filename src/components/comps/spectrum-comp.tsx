import { z } from "zod";
import { createComponent } from "./comp-renderer";

const SpectrumComp = createComponent({
  name: "Spectrum",
  description: "Visualize the audio spectrum",
  config: z.object({
    color: z.string().min(1).default("#2392f5"),
    opacity: z.number().min(0).max(1).default(1),
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
