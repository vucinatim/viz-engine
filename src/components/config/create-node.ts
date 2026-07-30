import type { ComponentType } from 'react';
import { AnimInputData, NodeHandleType, TypeFromHandle } from './node-types';

type NodeIO<TType extends NodeHandleType = NodeHandleType> = {
  id: string;
  label: string;
  type: TType;
  defaultValue?: TypeFromHandle<TType> | any;
};

type NodeRuntimeRef = {
  data: {
    state: Record<string, any>;
    [key: string]: any;
  };
  [key: string]: any;
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
