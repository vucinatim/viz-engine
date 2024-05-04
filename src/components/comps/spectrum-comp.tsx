import { z } from "zod";
import { createComponent } from "../editor/layer-renderer";
import { InputType, meta } from "@/lib/types/field-metadata";

const presets = [
  {
    name: "Default",
    values: {
      color: "#fff",
      heightScale: 100,
      opacity: 1,
      group: {
        yuhuuu: "#000",
        somethingElse: 100,
        opacity2: 1,
      },
    },
  },
  {
    name: "Dark",
    values: {
      color: "#000",
      heightScale: 200,
      opacity: 0.5,
      group: {
        yuhuuu: "#fff",
        somethingElse: 50,
        opacity2: 0.5,
      },
    },
  },
];

const SpectrumComp = createComponent({
  name: "Spectrum",
  description: "Visualize the audio spectrum",
  presets: presets,
  config: z.object({
    color: z
      .string()
      .min(1)
      .describe(
        meta({
          label: "Color",
          description: "The color of the spectrum bars",
          inputType: InputType.Color,
        })
      ),
    heightScale: z
      .number()
      .int()
      .positive()
      .default(100)
      .describe(
        meta({
          label: "Height Scale",
          description: "The scale of the spectrum bars",
          inputType: InputType.Slider,
        })
      ),
    opacity: z
      .number()
      .min(0)
      .max(1)
      .step(0.01)
      .default(1)
      .describe(
        meta({
          label: "Opacity",
          description: "The opacity of the spectrum bars",
          inputType: InputType.Slider,
        })
      ),
    group: z
      .object({
        yuhuuu: z
          .string()
          .min(1)
          .describe(
            meta({
              label: "Yuhuuu",
              description: "The color of the spectrum bars",
              inputType: InputType.Color,
            })
          ),
        somethingElse: z
          .number()
          .int()
          .positive()
          .default(100)
          .describe(
            meta({
              label: "Something else",
              description: "The scale of the spectrum bars",
              inputType: InputType.Slider,
            })
          ),
        opacity2: z
          .number()
          .min(0)
          .max(1)
          .step(0.01)
          .default(1)
          .describe(
            meta({
              label: "Opacity2",
              description: "The opacity of the spectrum bars",
              inputType: InputType.Slider,
            })
          ),
      })
      .describe(
        meta({
          label: "Group",
          description: "Group configuration yyee",
        })
      ),
  }),
  draw: ({ canvasCtx: ctx, audioData: { dataArray }, config }) => {
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
