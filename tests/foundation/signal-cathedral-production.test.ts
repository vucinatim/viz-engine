import {
  coreComponentCapabilityPack,
} from "@viz-engine/components-core";
import {
  createVizComponentRegistryFromCapabilityPacks,
  type VizAudioFeatureTimelineArtifact,
  type VizRenderThreeProgramNode,
} from "@viz-engine/contracts";
import { createCoreNodeRegistry } from "@viz-engine/nodes-core";
import {
  createSignalCathedralProgram,
  createSignalCathedralProject,
  signalCathedralAuthoring,
  signalCathedralCapabilityPack,
  signalCathedralComponent,
  signalCathedralThreeRendererExtension,
  SIGNAL_CATHEDRAL_AUDIO_ARTIFACT_ID,
  SIGNAL_CATHEDRAL_AUDIO_ASSET_ID,
} from "@viz-engine/production-signal-cathedral";
import {
  createVizThreeProgramRegistry,
  coreVizThreeRendererExtension,
} from "@viz-engine/renderer-three";
import {
  createVizRenderPlan,
  createVizRuntimeSession,
  validateProjectDocument,
} from "@viz-engine/runtime";
import {
  studioCatalogComponents,
  studioComponentRegistry,
  studioThreeProgramRegistry,
} from "@/lib/viz-capabilities";
import { describe, expect, it } from "vitest";

const createSeries = (
  name: string,
  generator: (frame: number) => number,
) => ({
  name,
  unit: "unit" as const,
  normalization: "custom" as const,
  values: Array.from({ length: 720 }, (_, frame) =>
    Number(generator(frame).toFixed(6)),
  ),
});

const audioArtifact: VizAudioFeatureTimelineArtifact = {
  schemaVersion: 1,
  id: SIGNAL_CATHEDRAL_AUDIO_ARTIFACT_ID,
  kind: "audio-feature-timeline",
  label: "Signal Cathedral Test Features",
  sourceAssetId: SIGNAL_CATHEDRAL_AUDIO_ASSET_ID,
  profile: "standard",
  sourceWindow: {
    startSample: 0,
    sampleCount: 576_000,
    startSeconds: 0,
    durationSeconds: 12,
  },
  frameAlignment: {
    fps: 60,
    frameCount: 720,
    alignment: "frame-centered",
  },
  featureSeries: [
    createSeries("bass-energy", (frame) => 0.42 + Math.sin(frame / 19) * 0.2),
    createSeries("mid-energy", (frame) => 0.36 + Math.sin(frame / 23) * 0.18),
    createSeries("loudness", (frame) => 0.62 + Math.sin(frame / 31) * 0.12),
    createSeries("treble-energy", (frame) => 0.3 + Math.cos(frame / 13) * 0.2),
    createSeries("onset-strength", (frame) =>
      frame % 48 === 0 ? 0.92 : 0.08,
    ),
    createSeries("spectral-flux", (frame) =>
      frame % 32 < 4 ? 0.74 : 0.16,
    ),
  ],
};

const createProductionRenderPlan = (frame: number) => {
  const registry = createVizComponentRegistryFromCapabilityPacks(
    [coreComponentCapabilityPack, signalCathedralCapabilityPack],
    { strict: true },
  );
  const project = createSignalCathedralProject({
    audioArtifactRef: audioArtifact,
  });

  return createVizRenderPlan({
    session: createVizRuntimeSession({
      project,
      mode: "render",
      seed: "signal-cathedral-test",
      resolvedArtifacts: [
        {
          id: audioArtifact.id,
          kind: audioArtifact.kind,
          uri: "memory://signal-cathedral-audio-artifact.json",
          payload: audioArtifact,
        },
      ],
    }),
    frame,
    registry,
    nodeRegistry: createCoreNodeRegistry(),
  });
};

describe("Signal Cathedral production capability pack", () => {
  it("keeps its authoring definition data-only with complete production presets", () => {
    expect(JSON.parse(JSON.stringify(signalCathedralAuthoring))).toEqual(
      signalCathedralAuthoring,
    );
    expect(signalCathedralAuthoring.presets?.map((preset) => preset.id)).toEqual(
      ["cathedral", "pulse-chamber", "afterglow"],
    );
    expect(signalCathedralAuthoring.settings.fields).toHaveProperty("palette");
    expect(signalCathedralAuthoring.settings.fields).toHaveProperty("structure");
    expect(signalCathedralAuthoring.settings.fields).toHaveProperty("motion");
    expect(signalCathedralAuthoring.settings.fields).toHaveProperty("reactivity");
    expect(signalCathedralAuthoring.settings.fields).toHaveProperty("lighting");
  });

  it("composes through the real studio component and renderer registries", () => {
    const componentRegistration =
      studioComponentRegistry.getRegistration("signal-cathedral");
    const programRegistration = studioThreeProgramRegistry.get(
      "viz-production/signal-cathedral/v1",
    );

    expect(componentRegistration?.component).toBe(signalCathedralComponent);
    expect(componentRegistration?.capabilityPack).toEqual(
      signalCathedralCapabilityPack.manifest,
    );
    expect(programRegistration?.capabilityPack).toEqual(
      signalCathedralCapabilityPack.manifest,
    );
    expect(
      studioCatalogComponents.map((component) => component.id),
    ).toContain("signal-cathedral");
  });

  it("forms valid canonical project data with inspectable graph bindings", () => {
    const project = createSignalCathedralProject();
    const validation = validateProjectDocument(project);

    expect(validation.ok).toBe(true);
    expect(validation.issues).toEqual([]);
    expect(project.timeline).toEqual({
      fps: 60,
      durationInFrames: 720,
    });
    expect(project.layers[0]?.inputs).toMatchObject({
      "reactivity:structurePulse": {
        kind: "graph-output",
        output: "structurePulse",
      },
      "reactivity:shockwaveTrigger": {
        kind: "graph-output",
        output: "shockwaveTrigger",
      },
    });
    expect(project.assetRefs?.[0]?.metadata).toMatchObject({
      derivation: {
        sourceStartSeconds: 48,
        durationSeconds: 12,
      },
    });
  });

  it("evaluates the production graph into deterministic Three program parameters", () => {
    const first = createProductionRenderPlan(96);
    const second = createProductionRenderPlan(96);

    expect(first.issues).toEqual([]);
    expect(first.graphResults[0]?.issues).toEqual([]);
    expect(first).toEqual(second);
    const node = first.layers[0]?.node;
    expect(node?.kind).toBe("three-program");
    if (!node || node.kind !== "three-program") {
      throw new Error("Expected Signal Cathedral Three program node.");
    }
    expect(node.programId).toBe("viz-production/signal-cathedral/v1");
    expect(node.parameters.structurePulse).toEqual(
      first.graphResults[0]?.values.structurePulse,
    );
    expect(node.parameters.coreEnergy).toEqual(
      first.graphResults[0]?.values.coreEnergy,
    );
    expect(node.parameters.shockwaveAges).toEqual(
      expect.any(Array),
    );
  });

  it("updates one bounded retained program and exposes stable resource diagnostics", () => {
    const plan = createProductionRenderPlan(96);
    const node = plan.layers[0]?.node;
    if (!node || node.kind !== "three-program") {
      throw new Error("Expected Signal Cathedral Three program node.");
    }
    const instance = createSignalCathedralProgram({
      node,
      width: 1280,
      height: 720,
      materializedAssets: new Map(),
      modelResources: {} as never,
      invalidate: () => undefined,
    });
    const originalChildren = [...instance.root.children];
    const originalResourceSummary = structuredClone(
      instance.root.userData.vizResourceSummary,
    );
    const updatedNode: VizRenderThreeProgramNode = {
      ...node,
      parameters: {
        ...node.parameters,
        time: 2.5,
        archCount: 18,
        particleCount: 640,
        shockwaveAges: [0.15, 0.8],
      },
    };

    instance.update(updatedNode);

    expect(instance.root.children).toEqual(originalChildren);
    expect(instance.root.userData.vizResourceSummary).toEqual(
      originalResourceSummary,
    );
    expect(instance.root.userData.vizFrameSummary).toMatchObject({
      time: 2.5,
      activeArchSegments: 72,
      activeParticles: 640,
      activeShockwaves: 2,
    });
    expect(() => instance.resize(1920, 1080)).not.toThrow();
    expect(() => instance.dispose()).not.toThrow();
  });

  it("registers its executable program only through its renderer extension", () => {
    const registry = createVizThreeProgramRegistry([
      coreVizThreeRendererExtension,
      signalCathedralThreeRendererExtension,
    ]);

    expect(registry.get("viz-production/signal-cathedral/v1")?.factory).toBe(
      createSignalCathedralProgram,
    );
    expect(registry.list()).toHaveLength(
      coreVizThreeRendererExtension.programs.length + 1,
    );
  });
});
