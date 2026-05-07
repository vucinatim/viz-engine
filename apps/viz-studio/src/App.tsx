import { exampleComponents, exampleProjectDocument, exampleResolvedArtifacts } from "@viz-engine/example-projects";
import { createVizComponentRegistry, createVizFramePlan, createVizRuntimeSession } from "@viz-engine/runtime";
import { useState } from "react";

const componentRegistry = createVizComponentRegistry(exampleComponents);

const formatValue = (value: unknown): string => {
  if (typeof value === "number") {
    return value.toFixed(4);
  }

  return JSON.stringify(value);
};

export function App() {
  const [frame, setFrame] = useState(36);

  const session = createVizRuntimeSession({
    project: exampleProjectDocument,
    mode: "render",
    resolvedArtifacts: exampleResolvedArtifacts,
    seed: "studio-seed",
  });

  const framePlan = createVizFramePlan({
    session,
    frame,
    registry: componentRegistry,
  });

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">VizEngine V2 Foundation</p>
          <h1>Runtime Frame Plan Inspector</h1>
          <p className="lede">
            This app is the first real V2 shell. It consumes the extracted workspace packages,
            validates a canonical project document, resolves baked feature inputs, and inspects
            the deterministic frame plan that later renderers will consume.
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
            <h2>Visual Intent Preview</h2>
            <p>Debug rendering only. This is not the final compositor.</p>
          </header>
          <div className="mock-stage">
            <div className="mock-background" />
            <div className="mock-bars">
              {Array.from({ length: 16 }, (_, index) => {
                const bassInput = framePlan.layers.find((layer) => layer.layerId === "layer-bars");
                const bassValue =
                  typeof bassInput?.resolvedInputs.bass?.value === "number"
                    ? bassInput.resolvedInputs.bass.value
                    : 0;

                const loudnessValue =
                  typeof bassInput?.resolvedInputs.loudness?.value === "number"
                    ? bassInput.resolvedInputs.loudness.value
                    : 0;

                const barHeight = 14 + ((index % 5) + 1) * 14 * bassValue + loudnessValue * 60;

                return (
                  <span
                    key={index}
                    className="mock-bar"
                    style={{ height: `${Math.min(180, barHeight)}px` }}
                  />
                );
              })}
            </div>
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
