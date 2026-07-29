import type {
  VizComponentImplementation,
  VizRenderThreeProgramNode,
} from "@viz-engine/contracts";
import { asNumber, asString } from "./shared.js";

export const orbitingCubesComponent: VizComponentImplementation = {
  id: "orbiting-cubes",
  name: "Orbiting Cubes",
  rendererFamily: "three",
  description: "Deterministic package-runtime orbiting neuron-like cubes.",
  render: ({ frameContext, layer }) => ({
    kind: "three-program",
    id: layer.id,
    programId: "viz-core/orbiting-cubes/v1",
    parameters: {
      time: frameContext.timeInSeconds,
      seed: Math.round(asNumber(layer.settings?.seed, 3499)),
      maxCubes: Math.min(
        150,
        Math.max(8, Math.round(asNumber(layer.settings?.maxCubes, 150))),
      ),
      fractalDepth: Math.min(
        5,
        Math.max(1, Math.round(asNumber(layer.settings?.fractalDepth, 5))),
      ),
      cubeColor: asString(layer.settings?.cubeColor, "#1a1a2e"),
      cubeSize: Math.max(0.1, asNumber(layer.settings?.cubeSize, 0.45)),
      metalness: Math.min(
        1,
        Math.max(0, asNumber(layer.settings?.metalness, 0.95)),
      ),
      roughness: Math.min(
        1,
        Math.max(0, asNumber(layer.settings?.roughness, 0.5)),
      ),
      light1Color: asString(layer.settings?.light1Color, "#FF00FF"),
      light2Color: asString(layer.settings?.light2Color, "#00FFFF"),
      light3Color: asString(layer.settings?.light3Color, "#FFFF00"),
      lightIntensity: Math.max(
        0,
        asNumber(layer.settings?.lightIntensity, 500),
      ),
      ambientBrightness: Math.max(
        0,
        asNumber(layer.settings?.ambientBrightness, 185),
      ),
      spacing: Math.max(0.1, asNumber(layer.settings?.spacing, 0.65)),
      orbitSpeed: Math.max(0, asNumber(layer.settings?.orbitSpeed, 0.3)),
      orbitRadius: Math.max(3, asNumber(layer.settings?.orbitRadius, 8)),
      rotationSpeed: Math.max(
        0,
        asNumber(layer.settings?.rotationSpeed, 0.1),
      ),
    },
  }) satisfies VizRenderThreeProgramNode,
};
