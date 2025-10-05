import { Comp } from '@/components/config/create-component';
import { create } from 'zustand';

interface CompStore {
  comps: Comp[];
  addComp: (comp: Comp) => void;
  removeComp: (id: string) => void;
}

const useCompStore = create<CompStore>((set, get) => ({
  comps: [],
  addComp: (comp) =>
    set((state) => ({
      comps: [...state.comps, comp],
    })),
  removeComp: (id) =>
    set((state) => ({
      comps: state.comps.filter((comp) => comp.name !== id),
    })),
}));

export default useCompStore;
