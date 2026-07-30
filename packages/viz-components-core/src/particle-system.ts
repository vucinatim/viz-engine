import type {
  VizComponentImplementation,
  VizRenderThreeProgramNode,
} from "@viz-engine/contracts";
import { particleSystemAuthoring } from "./authoring/particle-system.js";
import { asBoolean, asNumber, asRecord, asString } from "./shared.js";

export const particleSystemComponent: VizComponentImplementation = {
  id: "particle-system",
  name: "Particle System",
  rendererFamily: "three",
  implementationVersion: "1.0.0",
  authoring: particleSystemAuthoring,
  description: "Deterministic package-runtime instanced particle system.",
  render: ({ frameContext, layer, settings }) => {
    const appearance = asRecord(settings.appearance);
    const physics = asRecord(settings.physics);
    const emission = asRecord(settings.emission);
    const rotation = asRecord(settings.rotation);

    return {
      kind: "three-program",
      id: layer.id,
      programId: "viz-core/particle-system/v1",
      parameters: {
        time: frameContext.timeInSeconds,
        seed: frameContext.seed,
        startColor: asString(appearance.startColor, "#ff00ff"),
        endColor: asString(appearance.endColor, "#00ffff"),
        particleSize: Math.max(0.1, asNumber(appearance.particleSize, 0.2)),
        blending: asString(appearance.blending, "additive"),
        emissionRate: Math.max(0, asNumber(physics.emissionRate, 100)),
        lifetime: Math.max(0.1, asNumber(physics.lifetime, 2)),
        useGravity: asBoolean(physics.useGravity, true),
        gravityStrength: Math.max(
          0,
          asNumber(physics.gravityStrength, 9.8),
        ),
        initialSpeed: Math.max(0, asNumber(physics.initialSpeed, 2)),
        spread: Math.min(1, Math.max(0, asNumber(physics.spread, 0.5))),
        emitterShape: asString(emission.emitterShape, "point"),
        emitterSize: Math.max(0, asNumber(emission.emitterSize, 0.5)),
        rotationX:
          frameContext.timeInSeconds *
          asNumber(rotation.rotationSpeedX, 0),
        rotationY:
          frameContext.timeInSeconds *
          asNumber(rotation.rotationSpeedY, 1),
        rotationZ:
          frameContext.timeInSeconds *
          asNumber(rotation.rotationSpeedZ, 0),
      },
    } satisfies VizRenderThreeProgramNode;
  },
};
