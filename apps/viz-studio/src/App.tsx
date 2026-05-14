import { createCoreComponentRegistry } from "@viz-engine/components-core";
import {
  exampleProjectDocument,
  exampleResolvedArtifacts,
  exampleResolvedAssets,
} from "@viz-engine/example-projects";
import { createCoreNodeRegistry } from "@viz-engine/nodes-core";
import { renderVizRenderPlanToSvgMarkup } from "@viz-engine/renderer-svg";
import { createVizFramePlan, createVizRenderPlan, createVizRuntimeSession } from "@viz-engine/runtime";
import { Suspense, lazy, useState } from "react";

const ThreePreviewPane = lazy(async () => {
  const module = await import("./ThreePreviewPane");
  return {
    default: module.ThreePreviewPane,
  };
});

const componentRegistry = createCoreComponentRegistry();
const nodeRegistry = createCoreNodeRegistry();

const formatValue = (value: unknown): string => {
  if (typeof value === "number") {
    return value.toFixed(4);
  }

  if (
    value &&
    typeof value === "object" &&
    "id" in value &&
    "kind" in value &&
    "imageSourceUri" in value
  ) {
    const id = typeof value.id === "string" ? value.id : "unknown";
    const uri = typeof value.imageSourceUri === "string" ? value.imageSourceUri : "";
    const preview = uri.startsWith("data:") ? "data-uri" : uri;
    return `${id} (${preview})`;
  }

  return JSON.stringify(value);
};

export function App() {
  const [frame, setFrame] = useState(36);

  const session = createVizRuntimeSession({
    project: exampleProjectDocument,
    mode: "render",
    resolvedAssets: exampleResolvedAssets,
    resolvedArtifacts: exampleResolvedArtifacts,
    seed: "studio-seed",
  });

  const framePlan = createVizFramePlan({
    session,
    frame,
    registry: componentRegistry,
    nodeRegistry,
  });

  const renderPlan = createVizRenderPlan({
    session,
    frame,
    registry: componentRegistry,
    nodeRegistry,
  });

  const svgMarkup = renderVizRenderPlanToSvgMarkup(renderPlan);

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">VizEngine V2 Foundation</p>
          <h1>Runtime Frame Plan Inspector</h1>
          <p className="lede">
            This app is the first real V2 shell. It consumes the extracted workspace packages,
            validates a canonical project document, resolves baked feature inputs, and inspects
            the deterministic frame plan that later renderers will consume. This slice now also
            proves a real asset-backed image layer through the same shared runtime path.
          </p>
        </div>
        <div className="project-meta">
          <div>
            <span>Project</span>
            <strong>{exampleProjectDocument.name}</strong>
          </div>
          <div>
            <span>Viewport</span>
            <strong>
              {exampleProjectDocument.viewport.width}x{exampleProjectDocument.viewport.height}
            </strong>
          </div>
          <div>
            <span>Renderer Baseline</span>
            <strong>Three / Remotion / FFmpeg</strong>
          </div>
        </div>
      </section>

      <section className="control-panel">
        <div className="slider-block">
          <label htmlFor="frame">Frame {framePlan.frameContext.frame}</label>
          <input
            id="frame"
            type="range"
            min={0}
            max={exampleProjectDocument.timeline.durationInFrames - 1}
            value={frame}
            onChange={(event) => setFrame(Number(event.target.value))}
          />
          <div className="frame-stats">
            <span>{framePlan.frameContext.timeInSeconds.toFixed(2)}s</span>
            <span>{framePlan.frameContext.mode}</span>
            <span>{framePlan.frameContext.seed}</span>
          </div>
        </div>

        <div className="status-card">
          <span>Frame Plan Issues</span>
          <strong>{framePlan.issues.length}</strong>
        </div>
      </section>

      <section className="content-grid">
        <article className="canvas-card">
          <header>
            <h2>Three Preview</h2>
            <p>Primary WebGL proof path driven by the shared runtime render plan.</p>
          </header>
          <div className="three-stage">
            <Suspense
              fallback={
                <div className="three-stage-fallback">
                  <strong>Loading renderer…</strong>
                  <span>The WebGL preview is split into a secondary chunk.</span>
                </div>
              }
            >
              <ThreePreviewPane
                renderPlan={renderPlan}
                width={exampleProjectDocument.viewport.width}
                height={exampleProjectDocument.viewport.height}
              />
            </Suspense>
          </div>
          <div className="svg-debug-panel">
            <div className="svg-debug-header">
              <h3>SVG Proof Output</h3>
              <span>Deterministic debug renderer</span>
            </div>
            <div className="svg-stage" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
          </div>
        </article>

        <article className="inspector-card">
          <header>
            <h2>Resolved Layers</h2>
            <p>Ordered output of the runtime frame planner.</p>
          </header>
          <div className="layer-list">
            {framePlan.layers.map((layer) => (
              <section key={layer.layerId} className="layer-card">
                <div className="layer-header">
                  <div>
                    <p>{layer.componentName ?? layer.componentId}</p>
                    <strong>{layer.layerId}</strong>
                  </div>
                  <span>{layer.rendererFamily}</span>
                </div>
                <div className="pill-row">
                  <span>blend: {layer.blendMode}</span>
                  <span>opacity: {layer.opacity}</span>
                </div>
                <dl className="input-grid">
                  {Object.values(layer.resolvedInputs).map((input) => (
                    <div key={input.key}>
                      <dt>{input.key}</dt>
                      <dd>{input.status === "resolved" ? formatValue(input.value) : input.message}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
