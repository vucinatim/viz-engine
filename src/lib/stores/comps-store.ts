import { Comp, ConfigValuesRef } from "@/components/comps/comp-renderer";
import { create } from "zustand";

interface CompData {
  id: string;
  comp: Comp;
  valuesRef: ConfigValuesRef | null;
}

interface CompStore {
  comps: CompData[];
  getComp: (id: string) => CompData | undefined;
  addComp: (comp: Comp) => void;
  removeComp: (id: string) => void;
  registerCompValuesRef: (id: string, ref: ConfigValuesRef) => void;
  unregisterCompValuesRef: (id: string) => void;
}

const useCompStore = create<CompStore>((set, get) => ({
  comps: [],
  getComp: (id) => get().comps.find((comp) => comp.id === id),
  addComp: (comp) =>
    set((state) => ({
      comps: [
        ...state.comps,
        {
          id: comp.name,
          comp,
          valuesRef: null,
        },
      ],
    })),
  removeComp: (id) =>
    set((state) => ({
      comps: state.comps.filter((comp) => comp.id !== id),
    })),
  registerCompValuesRef: (id, ref) =>
    set((state) => ({
      comps: state.comps.map((comp) =>
        comp.id === id ? { ...comp, valuesRef: ref } : comp
      ),
    })),
  unregisterCompValuesRef: (id) =>
    set((state) => ({
      comps: state.comps.map((comp) =>
        comp.id === id ? { ...comp, valuesRef: null } : comp
      ),
    })),
}));

export default useCompStore;
