import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export interface CreateVizComponentScaffoldOptions {
  componentId: string;
  componentName: string;
  outputFile: string;
}

export interface VizComponentScaffoldResult {
  componentId: string;
  componentName: string;
  outputFile: string;
  exportName: string;
  issues: string[];
  nextSteps: string[];
}

const toPascalCase = (value: string): string => {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => `${segment[0]!.toUpperCase()}${segment.slice(1)}`)
    .join('');
};

const isValidComponentId = (value: string): boolean => {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
};

const createComponentTemplate = ({
  componentId,
  componentName,
  exportName,
}: {
  componentId: string;
  componentName: string;
  exportName: string;
}) => {
  return `import type {
  VizComponentAuthoring,
  VizComponentImplementation,
  VizRenderGroupNode,
  VizRenderRectNode,
} from "@viz-engine/contracts";
import { asNumber, asString } from "./shared.js";

const ${exportName}Authoring = {
  schemaVersion: 1,
  componentId: "${componentId}",
  compatibility: "render-safe",
  settings: {
    kind: "group",
    label: "Settings",
    fields: {
      color: {
        kind: "color",
        label: "Color",
        description: "Primary visual color.",
        defaultValue: "#88f3ff",
      },
    },
  },
} satisfies VizComponentAuthoring;

export const ${exportName}: VizComponentImplementation = {
  id: "${componentId}",
  name: "${componentName}",
  rendererFamily: "three",
  description: "Describe what this visual does.",
  implementationVersion: "1.0.0",
  authoring: ${exportName}Authoring,
  inputs: [
    {
      key: "intensity",
      label: "Intensity",
      supportedSources: ["literal", "graph-output", "artifact-feature"],
      required: true,
    },
  ],
  render: ({ viewport, layer, resolvedInputs }) => {
    const intensity = Math.max(0, Math.min(asNumber(resolvedInputs.intensity?.value, 0), 1));
    const color = asString(layer.settings?.color, "#88f3ff");

    const backdrop: VizRenderRectNode = {
      kind: "rect",
      id: \`\${layer.id}-backdrop\`,
      x: viewport.width * 0.18,
      y: viewport.height * 0.18,
      width: viewport.width * 0.64,
      height: viewport.height * 0.64,
      radius: 32,
      style: {
        fill: color,
        opacity: 0.16 + intensity * 0.3,
      },
    };

    return {
      kind: "group",
      id: layer.id,
      children: [backdrop],
      style: {
        opacity: layer.opacity,
        blendMode: layer.blendMode,
      },
    } satisfies VizRenderGroupNode;
  },
};
`;
};

export const createVizComponentScaffold = ({
  componentId,
  componentName,
  outputFile,
}: CreateVizComponentScaffoldOptions): VizComponentScaffoldResult => {
  const issues: string[] = [];

  if (!isValidComponentId(componentId)) {
    issues.push(
      'Component id must be kebab-case using lowercase letters, numbers, and dashes only.',
    );
  }

  if (componentName.trim().length === 0) {
    issues.push('Component name must be a non-empty string.');
  }

  const exportName = `${toPascalCase(componentId)}Component`;

  if (issues.length > 0) {
    return {
      componentId,
      componentName,
      outputFile,
      exportName,
      issues,
      nextSteps: [],
    };
  }

  const normalizedOutputFile = resolve(outputFile);
  mkdirSync(dirname(normalizedOutputFile), { recursive: true });
  writeFileSync(
    normalizedOutputFile,
    `${createComponentTemplate({
      componentId,
      componentName,
      exportName,
    })}\n`,
  );

  return {
    componentId,
    componentName,
    outputFile: normalizedOutputFile,
    exportName,
    issues: [],
    nextSteps: [
      `Add ${exportName} to the intended Viz capability pack`,
      'Compose that capability pack into the target session host',
      'Wire the component into a project layer and validate it through the runtime and editor catalog paths.',
    ],
  };
};
