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

  // Allow connections to already connected inputs (they will replace the existing edge)
  // No need to check for duplicates as we want to allow replacement

  // Validate the connection using our type system
  return validateConnection(
    sourceNode,
    connection.sourceHandle || '',
    targetNode,
    connection.targetHandle || '',
  );
};
