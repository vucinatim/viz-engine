import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadLocalVizProjectBundle } from '@viz-engine/dev-cli';
import { createVizNodeControl } from '@viz-engine/editor-control/node';

const run = () => {
  const control = createVizNodeControl({
    actor: { kind: 'agent', id: 'creative-loop-proof' },
  });

  control.openExampleProject();
  control.setUiState({
    activePanel: 'graph',
  });

  const actionResult = control.applyActions([
    {
      type: 'graph.create',
      payload: {
        graphId: 'graph-creative-loop-accent',
        name: 'Creative Loop Accent',
      },
    },
    {
      type: 'graph.input.set',
      payload: {
        graphId: 'graph-creative-loop-accent',
        inputKey: 'flux',
        source: {
          kind: 'artifact-feature',
          artifactId: 'artifact-audio-standard-main',
          feature: 'spectral-flux',
        },
      },
    },
    {
      type: 'graph.node.add',
      payload: {
        graphId: 'graph-creative-loop-accent',
        nodeId: 'node-accent-input',
        nodeType: 'graph-input',
        initialInputs: {
          inputKey: {
            kind: 'literal',
            value: 'flux',
          },
        },
      },
    },
    {
      type: 'graph.node.add',
      payload: {
        graphId: 'graph-creative-loop-accent',
        nodeId: 'node-accent-scale',
        nodeType: 'multiply',
        initialInputs: {
          value: {
            kind: 'node-output',
            nodeId: 'node-accent-input',
            output: 'value',
          },
          factor: {
            kind: 'literal',
            value: 0.65,
          },
        },
      },
    },
    {
      type: 'graph.output.set',
      payload: {
        graphId: 'graph-creative-loop-accent',
        output: {
          key: 'accentIntensity',
          nodeId: 'node-accent-scale',
          output: 'value',
        },
      },
    },
    {
      type: 'layer.create',
      payload: {
        layerId: 'layer-creative-loop-accent',
        index: 3,
        layer: {
          name: 'Creative Loop Accent',
          componentId: 'radial-bloom',
          enabled: true,
          opacity: 0.82,
          blendMode: 'screen',
          rendererFamily: 'three',
          settings: {
            color: '#ff4fd8',
          },
          inputs: {
            intensity: {
              kind: 'graph-output',
              graphId: 'graph-creative-loop-accent',
              output: 'accentIntensity',
            },
          },
        },
      },
    },
  ]);

  if (!actionResult.ok) {
    throw new Error(
      `Creative loop mutation failed: ${actionResult.transactionResult.errors
        .map((error) => error.message)
        .join('; ')}`,
    );
  }

  control.setUiState({
    selectedLayerId: 'layer-creative-loop-accent',
    selectedGraphId: 'graph-creative-loop-accent',
  });

  const frame = 72;
  const debugSnapshot = control.createDebugSnapshot(frame);
  const graphRuntime = control.inspectGraphRuntime(frame);

  if (debugSnapshot.framePlan.issues.length > 0) {
    throw new Error(
      `Creative loop frame plan has issues: ${debugSnapshot.framePlan.issues
        .map((issue) => issue.message)
        .join('; ')}`,
    );
  }

  if (debugSnapshot.renderPlan.issues.length > 0) {
    throw new Error(
      `Creative loop render plan has issues: ${debugSnapshot.renderPlan.issues
        .map((issue) => issue.message)
        .join('; ')}`,
    );
  }

  const exportDirectory = mkdtempSync(
    join(tmpdir(), 'viz-agent-creative-loop-'),
  );

  try {
    const exportResult = control.exportWorkingBundle(exportDirectory);

    if (exportResult.issues.length > 0) {
      throw new Error(
        `Creative loop bundle export has issues: ${exportResult.issues
          .map((issue) => issue.message)
          .join('; ')}`,
      );
    }

    const reloaded = loadLocalVizProjectBundle(exportDirectory);

    if (reloaded.issues.length > 0) {
      throw new Error(
        `Creative loop bundle reload has issues: ${reloaded.issues
          .map((issue) => issue.message)
          .join('; ')}`,
      );
    }

    const accentGraph = graphRuntime.graphs.find(
      (graph) => graph.graphId === 'graph-creative-loop-accent',
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          revision: control.getSnapshot().session.revision,
          frame,
          layerIds: debugSnapshot.renderPlan.layers.map((layer) => layer.layerId),
          accentGraphValues: accentGraph?.values ?? {},
          graphCount: reloaded.project.graphs?.length ?? 0,
          bundleRoundtripVerified: true,
        },
        null,
        2,
      ),
    );
  } finally {
    rmSync(exportDirectory, { recursive: true, force: true });
  }
};

run();
