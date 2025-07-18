import { VType } from './types';

// Centralized type system for node handles
export type NodeHandleType =
  | 'number'
  | 'string'
  | 'color'
  | 'Uint8Array'
  | 'FrequencyAnalysis'
  | 'object';

// Type metadata (colors, validation rules, etc.)
export const TYPE_METADATA: Record<
  NodeHandleType,
  {
    color: string;
    label: string;
    canConnectTo: NodeHandleType[];
  }
> = {
  number: {
    color: '#60a5fa', // blue
    label: 'Number',
    canConnectTo: ['number'],
  },
  string: {
    color: '#34d399', // green
    label: 'String',
    canConnectTo: ['string', 'color'],
  },
  color: {
    color: '#f59e0b', // amber
    label: 'Color',
    canConnectTo: ['string', 'color'],
  },
  Uint8Array: {
    color: '#8b5cf6', // purple
    label: 'Data',
    canConnectTo: ['Uint8Array'],
  },
  FrequencyAnalysis: {
    color: '#ef4444', // red
    label: 'Frequency',
    canConnectTo: ['FrequencyAnalysis'],
  },
  object: {
    color: '#6b7280', // gray
    label: 'Object',
    canConnectTo: ['object'],
  },
};

// Safe mapping between VType and NodeHandleType
export const VTypeToNodeHandleType: Record<VType, NodeHandleType> = {
  [VType.Number]: 'number',
  [VType.String]: 'string',
  [VType.Color]: 'color',
  [VType.Boolean]: 'number', // Boolean becomes 0/1 in nodes
  [VType.Select]: 'string',
  [VType.Group]: 'object', // Groups become objects
};

export const NodeHandleTypeToVType: Record<NodeHandleType, VType> = {
  number: VType.Number,
  string: VType.String,
  color: VType.Color,
  Uint8Array: VType.Number, // Data becomes number
  FrequencyAnalysis: VType.Number, // Complex types become number
  object: VType.Group,
};

// Safe conversion functions
export const safeVTypeToNodeHandleType = (vType: VType): NodeHandleType => {
  return VTypeToNodeHandleType[vType];
};

export const safeNodeHandleTypeToVType = (
  nodeHandleType: NodeHandleType,
): VType => {
  return NodeHandleTypeToVType[nodeHandleType];
};

// Validation functions
export const canConnectTypes = (
  sourceType: NodeHandleType,
  targetType: NodeHandleType,
): boolean => {
  const sourceMeta = TYPE_METADATA[sourceType];
  return sourceMeta?.canConnectTo.includes(targetType) || false;
};

export const getTypeColor = (type: NodeHandleType): string => {
  return TYPE_METADATA[type]?.color || '#6b7280';
};

export const getTypeLabel = (type: NodeHandleType): string => {
  return TYPE_METADATA[type]?.label || 'Unknown';
};

// Helper function to validate if a string is a valid NodeHandleType
export const isValidNodeHandleType = (type: string): type is NodeHandleType => {
  return type in TYPE_METADATA;
};
