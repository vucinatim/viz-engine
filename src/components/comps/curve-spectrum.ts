import { z } from "zod";
import { createComponent } from "../editor/layer-renderer";
import { InputType, meta } from "@/lib/types/field-metadata";

const CurveSpectrum = createComponent({
  name: "Curve Spectrum",
  description: "Curve visualization of audio spectrum",
  presets: [],
  config: z.object({
    color: z
      .string()
      .min(1)
      .default("#7832ae")
      .describe(
        meta({
          label: "Curve Color",
          description: "Color of the spectrum curve",
          inputType: InputType.Color,
        })
      ),
    scaleY: z
      .number()
      .min(0)
      .max(1)
      .default(0.5)
      .describe(
        meta({
          label: "Y Scale",
          description: "Scale factor for amplitude visualization",
          inputType: InputType.Slider,
        })
      ),
    pointSettings: z
      .object({
        pointColor: z
          .string()
          .min(1)
          .default("white")
          .describe(
            meta({
              label: "Point Color",
              description: "Color of the points",
              inputType: InputType.Color,
            })
          ),
        pointSize: z
          .number()
          .int()
          .positive()
          .min(0)
          .max(10)
          .default(3)
          .describe(
            meta({
              label: "Point Size",
              description: "Size of the points",
              inputType: InputType.Slider,
            })
          ),
      })
      .describe(
        meta({
          label: "Point Settings",
          description: "Settings for the points on the curve",
        })
      ),
  }),
  draw: ({
    canvasCtx: ctx,
    audioData: { dataArray, analyzer },
    config: { color, scaleY, pointSettings },
  }) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    ctx.clearRect(0, 0, width, height); // Clear the canvas
    ctx.beginPath();
    ctx.moveTo(0, height); // Start from the bottom left

    const minFreq = 20; // Minimum frequency (Hz)
    const maxFreq = analyzer.context.sampleRate / 2; // Maximum frequency (Hz), Nyquist frequency
    const indexScale = dataArray.length / maxFreq;

    const points = [];

    let lastY = height;
    for (let i = 0; i < width; i++) {
      const freq = minFreq * Math.pow(maxFreq / minFreq, i / width);
      const index = Math.floor(freq * indexScale);
      const value = dataArray[Math.min(index, dataArray.length - 1)];
      const normalized = (value / 255) * height * scaleY; // Normalize and scale the value

      const y = height - normalized;
      if (lastY !== y) {
        points.push({ x: i, y });
      }
      lastY = y;
    }

    // Draw the curve
    if (points[0]) {
      ctx.moveTo(points[0].x, points[0].y);

      for (var i = 1; i < points.length - 2; i++) {
        var xc = (points[i].x + points[i + 1].x) / 2;
        var yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }

      // curve through the last two points
      ctx.quadraticCurveTo(
        points[i].x,
        points[i].y,
        points[i + 1]?.x || points[i].x,
        points[i + 1]?.y || points[i].y
      );

      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.closePath();
    }

    // Draw points for visualization
    points.forEach((point) => {
      ctx.save();
      ctx.fillStyle = pointSettings.pointColor;
      ctx.beginPath();
      ctx.arc(point.x, point.y, pointSettings.pointSize, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    });
  },
});

export default CurveSpectrum;
