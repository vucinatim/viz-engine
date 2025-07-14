import { create } from 'zustand';

interface AnimationLiveValuesStore {
  values: { [paramId: string]: any };
  setValue: (paramId: string, value: any) => void;
}

const useAnimationLiveValuesStore = create<AnimationLiveValuesStore>((set) => ({
  values: {},
  setValue: (paramId, value) =>
    set((state) => ({
      values: {
        ...state.values,
        [paramId]: value,
      },
    })),
}));

export default useAnimationLiveValuesStore;
