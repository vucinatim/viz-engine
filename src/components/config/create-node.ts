import type { ComponentType } from 'react';
import {
  AnimInputData,
  EMPTY_FREQUENCY_ANALYSIS,
  NodeHandleType,
  TypeFromHandle,
} from './node-types';

export type NodeIO<TType extends NodeHandleType = NodeHandleType> = {
  id: string;
  label: string;
  type: TType;
  defaultValue?: TypeFromHandle<TType> | any;
};

export type NodeRuntimeRef = {
  data: {
    state: Record<string, any>;
    [key: string]: any;
  };
  [key: string]: any;
};

type OptionalInputsFrom<TInputs extends readonly NodeIO[]> = {
  [K in TInputs[number] as K['id']]: K extends NodeIO<infer THandle>
    ? TypeFromHandle<THandle> | undefined
    : never;
};

type ResolvedInputsFrom<TInputs extends readonly NodeIO[]> = {
  [K in TInputs[number] as K['id']]: K extends NodeIO<infer THandle>
    ? TypeFromHandle<THandle>
    : never;
};

type OutputArrayToObject<TOutputs extends readonly NodeIO[]> = {
  [K in TOutputs[number] as K['id']]: K extends NodeIO<infer THandle>
    ? TypeFromHandle<THandle>
    : never;
};

export type AnimNode<
  TInputs extends readonly NodeIO[] = readonly NodeIO[],
  TOutputs extends readonly NodeIO[] = readonly NodeIO[],
> = {
  label: string;
  inputs: TInputs;
  outputs: TOutputs;
  description?: string;
  customBody?: ComponentType<any>;
  computeSignal: (
    inputs: ResolvedInputsFrom<TInputs>,
    context: AnimInputData,
    node?: NodeRuntimeRef,
  ) => OutputArrayToObject<TOutputs>;
};

export function createNode<
  const TInputs extends readonly NodeIO[],
  const TOutputs extends readonly NodeIO[],
>(definition: {
  label: string;
  description?: string;
  customBody?: ComponentType<any>;
  inputs: TInputs;
  outputs: TOutputs;
  computeSignal: (
    inputs: ResolvedInputsFrom<TInputs>,
    context: AnimInputData,
    node?: NodeRuntimeRef,
  ) => OutputArrayToObject<TOutputs>;
}): AnimNode<TInputs, TOutputs> {
  // Wrap compute to inject input defaults based on IO list and basic type fallbacks
  const wrapped = {
    ...definition,
    computeSignal: (
      inputs: OptionalInputsFrom<TInputs>,
      context: AnimInputData,
      node?: NodeRuntimeRef,
    ) => {
      const withDefaults = { ...(inputs as any) } as Record<string, any>;
      for (const io of definition.inputs as unknown as ReadonlyArray<NodeIO>) {
        const current = withDefaults[io.id];
        if (current === undefined || current === null) {
          if (io.defaultValue !== undefined) {
            withDefaults[io.id] = io.defaultValue as any;
          } else {
            // Type-based fallback
            switch (io.type) {
              case 'number':
                withDefaults[io.id] = 0;
                break;
              case 'string':
              case 'color':
                withDefaults[io.id] = '';
                break;
              case 'boolean':
                withDefaults[io.id] = false;
                break;
              case 'Uint8Array':
                withDefaults[io.id] = new Uint8Array();
                break;
              case 'FrequencyAnalysis':
                withDefaults[io.id] = EMPTY_FREQUENCY_ANALYSIS;
                break;
              case 'object':
                withDefaults[io.id] = {};
                break;
              case 'vector3':
                withDefaults[io.id] = { x: 0, y: 0, z: 0 };
                break;
              default:
                withDefaults[io.id] = undefined;
            }
          }
        }
      }
      return definition.computeSignal(
        withDefaults as ResolvedInputsFrom<TInputs>,
        context,
        node,
      );
    },
  } as AnimNode<TInputs, TOutputs>;
  return wrapped;
}

export type { AnimInputData };
