import type {
  VizComponentDefinition,
  VizExecutionMode,
  VizFramePlan,
  VizFramePlanIssue,
  VizLayer,
  VizLayerFrameSnapshot,
  VizResolvedInputValue,
  VizValueSource,
} from "@viz-engine/contracts";
import { getAudioFeatureTimelineArtifact, sampleAudioFeatureValue } from "./audio-feature-timeline";
import type { VizComponentRegistry } from "./component-registry";
import type { VizRuntimeSession } from "./runtime-session";

export interface CreateVizFramePlanOptions {
  session: VizRuntimeSession;
  frame: number;
  registry?: VizComponentRegistry;
}

const getDefaultRendererFamily = (
  layer: VizLayer,
  component: VizComponentDefinition | undefined,
): VizLayerFrameSnapshot["rendererFamily"] => {
  return layer.rendererFamily ?? component?.rendererFamily ?? "unknown";
};

const resolveLiteralInput = (key: string, source: Extract<VizValueSource, { kind: "literal" }>): VizResolvedInputValue => {
  return {
    key,
    sourceKind: "literal",
    status: "resolved",
    value: source.value,
  };
};

const createIssue = (
  code: VizFramePlanIssue["code"],
  layerId: string,
  inputKey: string,
  message: string,
): VizFramePlanIssue => ({
  code,
  layerId,
  inputKey,
  message,
});

const resolveArtifactFeatureInput = (
  key: string,
  source: Extract<VizValueSource, { kind: "artifact-feature" }>,
  session: VizRuntimeSession,
  frame: number,
  issues: VizFramePlanIssue[],
  layerId: string,
): VizResolvedInputValue => {
  const artifact = session.getResolvedArtifactMap().get(source.artifactId);
  const timelineArtifact = getAudioFeatureTimelineArtifact(artifact);

  if (!timelineArtifact) {
    issues.push(
      createIssue(
        "missing-artifact",
        layerId,
        key,
        `Layer "${layerId}" could not resolve audio feature artifact "${source.artifactId}".`,
      ),
    );

    return {
      key,
      sourceKind: "artifact-feature",
      status: "missing",
      message: `Missing resolved artifact "${source.artifactId}".`,
    };
  }

  const sampledValue = sampleAudioFeatureValue(timelineArtifact, source.feature, frame);

  if (sampledValue === undefined) {
    issues.push(
      createIssue(
        "missing-feature",
        layerId,
        key,
        `Artifact "${source.artifactId}" does not contain feature "${source.feature}".`,
      ),
    );

    return {
      key,
      sourceKind: "artifact-feature",
      status: "missing",
      message: `Missing feature "${source.feature}" in artifact "${source.artifactId}".`,
    };
  }

  return {
    key,
    sourceKind: "artifact-feature",
    status: "resolved",
    value: sampledValue,
  };
};

const resolveInputValue = (
  key: string,
  source: VizValueSource,
  session: VizRuntimeSession,
  frame: number,
  issues: VizFramePlanIssue[],
  layerId: string,
): VizResolvedInputValue => {
  if (source.kind === "literal") {
    return resolveLiteralInput(key, source);
  }

  if (source.kind === "artifact-feature") {
    return resolveArtifactFeatureInput(key, source, session, frame, issues, layerId);
  }

  issues.push(
    createIssue(
      "unsupported-source",
      layerId,
      key,
      `Input source kind "${source.kind}" is not implemented in the runtime frame planner yet.`,
    ),
  );

  return {
    key,
    sourceKind: source.kind,
    status: "unsupported",
    message: `Input source kind "${source.kind}" is not implemented yet.`,
  };
};

const shouldIncludeLayer = (layer: VizLayer, mode: VizExecutionMode): boolean => {
  const supportedModes = layer.renderPolicy?.supportedModes;

  if (!supportedModes || supportedModes.length === 0) {
    return layer.enabled;
  }

  return layer.enabled && supportedModes.includes(mode);
};

export const createVizFramePlan = ({
  session,
  frame,
  registry,
}: CreateVizFramePlanOptions): VizFramePlan => {
  const frameContext = session.getFrameContext(frame);
  const issues: VizFramePlanIssue[] = [];

  const layers = session
    .getOrderedLayers()
    .filter((layer) => shouldIncludeLayer(layer, session.mode))
    .map((layer) => {
      const component = registry?.get(layer.componentId);
      const resolvedInputs = Object.fromEntries(
        Object.entries(layer.inputs ?? {}).map(([key, source]) => [
          key,
          resolveInputValue(key, source, session, frameContext.frame, issues, layer.id),
        ]),
      );

      const snapshot: VizLayerFrameSnapshot = {
        layerId: layer.id,
        componentId: layer.componentId,
        rendererFamily: getDefaultRendererFamily(layer, component),
        enabled: layer.enabled,
        opacity: layer.opacity,
        blendMode: layer.blendMode,
        resolvedInputs,
      };

      if (component?.name !== undefined) {
        snapshot.componentName = component.name;
      }

      if (layer.settings !== undefined) {
        snapshot.settings = layer.settings;
      }

      return snapshot;
    });

  return {
    frameContext,
    layers,
    issues,
  };
};
