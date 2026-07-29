import type {
  VizComponentImplementation,
  VizRenderShaderNode,
} from "@viz-engine/contracts";
import { asNumber, asString } from "./shared.js";

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec2 vUv;

  void main() {
    vec3 color = uColor * uStrength;
    gl_FragColor = vec4(color, uStrength);
  }
`;

const hashFrame = (seed: string, frame: number): number => {
  let hash = 2166136261;
  const value = `${seed}:${frame}`;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967296;
};

const getStrobeStrength = ({
  mode,
  strength,
  intensity,
  dutyCycle,
  flashRate,
  timeInSeconds,
  frame,
  seed,
}: {
  mode: string;
  strength: number;
  intensity: number;
  dutyCycle: number;
  flashRate: number;
  timeInSeconds: number;
  frame: number;
  seed: string;
}): number => {
  if (mode === "Manual") {
    return strength;
  }

  if (mode === "Random Flashes") {
    return hashFrame(seed, frame) > 1 - flashRate ? strength : 0;
  }

  if (intensity <= 0) {
    return 0;
  }

  const flashPeriod = 1 / intensity;
  const cyclePosition =
    (timeInSeconds % flashPeriod) / flashPeriod;
  return cyclePosition < dutyCycle ? strength : 0;
};

export const strobeLightComponent: VizComponentImplementation = {
  id: "strobe-light",
  name: "Strobe Light",
  rendererFamily: "three",
  description:
    "Deterministic package-runtime fullscreen strobe shader.",
  render: ({ viewport, frameContext, layer, settings }) => {
    const mode = asString(settings.mode, "Intensity");
    const color = asString(settings.color, "#ffffff");
    const intensity = Math.max(
      0,
      asNumber(settings.intensity, 1),
    );
    const strength = Math.max(
      0,
      Math.min(1, asNumber(settings.strength, 1)),
    );
    const dutyCycle = Math.max(
      0,
      Math.min(1, asNumber(settings.dutyCycle, 0.5)),
    );
    const flashRate = Math.max(
      0,
      Math.min(1, asNumber(settings.flashRate, 0.3)),
    );
    const finalStrength = getStrobeStrength({
      mode,
      strength,
      intensity,
      dutyCycle,
      flashRate,
      timeInSeconds: frameContext.timeInSeconds,
      frame: frameContext.frame,
      seed: frameContext.seed,
    });

    return {
      kind: "shader",
      id: layer.id,
      programId: "viz-core/strobe-light/v1",
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
      vertexShader,
      fragmentShader,
      uniforms: {
        uColor: {
          type: "color",
          value: color,
        },
        uStrength: finalStrength,
      },
      transparent: true,
      blendMode: "add",
    } satisfies VizRenderShaderNode;
  },
};
