import { Comp, ConfigSchema } from "@/components/comps/comp-renderer";
import { z } from "zod";
import { create } from "zustand";

interface CompData<TConfig extends ConfigSchema> {
  id: string;
  comp: Comp<TConfig>;
  valuesRef: React.MutableRefObject<z.infer<TConfig>> | null;
}

interface CompStore {
  comps: CompData<ConfigSchema>[];
  getComp: <TConfig extends ConfigSchema>(
    id: string
  ) => CompData<TConfig> | undefined;
  addComp: <TConfig extends ConfigSchema>(comp: Comp<TConfig>) => void;
  removeComp: (id: string) => void;
  registerCompValuesRef: <TConfig extends ConfigSchema>(
    id: string,
    ref: React.MutableRefObject<z.infer<TConfig>>
  ) => void;
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
