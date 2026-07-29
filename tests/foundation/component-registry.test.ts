import {
  createCoreComponentRegistry,
  debugAnimationComponent,
  featureChannelBarsComponent,
  featureExtractionBarsComponent,
  fullscreenShaderComponent,
  heartbeatMonitorComponent,
  noiseShaderComponent,
  orbitingCubesComponent,
  particleSystemComponent,
  simpleCubeComponent,
  strobeLightComponent,
} from "@viz-engine/components-core";
import type {
  VizComponentImplementation,
  VizNodeImplementation,
  VizProjectDocument,
} from "@viz-engine/contracts";
import {
  VIZ_PROJECT_SCHEMA_VERSION,
} from "@viz-engine/contracts";
import { createCoreNodeRegistry } from "@viz-engine/nodes-core";
import {
  createVizComponentRegistry,
  createVizNodeRegistry,
  createVizRenderPlan,
  createVizRuntimeSession,
} from "@viz-engine/runtime";
import { describe, expect, it } from "vitest";

describe("Viz component authoring foundation", () => {
  it("validates component registries and rejects duplicate component ids in strict mode", () => {
    const duplicate: VizComponentImplementation = {
      ...featureChannelBarsComponent,
      name: "Duplicate Feature Channel Bars",
    };

    expect(() =>
      createVizComponentRegistry([featureChannelBarsComponent, duplicate], {
        strict: true,
      }),
    ).toThrow(/Duplicate component id/);
  });

  it("surfaces duplicate input keys through registry validation", () => {
    const invalidComponent = {
      ...featureChannelBarsComponent,
      id: "invalid-input-component",
      inputs: [
        {
          key: "gain",
          label: "Gain A",
          supportedSources: ["literal"],
        },
        {
          key: "gain",
          label: "Gain B",
          supportedSources: ["literal"],
        },
      ],
    } satisfies VizComponentImplementation;

    const registry = createVizComponentRegistry([invalidComponent]);

    expect(registry.getValidationIssues()).toEqual([
      {
        code: "duplicate-input-key",
        componentId: "invalid-input-component",
        path: "invalid-input-component.inputs.gain",
        message: 'Duplicate component input key "gain".',
      },
    ]);
  });

  it("renders the V1-derived feature-channel-bars component through the canonical runtime path", () => {
    const project: VizProjectDocument = {
      schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
      projectId: "project-component-proof",
      name: "Component Proof",
      timeline: {
        fps: 60,
        durationInFrames: 120,
      },
      viewport: {
        width: 1280,
        height: 720,
      },
      layerOrder: ["layer-feature-bars"],
      layers: [
        {
          id: "layer-feature-bars",
          name: "Feature Bars",
          componentId: "feature-channel-bars",
          enabled: true,
          opacity: 1,
          blendMode: "normal",
          rendererFamily: "three",
          inputs: {
            kick: { kind: "literal", value: 0.2 },
            snare: { kind: "literal", value: 0.35 },
            bass: { kind: "literal", value: 0.5 },
            melody: { kind: "literal", value: 0.7 },
            percussion: { kind: "literal", value: 0.9 },
          },
        },
      ],
    };

    const renderPlan = createVizRenderPlan({
      session: createVizRuntimeSession({
        project,
        mode: "render",
        resolvedAssets: [],
        resolvedArtifacts: [],
        seed: "component-proof-seed",
      }),
      frame: 12,
      registry: createCoreComponentRegistry(),
    });

    expect(renderPlan.issues).toHaveLength(0);
    expect(renderPlan.layers[0]?.node?.kind).toBe("group");

    const node = renderPlan.layers[0]?.node;

    if (!node || node.kind !== "group") {
      throw new Error("Expected group render node.");
    }

    expect(node.children).toHaveLength(10);
  });

  it("renders preserved-editor stateless Canvas components deterministically", () => {
    const registry = createCoreComponentRegistry();
    const renderComponent = (
      componentId: string,
      settings: Record<string, unknown>,
    ) => {
      const project: VizProjectDocument = {
        schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
        projectId: `project-${componentId}`,
        name: componentId,
        timeline: { fps: 60, durationInFrames: 120 },
        viewport: { width: 1280, height: 720 },
        layerOrder: ["layer"],
        layers: [
          {
            id: "layer",
            name: componentId,
            componentId,
            enabled: true,
            opacity: 1,
            blendMode: "normal",
            settings,
          },
        ],
      };

      return createVizRenderPlan({
        session: createVizRuntimeSession({
          project,
          mode: "render",
          seed: "preserved-editor-component-seed",
        }),
        frame: 42,
        registry,
      });
    };

    expect(registry.get(debugAnimationComponent.id)).toBe(
      debugAnimationComponent,
    );
    expect(registry.get(featureExtractionBarsComponent.id)).toBe(
      featureExtractionBarsComponent,
    );

    const debugPlanA = renderComponent("debug-animation", {
      value: 37,
      midi: 64,
      text: "E4",
      color: "#60a5fa",
    });
    const debugPlanB = renderComponent("debug-animation", {
      value: 37,
      midi: 64,
      text: "E4",
      color: "#60a5fa",
    });
    const featurePlan = renderComponent("feature-extraction-bars", {
      kick: 0.2,
      snare: 0.4,
      bass: 0.6,
      melody: 0.8,
      percussion: 1,
    });

    expect(debugPlanA.issues).toEqual([]);
    expect(debugPlanA).toEqual(debugPlanB);
    expect(debugPlanA.layers[0]?.node?.kind).toBe("group");
    expect(featurePlan.issues).toEqual([]);
    expect(featurePlan.layers[0]?.node?.kind).toBe("group");

    const featureNode = featurePlan.layers[0]?.node;
    if (!featureNode || featureNode.kind !== "group") {
      throw new Error("Expected feature extraction group render node.");
    }
    expect(featureNode.children).toHaveLength(21);
    expect(featureNode.children.filter((node) => node.kind === "text")).toHaveLength(
      10,
    );
  });

  it("derives strobe frames deterministically instead of accumulating time or using Math.random", () => {
    const createStrobePlan = (
      frame: number,
      settings: Record<string, unknown>,
    ) => {
      const project: VizProjectDocument = {
        schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
        projectId: "project-strobe",
        name: "Strobe",
        timeline: { fps: 60, durationInFrames: 120 },
        viewport: { width: 1280, height: 720 },
        layerOrder: ["layer-strobe"],
        layers: [
          {
            id: "layer-strobe",
            name: "Strobe Light",
            componentId: "strobe-light",
            enabled: true,
            opacity: 1,
            blendMode: "normal",
            settings,
          },
        ],
      };

      return createVizRenderPlan({
        session: createVizRuntimeSession({
          project,
          mode: "render",
          seed: "strobe-seed",
        }),
        frame,
        registry: createCoreComponentRegistry(),
      });
    };
    const settings = {
      mode: "Intensity",
      color: "#ffffff",
      intensity: 1,
      strength: 0.8,
      dutyCycle: 0.5,
      flashRate: 0.3,
    };
    const onPlan = createStrobePlan(0, settings);
    const repeatedOnPlan = createStrobePlan(0, settings);
    const offPlan = createStrobePlan(45, settings);

    expect(createCoreComponentRegistry().get(strobeLightComponent.id)).toBe(
      strobeLightComponent,
    );
    expect(onPlan).toEqual(repeatedOnPlan);
    expect(onPlan.layers[0]?.node?.kind).toBe("shader");
    expect(offPlan.layers[0]?.node?.kind).toBe("shader");

    const onNode = onPlan.layers[0]?.node;
    const offNode = offPlan.layers[0]?.node;
    if (
      !onNode ||
      onNode.kind !== "shader" ||
      !offNode ||
      offNode.kind !== "shader"
    ) {
      throw new Error("Expected strobe shader render nodes.");
    }

    expect(onNode.uniforms.uStrength).toBe(0.8);
    expect(offNode.uniforms.uStrength).toBe(0);
  });

  it("derives Simple Cube rotation from canonical frame time", () => {
    const project: VizProjectDocument = {
      schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
      projectId: "project-simple-cube",
      name: "Simple Cube",
      timeline: { fps: 60, durationInFrames: 120 },
      viewport: { width: 1280, height: 720 },
      layerOrder: ["layer-cube"],
      layers: [
        {
          id: "layer-cube",
          name: "Simple Cube",
          componentId: "simple-cube",
          enabled: true,
          opacity: 1,
          blendMode: "normal",
          settings: {
            color: "#ff00ff",
            size: 1.5,
            rotationSpeedX: 2,
            rotationSpeedY: -1,
          },
        },
      ],
    };
    const session = createVizRuntimeSession({
      project,
      mode: "render",
      seed: "simple-cube-seed",
    });
    const plan = createVizRenderPlan({
      session,
      frame: 30,
      registry: createCoreComponentRegistry(),
    });
    const repeatedPlan = createVizRenderPlan({
      session,
      frame: 30,
      registry: createCoreComponentRegistry(),
    });

    expect(createCoreComponentRegistry().get(simpleCubeComponent.id)).toBe(
      simpleCubeComponent,
    );
    expect(plan).toEqual(repeatedPlan);

    const node = plan.layers[0]?.node;
    if (!node || node.kind !== "three-program") {
      throw new Error("Expected Simple Cube Three program node.");
    }

    expect(node.programId).toBe("viz-core/simple-cube/v1");
    expect(node.parameters.rotationX).toBe(1);
    expect(node.parameters.rotationY).toBe(-0.5);
  });

  it("derives Fullscreen Shader uniforms from canonical frame time", () => {
    const project: VizProjectDocument = {
      schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
      projectId: "project-fullscreen-shader",
      name: "Fullscreen Shader",
      timeline: { fps: 60, durationInFrames: 120 },
      viewport: { width: 1280, height: 720 },
      layerOrder: ["layer-shader"],
      layers: [
        {
          id: "layer-shader",
          name: "Fullscreen Shader",
          componentId: "fullscreen-shader",
          enabled: true,
          opacity: 1,
          blendMode: "normal",
          settings: {
            shader: "Radial Ripple Grid",
            color: "#00ffff",
            speed: 2,
            scale: 0.5,
            intensity: 0.8,
            offsetX: 0.1,
            offsetY: -0.2,
            seed: 3,
            scanIntensity: 0.7,
            waveIntensity: 0.6,
          },
        },
      ],
    };
    const session = createVizRuntimeSession({
      project,
      mode: "render",
      seed: "fullscreen-shader-seed",
    });
    const createPlan = () =>
      createVizRenderPlan({
        session,
        frame: 30,
        registry: createCoreComponentRegistry(),
      });
    const plan = createPlan();

    expect(
      createCoreComponentRegistry().get(fullscreenShaderComponent.id),
    ).toBe(fullscreenShaderComponent);
    expect(plan).toEqual(createPlan());

    const node = plan.layers[0]?.node;
    if (!node || node.kind !== "shader") {
      throw new Error("Expected Fullscreen Shader render node.");
    }

    expect(node.programId).toBe(
      "viz-core/fullscreen-shader/Radial Ripple Grid",
    );
    expect(node.uniforms.uTime).toBe(1);
    expect(node.uniforms.uResolution).toEqual({
      type: "vec2",
      value: [1280, 720],
    });
  });

  it("derives Noise Shader uniforms from canonical frame state", () => {
    const project: VizProjectDocument = {
      schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
      projectId: "project-noise-shader",
      name: "Noise Shader",
      timeline: { fps: 60, durationInFrames: 120 },
      viewport: { width: 1280, height: 720 },
      layerOrder: ["layer-noise"],
      layers: [
        {
          id: "layer-noise",
          name: "Noise Shader",
          componentId: "noise-shader",
          enabled: true,
          opacity: 1,
          blendMode: "normal",
          settings: {
            noise: {
              type: "cellular",
              scale: 4,
              octaves: 6,
              lacunarity: 2.5,
              gain: 0.4,
            },
            animation: {
              speed: 1.5,
              flowX: 0.1,
              flowY: -0.2,
              rotationSpeed: 0.3,
            },
            distortion: {
              enabled: true,
              amount: 2,
              scale: 1.25,
            },
            color: {
              mode: "palette",
              color1: "#112233",
              color2: "#445566",
              color3: "#778899",
              hueShift: 0.75,
              saturation: 1.2,
            },
            output: {
              brightness: 1.1,
              contrast: 1.3,
              invert: true,
              posterize: 5,
            },
          },
        },
      ],
    };
    const session = createVizRuntimeSession({
      project,
      mode: "render",
      seed: "noise-shader-seed",
    });
    const createPlan = () =>
      createVizRenderPlan({
        session,
        frame: 30,
        registry: createCoreComponentRegistry(),
      });
    const plan = createPlan();

    expect(createCoreComponentRegistry().get(noiseShaderComponent.id)).toBe(
      noiseShaderComponent,
    );
    expect(plan).toEqual(createPlan());

    const node = plan.layers[0]?.node;
    if (!node || node.kind !== "shader") {
      throw new Error("Expected Noise Shader render node.");
    }

    expect(node.programId).toBe("viz-core/noise-shader/v1");
    expect(node.uniforms).toMatchObject({
      u_time: 0.5,
      u_resolution: { type: "vec2", value: [1280, 720] },
      u_noiseType: 4,
      u_scale: 4,
      u_distortionEnabled: 1,
      u_colorMode: 1,
      u_color1: { type: "color", value: "#112233" },
      u_invert: 1,
      u_posterize: 5,
    });
  });

  it("derives Particle System simulation inputs from canonical frame state", () => {
    const project: VizProjectDocument = {
      schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
      projectId: "project-particle-system",
      name: "Particle System",
      timeline: { fps: 60, durationInFrames: 180 },
      viewport: { width: 1280, height: 720 },
      layerOrder: ["layer-particles"],
      layers: [
        {
          id: "layer-particles",
          name: "Particle System",
          componentId: "particle-system",
          enabled: true,
          opacity: 1,
          blendMode: "normal",
          settings: {
            appearance: {
              startColor: "#ff00ff",
              endColor: "#00ffff",
              particleSize: 0.25,
              blending: "additive",
            },
            physics: {
              emissionRate: 10,
              lifetime: 2,
              useGravity: true,
              gravityStrength: 9.8,
              initialSpeed: 2,
              spread: 0.5,
            },
            emission: {
              emitterShape: "sphere",
              emitterSize: 0.75,
            },
            rotation: {
              rotationSpeedX: 0.5,
              rotationSpeedY: 1,
              rotationSpeedZ: -0.25,
            },
          },
        },
      ],
    };
    const session = createVizRuntimeSession({
      project,
      mode: "render",
      seed: "particle-system-seed",
    });
    const createPlan = () =>
      createVizRenderPlan({
        session,
        frame: 60,
        registry: createCoreComponentRegistry(),
      });
    const plan = createPlan();

    expect(
      createCoreComponentRegistry().get(particleSystemComponent.id),
    ).toBe(particleSystemComponent);
    expect(plan).toEqual(createPlan());

    const node = plan.layers[0]?.node;
    if (!node || node.kind !== "three-program") {
      throw new Error("Expected Particle System Three program node.");
    }

    expect(node.programId).toBe("viz-core/particle-system/v1");
    expect(node.parameters).toMatchObject({
      time: 1,
      seed: "particle-system-seed",
      emissionRate: 10,
      emitterShape: "sphere",
      rotationX: 0.5,
      rotationY: 1,
      rotationZ: -0.25,
    });
  });

  it("derives Orbiting Cubes scene state from canonical frame time", () => {
    const project: VizProjectDocument = {
      schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
      projectId: "project-orbiting-cubes",
      name: "Orbiting Cubes",
      timeline: { fps: 60, durationInFrames: 180 },
      viewport: { width: 1280, height: 720 },
      layerOrder: ["layer-orbiting-cubes"],
      layers: [
        {
          id: "layer-orbiting-cubes",
          name: "Orbiting Cubes",
          componentId: "orbiting-cubes",
          enabled: true,
          opacity: 1,
          blendMode: "normal",
          settings: {
            seed: 3499,
            maxCubes: 150,
            fractalDepth: 5,
            spacing: 0.8,
            orbitSpeed: 0.4,
            orbitRadius: 9,
            rotationSpeed: 0.2,
          },
        },
      ],
    };
    const session = createVizRuntimeSession({
      project,
      mode: "render",
      seed: "orbiting-cubes-seed",
    });
    const createPlan = () =>
      createVizRenderPlan({
        session,
        frame: 60,
        registry: createCoreComponentRegistry(),
      });
    const plan = createPlan();

    expect(
      createCoreComponentRegistry().get(orbitingCubesComponent.id),
    ).toBe(orbitingCubesComponent);
    expect(plan).toEqual(createPlan());

    const node = plan.layers[0]?.node;
    if (!node || node.kind !== "three-program") {
      throw new Error("Expected Orbiting Cubes Three program node.");
    }

    expect(node.programId).toBe("viz-core/orbiting-cubes/v1");
    expect(node.parameters).toMatchObject({
      time: 1,
      seed: 3499,
      maxCubes: 150,
      fractalDepth: 5,
      spacing: 0.8,
      orbitSpeed: 0.4,
      orbitRadius: 9,
      rotationSpeed: 0.2,
    });
  });

  it("applies canonical graph outputs to component settings before rendering", () => {
    const project: VizProjectDocument = {
      schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
      projectId: "project-node-driven-simple-cube",
      name: "Node-driven Simple Cube",
      timeline: { fps: 60, durationInFrames: 120 },
      viewport: { width: 1280, height: 720 },
      layerOrder: ["layer-cube"],
      layers: [
        {
          id: "layer-cube",
          name: "Simple Cube",
          componentId: "simple-cube",
          enabled: true,
          opacity: 1,
          blendMode: "normal",
          settings: {
            size: 1,
          },
          inputs: {
            size: {
              kind: "graph-output",
              graphId: "graph-size",
              output: "value",
            },
          },
        },
      ],
      graphs: [
        {
          id: "graph-size",
          name: "Size",
          nodes: [
            {
              id: "node-size",
              type: "multiply",
              inputs: {
                value: { kind: "literal", value: 2 },
                factor: { kind: "literal", value: 1.5 },
              },
            },
          ],
          outputs: [
            {
              key: "value",
              nodeId: "node-size",
              output: "value",
            },
          ],
        },
      ],
    };
    const plan = createVizRenderPlan({
      session: createVizRuntimeSession({
        project,
        mode: "render",
        seed: "node-driven-component-seed",
      }),
      frame: 0,
      registry: createCoreComponentRegistry(),
      nodeRegistry: createCoreNodeRegistry(),
    });

    expect(plan.issues).toEqual([]);
    const node = plan.layers[0]?.node;
    if (!node || node.kind !== "three-program") {
      throw new Error("Expected Simple Cube Three program node.");
    }
    expect(node.parameters.size).toBe(3);
  });

  it("samples Heartbeat Monitor history from deterministic canonical frames", () => {
    const frameNode: VizNodeImplementation = {
      type: "test-frame",
      name: "Test Frame",
      category: "pure",
      outputs: [{ key: "value", label: "Value" }],
      evaluate: ({ frameContext }) => ({
        value: frameContext.frame,
      }),
    };
    const project: VizProjectDocument = {
      schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
      projectId: "project-heartbeat",
      name: "Heartbeat",
      timeline: { fps: 60, durationInFrames: 120 },
      viewport: { width: 4, height: 100 },
      layerOrder: ["layer-heartbeat"],
      layers: [
        {
          id: "layer-heartbeat",
          name: "Heartbeat Monitor",
          componentId: "heartbeat-monitor",
          enabled: true,
          opacity: 1,
          blendMode: "normal",
          settings: {
            yPosition: 50,
            lineColor: "#34d399",
            lineWidth: 2,
          },
          inputs: {
            yPosition: {
              kind: "graph-output",
              graphId: "graph-heartbeat",
              output: "value",
            },
          },
        },
      ],
      graphs: [
        {
          id: "graph-heartbeat",
          name: "Heartbeat Position",
          nodes: [{ id: "node-frame", type: "test-frame" }],
          outputs: [
            {
              key: "value",
              nodeId: "node-frame",
              output: "value",
            },
          ],
        },
      ],
    };
    const session = createVizRuntimeSession({
      project,
      mode: "render",
      seed: "heartbeat-seed",
    });
    const createPlan = () =>
      createVizRenderPlan({
        session,
        frame: 5,
        registry: createCoreComponentRegistry(),
        nodeRegistry: createVizNodeRegistry([frameNode]),
      });
    const plan = createPlan();

    expect(
      createCoreComponentRegistry().get(heartbeatMonitorComponent.id),
    ).toBe(heartbeatMonitorComponent);
    expect(plan).toEqual(createPlan());
    expect(plan.issues).toEqual([]);

    const node = plan.layers[0]?.node;
    if (!node || node.kind !== "group") {
      throw new Error("Expected Heartbeat Monitor group node.");
    }
    const history = node.children[1];
    if (!history || history.kind !== "polyline") {
      throw new Error("Expected Heartbeat Monitor polyline.");
    }

    expect(history.points).toEqual([
      { x: 0, y: 49.2 },
      { x: 1, y: 48.8 },
      { x: 2, y: 48.4 },
      { x: 3, y: 48 },
    ]);
  });
});
