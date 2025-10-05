import { Connection, Edge } from '@xyflow/react';
import { GraphNode, validateConnection } from './node-network-store';

// Helper function to check if a connection would be valid (for visual feedback)
export const isConnectionValid = (
  connection: Connection,
  nodes: GraphNode[],
  edges: Edge[],
): boolean => {
  const sourceNode = nodes.find((n) => n.id === connection.source);
  const targetNode = nodes.find((n) => n.id === connection.target);

  if (!sourceNode || !targetNode) {
    return false;
  }

  // Check for duplicate connections
  const isDuplicate = edges.some(
    (edge) =>
      edge.target === connection.target &&
      edge.targetHandle === connection.targetHandle,
  );

  if (isDuplicate) {
    return false;
  }

  // Validate the connection using our type system
  return validateConnection(
    sourceNode,
    connection.sourceHandle || '',
    targetNode,
    connection.targetHandle || '',
  );
};
