import { create } from 'zustand';

type NodeLiveValuesState = {
  values: Map<string, any>;
  setNodeInputValue: (nodeId: string, inputId: string, value: any) => void;
  getNodeInputValue: (nodeId: string, inputId: string) => any | undefined;
};

const store = new Map<string, any>();

export const useNodeLiveValuesStore = create<NodeLiveValuesState>(
  (set, get) => ({
    values: store,
    setNodeInputValue: (nodeId, inputId, value) => {
      const key = `${nodeId}-${inputId}`;
      store.set(key, value);
    },
    getNodeInputValue: (nodeId, inputId) => {
      const key = `${nodeId}-${inputId}`;
      return get().values.get(key);
    },
  }),
);
