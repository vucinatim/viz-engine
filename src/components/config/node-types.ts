import { VType } from './types';

// Centralized type system for node handles
export type NodeHandleType =
  | 'number'
  | 'string'
  | 'boolean'
  | 'color'
  | 'file'
  | 'vector3'
  | 'Uint8Array'
  | 'FrequencyAnalysis'
  | 'object'
  | 'math-op';

// Shared analysis payloads for node contexts
export type FrequencyAnalysis = {
  frequencyData: Uint8Array;
  sampleRate: number;
  fftSize: number;
};

export const EMPTY_FREQUENCY_ANALYSIS: FrequencyAnalysis = {
  frequencyData: new Uint8Array(),
  sampleRate: 0,
  fftSize: 0,
};

// Global animation input available to all nodes
export type AnimInputData = {
  audioSignal: Uint8Array;
  frequencyAnalysis?: FrequencyAnalysis;
  time: number;
};

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
  boolean: {
    color: '#f97316', // orange
    label: 'Boolean',
    canConnectTo: ['number', 'boolean'],
  },
  color: {
    color: '#f59e0b', // amber
    label: 'Color',
    canConnectTo: ['string', 'color'],
  },
  file: {
    color: '#10b981', // emerald
    label: 'File',
    canConnectTo: ['file', 'string'],
  },
  vector3: {
    color: '#06b6d4', // cyan
    label: 'Vector3',
    canConnectTo: ['vector3'],
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
  'math-op': {
    color: '#ec4899', // pink
    label: 'Math Op',
    canConnectTo: [],
  },
};

// Runtime type mapping for node handle value types
export type HandleTypeMap = {
  number: number;
  string: string;
  boolean: boolean;
  color: string;
  file: unknown;
  vector3: { x: number; y: number; z: number } | [number, number, number];
  Uint8Array: Uint8Array;
  FrequencyAnalysis: FrequencyAnalysis;
  object: Record<string, unknown>;
  'math-op': import('./math-operations').MathOperation;
};

export type TypeFromHandle<T extends NodeHandleType> = HandleTypeMap[T];

// Safe mapping between VType and NodeHandleType
export const VTypeToNodeHandleType: Record<VType, NodeHandleType> = {
  [VType.Number]: 'number',
  [VType.String]: 'string',
  [VType.Color]: 'color',
  [VType.Boolean]: 'number', // Boolean becomes 0/1 in nodes
  [VType.Select]: 'string',
  [VType.Group]: 'object', // Groups become objects
  [VType.File]: 'file',
  [VType.Vector3]: 'vector3',
  [VType.Button]: 'string', // Buttons don't carry data, map to string
  [VType.List]: 'object', // Lists become objects/arrays
};

export const NodeHandleTypeToVType: Record<NodeHandleType, VType> = {
  number: VType.Number,
  string: VType.String,
  boolean: VType.Boolean,
  color: VType.Color,
  file: VType.File,
  vector3: VType.Vector3,
  Uint8Array: VType.Number, // Data becomes number
  FrequencyAnalysis: VType.Number, // Complex types become number
  object: VType.Group,
  'math-op': VType.String,
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
