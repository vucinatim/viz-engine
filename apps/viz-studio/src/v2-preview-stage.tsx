import type {
  VizLayerFrameSnapshot,
  VizResolvedInputValue,
} from "@viz-engine/contracts";
import React, { Suspense, lazy, useMemo } from "react";

import { Button } from "./ui/button";
import { useV2EditorActions, useV2EditorSnapshot } from "./v2-editor-provider";

const V2ThreePreviewPane = lazy(async () => {
  const previewModule = await import("./v2-three-preview-pane");
  return {
    default: previewModule.V2ThreePreviewPane,
  };
});

const formatValue = (value: unknown): string => {
  if (typeof value === "number") {
    return value.toFixed(4);
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "id" in value &&
    "kind" in value
  ) {
    const id = typeof value.id === "string" ? value.id : "unknown";
    const kind = typeof value.kind === "string" ? value.kind : "value";
    return `${kind}:${id}`;
  }

  return JSON.stringify(value);
};

export const V2PreviewStage = () => {
  const snapshot = useV2EditorSnapshot();
  const actions = useV2EditorActions();
  const selectedLayerId = snapshot.snapshot.session.uiState.selectedLayerId;
  const selectedLayerFrame = useMemo(
    (): VizLayerFrameSnapshot | undefined =>
      snapshot.debugSnapshot.framePlan.layers.find(
        (layer) => layer.layerId === selectedLayerId,
      ),
    [selectedLayerId, snapshot.debugSnapshot.framePlan.layers],
  );
  const viewport = snapshot.snapshot.session.workingProject.viewport;

  return (
    <div className="absolute inset-0 grid grid-rows-[1fr_auto]">
      <div className="relative overflow-hidden bg-zinc-950">
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/60">
              Loading WebGL preview…
            </div>
          }
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="overflow-hidden rounded-xl border border-white/10 shadow-2xl"
              style={{
                width: Math.min(viewport.width, 960),
                height: Math.min(viewport.height, 540),
              }}
            >
              <V2ThreePreviewPane
                renderPlan={snapshot.debugSnapshot.renderPlan}
                width={viewport.width}
                height={viewport.height}
              />
            </div>
          </div>
        </Suspense>

        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-2 text-xs text-white/80 backdrop-blur-sm">
          <span>Frame {snapshot.snapshot.transport.currentFrame}</span>
          <span className="text-white/30">•</span>
          <span>{snapshot.snapshot.transport.mode}</span>
          <span className="text-white/30">•</span>
          <span>{snapshot.snapshot.audioDiagnostics.inputMode}</span>
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
          <div className="max-w-md rounded-2xl border border-white/10 bg-black/60 p-4 text-white/90 backdrop-blur-md">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/45">
              <span>Live Stage</span>
              <span className="text-white/20">/</span>
              <span>{snapshot.snapshot.source.label}</span>
            </div>
            <p className="text-sm text-white/70">
              The preserved editor shell is now rendering the canonical working
              head through the V2 runtime and compositor path.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/60 p-3 backdrop-blur-md">
            <Button
              aria-label="Toggle playback"
              variant="outline"
              className={[
                "border-white/10 text-white hover:bg-white/10",
                snapshot.snapshot.transport.isPlaying
                  ? "bg-white text-black hover:bg-white/90"
                  : "bg-transparent",
              ].join(" ")}
              onClick={() => {
                void actions.togglePlayback();
              }}
            >
              {snapshot.snapshot.transport.isPlaying ? "Pause" : "Play"}
            </Button>
            <Button
              variant="outline"
              className="border-white/10 bg-transparent text-white hover:bg-white/10"
              onClick={() => actions.setPreviewMode("live")}
            >
              Live
            </Button>
            <Button
              variant="outline"
              className="border-white/10 bg-transparent text-white hover:bg-white/10"
              onClick={() => actions.setPreviewMode("render")}
            >
              Render
            </Button>
          </div>
        </div>
      </div>

      <div className="grid max-h-[40%] grid-cols-[1.2fr_0.8fr] gap-3 border-t border-white/10 bg-zinc-950/85 p-3">
        <div className="overflow-auto rounded-xl border border-white/10 bg-black/30 p-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                SVG Proof Output
              </p>
              <p className="text-sm text-white/75">
                Deterministic debug renderer for snapshot parity.
              </p>
            </div>
            <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/55">
              {snapshot.debugSnapshot.renderPlan.layers.length} layers
            </span>
          </div>
          <div
            className="overflow-hidden rounded-lg border border-white/10 bg-zinc-900"
            dangerouslySetInnerHTML={{ __html: snapshot.debugSnapshot.svg }}
          />
        </div>

        <div className="overflow-auto rounded-xl border border-white/10 bg-black/30 p-3">
          <div className="mb-3">
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">
              Selected Layer
            </p>
            <p className="text-sm text-white/75">
              Current resolved inputs and provenance for the active layer.
            </p>
          </div>
          {selectedLayerFrame ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {selectedLayerFrame.componentName ??
                        selectedLayerFrame.componentId}
                    </p>
                    <p className="text-xs text-white/45">
                      {selectedLayerFrame.layerId}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/55">
                    {selectedLayerFrame.rendererFamily}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {Object.values(selectedLayerFrame.resolvedInputs).map(
                  (input: VizResolvedInputValue) => (
                    <div
                      key={input.key}
                      className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-white">{input.key}</p>
                          <p className="text-xs text-white/45">
                            {input.sourceKind}
                          </p>
                        </div>
                        <span className="text-right text-xs text-white/75">
                          {input.status === "resolved"
                            ? formatValue(input.value)
                            : input.message}
                        </span>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-white/50">
              Select a layer from the left panel to inspect its resolved inputs.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
