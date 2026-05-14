import type {
  VizFramePlanIssue,
  VizGraphEvaluationIssue,
  VizLayerFrameSnapshot,
  VizResolvedInputValue,
} from "@viz-engine/contracts";
import React, { useMemo } from "react";

import { Button } from "./ui/button";
import { useV2EditorActions, useV2EditorSnapshot } from "./v2-editor-provider";

const formatValue = (value: unknown): string => {
  if (typeof value === "number") {
    return value.toFixed(4);
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
};

const TabButton = ({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) => {
  return (
    <button
      className={[
        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-white text-black"
          : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white",
      ].join(" ")}
      onClick={onClick}
    >
      {label}
    </button>
  );
};

export const V2ScenePanel = () => {
  const snapshot = useV2EditorSnapshot();
  const actions = useV2EditorActions();
  const selectedLayerId = snapshot.snapshot.session.uiState.selectedLayerId;
  const activePanel = snapshot.snapshot.session.uiState.activePanel;
  const layers = snapshot.debugSnapshot.framePlan.layers;
  const selectedGraphId = snapshot.snapshot.session.uiState.selectedGraphId;

  const groupedIssues = useMemo(() => {
    return [
      ...snapshot.snapshot.session.issues.map((issue) => ({
        source: `${issue.source}:${issue.code}`,
        message: issue.message,
      })),
      ...snapshot.debugSnapshot.framePlan.issues.map((issue: VizFramePlanIssue) => ({
        source: `${issue.layerId}:${issue.inputKey}`,
        message: issue.message,
      })),
      ...snapshot.debugSnapshot.renderPlan.issues.map((issue: VizFramePlanIssue) => ({
        source: `${issue.layerId}:${issue.code}`,
        message: issue.message,
      })),
      ...snapshot.graphRuntime.graphs.flatMap((graph) =>
        graph.issues.map((issue: VizGraphEvaluationIssue) => ({
          source: `${graph.graphId}:${issue.code}`,
          message: issue.message,
        })),
      ),
    ];
  }, [
    snapshot.debugSnapshot.framePlan.issues,
    snapshot.debugSnapshot.renderPlan.issues,
    snapshot.graphRuntime.graphs,
    snapshot.snapshot.session.issues,
  ]);

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="flex items-center justify-between border-b border-zinc-600/60 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/45">
            Scene Truth
          </p>
          <p className="text-sm text-white/70">
            Inspect the working head, graph runtime, and surfaced issues.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TabButton
            active={activePanel === "layers"}
            label="Layers"
            onClick={() => actions.setActivePanel("layers")}
          />
          <TabButton
            active={activePanel === "graph"}
            label="Graphs"
            onClick={() => actions.setActivePanel("graph")}
          />
          <TabButton
            active={activePanel === "components"}
            label="Components"
            onClick={() => actions.setActivePanel("components")}
          />
          <TabButton
            active={activePanel === "audio"}
            label="Issues"
            onClick={() => actions.setActivePanel("audio")}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {activePanel === "layers" && (
          <div className="space-y-3">
            {layers.map((layer: VizLayerFrameSnapshot) => {
              const isSelected = layer.layerId === selectedLayerId;
              return (
                <button
                  key={layer.layerId}
                  className={[
                    "w-full rounded-2xl border p-4 text-left transition-colors",
                    isSelected
                      ? "border-white/25 bg-white/[0.08]"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]",
                  ].join(" ")}
                  onClick={() => actions.selectLayer(layer.layerId)}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {layer.componentName ?? layer.componentId}
                      </p>
                      <p className="text-xs text-white/45">{layer.layerId}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/55">
                        {layer.rendererFamily}
                      </span>
                      <span className="text-[11px] text-white/35">
                        {layer.blendMode} · opacity {layer.opacity.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    {Object.values(layer.resolvedInputs).map(
                      (input: VizResolvedInputValue) => (
                        <div
                          key={input.key}
                          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs text-white">{input.key}</p>
                              <p className="text-[11px] text-white/40">
                                {input.sourceKind}
                              </p>
                            </div>
                            <span className="text-right text-[11px] text-white/65">
                              {input.status === "resolved"
                                ? formatValue(input.value)
                                : input.message}
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {activePanel === "graph" && (
          <div className="space-y-3">
            {snapshot.graphRuntime.graphs.map((graph) => {
              const isSelected = graph.graphId === selectedGraphId;
              return (
                <div
                  key={graph.graphId}
                  className={[
                    "rounded-2xl border p-4",
                    isSelected
                      ? "border-white/25 bg-white/[0.08]"
                      : "border-white/10 bg-white/[0.03]",
                  ].join(" ")}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <button
                      className="text-left"
                      onClick={() => actions.selectGraph(graph.graphId)}
                    >
                      <p className="text-sm font-medium text-white">
                        {graph.name}
                      </p>
                      <p className="text-xs text-white/45">{graph.graphId}</p>
                    </button>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/55">
                      frame {graph.checkpoint?.frame ?? snapshot.graphRuntime.frame}
                    </span>
                  </div>

                  <div className="mb-3 grid gap-2">
                    {Object.entries(graph.values).map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs text-white">{key}</p>
                          <span className="text-[11px] text-white/65">
                            {formatValue(value)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {graph.checkpoint &&
                    Object.keys(graph.checkpoint.nodeStates).length > 0 && (
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="mb-2 text-xs uppercase tracking-[0.24em] text-white/45">
                          Node State
                        </p>
                        <pre className="overflow-auto text-[11px] text-white/70">
                          {JSON.stringify(graph.checkpoint.nodeStates, null, 2)}
                        </pre>
                      </div>
                    )}

                  {graph.issues.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {graph.issues.map((issue: VizGraphEvaluationIssue) => (
                        <div
                          key={`${issue.code}-${issue.message}`}
                          className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
                        >
                          {issue.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activePanel === "components" && (
          <div className="space-y-3">
            {snapshot.components.map((component) => (
              <div
                key={component.componentId}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {component.name}
                      </p>
                      <p className="text-xs text-white/45">
                        {component.componentId}
                      </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/55">
                      {component.rendererFamily}
                    </span>
                    <span className="text-[11px] text-white/35">
                      {component.inputKeys.join(", ")}
                    </span>
                  </div>
                </div>

                <div className="grid gap-2">
                  {component.inputKeys.map((inputKey) => (
                    <div
                      key={inputKey}
                      className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-white">{inputKey}</p>
                          <p className="text-[11px] text-white/40">
                            input
                          </p>
                        </div>
                        <span className="text-right text-[11px] text-white/65">
                          configured
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activePanel === "audio" && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                Working Head Summary
              </p>
              <div className="mt-3 grid gap-2 text-xs text-white/70">
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  {snapshot.snapshot.session.workingProject.layers.length} layers
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  {(snapshot.snapshot.session.workingProject.graphs ?? []).length} graphs
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  {snapshot.snapshot.session.issues.length} validation issues
                </div>
              </div>
            </div>

            {groupedIssues.length > 0 ? (
              groupedIssues.map((issue) => (
                <div
                  key={`${issue.source}-${issue.message}`}
                  className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
                >
                  <div className="font-medium">{issue.source}</div>
                  <div className="mt-1">{issue.message}</div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-white/50">
                No surfaced issues. The working head and runtime are currently
                clean.
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                    Debug Actions
                  </p>
                  <p className="text-sm text-white/70">
                    Quick reset hooks while the live loop is still being rebuilt.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="border-white/10 bg-transparent text-white hover:bg-white/10"
                  onClick={() => actions.openExampleProject()}
                >
                  Reload Example
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
