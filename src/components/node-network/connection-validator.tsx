import { Connection, type Edge } from '@xyflow/react';
import { getTypeLabel } from '../config/node-types';
import { GraphNode, validateConnection } from './node-network-store';

export type GraphConnectionValidation =
  | { valid: true }
  | {
      valid: false;
      code:
        | 'missing-node'
        | 'missing-handle'
        | 'incompatible-types'
        | 'graph-cycle';
      message: string;
    };

const findPortType = (
  node: GraphNode,
  direction: 'input' | 'output',
  handleId: string | null,
) =>
  (direction === 'input'
    ? node.data.definition.inputs
    : node.data.definition.outputs
  ).find((port) => port.id === handleId)?.type;

export const validateGraphConnection = (
  connection: Connection,
  nodes: GraphNode[],
  edges: Edge[] = [],
): GraphConnectionValidation => {
  const sourceNode = nodes.find((node) => node.id === connection.source);
  const targetNode = nodes.find((node) => node.id === connection.target);

  if (!sourceNode || !targetNode) {
    return {
      valid: false,
      code: 'missing-node',
      message: 'That connection references a node that is no longer present.',
    };
  }

  const sourceType = findPortType(
    sourceNode,
    'output',
    connection.sourceHandle,
  );
  const targetType = findPortType(targetNode, 'input', connection.targetHandle);
  if (!sourceType || !targetType) {
    return {
      valid: false,
      code: 'missing-handle',
      message: 'Connect a named output to a named input.',
    };
  }

  if (
    !validateConnection(
      sourceNode,
      connection.sourceHandle ?? '',
      targetNode,
      connection.targetHandle ?? '',
    )
  ) {
    return {
      valid: false,
      code: 'incompatible-types',
      message: `${getTypeLabel(sourceType)} cannot connect to ${getTypeLabel(targetType)}.`,
    };
  }

  const outgoing = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (
      edge.target === connection.target &&
      edge.targetHandle === connection.targetHandle
    ) {
      continue;
    }
    const targets = outgoing.get(edge.source) ?? new Set<string>();
    targets.add(edge.target);
    outgoing.set(edge.source, targets);
  }

  const pending = [connection.target];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const nodeId = pending.pop()!;
    if (nodeId === connection.source) {
      return {
        valid: false,
        code: 'graph-cycle',
        message: 'That connection would create a graph cycle.',
      };
    }
    if (visited.has(nodeId)) {
      continue;
    }
    visited.add(nodeId);
    pending.push(...(outgoing.get(nodeId) ?? []));
  }

  return { valid: true };
};

// Helper function to check if a connection would be valid (for visual feedback)
export const isConnectionValid = (
  connection: Connection,
  nodes: GraphNode[],
  edges: Edge[] = [],
): boolean => validateGraphConnection(connection, nodes, edges).valid;
