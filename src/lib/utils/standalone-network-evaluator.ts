/**
 * Standalone node network evaluator for component previews
 * Evaluates networks without requiring Zustand store
 *
 * Note: This relies on presets being registered globally.
 * The preset registration happens when the presets module is imported,
 * which should happen automatically when the component definitions are loaded.
 */

import { AnimInputData, NodeHandleType } from '@/components/config/node-types';
import { GraphNode } from '@/components/node-network/node-network-store';
import {
  NodeNetworkPreset,
  getPresetById,
  instantiatePreset,
} from '@/components/node-network/presets';
import { Edge } from '@xyflow/react';

export class StandaloneNetworkEvaluator {
  private nodes: GraphNode[];
  private edges: Edge[];
  private nodeOutputs: Map<string, any> = new Map();

  constructor(preset: NodeNetworkPreset, outputType?: NodeHandleType) {
    // Instantiate the preset with a temporary parameter ID
    const { nodes, edges } = instantiatePreset(
      preset,
      'preview',
      outputType || preset.outputType,
    );
    this.nodes = nodes;
    this.edges = edges;
  }

  /**
   * Evaluate the network and return the output value
   */
  evaluate(inputData: AnimInputData): any {
    // Clear cached outputs
    this.nodeOutputs.clear();

    // Find the output node
    const outputNode = this.nodes.find(
      (node) => node.data.definition.label === 'Output',
    );

    if (!outputNode) {
      console.warn('No output node found in network');
      return undefined;
    }

    // Compute the output
    return this.computeNodeOutput(outputNode, inputData);
  }

  /**
   * Recursively compute a node's output
   */
  private computeNodeOutput(node: GraphNode, inputData: AnimInputData): any {
    // Return cached output if available
    if (this.nodeOutputs.has(node.id)) {
      return this.nodeOutputs.get(node.id);
    }

    // Handle Input node - it provides the animation input data
    if (node.data.definition.label === 'Input') {
      const outputs = node.data.definition.outputs;
      const result: any = {};
      outputs.forEach((output) => {
        result[output.id] = (inputData as any)[output.id];
      });
      this.nodeOutputs.set(node.id, result);
      return result;
    }

    // Construct inputs for this node
    const inputs: { [key: string]: any } = {};

    for (const input of node.data.definition.inputs) {
      // Find edge connected to this input
      const edge = this.edges.find(
        (e) => e.target === node.id && e.targetHandle === input.id,
      );

      let resolvedValue: any;

      if (edge) {
        // Find source node
        const sourceNode = this.nodes.find((n) => n.id === edge.source);
        if (sourceNode) {
          // Recursively compute source node output
          const sourceOutput = this.computeNodeOutput(sourceNode, inputData);

          // Extract the specific output handle value
          if (edge.sourceHandle) {
            resolvedValue = sourceOutput?.[edge.sourceHandle];
          } else {
            resolvedValue = sourceOutput;
          }
        }
      }

      // Fall back to static input value if no edge or undefined result
      if (resolvedValue === undefined) {
        resolvedValue = node.data.inputValues[input.id];
      }

      // Type-aware parsing
      if (input.type === 'number' && typeof resolvedValue === 'string') {
        const parsed = parseFloat(resolvedValue);
        inputs[input.id] = isNaN(parsed) ? 0 : parsed;
      } else if (input.type === 'string') {
        inputs[input.id] = String(resolvedValue);
      } else {
        inputs[input.id] = resolvedValue;
      }
    }

    // Compute the node's output
    const output = node.data.definition.computeSignal(inputs, inputData, node);

    // Cache the output
    this.nodeOutputs.set(node.id, output);

    return output;
  }

  /**
   * Reset the evaluator (clears node states)
   */
  reset() {
    this.nodeOutputs.clear();
    // Reset node states
    this.nodes.forEach((node) => {
      node.data.state = {};
    });
  }
}

/**
 * Create evaluators for a component's default networks
 */
export function createDefaultNetworkEvaluators(
  defaultNetworks?: Record<string, NodeNetworkPreset | string>,
): Map<string, StandaloneNetworkEvaluator> {
  const evaluators = new Map<string, StandaloneNetworkEvaluator>();

  if (!defaultNetworks) return evaluators;

  Object.entries(defaultNetworks).forEach(([paramPath, presetOrId]) => {
    try {
      let preset: NodeNetworkPreset | null = null;

      // If it's a string, look up the preset by ID
      if (typeof presetOrId === 'string') {
        preset = getPresetById(presetOrId);
        if (!preset) {
          console.warn(
            `[Preview] Preset '${presetOrId}' not found for ${paramPath}`,
          );
          return;
        }
      } else {
        preset = presetOrId;
      }

      const evaluator = new StandaloneNetworkEvaluator(preset);
      evaluators.set(paramPath, evaluator);
    } catch (error) {
      console.warn(`Failed to create evaluator for ${paramPath}:`, error);
    }
  });

  return evaluators;
}
